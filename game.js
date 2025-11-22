// Game State
let playerId = localStorage.getItem('night_shift_player_id');
if (!playerId) {
    playerId = 'player_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('night_shift_player_id', playerId);
}

let playerRole = null;
let playerNickname = "Cat";
let playerX = 100;
let playerY = 300;
let speed = 4;
let isGameRunning = false;

// Input State
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false
};

// Firebase References
let db;
let playersRef;
let myPlayerRef;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const world = document.getElementById('world');
const connectionStatus = document.getElementById('connection-status');
const nicknameInput = document.getElementById('nickname');

// Initialize Game
function startGame(role) {
    const name = nicknameInput.value.trim();
    if (name) playerNickname = name;
    playerRole = role;

    // Hide Start Screen
    startScreen.style.display = 'none';
    isGameRunning = true;

    // Initialize Firebase
    if (typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined') {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
            playersRef = db.ref('rooms/default/players');
            myPlayerRef = playersRef.child(playerId);

            // Set initial position
            updateMyPosition();

            // Remove player on disconnect
            myPlayerRef.onDisconnect().remove();

            // Listen for other players
            setupPlayerListeners();

            // Connection monitoring
            const connectedRef = db.ref('.info/connected');
            connectedRef.on('value', (snap) => {
                if (snap.val() === true) {
                    connectionStatus.classList.add('hidden');
                } else {
                    connectionStatus.classList.remove('hidden');
                }
            });

        } catch (e) {
            console.error("Firebase initialization failed:", e);
            alert("Firebase config is missing or invalid. Check the console.");
        }
    } else {
        console.warn("Firebase SDK not loaded or config missing. Running in offline mode.");
    }

    // Start Game Loop
    requestAnimationFrame(gameLoop);
}

// Input Listeners
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Game Loop
function gameLoop() {
    if (!isGameRunning) return;

    handleMovement();
    renderMyPlayer(); // In a real networked game, we might wait for server ack, but for responsiveness we predict locally

    // Throttle network updates
    if (Date.now() - lastNetworkUpdate > 100) {
        updateMyPosition();
        lastNetworkUpdate = Date.now();
    }

    requestAnimationFrame(gameLoop);
}

let lastNetworkUpdate = 0;

function handleMovement() {
    let dx = 0;
    let dy = 0;

    if (keys.w || keys.ArrowUp) dy -= speed;
    if (keys.s || keys.ArrowDown) dy += speed;
    if (keys.a || keys.ArrowLeft) dx -= speed;
    if (keys.d || keys.ArrowRight) dx += speed;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    playerX += dx;
    playerY += dy;

    // Bounds checking (800x600 world, 40x40 player)
    if (playerX < 0) playerX = 0;
    if (playerY < 0) playerY = 0;
    if (playerX > 760) playerX = 760; // 800 - 40
    if (playerY > 560) playerY = 560; // 600 - 40
}

function updateMyPosition() {
    if (!myPlayerRef) return;

    myPlayerRef.set({
        x: playerX,
        y: playerY,
        nickname: playerNickname,
        role: playerRole,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    });
}

// Rendering
const players = {}; // Local cache of player DOM elements

function setupPlayerListeners() {
    playersRef.on('child_added', (snapshot) => {
        const data = snapshot.val();
        const id = snapshot.key;
        createPlayerElement(id, data);
    });

    playersRef.on('child_changed', (snapshot) => {
        const data = snapshot.val();
        const id = snapshot.key;
        updatePlayerElement(id, data);
    });

    playersRef.on('child_removed', (snapshot) => {
        const id = snapshot.key;
        removePlayerElement(id);
    });
}

function createPlayerElement(id, data) {
    if (players[id]) return; // Already exists

    const el = document.createElement('div');
    el.className = `player ${data.role}`;
    el.innerHTML = `
        <div class="nickname">${data.nickname}</div>
        <div class="cat-body"></div>
        <div class="ears"></div>
        <div class="face"></div>
    `;

    world.appendChild(el);
    players[id] = el;
    updatePlayerElement(id, data);
}

function updatePlayerElement(id, data) {
    const el = players[id];
    if (!el) return;

    // If it's me, I might want to skip this if I'm predicting locally, 
    // but for simplicity let's just update everyone or handle "me" separately.
    // Actually, let's update "me" only from local state to avoid jitter, 
    // and everyone else from network.
    if (id === playerId) {
        // We handle our own rendering in renderMyPlayer()
        return;
    }

    el.style.transform = `translate(${data.x}px, ${data.y}px)`;

    // Update role/name if changed (rare but possible)
    if (!el.classList.contains(data.role)) {
        el.className = `player ${data.role}`;
    }
    const nickEl = el.querySelector('.nickname');
    if (nickEl.innerText !== data.nickname) {
        nickEl.innerText = data.nickname;
    }
}

function removePlayerElement(id) {
    if (players[id]) {
        players[id].remove();
        delete players[id];
    }
}

function renderMyPlayer() {
    // Ensure my player element exists
    if (!players[playerId]) {
        createPlayerElement(playerId, {
            x: playerX,
            y: playerY,
            nickname: playerNickname,
            role: playerRole
        });
    }

    const el = players[playerId];
    if (el) {
        el.style.transform = `translate(${playerX}px, ${playerY}px)`;
    }
}

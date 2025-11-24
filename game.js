// Game State
let playerId = localStorage.getItem('night_shift_player_id');
if (!playerId) {
    playerId = 'player_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('night_shift_player_id', playerId);
}

let playerRole = null;
let playerNickname = "Cat";
let playerX = 400;
let playerY = 300;
let playerRoom = "office"; // office, study, hangout
let speed = 4;
let isGameRunning = false;

// Timer State
let personalTimerInterval = null;
let personalTimerEndTime = 0;
let isNearDesk = false;

// Input State
const keys = {
    w: false, a: false, s: false, d: false,
    ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false
};

// Firebase References
let db;
let playersRef;
let myPlayerRef;
let chatRef;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const world = document.getElementById('world');
const connectionStatus = document.getElementById('connection-status');
const nicknameInput = document.getElementById('nickname');
const personalTimerUi = document.getElementById('personal-timer-ui');
const timerDisplay = document.getElementById('timer-display');
const timerControls = document.getElementById('timer-controls');
const stopBtn = document.getElementById('stop-btn');
const chatUi = document.getElementById('chat-ui');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');

// Clock Hands
const hourHand = document.querySelector('.hand.hour');
const minuteHand = document.querySelector('.hand.minute');
const secondHand = document.querySelector('.hand.second');

// Rooms
const rooms = {
    office: document.getElementById('room-office'),
    study: document.getElementById('room-study'),
    hangout: document.getElementById('room-hangout'),
    matchi: document.getElementById('room-matchi'),
    skyview: document.getElementById('room-skyview')
};

// Desk Zones (Study Room)
const deskZones = [
    { x: 160, y: 130 }, // Top Left
    { x: 640, y: 130 }, // Top Right
    { x: 160, y: 330 }, // Bottom Left
    { x: 640, y: 330 }  // Bottom Right
];

// Initialize Game
function startGame(role) {
    const name = nicknameInput.value.trim();
    if (name) playerNickname = name;
    playerRole = role;

    startScreen.style.display = 'none';
    isGameRunning = true;

    // Initialize Firebase
    if (typeof firebase !== 'undefined') {
        try {
            if (!firebase.apps.length && typeof firebaseConfig !== 'undefined') {
                firebase.initializeApp(firebaseConfig);
            }

            db = firebase.database();
            playersRef = db.ref('rooms/default/players');
            myPlayerRef = playersRef.child(playerId);
            chatRef = db.ref('rooms/default/chat');

            updateMyPosition();
            myPlayerRef.onDisconnect().remove();
            setupPlayerListeners();
            setupChatListener();

            db.ref('.info/connected').on('value', (snap) => {
                if (snap.val() === true) connectionStatus.classList.add('hidden');
                else connectionStatus.classList.remove('hidden');
            });

        } catch (e) {
            console.error("Firebase error:", e);
            alert("Firebase error. Check console.");
        }
    }

    // Start Clock
    setInterval(updateClock, 1000);
    updateClock();

    requestAnimationFrame(gameLoop);
}

// Input Listeners
window.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (keys.hasOwnProperty(key)) keys[key] = true;
    if (e.key === 'Enter' && playerRoom === 'hangout') sendChat();
});

window.addEventListener('keyup', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (keys.hasOwnProperty(key)) keys[key] = false;
});

// Mobile Controls
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');

function setupMobileBtn(btn, key) {
    const start = (e) => { e.preventDefault(); keys[key] = true; };
    const end = (e) => { e.preventDefault(); keys[key] = false; };

    btn.addEventListener('touchstart', start);
    btn.addEventListener('touchend', end);
    btn.addEventListener('mousedown', start); // For desktop testing
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
}

if (btnUp) {
    setupMobileBtn(btnUp, 'ArrowUp');
    setupMobileBtn(btnDown, 'ArrowDown');
    setupMobileBtn(btnLeft, 'ArrowLeft');
    setupMobileBtn(btnRight, 'ArrowRight');
}

// Music Logic
const bgMusic = document.getElementById('bg-music');
const musicBtn = document.getElementById('music-toggle');
const vinylDisc = document.getElementById('vinyl-disc');

function toggleMusic() {
    if (bgMusic.paused) {
        bgMusic.play().catch(e => console.log("Audio play failed:", e));
        musicBtn.innerText = "🎵 Pause Music";
        if (vinylDisc) vinylDisc.classList.add('spinning');
    } else {
        bgMusic.pause();
        musicBtn.innerText = "🎵 Play Lofi";
        if (vinylDisc) vinylDisc.classList.remove('spinning');
    }
}

// Game Loop
let lastNetworkUpdate = 0;
let lastCleanup = 0;

function cleanupStalePlayers() {
    const now = Date.now();
    Object.keys(players).forEach(id => {
        if (id === playerId) return; // Don't remove self

        // If lastUpdated is older than 10 seconds, remove
        if (players[id].data.lastUpdated && (now - players[id].data.lastUpdated > 10000)) {
            removePlayerElement(id);
        }
    });
}

function gameLoop() {
    if (!isGameRunning) return;

    try {
        let dx = 0;
        let dy = 0;

        // Movement Logic
        if (document.activeElement !== chatInput) {
            if (keys.w || keys.ArrowUp) dy -= speed;
            if (keys.s || keys.ArrowDown) dy += speed;
            if (keys.a || keys.ArrowLeft) dx -= speed;
            if (keys.d || keys.ArrowRight) dx += speed;

            if (dx !== 0 && dy !== 0) {
                dx *= 0.707;
                dy *= 0.707;
            }

            playerX += dx;
            playerY += dy;

            // Bounds checking
            if (playerX < 0) playerX = 0;
            if (playerY < 0) playerY = 0;
            if (playerX > 760) playerX = 760;
            if (playerY > 560) playerY = 560;
        }

        checkRoomTransitions();
        checkDeskProximity();
        renderMyPlayer();

        // Update network position more frequently if moving
        const now = Date.now();
        const isMoving = dx !== 0 || dy !== 0;
        const updateInterval = isMoving ? 50 : 100; // Faster updates when moving

        if (now - lastNetworkUpdate > updateInterval) {
            updateMyPosition();
            lastNetworkUpdate = now;
        }

        // Cleanup stale players every 1 second
        if (now - lastCleanup > 1000) {
            cleanupStalePlayers();
            lastCleanup = now;
        }

        updatePersonalTimer();

    } catch (e) {
        console.error("Game Loop Error:", e);
    }

    requestAnimationFrame(gameLoop);
}

function checkRoomTransitions() {
    // Office -> Study (left door)
    if (playerRoom === 'office' && playerX < 20 && playerY > 220 && playerY < 360) {
        switchRoom('study', 380, 450);
    }
    // Office -> Hangout (right door)
    else if (playerRoom === 'office' && playerX > 710 && playerY > 220 && playerY < 360) {
        switchRoom('hangout', 380, 450);
    }
    // Office -> Matchi (top door)
    else if (playerRoom === 'office' && playerY < 20 && playerX > 320 && playerX < 480) {
        switchRoom('matchi', 400, 550);
    }
    // Office -> Skyview (bottom-right door)
    else if (playerRoom === 'office' && playerY > 470 && playerX > 630 && playerX < 790) {
        switchRoom('skyview', 400, 50);
    }
    // Study -> Office
    else if (playerRoom === 'study' && playerY > 550 && playerX > 350 && playerX < 450) {
        switchRoom('office', 90, 280);
    }
    // Hangout -> Office
    else if (playerRoom === 'hangout' && playerY > 550 && playerX > 350 && playerX < 450) {
        switchRoom('office', 650, 280);
    }
    // Matchi -> Office (bottom door)
    else if (playerRoom === 'matchi' && playerY > 550 && playerX > 350 && playerX < 450) {
        switchRoom('office', 400, 90);
    }
    // Skyview -> Office (bottom center door)
    else if (playerRoom === 'skyview' && playerY > 460 && playerX > 300 && playerX < 500) {
        switchRoom('office', 650, 400);
    }
}

function switchRoom(newRoom, newX, newY) {
    playerRoom = newRoom;
    playerX = newX;
    playerY = newY;

    Object.values(rooms).forEach(el => el.classList.add('hidden'));
    rooms[newRoom].classList.remove('hidden');

    if (newRoom === 'hangout') chatUi.classList.remove('hidden');
    else chatUi.classList.add('hidden');

    // Hide timer UI when leaving study room, unless running (but hide controls)
    if (newRoom !== 'study') {
        personalTimerUi.classList.add('hidden');
    }

    refreshPlayerVisibility();
}

function checkDeskProximity() {
    if (playerRoom !== 'study') {
        isNearDesk = false;
        return;
    }

    let near = false;
    for (const zone of deskZones) {
        const dist = Math.sqrt(Math.pow(playerX - zone.x, 2) + Math.pow(playerY - zone.y, 2));
        if (dist < 60) {
            near = true;
            break;
        }
    }

    isNearDesk = near;

    // Show UI if near desk OR timer is running
    if (isNearDesk || personalTimerInterval) {
        personalTimerUi.classList.remove('hidden');

        // If timer running, show stop button, hide start controls
        if (personalTimerInterval) {
            timerControls.classList.add('hidden');
            stopBtn.classList.remove('hidden');
        } else {
            // If just near desk and no timer, show start controls
            timerControls.classList.remove('hidden');
            stopBtn.classList.add('hidden');
        }
    } else {
        personalTimerUi.classList.add('hidden');
    }
}

function updateMyPosition() {
    if (!myPlayerRef) return;
    myPlayerRef.set({
        x: playerX,
        y: playerY,
        nickname: playerNickname,
        role: playerRole,
        room: playerRoom,
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    });
}

// Rendering
const players = {};

function setupPlayerListeners() {
    playersRef.on('child_added', (snapshot) => createPlayerElement(snapshot.key, snapshot.val()));
    playersRef.on('child_changed', (snapshot) => updatePlayerElement(snapshot.key, snapshot.val()));
    playersRef.on('child_removed', (snapshot) => removePlayerElement(snapshot.key));
}

function createPlayerElement(id, data) {
    if (players[id]) return;

    // Don't spawn stale players (older than 10 seconds)
    if (data.lastUpdated && (Date.now() - data.lastUpdated > 10000)) {
        return;
    }

    const el = document.createElement('div');
    el.className = `player ${data.role}`;
    el.innerHTML = `
        <div class="nickname">${data.nickname}</div>
        <div class="cat-body"></div>
        <div class="ears"></div>
        <div class="face"></div>
    `;

    world.appendChild(el);
    players[id] = { el, data };
    updatePlayerElement(id, data);
}

function updatePlayerElement(id, data) {
    if (!players[id]) {
        createPlayerElement(id, data);
        if (!players[id]) return; // Still stale/ignored
    }
    const p = players[id];
    p.data = data;

    if (id === playerId) return;

    if (data.room === playerRoom) {
        p.el.style.display = 'block';
        p.el.style.transform = `translate(${data.x}px, ${data.y}px)`;

        if (!p.el.classList.contains(data.role)) p.el.className = `player ${data.role}`;
        const nickEl = p.el.querySelector('.nickname');
        if (nickEl.innerText !== data.nickname) nickEl.innerText = data.nickname;
    } else {
        p.el.style.display = 'none';
    }
}

function removePlayerElement(id) {
    if (players[id]) {
        players[id].el.remove();
        delete players[id];
    }
}

function renderMyPlayer() {
    if (!players[playerId]) {
        createPlayerElement(playerId, { x: playerX, y: playerY, nickname: playerNickname, role: playerRole, room: playerRoom });
    }
    const p = players[playerId];
    if (p) {
        p.el.style.transform = `translate(${playerX}px, ${playerY}px)`;
        p.el.style.display = 'block';
    }
}

function refreshPlayerVisibility() {
    Object.keys(players).forEach(id => {
        if (id !== playerId) updatePlayerElement(id, players[id].data);
    });
}

// Personal Timer Logic
function startPersonalTimer(minutes) {
    personalTimerEndTime = Date.now() + minutes * 60000;
    if (personalTimerInterval) clearInterval(personalTimerInterval);
    updatePersonalTimer();
    personalTimerInterval = setInterval(updatePersonalTimer, 1000);

    // Update UI immediately
    timerControls.classList.add('hidden');
    stopBtn.classList.remove('hidden');
}

function stopPersonalTimer() {
    if (personalTimerInterval) clearInterval(personalTimerInterval);
    personalTimerInterval = null;
    timerDisplay.innerText = "25:00";

    // Update UI
    timerControls.classList.remove('hidden');
    stopBtn.classList.add('hidden');
}

function updatePersonalTimer() {
    if (!personalTimerInterval) return;

    const remaining = personalTimerEndTime - Date.now();
    if (remaining <= 0) {
        stopPersonalTimer();
        timerDisplay.innerText = "00:00";
        alert("Focus session complete!");
        return;
    }

    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    timerDisplay.innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Analog Clock Logic
function updateClock() {
    if (playerRoom !== 'study') return; // Optimization

    const now = new Date();
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours();

    const secondDegrees = ((seconds / 60) * 360);
    const minuteDegrees = ((minutes / 60) * 360) + ((seconds / 60) * 6);
    const hourDegrees = ((hours / 12) * 360) + ((minutes / 60) * 30);

    if (secondHand) secondHand.style.transform = `translateX(-50%) rotate(${secondDegrees}deg)`;
    if (minuteHand) minuteHand.style.transform = `translateX(-50%) rotate(${minuteDegrees}deg)`;
    if (hourHand) hourHand.style.transform = `translateX(-50%) rotate(${hourDegrees}deg)`;
}

// Chat Logic
function setupChatListener() {
    chatRef.limitToLast(20).on('child_added', (snapshot) => {
        const msg = snapshot.val();
        const div = document.createElement('div');
        div.className = 'chat-msg';
        div.innerHTML = `<span class="sender">${msg.sender}:</span> ${msg.text}`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

function sendChat() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatRef.push({
        sender: playerNickname,
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    chatInput.value = '';
}

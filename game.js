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
let isAdmin = false; // Admin status

// Admin Functions
function verifyAdminPassword() {
    const passwordInput = document.getElementById('admin-password');
    if (passwordInput.value === '1234') {
        isAdmin = true;
        document.getElementById('password-modal').classList.add('hidden');
        document.getElementById('admin-controls').classList.remove('hidden');
        startScreen.style.display = 'none';
        isGameRunning = true;
        initGame();
    } else {
        alert('Incorrect Password!');
    }
}

function kickPlayer(targetId) {
    if (!isAdmin) return;
    db.ref('rooms/default/players/' + targetId).remove();
}

function updateGameSpeed(newSpeed) {
    if (!isAdmin) return;
    speed = parseInt(newSpeed);
    // Broadcast speed change to all players (optional, for now just local admin speed)
}

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

// Maze Game State
let mazeRole = null; // 'seeker' or 'hider'
let mazeWalls = [];
let mazeTimer = 0;
let mazeScore = 0;
let mazeGameActive = false;

// Start Screen Flow Function
function proceedToGenderSelection() {
    const nameInput = document.getElementById('nickname');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Please enter your name first!');
        return;
    }

    playerNickname = name;

    // Hide name step, show gender step
    document.getElementById('name-step').classList.add('hidden');
    document.getElementById('gender-step').classList.remove('hidden');
}

// Maze Game Functions
function selectMazeRole(role) {
    mazeRole = role;

    // Hide role selection, show game status
    document.getElementById('maze-role-selection').classList.add('hidden');
    document.getElementById('maze-status').classList.remove('hidden');

    // Update role display
    const roleDisplay = document.getElementById('maze-role-display');
    if (role === 'seeker') {
        roleDisplay.textContent = '🔍 You are the SEEKER';
        roleDisplay.style.color = '#e74c3c';
    } else {
        roleDisplay.textContent = '🙈 You are a HIDER';
        roleDisplay.style.color = '#3498db';
    }

    mazeGameActive = true;

    // Sync role to Firebase
    if (myPlayerRef) {
        myPlayerRef.update({ mazeRole: role });
    }
}

// Initialize maze walls using Recursive Backtracking (DFS)
function initMazeWalls() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Grid settings
    const cols = 16;
    const rows = 9;
    const cellW = w / cols;
    const cellH = h / rows;

    const grid = [];
    const stack = [];

    // Initialize grid
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            grid.push({
                c, r,
                walls: { top: true, right: true, bottom: true, left: true },
                visited: false
            });
        }
    }

    // Helper to get index
    const index = (c, r) => {
        if (c < 0 || r < 0 || c >= cols || r >= rows) return -1;
        return c + r * cols;
    };

    // Start DFS
    let current = grid[0];
    current.visited = true;
    stack.push(current);

    while (stack.length > 0) {
        current = stack.pop();
        const neighbors = [];

        const top = grid[index(current.c, current.r - 1)];
        const right = grid[index(current.c + 1, current.r)];
        const bottom = grid[index(current.c, current.r + 1)];
        const left = grid[index(current.c - 1, current.r)];

        if (top && !top.visited) neighbors.push(top);
        if (right && !right.visited) neighbors.push(right);
        if (bottom && !bottom.visited) neighbors.push(bottom);
        if (left && !left.visited) neighbors.push(left);

        if (neighbors.length > 0) {
            stack.push(current);
            const next = neighbors[Math.floor(Math.random() * neighbors.length)];

            // Remove walls
            if (current.c - next.c === 1) { // Left
                current.walls.left = false;
                next.walls.right = false;
            } else if (current.c - next.c === -1) { // Right
                current.walls.right = false;
                next.walls.left = false;
            } else if (current.r - next.r === 1) { // Top
                current.walls.top = false;
                next.walls.bottom = false;
            } else if (current.r - next.r === -1) { // Bottom
                current.walls.bottom = false;
                next.walls.top = false;
            }

            next.visited = true;
            stack.push(next);
        }
    }

    // Convert grid walls to collision rects and render
    mazeWalls = [];
    const container = document.querySelector('.maze-container');
    if (container) container.innerHTML = ''; // Clear old walls

    const thick = 6;

    grid.forEach(cell => {
        const x = cell.c * cellW;
        const y = cell.r * cellH;

        if (cell.walls.top) addWall(x, y, cellW + thick, thick);
        if (cell.walls.left) addWall(x, y, thick, cellH + thick);
        if (cell.c === cols - 1 && cell.walls.right) addWall(x + cellW, y, thick, cellH + thick);
        if (cell.r === rows - 1 && cell.walls.bottom) addWall(x, y + cellH, cellW + thick, thick);
    });
}

function addWall(x, y, w, h) {
    mazeWalls.push({ x, y, width: w, height: h });

    const div = document.createElement('div');
    div.className = 'maze-wall';
    div.style.left = `${x}px`;
    div.style.top = `${y}px`;
    div.style.width = `${w}px`;
    div.style.height = `${h}px`;

    const container = document.querySelector('.maze-container');
    if (container) container.appendChild(div);
}

// Check collision with maze walls
function checkMazeCollision(newX, newY) {
    if (playerRoom !== 'skyview') return false;

    const playerSize = 25;
    const hitBox = 15;
    const offset = (playerSize - hitBox) / 2;

    const testX = newX + offset;
    const testY = newY + offset;

    for (const wall of mazeWalls) {
        if (testX < wall.x + wall.width &&
            testX + hitBox > wall.x &&
            testY < wall.y + wall.height &&
            testY + hitBox > wall.y) {
            return true;
        }
    }
    return false;
}

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

// Desk Zones (Study Room) - Dynamic
function getDeskZones() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return [
        { x: w * 0.2, y: h * 0.25 }, // Top Left
        { x: w * 0.8, y: h * 0.25 }, // Top Right
        { x: w * 0.2, y: h * 0.75 }, // Bottom Left
        { x: w * 0.8, y: h * 0.75 }  // Bottom Right
    ];
}

// Initialize Game
function initGame() {
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

            // Listen for being kicked
            myPlayerRef.on('value', (snapshot) => {
                if (snapshot.val() === null && isGameRunning) {
                    alert('You have been kicked by an admin!');
                    location.reload();
                }
            });

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

    // Initialize maze walls for collision detection
    initMazeWalls();

    requestAnimationFrame(gameLoop);
}

function startGame(role) {
    const name = nicknameInput.value.trim();
    if (name) playerNickname = name;
    playerRole = role;

    // Check for Admin Login
    if (playerNickname.toLowerCase() === 'mukesh') {
        document.getElementById('password-modal').classList.remove('hidden');
        return; // Stop here, wait for password
    }

    // Check for unique username
    if (typeof firebase !== 'undefined') {
        const dbRef = firebase.database().ref('rooms/default/players');
        dbRef.once('value').then((snapshot) => {
            const players = snapshot.val() || {};
            const isTaken = Object.values(players).some(p =>
                p.nickname && p.nickname.toLowerCase() === playerNickname.toLowerCase()
            );

            if (isTaken) {
                alert('Username already taken! Please choose another one.');
            } else {
                startScreen.style.display = 'none';
                isGameRunning = true;
                initGame();
            }
        }).catch((error) => {
            console.error("Error checking username:", error);
            // Fallback to allow game start if check fails
            startScreen.style.display = 'none';
            isGameRunning = true;
            initGame();
        });
    } else {
        // Fallback for local testing without Firebase
        startScreen.style.display = 'none';
        isGameRunning = true;
        initGame();
    }
}

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

            // Calculate new position
            const newX = playerX + dx;
            const newY = playerY + dy;

            // Check maze wall collision with sliding
            if (playerRoom === 'skyview') {
                const canMoveX = !checkMazeCollision(newX, playerY);
                const canMoveY = !checkMazeCollision(playerX, newY);
                const canMoveBoth = !checkMazeCollision(newX, newY);

                if (canMoveBoth) {
                    playerX = newX;
                    playerY = newY;
                } else if (canMoveX) {
                    playerX = newX;
                } else if (canMoveY) {
                    playerY = newY;
                }
            } else {
                playerX = newX;
                playerY = newY;
            }

            // Dynamic Bounds Checking
            const maxX = window.innerWidth - 25;
            const maxY = window.innerHeight - 25;

            if (playerX < 0) playerX = 0;
            if (playerY < 0) playerY = 0;
            if (playerX > maxX) playerX = maxX;
            if (playerY > maxY) playerY = maxY;
        }

        checkRoomTransitions();
        checkDeskProximity();
        renderMyPlayer();

        // Update network position more frequently if moving
        const now = Date.now();
        const isMoving = dx !== 0 || dy !== 0;
        const updateInterval = isMoving ? 50 : 100;

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
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Office -> Study (left door: top 40%, left 2%)
    if (playerRoom === 'office' && playerX < w * 0.05 && playerY > h * 0.35 && playerY < h * 0.55) {
        switchRoom('study', w * 0.5, h * 0.5);
    }
    // Office -> Hangout (right door: top 40%, right 2%)
    else if (playerRoom === 'office' && playerX > w * 0.95 && playerY > h * 0.35 && playerY < h * 0.55) {
        switchRoom('hangout', w * 0.5, h * 0.5);
    }
    // Office -> Matchi (top door: top 2%, center)
    else if (playerRoom === 'office' && playerY < h * 0.05 && playerX > w * 0.4 && playerX < w * 0.6) {
        switchRoom('matchi', w * 0.5, h * 0.8);
    }
    // Office -> Skyview (bottom-right door: bottom 10%, right 5%)
    else if (playerRoom === 'office' && playerY > h * 0.85 && playerX > w * 0.85) {
        switchRoom('skyview', w * 0.1, h * 0.1);
    }

    // Back to Office (from any room)
    else if (playerRoom !== 'office' && playerRoom !== 'skyview') {
        // Bottom center door
        if (playerY > h * 0.9 && playerX > w * 0.4 && playerX < w * 0.6) {
            switchRoom('office', w * 0.5, h * 0.5);
        }
    }
}

function switchRoom(newRoom, newX, newY) {
    // Handle percentage strings if passed
    if (typeof newX === 'string' && newX.includes('%')) {
        newX = (parseFloat(newX) / 100) * window.innerWidth;
    }
    if (typeof newY === 'string' && newY.includes('%')) {
        newY = (parseFloat(newY) / 100) * window.innerHeight;
    }

    playerRoom = newRoom;
    playerX = newX;
    playerY = newY;

    Object.values(rooms).forEach(el => el.classList.add('hidden'));
    rooms[newRoom].classList.remove('hidden');

    if (newRoom === 'hangout') chatUi.classList.remove('hidden');
    else chatUi.classList.add('hidden');

    if (newRoom !== 'study') {
        personalTimerUi.classList.add('hidden');
    }

    // Re-init maze walls if entering skyview
    if (newRoom === 'skyview') {
        initMazeWalls();
    }

    refreshPlayerVisibility();
}

function checkDeskProximity() {
    if (playerRoom !== 'study') {
        isNearDesk = false;
        return;
    }

    let near = false;
    const zones = getDeskZones();

    for (const zone of zones) {
        const dist = Math.sqrt(Math.pow(playerX - zone.x, 2) + Math.pow(playerY - zone.y, 2));
        if (dist < 100) {
            near = true;
            break;
        }
    }

    isNearDesk = near;

    if (isNearDesk || personalTimerInterval) {
        personalTimerUi.classList.remove('hidden');
        if (personalTimerInterval) {
            timerControls.classList.add('hidden');
            stopBtn.classList.remove('hidden');
        } else {
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
        if (!players[id]) return;
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

// Personal Timer Logic
function startPersonalTimer(minutes) {
    personalTimerEndTime = Date.now() + minutes * 60000;
    if (personalTimerInterval) clearInterval(personalTimerInterval);
    updatePersonalTimer();
    personalTimerInterval = setInterval(updatePersonalTimer, 1000);

    timerControls.classList.add('hidden');
    stopBtn.classList.remove('hidden');
}

function stopPersonalTimer() {
    if (personalTimerInterval) clearInterval(personalTimerInterval);
    personalTimerInterval = null;
    timerDisplay.innerText = "25:00";

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
    if (playerRoom !== 'study') return;

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

// Keyboard Input
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Render local player position
function renderMyPlayer() {
    if (!players[playerId]) return;
    const p = players[playerId];

    // Ensure visible
    p.el.style.display = 'block';
    p.el.style.transform = `translate(${playerX}px, ${playerY}px)`;

    // Update role class if changed
    if (!p.el.classList.contains(playerRole)) {
        p.el.className = `player ${playerRole}`;
    }
}

// Helper to refresh visibility when switching rooms
function refreshPlayerVisibility() {
    Object.keys(players).forEach(id => {
        updatePlayerElement(id, players[id].data);
    });
}

// Handle resize events to update walls
window.addEventListener('resize', () => {
    initMazeWalls();
});

// Initial call
initMazeWalls();

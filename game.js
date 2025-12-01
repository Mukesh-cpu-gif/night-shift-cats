/**
 * NIGHT SHIFT - MULTIPLAYER GAME ENGINE
 * 
 * ASSET CHECKLIST
 * Place these images in an 'assets' folder next to index.html:
 * 
 * Backgrounds:
 * - bg_office.png
 * - bg_study.png
 * - bg_hangout.png
 * - bg_matchi.png
 * - bg_skyview.png
 * 
 * Characters:
 * - char_boy.png
 * - char_girl.png
 * 
 * Props:
 * - prop_desk_back.png
 * - prop_desk_front.png
 * - prop_plant.png
 * - prop_bookshelf.png
 * - prop_rug_round.png
 * - prop_coffee_machine.png
 * - prop_jukebox.png
 * - prop_door_frame.png
 * - prop_computer.png
 * - prop_blueberry.png
 */

const CONFIG = {
    WORLD_WIDTH: 1600,
    WORLD_HEIGHT: 900,
    PLAYER_SPEED: 200,
    TICK_RATE: 30,
    COLORS: {
        OFFICE_BG: '#2c3e50',
        STUDY_BG: '#34495e',
        HANGOUT_BG: '#1a252f',
        MATCHI_BG: '#000000',
        SKYVIEW_BG: '#87CEEB',
        BOY: '#3498db',
        GIRL: '#e91e63',
        WOOD: '#8d6e63',
        SCREEN: '#00ffff'
    }
};

const ASSETS_LIST = {
    // Backgrounds (We changed these to .jpg to match your files)
    bg_office: 'assets/bg_office.jpg',
    bg_study: 'assets/bg_study.jpg',
    bg_hangout: 'assets/bg_hangout.jpg',
    bg_skyview: 'assets/bg_skyview.jpg',

    // Make sure you renamed 'matchi room' to 'bg_matchi.jpg' inside the assets folder!
    // If it's still a PNG, change this line to 'assets/bg_matchi.png'
    bg_matchi: 'assets/bg_matchi.jpg',

    // Characters (Keep these as .png for transparency)
    char_boy: 'assets/char_boy.png',
    char_girl: 'assets/char_girl.png',

    // Props (Keep these as .png for transparency)
    prop_desk_back: 'assets/prop_desk.png',
    prop_desk_front: 'assets/prop_desk.png',
    prop_plant: 'assets/prop_plant.png',
    prop_bookshelf: 'assets/prop_desk.png',
    prop_rug_round: 'assets/prop_rug.png',
    prop_coffee_machine: 'assets/prop_coffee.png',
    prop_jukebox: 'assets/prop_jukebox.png',
    prop_door_frame: 'assets/prop_door.png',
    prop_computer: 'assets/prop_desk.png',
    prop_blueberry: 'assets/prop_desk.png'
};

// ============================================================================
// MATH UTILS
// ============================================================================
class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vector2(this.x - v.x, this.y - v.y); }
    mult(s) { return new Vector2(this.x * s, this.y * s); }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() {
        const m = this.mag();
        return m === 0 ? new Vector2(0, 0) : this.mult(1 / m);
    }
    dist(v) { return this.sub(v).mag(); }
    lerp(v, t) {
        return new Vector2(
            this.x + (v.x - this.x) * t,
            this.y + (v.y - this.y) * t
        );
    }
}

// ============================================================================
// ASSET MANAGER
// ============================================================================
class AssetManager {
    constructor() {
        this.images = {};
        this.loadedCount = 0;
        this.totalCount = Object.keys(ASSETS_LIST).length;
        this.useFallback = false;
    }

    async init() {
        const promises = Object.entries(ASSETS_LIST).map(([key, src]) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.images[key] = img;
                    this.loadedCount++;
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load asset: ${key} (${src})`);
                    this.images[key] = null; // Mark as missing
                    resolve();
                };
                img.src = src;
            });
        });

        await Promise.all(promises);
        console.log(`Assets loaded: ${this.loadedCount}/${this.totalCount}`);
        if (this.loadedCount < this.totalCount) {
            this.useFallback = true;
        }
    }

    get(key) {
        return this.images[key];
    }
}

// ============================================================================
// INPUT MANAGER
// ============================================================================
class InputManager {
    constructor() {
        this.keys = {};
        this.direction = new Vector2(0, 0);
        this.interactPressed = false;

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        this.setupMobileControls();
    }

    onKeyDown(e) {
        if (!e || !e.key) return;

        // ESC to exit game
        if (e.key === 'Escape') {
            if (window.game && window.game.localPlayer) {
                if (confirm('Exit game and return to start screen?')) {
                    window.game.exitGame();
                }
            }
            return;
        }

        // Toggle Debug Mode
        if (e.key === '0') {
            if (window.game) window.game.debugMode = !window.game.debugMode;
        }

        this.keys[e.key] = true;
        if (e.key.toLowerCase() === 'e') this.interactPressed = true;
        this.updateDirection();
    }

    onKeyUp(e) {
        if (!e || !e.key) return;
        this.keys[e.key] = false;
        if (e.key.toLowerCase() === 'e') this.interactPressed = false;
        this.updateDirection();
    }

    updateDirection() {
        let x = 0, y = 0;
        if (this.keys['w'] || this.keys['ArrowUp']) y -= 1;
        if (this.keys['s'] || this.keys['ArrowDown']) y += 1;
        if (this.keys['a'] || this.keys['ArrowLeft']) x -= 1;
        if (this.keys['d'] || this.keys['ArrowRight']) x += 1;
        this.direction = new Vector2(x, y).normalize();
    }

    setupMobileControls() {
        const bindBtn = (id, key) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const start = (e) => { e.preventDefault(); this.keys[key] = true; this.updateDirection(); };
            const end = (e) => { e.preventDefault(); this.keys[key] = false; this.updateDirection(); };
            btn.addEventListener('touchstart', start);
            btn.addEventListener('touchend', end);
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', end);
        };

        bindBtn('btn-up', 'ArrowUp');
        bindBtn('btn-down', 'ArrowDown');
        bindBtn('btn-left', 'ArrowLeft');
        bindBtn('btn-right', 'ArrowRight');

        const interactBtn = document.getElementById('btn-interact');
        if (interactBtn) {
            interactBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.interactPressed = true; });
            interactBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.interactPressed = false; });
        }
    }
}

// ============================================================================
// NETWORK MANAGER
// ============================================================================
class NetworkManager {
    constructor(game) {
        this.game = game;
        this.db = null;
        this.playersRef = null;
        this.myRef = null;
        this.lastUpdate = 0;
        this.updateInterval = 1000 / CONFIG.TICK_RATE;
    }

    init(playerId, playerData) {
        if (typeof firebase === 'undefined') {
            console.warn("Firebase not loaded. Offline mode.");
            return;
        }

        this.db = firebase.database();
        this.playersRef = this.db.ref('rooms/default/players');
        this.myRef = this.playersRef.child(playerId);

        this.myRef.set(playerData);
        this.myRef.onDisconnect().remove();

        this.playersRef.on('child_added', (snap) => this.game.addRemotePlayer(snap.key, snap.val()));
        this.playersRef.on('child_changed', (snap) => this.game.updateRemotePlayer(snap.key, snap.val()));
        this.playersRef.on('child_removed', (snap) => this.game.removeRemotePlayer(snap.key));

        this.chatRef = this.db.ref('rooms/default/chat');
        this.chatRef.limitToLast(10).on('child_added', (snap) => this.game.addChatMessage(snap.val()));

        this.db.ref('.info/connected').on('value', (snap) => {
            document.getElementById('connection-status').classList.toggle('hidden', snap.val());
        });
    }

    update(player) {
        if (!this.myRef) return;
        const now = Date.now();
        if (now - this.lastUpdate > this.updateInterval) {
            this.myRef.update({
                x: Math.round(player.pos.x),
                y: Math.round(player.pos.y),
                room: player.room,
                lastUpdated: firebase.database.ServerValue.TIMESTAMP
            });
            this.lastUpdate = now;
        }
    }

    sendChat() {
        const input = document.getElementById('chat-input');
        const msg = input.value.trim();
        if (!msg) return;

        const name = this.game.localPlayer?.nickname || 'Guest';
        this.chatRef.push({
            name: name,
            msg: msg,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        input.value = '';
    }
}

// ============================================================================
// MAZE GENERATOR
// ============================================================================
class MazeGenerator {
    constructor(cols, rows, seed) {
        this.cols = cols;
        this.rows = rows;
        this.grid = [];
        this.seed = seed;
        this.random = this.seededRandom(seed);
    }

    seededRandom(seed) {
        const m = 0x80000000;
        const a = 1103515245;
        const c = 12345;
        let state = seed;
        return function () {
            state = (a * state + c) % m;
            return state / (m - 1);
        };
    }

    generate() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                this.grid.push({
                    c, r,
                    walls: { top: true, right: true, bottom: true, left: true },
                    visited: false
                });
            }
        }

        const stack = [];
        let current = this.grid[0];
        current.visited = true;
        stack.push(current);

        while (stack.length > 0) {
            current = stack.pop();
            const neighbors = this.getUnvisitedNeighbors(current);

            if (neighbors.length > 0) {
                stack.push(current);
                const next = neighbors[Math.floor(this.random() * neighbors.length)];

                if (current.c - next.c === 1) {
                    current.walls.left = false;
                    next.walls.right = false;
                } else if (current.c - next.c === -1) {
                    current.walls.right = false;
                    next.walls.left = false;
                } else if (current.r - next.r === 1) {
                    current.walls.top = false;
                    next.walls.bottom = false;
                } else if (current.r - next.r === -1) {
                    current.walls.bottom = false;
                    next.walls.top = false;
                }

                next.visited = true;
                stack.push(next);
            }
        }
        return this.grid;
    }

    getUnvisitedNeighbors(cell) {
        const neighbors = [];
        const index = (c, r) => {
            if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1;
            return c + r * this.cols;
        };

        const top = this.grid[index(cell.c, cell.r - 1)];
        const right = this.grid[index(cell.c + 1, cell.r)];
        const bottom = this.grid[index(cell.c, cell.r + 1)];
        const left = this.grid[index(cell.c - 1, cell.r)];

        if (top && !top.visited) neighbors.push(top);
        if (right && !right.visited) neighbors.push(right);
        if (bottom && !bottom.visited) neighbors.push(bottom);
        if (left && !left.visited) neighbors.push(left);

        return neighbors;
    }
}

// ============================================================================
// GAME ENTITIES
// ============================================================================
class Entity {
    constructor(x, y) {
        this.pos = new Vector2(x, y);
        this.z = 0; // For Y-sorting
    }

    getSortY() {
        return this.pos.y;
    }
}

class Player extends Entity {
    constructor(id, data, isLocal = false) {
        super(data.x, data.y);
        this.id = id;
        this.nickname = data.nickname;
        this.role = data.role;
        this.room = data.room;
        this.targetPos = new Vector2(data.x, data.y);
        this.isLocal = isLocal;
        this.color = this.role === 'boy' ? CONFIG.COLORS.BOY : CONFIG.COLORS.GIRL;
        this.breathePhase = 0;
        this.isMoving = false;
        this.speedMultiplier = 1.0;
        this.speedParticles = [];
        this.speedParticles = [];
        this.lastSeen = Date.now();
        this.radius = 12; // Smaller radius for smoother movement
    }

    update(dt) {
        if (!this.isLocal) {
            const dist = this.pos.dist(this.targetPos);
            if (dist > 200) {
                this.pos = this.targetPos;
            } else {
                this.pos = this.pos.lerp(this.targetPos, Math.min(1, dt * 10));
            }
            this.isMoving = dist > 1;
        }

        this.breathePhase += dt * 10; // Faster bobbing

        // Speed particles
        if (this.speedMultiplier > 1 && this.isMoving) {
            if (Math.random() < 0.3) {
                this.speedParticles.push({
                    pos: new Vector2(this.pos.x, this.pos.y),
                    life: 0.5
                });
            }
        }

        this.speedParticles.forEach(p => p.life -= dt);
        this.speedParticles = this.speedParticles.filter(p => p.life > 0);
    }

    draw(ctx, assets) {
        const bobOffset = this.isMoving ? Math.sin(this.breathePhase) * 3 : 0;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(this.pos.x, this.pos.y + 5, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sprite
        const spriteKey = this.role === 'boy' ? 'char_boy' : 'char_girl';
        const img = assets.get(spriteKey);

        if (img) {
            const size = 60; // Fixed height
            const ratio = img.width / img.height;
            const w = size * ratio;
            const h = size;
            // Draw relative to feet (pos.x, pos.y)
            ctx.drawImage(img, this.pos.x - w / 2, this.pos.y - h + bobOffset, w, h);
        } else {
            // Fallback
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y - 20 + bobOffset, 20, 0, Math.PI * 2);
            ctx.fill();

            // Ears
            ctx.beginPath();
            ctx.moveTo(this.pos.x - 15, this.pos.y - 30 + bobOffset);
            ctx.lineTo(this.pos.x - 25, this.pos.y - 50 + bobOffset);
            ctx.lineTo(this.pos.x - 5, this.pos.y - 35 + bobOffset);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(this.pos.x + 15, this.pos.y - 30 + bobOffset);
            ctx.lineTo(this.pos.x + 25, this.pos.y - 50 + bobOffset);
            ctx.lineTo(this.pos.x + 5, this.pos.y - 35 + bobOffset);
            ctx.fill();
        }

        // Nickname
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillText(this.nickname, this.pos.x, this.pos.y - 65 + bobOffset);
        ctx.shadowBlur = 0;
    }
}

class Door extends Entity {
    constructor(x, y, targetRoom, label) {
        super(x, y);
        this.width = 100;  // Standard Door Width
        this.height = 120; // Standard Door Height
        this.targetRoom = targetRoom;
        this.label = label;
        this.pos.y += 20;
    }

    checkCollision(playerPos) {
        return (playerPos.x > this.pos.x && playerPos.x < this.pos.x + this.width &&
            playerPos.y > this.pos.y - 20 && playerPos.y < this.pos.y + this.height - 20);
    }

    draw(ctx, assets) {
        const img = assets.get('prop_door_frame');

        // Draw Door
        if (img) {
            ctx.drawImage(img, this.pos.x, this.pos.y - this.height, this.width, this.height);
        } else {
            // Fallback
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(this.pos.x, this.pos.y - this.height, this.width, this.height);
            ctx.strokeStyle = '#3e2723';
            ctx.lineWidth = 4;
            ctx.strokeRect(this.pos.x, this.pos.y - this.height, this.width, this.height);
        }

        // Label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillText(this.label, this.pos.x + this.width / 2, this.pos.y - this.height - 10);
        ctx.shadowBlur = 0;
    }
}

class Interactable extends Entity {
    constructor(x, y, type, label) {
        super(x, y);
        this.type = type;
        this.label = label;
        this.isOn = false;
        this.isPlaying = false;

        // SIZE POLICE: Force specific sizes for gameplay balance
        const size = this.getSize();
        this.width = size.w;
        this.height = size.h;
    }

    // This function decides exactly how big everything should be
    getSize() {
        switch (this.type) {
            case 'jukebox': return { w: 100, h: 120 };
            case 'computer': return { w: 80, h: 80 }; // Desk size
            case 'coffee': return { w: 60, h: 70 };
            case 'bookshelf': return { w: 100, h: 150 };
            case 'blueberry': return { w: 40, h: 40 };
            case 'plant': return { w: 50, h: 70 };
            default: return { w: 50, h: 50 }; // Default for unknowns
        }
    }

    checkProximity(playerPos) {
        return this.pos.dist(playerPos) < 50;
    }

    getPrompt() {
        if (this.type === 'coffee') return 'Press E to Drink';
        if (this.type === 'computer') return 'Press E to Work';
        if (this.type === 'jukebox') return 'Press E to Play Music';
        if (this.type === 'blueberry') return 'Press E to Collect';
        return 'Press E';
    }

    interact(game) {
        if (this.type === 'coffee') {
            game.localPlayer.speedMultiplier = 1.8;
            game.showFloatingText('CAFFEINE RUSH!', this.pos.x, this.pos.y - 50);
            setTimeout(() => { if (game.localPlayer) game.localPlayer.speedMultiplier = 1.0; }, 5000);
        } else if (this.type === 'computer') {
            this.isOn = !this.isOn;
        } else if (this.type === 'jukebox') {
            this.isPlaying = !this.isPlaying;
            if (this.isPlaying) game.bgm.play().catch(e => console.log(e));
            else game.bgm.pause();
        } else if (this.type === 'blueberry') {
            return true;
        }
        return false;
    }

    draw(ctx, assets, isHovered) {
        // use 'prop_desk' for computers to save time
        let assetKey = `prop_${this.type}`;
        if (this.type === 'computer') assetKey = 'prop_desk_front';

        const img = assets.get(assetKey);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(this.pos.x, this.pos.y, this.width / 2, this.height / 5, 0, 0, Math.PI * 2);
        ctx.fill();

        if (isHovered) {
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 10;
        }

        if (img) {
            // DRAW IMAGE AT FORCED SIZE, NOT IMAGE SIZE
            ctx.drawImage(img, this.pos.x - this.width / 2, this.pos.y - this.height + 10, this.width, this.height);
        } else {
            // Fallback Box
            ctx.fillStyle = '#bdc3c7';
            ctx.fillRect(this.pos.x - this.width / 2, this.pos.y - this.height, this.width, this.height);
        }
        ctx.shadowBlur = 0;
    }
}

class RoseParticle {
    constructor(x, y) {
        this.pos = new Vector2(x + (Math.random() - 0.5) * 100, y - 50);
        this.vel = new Vector2((Math.random() - 0.5) * 2, Math.random() * 2 + 1);
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.life = 1.0;
        this.fadeSpeed = 0.01;
        this.size = 15 + Math.random() * 10;
        this.color = Math.random() > 0.5 ? '#ff6b9d' : '#ff1744';
    }

    update(dt) {
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
        this.rotation += this.rotationSpeed;
        this.life -= this.fadeSpeed;
        this.vel.x += Math.sin(Date.now() / 500) * 0.05;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class FloatingText {
    constructor(text, x, y) {
        this.text = text;
        this.pos = new Vector2(x, y);
        this.life = 2.0;
        this.vel = new Vector2(0, -50);
    }

    update(dt) {
        this.pos.y += this.vel.y * dt;
        this.life -= dt;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life / 2;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, this.pos.x, this.pos.y);
        ctx.fillText(this.text, this.pos.x, this.pos.y);
        ctx.restore();
    }
}

class MusicNote {
    constructor(x, y) {
        this.pos = new Vector2(x + (Math.random() - 0.5) * 60, y - 50);
        this.vel = new Vector2((Math.random() - 0.5) * 50, -100 - Math.random() * 50);
        this.life = 1.5;
        this.symbol = Math.random() > 0.5 ? '♪' : '♫';
        this.size = 20 + Math.random() * 10;
    }

    update(dt) {
        this.pos = this.pos.add(this.vel.mult(dt));
        this.life -= dt;
        this.vel.x += Math.sin(Date.now() / 200) * 2;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = `hsl(${Date.now() / 10 % 360}, 100%, 70%)`;
        ctx.font = `bold ${this.size}px Arial`;
        ctx.fillText(this.symbol, this.pos.x, this.pos.y);
        ctx.restore();
    }
}

// ============================================================================
// RENDERER
// ============================================================================
class Renderer {
    constructor(canvasId, assets) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.assets = assets;
        this.camera = new Vector2(0, 0);
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    updateCamera(targetPos) {
        const center = new Vector2(this.canvas.width / 2, this.canvas.height / 2);
        const target = targetPos.sub(center);
        this.camera = this.camera.lerp(target, 0.1);
    }

    clear() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawRoom(room, isPartyTime) {
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        const W = CONFIG.WORLD_WIDTH;
        const H = CONFIG.WORLD_HEIGHT;
        const bgKey = `bg_${room}`;
        const img = this.assets.get(bgKey);

        if (img) {
            this.ctx.drawImage(img, 0, 0, W, H);
        } else {
            // Fallback Backgrounds
            if (room === 'office') this.ctx.fillStyle = CONFIG.COLORS.OFFICE_BG;
            else if (room === 'study') this.ctx.fillStyle = CONFIG.COLORS.STUDY_BG;
            else if (room === 'hangout') this.ctx.fillStyle = CONFIG.COLORS.HANGOUT_BG;
            else if (room === 'matchi') this.ctx.fillStyle = CONFIG.COLORS.MATCHI_BG;
            else this.ctx.fillStyle = '#333';

            this.ctx.fillRect(0, 0, W, H);

            // Grid for fallback
            this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            this.ctx.lineWidth = 1;
            for (let x = 0; x < W; x += 50) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, H);
                this.ctx.stroke();
            }
            for (let y = 0; y < H; y += 50) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(W, y);
                this.ctx.stroke();
            }
        }

        // Party Mode Effects (Hangout)
        if (room === 'hangout' && isPartyTime) {
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'overlay';
            const time = Date.now() / 1000;
            for (let i = 0; i < 5; i++) {
                const angle = time + i * (Math.PI * 2 / 5);
                const x = W / 2 + Math.cos(angle) * 300;
                const y = W / 2 + Math.sin(angle) * 300;

                const grad = this.ctx.createRadialGradient(x, y, 0, x, y, 200);
                grad.addColorStop(0, `hsla(${i * 72}, 100%, 50%, 0.5)`);
                grad.addColorStop(1, 'transparent');

                this.ctx.fillStyle = grad;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 200, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();
        }

        this.ctx.restore();
    }

    drawMaze(mazeGrid, cellW, cellH) {
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;

        mazeGrid.forEach(cell => {
            const x = cell.c * cellW;
            const y = cell.r * cellH;
            if (cell.walls.top) { this.ctx.beginPath(); this.ctx.moveTo(x, y); this.ctx.lineTo(x + cellW, y); this.ctx.stroke(); }
            if (cell.walls.right) { this.ctx.beginPath(); this.ctx.moveTo(x + cellW, y); this.ctx.lineTo(x + cellW, y + cellH); this.ctx.stroke(); }
            if (cell.walls.bottom) { this.ctx.beginPath(); this.ctx.moveTo(x, y + cellH); this.ctx.lineTo(x + cellW, y + cellH); this.ctx.stroke(); }
            if (cell.walls.left) { this.ctx.beginPath(); this.ctx.moveTo(x, y); this.ctx.lineTo(x, y + cellH); this.ctx.stroke(); }
        });
        this.ctx.restore();
    }

    drawEntities(entities, hoveredEntity) {
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        // Y-Sort
        entities.sort((a, b) => a.getSortY() - b.getSortY());

        entities.forEach(e => {
            const isHovered = e === hoveredEntity;
            e.draw(this.ctx, this.assets, isHovered);

            // Debug Draw
            if (window.game && window.game.debugMode) {
                this.ctx.strokeStyle = 'red';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();

                if (e instanceof Player) {
                    this.ctx.arc(e.pos.x, e.pos.y, e.radius || 12, 0, Math.PI * 2);
                } else if (e instanceof Interactable) {
                    this.ctx.arc(e.pos.x, e.pos.y, 20, 0, Math.PI * 2); // Interaction zone center
                } else if (e instanceof Door) {
                    this.ctx.rect(e.pos.x, e.pos.y - e.height, e.width, e.height);
                }
                this.ctx.stroke();
            }
        });

        this.ctx.restore();
    }

    drawLighting(player) {
        const centerX = player.pos.x - this.camera.x;
        const centerY = player.pos.y - this.camera.y;

        const lanternGrad = this.ctx.createRadialGradient(centerX, centerY, 50, centerX, centerY, 400);
        lanternGrad.addColorStop(0, 'rgba(0,0,0,0)');
        lanternGrad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
        lanternGrad.addColorStop(1, 'rgba(0,0,0,0.7)');

        this.ctx.fillStyle = lanternGrad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// ============================================================================
// MAIN GAME CLASS
// ============================================================================
class Game {
    constructor() {
        this.playerId = localStorage.getItem('night_shift_player_id') || 'player_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('night_shift_player_id', this.playerId);

        this.assets = new AssetManager();
        this.renderer = null;
        this.input = new InputManager();
        this.network = new NetworkManager(this);

        this.localPlayer = null;
        this.remotePlayers = {};
        this.doors = [];
        this.interactables = [];
        this.inventory = [];
        this.isAdmin = false;
        this.roseParticles = [];
        this.musicNotes = [];
        this.floatingTexts = [];

        // Audio System
        try {
            this.bgm = new Audio('https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3');
            this.bgm.loop = true;
            this.bgm.crossOrigin = "anonymous"; // Try to fix CORS
        } catch (e) {
            console.warn("Audio failed to initialize:", e);
            this.bgm = { play: () => Promise.resolve(), pause: () => { } };
        }

        this.mazeGrid = null;
        this.cellW = 0;
        this.cellH = 0;
        this.lastTime = 0;
        this.debugMode = false;
    }

    async init() {
        await this.assets.init();
        this.renderer = new Renderer('game-canvas', this.assets);

        if (typeof firebase !== 'undefined') {
            const db = firebase.database();
            db.ref('global/cmd').on('value', (snap) => {
                const cmdData = snap.val();
                // Increased timeout to 10s to handle clock skew
                if (cmdData && cmdData.time && Date.now() - cmdData.time < 10000) {
                    if (cmdData.cmd === 'teleport' || cmdData.cmd === 'teleport_all') {
                        if (this.localPlayer) this.switchRoom(cmdData.arg);
                    } else if (cmdData.cmd === 'rose_shower') {
                        this.triggerRoseShower();
                    }
                }
            });
        }
    }

    start(nickname, role) {
        this.localPlayer = new Player(this.playerId, {
            x: CONFIG.WORLD_WIDTH / 2,
            y: CONFIG.WORLD_HEIGHT / 2,
            nickname: nickname,
            role: role,
            room: 'office'
        }, true);

        this.buildRoom('office');

        this.network.init(this.playerId, {
            x: CONFIG.WORLD_WIDTH / 2,
            y: CONFIG.WORLD_HEIGHT / 2,
            nickname: nickname,
            role: role,
            room: 'office'
        });

        requestAnimationFrame((t) => this.loop(t));
    }

    buildRoom(roomName) {
        this.doors = [];
        this.interactables = [];
        const W = CONFIG.WORLD_WIDTH;
        const H = CONFIG.WORLD_HEIGHT;
        const centerX = W / 2;
        const centerY = H / 2;

        // Structured Room Layouts
        if (roomName === 'office') {
            this.doors.push(new Door(50, centerY - 50, 'study', 'STUDY'));
            this.doors.push(new Door(W - 150, centerY - 50, 'hangout', 'HANGOUT'));
            this.doors.push(new Door(centerX - 50, 50, 'matchi', 'MATCHI'));
            this.doors.push(new Door(centerX - 50, H - 150, 'skyview', 'SKYVIEW'));

            // Props
            this.interactables.push(new Interactable(75, 300, 'coffee', 'Coffee Machine'));
            this.interactables.push(new Interactable(200, 200, 'computer', 'PC'));
            this.interactables.push(new Interactable(W - 200, 200, 'computer', 'PC'));
            this.interactables.push(new Interactable(200, H - 200, 'computer', 'PC'));
            this.interactables.push(new Interactable(W - 200, H - 200, 'computer', 'PC'));

        } else if (roomName === 'study') {
            this.doors.push(new Door(centerX - 50, H - 150, 'office', 'OFFICE'));
            this.interactables.push(new Interactable(200, 200, 'bookshelf', 'Books'));
            this.interactables.push(new Interactable(W - 200, 200, 'bookshelf', 'Books'));

        } else if (roomName === 'hangout') {
            this.doors.push(new Door(50, centerY - 50, 'office', 'OFFICE'));
            this.interactables.push(new Interactable(centerX, H - 200, 'blueberry', 'Blueberry'));
            this.interactables.push(new Interactable(W - 150, centerY, 'jukebox', 'Jukebox'));

        } else if (roomName === 'matchi') {
            this.doors.push(new Door(centerX - 50, H - 150, 'office', 'OFFICE'));

        } else if (roomName === 'skyview') {
            this.doors.push(new Door(50, 50, 'office', 'OFFICE'));
            const today = new Date();
            const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
            const generator = new MazeGenerator(16, 9, seed);
            this.mazeGrid = generator.generate();
            this.cellW = W / 16;
            this.cellH = H / 9;
        }
    }

    switchRoom(newRoom) {
        this.localPlayer.room = newRoom;
        this.localPlayer.pos = new Vector2(CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2);
        this.buildRoom(newRoom);
    }

    addRemotePlayer(id, data) {
        if (id === this.playerId) return;
        this.remotePlayers[id] = new Player(id, data);
    }

    updateRemotePlayer(id, data) {
        if (id === this.playerId) return;
        if (this.remotePlayers[id]) {
            this.remotePlayers[id].targetPos = new Vector2(data.x, data.y);
            this.remotePlayers[id].room = data.room;
            this.remotePlayers[id].lastSeen = Date.now();
        }
    }

    removeRemotePlayer(id) {
        delete this.remotePlayers[id];
    }

    addChatMessage(data) {
        const div = document.createElement('div');
        div.innerHTML = `<b>${data.name || 'Guest'}:</b> ${data.msg}`;
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showFloatingText(text, x, y) {
        this.floatingTexts.push(new FloatingText(text, x, y));
    }

    loop(timestamp) {
        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        this.update(dt);
        this.draw();
        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        if (!this.localPlayer) return;

        // UI Updates
        const chatUI = document.getElementById('chat-ui');
        if (chatUI) chatUI.style.display = this.localPlayer.room === 'hangout' ? 'block' : 'none';

        const inventoryUI = document.getElementById('inventory-ui');
        if (inventoryUI) inventoryUI.style.display = this.inventory.length > 0 ? 'block' : 'none';

        // Movement
        const move = this.input.direction.mult(CONFIG.PLAYER_SPEED * this.localPlayer.speedMultiplier * dt);
        this.localPlayer.pos = this.localPlayer.pos.add(move);
        this.localPlayer.isMoving = move.mag() > 0;

        // Bounds
        this.localPlayer.pos.x = Math.max(50, Math.min(CONFIG.WORLD_WIDTH - 50, this.localPlayer.pos.x));
        this.localPlayer.pos.y = Math.max(50, Math.min(CONFIG.WORLD_HEIGHT - 50, this.localPlayer.pos.y));

        // Maze Collision
        if (this.localPlayer.room === 'skyview' && this.mazeGrid) {
            const col = Math.floor(this.localPlayer.pos.x / this.cellW);
            const row = Math.floor(this.localPlayer.pos.y / this.cellH);
            const cell = this.mazeGrid[col + row * 12];
            if (cell) {
                const cellX = col * this.cellW;
                const cellY = row * this.cellH;
                const margin = this.localPlayer.radius; // Use player radius
                if (cell.walls.left && this.localPlayer.pos.x < cellX + margin) this.localPlayer.pos.x = cellX + margin;
                if (cell.walls.right && this.localPlayer.pos.x > cellX + this.cellW - margin) this.localPlayer.pos.x = cellX + this.cellW - margin;
                if (cell.walls.top && this.localPlayer.pos.y < cellY + margin) this.localPlayer.pos.y = cellY + margin;
                if (cell.walls.bottom && this.localPlayer.pos.y > cellY + this.cellH - margin) this.localPlayer.pos.y = cellY + this.cellH - margin;
            }
        }

        // Door Collision
        for (let door of this.doors) {
            if (door.checkCollision(this.localPlayer.pos)) {
                this.switchRoom(door.targetRoom);
                break;
            }
        }

        // Interaction Proximity
        let nearObj = null;
        for (let obj of this.interactables) {
            if (obj.checkProximity(this.localPlayer.pos)) {
                nearObj = obj;
                break;
            }
        }

        const bubble = document.getElementById('interaction-bubble');
        if (nearObj) {
            const screenX = nearObj.pos.x - this.renderer.camera.x;
            const screenY = nearObj.pos.y - this.renderer.camera.y - 60;
            bubble.style.left = `${screenX}px`;
            bubble.style.top = `${screenY}px`;
            bubble.textContent = nearObj.getPrompt();
            bubble.classList.remove('hidden');

            if (this.input.interactPressed) {
                const consumed = nearObj.interact(this);
                if (consumed) {
                    if (nearObj.type === 'blueberry') {
                        this.inventory.push('Blueberry');
                        this.interactables = this.interactables.filter(o => o !== nearObj);
                        this.updateInventory();
                    }
                }
                this.input.interactPressed = false;
            }
        } else {
            bubble.classList.add('hidden');
        }

        // Remote Players Cleanup
        const now = Date.now();
        Object.keys(this.remotePlayers).forEach(id => {
            const p = this.remotePlayers[id];
            if (now - p.lastSeen > 5000) { // Reduced to 5 seconds
                delete this.remotePlayers[id];
                return;
            }
            p.update(dt);
        });

        this.localPlayer.update(dt);
        this.roseParticles.forEach(p => p.update(dt));
        this.roseParticles = this.roseParticles.filter(p => p.life > 0);

        // Music Notes
        const jukebox = this.interactables.find(i => i.type === 'jukebox');
        if (jukebox && jukebox.isPlaying && Math.random() < 0.05) {
            this.musicNotes.push(new MusicNote(jukebox.pos.x, jukebox.pos.y));
        }
        this.musicNotes.forEach(n => n.update(dt));
        this.musicNotes = this.musicNotes.filter(n => n.life > 0);

        this.floatingTexts.forEach(t => t.update(dt));
        this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);

        this.network.update(this.localPlayer);
        this.renderer.updateCamera(this.localPlayer.pos);
    }

    draw() {
        this.renderer.clear();

        const jukebox = this.interactables.find(i => i.type === 'jukebox');
        const isPartyTime = jukebox ? jukebox.isPlaying : false;

        this.renderer.drawRoom(this.localPlayer.room, isPartyTime);

        if (this.localPlayer.room === 'skyview' && this.mazeGrid) {
            this.renderer.drawMaze(this.mazeGrid, this.cellW, this.cellH);
        }

        const entities = [
            this.localPlayer,
            ...Object.values(this.remotePlayers).filter(p => p.room === this.localPlayer.room),
            ...this.doors,
            ...this.interactables
        ];

        // Find hovered entity for outline effect
        let hoveredEntity = null;
        for (let obj of this.interactables) {
            if (obj.checkProximity(this.localPlayer.pos)) {
                hoveredEntity = obj;
                break;
            }
        }

        this.renderer.drawEntities(entities, hoveredEntity);

        this.renderer.ctx.save();
        this.renderer.ctx.translate(-this.renderer.camera.x, -this.renderer.camera.y);
        this.roseParticles.forEach(p => p.draw(this.renderer.ctx));
        this.musicNotes.forEach(n => n.draw(this.renderer.ctx));
        this.floatingTexts.forEach(t => t.draw(this.renderer.ctx));
        this.renderer.ctx.restore();

        this.renderer.drawLighting(this.localPlayer);
    }

    updateInventory() {
        const list = document.getElementById('inventory-list');
        list.innerHTML = this.inventory.map(i => `<li>${i}</li>`).join('');
    }

    exitGame() {
        if (this.localPlayer) {
            this.switchRoom('office');
            alert('Returned to Office (Main Lobby)');
        }
    }

    handleAdminIconClick() {
        if (this.isAdmin) {
            this.toggleAdminPanel();
        } else {
            document.getElementById('password-modal').classList.remove('hidden');
        }
    }

    verifyAdminPassword() {
        const passwordInput = document.getElementById('admin-password');
        if (passwordInput.value === '1234') {
            this.isAdmin = true;
            document.getElementById('password-modal').classList.add('hidden');
            this.toggleAdminPanel();
        } else {
            alert('Incorrect Password!');
        }
    }

    toggleAdminPanel() {
        document.getElementById('admin-panel').classList.toggle('hidden');
    }

    executeAdminCmd(cmd, arg) {
        if (!this.isAdmin) return;

        // Broadcast command
        if (typeof firebase !== 'undefined') {
            firebase.database().ref('global/cmd').set({
                cmd: cmd,
                arg: arg,
                time: Date.now()
            });
        }

        // Local execution
        if (cmd === 'teleport_all') {
            this.switchRoom(arg);
        } else if (cmd === 'rose_shower') {
            this.triggerRoseShower();
        }
    }

    triggerRoseShower() {
        if (this.localPlayer) {
            for (let i = 0; i < 50; i++) {
                setTimeout(() => {
                    this.roseParticles.push(new RoseParticle(this.localPlayer.pos.x, this.localPlayer.pos.y));
                }, i * 50);
            }
            // Show notification
            this.showFloatingText('🌹 ROSE SHOWER! 🌹', this.localPlayer.pos.x, this.localPlayer.pos.y - 100);
        }
    }
}

// ============================================================================
// GLOBAL INITIALIZATION
// ============================================================================
// ============================================================================
// GLOBAL INITIALIZATION
// ============================================================================
let game = null;

// Define these immediately so they are available
window.proceedToGenderSelection = function () {
    const name = document.getElementById('nickname').value.trim();
    if (!name) { alert("Name required!"); return; }
    document.getElementById('name-step').classList.add('hidden');
    document.getElementById('gender-step').classList.remove('hidden');
};

window.startGame = function (role) {
    if (!game || !game.renderer) { alert("Game is still loading... please wait."); return; }
    const nickname = document.getElementById('nickname').value.trim();
    if (!nickname) { alert("Please enter a name!"); return; }
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    game.start(nickname, role);
};

(async function () {
    try {
        game = new Game();
        await game.init();
        window.game = game;
        window.adminCmd = (cmd, arg) => game.executeAdminCmd(cmd, arg);
    } catch (e) {
        console.error("Game Initialization Error:", e);
        if (e.message === 'Script error.') {
            console.warn("Ignored cross-origin script error.");
        } else {
            alert("CRITICAL ERROR: " + e.message);
        }
    }
})();

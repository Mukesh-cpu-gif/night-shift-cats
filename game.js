/**
 * Night Shift Cats - Complete Game Engine
 * Full Canvas-based Multiplayer Game with Interactive Objects
 */

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
    PLAYER_SPEED: 200,
    TICK_RATE: 15,
    WORLD_SIZE: 1200,
    COLORS: {
        OFFICE_BG: '#16213e',
        STUDY_BG: '#2c1a1d',
        HANGOUT_BG: '#1a237e',
        MATCHI_BG: '#1a1a2e',
        SKYVIEW_BG: '#000000',
        BOY: '#4361ee',
        GIRL: '#f72585',
        WOOD: '#5d4037',
        SCREEN: '#00ffff',
        RUG: '#8b4513'
    }
};

// ============================================================================
// UTILITY CLASSES
// ============================================================================
class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
    sub(v) { return new Vector2(this.x - v.x, this.y - v.y); }
    mult(n) { return new Vector2(this.x * n, this.y * n); }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() {
        const m = this.mag();
        return m === 0 ? new Vector2(0, 0) : new Vector2(this.x / m, this.y / m);
    }
    lerp(v, t) {
        return new Vector2(
            this.x + (v.x - this.x) * t,
            this.y + (v.y - this.y) * t
        );
    }
    dist(v) { return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2)); }
}

// ============================================================================
// ASSET MANAGER
// ============================================================================
class AssetManager {
    constructor() {
        this.images = {};
        this.loaded = false;
        this.useFallback = false;
    }

    loadImage(key, src) {
        return new Promise((resolve) => {
            const img = new Image();
            const timeout = setTimeout(() => {
                console.warn(`Asset ${key} timed out, using fallback`);
                this.useFallback = true;
                resolve(false);
            }, 3000);

            img.onload = () => {
                clearTimeout(timeout);
                this.images[key] = img;
                console.log(`Loaded: ${key}`);
                resolve(true);
            };

            img.onerror = (e) => {
                clearTimeout(timeout);
                console.error(`❌ FAILED TO LOAD ASSET: ${key} from ${src}`);
                console.error('Error details:', e);
                console.error('Check if file exists and path is correct!');
                this.useFallback = true;
                resolve(false);
            };

            img.src = src;
        });
    }

    async init() {
        await this.loadImage('matchiRoom', 'matchi room.png');
        this.loaded = true;
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
class Player {
    constructor(id, data, isLocal = false) {
        this.id = id;
        this.nickname = data.nickname;
        this.role = data.role;
        this.room = data.room;
        this.pos = new Vector2(data.x, data.y);
        this.targetPos = new Vector2(data.x, data.y);
        this.isLocal = isLocal;
        this.color = this.role === 'boy' ? CONFIG.COLORS.BOY : CONFIG.COLORS.GIRL;
        this.breathePhase = 0;
        this.isMoving = false;
        this.speedMultiplier = 1.0;
        this.speedParticles = [];
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

        this.breathePhase += dt * 2;

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

    draw(ctx) {
        const breatheScale = this.isMoving ? 1 : 1 + Math.sin(this.breathePhase) * 0.05;

        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        ctx.scale(breatheScale, breatheScale);
        ctx.translate(-this.pos.x, -this.pos.y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(this.pos.x, this.pos.y + 20, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cat Head with gradient
        const gradient = ctx.createRadialGradient(this.pos.x - 5, this.pos.y - 5, 5, this.pos.x, this.pos.y, 25);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, this.role === 'boy' ? '#1e3a8a' : '#9f1239');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(this.pos.x, this.pos.y, 22, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.beginPath();
        ctx.moveTo(this.pos.x - 18, this.pos.y - 12);
        ctx.lineTo(this.pos.x - 25, this.pos.y - 30);
        ctx.lineTo(this.pos.x - 8, this.pos.y - 15);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(this.pos.x + 18, this.pos.y - 12);
        ctx.lineTo(this.pos.x + 25, this.pos.y - 30);
        ctx.lineTo(this.pos.x + 8, this.pos.y - 15);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.pos.x - 7, this.pos.y, 2, 0, Math.PI * 2);
        ctx.arc(this.pos.x + 7, this.pos.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Whiskers
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.pos.x - 12, this.pos.y + 3); ctx.lineTo(this.pos.x - 28, this.pos.y);
        ctx.moveTo(this.pos.x - 12, this.pos.y + 7); ctx.lineTo(this.pos.x - 28, this.pos.y + 7);
        ctx.moveTo(this.pos.x + 12, this.pos.y + 3); ctx.lineTo(this.pos.x + 28, this.pos.y);
        ctx.moveTo(this.pos.x + 12, this.pos.y + 7); ctx.lineTo(this.pos.x + 28, this.pos.y + 7);
        ctx.stroke();

        // Name Tag
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.nickname, this.pos.x, this.pos.y - 40);
        ctx.shadowBlur = 0;

        // Speed particles
        if (this.speedMultiplier > 1) {
            this.speedParticles.forEach(p => {
                ctx.fillStyle = `rgba(255, 200, 0, ${p.life})`;
                ctx.beginPath();
                ctx.arc(p.pos.x, p.pos.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        ctx.restore();
    }
}

class Door {
    constructor(x, y, targetRoom, label) {
        this.pos = new Vector2(x, y);
        this.width = 100;
        this.height = 100;
        this.targetRoom = targetRoom;
        this.label = label;
    }

    checkCollision(playerPos) {
        return (playerPos.x > this.pos.x && playerPos.x < this.pos.x + this.width &&
            playerPos.y > this.pos.y && playerPos.y < this.pos.y + this.height);
    }

    draw(ctx) {
        // Light spill effect (depth)
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(this.pos.x + 10, this.pos.y + this.height);
        ctx.lineTo(this.pos.x + this.width - 10, this.pos.y + this.height);
        ctx.lineTo(this.pos.x + this.width + 20, this.pos.y + this.height + 40);
        ctx.lineTo(this.pos.x - 20, this.pos.y + this.height + 40);
        ctx.fill();
        ctx.restore();

        // Door body
        ctx.fillStyle = CONFIG.COLORS.WOOD;
        ctx.fillRect(this.pos.x, this.pos.y, this.width, this.height);

        // Thick outer frame
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 6;
        ctx.strokeRect(this.pos.x, this.pos.y, this.width, this.height);

        // Doorknob
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(this.pos.x + this.width - 15, this.pos.y + this.height / 2, 6, 0, Math.PI * 2);
        ctx.fill();

        // Label inside door with shadow
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.label, this.pos.x + this.width / 2, this.pos.y + 40);
        ctx.shadowBlur = 0;
    }
}

class Interactable {
    constructor(x, y, type, label) {
        this.pos = new Vector2(x, y);
        this.type = type;
        this.label = label;
        this.width = 40;
        this.height = 60;
        this.glowPhase = Math.random() * Math.PI * 2;
        this.isOn = false;
        this.isPlaying = false;
        this.pulsePhase = 0;
    }

    checkProximity(playerPos) {
        return this.pos.dist(playerPos) < 60;
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
            game.showFloatingText('CAFFEINE RUSH!', this.pos.x, this.pos.y - 30);
            setTimeout(() => {
                if (game.localPlayer) {
                    game.localPlayer.speedMultiplier = 1.0;
                }
            }, 5000);
            return false;
        } else if (this.type === 'computer') {
            this.isOn = !this.isOn;
            return false;
        } else if (this.type === 'jukebox') {
            this.isPlaying = !this.isPlaying;
            if (this.isPlaying) {
                game.bgm.play().catch(e => console.log("Audio play failed:", e));
            } else {
                game.bgm.pause();
            }
            return false;
        } else if (this.type === 'blueberry') {
            return true;
        }
        return false;
    }

    draw(ctx) {
        if (this.type === 'blueberry') {
            this.glowPhase += 0.05;
            const glowRadius = 20 + Math.sin(this.glowPhase) * 5;
            const glowGradient = ctx.createRadialGradient(this.pos.x, this.pos.y, 12, this.pos.x, this.pos.y, glowRadius);
            glowGradient.addColorStop(0, 'rgba(67, 97, 238, 0.3)');
            glowGradient.addColorStop(1, 'rgba(67, 97, 238, 0)');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, glowRadius, 0, Math.PI * 2);
            ctx.fill();

            const berryGradient = ctx.createRadialGradient(this.pos.x - 3, this.pos.y - 3, 2, this.pos.x, this.pos.y, 12);
            berryGradient.addColorStop(0, '#6b8aff');
            berryGradient.addColorStop(1, '#2d4bb5');
            ctx.fillStyle = berryGradient;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#2ecc71';
            ctx.beginPath();
            ctx.ellipse(this.pos.x, this.pos.y - 10, 5, 3, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'coffee') {
            // Coffee machine
            ctx.fillStyle = '#cfd8dc'; // Silver
            ctx.fillRect(this.pos.x - 20, this.pos.y - 30, 40, 60);

            ctx.fillStyle = '#3e2723';
            ctx.fillRect(this.pos.x - 15, this.pos.y + 10, 30, 20);

            ctx.fillStyle = '#8d6e63';
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y - 10, 8, 0, Math.PI * 2);
            ctx.fill();

            // Animated Steam
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            const time = Date.now() / 200;
            for (let i = 0; i < 3; i++) {
                const offset = i * 10;
                const y = this.pos.y - 40 - ((time * 10 + offset) % 30);
                const x = this.pos.x + Math.sin(time + i) * 5;
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (this.type === 'computer') {
            // Monitor
            ctx.fillStyle = '#424242';
            ctx.fillRect(this.pos.x - 25, this.pos.y - 20, 50, 35);

            if (this.isOn) {
                ctx.fillStyle = '#00ff00';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('10101', this.pos.x, this.pos.y - 10);
                ctx.fillText('01010', this.pos.x, this.pos.y);
            } else {
                ctx.fillStyle = '#000';
                ctx.fillRect(this.pos.x - 22, this.pos.y - 17, 44, 29);
            }

            ctx.fillStyle = '#616161';
            ctx.fillRect(this.pos.x - 5, this.pos.y + 15, 10, 10);
        } else if (this.type === 'jukebox') {
            this.pulsePhase += 0.1;
            const scale = this.isPlaying ? 1 + Math.sin(this.pulsePhase) * 0.1 : 1;

            ctx.save();
            ctx.translate(this.pos.x, this.pos.y);
            ctx.scale(scale, scale);
            ctx.translate(-this.pos.x, -this.pos.y);

            const grad = ctx.createLinearGradient(this.pos.x - 30, this.pos.y - 40, this.pos.x + 30, this.pos.y + 40);
            grad.addColorStop(0, '#ff6b9d');
            grad.addColorStop(0.5, '#c44569');
            grad.addColorStop(1, '#8e44ad');
            ctx.fillStyle = grad;
            ctx.fillRect(this.pos.x - 30, this.pos.y - 40, 60, 80);

            if (this.isPlaying) {
                ctx.fillStyle = '#ffd700';
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.arc(this.pos.x - 15 + i * 15, this.pos.y - 10, 5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            ctx.restore();
        }
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

        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.ellipse(-this.size / 3, 0, this.size / 3, this.size / 2, 0, 0, Math.PI * 2);
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
        this.discoTime = 0;
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

    drawRoom(room, isPartyTime = false) {
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);

        const W = CONFIG.WORLD_SIZE;

        if (room === 'office') {
            this.ctx.fillStyle = CONFIG.COLORS.OFFICE_BG;
            this.ctx.fillRect(0, 0, W, W);

            this.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            this.ctx.lineWidth = 1;
            for (let x = 0; x < W; x += 50) {
                for (let y = 0; y < W; y += 50) {
                    this.ctx.strokeRect(x, y, 50, 50);
                }
            }

            const rugGrad = this.ctx.createRadialGradient(W / 2, W / 2, 50, W / 2, W / 2, 150);
            rugGrad.addColorStop(0, '#a0522d');
            rugGrad.addColorStop(1, '#654321');
            this.ctx.fillStyle = rugGrad;
            this.ctx.beginPath();
            this.ctx.arc(W / 2, W / 2, 150, 0, Math.PI * 2);
            this.ctx.fill();

            const desks = [
                [100, 100], [W - 200, 100], [100, W - 200], [W - 200, W - 200]
            ];
            desks.forEach(([x, y]) => {
                this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
                this.ctx.shadowBlur = 15;
                this.ctx.shadowOffsetX = 5;
                this.ctx.shadowOffsetY = 5;

                const deskGrad = this.ctx.createLinearGradient(x, y, x, y + 80);
                deskGrad.addColorStop(0, '#6d4c41');
                deskGrad.addColorStop(1, '#3e2723');
                this.ctx.fillStyle = deskGrad;
                this.ctx.fillRect(x, y, 100, 80);

                this.ctx.shadowBlur = 0;

                this.ctx.shadowColor = CONFIG.COLORS.SCREEN;
                this.ctx.shadowBlur = 20;
                const screenGrad = this.ctx.createLinearGradient(x + 20, y + 10, x + 80, y + 50);
                screenGrad.addColorStop(0, '#00ffff');
                screenGrad.addColorStop(1, '#0088aa');
                this.ctx.fillStyle = screenGrad;
                this.ctx.fillRect(x + 20, y + 10, 60, 40);
                this.ctx.shadowBlur = 0;

                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(x + 5, y + 55, 20, 15);
                this.ctx.fillRect(x + 30, y + 60, 15, 12);

                this.ctx.fillStyle = '#ffd700';
                this.ctx.beginPath();
                this.ctx.arc(x + 85, y + 65, 8, 0, Math.PI * 2);
                this.ctx.fill();
            });

        } else if (room === 'study') {
            this.ctx.fillStyle = CONFIG.COLORS.STUDY_BG;
            this.ctx.fillRect(0, 0, W, W);

            this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            this.ctx.lineWidth = 2;
            for (let y = 0; y < W; y += 20) {
                this.ctx.beginPath();
                this.ctx.moveTo(0, y);
                this.ctx.lineTo(W, y + Math.sin(y / 50) * 10);
                this.ctx.stroke();
            }

            const tables = [
                [200, 200], [W - 300, 200], [200, W - 300], [W - 300, W - 300]
            ];
            tables.forEach(([x, y]) => {
                this.ctx.shadowColor = 'rgba(0,0,0,0.6)';
                this.ctx.shadowBlur = 20;
                this.ctx.shadowOffsetX = 8;
                this.ctx.shadowOffsetY = 8;

                const tableGrad = this.ctx.createRadialGradient(x + 60, y + 50, 20, x + 60, y + 50, 100);
                tableGrad.addColorStop(0, '#8d6e63');
                tableGrad.addColorStop(1, '#4e342e');
                this.ctx.fillStyle = tableGrad;
                this.ctx.fillRect(x, y, 120, 100);

                this.ctx.shadowBlur = 0;

                const colors = [
                    ['#e74c3c', '#c0392b'],
                    ['#3498db', '#2980b9'],
                    ['#2ecc71', '#27ae60'],
                    ['#f39c12', '#e67e22']
                ];
                for (let i = 0; i < 4; i++) {
                    const bookGrad = this.ctx.createLinearGradient(x + 10 + i * 25, y + 20, x + 30 + i * 25, y + 50);
                    bookGrad.addColorStop(0, colors[i][0]);
                    bookGrad.addColorStop(1, colors[i][1]);
                    this.ctx.fillStyle = bookGrad;
                    this.ctx.fillRect(x + 10 + i * 25, y + 20, 20, 30);

                    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
                    this.ctx.fillRect(x + 10 + i * 25, y + 20, 3, 30);
                }
            });

        } else if (room === 'hangout') {
            const bgGrad = this.ctx.createLinearGradient(0, 0, 0, W);
            bgGrad.addColorStop(0, '#1a237e');
            bgGrad.addColorStop(1, '#0d1642');
            this.ctx.fillStyle = bgGrad;
            this.ctx.fillRect(0, 0, W, W);

            // Disco Lights
            if (isPartyTime) {
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

            this.ctx.shadowColor = 'rgba(0,0,0,0.7)';
            this.ctx.shadowBlur = 25;
            const barGrad = this.ctx.createLinearGradient(100, 50, 100, 130);
            barGrad.addColorStop(0, '#8d6e63');
            barGrad.addColorStop(0.5, '#5d4037');
            barGrad.addColorStop(1, '#3e2723');
            this.ctx.fillStyle = barGrad;
            this.ctx.fillRect(100, 50, W - 200, 80);
            this.ctx.shadowBlur = 0;

            const tables = [[300, 400], [W / 2, 500], [W - 300, 400]];
            tables.forEach(([x, y]) => {
                this.ctx.shadowColor = 'rgba(0,0,0,0.6)';
                this.ctx.shadowBlur = 20;

                const tableGrad = this.ctx.createRadialGradient(x, y, 20, x, y, 60);
                tableGrad.addColorStop(0, '#a0522d');
                tableGrad.addColorStop(1, '#654321');
                this.ctx.fillStyle = tableGrad;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 60, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.shadowBlur = 0;
            });

        } else if (room === 'matchi') {
            const img = this.assets.get('matchiRoom');
            if (img && !this.assets.useFallback) {
                this.ctx.drawImage(img, 0, 0, W, W);
            } else {
                this.ctx.fillStyle = CONFIG.COLORS.MATCHI_BG;
                this.ctx.fillRect(0, 0, W, W);

                this.discoTime += 0.15;
                const gridSize = 100;
                for (let x = 0; x < W; x += gridSize) {
                    for (let y = 0; y < W; y += gridSize) {
                        const hue = (x + y + this.discoTime * 100) % 360;
                        const brightness = 40 + Math.sin(this.discoTime + x / 100) * 20;
                        this.ctx.fillStyle = `hsl(${hue}, 80%, ${brightness}%)`;
                        this.ctx.fillRect(x, y, gridSize - 2, gridSize - 2);
                    }
                }

                const ballGrad = this.ctx.createRadialGradient(W / 2 - 10, 90, 10, W / 2, 100, 40);
                ballGrad.addColorStop(0, '#ffffff');
                ballGrad.addColorStop(1, '#888888');
                this.ctx.fillStyle = ballGrad;
                this.ctx.beginPath();
                this.ctx.arc(W / 2, 100, 40, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = '#fff';
                this.ctx.lineWidth = 2;
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(W / 2, 100);
                    this.ctx.lineTo(W / 2 + Math.cos(angle) * 40, 100 + Math.sin(angle) * 40);
                    this.ctx.stroke();
                }
            }

        } else if (room === 'skyview') {
            this.ctx.fillStyle = CONFIG.COLORS.SKYVIEW_BG;
            this.ctx.fillRect(0, 0, W, W);
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

            if (cell.walls.top) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x + cellW, y);
                this.ctx.stroke();
            }
            if (cell.walls.right) {
                this.ctx.beginPath();
                this.ctx.moveTo(x + cellW, y);
                this.ctx.lineTo(x + cellW, y + cellH);
                this.ctx.stroke();
            }
            if (cell.walls.bottom) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, y + cellH);
                this.ctx.lineTo(x + cellW, y + cellH);
                this.ctx.stroke();
            }
            if (cell.walls.left) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x, y + cellH);
                this.ctx.stroke();
            }
        });

        this.ctx.restore();
    }

    drawEntities(entities) {
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        entities.sort((a, b) => a.pos.y - b.pos.y);
        entities.forEach(e => e.draw(this.ctx));
        this.ctx.restore();
    }

    drawLighting(player) {
        const centerX = player.pos.x - this.camera.x;
        const centerY = player.pos.y - this.camera.y;

        const lanternGrad = this.ctx.createRadialGradient(
            centerX, centerY, 50,
            centerX, centerY, 400
        );
        lanternGrad.addColorStop(0, 'rgba(0,0,0,0)');
        lanternGrad.addColorStop(0.5, 'rgba(0,0,0,0.3)');
        lanternGrad.addColorStop(1, 'rgba(0,0,0,0.7)');

        this.ctx.fillStyle = lanternGrad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const vignetteGrad = this.ctx.createRadialGradient(
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.3,
            this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.7
        );
        vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.5)');

        this.ctx.fillStyle = vignetteGrad;
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
        this.bgm = new Audio('https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3');
        this.bgm.loop = true;

        this.mazeGrid = null;
        this.cellW = 0;
        this.cellH = 0;

        this.lastTime = 0;
    }

    async init() {
        await this.assets.init();
        this.renderer = new Renderer('game-canvas', this.assets);

        if (typeof firebase !== 'undefined') {
            const db = firebase.database();
            db.ref('global/cmd').on('value', (snap) => {
                const cmdData = snap.val();
                if (cmdData && cmdData.time && Date.now() - cmdData.time < 1000) {
                    if (cmdData.cmd === 'teleport' && this.localPlayer) {
                        this.switchRoom(cmdData.arg);
                    }
                }
            });
        }
    }

    start(nickname, role) {
        this.localPlayer = new Player(this.playerId, {
            x: CONFIG.WORLD_SIZE / 2,
            y: CONFIG.WORLD_SIZE / 2,
            nickname: nickname,
            role: role,
            room: 'office'
        }, true);

        this.buildRoom('office');

        this.network.init(this.playerId, {
            x: CONFIG.WORLD_SIZE / 2,
            y: CONFIG.WORLD_SIZE / 2,
            nickname: nickname,
            role: role,
            room: 'office'
        });

        requestAnimationFrame((t) => this.loop(t));
    }

    buildRoom(roomName) {
        this.doors = [];
        this.interactables = [];

        const W = CONFIG.WORLD_SIZE;
        const center = W / 2;

        if (roomName === 'office') {
            this.doors.push(new Door(50, center - 50, 'study', 'STUDY'));
            this.doors.push(new Door(W - 150, center - 50, 'hangout', 'HANGOUT'));
            this.doors.push(new Door(center - 50, 50, 'matchi', 'MATCHI'));
            this.doors.push(new Door(center - 50, W - 150, 'skyview', 'SKYVIEW'));

            // Coffee machine in top left corner
            this.interactables.push(new Interactable(75, 300, 'coffee', 'Coffee Machine'));

            // Computers on desks
            this.interactables.push(new Interactable(150, 150, 'computer', 'PC'));
            this.interactables.push(new Interactable(W - 150, 150, 'computer', 'PC'));
            this.interactables.push(new Interactable(150, W - 150, 'computer', 'PC'));
            this.interactables.push(new Interactable(W - 150, W - 150, 'computer', 'PC'));

        } else if (roomName === 'study') {
            this.doors.push(new Door(center - 50, W - 150, 'office', 'OFFICE'));

        } else if (roomName === 'hangout') {
            this.doors.push(new Door(50, center - 50, 'office', 'OFFICE'));
            this.interactables.push(new Interactable(center, 600, 'blueberry', 'Blueberry'));
            this.interactables.push(new Interactable(W - 150, 400, 'jukebox', 'Jukebox'));

        } else if (roomName === 'matchi') {
            this.doors.push(new Door(center - 50, W - 150, 'office', 'OFFICE'));

        } else if (roomName === 'skyview') {
            this.doors.push(new Door(50, 50, 'office', 'OFFICE'));

            const today = new Date();
            const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
            const cols = 12;
            const rows = 8;
            const generator = new MazeGenerator(cols, rows, seed);
            this.mazeGrid = generator.generate();
            this.cellW = W / cols;
            this.cellH = W / rows;
        }
    }

    switchRoom(newRoom) {
        this.localPlayer.room = newRoom;
        this.localPlayer.pos = new Vector2(CONFIG.WORLD_SIZE / 2, CONFIG.WORLD_SIZE / 2);
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

        const chatUI = document.getElementById('chat-ui');
        if (chatUI) {
            chatUI.style.display = this.localPlayer.room === 'hangout' ? 'block' : 'none';
        }

        const inventoryUI = document.getElementById('inventory-ui');
        if (inventoryUI) {
            inventoryUI.style.display = this.inventory.length > 0 ? 'block' : 'none';
        }

        // Movement with speed multiplier
        const move = this.input.direction.mult(CONFIG.PLAYER_SPEED * this.localPlayer.speedMultiplier * dt);
        this.localPlayer.pos = this.localPlayer.pos.add(move);
        this.localPlayer.isMoving = move.mag() > 0;

        this.localPlayer.pos.x = Math.max(50, Math.min(CONFIG.WORLD_SIZE - 50, this.localPlayer.pos.x));
        this.localPlayer.pos.y = Math.max(50, Math.min(CONFIG.WORLD_SIZE - 50, this.localPlayer.pos.y));

        if (this.localPlayer.room === 'skyview' && this.mazeGrid) {
            const col = Math.floor(this.localPlayer.pos.x / this.cellW);
            const row = Math.floor(this.localPlayer.pos.y / this.cellH);
            const cell = this.mazeGrid[col + row * 12];

            if (cell) {
                const cellX = col * this.cellW;
                const cellY = row * this.cellH;
                const margin = 20;

                if (cell.walls.left && this.localPlayer.pos.x < cellX + margin) this.localPlayer.pos.x = cellX + margin;
                if (cell.walls.right && this.localPlayer.pos.x > cellX + this.cellW - margin) this.localPlayer.pos.x = cellX + this.cellW - margin;
                if (cell.walls.top && this.localPlayer.pos.y < cellY + margin) this.localPlayer.pos.y = cellY + margin;
                if (cell.walls.bottom && this.localPlayer.pos.y > cellY + this.cellH - margin) this.localPlayer.pos.y = cellY + this.cellH - margin;
            }
        }

        for (let door of this.doors) {
            if (door.checkCollision(this.localPlayer.pos)) {
                this.switchRoom(door.targetRoom);
                break;
            }
        }

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
            const screenY = nearObj.pos.y - this.renderer.camera.y - 50;
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

        Object.values(this.remotePlayers).forEach(p => p.update(dt));
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

        // Check for party mode
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

        this.renderer.drawEntities(entities);

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
        console.log("Admin Cmd:", cmd, arg);

        if (cmd === 'teleport_all') {
            if (typeof firebase !== 'undefined') {
                firebase.database().ref('global/cmd').set({
                    cmd: 'teleport',
                    arg: arg,
                    time: Date.now()
                });
            }
            this.switchRoom(arg);
        } else if (cmd === 'rose_shower') {
            if (this.localPlayer) {
                for (let i = 0; i < 50; i++) {
                    setTimeout(() => {
                        this.roseParticles.push(new RoseParticle(
                            this.localPlayer.pos.x,
                            this.localPlayer.pos.y
                        ));
                    }, i * 50);
                }
                alert('🌹 Rose Shower Activated!');
            }
        }
    }
}

// ============================================================================
// GLOBAL INITIALIZATION
// ============================================================================
let game = null;

(async function () {
    try {
        game = new Game();
        await game.init();
        window.game = game;

        window.adminCmd = (cmd, arg) => game.executeAdminCmd(cmd, arg);

        window.startGame = function (role) {
            const nickname = document.getElementById('nickname').value.trim();
            if (!nickname) {
                alert("Please enter a name!");
                return;
            }
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('hud').classList.remove('hidden');
            game.start(nickname, role);
        };

        window.proceedToGenderSelection = function () {
            const name = document.getElementById('nickname').value.trim();
            if (!name) {
                alert("Name required!");
                return;
            }
            document.getElementById('name-step').classList.add('hidden');
            document.getElementById('gender-step').classList.remove('hidden');
        };

    } catch (e) {
        alert("CRITICAL ERROR: " + e.message);
        console.error(e);
    }
})();

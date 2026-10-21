/**
 * hire-game.js - "Hire Me" Arcade Game Controller
 * Pure Vanilla JavaScript & HTML5 Canvas (Zero external dependencies)
 */

(function () {
  // =========================================================================
  // 1. Web Audio API 8-Bit Retro Sound Synthesizer
  // =========================================================================
  class SoundFX {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    }

    playLaser() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    }

    playExplosion() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = "square";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.22);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    }

    playPowerup() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.05;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + 0.08);
      });
    }

    playHit() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.2);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    }

    playVictory() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const fanfare = [
        { f: 523.25, d: 0.12 },
        { f: 659.25, d: 0.12 },
        { f: 783.99, d: 0.12 },
        { f: 1046.5, d: 0.35 },
      ];

      let elapsed = 0;
      fanfare.forEach((n) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + elapsed;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(n.f, t);

        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + n.d);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + n.d);

        elapsed += n.d + 0.03;
      });
    }
  }

  // =========================================================================
  // 2. Arcade Game Engine
  // =========================================================================
  class HireMeGame {
    constructor() {
      this.overlay = null;
      this.canvas = null;
      this.ctx = null;
      this.sound = new SoundFX();

      this.isOpen = false;
      this.state = "START"; // 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'VICTORY'
      this.animationId = null;
      this.lastTime = 0;

      // Game metrics
      this.score = 0;
      this.lives = 3;
      this.progress = 0; // 0 to 100
      this.level = 1;
      this.appsSent = 0;

      // Player object
      this.player = {
        x: 230,
        y: 360,
        width: 38,
        height: 38,
        speed: 260,
        tripleShot: false,
        tripleShotTimer: 0,
        shield: false,
        shieldTimer: 0,
        invulnerableTimer: 0,
      };

      // Entities
      this.bullets = [];
      this.obstacles = [];
      this.powerups = [];
      this.particles = [];
      this.stars = [];
      this.boss = null; // Final ATS filter before job offer

      // Obstacle templates (relatable rejection reasons)
      this.obstacleLabels = [
        { text: "No Response", color: "#64748b", hp: 1, points: 50 },
        { text: "Auto Rejection", color: "#ef4444", hp: 2, points: 100 },
        { text: "Not a Fit", color: "#8b5cf6", hp: 1, points: 60 },
        { text: "More Exp Needed", color: "#f59e0b", hp: 2, points: 120 },
        { text: "Ghosted 👻", color: "#38bdf8", hp: 1, points: 80 },
        { text: "Position Filled", color: "#ec4899", hp: 1, points: 70 },
        { text: "Profile Kept On File", color: "#94a3b8", hp: 1, points: 50 },
        { text: "5+ Yrs Exp for Junior", color: "#e11d48", hp: 3, points: 180 },
      ];

      // Controls state
      this.keys = {
        left: false,
        right: false,
        shoot: false,
      };
      this.shootCooldown = 0;

      this.boundLoop = this.loop.bind(this);
    }

    init() {
      this.overlay = document.getElementById("game-overlay");
      this.canvas = document.getElementById("game-canvas");
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");

      // Generate background starfield
      this.initStarfield();

      // Setup DOM event listeners
      this.setupEventListeners();
    }

    initStarfield() {
      this.stars = [];
      for (let i = 0; i < 55; i++) {
        this.stars.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          size: Math.random() * 1.8 + 0.6,
          speed: Math.random() * 40 + 20,
          opacity: Math.random() * 0.7 + 0.3,
        });
      }
    }

    setupEventListeners() {
      // Trigger Button in Header
      const triggerBtn = document.getElementById("hire-me-game-btn");
      if (triggerBtn) {
        triggerBtn.addEventListener("click", () => this.open());
      }

      // Link trigger
      const linkTrigger = document.getElementById("hire-me-link");
      if (linkTrigger) {
        linkTrigger.addEventListener("click", (e) => {
          e.preventDefault();
          this.open();
        });
      }

      // Close button
      const closeBtn = document.getElementById("game-close-btn");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => this.close());
      }

      // Start button
      const startBtn = document.getElementById("game-start-btn");
      if (startBtn) {
        startBtn.addEventListener("click", () => this.startGame());
      }

      // Restart buttons
      const restartBtn = document.getElementById("game-restart-btn");
      if (restartBtn) restartBtn.addEventListener("click", () => this.startGame());

      const replayBtn = document.getElementById("victory-replay-btn");
      if (replayBtn) replayBtn.addEventListener("click", () => this.startGame());

      // Sound toggle
      const soundBtn = document.getElementById("game-sound-btn");
      if (soundBtn) {
        soundBtn.addEventListener("click", () => {
          this.sound.isMuted = !this.sound.isMuted;
          soundBtn.textContent = this.sound.isMuted ? "🔇 Sound OFF" : "🔊 Sound ON";
          soundBtn.classList.toggle("muted", this.sound.isMuted);
        });
      }

      // Direct Contact CTA buttons
      const hireNowBtn = document.getElementById("game-hire-now-btn");
      if (hireNowBtn) {
        hireNowBtn.addEventListener("click", () => {
          this.close();
          this.scrollToContact();
        });
      }

      // Giant SELECT MEEEEE button
      const selectMeBtn = document.getElementById("select-me-btn");
      if (selectMeBtn) {
        selectMeBtn.addEventListener("click", () => {
          this.sound.playVictory();
          this.triggerVictory();
        });
      }

      // Copy email in victory card
      const victoryCopyEmailBtn = document.getElementById("victory-copy-email-btn");
      if (victoryCopyEmailBtn) {
        victoryCopyEmailBtn.addEventListener("click", () => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText("shahruhban01@gmail.com");
            victoryCopyEmailBtn.textContent = "Copied! ✓";
            setTimeout(() => (victoryCopyEmailBtn.textContent = "Copy Email 📋"), 2000);
          }
        });
      }

      // Victory contact button
      const victoryContactBtn = document.getElementById("victory-contact-btn");
      if (victoryContactBtn) {
        victoryContactBtn.addEventListener("click", (e) => {
          e.preventDefault();
          this.close();
          this.scrollToContact();
        });
      }

      // Keyboard Controls
      window.addEventListener("keydown", (e) => {
        if (!this.isOpen) return;

        if (e.key === "Escape") {
          e.preventDefault();
          this.close();
          return;
        }

        if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
          this.keys.left = true;
        } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
          this.keys.right = true;
        } else if (e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          if (this.state === "START") {
            this.startGame();
          } else if (this.state === "PLAYING") {
            this.keys.shoot = true;
          }
        } else if (e.key.toLowerCase() === "p") {
          if (this.state === "PLAYING") {
            this.state = "PAUSED";
          } else if (this.state === "PAUSED") {
            this.state = "PLAYING";
          }
        } else if (e.key.toLowerCase() === "r") {
          this.startGame();
        }
      });

      window.addEventListener("keyup", (e) => {
        if (!this.isOpen) return;
        if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
          this.keys.left = false;
        } else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
          this.keys.right = false;
        } else if (e.key === " " || e.key === "Spacebar") {
          this.keys.shoot = false;
        }
      });

      // Mobile Touch Controls
      const touchLeft = document.getElementById("touch-left");
      const touchRight = document.getElementById("touch-right");
      const touchShoot = document.getElementById("touch-shoot");

      if (touchLeft && touchRight && touchShoot) {
        const bindTouch = (btn, keyProp) => {
          btn.addEventListener("touchstart", (e) => {
            e.preventDefault();
            this.keys[keyProp] = true;
          });
          btn.addEventListener("touchend", (e) => {
            e.preventDefault();
            this.keys[keyProp] = false;
          });
        };

        bindTouch(touchLeft, "left");
        bindTouch(touchRight, "right");
        bindTouch(touchShoot, "shoot");
      }

      // Canvas Pointer Dragging (mouse/touch direct control)
      let isPointerDown = false;
      this.canvas.addEventListener("pointerdown", (e) => {
        if (this.state !== "PLAYING") return;
        isPointerDown = true;
        this.updatePlayerFromPointer(e);
        this.keys.shoot = true;
      });

      window.addEventListener("pointermove", (e) => {
        if (!this.isOpen || !isPointerDown || this.state !== "PLAYING") return;
        this.updatePlayerFromPointer(e);
      });

      window.addEventListener("pointerup", () => {
        isPointerDown = false;
        if (this.isOpen) this.keys.shoot = false;
      });
    }

    updatePlayerFromPointer(e) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const targetX = (e.clientX - rect.left) * scaleX;
      this.player.x = Math.max(10, Math.min(targetX - this.player.width / 2, this.canvas.width - this.player.width - 10));
    }

    open() {
      if (!this.overlay) return;
      this.isOpen = true;
      this.overlay.removeAttribute("hidden");
      this.state = "START";
      this.showScreenCard("game-start-screen");

      // Reset dimensions
      this.player.x = this.canvas.width / 2 - this.player.width / 2;
      this.player.y = this.canvas.height - 54;

      this.lastTime = performance.now();
      if (!this.animationId) {
        this.animationId = requestAnimationFrame(this.boundLoop);
      }
    }

    close() {
      if (!this.overlay) return;
      this.isOpen = false;
      this.overlay.setAttribute("hidden", "");
      this.state = "START";
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
    }

    startGame() {
      this.sound.init();
      this.state = "PLAYING";
      this.hideScreenCards();

      // Reset metrics
      this.score = 0;
      this.lives = 3;
      this.progress = 0;
      this.level = 1;
      this.appsSent = 0;

      // Reset player
      this.player.x = this.canvas.width / 2 - this.player.width / 2;
      this.player.y = this.canvas.height - 54;
      this.player.tripleShot = false;
      this.player.shield = false;
      this.player.invulnerableTimer = 0;

      this.bullets = [];
      this.obstacles = [];
      this.powerups = [];
      this.particles = [];
      this.boss = null;

      this.updateHud();
    }

    triggerGameOver(reason = "Auto-Rejection Bot caught your resume!") {
      this.state = "GAMEOVER";
      this.sound.playExplosion();

      const reasonEl = document.getElementById("game-over-reason");
      if (reasonEl) reasonEl.textContent = `Hit by: "${reason}"`;

      const scoreEl = document.getElementById("game-over-score");
      if (scoreEl) scoreEl.textContent = this.score.toLocaleString();

      const appsEl = document.getElementById("game-over-apps");
      if (appsEl) appsEl.textContent = this.appsSent.toString();

      this.showScreenCard("game-over-screen");
    }

    triggerVictory() {
      this.state = "VICTORY";
      this.sound.playVictory();
      this.spawnConfetti();
      this.showScreenCard("game-victory-screen");
    }

    showScreenCard(id) {
      const screens = ["game-start-screen", "game-over-screen", "game-victory-screen"];
      screens.forEach((s) => {
        const el = document.getElementById(s);
        if (el) el.style.display = s === id ? "block" : "none";
      });
      const overlayCard = document.getElementById("game-screen-overlay");
      if (overlayCard) overlayCard.style.display = "flex";
    }

    hideScreenCards() {
      const overlayCard = document.getElementById("game-screen-overlay");
      if (overlayCard) overlayCard.style.display = "none";
    }

    updateHud() {
      const scoreEl = document.getElementById("game-score");
      if (scoreEl) scoreEl.textContent = this.score.toLocaleString();

      const livesEl = document.getElementById("game-lives");
      if (livesEl) {
        let hearts = "";
        for (let i = 0; i < this.lives; i++) hearts += "❤️";
        livesEl.textContent = hearts || "💔";
      }

      const progressFill = document.getElementById("game-progress-fill");
      if (progressFill) progressFill.style.width = `${Math.min(100, this.progress)}%`;

      const levelText = document.getElementById("game-level-text");
      if (levelText) {
        if (this.progress < 35) {
          levelText.textContent = "Level 1: The ATS Screening 🤖";
        } else if (this.progress < 75) {
          levelText.textContent = "Level 2: Recruiter Inboxes 📨";
        } else {
          levelText.textContent = "Level 3: Job Hunt / The Offer 💼";
        }
      }
    }

    scrollToContact() {
      const contactSection = document.getElementById("contact");
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: "smooth" });
        const nameInput = document.getElementById("contact-name");
        if (nameInput) setTimeout(() => nameInput.focus(), 600);
      }
    }

    // =========================================================================
    // Game Loop & Update
    // =========================================================================
    loop(currentTime) {
      if (!this.isOpen) return;

      const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
      this.lastTime = currentTime;

      this.update(dt);
      this.render();

      this.animationId = requestAnimationFrame(this.boundLoop);
    }

    update(dt) {
      // Starfield animation always runs
      this.stars.forEach((s) => {
        s.y += s.speed * dt;
        if (s.y > this.canvas.height) {
          s.y = 0;
          s.x = Math.random() * this.canvas.width;
        }
      });

      if (this.state !== "PLAYING") {
        this.updateParticles(dt);
        return;
      }

      // Player Movement
      if (this.keys.left) {
        this.player.x -= this.player.speed * dt;
      }
      if (this.keys.right) {
        this.player.x += this.player.speed * dt;
      }
      this.player.x = Math.max(10, Math.min(this.player.x, this.canvas.width - this.player.width - 10));

      // Spawn Rocket Thrust Particles
      if (Math.random() < 0.6) {
        this.particles.push({
          x: this.player.x + this.player.width / 2 + (Math.random() * 8 - 4),
          y: this.player.y + this.player.height - 2,
          vx: Math.random() * 20 - 10,
          vy: Math.random() * 60 + 80,
          color: Math.random() > 0.5 ? "#f97316" : "#facc15",
          size: Math.random() * 3 + 2,
          life: 0.25,
          maxLife: 0.25,
        });
      }

      // Player Shoot logic (Resumes / Applications)
      this.shootCooldown -= dt;
      if (this.keys.shoot && this.shootCooldown <= 0) {
        this.sound.playLaser();
        this.appsSent++;

        if (this.player.tripleShot) {
          this.bullets.push({ x: this.player.x + this.player.width / 2 - 2, y: this.player.y, vx: 0, vy: -420 });
          this.bullets.push({ x: this.player.x + 4, y: this.player.y + 6, vx: -80, vy: -400 });
          this.bullets.push({ x: this.player.x + this.player.width - 8, y: this.player.y + 6, vx: 80, vy: -400 });
        } else {
          this.bullets.push({ x: this.player.x + this.player.width / 2 - 2, y: this.player.y, vx: 0, vy: -420 });
        }
        this.shootCooldown = 0.18;
      }

      // Update Powerup Timers
      if (this.player.tripleShot) {
        this.player.tripleShotTimer -= dt;
        if (this.player.tripleShotTimer <= 0) this.player.tripleShot = false;
      }
      if (this.player.shield) {
        this.player.shieldTimer -= dt;
        if (this.player.shieldTimer <= 0) this.player.shield = false;
      }
      if (this.player.invulnerableTimer > 0) {
        this.player.invulnerableTimer -= dt;
      }

      // Update Bullets
      this.bullets.forEach((b) => {
        b.x += (b.vx || 0) * dt;
        b.y += b.vy * dt;
      });
      this.bullets = this.bullets.filter((b) => b.y > -20 && b.x > 0 && b.x < this.canvas.width);

      // Spawn Obstacles
      this.spawnObstacles(dt);

      // Update Obstacles
      this.obstacles.forEach((obs) => {
        obs.y += obs.speed * dt;
        obs.x += Math.sin(obs.y * 0.04 + obs.seed) * obs.wobble * dt;
      });

      // Update Boss / Interview & Offer
      if (this.boss) {
        this.updateBoss(dt);
      }

      // Update Powerups
      this.powerups.forEach((p) => {
        p.y += p.speed * dt;
      });
      this.powerups = this.powerups.filter((p) => p.y < this.canvas.height + 20);

      // Update Particles
      this.updateParticles(dt);

      // Collision Detection: Bullets vs Obstacles
      this.bullets.forEach((bullet) => {
        this.obstacles.forEach((obs) => {
          if (!bullet.spent && !obs.destroyed && this.checkCollision(bullet, 8, 12, obs, obs.width, obs.height)) {
            bullet.spent = true;
            obs.hp--;
            this.sound.playHit();
            this.createHitParticles(bullet.x, bullet.y, obs.color);

            if (obs.hp <= 0) {
              obs.destroyed = true;
              this.score += obs.points;
              this.progress += 2.2;
              this.sound.playExplosion();
              this.createExplosionParticles(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.color);

              // Chance to spawn powerup
              if (Math.random() < 0.28) {
                this.spawnPowerup(obs.x + obs.width / 2, obs.y + obs.height / 2);
              }
            }
          }
        });

        // Bullets vs Boss
        if (this.boss && !bullet.spent && this.checkCollision(bullet, 8, 12, this.boss, this.boss.width, this.boss.height)) {
          bullet.spent = true;
          this.boss.hp--;
          this.sound.playHit();
          this.createHitParticles(bullet.x, bullet.y, "#facc15");

          if (this.boss.hp <= 0) {
            this.boss = null;
            this.progress = 100;
            this.score += 1500;
            this.triggerVictory();
          }
        }
      });
      this.bullets = this.bullets.filter((b) => !b.spent);
      this.obstacles = this.obstacles.filter((o) => !o.destroyed && o.y < this.canvas.height + 30);

      // Collision Detection: Player vs Obstacles
      if (this.player.invulnerableTimer <= 0) {
        for (let i = 0; i < this.obstacles.length; i++) {
          const obs = this.obstacles[i];
          if (this.checkCollision(this.player, this.player.width, this.player.height, obs, obs.width, obs.height)) {
            if (this.player.shield) {
              this.player.shield = false;
              obs.destroyed = true;
              this.sound.playExplosion();
              this.createExplosionParticles(obs.x + obs.width / 2, obs.y + obs.height / 2, "#38bdf8");
            } else {
              this.lives--;
              obs.destroyed = true;
              this.player.invulnerableTimer = 1.4;
              this.sound.playHit();
              this.createExplosionParticles(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2, "#ef4444");

              if (this.lives <= 0) {
                this.triggerGameOver(obs.text);
                return;
              }
            }
          }
        }
      }

      // Collision Detection: Player vs Powerups
      this.powerups.forEach((pow) => {
        if (!pow.collected && this.checkCollision(this.player, this.player.width, this.player.height, pow, 26, 26)) {
          pow.collected = true;
          this.sound.playPowerup();
          this.score += 150;

          if (pow.type === "triple") {
            this.player.tripleShot = true;
            this.player.tripleShotTimer = 8;
          } else if (pow.type === "shield") {
            this.player.shield = true;
            this.player.shieldTimer = 10;
          } else if (pow.type === "coffee") {
            if (this.lives < 3) this.lives++;
          }
        }
      });
      this.powerups = this.powerups.filter((p) => !p.collected);

      // Trigger Final Boss (The ATS Firewall / Job Offer)
      if (this.progress >= 90 && !this.boss) {
        this.spawnBoss();
      }

      this.updateHud();
    }

    spawnObstacles(dt) {
      if (this.boss) return; // Stop random spawning during boss stage

      this.obstacleTimer = (this.obstacleTimer || 0) + dt;
      const spawnInterval = Math.max(0.65, 1.4 - this.progress * 0.008);

      if (this.obstacleTimer >= spawnInterval) {
        this.obstacleTimer = 0;
        const template = this.obstacleLabels[Math.floor(Math.random() * this.obstacleLabels.length)];
        const width = Math.max(90, template.text.length * 8.5 + 24);

        this.obstacles.push({
          x: Math.random() * (this.canvas.width - width - 20) + 10,
          y: -40,
          width,
          height: 32,
          speed: Math.random() * 40 + 75 + this.progress * 0.4,
          wobble: Math.random() * 30 + 10,
          seed: Math.random() * 10,
          text: template.text,
          color: template.color,
          hp: template.hp,
          maxHp: template.hp,
          points: template.points,
          destroyed: false,
        });
      }
    }

    spawnPowerup(x, y) {
      const types = ["triple", "shield", "coffee"];
      const chosen = types[Math.floor(Math.random() * types.length)];
      this.powerups.push({
        x: x - 13,
        y: y,
        speed: 70,
        type: chosen,
        collected: false,
      });
    }

    spawnBoss() {
      this.boss = {
        x: this.canvas.width / 2 - 90,
        y: -90,
        width: 180,
        height: 60,
        hp: 30,
        maxHp: 30,
        speedX: 90,
        targetY: 45,
      };
    }

    updateBoss(dt) {
      if (this.boss.y < this.boss.targetY) {
        this.boss.y += 60 * dt;
      } else {
        this.boss.x += this.boss.speedX * dt;
        if (this.boss.x <= 20 || this.boss.x >= this.canvas.width - this.boss.width - 20) {
          this.boss.speedX *= -1;
        }
      }
    }

    checkCollision(a, aW, aH, b, bW, bH) {
      return a.x < b.x + bW && a.x + aW > b.x && a.y < b.y + bH && a.y + aH > b.y;
    }

    createHitParticles(x, y, color) {
      for (let i = 0; i < 6; i++) {
        this.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 120,
          vy: (Math.random() - 0.5) * 120,
          color,
          size: Math.random() * 3 + 1.5,
          life: 0.3,
          maxLife: 0.3,
        });
      }
    }

    createExplosionParticles(x, y, color) {
      for (let i = 0; i < 18; i++) {
        this.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 200,
          vy: (Math.random() - 0.5) * 200,
          color,
          size: Math.random() * 4 + 2,
          life: 0.5,
          maxLife: 0.5,
        });
      }
    }

    spawnConfetti() {
      const colors = ["#facc15", "#4ade80", "#38bdf8", "#f43f5e", "#a855f7"];
      for (let i = 0; i < 60; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: -20,
          vx: (Math.random() - 0.5) * 140,
          vy: Math.random() * 140 + 80,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 5 + 3,
          life: 2.2,
          maxLife: 2.2,
        });
      }
    }

    updateParticles(dt) {
      this.particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      });
      this.particles = this.particles.filter((p) => p.life > 0);
    }

    // =========================================================================
    // Canvas Rendering
    // =========================================================================
    render() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      // Dark retro background
      ctx.fillStyle = "#0c101d";
      ctx.fillRect(0, 0, w, h);

      // Draw distant city silhouette skyline
      this.renderSkyline(ctx, w, h);

      // Stars
      this.stars.forEach((s) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
      });

      // Render Bullets (Glowing Resumes / Commits)
      this.bullets.forEach((b) => {
        ctx.fillStyle = "#67e8f9";
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x, b.y, 4, 12);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(b.x + 1, b.y + 2, 2, 8);
        ctx.shadowBlur = 0;
      });

      // Render Obstacles (Cloud / UFO Rejections)
      this.obstacles.forEach((obs) => {
        this.renderObstacle(ctx, obs);
      });

      // Render Boss (Final ATS Barrier / Offer)
      if (this.boss) {
        this.renderBoss(ctx, this.boss);
      }

      // Render Powerups
      this.powerups.forEach((pow) => {
        this.renderPowerup(ctx, pow);
      });

      // Render Particles
      this.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      ctx.globalAlpha = 1.0;

      // Render Player (Developer Rocket)
      if (this.state === "PLAYING" || this.state === "PAUSED") {
        this.renderPlayer(ctx, this.player);
      }

      // Paused message
      if (this.state === "PAUSED") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#facc15";
        ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME PAUSED", w / 2, h / 2);
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#e2e8f0";
        ctx.fillText("Press P to Resume", w / 2, h / 2 + 28);
      }
    }

    renderSkyline(ctx, w, h) {
      ctx.fillStyle = "#111827";
      // Simple geometric skyline at bottom
      const buildingWidths = [30, 45, 25, 50, 35, 60, 40, 55, 30, 45, 50];
      const buildingHeights = [70, 95, 60, 110, 80, 120, 85, 100, 75, 90, 65];
      let curX = 0;
      for (let i = 0; i < buildingWidths.length && curX < w; i++) {
        const bw = buildingWidths[i];
        const bh = buildingHeights[i];
        ctx.fillRect(curX, h - bh, bw, bh);

        // Windows
        ctx.fillStyle = "rgba(250, 204, 21, 0.15)";
        for (let wy = h - bh + 10; wy < h - 15; wy += 14) {
          for (let wx = curX + 6; wx < curX + bw - 6; wx += 10) {
            ctx.fillRect(wx, wy, 4, 6);
          }
        }
        ctx.fillStyle = "#111827";
        curX += bw;
      }
    }

    renderPlayer(ctx, p) {
      if (p.invulnerableTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
        return; // Blink when hit
      }

      const x = p.x;
      const y = p.y;
      const w = p.width;
      const h = p.height;

      // Shield Aura
      if (p.shield) {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, w / 2 + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Spaceship / Developer Drone Body
      // Thruster wings
      ctx.fillStyle = "#e11d48";
      ctx.beginPath();
      ctx.moveTo(x + 2, y + h);
      ctx.lineTo(x + w / 2, y + 8);
      ctx.lineTo(x + w - 2, y + h);
      ctx.closePath();
      ctx.fill();

      // Cockpit / Avatar
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(x + 10, y + 10, w - 20, h - 14);

      // Glass visor / head
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(x + 12, y + 12, w - 24, 10);

      // "Me" tag
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Me", x + w / 2, y + h - 6);
    }

    renderObstacle(ctx, obs) {
      const x = obs.x;
      const y = obs.y;
      const w = obs.width;
      const h = obs.height;

      // Cloud pill container
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = obs.color;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 6);
      ctx.fill();
      ctx.stroke();

      // Rejection label
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "600 11px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(obs.text, x + w / 2, y + h / 2 + 4);

      // Small thruster dots
      ctx.fillStyle = obs.color;
      ctx.fillRect(x + w / 2 - 3, y + h, 6, 3);
    }

    renderBoss(ctx, boss) {
      const x = boss.x;
      const y = boss.y;
      const w = boss.width;
      const h = boss.height;

      ctx.fillStyle = "#1e1b4b";
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "#facc15";
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Boss Label
      ctx.fillStyle = "#facc15";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("💼 THE JOB OFFER BOSS 💼", x + w / 2, y + 24);

      // Boss Health Bar
      const hpPct = boss.hp / boss.maxHp;
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(x + 20, y + 36, w - 40, 8);
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(x + 20, y + 36, (w - 40) * hpPct, 8);
    }

    renderPowerup(ctx, pow) {
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = pow.type === "triple" ? "#facc15" : pow.type === "shield" ? "#38bdf8" : "#4ade80";
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.arc(pow.x + 13, pow.y + 13, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      const icon = pow.type === "triple" ? "⚡" : pow.type === "shield" ? "🛡️" : "☕";
      ctx.fillText(icon, pow.x + 13, pow.y + 17);
    }
  }

  // Initialize and register to window
  window.HireMeGame = new HireMeGame();

  document.addEventListener("DOMContentLoaded", () => {
    window.HireMeGame.init();
  });
})();

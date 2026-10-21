/**
 * ats-apocalypse.js - "ATS Apocalypse: The Website Itself Is The Battlefield"
 * A tactile, high-impact interactive game where the player's arrows and ATS enemies
 * physically shatter, crack, stamp, and magnetically reconstruct the REAL portfolio DOM!
 * Pure Vanilla JavaScript & HTML5 Canvas (Zero external dependencies)
 */

window.ATSApocalypse = window.ATSApocalypse || {};

(function () {
  // =========================================================================
  // 1. Web Audio Synthesizer (Realistic Shatters, Stamp Thuds, Rebuild Chimes)
  // =========================================================================
  class ApocalypseAudio {
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

    playBowRelease() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    }

    playShatter() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Realistic sharp glass crunch & fracture
      const count = 4;
      for (let i = 0; i < count; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i % 2 === 0 ? "sawtooth" : "triangle";
        const baseFreq = 900 + i * 350;
        osc.frequency.setValueAtTime(baseFreq, now + i * 0.03);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.28);

        gain.gain.setValueAtTime(0.2, now + i * 0.03);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.03);
        osc.stop(now + 0.28);
      }
    }

    playStamp() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Heavy bureaucratic stamp thud
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.22);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    }

    playRebuildChime() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Reverse harmonic sweep
      const freqs = [196.0, 261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.06;
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.24);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.24);
      });
    }

    playHit() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  }

  // =========================================================================
  // 2. Realistic Geometric Shard Particle
  // =========================================================================
  class GlassShard {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      // High initial explosive velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 450 + 150;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 150; // upwards boost
      this.gravity = 980;
      this.friction = 0.985;

      this.rot = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 16;
      this.color = color || "#ef4444";

      // Irregular polygon vertices
      this.vertices = [];
      const numVerts = Math.floor(Math.random() * 3) + 3;
      const radius = Math.random() * 8 + 4;
      for (let i = 0; i < numVerts; i++) {
        const a = (i / numVerts) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
        const r = radius * (0.6 + Math.random() * 0.6);
        this.vertices.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }

      this.life = 2.4;
      this.maxLife = 2.4;
    }

    update(dt) {
      this.vy += this.gravity * dt;
      this.vx *= this.friction;
      this.vy *= this.friction;

      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rot += this.rotSpeed * dt;

      // Bounce on bottom screen
      if (this.y > window.innerHeight - 15) {
        this.y = window.innerHeight - 15;
        this.vy = -this.vy * 0.4;
        this.rotSpeed *= 0.6;
      }

      this.life -= dt;
    }

    draw(ctx) {
      if (this.life <= 0) return;
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);

      ctx.fillStyle = this.color;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;

      ctx.beginPath();
      this.vertices.forEach((v, i) => {
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  // =========================================================================
  // 3. ATS Apocalypse Engine
  // =========================================================================
  class ATSApocalypseEngine {
    constructor() {
      this.isActive = false;
      this.audio = new ApocalypseAudio();

      this.canvas = null;
      this.ctx = null;
      this.animId = null;
      this.lastTime = 0;

      this.hud = null;
      this.dreamsContainer = null;
      this.firewallOverlay = null;

      // Game state
      this.stage = 1;
      this.motivation = 100;
      this.score = 0;
      this.destroyedCount = 0;
      this.isWaveActive = false;

      // Archer
      this.archer = {
        x: window.innerWidth / 2,
        y: window.innerHeight - 38,
        angle: -Math.PI / 2,
        isAiming: false,
        determinationMode: false,
      };

      // Entities
      this.arrows = [];
      this.enemies = [];
      this.enemyLasers = [];
      this.shards = [];
      this.particles = [];

      this.originalDOM = {};

      this.boundLoop = this.loop.bind(this);
      this.boundMouseMove = this.handleMouseMove.bind(this);
      this.boundGlobalClick = this.handleGlobalClick.bind(this);
      this.boundKeyDown = this.handleKeyDown.bind(this);
      this.boundResize = this.handleResize.bind(this);
    }

    init() {
      const btn = document.getElementById("ats-apocalypse-btn");
      if (btn) btn.addEventListener("click", () => this.start());

      const toolbarBtn = document.getElementById("ats-apocalypse-toolbar-btn");
      if (toolbarBtn) toolbarBtn.addEventListener("click", () => this.start());

      const link = document.getElementById("ats-apocalypse-link");
      if (link) {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          this.start();
        });
      }
    }

    // =========================================================================
    // Snapshot & Restore Real DOM
    // =========================================================================
    snapshotRealDOM() {
      this.originalDOM = {
        bodyFilter: document.body.style.filter || "",
        h1HTML: document.querySelector("header h1") ? document.querySelector("header h1").innerHTML : "",
        introHTML: document.querySelector("header .intro") ? document.querySelector("header .intro").innerHTML : "",
        skillsHTML: document.querySelector("#skills .skills-list") ? document.querySelector("#skills .skills-list").innerHTML : "",
        projectsHTML: document.querySelector("#project-items-list") ? document.querySelector("#project-items-list").innerHTML : "",
        experienceHTML: document.querySelector("#experience") ? document.querySelector("#experience").innerHTML : "",
        contactHTML: document.querySelector("#contact") ? document.querySelector("#contact").innerHTML : "",
      };
    }

    restoreRealDOM() {
      document.body.style.filter = this.originalDOM.bodyFilter || "";
      document.body.classList.remove("ats-apocalypse-active", "ats-page-cracking", "ats-page-restored", "ats-shake");

      const h1 = document.querySelector("header h1");
      if (h1 && this.originalDOM.h1HTML) h1.innerHTML = this.originalDOM.h1HTML;

      const intro = document.querySelector("header .intro");
      if (intro && this.originalDOM.introHTML) intro.innerHTML = this.originalDOM.introHTML;

      const skills = document.querySelector("#skills .skills-list");
      if (skills && this.originalDOM.skillsHTML) skills.innerHTML = this.originalDOM.skillsHTML;

      const projects = document.querySelector("#project-items-list");
      if (projects && this.originalDOM.projectsHTML) projects.innerHTML = this.originalDOM.projectsHTML;

      const exp = document.querySelector("#experience");
      if (exp && this.originalDOM.experienceHTML) exp.innerHTML = this.originalDOM.experienceHTML;

      const contact = document.querySelector("#contact");
      if (contact && this.originalDOM.contactHTML) contact.innerHTML = this.originalDOM.contactHTML;

      // Remove card tilt classes
      document.querySelectorAll(".project-item").forEach((p) => {
        p.classList.remove("ats-card-broken", "ats-shake");
        p.style.transform = "";
      });

      // Remove all stamps, barriers, overlays
      document.querySelectorAll(".ats-stamp, .ats-stamp-overlay, .ats-skill-lockout, .ats-skill-gate, .ats-scanner-bar, .ats-resume-stamp, .chaotic-stat-badge, .ats-h1-crack-overlay, #dreams-cinematic-container, #ats-contact-firewall, #ats-apocalypse-hud, #ats-apocalypse-canvas, #ats-victory-overlay, .ats-center-notice").forEach((el) => el.remove());
    }

    // =========================================================================
    // Game Lifecycle
    // =========================================================================
    start() {
      if (this.isActive) return;
      this.isActive = true;

      this.snapshotRealDOM();
      document.body.classList.add("ats-apocalypse-active");
      this.audio.init();

      this.stage = 1;
      this.motivation = 100;
      this.score = 0;
      this.destroyedCount = 0;
      this.isWaveActive = false;
      this.arrows = [];
      this.enemies = [];
      this.enemyLasers = [];
      this.shards = [];
      this.particles = [];
      this.archer.determinationMode = false;

      this.createCanvas();
      this.createHUD();

      // Start global click & aiming listeners
      window.addEventListener("mousemove", this.boundMouseMove);
      window.addEventListener("click", this.boundGlobalClick, true);
      window.addEventListener("keydown", this.boundKeyDown);
      window.addEventListener("resize", this.boundResize);

      // Create Dreams container
      this.injectDreamsSection();

      this.lastTime = performance.now();
      this.animId = requestAnimationFrame(this.boundLoop);
    }

    exit() {
      if (!this.isActive) return;
      this.isActive = false;

      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }

      window.removeEventListener("mousemove", this.boundMouseMove);
      window.removeEventListener("click", this.boundGlobalClick, true);
      window.removeEventListener("keydown", this.boundKeyDown);
      window.removeEventListener("resize", this.boundResize);

      this.restoreRealDOM();
    }

    createCanvas() {
      if (this.canvas) this.canvas.remove();

      this.canvas = document.createElement("canvas");
      this.canvas.id = "ats-apocalypse-canvas";
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      document.body.appendChild(this.canvas);
      this.ctx = this.canvas.getContext("2d");

      this.archer.x = window.innerWidth / 2;
      this.archer.y = window.innerHeight - 38;
    }

    createHUD() {
      if (this.hud) this.hud.remove();

      this.hud = document.createElement("div");
      this.hud.id = "ats-apocalypse-hud";
      this.hud.className = "ats-hud-container";

      this.hud.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="ats-hud-badge">🎯 ATS APOCALYPSE</span>
            <span id="hud-stage-badge" class="ats-hud-stage" style="font-size:0.75rem;">TARGET MODE</span>
          </div>
          <div class="ats-hud-bar-group">
            <span style="font-size:0.72rem;">HP:</span>
            <div class="ats-meter-track" style="width:70px;">
              <div id="hud-motivation-fill" class="ats-meter-fill" style="width: 100%;"></div>
            </div>
            <span id="hud-motivation-text" style="font-family:ui-monospace, monospace; font-weight:800; font-size:0.78rem; color:#4ade80;">100%</span>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:6px;">
          <button type="button" id="hud-rebuild-btn" class="ats-hud-btn ats-hud-rebuild-btn" title="Magnetically Rebuild Portfolio">🔨 Rebuild</button>
          <button type="button" id="hud-wave-btn" class="ats-hud-btn" style="background:#4338ca; color:#e0e7ff; border-color:#6366f1;" title="Trigger ATS Enemy Wave">⚔️ Wave</button>
          <button type="button" id="hud-exit-btn" class="ats-hud-btn ats-hud-exit-btn" title="Exit Game & Restore Portfolio (Esc)">✕ Exit</button>
        </div>

        <div class="ats-hud-hint" style="text-align:center;">
          🏹 Click on <strong>"Ruhban Abdullah"</strong> or sections to blast them!
        </div>
      `;

      document.body.appendChild(this.hud);

      document.getElementById("hud-rebuild-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        this.rebuildAll();
      });

      document.getElementById("hud-wave-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        this.triggerWaveAttack();
      });

      document.getElementById("hud-exit-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        this.exit();
      });
    }

    injectDreamsSection() {
      const header = document.querySelector("header");
      if (!header || document.getElementById("dreams-cinematic-container")) return;

      this.dreamsContainer = document.createElement("div");
      this.dreamsContainer.id = "dreams-cinematic-container";
      this.dreamsContainer.className = "dreams-cinematic-container";

      this.dreamsContainer.innerHTML = `
        <div class="dreams-label"><span>✨</span> DEVELOPER AMBITIONS (CLICK TO TARGET)</div>
        <ul class="dreams-lines-list">
          <li id="dreams-word-1" class="dreams-line-item" style="font-size:1.15rem; font-weight:800; color:#38bdf8;">DREAMS</li>
          <li id="dreams-word-2" class="dreams-line-item">BECOME A GREAT BACKEND DEVELOPER</li>
          <li id="dreams-word-3" class="dreams-line-item">BUILD SCALABLE SYSTEMS THAT MATTER</li>
          <li id="dreams-word-4" class="dreams-line-item">GET MY FIRST OPPORTUNITY</li>
        </ul>
        <div id="career-progression-path" class="career-prog-line">
          <span class="career-node" id="c-node-skills">Skills: Available</span>
          <span class="career-arrow" id="c-arr-1">➔</span>
          <span class="career-node" id="c-node-projects">Projects: Built</span>
          <span class="career-arrow" id="c-arr-2">➔</span>
          <span class="career-node" id="c-node-exp">Experience: 2+ Yrs</span>
          <span class="career-arrow" id="c-arr-3">➔</span>
          <span class="career-node" id="c-node-opp">First Job Opportunity</span>
        </div>
      `;

      header.parentNode.insertBefore(this.dreamsContainer, header.nextSibling);
    }

    // =========================================================================
    // Interactive Real DOM Shatter Physics
    // =========================================================================
    shatterRealName(clickX, clickY) {
      const h1 = document.querySelector("header h1");
      if (!h1) return;

      this.audio.playShatter();
      this.triggerScreenShake();

      const rect = h1.getBoundingClientRect();
      const originX = clickX || rect.left + rect.width / 2;
      const originY = clickY || rect.top + rect.height / 2;

      // 1. Explode 55 realistic geometric glass/stone shards on canvas
      for (let i = 0; i < 55; i++) {
        const shardColor = ["#ef4444", "#ffffff", "#38bdf8", "#dc2626", "#f87171"][Math.floor(Math.random() * 5)];
        this.shards.push(new GlassShard(originX, originY, shardColor));
      }

      // 2. Add Jagged Crack Overlay across H1
      if (!h1.querySelector(".ats-h1-crack-overlay")) {
        const crack = document.createElement("div");
        crack.className = "ats-h1-crack-overlay";
        h1.appendChild(crack);
      }

      // 3. Convert each real letter into an independent physics falling shard in DOM
      const rawText = "Ruhban Abdullah";
      let html = "";
      for (let i = 0; i < rawText.length; i++) {
        const char = rawText[i];
        if (char === " ") {
          html += " ";
        } else {
          // Physics fall characteristics: tumble down and tilt
          const tx = (Math.random() * 60 - 30).toFixed(0);
          const ty = (Math.random() * 90 + 35).toFixed(0);
          const rot = (Math.random() * 90 - 45).toFixed(0);
          const sc = (Math.random() * 0.3 + 0.85).toFixed(2);
          html += `<span class="ats-shatter-letter broken-shard" style="--tx:${tx}px; --ty:${ty}px; --rot:${rot}deg; --sc:${sc};">${char}</span>`;
        }
      }
      h1.innerHTML = html;

      // 4. Glitch badge
      setTimeout(() => {
        if (!h1.querySelector(".ats-name-glitch-badge")) {
          const badge = document.createElement("div");
          badge.className = "ats-name-glitch-badge";
          badge.textContent = "⚠️ CANDIDATE RECORD SHATTERED BY ATS";
          h1.appendChild(badge);
        }
      }, 300);

      this.destroyedCount++;
      this.score += 350;
      this.setMotivation(this.motivation - 15);
      this.showCenterNotice("💥 RUHBAN ABDULLAH SHATTERED! Click 'Rebuild' to Magnetically Restore!");
    }

    rebuildRealName() {
      const h1 = document.querySelector("header h1");
      if (!h1) return;

      this.audio.playRebuildChime();

      // Magnetic return animation
      const letters = h1.querySelectorAll(".ats-shatter-letter");
      letters.forEach((span) => {
        span.classList.remove("broken-shard");
        span.classList.add("rebuilt");
      });

      const crack = h1.querySelector(".ats-h1-crack-overlay");
      if (crack) crack.remove();

      const badge = h1.querySelector(".ats-name-glitch-badge");
      if (badge) badge.remove();

      // Sparkles at the name
      const rect = h1.getBoundingClientRect();
      for (let i = 0; i < 35; i++) {
        this.particles.push({
          x: rect.left + Math.random() * rect.width,
          y: rect.top + Math.random() * rect.height,
          vx: (Math.random() - 0.5) * 120,
          vy: (Math.random() - 0.5) * 120,
          size: Math.random() * 4 + 2,
          color: "#38bdf8",
          life: 0.8,
          maxLife: 0.8,
        });
      }
    }

    breakRealProject(card, clickX, clickY) {
      if (!card) return;
      this.audio.playStamp();
      this.triggerScreenShake();

      const rot = (Math.random() * 12 - 6).toFixed(1);
      card.classList.add("ats-card-broken");
      card.style.setProperty("--card-rot", `${rot}deg`);

      // Shards from project impact
      const rect = card.getBoundingClientRect();
      const ox = clickX || rect.left + rect.width / 2;
      const oy = clickY || rect.top + rect.height / 2;
      for (let i = 0; i < 25; i++) {
        this.shards.push(new GlassShard(ox, oy, "#f59e0b"));
      }

      if (!card.querySelector(".ats-stamp")) {
        const stamp = document.createElement("div");
        stamp.className = "ats-stamp stamp-project";
        stamp.textContent = Math.random() > 0.5 ? "REJECTED: NOT A FIT" : "POSITION CLOSED";
        card.appendChild(stamp);
      }

      this.destroyedCount++;
      this.score += 200;
      this.setMotivation(this.motivation - 10);
    }

    attackRealSkills(clickX, clickY) {
      const skills = document.querySelectorAll("#skills .skills-list li");
      this.audio.playStamp();
      skills.forEach((li, idx) => {
        setTimeout(() => {
          if (!li.querySelector(".ats-skill-gate")) {
            const gate = document.createElement("span");
            gate.className = "ats-skill-gate";
            gate.textContent = idx === 0 ? " [5+ YRS REQ]" : " [UNVERIFIED BY BOT]";
            li.appendChild(gate);
          }
        }, idx * 100);
      });

      if (clickX && clickY) {
        for (let i = 0; i < 20; i++) {
          this.shards.push(new GlassShard(clickX, clickY, "#ef4444"));
        }
      }

      this.score += 150;
      this.setMotivation(this.motivation - 10);
    }

    attackRealResume() {
      const resumeLink = document.querySelector("header .links a");
      if (!resumeLink) return;
      this.audio.playStamp();

      if (!resumeLink.querySelector(".ats-scanner-bar")) {
        const scanner = document.createElement("div");
        scanner.className = "ats-scanner-bar";
        resumeLink.appendChild(scanner);
      }

      if (!resumeLink.querySelector(".ats-resume-stamp")) {
        const tag = document.createElement("span");
        tag.className = "ats-resume-stamp";
        tag.textContent = " [ATS SCORE: 12% REJECTED]";
        resumeLink.appendChild(tag);
      }

      const rect = resumeLink.getBoundingClientRect();
      for (let i = 0; i < 20; i++) {
        this.shards.push(new GlassShard(rect.left + rect.width / 2, rect.top, "#ef4444"));
      }
    }

    destroyDreams(clickX, clickY) {
      if (!this.dreamsContainer) return;
      this.audio.playStamp();
      this.triggerScreenShake();

      if (!this.dreamsContainer.querySelector(".ats-stamp-overlay")) {
        const stamp = document.createElement("div");
        stamp.className = "ats-stamp-overlay";
        stamp.textContent = "AUTO-REJECTED";
        this.dreamsContainer.appendChild(stamp);
      }

      const l1 = document.getElementById("dreams-word-1");
      if (l1) {
        l1.innerHTML = `
          <span class="ats-shatter-letter broken-shard" style="--tx:-18px; --ty:35px; --rot:-25deg;">D</span>
          <span class="ats-shatter-letter broken-shard" style="--tx:-6px; --ty:45px; --rot:18deg;">R</span>
          <span class="ats-shatter-letter broken-shard" style="--tx:8px; --ty:50px; --rot:-15deg;">E</span>
          <span class="ats-shatter-letter broken-shard" style="--tx:22px; --ty:38px; --rot:30deg;">A</span>
          <span class="ats-shatter-letter broken-shard" style="--tx:32px; --ty:48px; --rot:-20deg;">M</span>
          <span class="ats-shatter-letter broken-shard" style="--tx:42px; --ty:40px; --rot:15deg;">S</span>
        `;
      }

      const l4 = document.getElementById("dreams-word-4");
      if (l4) {
        l4.classList.add("rejected");
        l4.innerHTML = `GET MY FIRST <span style="text-decoration:line-through; color:#ef4444;">OPPORTUNITY</span> <span class="dreams-rejection-tag">NOT FOUND (404)</span>`;
      }

      const cPath = document.getElementById("career-progression-path");
      if (cPath) {
        cPath.classList.add("ats-shake");
        cPath.querySelectorAll(".career-arrow").forEach((a) => {
          a.classList.add("broken");
          a.textContent = "✖";
        });
      }

      const ox = clickX || window.innerWidth / 2;
      const oy = clickY || 200;
      for (let i = 0; i < 30; i++) {
        this.shards.push(new GlassShard(ox, oy, "#ef4444"));
      }

      this.score += 250;
      this.setMotivation(this.motivation - 15);
    }

    damageContactFirewall(clickX, clickY) {
      const contact = document.querySelector("#contact");
      if (!contact) return;

      if (!this.firewallOverlay) {
        this.firewallOverlay = document.createElement("div");
        this.firewallOverlay.id = "ats-contact-firewall";
        this.firewallOverlay.className = "ats-contact-firewall";
        this.firewallOverlay.dataset.hp = "100";

        this.firewallOverlay.innerHTML = `
          <div class="firewall-lock-icon">🔒</div>
          <div class="firewall-title">ATS REJECTION FIREWALL</div>
          <p class="firewall-desc">"Candidate blocked by algorithmic filter. Shoot this shield to breach the firewall!"</p>
          <div style="font-weight:800; font-size:0.75rem; color:#facc15; margin-bottom:8px;">SHIELD INTEGRITY: <span id="firewall-hp-text">100%</span></div>
          <div class="firewall-boss-hp"><div id="firewall-bar" class="firewall-boss-fill" style="width: 100%;"></div></div>
        `;
        contact.style.position = "relative";
        contact.appendChild(this.firewallOverlay);
      }

      let hp = parseInt(this.firewallOverlay.dataset.hp || "100", 10);
      hp -= 34;
      this.firewallOverlay.dataset.hp = String(Math.max(0, hp));

      this.audio.playHit();
      this.triggerScreenShake();

      const ox = clickX || window.innerWidth / 2;
      const oy = clickY || 400;
      for (let i = 0; i < 20; i++) {
        this.shards.push(new GlassShard(ox, oy, "#38bdf8"));
      }

      const hpText = document.getElementById("firewall-hp-text");
      const hpBar = document.getElementById("firewall-bar");
      if (hpText) hpText.textContent = `${Math.max(0, hp)}%`;
      if (hpBar) hpBar.style.width = `${Math.max(0, hp)}%`;

      if (hp <= 0) {
        this.audio.playShatter();
        this.firewallOverlay.classList.add("shattered");
        setTimeout(() => {
          if (this.firewallOverlay) {
            this.firewallOverlay.remove();
            this.firewallOverlay = null;
          }
        }, 700);
        this.showCenterNotice("🎉 CONTACT FIREWALL BREACHED! Recruiters can now reach you!");
      }
    }

    triggerScreenShake() {
      document.body.classList.remove("ats-shake");
      void document.body.offsetWidth;
      document.body.classList.add("ats-shake");
      setTimeout(() => document.body.classList.remove("ats-shake"), 400);
    }

    // =========================================================================
    // Rebuild All Elements (Magnetic Pull-Back)
    // =========================================================================
    rebuildAll() {
      this.audio.playRebuildChime();

      // 1. Rebuild Name
      this.rebuildRealName();

      // 2. Restore Intro
      const intro = document.querySelector("header .intro");
      if (intro && this.originalDOM.introHTML) {
        intro.innerHTML = this.originalDOM.introHTML;
      }

      // 3. Restore Dreams & Career Path
      if (this.dreamsContainer) {
        this.dreamsContainer.innerHTML = `
          <div class="dreams-label" style="color:#4ade80;"><span>🎉</span> AMBITIONS RESTORED & PROVEN</div>
          <ul class="dreams-lines-list">
            <li class="dreams-line-item" style="color:#38bdf8; font-size:1.1rem; font-weight:900;">“They broke the application. They couldn't stop the developer.”</li>
            <li class="dreams-line-item" style="color:#4ade80; font-weight:700;">“Still building. Still learning. Still here.”</li>
          </ul>
          <div id="career-progression-path" class="career-prog-line" style="border-color:#4ade80;">
            <span class="career-node restored">Skills: Proven ✔</span>
            <span class="career-arrow" style="color:#4ade80;">➔</span>
            <span class="career-node restored">Projects: Shipped ✔</span>
            <span class="career-arrow" style="color:#4ade80;">➔</span>
            <span class="career-node restored">Experience: Production ✔</span>
            <span class="career-arrow" style="color:#4ade80;">➔</span>
            <span class="career-node restored" style="font-weight:800; font-size:0.85rem; color:#facc15;">HIRED / INTERVIEW UNLOCKED 🎯</span>
          </div>
        `;
      }

      // 4. Restore Projects
      document.querySelectorAll(".project-item").forEach((p) => {
        p.classList.remove("ats-card-broken", "ats-shake");
        p.style.transform = "";
        const stamp = p.querySelector(".ats-stamp");
        if (stamp) stamp.remove();
      });

      // 5. Restore Skills
      document.querySelectorAll("#skills .skills-list li .ats-skill-gate").forEach((g) => g.remove());

      // 6. Restore Resume
      const resStamp = document.querySelector(".ats-resume-stamp");
      if (resStamp) resStamp.remove();
      const resScan = document.querySelector(".ats-scanner-bar");
      if (resScan) resScan.remove();

      // 7. Remove Firewall
      if (this.firewallOverlay) {
        this.firewallOverlay.classList.add("shattered");
        setTimeout(() => {
          if (this.firewallOverlay) {
            this.firewallOverlay.remove();
            this.firewallOverlay = null;
          }
        }, 600);
      }

      // 8. Restore Colors
      document.body.classList.remove("ats-page-cracking");
      document.body.classList.add("ats-page-restored");
      document.body.style.filter = "none";
      this.setMotivation(100);

      // Clean up stray shards
      this.shards = [];

      this.showCenterNotice("✨ PORTFOLIO MAGNETICALLY REBUILT! All sections restored!");
    }

    // =========================================================================
    // Wave Attack Mode (Enemies & Boss)
    // =========================================================================
    triggerWaveAttack() {
      if (this.isWaveActive) return;
      this.isWaveActive = true;
      this.showCenterNotice("⚔️ INCOMING ATS ENEMY WAVE! Defend your portfolio!");

      // Spawn Drones
      this.spawnEnemy("drone", 80, 70);
      this.spawnEnemy("drone", window.innerWidth - 140, 90);
      this.spawnEnemy("gatekeeper", window.innerWidth / 2 - 30, 60);

      // Desaturate slightly
      document.body.classList.add("ats-page-cracking");

      // Auto-trigger DOM destruction if not yet broken
      setTimeout(() => {
        if (this.isActive) this.attackRealResume();
      }, 1500);

      setTimeout(() => {
        if (this.isActive) this.destroyDreams();
      }, 3000);

      setTimeout(() => {
        if (this.isActive) this.shatterRealName();
      }, 4500);

      setTimeout(() => {
        if (this.isActive) this.damageContactFirewall();
      }, 6000);

      // Spawn Boss
      setTimeout(() => {
        if (this.isActive) {
          this.spawnBoss();
          this.archer.determinationMode = true;
          this.showCenterNotice("⚡ ATS MEGACORE BOSS DETECTED! Golden Determination Mode Activated!");
        }
      }, 8000);
    }

    spawnEnemy(type, x, y) {
      this.enemies.push({
        type,
        x,
        y,
        width: type === "gatekeeper" ? 64 : 48,
        height: 28,
        speedX: (Math.random() > 0.5 ? 1 : -1) * (type === "gatekeeper" ? 90 : 130),
        hp: type === "gatekeeper" ? 3 : 1,
        maxHp: type === "gatekeeper" ? 3 : 1,
        shootCooldown: Math.random() * 2 + 1,
      });
    }

    spawnBoss() {
      this.enemies.push({
        type: "boss",
        x: window.innerWidth / 2 - 120,
        y: 60,
        width: 240,
        height: 55,
        speedX: 110,
        hp: 12,
        maxHp: 12,
        shootCooldown: 0.8,
      });
    }

    // =========================================================================
    // Input Handlers
    // =========================================================================
    handleMouseMove(e) {
      if (!this.isActive) return;
      const dx = e.clientX - this.archer.x;
      const dy = e.clientY - this.archer.y;
      this.archer.angle = Math.atan2(dy, dx);
    }

    handleGlobalClick(e) {
      if (!this.isActive) return;

      // Don't intercept clicks inside the top HUD controls
      if (e.target.closest("#ats-apocalypse-hud") || e.target.closest("#ats-victory-overlay")) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const clickX = e.clientX;
      const clickY = e.clientY;

      // Fire projectile toward click
      this.fireArrowTo(clickX, clickY);

      // Detect real DOM target under cursor
      const h1 = document.querySelector("header h1");
      if (h1 && this.isPointInsideElement(clickX, clickY, h1)) {
        this.shatterRealName(clickX, clickY);
        return;
      }

      const projectCard = e.target.closest(".project-item");
      if (projectCard) {
        this.breakRealProject(projectCard, clickX, clickY);
        return;
      }

      const skillsSec = document.querySelector("#skills");
      if (skillsSec && this.isPointInsideElement(clickX, clickY, skillsSec)) {
        this.attackRealSkills(clickX, clickY);
        return;
      }

      const resumeLink = document.querySelector("header .links a");
      if (resumeLink && this.isPointInsideElement(clickX, clickY, resumeLink)) {
        this.attackRealResume();
        return;
      }

      const dreams = document.getElementById("dreams-cinematic-container");
      if (dreams && this.isPointInsideElement(clickX, clickY, dreams)) {
        this.destroyDreams(clickX, clickY);
        return;
      }

      const firewall = document.getElementById("ats-contact-firewall");
      if (firewall && this.isPointInsideElement(clickX, clickY, firewall)) {
        this.damageContactFirewall(clickX, clickY);
        return;
      }

      // Check click on enemies
      this.enemies.forEach((enemy) => {
        if (
          clickX >= enemy.x &&
          clickX <= enemy.x + enemy.width &&
          clickY >= enemy.y &&
          clickY <= enemy.y + enemy.height
        ) {
          enemy.hp -= this.archer.determinationMode ? 3 : 1;
          this.audio.playHit();
          for (let i = 0; i < 15; i++) {
            this.shards.push(new GlassShard(clickX, clickY, "#facc15"));
          }
          if (enemy.hp <= 0) {
            enemy.destroyed = true;
            this.audio.playShatter();
            this.score += enemy.type === "boss" ? 2000 : 250;
            if (enemy.type === "boss") {
              this.rebuildAll();
              this.renderVictoryModal();
            }
          }
        }
      });
    }

    isPointInsideElement(x, y, element) {
      const r = element.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }

    fireArrowTo(targetX, targetY) {
      this.audio.playBowRelease();

      const dx = targetX - this.archer.x;
      const dy = targetY - this.archer.y;
      const angle = Math.atan2(dy, dx);
      const speed = this.archer.determinationMode ? 1000 : 800;

      this.arrows.push({
        x: this.archer.x,
        y: this.archer.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        targetX,
        targetY,
        angle,
        isGolden: this.archer.determinationMode,
      });
    }

    handleKeyDown(e) {
      if (!this.isActive) return;
      if (e.key === "Escape") {
        e.preventDefault();
        this.exit();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        this.rebuildAll();
      }
    }

    handleResize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.archer.x = window.innerWidth / 2;
      this.archer.y = window.innerHeight - 38;
    }

    setMotivation(val) {
      this.motivation = Math.max(0, Math.min(100, val));
      const fill = document.getElementById("hud-motivation-fill");
      const text = document.getElementById("hud-motivation-text");
      if (fill) fill.style.width = `${this.motivation}%`;
      if (text) {
        text.textContent = `${this.motivation}%`;
        text.style.color = this.motivation <= 25 ? "#ef4444" : this.motivation <= 60 ? "#f59e0b" : "#4ade80";
      }
    }

    showCenterNotice(text) {
      const notice = document.createElement("div");
      notice.className = "ats-center-notice";
      notice.textContent = text;
      document.body.appendChild(notice);
      setTimeout(() => {
        notice.style.opacity = "0";
        setTimeout(() => notice.remove(), 400);
      }, 2400);
    }

    // =========================================================================
    // Game Loop & Canvas Render
    // =========================================================================
    loop(currentTime) {
      if (!this.isActive) return;

      const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
      this.lastTime = currentTime;

      this.update(dt);
      this.render();

      this.animId = requestAnimationFrame(this.boundLoop);
    }

    update(dt) {
      const w = this.canvas.width;
      const h = this.canvas.height;

      // Update Arrows
      this.arrows.forEach((arrow) => {
        arrow.x += arrow.vx * dt;
        arrow.y += arrow.vy * dt;

        // Spark trail
        this.particles.push({
          x: arrow.x,
          y: arrow.y,
          vx: (Math.random() - 0.5) * 20,
          vy: (Math.random() - 0.5) * 20,
          size: arrow.isGolden ? 3.5 : 2,
          color: arrow.isGolden ? "#facc15" : "#38bdf8",
          life: 0.2,
          maxLife: 0.2,
        });
      });
      this.arrows = this.arrows.filter((a) => a.x > -50 && a.x < w + 50 && a.y > -50 && a.y < h + 50);

      // Update Enemies
      this.enemies.forEach((enemy) => {
        enemy.x += enemy.speedX * dt;
        if (enemy.x <= 20 || enemy.x >= w - enemy.width - 20) {
          enemy.speedX *= -1;
        }

        enemy.shootCooldown -= dt;
        if (enemy.shootCooldown <= 0) {
          enemy.shootCooldown = enemy.type === "boss" ? 0.7 : Math.random() * 2 + 1.2;
          this.enemyLasers.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height,
            vx: (Math.random() - 0.5) * 50,
            vy: 260,
          });
        }
      });

      // Update Lasers
      this.enemyLasers.forEach((laser) => {
        laser.x += laser.vx * dt;
        laser.y += laser.vy * dt;
      });
      this.enemyLasers = this.enemyLasers.filter((l) => l.y < h + 40);

      // Update Geometric Shards
      this.shards.forEach((s) => s.update(dt));
      this.shards = this.shards.filter((s) => s.life > 0);

      // Update Particles
      this.particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
      });
      this.particles = this.particles.filter((p) => p.life > 0);

      this.enemies = this.enemies.filter((e) => !e.destroyed);
    }

    render() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;

      ctx.clearRect(0, 0, w, h);

      // 1. Draw Geometric Shards
      this.shards.forEach((s) => s.draw(ctx));

      // 2. Draw Particles
      this.particles.forEach((p) => {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // 3. Draw Lasers
      ctx.fillStyle = "#ef4444";
      this.enemyLasers.forEach((l) => {
        ctx.fillRect(l.x - 2, l.y, 4, 16);
      });

      // 4. Draw Arrows
      this.arrows.forEach((a) => {
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(a.angle);
        ctx.strokeStyle = a.isGolden ? "#facc15" : "#38bdf8";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(16, 0);
        ctx.stroke();

        ctx.fillStyle = a.isGolden ? "#fef08a" : "#ffffff";
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(8, -5);
        ctx.lineTo(8, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // 5. Draw Enemies
      this.enemies.forEach((enemy) => {
        this.renderEnemy(ctx, enemy);
      });

      // 6. Draw Archer at bottom
      this.renderArcher(ctx);
    }

    renderArcher(ctx) {
      const x = this.archer.x;
      const y = this.archer.y;
      const angle = this.archer.angle;

      ctx.save();
      ctx.translate(x, y);

      // Platform
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = this.archer.determinationMode ? "#facc15" : "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 10, 22, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Developer Character
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(0, -2, 9, 0, Math.PI * 2);
      ctx.fill();

      // Bow
      ctx.rotate(angle);
      ctx.strokeStyle = this.archer.determinationMode ? "#facc15" : "#e2e8f0";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(10, 0, 18, -Math.PI / 2.5, Math.PI / 2.5);
      ctx.stroke();

      // Bowstring
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(10 + Math.cos(-Math.PI / 2.5) * 18, Math.sin(-Math.PI / 2.5) * 18);
      ctx.lineTo(2, 0);
      ctx.lineTo(10 + Math.cos(Math.PI / 2.5) * 18, Math.sin(Math.PI / 2.5) * 18);
      ctx.stroke();

      ctx.restore();
    }

    renderEnemy(ctx, enemy) {
      const x = enemy.x;
      const y = enemy.y;
      const w = enemy.width;
      const h = enemy.height;

      if (enemy.type === "boss") {
        ctx.fillStyle = "#1e1b4b";
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2.5;
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 14;

        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "#facc15";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🤖 ATS MEGACORE BOSS 🤖", x + w / 2, y + 22);

        // Boss Health Bar
        const pct = enemy.hp / enemy.maxHp;
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(x + 16, y + 34, w - 32, 8);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(x + 16, y + 34, (w - 32) * pct, 8);
      } else {
        ctx.fillStyle = "#1e293b";
        ctx.strokeStyle = enemy.type === "gatekeeper" ? "#f59e0b" : "#ef4444";
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(enemy.type === "gatekeeper" ? "Gatekeeper" : "ATS Bot", x + w / 2, y + h / 2 + 4);
      }
    }

    renderVictoryModal() {
      const modal = document.createElement("div");
      modal.id = "ats-victory-overlay";
      modal.className = "ats-victory-overlay";

      modal.innerHTML = `
        <div class="ats-victory-card">
          <div class="victory-header-tag">VICTORY OVER THE SYSTEM</div>
          <h2 class="victory-headline">“They broke the application. They couldn't stop the developer.”</h2>
          <p class="victory-subline">“Still building. Still learning. Still here.”</p>

          <div class="victory-details-card">
            <p style="margin-bottom:8px; font-size:0.9rem; color:#f8fafc;">
              <strong>Ruhban Abdullah:</strong> 2+ Years Production Backend Experience &bull; High Concurrency Systems &bull; AWS Infrastructure
            </p>
            <p style="font-size:0.82rem; color:#94a3b8; margin-bottom:16px;">
              Your portfolio has been completely rebuilt, restored, and verified.
            </p>

            <div class="victory-action-btns">
              <a href="#contact" id="ats-hire-ruhban-btn" class="arcade-cta-btn" style="text-decoration:none;">Hire Ruhban Now 🎯</a>
              <a href="https://drive.google.com/file/d/1G7nWg2vVoF8bwFJ-woYvTk1OGQL6r1G4/view?usp=sharing" target="_blank" rel="noopener noreferrer" class="arcade-secondary-btn">View Official Resume 📄</a>
              <button type="button" id="ats-copy-email-btn" class="arcade-secondary-btn">Copy Email 📋</button>
            </div>
          </div>

          <button type="button" id="ats-victory-close-btn" class="arcade-subtle-btn" style="margin-top:12px;">Close & Explore Restored Portfolio ✕</button>
        </div>
      `;

      document.body.appendChild(modal);

      document.getElementById("ats-hire-ruhban-btn").addEventListener("click", () => {
        modal.remove();
        this.exit();
        const contact = document.getElementById("contact");
        if (contact) contact.scrollIntoView({ behavior: "smooth" });
      });

      document.getElementById("ats-copy-email-btn").addEventListener("click", () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText("shahruhban01@gmail.com");
          const btn = document.getElementById("ats-copy-email-btn");
          if (btn) btn.textContent = "Email Copied! ✓";
        }
      });

      document.getElementById("ats-victory-close-btn").addEventListener("click", () => {
        modal.remove();
        this.exit();
      });
    }
  }

  // Register & Initialize
  const engine = new ATSApocalypseEngine();
  window.ATSApocalypse = {
    Engine: engine,
    start: () => engine.start(),
    exit: () => engine.exit(),
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      engine.init();
    });
  } else {
    engine.init();
  }
})();

/* Level 2 — Los Angeles (LAX) */
(function () {

  /* ---- helpers ---- */
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawBubble(ctx, anchorX, anchorY, text, C, cssW) {
    ctx.save();
    ctx.font = '700 12px Fredoka, Trebuchet MS, sans-serif';
    const tw = ctx.measureText(text).width;
    const padX = 12, bh = 30, r = 3;
    const bw = tw + padX * 2;
    let bx = anchorX - bw / 2;
    bx = Math.max(6, Math.min(cssW - bw - 6, bx));
    const by = anchorY - 16 - bh;
    const ink = C.ink || '#16140F', surface = C.surface || '#fff';
    const tx = Math.max(bx + 14, Math.min(bx + bw - 14, anchorX));
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    rrect(ctx, bx + 2, by + 3, bw, bh, r); ctx.fill();
    ctx.fillStyle = surface;
    rrect(ctx, bx, by, bw, bh, r); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tx - 7, by + bh - 1); ctx.lineTo(anchorX, anchorY); ctx.lineTo(tx + 7, by + bh - 1);
    ctx.closePath(); ctx.fillStyle = surface; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    rrect(ctx, bx, by, bw, bh, r); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx - 7, by + bh - 1); ctx.lineTo(anchorX, anchorY); ctx.lineTo(tx + 7, by + bh - 1);
    ctx.stroke();
    ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, bx + padX, by + bh * 0.64);
    ctx.restore();
  }

  // Commercial airplane, side view, nose pointing right (dir=1) or left (dir=-1).
  // px,py = fuselage centre. s = scale (~100). gearFrac 0=up 1=down.
  // Cartoon WWI biplane (Sopwith Camel style).
  // px,py = fuselage centreline. s=100 → ~190px nose-to-tail.
  // dir=1 nose-right, -1 nose-left. Fixed gear — always drawn.
  function drawPlane(ctx, px, py, s, dir, t, gearFrac) {
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(dir * 1.15, 0.88);

    const ink  = '#2c1e08';
    const skin = '#e8c870';   // warm canvas/fabric
    const dark = '#c8a040';   // shadow/darker panels
    const wood = '#7a4a18';   // struts & prop
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // ── BOTTOM WING ─────────────────────────────────────────
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(s * 0.22, s * 0.18);            // root front
    ctx.lineTo(-s * 0.58, s * 0.12);           // tip front
    ctx.quadraticCurveTo(-s * 0.70, s * 0.14, -s * 0.68, s * 0.26); // tip round
    ctx.lineTo(s * 0.12, s * 0.30);            // root back
    ctx.closePath();
    ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2.8; ctx.stroke();
    // Wing rib lines
    ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const rx = s * 0.16 - i * s * 0.18;
      ctx.beginPath(); ctx.moveTo(rx, s * 0.19); ctx.lineTo(rx - s * 0.02, s * 0.29); ctx.stroke();
    }

    // ── WING STRUTS (V-brace between wings) ─────────────────
    ctx.strokeStyle = wood; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(s * 0.18, -s * 0.28); ctx.lineTo(s * 0.22, s * 0.18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.12, -s * 0.28); ctx.lineTo(s * 0.12, s * 0.18); ctx.stroke();
    ctx.strokeStyle = wood; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(s * 0.18, -s * 0.28); ctx.lineTo(s * 0.12, s * 0.18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.12, -s * 0.28); ctx.lineTo(s * 0.22, s * 0.18); ctx.stroke();

    // ── TOP WING (wider than bottom) ────────────────────────
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(s * 0.34, -s * 0.36);           // root front
    ctx.lineTo(-s * 0.72, -s * 0.42);          // tip front
    ctx.quadraticCurveTo(-s * 0.86, -s * 0.44, -s * 0.84, -s * 0.30); // tip round
    ctx.lineTo(s * 0.22, -s * 0.24);           // root back
    ctx.closePath();
    ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2.8; ctx.stroke();
    // Rib lines
    ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const rx = s * 0.26 - i * s * 0.20;
      ctx.beginPath(); ctx.moveTo(rx, -s * 0.36); ctx.lineTo(rx - s * 0.02, -s * 0.26); ctx.stroke();
    }

    // ── FUSELAGE ─────────────────────────────────────────────
    ctx.beginPath();
    ctx.moveTo(-s * 0.82, s * 0.00);           // tail tip
    ctx.quadraticCurveTo(-s * 0.72, -s * 0.20, -s * 0.30, -s * 0.26); // top taper
    ctx.lineTo(s * 0.16, -s * 0.26);
    ctx.quadraticCurveTo(s * 0.38, -s * 0.26, s * 0.38, s * 0.04);   // nose top
    ctx.quadraticCurveTo(s * 0.38, s * 0.28, s * 0.16, s * 0.28);    // nose bottom
    ctx.lineTo(-s * 0.30, s * 0.28);
    ctx.quadraticCurveTo(-s * 0.72, s * 0.22, -s * 0.82, s * 0.00);  // bottom taper
    ctx.closePath();
    ctx.fillStyle = skin; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 3.2; ctx.stroke();
    // Belly shading
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.moveTo(-s * 0.30, s * 0.28);
    ctx.lineTo(s * 0.16, s * 0.28);
    ctx.quadraticCurveTo(s * 0.38, s * 0.28, s * 0.38, s * 0.14);
    ctx.quadraticCurveTo(s * 0.10, s * 0.28, -s * 0.30, s * 0.22);
    ctx.closePath(); ctx.fill();

    // ── OPEN COCKPIT ─────────────────────────────────────────
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.ellipse(-s * 0.10, -s * 0.24, s * 0.10, s * 0.06, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
    // Pilot head (tiny circle in cockpit)
    ctx.fillStyle = '#f0c878';
    ctx.beginPath(); ctx.arc(-s * 0.10, -s * 0.32, s * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
    // Goggles
    ctx.fillStyle = '#3a2808';
    ctx.beginPath(); ctx.ellipse(-s * 0.10, -s * 0.32, s * 0.055, s * 0.035, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6090c0';
    ctx.beginPath(); ctx.ellipse(-s * 0.10, -s * 0.32, s * 0.038, s * 0.024, 0, 0, Math.PI * 2); ctx.fill();

    // ── TAIL SURFACES ────────────────────────────────────────
    // Vertical rudder
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-s * 0.72, -s * 0.01);
    ctx.lineTo(-s * 0.84, -s * 0.34);
    ctx.quadraticCurveTo(-s * 0.76, -s * 0.40, -s * 0.66, -s * 0.30);
    ctx.lineTo(-s * 0.60, -s * 0.01);
    ctx.closePath();
    ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.stroke();
    // Horizontal elevator
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-s * 0.68, s * 0.04);
    ctx.quadraticCurveTo(-s * 0.90, s * 0.02, -s * 0.98, -s * 0.07);
    ctx.quadraticCurveTo(-s * 0.90, -s * 0.15, -s * 0.68, -s * 0.08);
    ctx.closePath();
    ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.stroke();

    // ── ROUND NOSE COWLING ───────────────────────────────────
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.arc(s * 0.38, s * 0.02, s * 0.26, 0, Math.PI * 2);
    ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke();
    // Cowling ring detail
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(s * 0.38, s * 0.02, s * 0.16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(s * 0.38, s * 0.02, s * 0.08, 0, Math.PI * 2); ctx.stroke();

    // ── PROPELLER (spinning) ─────────────────────────────────
    ctx.save();
    ctx.translate(s * 0.64, s * 0.02);
    ctx.rotate(t * 9 * dir);
    ctx.fillStyle = wood;
    // Blade A
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.24, s * 0.058, s * 0.26, 0.18, 0, Math.PI * 2);
    ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.stroke();
    // Blade B
    ctx.beginPath();
    ctx.ellipse(0, s * 0.24, s * 0.058, s * 0.26, -0.18, 0, Math.PI * 2);
    ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.stroke();
    // Hub
    ctx.fillStyle = '#3a2010';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.06, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    // ── LANDING GEAR (V-strut, always visible — fixed gear) ──
    ctx.strokeStyle = wood; ctx.lineWidth = 5; ctx.lineCap = 'round';
    // Front strut pair (V from fuselage belly)
    ctx.beginPath(); ctx.moveTo(s * 0.24, s * 0.26); ctx.lineTo(s * 0.14, s * 0.52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.04, s * 0.26); ctx.lineTo(s * 0.14, s * 0.52); ctx.stroke();
    // Rear strut pair
    ctx.beginPath(); ctx.moveTo(-s * 0.06, s * 0.26); ctx.lineTo(-s * 0.16, s * 0.52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.24, s * 0.26); ctx.lineTo(-s * 0.16, s * 0.52); ctx.stroke();
    // Axle
    ctx.strokeStyle = wood; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-s * 0.26, s * 0.52); ctx.lineTo(s * 0.24, s * 0.52); ctx.stroke();
    // Wheels
    ctx.fillStyle = '#2c1e08'; ctx.strokeStyle = ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s * 0.16, s * 0.52, s * 0.085, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(-s * 0.14, s * 0.52, s * 0.085, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Wheel hub shine
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.arc(s * 0.10, s * 0.50, s * 0.030, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-s * 0.19, s * 0.50, s * 0.030, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }
  window.LRDrawPlane = drawPlane;   // reused by level 3 intro

  function playJingle() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [523, 659, 784, 1047].forEach((hz, i) => {
        const osc = ac.createOscillator(), g = ac.createGain();
        osc.connect(g); g.connect(ac.destination);
        osc.type = 'sine'; osc.frequency.value = hz;
        const t0 = ac.currentTime + i * 0.13;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.2, t0 + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.6);
        osc.start(t0); osc.stop(t0 + 0.7);
      });
    } catch (e) {}
  }

  // When gear is fully down, plane centre must sit at baseY - PLANE_GEAR_H so wheels touch ground.
  const PLANE_S    = 100;
  const PLANE_GEAR_H = PLANE_S * 0.532;  // (axle 0.52 + wheel-r 0.085) * 0.88 vert-scale
  const RUN_CAMOFF = 116;

  (window.LRLevels = window.LRLevels || []).push({
    n: 2, name: 'Los Angeles', sub: 'LAX', locked: false, stars: 2,
    theme: 'lax', speed: 155, gaps: 12, spikes: 7, saws: 2, len: 7500,

    onBuild(w) {
      w.fox.hidden = true;
      w.camOffset = RUN_CAMOFF;
      // Plane sits beyond the finish flag at worldEnd + 200
      const planeWorldX = w.worldEnd + 200;
      const planeSitY   = w.baseY - PLANE_GEAR_H;  // gear on ground
      w.lax = {
        cssW: 844,
        // intro phases: 'descend' → 'hover' → 'foxdrop' → 'run'
        intro: 'descend',
        phaseT: 0,
        heliScreenX: 240,
        heliY: w.baseY - 130,          // starts near-ground
        heliTargetY: w.baseY - 52,     // descends to just above ground
        foxDropP: 0,
        // plane
        planeWorldX,
        planeSitY,
        winScene: null,
      };
    },

    onWin(w, proceed) {
      const L = w.lax; if (!L) return false;
      playJingle();
      const planeScreenX = L.planeWorldX - w.camX;
      L.winScene = {
        phase: 'walk', phaseStartT: w.t, proceed,
        planeScreenX,          // changes during animation
        planeY: L.planeSitY,
        gearFrac: 1,
        foxWorldX: w.fox.x,
        foxGroundY: w.baseY - w.fox.r,
        takeoffVX: 0,
        takeoffVY: 0,
      };
      return true;
    },

    onUpdate(w, dt) {
      const L = w.lax; if (!L) return;
      const f = w.fox;

      /* ============ INTRO ============ */
      if (L.intro !== 'run') {
        L.phaseT += dt;
        f.x = w.startX; f.y = w.baseY - f.r; f.vy = 0; f.air = false;
        if (w.drawing !== null) { w.drawing = null; w.strokes = []; }

        if (L.intro === 'descend') {
          f.hidden = true;
          const p = Math.min(1, L.phaseT / 1.2);
          L.heliY = (w.baseY - 130) + (L.heliTargetY - (w.baseY - 130)) * p * p;
          if (p >= 1) { L.intro = 'hover'; L.phaseT = 0; }
          return;
        }
        if (L.intro === 'hover') {
          f.hidden = true;
          if (L.phaseT >= 0.45) { L.intro = 'foxdrop'; L.phaseT = 0; }
          return;
        }
        if (L.intro === 'foxdrop') {
          f.hidden = true;
          L.foxDropP = Math.min(1, L.phaseT / 0.5);
          if (L.foxDropP >= 1) { L.intro = 'run'; f.hidden = false; }
          return;
        }
      }

      /* ============ WIN SCENE ============ */
      if (!L.winScene) return;
      const sc = L.winScene;
      const elapsed = w.t - sc.phaseStartT;

      switch (sc.phase) {
        case 'walk': {
          // Fox walks right toward the plane door (left side of plane)
          w.fox.x += 100 * dt; w.fox.y = sc.foxGroundY; w.fox.phase += dt * 10;
          // Door is at planeScreenX - PLANE_S*0.9 (tail end, for boarding)
          const doorSX = sc.planeScreenX - PLANE_S * 0.88;
          if (w.fox.x - w.camX >= doorSX - 10) {
            w.fox.x = w.camX + doorSX - 10;
            sc.foxWorldX = w.fox.x;
            sc.phase = 'board'; sc.phaseStartT = w.t;
          }
          break;
        }
        case 'board': {
          const p = Math.min(1, elapsed / 0.8);
          w.fox.phase += dt * 8;
          if (p >= 0.5) w.fox.hidden = true;
          if (p >= 1) { sc.phase = 'taxi'; sc.phaseStartT = w.t; sc.takeoffVX = 60; }
          break;
        }
        case 'taxi': {
          sc.takeoffVX = Math.min(sc.takeoffVX + 200 * dt, 340);
          sc.planeScreenX += sc.takeoffVX * dt;
          if (elapsed >= 1.4) {
            sc.phase = 'liftoff'; sc.phaseStartT = w.t; sc.takeoffVY = 0;
          }
          break;
        }
        case 'liftoff': {
          sc.takeoffVX = Math.min(sc.takeoffVX + 60 * dt, 420);
          sc.planeScreenX += sc.takeoffVX * dt;
          sc.takeoffVY = Math.min(sc.takeoffVY + 110 * dt, 240);
          sc.planeY    -= sc.takeoffVY * dt;
          sc.gearFrac   = Math.max(0, sc.gearFrac - dt * 2.5);
          if (elapsed >= 1.8) { sc.phase = 'flyaway'; sc.phaseStartT = w.t; }
          break;
        }
        case 'flyaway': {
          sc.planeScreenX += 420 * dt;
          sc.planeY       -= 80 * dt;
          if (sc.planeScreenX > (L.cssW || 844) + 300) { sc.phase = 'done'; sc.phaseStartT = w.t; }
          break;
        }
        case 'done': {
          if (elapsed >= 0.3) { sc.proceed(); L.winScene = null; }
          break;
        }
      }
    },

    onRender(ctx, C, w) {
      const L = w.lax; if (!L) return;
      const cssW = ctx.canvas.width / (ctx.getTransform().a || 1);
      L.cssW = cssW;
      const baseY = w.baseY;

      /* ===== SCREEN-SPACE OVERLAY ===== */
      ctx.save();
      ctx.translate(w.camX, 0);

      // Helicopter — visible during intro, hidden once gameplay starts
      if (L.intro !== 'run' || false) {
        const showHeli = (L.intro === 'descend' || L.intro === 'hover' || L.intro === 'foxdrop');
        if (showHeli) {
          const drawHeli = window.LRDrawHeli;
          if (drawHeli) drawHeli(ctx, L.heliScreenX, L.heliY, 140, 1, w.t, true);
          // Fox dropping from heli
          if (L.intro === 'foxdrop') {
            const dropStartY = L.heliTargetY + 20;
            const fy = dropStartY + (baseY - w.fox.r - dropStartY) * L.foxDropP * L.foxDropP;
            LRFox.drawFoxCanvas(ctx, L.heliScreenX + 10, fy, w.fox.r, w.t * 16, C.ink, C.accent, L.foxDropP < 0.9);
          }
        }
      }

      // Airplane — drawn in screen space (tracks world position during gameplay)
      {
        const sc = L.winScene;
        const pSX = sc ? sc.planeScreenX : L.planeWorldX - w.camX;
        const pY  = sc ? sc.planeY       : L.planeSitY;
        const gF  = sc ? sc.gearFrac     : 1;
        const flying = sc && (sc.phase === 'liftoff' || sc.phase === 'flyaway');
        if ((!sc || sc.phase !== 'done') && pSX > -300 && pSX < cssW + 300) {
          drawPlane(ctx, pSX, pY, PLANE_S, 1, w.t, gF);
          // "Boarding" steps label before takeoff
          if (!sc && pSX > -50 && pSX < cssW + 100) {
            const pulse = 0.5 + 0.5 * Math.abs(Math.sin(w.t * 2.6));
            ctx.save(); ctx.globalAlpha = pulse;
            ctx.font = '700 13px Fredoka, Trebuchet MS, sans-serif';
            ctx.fillStyle = C.accent; ctx.textAlign = 'center';
            ctx.fillText('BOARD HERE', pSX - PLANE_S * 0.5, pY - PLANE_S * 0.48 - 14);
            ctx.restore();
          }
        }
      }

      ctx.restore();
    },
  });

})();

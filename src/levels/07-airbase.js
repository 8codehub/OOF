/* Level 7 — Air Base  (3 min: 200 × 180 = 36 000 px) */
(function () {

  /* ---- private helpers ---- */

  function playWinJingle() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      // Airy ascending arpeggio — C D E G B C
      [523, 587, 659, 784, 988, 1047].forEach((hz, i) => {
        const osc = ac.createOscillator();
        const g   = ac.createGain();
        osc.connect(g); g.connect(ac.destination);
        osc.type = 'sine'; osc.frequency.value = hz;
        const t0 = ac.currentTime + i * 0.10;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.22, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
        osc.start(t0); osc.stop(t0 + 0.6);
      });
    } catch(e) {}
  }

  function hex2rgb(h) {
    h = (h || '#000').trim();
    if (h[0] === '#') h = h.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function drawBeam(ctx, x, y, ang, L, alpha, acc) {
    const half = 0.10;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    const sx = Math.tan(half) * L;
    const g = ctx.createLinearGradient(0, 0, 0, -L);
    g.addColorStop(0, acc(alpha));
    g.addColorStop(1, acc(0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-sx, -L); ctx.lineTo(sx, -L); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawSearchlight(ctx, x, y, ang, acc, sc = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.fillStyle = '#3d5068';
    ctx.fillRect(-8, 4, 16, 5);
    ctx.fillRect(-12, 9, 24, 3);
    ctx.fillStyle = '#5a7080';
    ctx.beginPath(); ctx.arc(0, 2, 4, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(ang);
    ctx.fillStyle = '#4a6070';
    ctx.fillRect(-4, 0, 8, 14);
    ctx.fillStyle = '#6a8090';
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = acc(0.9);
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawPlane(ctx, p, sil) {
    const s = p.s, dir = p.v >= 0 ? 1 : -1;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(dir, 1);
    ctx.fillStyle = sil(0.72);
    ctx.beginPath(); ctx.ellipse(0, 0, s*0.5, s*0.12, 0, 0, 6.3); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s*0.06,0); ctx.lineTo(-s*0.08,-s*0.3); ctx.lineTo(s*0.02,-s*0.3);
    ctx.lineTo(s*0.16,0); ctx.lineTo(s*0.02,s*0.3);  ctx.lineTo(-s*0.08,s*0.3);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s*0.42,0); ctx.lineTo(-s*0.5,-s*0.14); ctx.lineTo(-s*0.36,0);
    ctx.lineTo(-s*0.5,s*0.14); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawHeli(ctx, h, sil, t) {
    const s = h.s, dir = h.v >= 0 ? 1 : -1;
    const yy = h.y + Math.sin(h.bob) * 1.8;
    ctx.save(); ctx.translate(h.x, yy); ctx.scale(dir, 1);
    ctx.fillStyle = sil(0.72);
    ctx.beginPath(); ctx.ellipse(0, 0, s*0.42, s*0.2, 0, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s*0.3, s*0.02, s*0.16, s*0.14, 0, 0, 6.3); ctx.fill();
    ctx.fillRect(-s*0.9, -s*0.05, s*0.5, s*0.07);
    ctx.beginPath();
    ctx.moveTo(-s*0.84,-s*0.03); ctx.lineTo(-s*0.92,-s*0.22);
    ctx.lineTo(-s*0.74,-s*0.03); ctx.closePath(); ctx.fill();
    ctx.fillRect(-s*0.28, s*0.22, s*0.58, s*0.03);
    ctx.fillRect(-s*0.02, -s*0.24, s*0.05, s*0.06);
    const rotorSpeed = (h.state === 'sit') ? 3 : 7;
    const rw = Math.abs(Math.cos(t * rotorSpeed + h.bob)) * s * 0.85 + s * 0.08;
    ctx.strokeStyle = sil(0.55); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-rw, -s*0.26); ctx.lineTo(rw, -s*0.26); ctx.stroke();
    ctx.restore();
  }

  function drawUFO(ctx, x, y, t, sil) {
    ctx.save();
    ctx.translate(x, y);
    // Tinted dome (larger)
    ctx.fillStyle = 'rgba(140,220,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, -11, 27, 21, 0, Math.PI, 0);
    ctx.fill();
    // Main disc (larger)
    ctx.fillStyle = sil(0.9);
    ctx.beginPath();
    ctx.ellipse(0, 0, 54, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    // Underside shading (larger)
    ctx.fillStyle = sil(0.45);
    ctx.beginPath();
    ctx.ellipse(0, 5, 45, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Spinning rim lights (more, larger)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + t * 1.8;
      const lx = Math.cos(a) * 38, ly = Math.sin(a) * 8.8;
      const pulse = 0.45 + 0.55 * Math.abs(Math.sin(t * 5 + i * 0.9));
      ctx.fillStyle = `rgba(80,230,160,${(pulse * 0.95).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(lx, ly, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /* Two specific background hangars used as helipad targets.
     Formulas match drawBackground exactly: para(f) = -(camX * f)
     Layer h1 (para 0.18):  hx = ((h1 + i*160) % W + W) % W - 10
     H building (para 0.085, 4× slower):  hx = ((hH + i*200 + 80) % W + W) % W - 10  */
  // Landing pad — slow parallax (para 0.085), hangar index 3, flat roof, hh=150
  // hw = 110+(3*23%50) = 129
  const PAD_DEFS = [
    { f: 0.085, i: 3, iStep: 200, iOff: 80, hw: 129, hh: 150 },
  ];

  function calcPad(def, camX, W, baseY) {
    const base = -(camX * def.f);
    const hx0  = ~~(((base + def.i * def.iStep + def.iOff) % W + W) % W) - 10;
    // hx0 is always in [-10, W-11] — the modulo already gives the right copy.
    return { x: hx0 + def.hw / 2, topY: baseY - def.hh };
  }

  /* ---- level ---- */
  (window.LRLevels = window.LRLevels || []).push({
    n: 7, name: 'Air Base', sub: 'Eyes on the sky', locked: false, stars: 0,
    theme: 'airbase', speed: 200, gaps: 13, spikes: 7, saws: 2, len: 7560,

    onBuild(w) {
      const rnd = (a, b) => a + Math.random() * (b - a);

      w.airbase = {
        t: 0, cssW: 844, cssH: 390,
        padScreens: PAD_DEFS.map(() => ({ x: 0, topY: 0 })),
        lastTakeoffTime: 0,
        landingTriggered: false,
        ufoScene: null,
        planes: Array.from({ length: 2 }, () => ({
          x: rnd(40, 800), y: rnd(34, 78),
          v: rnd(26, 40) * (Math.random() < .5 ? 1 : -1), s: rnd(17, 23),
        })),
        helis: Array.from({ length: 2 }, () => ({
          x: rnd(40, 800), y: rnd(60, 104),
          v: rnd(13, 22) * (Math.random() < .5 ? 1 : -1), s: rnd(15, 19),
          bob: Math.random() * 6.28,
          state: 'fly',
          padIdx: 0, riseY: 0, sitStartT: 0,
        })),
      };
    },

    // Called by game.js doWin — return true to take over the win sequence.
    onWin(w, proceed) {
      const A = w.airbase; if (!A) return false;
      const cssW = A.cssW || 844;
      playWinJingle();
      // UFO starts off the top-left corner and flies diagonally to hover above the fox.
      A.ufoScene = {
        phase: 'walk',
        phaseStartT: w.t,
        proceed,
        targetScreenX: cssW * 0.5,
        foxWorldX: w.fox.x,
        foxGroundY: w.baseY - w.fox.r,
        ufoScreenX: -70,   // off top-left
        ufoScreenY: -70,
        ufoDescentStartX: -70,
        ufoDescentStartY: -70,
        flyStartX: 0,
        flyStartY: 0,
        foxAbductStartY: 0,
      };
      return true;
    },

    onUpdate(w, dt) {
      const A = w.airbase; if (!A) return;
      A.t += dt;

      const W = A.cssW, baseY = w.baseY;
      for (let k = 0; k < PAD_DEFS.length; k++)
        A.padScreens[k] = calcPad(PAD_DEFS[k], w.camX, W, baseY);

      if (!A.landingTriggered && A.t - A.lastTakeoffTime >= 30) {
        const flying = A.helis.filter(h => h.state === 'fly');
        if (flying.length) {
          const h  = flying[~~(Math.random() * flying.length)];
          const ps = A.padScreens[0];
          h.padIdx = 0;
          h.state  = 'land';
          h.v      = Math.abs(h.v) * (ps.x >= h.x ? 1 : -1);
          A.landingTriggered = true;
        }
      }

      const margin = 90;
      for (const p of A.planes) {
        p.x += p.v * dt;
        if (p.x >  A.cssW + margin) { p.x = -margin;         p.y = 34 + Math.random()*44; }
        if (p.x < -margin)          { p.x =  A.cssW + margin; p.y = 34 + Math.random()*44; }
      }

      for (const h of A.helis) {
        const ps = A.padScreens[h.padIdx];

        switch (h.state) {
          case 'fly':
            h.x += h.v * dt; h.bob += dt * 2.4;
            if (h.x >  A.cssW + margin) { h.x = -margin;         h.y = 60 + Math.random()*44; }
            if (h.x < -margin)          { h.x =  A.cssW + margin; h.y = 60 + Math.random()*44; }
            break;

          case 'land': {
            const tx = ps.x, ty = ps.topY - h.s * 0.35;
            const dx = tx - h.x, dy = ty - h.y;
            h.v = Math.abs(h.v) * (dx >= 0 ? 1 : -1);
            h.x += dx * Math.min(1, dt * 5.0);
            h.y += dy * Math.min(1, dt * 1.2);
            h.bob *= (1 - dt * 5);
            if (Math.abs(dx) < 5 && Math.abs(dy) < 3) {
              h.x = tx; h.y = ty; h.bob = 0;
              h.state = 'sit'; h.sitStartT = A.t;
            }
            break;
          }

          case 'sit':
            h.x = ps.x;
            if (A.t - h.sitStartT >= 3) {
              h.riseY = 55 + Math.random() * 40;
              h.state = 'rise';
            }
            break;

          case 'rise':
            h.x  = ps.x;
            h.y -= 95 * dt;
            h.bob += dt * 2.0;
            if (h.y <= h.riseY) {
              h.y = h.riseY;
              h.state = 'fly';
              A.lastTakeoffTime = A.t;
              A.landingTriggered = false;
            }
            break;
        }
      }

      // ---- UFO win sequence (phase-driven) ----
      if (A.ufoScene) {
        const sc = A.ufoScene;
        const elapsed = w.t - sc.phaseStartT;

        switch (sc.phase) {

          case 'walk': {
            // Camera is frozen (fox.win=true). Move fox.x so it walks right on screen.
            w.fox.x += 110 * dt;
            w.fox.y  = sc.foxGroundY;
            w.fox.phase += dt * 10;
            const fsx = w.fox.x - w.camX;
            if (fsx >= sc.targetScreenX) {
              w.fox.x = w.camX + sc.targetScreenX;
              w.fox.y = sc.foxGroundY;
              sc.foxWorldX = w.fox.x;
              sc.phase = 'pause';
              sc.phaseStartT = w.t;
            }
            break;
          }

          case 'pause': {
            w.fox.x = sc.foxWorldX;
            w.fox.y = sc.foxGroundY;
            if (elapsed >= 0.5) {
              // Snap start coords for diagonal descent from top-left
              sc.ufoDescentStartX = sc.ufoScreenX;
              sc.ufoDescentStartY = sc.ufoScreenY;
              sc.phase = 'ufoDescend';
              sc.phaseStartT = w.t;
            }
            break;
          }

          case 'ufoDescend': {
            w.fox.x = sc.foxWorldX;
            w.fox.y = sc.foxGroundY;
            // Fly diagonally from top-left to hover point above the fox,
            // staying below the HUD (TARGET_Y ≥ ~100).
            const TARGET_X = sc.targetScreenX;
            const TARGET_Y = 140;
            const p = Math.min(1, elapsed / 2.0);
            const e = 1 - Math.pow(1 - p, 3); // cubic ease-out
            sc.ufoScreenX = sc.ufoDescentStartX + (TARGET_X - sc.ufoDescentStartX) * e;
            sc.ufoScreenY = sc.ufoDescentStartY + (TARGET_Y - sc.ufoDescentStartY) * e;
            if (p >= 1) {
              sc.ufoScreenX = TARGET_X;
              sc.ufoScreenY = TARGET_Y;
              sc.phase = 'hover';
              sc.phaseStartT = w.t;
            }
            break;
          }

          case 'hover': {
            w.fox.x = sc.foxWorldX;
            w.fox.y = sc.foxGroundY;
            sc.ufoScreenY = 140 + Math.sin(elapsed * 4.5) * 3;
            if (elapsed >= 1.2) {
              sc.foxAbductStartY = w.fox.y;
              sc.phase = 'abduct';
              sc.phaseStartT = w.t;
            }
            break;
          }

          case 'abduct': {
            const DUR = 1.8;
            const p = Math.min(1, elapsed / DUR);
            w.fox.x = sc.foxWorldX;
            w.fox.y = sc.foxAbductStartY + (sc.ufoScreenY + 30 - sc.foxAbductStartY) * p;
            w.fox.phase += dt * 12;
            if (p >= 0.72) w.fox.hidden = true;
            if (p >= 1) {
              sc.flyStartX = sc.ufoScreenX;
              sc.flyStartY = sc.ufoScreenY;
              sc.phase = 'flyaway';
              sc.phaseStartT = w.t;
            }
            break;
          }

          case 'flyaway': {
            const DUR = 2.0;
            const p  = Math.min(1, elapsed / DUR);
            const pp = p * p * p; // cubic ease-in — slow start then rockets away
            const cssW2 = A.cssW || 844;
            sc.ufoScreenX = sc.flyStartX + (cssW2 + 600 - sc.flyStartX) * pp;
            sc.ufoScreenY = sc.flyStartY - 550 * p * p;
            if (p >= 1) {
              sc.phase = 'done';
              sc.phaseStartT = w.t;
            }
            break;
          }

          case 'done': {
            if (elapsed >= 0.2) {
              sc.proceed();
              A.ufoScene = null;
            }
            break;
          }
        }
      }
    },

    onRender(ctx, C, w) {
      const A = w.airbase; if (!A) return;
      const m = ctx.getTransform();
      const dpr = m.a || 1;
      A.cssW = ctx.canvas.width / dpr;
      A.cssH = ctx.canvas.height / dpr;
      const baseY = w.baseY;

      const ac = hex2rgb(C.accent);
      const sil = a => `rgba(180,190,200,${a})`;
      const acc = a => `rgba(${ac[0]},${ac[1]},${ac[2]},${a})`;

      // ---- Screen-space: searchlights on H roof + helis + planes + UFO scene ----
      ctx.save();
      ctx.translate(w.camX, 0);

      // Roof searchlights on H building (two: left edge and right edge)
      const ps0 = A.padScreens[0];
      if (ps0.x > -100 && ps0.x < A.cssW + 100) {
        const rx = ps0.x, ry = ps0.topY;
        const beamL = ry * 0.92;
        const sc    = 0.52;
        const roofLights = [
          { ox: -55, phase: 0.0 },
          { ox:  55, phase: 1.8 },
        ];
        for (const rl of roofLights) {
          const ang = Math.sin(A.t * 0.65 + rl.phase) * 0.7;
          drawBeam(ctx, rx + rl.ox, ry, ang, beamL, 0.28, acc);
          drawSearchlight(ctx, rx + rl.ox, ry, ang, acc, sc);
        }
      }

      for (const h of A.helis)  drawHeli(ctx, h, sil, A.t);
      for (const p of A.planes) drawPlane(ctx, p, sil);

      // ---- UFO abduction scene (state driven by onUpdate) ----
      if (A.ufoScene) {
        const sc = A.ufoScene;
        const elapsed = w.t - sc.phaseStartT;

        // Tractor beam — shown during hover, abduct, and briefly in flyaway
        if (sc.phase === 'hover' || sc.phase === 'abduct' || sc.phase === 'flyaway') {
          let beamAlpha;
          if (sc.phase === 'hover') {
            beamAlpha = Math.min(0.38, elapsed / 1.2 * 0.38);
          } else if (sc.phase === 'abduct') {
            beamAlpha = 0.38 + Math.min(0.24, elapsed / 1.8 * 0.24);
          } else {
            beamAlpha = Math.max(0, 0.62 - elapsed / 0.4 * 0.62);
          }

          if (beamAlpha > 0.01) {
            const bx = sc.ufoScreenX;
            const by = sc.ufoScreenY + 12;
            // beam bottom tracks fox until it vanishes, then collapses under UFO
            const bBottom = w.fox.hidden ? sc.ufoScreenY + 44 : w.fox.y;
            const wProg   = sc.phase === 'hover' ? Math.min(1, elapsed / 0.6) : 1;
            const bHalfW  = wProg * 32;
            const bGrad   = ctx.createLinearGradient(0, by, 0, bBottom);
            bGrad.addColorStop(0, `rgba(80,255,160,${beamAlpha.toFixed(2)})`);
            bGrad.addColorStop(1, `rgba(80,255,160,0)`);
            ctx.fillStyle = bGrad;
            ctx.beginPath();
            ctx.moveTo(bx - bHalfW * 0.5, by);
            ctx.lineTo(bx + bHalfW * 0.5, by);
            ctx.lineTo(bx + bHalfW, bBottom);
            ctx.lineTo(bx - bHalfW, bBottom);
            ctx.closePath();
            ctx.fill();
          }
        }

        // UFO is off-screen (y=-130) during walk/pause — draw it anyway, canvas clips it
        drawUFO(ctx, sc.ufoScreenX, sc.ufoScreenY, w.t, sil);
      }

      ctx.restore();
    },
  });

})();

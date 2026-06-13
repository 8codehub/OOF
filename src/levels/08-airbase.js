/* Level 7 — Air Base  (3 min: 200 × 180 = 36 000 px) */
(function () {

  /* ---- private helpers ---- */
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
    // No wrap-copy detection needed; it caused the wrong copy to be picked when
    // the building was entering from the right (hx0 near W).
    return { x: hx0 + def.hw / 2, topY: baseY - def.hh };
  }

  /* ---- level ---- */
  (window.LRLevels = window.LRLevels || []).push({
    n: 7, name: 'Air Base', sub: 'Eyes on the sky', locked: false, stars: 0,
    theme: 'airbase', speed: 200, gaps: 60, spikes: 32, saws: 9, len: 36000,

    onBuild(w) {
      const rnd = (a, b) => a + Math.random() * (b - a);

      w.airbase = {
        t: 0, cssW: 844, cssH: 390,
        // padScreens computed each frame in onUpdate
        padScreens: PAD_DEFS.map(() => ({ x: 0, topY: 0 })),
        lastTakeoffTime: -30,  // allow landing on first approach
        landingTriggered: false,
        planes: Array.from({ length: 2 }, () => ({
          x: rnd(40, 800), y: rnd(34, 78),
          v: rnd(26, 40) * (Math.random() < .5 ? 1 : -1), s: rnd(17, 23),
        })),
        helis: Array.from({ length: 2 }, () => ({
          x: rnd(40, 800), y: rnd(60, 104),
          v: rnd(13, 22) * (Math.random() < .5 ? 1 : -1), s: rnd(15, 19),
          bob: Math.random() * 6.28,
          state: 'fly',   // fly | land | sit | rise
          padIdx: 0, riseY: 0, sitStartT: 0,
        })),
      };
    },

    onUpdate(w, dt) {
      const A = w.airbase; if (!A) return;
      A.t += dt;

      // Refresh live screen positions of the background landing pads
      const W = A.cssW, baseY = w.baseY;
      for (let k = 0; k < PAD_DEFS.length; k++)
        A.padScreens[k] = calcPad(PAD_DEFS[k], w.camX, W, baseY);

      // hScreenX: screen-space X of the H building center
      const hScreenX = A.padScreens[0].x;

      // Trigger landing when H is at 80–90% of screen and 30s since last takeoff
      if (!A.landingTriggered &&
          hScreenX >= W * 0.8 && hScreenX <= W * 0.9 &&
          A.t - A.lastTakeoffTime >= 30) {
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
      // Reset landing gate once H has fully scrolled off-screen to the left
      if (hScreenX < -70) A.landingTriggered = false;

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
            h.x += dx * Math.min(1, dt * 1.8);
            h.y += dy * Math.min(1, dt * 1.2);
            h.bob *= (1 - dt * 5);
            if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
              h.x = tx; h.y = ty; h.bob = 0;
              h.state = 'sit'; h.sitStartT = A.t;
            }
            break;
          }

          case 'sit':
            h.x = ps.x;  // track building as parallax shifts
            if (A.t - h.sitStartT >= 3) {
              h.riseY = 55 + Math.random() * 40;
              h.state = 'rise';
            }
            break;

          case 'rise':
            h.x  = ps.x;  // stay above building horizontally while climbing
            h.y -= 95 * dt;
            h.bob += dt * 2.0;
            if (h.y <= h.riseY) {
              h.y = h.riseY;
              h.state = 'fly';
              A.lastTakeoffTime = A.t;
            }
            break;
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

      // ---- Screen-space: roof searchlights + helis + planes ----
      ctx.save();
      ctx.translate(w.camX, 0);

      // Three small searchlights on the H building roof guiding the helicopter:
      // two on the left side, one on the right side.
      const ps0 = A.padScreens[0];
      if (ps0.x > -100 && ps0.x < A.cssW + 100) {
        const rx = ps0.x, ry = ps0.topY;
        const beamL = ry * 0.92;   // almost reaches top of sky
        const sc    = 0.52;        // smaller than ground lamps

        const roofLights = [
          { ox: -55, phase: 0.0 },  // top-left edge
          { ox:  55, phase: 1.8 },  // top-right edge
        ];
        for (const rl of roofLights) {
          const ang = Math.sin(A.t * 0.65 + rl.phase) * 0.7;
          drawBeam(ctx, rx + rl.ox, ry, ang, beamL, 0.28, acc);
          drawSearchlight(ctx, rx + rl.ox, ry, ang, acc, sc);
        }
      }

      for (const h of A.helis)  drawHeli(ctx, h, sil, A.t);
      for (const p of A.planes) drawPlane(ctx, p, sil);

      ctx.restore();
    },
  });

})();

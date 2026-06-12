/* Level 7 — Air Base  (3 min: 200 × 180 = 36 000 px)
   Gameplay stats from current build; planes / helicopters / searchlights
   from src/claude-design/07-airbase.js — all wrapped in an IIFE so the
   helpers stay private and don't collide with other levels. */
(function () {

  /* ---- decor helpers (private to this level) ---- */
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

  function drawSearchlight(ctx, x, y, ang, acc) {
    ctx.save();
    ctx.translate(x, y);

    // Fixed base — sits at ground level (below pivot)
    ctx.fillStyle = '#3d5068';
    ctx.fillRect(-8, 4, 16, 5);   // pedestal
    ctx.fillRect(-12, 9, 24, 3);  // wide foot
    // Pivot yoke
    ctx.fillStyle = '#5a7080';
    ctx.beginPath(); ctx.arc(0, 2, 4, 0, Math.PI * 2); ctx.fill();

    // Rotating barrel — lens sits AT beam origin (y=0), barrel goes downward
    ctx.rotate(ang);
    ctx.fillStyle = '#4a6070';
    ctx.fillRect(-4, 0, 8, 14);   // barrel housing pointing down
    // Reflector dish around the lens
    ctx.fillStyle = '#6a8090';
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Glowing lens
    ctx.fillStyle = acc(0.9);
    ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  function drawPlane(ctx, p, sil) {
    const s = p.s, dir = p.v >= 0 ? 1 : -1;
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(dir, 1);
    ctx.fillStyle = sil(0.72);
    // fuselage
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.12, 0, 0, 6.3); ctx.fill();
    // swept wings
    ctx.beginPath();
    ctx.moveTo(s * 0.06, 0); ctx.lineTo(-s * 0.08, -s * 0.3); ctx.lineTo(s * 0.02, -s * 0.3);
    ctx.lineTo(s * 0.16, 0); ctx.lineTo(s * 0.02, s * 0.3); ctx.lineTo(-s * 0.08, s * 0.3);
    ctx.closePath(); ctx.fill();
    // tail
    ctx.beginPath();
    ctx.moveTo(-s * 0.42, 0); ctx.lineTo(-s * 0.5, -s * 0.14); ctx.lineTo(-s * 0.36, 0);
    ctx.lineTo(-s * 0.5, s * 0.14); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawHeli(ctx, h, sil, t) {
    const s = h.s, dir = h.v >= 0 ? 1 : -1;
    const yy = h.y + Math.sin(h.bob) * 1.8;
    ctx.save(); ctx.translate(h.x, yy); ctx.scale(dir, 1);
    ctx.fillStyle = sil(0.72);
    // body + nose
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.42, s * 0.2, 0, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.3, s * 0.02, s * 0.16, s * 0.14, 0, 0, 6.3); ctx.fill();
    // tail boom + fin
    ctx.fillRect(-s * 0.9, -s * 0.05, s * 0.5, s * 0.07);
    ctx.beginPath();
    ctx.moveTo(-s * 0.84, -s * 0.03); ctx.lineTo(-s * 0.92, -s * 0.22);
    ctx.lineTo(-s * 0.74, -s * 0.03); ctx.closePath(); ctx.fill();
    // skid + mast
    ctx.fillRect(-s * 0.28, s * 0.22, s * 0.58, s * 0.03);
    ctx.fillRect(-s * 0.02, -s * 0.24, s * 0.05, s * 0.06);
    // spinning main rotor (edge-on disc — half-length pulses with time)
    const rw = Math.abs(Math.cos(t * 7 + h.bob)) * s * 0.85 + s * 0.08;
    ctx.strokeStyle = sil(0.55); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-rw, -s * 0.26); ctx.lineTo(rw, -s * 0.26); ctx.stroke();
    ctx.restore();
  }

  /* ---- level registration ---- */
  (window.LRLevels = window.LRLevels || []).push({
    n: 7, name: 'Air Base', sub: 'Eyes on the sky', locked: false, stars: 0,
    theme: 'airbase', speed: 200, gaps: 60, spikes: 32, saws: 9, len: 36000,

    onBuild(w) {
      const rnd = (a, b) => a + Math.random() * (b - a);

      // Find a clear ground spot near targetX — not in a gap, not near spikes/saws
      function clearSpot(targetX) {
        const buf = 90;
        const ok = (x) => {
          if (!w.segs.some(s => x > s[0] + buf && x < s[1] - buf)) return false;
          if (w.spikes && w.spikes.some(sp => Math.abs(sp.x - x) < buf)) return false;
          if (w.saws   && w.saws.some(sw => Math.abs(sw.x - x) < buf))   return false;
          return true;
        };
        for (let d = 0; d <= 300; d += 15) {
          if (d === 0 && ok(targetX)) return targetX;
          if (d > 0) {
            if (ok(targetX + d)) return targetX + d;
            if (ok(targetX - d)) return targetX - d;
          }
        }
        return null;
      }

      // Place one lamp every ~900px, skip if no clear ground found
      const lamps = [];
      for (let x = 600; x < w.L.len - 300; x += 900) {
        const spot = clearSpot(x + rnd(-80, 80));
        if (spot !== null) lamps.push({ x: spot, idx: lamps.length });
      }

      w.airbase = {
        t: 0,
        cssW: 844, cssH: 390,
        lamps,
        planes: Array.from({ length: 2 }, () => ({
          x: rnd(40, 800), y: rnd(34, 78),
          v: rnd(26, 40) * (Math.random() < .5 ? 1 : -1), s: rnd(17, 23),
        })),
        helis: Array.from({ length: 2 }, () => ({
          x: rnd(40, 800), y: rnd(60, 104),
          v: rnd(13, 22) * (Math.random() < .5 ? 1 : -1), s: rnd(15, 19),
          bob: Math.random() * 6.28,
        })),
      };
    },

    onUpdate(w, dt) {
      const A = w.airbase; if (!A) return;
      A.t += dt;
      const margin = 90;
      for (const p of A.planes) {
        p.x += p.v * dt;
        if (p.x >  A.cssW + margin) { p.x = -margin;       p.y = 34 + Math.random() * 44; }
        if (p.x < -margin)          { p.x =  A.cssW + margin; p.y = 34 + Math.random() * 44; }
      }
      for (const h of A.helis) {
        h.x += h.v * dt; h.bob += dt * 2.4;
        if (h.x >  A.cssW + margin) { h.x = -margin;       h.y = 60 + Math.random() * 44; }
        if (h.x < -margin)          { h.x =  A.cssW + margin; h.y = 60 + Math.random() * 44; }
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
      // On the dark night sky, use a light grey for silhouettes instead of ink
      const sil = a => `rgba(180,190,200,${a})`;
      const acc = a => `rgba(${ac[0]},${ac[1]},${ac[2]},${a})`;

      // ---- World-space: searchlight lamps (fixed to ground, scroll with terrain) ----
      // onRender is called inside ctx.translate(-camX, 0), so world coords work directly
      for (const lp of A.lamps) {
        if (lp.x < w.camX - 80 || lp.x > w.camX + A.cssW + 80) continue;
        const ang = Math.sin(A.t * 0.55 + lp.idx * 1.7) * 0.75;
        drawBeam(ctx, lp.x, baseY, ang, baseY * 0.82, 0.22, acc);
        drawSearchlight(ctx, lp.x, baseY, ang, acc);
      }

      // ---- Screen-space: planes and helicopters (float independently) ----
      ctx.save();
      ctx.translate(w.camX, 0);   // cancel world camera → screen space
      for (const h of A.helis) drawHeli(ctx, h, sil, A.t);
      for (const p of A.planes) drawPlane(ctx, p, sil);
      ctx.restore();
    },
  });

})();

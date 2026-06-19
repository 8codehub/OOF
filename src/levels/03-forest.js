/* Level 3 — Sahara / Pyramids */
(function () {

  /* ---- helpers (same as other levels) ---- */
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
    const tx2 = Math.max(bx + 14, Math.min(bx + bw - 14, anchorX));
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    rrect(ctx, bx + 2, by + 3, bw, bh, r); ctx.fill();
    ctx.fillStyle = surface;
    rrect(ctx, bx, by, bw, bh, r); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tx2 - 7, by + bh - 1); ctx.lineTo(anchorX, anchorY); ctx.lineTo(tx2 + 7, by + bh - 1);
    ctx.closePath(); ctx.fillStyle = surface; ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    rrect(ctx, bx, by, bw, bh, r); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx2 - 7, by + bh - 1); ctx.lineTo(anchorX, anchorY); ctx.lineTo(tx2 + 7, by + bh - 1);
    ctx.stroke();
    ctx.fillStyle = ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, bx + padX, by + bh * 0.64);
    ctx.restore();
  }

  // Cartoon Sphinx — friendly face, blue/gold nemes headdress, golden lion body.
  // Head/face on the LEFT, lion body reclining to the RIGHT with curling tail.
  // Drawn relative to (bx, baseY); footprint ~ x[-48..245], y[-184..6].
  function drawSphinx(ctx, bx, baseY) {
    const bodyL = '#ecba66', bodyM = '#dd9e44', bodyD = '#c5852f';
    const ink   = '#6e4a24';
    const skin  = '#f0c486', skinSh = '#dca85f';
    const blue  = '#2f73b8', gold = '#f3c63f', goldD = '#cf9f24';
    const white = '#fff8ec';
    ctx.save();
    ctx.translate(bx, baseY);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // Striped fill: clip to a path, lay gold base + blue vertical bars, then outline.
    const striped = (pathFn, x0, x1, y0, y1) => {
      ctx.save();
      ctx.beginPath(); pathFn(); ctx.clip();
      ctx.fillStyle = gold; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.fillStyle = blue;
      for (let x = x0; x < x1; x += 18) ctx.fillRect(x, y0, 9, y1 - y0);
      ctx.restore();
      ctx.beginPath(); pathFn(); ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke();
    };

    // ── CAST SHADOW ───────────────────────────────────────────
    ctx.fillStyle = 'rgba(90,60,25,0.16)';
    ctx.beginPath(); ctx.ellipse(95, 2, 150, 12, 0, 0, Math.PI * 2); ctx.fill();

    // ── TAIL (behind body, curling at the rear-right) ─────────
    ctx.fillStyle = bodyM;
    ctx.beginPath();
    ctx.moveTo(214, -54);
    ctx.bezierCurveTo(250, -50, 256, -18, 232, -4);
    ctx.bezierCurveTo(222, 2, 214, -4, 220, -14);
    ctx.bezierCurveTo(236, -22, 236, -42, 208, -44);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.stroke();
    // tail tuft
    ctx.fillStyle = bodyD;
    ctx.beginPath(); ctx.ellipse(228, -6, 11, 9, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

    // ── LION BODY ─────────────────────────────────────────────
    const body = () => {
      ctx.moveTo(66, -16);
      ctx.bezierCurveTo(70, -78, 92, -100, 128, -103);
      ctx.bezierCurveTo(168, -106, 206, -96, 226, -62);
      ctx.bezierCurveTo(240, -40, 240, -14, 232, 0);
      ctx.lineTo(66, 0);
      ctx.closePath();
    };
    ctx.fillStyle = bodyM; ctx.beginPath(); body(); ctx.fill();
    // back highlight
    ctx.fillStyle = bodyL;
    ctx.beginPath();
    ctx.moveTo(96, -96);
    ctx.bezierCurveTo(140, -106, 190, -96, 214, -70);
    ctx.bezierCurveTo(190, -88, 146, -94, 110, -90);
    ctx.closePath(); ctx.fill();
    // belly shadow
    ctx.fillStyle = bodyD;
    ctx.beginPath();
    ctx.moveTo(66, 0); ctx.lineTo(232, 0);
    ctx.bezierCurveTo(232, -12, 150, -14, 66, -10);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); body(); ctx.stroke();
    // folded hind-leg contour
    ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(196, -56); ctx.bezierCurveTo(206, -36, 200, -14, 196, 0);
    ctx.stroke();

    // ── FRONT PAWS (stretched forward to the left) ────────────
    // far paw (upper, behind)
    ctx.fillStyle = bodyM;
    const farPaw = () => {
      ctx.moveTo(80, -30);
      ctx.lineTo(-8, -14);
      ctx.quadraticCurveTo(-22, -12, -22, -2);
      ctx.lineTo(80, -2);
      ctx.closePath();
    };
    ctx.beginPath(); farPaw(); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); farPaw(); ctx.stroke();
    // near paw (lower, in front)
    ctx.fillStyle = bodyL;
    const nearPaw = () => {
      ctx.moveTo(82, -22);
      ctx.lineTo(-34, -6);
      ctx.quadraticCurveTo(-50, -4, -50, 6);
      ctx.lineTo(82, 6);
      ctx.closePath();
    };
    ctx.beginPath(); nearPaw(); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); nearPaw(); ctx.stroke();
    // toe grooves on the near paw
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const tx = -42 + i * 11;
      ctx.beginPath(); ctx.moveTo(tx, -2); ctx.lineTo(tx - 1, 6); ctx.stroke();
    }

    // ── HEADDRESS DOME (striped, behind the face) ─────────────
    const dome = () => {
      ctx.moveTo(54, -182);
      ctx.bezierCurveTo(8, -180, 2, -150, 6, -118);
      ctx.lineTo(14, -88);
      ctx.lineTo(96, -88);
      ctx.lineTo(104, -118);
      ctx.bezierCurveTo(108, -150, 100, -180, 54, -182);
      ctx.closePath();
    };
    striped(dome, 4, 106, -182, -88);

    // ── FACE (skin) ───────────────────────────────────────────
    const face = () => {
      ctx.moveTo(26, -132);
      ctx.bezierCurveTo(26, -158, 82, -158, 82, -132);
      ctx.bezierCurveTo(85, -110, 74, -84, 54, -80);
      ctx.bezierCurveTo(34, -84, 23, -110, 26, -132);
      ctx.closePath();
    };
    ctx.fillStyle = skin; ctx.beginPath(); face(); ctx.fill();
    // soft cheek shading (right side)
    ctx.fillStyle = skinSh;
    ctx.beginPath(); ctx.ellipse(74, -104, 9, 16, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); face(); ctx.stroke();

    // ── HEADBAND across the forehead (gold) ───────────────────
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(24, -128);
    ctx.lineTo(26, -150);
    ctx.lineTo(82, -150);
    ctx.lineTo(84, -128);
    ctx.quadraticCurveTo(54, -119, 24, -128);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = goldD; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(28, -134); ctx.quadraticCurveTo(54, -126, 80, -134); ctx.stroke();

    // ── SIDE LAPPETS (striped flaps framing the face) ─────────
    const lapL = () => {
      ctx.moveTo(26, -134);
      ctx.lineTo(6, -130);
      ctx.lineTo(10, -62);
      ctx.quadraticCurveTo(11, -52, 24, -52);
      ctx.lineTo(38, -54);
      ctx.lineTo(36, -116);
      ctx.closePath();
    };
    striped(lapL, 6, 40, -134, -52);
    const lapR = () => {
      ctx.moveTo(82, -134);
      ctx.lineTo(102, -130);
      ctx.lineTo(98, -62);
      ctx.quadraticCurveTo(97, -52, 84, -52);
      ctx.lineTo(70, -54);
      ctx.lineTo(72, -116);
      ctx.closePath();
    };
    striped(lapR, 68, 102, -134, -52);

    // ── BEARD (braided, hanging from the chin) ────────────────
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(46, -80); ctx.lineTo(62, -80);
    ctx.lineTo(60, -42);
    ctx.quadraticCurveTo(54, -36, 48, -42);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = goldD; ctx.lineWidth = 1.8;
    for (let i = 0; i < 4; i++) {
      const by = -74 + i * 8;
      ctx.beginPath(); ctx.moveTo(48, by); ctx.lineTo(60, by); ctx.stroke();
    }

    // ── URAEUS (cobra on the headband) ────────────────────────
    ctx.fillStyle = goldD;
    ctx.beginPath();
    ctx.moveTo(49, -138);
    ctx.quadraticCurveTo(46, -150, 54, -156);
    ctx.quadraticCurveTo(62, -150, 59, -138);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = gold;
    ctx.beginPath(); ctx.arc(54, -156, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(52.5, -157, 1, 0, Math.PI * 2);
    ctx.arc(55.5, -157, 1, 0, Math.PI * 2); ctx.fill();

    // ── FACIAL FEATURES ───────────────────────────────────────
    // eyebrows
    ctx.strokeStyle = ink; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(33, -125); ctx.quadraticCurveTo(40, -130, 48, -125); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(60, -125); ctx.quadraticCurveTo(68, -130, 75, -125); ctx.stroke();
    // eyes
    ctx.fillStyle = white;
    ctx.beginPath(); ctx.ellipse(41, -116, 6, 7.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(67, -116, 6, 7.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3a2410';
    ctx.beginPath(); ctx.arc(42, -115, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(68, -115, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = white;
    ctx.beginPath(); ctx.arc(43.4, -116.4, 1.1, 0, Math.PI * 2);
    ctx.arc(69.4, -116.4, 1.1, 0, Math.PI * 2); ctx.fill();
    // nose
    ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(54, -114); ctx.lineTo(49, -100);
    ctx.quadraticCurveTo(54, -96, 59, -100);
    ctx.stroke();
    // friendly smile
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(44, -92); ctx.quadraticCurveTo(54, -83, 64, -92); ctx.stroke();
    // cheek blush
    ctx.fillStyle = 'rgba(225,120,80,0.16)';
    ctx.beginPath(); ctx.arc(37, -100, 5, 0, Math.PI * 2);
    ctx.arc(71, -100, 5, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }
  window.LRDrawSphinx = drawSphinx;

  // Ship in the sea at (sx = left edge of hull, sy = deck level)
  function drawShip(ctx, sx, sy, t, baseY) {
    const hw = 300, hd = 70;

    // Sea wave line before ship (port side)
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const wavePh = t * 1.8;
    ctx.beginPath();
    for (let i = 0; i < 60; i++) {
      const wx = sx - 10 - i * 4;
      const wy = sy + 6 + Math.sin(wavePh + i * 0.4) * 3;
      if (i === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
    }
    ctx.stroke();

    // Hull
    ctx.fillStyle = '#2a3a5a';
    ctx.beginPath();
    ctx.moveTo(sx - 18, sy);           // bow flare (left)
    ctx.lineTo(sx + hw, sy);           // deck-line to stern
    ctx.lineTo(sx + hw - 16, sy + hd); // stern bottom
    ctx.lineTo(sx + 16, sy + hd);      // keel
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a2a48'; ctx.lineWidth = 2; ctx.stroke();
    // Hull waterline stripe
    ctx.fillStyle = '#c03020';
    ctx.beginPath();
    ctx.moveTo(sx - 14, sy + 8);
    ctx.lineTo(sx + hw, sy + 8);
    ctx.lineTo(sx + hw - 4, sy + 14);
    ctx.lineTo(sx - 10, sy + 14);
    ctx.closePath(); ctx.fill();
    // Portholes
    ctx.fillStyle = '#90a0b8';
    for (let i = 0; i < 5; i++) {
      const px = sx + 36 + i * 50;
      ctx.beginPath(); ctx.arc(px, sy + 34, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#607088'; ctx.lineWidth = 2; ctx.stroke();
      // Rim glint
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(px - 3, sy + 30, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#90a0b8';
    }

    // Deck surface
    ctx.fillStyle = '#c8c0a8';
    ctx.fillRect(sx - 18, sy - 10, hw + 18, 12);
    ctx.strokeStyle = '#a8a088'; ctx.lineWidth = 1.5;
    ctx.strokeRect(sx - 18, sy - 10, hw + 18, 12);
    // Deck planks
    ctx.strokeStyle = '#a8a088'; ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const px = sx + 20 + i * 44;
      ctx.beginPath(); ctx.moveTo(px, sy - 10); ctx.lineTo(px, sy); ctx.stroke();
    }

    // Railing
    ctx.strokeStyle = '#8898a8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx - 18, sy - 24); ctx.lineTo(sx + hw, sy - 24); ctx.stroke();
    for (let i = 0; i <= 10; i++) {
      const rx = sx - 18 + i * ((hw + 18) / 10);
      ctx.beginPath(); ctx.moveTo(rx, sy - 10); ctx.lineTo(rx, sy - 24); ctx.stroke();
    }

    // Superstructure / bridge
    const bridgeX = sx + hw * 0.55, bridgeW = 120, bridgeH = 58;
    rrect(ctx, bridgeX, sy - 10 - bridgeH, bridgeW, bridgeH, 5);
    ctx.fillStyle = '#e8e0d0'; ctx.fill();
    ctx.strokeStyle = '#c0b8a8'; ctx.lineWidth = 1.5; ctx.stroke();
    // Bridge windows
    ctx.fillStyle = '#6ab0d8';
    for (let i = 0; i < 4; i++) {
      const wx = bridgeX + 10 + i * 26;
      rrect(ctx, wx, sy - 10 - bridgeH + 16, 18, 22, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(wx + 2, sy - 10 - bridgeH + 18, 6, 8);
      ctx.fillStyle = '#6ab0d8';
    }
    // Second level
    rrect(ctx, bridgeX + 12, sy - 10 - bridgeH - 30, bridgeW - 24, 32, 4);
    ctx.fillStyle = '#f0e8d8'; ctx.fill();
    ctx.strokeStyle = '#c0b8a8'; ctx.lineWidth = 1.5; ctx.stroke();
    // Small windows on second level
    ctx.fillStyle = '#6ab0d8';
    for (let i = 0; i < 3; i++) {
      const wx = bridgeX + 22 + i * 30;
      rrect(ctx, wx, sy - 10 - bridgeH - 18, 16, 14, 2);
      ctx.fill();
    }

    // Funnel / smokestack
    const funnelX = bridgeX + bridgeW * 0.5 - 14;
    const funnelTop = sy - 10 - bridgeH - 62;
    ctx.fillStyle = '#c03828';
    ctx.fillRect(funnelX, funnelTop, 28, 64);
    ctx.fillStyle = '#a02818';
    ctx.fillRect(funnelX - 4, funnelTop - 8, 36, 10);
    // Black band on funnel
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(funnelX, funnelTop + 10, 28, 8);
    // Smoke
    const smT = t * 0.9;
    for (let i = 0; i < 4; i++) {
      const sp = ((smT + i * 0.25) % 1);
      const smX = funnelX + 14 + Math.sin(sp * 10) * 10;
      const smY = funnelTop - sp * 60;
      ctx.fillStyle = `rgba(180,180,180,${0.38 * (1 - sp)})`;
      ctx.beginPath();
      ctx.arc(smX, smY, 6 + sp * 14, 0, Math.PI * 2); ctx.fill();
    }

    // Forward cargo crane / mast
    ctx.strokeStyle = '#9098a8'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sx + hw * 0.22, sy - 10);
    ctx.lineTo(sx + hw * 0.22, sy - 10 - 80);
    ctx.stroke();
    ctx.strokeStyle = '#9098a8'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + hw * 0.22, sy - 10 - 80);
    ctx.lineTo(sx + hw * 0.22 + 50, sy - 10 - 60);
    ctx.stroke();

    // Gangway (from shore to ship left side, angled)
    const gangwayX0 = sx - 60, gangwayY0 = baseY;
    const gangwayX1 = sx - 4, gangwayY1 = sy - 4;
    ctx.strokeStyle = '#a08858'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(gangwayX0, gangwayY0); ctx.lineTo(gangwayX1, gangwayY1); ctx.stroke();
    ctx.strokeStyle = '#c0a870'; ctx.lineWidth = 2;
    // Railings on gangway
    const gDX = gangwayX1 - gangwayX0, gDY = gangwayY1 - gangwayY0, gLen = Math.hypot(gDX, gDY);
    const gNX = -gDY / gLen * 12, gNY = gDX / gLen * 12;
    ctx.beginPath();
    ctx.moveTo(gangwayX0 + gNX, gangwayY0 + gNY);
    ctx.lineTo(gangwayX1 + gNX, gangwayY1 + gNY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(gangwayX0 - gNX, gangwayY0 - gNY);
    ctx.lineTo(gangwayX1 - gNX, gangwayY1 - gNY);
    ctx.stroke();
  }

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

  const PLANE_S      = 100;
  const PLANE_GEAR_H = PLANE_S * 0.532;  // (axle 0.52 + wheel-r 0.085) * 0.88 vert-scale
  const INTRO_CAMOFF = 260;   // wider view so the arriving plane is visible
  const RUN_CAMOFF   = 116;

  (window.LRLevels = window.LRLevels || []).push({
    n: 3, name: 'Sahara', sub: 'Pyramids & Sea', locked: false, stars: 2,
    theme: 'sahara', speed: 162, gaps: 14, spikes: 9, saws: 3, len: 8500,

    onBuild(w) {
      w.fox.hidden = true;
      w.camOffset = INTRO_CAMOFF;

      // Sphinx positioned ~38% into the level
      const sphinxWorldX = w.startX + w.L.len * 0.38;
      // Ship at sea (beyond finish flag)
      const shipLeft  = w.worldEnd + 120;
      const shipDeckY = w.baseY - 8;   // deck slightly above ground = visually on sea surface
      const seaStartX = w.worldEnd + 60;

      // Plane starts in screen space during intro (dir=1, nose right, approaching from left)
      // After intro it is left behind; we don't track it further.
      w.sah = {
        cssW: 844,
        // Intro phases: 'approach' → 'land' → 'park' → 'foxwalk' → 'run'
        intro: 'approach',
        phaseT: 0,
        // Plane screen-space position (camera frozen during intro)
        planeScreenX: -200,     // starts off-screen left
        planeY: w.baseY - 200,  // starts in the air
        gearFrac: 0,
        planeGroundY: w.baseY - PLANE_GEAR_H,
        planeWorldX: null,   // set when intro ends; plane stays in world-space until off-screen
        foxWalkP: 0,
        // Sphinx story beat
        sphinxWorldX,
        sphinxSeen: false,
        sphinxBubbleT: -1,   // -1 = not yet triggered
        // Sea + ship
        seaStartX,
        shipLeft,
        shipDeckY,
        winScene: null,
      };
    },

    onWin(w, proceed) {
      const S = w.sah; if (!S) return false;
      playJingle();
      // Fox needs to board the ship
      const boardWorldX = S.shipLeft + 10;
      S.winScene = {
        phase: 'walk', phaseStartT: w.t, proceed,
        boardWorldX,
        foxGroundY: w.baseY - w.fox.r,
        foxWorldX: w.fox.x,
        // Ship screen position (starts fixed, then animates during sailaway)
        shipScreenX: S.shipLeft - w.camX,
        shipScreenY: S.shipDeckY,
        shipVX: 0,
      };
      return true;
    },

    onUpdate(w, dt) {
      const S = w.sah; if (!S) return;
      const f = w.fox;

      /* ============ INTRO ============ */
      if (S.intro !== 'run') {
        S.phaseT += dt;
        f.x = w.startX; f.y = w.baseY - f.r; f.vy = 0; f.air = false;
        f.hidden = true;
        if (w.drawing !== null) { w.drawing = null; w.strokes = []; }

        if (S.intro === 'approach') {
          // Plane flies in from left (planeScreenX -200 → 160), descends
          const p = Math.min(1, S.phaseT / 2.4);
          const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p; // ease in-out
          S.planeScreenX = -200 + ease * 360;
          S.planeY = (w.baseY - 200) + ease * (S.planeGroundY - (w.baseY - 200));
          // Gear deploys in the second half
          S.gearFrac = p < 0.5 ? 0 : (p - 0.5) * 2;
          if (p >= 1) { S.intro = 'land'; S.phaseT = 0; S.planeScreenX = 160; S.planeY = S.planeGroundY; S.gearFrac = 1; }
          return;
        }
        if (S.intro === 'land') {
          // Brief deceleration bounce on ground
          const bounce = Math.max(0, Math.sin(S.phaseT * 14) * (1 - S.phaseT / 0.6) * 6);
          S.planeY = S.planeGroundY - bounce;
          if (S.phaseT >= 0.7) { S.intro = 'park'; S.phaseT = 0; S.planeY = S.planeGroundY; }
          return;
        }
        if (S.intro === 'park') {
          if (S.phaseT >= 0.5) { S.intro = 'foxwalk'; S.phaseT = 0; }
          return;
        }
        if (S.intro === 'foxwalk') {
          // Fox climbs out of cockpit (dir=1: cockpit ≈ planeScreenX - PLANE_S*0.15)
          // and walks right to camera-centre (screen X = INTRO_CAMOFF)
          S.foxWalkP = Math.min(1, S.phaseT / 0.7);
          const foxStartSX = S.planeScreenX - PLANE_S * 0.15;
          const foxEndSX   = INTRO_CAMOFF;
          const foxSX = foxStartSX + (foxEndSX - foxStartSX) * S.foxWalkP;
          // Convert screen X back to world X (camX is frozen at startX - INTRO_CAMOFF)
          const camX = w.startX - INTRO_CAMOFF;
          f.x = foxSX + camX; f.y = w.baseY - f.r;
          f.phase += dt * 12;
          f.hidden = false;
          if (S.foxWalkP >= 1) {
            S.intro = 'run';
            // Convert plane from screen-space to world-space so it stays parked
            const introCamX = w.startX - INTRO_CAMOFF;
            S.planeWorldX = S.planeScreenX + introCamX;
            f.x = w.startX; f.hidden = false;
          }
          return;
        }
      }

      /* ============ GAMEPLAY ============ */
      // Ease camera back to normal
      if (w.camOffset > RUN_CAMOFF + 0.5) {
        w.camOffset += (RUN_CAMOFF - w.camOffset) * Math.min(1, dt * 2.2);
        if (w.camOffset <= RUN_CAMOFF + 0.5) w.camOffset = RUN_CAMOFF;
      }

      /* ============ WIN SCENE ============ */
      if (!S.winScene) return;
      const sc = S.winScene;
      const elapsed = w.t - sc.phaseStartT;

      switch (sc.phase) {
        case 'walk': {
          w.fox.x += 90 * dt; w.fox.y = sc.foxGroundY; w.fox.phase += dt * 10;
          if (w.fox.x >= sc.boardWorldX) {
            sc.foxWorldX = w.fox.x;
            sc.phase = 'board'; sc.phaseStartT = w.t;
          }
          break;
        }
        case 'board': {
          w.fox.phase += dt * 8;
          if (elapsed > 0.4) w.fox.hidden = true;
          if (elapsed >= 0.9) {
            sc.phase = 'sailaway'; sc.phaseStartT = w.t;
          }
          break;
        }
        case 'sailaway': {
          sc.shipVX = Math.min(sc.shipVX + 160 * dt, 280);
          sc.shipScreenX += sc.shipVX * dt;
          if (sc.shipScreenX > (S.cssW || 844) + 500) {
            sc.phase = 'done'; sc.phaseStartT = w.t;
          }
          break;
        }
        case 'done': {
          if (elapsed >= 0.3) { sc.proceed(); S.winScene = null; }
          break;
        }
      }
    },

    onRender(ctx, C, w) {
      const S = w.sah; if (!S) return;
      const cssW = ctx.canvas.width / (ctx.getTransform().a || 1);
      S.cssW = cssW;
      const baseY = w.baseY;

      /* ===== WORLD-SPACE ===== */

      // Sea — drawn over ground for the final stretch
      if (w.camX + cssW > S.seaStartX - 100) {
        const seaLeft = S.seaStartX;
        const seaRight = S.seaStartX + 1200;
        // Water fill
        const waterG = ctx.createLinearGradient(0, baseY, 0, baseY + 80);
        waterG.addColorStop(0, '#2a7ab0');
        waterG.addColorStop(1, '#1a4a78');
        ctx.fillStyle = waterG;
        ctx.fillRect(seaLeft, baseY - 4, seaRight - seaLeft, 200);
        // Wave highlights
        ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
          const wx = seaLeft + i * 120 + Math.sin(w.t * 1.2 + i) * 20;
          ctx.beginPath();
          ctx.moveTo(wx, baseY + 10 + i * 8);
          ctx.quadraticCurveTo(wx + 30, baseY + 6 + i * 8, wx + 60, baseY + 10 + i * 8);
          ctx.stroke();
        }
        // Horizon shimmer
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(seaLeft, baseY - 4, seaRight - seaLeft, 6);
      }

      // Parked plane — world-space after intro, drifts off left as camera advances
      if (S.planeWorldX != null && S.intro === 'run') {
        const drawPlane = window.LRDrawPlane;
        // Prop tip is ~74px right of centre; stop drawing once fully off-screen left
        if (drawPlane && S.planeWorldX + 74 > w.camX) {
          drawPlane(ctx, S.planeWorldX, S.planeGroundY, PLANE_S, 1, w.t, 1);
        }
      }

      // Ship — world-space during gameplay, screen-space during win
      const sc = S.winScene;
      if (!sc || sc.phase === 'walk' || sc.phase === 'board') {
        // World-space ship
        if (S.shipLeft > w.camX - 50 && S.shipLeft < w.camX + cssW + 400) {
          drawShip(ctx, S.shipLeft, S.shipDeckY, w.t, baseY);
        }
      }

      /* ===== SCREEN-SPACE ===== */
      ctx.save();
      ctx.translate(w.camX, 0);

      // Intro airplane (screen-space, only visible during intro phases)
      if (S.intro === 'approach' || S.intro === 'land' || S.intro === 'park') {
        const drawPlane = window.LRDrawPlane;
        if (drawPlane) {
          drawPlane(ctx, S.planeScreenX, S.planeY, PLANE_S, 1, w.t, S.gearFrac);
        }
      }
      // Fox walking out of plane during foxwalk (already rendered by game engine since f.hidden=false)
      // Show plane still during foxwalk
      if (S.intro === 'foxwalk') {
        const drawPlane = window.LRDrawPlane;
        if (drawPlane) {
          drawPlane(ctx, S.planeScreenX, S.planeGroundY, PLANE_S, 1, w.t, 1);
        }
      }

      // Win: ship sails away in screen-space
      if (sc && (sc.phase === 'sailaway' || sc.phase === 'done')) {
        // Sea fills the screen during sailaway
        const waterG2 = ctx.createLinearGradient(0, baseY, 0, baseY + 80);
        waterG2.addColorStop(0, '#2a7ab0');
        waterG2.addColorStop(1, '#1a4a78');
        ctx.fillStyle = waterG2;
        ctx.fillRect(0, baseY - 4, cssW, 200);
        drawShip(ctx, sc.shipScreenX, sc.shipScreenY, w.t, baseY);
      }


      ctx.restore();
    },
  });

})();

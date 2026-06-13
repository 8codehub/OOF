/* Level 1 — New York  (The Escape) */
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

  // Clean rectangular speech bubble. anchorX/anchorY = the tail tip (mouth/door),
  // body sits above the anchor. Clamped horizontally to the screen.
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
    // tail x (clamped to sit under the box)
    const tx = Math.max(bx + 14, Math.min(bx + bw - 14, anchorX));

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    rrect(ctx, bx + 2, by + 3, bw, bh, r); ctx.fill();

    // body
    ctx.fillStyle = surface;
    rrect(ctx, bx, by, bw, bh, r); ctx.fill();
    // tail (filled, merges into body)
    ctx.beginPath();
    ctx.moveTo(tx - 7, by + bh - 1);
    ctx.lineTo(anchorX, anchorY);
    ctx.lineTo(tx + 7, by + bh - 1);
    ctx.closePath();
    ctx.fillStyle = surface; ctx.fill();

    // outline (box + tail edges)
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    rrect(ctx, bx, by, bw, bh, r); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx - 7, by + bh - 1);
    ctx.lineTo(anchorX, anchorY);
    ctx.lineTo(tx + 7, by + bh - 1);
    ctx.stroke();

    // text
    ctx.fillStyle = ink;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, bx + padX, by + bh * 0.64);
    ctx.restore();
  }

  // Massive animal-transport van — cab (driver) on the LEFT, barred cargo cage
  // on the RIGHT with a back door that swings open (doorOpen 0→1).
  function drawVan(ctx, leftX, groundY, vanW, vanH, cabW, ink, accent, t, showFoxInside, doorOpen) {
    const topY     = groundY - vanH;
    const cabRight = leftX + cabW;
    const cageW    = vanW - cabW;

    ctx.save();

    /* ---- CARGO CAGE / BED body (right): full-height box ---- */
    ctx.fillStyle = '#eceae0';
    rrect(ctx, cabRight - 10, topY, cageW + 10, vanH, 8); ctx.fill();
    ctx.strokeStyle = '#5a5a5a'; ctx.lineWidth = 2.5;
    rrect(ctx, cabRight - 10, topY, cageW + 10, vanH, 8); ctx.stroke();

    /* ---- CAB + HOOD (pickup front, left) ---- */
    const hoodY      = topY + Math.round(vanH * 0.50);   // top of the hood
    const wsBaseX    = leftX + 58;                        // hood / windshield meet
    const roofFrontX = leftX + 90;                        // front roof corner
    // pickup silhouette: grille → hood → raked windshield → roof → cab back
    ctx.beginPath();
    ctx.moveTo(leftX + 4, groundY);
    ctx.lineTo(leftX, hoodY + 12);                        // front grille face
    ctx.quadraticCurveTo(leftX, hoodY, leftX + 12, hoodY);
    ctx.lineTo(wsBaseX, hoodY);                           // hood top
    ctx.lineTo(roofFrontX, topY + 7);                     // windshield rake
    ctx.quadraticCurveTo(roofFrontX + 3, topY, roofFrontX + 13, topY);
    ctx.lineTo(cabRight, topY);                           // roof
    ctx.lineTo(cabRight, groundY);                        // cab back (meets cage)
    ctx.closePath();
    ctx.fillStyle = '#eceae0'; ctx.fill();
    ctx.strokeStyle = '#5a5a5a'; ctx.lineWidth = 2.5; ctx.stroke();

    // black tinted windshield (raked)
    const glassTop = topY + 13, glassBot = hoodY - 6;
    ctx.fillStyle = '#15181d';
    ctx.beginPath();
    ctx.moveTo(wsBaseX + 4, glassBot);
    ctx.lineTo(roofFrontX + 8, glassTop);
    ctx.lineTo(roofFrontX + 22, glassTop);
    ctx.lineTo(wsBaseX + 22, glassBot);
    ctx.closePath(); ctx.fill();
    // black tinted door / side window
    rrect(ctx, roofFrontX + 28, glassTop, cabRight - (roofFrontX + 28) - 8, glassBot - glassTop, 3);
    ctx.fill();
    // glass glint
    ctx.strokeStyle = 'rgba(255,255,255,0.16)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(wsBaseX + 9, glassBot - 4); ctx.lineTo(roofFrontX + 11, glassTop + 5); ctx.stroke();

    // front bumper
    ctx.fillStyle = '#6a6a6a';
    rrect(ctx, leftX - 3, groundY - 24, 16, 18, 3); ctx.fill();
    // headlight
    ctx.fillStyle = '#fff4d0'; ctx.strokeStyle = '#9a9a8a'; ctx.lineWidth = 1.2;
    rrect(ctx, leftX + 1, hoodY + 5, 11, 14, 3); ctx.fill(); ctx.stroke();
    // grille slats
    ctx.strokeStyle = '#9a9a8a'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 2; i++) {
      const gy = hoodY + 24 + i * 8;
      ctx.beginPath(); ctx.moveTo(leftX + 2, gy); ctx.lineTo(leftX + 11, gy); ctx.stroke();
    }
    // door line + handle
    ctx.strokeStyle = '#b9b6aa'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(roofFrontX + 26, glassBot + 2); ctx.lineTo(roofFrontX + 26, groundY - 22); ctx.stroke();
    ctx.fillStyle = '#888';
    ctx.fillRect(cabRight - 24, glassBot + 10, 13, 4);   // handle

    // lower body stripe across the whole truck
    ctx.fillStyle = '#555';
    ctx.fillRect(leftX + 12, groundY - 20, vanW - 24, 7);

    // divider between cab and cage
    ctx.fillStyle = '#999';
    ctx.fillRect(cabRight - 3, topY + 4, 5, vanH - 8);

    /* ---- CARGO CAGE (right) ---- */
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(cabRight + 2, topY + 2, cageW - 4, vanH - 4);

    // Fox silhouette inside the cage
    if (showFoxInside) {
      const fx = cabRight + cageW * 0.52, fy = groundY - 10;
      ctx.save(); ctx.globalAlpha = 0.78; ctx.fillStyle = accent;
      ctx.beginPath(); ctx.ellipse(fx, fy - 14, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(fx + 12, fy - 25, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx + 6, fy - 32); ctx.lineTo(fx + 10, fy - 42); ctx.lineTo(fx + 15, fy - 32); ctx.fill();
      ctx.moveTo(fx + 16, fy - 32); ctx.lineTo(fx + 20, fy - 40); ctx.lineTo(fx + 25, fy - 30); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(fx - 13, fy - 10); ctx.quadraticCurveTo(fx - 28, fy - 30, fx - 18, fy - 40);
      ctx.lineWidth = 5; ctx.strokeStyle = accent; ctx.lineCap = 'round'; ctx.stroke();
      ctx.restore();
    }

    /* ---- CAGE GATE: identical vertical bars that LIFT straight up when opened ---- */
    const gateTop = topY + 7, gateBot = groundY - 7;
    const gateLift = doorOpen * (gateBot - gateTop + 8);   // slide vertically upward

    ctx.save();
    // clip to the cage so the bars retract up into the roof as they rise
    ctx.beginPath(); ctx.rect(cabRight, topY, cageW, vanH); ctx.clip();
    ctx.translate(0, -gateLift);

    const barCount = 7, barSpacing = cageW / (barCount + 1);
    ctx.strokeStyle = ink; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
    for (let i = 1; i <= barCount; i++) {
      const bx = cabRight + i * barSpacing;
      ctx.beginPath(); ctx.moveTo(bx, gateTop); ctx.lineTo(bx, gateBot); ctx.stroke();
    }
    // horizontal rails tie the bars together (lift with the gate)
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cabRight, topY + vanH * 0.34); ctx.lineTo(leftX + vanW, topY + vanH * 0.34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cabRight, topY + vanH * 0.66); ctx.lineTo(leftX + vanW, topY + vanH * 0.66); ctx.stroke();
    ctx.restore();

    /* ---- Wheels ---- */
    const wheelR = 20;
    [leftX + 50, leftX + vanW - 46].forEach(wx => {
      ctx.fillStyle = '#181818';
      ctx.beginPath(); ctx.arc(wx, groundY + 4, wheelR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#888';
      ctx.beginPath(); ctx.arc(wx, groundY + 4, wheelR * 0.58, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2 + t * 0.4;
        ctx.strokeStyle = '#555'; ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(wx + Math.cos(ang) * 5, groundY + 4 + Math.sin(ang) * 5);
        ctx.lineTo(wx + Math.cos(ang) * wheelR * 0.54, groundY + 4 + Math.sin(ang) * wheelR * 0.54);
        ctx.stroke();
      }
      ctx.fillStyle = '#ddd';
      ctx.beginPath(); ctx.arc(wx, groundY + 4, 5, 0, Math.PI * 2); ctx.fill();
    });

    /* ---- TAP prompt above cage ---- */
    if (showFoxInside && doorOpen < 0.02) {
      const pulse = 0.48 + 0.52 * Math.abs(Math.sin(t * 2.8));
      const cageCX = cabRight + cageW / 2;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.font = '700 13px Fredoka, Trebuchet MS, sans-serif';
      ctx.fillStyle = accent; ctx.textAlign = 'center';
      ctx.fillText('TAP TO FREE', cageCX, topY - 12);
      ctx.font = '18px sans-serif';
      ctx.fillText('👆', cageCX, topY - 28 - Math.abs(Math.sin(t * 2.8)) * 5);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawHeli(ctx, hx, hy, s, dir, t, flying) {
    const yy = hy + (flying ? Math.sin(t * 3.4) * 2.5 : 0);
    ctx.save(); ctx.translate(hx, yy); ctx.scale(dir, 1);
    ctx.fillStyle = 'rgba(40,44,56,0.92)';
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.44, s * 0.21, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(110,180,230,0.45)';
    ctx.beginPath(); ctx.ellipse(-s*0.08, -s*0.04, s*0.24, s*0.18, -0.2, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(40,44,56,0.92)';
    ctx.fillRect(-s*0.9, -s*0.05, s*0.52, s*0.07);
    ctx.beginPath();
    ctx.moveTo(-s*0.84,-s*0.03); ctx.lineTo(-s*0.92,-s*0.22); ctx.lineTo(-s*0.74,-s*0.03);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(-s*0.28, s*0.23, s*0.58, s*0.04);
    ctx.fillRect(-s*0.02, -s*0.25, s*0.05, s*0.07);
    const rw = Math.abs(Math.cos(t * (flying ? 7 : 3))) * s * 0.88 + s * 0.08;
    ctx.strokeStyle = 'rgba(40,44,56,0.60)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-rw, -s*0.27); ctx.lineTo(rw, -s*0.27); ctx.stroke();
    ctx.restore();
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

  /* ---- constants ---- */
  const VAN_W    = 230;   // total van width (world px)
  const VAN_H    = 122;   // height above ground
  const VAN_CABW = 150;   // driver cab width (left section)

  // Camera: during the intro we pull the fox further right on screen so the
  // WHOLE van (cab/front included) is visible with a little gap on the left;
  // once gameplay starts we ease the offset back to the normal value.
  const INTRO_CAMOFF = 250;
  const RUN_CAMOFF   = 116;

  /* ---- level ---- */
  (window.LRLevels = window.LRLevels || []).push({
    n: 1, name: 'New York', sub: 'The Escape', locked: false, stars: 3,
    theme: 'nyc', speed: 142, gaps: 9, spikes: 3, saws: 1, len: 6150,

    onBuild(w) {
      // Van sits to the left; its back-door (cage, right edge) lines up just
      // behind the fox's live screen position so the fox steps straight out
      // into gameplay. camX at start ≈ startX-116 → back door at screen ≈118.
      const vanLeft    = w.startX - 238;
      const heliWorldX = w.worldEnd + 240;   // clear of the finish flag
      const heliSitY   = w.baseY - 50;        // raised so the bigger heli sits on the ground
      w.fox.hidden = true;
      w.camOffset = INTRO_CAMOFF;   // full van visible during the intro
      w.nyc = {
        cssW: 844,
        intro: 'cage',     // 'cage' → 'opening' → 'runout' → 'run'
        phaseT: 0,         // time in current intro phase
        escapeT: -1,       // time since the tap (driver bubble); <0 = not yet
        doorOpen: 0,
        runoutP: 0,
        vanLeft,
        heliWorldX, heliSitY,
        winScene: null,
      };
    },

    onWin(w, proceed) {
      const N = w.nyc; if (!N) return false;
      playJingle();
      N.winScene = {
        phase: 'walk', phaseStartT: w.t, proceed,
        heliScreenX: N.heliWorldX - w.camX,
        heliY: N.heliSitY,
        flyStartX: 0, flyStartY: 0,
        foxWorldX: w.fox.x,
        foxGroundY: w.baseY - w.fox.r,
      };
      return true;
    },

    onUpdate(w, dt) {
      const N = w.nyc; if (!N) return;
      const f = w.fox;

      /* ================= INTRO CUTSCENE ================= */
      if (N.intro !== 'run') {
        N.phaseT += dt;
        // Freeze the fox at its start so the camera stays put.
        f.x = w.startX; f.y = w.baseY - f.r; f.vy = 0; f.air = false;

        if (N.intro === 'cage') {
          f.hidden = true;
          // Any tap frees the fox.
          if (w.drawing !== null) {
            w.drawing = null; w.strokes = [];
            N.intro = 'opening'; N.phaseT = 0; N.escapeT = 0;
          }
          return;
        }

        // Block drawing during the rest of the cutscene.
        if (w.drawing !== null) w.drawing = null;
        w.strokes = [];
        if (N.escapeT >= 0) N.escapeT += dt;

        if (N.intro === 'opening') {
          f.hidden = true;
          N.doorOpen = Math.min(1, N.phaseT / 0.45);
          if (N.phaseT >= 0.5) { N.intro = 'runout'; N.phaseT = 0; }
          return;
        }

        if (N.intro === 'runout') {
          f.hidden = true;              // drawn manually in onRender
          N.doorOpen = 1;
          N.runoutP = Math.min(1, N.phaseT / 0.6);
          if (N.runoutP >= 1) { N.intro = 'run'; N.phaseT = 0; f.hidden = false; }
          return;
        }
      }

      /* ================= RUN ================= */
      if (N.escapeT >= 0) N.escapeT += dt;
      N.doorOpen = 1;

      // Ease the camera from the wide intro framing back to the normal offset.
      if (w.camOffset != null && w.camOffset > RUN_CAMOFF + 0.5) {
        w.camOffset += (RUN_CAMOFF - w.camOffset) * Math.min(1, dt * 2.4);
        if (w.camOffset <= RUN_CAMOFF + 0.5) w.camOffset = RUN_CAMOFF;
      }

      if (!N.winScene) return;
      const sc = N.winScene;
      const elapsed = w.t - sc.phaseStartT;

      switch (sc.phase) {
        case 'walk': {
          w.fox.x += 110 * dt; w.fox.y = sc.foxGroundY; w.fox.phase += dt * 10;
          if (w.fox.x - w.camX >= sc.heliScreenX) {
            w.fox.x = w.camX + sc.heliScreenX; sc.foxWorldX = w.fox.x;
            sc.phase = 'board'; sc.phaseStartT = w.t;
          }
          break;
        }
        case 'board': {
          const p = Math.min(1, elapsed / 1.1);
          w.fox.x = sc.foxWorldX;
          w.fox.y = sc.foxGroundY + (sc.heliY - 20 - sc.foxGroundY) * p;
          w.fox.phase += dt * 9;
          if (p >= 0.76) w.fox.hidden = true;
          if (p >= 1) { sc.phase = 'liftoff'; sc.phaseStartT = w.t; }
          break;
        }
        case 'liftoff': {
          sc.heliY -= 70 * dt;
          if (elapsed >= 0.9) {
            sc.flyStartX = sc.heliScreenX; sc.flyStartY = sc.heliY;
            sc.phase = 'flyaway'; sc.phaseStartT = w.t;
          }
          break;
        }
        case 'flyaway': {
          const p = Math.min(1, elapsed / 2.0), pp = p * p * p;
          const cssW = N.cssW || 844;
          sc.heliScreenX = sc.flyStartX + (cssW + 400 - sc.flyStartX) * pp;
          sc.heliY       = sc.flyStartY - 320 * p * p;
          if (p >= 1) { sc.phase = 'done'; sc.phaseStartT = w.t; }
          break;
        }
        case 'done': {
          if (elapsed >= 0.3) { sc.proceed(); N.winScene = null; }
          break;
        }
      }
    },

    onRender(ctx, C, w) {
      const N = w.nyc; if (!N) return;
      const cssW = ctx.canvas.width / (ctx.getTransform().a || 1);
      N.cssW = cssW;
      const baseY = w.baseY;

      /* ===== WORLD-SPACE (camera translate active) ===== */
      const vanVisible = w.camX < N.vanLeft + VAN_W + 60;
      if (vanVisible) {
        drawVan(ctx, N.vanLeft, baseY, VAN_W, VAN_H, VAN_CABW, C.ink, C.accent, w.t,
                (N.intro === 'cage' || N.intro === 'opening'), N.doorOpen);
      }
      // Fox running out of the van (manual draw during runout)
      if (N.intro === 'runout') {
        const cageFoxWX = N.vanLeft + VAN_CABW + (VAN_W - VAN_CABW) * 0.52;
        const wx = cageFoxWX + (w.startX - cageFoxWX) * N.runoutP;
        LRFox.drawFoxCanvas(ctx, wx, baseY - w.fox.r, w.fox.r, w.t * 16, C.ink, C.accent, false);
      }

      /* ===== SCREEN-SPACE (cancel camera translate) ===== */
      ctx.save();
      ctx.translate(w.camX, 0);


      // Win — helicopter (also visible waiting at the finish line)
      {
        const sc = N.winScene;
        const hSX  = sc ? sc.heliScreenX : N.heliWorldX - w.camX;
        const hY   = sc ? sc.heliY       : N.heliSitY;
        const hFly = sc ? (sc.phase === 'liftoff' || sc.phase === 'flyaway') : false;
        if ((!sc || sc.phase !== 'done') && hSX > -200 && hSX < cssW + 200) {
          drawHeli(ctx, hSX, hY, 140, 1, w.t, hFly);   // 2× bigger, nose facing the flight direction (right)
        }
      }

      ctx.restore();
    },
  });

})();

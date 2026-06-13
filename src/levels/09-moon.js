/* Level 9 — Moon Base */

window.LRThumb_moon = function () {
  const I = 'var(--ink-3)';
  return `<svg viewBox="0 0 88 88">
    <circle cx="44" cy="44" r="26" fill="${I}" opacity=".38"/>
    <circle cx="52" cy="37" r="23" fill="var(--surface)" opacity=".88"/>
    <circle cx="30" cy="58" r="4" fill="${I}" opacity=".18"/>
    <circle cx="54" cy="62" r="2.5" fill="${I}" opacity=".14"/>
    <circle cx="20" cy="42" r="2" fill="${I}" opacity=".12"/>
  </svg>`;
};

(function () {

  function playLaunchJingle() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [392, 494, 587, 740, 880, 1047].forEach((hz, i) => {
        const osc = ac.createOscillator(), g = ac.createGain();
        osc.connect(g); g.connect(ac.destination);
        osc.type = 'sine'; osc.frequency.value = hz;
        const t0 = ac.currentTime + i * 0.11;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.18, t0 + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.65);
        osc.start(t0); osc.stop(t0 + 0.75);
      });
    } catch (e) {}
  }

  function drawUFO(ctx, x, y, t, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    // Dome
    ctx.fillStyle = 'rgba(140,220,255,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, -8, 18, 14, 0, Math.PI, 0);
    ctx.fill();
    // Main disc
    ctx.fillStyle = 'rgba(160,170,195,0.68)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Underside shading
    ctx.fillStyle = 'rgba(90,100,130,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 28, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Spinning rim lights
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + t * 2.2;
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 5 + i * 0.9));
      ctx.fillStyle = `rgba(80,230,160,${(pulse * 0.78).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 24, Math.sin(a) * 6, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRocket(ctx, x, cy, flameT, angle) {
    ctx.save();
    ctx.translate(x, cy);
    if (angle) ctx.rotate(angle);

    const bW = 18, bH = 62;

    // Exhaust flame
    if (flameT > 0.01) {
      const fa = Math.min(1, flameT);
      const flicker = Math.sin(flameT * 30) * 4;
      const fh = 38 + flicker;
      // Outer plume
      const og = ctx.createLinearGradient(0, bH / 2 + 2, 0, bH / 2 + 2 + fh);
      og.addColorStop(0, `rgba(255,210,60,${(fa * 0.95).toFixed(2)})`);
      og.addColorStop(0.45, `rgba(255,100,20,${(fa * 0.72).toFixed(2)})`);
      og.addColorStop(1, 'rgba(255,40,0,0)');
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.ellipse(0, bH / 2 + 2 + fh * 0.5, bW * 0.52 + Math.sin(flameT * 18) * 2, fh * 0.56, 0, 0, Math.PI * 2);
      ctx.fill();
      // Inner hot core
      const ig = ctx.createLinearGradient(0, bH / 2, 0, bH / 2 + fh * 0.5);
      ig.addColorStop(0, `rgba(255,255,230,${fa.toFixed(2)})`);
      ig.addColorStop(1, 'rgba(255,200,60,0)');
      ctx.fillStyle = ig;
      ctx.beginPath();
      ctx.ellipse(0, bH / 2 + fh * 0.2, bW * 0.22, fh * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fins
    ctx.fillStyle = '#7888a0';
    ctx.beginPath();
    ctx.moveTo(-bW / 2, bH / 2 - 12);
    ctx.lineTo(-bW / 2 - 16, bH / 2 + 6);
    ctx.lineTo(-bW / 2, bH / 2 + 6);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bW / 2, bH / 2 - 12);
    ctx.lineTo(bW / 2 + 16, bH / 2 + 6);
    ctx.lineTo(bW / 2, bH / 2 + 6);
    ctx.closePath(); ctx.fill();

    // Engine bell
    ctx.fillStyle = '#5a6878';
    ctx.beginPath();
    ctx.moveTo(-bW * 0.38, bH / 2 - 2);
    ctx.lineTo(-bW * 0.5, bH / 2 + 8);
    ctx.lineTo(bW * 0.5, bH / 2 + 8);
    ctx.lineTo(bW * 0.38, bH / 2 - 2);
    ctx.closePath(); ctx.fill();

    // Body
    ctx.fillStyle = '#cdd5de';
    ctx.fillRect(-bW / 2, -bH / 2, bW, bH);

    // Blue stripes
    ctx.fillStyle = '#2060b0';
    ctx.fillRect(-bW / 2, -bH / 2 + 7, bW, 7);
    ctx.fillRect(-bW / 2, bH / 2 - 20, bW, 6);

    // Nose cone
    ctx.fillStyle = '#cc3020';
    ctx.beginPath();
    ctx.moveTo(-bW / 2, -bH / 2);
    ctx.lineTo(0, -bH / 2 - 26);
    ctx.lineTo(bW / 2, -bH / 2);
    ctx.closePath(); ctx.fill();

    // Porthole window
    ctx.fillStyle = 'rgba(110,205,255,0.78)';
    ctx.beginPath();
    ctx.arc(0, -bH / 2 + 22, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6090aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -bH / 2 + 22, 7, 0, Math.PI * 2);
    ctx.stroke();
    // Window glint
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.beginPath();
    ctx.arc(-2.5, -bH / 2 + 20, 3, 0, Math.PI * 2);
    ctx.fill();

    // Flag patch on body
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(-7, -bH / 2 + 38, 14, 9);
    ctx.fillStyle = 'rgba(220,30,30,0.55)';
    ctx.fillRect(-7, -bH / 2 + 38, 14, 3);
    ctx.fillRect(-7, -bH / 2 + 44, 14, 3);

    ctx.restore();
  }

  (window.LRLevels = window.LRLevels || []).push({
    n: 9, name: 'Moon Base', sub: 'One small step for fox', locked: false, stars: 0,
    theme: 'moon', speed: 185, gaps: 14, spikes: 8, saws: 3, len: 8000,

    onBuild(w) {
      const rnd = (a, b) => a + Math.random() * (b - a);
      w.moon = {
        t: 0, cssW: 844, cssH: 390,
        ufos: Array.from({ length: 3 }, () => ({
          x: rnd(60, 780),
          y: rnd(28, 115),
          v: rnd(18, 36) * (Math.random() < 0.5 ? 1 : -1),
          scale: rnd(0.30, 0.52),
          bob: Math.random() * 6.28,
        })),
        winScene: null,
      };
    },

    onWin(w, proceed) {
      const M = w.moon; if (!M) return false;
      playLaunchJingle();
      const cssW = M.cssW || 844;
      M.winScene = {
        phase: 'walk',
        phaseStartT: w.t,
        proceed,
        rocketX: cssW * 0.54,
        rocketCY: w.baseY - 36,
        launchStartCY: 0,
        flameT: 0,
        rocketAngle: 0,
        foxWorldX: w.fox.x,
        foxGroundY: w.baseY - w.fox.r,
      };
      return true;
    },

    onUpdate(w, dt) {
      const M = w.moon; if (!M) return;
      M.t += dt;

      const W = M.cssW;
      const margin = 80;
      for (const u of M.ufos) {
        u.x += u.v * dt;
        u.bob += dt * 1.6;
        if (u.x > W + margin) { u.x = -margin; u.y = 28 + Math.random() * 95; }
        if (u.x < -margin)    { u.x = W + margin; u.y = 28 + Math.random() * 95; }
      }

      if (!M.winScene) return;
      const sc = M.winScene;
      const elapsed = w.t - sc.phaseStartT;

      switch (sc.phase) {

        case 'walk': {
          w.fox.x += 105 * dt;
          w.fox.y = sc.foxGroundY;
          w.fox.phase += dt * 10;
          if (w.fox.x - w.camX >= sc.rocketX) {
            w.fox.x = w.camX + sc.rocketX;
            sc.foxWorldX = w.fox.x;
            sc.phase = 'board';
            sc.phaseStartT = w.t;
          }
          break;
        }

        case 'board': {
          const DUR = 1.2;
          const p = Math.min(1, elapsed / DUR);
          w.fox.x = sc.foxWorldX;
          // Fox rises from ground toward rocket window
          const windowY = sc.rocketCY - 14;
          w.fox.y = sc.foxGroundY + (windowY - sc.foxGroundY) * p;
          w.fox.phase += dt * 8;
          if (p >= 0.78) w.fox.hidden = true;
          if (p >= 1) {
            sc.phase = 'ignite';
            sc.phaseStartT = w.t;
          }
          break;
        }

        case 'ignite': {
          const DUR = 1.0;
          const p = Math.min(1, elapsed / DUR);
          sc.flameT = p;
          if (p >= 1) {
            sc.launchStartCY = sc.rocketCY;
            sc.phase = 'launch';
            sc.phaseStartT = w.t;
          }
          break;
        }

        case 'launch': {
          const DUR = 2.8;
          const p = Math.min(1, elapsed / DUR);
          const pp = p * p * p; // cubic ease-in — slow start, rockets away
          sc.rocketCY = sc.launchStartCY - 720 * pp;
          sc.flameT = 1.0 + p * 0.7;
          // Lean toward Earth (upper right of screen)
          sc.rocketAngle = -p * 0.18;
          if (p >= 1) {
            sc.phase = 'done';
            sc.phaseStartT = w.t;
          }
          break;
        }

        case 'done': {
          if (elapsed >= 0.3) {
            sc.proceed();
            M.winScene = null;
          }
          break;
        }
      }
    },

    onRender(ctx, C, w) {
      const M = w.moon; if (!M) return;
      const m = ctx.getTransform();
      const dpr = m.a || 1;
      M.cssW = ctx.canvas.width / dpr;
      M.cssH = ctx.canvas.height / dpr;

      // Cancel world transform → screen space
      ctx.save();
      ctx.translate(w.camX, 0);

      // Background UFOs
      for (const u of M.ufos) {
        drawUFO(ctx, u.x, u.y + Math.sin(u.bob) * 2.5, M.t, u.scale);
      }

      // Rocket — shown during all win phases except 'done'
      if (M.winScene) {
        const sc = M.winScene;
        if (sc.phase !== 'done') {
          drawRocket(ctx, sc.rocketX, sc.rocketCY, sc.flameT, sc.rocketAngle);
        }
      }

      ctx.restore();
    },
  });

})();

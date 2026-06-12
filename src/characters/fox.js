/* ============================================================
   FOX — geometric fox character, side profile, facing right.
   Two consumers:
     • foxSVG()          -> SVG markup string for menus / overlays
     • drawFoxCanvas()   -> animated runner on the game canvas
   ============================================================ */

function foxSVG(){
  // viewBox 0 0 120 120 — tail left, snout right, ears up.
  return `<svg class="fox" viewBox="0 0 120 120" aria-label="Fox">
    <!-- bushy tail with white tip -->
    <path class="fox-ink" d="M38 88 C14 84 2 66 6 46 C10 28 28 24 36 40 C30 54 34 70 46 78 Z"/>
    <path fill="rgba(245,240,230,0.90)" d="M6 46 C10 28 28 24 36 40 C24 38 10 44 10 54 Z"/>
    <!-- back legs -->
    <rect class="fox-ink" x="46" y="90" width="12" height="22" rx="6"/>
    <rect class="fox-ink" x="61" y="92" width="12" height="20" rx="6"/>
    <rect class="fox-acc" x="46" y="104" width="12" height="8" rx="4"/>
    <rect class="fox-acc" x="61" y="104" width="12" height="8" rx="4"/>
    <!-- body -->
    <path class="fox-ink" d="M36 96 C30 70 48 56 70 58 C92 60 100 80 94 98 C88 108 44 108 36 96 Z"/>
    <!-- belly -->
    <ellipse fill="rgba(245,240,230,0.20)" cx="66" cy="91" rx="14" ry="10"/>
    <!-- front legs -->
    <rect class="fox-ink" x="78" y="88" width="12" height="22" rx="6"/>
    <rect class="fox-ink" x="92" y="90" width="12" height="20" rx="6"/>
    <rect class="fox-acc" x="78" y="102" width="12" height="8" rx="4"/>
    <rect class="fox-acc" x="92" y="102" width="12" height="8" rx="4"/>
    <!-- ears — curved bezier, drawn before head so base looks naturally attached -->
    <path class="fox-ink fox-ear" d="M76,38 C72,26 74,10 80,6 C85,4 90,20 89,38 Z"/>
    <path class="fox-acc fox-ear" d="M78,36 C75,27 77,14 80,10 C84,8 88,22 87,36 Z"/>
    <path class="fox-ink fox-ear" d="M91,38 C87,24 89,6 96,2 C103,0 108,16 107,38 Z"/>
    <path class="fox-acc fox-ear" d="M93,36 C90,25 92,10 96,6 C101,4 106,18 104,36 Z"/>
    <!-- head -->
    <ellipse class="fox-ink" cx="88" cy="52" rx="17" ry="15"/>
    <!-- muzzle — elongated, not a triangle -->
    <path class="fox-ink" d="M84 48 C90 42 112 44 114 52 C112 60 90 62 84 56 Z"/>
    <ellipse fill="rgba(245,240,230,0.35)" cx="102" cy="52" rx="10" ry="6"/>

    <!-- eye: sclera + iris + shine -->
    <circle fill="#F5F0E8" cx="94" cy="46" r="5"/>
    <circle class="fox-eye" cx="94" cy="46" r="3"/>
    <circle fill="rgba(255,255,255,0.78)" cx="95.4" cy="44.6" r="1.2"/>
    <!-- nose -->
    <ellipse class="fox-eye" cx="114" cy="54" rx="3" ry="2.4"/>
  </svg>`;
}

// Inject SVG foxes into any element flagged with data-fox
function mountFoxes(){
  document.querySelectorAll('#home-fox,#go-fox').forEach(el=>{
    if(!el.dataset.mounted){ el.innerHTML = foxSVG(); el.dataset.mounted='1'; }
  });
  const go = document.querySelector('#go-fox .fox');
  if(go) go.classList.add('sad');
}

/* ---- canvas runner fox ----
   cx,cy = center; r = body radius scale; phase = run cycle; airborne = bool */
function drawFoxCanvas(ctx, cx, cy, r, phase, ink, accent, airborne){
  ctx.save();
  ctx.translate(cx, cy);
  const s = r / 26;
  ctx.scale(s, s);
  const tilt = airborne ? -0.10 : Math.sin(phase * 0.5) * 0.05;
  ctx.rotate(tilt);

  const lp = airborne ? 0.8 : Math.sin(phase);   // -1..1 leg phase

  // ── TAIL (drawn first, sits behind everything) ──────────────────
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-14, 2);
  ctx.bezierCurveTo(-22, -2, -50, -4, -50, -28);
  ctx.bezierCurveTo(-50, -50, -28, -52, -22, -38);
  ctx.bezierCurveTo(-18, -26, -30, -10, -14, -4);
  ctx.closePath();
  ctx.fill();
  // white rounded tip
  ctx.fillStyle = 'rgba(245,240,230,0.92)';
  ctx.beginPath();
  ctx.moveTo(-50, -28);
  ctx.bezierCurveTo(-50, -50, -28, -52, -22, -38);
  ctx.bezierCurveTo(-32, -38, -44, -42, -44, -30);
  ctx.closePath();
  ctx.fill();

  // ── BACK LEGS (behind body) ──────────────────────────────────────
  const bSwing = lp * 14;
  // back-far leg
  ctx.fillStyle = ink;
  ctx.save(); ctx.translate(-9, 7); ctx.rotate(bSwing * 0.025);
  rrect(ctx, -3.5, 0, 7, 14, 3.5);
  ctx.translate(0, 12); ctx.rotate(-bSwing * 0.022);
  rrect(ctx, -3, 0, 6, 12, 3);
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.ellipse(0, 13, 5.5, 2.8, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  // back-near leg (opposite phase)
  ctx.fillStyle = ink;
  ctx.save(); ctx.translate(-4, 7); ctx.rotate(-bSwing * 0.025);
  rrect(ctx, -3.5, 0, 7, 14, 3.5);
  ctx.translate(0, 12); ctx.rotate(bSwing * 0.022);
  rrect(ctx, -3, 0, 6, 12, 3);
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.ellipse(0, 13, 5.5, 2.8, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // ── BODY ────────────────────────────────────────────────────────
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(0, 4, 23, 15, -0.05, 0, Math.PI*2);
  ctx.fill();
  // subtle belly/chest patch
  ctx.fillStyle = 'rgba(245,240,230,0.18)';
  ctx.beginPath();
  ctx.ellipse(4, 10, 13, 9, 0, 0, Math.PI*2);
  ctx.fill();

  // ── FRONT LEGS (in front of body) ───────────────────────────────
  const fSwing = -lp * 14;
  // front-far leg
  ctx.fillStyle = ink;
  ctx.save(); ctx.translate(13, 7); ctx.rotate(fSwing * 0.025);
  rrect(ctx, -3.5, 0, 7, 14, 3.5);
  ctx.translate(0, 12); ctx.rotate(-fSwing * 0.022);
  rrect(ctx, -3, 0, 6, 12, 3);
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.ellipse(0, 13, 5.5, 2.8, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  // front-near leg
  ctx.fillStyle = ink;
  ctx.save(); ctx.translate(18, 7); ctx.rotate(-fSwing * 0.025);
  rrect(ctx, -3.5, 0, 7, 14, 3.5);
  ctx.translate(0, 12); ctx.rotate(fSwing * 0.022);
  rrect(ctx, -3, 0, 6, 12, 3);
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.ellipse(0, 13, 5.5, 2.8, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // ── EARS (drawn before head — head overlaps base so ears look naturally attached) ──
  // back ear outer (slightly smaller, sits behind)
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(11, -22);
  ctx.bezierCurveTo(8,  -32,  9, -44, 15, -48);   // outer curved edge
  ctx.bezierCurveTo(20, -46, 23, -35, 23, -22);   // inner curved edge
  ctx.closePath(); ctx.fill();
  // back ear inner — soft teardrop, NOT a triangle
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(13, -25);
  ctx.bezierCurveTo(11, -31, 12, -41, 15, -44);
  ctx.bezierCurveTo(18, -42, 21, -33, 21, -25);
  ctx.closePath(); ctx.fill();

  // front ear outer (taller, wider — the prominent one)
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(26, -22);
  ctx.bezierCurveTo(23, -34, 25, -46, 32, -50);   // outer edge
  ctx.bezierCurveTo(38, -48, 41, -36, 41, -22);   // inner edge
  ctx.closePath(); ctx.fill();
  // front ear inner
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(28, -25);
  ctx.bezierCurveTo(26, -33, 28, -43, 32, -46);
  ctx.bezierCurveTo(37, -44, 39, -34, 38, -25);
  ctx.closePath(); ctx.fill();

  // ── HEAD ────────────────────────────────────────────────────────
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(22, -10, 15, 13, 0.08, 0, Math.PI*2);
  ctx.fill();

  // Muzzle — proper elongated fox snout (bezier, NOT a triangle)
  ctx.beginPath();
  ctx.moveTo(22, -8);
  ctx.bezierCurveTo(28, -15, 47, -13, 48, -7);
  ctx.bezierCurveTo(47, -1,  28, -1,  22, -6);
  ctx.closePath();
  ctx.fill();
  // white muzzle highlight
  ctx.fillStyle = 'rgba(245,240,230,0.38)';
  ctx.beginPath();
  ctx.ellipse(37, -7, 10, 5.5, 0, 0, Math.PI*2);
  ctx.fill();

  // ── EYE (sclera + iris + pupil + shine) ─────────────────────────
  ctx.fillStyle = '#F5F0E8';
  ctx.beginPath(); ctx.arc(28, -13, 3.8, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath(); ctx.arc(28, -13, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.beginPath(); ctx.arc(29.2, -14.2, 1.0, 0, Math.PI*2); ctx.fill();

  // ── NOSE ────────────────────────────────────────────────────────
  ctx.fillStyle = ink;
  ctx.beginPath(); ctx.ellipse(48, -7, 3.0, 2.3, 0.15, 0, Math.PI*2); ctx.fill();

  ctx.restore();
}

function rrect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath(); ctx.fill();
}

window.LRFox = { foxSVG, mountFoxes, drawFoxCanvas, rrect };

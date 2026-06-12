/* ============================================================
   FOX — geometric fox character, side profile, facing right.
   Composed from simple primitives (triangles, rounded blobs,
   circles). Two consumers:
     • foxSVG(opts)  -> markup string for menus / overlays
     • drawFox(ctx)  -> animated runner on the game canvas
   ============================================================ */

function foxSVG(){
  // viewBox 0 0 120 120 — tail left, snout right, ears up.
  return `<svg class="fox" viewBox="0 0 120 120" aria-label="Fox">
    <!-- tail -->
    <path class="fox-ink" d="M40 84 C16 90 10 70 18 54 C22 50 27 50 30 54 C26 64 30 74 46 76 Z"/>
    <path class="fox-acc" d="M18 54 C22 50 27 50 30 54 C28 60 26 62 22 64 C19 61 17 58 18 54 Z"/>
    <!-- back legs -->
    <rect class="fox-ink" x="50" y="92" width="11" height="20" rx="5"/>
    <rect class="fox-ink" x="74" y="92" width="11" height="20" rx="5"/>
    <rect class="fox-acc" x="50" y="104" width="11" height="8" rx="4"/>
    <rect class="fox-acc" x="74" y="104" width="11" height="8" rx="4"/>
    <!-- body -->
    <path class="fox-ink" d="M42 96 C34 70 50 56 72 58 C94 60 100 80 92 98 C86 106 50 106 42 96 Z"/>
    <!-- head + snout (snout points right) -->
    <path class="fox-ink" d="M70 60 C64 44 74 32 88 33 C100 34 106 44 103 55 C111 53 118 58 112 63 C108 66 100 67 96 65 C86 70 76 70 70 60 Z"/>
    <!-- ears -->
    <path class="fox-ink fox-ear l" d="M74 36 L69 16 L86 31 Z"/>
    <path class="fox-ink fox-ear r" d="M92 33 L99 14 L104 35 Z"/>
    <path class="fox-acc fox-ear" d="M77 33 L75 23 L83 31 Z"/>
    <!-- eye -->
    <circle class="fox-eye" cx="91" cy="48" r="3.4"/>
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
   cx,cy = center; r = body radius scale; phase = run cycle; face = ±1 */
function drawFoxCanvas(ctx, cx, cy, r, phase, ink, accent, airborne){
  ctx.save();
  ctx.translate(cx, cy);
  const s = r/26;                 // scale (r≈26 baseline)
  ctx.scale(s, s);
  const tilt = airborne ? 0.12 : Math.sin(phase*0.5)*0.04;
  ctx.rotate(tilt);

  const blob = (pts)=>{ ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]); ctx.closePath(); };

  // legs (animated) — two on each visible side, swing with phase
  const swing = airborne ? 0 : Math.sin(phase)*7;
  ctx.fillStyle = ink;
  rrect(ctx, -14+swing, 12, 9, 20, 4);
  rrect(ctx,   6-swing, 12, 9, 20, 4);
  ctx.fillStyle = accent;
  rrect(ctx, -14+swing, 26, 9, 7, 3);
  rrect(ctx,   6-swing, 26, 9, 7, 3);

  // tail
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-18, 4); ctx.quadraticCurveTo(-44, -2,-40,-20);
  ctx.quadraticCurveTo(-34,-26,-30,-18); ctx.quadraticCurveTo(-30,-4,-12,-2);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-40,-20); ctx.quadraticCurveTo(-34,-26,-30,-18);
  ctx.quadraticCurveTo(-33,-12,-38,-12); ctx.closePath(); ctx.fill();

  // body
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(-2, 4, 24, 21, 0, 0, Math.PI*2); ctx.fill();

  // head (to the right)
  ctx.beginPath();
  ctx.ellipse(22, -10, 17, 15, 0.1, 0, Math.PI*2); ctx.fill();
  // snout
  ctx.beginPath();
  ctx.moveTo(34,-12); ctx.lineTo(46,-6); ctx.lineTo(33,0); ctx.closePath(); ctx.fill();

  // ears
  blob([[12,-22],[7,-44],[26,-26]]); ctx.fill();
  blob([[30,-24],[40,-46],[44,-22]]); ctx.fill();
  ctx.fillStyle = accent;
  blob([[15,-24],[13,-36],[24,-26]]); ctx.fill();

  // eye
  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(28,-12,2.8,0,Math.PI*2); ctx.fill();

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

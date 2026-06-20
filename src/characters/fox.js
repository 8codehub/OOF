/* ============================================================
   FOX — "KIT" cartoon-sprite character (from fox-idea/fox-kit.js).
   Side profile, faces right. Dark-brown outline, two-tone orange
   fur (driven by the level accent), big cream face-mask + belly,
   dark socks, fluffy cream-tipped tail, big sparkly eye.

   Public API (window.LRFox), unchanged from the previous fox:
     • foxSVG()        -> SVG markup string for menus / overlays
     • mountFoxes()    -> inject the menu foxes
     • drawFoxCanvas() -> animated runner on the game canvas
                          (ctx,cx,cy,r,phase,ink,accent,airborne)
     • rrect()         -> rounded-rect path helper

   The previous geometric fox is archived at fox-old-1.js.
   ============================================================ */
(function () {
  const TAU = Math.PI * 2;

  /* ---------- palette (accent drives the orange) ---------- */
  function hexRGB(h){ h=h.replace('#',''); if(h.length===3)h=h.split('').map(c=>c+c).join(''); const n=parseInt(h,16); return [(n>>16)&255,(n>>8)&255,n&255]; }
  function shade(h,f){ const [r,g,b]=hexRGB(h); return `rgb(${r*(1-f)|0},${g*(1-f)|0},${b*(1-f)|0})`; }
  function tint(h,f){ const [r,g,b]=hexRGB(h); return `rgb(${(r+(255-r)*f)|0},${(g+(255-g)*f)|0},${(b+(255-b)*f)|0})`; }
  function pal(accent) {
    return {
      out:  '#3A2014',            // dark-brown outline
      dark: shade(accent, 0.30),  // shadowed fur
      mid:  accent,               // main fur
      lite: tint(accent, 0.28),   // lit fur
      cream:'#FBEFD6',
      creamSh:'#E9D5AE',
      sock: '#3B2417',            // dark legs
      eye:  '#241308',
    };
  }

  // fill+outline helper: trace via fn, stroke (wide) then fill on top
  function shape(ctx, fn, fill, ow, out) {
    ctx.beginPath(); fn();
    if (ow) { ctx.lineWidth = ow; ctx.strokeStyle = out; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
    ctx.fillStyle = fill; ctx.fill();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function backLeg(ctx, c, x, y, OW, far) {
    const fur = far ? c.dark : c.mid;
    shape(ctx, () => { roundRect(ctx, x - 4, y, 8, 12, 3); }, fur, OW, c.out);            // thigh
    shape(ctx, () => { roundRect(ctx, x - 3.5, y + 9, 7, 11, 3); }, c.sock, OW, c.out);   // sock
  }
  function frontLeg(ctx, c, x, y, OW, far) {
    const fur = far ? c.dark : c.mid;
    shape(ctx, () => { roundRect(ctx, x - 3.5, y, 7, 11, 3); }, fur, OW, c.out);
    shape(ctx, () => { roundRect(ctx, x - 3, y + 8, 6, 11, 3); }, c.sock, OW, c.out);
  }

  /* ---------- canvas runner fox ----------
     cx,cy = center; r = body radius scale; phase = run cycle; airborne = bool */
  function drawFoxCanvas(ctx, cx, cy, r, phase, ink, accent, airborne) {
    const c = pal(accent);
    const s = r / 26;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    const OW = 3.2;

    // leg swing + body bob
    const sw  = airborne ? 0 : Math.sin(phase) * 8;
    const sw2 = airborne ? 0 : Math.sin(phase + Math.PI) * 8;
    const bodyBob = airborne ? 0 : Math.abs(Math.sin(phase)) * 1.5;
    ctx.translate(0, -bodyBob);

    // time-based idle animations (independent of the run cycle):
    //  • tail: a small continuous wag
    //  • ears: a quick double-flick twitch every 10 seconds
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;
    const tailWag = Math.sin(now * 2.4) * 0.13;
    const ep = now % 10;
    const earTwitch = ep < 0.5 ? Math.sin(ep * Math.PI * 4) * 0.34 * (1 - ep / 0.5) : 0;

    // ---------- TAIL (behind) — gently wags around its base ----------
    ctx.save();
    ctx.translate(-15, 4); ctx.rotate(tailWag); ctx.translate(15, -4);
    shape(ctx, () => {
      ctx.moveTo(-14, 8);
      ctx.bezierCurveTo(-40, 14, -62, 2, -58, -22);
      ctx.bezierCurveTo(-54, -40, -34, -40, -26, -24);
      ctx.bezierCurveTo(-22, -14, -12, -6, -14, 8);
    }, c.dark, OW, c.out);
    shape(ctx, () => {
      ctx.moveTo(-18, 4);
      ctx.bezierCurveTo(-36, 8, -52, -2, -48, -20);
      ctx.bezierCurveTo(-44, -32, -30, -30, -26, -18);
      ctx.bezierCurveTo(-22, -8, -14, -2, -18, 4);
    }, c.mid, 0, c.out);
    shape(ctx, () => {                                   // cream tip
      ctx.moveTo(-58, -20);
      ctx.bezierCurveTo(-58, -38, -40, -42, -30, -30);
      ctx.bezierCurveTo(-42, -34, -52, -30, -52, -16);
      ctx.closePath();
    }, c.cream, OW * 0.7, c.out);
    ctx.restore();

    // ---------- BODY ---------- (two-leg variant: no far leg pair)
    shape(ctx, () => {
      ctx.moveTo(-20, 2);
      ctx.bezierCurveTo(-22, -14, 0, -22, 16, -16);
      ctx.bezierCurveTo(30, -12, 30, 12, 16, 20);
      ctx.bezierCurveTo(0, 26, -18, 18, -20, 2);
    }, c.mid, OW, c.out);
    shape(ctx, () => {                                   // back shadow (darker upper)
      ctx.moveTo(-18, -2);
      ctx.bezierCurveTo(-18, -16, 4, -22, 16, -16);
      ctx.bezierCurveTo(24, -12, 22, -4, 12, -4);
      ctx.bezierCurveTo(-2, -6, -12, -8, -18, -2);
    }, c.dark, 0, c.out);
    shape(ctx, () => {                                   // cream belly/chest
      ctx.moveTo(-12, 16);
      ctx.bezierCurveTo(-2, 24, 14, 22, 20, 12);
      ctx.bezierCurveTo(22, 6, 16, 6, 10, 10);
      ctx.bezierCurveTo(2, 16, -8, 14, -12, 16);
    }, c.cream, 0, c.out);

    // ---------- legs (two only: one back, one front) ----------
    backLeg(ctx, c, 0 + sw, 15, OW, false);
    frontLeg(ctx, c, 18 + sw2, 15, OW, false);

    // ---------- HEAD ----------
    ctx.save();
    ctx.translate(26, -8);
    // ear (far, behind head) — twitches around its base
    ctx.save();
    ctx.translate(0, -17); ctx.rotate(earTwitch * 0.8); ctx.translate(0, 17);
    shape(ctx, () => { ctx.moveTo(-8, -12); ctx.lineTo(-20, -44); ctx.lineTo(8, -22); ctx.closePath(); }, c.dark, OW, c.out);
    shape(ctx, () => { ctx.moveTo(-7, -16); ctx.lineTo(-16, -38); ctx.lineTo(2, -22); ctx.closePath(); }, c.sock, 0, c.out);
    ctx.restore();
    // head shape (round, muzzle to the right)
    shape(ctx, () => {
      ctx.moveTo(-12, -8);
      ctx.bezierCurveTo(-14, -28, 14, -34, 22, -16);
      ctx.bezierCurveTo(26, -8, 26, -2, 30, 2);
      ctx.lineTo(36, 6);
      ctx.bezierCurveTo(30, 12, 22, 12, 16, 12);
      ctx.bezierCurveTo(2, 16, -10, 8, -12, -8);
    }, c.mid, OW, c.out);
    shape(ctx, () => {                                   // forehead darker
      ctx.moveTo(-10, -10);
      ctx.bezierCurveTo(-12, -26, 12, -32, 20, -16);
      ctx.bezierCurveTo(14, -22, -2, -20, -10, -10);
    }, c.dark, 0, c.out);
    // ear (near) — twitches around its base
    ctx.save();
    ctx.translate(12, -16); ctx.rotate(earTwitch); ctx.translate(-12, 16);
    shape(ctx, () => { ctx.moveTo(2, -14); ctx.lineTo(4, -46); ctx.lineTo(22, -18); ctx.closePath(); }, c.mid, OW, c.out);
    shape(ctx, () => { ctx.moveTo(5, -16); ctx.lineTo(7, -40); ctx.lineTo(18, -19); ctx.closePath(); }, c.dark, 0, c.out);
    shape(ctx, () => { ctx.moveTo(7, -18); ctx.lineTo(8, -34); ctx.lineTo(16, -20); ctx.closePath(); }, c.cream, 0, c.out);
    ctx.restore();
    // cream face mask (muzzle + cheek)
    shape(ctx, () => {
      ctx.moveTo(36, 6);
      ctx.bezierCurveTo(24, 14, 16, 12, 12, 6);
      ctx.bezierCurveTo(8, 0, 14, -6, 22, -4);
      ctx.bezierCurveTo(28, -2, 30, 2, 36, 6);
    }, c.cream, OW * 0.8, c.out);
    // nose
    shape(ctx, () => { ctx.ellipse(35, 5, 3.4, 2.8, 0.2, 0, TAU); }, c.eye, 0, c.out);
    // eye (big, sparkly)
    shape(ctx, () => { ctx.ellipse(16, -6, 4.6, 5.6, 0, 0, TAU); }, c.eye, 0, c.out);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(14.6, -8, 1.7, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(17.6, -4, 0.9, 0, TAU); ctx.fill();
    // brow tuft
    shape(ctx, () => {
      ctx.moveTo(8, -14); ctx.bezierCurveTo(14, -18, 22, -16, 24, -12);
      ctx.bezierCurveTo(20, -13, 12, -14, 8, -14);
    }, c.dark, 0, c.out);

    ctx.restore(); // head
    ctx.restore(); // root
  }

  /* ---------- menu SVG (original geometric fox — matches the menu CSS
     contract: .fox-ink / .fox-acc / .fox-eye and the .sad eye state) ---------- */
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
      <path class="fox-ink fox-ear l" d="M76,38 C72,26 74,10 80,6 C85,4 90,20 89,38 Z"/>
      <path class="fox-acc fox-ear l" d="M78,36 C75,27 77,14 80,10 C84,8 88,22 87,36 Z"/>
      <path class="fox-ink fox-ear r" d="M91,38 C87,24 89,6 96,2 C103,0 108,16 107,38 Z"/>
      <path class="fox-acc fox-ear r" d="M93,36 C90,25 92,10 96,6 C101,4 106,18 104,36 Z"/>
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

  // Render the Kit fox on a <canvas> as an idle, standing pose. Legs stay
  // neutral (phase fixed); the tail wag + 10s ear twitch (time-based inside
  // drawFoxCanvas) keep it alive. Used for the home-menu fox.
  function startMenuFox(cv){
    const ctx = cv.getContext('2d');
    const PHASE = 0;                       // neutral standing stance
    function frame(){
      const rect = cv.getBoundingClientRect();
      const W = rect.width, H = rect.height;
      if (W > 1 && H > 1) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        if (cv.width !== Math.round(W*dpr) || cv.height !== Math.round(H*dpr)) {
          cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const root = getComputedStyle(document.documentElement);
        const ink = (root.getPropertyValue('--ink').trim())     || '#16140F';
        const acc = (root.getPropertyValue('--accent').trim())  || '#ef8b3b';
        const r = Math.min(W, H) * 0.21;   // fit the kit fox inside the box
        drawFoxCanvas(ctx, W*0.5, H*0.64, r, PHASE, ink, acc, false);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function mountFoxes(){
    // The new Kit fox (canvas, same art as in-game) everywhere it's shown.
    document.querySelectorAll('#home-fox,#go-fox').forEach(el=>{
      if (el.dataset.mounted) return;
      el.dataset.mounted = '1';
      const cv = document.createElement('canvas');
      cv.className = 'fox';
      el.appendChild(cv);
      startMenuFox(cv);
    });
  }

  // Rounded-rect path helper (kept for API compatibility)
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
})();

/* ============================================================
   LINE RUNNER — "KIT" fox: detailed cartoon-sprite style
   Matches the reference sheet: dark-brown outline, two-tone
   orange fur, big cream face-mask + belly, dark socks, fluffy
   cream-tipped tail, big sparkly eye. Side profile, faces right.
   Signature matches the engine: draw(ctx,cx,cy,r,phase,ink,accent,air)
   ============================================================ */
(function () {
  const TAU = Math.PI * 2;

  // palette (accent drives the orange; rest are fixed for the look)
  function pal(accent) {
    return {
      out:  '#3A2014',   // dark-brown outline
      dark: shade(accent, 0.30),  // shadowed fur
      mid:  accent,               // main fur
      lite: tint(accent, 0.28),   // lit fur
      cream:'#FBEFD6',
      creamSh:'#E9D5AE',
      sock: '#3B2417',   // dark legs
      eye:  '#241308',
    };
  }
  function hexRGB(h){ h=h.replace('#',''); if(h.length===3)h=h.split('').map(c=>c+c).join(''); const n=parseInt(h,16); return [(n>>16)&255,(n>>8)&255,n&255]; }
  function shade(h,f){ const [r,g,b]=hexRGB(h); return `rgb(${r*(1-f)|0},${g*(1-f)|0},${b*(1-f)|0})`; }
  function tint(h,f){ const [r,g,b]=hexRGB(h); return `rgb(${(r+(255-r)*f)|0},${(g+(255-g)*f)|0},${(b+(255-b)*f)|0})`; }

  // fill+outline helper: trace via fn, stroke (wide) then fill on top
  function shape(ctx, fn, fill, ow, out) {
    ctx.beginPath(); fn();
    if (ow) { ctx.lineWidth = ow; ctx.strokeStyle = out; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
    ctx.fillStyle = fill; ctx.fill();
  }

  function drawKit(ctx, cx, cy, r, phase, ink, accent, air, legStyle) {
    const c = pal(accent);
    const s = r / 26;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    const OW = 3.2;

    // leg swing
    const sw = air ? 0 : Math.sin(phase) * 8;
    const sw2 = air ? 0 : Math.sin(phase + Math.PI) * 8;
    const bodyBob = air ? 0 : Math.abs(Math.sin(phase)) * 1.5;
    ctx.translate(0, -bodyBob);
    const tuck = air ? 6 : 0;

    // ---------- TAIL (behind) ----------
    shape(ctx, () => {
      ctx.moveTo(-14, 8);
      ctx.bezierCurveTo(-40, 14, -62, 2, -58, -22);
      ctx.bezierCurveTo(-54, -40, -34, -40, -26, -24);
      ctx.bezierCurveTo(-22, -14, -12, -6, -14, 8);
    }, c.dark, OW, c.out);
    // tail mid highlight
    shape(ctx, () => {
      ctx.moveTo(-18, 4);
      ctx.bezierCurveTo(-36, 8, -52, -2, -48, -20);
      ctx.bezierCurveTo(-44, -32, -30, -30, -26, -18);
      ctx.bezierCurveTo(-22, -8, -14, -2, -18, 4);
    }, c.mid, 0, c.out);
    // cream tip
    shape(ctx, () => {
      ctx.moveTo(-58, -20);
      ctx.bezierCurveTo(-58, -38, -40, -42, -30, -30);
      ctx.bezierCurveTo(-42, -34, -52, -30, -52, -16);
      ctx.closePath();
    }, c.cream, OW * 0.7, c.out);

    // ---------- BACK legs (far pair) — skipped in two-leg mode ----------
    if (legStyle !== 'two') {
      backLeg(ctx, c, ink, -13 + sw, 14, OW, true);
      frontLeg(ctx, c, ink, 13 + sw2, 14, OW, true);
    }

    // ---------- BODY ----------
    shape(ctx, () => {
      ctx.moveTo(-20, 2);
      ctx.bezierCurveTo(-22, -14, 0, -22, 16, -16);
      ctx.bezierCurveTo(30, -12, 30, 12, 16, 20);
      ctx.bezierCurveTo(0, 26, -18, 18, -20, 2);
    }, c.mid, OW, c.out);
    // back shadow (darker upper)
    shape(ctx, () => {
      ctx.moveTo(-18, -2);
      ctx.bezierCurveTo(-18, -16, 4, -22, 16, -16);
      ctx.bezierCurveTo(24, -12, 22, -4, 12, -4);
      ctx.bezierCurveTo(-2, -6, -12, -8, -18, -2);
    }, c.dark, 0, c.out);
    // cream belly/chest
    shape(ctx, () => {
      ctx.moveTo(-12, 16);
      ctx.bezierCurveTo(-2, 24, 14, 22, 20, 12);
      ctx.bezierCurveTo(22, 6, 16, 6, 10, 10);
      ctx.bezierCurveTo(2, 16, -8, 14, -12, 16);
    }, c.cream, 0, c.out);

    // ---------- legs (near) ----------
    if (legStyle === 'two') {
      // only two legs, like Cub (fox #3): back + front
      backLeg(ctx, c, ink, 0 + sw, 15, OW, false);
      frontLeg(ctx, c, ink, 18 + sw2, 15, OW, false);
    } else {
      backLeg(ctx, c, ink, -4 + sw2, 15, OW, false);
      frontLeg(ctx, c, ink, 20 + sw, 15, OW, false);
    }

    // ---------- HEAD ----------
    ctx.save();
    ctx.translate(26, -8);
    // ear (far, behind head) — peeks to the left of the near ear
    shape(ctx, () => {
      ctx.moveTo(-8, -12); ctx.lineTo(-20, -44); ctx.lineTo(8, -22); ctx.closePath();
    }, c.dark, OW, c.out);
    shape(ctx, () => {
      ctx.moveTo(-7, -16); ctx.lineTo(-16, -38); ctx.lineTo(2, -22); ctx.closePath();
    }, c.sock, 0, c.out);

    // head shape (round, muzzle to the right)
    shape(ctx, () => {
      ctx.moveTo(-12, -8);
      ctx.bezierCurveTo(-14, -28, 14, -34, 22, -16);   // crown
      ctx.bezierCurveTo(26, -8, 26, -2, 30, 2);        // brow to muzzle top
      ctx.lineTo(36, 6);                                // muzzle tip
      ctx.bezierCurveTo(30, 12, 22, 12, 16, 12);        // under muzzle
      ctx.bezierCurveTo(2, 16, -10, 8, -12, -8);
    }, c.mid, OW, c.out);
    // forehead darker
    shape(ctx, () => {
      ctx.moveTo(-10, -10);
      ctx.bezierCurveTo(-12, -26, 12, -32, 20, -16);
      ctx.bezierCurveTo(14, -22, -2, -20, -10, -10);
    }, c.dark, 0, c.out);

    // ear (near)
    shape(ctx, () => {
      ctx.moveTo(2, -14); ctx.lineTo(4, -46); ctx.lineTo(22, -18); ctx.closePath();
    }, c.mid, OW, c.out);
    shape(ctx, () => {
      ctx.moveTo(5, -16); ctx.lineTo(7, -40); ctx.lineTo(18, -19); ctx.closePath();
    }, c.dark, 0, c.out);
    shape(ctx, () => {
      ctx.moveTo(7, -18); ctx.lineTo(8, -34); ctx.lineTo(16, -20); ctx.closePath();
    }, c.cream, 0, c.out);

    // cream face mask (muzzle + cheek + around eye)
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

  function backLeg(ctx, c, ink, x, y, OW, far) {
    const fur = far ? c.dark : c.mid;
    shape(ctx, () => { roundRect(ctx, x - 4, y, 8, 12, 3); }, fur, OW, c.out);   // thigh
    shape(ctx, () => { roundRect(ctx, x - 3.5, y + 9, 7, 11, 3); }, c.sock, OW, c.out); // sock
  }
  function frontLeg(ctx, c, ink, x, y, OW, far) {
    const fur = far ? c.dark : c.mid;
    shape(ctx, () => { roundRect(ctx, x - 3.5, y, 7, 11, 3); }, fur, OW, c.out);
    shape(ctx, () => { roundRect(ctx, x - 3, y + 8, 6, 11, 3); }, c.sock, OW, c.out);
  }
  // Classic-style leg (fox #2): taller straight thigh + black foot
  function classicLeg(ctx, c, ink, x, y, OW, far) {
    const fur = far ? c.dark : c.mid;
    shape(ctx, () => { roundRect(ctx, x - 4, y - 1, 8, 19, 4); }, fur, OW, c.out);     // long thigh
    shape(ctx, () => { roundRect(ctx, x - 4, y + 15, 8, 9, 3); }, ink, OW, c.out);     // black foot
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  window.FOX_KIT  = { id: 'kit',  name: 'Kit',  tag: 'cartoon sprite — detailed',
    draw: (ctx,cx,cy,r,ph,ink,ac,air) => drawKit(ctx,cx,cy,r,ph,ink,ac,air,'kit') };
  window.FOX_KIT2 = { id: 'kit2', name: 'Kit',  tag: 'Kit body + two legs',
    draw: (ctx,cx,cy,r,ph,ink,ac,air) => drawKit(ctx,cx,cy,r,ph,ink,ac,air,'two') };
})();

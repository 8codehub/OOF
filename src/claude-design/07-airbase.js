/* Level 8 — Airbase
   Same minimal Line Runner look. The extra flavour (planes, helicopters
   and slow searchlight beams) is just calm background decor drawn through
   the level hooks — it stays high in the sky / faint, so it never fights
   the fox, the coins or the line you draw. */
(window.LRLevels = window.LRLevels || []).push({
  // ---- Level-select UI ----
  n: 8,
  name: 'Airbase',
  sub: 'Eyes on the sky',
  locked: false,
  stars: 0,

  // ---- Game engine ----
  theme: 'airbase',          // unknown theme → engine just paints the plain sky
  speed: 176,
  gaps: 7,
  spikes: 4,
  saws: 2,
  len: 3000,

  // ---- Background decor (self-contained) ----
  onBuild(w){
    const rnd = (a,b)=> a + Math.random()*(b-a);
    w.airbase = {
      t: 0,
      cssW: 844, cssH: 390,
      planes: Array.from({length:2}, ()=>({
        x: rnd(40, 800), y: rnd(34, 78), v: rnd(26, 40)*(Math.random()<.5?1:-1), s: rnd(17, 23)
      })),
      helis: Array.from({length:2}, ()=>({
        x: rnd(40, 800), y: rnd(60, 104), v: rnd(13, 22)*(Math.random()<.5?1:-1), s: rnd(15, 19),
        bob: Math.random()*6.28
      })),
    };
  },

  onUpdate(w, dt){
    const A = w.airbase; if(!A) return;
    A.t += dt;
    const margin = 90, span = A.cssW + margin*2;
    for(const p of A.planes){
      p.x += p.v*dt;
      if(p.x >  A.cssW+margin){ p.x = -margin;          p.y = 34 + Math.random()*44; }
      if(p.x < -margin){        p.x =  A.cssW+margin;    p.y = 34 + Math.random()*44; }
    }
    for(const h of A.helis){
      h.x += h.v*dt; h.bob += dt*2.4;
      if(h.x >  A.cssW+margin){ h.x = -margin;        h.y = 60 + Math.random()*44; }
      if(h.x < -margin){        h.x =  A.cssW+margin;  h.y = 60 + Math.random()*44; }
    }
  },

  onRender(ctx, C, w){
    const A = w.airbase; if(!A) return;
    const m = ctx.getTransform();
    const dpr = m.a || 1;
    A.cssW = ctx.canvas.width / dpr;
    A.cssH = ctx.canvas.height / dpr;
    const baseY = w.baseY;

    // accent + ink as rgb (re-read so the settings colour-picker is respected)
    const ac = hex2rgb(C.accent), ik = hex2rgb(C.ink);
    const sil = a => `rgba(${ik[0]},${ik[1]},${ik[2]},${a})`;
    const acc = a => `rgba(${ac[0]},${ac[1]},${ac[2]},${a})`;

    ctx.save();
    ctx.translate(w.camX, 0);   // back to screen space (cancels the world camera)

    // ---- searchlight beams: ground-mounted, sweeping slowly, very faint ----
    const P = 470, par = 0.16;
    let shift = (w.camX*par) % P; if(shift < 0) shift += P;
    for(let x = -shift - P; x < A.cssW + P; x += P){
      const cx = x + P*0.5;
      const idx = Math.round((cx + w.camX*par) / P);
      const ang = Math.sin(A.t*0.55 + idx*1.7) * 0.46;     // sweep around vertical
      drawBeam(ctx, cx, baseY-6, ang, baseY*0.82, 0.058, acc);
      // little lamp at the base
      ctx.fillStyle = acc(0.55);
      ctx.beginPath(); ctx.arc(cx, baseY-6, 3, 0, 6.3); ctx.fill();
    }

    // ---- helicopters (a touch lower, slower) ----
    for(const h of A.helis) drawHeli(ctx, h, sil, A.t);
    // ---- planes (high, faster) ----
    for(const p of A.planes) drawPlane(ctx, p, sil);

    ctx.restore();
  },
});

/* ---------- decor drawing helpers (module scope) ---------- */
function hex2rgb(h){
  h = (h||'#000').trim();
  if(h[0]==='#') h = h.slice(1);
  if(h.length===3) h = h.split('').map(c=>c+c).join('');
  const n = parseInt(h,16);
  return [(n>>16)&255,(n>>8)&255,n&255];
}

function drawBeam(ctx, x, y, ang, L, alpha, acc){
  const half = 0.10;                       // ~6° cone
  ctx.save();
  ctx.translate(x, y); ctx.rotate(ang);    // 0 = straight up (-y)
  const sx = Math.tan(half)*L;
  const g = ctx.createLinearGradient(0, 0, 0, -L);
  g.addColorStop(0, acc(alpha));
  g.addColorStop(1, acc(0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-sx, -L); ctx.lineTo(sx, -L); ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPlane(ctx, p, sil){
  const s = p.s, dir = p.v >= 0 ? 1 : -1;
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(dir, 1);
  ctx.fillStyle = sil(0.34);
  ctx.beginPath(); ctx.ellipse(0, 0, s*0.5, s*0.12, 0, 0, 6.3); ctx.fill();         // fuselage
  ctx.beginPath();                                                                   // swept wings
  ctx.moveTo(s*0.06,0); ctx.lineTo(-s*0.08,-s*0.3); ctx.lineTo(s*0.02,-s*0.3);
  ctx.lineTo(s*0.16,0); ctx.lineTo(s*0.02,s*0.3); ctx.lineTo(-s*0.08,s*0.3); ctx.closePath(); ctx.fill();
  ctx.beginPath();                                                                   // tail
  ctx.moveTo(-s*0.42,0); ctx.lineTo(-s*0.5,-s*0.14); ctx.lineTo(-s*0.36,0);
  ctx.lineTo(-s*0.5,s*0.14); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawHeli(ctx, h, sil, t){
  const s = h.s, dir = h.v >= 0 ? 1 : -1;
  const yy = h.y + Math.sin(h.bob)*1.8;
  ctx.save(); ctx.translate(h.x, yy); ctx.scale(dir, 1);
  ctx.fillStyle = sil(0.34);
  ctx.beginPath(); ctx.ellipse(0, 0, s*0.42, s*0.2, 0, 0, 6.3); ctx.fill();          // body
  ctx.beginPath(); ctx.ellipse(s*0.3, s*0.02, s*0.16, s*0.14, 0, 0, 6.3); ctx.fill();// nose
  ctx.fillRect(-s*0.9, -s*0.05, s*0.5, s*0.07);                                      // tail boom
  ctx.beginPath();                                                                    // tail fin
  ctx.moveTo(-s*0.84,-s*0.03); ctx.lineTo(-s*0.92,-s*0.22); ctx.lineTo(-s*0.74,-s*0.03); ctx.closePath(); ctx.fill();
  ctx.fillRect(-s*0.28, s*0.22, s*0.58, s*0.03);                                      // skid
  ctx.fillRect(-s*0.02, -s*0.24, s*0.05, s*0.06);                                     // mast
  // spinning main rotor (edge-on disc — half length pulses)
  const rw = Math.abs(Math.cos(t*7 + h.bob))*s*0.85 + s*0.08;
  ctx.strokeStyle = sil(0.3); ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-rw, -s*0.26); ctx.lineTo(rw, -s*0.26); ctx.stroke();
  ctx.restore();
}

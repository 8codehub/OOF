/* ============================================================
   LINE RUNNER — draw-to-run game engine (vanilla canvas)
   The fox auto-runs right. Player drags to draw accent-colored
   ink platforms (limited by an ink budget, they fade after a
   couple seconds). Cross gaps, vault spikes & saws, grab coins,
   reach the flag.  Game.onWin / Game.onLose are set by app.js.

   Levels are defined in src/levels/*.js and registered via
   window.LRLevels before this file runs.

   Level hooks (optional, set on any level object):
     onBuild(world)           — called after world is built
     onUpdate(world, dt)      — called each frame after standard physics
     onRender(ctx, C, world)  — called after coins, before character
     character(ctx, x, y, r, phase, ink, accent, airborne)
                              — custom character draw; omit to use fox
   ============================================================ */
(function(){
  const cv = document.getElementById('play');
  // alpha:false lets the compositor skip the transparency pass — free perf win
  const ctx = cv.getContext('2d', { alpha: false });

  // theme palette pulled from CSS (re-read on tweak)
  let C = {};
  function readColors(){
    const cs = getComputedStyle(document.documentElement);
    const g = n => cs.getPropertyValue(n).trim();
    C = { ink:g('--ink'), ink2:g('--ink-2'), accent:g('--accent'),
          bg:g('--bg'), bg2:g('--bg-2'), hair:g('--hair'), surface:g('--surface') };
  }

  let W=844, H=390, dpr=1;
  function resize(){
    const r = cv.getBoundingClientRect();
    W = cv.clientWidth || 390; H = cv.clientHeight || 720;
    dpr = Math.min(window.devicePixelRatio||1, 2.0);
    cv.width = W*dpr; cv.height = H*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  let world=null, levelIdx=0, raf=0, running=false, lastT=0;

  // Cached HUD element refs + previous values to avoid redundant DOM writes
  let _hudFill=null, _hudDist=null, _hudCoins=null;
  let _prevDist=-1, _prevCoins=-1;

  // ---------- level audio ----------
  let _bgAudio = null;
  function startLevelAudio(levelN){
    stopLevelAudio();
    if(window.LRSettings && window.LRSettings.music === false) return;
    const url = window.__resources && window.__resources['level'+levelN+'-music'];
    if(!url) return;
    _bgAudio = new Audio(url);
    _bgAudio.loop = true;
    _bgAudio.volume = 0.55;
    _bgAudio.play().catch(()=>{});
  }
  function stopLevelAudio(){
    if(_bgAudio){ _bgAudio.pause(); _bgAudio.currentTime=0; _bgAudio=null; }
  }

  function buildWorld(idx){
    const L = window.LRLevels[idx];
    const baseY = H*0.74;
    const startX = 80;
    const worldEnd = startX + L.len;
    // ground intervals with gaps
    const segs=[]; const spikes=[]; const coins=[]; const saws=[];
    let x = startX-120;
    segs.push([x, startX+220]); x = startX+220;
    const gapXs=[];
    for(let i=0;i<L.gaps;i++){
      const run = 230 + Math.random()*200;
      const gap = 90 + Math.random()*60 + i*6;
      const solidStart = x;
      x += run;
      segs.push([solidStart, x]);
      gapXs.push([x, x+gap]);
      x += gap;
    }
    segs.push([x, worldEnd+260]);
    // spikes on solid ground
    for(let i=0;i<L.spikes;i++){
      const seg = segs[2+Math.floor(Math.random()*(segs.length-3))];
      const sx = seg[0]+60 + Math.random()*(seg[1]-seg[0]-160);
      spikes.push({x:sx, w:24+Math.random()*16});
    }
    // saws (moving vertical hazards over gaps/ground)
    for(let i=0;i<L.saws;i++){
      const gx = gapXs.length? gapXs[Math.floor(Math.random()*gapXs.length)] : [startX+600+i*500,0];
      const cxs = gx[0] + ( (gx[1]-gx[0])/2 || 0 );
      saws.push({x:cxs, y0:baseY-150, y1:baseY-18, t:Math.random()*6, sp:1.6+Math.random(), r:18});
    }
    // coins — arcs over gaps + sprinkled
    gapXs.forEach(g=>{
      const mid=(g[0]+g[1])/2, span=g[1]-g[0];
      for(let k=-1;k<=1;k++){
        coins.push({x:mid+k*30, y:baseY-90-Math.cos(k*0.9)*22+ (Math.abs(k)*8), got:false});
      }
    });
    for(let i=0;i<10;i++){
      coins.push({x:startX+300+Math.random()*(L.len-300), y:baseY-70-Math.random()*120, got:false});
    }
    const totalCoins = coins.length;

    world = {
      L, baseY, startX, worldEnd, segs, spikes, coins, saws, totalCoins,
      strokes:[],
      ink:1, inkRegen:0.16, drawing:null,
      fox:{ x:startX, y:baseY-15, r:15, vy:0, air:false, phase:0, dead:false, win:false },
      camX:0, coinsGot:0, t:0, hintShown:true, ended:false,
    };

    if(L.onBuild) L.onBuild(world);
  }

  // ---------- geometry helpers ----------
  function surfaceAt(x, minY){
    let best=null;
    for(const s of world.segs){
      if(s[0] > x) break;           // segs are left→right sorted; no point checking further
      if(x<=s[1]){ if(world.baseY>=minY && (best===null||world.baseY<best)) best=world.baseY; }
    }
    const strokesToCheck = world.drawing ? [...world.strokes, world.drawing] : world.strokes;
    for(const st of strokesToCheck){
      const p=st.pts;
      for(let i=0;i<p.length-1;i++){
        const a=p[i], b=p[i+1];
        const lo=Math.min(a.x,b.x), hi=Math.max(a.x,b.x);
        if(x>=lo && x<=hi && hi-lo>0.5){
          const tt=(x-a.x)/(b.x-a.x);
          const y=a.y + (b.y-a.y)*tt;
          if(y>=minY && (best===null || y<best)) best=y;
        }
      }
    }
    return best;
  }

  // ---------- input ----------
  function toWorld(e){
    const r = cv.getBoundingClientRect();
    const f = cv.clientWidth / r.width;
    const lx = (e.clientX - r.left)*f;
    const ly = (e.clientY - r.top)*f;
    return { x:lx + world.camX, y:ly, lx, ly };
  }
  function onDown(e){
    if(!running || !world) return; e.preventDefault();
    if(world.ink < 0.04) return;
    const p=toWorld(e);
    world.drawing = { pts:[{x:p.x,y:p.y}], born:world.t };
    if(world.hintShown){ world.hintShown=false; const h=document.getElementById('draw-hint'); if(h) h.style.opacity=0; }
  }
  function onMove(e){
    if(!running || !world.drawing) return; e.preventDefault();
    const p=toWorld(e);
    const pts=world.drawing.pts, last=pts[pts.length-1];
    const d=Math.hypot(p.x-last.x, p.y-last.y);
    if(d<6) return;
    if(world.ink<=0){ endStroke(); return; }
    world.ink = Math.max(0, world.ink - d/2600);
    pts.push({x:p.x,y:p.y});
  }
  function endStroke(){
    if(world.drawing && world.drawing.pts.length>1){
      world.drawing.born = world.t;
      world.strokes.push(world.drawing);
    }
    world.drawing=null;
  }
  function onUp(e){ if(world && world.drawing){ e.preventDefault(); endStroke(); } }

  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onUp);

  // ---------- update ----------
  const LIFE=2.4, FADE=0.7;
  function update(dt){
    const w=world, f=w.fox;
    w.t += dt;
    // ink regen
    w.ink = Math.min(1, w.ink + w.inkRegen*dt);
    // strokes lifetime
    for(const st of w.strokes){ st.age = w.t - st.born; }
    w.strokes = w.strokes.filter(st=> st.age < LIFE+FADE);

    if(f.dead || f.win) return;

    // horizontal — constant run (difficulty-scaled)
    f.x += w.L.speed*(window.LRSettings && window.LRSettings.diffMult || 1)*dt;
    f.phase += dt*14;
    w.camX = f.x - 116;

    // vertical / surface follow
    if(f.air){
      f.vy += 1700*dt;
      f.y += f.vy*dt;
      const s = surfaceAt(f.x, f.y - 4);
      if(s!==null && f.y+f.r >= s && f.vy>=0){
        f.y = s - f.r; f.vy=0; f.air=false;
        haptic();
      }
    } else {
      const s = surfaceAt(f.x, f.y - 46);
      if(s===null){ f.air=true; f.vy=0; }
      else {
        const targetCy = s - f.r;
        if(targetCy <= f.y + 12){ f.y = targetCy; }
        else { f.air=true; f.vy=0; }
      }
    }

    // saws
    for(const sw of w.saws){
      sw.t += dt*sw.sp;
      sw.cy = sw.y0 + (sw.y1-sw.y0)*(0.5-0.5*Math.cos(sw.t));
      if(Math.abs(sw.x - f.x) < sw.r+f.r-4 && Math.abs(sw.cy - f.y) < sw.r+f.r-4){ kill(); }
    }
    // spikes
    for(const sp of w.spikes){
      if(f.x > sp.x-sp.w/2 && f.x < sp.x+sp.w/2 && f.y+f.r > w.baseY-26){ kill(); }
    }
    // coins
    for(const c of w.coins){
      if(!c.got && Math.hypot(c.x-f.x, c.y-f.y) < f.r+12){ c.got=true; w.coinsGot++; haptic(); }
    }
    // fell
    if(f.y - f.r > H+40){ kill(); }
    // win
    if(f.x >= w.worldEnd){ doWin(); }

    // level custom update hook
    if(w.L.onUpdate) w.L.onUpdate(w, dt);
  }

  let lastHaptic=0;
  function haptic(){
    if(!window.LRSettings || !window.LRSettings.vibration) return;
    const now=performance.now(); if(now-lastHaptic<60) return; lastHaptic=now;
    if(navigator.vibrate) navigator.vibrate(8);
  }

  function kill(){
    if(world.fox.dead||world.fox.win) return;
    world.fox.dead=true;
    stopLevelAudio();
    if(navigator.vibrate && window.LRSettings && window.LRSettings.vibration) navigator.vibrate(40);
    setTimeout(()=>{ stop(); Game.onLose && Game.onLose(stats()); }, 520);
  }
  function doWin(){
    if(world.fox.win||world.fox.dead) return;
    world.fox.win=true;
    stopLevelAudio();
    setTimeout(()=>{ stop(); Game.onWin && Game.onWin(stats()); }, 420);
  }
  function stats(){
    const dist = Math.max(0, Math.round((world.fox.x - world.startX)/24));
    const ratio = world.totalCoins? world.coinsGot/world.totalCoins : 0;
    let stars = 1; if(ratio>=0.85) stars=3; else if(ratio>=0.5) stars=2;
    return { dist, coins:world.coinsGot, totalCoins:world.totalCoins, stars,
             level:levelIdx, name:world.L.name };
  }

  // ---------- render ----------
  function render(){
    const w=world, f=w.fox;
    const cx=w.camX, cxR=cx+W;  // viewport left / right in world coords

    // Fill background (alpha:false ctx — no clearRect needed, bg fill covers everything)
    drawBackground(w.L.theme, cx);

    ctx.save();
    ctx.translate(-cx, 0);

    // ---- ground silhouette — one batched path ----
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    for(const s of w.segs){
      if(s[1] < cx-40) continue;
      if(s[0] > cxR+40) break;
      ctx.rect(s[0], w.baseY, s[1]-s[0], H-w.baseY);
    }
    ctx.fill();

    // ---- ground lip highlight — one batched path ----
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    for(const s of w.segs){
      if(s[1] < cx-40) continue;
      if(s[0] > cxR+40) break;
      ctx.rect(s[0], w.baseY-3, s[1]-s[0], 3);
    }
    ctx.fill();

    // ---- spikes — one batched path ----
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    for(const sp of w.spikes){
      if(sp.x < cx-40 || sp.x > cxR+40) continue;
      const n=Math.max(2,Math.round(sp.w/12)), tw=sp.w/n;
      for(let i=0;i<n;i++){
        const bx=sp.x-sp.w/2 + i*tw;
        ctx.moveTo(bx, w.baseY);
        ctx.lineTo(bx+tw/2, w.baseY-24);
        ctx.lineTo(bx+tw, w.baseY);
        ctx.closePath();
      }
    }
    ctx.fill();

    // ---- flag (only when visible) ----
    if(w.worldEnd > cx-40 && w.worldEnd < cxR+120) drawFlag(w.worldEnd, w.baseY);

    // ---- saws ----
    for(const sw of w.saws){
      if(sw.x < cx-40 || sw.x > cxR+40) continue;
      drawSaw(sw.x, sw.cy||sw.y1, sw.r, w.t);
    }

    // ---- coins — one batched fill + one batched stroke ----
    const coinDark='color-mix(in oklab,'+C.accent+',#000 25%)';
    ctx.beginPath();
    for(const c of w.coins){
      if(c.got || c.x < cx-30 || c.x > cxR+30) continue;
      const bob=Math.sin(w.t*3 + c.x*0.05)*3;
      ctx.moveTo(c.x+9, c.y+bob);
      ctx.arc(c.x, c.y+bob, 9, 0, Math.PI*2);
    }
    ctx.fillStyle=C.accent; ctx.fill();
    ctx.lineWidth=2; ctx.strokeStyle=coinDark; ctx.stroke();

    // ---- ink strokes (viewport-culled, no shadowBlur) ----
    for(const st of w.strokes){
      const p=st.pts;
      if(!p.length) continue;
      // fast cull: check bounding x of stroke against viewport
      let sL=p[0].x, sR=p[0].x;
      for(let i=1;i<p.length;i++){ if(p[i].x<sL) sL=p[i].x; else if(p[i].x>sR) sR=p[i].x; }
      if(sR < cx-80 || sL > cxR+80) continue;
      const a=st.age<=LIFE ? 1 : 1-(st.age-LIFE)/FADE;
      drawStroke(p, a);
    }
    if(w.drawing) drawStroke(w.drawing.pts, 1);

    // ---- level custom render hook ----
    if(w.L.onRender) w.L.onRender(ctx, C, w);

    // ---- character ----
    const drawChar = w.L.character || LRFox.drawFoxCanvas;
    drawChar(ctx, f.x, f.y, f.r, f.phase, C.ink, C.accent, f.air);

    ctx.restore();

    // ---- HUD (lazy DOM updates — only write when value actually changes) ----
    if(_hudFill) _hudFill.style.transform='scaleX('+w.ink+')';
    const dist=Math.max(0, (f.x-w.startX)/24|0);
    if(dist!==_prevDist){ if(_hudDist) _hudDist.textContent=dist; _prevDist=dist; }
    if(w.coinsGot!==_prevCoins){ if(_hudCoins) _hudCoins.textContent=w.coinsGot; _prevCoins=w.coinsGot; }
  }

  function drawStroke(pts, alpha){
    if(pts.length<2) return;
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.strokeStyle=C.accent; ctx.lineWidth=7;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.restore();
  }

  function drawSaw(x,y,r,t){
    ctx.save(); ctx.translate(x,y); ctx.rotate(t*4);
    ctx.fillStyle=C.ink;
    const teeth=10;
    ctx.beginPath();
    for(let i=0;i<teeth*2;i++){
      const ang=(i/(teeth*2))*Math.PI*2;
      const rad= i%2? r : r*0.7;
      ctx.lineTo(Math.cos(ang)*rad, Math.sin(ang)*rad);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle=C.bg; ctx.beginPath(); ctx.arc(0,0,r*0.32,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawFlag(x,baseY){
    ctx.save();
    ctx.strokeStyle=C.ink; ctx.lineWidth=4; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x,baseY); ctx.lineTo(x,baseY-86); ctx.stroke();
    ctx.fillStyle=C.accent;
    ctx.beginPath(); ctx.moveTo(x,baseY-86); ctx.lineTo(x+40,baseY-74); ctx.lineTo(x,baseY-58); ctx.closePath(); ctx.fill();
    ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(x,baseY-88,5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // ---------- backgrounds ----------
  function drawBackground(theme, camX){
    ctx.fillStyle = C.bg; ctx.fillRect(0,0,W,H);
    const baseY=world.baseY;
    const para=(f)=> -(camX*f);
    if(theme==='meadow'){
      ctx.fillStyle=C.bg2;
      ctx.beginPath(); ctx.arc(W-70, 120, 38, 0, Math.PI*2); ctx.fill();
      hills(para(0.25), baseY-30, 120, 70, C.bg2);
      hills(para(0.45), baseY-10, 90, 50, C.hair);
    } else if(theme==='city'){
      skyline(para(0.2), baseY, 0.42, C.bg2);
      skyline(para(0.4), baseY, 0.7, C.hair);
    } else if(theme==='forest'){
      pines(para(0.22), baseY, 0.5, C.bg2, 150);
      pines(para(0.42), baseY, 0.8, C.hair, 110);
    } else if(theme==='cliffs'){
      ridges(para(0.2), baseY, 0.6, C.bg2);
      ridges(para(0.42), baseY, 0.95, C.hair);
    } else if(theme==='night'){
      ctx.fillStyle=C.bg2;
      ctx.beginPath();
      for(let i=0;i<60;i++){
        const sx=((i*97 + para(0.1))%(W+40))-20, sy=(i*53)%(baseY-60);
        ctx.rect(((sx%W)+W)%W, ~~sy, 2, 2);
      }
      ctx.fill();
      ctx.beginPath(); ctx.arc(W-72,108,34,0,Math.PI*2); ctx.fillStyle=C.hair; ctx.fill();
      ctx.beginPath(); ctx.arc(W-60,100,30,0,Math.PI*2); ctx.fillStyle=C.bg; ctx.fill();
      hills(para(0.4), baseY-6, 80, 46, C.hair);
    } else if(theme==='airbase'){
      // Night sky — deep old-movie Prussian blue gradient
      const skyGrad=ctx.createLinearGradient(0,0,0,baseY);
      skyGrad.addColorStop(0,  '#0b1a35');
      skyGrad.addColorStop(0.6,'#112244');
      skyGrad.addColorStop(1,  '#1a2e55');
      ctx.fillStyle=skyGrad; ctx.fillRect(0,0,W,H);

      // Stars — blue-white
      ctx.fillStyle='#c8d8f0'; ctx.globalAlpha=0.55;
      ctx.beginPath();
      for(let i=0;i<90;i++){
        const sx=~~(((i*137+para(0.04))%(W+40)+W+40)%W), sy=~~((i*61+7)%(baseY*0.78));
        ctx.rect(sx, sy, i%4===0?2:1, i%4===0?2:1);
      }
      ctx.fill(); ctx.globalAlpha=1;

      // Crescent moon — pale amber-white
      ctx.fillStyle='#e8dfc0';
      ctx.beginPath(); ctx.arc(W-84,52,20,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#0e2040';
      ctx.beginPath(); ctx.arc(W-75,47,17,0,Math.PI*2); ctx.fill();

      // Far hangars — two parallax layers, blue-tinted silhouettes
      const h1=para(0.18), h2=para(0.34);
      ctx.fillStyle='#2a4060';
      ctx.beginPath();
      for(let i=0;i<8;i++){
        const hx=~~(((h1+i*160)%W+W)%W)-10;
        const hw=80+(i*31%40), hh=42+(i*17%22);
        ctx.rect(hx, ~~(baseY-hh), hw, hh);
        ctx.moveTo(hx, ~~(baseY-hh)); ctx.lineTo(~~(hx+hw/2), ~~(baseY-hh-14)); ctx.lineTo(hx+hw, ~~(baseY-hh)); ctx.closePath();
      }
      ctx.fill();
      ctx.fillStyle='#1e3050';
      ctx.beginPath();
      for(let i=0;i<5;i++){
        const hx=~~(((h2+i*200+80)%W+W)%W)-10;
        const hw=110+(i*23%50), hh=60+(i*13%28);
        ctx.rect(hx, ~~(baseY-hh), hw, hh);
        ctx.moveTo(hx, ~~(baseY-hh)); ctx.lineTo(~~(hx+hw/2), ~~(baseY-hh-18)); ctx.lineTo(hx+hw, ~~(baseY-hh)); ctx.closePath();
      }
      ctx.fill();

      // Control tower
      const tx=~~(((para(0.22)+300)%W+W)%W);
      ctx.fillStyle='#2a4060';
      ctx.fillRect(tx, ~~(baseY-120), 18, 98);
      ctx.fillRect(tx-10, ~~(baseY-128), 38, 14);
      ctx.fillRect(tx+6, ~~(baseY-140), 6, 14);

    }
  }
  function tile(off,W2){ return ((off% W2)+W2)%W2; }
  function hills(off, y, w2, h, col){
    ctx.fillStyle=col; const step=w2;
    let x=-tile(-off,step)-step;
    ctx.beginPath(); ctx.moveTo(x,y+h);
    for(; x<W+step; x+=step){ ctx.quadraticCurveTo(x+step/2, y-h, x+step, y+h); }
    ctx.lineTo(W+step,H); ctx.lineTo(-step,H); ctx.closePath(); ctx.fill();
  }
  function skyline(off, baseY, scale, col){
    ctx.fillStyle=col; const unit=46;
    let x=-tile(-off,unit*2)-unit*2;
    ctx.beginPath();
    for(let i=0; x<W+unit; x+=unit, i++){
      const h=(60+(i*53%120))*scale;
      ctx.rect(~~x, ~~(baseY-h), unit-6, ~~h);
    }
    ctx.fill();
  }
  function pines(off, baseY, scale, col, h0){
    ctx.fillStyle=col; const unit=70;
    let x=-tile(-off,unit)-unit;
    ctx.beginPath();
    for(let i=0; x<W+unit; x+=unit, i++){
      const h=(h0+(i*37%50))*scale, w2=h*0.5;
      ctx.moveTo(~~x, baseY); ctx.lineTo(~~(x+w2/2), ~~(baseY-h)); ctx.lineTo(~~(x+w2), baseY); ctx.closePath();
    }
    ctx.fill();
  }
  function ridges(off, baseY, scale, col){
    ctx.fillStyle=col; const unit=130;
    let x=-tile(-off,unit)-unit;
    ctx.beginPath(); ctx.moveTo(x, baseY);
    for(let i=0; x<W+unit; x+=unit, i++){
      const h=(120+ (i*71%90))*scale;
      ctx.lineTo(x+unit/2, baseY-h); ctx.lineTo(x+unit, baseY);
    }
    ctx.lineTo(W+unit,H); ctx.lineTo(-unit,H); ctx.closePath(); ctx.fill();
  }

  // ---------- loop ----------
  function loop(ts){
    if(!running) return;
    const dt=Math.min(0.034, (ts-lastT)/1000 || 0); lastT=ts;
    update(dt); render();
    raf=requestAnimationFrame(loop);
  }

  // ---------- public ----------
  function start(idx){
    levelIdx = idx;
    readColors(); resize();
    buildWorld(idx);
    startLevelAudio(world.L.n);
    _hudFill=document.getElementById('ink-fill');
    _hudDist=document.getElementById('hud-dist');
    _hudCoins=document.getElementById('hud-coins');
    _prevDist=-1; _prevCoins=-1;
    const h=document.getElementById('draw-hint'); if(h){ h.style.opacity=1; }
    running=true; lastT=performance.now();
    cancelAnimationFrame(raf); raf=requestAnimationFrame(loop);
    render();
  }
  function pause(){ running=false; cancelAnimationFrame(raf); }
  function resume(){ if(running) return; readColors(); running=true; lastT=performance.now(); raf=requestAnimationFrame(loop); }
  function stop(){ running=false; cancelAnimationFrame(raf); stopLevelAudio(); }
  function restart(){ start(levelIdx); }

  function stageDemo(){
    if(!world) return; const f=world.fox, b=world.baseY;
    world.strokes.push({pts:[
      {x:f.x+24,y:b-8},{x:f.x+70,y:b-60},{x:f.x+150,y:b-78},{x:f.x+230,y:b-34}
    ], born:world.t});
    const hint=document.getElementById('draw-hint'); if(hint) hint.style.opacity=0;
    pause(); render();
  }

  window.addEventListener('resize', ()=>{ resize(); if(world) render(); });

  window.Game = { start, pause, resume, stop, restart, readColors, stageDemo,
                  onWin:null, onLose:null, get level(){return levelIdx;} };
})();

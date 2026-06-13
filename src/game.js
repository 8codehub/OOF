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
    let x = startX-300;   // extend left so the intro vehicle has ground under it
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
    segs.push([x, worldEnd+900]);
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

    // level hook runs even during win so the level can animate the fox
    if(w.L.onUpdate) w.L.onUpdate(w, dt);

    if(f.dead || f.win) return;

    // horizontal — constant run (difficulty-scaled)
    f.x += w.L.speed*(window.LRSettings && window.LRSettings.diffMult || 1)*dt;
    f.phase += dt*14;
    w.camX = f.x - (w.camOffset != null ? w.camOffset : 116);

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
    const proceed = ()=>{ stop(); Game.onWin && Game.onWin(stats()); };
    if(world.L.onWin && world.L.onWin(world, proceed)) return;
    setTimeout(proceed, 420);
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
    if(!f.hidden){
      const drawChar = w.L.character || LRFox.drawFoxCanvas;
      drawChar(ctx, f.x, f.y, f.r, f.phase, C.ink, C.accent, f.air);
    }

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
    if(theme==='nyc'){
      // Golden-hour sky
      const skyG=ctx.createLinearGradient(0,0,0,baseY);
      skyG.addColorStop(0,'#5a9fd4'); skyG.addColorStop(0.65,'#f5c07a'); skyG.addColorStop(1,'#e8896a');
      ctx.fillStyle=skyG; ctx.fillRect(0,0,W,H);
      // Far buildings
      skyline(para(0.16), baseY, 0.44, '#c9c4b8');
      // Near buildings with a spike (Empire State silhouette inserted)
      const p2=para(0.34);
      skyline(p2, baseY, 0.76, '#a09890');
      // Empire State spike (index position: roughly centre of near layer)
      { const ex=~~(((p2+300)%(W+120)+W+120)%W)-10;
        for(const dx of [0,-W,W]){
          const bx=~~(ex+dx); if(bx+28<0||bx-28>W) continue;
          ctx.fillStyle='#a09890';
          ctx.fillRect(bx,~~(baseY-144),28,90);         // body
          ctx.beginPath(); ctx.moveTo(bx-2,~~(baseY-144));
          ctx.lineTo(bx+14,~~(baseY-186)); ctx.lineTo(bx+30,~~(baseY-144)); ctx.closePath(); ctx.fill(); // spire
        }
      }
      // Statue of Liberty — detailed verdigris figure, very slow parallax.
      const lt=world ? world.t : 0;
      const lx=~~(((para(0.055)+90)%(W+220)+W+220)%W)-60;
      // Friendly greeting wave: the raised torch arm sways gently.
      const wave = Math.sin(lt*2.2);
      // Export the nearest-to-centre statue's mouth (screen coords) so the
      // level can anchor a speech bubble there.
      world.statueMouthX = null; world.statueMouthY = null;
      let _stBest = 1e9;
      for(const dx of [0,-W,W]){
        const sx=~~(lx+dx); if(sx+80<0||sx-80>W) continue;
        const by=baseY;
        { const d=Math.abs(sx+1-W/2); if(d<_stBest){ _stBest=d; world.statueMouthX=sx+4; world.statueMouthY=by-167; } }
        // Verdigris palette with a consistent light-from-left scheme
        const green='#7DB6A0', greenDk='#5A917C', greenLt='#9BCBB4', greenSh='#4C7E6A',
              stone='#cfc9bb', stoneDk='#aea796';

        // ============ PEDESTAL (granite star-fort base) ============
        ctx.fillStyle=stoneDk;
        ctx.fillRect(sx-34,~~(by-30),68,30);          // wide foundation
        ctx.fillStyle=stone;
        ctx.fillRect(sx-31,~~(by-30),62,4);           // foundation cap
        ctx.fillStyle=stoneDk;
        ctx.fillRect(sx-25,~~(by-56),50,26);          // mid pedestal
        // Pedestal columns (vertical relief)
        ctx.strokeStyle=stone; ctx.lineWidth=1.2;
        for(let k=-2;k<=2;k++){ ctx.beginPath(); ctx.moveTo(sx+k*9,~~(by-54)); ctx.lineTo(sx+k*9,~~(by-32)); ctx.stroke(); }
        ctx.fillStyle=stone;
        ctx.fillRect(sx-19,~~(by-68),38,12);          // plinth the statue stands on
        ctx.fillStyle=stoneDk;
        ctx.fillRect(sx-19,~~(by-58),38,2);

        // ============ ROBE / GOWN (flowing draped toga) ============
        ctx.fillStyle=green;
        ctx.beginPath();
        ctx.moveTo(sx-19,~~(by-68));                          // left hem
        ctx.quadraticCurveTo(sx-20,~~(by-110), sx-13,~~(by-138)); // left side, waist pinch
        ctx.quadraticCurveTo(sx-12,~~(by-150), sx-9,~~(by-156)); // up to left shoulder
        ctx.lineTo(sx+9,~~(by-156));                          // shoulder line
        ctx.quadraticCurveTo(sx+13,~~(by-150), sx+14,~~(by-138)); // right shoulder down
        ctx.quadraticCurveTo(sx+21,~~(by-108), sx+19,~~(by-68));  // right side to hem
        ctx.quadraticCurveTo(sx,~~(by-62), sx-19,~~(by-68));      // curved hem
        ctx.closePath(); ctx.fill();
        // Shaded (right/dark) half of gown for volume
        ctx.fillStyle=greenDk;
        ctx.beginPath();
        ctx.moveTo(sx+2,~~(by-156));
        ctx.quadraticCurveTo(sx+13,~~(by-150), sx+14,~~(by-138));
        ctx.quadraticCurveTo(sx+21,~~(by-108), sx+19,~~(by-68));
        ctx.quadraticCurveTo(sx+9,~~(by-64), sx+3,~~(by-66));
        ctx.closePath(); ctx.fill();
        // Drapery fold lines
        ctx.strokeStyle=greenSh; ctx.lineWidth=1.3; ctx.lineCap='round';
        ctx.beginPath();
        ctx.moveTo(sx-9,~~(by-150)); ctx.quadraticCurveTo(sx-12,~~(by-110), sx-10,~~(by-70));
        ctx.moveTo(sx-1,~~(by-148)); ctx.quadraticCurveTo(sx-2,~~(by-108), sx-1,~~(by-68));
        ctx.moveTo(sx+7,~~(by-148)); ctx.quadraticCurveTo(sx+9,~~(by-106), sx+8,~~(by-70));
        ctx.stroke();
        // Gathered sash across waist
        ctx.strokeStyle=greenLt; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(sx-13,~~(by-128)); ctx.quadraticCurveTo(sx,~~(by-122), sx+14,~~(by-130)); ctx.stroke();
        // Foot/sandal peeking from hem
        ctx.fillStyle=greenDk;
        ctx.fillRect(sx-15,~~(by-66),10,5);

        // ============ TABLET (held in left arm) ============
        ctx.save();
        ctx.translate(sx-15,~~(by-98)); ctx.rotate(0.42);
        ctx.fillStyle=greenSh;                               // tablet edge (shadow)
        ctx.fillRect(-8,-3,17,24);
        ctx.fillStyle=greenLt;                               // tablet face
        ctx.fillRect(-7,-2,15,22);
        ctx.strokeStyle=greenDk; ctx.lineWidth=0.9;          // engraved inscription lines
        for(let r=0;r<4;r++){ ctx.beginPath(); ctx.moveTo(-4,2+r*5); ctx.lineTo(5,2+r*5); ctx.stroke(); }
        ctx.restore();
        // Left forearm crossing over the tablet
        ctx.fillStyle=green;
        ctx.beginPath();
        ctx.moveTo(sx-9,~~(by-128)); ctx.lineTo(sx-15,~~(by-90));
        ctx.lineTo(sx-8,~~(by-88)); ctx.lineTo(sx-2,~~(by-126)); ctx.closePath(); ctx.fill();
        ctx.fillStyle=greenDk;
        ctx.fillRect(sx-15,~~(by-92),5,4);                   // hand on tablet

        // ============ HEAD + NECK (three-quarter, facing the fox/right) ============
        ctx.fillStyle=greenDk;
        ctx.fillRect(sx-3,~~(by-162),6,8);                   // neck
        ctx.fillStyle=green;                                 // head (oval)
        ctx.beginPath(); ctx.ellipse(sx+1,~~(by-169),7.5,9,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=greenLt;                               // lit left cheek
        ctx.beginPath(); ctx.ellipse(sx-1,~~(by-170),4.5,6,0,0,Math.PI*2); ctx.fill();
        // Nose/brow profile bump (faces right)
        ctx.fillStyle=green;
        ctx.beginPath();
        ctx.moveTo(sx+7,~~(by-172)); ctx.quadraticCurveTo(sx+11,~~(by-169), sx+7,~~(by-166));
        ctx.closePath(); ctx.fill();

        // ============ SEVEN-SPIKE RADIANT CROWN ============
        ctx.fillStyle=greenDk;
        ctx.beginPath(); ctx.ellipse(sx+1,~~(by-177),9,4,0,Math.PI,0); ctx.fill(); // crown band
        ctx.fillStyle=greenLt;
        for(let k=0;k<7;k++){
          const a=-Math.PI*0.94 + (k/6)*Math.PI*0.88;        // radiate across the top
          const cxk=sx+1+Math.cos(a)*9, cyk=(by-177)+Math.sin(a)*7;
          ctx.save(); ctx.translate(cxk,~~cyk); ctx.rotate(a+Math.PI/2);
          ctx.beginPath(); ctx.moveTo(-2,0); ctx.lineTo(0,-13); ctx.lineTo(2,0); ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        // ============ RAISED RIGHT ARM + TORCH (the wave) ============
        ctx.save();
        ctx.translate(sx+9,~~(by-150));
        ctx.rotate(-0.16 + wave*0.15);                       // gentle greeting sway
        // Upper arm (with draped sleeve flaring at shoulder)
        ctx.fillStyle=green;
        ctx.beginPath();
        ctx.moveTo(-5,2); ctx.lineTo(-4,-56); ctx.lineTo(4,-56); ctx.lineTo(5,2);
        ctx.quadraticCurveTo(0,6,-5,2); ctx.closePath(); ctx.fill();
        ctx.fillStyle=greenDk;
        ctx.fillRect(1,-56,4,58);                            // arm shadow side
        // Sleeve drape near shoulder
        ctx.fillStyle=greenLt;
        ctx.beginPath(); ctx.moveTo(-5,0); ctx.lineTo(-8,8); ctx.lineTo(-2,6); ctx.closePath(); ctx.fill();
        // Torch handle + cup
        ctx.fillStyle='#8f7f4f';
        ctx.fillRect(-3,-66,6,12);                           // handle
        ctx.fillStyle='#c9b87a';
        ctx.beginPath();                                     // golden cup
        ctx.moveTo(-7,-66); ctx.lineTo(7,-66); ctx.lineTo(4,-74); ctx.lineTo(-4,-74); ctx.closePath(); ctx.fill();
        // Flame (flicker + glow)
        const fl=3+Math.sin(lt*9)*0.9;
        const fg=ctx.createRadialGradient(0,-80,1,0,-80,14+fl);
        fg.addColorStop(0,'rgba(255,247,205,0.97)');
        fg.addColorStop(0.45,'rgba(255,200,70,0.8)');
        fg.addColorStop(1,'rgba(255,150,30,0)');
        ctx.fillStyle=fg;
        ctx.beginPath(); ctx.arc(0,-80,14+fl,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#FFE08A';
        ctx.beginPath();
        ctx.moveTo(-4,-74); ctx.quadraticCurveTo(-3,-90-fl,0,-94-fl);
        ctx.quadraticCurveTo(3,-90-fl,4,-74);
        ctx.quadraticCurveTo(2,-70,0,-72); ctx.quadraticCurveTo(-2,-70,-4,-74);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle='#FFF6D0';                             // hot core
        ctx.beginPath(); ctx.ellipse(0,-80,1.8,5,0,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
    } else if(theme==='meadow'){
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

      // Helper: draw a building at a given x, trying all three wrap copies so it
      // exits fully off-screen before vanishing (fixes the abrupt pop/disappear).
      function bldg(hx, hw, hh, pitched, roofH){
        for(const dx of [0, -W, W]){
          const x=~~(hx+dx);
          if(x+hw<-2 || x>W+2) continue;
          ctx.rect(x, ~~(baseY-hh), hw, hh);
          if(pitched) { ctx.moveTo(x,~~(baseY-hh)); ctx.lineTo(~~(x+hw/2),~~(baseY-hh-roofH)); ctx.lineTo(x+hw,~~(baseY-hh)); ctx.closePath(); }
        }
      }

      const h1=para(0.18), h2=para(0.34), hH=para(0.085);

      // Layer-1 buildings (far, slow)
      ctx.fillStyle='#2a4060';
      ctx.beginPath();
      for(let i=0;i<8;i++){
        const hx=((h1+i*160)%W+W)%W-10;
        bldg(hx, 80+(i*31%40), 42+(i*17%22), true, 14);
      }
      ctx.fill();

      // Military observation tower — drawn before H building so it renders behind it
      {
        const txBase=((para(0.22)+300)%W+W)%W;
        for(const dx of [0,-W,W]){
          const tx=~~(txBase+dx);
          if(tx+40<0 || tx-40>W) continue;
          ctx.fillStyle='#2a4060';
          // A-frame support legs
          ctx.beginPath();
          ctx.moveTo(tx-22,~~baseY); ctx.lineTo(tx-4,~~(baseY-140));
          ctx.lineTo(tx+4,~~(baseY-140)); ctx.lineTo(tx+22,~~baseY); ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(tx-16,~~baseY); ctx.lineTo(tx-2,~~(baseY-140));
          ctx.lineTo(tx+2,~~(baseY-140)); ctx.lineTo(tx+16,~~baseY); ctx.closePath();
          ctx.fillStyle='#0e2040'; ctx.fill(); // hollow centre
          // Observation cab
          ctx.fillStyle='#2a4060';
          ctx.fillRect(tx-18,~~(baseY-175),36,22);
          // Window slit
          ctx.fillStyle='#0e2040';
          ctx.fillRect(tx-12,~~(baseY-172),24,8);
          // Thin antenna
          ctx.fillStyle='#2a4060';
          ctx.fillRect(tx-1,~~(baseY-197),2,16);
          // Red blinking tip (accent)
          ctx.fillStyle=C.accent;
          ctx.beginPath(); ctx.arc(tx,~~(baseY-198),2.5,0,Math.PI*2); ctx.fill();
        }
      }

      // Layer-2 buildings (near) — H building (index 3) drawn separately with slow parallax
      ctx.fillStyle='#1e3050';
      ctx.beginPath();
      for(let i=0;i<5;i++){
        if(i===3) continue;
        const hx=((h2+i*200+80)%W+W)%W-10;
        bldg(hx, 110+(i*23%50), 60+(i*13%28), true, 18);
      }
      ctx.fill();

      // H building — 4× slower parallax (0.085) so it sits deep in the background
      ctx.fillStyle='#1e3050';
      ctx.beginPath();
      { const hx=((hH+3*200+80)%W+W)%W-10; bldg(hx, 129, 150, false, 0); }
      ctx.fill();

      // H marker on helipad — tracks with the slow H building
      ctx.strokeStyle='rgba(180,210,255,0.75)'; ctx.lineWidth=2;
      {
        const hxBase=((hH+3*200+80)%W+W)%W-10, hw=129, ty=~~(baseY-150);
        for(const dx of [0,-W,W]){
          const cx=~~(hxBase+dx)+hw/2;
          if(cx+14<0 || cx-14>W) continue;
          ctx.beginPath();
          ctx.moveTo(cx-7,ty+5);  ctx.lineTo(cx-7,ty+17);
          ctx.moveTo(cx+7,ty+5);  ctx.lineTo(cx+7,ty+17);
          ctx.moveTo(cx-7,ty+11); ctx.lineTo(cx+7,ty+11);
          ctx.stroke();
        }
      }

    } else if(theme==='moon'){
      // Deep space gradient
      const skyG=ctx.createLinearGradient(0,0,0,H);
      skyG.addColorStop(0,'#000008');
      skyG.addColorStop(0.5,'#04041c');
      skyG.addColorStop(1,'#0a0825');
      ctx.fillStyle=skyG; ctx.fillRect(0,0,W,H);

      // Dense starfield — two layers, different densities/colours
      ctx.beginPath();
      for(let i=0;i<200;i++){
        const sx=~~(((i*137+para(0.02))%(W+40)+W+40)%W);
        const sy=~~((i*73+11)%(baseY*0.93));
        ctx.rect(sx,sy,i%5===0?2:1,i%5===0?2:1);
      }
      ctx.fillStyle='#ffffff'; ctx.globalAlpha=0.52; ctx.fill(); ctx.globalAlpha=1;
      ctx.beginPath();
      for(let i=0;i<70;i++){
        const sx=~~(((i*211+para(0.01))%(W+40)+W+40)%W);
        const sy=~~((i*97+43)%(baseY*0.88));
        ctx.rect(sx,sy,1,1);
      }
      ctx.fillStyle='#a0c0ff'; ctx.globalAlpha=0.38; ctx.fill(); ctx.globalAlpha=1;

      // Earth — large blue globe in upper-right, very slow parallax
      const ex=~~(W*0.76+para(0.015)), ey=78, er=58;
      // Atmospheric halo
      const ag=ctx.createRadialGradient(ex,ey,er*0.88,ex,ey,er*1.5);
      ag.addColorStop(0,'rgba(60,130,220,0.18)'); ag.addColorStop(1,'rgba(60,130,220,0)');
      ctx.fillStyle=ag; ctx.beginPath(); ctx.arc(ex,ey,er*1.5,0,Math.PI*2); ctx.fill();
      // Ocean
      ctx.fillStyle='#1a6aab';
      ctx.beginPath(); ctx.arc(ex,ey,er,0,Math.PI*2); ctx.fill();
      // Continents (clipped to globe)
      ctx.save();
      ctx.beginPath(); ctx.arc(ex,ey,er,0,Math.PI*2); ctx.clip();
      ctx.fillStyle='#2d8a4e';
      ctx.beginPath(); ctx.ellipse(ex-er*0.10,ey+er*0.06,er*0.18,er*0.28,0.3,0,Math.PI*2); ctx.fill(); // Africa
      ctx.beginPath(); ctx.ellipse(ex-er*0.04,ey-er*0.22,er*0.30,er*0.15,-0.2,0,Math.PI*2); ctx.fill(); // Eurasia
      ctx.beginPath(); ctx.ellipse(ex-er*0.38,ey-er*0.06,er*0.12,er*0.22,0.1,0,Math.PI*2); ctx.fill(); // Americas
      ctx.beginPath(); ctx.ellipse(ex+er*0.28,ey+er*0.24,er*0.10,er*0.08,0.5,0,Math.PI*2); ctx.fill(); // Australia
      // Cloud wisps
      ctx.fillStyle='rgba(255,255,255,0.30)';
      ctx.beginPath(); ctx.ellipse(ex+er*0.08,ey-er*0.38,er*0.24,er*0.07,0.8,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(ex-er*0.22,ey+er*0.28,er*0.18,er*0.06,-0.4,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(ex+er*0.14,ey+er*0.08,er*0.11,er*0.04,0.6,0,Math.PI*2); ctx.fill();
      ctx.restore();
      // Atmosphere limb glow
      const rim=ctx.createRadialGradient(ex,ey,er*0.74,ex,ey,er);
      rim.addColorStop(0,'rgba(80,170,255,0)'); rim.addColorStop(1,'rgba(80,170,255,0.40)');
      ctx.fillStyle=rim; ctx.beginPath(); ctx.arc(ex,ey,er,0,Math.PI*2); ctx.fill();
      // Specular highlight
      const hi=ctx.createRadialGradient(ex-er*0.30,ey-er*0.35,0,ex,ey,er);
      hi.addColorStop(0,'rgba(255,255,255,0.20)');
      hi.addColorStop(0.38,'rgba(255,255,255,0.04)');
      hi.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=hi; ctx.beginPath(); ctx.arc(ex,ey,er,0,Math.PI*2); ctx.fill();

      // Background lunar mountains — far layer
      ctx.fillStyle='#141420';
      ctx.beginPath();
      for(let i=0;i<11;i++){
        const mx=((para(0.14)+i*118)%(W+130)+W+130)%W-20;
        const mh=36+(i*37%28), mw=88+(i*23%40);
        ctx.moveTo(~~mx,baseY-1);
        ctx.quadraticCurveTo(~~(mx+mw/2),~~(baseY-mh),~~(mx+mw),baseY-1);
      }
      ctx.fill();
      // Near terrain layer
      ctx.fillStyle='#0e0e1a';
      ctx.beginPath();
      for(let i=0;i<8;i++){
        const mx=((para(0.28)+i*155)%(W+165)+W+165)%W-20;
        const mh=20+(i*29%18), mw=125+(i*31%50);
        ctx.moveTo(~~mx,baseY-1);
        ctx.quadraticCurveTo(~~(mx+mw/2),~~(baseY-mh),~~(mx+mw),baseY-1);
      }
      ctx.fill();

      // Surface craters (shallow ellipses on horizon)
      ctx.strokeStyle='rgba(80,80,130,0.35)'; ctx.lineWidth=1.5;
      for(let i=0;i<6;i++){
        const cx2=~~(((para(0.10)+i*190+55)%(W+40)+W+40)%W);
        const cy2=~~(baseY-12-(i*23%16)), cr=9+(i*11%9);
        ctx.beginPath();
        ctx.ellipse(cx2,cy2,cr,cr*0.34,0,0,Math.PI*2);
        ctx.stroke();
      }
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

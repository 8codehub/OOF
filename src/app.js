/* ============================================================
   LINE RUNNER — app shell: routing, level select, settings,
   overlays, confetti, device fit.  Bridges to Game (game.js)
   and the Tweaks panel (tweaks.jsx via window.LRApplyTweaks).

   Level data comes from window.LRLevels (populated by
   src/levels/*.js files before this script runs).
   ============================================================ */
(function(){

  // settings (read by game.js for haptics/difficulty)
  window.LRSettings = { sound:true, music:true, vibration:false, playful:true, diffMult:1, lang:0 };
  const LANGS = ['English','Español','Français','Deutsch','日本語','Português'];

  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  // Derive highest unlocked level index (1-based) from the registry
  function highestUnlocked(){
    const lvls = window.LRLevels || [];
    let max = 0;
    lvls.forEach((l, i) => { if(!l.locked) max = i + 1; });
    return max;
  }

  // ---- routing ----
  const SCREENS = ['home','levels','game','settings'];
  const OVERLAYS = ['pause','complete','gameover'];
  let prev = 'home';
  let lastGameLevel = 0;

  function show(id){
    SCREENS.forEach(s=>{ const el=$('#scr-'+s); if(el) el.classList.toggle('active', s===id); });
    window.__screen = id;
  }
  function go(id){
    if(window.__screen && window.__screen!==id) prev = window.__screen;
    closeOverlays();
    show(id);
    if(id!=='game') Game.pause();
  }
  function overlay(id, on){
    const el=$('#ov-'+id); if(el) el.classList.toggle('active', on!==false);
  }
  function closeOverlays(){ OVERLAYS.forEach(o=>{ const el=$('#ov-'+o); if(el) el.classList.remove('active'); }); }

  // ---- level select render ----
  function thumb(theme){
    const I='var(--ink-3)';
    if(theme==='meadow') return `<svg viewBox="0 0 88 88"><circle cx="64" cy="26" r="10" fill="${I}" opacity=".4"/><path d="M0 70 Q22 40 44 70 T88 70 V88 H0Z" fill="${I}" opacity=".28"/></svg>`;
    if(theme==='city')   return `<svg viewBox="0 0 88 88"><g fill="${I}" opacity=".32"><rect x="14" y="40" width="14" height="40"/><rect x="32" y="26" width="14" height="54"/><rect x="50" y="48" width="14" height="32"/><rect x="66" y="34" width="10" height="46"/></g></svg>`;
    if(theme==='forest') return `<svg viewBox="0 0 88 88"><g fill="${I}" opacity=".32"><path d="M22 72 L34 36 L46 72Z"/><path d="M44 74 L58 30 L72 74Z"/></g></svg>`;
    if(theme==='cliffs') return `<svg viewBox="0 0 88 88"><path d="M0 76 L20 40 L36 62 L54 28 L74 60 L88 44 V88 H0Z" fill="${I}" opacity=".3"/></svg>`;
    if(theme==='night')  return `<svg viewBox="0 0 88 88"><g fill="${I}" opacity=".4"><circle cx="60" cy="28" r="12"/><circle cx="66" cy="24" r="11" fill="var(--surface)"/><circle cx="22" cy="22" r="2"/><circle cx="38" cy="40" r="2"/><circle cx="18" cy="52" r="2"/></g></svg>`;
    // fallback thumb for custom level themes
    if(typeof theme === 'string' && window['LRThumb_'+theme]) return window['LRThumb_'+theme]();
    return `<svg viewBox="0 0 88 88"><circle cx="44" cy="44" r="28" fill="${I}" opacity=".3"/></svg>`;
  }
  function starRow(n, locked){
    if(locked) return `<span class="lock"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></span>`;
    let h='<div class="stars">';
    for(let i=0;i<3;i++) h+=`<span class="star ${i<n?'on':''}"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.8.7-5.1 4.6 1.4 6.7L12 17.8 6 20.3l1.4-6.7L2.3 9l6.8-.7z"/></svg></span>`;
    return h+'</div>';
  }
  function renderLevels(){
    const wrap=$('#lv-nodes'); if(!wrap) return;
    const hu = highestUnlocked();
    wrap.innerHTML = (window.LRLevels || []).map((L,i)=>{
      const side = i%2 ? 'right' : 'left';
      const cls = L.locked ? 'lv-locked' : 'unlocked';
      const cur = (!L.locked && L.n===hu) ? 'current' : '';
      return `<div class="lv-node ${side} ${cls} ${cur}" data-level="${i}" ${L.locked?'data-locked="1"':''}>
        <div class="lv-badge"><div class="lv-thumb">${thumb(L.theme)}</div><span class="lv-num">${L.n}</span></div>
        <div class="lv-meta">
          <div class="lv-name">${L.locked?'Locked':L.name}</div>
          <div class="lv-sub">${L.locked?'Clear level '+(L.n-1):L.sub}</div>
          ${starRow(L.stars, L.locked)}
        </div>
      </div>`;
    }).join('');
  }

  // ---- start a level ----
  function startLevel(idx){
    lastGameLevel = idx;
    closeOverlays();
    show('game');
    window.__screen='game';
    Game.start(idx);
  }

  // ---- win / lose ----
  Game.onWin = (st)=>{
    $('#win-coins').textContent = st.coins;
    $('#win-dist').textContent = st.dist;
    const stars=$$('#win-stars .wstar');
    stars.forEach((s,i)=> s.classList.toggle('on', i<st.stars));
    const ov=$('#ov-complete'); ov.classList.remove('active'); void ov.offsetWidth;
    overlay('complete', true);
    startConfetti();
  };
  Game.onLose = (st)=>{
    $('#go-dist').textContent = st.dist;
    const msgs = st.dist<30
      ? ['Gravity: 1. You: 0. Draw sooner!','Blink and you fall. Try again?']
      : ['So close — the line giveth, and the line taketh away.','Nice run. One more line and you had it.','The fox believes in you. Mostly.'];
    $('#go-msg').textContent = msgs[Math.floor(Math.random()*msgs.length)];
    overlay('gameover', true);
  };

  // ---- confetti ----
  let confR=0;
  function startConfetti(){
    const cv=$('#confetti'); if(!cv) return;
    const ctx=cv.getContext('2d');
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=cv.clientWidth, h=cv.clientHeight;
    cv.width=w*dpr; cv.height=h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    const cs=getComputedStyle(document.documentElement);
    const acc=cs.getPropertyValue('--accent').trim(), ink=cs.getPropertyValue('--ink').trim(), sur=cs.getPropertyValue('--surface').trim();
    const cols=[acc,acc,ink,sur];
    const P=[];
    for(let i=0;i<90;i++) P.push({x:w/2+(Math.random()-.5)*120, y:h*0.36, vx:(Math.random()-.5)*260, vy:-180-Math.random()*260,
      s:5+Math.random()*7, r:Math.random()*6, vr:(Math.random()-.5)*10, c:cols[i%cols.length], shape:Math.random()<.5?0:1});
    let t0=performance.now();
    cancelAnimationFrame(confR);
    (function frame(t){
      const dt=Math.min(0.033,(t-t0)/1000); t0=t;
      ctx.clearRect(0,0,w,h);
      let alive=false;
      for(const p of P){
        p.vy+=520*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.r+=p.vr*dt;
        if(p.y<h+20) alive=true;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle=p.c;
        if(p.shape) ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s);
        else { ctx.beginPath(); ctx.arc(0,0,p.s/2,0,Math.PI*2); ctx.fill(); }
        ctx.restore();
      }
      if(alive && $('#ov-complete').classList.contains('active')) confR=requestAnimationFrame(frame);
    })(t0);
  }

  // ---- action delegation ----
  document.addEventListener('click', (e)=>{
    const t = e.target.closest('[data-action], .lv-node');
    if(!t) return;
    const a = t.dataset.action;

    if(t.classList.contains('lv-node') && !a){
      if(t.dataset.locked){ shake(t); return; }
      startLevel(parseInt(t.dataset.level,10)); return;
    }
    const hu = highestUnlocked();
    switch(a){
      case 'go-home': go('home'); break;
      case 'go-levels': go('levels'); break;
      case 'go-settings': prev = window.__screen||'home'; overlay('pause',false); show('settings'); window.__screen='settings'; break;
      case 'back': go(prev==='settings'?'home':prev); break;
      case 'play': startLevel(hu-1); break;
      case 'pause': Game.pause(); overlay('pause',true); break;
      case 'resume': overlay('pause',false); Game.resume(); break;
      case 'restart': closeOverlays(); startLevel(lastGameLevel); break;
      case 'retry': closeOverlays(); startLevel(lastGameLevel); break;
      case 'next-level': closeOverlays(); startLevel(Math.min((window.LRLevels||[]).length-1, lastGameLevel+1)); break;
      case 'quit': Game.stop(); go('home'); break;
      case 'cycle-lang': window.LRSettings.lang=(window.LRSettings.lang+1)%LANGS.length; $('#lang-val').textContent=LANGS[window.LRSettings.lang]; break;
      case 'restart-progress': flashRestart(t); break;
    }
  });

  // toggles
  document.addEventListener('click',(e)=>{
    const tg=e.target.closest('.toggle'); if(!tg) return;
    tg.classList.toggle('on');
    const k=tg.dataset.setting; if(!k) return;
    window.LRSettings[k]=tg.classList.contains('on');
    if(k==='playful'){
      document.getElementById('device')?.classList.toggle('no-motion', !window.LRSettings.playful);
    }
  });

  // difficulty segmented control
  document.addEventListener('click',(e)=>{
    const btn=e.target.closest('.seg-btn'); if(!btn) return;
    const ctrl=btn.closest('.seg-ctrl'); if(!ctrl) return;
    ctrl.querySelectorAll('.seg-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    window.LRSettings.diffMult = parseFloat(btn.dataset.diff) || 1;
  });

  // color picker (accent swatches in settings)
  document.addEventListener('pointerdown',(e)=>{
    const sw=e.target.closest('.cp-sw'); if(!sw) return;
    const color=sw.dataset.c; if(!color) return;
    const root=document.documentElement.style;
    root.setProperty('--accent', color);
    root.setProperty('--accent-soft', color+'1f');
    if(window.Game) Game.readColors();
    document.querySelectorAll('.cp-sw').forEach(s=>s.classList.toggle('active', s.dataset.c===color));
  });

  function shake(el){ el.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:260}); }
  function flashRestart(btn){
    btn.textContent='Progress reset ✓'; btn.style.color='var(--accent)';
    setTimeout(()=>{ btn.textContent='Restart Progress'; btn.style.color='var(--ink)'; }, 1400);
  }

  // ---- tweaks bridge (called from tweaks.jsx) ----
  window.LRApplyTweaks = (t)=>{
    const root=document.documentElement.style;
    if(t.accent){ root.setProperty('--accent', t.accent); root.setProperty('--accent-soft', t.accent+'1f'); }
    if(t.foxAccent){ root.setProperty('--fox-acc', t.foxAccent); }
    if(window.Game) Game.readColors();
  };

  // ---- device fit ----
  function fit(){
    const dev=$('#device'); if(!dev) return;
    const vw=window.innerWidth, vh=window.innerHeight;
    const margin = vw<480 ? 0 : 24;
    const s=Math.min((vw-margin*2)/390, (vh-margin*2)/844, 1.0);
    dev.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', fit);

  // ---- boot ----
  function boot(){
    renderLevels();
    LRFox.mountFoxes();
    $('#lang-val').textContent = LANGS[0];
    fit();
    const h=(location.hash||'').replace('#','');
    if(h==='levels') go('levels');
    else if(h==='settings'){ show('settings'); window.__screen='settings'; prev='home'; }
    else if(h==='game'){ startLevel(0); setTimeout(()=>{ Game.stageDemo(); }, 850); }
    else if(h==='pause'){ startLevel(0); setTimeout(()=>{ Game.pause(); overlay('pause',true); },120); }
    else if(h==='complete'){ startLevel(0); setTimeout(()=>{ Game.stop(); Game.onWin({coins:9,dist:108,stars:3}); },120); }
    else if(h==='gameover'){ startLevel(0); setTimeout(()=>{ Game.stop(); Game.onLose({coins:3,dist:64,stars:0}); },120); }
    else go('home');
  }
  if(document.readyState!=='loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();

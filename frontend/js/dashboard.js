const CLASS_COLOR = {
  go:"#00e87a", stop:"#ff1e3c", warning:"#ff8800",
  "14":"#ff1e3c","15":"#ff3355","17":"#ff3355",
  "9":"#ff6600","10":"#ff6600","16":"#ff6600","26":"#ffd600",
};
const SPEED_COLOR = "#00d4ff";
const ALERT_COLOR = { critical:"#ff1e3c", warning:"#ff8800", safe:"#00e87a", info:"#00d4ff" };

let curFile = null, jobId = null;
let vfps = 30, vtotal = 0, vw = 0, vh = 0;
let sse = null, raf = null;
let buf = new Map();
let latestFrameData = null;
let maxSpd = 0, sumSpd = 0, nSpd = 0;
let done = false;

function getCalibParams(){
  const enabled = document.getElementById('spd-enable').checked;
  const focal = parseFloat(document.getElementById('focal').value);
  const signw = parseFloat(document.getElementById('signw').value);
  if(enabled){
    if(!Number.isFinite(focal) || focal < 100){
      throw new Error('Focale invalide (>= 100 px)');
    }
    if(!Number.isFinite(signw) || signw < 0.10){
      throw new Error('Largeur panneau invalide (>= 0.10 m)');
    }
  }
  return { enabled, focal, signw };
}

setInterval(()=>{ document.getElementById('clock').textContent = new Date().toLocaleTimeString('fr-FR'); }, 1000);

(function buildLegend(){
  const items = [
    ["#00e87a","Feu Vert"],    ["#ff1e3c","Feu Rouge"],  ["#ff8800","Feu Orange"],
    ["#ff1e3c","STOP"],        ["#ff3355","Sens interdit"],["#ff3355","Entrée interdite"],
    ["#ff6600","Dép. interdit"],["#ff6600","Camion dép."],["#ff6600","Camion interdit"],
    ["#ffd600","Feux signal."],
    ["#00d4ff","20 km/h"],["#00d4ff","30 km/h"],["#00d4ff","50 km/h"],["#00d4ff","60 km/h"],
    ["#00d4ff","70 km/h"],["#00d4ff","80 km/h"],["#00d4ff","100 km/h"],["#00d4ff","120 km/h"],
  ];
  const g = document.getElementById('lgrid');
  if(!g) return;
  items.forEach(([c,l])=>{
    const d = document.createElement('div'); d.className = 'litem';
    d.innerHTML = `<span class="ldot" style="background:${c}"></span><span>${l}</span>`;
    g.appendChild(d);
  });
})();

const drop  = document.getElementById('drop');
const fi    = document.getElementById('finput');
drop.addEventListener('dragover', e=>{ e.preventDefault(); drop.classList.add('drag'); });
drop.addEventListener('dragleave', ()=> drop.classList.remove('drag'));
drop.addEventListener('drop', e=>{ e.preventDefault(); drop.classList.remove('drag'); if(e.dataTransfer.files[0]) pick(e.dataTransfer.files[0]); });
fi.addEventListener('change', ()=>{ if(fi.files[0]) pick(fi.files[0]); });

function pick(f){
  curFile = f;
  document.getElementById('fname').textContent = f.name;
  document.getElementById('fmeta').textContent = (f.size/1048576).toFixed(1)+' MB';
  document.getElementById('finfo').style.display = 'block';
  document.getElementById('abtn').disabled = false;
  document.getElementById('dico').textContent = '✅';
  const url = URL.createObjectURL(f);
  const vid = document.getElementById('main-video');
  const img = document.getElementById('main-img');
  document.getElementById('placeholder').style.display = 'none';
  if(f.type.startsWith('video/')){
    vid.src = url; vid.style.display = 'block'; img.style.display = 'none';
  } else {
    img.src = url; img.style.display = 'block'; vid.style.display = 'none';
  }
}

function sl(el, id, suf){
  document.getElementById(id).textContent = el.value + suf;
  el.style.setProperty('--pct', (el.value-5)/(95-5)*100+'%');
}
function slSkip(el){
  document.getElementById('skipval').textContent = el.value;
  el.style.setProperty('--pct', (el.value-1)/3*100+'%');
}
document.getElementById('conf').style.setProperty('--pct','20%');
document.getElementById('skip').style.setProperty('--pct','0%');

async function analyze(){
  if(!curFile) return;
  let calib = null;
  try {
    calib = getCalibParams();
  } catch(err){
    alert(err.message);
    return;
  }
  resetLive();

  const btn = document.getElementById('abtn');
  btn.disabled = true; btn.innerHTML = '<span>⏳</span> Envoi...';
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('load-lbl').textContent = 'Envoi du fichier...';

  const fd = new FormData();
  fd.append('file', curFile);
  fd.append('confidence', (document.getElementById('conf').value/100).toFixed(2));

  try {
    const r    = await fetch('/upload', { method:'POST', body:fd });
    const meta = await r.json();
    document.getElementById('loading').style.display = 'none';

    if(!meta.ok){ alert('Erreur : '+(meta.error||'inconnue')); btn.disabled=false; btn.innerHTML='<span>▶</span> Analyser'; return; }

    document.getElementById('rbtn').style.display = 'block';
    document.getElementById('stats-card').style.display = 'block';

    if(meta.type === 'video'){
      startVideo(meta, calib);
    } else {
      showImageResult(meta);
    }
  } catch(e){
    document.getElementById('loading').style.display = 'none';
    btn.disabled = false; btn.innerHTML = '<span>▶</span> Analyser';
    alert('Erreur réseau : ' + e.message);
  }
}

function showImageResult(meta){
  vw = meta.iw||640; vh = meta.ih||480;
  document.getElementById('status-tag').style.display = 'inline-flex';
  document.getElementById('status-tag').textContent = '✅ Analysé';
  document.getElementById('abtn').disabled = false;
  document.getElementById('abtn').innerHTML = '<span>▶</span> Analyser';

  updateStats(meta.dets||[], meta.speed, meta.dist, meta.adas, meta.msg, meta.limit, 0);

  const img = document.getElementById('main-img');
  const drawOnLoad = ()=>{
    const canvas = document.getElementById('canvas');
    const ctx    = canvas.getContext('2d');
    const rect   = img.getBoundingClientRect();
    canvas.width  = img.naturalWidth  || rect.width;
    canvas.height = img.naturalHeight || rect.height;
    canvas.style.width  = rect.width  + 'px';
    canvas.style.height = rect.height + 'px';
    drawFrame(ctx, {dets:meta.dets||[],speed:meta.speed,dist:meta.dist,adas:meta.adas,msg:meta.msg,limit:meta.limit,frame:0}, canvas.width, canvas.height);
  };
  if(img.complete && img.naturalWidth) drawOnLoad();
  else img.addEventListener('load', drawOnLoad, {once:true});
}

function startVideo(meta, calib){
  jobId  = meta.job_id;
  vfps   = meta.fps;
  vtotal = meta.frames;
  vw     = meta.w;
  vh     = meta.h;
  done   = false;

  const vid = document.getElementById('main-video');
  vid.src   = meta.url;
  vid.style.display = 'block';
  document.getElementById('main-img').style.display = 'none';
  vid.addEventListener('canplay', ()=>{ vid.play().catch(()=>{}); }, { once:true });

  document.getElementById('pbar').style.display   = 'block';
  document.getElementById('vbadge').style.display = 'block';
  document.getElementById('status-tag').style.display = 'inline-flex';
  document.getElementById('status-tag').textContent = '⏳ Analyse...';

  const conf = document.getElementById('conf').value / 100;
  const skip = document.getElementById('skip').value;
  const q = new URLSearchParams({
    conf: String(conf),
    skip: String(skip),
    speed_enabled: calib && calib.enabled ? '1' : '0',
    focal_px: String(calib ? calib.focal : 900),
    sign_width_m: String(calib ? calib.signw : 0.60),
  });
  sse = new EventSource(`/stream/${jobId}?${q.toString()}`);
  sse.onmessage = onSSE;
  sse.onerror   = ()=>{ if(!done){ console.warn('[SSE] Connection perdue'); } sse.close(); };
  startCanvasLoop();
}

function onSSE(e){
  const d = JSON.parse(e.data);

  if(d.type === 'meta'){
    vw = d.w; vh = d.h;
    const st = document.getElementById('status-tag');
    st.textContent = d.speed_enabled ? '⏳ Analyse calibrée...' : '⏳ Analyse (vitesse OFF)';
    return;
  }

  if(d.type === 'done'){
    done = true; sse.close();
    document.getElementById('status-tag').textContent = '✅ Terminé';
    document.getElementById('vbadge').textContent     = '✅ Analysé';
    document.getElementById('pfill').style.width      = '100%';
    document.getElementById('ppct').textContent       = '100%';
    document.getElementById('plbl').textContent       = `${d.frames} frames`;
    document.getElementById('abtn').disabled = false;
    document.getElementById('abtn').innerHTML = '<span>▶</span> Analyser';
    return;
  }

  if(d.type === 'frame'){
    buf.set(d.frame, d);
    document.getElementById('pfill').style.width  = d.pct + '%';
    document.getElementById('ppct').textContent   = d.pct.toFixed(1) + '%';
    document.getElementById('plbl').textContent   = `Frame ${d.frame}`;

    if(d.speed_valid && d.speed > 0){
      sumSpd += d.speed; nSpd++;
      if(d.speed > maxSpd) maxSpd = d.speed;
    }

    latestFrameData = d;
  }
}

function startCanvasLoop(){
  const canvas = document.getElementById('canvas');
  const ctx    = canvas.getContext('2d');
  const vid    = document.getElementById('main-video');

  function loop(){
    const rect = vid.getBoundingClientRect();
    if(rect.width > 0){
      canvas.width  = vid.videoWidth  || rect.width;
      canvas.height = vid.videoHeight || rect.height;
      canvas.style.width  = rect.width  + 'px';
      canvas.style.height = rect.height + 'px';
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if(!vid.paused && !vid.ended && canvas.width > 0){
      const cf = Math.round(vid.currentTime * vfps);
      let data = buf.get(cf);
      if(!data){
        for(let f = cf-1; f >= Math.max(0, cf-12); f--){
          if(buf.has(f)){ data = buf.get(f); break; }
        }
      }
      if(!data && latestFrameData){
        data = latestFrameData;
      }
      if(data){
        drawFrame(ctx, data, canvas.width, canvas.height);
        // Utiliser data.speed_kmh si votre backend envoie ça au lieu de data.speed
        let current_speed = data.speed !== undefined ? data.speed : data.speed_kmh;
        updateStats(data.dets||[], current_speed, data.dist, data.adas, data.msg, data.limit, data.frame);
      }
    }
    raf = requestAnimationFrame(loop);
  }
  loop();
}

function drawFrame(ctx, data, W, H){
  const { dets=[], speed=null, dist, adas='ok', msg='', frame=0, limit } = data;
  let current_speed = data.speed !== undefined ? data.speed : data.speed_kmh;
  
  const sx = W / (vw || W);
  const sy = H / (vh || H);

  dets.forEach(det => {
    if(!det.bbox) return;
    const [x1,y1,x2,y2] = det.bbox;
    const rx1 = x1*sx, ry1 = y1*sy;
    const rx2 = x2*sx, ry2 = y2*sy;
    const bw = rx2-rx1, bh = ry2-ry1;
    const col = det.color || (CLASS_COLOR[det.raw] || SPEED_COLOR);

    ctx.shadowColor = col; ctx.shadowBlur = 10;
    ctx.strokeStyle = col; ctx.lineWidth = 2.5;
    ctx.strokeRect(rx1, ry1, bw, bh);
    ctx.shadowBlur = 0;

    const cLen = Math.min(bw*0.22, bh*0.22, 16);
    ctx.lineWidth = 3.5;
    [[rx1,ry1,1,1],[rx2,ry1,-1,1],[rx2,ry2,-1,-1],[rx1,ry2,1,-1]].forEach(([cx,cy,dx,dy])=>{
      ctx.beginPath(); ctx.moveTo(cx+dx*cLen,cy); ctx.lineTo(cx,cy); ctx.lineTo(cx,cy+dy*cLen); ctx.stroke();
    });

    const fs = Math.max(11, Math.min(14, bw * 0.11));
    ctx.font = `bold ${fs}px Inter,sans-serif`;
    const txt = `${det.icon||''} ${det.label_fr}  ${det.confidence.toFixed(0)}%`;
    const tw  = ctx.measureText(txt).width;
    const lx  = rx1, ly = Math.max(ry1 - 4, fs + 4);
    const pad = 5;
    ctx.fillStyle = 'rgba(0,0,0,.82)';
    if(ctx.roundRect) ctx.roundRect(lx, ly-fs-pad, tw+pad*2, fs+pad*2, 4);
    else ctx.rect(lx, ly-fs-pad, tw+pad*2, fs+pad*2);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.fillText(txt, lx+pad, ly);

    ctx.fillStyle = hexAlpha(col, 0.06);
    ctx.fillRect(rx1, ry1, bw, bh);
  });

  const PW = Math.min(190, W * 0.27);
  ctx.fillStyle = 'rgba(7,9,15,.80)';
  ctx.fillRect(0, 0, PW, H);
  const g = ctx.createLinearGradient(0,0,PW,0);
  g.addColorStop(0,'#00d4ff'); g.addColorStop(1,'rgba(0,212,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, PW, 2);

  ctx.font = `bold ${Math.max(12,PW*0.068)}px Rajdhani,sans-serif`;
  ctx.fillStyle = '#00d4ff'; ctx.fillText('ADAS', 10, 24);
  ctx.font = `${Math.max(7,PW*0.038)}px Inter,sans-serif`;
  ctx.fillStyle = '#2e4060'; ctx.fillText('DÉTECTION v3', 10, 34);

  const hasSpeed = Number.isFinite(current_speed);
  const spd = hasSpeed ? Math.round(current_speed) : null;
  const sc  = !hasSpeed ? '#6a80a0' : (spd<60?'#00e87a':spd<90?'#ff8800':'#ff1e3c');
  const ss  = Math.max(28, PW*0.25);
  ctx.font = `bold ${ss}px Rajdhani,sans-serif`;
  ctx.fillStyle = sc;
  ctx.fillText(hasSpeed ? String(spd) : '--', 10, 46 + ss*0.8);
  const uy = 46 + ss*0.8 + 2;
  ctx.font = `${Math.max(8,PW*0.048)}px Inter,sans-serif`;
  ctx.fillStyle = '#6a80a0'; ctx.fillText(hasSpeed ? 'km/h calibré' : 'km/h non calibré', 10, uy+12);

  let ty = uy + 24;
  ctx.strokeStyle = '#1a2840'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(8,ty); ctx.lineTo(PW-8,ty); ctx.stroke(); ty += 12;

  ctx.font = `${Math.max(8,PW*0.048)}px Inter,sans-serif`;
  ctx.fillStyle = '#6a80a0';
  ctx.fillText(`${dets.length} objet${dets.length>1?'s':''} détecté${dets.length>1?'s':''}`, 8, ty); ty += 14;

  dets.slice(0,3).forEach(d=>{
    if(ty > H-50) return;
    const col = d.color || CLASS_COLOR[d.raw] || SPEED_COLOR;
    ctx.font = `600 ${Math.max(8,PW*0.052)}px Inter,sans-serif`;
    ctx.fillStyle = col;
    ctx.fillText((d.icon||'') + '  ' + (d.label_fr||d.raw).substring(0,18), 8, ty); ty += 13;
    ctx.font = `${Math.max(7,PW*0.04)}px JetBrains Mono,monospace`;
    ctx.fillStyle = '#2e4060';
    ctx.fillText(`   ${d.confidence.toFixed(1)}%`, 8, ty); ty += 12;
  });

  if(dist){ ty += 2;
    ctx.font = `${Math.max(7,PW*0.04)}px Inter,sans-serif`;
    ctx.fillStyle = '#6a80a0'; ctx.fillText(`⬡ Dist: ${dist.toFixed(1)}m`, 8, ty); ty += 13;
  }
  if(limit){
    ctx.font = `${Math.max(7,PW*0.04)}px Inter,sans-serif`;
    ctx.fillStyle = '#6a80a0'; ctx.fillText(`⬡ Limite: ${limit} km/h`, 8, ty);
  }

  ctx.font = `${Math.max(7,PW*0.036)}px JetBrains Mono,monospace`;
  ctx.fillStyle = '#1a2840'; ctx.fillText(`#${frame}`, 8, H-8);

  if((adas === 'danger' || adas === 'overspeed' || adas === 'warning') && msg){
    const ac = adas==='danger'?'#ff1e3c':adas==='overspeed'?'#ff4400':'#ffd600';
    const fs2 = Math.max(12, W*0.019);
    ctx.font = `bold ${fs2}px Inter,sans-serif`;
    const tw = ctx.measureText(msg).width;
    const mx = PW + (W-PW-tw)/2;
    ctx.fillStyle = 'rgba(0,0,0,.82)';
    if(ctx.roundRect) ctx.roundRect(mx-12, 7, tw+24, 30, 4);
    else ctx.rect(mx-12, 7, tw+24, 30);
    ctx.fill();
    ctx.fillStyle = ac; ctx.fillText(msg, mx, 28);
    ctx.strokeStyle = adas==='danger'?'rgba(255,30,60,.8)':'rgba(255,68,0,.7)';
    ctx.lineWidth   = 5;
    ctx.strokeRect(3, 3, W-6, H-6);
  }
}

function hexAlpha(hex, a){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

function updateStats(dets, speed, dist, adas, msg, limit, frame){
  const spd = (speed === null || speed === undefined) ? null : Math.round(speed);
  const sv  = document.getElementById('sv-spd');
  if(sv){
    sv.textContent = spd === null ? '—' : spd;
    sv.className   = 'sval ' + (spd === null ? 'g' : (spd<60?'g':spd<90?'o':'r'));
  }
  const svDist = document.getElementById('sv-dist');
  if(svDist) svDist.textContent = dist ? dist.toFixed(1)+'m' : '—';
  const svLim = document.getElementById('sv-lim');
  if(svLim) svLim.textContent  = limit ? limit+' km/h' : '—';
  const svN = document.getElementById('sv-n');
  if(svN) svN.textContent    = dets.length;

  const el = document.getElementById('det-list');
  const ndet = document.getElementById('ndet');
  if(ndet) ndet.textContent = dets.length;
  if(!dets.length){
    el.innerHTML = '<div class="empty">Aucune détection</div>';
  } else {
    el.innerHTML = dets.map(d=>{
      const col = d.color || CLASS_COLOR[d.raw] || SPEED_COLOR;
      return `<div class="dcard ${d.alert||'info'}">
        <div class="d-ico">${d.icon||'📍'}</div>
        <div class="d-body">
          <div class="d-lbl">${d.label_fr||d.raw}</div>
          <div class="d-conf">${d.confidence.toFixed(1)}% confiance</div>
        </div>
        <span class="d-pct p-${d.alert||'info'}" style="border-left:3px solid ${col}">${d.confidence.toFixed(0)}%</span>
      </div>`;
    }).join('');
  }

  const strip = document.getElementById('astrip');
  if(strip){
    strip.style.display = 'block';
    strip.className     = `astrip s-${adas||'ok'}`;
  }
  const amsg = document.getElementById('amsg');
  if(amsg) amsg.textContent = msg || (spd === null ? 'ℹ️ Vitesse non calibrée' : '✅ Voie libre');
  const hudMode = document.getElementById('hud-mode');
  if(hudMode) hudMode.textContent = spd === null ? 'STANDBY' : 'ACTIF';
  const hudAlert = document.getElementById('hud-alert');
  if(hudAlert) hudAlert.textContent = adas === 'danger' ? 'DANGER' : adas === 'overspeed' ? 'VITESSE' : adas === 'warning' ? 'ATTENTION' : 'STABLE';
}

function resetLive(){
  if(sse){ sse.close(); sse=null; }
  if(raf){ cancelAnimationFrame(raf); raf=null; }
  buf.clear(); latestFrameData = null;
  maxSpd=0; sumSpd=0; nSpd=0; done=false;
  document.getElementById('det-list').innerHTML = '<div class="empty">En attente...</div>';
  document.getElementById('ndet').textContent  = '0';
  document.getElementById('pfill').style.width = '0%';
  document.getElementById('ppct').textContent  = '0%';
  const cv = document.getElementById('canvas');
  cv.getContext('2d').clearRect(0,0,cv.width,cv.height);
}

function resetAll(){
  resetLive(); curFile = null; jobId = null;
  const vid = document.getElementById('main-video');
  vid.src = ''; vid.style.display = 'none';
  const img = document.getElementById('main-img');
  img.src = ''; img.style.display = 'none';
  document.getElementById('placeholder').style.display  = 'flex';
  document.getElementById('vbadge').style.display       = 'none';
  document.getElementById('pbar').style.display         = 'none';
  document.getElementById('stats-card').style.display   = 'none';
  document.getElementById('status-tag').style.display   = 'none';
  document.getElementById('finfo').style.display        = 'none';
  document.getElementById('dico').textContent           = '🎬';
  document.getElementById('rbtn').style.display         = 'none';
  document.getElementById('abtn').disabled = true;
  document.getElementById('abtn').innerHTML = '<span>▶</span> Analyser';
  fi.value = '';
}
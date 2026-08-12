
const state = {
  track: [],
  dist: 0,
  gain: 0,
  loss: 0,
  roster: [],
  shots: [],
  deferredPrompt: null
};

const $ = id => document.getElementById(id);

function setActionState(id,state){
  const b=$(id); if(!b) return;
  b.classList.remove('action-idle','action-ready','action-working','action-success','action-error');
  b.classList.add('action-'+state);
}


document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tabpanel').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    $(btn.dataset.tab).classList.add('active');
  });
});

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  state.deferredPrompt = e;
  $('installBtn').hidden = false;
});
$('installBtn').addEventListener('click', async () => {
  if (!state.deferredPrompt) return;
  state.deferredPrompt.prompt();
  await state.deferredPrompt.userChoice;
  state.deferredPrompt = null;
  $('installBtn').hidden = true;
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

function haversine(a,b,c,d){
  const R=6371000, rad=x=>x*Math.PI/180;
  const p1=rad(a), p2=rad(c), dp=rad(c-a), dl=rad(d-b);
  const q=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.sqrt(q));
}

function parseGPX(text){
  const xml=new DOMParser().parseFromString(text,'application/xml');
  if(xml.querySelector('parsererror')) throw new Error('Некорректный XML');
  let pts=[...xml.getElementsByTagName('trkpt')];
  if(!pts.length) pts=[...xml.getElementsByTagNameNS('*','trkpt')];
  if(!pts.length) pts=[...xml.getElementsByTagName('rtept')];
  if(!pts.length) pts=[...xml.getElementsByTagNameNS('*','rtept')];
  if(pts.length<2) throw new Error('Не найдены точки трека');
  let out=[],total=0,prev=null,gain=0,loss=0;
  pts.forEach(p=>{
    const lat=parseFloat(p.getAttribute('lat')),lon=parseFloat(p.getAttribute('lon'));
    if(!Number.isFinite(lat)||!Number.isFinite(lon)) return;
    let ee=p.getElementsByTagName('ele')[0]||p.getElementsByTagNameNS('*','ele')[0];
    const ele=ee?parseFloat(ee.textContent):NaN;
    if(prev){
      const step=haversine(prev.lat,prev.lon,lat,lon);
      if(Number.isFinite(step)&&step<5000) total+=step;
      if(Number.isFinite(ele)&&Number.isFinite(prev.ele)){
        const de=ele-prev.ele;if(Math.abs(de)<250){if(de>0)gain+=de;else loss+=-de;}
      }
    }
    out.push({km:total/1000,lat,lon,ele});prev={lat,lon,ele};
  });
  state.track=out;state.dist=total/1000;state.gain=gain;state.loss=loss;
  $('distMetric').textContent=state.dist.toFixed(1)+' км';
  $('gainMetric').textContent=Math.round(gain)+' м';
  $('lossMetric').textContent=Math.round(loss)+' м';
  $('gpxStatus').textContent='✓ GPX обработан: '+state.dist.toFixed(1)+' км · +'+Math.round(gain)+' м · −'+Math.round(loss)+' м';
}
function readFileIOS(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error);r.readAsText(file,'UTF-8');
  });
}
let selectedGPXFile=null;

$('gpxFile').addEventListener('change', e=>{
  selectedGPXFile=e.currentTarget.files&&e.currentTarget.files[0] ? e.currentTarget.files[0] : null;
  if(!selectedGPXFile){
    $('gpxName').innerHTML='<span id="gpxCheck" class="file-check">○</span> Файл не выбран';
    $('gpxStatus').textContent='1. Выберите файл GPX.';
    $('gpxLoadBtn').disabled=true; setActionState('gpxLoadBtn','idle');
    return;
  }
  $('gpxName').innerHTML='<span id="gpxCheck" class="file-check selected">✓</span> Выбран: '+selectedGPXFile.name;
  $('gpxStatus').textContent='2. Файл выбран. Нажмите «Загрузить и обработать GPX».';
  $('gpxLoadBtn').disabled=false; setActionState('gpxLoadBtn','ready');
});

$('gpxLoadBtn').addEventListener('click',async ()=>{
  if(!selectedGPXFile){
    $('gpxStatus').textContent='✕ Сначала выберите GPX.';
    return;
  }
  const btn=$('gpxLoadBtn'), prog=$('gpxProgress');
  btn.disabled=true; setActionState('gpxLoadBtn','working');
  prog.style.display='block';
  prog.value=10;
  $('gpxStatus').textContent='⏳ Читаю файл…';

  try{
    const text=await readFileIOS(selectedGPXFile);
    prog.value=45;
    $('gpxStatus').textContent='⏳ Разбираю точки GPX…';
    await new Promise(r=>setTimeout(r,30));
    parseGPX(text);
    prog.value=100;
    $('gpxStatus').textContent='✓ GPX обработан: '+state.dist.toFixed(1)+' км · +'+Math.round(state.gain)+' м · −'+Math.round(state.loss)+' м'; setActionState('gpxLoadBtn','success');
    setTimeout(()=>{prog.style.display='none';},1200);
  }catch(err){
    prog.style.display='none';
    $('gpxStatus').textContent='✕ Ошибка обработки GPX: '+(err.message||String(err)); setActionState('gpxLoadBtn','error');
  }finally{
    btn.disabled=false;
  }
});


function terrainMultiplier(){
  const t=$('raceDesc').value.toLowerCase();
  const count=(re)=>((t.match(re)||[]).length);
  let p=1;
  p+=Math.min(count(/болот/g)*.025,.12);
  p+=Math.min((count(/пес/g)+count(/сыпуч/g))*.02,.10);
  p+=Math.min((count(/брод/g)+count(/рек/g))*.012,.08);
  p+=Math.min(count(/кам/g)*.012,.05);
  p+=Math.min(count(/коле/g)*.01,.04);
  p+=Math.min(count(/зарос/g)*.01,.04);
  return Math.min(p,1.35);
}

function paceSec(s){
  const m=String(s).match(/(\d+):(\d+)/); return m?+m[1]*60 + +m[2]:330;
}
function hms(sec){
  sec=Math.max(0,Math.round(sec)); const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
  return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function paceFmt(sec){
  sec=Math.round(sec); return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
}

$('shotFiles').addEventListener('change', e=>{
  state.shots=[...e.target.files];
  renderShots();
});
function renderShots(){
  const box=$('shotsList'); box.innerHTML='';
  state.shots.forEach((f,i)=>{
    const url=URL.createObjectURL(f);
    const d=document.createElement('div'); d.className='shot';
    d.innerHTML=`<img src="${url}"><div><b>${f.name}</b><textarea id="shotText${i}" rows="4" placeholder="OCR/ручные данные тренировки"></textarea></div>`;
    box.appendChild(d);
  });
}
$('ocrBtn').addEventListener('click', ()=>{
  if(!state.shots.length){$('ocrStatus').textContent='Сначала добавьте скриншоты.';return;}
  let merged='';
  for(let i=0;i<state.shots.length;i++){
    const el=$(`shotText${i}`);
    if(el) merged += '\n' + el.value;
  }
  applyOCR(merged);
  $('ocrStatus').textContent='Данные из вставленного текста применены. Проверь значения ниже.';
});
function applyOCR(text){
  const low=text.toLowerCase().replace(',','.');
  let m=low.match(/(\d+(?:\.\d+)?)\s*км/); if(m)$('refDist').value=m[1];
  m=low.match(/(?:набор|elevation|gain|\+)\D{0,8}(\d{2,5})\s*м/); if(m)$('refGain').value=m[1];
  m=low.match(/(?:средн\w*\s*пульс|avg\s*hr|average heart rate)\D{0,12}(\d{2,3})/); if(m)$('refAvgHr').value=m[1];
  m=low.match(/(?:макс\w*\s*пульс|max\s*hr|max heart rate)\D{0,12}(\d{2,3})/); if(m)$('refMaxHr').value=m[1];
}


async function inflateRaw(bytes){
  if(typeof DecompressionStream==='undefined') throw new Error('Safari слишком старый для автономного XLSX. Сохраните файл как CSV.');
  const ds=new DecompressionStream('deflate-raw');
  const stream=new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
function u16(a,o){return a[o]|(a[o+1]<<8)}
function u32(a,o){return (a[o]|(a[o+1]<<8)|(a[o+2]<<16)|(a[o+3]<<24))>>>0}
async function unzipXlsx(arrayBuffer){
  const a=new Uint8Array(arrayBuffer), files={};
  let eocd=-1;
  for(let i=a.length-22;i>=Math.max(0,a.length-65557);i--){
    if(u32(a,i)===0x06054b50){eocd=i;break;}
  }
  if(eocd<0) throw new Error('Некорректный XLSX/ZIP');
  const total=u16(a,eocd+10), cdOff=u32(a,eocd+16);
  let p=cdOff;
  for(let n=0;n<total;n++){
    if(u32(a,p)!==0x02014b50) break;
    const method=u16(a,p+10), compSize=u32(a,p+20);
    const nameLen=u16(a,p+28), extraLen=u16(a,p+30), commentLen=u16(a,p+32);
    const localOff=u32(a,p+42);
    const name=new TextDecoder().decode(a.slice(p+46,p+46+nameLen));
    if(u32(a,localOff)!==0x04034b50) throw new Error('Ошибка ZIP');
    const ln=u16(a,localOff+26), le=u16(a,localOff+28);
    const dataStart=localOff+30+ln+le;
    const comp=a.slice(dataStart,dataStart+compSize);
    let raw;
    if(method===0) raw=comp;
    else if(method===8) raw=await inflateRaw(comp);
    else throw new Error('Неподдерживаемое сжатие XLSX');
    files[name]=raw;
    p+=46+nameLen+extraLen+commentLen;
  }
  return files;
}
function xmlText(bytes){
  return new TextDecoder('utf-8').decode(bytes);
}
function colIndex(cellRef){
  const m=String(cellRef).match(/[A-Z]+/i); if(!m)return 0;
  let x=0; for(const ch of m[0].toUpperCase()) x=x*26+(ch.charCodeAt(0)-64);
  return x-1;
}
async function parseXlsxOffline(arrayBuffer){
  const files=await unzipXlsx(arrayBuffer);
  let shared=[];
  if(files['xl/sharedStrings.xml']){
    const doc=new DOMParser().parseFromString(xmlText(files['xl/sharedStrings.xml']),'application/xml');
    shared=[...doc.getElementsByTagNameNS('*','si')].map(si=>[...si.getElementsByTagNameNS('*','t')].map(t=>t.textContent).join(''));
  }
  let sheetName=Object.keys(files).find(x=>/^xl\/worksheets\/sheet\d+\.xml$/.test(x));
  if(!sheetName) throw new Error('Лист XLSX не найден');
  const doc=new DOMParser().parseFromString(xmlText(files[sheetName]),'application/xml');
  const rows=[];
  [...doc.getElementsByTagNameNS('*','row')].forEach(r=>{
    const vals=[];
    [...r.getElementsByTagNameNS('*','c')].forEach(c=>{
      const idx=colIndex(c.getAttribute('r')||'A1');
      const t=c.getAttribute('t')||'';
      const v=c.getElementsByTagNameNS('*','v')[0];
      let val='';
      if(v){
        val=v.textContent;
        if(t==='s') val=shared[parseInt(val,10)] ?? val;
      } else {
        const inline=c.getElementsByTagNameNS('*','t')[0];
        if(inline) val=inline.textContent;
      }
      vals[idx]=val;
    });
    rows.push(vals);
  });
  if(!rows.length)return [];
  const headers=rows[0].map((x,i)=>String(x||`col_${i+1}`).trim());
  return rows.slice(1).filter(r=>r.some(v=>String(v??'').trim()!=='')).map(r=>{
    const o={}; headers.forEach((h,i)=>o[h]=r[i]??''); return o;
  });
}

let selectedRosterFile=null;
$('rosterFile').addEventListener('change',e=>{
  selectedRosterFile=e.currentTarget.files&&e.currentTarget.files[0];
  if(!selectedRosterFile){
    $('rosterName').innerHTML='<span class="file-check">○</span> Файл не выбран';
    $('rosterLoadBtn').disabled=true;setActionState('rosterLoadBtn','idle');$('rosterStatus').textContent='1. Выберите файл стартового списка.';return;
  }
  $('rosterName').innerHTML='<span class="file-check selected">✓</span> Выбран: '+selectedRosterFile.name;
  $('rosterLoadBtn').disabled=false;setActionState('rosterLoadBtn','ready');$('rosterStatus').textContent='2. Файл выбран. Нажмите кнопку загрузки.';
});
$('rosterLoadBtn').addEventListener('click',async ()=>{
  if(!selectedRosterFile)return;
  const btn=$('rosterLoadBtn'),p=$('rosterProgress');btn.disabled=true;setActionState('rosterLoadBtn','working');p.style.display='block';p.value=15;
  try{
    let rows=[]; const f=selectedRosterFile;$('rosterStatus').textContent='⏳ Читаю стартовый список…';
    if(f.name.toLowerCase().endsWith('.csv')) rows=parseCSV(await f.text());
    else rows=await parseXlsxOffline(await f.arrayBuffer());
    p.value=75;state.roster=normalizeRoster(rows);renderRoster();p.value=100;
    $('rosterStatus').textContent='✓ Готово: '+state.roster.length+' участников.';setActionState('rosterLoadBtn','success');setTimeout(()=>p.style.display='none',1000);
  }catch(err){p.style.display='none';$('rosterStatus').textContent='✕ '+(err.message||err);setActionState('rosterLoadBtn','error');}
  finally{btn.disabled=false;}
});
function parseCSV(text){
  const lines=text.split(/\r?\n/).filter(Boolean), sep=(lines[0].split(';').length>lines[0].split(',').length?';':',');
  const h=lines[0].split(sep).map(x=>x.trim());
  return lines.slice(1).map(l=>{const v=l.split(sep); let o={};h.forEach((k,i)=>o[k]=v[i]??'');return o;});
}
function normalizeRoster(rows){
  if(!rows.length)return [];
  const keys=Object.keys(rows[0]), norm=s=>String(s).toLowerCase().replace(/[_\-./]+/g,' ');
  const pick=arr=>keys.find(k=>arr.some(a=>norm(k)===a||norm(k).includes(a)));
  const sur=pick(['фамилия','surname','last name']), nam=pick(['имя','first name','name']);
  const fio=pick(['фио','спортсмен','участник','athlete','runner']);
  const gen=pick(['пол','gender','sex']), pi=pick(['itra pi','itra','performance index','рейтинг','pi']);
  return rows.map(r=>{
    let athlete=fio?String(r[fio]).trim():[nam?r[nam]:'',sur?r[sur]:''].join(' ').trim();
    return {athlete, gender:gen?String(r[gen]):'', pi:pi?parseFloat(r[pi])||0:0, tech:0,end:0,form:0};
  }).filter(x=>x.athlete);
}
function genderOkay(g){
  const mode=$('genderFilter').value, s=String(g).toLowerCase();
  if(mode==='Все')return true;
  if(mode==='Женщины')return s.startsWith('ж')||s==='f'||s.includes('female');
  return s.startsWith('м')||s==='m'||s.includes('male');
}
function renderRoster(){
  const tb=$('rosterTable').querySelector('tbody'); tb.innerHTML='';
  const athlete=$('athleteName').value.trim().toLowerCase();
  state.roster.filter(x=>genderOkay(x.gender)).forEach((r,i)=>{
    if(r.athlete.toLowerCase()===athlete && !r.pi) r.pi=+$('itraPi').value||0;
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${r.athlete}</td>
      <td><input type="number" value="${r.pi}" data-i="${i}" data-k="pi"></td>
      <td><input type="number" value="${r.tech}" data-i="${i}" data-k="tech"></td>
      <td><input type="number" value="${r.end}" data-i="${i}" data-k="end"></td>
      <td><input type="number" value="${r.form}" data-i="${i}" data-k="form"></td>`;
    tb.appendChild(tr);
  });
  tb.querySelectorAll('input').forEach(inp=>inp.addEventListener('change',()=>{
    const visible=state.roster.filter(x=>genderOkay(x.gender));
    visible[+inp.dataset.i][inp.dataset.k]=+inp.value||0;
  }));
}
$('genderFilter').addEventListener('change',renderRoster);

function estimateLTHR(){
  const known=+$('lthr').value||0; if(known)return known;
  const hr=+$('refAvgHr').value||0, mins=+$('refMinutes').value||100;
  if(mins<=50)return Math.round(hr*.98);
  if(mins<=100)return Math.round(hr*1.01);
  return Math.round(hr*1.03);
}
function formScore(){
  let s=0;
  const d=+$('refDist').value||0,g=+$('refGain').value||0,hr=+$('refAvgHr').value||0;
  if(d>=25)s+=4; else if(d>=15)s+=2;
  if(g>=800)s+=3; else if(g>=500)s+=2;
  if(hr>=180)s+=2;
  if(state.shots.length>=3)s+=2;
  return Math.min(12,s);
}
function finishPrediction(){
  if(!state.dist)return 0;
  const base=paceSec($('basePace').value), tech=+$('technicality').value||5, tm=terrainMultiplier();
  const climb=state.gain*1.0, downhill=Math.min(state.loss*.20,state.dist*18);
  let sec=(state.dist*base + climb - downhill)*tm*(1+tech*.018);
  sec*=1-formScore()*.004;
  return sec;
}
function score(r){
  const diff=(+$('technicality').value||5)/10, tm=terrainMultiplier();
  const difficulty=Math.max(0,Math.min(1,(diff+(tm-1)/.35)/2));
  return (+r.pi||0)+(+r.tech||0)*(.55+.75*difficulty)+(+r.end||0)*(.75+.55*difficulty)+(+r.form||0)*.65;
}
function gaussian(){
  let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
function monteCarlo(rows,name){
  const sigma=+$('sigma').value||20, idx=rows.findIndex(r=>r.athlete.toLowerCase()===name.toLowerCase());
  if(idx<0)return null;
  let win=0,pod=0,top5=0,ranks=[];
  for(let n=0;n<10000;n++){
    const p=rows.map(r=>score(r)+gaussian()*sigma), me=p[idx];
    const rank=1+p.filter(x=>x>me).length;ranks.push(rank);
    if(rank===1)win++;if(rank<=3)pod++;if(rank<=5)top5++;
  }
  ranks.sort((a,b)=>a-b);
  return {win:win/10000,pod:pod/10000,top5:top5/10000,rank:ranks[Math.floor(ranks.length/2)]};
}
function buildPlan(){
  const l=estimateLTHR(), rows=[], n=Math.max(6,Math.ceil(state.dist/5));
  for(let i=0;i<n;i++){
    const a=state.dist*i/n,b=state.dist*(i+1)/n,p=(i+.5)/n;
    let lo,hi,mode;
    if(p<.2){lo=.86;hi=.90;mode='Экономия'}
    else if(p<.55){lo=.88;hi=.92;mode='Ровная работа'}
    else if(p<.8){lo=.90;hi=.94;mode='Рабочий блок'}
    else if(p<.94){lo=.92;hi=.97;mode='Начать гонку'}
    else{lo=.95;hi=1.02;mode='Финиш'}
    const pace=paceSec($('basePace').value)*terrainMultiplier()*(1+(+$('technicality').value||5)*.018);
    rows.push({km:`${a.toFixed(1)}–${b.toFixed(1)}`,hr:`${Math.round(l*lo)}–${Math.round(l*hi)}`,mode,pace:paceFmt(pace)});
  }
  return rows;
}
function threat(delta){
  if(delta>30)return 'очень высокая';if(delta>12)return 'высокая';if(delta>=-12)return 'прямая';if(delta>=-30)return 'умеренная';return 'низкая';
}
$('calcBtn').addEventListener('click',()=>{
  const finish=finishPrediction(); $('finishMetric').textContent=finish?hms(finish):'—';
  const athlete=$('athleteName').value.trim();
  const rows=state.roster.filter(x=>genderOkay(x.gender));
  const a=rows.find(r=>r.athlete.toLowerCase()===athlete.toLowerCase());
  if(a){a.pi=+($('itraPi').value||a.pi);a.form+=formScore();}
  const ranked=[...rows].sort((x,y)=>score(y)-score(x));
  const me=ranked.find(r=>r.athlete.toLowerCase()===athlete.toLowerCase());
  const meScore=me?score(me):0;
  const mc=monteCarlo(ranked,athlete);
  $('podiumMetric').textContent=mc?(mc.pod*100).toFixed(1)+'%':'—';
  $('winMetric').textContent=mc?(mc.win*100).toFixed(1)+'%':'—';
  $('rankMetric').textContent=mc?String(mc.rank):'—';

  const pt=$('planTable').querySelector('tbody');pt.innerHTML='';
  buildPlan().forEach(r=>pt.insertAdjacentHTML('beforeend',`<tr><td>${r.km}</td><td>${r.hr}</td><td>${r.mode}</td><td>${r.pace}</td></tr>`));

  const rt=$('rivalsTable').querySelector('tbody');rt.innerHTML='';
  ranked.filter(r=>r.athlete.toLowerCase()!==athlete.toLowerCase()).slice(0,10).forEach((r,i)=>{
    const s=score(r), d=s-meScore;
    rt.insertAdjacentHTML('beforeend',`<tr><td>${i+1}</td><td>${r.athlete}</td><td>${r.pi||0}</td><td>${s.toFixed(1)}</td><td>${threat(d)}</td></tr>`);
  });
  document.querySelector('[data-tab="result"]').click();
});

$('saveBtn').addEventListener('click',()=>{
  const payload={
    athlete:$('athleteName').value, pi:$('itraPi').value,
    route:{dist:state.dist,gain:state.gain,loss:state.loss,desc:$('raceDesc').value},
    training:{dist:$('refDist').value,gain:$('refGain').value,avgHr:$('refAvgHr').value,maxHr:$('refMaxHr').value,lthr:$('lthr').value},
    roster:state.roster,
    savedAt:new Date().toISOString()
  };
  localStorage.setItem('trailRaceAnalyzerState',JSON.stringify(payload));
  $('saveStatus').textContent='Сохранено локально на этом iPhone.';
});

window.addEventListener('load',()=>{
  // Migrate old builds that contained a hardcoded athlete name.
  const currentName=$('athleteName').value.trim().toLowerCase();
  if(currentName==='анастасия кабенина' || currentName==='sidorenko pavel' || currentName==='pavel sidorenko'){
    $('athleteName').value='Noname';
  }

  try{
    const p=JSON.parse(localStorage.getItem('trailRaceAnalyzerState')||'null');
    if(!p)return;
    $('athleteName').value=(p.athlete && String(p.athlete).trim()) ? p.athlete : 'Noname';$('itraPi').value=p.pi||$('itraPi').value;
    if(p.route)$('raceDesc').value=p.route.desc||'';
    if(p.training){
      $('refDist').value=p.training.dist||17;$('refGain').value=p.training.gain||645;
      $('refAvgHr').value=p.training.avgHr||184;$('refMaxHr').value=p.training.maxHr||0;$('lthr').value=p.training.lthr||0;
    }
    if(Array.isArray(p.roster)){state.roster=p.roster;renderRoster();}
  }catch(e){}
});

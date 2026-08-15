
const LEVELS=[["Парковый трейл", 5, 80, 2040, 900, 1, "Лёгкий разогрев: дорожки, корни и первый подъём."], ["Лесная десятка", 10, 220, 4080, 1300, 1, "Первые камни, грязь и короткие технические спуски."], ["Грязевой полумарафон", 21, 600, 9300, 2200, 2, "Дождь, лужи, первые серьёзные штрафы за обувь."], ["Скальный забег", 25, 1100, 11400, 2800, 2, "Камни и острые спуски. Палки начинают приносить пользу."], ["Ночной трейл", 30, 900, 13500, 3500, 2, "Фонарик становится критичным."], ["Горный марафон", 42, 1900, 21600, 4700, 3, "Длинные подъёмы и первый серьёзный тест выносливости."], ["Хребет ветров", 50, 2300, 27000, 5600, 3, "Ветер и холод усиливают износ мембранки."], ["Ультра 60", 60, 2500, 32400, 6500, 3, "Четыре ПП, жара и длинные участки без воды."], ["Каменный лабиринт", 70, 3300, 39600, 7600, 3, "Камни ускоряют износ обуви и палок."], ["Северный шторм", 80, 3600, 46800, 9000, 4, "Дождь, ветер и холод. Дешёвая экипировка быстро сдаётся."], ["100 км классика", 100, 4300, 61200, 11000, 4, "Первый настоящий 100 км ультратрейл."], ["Высотная сотня", 110, 6000, 79200, 13500, 4, "Много набора и технический рельеф."], ["Дикий 130", 130, 5200, 90000, 15000, 4, "Длинные ночные часы и риск поломок."], ["200 км пустошь", 200, 6500, 151200, 21000, 4, "Жара, вода и питание становятся главным ресурсом."], ["Альпийский 250", 250, 12000, 208800, 27000, 5, "Очень высокий износ, долгие спуски, холодные ночи."], ["Трансгорный 300", 300, 15000, 259200, 33000, 5, "Экипировка среднего класса уже на пределе."], ["Дикий пояс 400", 400, 18000, 345600, 42000, 5, "Многосуточный забег: прочность вещей решает."], ["Край света 500", 500, 23000, 450000, 52000, 5, "Погода, сон и поломки начинают складываться."], ["Безумие 700", 700, 32000, 648000, 70000, 5, "Предфинальная гонка. Нужен высокий уровень трейлраннера."], ["АРМАГЕДДОН 1000", 1000, 50000, 1008000, 100000, 5, "Финал: 1000 км, 50 000 м+, ночь, жара, шторм и максимальный износ."]];
const GEAR={"shoes": [["Базовые кроссовки", 0, 1.0, 65, 0.0], ["Trail Grip", 1800, 0.97, 110, 0.04], ["Mountain Pro", 5200, 0.94, 180, 0.08], ["Ultra Carbon", 12000, 0.91, 280, 0.12], ["Armageddon X", 30000, 0.88, 500, 0.18]], "jacket": [["Нет мембранки", 0, 1.0, 999, 0], ["Лёгкая мембранка", 1600, 0.99, 90, 0.03], ["Storm Shell", 4500, 0.98, 160, 0.06], ["Alpine Shield", 10000, 0.97, 260, 0.1], ["Armageddon Shell", 26000, 0.96, 480, 0.15]], "lamp": [["Простой фонарь", 0, 1.0, 70, 0.0], ["Night 400", 1400, 0.995, 120, 0.03], ["Night 800", 3800, 0.99, 200, 0.06], ["Ultra Beam", 9000, 0.985, 320, 0.1], ["Recharge Pro X", 22000, 0.98, 520, 0.14]], "pack": [["Старый рюкзак", 0, 1.0, 80, 0.0], ["Race Vest 5L", 1700, 0.99, 120, 0.03], ["Ultra Vest 12L", 4800, 0.98, 210, 0.06], ["Endurance Pack", 11000, 0.97, 330, 0.1], ["Armageddon Pack", 27000, 0.96, 550, 0.15]], "poles": [["Без палок", 0, 1.0, 999, 0.0], ["Алюминиевые палки", 1900, 0.985, 100, 0.04], ["Carbon Trek", 5200, 0.97, 180, 0.08], ["LEKI Ultra Carbon", 12000, 0.955, 300, 0.12], ["LEKI Armageddon", 29000, 0.94, 520, 0.18]], "hydration": [["Фляга 500 мл", 0, 1.0, 100, 0.0], ["2×Soft Flask", 1200, 0.99, 160, 0.03], ["Hydro Vest", 3600, 0.98, 250, 0.06], ["Ultra Hydro", 8500, 0.97, 380, 0.1], ["Armageddon Hydro", 21000, 0.96, 600, 0.15]], "watch": [["Нет часов", 0, 1.0, 999, 0.0], ["GPS Start", 900, 0.998, 180, 0.02], ["Trail GPS", 2800, 0.995, 280, 0.05], ["Endurance GPS", 7200, 0.99, 420, 0.08], ["Fenix Ultra", 18000, 0.985, 650, 0.12]], "medkit": [["Пустой слот", 0, 1.0, 999, 0.0], ["Мини-аптечка", 700, 0.999, 120, 0.03], ["Trail аптечка", 2100, 0.997, 220, 0.06], ["Ultra аптечка", 5200, 0.995, 360, 0.10], ["Armageddon Med", 13000, 0.99, 600, 0.15]]};
const CATEGORY_NAMES={shoes:'Кроссовки',pack:'Рюкзак / жилет',jacket:'Мембранка',lamp:'Фонарик',poles:'Палки',watch:'Часы',medkit:'Аптечка',hydration:'Вода'};
const RESOURCE_CATALOG={
  gels:{name:'Энергетический гель',price:120,unit:'шт.',desc:'Снижает голод и потерю темпа на длинной гонке.'},
  batteries:{name:'Комплект батареек',price:260,unit:'компл.',desc:'Для фонарей 1–4 уровня. Один комплект ≈ 5 часов света.'},
  bandage:{name:'Бинт',price:160,unit:'шт.',desc:'Сильные ссадины и растяжения.'},
  gauze:{name:'Марля',price:90,unit:'уп.',desc:'Кровь и глубокие царапины.'},
  peroxide:{name:'Перекись',price:140,unit:'фл.',desc:'Обработка ран.'},
  plaster:{name:'Пластырь',price:110,unit:'уп.',desc:'Мелкие порезы и мозоли.'},
  cream:{name:'Крем от натирания',price:240,unit:'тюб.',desc:'Снижает риск натираний.'},
  powerbank:{name:'Переносной аккумулятор',price:4500,unit:'шт.',desc:'Заряжает фонарь 5 уровня в гонке.'}
};
const START_GEAR={shoes:0,pack:0,jacket:0,lamp:0,poles:0,watch:0,medkit:0,hydration:0};
const $=id=>document.getElementById(id);

let game=loadGame();
let run=null,timer=null,lastTs=0;

function loadGame(){
  try{
    const x=JSON.parse(localStorage.getItem('trailArmageddonSave')||'null');
    if(x) return Object.assign({
      money:1500,xp:0,level:1,completed:0,rep:0,current:0,gear:{...START_GEAR},
      durability:{},best:{},fatigue:0,lastFinishAt:0,restUntil:0,
      resources:{gels:4,batteries:2,bandage:1,gauze:1,peroxide:1,plaster:2,cream:1,powerbank:0},
      lampCharge:100
    },x);
  }catch(e){}
  return {
    money:1500,xp:0,level:1,completed:0,rep:0,current:0,gear:{...START_GEAR},
    durability:{},best:{},fatigue:0,lastFinishAt:0,restUntil:0,
    resources:{gels:4,batteries:2,bandage:1,gauze:1,peroxide:1,plaster:2,cream:1,powerbank:0},
    lampCharge:100
  };
}
function saveGame(){localStorage.setItem('trailArmageddonSave',JSON.stringify(game));}

function ensureResources(){
  if(!game.resources) game.resources={};
  const defaults={gels:4,batteries:2,bandage:1,gauze:1,peroxide:1,plaster:2,cream:1,powerbank:0};
  Object.entries(defaults).forEach(([k,v])=>{if(game.resources[k]==null)game.resources[k]=v});
  if(game.fatigue==null)game.fatigue=0;
  if(game.restUntil==null)game.restUntil=0;
  if(game.lastFinishAt==null)game.lastFinishAt=0;
  if(game.lampCharge==null)game.lampCharge=100;
}
function restRemainingMs(){return Math.max(0,(game.restUntil||0)-Date.now())}
function isResting(){return restRemainingMs()>0}
function fmtRest(ms){
  const s=Math.ceil(ms/1000),m=Math.floor(s/60),r=s%60;
  return `${m}:${String(r).padStart(2,'0')}`;
}
function gelsNeeded(L){
  // Approx. one gel per 45 min, but capped so the game remains manageable.
  return Math.max(1,Math.min(80,Math.ceil(L[3]/2700)));
}
function isRechargeableLamp(){return Number(game.gear.lamp)>=4}
function lampHoursNeeded(L){
  // Nights start to matter from level 5 onward; longer races require more light.
  if(game.current<4) return 0;
  return Math.max(1,Math.min(80,Math.ceil(L[3]/3600*0.42)));
}
function medkitScore(){
  const r=game.resources;
  return ['bandage','gauze','peroxide','plaster','cream'].reduce((a,k)=>a+(Number(r[k])>0?1:0),0);
}
function useResource(k,n=1){game.resources[k]=Math.max(0,(Number(game.resources[k])||0)-n)}

function fmt(sec){
 sec=Math.max(0,Math.round(sec)); const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
 return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
}
function fmtMoney(n){return '₽ '+Math.round(n).toLocaleString('ru-RU')}
function levelData(i=game.current){return LEVELS[Math.max(0,Math.min(19,i))]}
function xpNeeded(lvl){return 100+Math.floor(lvl*18)}
function addXp(n){
 game.xp+=Math.round(n);
 while(game.level<100 && game.xp>=xpNeeded(game.level)){
   game.xp-=xpNeeded(game.level); game.level++;
 }
 if(game.level>=100){game.level=100;game.xp=0}
}
function item(cat,idx=game.gear[cat]){return GEAR[cat][idx]}
function durKey(cat){return cat+'_'+game.gear[cat]}
function durability(cat){
 const key=durKey(cat), max=item(cat)[3];
 if(game.durability[key]==null) game.durability[key]=max;
 return game.durability[key];
}
function setDur(cat,v){game.durability[durKey(cat)]=Math.max(0,v)}

function render(){
 const L=levelData();
 $('runnerLevel').textContent=game.level;
 $('xpText').textContent=game.level>=100?'MAX':`${game.xp} / ${xpNeeded(game.level)} XP`;
 $('money').textContent=fmtMoney(game.money);
 $('completed').textContent=`${game.completed} / 20`;
 $('rep').textContent=game.rep;
 ensureResources();
 const restMs=restRemainingMs();
 $('fatigueValue').textContent=Math.round(game.fatigue)+'%';
 $('fatigueBar').style.width=Math.min(100,game.fatigue)+'%';
 $('fatigueBar').className=game.fatigue>=80?'danger-fatigue':game.fatigue>=55?'warn-fatigue':'';
 $('restText').textContent=restMs>0?'отдых ещё '+fmtRest(restMs):game.fatigue>=70?'нужен отдых':'готов к гонке';
 $('gelCount').textContent=game.resources.gels;
 $('gelNeedText').textContent='на эту гонку нужно ≈ '+gelsNeeded(L);
 if(isRechargeableLamp()){
   $('lampPowerText').textContent='🔋 '+Math.round(game.lampCharge)+'%';
   $('lampPowerSub').textContent=game.resources.powerbank>0?'powerbank есть':'без powerbank';
 }else{
   $('lampPowerText').textContent='🔦 '+game.resources.batteries+' компл.';
   $('lampPowerSub').textContent='фонарь на батарейках';
 }
 $('medkitSummary').textContent=medkitScore()+'/5';
 $('raceTitle').textContent=`${game.current+1}. ${L[0]}`;
 $('raceDistance').textContent=L[1]+' км';
 $('raceGain').textContent=L[2]+' м';
 $('raceTarget').textContent=fmt(L[3]);
 $('raceReward').textContent='до '+fmtMoney(L[4]);
 $('difficultyBadge').textContent='★'.repeat(L[5])+'☆'.repeat(5-L[5]);
 $('raceDesc').textContent=L[6];
 renderLevels();renderShop();renderGear();renderRaceGearSummary();renderResources();renderLampPower();updateRestUi();drawTrack(0);
}
function renderLevels(){
 const g=$('levelsGrid');g.innerHTML='';
 LEVELS.forEach((L,i)=>{
  const d=document.createElement('div');
  const locked=i>game.completed;
  d.className='level '+(i<game.completed?'done ':i===game.current?'current ':'')+(locked?'locked':'');
  d.innerHTML=`<h3>${i+1}. ${L[0]}</h3><div class="meta">${L[1]} км · +${L[2]} м · цель ${fmt(L[3])}<br><span class="money">до ${fmtMoney(L[4])}</span></div>
  <button class="secondary" ${locked?'disabled':''} data-level="${i}">${i<game.completed?'Переиграть':i===game.current?'Текущий уровень':'Выбрать'}</button>`;
  g.appendChild(d);
 });
 g.querySelectorAll('button[data-level]').forEach(b=>b.onclick=()=>{game.current=+b.dataset.level;saveGame();render();switchTab('race')});
}
function renderShop(){
 const g=$('shopGrid');g.innerHTML='';
 Object.entries(GEAR).forEach(([cat,list])=>{
   list.forEach((it,idx)=>{
    if(idx===0)return;
    const owned=game.gear[cat]===idx;
    const d=document.createElement('div');d.className='shop-item';
    d.innerHTML=`<h3>${CATEGORY_NAMES[cat]} · ${it[0]}</h3>
    <div class="meta">Цена: <span class="money">${fmtMoney(it[1])}</span><br>Темп ×${it[2].toFixed(3)} · ресурс ${it[3]} ед.<br>Защита от поломки +${Math.round(it[4]*100)}%</div>
    <button class="${owned?'secondary':'primary'}" ${owned||game.money<it[1]?'disabled':''} data-buy="${cat}:${idx}">${owned?'Надето':game.money<it[1]?'Не хватает ₽':'Купить и надеть'}</button>`;
    g.appendChild(d);
   });
 });
 g.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{
   const [cat,idxS]=b.dataset.buy.split(':'),idx=+idxS,it=GEAR[cat][idx];
   if(game.money<it[1])return;
   game.money-=it[1];game.gear[cat]=idx;game.durability[durKey(cat)]=it[3];saveGame();render();
 });
}
function gearEffectText(cat,idx,it){
  if(cat==='shoes') return idx===0?'базовая скорость':`скорость +${Math.round((1-it[2])*100)}%`;
  if(cat==='poles') return idx>=3?`LEKI · скорость на подъёмах +${idx===4?6:3}%`:(idx===0?'без бонуса':'помощь на подъёмах');
  if(cat==='jacket') return idx===0?'защита от дождя отсутствует':`защита от дождя · ур. ${idx+1}`;
  if(cat==='lamp') return idx>=4?'аккумулятор + powerbank':'работает на батарейках';
  if(cat==='pack') return `перенос снаряжения · ур. ${idx+1}`;
  if(cat==='watch') return idx===0?'пустой слот · навигации нет':`GPS/навигация · ур. ${idx+1}`;
  if(cat==='medkit') return idx===0?'пустой слот · лечение только расходниками':`защита от травм · ур. ${idx+1}`;
  if(cat==='hydration') return `запас воды · ур. ${idx+1}`;
  return '';
}
function renderRaceGearSummary(){
 const g=$('raceGearSummary'); if(!g) return;
 g.innerHTML='';
 Object.keys(GEAR).forEach(cat=>{
   const idx=Number(game.gear[cat]||0),it=item(cat),cur=durability(cat),max=it[3];
   const pct=Math.max(0,Math.min(100,cur/max*100));
   const slot=document.createElement('div'); slot.className='race-gear-slot '+(pct<20?'gear-danger':pct<50?'gear-warn':'');
   slot.innerHTML=`<div class="gear-slot-title"><b>${CATEGORY_NAMES[cat]}</b><span>ур. ${idx+1}/5</span></div>
     <strong>${it[0]}</strong>
     <div class="gear-slot-effect">${gearEffectText(cat,idx,it)}</div>
     <div class="durability"><div style="width:${pct}%"></div></div>
     <small>прочность ${Math.round(pct)}% · доступно уровней: 1–5</small>`;
   g.appendChild(slot);
 });
}

function renderGear(){
 const g=$('gearGrid');g.innerHTML='';
 Object.keys(GEAR).forEach(cat=>{
  const it=item(cat),cur=durability(cat),max=it[3],pct=Math.max(0,Math.min(100,cur/max*100));
  const d=document.createElement('div');d.className='gear-item';
  d.innerHTML=`<h3>${CATEGORY_NAMES[cat]} · ${it[0]}</h3><div class="meta">Прочность ${Math.round(cur)} / ${max}</div>
  <div class="durability"><div style="width:${pct}%"></div></div><div class="meta">${pct<20?'⚠️ высокий риск поломки':pct<50?'изношено':'состояние нормальное'}</div>`;
  g.appendChild(d);
 });
}
function renderResources(){
 const g=$('resourceGrid');if(!g)return;g.innerHTML='';
 Object.entries(RESOURCE_CATALOG).forEach(([key,it])=>{
   const count=Number(game.resources[key]||0);
   const d=document.createElement('div');d.className='shop-item';
   const oneOnly=key==='powerbank';
   d.innerHTML=`<h3>${it.name}</h3>
     <div class="meta">${it.desc}<br>В наличии: <b>${count}</b> ${it.unit}<br><span class="money">${fmtMoney(it.price)}</span></div>
     <button class="primary" ${oneOnly&&count>0?'disabled':''} data-resource-buy="${key}">
       ${oneOnly&&count>0?'Уже куплен':'Купить'}
     </button>`;
   g.appendChild(d);
 });
 g.querySelectorAll('[data-resource-buy]').forEach(b=>b.onclick=()=>{
   const key=b.dataset.resourceBuy,it=RESOURCE_CATALOG[key];
   if(game.money<it.price){alert('Не хватает рублей');return}
   game.money-=it.price;game.resources[key]=(game.resources[key]||0)+1;saveGame();render();
 });
}

function renderLampPower(){
 const p=$('lampPowerPanel');if(!p)return;
 const idx=Number(game.gear.lamp),it=item('lamp');
 if(idx>=4){
   p.innerHTML=`<div class="gear-item"><h3>${it[0]} · аккумулятор</h3>
   <div class="meta">Заряд: ${Math.round(game.lampCharge)}% · переносной аккумулятор: ${game.resources.powerbank>0?'есть':'нет'}</div>
   <div class="durability"><div style="width:${Math.max(0,Math.min(100,game.lampCharge))}%"></div></div>
   <button id="chargeLampBtn" class="secondary" ${game.resources.powerbank<=0||game.lampCharge>=100?'disabled':''}>⚡ Зарядить от powerbank</button></div>`;
   $('chargeLampBtn')?.addEventListener('click',()=>{
     if(game.resources.powerbank<=0)return;
     game.lampCharge=100;saveGame();render();
   });
 }else{
   p.innerHTML=`<div class="gear-item"><h3>${it[0]} · батарейки</h3>
   <div class="meta">Комплектов батареек: ${game.resources.batteries}. Один комплект даёт примерно 5 часов света.</div></div>`;
 }
}

function updateRestUi(){
 const b=$('restBtn'),s=$('restStatus');if(!b||!s)return;
 const ms=restRemainingMs();
 if(ms>0){
   b.disabled=true;b.textContent='😴 Отдых идёт…';
   s.textContent='До полного отдыха: '+fmtRest(ms)+'. Старт гонки заблокирован.';
 }else{
   if(game.restUntil){game.restUntil=0;game.fatigue=Math.max(0,game.fatigue-65);saveGame();}
   b.disabled=false;b.textContent='😴 Отдыхать 5 минут';
   s.textContent=game.fatigue>=70?'Усталость высокая — лучше отдохнуть перед следующим стартом.':'Можно стартовать.';
 }
}
setInterval(()=>{if($('restBtn')){updateRestUi(); if($('restText'))$('restText').textContent=isResting()?'отдых ещё '+fmtRest(restRemainingMs()):game.fatigue>=70?'нужен отдых':'готов к гонке'}},1000);
$('restBtn')?.addEventListener('click',()=>{
  if(isResting())return;
  game.restUntil=Date.now()+5*60*1000;saveGame();updateRestUi();
});

function totalRepairCost(){
 let s=0;Object.keys(GEAR).forEach(cat=>{const it=item(cat),cur=durability(cat);s+=(it[3]-cur)*Math.max(2,it[1]/it[3]*.28)});return Math.ceil(s);
}
$('repairAllBtn').onclick=()=>{
 const cost=totalRepairCost(); if(cost<=0)return;
 if(game.money<cost){alert('Не хватает рублей. Нужно '+fmtMoney(cost));return}
 game.money-=cost;Object.keys(GEAR).forEach(cat=>setDur(cat,item(cat)[3]));saveGame();render();
};

function switchTab(id){
 const el=document.getElementById(id);
 if(!el) return;
 if(el.tagName==='DETAILS') el.open=true;
 el.scrollIntoView({behavior:'smooth',block:'start'});
}
$('scrollShopBtn')?.addEventListener('click',()=>switchTab('shop'));

function gearTimeFactor(){
 let f=1;
 Object.keys(GEAR).forEach(cat=>{
   const it=item(cat);
   // Broken gear loses its speed benefit.
   if(durability(cat)<=0) return;
   f*=it[2];
 });
 // LEKI poles give an extra climbing/running bonus.
 if(game.gear.poles===3 && durability('poles')>0) f*=0.985;
 if(game.gear.poles===4 && durability('poles')>0) f*=0.97;
 return Math.max(.68,f);
}
function equipmentPenaltyChance(cat,diff,dist){
 const it=item(cat),cur=durability(cat),max=it[3];
 const wear=1-cur/max;
 const protect=it[4];
 return Math.min(.55,Math.max(.01,.025*diff + dist/3500 + wear*.22 - protect));
}
function wearFor(cat,L){
 const it=item(cat),diff=L[5],dist=L[1],gain=L[2];
 let base=dist/18 + gain/1800 + diff*.5;
 if(cat==='shoes')base*=1.35;
 if(cat==='poles')base*=1+gain/8000;
 if(cat==='jacket')base*=1+diff*.08;
 return base*(.75+Math.random()*.55);
}
function buildEvents(L){
 const n=Math.max(3,Math.min(10,3+Math.floor(L[1]/80)+L[5]));
 const pool=[
  ['🪨','Каменный участок',60,'shoes'],
  ['🌧️','Ливень',120,'jacket'],
  ['🌙','Ночь',180,'lamp'],
  ['🥵','Жара',150,'hydration'],
  ['🎒','Потёр плечи',90,'pack'],
  ['⛰️','Крутой подъём',120,'poles'],
  ['📸','Остановились пофоткать',180,null],
  ['👏','Болельщики включили турбо',-180,null],
  ['🔥','Второе дыхание',-120,null],
  ['🍊','Удачный ПП',-90,null],
  ['🧭','Сбился с трека',240,null],
  ['🦟','Атака насекомых',75,null],
  ['🩹','Ссадина',90,'medkit'],
  ['🦶','Натёр ногу',120,'cream'],
  ['🤕','Падение',180,'injury'],
  ['😅','Слишком быстро на старте',120,null],
  ['👟','Развязался шнурок',60,'shoes'],
  ['🚰','Очередь за водой на ПП',180,'hydration'],
  ['💧','Брод пройден идеально',-120,null],
  ['💦','Тяжёлый брод',150,'shoes'],
  ['🍌','Банан на ПП зашёл идеально',-60,null],
  ['🎵','Музыка на ПП придала сил',-75,null],
  ['😫','Накрыла усталость',300,null],
  ['🤢','Гель не зашёл',120,null],
  ['🍯','Гель сработал идеально',-90,null],
  ['🌬️','Попутный ветер',-120,null],
  ['💨','Сильный встречный ветер',180,null],
  ['☀️','Стало жарко',120,'hydration'],
  ['❄️','Резко похолодало',120,'jacket'],
  ['🧦','Камешек в кроссовке',75,'shoes'],
  ['🪵','Перепрыгнул поваленное дерево',-30,null],
  ['🧠','Идеально разложил силы',-150,null]
 ];
 const ev=[];
 for(let i=0;i<n;i++){
   const p=.08+(i+1)/(n+1)*.84;
   let x=pool[Math.floor(Math.random()*pool.length)];
   // Стартовые события только в первой половине; очередь за водой — только на условном ПП.
   if(x[1]==='Слишком быстро на старте' && p>.5) x=pool[0];
   if(x[1]==='Очередь за водой на ПП') p=Math.min(.9, Math.max(.25, Math.round(p*4)/4));
   ev.push({p,...{emoji:x[0],name:x[1],sec:x[2],cat:x[3]}});
 }
 return ev.sort((a,b)=>a.p-b.p);
}
function startRace(){
 if(run && run.running)return;
 ensureResources();
 const L=levelData();

 if(isResting()){
   $('preRaceNote').textContent='😴 Вы отдыхаете. До следующего старта: '+fmtRest(restRemainingMs());
   switchTab('resources');return;
 }

 // Обязательная проверка экипировки перед каждым стартом.
 if(!$('startBtn').dataset.checked){
   const problems=[];
   Object.keys(GEAR).forEach(cat=>{ if(durability(cat)<=0) problems.push(CATEGORY_NAMES[cat]+' сломана'); });
   if(game.gear.shoes===0) problems.push('кроссовки уровня 1 — базовые');
   const msg='ПРОВЕРКА ЭКИПИРОВКИ\n\n'+Object.keys(GEAR).map(cat=>'✓ '+CATEGORY_NAMES[cat]+': '+item(cat)[0]+' · '+Math.round(durability(cat))+'% ресурса').join('\n')+'\n\nАптечка: '+medkitScore()+'/5 · Гели: '+game.resources.gels+(problems.length?'\n\n⚠️ '+problems.join(' · '):'\n\n✅ К старту готов.');
   alert(msg+'\n\nНажмите «Старт» ещё раз для запуска гонки.');
   $('startBtn').dataset.checked='1';
   return;
 }
 $('startBtn').dataset.checked='';

 const needGels=gelsNeeded(L);
 const lampHours=lampHoursNeeded(L);
 let warnings=[];

 if(game.resources.gels<needGels) warnings.push(`гелей ${game.resources.gels}/${needGels}`);
 if(lampHours>0){
   if(isRechargeableLamp()){
     const requiredCharge=Math.min(100,Math.ceil(lampHours*12));
     if(game.lampCharge<requiredCharge && game.resources.powerbank<=0) warnings.push('не хватает заряда фонаря');
   }else{
     const needBat=Math.ceil(lampHours/5);
     if(game.resources.batteries<needBat) warnings.push(`батареек ${game.resources.batteries}/${needBat}`);
   }
 }
 if(medkitScore()<3) warnings.push('аптечка неполная');
 if(game.fatigue>=70) warnings.push(`усталость ${Math.round(game.fatigue)}%`);

 $('raceResourceWarning').textContent=warnings.length
   ? '⚠️ Риски перед стартом: '+warnings.join(' · ')
   : '✅ Запас расходников и состояние нормальные.';

 if(game.level<Math.max(1,game.current*3-2)){
   $('preRaceNote').textContent=`⚠️ Рекомендуемый уровень трейлраннера: ${Math.max(1,game.current*3-2)}. Можно стартовать, но будет сложнее.`;
 }

 // Consume gels gradually through the race, but reserve the planned amount here.
 const gelsAvailable=Math.min(game.resources.gels,needGels);
 const gelShortage=Math.max(0,needGels-gelsAvailable);
 useResource('gels',gelsAvailable);

 // Lamp power consumed at start for predictable gameplay.
 let lightShortageHours=0;
 if(lampHours>0){
   if(isRechargeableLamp()){
     const chargeNeed=Math.min(100,Math.ceil(lampHours*12));
     if(game.lampCharge>=chargeNeed){
       game.lampCharge-=chargeNeed;
     }else{
       let deficit=chargeNeed-game.lampCharge;
       game.lampCharge=0;
       if(game.resources.powerbank>0){
         game.lampCharge=Math.max(0,100-deficit);
       }else{
         lightShortageHours=Math.ceil(deficit/12);
       }
     }
   }else{
     const needBat=Math.ceil(lampHours/5);
     const used=Math.min(needBat,game.resources.batteries);
     useResource('batteries',used);
     lightShortageHours=Math.max(0,lampHours-used*5);
   }
 }

 saveGame();

 const fatiguePenaltySec=Math.round(Math.max(0,game.fatigue-35)*L[3]/1000);
 const gelPenaltySec=Math.round(gelShortage*Math.min(420,120+L[5]*45));
 const lightPenaltySec=Math.round(lightShortageHours*600);

 run={
   running:true,paused:false,p:0,base:L[3]*gearTimeFactor(),
   elapsed:0,penalty:fatiguePenaltySec+gelPenaltySec+lightPenaltySec,
   events:buildEvents(L),fired:new Set(),
   position:Math.max(1,Math.round(12+L[5]*6-game.level/4+Math.random()*8)),
   condition:game.fatigue>=75?'сильная усталость':'нормально',
   gelShortage,lightShortageHours,
   fractureRisk:Math.min(.42, Math.max(0,(game.fatigue-55)/140) + (Date.now()-(game.lastFinishAt||0)<10*60*1000 ? .08 : 0)),
   dnf:false
 };
 $('eventLog').innerHTML='';
 if(gelShortage>0) $('eventLog').insertAdjacentHTML('afterbegin',`<div class="event-row"><span>СТАРТ</span><b>🍯 Не хватает гелей: ${gelShortage}</b><span class="bad">+${fmt(gelPenaltySec)}</span></div>`);
 if(lightShortageHours>0) $('eventLog').insertAdjacentHTML('afterbegin',`<div class="event-row"><span>СТАРТ</span><b>🔦 Не хватает света: ${lightShortageHours} ч</b><span class="bad">+${fmt(lightPenaltySec)}</span></div>`);
 if(fatiguePenaltySec>0) $('eventLog').insertAdjacentHTML('afterbegin',`<div class="event-row"><span>СТАРТ</span><b>😫 Накопленная усталость ${Math.round(game.fatigue)}%</b><span class="bad">+${fmt(fatiguePenaltySec)}</span></div>`);
 $('startBtn').disabled=true;$('pauseBtn').disabled=false;
 lastTs=performance.now();timer=requestAnimationFrame(tick);
}
function tick(ts){
 if(!run||!run.running)return;
 // Визуальная симуляция ускорена ещё в 1.5 раза; игровое финишное время не меняется.
 const dt=(ts-lastTs)/1000*Number($('speed').value||2);lastTs=ts;
 if(!run.paused){
   const total=Math.max(60,run.base+run.penalty);
   run.elapsed+=dt;
   run.p=Math.min(1,run.elapsed/total);
   fireEvents();
   updateRun();
 }
 if(run.dnf)return; if(run.p>=1)finishRace(false); else timer=requestAnimationFrame(tick);
}
function fireEvents(){
 run.events.forEach((ev,i)=>{
  if(run.p>=ev.p&&!run.fired.has(i)){
   run.fired.add(i);
   let sec=ev.sec,extra='';

   // Medical events.
   if(ev.cat==='medkit'){
     if(game.resources.bandage>0 && game.resources.peroxide>0){
       useResource('bandage');useResource('peroxide');sec=0;
       extra=' · бинт + перекись → обработано';
     }else if(game.resources.gauze>0 && game.resources.peroxide>0){
       useResource('gauze');useResource('peroxide');sec=Math.round(sec*.35);
       extra=' · марля + перекись → частично обработано';
     }else{
       sec+=180;extra=' · аптечки не хватает';
     }
     saveGame();
   }else if(ev.cat==='cream'){
     if(game.resources.cream>0){
       useResource('cream');sec=0;extra=' · крем помог';
     }else if(game.resources.plaster>0){
       useResource('plaster');sec=Math.round(sec*.4);extra=' · пластырь помог частично';
     }else{
       sec+=180;extra=' · нечем обработать натирание';
     }
     saveGame();
   }else if(ev.cat==='injury'){
     const fracture=Math.random()<run.fractureRisk;
     if(fracture){
       run.dnf=true;run.condition='перелом ноги';
       showEvent({emoji:'🦴',name:'Перелом ноги'},0,' · DNF');
       setTimeout(()=>finishRace(true),1200);
       return;
     }else if(game.resources.gauze>0 && game.resources.bandage>0){
       useResource('gauze');useResource('bandage');sec=Math.round(sec*.3);
       extra=' · аптечка снизила последствия';
       saveGame();
     }else{
       sec+=240;extra=' · травма без полноценной аптечки';
     }
   }else if(ev.cat){
     const broken=Math.random()<equipmentPenaltyChance(ev.cat,levelData()[5],levelData()[1]);
     const it=item(ev.cat),cur=durability(ev.cat);
     if(cur<=0||broken){
       sec+=180+levelData()[5]*60;
       extra=` · ⚠️ ${CATEGORY_NAMES[ev.cat]} подвела`;
       run.condition='проблема с экипировкой';
       if(ev.cat==='poles'){
         setDur('poles',0);
         extra+=' · палки сломаны';
       }
     }else if(it[4]>.05 && sec>0){
       const saved=Math.round(sec*Math.min(.65,it[4]*3));
       sec-=saved;extra=` · экипировка спасла ${fmt(saved)}`;
     }
   }

   run.penalty+=sec;
   showEvent(ev,sec,extra);
  }
 });
}
function showEvent(ev,sec,extra){
 const ov=$('eventOverlay');ov.innerHTML=`<div class="overlay-box"><div class="emoji">${ev.emoji}</div><b>${ev.name}</b><span>${sec>=0?'+':'−'}${fmt(Math.abs(sec))}${extra}</span></div>`;ov.classList.add('show');
 setTimeout(()=>ov.classList.remove('show'),1600);
 const cls=sec<0?'good':sec>0?'bad':'neutral';
 $('eventLog').insertAdjacentHTML('afterbegin',`<div class="event-row"><span>${(run.p*levelData()[1]).toFixed(1)} км</span><b>${ev.emoji} ${ev.name}${extra}</b><span class="${cls}">${sec>=0?'+':'−'}${fmt(Math.abs(sec))}</span></div>`);
}
function updateRun(){
 const L=levelData(),km=run.p*L[1],total=Math.max(1,run.base+run.penalty);
 $('progressKm').textContent=`${km.toFixed(1)} / ${L[1].toFixed(1)} км`;
 $('clock').textContent=fmt(run.elapsed);
 $('progressBar').style.width=(run.p*100)+'%';
 $('pace').textContent=fmt(total/L[1]).replace(':',' : ')+' /км';
 const estimatedPos=Math.max(1,Math.round(run.position-run.p*(game.level/15+Math.max(0,-run.penalty)/240)));
 run.currentPosition=estimatedPos;
 $('position').textContent=estimatedPos;
 $('penalties').textContent=(run.penalty>=0?'+':'−')+fmt(Math.abs(run.penalty));
 $('condition').textContent=run.condition;
 drawTrack(run.p);
}
function finishRace(forceDnf=false){
 if(!run||!run.running)return;
 run.running=false;cancelAnimationFrame(timer);$('pauseBtn').disabled=true;$('startBtn').disabled=false;
 const L=levelData();

 if(forceDnf || run.dnf){
   game.fatigue=Math.min(100,game.fatigue+18+L[5]*3);
   game.lastFinishAt=Date.now();
   saveGame();
   const ov=$('finishOverlay');
   ov.innerHTML=`<div class="overlay-box"><div class="emoji">🦴</div><b>DNF · перелом ноги</b><span>Слишком высокая нагрузка и мало отдыха. Отдохните 5 минут перед новой попыткой.</span></div>`;
   ov.classList.add('show');
   setTimeout(()=>{ov.classList.remove('show');render();switchTab('resources')},5000);
   return;
 }

 // durability after race
 let breaks=[];
 Object.keys(GEAR).forEach(cat=>{
  const before=durability(cat),loss=wearFor(cat,L),after=Math.max(0,before-loss);setDur(cat,after);
  if(before>0&&after<=0)breaks.push(CATEGORY_NAMES[cat]);
 });

 const final=Math.max(1,run.base+run.penalty);
 const ratio=L[3]/final;
 let pos=Math.max(1,Math.round(12+L[5]*6-game.level/3-ratio*10+Math.random()*8));
 if(ratio>=1.03)pos=Math.max(1,pos-5);
 if(ratio>=1.08)pos=1;

 const quality=Math.max(.45,Math.min(1.55,ratio));
 let reward=Math.round(L[4]*Math.max(.35,Math.min(1.55,.55+quality*.55))*(pos===1?1.35:pos<=3?1.18:1));
 const xp=Math.round(35+L[5]*18+L[1]/8+(pos===1?45:pos<=3?25:0));

 game.money+=reward;addXp(xp);game.rep+=pos===1?8:pos<=3?5:pos<=10?2:1;
 if(game.best[game.current]==null||final<game.best[game.current])game.best[game.current]=final;

 // Fatigue: long races and quick repeats accumulate it heavily.
 const sinceLast=Date.now()-(game.lastFinishAt||0);
 const repeatPenalty=(game.lastFinishAt && sinceLast<15*60*1000)?16:0;
 const raceFatigue=Math.min(48,7+L[5]*4+Math.sqrt(L[1])*1.5);
 game.fatigue=Math.min(100,game.fatigue+raceFatigue+repeatPenalty);
 game.lastFinishAt=Date.now();

 const firstClear=game.current===game.completed;
 if(firstClear)game.completed=Math.min(20,game.completed+1);
 if(game.current<19 && firstClear)game.current++;
 saveGame();

 const champ=game.completed>=20;
 const ov=$('finishOverlay');
 ov.innerHTML=`<div class="overlay-box"><div class="emoji">${champ?'👑🏆':'🏁'}</div><b>${champ?'ТЫ ЧЕМПИОН АРМАГЕДДОНА!':`Финиш · ${pos} место`}</b><span>Время ${fmt(final)} · заработано ${fmtMoney(reward)} · +${xp} XP<br>Усталость: ${Math.round(game.fatigue)}%${breaks.length?`<br>Сломалось: ${breaks.join(', ')}`:''}</span></div>`;
 ov.classList.add('show');
 setTimeout(()=>{ov.classList.remove('show');render()},champ?7000:4200);
}
$('startBtn').onclick=startRace;
$('pauseBtn').onclick=()=>{if(!run)return;run.paused=!run.paused;$('pauseBtn').textContent=run.paused?'▶ Продолжить':'Ⅱ Пауза';lastTs=performance.now()};
$('resetBtn').onclick=()=>{if(timer)cancelAnimationFrame(timer);run=null;$('startBtn').disabled=false;$('pauseBtn').disabled=true;$('pauseBtn').textContent='Ⅱ Пауза';$('progressBar').style.width='0';$('eventLog').innerHTML='<div class="muted">События появятся по ходу гонки.</div>';render()};
$('resetGameBtn').onclick=()=>{if(confirm('Сбросить весь прогресс, деньги и экипировку?')){localStorage.removeItem('trailArmageddonSave');game=loadGame();render()}};

function drawRunnerFacingForward(ctx,x,y,scale=1){
 // Stylised runner moving to the right: face/body orientation follows the finish.
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 ctx.lineCap='round';ctx.lineJoin='round';
 // legs
 ctx.strokeStyle='#f5f7fb';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(-3,8);ctx.lineTo(12,30);ctx.lineTo(28,31);ctx.stroke();
 ctx.beginPath();ctx.moveTo(-1,8);ctx.lineTo(-15,27);ctx.lineTo(-28,24);ctx.stroke();
 // torso leaning forward
 ctx.strokeStyle='#f59e0b';ctx.lineWidth=14;ctx.beginPath();ctx.moveTo(-3,-22);ctx.lineTo(6,7);ctx.stroke();
 // backpack
 ctx.fillStyle='#dc2626';ctx.fillRect(-17,-24,14,24);
 // arms
 ctx.strokeStyle='#f5c7a7';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(19,-3);ctx.lineTo(29,-12);ctx.stroke();
 ctx.beginPath();ctx.moveTo(-5,-13);ctx.lineTo(-17,-3);ctx.stroke();
 // head, looking forward/right
 ctx.fillStyle='#f5c7a7';ctx.beginPath();ctx.arc(8,-35,10,0,Math.PI*2);ctx.fill();
 // cap visor points toward finish
 ctx.fillStyle='#2563eb';ctx.fillRect(-2,-46,19,7);ctx.fillRect(14,-42,13,4);
 ctx.restore();
}
function drawOpponent(ctx,x,y,scale=1,color='#60a5fa'){
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=4;ctx.lineCap='round';
 ctx.beginPath();ctx.arc(4,-18,5,0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(7,2);ctx.moveTo(6,-5);ctx.lineTo(16,1);ctx.moveTo(6,2);ctx.lineTo(16,15);ctx.moveTo(5,2);ctx.lineTo(-5,14);ctx.stroke();ctx.restore();
}
function drawTrack(p){
 const c=$('trackCanvas'),ctx=c.getContext('2d'),W=c.width,H=c.height,L=levelData();
 ctx.clearRect(0,0,W,H);
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#153554');sky.addColorStop(.62,'#8b5a24');sky.addColorStop(1,'#503a2d');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
 // mountains
 ctx.fillStyle='#0c2130';ctx.beginPath();ctx.moveTo(0,H*.72);
 for(let i=0;i<=8;i++)ctx.lineTo(i*W/8,H*(.58+(i%2)*.08));ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();
 // profile
 const base=H*.55,amp=Math.min(H*.28,60+L[5]*25);
 ctx.beginPath();
 for(let i=0;i<=100;i++){
  const x=i/100*W;
  const y=base-Math.sin(i/100*Math.PI*(2+L[5]))*amp*.45-Math.sin(i/100*Math.PI*6)*amp*.18;
  i?ctx.lineTo(x,y):ctx.moveTo(x,y);
 }
 ctx.strokeStyle='#22c55e';ctx.lineWidth=8;ctx.stroke();

 const pos=run?.currentPosition||run?.position||18;
 const x=65+p*(W-160),ground=H*.82;

 // If not leading, show the main pack ahead.
 if(pos>6){
   const gx=Math.min(W-185,x+125), gy=ground-18;
   for(let i=0;i<6;i++) drawOpponent(ctx,gx+(i%3)*24,gy+Math.floor(i/3)*18,.72,['#60a5fa','#34d399','#f59e0b'][i%3]);
   ctx.fillStyle='rgba(5,15,28,.86)';ctx.fillRect(gx-10,gy-82,120,42);
   ctx.fillStyle='#fff';ctx.font='bold 16px sans-serif';ctx.fillText('ГРУППА',gx+12,gy-58);
   ctx.font='14px sans-serif';ctx.fillText(`места 6–${Math.max(10,pos-1)}`,gx+8,gy-41);
 }
 // Top-5 leaders visible farther ahead whenever runner is not first.
 if(pos>1){
   const lx=Math.min(W-95,x+260),ly=ground-65;
   for(let i=0;i<5;i++) drawOpponent(ctx,lx+(i%2)*20,ly+Math.floor(i/2)*15,.58,'#fbbf24');
   ctx.fillStyle='rgba(5,15,28,.9)';ctx.fillRect(lx-25,ly-76,110,40);
   ctx.fillStyle='#fde68a';ctx.font='bold 15px sans-serif';ctx.fillText('ЛИДЕРЫ 1–5',lx-13,ly-51);
 }

 // runner faces toward the finish (right), not toward the viewer
 drawRunnerFacingForward(ctx,x,ground,1.15);
 ctx.fillStyle='#fff';ctx.font='22px sans-serif';ctx.fillText(`${(p*L[1]).toFixed(1)} км`,Math.max(10,x-35),ground+48);
}

render();

const APP_VERSION='1.0';





function realLeaderBattleName(){
  try{
    if(!run || !run.running) return '';
    const L=levelData();
    const pKm=Math.max(0,Math.min(Number(L[1]||0),Number(run.p||0)*Number(L[1]||0)));
    const rows=dynamicLeaderRows(L).filter(r=>r && r.c && !r.c.dnf);
    if(!rows.length) return '';

    // Prefer the closest real rival ahead of the player.
    const ahead=rows
      .filter(r=>Number(r.liveKm||0)>=pKm)
      .sort((a,b)=>Number(a.liveKm||0)-Number(b.liveKm||0));
    const rival=ahead[0] || rows.sort((a,b)=>Number(b.liveKm||0)-Number(a.liveKm||0))[0];
    return String(rival?.c?.name||'').trim();
  }catch(e){ return ''; }
}
function leaderBattleLabel(){
  const name=realLeaderBattleName();
  return name ? `Борьба с лидером: ${name}` : 'Борьба с лидером';
}

function setWaterBottlesIndependent(value){
  game.waterBottles=Math.max(0,Number(value||0));
  saveGame();
  render();
}
function setGelsIndependent(value){
  game.gels=Math.max(0,Number(value||0));
  saveGame();
  render();
}

function dynamicLeaderGroupExchange(run){
  if(!run) return;
  const arr=Array.isArray(run.participants)?run.participants:
            Array.isArray(run.runners)?run.runners:null;
  if(!arr || arr.length<4) return;

  const distOf=r=>Number(r.distance ?? r.km ?? r.progressKm ?? r.dist ?? 0);
  const active=arr.filter(r=>r && !r.dnf && !r.dropped);
  if(active.length<4) return;

  active.sort((a,b)=>distOf(b)-distOf(a));

  // Small live variation around the front pack. This allows a runner from the
  // main group to attack into top-3 and a current leader to fall back.
  const front=active.slice(0,Math.min(10,active.length));
  for(const r of front){
    if(r.isPlayer) continue;
    const swing=(Math.random()-.5)*0.18; // temporary speed variation
    if('speedFactor' in r) r.speedFactor=Math.max(.82,Math.min(1.0018,(Number(r.speedFactor)||1)+swing*.08));
    if('paceFactor' in r) r.paceFactor=Math.max(.72,Math.min(1.18,(Number(r.paceFactor)||1)-swing*.07));
  }

  // Always derive leader/group membership from current distance, never from
  // a fixed list selected at race start.
  active.sort((a,b)=>distOf(b)-distOf(a));
  active.forEach((r,i)=>{
    r.liveRank=i+1;
    r.isLeader=(i<3);
    r.inMainGroup=(i>=3 && i<10);
  });
}

function ensureRussianElitesAfterLevel7(race, runners){
  const raceLevel=Number((race&&(race.level ?? race.difficulty ?? race.stars ?? race.requiredLevel))||0);
  if(raceLevel<=7 || !Array.isArray(runners)) return runners;

  // All Russian elite rivals from the in-game ITRA table are permanent from level 8.
  const elites=[
    {name:'Алексей Береснев',itra:905},
    {name:'Антонина Юшина',itra:890},
    {name:'Алексей Толстенко',itra:865},
    {name:'Константин Иванов',itra:850},
    {name:'Елена Носкова',itra:840},
    {name:'Василий Корыткин',itra:835},
    {name:'Алексей Макалюкин',itra:825},
    {name:'Алексей Бабушкин',itra:815},
    {name:'Павел Тарасов',itra:805},
    {name:'Виктория Жукова',itra:795},
    {name:'Мария Гостева',itra:785},
    {name:'Вера Чекалина',itra:775}
  ];
  const norm=s=>String(s||'').trim().toLowerCase();

  for(const elite of elites){
    if(runners.some(r=>norm(r.name||r.fullName)===norm(elite.name))) continue;
    const sample=runners.find(r=>r && typeof r==='object')||{};
    const npc={...sample};
    npc.name=elite.name;
    if('fullName' in npc) npc.fullName=elite.name;
    if('itra' in npc || !('rating' in npc)) npc.itra=elite.itra;
    if('rating' in npc) npc.rating=elite.itra;
    if('country' in npc) npc.country='RU';
    if('isPlayer' in npc) npc.isPlayer=false;
    if('dnf' in npc) npc.dnf=false;
    if('dropped' in npc) npc.dropped=false;

    // Scale competitive strength by ITRA: stronger names tend to run nearer the front,
    // but live-race variation can still change their order.
    const strength=Math.max(0,Math.min(1,(elite.itra-775)/(905-775)));
    if('paceFactor' in npc) npc.paceFactor=0.86-(0.08*strength);
    if('speedFactor' in npc) npc.speedFactor=1.10+(0.08*strength);
    runners.push(npc);
  }
  return runners;
}
function purchasesLockedDuringRace(){
  if(run && run.running){
    showGameError('Во время гонки нельзя покупать или менять экипировку и расходники. Дождитесь финиша.');
    return true;
  }
  return false;
}

function enforceRegisteredLogin(){
  try{
    const u = (typeof authUser !== 'undefined') ? authUser : null;
    if(!u || !u.nick){
      const auth = document.getElementById('authScreen') || document.querySelector('.auth-screen');
      const game = document.getElementById('gameScreen') || document.querySelector('.game-screen') || document.querySelector('main');
      if(auth) { auth.style.display=''; auth.hidden=false; }
      if(game && auth && !auth.contains(game)) game.style.display='none';
      return false;
    }
    return true;
  }catch(e){ return false; }
}


const LEVELS=[["Парковый трейл", 5, 80, 2040, 900, 1, "Лёгкий разогрев: дорожки, корни и первый подъём."], ["Лесная десятка", 10, 220, 4080, 1300, 1, "Первые камни, грязь и короткие технические спуски."], ["Грязевой полумарафон", 21, 600, 9300, 2200, 2, "Дождь, лужи, первые серьёзные штрафы за обувь."], ["Скальный забег", 25, 1100, 11400, 2800, 2, "Камни и острые спуски. Палки начинают приносить пользу."], ["Ночной трейл", 30, 900, 13500, 3500, 2, "Фонарик становится критичным."], ["Горный марафон", 42, 1900, 21600, 4700, 3, "Длинные подъёмы и первый серьёзный тест выносливости."], ["Хребет ветров", 50, 2300, 27000, 5600, 3, "Ветер и холод усиливают износ мембранки."], ["Ультра 60", 60, 2500, 32400, 6500, 3, "Четыре ПП, жара и длинные участки без воды."], ["Каменный лабиринт", 70, 3300, 39600, 7600, 3, "Камни ускоряют износ обуви и палок."], ["Северный шторм", 80, 3600, 46800, 9000, 4, "Дождь, ветер и холод. Дешёвая экипировка быстро сдаётся."], ["100 км классика", 100, 4300, 61200, 11000, 4, "Первый настоящий 100 км ультратрейл."], ["Высотная сотня", 110, 6000, 79200, 13500, 4, "Много набора и технический рельеф."], ["Дикий 130", 130, 5200, 90000, 15000, 4, "Длинные ночные часы и риск поломок."], ["200 км пустошь", 200, 6500, 151200, 21000, 4, "Жара, вода и питание становятся главным ресурсом."], ["Альпийский 250", 250, 12000, 208800, 27000, 5, "Очень высокий износ, долгие спуски, холодные ночи."], ["Трансгорный 300", 300, 15000, 259200, 33000, 5, "Экипировка среднего класса уже на пределе."], ["Дикий пояс 400", 400, 18000, 345600, 42000, 5, "Многосуточный забег: прочность вещей решает."], ["Край света 500", 500, 23000, 450000, 52000, 5, "Погода, сон и поломки начинают складываться."], ["Безумие 700", 700, 32000, 648000, 70000, 5, "Предфинальная гонка. Нужен высокий уровень трейлраннера."], ["АРМАГЕДДОН 1000", 1000, 50000, 1008000, 100000, 5, "Финал: 1000 км, 50 000 м+, ночь, жара, шторм и максимальный износ."]];
const GEAR={"shoes":[["Базовые кроссовки",0,1.0,65,0.0],["Trail Grip",450,0.97,110,0.04],["Mountain Pro",1300,0.94,180,0.08],["Ultra Carbon",3000,0.91,280,0.12],["Armageddon X",7500,0.88,500,0.18],["Hyper Trail Pro",13000,0.845,760,0.23],["Titanium Speed X",23750,0.81,1100,0.3]],"jacket":[["Нет мембранки",0,1.0,999,0],["Лёгкая мембранка",400,0.99,90,0.03],["Storm Shell",1125,0.98,160,0.06],["Alpine Shield",2500,0.97,260,0.1],["Armageddon Shell",6500,0.96,480,0.15],["Expedition Shield",11500,0.945,760,0.21],["Titan Storm Armor",21250,0.93,1150,0.28]],"lamp":[["Простой фонарь",0,1.0,70,0.0],["Night 400",350,0.995,120,0.03],["Night 800",950,0.99,200,0.06],["Ultra Beam",2250,0.985,320,0.1],["Recharge Pro X",5500,0.98,520,0.14],["Recharge Ultra 2000",10500,0.965,780,0.22],["Night Reactor 3000",20000,0.95,1200,0.3]],"pack":[["Старый рюкзак",0,1.0,80,0.0],["Race Vest 5L",425,0.99,120,0.03],["Ultra Vest 12L",1200,0.98,210,0.06],["Endurance Pack",2750,0.97,330,0.1],["Armageddon Pack",6750,0.96,550,0.15],["Expedition Vest 18L",11750,0.945,800,0.22],["Titan Ultra Pack",22000,0.93,1250,0.3]],"poles":[["Без палок",0,1.0,999,0.0],["Алюминиевые палки",475,0.985,100,0.04],["Carbon Trek",1300,0.97,180,0.08],["LEKI Ultra Carbon",3000,0.955,300,0.12],["LEKI Armageddon",7250,0.94,520,0.18],["LEKI Vertical Pro",12500,0.915,780,0.24],["LEKI Titanium X",23000,0.89,1200,0.32]],"hydration":[["Фляга 500 мл",0,1.0,100,0.0],["2×Soft Flask",300,0.99,160,0.03],["Hydro Vest",900,0.98,250,0.06],["Ultra Hydro",2125,0.97,380,0.1],["Armageddon Hydro",5250,0.96,600,0.15],["Expedition Hydro",9750,0.945,850,0.22],["Titan Hydro System",19000,0.93,1300,0.3]],"watch":[["Нет часов",0,1.0,999,0.0],["GPS Start",450,0.998,180,0.02],["Trail GPS",1400,0.995,280,0.05],["Endurance GPS",3600,0.99,420,0.08],["Fenix Ultra",9000,0.985,650,0.12],["Fenix Expedition",19000,0.975,900,0.2],["Fenix Armageddon",36000,0.965,1400,0.28]],"medkit":[["Пустой слот",0,1.0,999,0.0],["Мини-аптечка",350,0.999,120,0.03],["Trail аптечка",1050,0.997,220,0.06],["Ultra аптечка",2600,0.995,360,0.1],["Armageddon Med",6500,0.99,600,0.15],["Expedition Med Pro",14000,0.985,900,0.22],["Trauma Armageddon Kit",27500,0.975,1400,0.3]]};
const CATEGORY_NAMES={shoes:'Кроссовки',pack:'Рюкзак / жилет',jacket:'Мембранка',lamp:'Фонарик',poles:'Палки',watch:'Часы',medkit:'Аптечка',hydration:'Вода'};
const RESOURCE_CATALOG={
  waterBottles:{name:'Вода 0,5 л',price:80,unit:'бут.',desc:'Обязательна с 4 уровня. Расход зависит от дистанции, жары и солнца.'},
  gels:{name:'Энергетический гель «УГЛИ»',price:60,unit:'шт.',desc:'Снижает голод и потерю темпа на длинной гонке.'},
  batteries:{name:'Комплект батареек',price:130,unit:'компл.',desc:'Для фонарей 1–4 уровня. Один комплект ≈ 5 часов света.'},
  bandage:{name:'Бинт',price:40,unit:'шт.',desc:'Сильные ссадины и растяжения.'},
  gauze:{name:'Марля',price:22,unit:'уп.',desc:'Кровь и глубокие царапины.'},
  peroxide:{name:'Перекись',price:35,unit:'фл.',desc:'Обработка ран.'},
  plaster:{name:'Пластырь',price:28,unit:'уп.',desc:'Мелкие порезы и мозоли.'},
  cream:{name:'Крем от натирания',price:60,unit:'тюб.',desc:'Снижает риск натираний.'},
  rescueBlanket:{name:'Спасательное одеяло',price:120,unit:'шт.',desc:'Теплозащита при переохлаждении, травме и вынужденной остановке.'},
  medkits:{name:'Собранная аптечка',price:0,unit:'компл.',desc:'Готовый комплект: бинт + марля + перекись + пластырь + крем + спасательное одеяло.'},
  accumulator:{name:'Сменный аккумулятор фонаря',price:900,unit:'шт.',desc:'Для фонарей уровней 5–7. Можно заменить разряженный аккумулятор прямо в гонке.'},
  powerbank:{name:'Переносной powerbank',price:2250,unit:'шт.',desc:'Заряжает аккумулятор фонаря уровней 5–7.'}
};
const START_GEAR={shoes:0,pack:0,jacket:0,lamp:0,poles:0,watch:0,medkit:0,hydration:0};
const $=id=>document.getElementById(id);
function showGameError(message){
 const el=$('gameErrorToast');
 if(!el) return;
 el.textContent='⚠️ '+message;
 el.classList.add('show');
 clearTimeout(window.__gameErrorTimer);
 window.__gameErrorTimer=setTimeout(()=>el.classList.remove('show'),4500);
}

let game=loadGame();
let run=null,timer=null,lastTs=0;

const COACHES=[
 {name:'Без тренера',price:0,mult:1.00,maxDifficulty:1,trainingGain:1.0,fitnessCap:30,
  desc:'Самостоятельная база. Тренированность можно поднять только до 30/100.',
  bonuses:'без тренера: нет специальных бонусов'},
 {name:'Базовый тренер',price:2000,mult:1.0015,maxDifficulty:2,trainingGain:1.0,fitnessCap:50,
  bonuses:'−2% базового времени · −4% усталости · −3% штрафа за подъёмы',
  desc:'Готовит до 50/100 и открывает стабильную работу на ★–★★.'},
 {name:'Трейл-тренер',price:6250,mult:1.55,maxDifficulty:3,trainingGain:1.0,fitnessCap:65,
  bonuses:'−4% базового времени · −8% усталости · −6% штрафа за подъёмы',
  desc:'Готовит до 65/100 и специализируется на техничном трейле ★★–★★★.'},
 {name:'Горный тренер',price:12500,mult:1.90,maxDifficulty:4,trainingGain:1.0,fitnessCap:80,
  bonuses:'−6% базового времени · −11% усталости · −8% штрафа за подъёмы',
  desc:'Готовит до 80/100 и усиливает работу на наборе ★★★–★★★★.'},
 {name:'Elite Coach',price:22500,mult:2.35,maxDifficulty:5,trainingGain:1.0,fitnessCap:100,
  bonuses:'−8% базового времени · −15% усталости · −10% штрафа за подъёмы · −5% риска травмы',
  desc:'Готовит до 100/100 и даёт максимальные бонусы на ★★★★–★★★★★.'}
];
const ELITE_RUNNERS=[
{name:'Алексей Береснев',itra:905,country:'🇷🇺'},{name:'Антонина Юшина',itra:890,country:'🇷🇺'},
{name:'Алексей Толстенко',itra:865,country:'🇷🇺'},{name:'Константин Иванов',itra:850,country:'🇷🇺'},
{name:'Елена Носкова',itra:840,country:'🇷🇺'},{name:'Василий Корыткин',itra:835,country:'🇷🇺'},
{name:'Алексей Макалюкин',itra:825,country:'🇷🇺'},{name:'Алексей Бабушкин',itra:815,country:'🇷🇺'},
{name:'Павел Тарасов',itra:805,country:'🇷🇺'},{name:'Виктория Жукова',itra:795,country:'🇷🇺'},
{name:'Мария Гостева',itra:785,country:'🇷🇺'},{name:'Вера Чекалина',itra:775,country:'🇷🇺'}];
function loadGame(){
  try{
    const x=JSON.parse(localStorage.getItem('trailArmageddonSave')||'null');
    if(x) return Object.assign({
      money:1500,xp:0,level:1,completed:0,rep:0,wins:0,current:0,fitness:1,coach:0,coachOwned:[0],trainingUntil:0,itra:250,gear:{...START_GEAR},
      durability:{},best:{},playerName:'',fatigue:0,lastFinishAt:0,restUntil:0,hospitalUntil:0,achievements:{},
      resources:{waterBottles:4,gels:4,batteries:2,accumulator:0,bandage:1,gauze:1,peroxide:1,plaster:2,cream:1,rescueBlanket:1,medkits:0,powerbank:0},
      lampCharge:100,gearOwned:{}
    },x);
  }catch(e){}
  return {
    money:1500,xp:0,level:1,completed:0,rep:0,wins:0,current:0,fitness:1,coach:0,coachOwned:[0],trainingUntil:0,itra:250,gear:{...START_GEAR},
    durability:{},best:{},playerName:'',fatigue:0,lastFinishAt:0,restUntil:0,hospitalUntil:0,achievements:{},
    resources:{waterBottles:4,gels:4,batteries:2,accumulator:0,bandage:1,gauze:1,peroxide:1,plaster:2,cream:1,rescueBlanket:1,medkits:0,powerbank:0},
    lampCharge:100,gearOwned:{}
  };
}
let authUser={id:'local',nick:'Вы'},authMode='local',cloudSaveTimer=null,cloudSaving=false;
function saveGame(){localStorage.setItem('trailArmageddonSave',JSON.stringify(game));scheduleCloudSave();}
let cloudTimer=null;
function scheduleCloudSave(){
  clearTimeout(cloudTimer);
  cloudTimer=setTimeout(()=>saveProgressCloud(false),700);
}
async function saveProgressCloud(showStatus=true){
  if(!authUser || authMode==='local') return false;
  try{
    const r=await fetch('/api/progress',{method:'PUT',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({progress:game})});
    if(!r.ok) throw new Error((await r.json().catch(()=>({}))).error||'Не удалось сохранить прогресс');
    if(showStatus) setAuthStatus('✓ Прогресс сохранён на сервере','ok');
    return true;
  }catch(e){ if(showStatus) setAuthStatus('Ошибка синхронизации: '+(e.message||e),'error'); return false; }
}
function setAuthStatus(t,k=''){if(!$('authStatus'))return;$('authStatus').textContent=t;$('authStatus').className='auth-status '+k}
function setAuthMode(m){authMode=m;$('authLoginTab')?.classList.toggle('active',m==='login');$('authRegisterTab')?.classList.toggle('active',m==='register');if($('authSubmitBtn'))$('authSubmitBtn').textContent=m==='login'?'Войти':'Создать профиль';setAuthStatus(m==='login'?'Введите ник и пароль.':'Регистрация: ник и пароль. Максимум 50 игроков.')}
function showAuth(){const a=$('authScreen');if(a){a.classList.add('show');a.setAttribute('aria-hidden','false');}}
function hideAuth(){const a=$('authScreen');if(a){a.classList.remove('show');a.setAttribute('aria-hidden','true');}}
function updateProfileUi(){
  if($('profileBtn')){
    $('profileBtn').textContent=authUser?`👤 ${(authUser?.nick||'Игрок')}`:'👤 Вход';
    $('profileBtn').classList.toggle('logged',!!authUser);
    $('profileBtn').title=authUser?`Профиль: ${(authUser?.nick||'Игрок')}`:'Войти в профиль';
  }
  if($('profileNick')) $('profileNick').textContent=authUser?.nick||'—';
  if($('headerLogoutBtn')) $('headerLogoutBtn').style.display=authUser?'inline-flex':'none';
}
async function loadSession(){
  authUser=null;
  updateProfileUi();
  showAuth();
  try{
    const r=await fetch('/api/me',{credentials:'same-origin'});
    if(!r.ok){
      authUser=null;
      updateProfileUi();
      document.documentElement.classList.remove('auth-ok');
      document.documentElement.classList.add('auth-required');
      setAuthMode('login');
      setAuthStatus('Профиль не подтверждён сервером. Войдите или сначала зарегистрируйтесь.');
      showAuth();
      return;
    }
    const d=await r.json();
    if(!d.user||!d.user.id||!d.user.nick){
      authUser=null;
      updateProfileUi();
      document.documentElement.classList.remove('auth-ok');
      document.documentElement.classList.add('auth-required');
      setAuthMode('login');
      setAuthStatus('Такой профиль не подтверждён. Войдите или зарегистрируйтесь.');
      showAuth();
      return;
    }
    authUser=d.user;
    document.documentElement.classList.remove('auth-required');
    document.documentElement.classList.add('auth-ok');
    if(d.progress&&typeof d.progress==='object'){
      game=d.progress;
      localStorage.setItem('trailArmageddonSave',JSON.stringify(game));
    }
    updateProfileUi();
    hideAuth();
    render();
  }catch(e){
    authUser=null;
    updateProfileUi();
    showAuth();
    setAuthStatus('Для игры требуется регистрация и соединение с сервером профилей.','error');
  }
}
async function submitAuth(e){
  e.preventDefault();
  const nick=String($('authNick')?.value||'').trim();
  const password=String($('authPassword')?.value||'');
  if(nick.length<2||password.length<4){
    setAuthStatus('Ник от 2 символов, пароль от 4.','error');
    return;
  }

  const registering=authMode==='register';
  if(!registering){
    try{
      const er=await fetch('/api/user-exists',{
        method:'POST',credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({nick})
      });
      const ed=await er.json().catch(()=>({}));
      if(!er.ok) throw new Error(ed.error||'Не удалось проверить профиль.');
      if(!ed.exists){
        setAuthStatus('Пользователь не зарегистрирован. Сначала нажмите «Регистрация».','error');
        return;
      }
    }catch(err){
      setAuthStatus(err.message||String(err),'error');
      return;
    }
  }
  const endpoint=registering?'/api/register':'/api/login';
  setAuthStatus(registering?'Создаю профиль…':'Выполняю вход…');
  if($('authSubmitBtn'))$('authSubmitBtn').disabled=true;

  try{
    const r=await fetch(endpoint,{
      method:'POST',
      credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({nick,password})
    });
    let d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||'Ошибка входа');

    // Некоторые уже развёрнутые версии API после регистрации отвечали {ok:true}
    // без объекта user. В таком случае сразу выполняем обычный вход теми же
    // данными: это одновременно подтверждает, что профиль реально записан,
    // и создаёт серверную сессию.
    if(registering && (!d.user || !d.user.id || !d.user.nick)){
      const lr=await fetch('/api/login',{
        method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({nick,password})
      });
      const ld=await lr.json().catch(()=>({}));
      if(!lr.ok) throw new Error(ld.error||'Профиль создан, но сервер не смог выполнить вход.');
      d=ld;
    }

    if(!d.user || !d.user.id || !d.user.nick){
      throw new Error('Сервер не подтвердил зарегистрированный профиль. Обновите серверную часть приложения.');
    }
    authUser=d.user;
    document.documentElement.classList.remove('auth-required');
    document.documentElement.classList.add('auth-ok');
    if(d.progress&&typeof d.progress==='object') game=d.progress;
    localStorage.setItem('trailArmageddonSave',JSON.stringify(game));
    updateProfileUi();

    if(registering){
      setAuthStatus(`✓ Профиль «${authUser.nick||nick}» создан`,'ok');
      await saveProgressCloud(false);
      await new Promise(resolve=>setTimeout(resolve,1400));
    }

    hideAuth();
    render();
  }catch(err){
    setAuthStatus(err.message||String(err),'error');
  }finally{
    if($('authSubmitBtn'))$('authSubmitBtn').disabled=false;
  }
}
async function logout(){await saveProgressCloud(false);try{await fetch('/api/logout',{method:'POST',credentials:'same-origin'})}catch(e){}authUser=null;document.documentElement.classList.remove('auth-ok');document.documentElement.classList.add('auth-required');updateProfileUi();$('profilePanel')?.classList.remove('show');showAuth();setAuthStatus('Вы вышли. Войдите снова, чтобы восстановить прогресс.')}
$('authLoginTab')?.addEventListener('click',()=>setAuthMode('login'));$('authRegisterTab')?.addEventListener('click',()=>setAuthMode('register'));$('authForm')?.addEventListener('submit',submitAuth);
$('profileBtn')?.addEventListener('click',()=>authUser?$('profilePanel')?.classList.add('show'):showAuth());$('closeProfileBtn')?.addEventListener('click',()=>$('profilePanel')?.classList.remove('show'));
$('profilePanel')?.addEventListener('click',e=>{if(e.target===$('profilePanel'))$('profilePanel').classList.remove('show')});$('syncNowBtn')?.addEventListener('click',()=>saveProgressCloud(true));$('logoutBtn')?.addEventListener('click',logout);$('headerLogoutBtn')?.addEventListener('click',logout);


function ensureTraining(){
 if(game.fitness==null) game.fitness=Math.max(1,Math.min(100,game.level||1));
 if(game.coach==null) game.coach=0;
 if(!Array.isArray(game.coachOwned)) game.coachOwned=[0];
 if(!game.coachOwned.includes(0)) game.coachOwned.push(0);
 if(game.trainingUntil==null) game.trainingUntil=0;
 if(game.coachBonusReady==null) game.coachBonusReady=false;
 const coach=COACHES[Number(game.coach)||0]||COACHES[0];
 // Нельзя понизить уже набранную тренированность при смене тренера.
 // Ограничение действует только на дальнейший рост.
 game.fitness=Math.max(0,Math.min(100,Number(game.fitness||0)));
 if(game.itra==null) game.itra=250;
 if(game.playerName==null) game.playerName='';
}
function ensureResources(){
 if(game && Number(game.waterBottles||0)>0 && Number(game.resources?.waterBottles||0)<=0){
   game.resources.waterBottles=Number(game.waterBottles||0);
   game.waterBottles=0;
 }

  if(!game.resources) game.resources={};
  const defaults={waterBottles:4,gels:4,batteries:2,accumulator:0,bandage:1,gauze:1,peroxide:1,plaster:2,cream:1,rescueBlanket:1,medkits:0,powerbank:0};
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
  return Math.max(1,Math.min(80,Math.ceil(L[3]/2700)));
}
function weatherForLevel(){
  // Stable for a selected race until that race is changed/reloaded.
  if(!game.weatherByLevel) game.weatherByLevel={};
  const key=String(game.current);
  if(game.weatherByLevel[key]) return game.weatherByLevel[key];

  const pool=[
    {name:'Ясно',emoji:'☀️',temp:24,sun:85,rain:false,cold:false},
    {name:'Переменная облачность',emoji:'🌤️',temp:19,sun:55,rain:false,cold:false},
    {name:'Облачно',emoji:'☁️',temp:14,sun:25,rain:false,cold:false},
    {name:'Дождь',emoji:'🌧️',temp:9,sun:10,rain:true,cold:true},
    {name:'Ливень',emoji:'⛈️',temp:6,sun:5,rain:true,cold:true},
    {name:'Холодный ветер',emoji:'💨',temp:4,sun:20,rain:false,cold:true},
    {name:'Жара',emoji:'🥵',temp:31,sun:100,rain:false,cold:false}
  ];
  // Higher levels slightly more likely to have bad weather.
  let idx=Math.floor(Math.random()*pool.length);
  if(game.current>=8 && Math.random()<0.35) idx=3+Math.floor(Math.random()*3);
  game.weatherByLevel[key]={...pool[idx]};
  return game.weatherByLevel[key];
}
function waterLitersNeeded(L,w){
  if(game.current<2) return 0; // water becomes mandatory from level 3
  // Water means the realistic START/CARRY reserve between aid stations,
  // not enough water for the entire race from start to finish.
  const km=Number(L[1]||0);
  let liters;
  if(km<=25) liters=1.0;
  else if(km<=42) liters=1.5;
  else if(km<=60) liters=2.0;
  else if(km<=100) liters=2.5;
  else if(km<=130) liters=3.0;
  else liters=3.5;

  // Weather changes the carried reserve moderately, without making
  // multi-day races require tens of litres at the start.
  if(w.temp>=28 || w.sun>=85) liters+=0.5;
  if(w.temp<=8 && !w.rain) liters-=0.5;
  if(w.rain && w.temp<=8) liters=Math.max(liters,1.5);
  return Math.max(1.0,Math.min(4.0,liters));
}
function waterBottlesNeeded(L,w){
  const liters=waterLitersNeeded(L,w);
  return liters<=0?0:Math.ceil(liters/0.5);
}
function membraneRequiredLevel(L=levelData(),w=weatherForLevel()){
  // Баланс ранних уровней:
  // 1–2 уровень: мембранка не обязательна вообще.
  // С 3 уровня при дожде/холоде нужна первая настоящая мембранка — ур. 2/7.
  const raceNo=game.current+1;
  if(raceNo<=2) return 0;
  if(!(w.rain||w.cold)) return 0;

  let req=2;
  if(raceNo>=6 && (L[5]>=3 || L[1]>=50)) req=3;
  if(raceNo>=6 && (L[5]>=4 || L[1]>=100)) req=4;
  if(raceNo>=6 && (L[5]>=5 || L[1]>=250)) req=5;
  if(raceNo>=6 && L[1]>=500) req=6;
  if(raceNo>=6 && L[1]>=700) req=7;
  if(raceNo>=6 && w.name==='Ливень') req+=1;
  if(raceNo>=6 && w.cold && w.temp<=4) req+=1;
  return Math.max(2,Math.min(7,req));
}
function membraneEquippedLevel(){
  return Math.max(1,Math.min(7,Number(game.gear.jacket||0)+1));
}
function hasMembrane(requiredLevel=2){
  return membraneEquippedLevel()>=requiredLevel &&
         Number(game.gear.jacket||0)>0 &&
         durability('jacket')>0;
}
function isRechargeableLamp(){return Number(game.gear.lamp)>=4}
function lampHoursNeeded(L){
  // Nights start to matter from level 5 onward; longer races require more light.
  if(game.current<4) return 0;
  return Math.max(1,Math.min(80,Math.ceil(L[3]/3600*0.42)));
}
function medkitScore(){
  const r=game.resources;
  return ['bandage','gauze','peroxide','plaster','cream','rescueBlanket'].reduce((a,k)=>a+(Number(r[k])>0?1:0),0);
}
function useResource(k,n=1){
 game.resources[k]=Math.max(0,(Number(game.resources[k])||0)-n);
}

function fmt(sec){
 sec=Math.max(0,Math.round(sec)); const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
 return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
}
function fmtMoney(n){return '₽ '+Math.round(n).toLocaleString('ru-RU')}
function levelData(i=game.current){return LEVELS[Math.max(0,Math.min(19,i))]}
const TOP_ITRA_LEADERS=[
 'Jim Walmsley','Kilian Jornet','Tom Evans','Mathieu Blanchard',
 'François D’Haene','Jonathan Albon','Hannes Namberger','Ruth Croft',
 'Courtney Dauwalter','Katie Schide','Blandine L’Hirondel','Judith Wyder'
];

const RUSSIAN_ITRA_RIVALS=[
 {name:'Артем Чернов',itra:920},
 {name:'Алексей Береснев',itra:905},
 {name:'Антонина Юшина',itra:890},
 {name:'Алексей Толстенко',itra:865},
 {name:'Константин Иванов',itra:850},
 {name:'Елена Носкова',itra:840},
 {name:'Василий Корыткин',itra:835},
 {name:'Алексей Макалюкин',itra:825},
 {name:'Алексей Бабушкин',itra:815},
 {name:'Павел Тарасов',itra:805},
 {name:'Виктория Жукова',itra:795},
 {name:'Мария Гостева',itra:785},
 {name:'Вера Чекалина',itra:775}
];

function isRussianEliteName(name){
 const n=String(name||'').trim().toLowerCase();
 return RUSSIAN_ITRA_RIVALS.some(r=>r.name.toLowerCase()===n);
}

function attachRivalNamesToVirtualField(){
 if(!run || !Array.isArray(run.virtualField)) return;

 const levelIndex=Number(game.current||0);
 const field=[...run.virtualField].sort((a,b)=>a.finishSec-b.finishSec);

 let names=[];
 if(levelIndex>=7){
   // Первые 7 имён — ровно те же, что показаны до старта.
   const shown=[...(run.raceLeaders||leadersForRace(game.current))].slice(0,7);
   names=[...shown];

   const ru=shuffledCopy(RUSSIAN_ITRA_RIVALS.map(r=>r.name))
     .filter(n=>!names.includes(n));
   const intl=shuffledCopy(TOP_ITRA_LEADERS)
     .filter(n=>!names.includes(n));

   names.push(...ru);
   names.push(...intl);
 }else{
   names=[...(run.raceLeaders||[])];
 }

 let seed=(game.current+1)*10000+(game.completed||0)*101;
 for(let i=0;i<field.length;i++){
   const c=field[i];
   c.name=names[i] || randomFio(seed+i*37);
   c.country=isRussianEliteName(c.name)?'RU':'';
   const ruData=RUSSIAN_ITRA_RIVALS.find(r=>r.name===c.name);
   if(ruData) c.itra=ruData.itra;
 }
}

const RANDOM_FIRST_NAMES=['Алексей','Илья','Дмитрий','Сергей','Максим','Андрей','Никита','Роман','Антон','Егор','Мария','Анна','Елена','Ольга','Дарья','Ирина','Алина','Виктория'];
const RANDOM_LAST_NAMES=['Волков','Орлов','Соколов','Лебедев','Морозов','Крылов','Белов','Громов','Зайцев','Титов','Смирнова','Орлова','Волкова','Белова','Морозова','Крылова','Соколова','Лебедева'];
function seededIndex(seed,n){ return Math.abs((seed*9301+49297)%233280)%n; }
function randomFio(seed){
 const first=RANDOM_FIRST_NAMES[seededIndex(seed*7+11,RANDOM_FIRST_NAMES.length)];
 let last=RANDOM_LAST_NAMES[seededIndex(seed*13+29,RANDOM_LAST_NAMES.length)];
 // Roughly match surname ending to first-name gender for more natural generated names.
 const female=['Мария','Анна','Елена','Ольга','Дарья','Ирина','Алина','Виктория'].includes(first);
 if(female && !last.endsWith('а')) last=last+'а';
 if(!female && last.endsWith('а')) last=last.slice(0,-1);
 return `${first} ${last}`;
}
function shuffledCopy(arr){
 const a=[...arr];
 for(let i=a.length-1;i>0;i--){
   const j=Math.floor(Math.random()*(i+1));
   [a[i],a[j]]=[a[j],a[i]];
 }
 return a;
}

function createLeadersForAttempt(raceIndex=game.current){
 // 1–7: один атлет TOP ITRA + случайные соперники.
 if(raceIndex<7){
   const top=TOP_ITRA_LEADERS[Math.floor(Math.random()*TOP_ITRA_LEADERS.length)];
   let a=randomFio(Math.floor(Math.random()*1000000));
   let b=randomFio(Math.floor(Math.random()*1000000));
   let guard=0;
   while((b===a || b===top) && guard++<20){
     b=randomFio(Math.floor(Math.random()*1000000));
   }
   const extras=[];
   while(extras.length<4){
     const x=randomFio(Math.floor(Math.random()*1000000));
     if(x!==top && x!==a && x!==b && !extras.includes(x)) extras.push(x);
   }
   return [top,a,b,...extras];
 }

 // С 8 уровня до старта сразу показываем тот же тип состава,
 // который будет и после старта: 5 российских ITRA + 2 международных.
 const ru=shuffledCopy(RUSSIAN_ITRA_RIVALS.map(r=>r.name));
 const intl=shuffledCopy(TOP_ITRA_LEADERS);
 return [...ru.slice(0,5),...intl.slice(0,2)];
}

function leadersForRace(raceIndex=game.current){
 // Во время конкретной попытки состав фиксирован, чтобы не менялся на каждом кадре.
 if(run && Array.isArray(run.raceLeaders) && run.raceLeaders.length>=7){
   return run.raceLeaders;
 }
 // До старта показываем реальный состав будущей группы лидеров.
 // Состав стабилен до нажатия "Старт".
 if(!game.preStartLeadersByRace) game.preStartLeadersByRace={};
 const key=String(raceIndex);
 if(!Array.isArray(game.preStartLeadersByRace[key]) || game.preStartLeadersByRace[key].length<7){
   game.preStartLeadersByRace[key]=createLeadersForAttempt(raceIndex);
 }
 return game.preStartLeadersByRace[key];
}
function visibleLeaderName(name){
 return (run && run.running===true && run.startedByUser===true)
   ? name
   : 'Неизвестный участник';
}

function leaderKmForPosition(rank,L,playerKm,playerPos){
 const dist=L[1];
 const p=Math.max(1,Number(playerPos||18));

 // TOP-3 positions must agree with the displayed player place.
 // If the player is 1st, all three named rivals are slightly behind.
 // If the player is 2nd, only leader #1 is ahead; if 3rd — #1 and #2 are ahead.
 if(p===1){
   const behind=[0.010,0.018,0.026][rank-1]*dist;
   return Math.max(0,Math.min(dist,playerKm-behind));
 }
 if(p===2){
   if(rank===1) return Math.max(0,Math.min(dist,playerKm+0.014*dist));
   const behind=(rank===2?0.008:0.018)*dist;
   return Math.max(0,Math.min(dist,playerKm-behind));
 }
 if(p===3){
   if(rank<=2) return Math.max(0,Math.min(dist,playerKm+(rank===1?0.016:0.008)*dist));
   return Math.max(0,Math.min(dist,playerKm-0.008*dist));
 }

 // Outside TOP-3 the leaders stay ahead. The gap gradually shrinks through the race.
 const base=[0.055,0.040,0.028][rank-1]*dist;
 const dynamic=base*(0.65+0.35*(1-(run?.p||0)));
 return Math.max(0,Math.min(dist,playerKm+dynamic));
}

function leaderKmFor(rank,L,playerKm){
 if(!run || !run.running) return 0;
 const rows=dynamicLeaderRows(L);
 const row=rows[Math.max(0,rank-1)];
 return row ? Math.max(0,Math.min(L[1],row.liveKm)) : 0;
}

function updateRaceTerrainOverlay(){
 const el=document.getElementById('raceTerrainOverlay');
 if(!el||!run) return;
 const gainEl=document.getElementById('raceGain');
 const slopeEl=document.getElementById('raceSlope');
 const gain=(gainEl?.textContent||'0 м').trim();
 const slope=(slopeEl?.textContent||'0%').trim();
 el.innerHTML=`⛰ ${gain}<br>↗ ${slope}`;
}

function renderRaceLeaders(playerKm=0){
 setTimeout(()=>{updateRaceTerrainOverlay();},0);
 const box=$('raceLeaders'); if(!box)return;
 const L=levelData();
 if($('leadersRaceName')) $('leadersRaceName').textContent=`${game.current+1}. ${L[0]}`;

 if(run && run.running){
   const npcRows=dynamicLeaderRows(L).map(r=>({
     player:false,
     c:r.c,
     name:String(r?.c?.name||'Участник'),
     liveKm:Number(r.liveKm||0)
   }));

   const pKm=Math.max(0,Math.min(Number(L[1]||0),Number(run.p||0)*Number(L[1]||0)));
   const allRows=[
     ...npcRows,
     {player:true,name:safeProfileNameForRace(),liveKm:pKm}
   ].sort((a,b)=>{
     if(run.finishWinnerHold){
       if(a.player) return -1;
       if(b.player) return 1;
     }
     return b.liveKm-a.liveKm;
   });

   const top14=allRows.slice(0,14);

   box.innerHTML=top14.map((r,i)=>{
     const km=Math.max(0,Math.min(L[1],Number(r.liveKm||0)));
     const status=km>=L[1]?'Финиш':`${km.toFixed(1)} км`;
     const cls=r.player?' race-leader-player':'';
     return `<div class="race-leader-row${cls}"><b>${i+1}</b><span>${r.name}</span><strong>${status}</strong></div>`;
   }).join('');
 }else{
   const names=leadersForRace();
   box.innerHTML=names.slice(0,14).map((name,i)=>
     `<div class="race-leader-row"><b>${i+1}</b><span>${name}</span><strong>на старте</strong></div>`
   ).join('');
 }
}
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


function applyAppVersion(){
 const v='v'+APP_VERSION;
 if($('appVersion')) $('appVersion').textContent=v;
 if($('footerVersion')) $('footerVersion').textContent=v;
}


function renderPreStartRaceState(L){
 if(run && run.running) return;
 if($('progressKm')) $('progressKm').textContent=`0.0 / ${Number(L[1]).toFixed(1)} км`;
 if($('clock')) $('clock').textContent='0:00:00';
 if($('progressBar')) $('progressBar').style.width='0%';
 if($('pace')) $('pace').textContent=fmt(Math.max(1,L[3])/Math.max(1,L[1])).replace(':',' : ')+' /км';
 if($('position')) $('position').textContent='—';
 if($('penalties')) $('penalties').textContent='+0:00';
 if($('condition')) $('condition').textContent='ГОТОВ';
 if($('liveGain')){
   const _L=levelData();
   $('liveGain').textContent='0 м';
   $('liveGainTotal').textContent=`из ${Number(_L[2]||0).toLocaleString('ru-RU')} м`;
   $('liveSlope').textContent='0%';
   $('liveSlopeType').textContent='ровно';
 }
 if($('liveDnfStatus')) $('liveDnfStatus').textContent='🚫 Сошли: 0';
}


const NAME_BAD_WORDS=['хуй','хуя','хуе','хуи','хуйн','пизд','пезд','еба','еби','ебу','ёб','бля','бляд','сука','сучк','мраз','мудак','долбоеб','долбоёб','гандон','пидор','пидар','залуп','шлюх'];
function normName(v){return String(v||'').toLowerCase().replace(/ё/g,'е').replace(/[^a-zа-я0-9]/gi,'');}
function hasBadName(v){const n=normName(v);return NAME_BAD_WORDS.some(w=>n.includes(normName(w)));}

function safeProfileNameForRace(){
  try{
    const candidates=[
      game?.playerName,
      game?.profileName,
      game?.runnerName,
      document.querySelector('#playerName')?.value,
      document.querySelector('#profileName')?.value,
      localStorage.getItem('playerName'),
      localStorage.getItem('profileName'),
      localStorage.getItem('runnerName')
    ];
    for(const v of candidates){
      const s=String(v??'').trim();
      if(s) return s;
    }
  }catch(e){}
  return 'Вы';
}

function safePlayerName(){const n=String(game.playerName||'').trim();return n&&!hasBadName(n)?n:'Трейлраннер';}


function fitPlayerNameFont(){
  try{
    const el=document.querySelector('#playerName');
    if(!el) return;
    const n=String(el.value||'').trim().length;
    el.style.fontSize = n>24 ? '17px' : n>18 ? '18px' : n>13 ? '20px' : '22px';
  }catch(e){}
}

function hospitalRemainingMs(){return Math.max(0,(game.hospitalUntil||0)-Date.now())}
function isInHospital(){return hospitalRemainingMs()>0}
function startHospitalTreatment(){
 if(run&&run.running){showGameError('Во время гонки лечение недоступно');return}
 if(isInHospital())return;
 game.hospitalUntil=Date.now()+5*60*1000;
 game.fatigue=Math.min(100,Math.max(0,Number(game.fatigue||0)+15));
 saveGame();render();updateRestUi();
}
function finishHospitalIfReady(){
 if((game.hospitalUntil||0)>0 && Date.now()>=game.hospitalUntil){
   game.hospitalUntil=0;
   game.fatigue=Math.min(100,Math.max(0,Number(game.fatigue||0)-15));
   saveGame();
 }
}
const LEVEL_ACHIEVEMENTS=[
 'Первые следы','Каменный характер','Дождевой волк','Ночная смена','Горный характер',
 'Без паники','Технический трейл','Охотник за километрами','Железные ноги','Десятка уровней',
 'Предел выносливости','Пыль и кровь','Упрямый трейлраннер','Сотня','Дальний рубеж',
 'Пустая трасса','Экспедиция','Полярная воля','ПредАрмагеддон','Армагеддон'
];
function tryAwardLevelAchievement(levelIndex=game.current){
 const idx=Math.max(0,Math.min(19,Number(levelIndex||0)));
 const key=String(idx+1);
 if(game.achievements?.[key]) return false;
 // Rare: guaranteed on first completion, then the special condition is stored.
 if(Math.random()>0.72 && game.completed<=idx) return false;
 if(!game.achievements)game.achievements={};
 game.achievements[key]={name:LEVEL_ACHIEVEMENTS[idx],date:Date.now()};
 return true;
}
function renderAchievements(){
 const g=$('achievementsGrid');if(!g)return;
 const a=game.achievements||{};
 g.innerHTML=LEVEL_ACHIEVEMENTS.map((name,i)=>{
   const got=a[String(i+1)];
   return `<div class="achievement-item ${got?'earned':''}"><b>${got?'🏆':'🔒'} ${i+1}. ${name}</b><small>${got?'Редкая ачивка собрана':'Редкая ачивка этого уровня ещё не найдена'}</small></div>`;
 }).join('');
}
function render(){
 fitPlayerNameFont();
 applyAppVersion();
 const raceShoppingLocked=!!(run&&run.running);
 const restRaceLocked=raceShoppingLocked;
 const restBtnRace=$('restBtn');
 if(restBtnRace){
   restBtnRace.disabled=restRaceLocked || isResting() || Number(game.fatigue||0)<=0;
   restBtnRace.title=restRaceLocked?'Во время гонки отдых недоступен':'';
 }
 const shopJump=$('scrollShopBtn');
 if(shopJump){
   shopJump.disabled=raceShoppingLocked;
   shopJump.title=raceShoppingLocked?'Покупки недоступны до финиша':'Купить / сменить экипировку';
 }
 keepEquippedGear();

 const repairBtn=$('repairAllBtn');
 if(repairBtn){
   const repairCost=totalRepairCost();
   const raceLocked=!!(run&&run.running);
   repairBtn.textContent=repairCost>0 ? `🔧 Починить всё — ${fmtMoney(repairCost)}` : '✅ Всё исправно';
   repairBtn.disabled=raceLocked || repairCost<=0 || game.money<repairCost;
   repairBtn.title=raceLocked
     ? 'Во время гонки ремонт недоступен'
     : repairCost<=0
       ? 'Экипировка полностью исправна'
       : game.money<repairCost
         ? `Не хватает рублей. Нужно ${fmtMoney(repairCost)}`
         : `Полностью восстановить надетую экипировку за ${fmtMoney(repairCost)}`;
 }

 const L=levelData();
 $('runnerLevel').textContent=game.level;
 $('xpText').textContent=game.level>=100?'MAX':`${game.xp} / ${xpNeeded(game.level)} XP`;
 $('money').textContent=fmtMoney(game.money);
 $('completed').textContent=`${game.completed} / 20`;
 $('rep').textContent=game.rep;
 $('wins').textContent=game.wins||0;
 if($('racePlayerName')) $('racePlayerName').innerHTML='Вы: <strong style="color:#eef5ff">'+safePlayerName().replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'</strong>';
 if($('playerNameInput') && document.activeElement!==$('playerNameInput')) $('playerNameInput').value=game.playerName||'';
 ensureResources();ensureTraining();
 const restMs=restRemainingMs();
 $('fatigueValue').textContent=Math.round(game.fatigue)+'%';
 if($('restFatigueValue')) $('restFatigueValue').textContent=Math.round(game.fatigue)+'%';
 $('fatigueBar').style.width=Math.min(100,game.fatigue)+'%';
 $('fatigueBar').className=game.fatigue>=80?'danger-fatigue':game.fatigue>=55?'warn-fatigue':'';
 $('restText').textContent=restMs>0?'отдых ещё '+fmtRest(restMs):game.fatigue>=70?'нужен отдых':'готов к гонке';
 $('gelCount').textContent=String(game.resources.gels||0);
 const gelNeedNow=gelsNeeded(L);
 $('gelNeedText').textContent='на эту гонку нужно ≈ '+gelNeedNow;
 const gelQuick=$('quickBuyGels');
 if(gelQuick){
   const miss=Math.max(0,gelNeedNow-Number(game.resources.gels||0));
   gelQuick.classList.toggle('quick-buy-ok',miss===0);
   const h=gelQuick.querySelector('.quick-buy-hint');
   if(h) h.textContent=miss===0?'Запас на гонку готов':`Докупить ${miss} шт. · ${fmtMoney(miss*RESOURCE_CATALOG.gels.price)}`;
 }
 if(isRechargeableLamp()){
   $('lampPowerText').textContent='🔋 '+Math.round(game.lampCharge)+'%';
   $('lampPowerSub').textContent=`сменных АКБ: ${game.resources.accumulator||0} · ${game.resources.powerbank>0?'powerbank есть':'без powerbank'}`;
 }else{
   $('lampPowerText').textContent='🔦 '+game.resources.batteries+' компл.';
   $('lampPowerSub').textContent='фонарь на батарейках';
 }
 const lampQuick=$('quickBuyLampPower');
 if(lampQuick){
   const lampHours=lampHoursNeeded(L);
   const hint=lampQuick.querySelector('.quick-buy-hint');
   let ready=true, hintText='Питание фонаря готово';
   if(isRechargeableLamp()){
     const requiredCharge=Math.min(100,Math.ceil(lampHours/8*100));
     if(lampHours>0 && game.lampCharge<requiredCharge && Number(game.resources.powerbank||0)<=0){
       ready=false; hintText=`Докупить powerbank · ${fmtMoney(RESOURCE_CATALOG.powerbank.price)}`;
     }
   }else{
     const needBat=Math.ceil(lampHours/5);
     const miss=Math.max(0,needBat-Number(game.resources.batteries||0));
     if(miss>0){ ready=false; hintText=`Докупить ${miss} компл. · ${fmtMoney(miss*RESOURCE_CATALOG.batteries.price)}`; }
   }
   lampQuick.classList.toggle('quick-buy-ok',ready);
   if(hint) hint.textContent=hintText;
 }
 $('medkitSummary').textContent=medkitScore()+'/6';
 const medQuick=$('quickBuyMedkit');
 if(medQuick){
   const medKeys=['bandage','gauze','peroxide','plaster','cream'];
   const missing=medKeys.filter(k=>Number(game.resources[k]||0)<=0);
   const cost=missing.reduce((s,k)=>s+RESOURCE_CATALOG[k].price,0);
   medQuick.classList.toggle('quick-buy-ok',missing.length===0);
   const h=medQuick.querySelector('.quick-buy-hint');
   if(h) h.textContent=missing.length===0?'Аптечка укомплектована':`Докупить ${missing.length} поз. · ${fmtMoney(cost)}`;
 }
 ensureTraining();
 if($('fitnessText'))$('fitnessText').textContent=`${Math.round(game.fitness)} / 100`;
 if($('coachText'))$('coachText').textContent=COACHES[game.coach]?.name||'Без тренера';
 if($('itraText'))$('itraText').textContent=Math.round(game.itra);
 if($('itraNameText')) $('itraNameText').textContent=safePlayerName();
 if($('itraRankText'))$('itraRankText').textContent=`место в базе: ${ELITE_RUNNERS.filter(r=>r.itra>game.itra).length+1}`;
 const raceWeather=weatherForLevel();
 const waterNeedNow=waterBottlesNeeded(L,raceWeather);
 if($('waterCount')) $('waterCount').textContent=String(game.resources.waterBottles||0);
 if($('waterNeedText')) $('waterNeedText').textContent=`на эту гонку нужно ≈ ${waterNeedNow} × 0,5 л`;
 const waterQuick=$('quickBuyWater');
 if(waterQuick){
   const miss=Math.max(0,waterNeedNow-Number(game.resources.waterBottles||0));
   const cost=miss*RESOURCE_CATALOG.waterBottles.price;
   waterQuick.classList.toggle('quick-buy-ok',miss===0);
   const h=waterQuick.querySelector('.quick-buy-hint');
   if(h) h.textContent=miss===0?'Запас воды готов':`Докупить ${miss} бут. · ${fmtMoney(cost)}`;
 }
 if($('weatherText')) $('weatherText').textContent=`${raceWeather.emoji} ${raceWeather.name}`;
 if($('weatherSub')){
   const reqMem=membraneRequiredLevel(L,raceWeather);
   $('weatherSub').textContent=`${raceWeather.temp}°C${reqMem>0?` · нужна мембранка ур. ${reqMem}/7+`:(raceWeather.rain||raceWeather.cold?' · мембранка не обязательна на этом уровне':'')}`;
 }
 if($('sunText')) $('sunText').textContent=`${raceWeather.sun}%`;
 if($('sunSub')) $('sunSub').textContent=raceWeather.sun>=80?'высокий расход воды':raceWeather.sun>=45?'средний расход воды':'низкий расход воды';
 const bottlesNeed=waterBottlesNeeded(L,raceWeather);
 if($('raceWaterNeed')) $('raceWaterNeed').textContent=game.current<3?'не требуется':`${bottlesNeed} × 0,5 л`;
 $('raceTitle').textContent=`${game.current+1}. ${L[0]}`;
 if($('simulationRaceTitle')) $('simulationRaceTitle').textContent=`${game.current+1}. ${L[0]}`;
 $('raceDistance').textContent=L[1]+' км';
 $('raceGain').textContent=L[2]+' м';
 $('raceTarget').textContent=fmt(L[3]);
 $('raceReward').textContent='база '+fmtMoney(L[4]);
 const rr=$('raceReward')?.parentElement;
 if(rr){
   let note=rr.querySelector('.reward-place-note');
   if(!note){
     note=document.createElement('small');
     note.className='reward-place-note';
     rr.appendChild(note);
   }
   note.textContent='Чем выше место на финише, тем больше рублей. За сильный результат выплата может быть выше базовой суммы.';
 }
 $('difficultyBadge').textContent='★'.repeat(L[5])+'☆'.repeat(5-L[5]);
 $('raceDesc').textContent=L[6];
 renderPreStartRaceState(L);
 renderLevels();renderShop();renderGear();renderAchievements();renderRaceGearSummary();renderResources();renderLampPower();updateRestUi();updateRaceStartTrainingLock();renderRaceLeaders(0);drawTrack(0);
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
let activeShopCategory='shoes';
function renderShop(){
 const tabs=$('shopCategoryTabs'),g=$('shopGrid');
 if(!tabs||!g)return;
 keepEquippedGear();

 const cats=Object.keys(GEAR);
 if(!cats.includes(activeShopCategory)) activeShopCategory=cats[0];

 tabs.innerHTML='';
 cats.forEach(cat=>{
   const b=document.createElement('button');
   b.className='shop-cat-btn '+(cat===activeShopCategory?'active':'');
   b.textContent=CATEGORY_NAMES[cat];
   b.onclick=()=>{activeShopCategory=cat;renderShop()};
   tabs.appendChild(b);
 });

 g.innerHTML='';
 const list=GEAR[activeShopCategory]||[];
 list.forEach((it,idx)=>{
   const equipped=game.gear[activeShopCategory]===idx;
   const purchased=(game.gearOwned[activeShopCategory]||[]).includes(idx);
   const d=document.createElement('div');
   d.className='shop-item equipment-card';
   const lvl=idx+1;
   let label,disabled=false,cls='primary';
   if(equipped){
     label=durability(activeShopCategory)<=0?'✓ Надето · сломано':'✓ Надето';
     disabled=true; cls='secondary equipped-btn';
   }else if(purchased){
     label='Надеть';
     cls='secondary';
   }else if(game.money<it[1]){
     label=`Не хватает ${fmtMoney(it[1]-game.money)}`;
     disabled=true;
   }else{
     label='Купить и надеть';
   }
   const prep=equipmentPreparedness(activeShopCategory,levelData(),weatherForLevel());
   d.innerHTML=`<div class="equipment-card-title"><b>${CATEGORY_NAMES[activeShopCategory]} · ур. ${lvl}/7 · ${it[0]}</b>${equipped?'<span class="equipped-badge">НАДЕТО</span>':''}</div>
     <div class="shop-item-detail-body">
       <div class="meta">
         Цена: <span class="money">${fmtMoney(it[1])}</span><br>
         Эффект: ${gearEffectText(activeShopCategory,idx,it)}<br>
         Прочность: ${it[3]} ед. · защита от поломки +${Math.round(it[4]*100)}%<br>
         Для текущей гонки: желательно <b>${prep.required}/7</b> · у тебя <b>${prep.current}/7</b>${prep.gap?` · ⚠️ недобор ${prep.gap} ур.`:' · ✅ уровень подходит'}
       </div>
       <button class="${cls}" ${disabled?'disabled':''} data-buy="${activeShopCategory}:${idx}">
         ${label}
       </button>
     </div>`;
   g.appendChild(d);
 });

 g.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{
   if(purchasesLockedDuringRace())return;
   const [cat,idxS]=b.dataset.buy.split(':'),idx=+idxS,it=GEAR[cat][idx];
   keepEquippedGear();
   const purchased=(game.gearOwned[cat]||[]).includes(idx);
   if(!purchased){
     if(game.money<it[1])return;
     game.money-=it[1];
     game.gearOwned[cat].push(idx);
     game.durability[cat+'_'+idx]=it[3];
   }
   game.gear[cat]=idx;
   if(game.durability[cat+'_'+idx]==null) game.durability[cat+'_'+idx]=it[3];
   saveGame();
   render();
 });
}
function gearEffectText(cat,idx,it){
  if(cat==='shoes') return idx===0?'базовая скорость':`скорость +${Math.round((1-it[2])*100)}%`;
  if(cat==='poles') return idx>=3?`LEKI · скорость на подъёмах +${idx>=6?12:idx===5?9:idx===4?6:3}%`:(idx===0?'без бонуса':'помощь на подъёмах');
  if(cat==='jacket') return idx===0?'защита от дождя отсутствует':`защита от дождя · ур. ${idx+1}`;
  if(cat==='lamp') return idx>=4?`аккумулятор · ур. ${idx+1} + сменный АКБ / powerbank`:'работает на батарейках';
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
   slot.innerHTML=`<div class="gear-slot-title"><b>${CATEGORY_NAMES[cat]}</b><span>ур. ${idx+1}/7</span></div>
     <div class="equipped-line"><span class="equipped-badge">${cur<=0?'НАДЕТО · СЛОМАНО':'НАДЕТО'}</span></div>
     <strong>${it[0]}</strong>
     <div class="gear-slot-effect">${gearEffectText(cat,idx,it)}</div>
     <div class="durability"><div style="width:${pct}%"></div></div>
     <small>прочность ${Math.round(pct)}% · доступно уровней: 1–7</small>`;
   g.appendChild(slot);
 });
}

function renderGear(){
 const g=$('gearGrid');g.innerHTML='';
 Object.keys(GEAR).forEach(cat=>{
  const it=item(cat),cur=durability(cat),max=it[3],pct=Math.max(0,Math.min(100,cur/max*100));
  const d=document.createElement('div');d.className='gear-item';
  d.innerHTML=`<h3>${CATEGORY_NAMES[cat]} · ${it[0]}</h3>
  <div class="equipped-line"><span class="equipped-badge">${cur<=0?'НАДЕТО · СЛОМАНО':'НАДЕТО'}</span></div>
  <div class="meta">Прочность ${Math.round(cur)} / ${max}</div>
  <div class="durability"><div style="width:${pct}%"></div></div><div class="meta">${pct<=0?'❌ сломано, но остаётся надето':pct<20?'⚠️ высокий риск поломки':pct<50?'изношено':'состояние нормальное'}</div>`;
  g.appendChild(d);
 });
}
function medkitComponentsReady(){
 const r=game.resources||{};
 return ['bandage','gauze','peroxide','plaster','cream','rescueBlanket'].every(k=>Number(r[k]||0)>0);
}
function assembleMedkit(){
 if(purchasesLockedDuringRace()){showGameError('Во время гонки сборка аптечки недоступна');return}
 if(!medkitComponentsReady()){showGameError('Нужны: бинт, марля, перекись, пластырь, крем и спасательное одеяло.');return}
 ['bandage','gauze','peroxide','plaster','cream','rescueBlanket'].forEach(k=>useResource(k));
 game.resources.medkits=(Number(game.resources.medkits)||0)+1;
 saveGame();render();
}
function renderResources(){
 const g=$('resourceGrid');if(!g)return;g.innerHTML='';
 const kit=document.createElement('div');kit.className='shop-item medkit-assembly';
 const kitCount=Number(game.resources.medkits||0);
 kit.innerHTML=`<h3>🧰 Сборка аптечек</h3>
   <div class="meta">Готовых комплектов: <b>${kitCount}</b><br>На текущую гонку желательно: <b>${Math.max(1,Math.min(6,Math.ceil((levelData()[5]+(levelData()[1]>=50?1:0)+(levelData()[1]>=120?1:0))/2)))}</b> компл.<br>1 комплект = бинт + марля + перекись + пластырь + крем + спасательное одеяло.<br>На сложных гонках можно собрать несколько комплектов.</div>
   <button class="primary" id="assembleMedkitBtn" ${medkitComponentsReady()?'':'disabled'}>Собрать аптечку</button>`;
 g.appendChild(kit);
 $('assembleMedkitBtn')?.addEventListener('click',assembleMedkit);
 Object.entries(RESOURCE_CATALOG).filter(([key])=>key!=='medkits').forEach(([key,it])=>{
   const count=Number(game.resources[key]||0);
   const d=document.createElement('div');d.className='shop-item';
   const oneOnly=key==='powerbank';
   d.innerHTML=`<h3>${it.name}</h3>
     <div class="meta">${it.desc}<br>В наличии: <b>${count}</b> ${it.unit}<br><span class="money">${fmtMoney(it.price)}</span></div>
     <button class="primary" ${(oneOnly&&count>0)||game.money<it.price?'disabled':''} data-resource-buy="${key}">
       ${oneOnly&&count>0
         ? 'Уже куплен'
         : game.money<it.price
           ? `Не хватает ${fmtMoney(it.price-game.money)}`
           : 'Купить'}
     </button>`;
   g.appendChild(d);
 });
 g.querySelectorAll('[data-resource-buy]').forEach(b=>b.onclick=()=>{
   const key=b.dataset.resourceBuy,it=RESOURCE_CATALOG[key];
   if(game.money<it.price){showGameError('Не хватает '+fmtMoney(it.price-game.money));return}
   game.money-=it.price;game.resources[key]=(game.resources[key]||0)+1;saveGame();render();
 });
}

function renderLampPower(){
 const p=$('lampPowerPanel');if(!p)return;
 const idx=Number(game.gear.lamp),it=item('lamp');
 if(idx>=4){
   p.innerHTML=`<div class="gear-item"><h3>${it[0]} · аккумулятор</h3>
   <div class="meta">Заряд: ${Math.round(game.lampCharge)}% · сменных аккумуляторов: ${game.resources.accumulator||0} · powerbank: ${game.resources.powerbank>0?'есть':'нет'}</div>
   <div class="durability"><div style="width:${Math.max(0,Math.min(100,game.lampCharge))}%"></div></div>
   <button id="swapLampBatteryBtn" class="secondary" ${(game.resources.accumulator||0)<=0||game.lampCharge>=100?'disabled':''}>🔋 Поставить заряженный аккумулятор</button>
   <button id="chargeLampBtn" class="secondary" ${game.resources.powerbank<=0||game.lampCharge>=100?'disabled':''}>⚡ Зарядить от powerbank</button></div>`;
   $('swapLampBatteryBtn')?.addEventListener('click',()=>{
     if((game.resources.accumulator||0)<=0)return;
     useResource('accumulator',1);game.lampCharge=100;saveGame();render();
   });
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
 finishHospitalIfReady();
 // If a started rest has reached its end, apply the recovery exactly once.
 // Previously the timer ended but fatigue itself was never changed.
 if((game.restUntil||0)>0 && Date.now()>=(game.restUntil||0)){
   game.fatigue=0;
   game.restUntil=0;
   saveGame();
 }
 const resting=isResting();
 const restMs=restRemainingMs();
 if($('fatigueValue')) $('fatigueValue').textContent=Math.round(Number(game.fatigue||0))+'%';
 if($('fatigueBar')){
   $('fatigueBar').style.width=Math.min(100,Number(game.fatigue||0))+'%';
   $('fatigueBar').className=game.fatigue>=80?'danger-fatigue':game.fatigue>=55?'warn-fatigue':'';
 }
 if($('restFatigueValue')) $('restFatigueValue').textContent=Math.round(Number(game.fatigue||0))+'%';

 if($('restBtn')){
   $('restBtn').disabled = !!(run&&run.running) || resting || trainingActive() || Number(game.fatigue||0)<=0;
   $('restBtn').textContent = resting ? '😴 Отдых идёт…' : trainingActive() ? '🏃 Сначала закончите тренировку' : '😴 Отдых 1 минуту';
 }

 if($('restStatus')){
   $('restStatus').style.display=resting?'block':'none';
   $('restStatus').textContent=resting
     ? `До полного отдыха: ${fmtRest(restMs)}. Старт гонки заблокирован.`
     : '';
 }
 if($('hospitalCard')){
   $('hospitalCard').style.display='block';
   const hs=$('hospitalStatus'),ht=$('hospitalTimer'),hb=$('hospitalBtn');
   if(isInHospital()){
     if(ht)ht.textContent=fmtRest(hospitalRemainingMs());
     if(hs)hs.textContent=`🏥 Лечение идёт. Осталось ${fmtRest(hospitalRemainingMs())}. Старт заблокирован.`;
     if(hb){hb.disabled=true;hb.textContent='🏥 Лечение идёт…';}
   }else{
     if(ht)ht.textContent='не требуется';
     if(hs)hs.textContent='После перелома нажмите кнопку — лечение займёт 5 минут.';
     if(hb){hb.disabled=!!(run&&run.running)||Number(game.hospitalUntil||0)>0;hb.textContent='🏥 Лечь на лечение · 5 минут';}
   }
 }

 const startBtn=$('startBtn');
 if(startBtn && !(run&&run.running)){
   if(resting || isInHospital()){
     startBtn.disabled=true;
     startBtn.textContent=isInHospital()?`🏥 Лечение ${fmtRest(hospitalRemainingMs())}`:`😴 Отдых ${fmtRest(restMs)}`;
   }else if(!trainingActive()){
     startBtn.disabled=false;
     startBtn.textContent='▶ Старт';
   }
 }

 const req=$('startRequirementsError');
 if(req && !(run&&run.running)){
   if(isInHospital()){
     req.innerHTML=`<b>🏥 Лечение перелома</b><ul><li>До окончания лечения: ${fmtRest(hospitalRemainingMs())}.</li><li>Старт гонки заблокирован.</li></ul>`;
     req.style.display='block';
   }else if(resting){
     req.innerHTML=`<b>😴 Отдых идёт</b><ul><li>До полного отдыха: ${fmtRest(restMs)}.</li><li>Старт гонки заблокирован до окончания отдыха.</li></ul>`;
     req.style.display='block';
   }else if(/Отдых идёт/.test(req.textContent||'')){
     req.innerHTML='';
     req.style.display='none';
   }
 }
}
setInterval(()=>{
 if($('restBtn')){
   updateRestUi();
   if($('restText')) $('restText').textContent=isInHospital()?'лечение ещё '+fmtRest(hospitalRemainingMs()):isResting()?'отдых ещё '+fmtRest(restRemainingMs()):game.fatigue>=70?'нужен отдых':'готов к гонке';
 }
 if($('startTrainingBtn')) renderTraining();
},1000);
$('playerNameInput')?.addEventListener('input',e=>{
  const v=(e.target.value||'').slice(0,40);
  if(hasBadName(v)){ e.target.setCustomValidity('Мат и оскорбительные слова запрещены'); e.target.reportValidity(); return; }
  e.target.setCustomValidity(''); game.playerName=v; if($('itraNameText')) $('itraNameText').textContent=safePlayerName(); saveGame();
});
$('playerNameInput')?.addEventListener('change',e=>{
  const v=(e.target.value||'').trim().slice(0,40);
  if(hasBadName(v)){ e.target.setCustomValidity('Мат и оскорбительные слова запрещены'); e.target.reportValidity(); e.target.value=game.playerName||''; return; }
  e.target.setCustomValidity(''); game.playerName=v; e.target.value=v; if($('itraNameText')) $('itraNameText').textContent=safePlayerName(); saveGame();
});

$('hospitalBtn')?.addEventListener('click',startHospitalTreatment);

$('restBtn')?.addEventListener('click',()=>{
  if(run && run.running){ showGameError('Во время гонки отдых недоступен. Сначала завершите гонку.'); return; }
  if(trainingActive()){ showGameError('Во время тренировки отдых недоступен. Сначала закончите тренировку.'); return; }
  if(isResting())return;
  if(Number(game.fatigue||0)<=0){updateRestUi();return;}
  game.restUntil=Date.now()+60*1000;saveGame();updateRestUi();renderTraining();
});

function trainingRemainingMs(){return Math.max(0,(game.trainingUntil||0)-Date.now())}
function trainingActive(){return trainingRemainingMs()>0}
function trainingCountdownText(){
 const ms=trainingRemainingMs();
 const s=Math.ceil(ms/1000),m=Math.floor(s/60),r=s%60;
 return `${m}:${String(r).padStart(2,'0')}`;
}
function updateRaceStartTrainingLock(){
 const b=$('startBtn');
 if(!b)return;
 if(run&&run.running){
   b.disabled=true;
   return;
 }
 if(trainingActive()){
   b.disabled=true;
   b.textContent=`🏃 Тренировка ${trainingCountdownText()}`;
   const el=$('startRequirementsError');
   if(el){
     el.innerHTML=`<b>🏃 Идёт тренировка</b><ul><li>Старт гонки будет доступен через ${trainingCountdownText()}.</li></ul>`;
     el.style.display='block';
   }
 }else{
   b.disabled=isResting();
   b.textContent='▶ Старт';
   const el=$('startRequirementsError');
   if(el && /Идёт тренировка/.test(el.textContent||'')){
     el.style.display='none';
     el.innerHTML='';
   }
 }
}
function finishTrainingIfReady(){
 ensureTraining();
 if(game.trainingUntil && game.trainingUntil<=Date.now()){
   const coach=COACHES[game.coach]||COACHES[0];
   const cap=Math.min(100,Number(coach.fitnessCap||100));
   const before=Number(game.fitness||0);
   const gain=before<cap ? 1 : 0;
   if(gain>0){
     game.fitness=Math.min(cap,before+1);
     game.coachBonusReady=true;
   }
   game.trainingUntil=0;
   saveGame();
   return gain;
 }
 return false;
}

function coachRaceBonuses(){
  if(run && run.coachBonuses) return run.coachBonuses;
  const idx=Math.max(0,Number(game.coach||0));
  const table=[
    {pace:0.00,fatigue:0.00,climb:0.00,injury:0.00},
    {pace:0.02,fatigue:0.04,climb:0.03,injury:0.02},
    {pace:0.04,fatigue:0.08,climb:0.06,injury:0.05},
    {pace:0.06,fatigue:0.11,climb:0.08,injury:0.08},
    {pace:0.08,fatigue:0.15,climb:0.10,injury:0.12}
  ];
  const base=table[Math.min(idx,table.length-1)]||table[0];
  // Бонусы тренера включаются только после реально завершённой тренировки.
  if(idx===0 || !game.coachBonusReady) return {pace:0,fatigue:0,climb:0,injury:0,active:false,scale:0};
  const diff=Math.max(1,Number(levelData()[5]||1));
  const coach=COACHES[idx]||COACHES[0];
  // На своей сложности бонус полный; выше специализации постепенно теряет силу.
  const gap=Math.max(0,diff-Number(coach.maxDifficulty||1));
  const scale=gap===0?1:Math.max(.35,1-gap*.30);
  return {pace:base.pace*scale,fatigue:base.fatigue*scale,climb:base.climb*scale,injury:base.injury*scale,active:true,scale};
}

function coachSupportsCurrentRace(){
 const coach=COACHES[game.coach]||COACHES[0];
 const diff=levelData()[5];
 return coach.maxDifficulty>=diff;
}
function tableForCoach(i){
 const t=[
  {pace:0,fatigue:0,climb:0,injury:0},{pace:.02,fatigue:.04,climb:.03,injury:.02},
  {pace:.04,fatigue:.08,climb:.06,injury:.05},{pace:.06,fatigue:.11,climb:.08,injury:.08},
  {pace:.08,fatigue:.15,climb:.10,injury:.12}
 ]; return t[Math.max(0,Math.min(4,Number(i)||0))];
}
function renderTraining(){

 if(!$('coachGrid')) return;
 ensureTraining();
 const completedGain=finishTrainingIfReady();

 const trainingBtn=$('startTrainingBtn');
 if(trainingBtn){
   const restingNow=isResting();
   const trainingNow=trainingActive();
   trainingBtn.disabled = restingNow || trainingNow;
   trainingBtn.title = restingNow ? 'Во время отдыха тренировка недоступна' : '';
   if(restingNow) trainingBtn.textContent='😴 Сначала закончите отдых';
 }


 $('coachGrid').innerHTML='';
 COACHES.forEach((coach,i)=>{
   const d=document.createElement('div');
   d.className='shop-item coach-item';
   const owned=game.coachOwned.includes(i);
   const active=i===game.coach;
   const stars='★'.repeat(coach.maxDifficulty)+'☆'.repeat(5-coach.maxDifficulty);
   d.innerHTML=`<h3>${i===0?'🧍':'🏋️'} ${coach.name}</h3>
     <div class="meta">
       ${coach.desc}<br>
       Уровень подготовки: <b>${stars}</b><br>
       Прокачка за финиш: ×${coach.mult}<br>
       Максимум тренированности: <b>${coach.fitnessCap}/100</b><br>1 завершённая тренировка: <b>+1</b> к тренированности<br>
       ${(()=>{const b=tableForCoach(i); const ready=i===Number(game.coach||0)&&!!game.coachBonusReady; return `Бонусы перед гонкой: ${coach.bonuses}<br>После тренировки: <b>${ready?'ГОТОВЫ к следующей гонке':'сначала завершить тренировку'}</b><br>Базовые бонусы: темп −${Math.round(b.pace*100)}% · усталость −${Math.round(b.fatigue*100)}% · подъёмы −${Math.round(b.climb*100)}% · травмы −${Math.round(b.injury*100)}%`;})()}<br>
       ${i===0?'Бесплатно':`Цена: <span class="money">${fmtMoney(coach.price)}</span>`}
     </div>
     <button class="${active?'secondary':'primary'}" ${active||(!owned&&game.money<coach.price)?'disabled':''} data-coach="${i}">
       ${active
         ? 'Активен'
         : owned
           ? 'Выбрать тренера'
           : game.money<coach.price
             ? `Не хватает ${fmtMoney(coach.price-game.money)}`
             : 'Купить тренера'}
     </button>`;
   $('coachGrid').appendChild(d);
 });

 $('coachGrid').querySelectorAll('[data-coach]').forEach(b=>b.onclick=()=>{
   const i=Number(b.dataset.coach);
   const coach=COACHES[i];
   if(!game.coachOwned.includes(i)){
     if(game.money<coach.price){showGameError('Не хватает '+fmtMoney(coach.price-game.money)+' на тренера.');return}
     game.money-=coach.price;
     game.coachOwned.push(i);
   }
   game.coach=i;
   game.coachBonusReady=false;
   saveGame();
   render();
 });

 if($('fitnessPanelValue')) $('fitnessPanelValue').textContent=`${Math.round(game.fitness)} / 100`;
 if($('fitnessPanelBar')) $('fitnessPanelBar').style.width=`${game.fitness}%`;

 const coach=COACHES[game.coach]||COACHES[0];
 if($('fitnessPanelText')){
   $('fitnessPanelText').textContent=
     `Тренированность растёт и за прохождение гонок. Текущий тренер: ${coach.name}. Подготовка до ${'★'.repeat(coach.maxDifficulty)} · максимум ${coach.fitnessCap}/100.`;
 }

 const btn=$('startTrainingBtn');
 const status=$('trainingStatus');
 if(btn&&status){
   const ms=trainingRemainingMs();
   if(ms>0){
     btn.disabled=true;
     btn.textContent='🏃 Тренировка идёт…';
     const s=Math.ceil(ms/1000), mm=Math.floor(s/60), ss=s%60;
     status.textContent=`До окончания тренировки: ${mm}:${String(ss).padStart(2,'0')}`;
   }else{
     btn.disabled=false;
     btn.textContent='▶ Начать тренировку на 1 минуту';
     status.textContent=completedGain>0
       ? `✓ Тренировка завершена: +${completedGain.toFixed(1)} к тренированности.`
       : `1 минуту реального времени → +${coach.trainingGain.toFixed(1)} к тренированности.`;
   }
 }

 const playerName=safePlayerName();
 const rows=[...ELITE_RUNNERS,{name:playerName,itra:Math.round(game.itra),country:'🎮',player:true}]
   .sort((a,b)=>b.itra-a.itra);
 if($('itraLeaderboard')){
   $('itraLeaderboard').innerHTML=rows.map((r,i)=>`<div class="leader-row ${r.player?'player-row':''}">
     <b>${i+1}</b><span>${r.country} ${r.name}</span><strong>${r.itra}</strong>
   </div>`).join('');
 }
}
$('startTrainingBtn')?.addEventListener('click',()=>{
  ensureResources();
  ensureTraining();
  if(isResting()){
    showGameError('Во время отдыха тренировку запускать нельзя. Дождитесь окончания отдыха.');
    renderTraining();
    return;
  }
  if(trainingActive()) return;
  game.trainingUntil=Date.now()+60*1000;
  saveGame();
  renderTraining();
  updateRaceStartTrainingLock();
});
setInterval(()=>{
 if($('startTrainingBtn')) renderTraining();
 updateRaceStartTrainingLock();
},1000);

function totalRepairCost(){
 let s=0;Object.keys(GEAR).forEach(cat=>{const it=item(cat),cur=durability(cat);s+=(it[3]-cur)*Math.max(2,it[1]/it[3]*.28)});return Math.ceil(s);
}
$('repairAllBtn').onclick=()=>{
  if(run&&run.running){showGameError('Во время гонки ремонт недоступен');return}
  const cost=totalRepairCost();
  if(cost<=0){showGameError('Экипировка уже полностью исправна');return}
  if(game.money<cost){showGameError('Не хватает рублей. Нужно '+fmtMoney(cost));return}
  game.money-=cost;
  Object.keys(GEAR).forEach(cat=>setDur(cat,item(cat)[3]));
  saveGame();
  render();
};

function switchTab(id){
 const el=document.getElementById(id);
 if(!el) return;
 if(el.tagName==='DETAILS') el.open=true;
 el.scrollIntoView({behavior:'smooth',block:'start'});
}
$('scrollShopBtn')?.addEventListener('click',()=>{
  if(purchasesLockedDuringRace())return;
  switchTab('shop');
});

function keepEquippedGear(){
  // Сломанная вещь остаётся выбранной/надетой, пока игрок сам не наденет другую.
  if(!game.gear) game.gear={...START_GEAR};
  if(!game.gearOwned) game.gearOwned={};
  Object.keys(START_GEAR).forEach(cat=>{
    if(game.gear[cat]==null) game.gear[cat]=START_GEAR[cat];
    if(!Array.isArray(game.gearOwned[cat])) game.gearOwned[cat]=[];
    // Миграция старых сохранений: раз надет ур. N, уровни 1..N уже были куплены.
    for(let i=0;i<=Number(game.gear[cat]||0);i++){
      if(!game.gearOwned[cat].includes(i)) game.gearOwned[cat].push(i);
    }
  });
}
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
 const fit=Math.max(1,Math.min(100,game.fitness||1));f*=1-(fit-1)*.00152;return Math.max(.58,f);
}
function requiredGearLevel(cat,L=levelData(),w=weatherForLevel()){
  const raceNo=Math.max(1,Number(game.current||0)+1);
  const diff=Math.max(1,Number(L[5]||1));
  const dist=Number(L[1]||0);
  const climb=Number(L[2]||0);
  let req=1;
  if(['shoes','pack','watch'].includes(cat)) req=1+Math.floor((raceNo-1)/3);
  if(cat==='hydration') req=1+Math.floor((raceNo-1)/4);
  if(cat==='medkit') req=1+Math.floor((raceNo-1)/3);
  if(cat==='poles') req=(diff>=2||climb>=500)?1+Math.floor((raceNo-1)/4):1;
  if(cat==='lamp') req=(game.current>=4||L[3]>=3*3600)?1+Math.floor((raceNo-4)/3):1;
  if(cat==='jacket'){
    const weatherReq=membraneRequiredLevel(L,w);
    req=Math.max(1,weatherReq||1);
  }
  return Math.max(1,Math.min(7,req));
}
function equipmentPreparedness(cat,L=levelData(),w=weatherForLevel()){
  const idx=Number(game.gear?.[cat]||0);
  const current=idx+1;
  const required=requiredGearLevel(cat,L,w);
  return {current,required,gap:Math.max(0,required-current)};
}

function equipmentPenaltyChance(cat,diff,dist){
 const it=item(cat),cur=durability(cat),max=it[3];
 const wear=1-cur/max;
 const protect=it[4];
 const prep=equipmentPreparedness(cat);
 // Недостаточный уровень экипировки теперь напрямую повышает шанс сбоя.
 const preparednessPenalty=prep.gap*.055;
 // Неподготовленные палки ломаются особенно часто на наборе.
 const polePenalty=cat==='poles' ? (prep.gap*.075 + (diff>=3?0.045:0)) : 0;
 return Math.min(.72,Math.max(.008,.025*diff + dist/3500 + wear*.22 - protect + preparednessPenalty + polePenalty));
}
function wearFor(cat,L){
 const it=item(cat),diff=L[5],dist=L[1],gain=L[2];
 let base=dist/18 + gain/1800 + diff*.5;
 if(cat==='shoes')base*=1.55;
 if(cat==='poles')base*=1.35+gain/5000;
 if(cat==='jacket')base*=1+diff*.12;
 const prep=equipmentPreparedness(cat,L,weatherForLevel());
 base*=1+prep.gap*.22;
 return base*(.72+Math.random()*.62);
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
  ['🦶','Подвернул голеностоп',240,'injury'],
  ['🦵','Ударил колено',210,'injury'],
  ['🪨','Падение на камнях',300,'injury'],
  ['😅','Слишком быстро на старте',120,null],
  ['👟','Развязался шнурок',60,'shoes'],
  ['🚰','Очередь за водой на ПП',180,'hydration'],
  ['💧','Брод пройден идеально',-120,null],
  ['💦','Тяжёлый брод',150,'shoes'],
  ['🍌','Банан на ПП зашёл идеально',-60,null],
  ['🎵','Музыка на ПП придала сил',-75,null],
  ['😫','Накрыла усталость',300,null],
  ['🤢','Гель не зашёл',120,null],
  ['🔥','Кофеиновый гель «УГЛИ» сработал!',-300,'ugli'],
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
 // Hard/long races with high fatigue have a real chance of an additional injury event.
 const fatigue=Number(game.fatigue||0);
 const injuryChance=Math.min(.75,.04 + L[5]*.055 + L[1]/500 + Math.max(0,fatigue-35)/140);
 if(Math.random()<injuryChance){
   const injuryNames=[
     {emoji:'🦶',name:'Подвернул голеностоп',sec:240,cat:'injury'},
     {emoji:'🦵',name:'Ударил колено',sec:210,cat:'injury'},
     {emoji:'🪨',name:'Падение на камнях',sec:300,cat:'injury'}
   ];
   const x=injuryNames[Math.floor(Math.random()*injuryNames.length)];
   ev.push({p:.22+Math.random()*.68,...x});
 }
 // На каждой гонке есть шанс найти редкую экипировку. Она бесплатна и
 // может быть надета прямо во время гонки, если её уровень выше текущего.
 const findCount=(L[1]>=80||L[5]>=4)?2:1;
 for(let findNo=0;findNo<findCount;findNo++){
   const chance=findNo===0 ? Math.min(.72,.42+L[5]*.05) : Math.min(.55,.18+L[1]/500);
   if(Math.random()<chance){
     const cats=['shoes','pack','jacket','lamp','poles','watch','medkit','hydration'];
     const cat=cats[Math.floor(Math.random()*cats.length)];
     const current=Number(game.gear?.[cat]||0);
     const found=Math.min(6,current+1+Math.floor(Math.random()*2));
     if(found>current){
       ev.push({p:.12+Math.random()*.76,emoji:'🎒',name:`Найдена экипировка · ${CATEGORY_NAMES[cat]} ур. ${found+1}/7`,sec:-90,cat:'gearFind',foundCat:cat,foundLevel:found});
     }
   }
 }
 // Гелевые события не должны идти рядом.
 // Если «УГЛИ сработал» и «Гель не зашёл» ближе чем на 12% дистанции,
 // оставляем только первое из них.
 const sorted=ev.sort((a,b)=>a.p-b.p);
 const filtered=[];
 for(const e of sorted){
   const isGel=(e.cat==='ugli' || e.name==='Гель не зашёл');
   if(isGel){
     const prevGel=[...filtered].reverse().find(x=>x.cat==='ugli' || x.name==='Гель не зашёл');
     if(prevGel && Math.abs(Number(e.p)-Number(prevGel.p))<0.12) continue;
   }
   filtered.push(e);
 }
 return filtered;
}
function clearStartRequirementsError(){
 const el=$('startRequirementsError');
 if(!el)return;
 el.style.display='none';
 el.innerHTML='';
}
function showStartRequirementsError(title,items=[]){
 const el=$('startRequirementsError');
 if(!el)return;
 const rows=(items||[]).filter(Boolean);
 el.innerHTML=`<b>⛔ ${title}</b>${rows.length?`<ul>${rows.map(x=>`<li>${x}</li>`).join('')}</ul>`:''}`;
 el.style.display='block';
 // Keep the message visible on screen instead of silently moving the player elsewhere.
 el.scrollIntoView({behavior:'smooth',block:'center'});
}

function weatherDnfRisk(L,w){
 // На дистанциях до 20 км плохая погода сама по себе не вызывает DNF игрока.
 if(Number(L[1]||0)<=20) return 0;
 let risk=0.01 + Math.max(0,game.fatigue-55)*0.0015;
 if(w.temp>=30) risk += 0.12 + L[5]*0.018;
 if(w.name==='Ливень') risk += 0.16 + L[5]*0.015;
 else if(w.rain) risk += 0.08 + L[5]*0.012;
 if(w.cold) risk += 0.06 + L[5]*0.01;
 if(L[1]>=80) risk += 0.025;
 if(L[1]>=150) risk += 0.035;
 return Math.min(0.38,Math.max(0.01,risk));
}
function competitorDnfRate(L,w){
 let p=0.025 + L[5]*0.012 + Math.min(0.05,L[1]/3000);
 if(w.temp>=30) p+=0.09;
 if(w.name==='Ливень') p+=0.13;
 else if(w.rain) p+=0.07;
 if(w.cold) p+=0.05;
 return Math.min(0.32,p);
}
function simulateOtherDnfs(fieldSize,L,w){
 const p=competitorDnfRate(L,w);
 let n=0;
 for(let i=0;i<fieldSize-1;i++) if(Math.random()<p) n++;
 return n;
}


function playerItraPlace(){
  return ELITE_RUNNERS.filter(r=>Number(r.itra||0)>Number(game.itra||0)).length+1;
}

function itraEarlyRaceBoost(){
  const place=playerItraPlace();
  const earlyRace=Number(game.current||0)<10; // уровни 1–10

  if(!earlyRace) return {active:false,place,chance:0,mult:1,tier:'off'};

  let chance=0;
  let mult=1;
  let tier='none';

  if(place===1){
    // Первое место ITRA: игрок на первых 10 уровнях должен регулярно
    // бороться минимум за TOP-5 и часто за победу.
    chance=0.88; mult=1.125; tier='1';
  }else if(place===2){
    chance=0.68; mult=1.078; tier='2';
  }else if(place===3){
    chance=0.56; mult=1.060; tier='3';
  }else if(place<=5){
    chance=0.42; mult=1.044; tier='4-5';
  }else if(place<=10){
    chance=0.30; mult=1.032; tier='6-10';
  }else if(place<=15){
    chance=0.18; mult=1.020; tier='11-15';
  }

  const active=chance>0 && Math.random()<chance;
  return {active,place,chance,mult:active?mult:1,tier};
}


function seededNoise01(seed){
  // deterministic pseudo-random 0..1 for this race/competitor
  const x=Math.sin(seed*12.9898+78.233)*43758.5453;
  return x-Math.floor(x);
}

function createVirtualField(L,fieldSize,playerBaseSec){
  const n=Math.max(20,Math.min(124,fieldSize||50));
  const itraBoost=itraEarlyRaceBoost();
  const strength=Math.max(0,Math.min(1,
    (Number(game.fitness||0)/100)*0.52 +
    (Number(game.level||1)/100)*0.24 +
    Math.max(0,((COACHES[game.coach]||COACHES[0]).mult-1))*0.14 +
    (game.itra||250)/1000*0.07 +
    (game.rep||0)/500*0.03
  ));

  const field=[];
  for(let i=0;i<n-1;i++){
    const q=(i+0.5)/(n-1); // 0 strongest -> 1 weakest
    const seed=(game.current+1)*1000+(game.completed||0)*37+i*17+(game.level||1)*13;
    const noise=(seededNoise01(seed)-0.5)*0.10;

    // Strongest runners are clearly faster; the middle pack stays close enough
    // that +/- race events can cause natural overtakes.
    let relative=0.82 + q*0.42 + noise;

    // Harder races attract a slightly stronger field.
    relative-=Math.max(0,L[5]-2)*0.012;

    // Player strength shifts the expected field relation, but not enough to
    // create huge unrealistic jumps.
    relative+=strength*0.05;

    field.push({
      id:i,
      relative:Math.max(0.72,Math.min(1.34,relative)),
      finishSec:Math.max(
        60,
        playerBaseSec*relative*(
          // Результат теперь реально зависит от навыков игрока.
          // Новичок получает сильное поле и обычно не борется за победу.
          // По мере роста тренированности/уровня/тренера/ITRA соперники
          // становятся относительно доступнее.
          Math.max(0.82,Math.min(1.12,
            0.84 + strength*0.28 - Math.max(0,L[5]-2)*0.006
          )) * itraBoost.mult
        )
      ),
      dnf:false
    });
  }
  // Если игрок №1 в ITRA на уровнях 1–10, не даём случайной генерации
  // слишком часто выбрасывать его далеко за TOP-5.
  if(Number(game.current||0)<10 && playerItraPlace()===1){
    const sorted=[...field].sort((a,b)=>a.finishSec-b.finishSec);
    const top5Cut=Math.max(60,playerBaseSec*0.995);
    for(let i=4;i<Math.min(sorted.length,12);i++){
      sorted[i].finishSec=Math.max(sorted[i].finishSec, top5Cut+(i-4)*6);
    }
  }

  return field.sort((a,b)=>a.finishSec-b.finishSec);
}

function competitorProgressAt(c,elapsed,L){
  if(!c || c.dnf) return 0;
  const total=Math.max(60,c.finishSec);
  let p=Math.max(0,Math.min(1,elapsed/total));

  // Small stable pacing variation: competitors do not run like robots,
  // but the wiggle is intentionally mild to avoid position flicker.
  const wave=Math.sin((elapsed/180)+(c.id%7))*0.004;
  p=Math.max(0,Math.min(1,p+wave));

  // В Армагеддоне Артём Чернов обычно держит лидерство почти до финиша.
  // В редких проигрышных попытках он проседает только на последних ~12%.
  if(c.armageddonStar && !c.armageddonWins && p>0.88){
    const late=(p-0.88)/0.12;
    p=Math.max(0,Math.min(1,p-late*0.035));
  }
  return p;
}



function showDnfNotice(name, extra=''){
  try{
    const ov=$('eventOverlay');
    if(ov){
      ov.innerHTML=`<div class="overlay-box"><div class="emoji">🚫</div><b>${name} сошёл</b><span>${extra||'гонка продолжается'}</span></div>`;
      ov.classList.add('show');
      setTimeout(()=>ov.classList.remove('show'),2000);
    }
    const el=$('eventLog');
    if(el){
      el.insertAdjacentHTML(
        'afterbegin',
        `<div class="event-row"><span>${((run?.p||0)*levelData()[1]).toFixed(1)} км</span><b>🚫 ${name} сошёл</b><span class="neutral">${extra||''}</span></div>`
      );
    }
    // Important: opponent DNF must never pause the race.
    if(run) run.eventPause=false;
  }catch(e){}
}

function isItraDnfProtectedRunner(c){
 const n=String(c?.name||c?.runnerName||c?.fullName||'').trim().toLowerCase();
 if(!n) return false;

 const intl=(Array.isArray(TOP_ITRA_LEADERS)?TOP_ITRA_LEADERS:[])
   .some(x=>String(x||'').trim().toLowerCase()===n);

 const ru=(Array.isArray(RUSSIAN_ITRA_RIVALS)?RUSSIAN_ITRA_RIVALS:[])
   .some(x=>String(x?.name||'').trim().toLowerCase()===n);

 return intl || ru;
}

function actualDnfCount(){
 try{
   // Total number of actual DNFs in the whole race field.
   // Do not derive this from TOP-14/TOP-N or the visible leaderboard.
   const npcDnfs=Array.isArray(run?.virtualField)
     ? run.virtualField.reduce((n,c)=>n+(c&&c.dnf?1:0),0)
     : 0;
   const playerDnf=run?.dnf ? 1 : 0;
   const total=npcDnfs+playerDnf;
   const fieldSize=Number(run?.fieldSize||0);
   return fieldSize>0 ? Math.min(fieldSize,total) : total;
 }catch(e){ return Number(run?.liveDnfCount||0); }
}

function updateLiveDnfs(){
 const raceKmNow=Number(run.p||0)*Number(levelData()?.[1]||0);
 if(raceKmNow<30){
   const box=$('liveDnfStatus');
   if(box){
     const total=Math.max(1,Number(run.fieldSize||0));
     box.textContent=`🚫 Сошли: ${actualDnfCount()} из ${total}`;
   }
   return;
 }
 if(!run || !run.running) return;

 const points=Array.isArray(run.otherDnfPoints)?run.otherDnfPoints:[];
 let targetCount=0;
 for(const p of points) if((run.p||0)>=p) targetCount++;

 const already=Number(run.liveDnfCount||0);
 if(targetCount>already){
   const requested=targetCount-already;
   const active=(run.virtualField||[]).filter(c=>c && !c.dnf);

   if(!(run.dnfNames instanceof Set)){
     run.dnfNames=new Set(Array.isArray(run.dnfNames)?run.dnfNames:[]);
   }

   let actuallyAdded=0;

   for(let i=0;i<requested && active.length;i++){
     const L=levelData();
     const raceKm=Number(run.p||0)*Number(L?.[1]||0);

     // Rank by actual live progress, not empty c.km fields.
     const ranked=[...active].sort((a,b)=>{
       const pa=competitorProgressAt(a,Number(run.elapsed||0),L);
       const pb=competitorProgressAt(b,Number(run.elapsed||0),L);
       return pb-pa;
     });
     const currentTop14=new Set(ranked.slice(0,14));

     // Never use a name that has already appeared in a DNF event.
     const unseen=c=>{
       const n=String(c?.name||c?.runnerName||c?.fullName||'').trim();
       return n && !run.dnfNames.has(n.toLowerCase());
     };

     let pool=active.filter(unseen);

     // Before 70 km, absolutely exclude EVERY runner from the actual ITRA rosters.
     if(raceKm < 70){
       pool=pool.filter(c=>!isItraDnfProtectedRunner(c));
     }

     // TOP-14 may DNF only rarely. Prefer anyone outside current TOP-14.
     if(pool.length){
       if(Math.random()<0.02){
         const topPool=pool.filter(c=>currentTop14.has(c));
         if(topPool.length) pool=topPool;
       }else{
         const outside=pool.filter(c=>!currentTop14.has(c));
         if(outside.length) pool=outside;
       }
     }

     // If no legal unique candidate exists, skip this DNF instead of breaking the rules.
     if(!pool.length) continue;

     const dnfRunner=pool[Math.floor(Math.random()*pool.length)];
     const idx=active.indexOf(dnfRunner);
     if(idx<0) continue;

     const dnfName=String(
       dnfRunner.name ||
       dnfRunner.runnerName ||
       dnfRunner.fullName ||
       'Неизвестный участник'
     ).trim();

     dnfRunner.dnf=true;
     active.splice(idx,1);
     run.dnfNames.add(dnfName.toLowerCase());
     actuallyAdded++;

     try{ showDnfNotice(dnfName); }
     catch(e){ console.warn('DNF notice error',e); }
   }

   // Count only DNF events that were really allowed and created.
   run.liveDnfCount=already+actuallyAdded;
 }

 const box=$('liveDnfStatus');
 if(box){
   const total=Math.max(1,Number(run.fieldSize||0));
   box.textContent=`🚫 Сошли: ${actualDnfCount()} из ${total}`;
 }
}



function enforceMinRussianTop7(L){
  if(!run || !run.running) return;

  const raceLevel=Number((levelData()?.[0])||0);
  if(raceLevel < 8) return;

  const russianNames=new Set([
    'Алексей Береснев','Антонина Юшина','Алексей Толстенко','Константин Иванов',
    'Елена Носкова','Василий Корыткин','Алексей Макалюкин','Алексей Бабушкин',
    'Павел Тарасов','Виктория Жукова','Мария Гостева','Вера Чекалина'
  ].map(x=>x.toLowerCase()));

  const rows=dynamicLeaderRows(L);
  if(!rows.length) return;

  const top7=rows.slice(0,7);
  const isRu=r=>russianNames.has(String(r?.c?.name||r?.c?.fullName||'').trim().toLowerCase());

  let ruCount=top7.filter(isRu).length;
  if(ruCount>=4) return;

  const outsiders=rows.slice(7).filter(isRu);
  if(!outsiders.length) return;

  // Promote enough Russian runners into the live top-7 by nudging their live position
  // just above the current 7th-place threshold. This keeps the order dynamic while
  // guaranteeing at least four Russian athletes in TOP-7 from level 8 onward.
  const threshold=Number(top7[top7.length-1]?.liveKm ?? top7[top7.length-1]?.km ?? 0);
  let need=4-ruCount;

  for(let i=0;i<outsiders.length && need>0;i++,need--){
    const r=outsiders[i];
    const target=Math.min(Number(L[1]||0), threshold + 0.02 + i*0.01);
    r.liveKm=target;

    if(r.c){
      // Keep a tiny persistent competitive bump so they do not instantly fall out next tick.
      if('speedFactor' in r.c) r.c.speedFactor=Math.max(Number(r.c.speedFactor)||1,1.08);
      if('paceFactor' in r.c) r.c.paceFactor=Math.min(Number(r.c.paceFactor)||1,0.94);
    }
  }
}

function maybeLeaderDNF(){
  const leaderDnfKm=Number(run.p||0)*Number(levelData()?.[1]||0);
  if(leaderDnfKm<30) return;
  if(!run || !run.running || !Array.isArray(run.virtualField)) return;
  const elapsed=Number(run.elapsed||0);
  if(elapsed<240) return; // no leader DNFs immediately after start

  const bucket=Math.floor(elapsed/180); // check about once per 3 race minutes
  if(run.lastLeaderDnfBucket===bucket) return;
  run.lastLeaderDnfBucket=bucket;

  const active=run.virtualField.filter(c=>c && !c.dnf);
  if(active.length<8) return;

  const L=levelData();
  const ranked=active.map(c=>({
    c,
    p:competitorProgressAt(c,elapsed,L)
  })).sort((a,b)=>b.p-a.p);

  // Only someone currently in the front 7 can suffer a leader DNF.
  const candidates=ranked.slice(0,7);
  if(!candidates.length) return;

  // Usually nothing happens. Approx. 4% chance per check.
  if(Math.random()>=0.04) return;

  let c=candidates[Math.floor(Math.random()*candidates.length)].c;
  const n=String(c.name||'');
  if(!(run.dnfNames instanceof Set)) run.dnfNames=new Set(Array.isArray(run.dnfNames)?run.dnfNames:[]);
  if(run.dnfNames.has(n.trim().toLowerCase())) return;

  // TOP ITRA may not DNF before 70 km, including the separate leader-DNF path.
  const leaderRaceKm=Number(run.p||0)*Number(levelData()?.[1]||0);
  if(leaderRaceKm<70 && isItraDnfProtectedRunner(c)) return;

  // Star leaders can also DNF, but more rarely.
  let chance=1;
  if(n==='Алексей Береснев' || n==='Антонина Юшина') chance=.55;
  if(n==='Артем Чернов') chance=.35;
  if(Math.random()>chance) return;

  c.dnf=true;
  c.dnfKm=Math.max(0,Math.min(Number(L[1]||0),competitorProgressAt(c,elapsed,L)*Number(L[1]||0)));
  const reasons=['травма','сильная усталость','проблемы с желудком','падение','переохлаждение'];
  c.dnfReason=reasons[Math.floor(Math.random()*reasons.length)];
  run.dnfNames.add(n.trim().toLowerCase());
  run.liveDnfCount=actualDnfCount();
  try{ showDnfNotice(n||'Лидер',c.dnfReason||''); }catch(e){}
}

function dynamicLeaderRows(L){
  if(!run) return [];
  maybeLeaderDNF();
  if(!run.running){
    return (run.virtualField||[])
      .filter(c=>!c.dnf)
      .map((c,idx)=>({c,idx,km:0,liveKm:0}));
  }

  const dist=Math.max(1,Number(L[1]||1));
  let rows=(run.virtualField||[])
    .filter(c=>!c.dnf)
    .map((c,idx)=>({
      c,
      idx,
      km:Math.max(0,Math.min(dist,competitorProgressAt(c,run.elapsed||0,L)*dist))
    }));

  const p=Math.max(0,Math.min(1,Number(run.p||0)));
  rows.forEach((r,i)=>{
    const seed=(Number(r.c?.id||i)+1)*0.83 + (i+1)*0.37;
    const surge=
      Math.sin(p*Math.PI*(5.5 + (i%4)*.7) + seed)*dist*.0045 +
      Math.sin(p*Math.PI*(11.0 + (i%3)*.9) + seed*.63)*dist*.0022;
    r.liveKm=Math.max(0,Math.min(dist,r.km+surge));
  });

  rows.sort((a,b)=>b.liveKm-a.liveKm);

  // Levels 12-19: Beresnev and Yushina appear near the leaders much more often.
  // Level 20 is reserved for Artem Chernov's special Armageddon behavior.
  const shownLevel=Number(game.current||0);
  if(shownLevel>=12 && shownLevel<20){
    const stars=rows.filter(r=>{
      const n=String(r?.c?.name||'');
      return n==='Алексей Береснев' || n==='Антонина Юшина';
    });
    if(stars.length){
      const leaderKm=Number(rows[0]?.liveKm||0);
      stars.forEach((r,i)=>{
        // Usually keep them in/around the leading pack, with small oscillation
        // so they can swap places and occasionally drop a little.
        const wobble=(Math.sin((Number(run.elapsed||0)/95)+(i*2.1))+1)/2;
        const gap=Number(L[1]||1)*(0.0015+0.006*wobble);
        r.liveKm=Math.max(r.liveKm, Math.max(0,leaderKm-gap));
      });
      rows.sort((a,b)=>b.liveKm-a.liveKm);
    }
  }

  // From level 8, guarantee at least four REAL Russian rivals in live TOP-7.
  if(Number(game.current||0)>=7 && rows.length>=7){
    const isRu=r=>isRussianEliteName(r?.c?.name);
    let top=rows.slice(0,7);
    let ruCount=top.filter(isRu).length;

    if(ruCount<4){
      const outsiders=rows.slice(7).filter(isRu);
      const nonRuTop=top.filter(r=>!isRu(r)).sort((a,b)=>a.liveKm-b.liveKm);
      let need=Math.min(4-ruCount,outsiders.length,nonRuTop.length);

      for(let i=0;i<need;i++){
        const promote=outsiders[i];
        const replace=nonRuTop[i];
        // Put the Russian rival just above the runner being replaced.
        promote.liveKm=Math.min(dist,replace.liveKm+0.015+i*0.003);
      }
      rows.sort((a,b)=>b.liveKm-a.liveKm);
    }
  }

  return rows;
}

function currentRaceStandings(){
  if(!run || !run.running) return [];
  const L=levelData();
  const dist=Number(L[1]||0);
  const playerKm=Math.max(0,Math.min(dist,(run.p||0)*dist));

  const rows=dynamicLeaderRows(L).map(r=>({
      id:r.c.id,
      player:false,
      km:r.liveKm,
      finishSec:Number(r.c.finishSec||Infinity)
    }));

  const playerFinishSec=Math.max(1,Number(run.base||0)+Number(run.penalty||0));
  rows.push({id:'player',player:true,km:playerKm,finishSec:playerFinishSec});

  // Основной критерий — фактическое продвижение по трассе.
  // ВАЖНО: когда несколько участников уже на финише (100%),
  // нельзя ставить игрока первым просто из-за равенства километров.
  // Среди финишировавших сортируем по реальному времени финиша.
  rows.sort((a,b)=>{
    const aFinished=a.km>=dist-0.0001;
    const bFinished=b.km>=dist-0.0001;
    if(aFinished && bFinished){
      if(Math.abs(a.finishSec-b.finishSec)>0.001) return a.finishSec-b.finishSec;
    }
    if(Math.abs(b.km-a.km)>0.0001) return b.km-a.km;
    if(a.player&&!b.player) return 1;
    if(!a.player&&b.player) return -1;
    return String(a.id).localeCompare(String(b.id));
  });
  return rows;
}

function updateRealisticPosition(){
  if(!run || !run.running) return;
  const rows=currentRaceStandings();
  const idx=rows.findIndex(r=>r.player);
  const place=idx>=0?idx+1:1;

  run.currentPosition=place;
  run.position=place;
  return place;
}

function startRace(){
 if(trainingActive()){
   const left=trainingCountdownText();
   showStartRequirementsError('🏃 Идёт тренировка',[`Старт гонки будет доступен через ${left}.`]);
   showGameError(`Сначала закончите тренировку. Осталось ${left}.`);
   updateRaceStartTrainingLock();
   renderTraining();
   return;
 }

 clearStartRequirementsError();
 

 if(run && run.running)return;
 ensureResources();
 const L=levelData();

 if(isInHospital()){
   const left=fmtRest(hospitalRemainingMs());
   showStartRequirementsError('🏥 Лечение перелома',[`До окончания лечения: ${left}.`]);
   return;
 }

 if(isResting()){
   const left=fmtRest(restRemainingMs());
   $('preRaceNote').textContent='😴 Вы отдыхаете. До следующего старта: '+left;
   showStartRequirementsError('Старт пока недоступен',[`Идёт отдых. Осталось: ${left}.`]);
   return;
 }

  const needGels=gelsNeeded(L);
 const lampHours=lampHoursNeeded(L);
 const activeCoach=COACHES[game.coach]||COACHES[0];
 const raceCoachBonuses=coachRaceBonuses();
 const coachDifficultyGap=Math.max(0,L[5]-activeCoach.maxDifficulty);
 const raceWeather=weatherForLevel();
 let warnings=[];
 let mandatoryGearWarnings=[];
 if(Number(game.fitness||0)>=Number(activeCoach.fitnessCap||100) && activeCoach.fitnessCap<100){
   warnings.push(`тренированность упёрлась в предел ${activeCoach.fitnessCap}/100 — нужен более сильный тренер`);
 }
 const needWater=waterBottlesNeeded(L,raceWeather);

 // Каждый слот экипировки теперь имеет минимальный рабочий уровень для
 // конкретной гонки. Недобор не всегда блокирует старт, но резко повышает
 // риск событий и износа; критические слоты блокируют старт.
 Object.keys(GEAR).forEach(cat=>{
   const prep=equipmentPreparedness(cat,L,raceWeather);
   if(prep.gap>0){
     const text=`${CATEGORY_NAMES[cat]}: ур. ${prep.current}/7, желательно ${prep.required}/7`;
     if(['shoes','jacket','lamp'].includes(cat) && (
       (cat==='jacket' && (raceWeather.rain||raceWeather.cold)) ||
       (cat==='lamp' && lampHours>0) ||
       (cat==='shoes' && L[1]>=50)
     )) mandatoryGearWarnings.push('⚠️ '+text);
     else warnings.push(text);
   }
 });

 // Critical broken equipment is reported directly on the race screen.
 const brokenRequired=[];
 if(durability('shoes')<=0) brokenRequired.push(`Кроссовки: ${item('shoes')[0]} сломаны — замените или почините.`);
 if((raceWeather.rain||raceWeather.cold) && durability('jacket')<=0) brokenRequired.push(`Мембранка: ${item('jacket')[0]} сломана.`);
 if(lampHours>0 && durability('lamp')<=0) brokenRequired.push(`Фонарик: ${item('lamp')[0]} сломан.`);
 if(brokenRequired.length){
   showStartRequirementsError(
     '⛔ Нельзя стартовать — обязательная экипировка неисправна',
     brokenRequired
   );
   return;
 }

 // Water shortage is only a warning; start is still allowed.
 if((game.resources.waterBottles||0)<needWater){
   const have=Number(game.resources.waterBottles||0);
   warnings.push(`воды ${have}/${needWater} × 0,5 л`);
 }

 // In cold/rainy weather the required membrane level rises with race difficulty.
 if(raceWeather.rain || raceWeather.cold){
   const requiredMembrane=membraneRequiredLevel(L,raceWeather);
   const equippedMembrane=membraneEquippedLevel();
   if(requiredMembrane>0 && !hasMembrane(requiredMembrane)){
     const equippedName=GEAR.jacket[Number(game.gear.jacket||0)]?.[0]||'Нет мембранки';
     showStartRequirementsError(
       '⛔ Нельзя стартовать — нет обязательной мембранки',
       [
         `${raceWeather.emoji} ${raceWeather.name}, ${raceWeather.temp}°C.`,
         `Мембранка: нужна ур. ${requiredMembrane}/7 или выше.`,
         `Сейчас: ${equippedMembrane <= 1 ? 'мембранки нет' : equippedName+' · ур. '+equippedMembrane+'/7'}.`
       ]
     );
     activeShopCategory='jacket';
     renderShop();
     return;
   }
 }

 if(game.resources.gels<needGels) warnings.push(`гелей ${game.resources.gels}/${needGels}`);
 if(lampHours>0){
   if(durability('lamp')<=0){
     showStartRequirementsError(
       '⛔ Нельзя стартовать — обязательный фонарь неисправен',
       ['Отремонтируйте или замените фонарь перед стартом.']
     );
     return;
   }
   if(isRechargeableLamp()){
     const requiredCharge=Math.min(100,Math.ceil(lampHours*12));
     if(game.lampCharge<requiredCharge && game.resources.powerbank<=0) warnings.push('не хватает заряда фонаря');
   }else{
     const needBat=Math.ceil(lampHours/5);
     if(game.resources.batteries<needBat) warnings.push(`батареек ${game.resources.batteries}/${needBat}`);
   }
 }
 const requiredMedkitsPreview=Math.max(1,Math.min(6,Math.ceil((L[5]+(L[1]>=50?1:0)+(L[1]>=120?1:0))/2)));
 if(Number(game.resources.medkits||0)<requiredMedkitsPreview) warnings.push(`готовых аптечек ${Number(game.resources.medkits||0)}/${requiredMedkitsPreview}`);
 if(medkitScore()<3) warnings.push('расходники аптечки неполные');
 if(game.fatigue>=70) warnings.push(`усталость ${Math.round(game.fatigue)}%`);

 // Mandatory equipment never blocks the start, but is always highlighted separately.
 if(mandatoryGearWarnings.length){
   warnings.unshift(...mandatoryGearWarnings);
 }

 $('raceResourceWarning').textContent=warnings.length
   ? '⚠️ Риски перед стартом: '+warnings.join(' · ')
   : '✅ Запас расходников и состояние нормальные.';
 if(warnings.length){
   const important=warnings.map(x=>`⚠️ ${x}`);
   const el=$('startRequirementsError');
   if(el){
     el.innerHTML=`<b>⚠️ Обратите внимание — есть риски/нехватка расходников. Гонка будет запущена:</b><ul>${important.map(x=>`<li>${x}</li>`).join('')}</ul>`;
     el.style.display='block';
   }
 }

 if(game.level<Math.max(1,game.current*3-2)){
   $('preRaceNote').textContent=`⚠️ Рекомендуемый уровень трейлраннера: ${Math.max(1, Math.round((Math.max(1,game.current*3-2))*0.5))}. Можно стартовать, но будет сложнее.`;
 }

 // Water is transferred into the current race and consumed gradually.
 const waterAvailable=Math.max(0,Number(game.resources.waterBottles||0),Number(game.waterBottles||0));
 const waterUsed=Math.min(waterAvailable,needWater);
 const waterShortage=Math.max(0,needWater-waterAvailable);
 // В стартовый сегмент берём только рассчитанный запас. Остальные бутылки
 // остаются в инвентаре — прежняя версия списывала весь запас сразу.
 game.resources.waterBottles=Math.max(0,waterAvailable-waterUsed);
 game.waterBottles=0;

 if(waterAvailable>0){
   $('eventLog').insertAdjacentHTML('afterbegin',`<div class="event-row"><span>СТАРТ</span><b>💧 Вода взята: ${waterUsed} × 0,5 л</b><span class="neutral">${waterShortage>0?'не хватает '+waterShortage:'запас готов'}</span></div>`);
 }else{
   $('eventLog').insertAdjacentHTML('afterbegin',`<div class="event-row"><span>СТАРТ</span><b>💧 Старт без воды</b><span class="bad">риск обезвоживания</span></div>`);
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
       if((game.resources.accumulator||0)>0){
         useResource('accumulator',1);
         game.lampCharge=Math.max(0,100-deficit);
       }else if(game.resources.powerbank>0){
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

 const requiredMedkits=Math.max(1,Math.min(6,Math.ceil((L[5]+(L[1]>=50?1:0)+(L[1]>=120?1:0))/2)));
 const medkitsForRace=Math.min(Number(game.resources.medkits||0),requiredMedkits);
 game.resources.medkits=Math.max(0,Number(game.resources.medkits||0)-medkitsForRace);

 saveGame();

 const fatiguePenaltySec=Math.round(Math.max(0,game.fatigue-35)*L[3]/1000*(1-coachRaceBonuses().fatigue));
 const gelPenaltySec=Math.round(gelShortage*Math.min(420,120+L[5]*45));
 const lightPenaltySec=Math.round(lightShortageHours*600);

 // Weather consequences while racing.
 if(raceWeather.sun>=80){
   const hotPenalty=Math.round(Math.max(0,raceWeather.sun-70)*L[3]/1200);
   if(hotPenalty>0){
     $('eventLog').insertAdjacentHTML('afterbegin',`<div class="event-row"><span>СТАРТ</span><b>☀️ Солнце ${raceWeather.sun}% · вода расходуется быстрее</b><span class="bad">+${fmt(hotPenalty)}</span></div>`);
   }
 }

 run={
   running:true,startedByUser:true,paused:false,p:0,base:L[3]*gearTimeFactor()*(1-coachRaceBonuses().pace),
   weatherDnfRisk:weatherDnfRisk(L,raceWeather),
   weatherDnfPlanned:false,
   weatherDnfTriggered:false,
   weatherDnfAt:.35+Math.random()*.55,
   weatherDnfReason:raceWeather.temp>=30?'heat':((raceWeather.rain||raceWeather.cold)?'weather':'other'),
   virtualField:[],
   raceDistance:Number(L[1]||5),
   fieldSize:Math.min(250,Math.max(35,Math.round(42+L[5]*18+L[1]*.55))),
   otherDnfCount:0,
   raceLeaders:[...leadersForRace(game.current)],
   elapsed:0,penalty:fatiguePenaltySec+gelPenaltySec+lightPenaltySec+(raceWeather.sun>=80?Math.round((raceWeather.sun-70)*L[3]/1200):0)+Math.round(coachDifficultyGap*L[3]*0.04),
   events:buildEvents(L),fired:new Set(),
   position:Math.max(1,Math.round(12+L[5]*6-game.level/4+Math.random()*8)),
   startPenalty:fatiguePenaltySec+gelPenaltySec+lightPenaltySec+(raceWeather.sun>=80?Math.round((raceWeather.sun-70)*L[3]/1200):0)+Math.round(coachDifficultyGap*L[3]*0.04),
   positionDrift:0,
   condition:game.fatigue>=75?'сильная усталость':'нормально',
   coachBonuses:raceCoachBonuses,
   blisterCount:0,
   waterStart:waterUsed,waterRemaining:waterUsed,medkitsRemaining:medkitsForRace,waterNeed:needWater,waterSegmentStartKm:0,waterSegmentStartAmount:waterUsed,waterEmptyNotified:(waterAvailable<=0),aidStations:buildAidStations(Number(L[1]||0)),aidStationsPassed:new Set(),waterShortage,gelShortage,lightShortageHours,
   fractureRisk:Math.min(.42, Math.max(0,((game.fatigue-55)/140) * (1-coachRaceBonuses().injury)) + (Date.now()-(game.lastFinishAt||0)<10*60*1000 ? .08*(1-coachRaceBonuses().injury) : 0)),
   dnf:false
 };
 // Тренировочный бонус используется именно в этой гонке и затем сгорает.
 game.coachBonusReady=false;
 run.virtualField=createVirtualField(L,run.fieldSize,Math.max(60,run.base+run.penalty));
 run.playerItraPlace=playerItraPlace();
 run.itraBoostTier=(run.playerItraPlace<=3?'TOP-3':
                    run.playerItraPlace<=5?'TOP-5':
                    run.playerItraPlace<=10?'TOP-10':
                    run.playerItraPlace<=15?'TOP-15':'обычный');
 attachRivalNamesToVirtualField();

 // Армагеддон: Артём Чернов — главный соперник.
 // В большинстве попыток он ведёт почти всю гонку и часто выигрывает.
 if(Number(game.current||0)===20 && Array.isArray(run.virtualField) && run.virtualField.length){
   const field=[...run.virtualField].sort((a,b)=>a.finishSec-b.finishSec);
   const artem=field[0];
   artem.name='Артем Чернов';
   artem.country='RU';
   artem.itra=920;
   artem.armageddonStar=true;
   artem.armageddonWins=Math.random()<0.72; // примерно 72% побед
   const expectedPlayer=Math.max(60,Number(run.base||0)+Number(run.penalty||0));
   artem.finishSec=expectedPlayer*(artem.armageddonWins ? (0.91+Math.random()*0.045) : (1.015+Math.random()*0.035));
   // Остальных не пускаем слишком далеко вперёд Артёма.
   field.slice(1,7).forEach((c,i)=>{
     c.finishSec=Math.max(c.finishSec, artem.finishSec*(1.012+i*0.006));
   });
 }
 run.p=0;
 run.elapsed=0;
 const expectedStart=Math.max(1,Math.min(run.fieldSize,
   Math.round((run.fieldSize||50)*(0.30 + L[5]*0.055 - (game.fitness||0)/420 - game.level/500))
 ));
 run.position=expectedStart;
 run.currentPosition=expectedStart;
 run.running=true;

 run.startedByUser=true;
 run.weatherDnfPlanned=run.weatherDnfRisk>0 && Math.random()<run.weatherDnfRisk;
 run.otherDnfCount=Math.floor(simulateOtherDnfs(run.fieldSize,L,raceWeather)/2);
 run.liveDnfCount=0;
 run.otherDnfPoints=Array.from({length:run.otherDnfCount},(_,i)=>{
   const base=(i+1)/(run.otherDnfCount+1);
   return Math.max(.06,Math.min(.97,base + (Math.random()-.5)*.12));
 }).sort((a,b)=>a-b);
 if(game.current>=9){
   const rivalName=(run.raceLeaders && run.raceLeaders.length)
     ? run.raceLeaders[Math.floor(Math.random()*run.raceLeaders.length)]
     : TOP_ITRA_LEADERS[Math.floor(Math.random()*TOP_ITRA_LEADERS.length)];
   run.events.push({p:.68+Math.random()*.18,emoji:'🏆',name:`Борьба с лидером: ${rivalName}`,sec:Math.round(35+Math.random()*90),cat:null});
   run.events.sort((a,b)=>a.p-b.p);
 }
 $('eventLog').innerHTML='';
 if(gelShortage>0) $('eventLog').insertAdjacentHTML('afterbegin',`<div class="event-row"><span>СТАРТ</span><b>🍯 Не хватает гелей: ${gelShortage}</b><span class="bad">+${fmt(gelPenaltySec)}</span></div>`);
 if(lightShortageHours>0) $('eventLog').insertAdjacentHTML('afterbegin',`<div class="event-row"><span>СТАРТ</span><b>🔦 Не хватает света: ${lightShortageHours} ч</b><span class="bad">+${fmt(lightPenaltySec)}</span></div>`);
 if(fatiguePenaltySec>0) $('eventLog').insertAdjacentHTML('afterbegin',`<div class="event-row"><span>СТАРТ</span><b>😫 Накопленная усталость ${Math.round(game.fatigue)}%</b><span class="bad">+${fmt(fatiguePenaltySec)}</span></div>`);
 $('startBtn').disabled=true;$('pauseBtn').disabled=false;

 // Start the simulation loop first. A rendering error must never prevent
 // the race from actually starting.
 lastTs=performance.now();
 timer=requestAnimationFrame(tick);

 try{ updateRun(); }catch(e){ console.warn('initial updateRun error',e); }
 try{ renderRaceLeaders(0); }catch(e){ console.warn('initial leaders render error',e); }
 try{ drawTrack(0); }catch(e){ console.warn('initial track render error',e); }
}


function buildAidStations(distanceKm){
  const d=Math.max(0,Number(distanceKm||0));
  if(d<100) return [];
  const pts=[];
  let km=50+Math.random()*20; // first PP at 50–70 km
  while(km<d-20){
    pts.push(Math.round(km*10)/10);
    km+=50+Math.random()*20;  // next PP every 50–70 km
  }
  return pts;
}

function updateAidStationsAndWater(){
  if(!run || !run.running) return;
  const L=levelData();
  const dist=Math.max(1,Number(L[1]||run.raceDistance||1));
  if(dist<100) return;

  const playerKm=Math.max(0,Math.min(dist,Number(run.p||0)*dist));
  if(!Array.isArray(run.aidStations)) run.aidStations=buildAidStations(dist);
  if(!run.aidStationsPassed) run.aidStationsPassed=new Set();

  for(const ppKm of run.aidStations){
    const key=String(ppKm);
    if(playerKm+1e-9<ppKm || run.aidStationsPassed.has(key)) continue;

    run.aidStationsPassed.add(key);

    // Вода на гонку считается как общий лимит расхода. ПП больше не
    // добавляют воду сверх рассчитанной потребности — это устраняет
    // прежний перерасход на длинных гонках.
    const refill=0;
    run.waterSegmentStartKm=ppKm;
    run.waterSegmentStartAmount=Math.max(0,Number(run.waterRemaining||0));
    run.waterEmptyNotified=false;
    const msg=`ПП ${ppKm.toFixed(1)} км · контроль воды · общий лимит ${run.waterNeed||0} × 0,5 л`;
    showEvent({emoji:'🥤',name:'Пункт питания'},0,` · контроль воды · общий лимит ${run.waterNeed||0} × 0,5 л`);
    try{
      $('eventLog').insertAdjacentHTML(
        'afterbegin',
        `<div class="event-row"><span>${ppKm.toFixed(1)} км</span><b>🥤 Пункт питания · вода пополнена: ${refill} × 0,5 л</b><span class="bad">+1:00</span></div>`
      );
    }catch(e){}
  }
}

function notifyWaterEndedDuringRace(){
  try{
    if(!run || !run.running) return;
    const p=Number(run.p||0);
    if(p<=0) return;

    // Ignore transitional/undefined state: it must not create thirst.
    if(run.waterRemaining===undefined || run.waterRemaining===null) return;

    const waterNow=Math.max(0,Number(run.waterRemaining));
    if(waterNow>0){
      run.waterEmptyNotified=false;
      if(run.condition==='жажда') run.condition='нормально';
      return;
    }

    // If the runner started with water, only declare thirst after the
    // calculated section has actually consumed it.
    const startAmount=Math.max(0,Number(run.waterStart||0));
    const L=levelData();
    const dist=Math.max(1,Number(L[1]||1));
    const playerKm=Math.max(0,Math.min(dist,p*dist));
    const rate=Math.max(0,Number(run.waterNeed||0)/dist);
    const consumed=Math.floor(playerKm*rate + 1e-9);
    if(startAmount>0 && consumed<startAmount) return;

    if(run.waterEmptyNotified) return;
    run.waterEmptyNotified=true;
    run.condition='жажда';
    showEvent({emoji:'💧',name:'Вода закончилась'},0,' · дальше без воды');
    try{
      $('eventLog').insertAdjacentHTML(
        'afterbegin',
        `<div class="event-row"><span>${playerKm.toFixed(1)} км</span><b>💧 Вода закончилась</b><span class="bad">дальше без воды</span></div>`
      );
    }catch(e){}
  }catch(e){}
}

function tick(ts){
 if(!run||!run.running)return;

 // Schedule the next frame immediately. If a DNF/UI update throws later in this
 // frame, the race loop will still continue on the next frame instead of freezing.
 timer=requestAnimationFrame(tick);

 const L=levelData();
 // Визуальная скорость прохождения увеличена в 2 раза относительно предыдущей сборки; игровое финишное время не меняется.
 const dt=(ts-lastTs)/1000*Number($('speed').value||2);lastTs=ts;
 if(!run.paused && !run.eventPause){
   const total=Math.max(60,run.base+run.penalty);
   run.elapsed+=dt;
   run.p=Math.min(1,run.elapsed/total);
   fireEvents();
   updateLiveDnfs();
   updateRealisticPosition();

   // Gradually consume water within the current section (start → PP or PP → PP).
   const raceDist=Math.max(1,Number(L[1]||1));
   const playerKm=Math.max(0,Math.min(raceDist,Number(run.p||0)*raceDist));
   const rate=Math.max(0,Number(run.waterNeed||0)/raceDist);
   const usedTotal=Math.floor(playerKm*rate + 1e-9);
   run.waterRemaining=Math.max(0,Number(run.waterStart||0)-usedTotal);

   updateAidStationsAndWater();
   updateRun();
   notifyWaterEndedDuringRace();
   renderRaceLeaders((run.p||0)*Number((run&&run.raceDistance)||L[1]||5));
   drawTrack(run.p||0);
 }
 if(!run.dnf && run.weatherDnfPlanned && !run.weatherDnfTriggered && run.p>=run.weatherDnfAt){
    run.weatherDnfTriggered=true;
    run.dnf=true;
    if(run.weatherDnfReason==='heat'){
      run.condition='перегрев';
      showEvent({emoji:'🥵',name:'Перегрев'},0,' · жара → DNF');
      setTimeout(()=>finishRace(true,'heat'),900);
    }else{
      run.condition='плохая погода';
      showEvent({emoji:'🌪️',name:'Экстремальная погода'},0,' · условия → DNF');
      setTimeout(()=>finishRace(true,'weather'),900);
    }
    return;
  }
  if(run.dnf){
    cancelAnimationFrame(timer);
    return;
  }
  if(run.p>=1){
    cancelAnimationFrame(timer);
    finishRace(false);
  }
}
function fireEvents(){
 run.events.forEach((ev,i)=>{
  if(run.p>=ev.p&&!run.fired.has(i)){
   run.fired.add(i);
   let sec=ev.sec,extra='';

   // Gel «УГЛИ»: событие возможно в пуле, но бонус работает только при наличии геля.
   if(ev.cat==='ugli'){
     ensureResources();
     if(Number(game.resources.gels||0)>0){
       useResource('gels');
       // Небольшая вариативность эффекта: примерно 1–3 минуты выигрыша.
       const bonuses=[60,90,120,180];
       sec=-bonuses[Math.floor(Math.random()*bonuses.length)];
       extra=' · израсходован 1 гель «УГЛИ»';
       saveGame();
     }else{
       // Нет геля — событие «УГЛИ сработал» не показываем вообще.
       return;
     }
   // Medical events.
   }else if(ev.cat==='medkit'){
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
     if(run.blisterCount==null) run.blisterCount=0;
     if(game.resources.cream>0){
       useResource('cream');sec=0;run.blisterCount=0;extra=' · крем помог';
     }else if(game.resources.plaster>0){
       useResource('plaster');sec=Math.round(sec*.4);run.blisterCount=0;extra=' · крем закончился, пластырь помог частично';
     }else if(Number(run.medkitsRemaining||0)>0){
       run.medkitsRemaining=Math.max(0,Number(run.medkitsRemaining)-1);
       sec=Math.round(sec*.25);run.blisterCount=0;extra=' · расходники закончились, использован полный комплект аптечки';
     }else{
       run.blisterCount+=1;
       const escalation=Math.min(5,run.blisterCount);
       sec+=360+(escalation-1)*240;
       run.condition=escalation>=2?'сильное натирание':'натирание';
       extra=` · аптечка и ингредиенты закончились · повторное натирание №${run.blisterCount} → последствие сильнее (+${360+(escalation-1)*240} сек)`;
     }
     saveGame();
   }else if(ev.cat==='injury'){
     const medLevel=Math.max(1,Number(game.gear?.medkit||0)+1);
     const medItem=item('medkit');
     const medDur=durability('medkit');
     const medWorking=medDur>0;
     const coachInjuryReduction=coachRaceBonuses().injury;
     const kitsAvailable=Math.max(0,Number(run.medkitsRemaining||0));
     if(kitsAvailable>0) run.medkitsRemaining=Math.max(0,kitsAvailable-1);

     // Higher-level medkits reduce both the chance of a severe injury and its time cost.
     // Level 1 gives almost no protection; level 7 is substantially safer, but never invulnerable.
     const injuryProtection=medWorking ? Math.min(.72,(medLevel-1)*.11 + (medItem?.[4]||0)*.8) : 0;
     const severeRisk=Math.max(.01,run.fractureRisk*(1-injuryProtection)*(1-coachInjuryReduction));
     const fracture=Math.random()<severeRisk;

     if(fracture){
       run.dnf=true;
       run.condition='перелом ноги';
       game.hospitalUntil=0;
       saveGame();
       showEvent({emoji:'🦴',name:'Перелом ноги'},0,` · аптечка ур. ${medLevel}/7 не спасла → DNF · нужна больница`);
       setTimeout(()=>finishRace(true,'fracture'),1200);
       return;
     }

     // Ordinary injury: medkit level reduces lost time.
     const baseSec=sec;
     if(medWorking){
       sec=Math.max(20,Math.round(sec*(1-injuryProtection*.78)));
       extra=` · аптечка ур. ${medLevel}/7 уменьшила последствия`;
     }else{
       sec+=180;
       extra=' · аптечка сломана';
     }

     // Готовый комплект расходует заранее собранную аптечку целиком.
     // Если комплекты закончились, последствия повторных травм/натираний тяжелее.
     if(kitsAvailable>0){
       sec=Math.max(8,Math.round(sec*.62));
       extra+=' · использован готовый комплект аптечки';
     }else if(game.resources.gauze>0 && game.resources.bandage>0){
       useResource('gauze');useResource('bandage');
       sec=Math.max(10,Math.round(sec*.55));
       extra+=' · марля + бинт';
       saveGame();
     }else if(game.resources.plaster>0){
       useResource('plaster');
       sec=Math.max(15,Math.round(sec*.78));
       extra+=' · пластырь';
       saveGame();
     }else{
       extra+=' · без расходников';
     }

     run.condition=sec>=180?'травма':'нормально';
   }else if(ev.cat==='gearFind'){
     const cat=ev.foundCat,found=Number(ev.foundLevel||0);
     if(cat && found>Number(game.gear?.[cat]||0)){
       if(!game.gearOwned)game.gearOwned={};
       if(!Array.isArray(game.gearOwned[cat]))game.gearOwned[cat]=[];
       if(!game.gearOwned[cat].includes(found))game.gearOwned[cat].push(found);
       if(game.durability[cat+'_'+found]==null)game.durability[cat+'_'+found]=GEAR[cat][found][3];
       const oldLevel=Number(game.gear[cat]||0);
       game.gear[cat]=found;
       saveGame();
       sec=-90;
       extra=` · найдено бесплатно · ${CATEGORY_NAMES[cat]} ${found+1}/7 надета вместо ур. ${oldLevel+1}`;
       showEvent(ev,sec,extra);
       if(!game.achievements)game.achievements={};
       game.achievements['found_'+cat+'_'+found]={name:`Охотник за ${CATEGORY_NAMES[cat]}`,date:Date.now()};
       saveGame();
       return;
     }
   }else if(ev.cat){
     const currentMembraneReq=membraneRequiredLevel(levelData(),weatherForLevel());
     if(ev.cat==='jacket' && currentMembraneReq>0 &&
        (weatherForLevel().rain||weatherForLevel().cold) &&
        !hasMembrane(currentMembraneReq)){
       if(Number(game.resources.rescueBlanket||0)>0){
         useResource('rescueBlanket');
         sec=Math.round(sec*.35);
         extra=' · спасательное одеяло использовано, переохлаждение предотвращено';
       }else{
         run.dnf=true;run.condition='переохлаждение';
         showEvent({emoji:'🥶',name:'Переохлаждение'},0,` · нужна мембранка ур. ${membraneRequiredLevel(levelData(),weatherForLevel())}/7+ и нет спасательного одеяла → DNF`);
         setTimeout(()=>finishRace(true,'freeze'),1200);
         return;
       }
     }
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
       // Полная поломка = предмет исчезает из инвентаря, его надо покупать заново.
       const brokenLevel=Number(game.gear?.[ev.cat]||0);
       if(brokenLevel>0 && Math.random()<0.72){
         if(Array.isArray(game.gearOwned?.[ev.cat])){
           game.gearOwned[ev.cat]=game.gearOwned[ev.cat].filter(x=>Number(x)!==brokenLevel);
         }
         game.gear[ev.cat]=0;
         extra+=` · ${CATEGORY_NAMES[ev.cat]} уничтожена полностью — нужна новая`;
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
 // Пока плашка события видна, игровое время и движение по трассе стоят.
 // Пользовательская пауза при этом остаётся независимой.
 if(run && run.running) run.eventPause=true;
 setTimeout(()=>{
   ov.classList.remove('show');
   if(run){ run.eventPause=false; lastTs=performance.now(); }
 },2000);
 const cls=sec<0?'good':sec>0?'bad':'neutral';
 $('eventLog').insertAdjacentHTML('afterbegin',`<div class="event-row"><span>${(run.p*levelData()[1]).toFixed(1)} км</span><b>${ev.emoji} ${ev.name}${extra}</b><span class="${cls}">${sec>=0?'+':'−'}${fmt(Math.abs(sec))}</span></div>`);
}

function terrainStateForProgress(L,p){
  p=Math.max(0,Math.min(1,Number(p||0)));
  const distKm=Math.max(1,Number(L[1]||1));
  const totalGain=Math.max(0,Number(L[2]||0));
  const difficulty=Math.max(1,Number(L[5]||1));
  const avgClimbPct=totalGain/(distKm*1000)*100;

  // Deterministic changing profile for each race: uphill/downhill/rolling sections.
  const phase=distKm*.071 + difficulty*.63;
  const wave=
    Math.sin(p*Math.PI*(7+difficulty)+phase)*.72 +
    Math.sin(p*Math.PI*19+phase*.47)*.28;

  // Bigger total climbing and harder races produce steeper local grades.
  const amplitude=Math.min(20,Math.max(4.5,avgClimbPct*2.35+difficulty*1.15));
  let slope=wave*amplitude;

  // Avoid unrealistic cliffs while still allowing steep trail sections.
  slope=Math.max(-18,Math.min(24,slope));

  const gainDone=Math.round(totalGain*p);
  let slopeType='ровно';
  if(slope>=12) slopeType='крутой подъём';
  else if(slope>=5) slopeType='подъём';
  else if(slope>=2) slopeType='лёгкий подъём';
  else if(slope<=-12) slopeType='крутой спуск';
  else if(slope<=-5) slopeType='спуск';
  else if(slope<=-2) slopeType='лёгкий спуск';

  return {slope,gainDone,totalGain,slopeType};
}

function updateRun(){
 try{
   if(run && run.running){
     // Вода расходуется по фактическому прогрессу, а не потому, что
     // стартовый инвентарь уже обнулён при переносе в race-state.
     notifyWaterEndedDuringRace();
   }
 }catch(e){}

  try{ dynamicLeaderGroupExchange(typeof run!=='undefined'?run:(typeof game!=='undefined'?game.run:null)); }catch(e){}

 const L=levelData(),km=run.p*L[1],total=Math.max(1,run.base+run.penalty);
 $('progressKm').textContent=`${km.toFixed(1)} / ${L[1].toFixed(1)} км`;
 $('clock').textContent=fmt(run.elapsed);
 $('progressBar').style.width=(run.p*100)+'%';
 // Live climb and gradient.
 const terrain=terrainStateForProgress(L,run.p||0);
 if($('liveGain')){
   $('liveGain').textContent=`${terrain.gainDone.toLocaleString('ru-RU')} м`;
   $('liveGainTotal').textContent=`из ${terrain.totalGain.toLocaleString('ru-RU')} м`;
 }
 if($('liveSlope')){
   const sign=terrain.slope>0?'+':'';
   $('liveSlope').textContent=`${sign}${terrain.slope.toFixed(1)}%`;
   $('liveSlopeType').textContent=terrain.slopeType;
 }

 // Current pace is directly affected by the current gradient.
 const avgPaceSec=total/Math.max(.1,L[1]);
 const progress=Math.max(0,Math.min(1,Number(run.p||0)));
 const slope=terrain.slope;

 let slopeFactor=1;
 if(slope>=0){
   // Uphill: coach reduces the climbing penalty.
   const climbReduction=coachRaceBonuses().climb;
   slopeFactor += Math.min(.58,slope*.027)*(1-climbReduction);
 }else{
   const down=Math.abs(slope);
   // Moderate descents are faster; very steep descents become technical and slow again.
   if(down<=8) slopeFactor -= down*.018;
   else slopeFactor -= .144 - (down-8)*.012;
 }

 // Ultra fatigue gradually slows pace later in the race.
 const distanceFatigue=Math.max(0,Number(L[1]||0)-30)/270;
 const lateRace=Math.pow(progress,1.7);
 const fatigueFactor=1 + lateRace*(.04 + .14*Math.min(1,distanceFatigue));

 // Small natural variation so identical slopes do not look mechanically fixed.
 const strideFactor=1 + Math.sin(progress*Math.PI*53)*.012;

 let livePaceSec=avgPaceSec*slopeFactor*fatigueFactor*strideFactor;

 if(run.condition==='сильная усталость') livePaceSec*=1+(0.08*(1-coachRaceBonuses().fatigue));
 else if(run.condition==='травма') livePaceSec*=1.12;
 else if(run.condition==='проблема с экипировкой') livePaceSec*=1.06;

 livePaceSec=Math.max(avgPaceSec*.72,Math.min(avgPaceSec*1.75,livePaceSec));
 run.livePaceSec=livePaceSec;
 run.liveSlope=terrain.slope;
 run.liveGain=terrain.gainDone;
 $('pace').textContent=fmt(livePaceSec).replace(':',' : ')+' /км';

 // Realistic live position from virtual competitors.
 let estimatedPos=updateRealisticPosition() || Math.max(1,run.currentPosition||run.position||1);

 // Calculate leader progress using the candidate place itself, so the UI cannot say
 // "1st place" while one or more TOP-3 athletes are already shown as finished ahead.
 const leaderKms=[1,2,3].map(rank=>leaderKmForPosition(rank,L,km,estimatedPos));
 if(km<L[1]-0.001){
   const leadersFinished=leaderKms.filter(v=>v>=L[1]-0.001).length;
   estimatedPos=Math.max(estimatedPos,leadersFinished+1);
 }

 if(km < L[1]-0.001) run.lastPositionBeforeFinish=estimatedPos;
 run.currentPosition=estimatedPos;
 $('position').textContent=estimatedPos;
 $('penalties').textContent=(run.penalty>=0?'+':'−')+fmt(Math.abs(run.penalty));
 $('condition').textContent=run.condition;
 renderRaceLeaders(km);
 drawTrack(run.p);
}
function finishRace(forceDnf=false,dnfReason='fracture'){
 if(!run||!run.running)return;
 cancelAnimationFrame(timer);$('pauseBtn').disabled=true;$('startBtn').disabled=false;
 const L=levelData();
 // Keep the finished race visible while the result overlay is shown.
 // run.running remains true temporarily so TOP-14 can still include the player.
 run.finishHold=true;
 run.p=1;
 drawTrack(1);
 renderRaceLeaders(Number(L[1]||0)); updateRestUi();

 if(forceDnf || run.dnf){
   run.running=false; run.finishHold=false;
   // DNF never gives race money.
   game.fatigue=Math.min(100,game.fatigue+18+L[5]*3);
   game.lastFinishAt=Date.now();
   saveGame();
   const ov=$('finishOverlay');
   const coach=COACHES[game.coach]||COACHES[0];
   let dnfCoachAdvice='';
   if(game.coach===0){
     dnfCoachAdvice='<br><br>💡 Рекомендация: нанять тренера перед следующей попыткой.';
   }else if(coach.maxDifficulty<L[5]){
     const stronger=COACHES.findIndex((x,i)=>i>game.coach && x.maxDifficulty>=L[5]);
     if(stronger>=0) dnfCoachAdvice=`<br><br>💡 Рекомендация: сменить тренера на «${COACHES[stronger].name}» — текущий уровень подготовки ниже сложности гонки.`;
   }
   const totalDnfs=Math.min(run.fieldSize,actualDnfCount()+(run.dnf?0:1));
   const dnfStats=`<br><br>🚫 Сошло с дистанции: ${totalDnfs} из ${run.fieldSize}.`;
   if(dnfReason==='freeze'){
     ov.innerHTML=`<div class="overlay-box"><div class="emoji">🥶</div><b>DNF · переохлаждение</b><span>Вы замёрзли до финиша.<br><br>💰 За DNF награда: ₽ 0.${dnfStats}${dnfCoachAdvice}</span></div>`;
   }else if(dnfReason==='heat'){
     ov.innerHTML=`<div class="overlay-box"><div class="emoji">🥵</div><b>DNF · перегрев</b><span>Жара и нагрузка привели к сходу с дистанции.<br><br>💰 За DNF награда: ₽ 0.${dnfStats}${dnfCoachAdvice}</span></div>`;
   }else if(dnfReason==='weather'){
     ov.innerHTML=`<div class="overlay-box"><div class="emoji">🌪️</div><b>DNF · плохая погода</b><span>Тяжёлые погодные условия привели к сходу.<br><br>💰 За DNF награда: ₽ 0.${dnfStats}${dnfCoachAdvice}</span></div>`;
   }else{
     ov.innerHTML=`<div class="overlay-box"><div class="emoji">🦴</div><b>DNF · перелом ноги</b><span>Слишком высокая нагрузка и мало отдыха. Отдохните 1 минуту перед новой попыткой.<br><br>💰 За DNF награда: ₽ 0.${dnfStats}${dnfCoachAdvice}</span></div>`;
   }
   ov.classList.add('show');
   setTimeout(()=>{ov.classList.remove('show');render();switchTab('resources')},5000);
   return;
 }

 // durability after race
 let breaks=[];
 Object.keys(GEAR).forEach(cat=>{
  const before=durability(cat),loss=wearFor(cat,L),after=Math.max(0,before-loss);setDur(cat,after);
  if(before>0&&after<=0){
    breaks.push(CATEGORY_NAMES[cat]);
    if(Number(game.gear?.[cat]||0)>0 && Math.random()<0.68){
      const destroyed=Number(game.gear[cat]);
      if(Array.isArray(game.gearOwned?.[cat])) game.gearOwned[cat]=game.gearOwned[cat].filter(x=>Number(x)!==destroyed);
      game.gear[cat]=0;
      breaks[breaks.length-1]+=' (уничтожена, купить заново)';
    }
  }
 });
 saveGame();

 updateRealisticPosition();
 const final=Math.max(1,run.base+run.penalty);
 const ratio=L[3]/final;

 // Финальная позиция должна продолжать живую позицию на трассе.
 // Раньше здесь место пересчитывалось заново со случайностью, поэтому, например,
 // 23-е место на 50.0 км могло внезапно превратиться в 1-е в окне финиша.
 let pos=Math.max(1,Math.min(run.fieldSize||50,Math.round(Number(run.currentPosition||run.position||1))));
 run.currentPosition=pos;
 if($('position')) $('position').textContent=pos;

 // On victory, hold the player as #1 in the visible TOP-14 until the result closes.
 if(pos===1){
   run.finishWinnerHold=true;
   run.p=1;
   if($('position')) $('position').textContent='1';
   drawTrack(1);
   renderRaceLeaders(Number(L[1]||0));
 }

 const quality=Math.max(.45,Math.min(1.55,ratio));
 let reward=Math.round(L[4]*Math.max(.35,Math.min(1.55,.55+quality*.55))*(pos===1?1.35:pos<=3?1.18:1));
 const xp=Math.round(35+L[5]*18+L[1]/8+(pos===1?45:pos<=3?25:0));

 game.money+=reward;addXp(xp);game.rep+=pos===1?8:pos<=3?5:pos<=10?2:1;
 if(pos===1) game.wins=(game.wins||0)+1;
 ensureTraining();
 const coach=COACHES[game.coach]||COACHES[0];
 const finishBase=1.0 + L[5]*0.35 + Math.min(2.0,L[1]/180);
 const placeBonus=pos===1?1.001:pos<=3?0.7:pos<=10?0.3:0;
 const fitnessGain=Math.max(0.4,(finishBase+placeBonus)*coach.mult*(1-game.fitness/140));
 game.fitness=Math.min(Number(coach.fitnessCap||100),game.fitness+fitnessGain);
 const itraGain=Math.max(1,Math.round((ratio-.72)*22 + L[5]*1.4 + (pos===1?7:pos<=3?4:0)));
 game.itra=Math.min(950,Math.max(200,game.itra+itraGain));
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

 const newRareAchievement=tryAwardLevelAchievement(game.current-(firstClear?1:0));
 const champ=game.completed>=20;
 const ov=$('finishOverlay');

 let coachAdvice='';
 const currentCoach=COACHES[game.coach]||COACHES[0];
 const poorRun=(pos>10 || final>L[3]*1.12 || ratio<0.90);

 if(poorRun){
   if(game.coach===0){
     coachAdvice='<br><br>💡 Рекомендация: нанять тренера — он ускорит рост тренированности и подготовку к более сложным гонкам.';
   }else if(currentCoach.maxDifficulty<L[5]){
     const stronger=COACHES.findIndex((x,i)=>i>game.coach && x.maxDifficulty>=L[5]);
     coachAdvice=stronger>=0
       ? `<br><br>💡 Рекомендация: текущий тренер рассчитан до ${'★'.repeat(currentCoach.maxDifficulty)}. Для этой гонки лучше сменить на «${COACHES[stronger].name}».`
       : '<br><br>💡 Рекомендация: нужен более сильный тренер для этой сложности.';
   }else{
     coachAdvice='<br><br>💡 Рекомендация: продолжить тренировки — уровень тренера подходит, но тренированность ещё можно повысить.';
   }
 }

 const totalDnfs=actualDnfCount();
 ov.innerHTML=`<div class="overlay-box"><div class="emoji">${champ?'👑🏆':'🏁'}</div><b>${champ?'ТЫ ЧЕМПИОН АРМАГЕДДОНА!':`Финиш · ${pos} место`}</b><span>Время ${fmt(final)} · заработано ${fmtMoney(reward)} · +${xp} XP<br>🚫 Сошло с дистанции: ${totalDnfs} из ${run.fieldSize}<br>Тренированность: ${Math.round(game.fitness)}/100<br>Усталость: ${Math.round(game.fatigue)}%${breaks.length?`<br>Сломалось: ${breaks.join(', ')}`:''}${newRareAchievement?'<br>🏆 Получена редкая ачивка уровня!':''}${coachAdvice}</span></div>`;
 ov.classList.add('show');
 setTimeout(()=>{
   ov.classList.remove('show');
   if(run){
     run.running=false;
     run.finishHold=false;
     run.finishWinnerHold=false;
     run.p=0;
   }
   render();
 }, pos===1 ? (champ?9500:7000) : (champ?7000:4200));
}
$('startBtn').onclick=()=>{
  try{
    startRace();
  }catch(e){
    console.error('Race start error',e);
    showStartRequirementsError(
      'Ошибка запуска гонки',
      [String(e?.message||e||'Неизвестная ошибка')]
    );
  }
};
$('pauseBtn').onclick=()=>{if(!run)return;run.paused=!run.paused;$('pauseBtn').textContent=run.paused?'▶ Продолжить':'Ⅱ Пауза';lastTs=performance.now()};
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
function drawOpponent(ctx,x,y,scale=1,color='#60a5fa',rank=0){
 ctx.save();
 ctx.translate(x,y);
 ctx.scale(scale,scale);
 ctx.lineCap='round';
 ctx.lineJoin='round';

 // Ground shadow.
 ctx.fillStyle='rgba(0,0,0,.28)';
 ctx.beginPath();
 ctx.ellipse(5,17,12,3,0,0,Math.PI*2);
 ctx.fill();

 // Legs with clear running pose.
 ctx.strokeStyle='#dbeafe';
 ctx.lineWidth=4.2;
 ctx.beginPath();
 ctx.moveTo(4,2); ctx.lineTo(-3,10); ctx.lineTo(-9,16);
 ctx.moveTo(5,2); ctx.lineTo(12,9); ctx.lineTo(17,14);
 ctx.stroke();

 // Shorts.
 ctx.fillStyle='#0f172a';
 ctx.beginPath();
 ctx.roundRect(-1,-1,12,8,3);
 ctx.fill();

 // Torso / running shirt.
 ctx.fillStyle=color;
 ctx.beginPath();
 ctx.moveTo(-1,-16);
 ctx.quadraticCurveTo(5,-20,11,-15);
 ctx.lineTo(10,1);
 ctx.quadraticCurveTo(5,4,0,1);
 ctx.closePath();
 ctx.fill();

 // Arms in running motion.
 ctx.strokeStyle='#f1c7a5';
 ctx.lineWidth=3.6;
 ctx.beginPath();
 ctx.moveTo(0,-12); ctx.lineTo(-7,-6); ctx.lineTo(-3,-1);
 ctx.moveTo(10,-12); ctx.lineTo(16,-7); ctx.lineTo(13,-2);
 ctx.stroke();

 // Neck.
 ctx.strokeStyle='#f1c7a5';
 ctx.lineWidth=3.4;
 ctx.beginPath();
 ctx.moveTo(5,-17); ctx.lineTo(5,-21);
 ctx.stroke();

 // Head.
 ctx.fillStyle='#f1c7a5';
 ctx.beginPath();
 ctx.arc(5,-27,7,0,Math.PI*2);
 ctx.fill();

 // Hair/cap.
 ctx.fillStyle=rank>0 ? '#111827' : '#1e293b';
 ctx.beginPath();
 ctx.arc(5,-29,7,Math.PI,Math.PI*2);
 ctx.lineTo(12,-27);
 ctx.lineTo(-2,-27);
 ctx.closePath();
 ctx.fill();

 // Tiny backpack on group runners for a more trail-like silhouette.
 if(rank===0){
   ctx.fillStyle='rgba(15,23,42,.95)';
   ctx.beginPath();
   ctx.roundRect(-5,-15,6,14,3);
   ctx.fill();
 }

 // Leader rank badge.
 if(rank>0){
   const badgeColor=rank===1?'#fbbf24':rank===2?'#cbd5e1':'#d97706';
   ctx.fillStyle=badgeColor;
   ctx.beginPath();
   ctx.arc(19,-31,8.5,0,Math.PI*2);
   ctx.fill();
   ctx.fillStyle='#07111f';
   ctx.font='bold 10px sans-serif';
   ctx.textAlign='center';
   ctx.textBaseline='middle';
   ctx.fillText(String(rank),19,-31);
 }

 ctx.restore();
}
function drawTrack(p){
 const c=$('trackCanvas'),ctx=c.getContext('2d'),W=c.width,H=c.height,L=levelData();
 ctx.clearRect(0,0,W,H);
 const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#153554');sky.addColorStop(.62,'#8b5a24');sky.addColorStop(1,'#503a2d');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);

 ctx.fillStyle='#0c2130';ctx.beginPath();ctx.moveTo(0,H*.72);
 for(let i=0;i<=8;i++)ctx.lineTo(i*W/8,H*(.58+(i%2)*.08));ctx.lineTo(W,H);ctx.lineTo(0,H);ctx.fill();

 const base=H*.55,amp=Math.min(H*.28,60+L[5]*25);
 ctx.beginPath();
 for(let i=0;i<=100;i++){
  const xx=i/100*W;
  const yy=base-Math.sin(i/100*Math.PI*(2+L[5]))*amp*.45-Math.sin(i/100*Math.PI*6)*amp*.18;
  i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy);
 }
 ctx.strokeStyle='#22c55e';ctx.lineWidth=8;ctx.stroke();

 const pos=run?.currentPosition||run?.position||18;
 const playerKm=p*L[1];
 const x=65+p*(W-160),ground=H*.82;

 // Calculate TOP-3 first. Every object on the map uses the same km -> x scale.
 const leaderKms=[1,2,3].map(rank=>leaderKmFor(rank,L,playerKm));
 const leaderColors=['#fbbf24','#cbd5e1','#d97706'];
 const leaderXs=leaderKms.map(km=>65+(km/L[1])*(W-160));

 // Пункты питания на длинных дистанциях: показываем прямо на схеме трассы.
 if(run && Number(L[1]||0)>=100 && Array.isArray(run.aidStations)){
   const passed=run.aidStationsPassed instanceof Set ? run.aidStationsPassed : new Set();
   run.aidStations.forEach((ppKm,idx)=>{
     const ppX=65+(Number(ppKm)/Number(L[1]))*(W-160);
     const ppY=H*.61 + (idx%2)*34;
     const isPassed=passed.has(String(ppKm));

     // Вертикальный ориентир до линии трассы.
     ctx.save();
     ctx.setLineDash([5,5]);
     ctx.strokeStyle=isPassed?'rgba(74,222,128,.45)':'rgba(255,255,255,.42)';
     ctx.lineWidth=2;
     ctx.beginPath();
     ctx.moveTo(ppX,ppY+28);
     ctx.lineTo(ppX,H*.72);
     ctx.stroke();
     ctx.restore();

     // Компактная плашка ПП.
     const pw=104,ph=42;
     const bx=Math.max(5,Math.min(W-pw-5,ppX-pw/2));
     const by=ppY-22;
     ctx.fillStyle=isPassed?'rgba(6,55,35,.94)':'rgba(8,26,42,.95)';
     ctx.beginPath();ctx.roundRect(bx,by,pw,ph,10);ctx.fill();
     ctx.strokeStyle=isPassed?'rgba(74,222,128,.8)':'rgba(56,189,248,.72)';
     ctx.lineWidth=2;ctx.stroke();

     ctx.textAlign='center';
     ctx.fillStyle=isPassed?'#86efac':'#e0f2fe';
     ctx.font='bold 14px sans-serif';
     ctx.fillText(isPassed?'✓ ПП':'🥤 ПП',bx+pw/2,by+17);
     ctx.font='12px sans-serif';
     ctx.fillText(`${Number(ppKm).toFixed(0)} км`,bx+pw/2,by+34);
   });
 }

 // Main pack stays visible for the whole race. Previously it was tied to
 // pos>6, so it disappeared/reappeared whenever the player crossed 6th place.
 // Keep drawing it while a race state exists; its km is still recalculated live.
 if(run){
   // Main pack is kept behind the player so it does not cover the player icon.
   // Its gap varies slightly with current position, but it never jumps ahead.
   const behindGapKm=Math.max(L[1]*.006, Math.min(L[1]*.025, 0.18 + Math.max(0,pos-6)*L[1]*.00035));
   let groupKm=Math.max(0, playerKm-behindGapKm);

   const gx=65+(groupKm/L[1])*(W-160);
   const gy=ground-18;
   const packColors=['#60a5fa','#34d399','#f59e0b','#a78bfa','#fb7185','#22d3ee'];
   const packOffsets=[[0,0],[34,-4],[68,1],[16,32],[50,29],[84,34]];

   for(let i=0;i<6;i++){
     drawOpponent(ctx,gx+packOffsets[i][0],gy+packOffsets[i][1],.82,packColors[i],0);
   }

   const pw=145,ph=50;
   const px=Math.max(8,Math.min(W-pw-8,gx-10));
   const py=gy-86,r=12;
   ctx.fillStyle='rgba(5,15,28,.93)';
   ctx.beginPath();ctx.roundRect(px,py,pw,ph,r);ctx.fill();
   ctx.strokeStyle='rgba(96,165,250,.55)';ctx.lineWidth=2;ctx.stroke();
   ctx.fillStyle='#dbeafe';ctx.font='bold 16px sans-serif';ctx.textAlign='left';
   ctx.fillText('👥 ГРУППА',px+13,py+20);
   ctx.fillStyle='#93c5fd';ctx.font='13px sans-serif';
   ctx.fillText(`места 6–${Math.max(10,pos-1)}`,px+13,py+40);
 }

 // TOP-3 icons follow actual virtual kilometres.
 // Keep leaders visible for the whole race, even when the player is 1st.
 if(run){
   const ly=ground-70;
   for(let i=0;i<3;i++){
     drawOpponent(ctx,leaderXs[i],ly+i* Number((run&&run.raceDistance)||L[1]||5),.96,leaderColors[i],i+1);
   }

   const leadKm=leaderKms[0];
   const lw=164,lh=52;
   const lxBox=Math.max(8,Math.min(W-lw-8,leaderXs[0]-14));
   const lyBox=ly-92,r=12;
   ctx.fillStyle='rgba(22,15,5,.95)';
   ctx.beginPath();ctx.roundRect(lxBox,lyBox,lw,lh,r);ctx.fill();
   ctx.strokeStyle='rgba(251,191,36,.7)';ctx.lineWidth=2;ctx.stroke();
   ctx.fillStyle='#fde68a';ctx.font='bold 15px sans-serif';ctx.textAlign='left';
   ctx.fillText('🏆 ЛИДЕРЫ 1–3',lxBox+12,lyBox+20);
   ctx.fillStyle='#fef3c7';ctx.font='13px sans-serif';
   ctx.fillText(`${leadKm.toFixed(1)} км`,lxBox+12,lyBox+41);
 }

 drawRunnerFacingForward(ctx,x,ground,1.15);
 ctx.fillStyle='#fff';ctx.font='22px sans-serif';
 ctx.fillText(`${playerKm.toFixed(1)} км`,Math.max(10,x-35),ground+48);
}


function quickBuyWater(){
 if(purchasesLockedDuringRace()){ showGameError('Во время гонки покупки недоступны'); return; }
 const L=levelData();
 const weather=weatherForLevel();
 const need=waterBottlesNeeded(L,weather);
 const missing=Math.max(0,need-Number(game.resources.waterBottles||0));
 if(missing<=0){ showGameError('Воды уже достаточно для этой гонки'); return; }
 const cost=missing*RESOURCE_CATALOG.waterBottles.price;
 if(game.money<cost){ showGameError(`Не хватает рублей: нужно ${fmtMoney(cost)}`); return; }
 game.money-=cost;
 game.resources.waterBottles=Number(game.resources.waterBottles||0)+missing;
 const req=$('startRequirementsError');
 if(req && /Перед стартом обратите внимание|Риски перед стартом|воды|гелей/i.test(req.textContent||'')){
   req.innerHTML=''; req.style.display='none';
 }
 saveGame(); render();
}

function quickBuyGels(){
 if(purchasesLockedDuringRace()){ showGameError('Во время гонки покупки недоступны'); return; }
 const need=gelsNeeded(levelData());
 const missing=Math.max(0,need-Number(game.resources.gels||0));
 if(missing<=0){ showGameError('Гелей уже достаточно для этой гонки'); return; }
 const cost=missing*RESOURCE_CATALOG.gels.price;
 if(game.money<cost){ showGameError(`Не хватает рублей: нужно ${fmtMoney(cost)}`); return; }
 game.money-=cost;
 game.resources.gels=Number(game.resources.gels||0)+missing;
 const req=$('startRequirementsError');
 if(req && /Перед стартом обратите внимание|Риски перед стартом|воды|гелей/i.test(req.textContent||'')){
   req.innerHTML=''; req.style.display='none';
 }
 saveGame(); render();
}


function quickBuyLampPower(){
 if(purchasesLockedDuringRace()){ showGameError('Во время гонки покупки недоступны'); return; }
 const L=levelData();
 const lampHours=lampHoursNeeded(L);
 if(isRechargeableLamp()){
   const requiredCharge=Math.min(100,Math.ceil(lampHours/8*100));
   if(lampHours<=0 || game.lampCharge>=requiredCharge || Number(game.resources.powerbank||0)>0){
     showGameError('Питания фонаря уже достаточно для этой гонки'); return;
   }
   const cost=RESOURCE_CATALOG.powerbank.price;
   if(game.money<cost){ showGameError(`Не хватает рублей: нужно ${fmtMoney(cost)}`); return; }
   game.money-=cost; game.resources.powerbank=Number(game.resources.powerbank||0)+1;
 }else{
   const need=Math.ceil(lampHours/5);
   const missing=Math.max(0,need-Number(game.resources.batteries||0));
   if(missing<=0){ showGameError('Батареек уже достаточно для этой гонки'); return; }
   const cost=missing*RESOURCE_CATALOG.batteries.price;
   if(game.money<cost){ showGameError(`Не хватает рублей: нужно ${fmtMoney(cost)}`); return; }
   game.money-=cost; game.resources.batteries=Number(game.resources.batteries||0)+missing;
 }
 saveGame(); render();
}

function quickBuyMedkit(){
 if(purchasesLockedDuringRace()){ showGameError('Во время гонки покупки недоступны'); return; }
 const keys=['bandage','gauze','peroxide','plaster','cream','rescueBlanket'];
 const missing=keys.filter(k=>Number(game.resources[k]||0)<=0);
 if(!missing.length){ showGameError('Аптечка уже укомплектована 5/5'); return; }
 const cost=missing.reduce((sum,k)=>sum+RESOURCE_CATALOG[k].price,0);
 if(game.money<cost){ showGameError(`Не хватает рублей: нужно ${fmtMoney(cost)}`); return; }
 game.money-=cost;
 missing.forEach(k=>game.resources[k]=Number(game.resources[k]||0)+1);
 saveGame(); render();
}

function bindQuickBuyCard(id,fn){
 const el=$(id); if(!el || el.dataset.quickBuyBound==='1') return;
 el.dataset.quickBuyBound='1';
 el.addEventListener('click',fn);
 el.addEventListener('keydown',e=>{
   if(e.key==='Enter'||e.key===' '){ e.preventDefault(); fn(); }
 });
}
bindQuickBuyCard('quickBuyWater',quickBuyWater);
bindQuickBuyCard('quickBuyLampPower',quickBuyLampPower);
bindQuickBuyCard('quickBuyGels',quickBuyGels);
bindQuickBuyCard('quickBuyMedkit',quickBuyMedkit);

render();
setAuthMode('login');
loadSession();

(function(){
  function openHelp(){
    const m=document.getElementById('helpModal');
    if(m){ m.classList.add('open'); m.setAttribute('aria-hidden','false'); }
  }
  function closeHelp(){
    const m=document.getElementById('helpModal');
    if(m){ m.classList.remove('open'); m.setAttribute('aria-hidden','true'); }
  }
  document.addEventListener('click',function(e){
    if(e.target.closest('#helpBtn') || e.target.closest('#topHelpBtn') || e.target.closest('#navHelpBtn')) openHelp();
    if(e.target.closest('#helpClose') || e.target.closest('#helpOk')) closeHelp();
    if(e.target && e.target.id==='helpModal') closeHelp();
  });
})();

document.addEventListener('click', function(e){
  const b=e.target.closest('button');
  if(!b) return;
  const txt=(b.textContent||'').trim().toLowerCase();
  if((txt==='купить' || txt.includes('купить тренера')) && purchasesLockedDuringRace()){
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}, true);

setInterval(()=>{updateRestUi();},1000);


function showPlayerInsideTop3(){
 if(!run) return;

 const standings=currentRaceStandings();
 if(!Array.isArray(standings) || !standings.length) return;

 const playerIndex=standings.findIndex(r=>r && r.player);
 const rank=playerIndex>=0 ? playerIndex+1 : 0;
 if(rank<1 || rank>7) return;

 const name=safeProfileNameForRace();
 const box=document.getElementById('raceLeaders')||document.querySelector('.race-leaders');
 if(!box) return;

 const rows=[...box.querySelectorAll('.leader-row,.leaderboard-row,.race-leader-row')];
 const row=rows[rank-1];
 if(!row) return;

 const nameEl=row.querySelector('.leader-name,.name,[data-leader-name]') || row.children[1];
 if(nameEl) nameEl.textContent=name;

 // Keep the kilometre value equal to the player's live distance.
 const L=levelData();
 const playerKm=Math.max(0,Math.min(Number(L[1]||0),Number(run.p||0)*Number(L[1]||0)));
 const kmEl=row.querySelector('.leader-km,.km,[data-leader-km]') || row.children[row.children.length-1];
 if(kmEl && /км/i.test(kmEl.textContent||'')) kmEl.textContent=`${playerKm.toFixed(1)} км`;
}


try{const _pn=document.querySelector('#playerName');if(_pn){_pn.addEventListener('input',fitPlayerNameFont);_pn.addEventListener('change',fitPlayerNameFont);fitPlayerNameFont();}}catch(e){}

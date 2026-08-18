const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),url=require('url');
const ROOT=__dirname, PORT=process.env.PORT||3000, DB=process.env.DB_PATH||path.join(ROOT,'data','db.json');
fs.mkdirSync(path.dirname(DB),{recursive:true});
let db={users:[],sessions:{},progress:{}};try{db=JSON.parse(fs.readFileSync(DB,'utf8'))}catch{}
function save(){fs.writeFileSync(DB,JSON.stringify(db))}
function send(res,status,obj,headers={}){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',...headers});res.end(JSON.stringify(obj))}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(s.length>2000000)reject(Error('body too large'))});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});req.on('error',reject)})}
function cookies(req){const o={};(req.headers.cookie||'').split(';').forEach(x=>{const i=x.indexOf('=');if(i>0)o[x.slice(0,i).trim()]=decodeURIComponent(x.slice(i+1))});return o}
function hash(p,s=crypto.randomBytes(16).toString('hex')){return {s,h:crypto.scryptSync(p,s,64).toString('hex')}}
function verify(p,s,h){try{return crypto.timingSafeEqual(crypto.scryptSync(p,s,64),Buffer.from(h,'hex'))}catch{return false}}
function currentUser(req){const t=cookies(req).tra_session,s=t&&db.sessions[t];if(!s||s.expires<Date.now())return null;return db.users.find(u=>u.id===s.userId)||null}
function session(res,userId){const t=crypto.randomBytes(32).toString('hex');db.sessions[t]={userId,expires:Date.now()+2592000000};save();res.setHeader('Set-Cookie',`tra_session=${t}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`)}
async function api(req,res,p){
 try{
  if(p==='/api/health')return send(res,200,{ok:true,version:'1.0-online'});
  if(p==='/api/user-exists'&&req.method==='POST'){const b=await body(req),nick=String(b.nick||'').trim();return send(res,200,{exists:db.users.some(u=>u.nick===nick)})}
  if(p==='/api/register'&&req.method==='POST'){const b=await body(req),nick=String(b.nick||'').trim(),password=String(b.password||'');if(nick.length<2||nick.length>30)return send(res,400,{error:'Ник должен быть от 2 до 30 символов.'});if(password.length<4)return send(res,400,{error:'Пароль должен быть от 4 символов.'});if(db.users.some(u=>u.nick===nick))return send(res,409,{error:'Такой пользователь уже зарегистрирован.'});const h=hash(password),u={id:crypto.randomUUID(),nick,password:`${h.s}:${h.h}`,created:Date.now()};db.users.push(u);db.progress[u.id]=null;save();session(res,u.id);return send(res,200,{ok:true,user:{id:u.id,nick:u.nick}})}
  if(p==='/api/login'&&req.method==='POST'){const b=await body(req),u=db.users.find(x=>x.nick===String(b.nick||'').trim());if(!u)return send(res,401,{error:'Пользователь не зарегистрирован.'});const [s,h]=u.password.split(':');if(!verify(String(b.password||''),s,h))return send(res,401,{error:'Неверный пароль.'});session(res,u.id);return send(res,200,{ok:true,user:{id:u.id,nick:u.nick},progress:db.progress[u.id]||null})}
  if(p==='/api/me'&&req.method==='GET'){const u=currentUser(req);if(!u)return send(res,401,{error:'Не авторизован'});return send(res,200,{user:{id:u.id,nick:u.nick},progress:db.progress[u.id]||null})}
  if(p==='/api/progress'&&req.method==='PUT'){const u=currentUser(req);if(!u)return send(res,401,{error:'Не авторизован'});const b=await body(req);if(!b.progress||typeof b.progress!=='object'||Array.isArray(b.progress))return send(res,400,{error:'Некорректный прогресс'});if(JSON.stringify(b.progress).length>1500000)return send(res,400,{error:'Прогресс слишком большой'});db.progress[u.id]=b.progress;save();return send(res,200,{ok:true,updatedAt:Date.now()})}
  if(p==='/api/logout'&&req.method==='POST'){const t=cookies(req).tra_session;if(t)delete db.sessions[t];save();return send(res,200,{ok:true},{'Set-Cookie':'tra_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'})}
  return false;
 }catch(e){return send(res,400,{error:e.message||'Ошибка запроса'})}
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer(async(req,res)=>{const p=url.parse(req.url).pathname;if(p.startsWith('/api/')){const handled=await api(req,res,p);if(handled!==false)return;return send(res,404,{error:'Not found'})}let file=path.join(ROOT,p==='/'?'index.html':p);if(!file.startsWith(ROOT))return send(res,403,{error:'Forbidden'});if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(ROOT,'index.html');try{const ext=path.extname(file);res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream'});fs.createReadStream(file).pipe(res)}catch{send(res,500,{error:'Server error'})}});
server.listen(PORT,()=>console.log(`Trail Runner Armageddon online on ${PORT}`));

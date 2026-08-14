const CACHE_NAME='trail-race-v095-base84-cherrypick';
const ASSETS=[
  './',
  './index.html',
  './app.js?v=095',
  './styles.css?v=095',
  './manifest.webmanifest?v=095',
  './icon-192.png',
  './icon-512.png',
  './misha_start.png'
];

self.addEventListener('install', event=>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS).catch(()=>{}))
  );
});

self.addEventListener('activate', event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);

  if(req.mode==='navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        const cache=await caches.open(CACHE_NAME);
        cache.put(req,fresh.clone()).catch(()=>{});
        return fresh;
      }catch(e){
        return (await caches.match(req)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }

  if(url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.webmanifest')){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        const cache=await caches.open(CACHE_NAME);
        cache.put(req,fresh.clone()).catch(()=>{});
        return fresh;
      }catch(e){
        return (await caches.match(req)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(req).then(hit=>hit || fetch(req).then(resp=>{
      const copy=resp.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)).catch(()=>{});
      return resp;
    }))
  );
});

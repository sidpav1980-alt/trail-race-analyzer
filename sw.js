const CACHE_NAME='trail-race-v093-map-analysis-v087';
const ASSETS=['./index.html', './styles.css?v=091', './app.js?v=091', './manifest.webmanifest?v=091', './icon-192.png', './icon-512.png', '/index.html'];

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

  // HTML/navigation: network first, so Chrome sees a new deployed version immediately.
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

  // Versioned JS/CSS: network first as well.
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

  // Images/other static resources: cache first for offline.
  event.respondWith(
    caches.match(req).then(hit=>hit || fetch(req).then(resp=>{
      const copy=resp.clone();
      caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)).catch(()=>{});
      return resp;
    }))
  );
});

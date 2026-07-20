const CACHE="kucharka-v15";
self.addEventListener("install",e=>{ self.skipWaiting(); });
self.addEventListener("activate",e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET") return;
  const url=new URL(e.request.url);
  const isDoc = e.request.mode==="navigate" || url.pathname.endsWith(".html") || url.pathname.endsWith("/");
  if(isDoc){
    e.respondWith(fetch(e.request).then(resp=>{ const cp=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{}); return resp; }).catch(()=>caches.match(e.request).then(r=>r||caches.match("./kucharka.html"))));
  } else {
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{ const cp=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,cp)).catch(()=>{}); return resp; })));
  }
});

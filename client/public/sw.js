// Cache the public form and its bundled assets. Account pages and APIs use the network.
const CACHE='yawmeh-offline-__OFFLINE_BUILD__';
const OFFLINE='/offline.html';
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  const page=await fetch(OFFLINE,{cache:'reload'});
  if(!page.ok)throw new Error('Offline form unavailable');
  const html=await page.clone().text();
  const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match=>match[1]);
  if(!assets.length)throw new Error('Offline form assets unavailable');
  await cache.addAll(assets);
  await cache.put(OFFLINE,page);
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys()){
    if(key.startsWith('yawmeh-offline-')&&key!==CACHE)await caches.delete(key);
  }
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const {request}=event,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(request.mode==='navigate'&&!url.pathname.startsWith('/api/')){
    event.respondWith(fetch(request).catch(async()=> (await caches.open(CACHE)).match(OFFLINE)));
  }else if(url.pathname.startsWith('/assets/')){
    event.respondWith((async()=>{
      const cached=await (await caches.open(CACHE)).match(request);
      return cached||fetch(request);
    })());
  }
});

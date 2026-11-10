// שומר את האפליקציה בטלפון כדי שתעבוד גם בלי אינטרנט.
// כשמשנים קבצים, מעלים את המספר בשורה הבאה (rb-v6, rb-v6...) כדי שהטלפון יטען את הגרסה החדשה.
const C = 'rb-v9';
const FILES = ['./', 'index.html', 'seed.json', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => Promise.all(FILES.map(f=>fetch(f,{cache:'reload'}).then(r=>r.ok?c.put(f,r):0)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== C && k !== 'rb-share').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// קבלת קבצים משיתוף (למשל מ-Samsung Notes): שומרים אותם זמנית ופותחים את האפליקציה
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method === 'POST' && u.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await e.request.formData();
        const c = await caches.open('rb-share');
        let n = 0;
        for (const f of fd.getAll('files')) {
          if (!f || !f.size) continue;
          await c.put('/shared/' + Date.now() + '-' + n++, new Response(f, {
            headers: { 'content-type': f.type || 'application/octet-stream', 'x-name': encodeURIComponent(f.name || 'shared'), 'x-mod': String(f.lastModified || 0) }
          }));
        }
        const t = [fd.get('title'), fd.get('text')].filter(Boolean).join('\n');
        if (t) await c.put('/shared/' + Date.now() + '-t', new Response(t, { headers: { 'content-type': 'text/plain', 'x-name': encodeURIComponent('shared.txt'), 'x-mod': '0' } }));
      } catch (err) {}
      return Response.redirect('./?shared=1', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(C).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(h => h || caches.match('index.html')))
  );
});

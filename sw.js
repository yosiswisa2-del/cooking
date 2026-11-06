// שומר את האפליקציה בטלפון כדי שתעבוד גם בלי אינטרנט.
// כשמשנים קבצים, מעלים את המספר בשורה הבאה (rb-v2, rb-v3...) כדי שהטלפון יטען את הגרסה החדשה.
const C = 'rb-v3';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== C).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit ||
      fetch(e.request)
        .then(res => {
          if (new URL(e.request.url).origin === location.origin) {
            const copy = res.clone();
            caches.open(C).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match('index.html'))
    )
  );
});

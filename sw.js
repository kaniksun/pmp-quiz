const CACHE_NAME = 'pmp-quiz-v4';
const APP_SHELL = [
  './',
  './index.html',
  './js/app.js',
  './js/db.js',
  './js/parser.js',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isCdn = url.includes('cdn.tailwindcss') || url.includes('unpkg.com') || url.includes('cdn.jsdelivr');

  if (isCdn) {
    // CDN: cache-first (cache indefinitely once fetched)
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        });
      })
    );
    return;
  }

  // App files: network-first with 3s timeout fallback to cache
  event.respondWith(
    new Promise((resolve) => {
      // タイムアウト後はキャッシュから返す
      const timer = setTimeout(async () => {
        const cached = await caches.match(event.request);
        if (cached) resolve(cached);
      }, 3000);

      fetch(event.request)
        .then((res) => {
          clearTimeout(timer);
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          resolve(res);
        })
        .catch(async () => {
          clearTimeout(timer);
          const cached = await caches.match(event.request);
          resolve(cached || new Response('Offline', { status: 503 }));
        });
    })
  );
});

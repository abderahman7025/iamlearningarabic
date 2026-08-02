// iamlearningarabic — Service Worker v28
const CACHE = 'arab-v28';

self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return Promise.allSettled([cache.add('/manifest.json')]);
    })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(k => k !== CACHE).map(k => {
          console.log('SW v4: suppression cache', k);
          return caches.delete(k);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);

  if (url.hostname.includes('tawk.to') ||
      url.hostname.includes('anthropic') ||
      url.pathname.includes('/api/')) return;

  // index.html + app.html → TOUJOURS réseau en premier (jamais de cache)
  if (url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '' || url.pathname === '/app.html' || url.pathname === '/app') {
    e.respondWith(
      fetch(e.request, {cache: 'no-store'}).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        }
        return response;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Reste → cache first
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        var clone = response.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return response;
      }).catch(function() {
        if (e.request.destination === 'document') return caches.match('/index.html');
      });
    })
  );
});

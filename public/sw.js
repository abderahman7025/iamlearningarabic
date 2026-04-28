// iamlearningarabic — Service Worker v2
const CACHE = 'arab-v2';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', function(e) {
  self.skipWaiting(); // Activation immédiate
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return Promise.allSettled(
        PRECACHE.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
});

self.addEventListener('activate', function(e) {
  // Supprimer TOUS les anciens caches (arab-v1, arab-v0, etc.)
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(k => k !== CACHE).map(k => {
          console.log('SW: suppression ancien cache', k);
          return caches.delete(k);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Écouter le message SKIP_WAITING envoyé par la page
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Ne jamais mettre en cache : Tawk, API, services tiers
  if (url.hostname.includes('tawk.to') ||
      url.hostname.includes('anthropic') ||
      url.pathname.includes('/api/')) {
    return;
  }

  // Stratégie : Network first pour index.html (toujours à jour)
  // Cache first pour les autres ressources (polices, images)
  if (url.pathname === '/' || url.pathname === '/index.html') {
    e.respondWith(
      fetch(e.request).then(function(response) {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }

  // Cache first pour le reste
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(response) {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      }).catch(function() {
        if (e.request.destination === 'document') return caches.match('/index.html');
      });
    })
  );
});

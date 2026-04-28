// iamlearningarabic — Service Worker v1
const CACHE = 'arab-v1';

// Fichiers à mettre en cache immédiatement
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;700&family=Tajawal:wght@300;400;500;700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap'
];

// Installation : mise en cache des ressources essentielles
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      // On met en cache ce qu'on peut, sans bloquer si une ressource échoue
      return Promise.allSettled(
        PRECACHE.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
});

// Activation : supprimer les anciens caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch : stratégie "Cache first, then network"
self.addEventListener('fetch', function(e) {
  // Ne pas intercepter les requêtes non-GET ou externes (API, Tawk, etc.)
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  // Toujours aller au réseau pour les API et services tiers
  if (url.hostname.includes('tawk.to') || 
      url.hostname.includes('api.anthropic') ||
      url.pathname.includes('/api/')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      // Pas en cache : récupérer depuis le réseau ET mettre en cache
      return fetch(e.request).then(function(response) {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE).then(function(cache) {
          cache.put(e.request, clone);
        });
        return response;
      }).catch(function() {
        // Hors ligne et pas en cache : page de fallback
        if (e.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});

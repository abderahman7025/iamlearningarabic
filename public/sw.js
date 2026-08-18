// iamlearningarabic — Service Worker v91
const CACHE = 'arab-v91';

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

  // TOUTE navigation (page HTML) → TOUJOURS réseau en premier.
  // Les URL /fille/..., /garcon/..., /adulte/..., /cours/... sont réécrites
  // vers index.html côté serveur (voir vercel.json). Elles ne correspondent
  // donc à aucun des chemins listés ci-dessous et tombaient dans le
  // "cache first" : l'application restait bloquée sur une version périmée
  // jusqu'à ce qu'un changement de version du cache la supprime.
  // On teste le type de requête plutôt que le chemin : ça couvre toutes les
  // réécritures, présentes et futures.
  if (e.request.mode === 'navigate' || e.request.destination === 'document' ||
      url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '') {
    e.respondWith(
      fetch(e.request, {cache: 'no-store'}).then(function(response) {
        // Une page d'application demandée sans session valide est redirigée
        // vers la page publique : Cache.put refuse ces réponses, et les
        // mettre en cache reviendrait à ranger la page de connexion sous
        // l'adresse d'un cours.
        if (response && response.status === 200 && !response.redirected) {
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

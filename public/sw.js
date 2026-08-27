// iamlearningarabic â€” Service Worker v162
const CACHE = 'arab-v162';

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

  // TOUTE navigation (page HTML) â†’ TOUJOURS rÃ©seau en premier.
  // Les URL /fille/..., /garcon/..., /adulte/..., /cours/... sont rÃ©Ã©crites
  // vers index.html cÃ´tÃ© serveur (voir vercel.json). Elles ne correspondent
  // donc Ã  aucun des chemins listÃ©s ci-dessous et tombaient dans le
  // "cache first" : l'application restait bloquÃ©e sur une version pÃ©rimÃ©e
  // jusqu'Ã  ce qu'un changement de version du cache la supprime.
  // On teste le type de requÃªte plutÃ´t que le chemin : Ã§a couvre toutes les
  // rÃ©Ã©critures, prÃ©sentes et futures.
  if (e.request.mode === 'navigate' || e.request.destination === 'document' ||
      url.pathname === '/' || url.pathname === '/index.html' || url.pathname === '') {
    e.respondWith(
      fetch(e.request, {cache: 'no-store'}).then(function(response) {
        // Une page d'application demandÃ©e sans session valide est redirigÃ©e
        // vers la page publique : Cache.put refuse ces rÃ©ponses, et les
        // mettre en cache reviendrait Ã  ranger la page de connexion sous
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

  // Reste â†’ cache first
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

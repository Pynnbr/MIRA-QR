/* Service worker do Mira QR.
   Guarda o app em cache para que ele continue funcionando sem internet
   depois da primeira visita (ou depois de instalado na tela inicial). */

var CACHE_NAME = 'mira-qr-v6';

var PRECACHE_URLS = [
  'manifest.json',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png'
];

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function () {
        /* se algum arquivo não existir ainda, não impede a instalação */
      });
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

/* Estratégia:
   - Página principal (HTML/navegação): busca sempre a versão mais nova
     da internet primeiro. Só usa a cópia salva se estiver sem internet.
     Isso garante que qualquer atualização apareça na hora, sem ficar
     "atrasada" uma visita.
   - Outros arquivos (ícones, manifest): responde do cache na hora
     (rápido) e atualiza em segundo plano. */
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  var isNavigation = req.mode === 'navigate' || (req.destination === 'document');

  if (isNavigation) {
    event.respondWith(
      fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
        }
        return res;
      }).catch(function () {
        return caches.match(req);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      var networkFetch = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, resClone); });
        }
        return res;
      }).catch(function () {
        return cached;
      });
      return cached || networkFetch;
    })
  );
});

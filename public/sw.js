// Straje.App - Service Worker con Actualización Instantánea
const CACHE_VERSION = 'straje-v' + Date.now();
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/pwa-icon.png',
  '/favicon.svg',
  '/manifest.json'
];

// 1. INSTALACIÓN: skipWaiting para activarse de inmediato
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('Pre-cache warning:', err);
      });
    })
  );
});

// 2. ACTIVACIÓN: clients.claim() y borrado de cachés viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_VERSION) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// 3. ESTRATEGIA DE RED: Network First para HTML/scripts nuevos, Cache fallback
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Ignorar peticiones a Supabase, APIs de terceros o no-GET
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('unsplash.com') ||
    url.hostname.includes('api.') ||
    url.pathname.startsWith('/api')
  ) {
    return;
  }

  // Para documentos HTML o navegación: Network First siempre para obtener última versión
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  // Para assets con hash (JS/CSS en /assets/): Cache First con revalidación en background
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, copy));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Para cualquier otro recurso: Network First
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Mensaje para forzar recarga inmediata desde el cliente si es necesario
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

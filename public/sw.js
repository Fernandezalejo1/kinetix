// Version marker bumped by scripts/sw-precache.mjs on every build based on
// the asset set, so stale caches are cleared and the browser detects the
// update (sw.js cambia de bytes). Cache names derive from it on purpose:
// when the version changes, activate() purges the old vXX caches.
const BUILD_VERSION = '22';
const STATIC_CACHE = `kinetix-static-v${BUILD_VERSION}`;
const DYNAMIC_CACHE = `kinetix-dynamic-v${BUILD_VERSION}`;
const PAGE_CACHE = `kinetix-pages-v${BUILD_VERSION}`;
const MEDIA_CACHE = `kinetix-media-v${BUILD_VERSION}`;

// Static assets (hashed by Vite, immutable) are pre-cached on install.
// FIX (prioridad alta): el shell HTML SÍ se precachea. Sin esto, el primer uso
// offline caía a caches.match('/index.html') y ese recurso no existía en caché
// aún (solo se guardaba tras una navegación exitosa), quedando el usuario sin
// app offline. Network-first sigue garantizando que online siempre se use la
// versión fresca; el precache es SOLO el fallback de último recurso.
// Precaching completo: los assets hasheados de Vite (JS/CSS/estáticos livianos)
// se listan en /precache-manifest.json (generado en cada build). Una pantalla
//     nunca abierta ya NO falla offline: sus chunks JS/CSS se bajan en install().
// Los videos de ejercicios y demás media pesada quedan FUERA del precache
// (ver scripts/sw-precache.mjs): el fetch handler los baja on-demand y los
// cachea al primer uso (MEDIA_CACHE, acotado), así funcionan offline después
// de verse una vez sin gastar decenas de MB de datos en la instalación.
const PRECACHE_URLS = [
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/icon-192.png',
  '/icon-512.png',
  '/assets/ranks/bronze.png',
  '/assets/ranks/gold.png',
  '/assets/ranks/master.png',
  '/assets/ranks/challenger.png',
];

// Install: pre-cache static assets. We deliberately do NOT skipWaiting() here:
// the new SW stays in "waiting" so the UpdateBanner can reliably detect it and
// ask the user to reload. skipWaiting() only happens via the SKIP_WAITING
// message (sent when the user taps "Actualizar") or on the next navigation.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      await cache.addAll(PRECACHE_URLS);
      // Precache dinámico: la lista completa de assets del build (ver
      // scripts/sw-precache.mjs). Una descarga incompleta cancela
      // la instalación y conserva la versión anterior.
      const res = await fetch('/precache-manifest.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Precache manifest unavailable');
      const raw = await res.json();
      if (!Array.isArray(raw) || !raw.length || !raw.every(u => typeof u === 'string' && u.startsWith('/assets/'))) {
        throw new Error('Invalid precache manifest');
      }
      // Defensa en profundidad: el manifiesto ya excluye media pesada, pero si
      // una versión vieja o un manifiesto manipulado la incluyera, la evitamos
      // igual. El fetch handler nunca la sirve desde caché y una sola descarga
      // fallida cancelaría la instalación completa del worker.
      const all = raw.filter(u => !/\.(mp4|webm|mov|m4v|gif|avif)$/i.test(u));
      if (!all.length) throw new Error('Precache manifest has no cacheable assets');
      // Reject installation on failure: the previous working version stays active.
      await cache.addAll(all);

    })
  );
});

// Allow the page to request skipWaiting (used by the "update available" banner).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate: claim clients and clean old caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== PAGE_CACHE && name !== MEDIA_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Mantiene el caché de media acotado: cache.keys() devuelve por orden de
// inserción, así que borramos los más antiguos primero.
const MAX_MEDIA_CACHE_ENTRIES = 120;
function pruneMediaCache(cache) {
  cache.keys().then((keys) => {
    const overflow = keys.length - MAX_MEDIA_CACHE_ENTRIES;
    if (overflow <= 0) return;
    keys.slice(0, overflow).forEach((key) => cache.delete(key));
  });
}

function isNavigationRequest(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// Fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Skip API calls (always go network)
  if (url.pathname.startsWith('/api/')) return;

  // Media (videos/gifs de ejercicios): cache-first con relleno en red. No se
  // precachea, pero una vez descargada queda en MEDIA_CACHE (acotado) para
  // reproducirse offline. El request lleva su Range, así que el put/éxito de
  // caché casan con la misma posición solicitada.
  if (/\.(mp4|webm|mov|m4v|gif|avif)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then((cache) =>
        cache.match(request).then((cached) =>
          cached || fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
              pruneMediaCache(cache);
            }
            return networkResponse;
          }).catch(() => cached || Response.error())
        )
      )
    );
    return;
  }

  // Navigation requests: NETWORK-FIRST so users always get the latest version.
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(PAGE_CACHE).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => {
        // Offline: fall back to the most recently cached page, then to the
        // precached shell (garantizado desde install()).
        return caches.match(request).then((cached) =>
          cached || caches.match('/index.html')
        );
      })
    );
    return;
  }

  // Non-hashed assets (favicons, icons, manifest): NETWORK-FIRST so
  // updates are visible without a hard refresh.
  const isNonHashedAsset =
    url.pathname.startsWith('/favicon') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname === '/manifest.json';

  if (isNonHashedAsset) {
    event.respondWith(
      fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Vite-hashed assets (immutable): CACHE-FIRST for speed, with background refresh.
  event.respondWith(
    caches.match(request, { ignoreVary: url.pathname.startsWith("/assets/") }).then((cachedResponse) => {
      const fetchAndCache = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchAndCache;
    })
  );
});

const STATIC_CACHE = 'kinetix-static-v15';
const DYNAMIC_CACHE = 'kinetix-dynamic-v15';
const PAGE_CACHE = 'kinetix-pages-v15';

// Version marker bumped on every deploy so stale caches are cleared.
const BUILD_VERSION = '15';

// Static assets (hashed by Vite, immutable) are pre-cached on install.
// NOTE: we do NOT pre-cache the HTML shell so the app always loads fresh.
const PRECACHE_URLS = [
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
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
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
          .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== PAGE_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

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

  // Skip large media (load on demand)
  if (url.pathname.includes('.mp4') || url.pathname.includes('.gif')) return;

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
        // Offline: fall back to the most recently cached page.
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
    caches.match(request).then((cachedResponse) => {
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

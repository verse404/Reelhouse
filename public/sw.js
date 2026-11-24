const CACHE_VERSION = 'reelhouse-pwa-v2';
const MAX_ASSET_CACHE_ENTRIES = 40;
const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './apple-touch-icon.png',
  './icon-512.png',
  './og-reelhouse.jpg',
];

async function pruneOldAssets(cache) {
  try {
    const keys = await cache.keys();
    const assetKeys = keys.filter((req) => new URL(req.url).pathname.includes('/assets/'));
    if (assetKeys.length > MAX_ASSET_CACHE_ENTRIES) {
      const toRemove = assetKeys.slice(0, assetKeys.length - MAX_ASSET_CACHE_ENTRIES);
      await Promise.all(toRemove.map((k) => cache.delete(k)));
    }
  } catch {
    // Ignore cache pruning errors
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('reelhouse-pwa-') && key !== CACHE_VERSION)
            .map((oldKey) => caches.delete(oldKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let reqUrl;
  try {
    reqUrl = new URL(request.url);
  } catch {
    return;
  }

  // Strictly handle same-origin HTTP(S) resources; never cache third-party map tiles or posters here
  if (reqUrl.origin !== self.location.origin) return;
  if (reqUrl.pathname.startsWith('/api/config')) return;

  // Network-first with offline cache fallback for catalog data & HTML navigation
  const isCatalogOrNav =
    request.mode === 'navigate' ||
    reqUrl.pathname.endsWith('/live_catalog.json') ||
    reqUrl.pathname.endsWith('/api/catalog');

  if (isCatalogOrNav) {
    event.respondWith(
      fetch(request)
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const copy = networkRes.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return networkRes;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  // Stale-while-revalidate for versioned Vite JS/CSS bundles and local static plates
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkRes) => {
          if (networkRes && networkRes.ok) {
            const copy = networkRes.clone();
            caches
              .open(CACHE_VERSION)
              .then((cache) => cache.put(request, copy).then(() => pruneOldAssets(cache)))
              .catch(() => {});
          }
          return networkRes;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

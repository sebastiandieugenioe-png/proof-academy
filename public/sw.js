// Minimal service worker for PWA installability.
// - Precaches core assets on install
// - Network-first for HTML documents (fresh content)
// - Cache-first for images/manifest
// - Passes through API and everything else

const CACHE_NAME = 'osc-cache-v1';
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/placeholder-lesson.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS).catch(() => null)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API: pass through
  if (url.pathname.startsWith('/api/')) return;

  // HTML: network-first, fallback to cache
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Static assets: cache-first
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json' || url.pathname.startsWith('/_next/static/') || /\.(png|jpg|jpeg|webp|svg|css|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((r) => r || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        return res;
      }))
    );
  }
});

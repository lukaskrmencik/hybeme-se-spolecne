// Service worker: keeps the app itself on the phone, so it opens without signal.
// API calls are never touched: the app has its own offline queue for visits.
// Map tiles are not stored either (Mapy.com terms); Leaflet and the map font come from /vendor and /fonts.

const VERSION = 'v2';
const CACHE = `hybeme-${VERSION}`;
// Pages the installed app opens on; any of them boots the whole app.
const SHELL = [
  '/map',
  '/login',
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/vendor/leaflet/leaflet.js',
  '/vendor/leaflet/leaflet.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
      // The bundles have hashed names; take them from the page so the first offline start works too.
      const html = await (await cache.match('/map')).text();
      const assets = [...html.matchAll(/(?:src|href)="(\/_expo\/[^"]+)"/g)].map((m) => m[1]);
      // One missing file must not stop the installation, the rest is cached on first use anyway.
      await Promise.allSettled([...new Set(assets)].map((asset) => cache.add(asset)));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('hybeme-') && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

// Pages: always the newest version when online, the stored one when not.
async function networkFirstPage(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request, { ignoreSearch: true })) || (await cache.match('/map')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/storage/')) return;
    if (request.mode === 'navigate') {
      event.respondWith(networkFirstPage(request));
      return;
    }
    if (['/_expo/', '/assets/', '/icons/', '/vendor/', '/fonts/'].some((prefix) => url.pathname.startsWith(prefix))) {
      event.respondWith(cacheFirst(request));
    }
  }
});

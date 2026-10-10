// Service worker: keeps the app itself on the phone, so it opens without signal.
// API calls are never touched: the app has its own offline queue for visits.
// Mapy.com tiles are not stored (their terms); instead the OpenStreetMap map of the area (offline-map) is
// downloaded once in the background and shown when there is no signal. Leaflet and the font come from /vendor and /fonts.

const VERSION = 'v4';
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
  '/vendor/protomaps-leaflet/protomaps-leaflet.js',
];
// Its own cache, so a new app version does not throw away 20+ MB that would have to be downloaded again.
const MAP_CACHE = 'offline-map';
const MAP_URL = '/offline-map/area.pmtiles';

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
      // A new version may come with the map's download fixed; start it now, not on the next app start.
      syncOfflineMap();
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

// The offline map: downloaded when missing, again only when the server has a new one (its ETag changes).
let mapSync = null;
let mapBlob = null;

// Every PMTiles file starts with these bytes. A missing file makes nginx answer with the landing page
// (200, HTML), which must never be kept as the map.
async function isMapFile(response) {
  return response.headers.get('content-type')?.startsWith('text/html') !== true &&
    (await (await response.blob()).slice(0, 7).text()) === 'PMTiles';
}

function syncOfflineMap() {
  if (!mapSync) {
    mapSync = (async () => {
      try {
        // The user asked the browser to save data: 20+ MB is not worth it then.
        if (self.navigator.connection && self.navigator.connection.saveData) return;
        const cache = await caches.open(MAP_CACHE);
        const head = await fetch(MAP_URL, { method: 'HEAD', cache: 'no-store' });
        if (!head.ok || head.headers.get('content-type')?.startsWith('text/html')) {
          // Not on the server (yet); a wrong copy from before is dropped.
          const cached = await cache.match(MAP_URL);
          if (cached && !(await isMapFile(cached))) await cache.delete(MAP_URL);
          return;
        }
        const version = (r) => r.headers.get('etag') || r.headers.get('last-modified');
        const cached = await cache.match(MAP_URL);
        if (cached && version(cached) === version(head) && (await isMapFile(cached))) return;
        const response = await fetch(MAP_URL, { cache: 'no-store' });
        if (!response.ok) return;
        await cache.put(MAP_URL, response);
        mapBlob = null;
        // Checked on the stored copy, which lives on disk: no need to hold the whole file in memory.
        const stored = await cache.match(MAP_URL);
        if (!stored || !(await isMapFile(stored))) await cache.delete(MAP_URL);
      } catch {
        // No signal or an interrupted download; the next start tries again.
      } finally {
        mapSync = null;
      }
    })();
  }
  return mapSync;
}

// The map reads the file in pieces (HTTP Range requests); the stored copy answers them the same way the server does.
async function offlineMap(request) {
  const cached = await caches.match(MAP_URL, { cacheName: MAP_CACHE });
  if (!cached) return fetch(request);
  if (!mapBlob) {
    const blob = await cached.blob();
    if ((await blob.slice(0, 7).text()) !== 'PMTiles') return fetch(request);
    mapBlob = blob;
  }
  const headers = { 'Content-Type': 'application/octet-stream' };
  const etag = cached.headers.get('etag');
  if (etag) headers.ETag = etag;
  const range = /bytes=(\d+)-(\d*)/.exec(request.headers.get('range') || '');
  if (!range) return new Response(mapBlob, { headers });
  const size = mapBlob.size;
  const start = Number(range[1]);
  const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  return new Response(mapBlob.slice(start, end + 1), {
    status: 206,
    headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': String(end - start + 1) },
  });
}

self.addEventListener('message', (event) => {
  if (event.data === 'sync-offline-map') event.waitUntil(syncOfflineMap());
});

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
    // The Android installer goes straight to the network, it must not end up in the cache.
    if (['/api/', '/storage/', '/download/'].some((prefix) => url.pathname.startsWith(prefix))) return;
    if (url.pathname === MAP_URL) {
      event.respondWith(offlineMap(request));
      return;
    }
    if (request.mode === 'navigate') {
      event.respondWith(networkFirstPage(request));
      return;
    }
    if (['/_expo/', '/assets/', '/icons/', '/vendor/', '/fonts/'].some((prefix) => url.pathname.startsWith(prefix))) {
      event.respondWith(cacheFirst(request));
    }
  }
});

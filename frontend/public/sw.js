const VERSION = 'v5';
const CACHE = `hybeme-${VERSION}`;
const SHELL = [
  '/map',
  '/login',
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/vendor/leaflet/leaflet.js',
  '/vendor/leaflet/leaflet.css',
  '/vendor/protomaps-leaflet/protomaps-leaflet.js',
  '/fonts/nunito-regular.woff2',
  '/fonts/nunito-semibold.woff2',
  '/fonts/nunito-bold.woff2',
  '/fonts/nunito-extrabold.woff2',
  '/fonts/nunito-black.woff2',
];
const MAP_CACHE = 'offline-map';
const MAP_URL = '/offline-map/area.pmtiles';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL);
      const html = await (await cache.match('/map')).text();
      const assets = [...html.matchAll(/(?:src|href)="(\/_expo\/[^"]+)"/g)].map((m) => m[1]);
      await Promise.allSettled([...new Set(assets)].map((asset) => cache.add(asset)));
      await precacheBuild();
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
      syncOfflineMap();
    })()
  );
});

async function precacheBuild() {
  try {
    const list = await (await fetch('/precache.json', { cache: 'no-store' })).json();
    if (!Array.isArray(list)) return;
    const cache = await caches.open(CACHE);
    const wanted = list.filter((a) => typeof a === 'string' && a.startsWith('/_expo/'));
    const missing = [];
    for (const asset of wanted) if (!(await cache.match(asset))) missing.push(asset);
    await Promise.allSettled(missing.map((asset) => cache.add(asset)));
  } catch {}
}

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

let mapSync = null;
let mapBlob = null;

async function isMapFile(response) {
  return response.headers.get('content-type')?.startsWith('text/html') !== true &&
    (await (await response.blob()).slice(0, 7).text()) === 'PMTiles';
}

function syncOfflineMap() {
  if (!mapSync) {
    mapSync = (async () => {
      try {
        if (self.navigator.connection && self.navigator.connection.saveData) return;
        const cache = await caches.open(MAP_CACHE);
        const head = await fetch(MAP_URL, { method: 'HEAD', cache: 'no-store' });
        if (!head.ok || head.headers.get('content-type')?.startsWith('text/html')) {
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
        const stored = await cache.match(MAP_URL);
        if (!stored || !(await isMapFile(stored))) await cache.delete(MAP_URL);
      } catch {} finally {
        mapSync = null;
      }
    })();
  }
  return mapSync;
}

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
  if (event.data === 'sync-offline-map') event.waitUntil(Promise.all([syncOfflineMap(), precacheBuild()]));
});

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

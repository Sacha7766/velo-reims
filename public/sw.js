// Cache-first tile cache for the DEM / imagery / vector tile hosts only.
const CACHE = 'serpentine-tiles-v1';
const MAX_ENTRIES = 60000;
const CHECK_EVERY = 500;
const HOSTS = [
  ['s3.amazonaws.com', '/elevation-tiles-prod/'],
  ['mapsneu.wien.gv.at', '/basemap/'],
  ['server.arcgisonline.com', '/ArcGIS/rest/services/World_Imagery/'],
  ['www.ign.es', '/wmts/pnoa-ma'],
  ['tiles.openfreemap.org', '/'],
];

const isTile = (url) => HOSTS.some(([h, p]) => url.hostname === h && url.pathname.startsWith(p));

let puts = 0;
let trimming = false;

async function trim(cache) {
  if (trimming) return;
  trimming = true;
  try {
    const keys = await cache.keys(); // insertion order, oldest first
    const extra = keys.length - MAX_ENTRIES;
    for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
  } finally {
    trimming = false;
  }
}

async function handle(event) {
  const req = event.request;
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  // only CORS-readable, successful, complete responses; never opaque
  if (res.ok && res.status === 200 && (res.type === 'cors' || res.type === 'basic')) {
    const copy = res.clone();
    event.waitUntil(
      cache.put(req, copy).then(() => {
        if (++puts % CHECK_EVERY === 0) return trim(cache);
      }).catch(() => undefined),
    );
  }
  return res;
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) {
        if (k.startsWith('serpentine-tiles-') && k !== CACHE) await caches.delete(k);
      }
      await self.clients.claim();
      await trim(await caches.open(CACHE));
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (!isTile(url)) return;
  if (req.headers.has('range')) return;
  event.respondWith(handle(event));
});

// Registers the tile-caching service worker (public/sw.js) and exposes cache helpers.

export const TILE_CACHE = 'serpentine-tiles-v1';

export async function registerTileCache(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return true;
  } catch {
    return false;
  }
}

export async function tileCacheStats(): Promise<{ entries: number }> {
  if (typeof caches === 'undefined') return { entries: 0 };
  try {
    const cache = await caches.open(TILE_CACHE);
    return { entries: (await cache.keys()).length };
  } catch {
    return { entries: 0 };
  }
}

export async function clearTileCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  await caches.delete(TILE_CACHE);
}

// Warms the HTTP / service-worker tile cache along a route, start first.

import type { Route } from './route.ts';
import { mercToTile, lonLatToMerc } from './mercator.ts';
import { DEM_MAX_Z } from './elevation.ts';
import type { ImagerySource } from './imagery.ts';

export interface PrefetchOptions {
  sources: ImagerySource[];
  signal?: AbortSignal;
  onProgress?: (done: number, total: number) => void;
  concurrency?: number;
  /** Stop after this many tiles (testing). */
  limit?: number;
}

export interface PrefetchResult {
  total: number;
  fetched: number;
  failed: number;
  aborted: boolean;
}

interface Job {
  kind: 'dem' | 'img';
  z: number;
  x: number;
  y: number;
  s: number;
}

// [kind, zoom, radius in metres]
const LAYERS: ReadonlyArray<readonly ['dem' | 'img', number, number]> = [
  ['dem', DEM_MAX_Z, 400],
  ['img', 17, 250],
  ['img', 19, 80],
];

const demUrl = (z: number, x: number, y: number) =>
  `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

function planJobs(route: Route, sources: ImagerySource[]): Job[] {
  const maxImg = sources.reduce((m, s) => Math.max(m, s.maxZoom), 0);
  const seen = new Map<string, Job>();
  const k = route.frame.k;
  for (let i = 0; i < route.n; i++) {
    const [mx, my] = lonLatToMerc(route.lon[i], route.lat[i]);
    const s = i * route.step;
    for (const [kind, z, radius] of LAYERS) {
      if (kind === 'img' && z > maxImg) continue;
      const r = radius / k; // true metres -> mercator metres
      const [x0, y0] = mercToTile(mx - r, my + r, z);
      const [x1, y1] = mercToTile(mx + r, my - r, z);
      for (let y = Math.floor(y0); y <= Math.floor(y1); y++) {
        for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
          const id = `${kind}/${z}/${x}/${y}`;
          if (!seen.has(id)) seen.set(id, { kind, z, x, y, s });
        }
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.s - b.s || a.z - b.z);
}

async function fetchDemTile(j: Job, signal?: AbortSignal) {
  const res = await fetch(demUrl(j.z, j.x, j.y), { signal });
  if (!res.ok) throw new Error(`DEM ${res.status}`);
  await res.arrayBuffer();
}

// Same source order / fallback rules as loadImageryTile, without decoding.
async function fetchImageryTile(sources: ImagerySource[], j: Job, signal?: AbortSignal) {
  let lastErr: unknown;
  for (const src of sources) {
    if (j.z > src.maxZoom) continue;
    try {
      const res = await fetch(src.url(j.z, j.x, j.y), { signal });
      if (!res.ok) throw new Error(`${src.id} ${res.status}`);
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 800) throw new Error(`${src.id} empty`);
      return;
    } catch (e) {
      if (signal?.aborted) throw e;
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('no imagery source');
}

export async function prefetchRoute(route: Route, opts: PrefetchOptions): Promise<PrefetchResult> {
  const { sources, signal, onProgress } = opts;
  let jobs = planJobs(route, sources);
  if (opts.limit !== undefined) jobs = jobs.slice(0, opts.limit);
  const total = jobs.length;
  let next = 0;
  let done = 0;
  let fetched = 0;
  let failed = 0;
  onProgress?.(0, total);

  const worker = async () => {
    while (!signal?.aborted) {
      const j = jobs[next++];
      if (!j) return;
      try {
        if (j.kind === 'dem') await fetchDemTile(j, signal);
        else await fetchImageryTile(sources, j, signal);
        fetched++;
      } catch {
        if (signal?.aborted) return;
        failed++;
      }
      onProgress?.(++done, total);
    }
  };
  const n = Math.max(1, Math.min(opts.concurrency ?? 6, 16));
  await Promise.all(Array.from({ length: n }, worker));
  return { total, fetched, failed, aborted: !!signal?.aborted };
}

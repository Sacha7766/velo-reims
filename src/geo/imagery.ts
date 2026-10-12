// Aerial imagery tiles. National orthophotos where they exist (basemap.at in Austria, ~30 cm;
// IGN PNOA in Spain incl. the Balearics, 25 cm; both CC BY 4.0), Esri World Imagery everywhere
// else and as per-tile fallback.

export interface ImagerySource {
  id: string;
  name: string;
  maxZoom: number;
  attribution: string;
  /** [west, south, east, north] where the source has coverage. */
  bounds?: [number, number, number, number];
  url(z: number, x: number, y: number): string;
}

export const BASEMAP_AT: ImagerySource = {
  id: 'basemap-at',
  name: 'basemap.at Orthofoto',
  maxZoom: 19,
  attribution: 'Orthofoto © basemap.at (CC BY 4.0)',
  bounds: [9.4, 46.3, 17.2, 49.1],
  url: (z, x, y) => `https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/${z}/${y}/${x}.jpeg`,
};

export const PNOA: ImagerySource = {
  id: 'pnoa',
  name: 'PNOA Máxima Actualidad',
  maxZoom: 20,
  attribution: 'Ortofoto PNOA © Instituto Geográfico Nacional (CC BY 4.0)',
  bounds: [-18.5, 27.5, 4.6, 44.0],
  url: (z, x, y) =>
    `https://www.ign.es/wmts/pnoa-ma?request=GetTile&service=WMTS&VERSION=1.0.0&Layer=OI.OrthoimageCoverage&Style=default&Format=image/jpeg&TileMatrixSet=GoogleMapsCompatible&TileMatrix=${z}&TileRow=${y}&TileCol=${x}`,
};

export const ESRI: ImagerySource = {
  id: 'esri',
  name: 'Esri World Imagery',
  maxZoom: 18,
  attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
  url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
};

export function sourcesFor(lon: number, lat: number): ImagerySource[] {
  for (const src of [BASEMAP_AT, PNOA]) {
    const [w, s, e, n] = src.bounds!;
    // PNOA's box also covers southern France and Portugal: it answers those with blank tiles,
    // which loadImageryTile detects and falls back to Esri
    if (lon > w && lon < e && lat > s && lat < n) return [src, ESRI];
  }
  return [ESRI];
}

// a national source that has only answered blank or missing tiles for this world (a route just
// outside its country, inside its bounds box) is skipped instead of asked again for every tile;
// keyed by the world's source list, so the next route starts fresh
const tally = new WeakMap<ImagerySource[], { misses: Map<string, number>; hits: Set<string> }>();

let probe: OffscreenCanvasRenderingContext2D | null = null;

/** Share of the tile that is the white fill basemap.at sends outside Austria. */
function blankShare(bmp: ImageBitmap): number {
  // CPU-backed canvas: reading back a GPU 2D canvas whitewashes WebGL on ANGLE/Metal
  probe ??= new OffscreenCanvas(24, 24).getContext('2d', { willReadFrequently: true });
  if (!probe) return 0;
  probe.drawImage(bmp, 0, 0, 24, 24);
  const d = probe.getImageData(0, 0, 24, 24).data;
  let n = 0;
  // Chrome decodes the fill as 253: near-white and neutral
  for (let i = 0; i < d.length; i += 4) if (Math.min(d[i], d[i + 1], d[i + 2]) >= 248 && Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) <= 4) n++;
  return n / (24 * 24);
}

export async function loadImageryTile(
  sources: ImagerySource[],
  z: number,
  x: number,
  y: number,
  signal?: AbortSignal,
): Promise<ImageBitmap> {
  let lastErr: unknown;
  let t = tally.get(sources);
  if (!t) tally.set(sources, (t = { misses: new Map(), hits: new Set() }));
  const { misses, hits } = t;
  for (const src of sources) {
    if (z > src.maxZoom) continue;
    if (src.bounds && !hits.has(src.id) && (misses.get(src.id) ?? 0) > 40) continue;
    try {
      const res = await fetch(src.url(z, x, y), { signal });
      if (!res.ok) throw new Error(`${src.id} ${res.status}`);
      const blob = await res.blob();
      // basemap.at answers out-of-coverage tiles with tiny placeholders
      if (blob.size < 800) throw new Error(`${src.id} empty`);
      const bmp = await createImageBitmap(blob);
      // ...or (zoom 12–15, 18) with white JPEGs: snow never saturates a tenth of a tile to neutral white
      if (src.bounds && blankShare(bmp) > 0.1) {
        bmp.close();
        throw new Error(`${src.id} blank`);
      }
      if (src.bounds) hits.add(src.id);
      return bmp;
    } catch (e) {
      if (signal?.aborted) throw e;
      if (src.bounds) misses.set(src.id, (misses.get(src.id) ?? 0) + 1);
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('no imagery source');
}

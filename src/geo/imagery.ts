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

export async function loadImageryTile(
  sources: ImagerySource[],
  z: number,
  x: number,
  y: number,
  signal?: AbortSignal,
): Promise<ImageBitmap> {
  let lastErr: unknown;
  for (const src of sources) {
    if (z > src.maxZoom) continue;
    try {
      const res = await fetch(src.url(z, x, y), { signal });
      if (!res.ok) throw new Error(`${src.id} ${res.status}`);
      const blob = await res.blob();
      // basemap.at answers out-of-coverage tiles with tiny placeholders
      if (blob.size < 800) throw new Error(`${src.id} empty`);
      return await createImageBitmap(blob);
    } catch (e) {
      if (signal?.aborted) throw e;
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('no imagery source');
}

// Bakes the farm parcels of the Registre Parcellaire Graphique (IGN / ASP, Licence Ouverte 2.0) around the
// Champagne routes into public/fields/<id>.json: every declared field's outline and crop code, so the plain at
// the end of August shows each real parcel in its own state (wheat and barley stubble, beet, alfalfa, vines)
// instead of a guess from the spring orthophoto's colours.
// Run: node scripts/bake-fields.mjs [id]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const WFS = 'https://data.geopf.fr/wfs/ows';
// the latest campaign: 2025 when first baked, the year the Marne orthophoto was flown (28 April to 9 May 2025)
const LAYER = 'RPG.LATEST:parcelles_graphiques';
// metres around the route: the land mask the terrain shades fields through covers the corridor (420 m) plus 600 m
const MARGIN = 1100;
const PAGE = 5000;
// outline simplification (m): the field mask is 6 m per pixel
const TOLERANCE = 1;
// the Champagne biome's box (src/engine/biome.ts biomeFor)
const inChampagne = ([lon, lat]) => lat > 48.4 && lat < 49.9 && lon > 3.3 && lon < 5.3;

async function getJson(url) {
  for (let t = 0; ; t++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
      if (t >= 4) throw new Error(`${r.status} ${url}`);
    } catch (e) {
      if (t >= 4) throw e;
    }
    await new Promise((res) => setTimeout(res, 2000 * 2 ** t));
  }
}

/** Douglas–Peucker on a closed ring of [lon, lat] points, tolerance in metres. */
function simplify(pts, tol) {
  if (pts.length < 5) return pts;
  const kx = 111320 * Math.cos((pts[0][1] * Math.PI) / 180), ky = 110574;
  const keep = new Uint8Array(pts.length);
  // the ring closes on its first point: split it at the point farthest from there first
  let far = 1;
  for (let i = 1; i < pts.length - 1; i++) {
    if (Math.hypot((pts[i][0] - pts[0][0]) * kx, (pts[i][1] - pts[0][1]) * ky) > Math.hypot((pts[far][0] - pts[0][0]) * kx, (pts[far][1] - pts[0][1]) * ky)) far = i;
  }
  keep[0] = keep[far] = keep[pts.length - 1] = 1;
  const stack = [[0, far], [far, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const ax = pts[a][0] * kx, ay = pts[a][1] * ky, bx = pts[b][0] * kx, by = pts[b][1] * ky;
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-9;
    let worst = -1, at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] * kx - ax) * dy - (pts[i][1] * ky - ay) * dx) / len;
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > tol) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const index = JSON.parse(readFileSync('public/routes/index.json', 'utf8'));
const only = process.argv[2];
mkdirSync('public/fields', { recursive: true });
for (const { id } of index) {
  if (only && id !== only) continue;
  const route = JSON.parse(readFileSync(`public/routes/${id}.json`, 'utf8'));
  const line = [...(route.leadIn?.coords ?? []), ...route.coords];
  if (!inChampagne(line[0])) continue;
  let s = 90, w = 180, n = -90, e = -180;
  for (const [lon, lat] of line) { s = Math.min(s, lat); n = Math.max(n, lat); w = Math.min(w, lon); e = Math.max(e, lon); }
  const dLat = MARGIN / 110574, dLon = MARGIN / (111320 * Math.cos((((s + n) / 2) * Math.PI) / 180));
  const bbox = `${(s - dLat).toFixed(5)},${(w - dLon).toFixed(5)},${(n + dLat).toFixed(5)},${(e + dLon).toFixed(5)}`;
  const seen = new Set();
  const crops = [];
  const parcels = [];
  for (let start = 0; ; start += PAGE) {
    const url = `${WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=${LAYER}&OUTPUTFORMAT=application/json` +
      `&SRSNAME=EPSG:4326&COUNT=${PAGE}&STARTINDEX=${start}&BBOX=${bbox},urn:ogc:def:crs:EPSG::4326`;
    const page = await getJson(url);
    for (const f of page.features) {
      const p = f.properties;
      const key = p.num_parcel ?? p.id_parcel ?? f.id;
      if (seen.has(key)) continue;
      seen.add(key);
      let c = crops.indexOf(p.code_cultu);
      if (c < 0) c = crops.push(p.code_cultu) - 1;
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      // outer rings only: holes in a declared parcel are rare and a few metres across
      for (const poly of polys) {
        const ring = simplify(poly[0], TOLERANCE);
        if (ring.length < 4) continue;
        // micro-degrees, the first point absolute and the rest as steps (the closing point dropped)
        const out = [c];
        let px = 0, py = 0;
        for (const [lon, lat] of ring.slice(0, -1)) {
          const x = Math.round(lon * 1e6), y = Math.round(lat * 1e6);
          out.push(x - px, y - py);
          px = x;
          py = y;
        }
        parcels.push(out);
      }
    }
    if (page.features.length < PAGE) break;
  }
  const json = JSON.stringify({ source: `RPG (IGN / ASP), ${LAYER}, Licence Ouverte 2.0`, baked: new Date().toISOString().slice(0, 10), crops, parcels });
  writeFileSync(`public/fields/${id}.json`, json);
  console.log(`${id}: ${parcels.length} parcels, ${crops.length} crops, ${(json.length / 1024).toFixed(0)} KB`);
}

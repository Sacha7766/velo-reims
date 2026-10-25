// Serpentine Island (docs/world/README.md): places every route on the island as laid out in layout.json
// (its start point in island km, north kept up), prints the gaps and ground slopes between routes and the
// length and gradient of each new road, and writes the geometry for relief.py and page.mjs.
//   node scripts/world/layout.mjs        → $WORLD_OUT/world.json (default: <tmpdir>/serpentine-world)
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const HERE = new URL('.', import.meta.url).pathname;
const ROUTES = join(HERE, '../../public/routes');
export const OUT = process.env.WORLD_OUT ?? join(tmpdir(), 'serpentine-world');
fs.mkdirSync(OUT, { recursive: true });
const L = JSON.parse(fs.readFileSync(join(HERE, 'layout.json'), 'utf8'));

// each route in km from its start (x east, y north), with elevation and distance along
const S = {};
for (const id of Object.keys(L.routes)) {
  const r = JSON.parse(fs.readFileSync(join(ROUTES, `${id}.json`), 'utf8'));
  const c = r.coords, k = Math.cos((c[0][1] * Math.PI) / 180);
  let d = 0, prev = null;
  const pts = c.map((p) => {
    const x = (p[0] - c[0][0]) * 111.32 * k, y = (p[1] - c[0][1]) * 110.57;
    if (prev) d += Math.hypot(x - prev[0], y - prev[1]);
    prev = [x, y];
    return [x, y, p[2], d];
  });
  S[id] = { name: r.name, region: r.region, category: r.category, loop: !!r.loop, km: r.lengthKm, gain: r.gain, pts };
}
const W = {};
for (const [id, [x0, y0]] of Object.entries(L.routes)) W[id] = S[id].pts.map(([x, y, e, d]) => [x + x0, y + y0, e, d]);

/** A point on a route: 'start', 'end', a distance in km, or '1789m' for the first point at that height. */
function at(id, where) {
  const p = W[id];
  if (where === 'start') return p[0];
  if (where === 'end') return p[p.length - 1];
  if (typeof where === 'string' && where.endsWith('m')) { const h = parseFloat(where); return p.find((q) => q[2] >= h) ?? p[p.length - 1]; }
  return p.find((q) => q[3] >= where) ?? p[p.length - 1];
}

const ids = Object.keys(W);
console.log('— closest approach between routes (km), ground slope between them');
const close = [];
for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
  let best = [1e9];
  for (const a of W[ids[i]].filter((_, k) => k % 3 === 0)) for (const b of W[ids[j]].filter((_, k) => k % 3 === 0)) {
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (d < best[0]) best = [d, a, b];
  }
  if (best[0] < 9) close.push([ids[i], ids[j], best]);
}
close.sort((a, b) => a[2][0] - b[2][0]);
for (const [a, b, [d, p, q]] of close) {
  const slope = Math.abs(p[2] - q[2]) / (d * 1000);
  console.log(`${(a + ' / ' + b).padEnd(36)} ${d.toFixed(1).padStart(5)} km  ${Math.round(p[2])}↔${Math.round(q[2])} m  ${(slope * 100).toFixed(0)} %${d < 3 ? '  ← TOO CLOSE' : ''}${slope > 0.3 ? '  ← CLIFF' : ''}`);
}

console.log('— new roads');
let total = 0;
const connectors = [];
for (const c of L.connectors) {
  const a = at(c.from[0], c.from[1]), b = at(c.to[0], c.to[1]);
  const straight = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const dh = b[2] - a[2];
  // winding roads are about a quarter longer than the straight line, and at most 6.5 % on average
  const len = Math.max(straight * 1.25, Math.abs(dh) / 65);
  total += len;
  connectors.push({ ...c, a, b, straight, len, dh });
  console.log(`${c.name.padEnd(26)} ${straight.toFixed(1).padStart(5)} km straight → ~${len.toFixed(1)} km road, ${dh > 0 ? '+' : ''}${Math.round(dh)} m, ${(Math.abs(dh) / len / 10).toFixed(1)} %`);
}
const real = ids.reduce((s, id) => s + S[id].km, 0);
console.log(`real ${real.toFixed(0)} km, new ~${total.toFixed(0)} km`);
fs.writeFileSync(join(OUT, 'world.json'), JSON.stringify({ W, S: Object.fromEntries(ids.map((id) => [id, { ...S[id], pts: undefined }])), connectors }));
console.log(`wrote ${join(OUT, 'world.json')}`);

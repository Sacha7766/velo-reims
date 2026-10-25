// Map geometry and numbers for page.mjs: route and new-road paths in SVG units (10 per km), loops with their
// distance and climbing, the Danube, summits and towns. Reads $WORLD_OUT/world.json from layout.mjs.
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const HERE = new URL('.', import.meta.url).pathname;
export const OUT = process.env.WORLD_OUT ?? join(tmpdir(), 'serpentine-world');
const { W, S, connectors } = JSON.parse(fs.readFileSync(join(OUT, 'world.json'), 'utf8'));
const P = JSON.parse(fs.readFileSync(join(HERE, 'layout.json'), 'utf8'));
const U = 10, Y1 = 76; // svg units per km, top edge in km
const X = (x) => +(x * U).toFixed(1), Y = (y) => +((Y1 - y) * U).toFixed(1);
const pt = (p) => `${X(p[0])},${Y(p[1])}`;
const thin = (pts, step = 0.12) => { const o = [pts[0]]; for (const p of pts) if (Math.hypot(p[0] - o.at(-1)[0], p[1] - o.at(-1)[1]) >= step) o.push(p); o.push(pts.at(-1)); return o; };
const path = (pts) => 'M' + thin(pts).map(pt).join('L');
const slice = (id, a, b) => W[id].filter((p) => p[3] >= Math.min(a, b) - 1e-6 && p[3] <= Math.max(a, b) + 1e-6);
function climb(pts, reverse) {
  const q = reverse ? [...pts].reverse() : pts; let up = 0, last = q[0][2], lastD = q[0][3];
  for (const p of q) if (Math.abs(p[3] - lastD) >= 0.2) { up += Math.max(0, p[2] - last); last = p[2]; lastD = p[3]; }
  return up;
}
const end = (id, w) => (w === 'start' ? W[id][0] : w === 'end' ? W[id].at(-1) : W[id].find((p) => p[3] >= w));
function curve(c, i) {
  const [ax, ay, bx, by] = [c.a[0], c.a[1], c.b[0], c.b[1]];
  const mx = (ax + bx) / 2, my = (ay + by) / 2, len = Math.hypot(bx - ax, by - ay), s = (i % 2 ? 1 : -1) * 0.1 * len;
  const cx = mx + (-(by - ay) / len) * s, cy = my + ((bx - ax) / len) * s;
  return `M${pt(c.a)}Q${X(cx)},${Y(cy)} ${pt(c.b)}`;
}
const roads = connectors.map((c, i) => ({
  name: c.name, from: c.from, to: c.to, d: curve(c, i),
  km: Math.round(c.len * 2) / 2, dh: Math.round(c.dh / 10) * 10, grade: +(Math.abs(c.dh) / (c.len * 10)).toFixed(1),
}));
const routes = Object.keys(W).map((id) => ({ id, name: S[id].name, km: S[id].km, gain: S[id].gain, d: path(W[id]) }));

// loops: pieces are [route, fromKm, toKm] or a road name (ridden from→to, or 'rev')
const LOOPS = [
  { id: 'giants', name: 'The two giants', note: 'Großglockner up, over the High road, down the Stelvio, back along the valley.',
    pieces: [['grossglockner', 0, 99], 'High road', ['stelvio', 99, 0], ['Valley road east', 'rev'], ['Valley road west', 'rev']] },
  { id: 'danube', name: 'Danube and the Alpe', note: 'Prato down to the Danube, the Wachau to Melk, the gorge to Bourg, the 21 hairpins, the Col road back.',
    pieces: ['Down to the Danube', ['wachau', 22.3, 0], ['Danube gorge', 'rev'], ['alpe-dhuez', 0, 99], 'Col road', ['stelvio', 14.1, 0]] },
  { id: 'tramuntana', name: 'Tramuntana and the lakes', note: 'Up from Port de Pollença to the Coll dels Reis, over to the Wolfgangsee, round to Strobl, past the Gaisberg and down to the sea.',
    pieces: [['Coast road', 'rev'], 'Over to the lakes', ['wolfgangsee', 0, 13.9], 'Strobl to Gaisberg', 'Down to the sea'] },
  { id: 'city', name: 'Three cities', note: 'The Ring, Central Park and Bondi joined by new city streets.',
    pieces: ['Ring to the park', ['central-park', 0, 2.5], 'Park to Bondi', ['sydney', 15.6, 17.66], ['sydney', 0, 12.0], ['Ring to Bondi', 'rev'], ['vienna-ring', 2.8, 5.88]] },
];
const loops = LOOPS.map((l) => {
  let km = 0, up = 0; const ds = [];
  for (const p of l.pieces) {
    const [name, dir] = Array.isArray(p) && typeof p[1] === 'string' ? p : [p, 'fwd'];
    if (Array.isArray(p) && typeof p[1] === 'number') {
      const [id, a, b] = p; const max = S[id].km; const A = Math.min(a, max), B = Math.min(b, max);
      const pts = slice(id, A, B); km += Math.abs(B - A); up += climb(pts, B < A); ds.push(path(pts));
    } else {
      const r = roads.find((r) => r.name === name); km += r.km; up += Math.max(0, dir === 'rev' ? -r.dh : r.dh); ds.push(r.d);
    }
  }
  return { id: l.id, name: l.name, note: l.note, km: Math.round(km), up: Math.round(up / 50) * 50, d: ds };
});

// the Danube: hand-drawn outside the routes, along the Wachau's south-east bank inside it
const wa = W.wachau.filter((p) => p[3] >= 3.2);
const bank = wa.map((p, i) => { const q = wa[Math.min(i + 3, wa.length - 1)], o = wa[Math.max(i - 3, 0)]; const dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1; return [p[0] + (dy / l) * 0.35, p[1] - (dx / l) * 0.35]; });
const river = [path([...P.rivers[0].pts, ...bank, ...P.rivers[1].pts])];

const summits = [
  ['Coll dels Reis', end('sa-calobra', 'end')], ['Gaisberg', end('gaisberg', 'end')], ['Hochtor', end('grossglockner', 'end')],
  ['Kitzbüheler Horn', end('kitzbueheler-horn', 'end')], ['Passo dello Stelvio', end('stelvio', 'end')], ['Alpe d\'Huez', end('alpe-dhuez', 'end')],
  ['Mont Ventoux', end('ventoux', 'end')],
].map(([n, p]) => ({ name: n, x: X(p[0]), y: Y(p[1]), ele: Math.round(p[2]) }));
const towns = [
  ['Port de Sa Calobra', 'sa-calobra', 'start'], ['Port de Pollença', 'formentor', 'start'], ['Cap de Formentor', 'formentor', 'end'],
  ['St. Gilgen', 'wolfgangsee', 'start'], ['Strobl', 'wolfgangsee', 13.9], ['Fusch', 'grossglockner', 'start'], ['Kitzbühel', 'kitzbueheler-horn', 'start'],
  ['Prato', 'stelvio', 'start'], ['Bourg-d\'Oisans', 'alpe-dhuez', 'start'], ['Bédoin', 'ventoux', 'start'], ['Chalet Reynard', 'ventoux', 14.9],
  ['Melk', 'wachau', 'start'], ['Spitz', 'wachau', 22.3], ['Krems', 'wachau', 'end'], ['Weiden', 'neusiedler-see', 'start'],
].map(([n, id, w]) => { const p = end(id, w); return { name: n, x: X(p[0]), y: Y(p[1]), ele: Math.round(p[2]) }; });

const real = routes.reduce((s, r) => s + r.km, 0), made = roads.reduce((s, r) => s + r.km, 0);
export const M = { routes, roads, loops, river, summits, towns, real: Math.round(real), made: Math.round(made) };

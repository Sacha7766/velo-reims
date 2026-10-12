// Turnarounds for point-to-point presets: at each end the rider rides around a real loop of
// the road network (a summit loop, roundabout or block) and comes back, endlessly. Where OSM has
// no loop near the end, a turning circle is synthesised. Writes `turnEnd` / `turnStart`
// ([lon, lat] polylines from the end point around and back to it) into public/routes/<id>.json
// and trims dead-end spurs beyond the loop entry. A lead-in (scripts/bake-leadin.py) gets its own
// `leadIn.turnStart` at its first point.
//   node scripts/bake-turnarounds.mjs [id]
import { readFileSync, writeFileSync } from 'node:fs';

const DRIVABLE = new Set([
  'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'service', 'living_street',
  'road', 'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link',
]);
const SEARCH = 350; // metres from each end in which a loop may start
const NEAR = 10; // a graph node this close to the route counts as on it
const MIN_CYCLE = 60;
const MAX_CYCLE = 700;

const R = 6371008.8;
const rad = Math.PI / 180;

function proj(lat0) {
  const kx = Math.cos(lat0 * rad) * 111320;
  return {
    to: (lon, lat) => [lon * kx, lat * 111320],
    from: (x, y) => [x / kx, y / 111320],
  };
}

function cumulative(pts) {
  const c = [0];
  for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return c;
}

/** Project p onto a polyline: { s, dist, i, t }. */
function project(pts, cum, p) {
  let best = { s: 0, dist: Infinity, i: 0, t: 0 };
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i];
    const dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay;
    const L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L2));
    const d = Math.hypot(p[0] - ax - dx * t, p[1] - ay - dy * t);
    if (d < best.dist) best = { s: cum[i] + Math.sqrt(L2) * t, dist: d, i, t };
  }
  return best;
}

function buildGraph(elements, P) {
  const nodes = new Map(); // key → { p: [x, y], out: [{ to, len }] }
  const key = (g) => `${g.lat.toFixed(6)},${g.lon.toFixed(6)}`;
  const node = (g) => {
    const k = key(g);
    if (!nodes.has(k)) nodes.set(k, { k, p: P.to(g.lon, g.lat), out: [] });
    return nodes.get(k);
  };
  for (const el of elements) {
    const t = el.tags ?? {};
    if (el.type !== 'way' || !el.geometry || !DRIVABLE.has(t.highway)) continue;
    const oneway = t.oneway === 'yes' || t.oneway === '1' || t.junction === 'roundabout' || t.junction === 'circular';
    const reverse = t.oneway === '-1';
    for (let i = 0; i + 1 < el.geometry.length; i++) {
      const a = node(el.geometry[i]), b = node(el.geometry[i + 1]);
      const len = Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1]);
      if (!reverse) a.out.push({ to: b, len, oneway });
      if (!oneway || reverse) b.out.push({ to: a, len, oneway });
    }
  }
  return nodes;
}

/** Shortest simple cycle (no repeated nodes) through v within MAX_CYCLE, or null. */
function shortestCycle(v) {
  let best = null;
  const path = [v];
  const onPath = new Set([v.k]);
  let steps = 0;
  const dfs = (n, len) => {
    if (++steps > 200000) return;
    if (best && len >= best.len) return;
    for (const e of n.out) {
      const L = len + e.len;
      if (L > MAX_CYCLE || (best && L >= best.len)) continue;
      if (e.to === v) {
        if (path.length >= 3 && L >= MIN_CYCLE) best = { len: L, keys: [...path.map((x) => x.k), v.k] };
        continue;
      }
      if (onPath.has(e.to.k)) continue;
      // stay near the start of the search
      if (Math.hypot(e.to.p[0] - v.p[0], e.to.p[1] - v.p[1]) > MAX_CYCLE / 2) continue;
      onPath.add(e.to.k);
      path.push(e.to);
      dfs(e.to, L);
      path.pop();
      onPath.delete(e.to.k);
    }
  };
  dfs(v, 0);
  return best;
}

function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/** A turning circle ahead of the end point (keep right, turn left round it), local metres. */
function syntheticTurn(end, heading) {
  // local frame: f forward, l left
  const f = [Math.cos(heading), Math.sin(heading)];
  const l = [-f[1], f[0]];
  const ctrl = [[-5, 0], [0, 0], [5, -2.4], [12, -6], [19, -3.2], [21, 3], [16, 7.5], [9, 6.2], [4, 2.6], [0, 0], [-5, 0]];
  const world = ctrl.map(([a, b]) => [end[0] + f[0] * a + l[0] * b, end[1] + f[1] * a + l[1] * b]);
  // Catmull-Rom through the control points (the first/last are tangent helpers)
  const out = [];
  for (let i = 1; i < world.length - 2; i++) {
    const [p0, p1, p2, p3] = [world[i - 1], world[i], world[i + 1], world[i + 2]];
    for (let k = 0; k < 6; k++) {
      const t = k / 6, t2 = t * t, t3 = t2 * t;
      const c = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * t + (2 * a - 5 * b + 4 * cc - d) * t2 + (-a + 3 * b - 3 * cc + d) * t3);
      out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(end);
  return out;
}

function turnaround(coordsLL, elements, atEnd) {
  // work on the route in travel order towards this end
  const ll = atEnd ? coordsLL : [...coordsLL].reverse();
  const P = proj(ll[ll.length - 1][1]);
  const pts = ll.map((c) => P.to(c[0], c[1]));
  const cum = cumulative(pts);
  const L = cum[cum.length - 1];
  const graph = buildGraph(elements, P);
  // candidate entries: graph nodes on the route within SEARCH of this end, in travel order
  const cands = [];
  for (const n of graph.values()) {
    const pr = project(pts, cum, n.p);
    if (pr.dist <= NEAR && pr.s >= L - SEARCH && n.out.length) cands.push({ n, s: pr.s });
  }
  // the loop nearest the end wins; the rider joins it where the route first touches it
  cands.sort((a, b) => b.s - a.s);
  const MAX_TRIM = 150;
  for (const c of cands) {
    const cyc = shortestCycle(c.n);
    if (!cyc) continue;
    let entry = c, keys = cyc.keys, lastOn = c.s;
    for (const k of cyc.keys) {
      const n = graph.get(k);
      const pr = project(pts, cum, n.p);
      if (pr.dist <= NEAR && pr.s < entry.s) entry = { n, s: pr.s };
      if (pr.dist <= NEAR) lastOn = Math.max(lastOn, pr.s);
    }
    // road that is cut and NOT ridden as part of the loop (dead-end spur beyond it)
    if (L - lastOn > MAX_TRIM) continue;
    if (entry.n !== c.n) {
      // rotate the cycle so it starts and ends at the entry node
      const ring = cyc.keys.slice(0, -1);
      const i = ring.indexOf(entry.n.k);
      keys = [...ring.slice(i), ...ring.slice(0, i), entry.n.k];
    }
    const loop = keys.map((k) => graph.get(k).p);
    // two-way loops: ride them counter-clockwise (keep right, like a roundabout)
    const twoWay = keys.every((k, i) => i === 0 || graph.get(k).out.some((e) => e.to.k === keys[i - 1]));
    const ccw = signedArea(loop) > 0;
    const path = twoWay && !ccw ? [...loop].reverse() : loop;
    // trim the route at the entry (drops dead-end spurs beyond the loop)
    const pr = project(pts, cum, entry.n.p);
    const keep = ll.slice(0, pr.i + 1).concat([[...P.from(entry.n.p[0], entry.n.p[1]), ll[pr.i][2]]]);
    return {
      kind: `loop ${Math.round(cyc.len)} m, spur ${Math.round(L - lastOn)} m`,
      trimmedBy: Math.round(L - pr.s),
      coords: atEnd ? keep : keep.reverse(),
      turn: path.map((p) => P.from(p[0], p[1]).map((v) => Math.round(v * 1e6) / 1e6)),
    };
  }
  // no loop: synthetic turning circle
  const n = pts.length;
  const heading = Math.atan2(pts[n - 1][1] - pts[n - 3][1], pts[n - 1][0] - pts[n - 3][0]);
  const turn = syntheticTurn(pts[n - 1], heading).map((p) => P.from(p[0], p[1]).map((v) => Math.round(v * 1e6) / 1e6));
  return { kind: 'turning circle', trimmedBy: 0, coords: coordsLL, turn };
}

/**
 * A route that stops inside a tunnel (BRouter ends a climb at its highest sample, which on the
 * Großglockner is the middle of the Hochtor tunnel) runs on to the far portal and a few metres
 * beyond, so the turnaround lies in the open and the tunnel is ridden whole.
 */
function throughTunnel(coordsLL, elements) {
  const end = coordsLL[coordsLL.length - 1];
  const P = proj(end[1]);
  const e = P.to(end[0], end[1]);
  const prev = P.to(coordsLL[coordsLL.length - 2][0], coordsLL[coordsLL.length - 2][1]);
  for (const el of elements) {
    const t = el.tags ?? {};
    if (el.type !== 'way' || t.tunnel !== 'yes' || !DRIVABLE.has(t.highway) || !el.geometry || el.geometry.length < 2) continue;
    const g = el.geometry.map((p) => P.to(p.lon, p.lat));
    const cum = cumulative(g);
    const pr = project(g, cum, e);
    const len = cum[cum.length - 1];
    if (pr.dist > 15 || pr.s < 10 || pr.s > len - 10) continue;
    // ride on towards the portal the route was heading for
    const ahead = (g[pr.i + 1][0] - g[pr.i][0]) * (e[0] - prev[0]) + (g[pr.i + 1][1] - g[pr.i][1]) * (e[1] - prev[1]) > 0;
    const rest = ahead ? g.slice(pr.i + 1) : g.slice(0, pr.i + 1).reverse();
    const portal = rest[rest.length - 1];
    // and on along the road leaving that portal, ~70 m: the turnaround lies in the open
    const out = [...rest];
    const key = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
    const used = new Set([el]);
    let tip = portal, acc = 0;
    // OSM splits the road beyond a portal into short ways: follow them one after another
    while (acc < 70) {
      const next = elements.find((r) => {
        const rt = r.tags ?? {};
        if (used.has(r) || r.type !== 'way' || !DRIVABLE.has(rt.highway) || rt.tunnel === 'yes' || !r.geometry) return false;
        const a = r.geometry[0], b = r.geometry[r.geometry.length - 1];
        return key(P.to(a.lon, a.lat)) === key(tip) || key(P.to(b.lon, b.lat)) === key(tip);
      });
      if (!next) break;
      used.add(next);
      let rg = next.geometry.map((p) => P.to(p.lon, p.lat));
      if (key(rg[0]) !== key(tip)) rg = rg.reverse();
      for (let i = 1; i < rg.length && acc < 70; i++) {
        acc += Math.hypot(rg[i][0] - rg[i - 1][0], rg[i][1] - rg[i - 1][1]);
        out.push(rg[i]);
      }
      tip = rg[rg.length - 1];
    }
    // tunnels are near level: hold the end height (the lower hull smooths the profile)
    const ele = end[2];
    return [...coordsLL, ...out.map((p) => [...P.from(p[0], p[1]).map((v) => Math.round(v * 1e6) / 1e6), ele])];
  }
  return coordsLL;
}

/** OSM tunnel=yes road ways lying on the route → [from, to] metres along it. */
function tunnels(coordsLL, elements) {
  const P = proj(coordsLL[0][1]);
  const pts = coordsLL.map((c) => P.to(c[0], c[1]));
  const cum = cumulative(pts);
  const out = [];
  for (const el of elements) {
    const t = el.tags ?? {};
    if (el.type !== 'way' || t.tunnel !== 'yes' || !t.highway || !el.geometry) continue;
    const g = el.geometry;
    const a = project(pts, cum, P.to(g[0].lon, g[0].lat));
    const b = project(pts, cum, P.to(g[g.length - 1].lon, g[g.length - 1].lat));
    if (a.dist < 15 && b.dist < 15 && Math.abs(b.s - a.s) > 20) out.push([Math.round(Math.min(a.s, b.s)), Math.round(Math.max(a.s, b.s))]);
  }
  return out;
}

const index = JSON.parse(readFileSync('public/routes/index.json', 'utf8'));
const only = process.argv[2];
for (const { id } of index) {
  if (only && id !== only) continue;
  const file = `public/routes/${id}.json`;
  const route = JSON.parse(readFileSync(file, 'utf8'));
  if (route.loop) continue;
  let osm = [];
  try {
    osm = JSON.parse(readFileSync(`public/osm/${id}.json`, 'utf8'));
  } catch {
    /* no baked OSM: synthetic turns */
  }
  // undo a previous bake: work from the original coordinates when they were kept
  const coords = route.originalCoords ?? route.coords;
  const end = turnaround(throughTunnel(coords, osm), osm, true);
  const start = turnaround(end.coords, osm, false);
  route.originalCoords = coords;
  route.coords = start.coords;
  route.turnEnd = end.turn;
  route.turnStart = start.turn;
  route.tunnels = tunnels(route.coords, osm);
  let lead = '';
  if (route.leadIn) {
    const li = route.leadIn;
    const from = li.originalCoords ?? li.coords;
    const t = turnaround(from, osm, false);
    li.originalCoords = from;
    li.coords = t.coords;
    li.turnStart = t.turn;
    lead = `, lead-in start ${t.kind} (trimmed ${t.trimmedBy} m)`;
  }
  writeFileSync(file, JSON.stringify(route));
  console.log(`${id}: end ${end.kind} (trimmed ${end.trimmedBy} m), start ${start.kind} (trimmed ${start.trimmedBy} m)${lead}, tunnels ${JSON.stringify(route.tunnels)}`);
}

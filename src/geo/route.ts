// Route model: raw lon/lat polyline → evenly resampled, smoothed path in world space
// with DEM-derived elevation, gradient, heading and curvature.

import { DEM_MAX_Z, elevationAtMercSync, localDemCovers, preloadDemForPoints } from './elevation.ts';
import { lonLatToMerc, makeFrame, mercToWorld, type WorldFrame } from './mercator.ts';

export type RouteCategory = 'climb' | 'rolling' | 'flat' | 'city';

export interface RouteData {
  id: string;
  name: string;
  region?: string;
  category?: RouteCategory;
  /** Ends where it starts: ride laps instead of turning around. */
  loop?: boolean;
  source: 'brouter' | 'gpx' | 'drawn';
  /** [lon, lat, ele?] */
  coords: number[][];
  /** Tunnel spans [from, to] in metres along the route (from OSM tunnel=yes). */
  tunnels?: [number, number][];
}

export interface Route {
  id: string;
  name: string;
  region?: string;
  category: RouteCategory;
  loop: boolean;
  frame: WorldFrame;
  step: number; // metres between samples
  n: number;
  length: number;
  lon: Float64Array;
  lat: Float64Array;
  x: Float32Array;
  z: Float32Array;
  ele: Float32Array; // metres above sea level, smoothed
  grade: Float32Array; // percent
  heading: Float32Array; // radians, 0 = north (-Z), clockwise
  radius: Float32Array; // turn radius in metres (large on straights)
  gain: number;
  minEle: number;
  maxEle: number;
  /** World-space bounds [minX, minZ, maxX, maxZ]. */
  bounds: [number, number, number, number];
  /** Tunnel spans [from, to] in metres along the route. */
  tunnels: [number, number][];
}

export const ROUTE_STEP = 4;

function smooth(src: Float32Array, radius: number, passes = 1): Float32Array {
  let a = src;
  for (let p = 0; p < passes; p++) {
    const out = new Float32Array(a.length);
    let sum = 0;
    let count = 0;
    // running window, edges shrink symmetrically so endpoints stay put
    for (let i = 0; i < a.length; i++) {
      const r = Math.min(radius, i, a.length - 1 - i);
      sum = 0;
      count = 0;
      for (let j = i - r; j <= i + r; j++) {
        sum += a[j];
        count++;
      }
      out[i] = sum / count;
    }
    a = out;
  }
  return a;
}

export async function buildRoute(data: RouteData): Promise<Route> {
  const raw = data.coords.filter((c) => Number.isFinite(c[0]) && Number.isFinite(c[1]));
  if (raw.length < 2) throw new Error('Route needs at least two points');
  const frame = makeFrame(raw[0][0], raw[0][1]);

  // project + drop duplicates
  const px: number[] = [];
  const pz: number[] = [];
  const pe: number[] = [];
  for (const c of raw) {
    const [mx, my] = lonLatToMerc(c[0], c[1]);
    const [wx, wz] = mercToWorld(frame, mx, my);
    const last = px.length - 1;
    if (last >= 0 && Math.hypot(wx - px[last], wz - pz[last]) < 0.5) continue;
    px.push(wx);
    pz.push(wz);
    pe.push(c[2] ?? NaN);
  }
  const cum = [0];
  for (let i = 1; i < px.length; i++) cum.push(cum[i - 1] + Math.hypot(px[i] - px[i - 1], pz[i] - pz[i - 1]));
  const length = cum[cum.length - 1];
  const step = ROUTE_STEP;
  const n = Math.max(2, Math.floor(length / step) + 1);

  // resample evenly
  let x: Float32Array = new Float32Array(n);
  let z: Float32Array = new Float32Array(n);
  const gpxEle = new Float32Array(n);
  let seg = 0;
  for (let i = 0; i < n; i++) {
    const s = Math.min(i * step, length);
    while (seg < cum.length - 2 && cum[seg + 1] < s) seg++;
    const span = cum[seg + 1] - cum[seg] || 1;
    const t = (s - cum[seg]) / span;
    x[i] = px[seg] + (px[seg + 1] - px[seg]) * t;
    z[i] = pz[seg] + (pz[seg + 1] - pz[seg]) * t;
    gpxEle[i] = pe[seg] + (pe[seg + 1] - pe[seg]) * t;
  }
  // light planar smoothing removes GPS zig-zag but keeps hairpins
  x = smooth(x, 2, 2);
  z = smooth(z, 2, 2);

  const lon = new Float64Array(n);
  const lat = new Float64Array(n);
  const merc: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const mx = x[i] / frame.k + frame.mx0;
    const my = -z[i] / frame.k + frame.my0;
    merc.push([mx, my]);
    lon[i] = (mx / 6378137) * (180 / Math.PI);
    lat[i] = (2 * Math.atan(Math.exp(my / 6378137)) - Math.PI / 2) * (180 / Math.PI);
  }

  // elevation from the DEM (consistent with the rendered terrain), GPX as fallback
  // high-resolution local DEM bakes are used at full zoom
  const demZ = (await localDemCovers(merc, DEM_MAX_Z)) ? DEM_MAX_Z : Math.min(DEM_MAX_Z - 1, 14);
  await preloadDemForPoints(merc, demZ);
  let ele: Float32Array = new Float32Array(n);
  let missing = 0;
  for (let i = 0; i < n; i++) {
    const h = elevationAtMercSync(merc[i][0], merc[i][1], demZ);
    if (Number.isFinite(h)) ele[i] = h;
    else {
      ele[i] = gpxEle[i];
      missing++;
    }
  }
  if (missing === n && !Number.isFinite(gpxEle[0])) ele.fill(0);
  // tunnels: the DEM is the mountain above; the road runs straight between the portals
  const tunnels = (data.tunnels ?? []).map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number]);
  for (const [a, b] of tunnels) {
    const i0 = Math.max(0, Math.floor(a / step) - 2);
    const i1 = Math.min(n - 1, Math.ceil(b / step) + 2);
    for (let i = i0 + 1; i < i1; i++) ele[i] = ele[i0] + ((ele[i1] - ele[i0]) * (i - i0)) / (i1 - i0);
  }
  // DEM on steep hillsides is noisy where the road is cut in; smooth over ~±60 m
  ele = smooth(ele, Math.round(30 / step), 3);

  const grade = new Float32Array(n);
  const gw = Math.round(20 / step);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - gw);
    const b = Math.min(n - 1, i + gw);
    const g = ((ele[b] - ele[a]) / ((b - a) * step || 1)) * 100;
    grade[i] = Math.max(-25, Math.min(25, g));
  }

  const heading = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1);
    const b = Math.min(n - 1, i + 1);
    heading[i] = Math.atan2(x[b] - x[a], -(z[b] - z[a]));
  }
  const radius = new Float32Array(n);
  const rw = Math.round(8 / step);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - rw);
    const b = Math.min(n - 1, i + rw);
    let d = heading[b] - heading[a];
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const arc = (b - a) * step;
    radius[i] = Math.abs(d) < 1e-4 ? 1e4 : Math.min(1e4, arc / Math.abs(d));
  }

  let gain = 0;
  let minEle = Infinity;
  let maxEle = -Infinity;
  let ref = ele[0];
  for (let i = 0; i < n; i++) {
    minEle = Math.min(minEle, ele[i]);
    maxEle = Math.max(maxEle, ele[i]);
    if (ele[i] > ref + 1) {
      gain += ele[i] - ref;
      ref = ele[i];
    } else if (ele[i] < ref - 1) ref = ele[i];
  }

  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, x[i]);
    maxX = Math.max(maxX, x[i]);
    minZ = Math.min(minZ, z[i]);
    maxZ = Math.max(maxZ, z[i]);
  }

  return {
    id: data.id,
    name: data.name,
    region: data.region,
    category: data.category ?? inferCategory(gain, (n - 1) * step, maxEle - minEle),
    loop: data.loop ?? false,
    frame,
    step,
    n,
    length: (n - 1) * step,
    lon,
    lat,
    x,
    z,
    ele,
    grade,
    heading,
    radius,
    gain,
    minEle,
    maxEle,
    bounds: [minX, minZ, maxX, maxZ],
    tunnels,
  };
}

export interface RoutePoint {
  x: number;
  z: number;
  ele: number;
  grade: number;
  heading: number;
  radius: number;
  lon: number;
  lat: number;
}

function inferCategory(gain: number, length: number, range: number): RouteCategory {
  const perKm = gain / Math.max(length / 1000, 0.1);
  if (range > 350 && perKm > 35) return 'climb';
  if (perKm > 12) return 'rolling';
  return 'flat';
}

/** Interpolated route state at distance s (clamped, or wrapped on loops). */
export function pointAt(r: Route, s: number, out: Partial<RoutePoint> = {}): RoutePoint {
  if (r.loop) s = ((s % r.length) + r.length) % r.length;
  const f = Math.min(Math.max(s / r.step, 0), r.n - 1.0001);
  const i = Math.floor(f);
  const t = f - i;
  const lerp = (a: ArrayLike<number>) => a[i] + (a[i + 1] - a[i]) * t;
  let dh = r.heading[i + 1] - r.heading[i];
  dh = Math.atan2(Math.sin(dh), Math.cos(dh));
  out.x = lerp(r.x);
  out.z = lerp(r.z);
  out.ele = lerp(r.ele);
  out.grade = lerp(r.grade);
  out.heading = r.heading[i] + dh * t;
  out.radius = lerp(r.radius);
  out.lon = lerp(r.lon);
  out.lat = lerp(r.lat);
  return out as RoutePoint;
}

/** Spatial hash over route samples for fast nearest-distance queries. */
export class RouteIndex {
  private cell: number;
  private grid = new Map<number, number[]>();
  private route: Route;

  constructor(route: Route, cell = 40) {
    this.route = route;
    this.cell = cell;
    for (let i = 0; i < route.n; i++) {
      const k = this.key(Math.floor(route.x[i] / cell), Math.floor(route.z[i] / cell));
      let list = this.grid.get(k);
      if (!list) this.grid.set(k, (list = []));
      list.push(i);
    }
  }

  private key(cx: number, cz: number) {
    return (cx + 32768) * 65536 + (cz + 32768);
  }

  /** Nearest point on the route: sample index, distance, and fractional index along the polyline. */
  nearest(x: number, z: number, maxDist: number): { index: number; dist: number; f: number } {
    const r = this.route;
    const c = this.cell;
    const reach = Math.ceil(maxDist / c);
    const cx = Math.floor(x / c);
    const cz = Math.floor(z / c);
    let best = -1;
    let bestD = maxDist * maxDist;
    for (let dz = -reach; dz <= reach; dz++) {
      for (let dx = -reach; dx <= reach; dx++) {
        const list = this.grid.get(this.key(cx + dx, cz + dz));
        if (!list) continue;
        for (const i of list) {
          const ddx = r.x[i] - x;
          const ddz = r.z[i] - z;
          const d = ddx * ddx + ddz * ddz;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
      }
    }
    if (best < 0) return { index: -1, dist: Infinity, f: -1 };
    // refine against the neighbouring segments
    let dist = Math.sqrt(bestD);
    let f = best;
    for (const j of [best - 1, best]) {
      if (j < 0 || j + 1 >= r.n) continue;
      const ax = r.x[j], az = r.z[j];
      const bx = r.x[j + 1] - ax, bz = r.z[j + 1] - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz || 1)));
      const d = Math.hypot(x - ax - bx * t, z - az - bz * t);
      if (d < dist) {
        dist = d;
        f = j + t;
      }
    }
    return { index: best, dist, f };
  }

  /** Route elevation at a fractional sample index. */
  eleAt(f: number): number {
    const r = this.route;
    const i = Math.min(Math.max(Math.floor(f), 0), r.n - 2);
    const t = Math.min(Math.max(f - i, 0), 1);
    return r.ele[i] + (r.ele[i + 1] - r.ele[i]) * t;
  }
}

/** Distances (m) of hairpin bends: ≥135° of turning within ~60 m. */
export function findHairpins(r: Route): number[] {
  const out: number[] = [];
  const w = Math.round(30 / r.step);
  let i = w;
  while (i < r.n - w) {
    let acc = 0;
    for (let j = i - w; j < i + w; j++) {
      let s = r.heading[j + 1] - r.heading[j];
      s = Math.atan2(Math.sin(s), Math.cos(s));
      acc += s;
    }
    if (Math.abs(acc) > 2.35) {
      out.push(i * r.step);
      i += w * 2;
    } else i++;
  }
  return out;
}

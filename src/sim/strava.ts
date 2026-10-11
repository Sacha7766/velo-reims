// Pure Strava helpers shared by the dev server and the app: time parsing, projecting a
// segment onto a route polyline, and the constant power that finishes a segment in a given time.
// Segment data comes from the official Strava API only (see server/strava.ts).

import { stepSpeed, type PhysicsParams } from './physics.ts';

/** A Strava segment that lies on a preset route, as served by /api/strava/segments. */
export interface StravaSegment {
  id: number;
  name: string;
  distance: number; // m
  averageGrade: number; // %
  kom: number | null; // seconds
  qom: number | null;
  prSeconds: number | null;
  prDate: string | null;
  effortCount: number | null;
  /** Metres along the route. */
  startS: number;
  endS: number;
}

/** "17:52" / "1:02:03" / "52" (also "52s") to seconds; null when it is not a time. */
export function parseStravaTime(text: string | null | undefined): number | null {
  if (!text) return null;
  const clean = text.trim().replace(/s$/, '');
  if (!/^\d+(:\d{1,2}){0,2}$/.test(clean)) return null;
  const parts = clean.split(':').map(Number);
  if (parts.length > 1 && parts.slice(1).some((x) => x > 59)) return null;
  return parts.reduce((acc, x) => acc * 60 + x, 0);
}

const R = 6371008.8;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in metres between two lon/lat points. */
export function haversine(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Cumulative haversine distance along a [lon, lat] polyline. The app's route is resampled and
 * smoothed (src/geo/route.ts), so these raw-coordinate distances differ from it by a fraction of a percent. */
export function cumulativeDistances(coords: number[][]): number[] {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + haversine(coords[i - 1][0], coords[i - 1][1], coords[i][0], coords[i][1]));
  return cum;
}

/** Closest point of a polyline to a lon/lat: metres along the line and the distance from it. */
export function projectOnRoute(coords: number[][], cum: number[], lon: number, lat: number): { s: number; dist: number } {
  let best = { s: 0, dist: Infinity };
  const kx = Math.cos(rad(lat)) * rad(1) * R; // metres per degree lon here
  const ky = rad(1) * R;
  for (let i = 0; i + 1 < coords.length; i++) {
    const ax = (coords[i][0] - lon) * kx;
    const ay = (coords[i][1] - lat) * ky;
    const bx = (coords[i + 1][0] - lon) * kx;
    const by = (coords[i + 1][1] - lat) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const f = len2 > 0 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / len2)) : 0;
    const dist = Math.hypot(ax + dx * f, ay + dy * f);
    if (dist < best.dist) best = { s: cum[i] + (cum[i + 1] - cum[i]) * f, dist };
  }
  return best;
}

/** The route's elevation profile on a regular grid (a Route satisfies this). */
export interface RouteProfile {
  step: number;
  n: number;
  grade: ArrayLike<number>;
  ele: ArrayLike<number>;
}

function sample(a: ArrayLike<number>, s: number, step: number): number {
  const x = Math.min(Math.max(s / step, 0), a.length - 1);
  const i = Math.floor(x);
  const j = Math.min(i + 1, a.length - 1);
  return a[i] + (a[j] - a[i]) * (x - i);
}

/** Speed (m/s) a segment pacer sets off with, and the one the constant-power estimate assumes. */
export const PACER_START_SPEED = 3;

/** Time in seconds a constant power needs for the stretch start..end of the route (Infinity if never). */
export function segmentTime(profile: RouteProfile, start: number, end: number, power: number, p: PhysicsParams, dt = 0.25): number {
  let s = start;
  let v = PACER_START_SPEED;
  let t = 0;
  while (s < end) {
    v = stepSpeed(v, power, sample(profile.grade, s, profile.step), sample(profile.ele, s, profile.step), dt, p);
    s += v * dt;
    t += dt;
    if (t > 4 * 3600) return Infinity;
  }
  return t;
}

/** Constant power (W) that covers start..end in `target` seconds, by bisection; null when out of reach (above 2500 W). */
export function constantPowerForTime(profile: RouteProfile, start: number, end: number, target: number, p: PhysicsParams): number | null {
  if (!(target > 0) || end <= start) return null;
  let lo = 20;
  let hi = 2500;
  if (segmentTime(profile, start, end, hi, p) > target) return null;
  if (segmentTime(profile, start, end, lo, p) <= target) return lo;
  for (let i = 0; i < 40 && hi - lo > 0.05; i++) {
    const mid = (lo + hi) / 2;
    if (segmentTime(profile, start, end, mid, p) > target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// The point of the selected route the pointer is on, shared by its profile and its map: moving over either marks the
// same place on both. A distance along the route in metres, or null.

import { useSyncExternalStore } from 'react';
import type { RouteEntry } from './shared.tsx';

let at: number | null = null;
const subs = new Set<() => void>();

export function setHover(d: number | null) {
  if (d === at) return;
  at = d;
  subs.forEach((f) => f());
}

export function useHover(): number | null {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => at,
  );
}

export interface HoverPoint {
  /** Index of the route point nearest the distance. */
  i: number;
  lon: number;
  lat: number;
  ele: number;
  /** Gradient in percent over about 150 m round the point. */
  grade: number;
  /** Distance along the route, km. */
  km: number;
}

/** Where on the route a distance is, with its height and gradient. */
export function hoverPoint(entry: RouteEntry, d: number): HoverPoint {
  const { dist, ele } = entry.profile;
  const n = dist.length;
  const nearest = (v: number) => {
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (dist[m] < v) lo = m;
      else hi = m;
    }
    return v - dist[lo] <= dist[hi] - v ? lo : hi;
  };
  const i = nearest(d);
  const a = nearest(d - 75);
  const b = nearest(d + 75);
  const c = entry.data.coords[Math.min(i, entry.data.coords.length - 1)];
  return { i, lon: c[0], lat: c[1], ele: ele[i], grade: dist[b] > dist[a] ? ((ele[b] - ele[a]) / (dist[b] - dist[a])) * 100 : 0, km: dist[i] / 1000 };
}

/** "12.3 km · 145 m · 4.2 %" */
export function hoverText(p: HoverPoint): string {
  return `${p.km.toFixed(1)} km · ${Math.round(p.ele)} m · ${p.grade.toFixed(1)} %`;
}

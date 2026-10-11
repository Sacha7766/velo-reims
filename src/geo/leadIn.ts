// Lead-ins (scripts/bake-leadin.py): an easy approach on real roads before a preset route, like
// Zwift's. The lead-in replaces the route up to the point where it joins it, so the rider arrives
// on the road the locals take; the route's own segments and the climb start at the join.

import { haversine } from './mercator.ts';
import type { RouteData } from './route.ts';

function pathLength(c: number[][]): number {
  let m = 0;
  for (let i = 1; i < c.length; i++) m += haversine(c[i - 1][0], c[i - 1][1], c[i][0], c[i][1]);
  return m;
}

/** Length of a route's lead-in in metres, 0 without one. */
export function leadInLength(data: RouteData): number {
  return data.leadIn && data.leadIn.coords.length > 1 ? pathLength(data.leadIn.coords) : 0;
}

/** The route with its lead-in in front of it (unchanged when it has none). */
export function withLeadIn(data: RouteData): RouteData {
  const li = data.leadIn;
  if (!li || li.coords.length < 2 || data.loop) return data;
  const cut = pathLength(data.coords.slice(0, li.join + 1));
  const lead = pathLength(li.coords);
  return {
    ...data,
    coords: [...li.coords, ...data.coords.slice(li.join + 1)],
    turnStart: li.turnStart,
    tunnels: data.tunnels?.filter(([a]) => a >= cut).map(([a, b]) => [a - cut + lead, b - cut + lead] as [number, number]),
    leadIn: undefined,
    climbFrom: { index: li.coords.length - 1, name: li.name, cut },
  };
}

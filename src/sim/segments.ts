// Auto-detected timed segments on a route: the full climb, its steepest kilometre,
// and on rolling/flat routes the notable hills and a sprint straight.

import type { Route } from '../geo/route.ts';
import type { StravaSegment } from './strava.ts';

export interface Segment {
  id: string;
  name: string;
  start: number; // m
  end: number; // m
  kind: 'climb' | 'steep' | 'hill' | 'sprint' | 'strava';
  avgGrade: number;
  /** Strava segments: record times in seconds, from the official API. */
  strava?: { id: number; kom: number | null; qom: number | null; pr: number | null };
}

/** Timed segments from Strava (preset routes), ready to merge into a ride's segment list. */
export function stravaToSegments(list: StravaSegment[]): Segment[] {
  return list.map((g) => ({
    id: `strava-${g.id}`,
    name: g.name,
    start: g.startS,
    end: g.endS,
    kind: 'strava',
    avgGrade: g.averageGrade,
    strava: { id: g.id, kom: g.kom, qom: g.qom, pr: g.prSeconds },
  }));
}

function avgGrade(r: Route, a: number, b: number): number {
  const i = Math.round(a / r.step);
  const j = Math.min(r.n - 1, Math.round(b / r.step));
  return ((r.ele[j] - r.ele[i]) / Math.max(b - a, 1)) * 100;
}

export function findSegments(r: Route): Segment[] {
  const out: Segment[] = [];
  const L = r.length;
  if (r.category === 'climb') {
    // after a lead-in the climb starts where it joins, a little further up: its own record
    const a0 = r.leadIn;
    const id = a0 > 0 ? 'climb' : 'full';
    out.push({ id, name: `${r.name} climb`, start: a0, end: L, kind: 'climb', avgGrade: avgGrade(r, a0, L) });
    if (L - a0 > 2500) {
      let best = a0;
      let bestG = -Infinity;
      for (let a = a0; a + 1000 <= L; a += 50) {
        const g = avgGrade(r, a, a + 1000);
        if (g > bestG) {
          bestG = g;
          best = a;
        }
      }
      out.push({ id: 'steep-km', name: 'Steepest kilometre', start: best, end: best + 1000, kind: 'steep', avgGrade: bestG });
    }
    return out;
  }
  // hills: grow windows while the smoothed grade stays uphill
  const step = r.step;
  let i = 0;
  let hills = 0;
  while (i < r.n - 1 && hills < 3) {
    if (r.grade[i] < 2.5) {
      i++;
      continue;
    }
    let j = i;
    let dips = 0;
    while (j < r.n - 1 && (r.grade[j] > 1 || (dips += step) < 80)) {
      if (r.grade[j] > 1) dips = 0;
      j++;
    }
    const a = i * step;
    const b = j * step;
    const g = avgGrade(r, a, b);
    if (b - a >= 500 && g >= 3) {
      hills++;
      out.push({ id: `hill-${hills}`, name: `Hill at km ${(a / 1000).toFixed(1)}`, start: a, end: b, kind: 'hill', avgGrade: g });
    }
    i = j + 1;
  }
  // sprint: the flattest straight 400 m in the second half
  let bestA = -1;
  let bestScore = Infinity;
  for (let a = L * 0.45; a + 400 <= L - 50; a += 20) {
    const ia = Math.round(a / step);
    const ib = Math.round((a + 400) / step);
    let score = 0;
    for (let k = ia; k <= ib; k++) score += Math.abs(r.grade[k]) + (r.radius[k] < 150 ? 4 : 0);
    if (score < bestScore) {
      bestScore = score;
      bestA = a;
    }
  }
  if (bestA >= 0 && bestScore / (400 / step) < 2.5) {
    out.push({ id: 'sprint', name: 'Sprint', start: bestA, end: bestA + 400, kind: 'sprint', avgGrade: avgGrade(r, bestA, bestA + 400) });
  }
  return out.sort((x, y) => x.start - y.start);
}

export interface SegmentEffort {
  id: string;
  time: number;
  power: number;
}

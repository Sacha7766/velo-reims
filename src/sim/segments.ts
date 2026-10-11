// Auto-detected timed segments on a route: the full climb, its steepest kilometre,
// and on rolling/flat routes the notable hills and a sprint straight.

import type { Route } from '../geo/route.ts';

export interface Segment {
  id: string;
  name: string;
  start: number; // m
  end: number; // m
  kind: 'climb' | 'steep' | 'hill' | 'sprint';
  avgGrade: number;
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
    out.push({ id: 'full', name: `${r.name} climb`, start: 0, end: L, kind: 'climb', avgGrade: avgGrade(r, 0, L) });
    if (L > 2500) {
      let best = 0;
      let bestG = -Infinity;
      for (let a = 0; a + 1000 <= L; a += 50) {
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

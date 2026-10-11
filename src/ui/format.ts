export { fmtTime } from '../sim/session.ts';

export const GRADE_STOPS: [number, string][] = [
  [-100, 'var(--down)'],
  [0, 'var(--g0)'],
  [3, 'var(--g1)'],
  [6, 'var(--g2)'],
  [9, 'var(--g3)'],
  [12, 'var(--g4)'],
];

const GRADE_HEX: [number, string][] = [
  [-100, '#6fa8c7'],
  [0, '#7bc47f'],
  [3, '#f4d35e'],
  [6, '#f39237'],
  [9, '#d63f2f'],
  [12, '#7a1f45'],
];

export function gradeColor(g: number): string {
  let c = GRADE_HEX[0][1];
  for (const [t, col] of GRADE_HEX) if (g >= t) c = col;
  return c;
}

export const ZONE_HEX = ['#8fa3ad', '#5fa8d3', '#7bc47f', '#f4d35e', '#f39237', '#d63f2f', '#9b3fd6'];

export function zoneColor(fraction: number): string {
  const z = fraction < 0.55 ? 0 : fraction < 0.76 ? 1 : fraction < 0.9 ? 2 : fraction < 1.05 ? 3 : fraction < 1.2 ? 4 : fraction < 1.5 ? 5 : 6;
  return ZONE_HEX[z];
}

export const km = (m: number, digits = 1) => (m / 1000).toFixed(digits);
export const int = (n: number) => Math.round(n).toLocaleString('de-AT');

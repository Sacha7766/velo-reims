import { buildWorkout } from '../workouts/metrics.ts';
import type { Workout, WorkoutMessage, WorkoutStep } from '../workouts/types.ts';

export const RAMP_TEST_ID = 'ramp-test';

const round5 = (x: number) => Math.round(x / 5) * 5;
const STEPS = 40;

export function buildRampTest(ftp: number): Workout {
  const f = Math.max(50, ftp);
  const first = round5(0.5 * f);
  const inc = Math.max(5, round5(0.06 * f));
  const steps: WorkoutStep[] = [
    { kind: 'warmup', duration: 300, start: 0.4, end: 0.55, label: 'Warm up' },
    { kind: 'steady', duration: 120, start: 0.5, end: 0.5, label: 'Easy' },
  ];
  for (let i = 0; i < STEPS; i++) {
    const frac = (first + i * inc) / f;
    steps.push({ kind: 'steady', duration: 60, start: frac, end: frac, label: `Step ${i + 1}` });
  }
  const t0 = 420;
  const say = (min: number, text: string, duration?: number): WorkoutMessage => ({ at: t0 + min * 60, text, ...(duration ? { duration } : {}) });
  const messages: WorkoutMessage[] = [
    { at: 10, text: 'Ramp test. Every minute the target rises. Go until you cannot hold it.' },
    { at: 150, text: 'Loosen up. The real work starts in a few minutes.' },
    { at: 300 + 15, text: 'Stay seated and relaxed through the warm-up.' },
    { at: 420 - 15, text: 'Steps begin now. Hold cadence above 80.' },
    say(3, 'Hold cadence above 80.'),
    say(8, 'Smooth and steady. Breathe.'),
    say(12, 'It gets hard from here. Stay with it.'),
    say(16, 'Keep your cadence up. Do not slow the pedals.'),
    say(20, 'Go until you cannot hold the target.'),
    say(24, 'Dig in. Every minute counts.'),
    say(28, 'Almost nobody gets here. Keep going.'),
  ];
  return buildWorkout({
    id: RAMP_TEST_ID,
    name: 'FTP ramp test',
    description: `Warm up, then a step every minute from ${first} W, rising ${inc} W each step. Ride until you cannot hold the target; your FTP is 75 % of your best minute.`,
    author: 'Serpentine',
    category: 'custom',
    steps,
    messages,
    source: 'builtin',
  });
}

/** FTP estimate: 75 % of the best 60 s average power, in whole watts. */
export function ftpFromRamp(power1Hz: number[]): number {
  const n = power1Hz.length;
  if (n === 0) return 0;
  const w = Math.min(60, n);
  let sum = 0;
  let best = 0;
  for (let i = 0; i < n; i++) {
    sum += power1Hz[i] || 0;
    if (i >= w) sum -= power1Hz[i - w] || 0;
    if (i >= w - 1) best = Math.max(best, sum / w);
  }
  return Math.round(0.75 * best);
}

export interface RampSample {
  power: number;
  cadence: number;
  target: number | null;
}

/** True when cadence is under 50 rpm for 5+ s in a row, or power under 70 % of target for 10+ s in a row. */
export function rampFailure(window: RampSample[]): boolean {
  let lowCad = 0;
  let lowPow = 0;
  for (const s of window) {
    lowCad = s.cadence < 50 ? lowCad + 1 : 0;
    lowPow = s.target !== null && s.power < 0.7 * s.target ? lowPow + 1 : 0;
    if (lowCad >= 5 || lowPow >= 10) return true;
  }
  return false;
}

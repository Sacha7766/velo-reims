import type { Workout, WorkoutStep } from './types.ts';

/** Effective start/end FTP fractions of a step (free ride and max effort have fixed nominal levels). */
export function stepLevels(s: WorkoutStep): [number, number] {
  if (s.kind === 'free') return [0.6, 0.6];
  if (s.kind === 'maxeffort') return [1.2, 1.2];
  return [s.start, s.end];
}

export function computeIntensity(steps: WorkoutStep[]): { tss: number; intensityFactor: number; duration: number } {
  let total = 0;
  let acc = 0;
  for (const s of steps) {
    if (s.duration <= 0) continue;
    const [a, b] = stepLevels(s);
    // integral of f^4 over a linear ramp a->b, per unit time
    const mean4 = Math.abs(b - a) < 1e-9 ? a ** 4 : (b ** 5 - a ** 5) / (5 * (b - a));
    acc += mean4 * s.duration;
    total += s.duration;
  }
  if (total === 0) return { tss: 0, intensityFactor: 0, duration: 0 };
  const intensityFactor = (acc / total) ** 0.25;
  const tss = (total / 3600) * intensityFactor ** 2 * 100;
  return { tss, intensityFactor, duration: total };
}

type WorkoutInput = Pick<Workout, 'id' | 'name' | 'steps'> & Partial<Omit<Workout, 'id' | 'name' | 'steps'>>;

export function buildWorkout(partial: WorkoutInput): Workout {
  const m = computeIntensity(partial.steps);
  return {
    category: 'custom',
    messages: [],
    source: 'builtin',
    ...partial,
    duration: m.duration,
    tss: Math.round(m.tss * 10) / 10,
    intensityFactor: Math.round(m.intensityFactor * 1000) / 1000,
  };
}

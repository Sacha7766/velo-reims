import type { Workout, WorkoutState } from './types.ts';
import { stepLevels } from './metrics.ts';

export function zoneOf(fraction: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  if (fraction < 0.55) return 1;
  if (fraction < 0.76) return 2;
  if (fraction < 0.9) return 3;
  if (fraction < 1.05) return 4;
  if (fraction < 1.2) return 5;
  if (fraction < 1.5) return 6;
  return 7;
}

export function stateAt(w: Workout, elapsed: number, ftp: number): WorkoutState {
  const steps = w.steps;
  const t = Math.max(0, elapsed);
  const done = t >= w.duration;
  let idx = steps.length - 1;
  let stepStart = 0;
  if (!done) {
    let acc = 0;
    for (let i = 0; i < steps.length; i++) {
      if (t < acc + steps[i].duration) {
        idx = i;
        stepStart = acc;
        break;
      }
      acc += steps[i].duration;
    }
  } else {
    stepStart = steps.slice(0, idx).reduce((a, s) => a + s.duration, 0);
  }
  const step = steps[idx];
  const stepElapsed = done ? step.duration : Math.min(step.duration, t - stepStart);
  const stepRemaining = done ? 0 : Math.max(0, step.duration - stepElapsed);

  let targetFraction: number | null = null;
  if (step.kind !== 'free' && step.kind !== 'maxeffort') {
    const [a, b] = stepLevels(step);
    targetFraction = step.duration > 0 ? a + ((b - a) * stepElapsed) / step.duration : b;
  }

  let message: string | undefined;
  let best = -Infinity;
  for (const m of w.messages) {
    const end = m.at + (m.duration ?? 8);
    if (t >= m.at && t < end && m.at >= best) {
      best = m.at;
      message = m.text;
    }
  }

  return {
    elapsed: t,
    stepIndex: idx,
    step,
    stepElapsed,
    stepRemaining,
    target: targetFraction === null ? null : Math.round(targetFraction * ftp),
    targetFraction,
    next: steps[idx + 1],
    done,
    message: done ? undefined : message,
  };
}

/** Breakpoints for drawing the workout chart; each step contributes its start and end point. */
export function powerProfile(w: Workout): { t: number; f: number }[] {
  const pts: { t: number; f: number }[] = [];
  let t = 0;
  for (const s of w.steps) {
    const [a, b] = stepLevels(s);
    pts.push({ t, f: a });
    t += s.duration;
    pts.push({ t, f: b });
  }
  return pts;
}

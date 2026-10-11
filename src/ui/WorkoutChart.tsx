import { stepLevels } from '../workouts/metrics.ts';
import type { Workout } from '../workouts/types.ts';
import { zoneColor } from './format.ts';

/** Interval bars, height = intensity, coloured by power zone. */
export function WorkoutChart({ workout, elapsed, height = 56, compact = false }: { workout: Workout; elapsed?: number; height?: number; compact?: boolean }) {
  const total = workout.duration || 1;
  const maxF = Math.max(1.3, ...workout.steps.map((s) => Math.max(...stepLevels(s))));
  let t = 0;
  const bars = workout.steps.map((s, i) => {
    const [a, b] = stepLevels(s);
    const x = (t / total) * 100;
    const w = (s.duration / total) * 100;
    t += s.duration;
    const ya = 100 - (a / maxF) * 100;
    const yb = 100 - (b / maxF) * 100;
    const free = s.kind === 'free';
    return (
      <path
        key={i}
        d={`M${x},100 L${x},${ya} L${x + w},${yb} L${x + w},100 Z`}
        fill={free ? 'rgba(143,163,173,0.35)' : zoneColor((a + b) / 2)}
        stroke="rgba(13,27,36,0.6)"
        strokeWidth={compact ? 0 : 0.15}
        vectorEffect="non-scaling-stroke"
      />
    );
  });
  const ftpY = 100 - (1 / maxF) * 100;
  return (
    <svg className="workout-chart" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }} aria-hidden>
      {bars}
      {!compact && <line x1="0" x2="100" y1={ftpY} y2={ftpY} stroke="rgba(238,243,244,0.45)" strokeDasharray="0.6 0.8" vectorEffect="non-scaling-stroke" />}
      {elapsed !== undefined && (
        <>
          <rect x="0" y="0" width={(Math.min(elapsed, total) / total) * 100} height="100" fill="rgba(13,27,36,0.55)" />
          <line x1={(Math.min(elapsed, total) / total) * 100} x2={(Math.min(elapsed, total) / total) * 100} y1="0" y2="100" stroke="#ffc93c" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </>
      )}
    </svg>
  );
}

import { useMemo, useState } from 'react';
import type { Workout } from '../../workouts/types.ts';
import { zoneOf } from '../../workouts/player.ts';
import { stepLevels } from '../../workouts/metrics.ts';
import { ZONE_HEX } from '../format.ts';
import { WorkoutChart } from '../WorkoutChart.tsx';
import { RAMP_TEST_ID } from '../../training/rampTest.ts';
import { LENGTHS, WORKOUT_GROUPS, workoutMeta, type LengthId } from './shared.tsx';

const TYPES = [{ id: 'all', label: 'All types' }, ...WORKOUT_GROUPS.filter((g) => g.id !== 'other').map((g) => ({ id: g.id, label: g.label }))];

export function WorkoutList({
  workouts,
  selectedId,
  onSelect,
}: {
  workouts: Workout[];
  selectedId: string | null;
  onSelect: (w: Workout) => void;
}) {
  const [length, setLength] = useState<LengthId>('any');
  const [type, setType] = useState('all');
  const [q, setQ] = useState('');
  const groups = useMemo(() => {
    const range = LENGTHS.find((l) => l.id === length)!;
    const needle = q.trim().toLowerCase();
    const fits = workouts.filter(
      (w) =>
        w.duration / 60 >= range.min &&
        w.duration / 60 < range.max &&
        (!needle || w.name.toLowerCase().includes(needle) || (w.description ?? '').toLowerCase().includes(needle)),
    );
    return WORKOUT_GROUPS.filter((g) => type === 'all' || g.id === type)
      .map((g) => ({ ...g, items: fits.filter(g.match).sort((a, b) => a.duration - b.duration) }))
      .filter((g) => g.items.length);
  }, [workouts, length, type, q]);

  return (
    <div className="wl">
      <div className="wl-filters">
        <input className="wl-search" placeholder="Search workouts" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search workouts" />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Workout type">
          {TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <div className="segmented small" role="radiogroup" aria-label="Workout length">
          {LENGTHS.map((l) => (
            <button key={l.id} role="radio" aria-checked={length === l.id} className={length === l.id ? 'on' : ''} onClick={() => setLength(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="wl-groups">
        {groups.map((g) => (
          <section key={g.id} className="w-group">
            <h3>{g.label}</h3>
            <ul className="workout-list">
              {g.items.map((w) => (
                <li key={w.id}>
                  <button className={`workout ${selectedId === w.id ? 'on' : ''}`} onClick={() => onSelect(w)}>
                    <span className="w-name">{w.name}</span>
                    <span className="w-meta">{workoutMeta(w)}</span>
                    <WorkoutChart workout={w} height={18} compact />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {groups.length === 0 && <p className="muted small">No workouts match. Try another length or type.</p>}
      </div>
    </div>
  );
}

/** Time in each power zone for a workout plan. */
function zoneTimes(w: Workout): number[] {
  const t = new Array(7).fill(0);
  for (const s of w.steps) {
    const [a, b] = stepLevels(s);
    t[zoneOf((a + b) / 2) - 1] += s.duration;
  }
  return t;
}

export function WorkoutDetail({ workout, ftp, children }: { workout: Workout; ftp: number; children?: React.ReactNode }) {
  const zones = zoneTimes(workout);
  const total = zones.reduce((a, b) => a + b, 0) || 1;
  const peak = Math.max(...workout.steps.map((s) => Math.max(...stepLevels(s))));
  return (
    <div className="wd">
      <h3 className="wd-name">{workout.name}</h3>
      {workout.id === RAMP_TEST_ID ? (
        <p className="wd-meta">
          <span>About 20 minutes, ends when you can't hold the target. Sets your FTP.</span>
        </p>
      ) : (
        <p className="wd-meta">
          <span>
            <b>{Math.round(workout.duration / 60)}</b> min
          </span>
          <span>
            TSS <b>{Math.round(workout.tss)}</b>
          </span>
          <span>
            IF <b>{workout.intensityFactor.toFixed(2)}</b>
          </span>
          <span>
            peak <b>{Math.round(peak * ftp)}</b> W
          </span>
        </p>
      )}
      {workout.description && <p className="wd-desc">{workout.description}</p>}
      <WorkoutChart workout={workout} height={110} />
      <div className="zone-strip wd-zones" aria-label="Time in zones">
        {zones.map((z, i) => (
          <span key={i} style={{ flexGrow: z / total, background: ZONE_HEX[i] }} title={`Zone ${i + 1}: ${Math.round(z / 60)} min`} />
        ))}
      </div>
      {children}
    </div>
  );
}

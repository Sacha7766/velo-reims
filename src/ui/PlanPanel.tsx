import { useEffect, useMemo, useState } from 'react';
import { getActivePlan, listCustomWorkouts, saveActivePlan } from '../sim/storage.ts';
import {
  PLAN_TEMPLATES, addDays, completion, entryFor, isoDate, mondayOf, nextMonday, schedule, templateById, weekIndex,
  type ActivePlan, type PlanRide,
} from '../training/plans.ts';
import { resolveWorkout } from '../training/resolve.ts';
import type { Workout } from '../workouts/types.ts';
import { DAY_NAMES, PlanCalendar, shortDate } from './PlanCalendar.tsx';
import { WorkoutChart } from './WorkoutChart.tsx';

interface Props {
  ftp: number;
  onPickWorkout: (workoutId: string) => void;
  rides: PlanRide[];
}

const TERRAIN_HINT = { climb: 'Best on a climbing route.', flat: 'Best on a flat route.', any: '' } as const;

export function PlanPanel({ ftp, onPickWorkout, rides }: Props) {
  const [active, setActive] = useState<ActivePlan | null | undefined>(undefined);
  const [custom, setCustom] = useState<Workout[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [calendar, setCalendar] = useState(false);
  const today = isoDate(new Date());

  useEffect(() => {
    let live = true;
    void getActivePlan().then((p) => live && setActive(p));
    void listCustomWorkouts().then((w) => live && setCustom(w));
    return () => {
      live = false;
    };
  }, []);

  const start = async (templateId: string, date: string) => {
    const p = { templateId, start: date };
    setActive(p);
    setPicked(null);
    await saveActivePlan(p);
  };

  const end = async () => {
    if (!window.confirm('End this training plan? Your rides stay in History.')) return;
    setActive(null);
    setCalendar(false);
    await saveActivePlan(null);
  };

  const template = active ? templateById(active.templateId) : undefined;
  const entries = useMemo(() => (active && template ? schedule(active, template) : []), [active, template]);
  const status = useMemo(() => completion(entries, rides, today), [entries, rides, today]);

  if (active === undefined) return <section className="plan" aria-label="Training plan" />;

  if (!active || !template) {
    const monday = nextMonday(today);
    return (
      <section className="plan" aria-label="Training plan">
        <div className="section-head">
          <h2>Training plan</h2>
        </div>
        <ul className="plan-list">
          {PLAN_TEMPLATES.map((t) => {
            const open = picked === t.id;
            return (
              <li key={t.id} className={open ? 'on' : ''}>
                <button className="plan-row" aria-expanded={open} title={t.description} onClick={() => setPicked(open ? null : t.id)}>
                  <span className="w-name">{t.name}</span>
                  <span className="w-meta">
                    {t.repeat ? `${t.weeks.length} weeks, repeats` : `${t.weeks.length} weeks`}, {t.hoursPerWeek} per week
                  </span>
                </button>
                {open && (
                  <div className="plan-more">
                    <p className="muted">{t.description}</p>
                    <div className="plan-start">
                      <button className="btn" onClick={() => void start(t.id, monday)}>
                        Start on Monday {shortDate(monday)}
                      </button>
                      <button className="btn ghost" onClick={() => void start(t.id, today)}>
                        Start today
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  const entry = entryFor(active, template, today);
  const workout = entry && entry.day.workoutId !== 'free' ? resolveWorkout(entry.day.workoutId, ftp, custom) : undefined;
  const todayStatus = status.get(today);
  const notStarted = today < active.start;
  const stripMonday = mondayOf(notStarted ? active.start : today);
  const lastDate = entries.length ? entries[entries.length - 1].date : active.start;
  const finished = !template.repeat && today > lastDate;
  const weekNo = Math.max(0, weekIndex(active, stripMonday));
  const weekLabel = template.weeks[weekNo % template.weeks.length]?.label;

  return (
    <section className="plan" aria-label="Training plan">
      <div className="section-head">
        <h2>Training plan</h2>
        <span className="muted plan-name">{template.name}</span>
      </div>

      {finished ? (
        <p className="plan-today-line">Plan complete. Well done.</p>
      ) : notStarted ? (
        <p className="plan-today-line">Starts {shortDate(active.start)}.</p>
      ) : entry ? (
        <div className="plan-today">
          <div className="plan-today-head">
            <span className="muted">Today</span>
            <span className="w-name">{workout?.name ?? 'Free climb'}</span>
            <span className="w-meta">
              {workout ? `${Math.round(workout.duration / 60)} min, TSS ${Math.round(workout.tss)}` : '20 min or more'}
              {todayStatus === 'done' ? ', done' : ''}
            </span>
          </div>
          {workout && <WorkoutChart workout={workout} height={44} compact />}
          {(entry.day.note || (entry.day.terrain && TERRAIN_HINT[entry.day.terrain])) && (
            <p className="muted plan-hint">{[entry.day.note, entry.day.terrain ? TERRAIN_HINT[entry.day.terrain] : ''].filter(Boolean).join(' ')}</p>
          )}
          <button className={todayStatus === 'done' ? 'btn ghost' : 'btn'} onClick={() => onPickWorkout(entry.day.workoutId)}>
            {todayStatus === 'done' ? 'Ride it again' : "Ride today's workout"}
          </button>
        </div>
      ) : (
        <p className="plan-today-line">
          <span className="muted">Today</span> Rest day
        </p>
      )}

      <div className="plan-week-head muted">
        Week {weekNo + 1}
        {weekLabel ? `, ${weekLabel}` : ''}
      </div>
      <ol className="plan-strip">
        {DAY_NAMES.map((name, i) => {
          const date = addDays(stripMonday, i);
          const e = entryFor(active, template, date);
          const st = status.get(date);
          const wk = e && e.day.workoutId !== 'free' ? resolveWorkout(e.day.workoutId, ftp, custom) : undefined;
          return (
            <li key={name} className={`${st ?? 'rest'} ${date === today ? 'is-today' : ''}`} title={wk ? `${wk.name}, ${Math.round(wk.duration / 60)} min` : e ? 'Free climb' : 'Rest'}>
              <span className="ps-day">{name}</span>
              <span className="ps-mark">{st === 'done' ? '✓' : st === 'missed' ? 'Missed' : e ? `${wk ? Math.round(wk.duration / 60) : 20} min` : ''}</span>
              <span className="ps-name">{e ? (wk?.name ?? 'Free climb') : 'Rest'}</span>
            </li>
          );
        })}
      </ol>

      <div className="plan-actions">
        <button className="btn ghost small" onClick={() => setCalendar(true)}>
          Full plan
        </button>
        <button className="btn ghost small" onClick={() => void end()}>
          End plan
        </button>
      </div>

      {calendar && (
        <PlanCalendar
          active={active}
          template={template}
          ftp={ftp}
          rides={rides}
          custom={custom}
          today={today}
          onPickWorkout={onPickWorkout}
          onClose={() => setCalendar(false)}
        />
      )}
    </section>
  );
}

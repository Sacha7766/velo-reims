export type PlanTerrain = 'climb' | 'flat' | 'any';

export interface PlanDay {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // Monday = 0
  /** A workout id, or 'free' for an unstructured climb. */
  workoutId: string;
  terrain?: PlanTerrain;
  note?: string;
}

export interface PlanWeek {
  label: string;
  days: PlanDay[];
}

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  hoursPerWeek: string;
  /** Weeks cycle forever; the calendar shows `cycles` repeats. */
  repeat?: boolean;
  weeks: PlanWeek[];
}

export interface ActivePlan {
  templateId: string;
  /** ISO date (YYYY-MM-DD). A Monday for "start on Monday"; any day for "start today". */
  start: string;
}

export interface PlanEntry {
  date: string;
  week: number;
  day: PlanDay;
}

export type DayStatus = 'done' | 'missed' | 'planned' | 'today';

const CYCLES = 3;
const FREE = 'free';

type D = PlanDay['day'];
const d = (day: D, workoutId: string, terrain?: PlanTerrain, note?: string): PlanDay => {
  const x: PlanDay = { day, workoutId };
  if (terrain) x.terrain = terrain;
  if (note) x.note = note;
  return x;
};

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'base-builder',
    name: 'Base builder',
    description: 'Four weeks of aerobic base. Mostly Zone 2 with a little tempo, and an easy final week to absorb it.',
    hoursPerWeek: '3 to 4 h',
    weeks: [
      { label: 'Settle in', days: [d(1, 'easy-spin'), d(3, 'endurance-60'), d(5, 'endurance-base')] },
      { label: 'Build', days: [d(1, 'endurance-60'), d(3, 'tempo-trio'), d(5, 'endurance-base', 'any', 'Fuel early and often.'), d(6, 'recovery-30')] },
      { label: 'Extend', days: [d(1, 'tempo-trio'), d(3, 'endurance-60'), d(5, 'endurance-2h', 'any', 'Fuel early and often.')] },
      { label: 'Recovery week', days: [d(1, 'easy-spin'), d(3, 'endurance-60'), d(5, 'endurance-base')] },
    ],
  },
  {
    id: 'climbing-build',
    name: 'Climbing build',
    description: 'Six weeks for long mountain climbs: seated tempo, low-cadence strength, then Alpine Repeats and Summit Push on climbing routes.',
    hoursPerWeek: '4 to 6 h',
    weeks: [
      { label: 'Foundations', days: [d(1, 'sweet-spot-3x12'), d(3, 'climbing-tempo', 'climb'), d(5, 'endurance-2h'), d(6, 'recovery-30')] },
      { label: 'Strength', days: [d(1, 'alpine-repeats', 'climb'), d(2, 'recovery-30'), d(3, 'endurance-60'), d(5, 'endurance-2h'), d(6, 'tempo-trio')] },
      { label: 'Sustained climbing', days: [d(1, 'sweet-spot-2x20'), d(2, 'easy-spin'), d(3, 'alpine-repeats', 'climb'), d(5, 'summit-push', 'climb'), d(6, 'endurance-60')] },
      { label: 'Recovery week', days: [d(1, 'easy-spin'), d(3, 'climbing-tempo', 'climb'), d(5, 'endurance-base')] },
      { label: 'Peak', days: [d(1, 'threshold-4x8'), d(2, 'recovery-30'), d(3, 'alpine-repeats', 'climb'), d(5, 'summit-push', 'climb'), d(6, 'endurance-60')] },
      { label: 'Taper', days: [d(1, 'tempo-trio'), d(3, 'alpine-repeats', 'climb'), d(5, 'easy-spin'), d(6, FREE, 'climb', 'Ride a favourite climb at your own pace.')] },
    ],
  },
  {
    id: 'ftp-builder',
    name: 'FTP builder',
    description: 'Six weeks from sweet spot to threshold to VO2. A ramp test opens and closes the plan so you can see the gain.',
    hoursPerWeek: '3 to 5 h',
    weeks: [
      { label: 'Baseline', days: [d(0, 'ramp-test', 'any', 'Fresh legs. Ride until you cannot hold the target.'), d(2, 'endurance-60'), d(3, 'sweet-spot-3x12'), d(5, 'endurance-base'), d(6, 'recovery-30')] },
      { label: 'Sweet spot', days: [d(1, 'sweet-spot-2x20'), d(3, 'endurance-60'), d(5, 'sweet-spot-ladder'), d(6, 'easy-spin')] },
      { label: 'Sweet spot to threshold', days: [d(1, 'sweet-spot-2x20'), d(2, 'recovery-30'), d(3, 'threshold-4x8'), d(5, 'endurance-2h')] },
      { label: 'Recovery week', days: [d(1, 'easy-spin'), d(3, 'sweet-spot-3x12'), d(5, 'endurance-base')] },
      { label: 'Threshold and VO2', days: [d(1, 'threshold-2x20'), d(3, 'vo2-5x4'), d(5, 'over-unders'), d(6, 'endurance-60')] },
      { label: 'Retest', days: [d(1, 'vo2-30-30'), d(3, 'endurance-60'), d(5, 'recovery-30'), d(6, 'ramp-test', 'any', 'Compare with week 1.')] },
    ],
  },
  {
    id: 'keep-fit',
    name: 'Keep fit',
    description: 'Three easy-going sessions a week that hold your fitness. Four weeks that repeat for as long as you like.',
    hoursPerWeek: '2 to 3 h',
    repeat: true,
    weeks: [
      { label: 'Steady', days: [d(1, 'endurance-60'), d(3, 'sweet-spot-3x12'), d(5, 'easy-spin')] },
      { label: 'Tempo', days: [d(1, 'tempo-trio'), d(3, 'endurance-60'), d(6, 'easy-spin')] },
      { label: 'Sweet spot', days: [d(1, 'sweet-spot-ladder'), d(3, 'endurance-60'), d(5, 'easy-spin')] },
      { label: 'Recovery week', days: [d(1, 'easy-spin'), d(3, 'endurance-60'), d(5, 'recovery-30')] },
    ],
  },
];

export function templateById(id: string): PlanTemplate | undefined {
  return PLAN_TEMPLATES.find((t) => t.id === id);
}

// Dates are plain YYYY-MM-DD strings in local time; arithmetic goes through UTC so DST never shifts a day.
const utc = (iso: string) => {
  const [y, m, dd] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, dd);
};

export function isoDate(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function addDays(iso: string, n: number): string {
  return new Date(utc(iso) + n * 86400000).toISOString().slice(0, 10);
}

/** Monday = 0 … Sunday = 6. */
export function weekday(iso: string): number {
  return (new Date(utc(iso)).getUTCDay() + 6) % 7;
}

export function mondayOf(iso: string): string {
  return addDays(iso, -weekday(iso));
}

/** The first Monday strictly after `date` (today on a Monday gives next week's). */
export function nextMonday(date: Date | string = new Date()): string {
  const iso = typeof date === 'string' ? date : isoDate(date);
  return addDays(iso, 7 - weekday(iso));
}

/** All planned sessions in date order. Repeating plans are expanded for a few cycles. */
export function schedule(active: ActivePlan, template: PlanTemplate): PlanEntry[] {
  const monday = mondayOf(active.start);
  const total = template.repeat ? template.weeks.length * CYCLES : template.weeks.length;
  const out: PlanEntry[] = [];
  for (let w = 0; w < total; w++) {
    const week = template.weeks[w % template.weeks.length];
    for (const day of [...week.days].sort((a, b) => a.day - b.day)) {
      const date = addDays(monday, w * 7 + day.day);
      if (date >= active.start) out.push({ date, week: w, day });
    }
  }
  return out;
}

/** The session planned for a date, or null on a rest day or outside the plan. */
export function entryFor(active: ActivePlan, template: PlanTemplate, date: string): PlanEntry | null {
  const monday = mondayOf(active.start);
  const offset = Math.round((utc(date) - utc(monday)) / 86400000);
  if (offset < 0 || date < active.start) return null;
  const w = Math.floor(offset / 7);
  if (!template.repeat && w >= template.weeks.length) return null;
  const week = template.weeks[w % template.weeks.length];
  const day = week.days.find((x) => x.day === offset % 7);
  return day ? { date, week: w, day } : null;
}

/** Week index (0-based) a date falls in, or -1 before the start. */
export function weekIndex(active: ActivePlan, date: string): number {
  const offset = Math.round((utc(date) - utc(mondayOf(active.start))) / 86400000);
  return offset < 0 ? -1 : Math.floor(offset / 7);
}

export interface PlanRide {
  start: number;
  workoutId?: string;
  /** Seconds; rides without a duration count towards free-climb days. */
  duration?: number;
}

export function completion(entries: PlanEntry[], rides: PlanRide[], today: Date | string = new Date()): Map<string, DayStatus> {
  const todayIso = typeof today === 'string' ? today : isoDate(today);
  const byDay = new Map<string, PlanRide[]>();
  for (const r of rides) {
    const k = isoDate(new Date(r.start));
    const list = byDay.get(k);
    if (list) list.push(r);
    else byDay.set(k, [r]);
  }
  const out = new Map<string, DayStatus>();
  for (const e of entries) {
    const day = byDay.get(e.date) ?? [];
    const done =
      e.day.workoutId === FREE
        ? day.some((r) => (r.duration ?? Infinity) >= 20 * 60)
        : day.some((r) => r.workoutId === e.day.workoutId);
    out.set(e.date, done ? 'done' : e.date < todayIso ? 'missed' : e.date === todayIso ? 'today' : 'planned');
  }
  return out;
}

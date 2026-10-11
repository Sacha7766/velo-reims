import { del, get, set } from 'idb-keyval';
import type { RouteData } from '../geo/route.ts';
import type { ActivePlan } from '../training/plans.ts';
import type { Workout } from '../workouts/types.ts';
import { DEFAULT_CUSTOM_DRIVETRAIN } from './drivetrain.ts';
import type { RiderSettings } from './session.ts';
import { encodeFit } from './fit.ts';
import { activeProfile, MAIN, profileKey, touchProfile } from './profiles.ts';
import type { RideRecord } from './types.ts';

export interface AppSettings extends RiderSettings {
  name: string;
  kit: string;
  accent: string;
  bike: string;
  time: string;
  quality: 'low' | 'medium' | 'high';
  erg: boolean;
  ghost: boolean;
  /** Virtual gears on the trainer (Zwift Ride shifters, [ ] keys). */
  gears: boolean;
  /** Watts for the "Hold watts" training mode. */
  holdWatts: number;
  /** Pacer bots to ride with, in W/kg. */
  bots: number[];
  /** Master volume 0..1 for ride sounds. */
  volume: number;
  /** Ghost riders on a Strava segment: at the KOM time and at your PR. */
  stravaKom: boolean;
  stravaPr: boolean;
  /** Strava segment id the ghosts race, null = the longest one on the route. */
  stravaPacerSegment: number | null;
  /** Start preset routes that have one on their easy lead-in (src/geo/leadIn.ts). */
  leadIn: boolean;
  /** Frames per second at most; 120 only helps on a ProMotion display and costs twice the power of 60. */
  frameRate: 30 | 60 | 120;
  /** Unplugged: at most 30 fps, Beautiful drops to Balanced (Engine.setBatterySaver). */
  batterySaver: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  name: 'Chris',
  ftp: 250,
  weight: 75,
  bikeWeight: 8,
  difficulty: 1,
  kit: '#e8442e',
  accent: '#f4efe6',
  bike: '#16181c',
  time: 'morning',
  quality: 'high',
  erg: true,
  ghost: true,
  gears: true,
  holdWatts: 180,
  bots: [],
  volume: 0.6,
  drivetrain: 'zwift',
  customDrivetrain: DEFAULT_CUSTOM_DRIVETRAIN,
  stravaKom: false,
  stravaPr: false,
  stravaPacerSegment: null,
  leadIn: true,
  frameRate: 60,
  batterySaver: true,
};

const SETTINGS_KEY = 'serpentine.settings';

/** Settings of the active rider profile. */
export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(profileKey(SETTINGS_KEY));
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* storage blocked */
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem(profileKey(SETTINGS_KEY), JSON.stringify(s));
  } catch {
    /* storage blocked */
  }
  touchProfile(s.name, s.kit);
}

export interface RideSummary {
  id: string;
  name: string;
  routeId: string;
  workoutId?: string;
  workoutName?: string;
  start: number;
  duration: number;
  distance: number;
  gain: number;
  avgPower: number;
  np: number;
  tss: number;
  summitTime: number | null;
  kj?: number;
  avgHr?: number;
  segments?: { id: string; name: string; time: number; power: number }[];
  bestEfforts?: { 5: number; 60: number; 300: number; 1200: number };
  /** Rider profile id; rides from before profiles belong to the main profile. */
  profile?: string;
  /** Started with the route's lead-in: times to the top only compare with rides that did too. */
  leadIn?: number;
}

const mine = (r: RideSummary) => (r.profile ?? MAIN) === activeProfile();

async function safeGet<T>(key: string, fallback: T): Promise<T> {
  try {
    return ((await get<T>(key)) ?? fallback) as T;
  } catch {
    return fallback;
  }
}

// Rides live on disk (~/Documents/Serpentine/rides) via the local server; IndexedDB is the fallback.
let apiState: Promise<boolean> | null = null;
function hasApi(): Promise<boolean> {
  apiState ??= fetch('/api/health')
    .then((r) => r.ok && (r.headers.get('content-type') ?? '').includes('json'))
    .catch(() => false);
  return apiState;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function putRide(rec: RideRecord, summary: RideSummary, rider?: string) {
  const res = await fetch(`/api/rides/${rec.id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ record: rec, summary, rider, fit: toBase64(encodeFit(rec)) }),
  });
  if (!res.ok) throw new Error(`Saving ride failed: ${res.status}`);
}

export async function saveRide(rec: RideRecord, summary: RideSummary) {
  summary = { ...summary, profile: summary.profile ?? activeProfile() };
  if (await hasApi()) {
    await putRide(rec, summary, loadSettings().name);
    return;
  }
  await set(`ride:${rec.id}`, rec);
  const list = await safeGet<RideSummary[]>('rides', []);
  await set('rides', [summary, ...list.filter((r) => r.id !== summary.id)]);
}

export async function deleteRide(id: string) {
  if (await hasApi()) {
    await fetch(`/api/rides/${id}`, { method: 'DELETE' });
    return;
  }
  await del(`ride:${id}`);
  await set('rides', (await safeGet<RideSummary[]>('rides', [])).filter((r) => r.id !== id));
}

let migrated = false;
/** Move rides recorded before disk storage existed out of IndexedDB. */
async function migrate() {
  if (migrated) return;
  migrated = true;
  const local = await safeGet<RideSummary[]>('rides', []);
  for (const summary of local) {
    const rec = await safeGet<RideRecord | undefined>(`ride:${summary.id}`, undefined);
    if (!rec) continue;
    try {
      await putRide(rec, summary);
      await del(`ride:${summary.id}`);
    } catch {
      return;
    }
  }
  if (local.length) await set('rides', []);
}

/** Rides of the active rider profile. */
export async function listRides(): Promise<RideSummary[]> {
  if (await hasApi()) {
    await migrate();
    try {
      return ((await (await fetch('/api/rides')).json()) as RideSummary[]).filter(mine);
    } catch {
      return [];
    }
  }
  return (await safeGet<RideSummary[]>('rides', [])).filter(mine);
}

export async function getRide(id: string): Promise<RideRecord | undefined> {
  if (await hasApi()) {
    const res = await fetch(`/api/rides/${id}`);
    return res.ok ? ((await res.json()) as RideRecord) : undefined;
  }
  return safeGet<RideRecord | undefined>(`ride:${id}`, undefined);
}

export async function openRidesFolder() {
  if (await hasApi()) await fetch('/api/open', { method: 'POST' });
}

/** Fastest summit on a route — the ghost you race. */
export async function bestRideFor(routeId: string, leadIn = false): Promise<{ summary: RideSummary; ride: RideRecord } | null> {
  const best = (await listRides())
    .filter((r) => r.routeId === routeId && r.summitTime !== null && !!r.leadIn === leadIn)
    .sort((a, b) => a.summitTime! - b.summitTime!)[0];
  if (!best) return null;
  const ride = await getRide(best.id);
  return ride ? { summary: best, ride } : null;
}

// Custom routes, workouts and the active plan live in <data>/data/<key>.json; IndexedDB is the fallback.
async function storeGet<T>(key: string): Promise<T | null> {
  const res = await fetch(`/api/store/${key}`);
  if (!res.ok) throw new Error(`Reading ${key} failed: ${res.status}`);
  return (await res.json()) as T | null;
}

async function storePut(key: string, value: unknown) {
  const res = await fetch(`/api/store/${key}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(value),
  });
  if (!res.ok) throw new Error(`Saving ${key} failed: ${res.status}`);
}

const storeMigrated = new Map<string, Promise<void>>();
/** One-off: merge IndexedDB lists into the disk store by id, then empty the IndexedDB copy. */
function migrateList(key: 'routes' | 'workouts'): Promise<void> {
  let p = storeMigrated.get(key);
  if (!p) {
    p = (async () => {
      const local = await safeGet<{ id: string }[]>(key, []);
      if (!local.length) return;
      try {
        const remote = (await storeGet<{ id: string }[]>(key)) ?? [];
        const ids = new Set(remote.map((x) => x.id));
        await storePut(key, [...remote, ...local.filter((x) => !ids.has(x.id))]);
        await set(key, []);
      } catch {
        storeMigrated.delete(key);
      }
    })();
    storeMigrated.set(key, p);
  }
  return p;
}

async function readList<T>(key: 'routes' | 'workouts'): Promise<T[]> {
  if (await hasApi()) {
    await migrateList(key);
    try {
      return (await storeGet<T[]>(key)) ?? [];
    } catch {
      return [];
    }
  }
  return safeGet<T[]>(key, []);
}

async function writeList<T>(key: 'routes' | 'workouts', list: T[]) {
  if (await hasApi()) await storePut(key, list);
  else await set(key, list);
}

export function listCustomRoutes(): Promise<RouteData[]> {
  return readList<RouteData>('routes');
}

export async function saveCustomRoute(r: RouteData) {
  const list = await listCustomRoutes();
  await writeList('routes', [r, ...list.filter((x) => x.id !== r.id)]);
}

export async function deleteCustomRoute(id: string) {
  await writeList('routes', (await listCustomRoutes()).filter((x) => x.id !== id));
}

export function listCustomWorkouts(): Promise<Workout[]> {
  return readList<Workout>('workouts');
}

export async function saveCustomWorkout(w: Workout) {
  const list = await listCustomWorkouts();
  await writeList('workouts', [w, ...list.filter((x) => x.id !== w.id)]);
}

// the training plan is per rider: 'plan' for the main profile, 'plan-<id>' for the others
export async function getActivePlan(): Promise<ActivePlan | null> {
  const key = profileKey('plan', '-');
  if (await hasApi()) {
    try {
      return await storeGet<ActivePlan>(key);
    } catch {
      return null;
    }
  }
  return safeGet<ActivePlan | null>(key, null);
}

export async function saveActivePlan(p: ActivePlan | null) {
  const key = profileKey('plan', '-');
  if (await hasApi()) await storePut(key, p);
  else if (p) await set(key, p);
  else await del(key);
}

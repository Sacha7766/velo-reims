// One ride: reads the device hub, integrates physics along the route, drives the trainer
// (SIM grade or ERG target), runs the workout clock, records 1 Hz samples, races a ghost.

import type { DeviceHub } from '../devices/types.ts';
import { pointAt, type Route, type RoutePoint } from '../geo/route.ts';
import { stateAt } from '../workouts/player.ts';
import type { Workout, WorkoutState } from '../workouts/types.ts';
import { cornerSpeed, DEFAULT_PHYSICS, stepSpeed, type PhysicsParams } from './physics.ts';
import { normalizedPower } from './stats.ts';
import type { RideRecord, RideSample } from './types.ts';
import type { Segment } from './segments.ts';
import { RAMP_TEST_ID, ftpFromRamp, rampFailure } from '../training/rampTest.ts';

export interface RiderSettings {
  ftp: number;
  weight: number;
  bikeWeight: number;
  /** Trainer difficulty: share of the real gradient sent to the trainer (0..1). */
  difficulty: number;
}

export interface SessionConfig {
  route: Route;
  workout: Workout | null;
  settings: RiderSettings;
  ghost: RideRecord | null;
  erg: boolean;
  /** Fixed ERG target for the whole ride (no workout), null = ride the gradient. */
  holdWatts: number | null;
  /** Virtual gears on the trainer. */
  gears: boolean;
  segments?: Segment[];
  /** Best previous time per segment id. */
  segmentBests?: Record<string, number>;
  /** Pacer bots, in W/kg. */
  bots?: number[];
}

export interface BotState {
  wkg: number;
  s: number;
  dir: 1 | -1;
  speed: number;
  distance: number;
  /** Metres ahead of the rider (negative = behind). */
  gap: number;
}

export interface LiveSegment {
  id: string;
  name: string;
  elapsed: number;
  remaining: number;
  pr: number | null;
  /** Seconds vs the PR pace at this point (negative = ahead). */
  delta: number | null;
}

/** Zwift's default 24 virtual gears (chainring/cog ratio); gear 12 = 2.40 is neutral. */
export const GEAR_RATIOS = [
  0.75, 0.87, 0.99, 1.11, 1.23, 1.38, 1.53, 1.68, 1.86, 2.04, 2.22, 2.4,
  2.61, 2.82, 3.03, 3.24, 3.49, 3.74, 3.99, 4.24, 4.54, 4.84, 5.14, 5.49,
];
export const NEUTRAL_GEAR = 12;

export type SessionEvent = 'summit' | 'lap' | 'segment-start' | 'segment-pr' | 'segment-end' | 'ramp-done';

export interface Banner {
  text: string;
  sub?: string;
  until: number;
}

export interface LiveState {
  status: 'ready' | 'riding' | 'paused' | 'finished';
  elapsed: number;
  movingTime: number;
  s: number;
  dir: 1 | -1;
  lap: number;
  distance: number;
  speed: number;
  power: number;
  power3s: number;
  cadence: number;
  heartRate: number | null;
  grade: number;
  ele: number;
  gain: number;
  avgPower: number;
  np: number;
  kj: number;
  workout: WorkoutState | null;
  workoutElapsed: number;
  erg: boolean;
  targetPower: number | null;
  trainerMode: 'erg' | 'sim' | 'idle';
  ghostS: number | null;
  ghostDir: 1 | -1;
  ghostGap: number | null;
  summitTime: number | null;
  banner: Banner | null;
  difficulty: number;
  /** 1-based virtual gear, null when gears are off. */
  gear: number | null;
  holdWatts: number | null;
  /** Workout intensity multiplier, adjusted with the shifters during ERG workouts. */
  bias: number;
  segment: LiveSegment | null;
  bots: BotState[];
  drafting: boolean;
  /** Estimated FTP once a ramp test ends. */
  rampFtp: number | null;
}

const tmp: Partial<RoutePoint> = {};

export class RideSession {
  readonly route: Route;
  readonly workout: Workout | null;
  readonly settings: RiderSettings;
  private hub: DeviceHub;
  private ghost: RideRecord | null;
  private physics: PhysicsParams;
  private samples: RideSample[] = [];
  private laps: number[] = [];
  private start = 0;
  private sampleAcc = 0;
  private emitAcc = 0;
  private gainRef: number;
  private npAcc = 0;
  private listeners = new Set<() => void>();
  private segments: Segment[] = [];
  private segmentBests: Record<string, number> = {};
  private segRun: { seg: Segment; t0: number; power: number; n: number } | null = null;
  private efforts: { id: string; name: string; time: number; power: number }[] = [];
  private rampWindow: { power: number; cadence: number; target: number | null }[] = [];
  private st: LiveState;

  constructor(cfg: SessionConfig, hub: DeviceHub) {
    this.route = cfg.route;
    this.workout = cfg.workout;
    this.settings = cfg.settings;
    this.ghost = cfg.ghost;
    this.hub = hub;
    this.physics = { ...DEFAULT_PHYSICS, mass: cfg.settings.weight + cfg.settings.bikeWeight };
    const p0 = pointAt(this.route, 0);
    this.gainRef = p0.ele;
    this.st = {
      status: 'ready', elapsed: 0, movingTime: 0, s: 0, dir: 1, lap: 1, distance: 0, speed: 0,
      power: 0, power3s: 0, cadence: 0, heartRate: null, grade: p0.grade, ele: p0.ele, gain: 0,
      avgPower: 0, np: 0, kj: 0, workout: cfg.workout ? stateAt(cfg.workout, 0, cfg.settings.ftp) : null,
      workoutElapsed: 0, erg: (cfg.erg && !!cfg.workout) || cfg.holdWatts !== null, targetPower: null, trainerMode: 'idle',
      ghostS: cfg.ghost ? 0 : null, ghostDir: 1, ghostGap: null, summitTime: null, banner: null,
      difficulty: cfg.settings.difficulty,
      gear: cfg.gears ? NEUTRAL_GEAR : null,
      holdWatts: cfg.holdWatts,
      bias: 1,
      segment: null,
      bots: (cfg.bots ?? []).map((wkg) => ({ wkg, s: 0, dir: 1, speed: 0, distance: 0, gap: 0 })),
      drafting: false,
      rampFtp: null,
    };
    this.segments = cfg.segments ?? [];
    this.segmentBests = { ...(cfg.segmentBests ?? {}) };
    hub.setRiderWeights(cfg.settings.weight, cfg.settings.bikeWeight);
    hub.setGearRatio(cfg.gears ? GEAR_RATIOS[NEUTRAL_GEAR - 1] : null);
  }

  /**
   * One shifter click. Riding the gradient: change gear. Holding watts: ±10 W.
   * ERG workout: ±5 % intensity. Returns what changed for feedback.
   */
  shift(dir: 1 | -1): 'gear' | 'watts' | 'bias' | 'limit' {
    const st = this.st;
    if (st.erg && st.holdWatts !== null) {
      st.holdWatts = Math.min(1500, Math.max(40, st.holdWatts + dir * 10));
      this.emit();
      return 'watts';
    }
    if (st.erg && this.workout && st.workout && !st.workout.done) {
      st.bias = Math.round(Math.min(1.5, Math.max(0.5, st.bias + dir * 0.05)) * 100) / 100;
      this.banner(`Intensity ${Math.round(st.bias * 100)} %`, undefined, 1.5);
      this.emit();
      return 'bias';
    }
    if (st.gear === null) return 'limit';
    const next = Math.min(GEAR_RATIOS.length, Math.max(1, st.gear + dir));
    if (next === st.gear) return 'limit';
    st.gear = next;
    this.hub.setGearRatio(GEAR_RATIOS[next - 1]);
    this.emit();
    return 'gear';
  }

  get state(): LiveState {
    return this.st;
  }

  private eventListeners = new Set<(e: SessionEvent) => void>();

  /** Discrete moments for sound and haptics: summit, lap, segment start/finish. */
  onEvent(fn: (e: SessionEvent) => void): () => void {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }

  private fire(e: SessionEvent) {
    for (const fn of this.eventListeners) fn(e);
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.st = { ...this.st };
    for (const fn of this.listeners) fn();
  }

  begin() {
    if (this.st.status !== 'ready') return;
    this.start = Date.now();
    this.st.status = 'riding';
    this.banner(this.route.name, this.workout ? this.workout.name : `${(this.route.length / 1000).toFixed(1)} km with ${Math.round(this.route.gain)} m of climbing`, 5);
    this.emit();
  }

  togglePause() {
    if (this.st.status === 'riding') {
      this.st.status = 'paused';
      this.hub.setMode({ kind: 'idle' });
      this.st.trainerMode = 'idle';
    } else if (this.st.status === 'paused') this.st.status = 'riding';
    this.emit();
  }

  toggleErg() {
    if (!this.workout && this.st.holdWatts === null) return;
    this.st.erg = !this.st.erg;
    this.banner(this.st.erg ? 'ERG on' : 'ERG off', this.st.erg ? 'Trainer holds the target' : 'Ride the gradient', 2);
    this.emit();
  }

  setDifficulty(d: number) {
    this.settings.difficulty = Math.min(1, Math.max(0, d));
    this.st.difficulty = this.settings.difficulty;
    this.banner(`Difficulty ${Math.round(this.settings.difficulty * 100)} %`, undefined, 1.5);
    this.emit();
  }

  skipInterval() {
    const w = this.workout;
    const ws = this.st.workout;
    if (!w || !ws || ws.done) return;
    this.st.workoutElapsed += ws.stepRemaining;
    this.st.workout = stateAt(w, this.st.workoutElapsed, this.settings.ftp);
    this.emit();
  }

  private banner(text: string, sub: string | undefined, seconds: number) {
    this.st.banner = { text, sub, until: this.st.elapsed + seconds };
  }

  tick(dt: number) {
    const st = this.st;
    if (st.status !== 'riding') return;
    const m = this.hub.metrics;
    const power = m.power ?? 0;
    const cadence = m.cadence ?? 0;
    st.power = power;
    st.cadence = cadence;
    st.heartRate = m.heartRate ?? null;
    st.power3s += (power - st.power3s) * (1 - Math.exp(-dt / 1.2));
    st.elapsed += dt;
    st.kj += (power * dt) / 1000;

    // physics along the route (drafting a pacer cuts drag by 30 %)
    const route = this.route;
    const p = pointAt(route, st.s, tmp);
    const grade = p.grade * st.dir;
    st.drafting = st.bots.some((b) => b.gap > 0.5 && b.gap < 7 && b.dir === st.dir);
    const phys = st.drafting ? { ...this.physics, cda: this.physics.cda * 0.7 } : this.physics;
    const prevS = st.s;
    let v = stepSpeed(st.speed, power, grade, p.ele, dt, phys);
    const vmax = cornerSpeed(p.radius);
    if (v > vmax) v = Math.max(vmax, v - 6 * dt);
    st.speed = v;
    if (v > 0.3) st.movingTime += dt;
    st.s += v * dt * st.dir;
    st.distance += v * dt;
    if (route.loop) {
      if (st.s >= route.length) {
        st.s -= route.length;
        st.lap++;
        this.laps.push(this.samples.length);
        this.banner(`Lap ${st.lap}`, `${fmtTime(st.elapsed)} so far`, 4);
        this.fire('lap');
      }
    } else if (st.dir === 1 && st.s >= route.length) {
      st.s = route.length - (st.s - route.length);
      st.dir = -1;
      st.lap++;
      if (st.summitTime === null) st.summitTime = st.elapsed;
      this.laps.push(this.samples.length);
      this.banner('Summit', `${Math.round(route.maxEle)} m in ${fmtTime(st.elapsed)}. Rolling back down.`, 7);
      this.fire('summit');
    } else if (st.dir === -1 && st.s <= 0) {
      st.s = -st.s;
      st.dir = 1;
      st.lap++;
      this.laps.push(this.samples.length);
      this.banner(`Lap ${Math.ceil(st.lap / 2)}`, 'Back up we go', 4);
    }
    const here = pointAt(route, st.s, tmp);
    st.grade = here.grade * st.dir;
    st.ele = here.ele;
    if (here.ele > this.gainRef + 1) {
      st.gain += here.ele - this.gainRef;
      this.gainRef = here.ele;
    } else if (here.ele < this.gainRef - 1) this.gainRef = here.ele;

    // workout + trainer
    let target: number | null = null;
    if (this.workout) {
      if (power > 15 || cadence > 20) st.workoutElapsed += dt;
      st.workout = stateAt(this.workout, st.workoutElapsed, this.settings.ftp);
      if (st.workout.done && st.erg) {
        st.erg = false;
        this.banner('Workout complete', 'Free ride — keep going or end the ride', 6);
      }
      target = st.workout.done || st.workout.target === null ? null : Math.round(st.workout.target * st.bias);
    } else if (st.holdWatts !== null) target = st.holdWatts;
    st.targetPower = target;
    if (st.erg && target !== null) {
      this.hub.setMode({ kind: 'erg', watts: target });
      st.trainerMode = 'erg';
    } else {
      const ahead = pointAt(route, st.s + 4 * st.dir, tmp).grade * st.dir;
      const factor = ahead >= 0 ? this.settings.difficulty : this.settings.difficulty * 0.7;
      this.hub.setMode({ kind: 'sim', params: { grade: ahead * factor, crr: 0.004, cw: 0.51 } });
      st.trainerMode = 'sim';
    }

    // ghost, pacers, segments, ramp test
    if (this.ghost) this.updateGhost();
    if (st.bots.length) this.updateBots(dt);
    this.updateSegments(prevS, power);

    // 1 Hz recording
    this.sampleAcc += dt;
    while (this.sampleAcc >= 1) {
      this.sampleAcc -= 1;
      this.samples.push({
        t: this.start + Math.round(st.elapsed * 1000),
        lat: here.lat,
        lon: here.lon,
        alt: here.ele,
        distance: st.distance,
        speed: st.speed,
        power: Math.round(power),
        cadence: Math.round(cadence),
        heartRate: st.heartRate ?? undefined,
        grade: st.grade,
      });
      const n = this.samples.length;
      st.avgPower = st.avgPower + (power - st.avgPower) / n;
      if (this.workout?.id === RAMP_TEST_ID && st.rampFtp === null) this.updateRamp(power, cadence);
      if (++this.npAcc >= 5) {
        this.npAcc = 0;
        st.np = normalizedPower(this.samples.map((s) => s.power ?? 0));
      }
    }
    if (st.banner && st.elapsed > st.banner.until) st.banner = null;

    this.emitAcc += dt;
    if (this.emitAcc >= 0.1) {
      this.emitAcc = 0;
      this.emit();
    }
  }

  private updateBots(dt: number) {
    const st = this.st;
    const L = this.route.length;
    st.bots = st.bots.map((b) => {
      const p = pointAt(this.route, b.s, tmp);
      const speed = stepSpeed(b.speed, b.wkg * this.settings.weight, p.grade * b.dir, p.ele, dt, this.physics);
      let s = b.s + speed * dt * b.dir;
      let dir = b.dir;
      if (this.route.loop) s = ((s % L) + L) % L;
      else if (dir === 1 && s >= L) {
        s = L - (s - L);
        dir = -1;
      } else if (dir === -1 && s <= 0) {
        s = -s;
        dir = 1;
      }
      const distance = b.distance + speed * dt;
      return { ...b, s, dir, speed, distance, gap: distance - st.distance };
    });
  }

  private updateSegments(prevS: number, power: number) {
    const st = this.st;
    if (st.dir !== 1) {
      this.segRun = null;
      st.segment = null;
      return;
    }
    const run = this.segRun;
    if (!run) {
      const seg = this.segments.find((g) => prevS < g.start && st.s >= g.start);
      if (seg) {
        this.segRun = { seg, t0: st.elapsed, power: 0, n: 0 };
        this.banner(seg.name, `${((seg.end - seg.start) / 1000).toFixed(1)} km at ${seg.avgGrade.toFixed(1)} %`, 3);
        this.fire('segment-start');
      }
      if (!this.segRun) return;
    }
    const r = this.segRun!;
    r.power += power;
    r.n++;
    const t = st.elapsed - r.t0;
    const pr = this.segmentBests[r.seg.id] ?? null;
    const frac = Math.min(1, Math.max(0, (st.s - r.seg.start) / (r.seg.end - r.seg.start)));
    st.segment = {
      id: r.seg.id,
      name: r.seg.name,
      elapsed: t,
      remaining: Math.max(0, r.seg.end - st.s),
      pr,
      delta: pr !== null && frac > 0.05 ? t - pr * frac : null,
    };
    if (st.s >= r.seg.end || (this.route.loop && st.s < prevS)) {
      const effort = { id: r.seg.id, name: r.seg.name, time: t, power: r.power / Math.max(r.n, 1) };
      this.efforts.push(effort);
      const isPr = pr === null || t < pr;
      if (isPr) this.segmentBests[r.seg.id] = t;
      this.banner(
        isPr ? (pr === null ? `${r.seg.name} done` : 'New record') : r.seg.name,
        isPr && pr !== null ? `${fmtTime(t)}, ${fmtTime(pr - t)} faster than before` : `${fmtTime(t)} at ${Math.round(effort.power)} W`,
        6,
      );
      this.fire(isPr && pr !== null ? 'segment-pr' : 'segment-end');
      this.segRun = null;
      st.segment = null;
    }
  }

  private updateRamp(power: number, cadence: number) {
    const st = this.st;
    const ws = st.workout;
    if (!ws || st.workoutElapsed < 7 * 60) return;
    this.rampWindow.push({ power, cadence, target: ws.target });
    if (this.rampWindow.length > 15) this.rampWindow.shift();
    if (rampFailure(this.rampWindow) || ws.done) {
      const powers = this.samples.map((x) => x.power ?? 0);
      st.rampFtp = ftpFromRamp(powers);
      st.erg = false;
      this.banner('Ramp test complete', `Estimated FTP ${st.rampFtp} W. Spin easy.`, 10);
      this.fire('ramp-done');
    }
  }

  private updateGhost() {
    const g = this.ghost!.samples;
    const st = this.st;
    if (!g.length) return;
    const t = st.elapsed;
    const i = Math.min(Math.floor(t), g.length - 1);
    const j = Math.min(i + 1, g.length - 1);
    const f = Math.min(1, t - i);
    const d = g[i].distance + (g[j].distance - g[i].distance) * f;
    const L = this.route.length;
    const cycle = Math.floor(d / L);
    const within = d - cycle * L;
    st.ghostDir = this.route.loop || cycle % 2 === 0 ? 1 : -1;
    st.ghostS = st.ghostDir === 1 ? within : L - within;
    // time the ghost needed to reach our distance
    let lo = 0;
    let hi = g.length - 1;
    if (g[hi].distance < st.distance) {
      st.ghostGap = null;
      return;
    }
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (g[mid].distance < st.distance) lo = mid;
      else hi = mid;
    }
    const span = g[hi].distance - g[lo].distance || 1;
    const ghostT = lo + (st.distance - g[lo].distance) / span;
    st.ghostGap = ghostT - st.elapsed;
  }

  finish(): RideRecord {
    this.st.status = 'finished';
    this.hub.setMode({ kind: 'idle' });
    this.hub.setGearRatio(null);
    this.emit();
    return {
      id: `ride-${this.start || Date.now()}`,
      name: this.route.name,
      routeId: this.route.id,
      workoutId: this.workout?.id,
      workoutName: this.workout?.name,
      start: this.start || Date.now(),
      samples: this.samples,
      laps: this.laps,
      ftp: this.settings.ftp,
      weight: this.settings.weight,
      segments: this.efforts,
      rampFtp: this.st.rampFtp ?? undefined,
    };
  }

  /** Debug/testing: teleport along the route. */
  jump(s: number) {
    this.st.s = Math.min(Math.max(s, 0), this.route.length);
    this.gainRef = pointAt(this.route, this.st.s).ele;
    this.st.bots = this.st.bots.map((b) => ({ ...b, s: this.st.s }));
  }

  get summitTime() {
    return this.st.summitTime;
  }
}

export function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

// One ride: reads the device hub, integrates physics along the route, drives the trainer
// (SIM grade or ERG target), runs the workout clock, records 1 Hz samples, races a ghost.

import type { DeviceHub } from '../devices/types.ts';
import { advance, pointAt, positionAt, type Route, type RoutePoint } from '../geo/route.ts';
import { stateAt } from '../workouts/player.ts';
import type { Workout, WorkoutState } from '../workouts/types.ts';
import { cornerSpeed, DEFAULT_PHYSICS, stepSpeed, type PhysicsParams } from './physics.ts';
import { gearList, resolveDrivetrain, startGearIndex, trainerRatio, ZWIFT_RATIOS, type CustomDrivetrain, type Drivetrain, type Gear } from './drivetrain.ts';
import { constantPowerForTime, PACER_START_SPEED } from './strava.ts';
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
  /** Drivetrain preset id (see sim/drivetrain.ts), 'zwift' = Zwift's 24 virtual gears. */
  drivetrain: string;
  customDrivetrain: CustomDrivetrain;
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
  /** Ghost riders that race a Strava segment at KOM pace and / or at your PR pace. */
  pacers?: { segmentId: string; kom: boolean; pr: boolean };
}

export interface BotState {
  wkg: number;
  s: number;
  dir: 1 | -1;
  speed: number;
  distance: number;
  /** Metres ahead of the rider (negative = behind). */
  gap: number;
  /** Name tag override; set on segment pacers ("KOM 17:52"). */
  label?: string;
  /** Segment pacers only: constant power, the segment they race and whether they are running. */
  power?: number;
  segmentId?: string;
  segStart?: number;
  segEnd?: number;
  active?: boolean;
}

export interface LiveSegment {
  id: string;
  name: string;
  elapsed: number;
  remaining: number;
  pr: number | null;
  /** Seconds vs the PR pace at this point (negative = ahead). */
  delta: number | null;
  /** Strava segments: the KOM time and the live delta to it. */
  kom: number | null;
  komDelta: number | null;
  strava: boolean;
}

/** Zwift's default 24 virtual gears (chainring/cog ratio); gear 12 = 2.40 is neutral. */
export const GEAR_RATIOS = ZWIFT_RATIOS;
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
  private segRuns: { seg: Segment; t0: number; power: number; n: number }[] = [];
  private efforts: { id: string; name: string; time: number; power: number }[] = [];
  private rampWindow: { power: number; cadence: number; target: number | null }[] = [];
  /** Gradient last handed to the trainer, eased for momentum. */
  private simGrade: number | null = null;
  private st: LiveState;
  readonly drivetrain: Drivetrain;
  /** Virtual gears of the selected drivetrain, easiest first. */
  readonly gears: Gear[];

  constructor(cfg: SessionConfig, hub: DeviceHub) {
    this.route = cfg.route;
    this.workout = cfg.workout;
    this.settings = cfg.settings;
    this.ghost = cfg.ghost;
    this.hub = hub;
    this.physics = { ...DEFAULT_PHYSICS, mass: cfg.settings.weight + cfg.settings.bikeWeight };
    this.drivetrain = resolveDrivetrain(cfg.settings.drivetrain, cfg.settings.customDrivetrain);
    this.gears = gearList(this.drivetrain);
    const openStep = Math.max(1, Math.round(300 / this.route.step));
    const openGrade = ((this.route.ele[Math.min(this.route.n - 1, openStep)] - this.route.ele[0]) / (openStep * this.route.step)) * 100;
    const startGear = startGearIndex(this.drivetrain, this.gears, openGrade) + 1;
    const p0 = pointAt(this.route, 0);
    this.gainRef = p0.ele;
    this.st = {
      status: 'ready', elapsed: 0, movingTime: 0, s: 0, dir: 1, lap: 1, distance: 0, speed: 0,
      power: 0, power3s: 0, cadence: 0, heartRate: null, grade: p0.grade, ele: p0.ele, gain: 0,
      avgPower: 0, np: 0, kj: 0, workout: cfg.workout ? stateAt(cfg.workout, 0, cfg.settings.ftp) : null,
      workoutElapsed: 0, erg: (cfg.erg && !!cfg.workout) || cfg.holdWatts !== null, targetPower: null, trainerMode: 'idle',
      ghostS: cfg.ghost ? 0 : null, ghostDir: 1, ghostGap: null, summitTime: null, banner: null,
      difficulty: cfg.settings.difficulty,
      gear: cfg.gears ? startGear : null,
      holdWatts: cfg.holdWatts,
      bias: 1,
      segment: null,
      bots: (cfg.bots ?? []).map((wkg) => ({ wkg, s: 0, dir: 1, speed: 0, distance: 0, gap: 0 })),
      drafting: false,
      rampFtp: null,
    };
    this.segments = cfg.segments ?? [];
    this.segmentBests = { ...(cfg.segmentBests ?? {}) };
    this.st.bots.push(...this.buildPacers(cfg.pacers));
    hub.setRiderWeights(cfg.settings.weight, cfg.settings.bikeWeight);
    hub.setGearRatio(cfg.gears ? trainerRatio(this.drivetrain, this.gears[startGear - 1]) : null);
  }

  /** The reference time to beat on a segment: the Strava PR or your own best, whichever is faster. */
  private prTime(seg: Segment): number | null {
    const mine = this.segmentBests[seg.id] ?? null;
    const theirs = seg.strava?.pr ?? null;
    return mine !== null && theirs !== null ? Math.min(mine, theirs) : (mine ?? theirs);
  }

  /** Ghost riders for the KOM / PR of a Strava segment: constant power that finishes it in that time. */
  private buildPacers(cfg: SessionConfig['pacers']): BotState[] {
    const seg = cfg && this.segments.find((g) => g.id === cfg.segmentId && g.strava);
    if (!cfg || !seg) return [];
    const out: BotState[] = [];
    const add = (label: string, time: number | null) => {
      if (time === null) return;
      const power = constantPowerForTime(this.route, seg.start, seg.end, time, this.physics);
      if (power === null) return;
      out.push({ wkg: power / this.settings.weight, s: seg.start, dir: 1, speed: 0, distance: 0, gap: 0, label: `${label} ${fmtTime(time)}`, power, segmentId: seg.id, segStart: seg.start, segEnd: seg.end, active: false });
    };
    if (cfg.kom) add('KOM', seg.strava!.kom);
    if (cfg.pr) add('Your PR', this.prTime(seg));
    return out;
  }

  /** The rider crossed a segment start line: pacers for that segment set off. */
  private startPacers(seg: Segment) {
    this.st.bots = this.st.bots.map((b) => (b.segmentId === seg.id ? { ...b, s: seg.start, speed: PACER_START_SPEED, active: true, distance: 0, gap: 0 } : b));
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
    const next = Math.min(this.gears.length, Math.max(1, st.gear + dir));
    if (next === st.gear) return 'limit';
    st.gear = next;
    this.hub.setGearRatio(trainerRatio(this.drivetrain, this.gears[next - 1]));
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
    st.drafting = st.bots.some((b) => !b.segmentId && b.gap > 0.5 && b.gap < 7 && b.dir === st.dir);
    const phys = st.drafting ? { ...this.physics, cda: this.physics.cda * 0.7 } : this.physics;
    const prevS = st.s;
    let v = stepSpeed(st.speed, power, grade, p.ele, dt, phys);
    const vmax = cornerSpeed(p.radius);
    if (v > vmax) v = Math.max(vmax, v - 6 * dt);
    st.speed = v;
    if (v > 0.3) st.movingTime += dt;
    const mv = advance(route, st.s, st.dir, v * dt);
    st.distance += v * dt;
    if (route.loop) {
      st.s = mv.s;
      if (mv.enteredEnd) {
        st.lap++;
        this.laps.push(this.samples.length);
        this.banner(`Lap ${st.lap}`, `${fmtTime(st.elapsed)} so far`, 4);
        this.fire('lap');
      }
    } else {
      st.s = mv.s;
      st.dir = mv.dir;
      if (mv.enteredEnd && st.summitTime === null) {
        st.summitTime = st.elapsed;
        this.banner('Summit', `${Math.round(route.maxEle)} m in ${fmtTime(st.elapsed)}. Round the top and back down.`, 7);
        this.fire('summit');
      }
      if (mv.turned === 'end') {
        st.lap++;
        this.laps.push(this.samples.length);
      } else if (mv.turned === 'start') {
        st.lap++;
        this.laps.push(this.samples.length);
        this.banner(`Lap ${Math.ceil(st.lap / 2)}`, 'Back up we go', 4);
      }
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
      // momentum: on the road ~85 kg of bike and rider carry you a few seconds into a ramp, a trainer's
      // flywheel far less, so steeper gradient eases in over ~4 s (and lets go faster when it flattens)
      const want = ahead * factor;
      if (this.simGrade === null || st.trainerMode !== 'sim') this.simGrade = want;
      else this.simGrade += (want - this.simGrade) * (1 - Math.exp(-dt / (want > this.simGrade ? 4 : 1.5)));
      this.hub.setMode({ kind: 'sim', params: { grade: this.simGrade, crr: 0.004, cw: 0.51 } });
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
    st.bots = st.bots.map((b) => {
      if (b.segmentId) return this.stepPacer(b, dt);
      const p = pointAt(this.route, b.s, tmp);
      const speed = stepSpeed(b.speed, b.wkg * this.settings.weight, p.grade * b.dir, p.ele, dt, this.physics);
      const { s, dir } = advance(this.route, b.s, b.dir, speed * dt);
      const distance = b.distance + speed * dt;
      return { ...b, s, dir, speed, distance, gap: distance - st.distance };
    });
  }

  /** Segment pacer: waits at the start line, rides the segment at its constant power, returns to the line. */
  private stepPacer(b: BotState, dt: number): BotState {
    if (!b.active) return b;
    const p = pointAt(this.route, b.s, tmp);
    const speed = stepSpeed(b.speed, b.power ?? 0, p.grade, p.ele, dt, this.physics);
    const s = b.s + speed * dt;
    const end = b.segEnd ?? this.route.length;
    if (s >= end) return { ...b, s: b.segStart ?? 0, speed: 0, active: false, gap: 0 };
    return { ...b, s, speed, distance: b.distance + speed * dt, gap: s - this.st.s };
  }

  private updateSegments(prevS: number, power: number) {
    const st = this.st;
    if (st.dir !== 1) {
      this.segRuns = [];
      st.segment = null;
      return;
    }
    // runs can overlap (a Strava segment inside the full climb)
    for (const seg of this.segments) {
      if (prevS < seg.start && st.s >= seg.start && !this.segRuns.some((r) => r.seg.id === seg.id)) {
        this.segRuns.push({ seg, t0: st.elapsed, power: 0, n: 0 });
        const sub = `${((seg.end - seg.start) / 1000).toFixed(1)} km at ${seg.avgGrade.toFixed(1)} %`;
        this.banner(seg.name, seg.strava ? `${sub}, from Strava` : sub, 3);
        this.startPacers(seg);
        this.fire('segment-start');
      }
    }
    for (const r of [...this.segRuns]) {
      r.power += power;
      r.n++;
      const t = st.elapsed - r.t0;
      if (!(st.s >= r.seg.end || (this.route.loop && st.s < prevS))) continue;
      const pr = this.prTime(r.seg);
      const kom = r.seg.strava?.kom ?? null;
      const effort = { id: r.seg.id, name: r.seg.name, time: t, power: r.power / Math.max(r.n, 1) };
      this.efforts.push(effort);
      const isPr = pr === null || t < pr;
      const best = this.segmentBests[r.seg.id];
      if (best === undefined || t < best) this.segmentBests[r.seg.id] = t;
      const beatKom = kom !== null && t < kom;
      this.banner(
        beatKom ? 'Faster than the KOM' : isPr ? (pr === null ? `${r.seg.name} done` : 'New record') : r.seg.name,
        beatKom
          ? `${fmtTime(t)}, KOM ${fmtTime(kom)}`
          : isPr && pr !== null
            ? `${fmtTime(t)}, ${fmtTime(pr - t)} faster than before`
            : `${fmtTime(t)} at ${Math.round(effort.power)} W`,
        6,
      );
      this.fire(isPr && pr !== null ? 'segment-pr' : 'segment-end');
      this.segRuns = this.segRuns.filter((x) => x !== r);
    }
    const r = this.segRuns[this.segRuns.length - 1];
    if (!r) {
      st.segment = null;
      return;
    }
    const t = st.elapsed - r.t0;
    const pr = this.prTime(r.seg);
    const kom = r.seg.strava?.kom ?? null;
    const frac = Math.min(1, Math.max(0, (st.s - r.seg.start) / (r.seg.end - r.seg.start)));
    st.segment = {
      id: r.seg.id,
      name: r.seg.name,
      elapsed: t,
      remaining: Math.max(0, r.seg.end - st.s),
      pr,
      delta: pr !== null && frac > 0.05 ? t - pr * frac : null,
      kom,
      komDelta: kom !== null && frac > 0.05 ? t - kom * frac : null,
      strava: !!r.seg.strava,
    };
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
    const gp = positionAt(this.route, d);
    st.ghostDir = gp.dir;
    st.ghostS = gp.s;
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
    this.st.bots = this.st.bots.map((b) => (b.segmentId ? b : { ...b, s: this.st.s }));
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

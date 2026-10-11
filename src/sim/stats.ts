import type { RideSample } from './types.ts';
import { zoneOf } from '../workouts/player.ts';

export interface RideStats {
  duration: number; // s
  movingTime: number; // s
  distance: number; // m
  ascent: number; // m
  avgPower: number;
  maxPower: number;
  np: number;
  if: number;
  tss: number;
  kj: number;
  avgHr: number;
  maxHr: number;
  avgCadence: number;
  avgSpeed: number; // m/s, over moving time
  maxSpeed: number; // m/s
  bestEfforts: { 5: number; 60: number; 300: number; 1200: number };
  timeInZones: number[]; // 7 entries, seconds
}

const EFFORT_WINDOWS = [5, 60, 300, 1200] as const;

export function normalizedPower(power: number[]): number {
  const n = power.length;
  if (n === 0) return 0;
  if (n < 30) return power.reduce((a, b) => a + b, 0) / n;
  let sum = 0;
  let acc = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    sum += power[i];
    if (i >= 30) sum -= power[i - 30];
    if (i >= 29) {
      acc += (sum / 30) ** 4;
      count++;
    }
  }
  return (acc / count) ** 0.25;
}

function bestAverage(power: number[], window: number): number {
  if (power.length < window) return 0;
  let sum = 0;
  let best = 0;
  for (let i = 0; i < power.length; i++) {
    sum += power[i];
    if (i >= window) sum -= power[i - window];
    if (i >= window - 1 && sum > best) best = sum;
  }
  return best / window;
}

export function rideStats(samples: RideSample[], ftp: number): RideStats {
  const n = samples.length;
  const zones = [0, 0, 0, 0, 0, 0, 0];
  const empty: RideStats = {
    duration: 0, movingTime: 0, distance: 0, ascent: 0, avgPower: 0, maxPower: 0, np: 0, if: 0, tss: 0, kj: 0,
    avgHr: 0, maxHr: 0, avgCadence: 0, avgSpeed: 0, maxSpeed: 0,
    bestEfforts: { 5: 0, 60: 0, 300: 0, 1200: 0 }, timeInZones: zones,
  };
  if (n === 0) return empty;

  const first = samples[0];
  const last = samples[n - 1];
  const duration = (last.t - first.t) / 1000;
  const distance = Math.max(0, last.distance - first.distance);

  const power: number[] = new Array<number>(n);
  let powerSum = 0, powerN = 0, maxPower = 0;
  let hrSum = 0, hrN = 0, maxHr = 0;
  let cadSum = 0, cadN = 0;
  let maxSpeed = 0, movingTime = 0, ascent = 0;
  let ref = first.alt;

  for (let i = 0; i < n; i++) {
    const s = samples[i];
    const p = s.power ?? 0;
    power[i] = p;
    if (s.power !== undefined) { powerSum += p; powerN++; }
    if (p > maxPower) maxPower = p;
    if (s.heartRate !== undefined && s.heartRate > 0) {
      hrSum += s.heartRate; hrN++;
      if (s.heartRate > maxHr) maxHr = s.heartRate;
    }
    if (s.cadence !== undefined && s.cadence > 0) { cadSum += s.cadence; cadN++; }
    if (s.speed > maxSpeed) maxSpeed = s.speed;
    if (i > 0 && s.speed > 0.5) movingTime += (s.t - samples[i - 1].t) / 1000;
    if (ftp > 0) zones[zoneOf(p / ftp) - 1] += 1;
    if (s.alt - ref >= 2) { ascent += s.alt - ref; ref = s.alt; }
    else if (ref - s.alt >= 2) ref = s.alt;
  }

  const np = normalizedPower(power);
  const ifactor = ftp > 0 ? np / ftp : 0;
  const tss = ftp > 0 ? (duration * np * ifactor) / (ftp * 3600) * 100 : 0;
  const kj = power.reduce((a, b) => a + b, 0) / 1000;
  const bestEfforts = { 5: 0, 60: 0, 300: 0, 1200: 0 };
  for (const w of EFFORT_WINDOWS) bestEfforts[w] = Math.round(bestAverage(power, w));

  return {
    duration,
    movingTime,
    distance,
    ascent,
    avgPower: powerN ? powerSum / powerN : 0,
    maxPower,
    np,
    if: ifactor,
    tss,
    kj,
    avgHr: hrN ? hrSum / hrN : 0,
    maxHr,
    avgCadence: cadN ? cadSum / cadN : 0,
    avgSpeed: movingTime > 0 ? distance / movingTime : 0,
    maxSpeed,
    bestEfforts,
    timeInZones: zones,
  };
}

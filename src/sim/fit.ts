import { Encoder, Utils } from '@garmin/fitsdk';
import type { Mesg } from '@garmin/fitsdk';
import type { RideRecord, RideSample } from './types.ts';
import { rideStats } from './stats.ts';

const MESG = { FILE_ID: 0, SESSION: 18, LAP: 19, RECORD: 20, EVENT: 21, DEVICE_INFO: 23, ACTIVITY: 34 } as const;
const SEMICIRCLES = 2 ** 31 / 180; // the SDK writes semicircles as-is (scale 1)

function clean(o: Record<string, unknown>): Mesg {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || (typeof v === 'number' && !Number.isFinite(v))) continue;
    out[k] = v;
  }
  return out as unknown as Mesg;
}

const semi = (deg: number) => Math.round(deg * SEMICIRCLES);
const int = (v: number | undefined, max: number) => (v === undefined ? undefined : Math.min(max, Math.max(0, Math.round(v))));

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function fitFileName(ride: RideRecord): string {
  const d = new Date(ride.start);
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const name = ride.name.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'Ride';
  return `${date}_${name}.fit`;
}

export function encodeFit(ride: RideRecord): Uint8Array {
  const samples = ride.samples;
  const enc = new Encoder();
  const first: RideSample | undefined = samples[0];
  const last: RideSample | undefined = samples[samples.length - 1];
  const startDate = new Date(first?.t ?? ride.start);
  const endDate = new Date(last?.t ?? ride.start);
  const stats = rideStats(samples, ride.ftp);
  let serial = 0;
  for (const ch of ride.id) serial = (serial * 31 + ch.charCodeAt(0)) >>> 0;
  if (serial === 0) serial = (ride.start / 1000) >>> 0;

  enc.onMesg(MESG.FILE_ID, clean({
    mesgNum: MESG.FILE_ID, type: 'activity', manufacturer: 'development', product: 0,
    serialNumber: serial, timeCreated: startDate,
  }));
  enc.onMesg(MESG.DEVICE_INFO, clean({
    mesgNum: MESG.DEVICE_INFO, timestamp: startDate, deviceIndex: 'creator', manufacturer: 'development',
    product: 0, serialNumber: serial, productName: 'Serpentine',
  }));
  enc.onMesg(MESG.EVENT, clean({
    mesgNum: MESG.EVENT, timestamp: startDate, event: 'timer', eventType: 'start', eventGroup: 0,
  }));

  for (const s of samples) {
    enc.onMesg(MESG.RECORD, clean({
      mesgNum: MESG.RECORD,
      timestamp: new Date(s.t),
      positionLat: Number.isFinite(s.lat) ? semi(s.lat) : undefined,
      positionLong: Number.isFinite(s.lon) ? semi(s.lon) : undefined,
      altitude: s.alt,
      distance: s.distance,
      speed: s.speed,
      power: int(s.power, 65534),
      cadence: int(s.cadence, 254),
      heartRate: int(s.heartRate, 254),
    }));
  }

  enc.onMesg(MESG.EVENT, clean({
    mesgNum: MESG.EVENT, timestamp: endDate, event: 'timer', eventType: 'stopAll', eventGroup: 0,
  }));

  // lap boundaries: sample indices, always starting at 0
  const bounds = [0];
  for (const i of [...ride.laps].sort((a, b) => a - b)) {
    if (i > bounds[bounds.length - 1] && i < samples.length) bounds.push(i);
  }
  const lastIdx = Math.max(0, samples.length - 1);
  if (samples.length > 0) {
    bounds.forEach((b, li) => {
      const next = li + 1 < bounds.length ? bounds[li + 1] : lastIdx;
      const a = samples[b];
      const z = samples[next];
      const st = rideStats(samples.slice(b, Math.max(b + 1, li + 1 < bounds.length ? next : lastIdx + 1)), ride.ftp);
      const elapsed = (z.t - a.t) / 1000;
      enc.onMesg(MESG.LAP, clean({
        mesgNum: MESG.LAP, messageIndex: li, timestamp: new Date(z.t), startTime: new Date(a.t),
        event: 'lap', eventType: 'stop', sport: 'cycling', subSport: 'virtualActivity',
        startPositionLat: semi(a.lat), startPositionLong: semi(a.lon),
        endPositionLat: semi(z.lat), endPositionLong: semi(z.lon),
        totalElapsedTime: elapsed, totalTimerTime: elapsed, totalDistance: Math.max(0, z.distance - a.distance),
        totalAscent: Math.round(st.ascent),
        avgSpeed: st.avgSpeed || (elapsed > 0 ? (z.distance - a.distance) / elapsed : 0), maxSpeed: st.maxSpeed,
        avgPower: Math.round(st.avgPower), maxPower: Math.round(st.maxPower),
        normalizedPower: Math.round(st.np),
        avgHeartRate: st.avgHr ? Math.round(st.avgHr) : undefined, maxHeartRate: st.maxHr || undefined,
        avgCadence: st.avgCadence ? Math.round(st.avgCadence) : undefined,
        totalWork: Math.round(st.kj * 1000),
      }));
    });
  }

  const elapsedTotal = stats.duration;
  const timer = stats.movingTime > 0 ? stats.movingTime : elapsedTotal;
  enc.onMesg(MESG.SESSION, clean({
    mesgNum: MESG.SESSION, messageIndex: 0, timestamp: endDate, startTime: startDate,
    event: 'lap', eventType: 'stop', sport: 'cycling', subSport: 'virtualActivity',
    startPositionLat: first ? semi(first.lat) : undefined, startPositionLong: first ? semi(first.lon) : undefined,
    totalElapsedTime: elapsedTotal, totalTimerTime: timer, totalDistance: stats.distance,
    totalAscent: Math.round(stats.ascent),
    totalCalories: Math.round(stats.kj),
    totalWork: Math.round(stats.kj * 1000),
    avgSpeed: stats.avgSpeed, maxSpeed: stats.maxSpeed,
    avgPower: Math.round(stats.avgPower), maxPower: Math.round(stats.maxPower),
    normalizedPower: Math.round(stats.np),
    trainingStressScore: Math.round(stats.tss * 10) / 10,
    intensityFactor: Math.round(stats.if * 1000) / 1000,
    thresholdPower: Math.round(ride.ftp),
    avgHeartRate: stats.avgHr ? Math.round(stats.avgHr) : undefined, maxHeartRate: stats.maxHr || undefined,
    avgCadence: stats.avgCadence ? Math.round(stats.avgCadence) : undefined,
    firstLapIndex: 0, numLaps: Math.max(1, bounds.length),
  }));

  const localOffset = -endDate.getTimezoneOffset() * 60;
  enc.onMesg(MESG.ACTIVITY, clean({
    mesgNum: MESG.ACTIVITY, timestamp: endDate, totalTimerTime: timer, numSessions: 1,
    type: 'manual', event: 'activity', eventType: 'stop',
    localTimestamp: Utils.convertDateToDateTime(endDate) + localOffset,
  }));

  return enc.close();
}

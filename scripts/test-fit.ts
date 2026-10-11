import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Decoder, Stream } from '@garmin/fitsdk';
import { encodeFit, fitFileName } from '../src/sim/fit.ts';
import { rideStats, normalizedPower } from '../src/sim/stats.ts';
import type { RideRecord, RideSample } from '../src/sim/types.ts';

const start = Date.UTC(2026, 9, 10, 8, 0, 0);
const N = 1200;
const samples: RideSample[] = [];
let dist = 0;
for (let i = 0; i < N; i++) {
  const speed = 6 + 2 * Math.sin(i / 60);
  dist += speed;
  samples.push({
    t: start + i * 1000,
    lat: 47.8 + i * 1e-5,
    lon: 13.05 + i * 1.5e-5,
    alt: 430 + i * 0.25,
    distance: dist,
    speed,
    power: 200 + Math.round(60 * Math.sin(i / 40)),
    cadence: 85 + (i % 10),
    heartRate: 130 + Math.round(i / 20),
    grade: 3,
  });
}
const ride: RideRecord = { id: 'test-ride', name: 'Gaisberg', routeId: 'gaisberg', start, samples, laps: [600], ftp: 250, weight: 75 };

const bytes = encodeFit(ride);
mkdirSync('/private/tmp/claude-501', { recursive: true });
writeFileSync('/private/tmp/claude-501/serpentine-test.fit', bytes);

const stream = Stream.fromByteArray(Array.from(bytes));
assert.ok(Decoder.isFIT(stream));
const dec = new Decoder(stream);
assert.ok(dec.checkIntegrity(), 'integrity');
const { messages, errors } = dec.read();
assert.deepEqual(errors, []);

const deg = (semi: number) => (semi * 180) / 2 ** 31; // the SDK exposes raw semicircles
const recs = messages.recordMesgs;
assert.equal(recs.length, N);
const r0 = recs[0];
assert.ok(Math.abs(deg(r0.positionLat) - 47.8) < 1e-5, `lat ${deg(r0.positionLat)}`);
assert.ok(Math.abs(deg(r0.positionLong) - 13.05) < 1e-5, `lon ${deg(r0.positionLong)}`);
const rl = recs[N - 1];
assert.ok(Math.abs(deg(rl.positionLat) - samples[N - 1].lat) < 1e-5);
assert.equal(r0.power, samples[0].power);
assert.equal(r0.heartRate, samples[0].heartRate);
assert.equal(r0.cadence, samples[0].cadence);
assert.ok(Math.abs(r0.altitude - 430) < 0.2);
assert.ok(Math.abs(rl.distance - dist) < 0.02);
assert.equal(r0.timestamp.getTime(), start);

assert.equal(messages.fileIdMesgs[0].type, 'activity');
assert.equal(messages.fileIdMesgs[0].manufacturer, 'development');
assert.equal(messages.deviceInfoMesgs.length, 1);
assert.equal(messages.eventMesgs.length, 2);
assert.equal(messages.eventMesgs[0].eventType, 'start');
assert.equal(messages.eventMesgs[1].eventType, 'stopAll');
assert.equal(messages.lapMesgs.length, 2);
assert.equal(messages.lapMesgs[0].totalElapsedTime, 600);
assert.equal(messages.lapMesgs[1].totalElapsedTime, N - 1 - 600);
assert.equal(messages.sessionMesgs.length, 1);
const s = messages.sessionMesgs[0];
assert.equal(s.sport, 'cycling');
assert.equal(s.subSport, 'virtualActivity');
assert.equal(s.numLaps, 2);
assert.equal(s.totalElapsedTime, N - 1);
assert.ok(Math.abs(s.totalDistance - (dist - samples[0].distance)) < 0.02);
assert.ok(s.avgPower > 190 && s.avgPower < 210, `avgPower ${s.avgPower}`);
assert.ok(s.normalizedPower >= s.avgPower);
assert.equal(s.thresholdPower, 250);
assert.ok(s.trainingStressScore > 20 && s.trainingStressScore < 60, `tss ${s.trainingStressScore}`);
assert.ok(s.intensityFactor > 0.7 && s.intensityFactor < 1);
assert.ok(s.totalAscent > 250 && s.totalAscent < 310, `ascent ${s.totalAscent}`);
assert.equal(messages.activityMesgs[0].numSessions, 1);
assert.equal(messages.activityMesgs[0].type, 'manual');

// stats
const st = rideStats(samples, 250);
assert.equal(st.duration, N - 1);
assert.equal(st.timeInZones.length, 7);
assert.equal(st.timeInZones.reduce((a, b) => a + b, 0), N);
assert.ok(st.bestEfforts[1200] > 0 && st.bestEfforts[5] >= st.bestEfforts[60] && st.bestEfforts[60] >= st.bestEfforts[300]);
assert.ok(Math.abs(st.ascent - 299.75) < 2.5, `ascent ${st.ascent}`);
assert.equal(normalizedPower([100, 200]), 150);
assert.equal(normalizedPower(new Array<number>(60).fill(200)), 200);
assert.equal(rideStats([], 250).duration, 0);

assert.equal(fitFileName(ride), `${new Date(start).getFullYear()}-10-10_Gaisberg.fit`);

console.log(`bytes ${bytes.length}, records ${recs.length}, laps ${messages.lapMesgs.length}`);
console.log('session', JSON.stringify({
  sport: s.sport, subSport: s.subSport, elapsed: s.totalElapsedTime, timer: s.totalTimerTime, dist: Math.round(s.totalDistance),
  ascent: s.totalAscent, avgP: s.avgPower, maxP: s.maxPower, np: s.normalizedPower, tss: s.trainingStressScore, if: s.intensityFactor,
  avgHr: s.avgHeartRate, maxHr: s.maxHeartRate, avgCad: s.avgCadence, avgSpd: s.avgSpeed, ftp: s.thresholdPower, cal: s.totalCalories,
}));
console.log('stats', JSON.stringify({ ...st, avgPower: Math.round(st.avgPower), np: Math.round(st.np) }));
console.log('file', fitFileName(ride), '-> /private/tmp/claude-501/serpentine-test.fit');
console.log('test-fit: OK');

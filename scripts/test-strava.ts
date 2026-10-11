import assert from 'node:assert/strict';
import { DEFAULT_PHYSICS } from '../src/sim/physics.ts';
import { constantPowerForTime, cumulativeDistances, haversine, parseStravaTime, projectOnRoute, segmentTime, type RouteProfile } from '../src/sim/strava.ts';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

t('parseStravaTime', () => {
  assert.equal(parseStravaTime('17:52'), 17 * 60 + 52);
  assert.equal(parseStravaTime('1:02:03'), 3723);
  assert.equal(parseStravaTime('45'), 45);
  assert.equal(parseStravaTime('45s'), 45);
  assert.equal(parseStravaTime(' 0:59 '), 59);
  assert.equal(parseStravaTime(''), null);
  assert.equal(parseStravaTime(null), null);
  assert.equal(parseStravaTime('abc'), null);
  assert.equal(parseStravaTime('12:75'), null);
});

// a straight road going north from (13, 47.8), 1 km per 0.009 degrees of latitude
const coords: number[][] = [];
for (let i = 0; i <= 20; i++) coords.push([13 + (i > 10 ? (i - 10) * 0.0005 : 0), 47.8 + i * 0.0009]);
const cum = cumulativeDistances(coords);

t('haversine: 0.009 degrees of latitude is about 1 km', () => {
  assert.ok(Math.abs(haversine(13, 47.8, 13, 47.809) - 1000.7) < 3);
});

t('projectOnRoute: on, beside and beyond the line', () => {
  const on = projectOnRoute(coords, cum, coords[5][0], coords[5][1]);
  assert.ok(on.dist < 0.01 && Math.abs(on.s - cum[5]) < 0.01);
  // halfway between points 3 and 4, 20 m to the east
  const midLat = (coords[3][1] + coords[4][1]) / 2;
  const dLon = 20 / (Math.cos((midLat * Math.PI) / 180) * 111195);
  const side = projectOnRoute(coords, cum, coords[3][0] + dLon, midLat);
  assert.ok(Math.abs(side.dist - 20) < 0.5, String(side.dist));
  assert.ok(Math.abs(side.s - (cum[3] + cum[4]) / 2) < 0.5);
  const far = projectOnRoute(coords, cum, 13.01, 47.8);
  assert.ok(far.dist > 600);
  const before = projectOnRoute(coords, cum, 13, 47.79);
  assert.equal(before.s, 0);
  const past = projectOnRoute(coords, cum, coords[20][0], 47.9);
  assert.ok(Math.abs(past.s - cum[20]) < 0.01);
});

// 3 km at 8 %
const step = 4;
const nPts = 751;
const profile: RouteProfile = {
  step,
  n: nPts,
  grade: new Float32Array(nPts).fill(8),
  ele: Float32Array.from({ length: nPts }, (_, i) => 100 + i * step * 0.08),
};
const phys = { ...DEFAULT_PHYSICS, mass: 80 };

t('segmentTime decreases with power', () => {
  const a = segmentTime(profile, 0, 3000, 200, phys);
  const b = segmentTime(profile, 0, 3000, 300, phys);
  assert.ok(a > b && b > 0);
  assert.ok(a > 600 && a < 1300, String(a));
});

t('constantPowerForTime reproduces the target time', () => {
  for (const target of [600, 900, 1072]) {
    const w = constantPowerForTime(profile, 0, 3000, target, phys);
    assert.ok(w !== null);
    const got = segmentTime(profile, 0, 3000, w!, phys);
    assert.ok(Math.abs(got - target) < 2.5, `${target}: ${got} at ${w}`);
  }
  const fast = constantPowerForTime(profile, 0, 3000, 900, phys)!;
  const slow = constantPowerForTime(profile, 0, 3000, 1200, phys)!;
  assert.ok(fast > slow);
});

t('constantPowerForTime: impossible and degenerate targets', () => {
  assert.equal(constantPowerForTime(profile, 0, 3000, 30, phys), null);
  assert.equal(constantPowerForTime(profile, 0, 3000, 0, phys), null);
  assert.equal(constantPowerForTime(profile, 100, 100, 60, phys), null);
  assert.ok((constantPowerForTime(profile, 0, 3000, 3 * 3600, phys) ?? 999) < 40);
});

console.log(`${n} strava tests passed`);

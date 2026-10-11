import assert from 'node:assert/strict';
import { DEFAULT_PHYSICS, powerAtSpeed } from '../src/sim/physics.ts';
import { DRIVETRAINS, REFERENCE_CIRCUMFERENCE, gearList, metresPerRev, parseTeeth, resolveDrivetrain, startGearIndex, trainerRatio } from '../src/sim/drivetrain.ts';

let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

const compact = resolveDrivetrain('road-compact');

t('road-compact gear list is strictly increasing and starts at 34/32', () => {
  const g = gearList(compact);
  assert.ok(g.length >= 14, `only ${g.length} gears`);
  assert.equal(g[0].label, '34×32');
  assert.ok(Math.abs(g[0].ratio - 34 / 32) < 1e-9);
  for (let i = 1; i < g.length; i++) assert.ok(g[i].ratio >= g[i - 1].ratio * 1.03 - 1e-9, `gear ${i}`);
  // no cross-chaining
  assert.ok(!g.some((x) => x.front === 50 && (x.rear === 32 || x.rear === 28)));
  assert.ok(!g.some((x) => x.front === 34 && (x.rear === 11 || x.rear === 12)));
  assert.ok(g[g.length - 1].ratio > 4);
});

t('all presets yield increasing lists; zwift keeps 24 labelled ratios', () => {
  for (const d of DRIVETRAINS) {
    const g = gearList(d);
    assert.ok(g.length > 8, d.id);
    for (let i = 1; i < g.length; i++) assert.ok(g[i].ratio > g[i - 1].ratio, `${d.id} ${i}`);
  }
  const z = gearList(resolveDrivetrain('zwift'));
  assert.equal(z.length, 24);
  assert.equal(z[0].ratio, 0.75);
  assert.equal(z[11].label, '12');
});

t('1x gravel uses every cog', () => {
  const g = gearList(resolveDrivetrain('gravel-1x'));
  assert.equal(g[0].label, '40×44');
  assert.ok(g.length >= 10);
});

t('80 kg on a 12 % grade at 60 rpm in 34x32 needs 200-230 W at about 8 km/h', () => {
  const g = gearList(compact)[0];
  const v = (60 / 60) * metresPerRev(compact, g);
  assert.ok(Math.abs(v - (34 / 32) * 2.105) < 1e-9);
  assert.ok(v * 3.6 > 7.9 && v * 3.6 < 8.3, `${v * 3.6} km/h`);
  const w = powerAtSpeed(v, 12, 0, { ...DEFAULT_PHYSICS, mass: 80 });
  assert.ok(w >= 200 && w <= 230, `${w} W`);
});

t('trainer ratio scales with wheel circumference', () => {
  const d = { ...compact, wheelCircumference: 2.2 };
  const g = gearList(d)[0];
  assert.ok(Math.abs(trainerRatio(d, g) - g.ratio * (2.2 / REFERENCE_CIRCUMFERENCE)) < 1e-12);
  assert.equal(trainerRatio(compact, g), g.ratio);
});

t('start gear: near 2.4 on the flat, easiest third on a steep opening, 12 for zwift', () => {
  const g = gearList(compact);
  const flat = g[startGearIndex(compact, g, 1)];
  assert.ok(Math.abs(flat.ratio - 2.4) < 0.25, String(flat.ratio));
  assert.ok(startGearIndex(compact, g, 8) < g.length / 3);
  const z = resolveDrivetrain('zwift');
  assert.equal(startGearIndex(z, gearList(z), 8), 11);
});

t('parseTeeth', () => {
  assert.deepEqual(parseTeeth('50, 34'), [50, 34]);
  assert.deepEqual(parseTeeth('11 12;13 x 99'), [11, 12, 13]);
});

console.log(`${n} drivetrain tests passed`);

import assert from 'node:assert/strict';
import { LIBRARY, parseZwo, toZwo, stateAt, powerProfile, zoneOf, computeIntensity } from '../src/workouts/index.ts';

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} !~ ${b}`);

// 1. IntervalsT + textevents, single-quoted attributes, entities, comment
const z1 = `<?xml version="1.0" encoding="UTF-8"?>
<workout_file>
  <author>Coach &amp; Co</author>
  <name>VO2 Boosters</name>
  <description>5 x 3 min hard.</description>
  <tags><tag name="VO2"/><tag name='Intervals'/></tags>
  <workout>
    <!-- warm -->
    <Warmup Duration="600" PowerLow="0.45" PowerHigh="0.75">
      <textevent timeoffset="5" message="Easy does it" />
    </Warmup>
    <IntervalsT Repeat='3' OnDuration='180' OffDuration='120' OnPower='1.15' OffPower='0.5' Cadence='95' CadenceResting='85'>
      <textevent timeoffset="10" message="First one &quot;go&quot;"/>
      <textevent timeoffset="310" message="Second interval" duration="6"/>
    </IntervalsT>
    <Cooldown Duration="300" PowerLow="0.7" PowerHigh="0.4"/>
  </workout>
</workout_file>`;
const w1 = parseZwo(z1);
assert.equal(w1.source, 'zwo');
assert.equal(w1.name, 'VO2 Boosters');
assert.equal(w1.author, 'Coach & Co');
assert.equal(w1.category, 'vo2max');
assert.equal(w1.steps.length, 1 + 6 + 1);
assert.deepEqual(w1.steps.slice(1, 7).map((s) => s.kind), ['on', 'off', 'on', 'off', 'on', 'off']);
assert.equal(w1.steps[1].cadence, 95);
assert.equal(w1.steps[2].cadence, 85);
assert.equal(w1.duration, 600 + 3 * 300 + 300);
assert.deepEqual(w1.messages.map((m) => m.at), [5, 610, 910]);
assert.equal(w1.messages[1].text, 'First one "go"');
assert.equal(w1.messages[2].duration, 6);
assert.equal(w1.steps[7].start, 0.7); // cooldown start=PowerLow as written
assert.equal(w1.steps[7].end, 0.4);
let st = stateAt(w1, 612, 250);
assert.equal(st.stepIndex, 1);
assert.equal(st.target, Math.round(1.15 * 250));
assert.equal(st.message, 'First one "go"');
assert.equal(st.next?.kind, 'off');
st = stateAt(w1, 300, 250); // warmup ramp: 0.45 + 0.3*0.5 = 0.6
assert.equal(st.target, 150);
assert.equal(st.stepRemaining, 300);
st = stateAt(w1, 1600, 250); // cooldown 100 s in: 0.7 - 0.3*(100/300) = 0.6
assert.equal(st.target, 150);

// 2. lowercase attributes, SolidState, SteadyState with Power
const z2 = `<workout_file><name>Lower case</name><workout>
  <warmup duration="300" powerlow="0.5" powerhigh="0.7"/>
  <steadystate duration="600" power="0.88" cadence="90"/>
  <intervalst repeat="2" onduration="60" offduration="60" onpower="1.2" offpower="0.5"/>
  <SolidState Duration="120" Power="0.6"/>
  <cooldown duration="300" powerlow="0.65" powerhigh="0.4"/>
</workout></workout_file>`;
const w2 = parseZwo(z2, 'lc');
assert.equal(w2.id, 'lc');
assert.equal(w2.steps.length, 1 + 1 + 4 + 1 + 1);
assert.equal(w2.steps[1].cadence, 90);
assert.equal(w2.duration, 300 + 600 + 240 + 120 + 300);
assert.equal(w2.category, 'custom');

// 3. Ramp, FreeRide, MaxEffort, Cooldown with PowerLow > PowerHigh, textevent relative to element
const z3 = `<workout_file><name>Mixed</name><workout>
  <Warmup Duration="300" PowerLow="0.4" PowerHigh="0.7"/>
  <Ramp Duration="600" PowerLow="0.6" PowerHigh="1.0">
    <textevent timeoffset="60" message="Ramp up" />
  </Ramp>
  <FreeRide Duration="300" FlatRoad="1"/>
  <freeride duration="60"/>
  <MaxEffort Duration="30"/>
  <Cooldown Duration="240" PowerLow="0.8" PowerHigh="0.3">
    <textevent timeoffset="10" message="Cool" />
  </Cooldown>
</workout></workout_file>`;
const w3 = parseZwo(z3);
assert.deepEqual(w3.steps.map((s) => s.kind), ['warmup', 'ramp', 'free', 'free', 'maxeffort', 'cooldown']);
assert.deepEqual(w3.messages.map((m) => m.at), [360, 1300]);
assert.equal(w3.duration, 300 + 600 + 300 + 60 + 30 + 240);
st = stateAt(w3, 600, 200); // ramp 300 s in: 0.6 + 0.4 * 0.5 = 0.8
assert.equal(st.target, 160);
st = stateAt(w3, 950, 200);
assert.equal(st.step.kind, 'free');
assert.equal(st.target, null);
assert.equal(st.targetFraction, null);
st = stateAt(w3, 1280, 200);
assert.equal(st.step.kind, 'maxeffort');
assert.equal(st.target, null);
st = stateAt(w3, 1300 + 120, 200); // cooldown 130 s in: 0.8 - 0.5 * 130/240
assert.equal(st.target, Math.round((0.8 - (0.5 * 130) / 240) * 200));
st = stateAt(w3, w3.duration, 200);
assert.ok(st.done);
assert.equal(st.stepRemaining, 0);
assert.equal(st.step.kind, 'cooldown');
assert.equal(st.target, Math.round(0.3 * 200));
st = stateAt(w3, w3.duration + 50, 200);
assert.ok(st.done);
assert.equal(stateAt(w3, 0, 200).stepIndex, 0);

// message windows: default 8 s
assert.equal(stateAt(w3, 360, 200).message, 'Ramp up');
assert.equal(stateAt(w3, 367.9, 200).message, 'Ramp up');
assert.equal(stateAt(w3, 368, 200).message, undefined);

// garbage
for (const bad of ['', 'hello', '<html><body/></html>', '<workout_file><name>x</name></workout_file>', '<workout_file><workout><Warmup', '<a><b></a>']) {
  assert.throws(() => parseZwo(bad), /Not a Zwift workout file/, bad);
}

// round trip
for (const w of [w1, w2, w3]) {
  const back = parseZwo(toZwo(w), w.id);
  assert.equal(back.name, w.name);
  assert.equal(back.duration, w.duration);
  assert.equal(back.steps.length, w.steps.length);
  w.steps.forEach((s, i) => {
    assert.equal(back.steps[i].duration, s.duration);
    near(back.steps[i].start, s.start);
    near(back.steps[i].end, s.end);
    assert.equal(back.steps[i].cadence, s.cadence);
  });
  assert.deepEqual(back.messages.map((m) => [m.at, m.text, m.duration]), w.messages.map((m) => [m.at, m.text, m.duration]));
  near(back.tss, w.tss, 0.11);
}
for (const w of LIBRARY) {
  const back = parseZwo(toZwo(w));
  assert.equal(back.duration, w.duration);
  assert.equal(back.messages.length, w.messages.length);
}

// metrics
const m = computeIntensity([{ kind: 'steady', duration: 3600, start: 1, end: 1 }]);
near(m.tss, 100);
near(m.intensityFactor, 1);
const mr = computeIntensity([{ kind: 'ramp', duration: 600, start: 0.5, end: 1.0 }]);
near(mr.intensityFactor, ((1 - 0.5 ** 5) / (5 * 0.5)) ** 0.25);
near(computeIntensity([{ kind: 'free', duration: 100, start: 0, end: 0 }]).intensityFactor, 0.6);
near(computeIntensity([{ kind: 'maxeffort', duration: 100, start: 0, end: 0 }]).intensityFactor, 1.2);

// profile + zones
const prof = powerProfile(w3);
assert.deepEqual(prof[0], { t: 0, f: 0.4 });
assert.equal(prof[prof.length - 1].t, w3.duration);
assert.equal(prof.length, w3.steps.length * 2);
assert.deepEqual([0.3, 0.55, 0.75, 0.76, 0.9, 1.04, 1.05, 1.2, 1.49, 1.5, 2].map(zoneOf), [1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 7]);

// library
assert.ok(LIBRARY.length >= 16);
const ids = new Set<string>();
for (const w of LIBRARY) {
  assert.ok(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(w.id), `id ${w.id}`);
  assert.ok(!ids.has(w.id), `duplicate ${w.id}`);
  ids.add(w.id);
  assert.equal(w.source, 'builtin');
  assert.ok(w.duration >= 30 * 60 && w.duration <= 150 * 60, `${w.id} duration ${w.duration}`);
  assert.ok(['warmup', 'ramp'].includes(w.steps[0].kind), `${w.id} start`);
  assert.equal(w.steps[w.steps.length - 1].kind, 'cooldown', `${w.id} end`);
  assert.ok(w.tss >= 10 && w.tss <= 160, `${w.id} tss ${w.tss}`);
  assert.ok(w.intensityFactor > 0.4 && w.intensityFactor < 1.0, `${w.id} IF`);
  assert.ok(w.messages.length >= 3, `${w.id} messages`);
  assert.ok(w.messages.every((x) => x.at >= 0 && x.at < w.duration), `${w.id} message range`);
  assert.ok(w.description && w.description.length > 20);
  near(w.duration, w.steps.reduce((a, s) => a + s.duration, 0));
  assert.ok(stateAt(w, w.duration / 2, 250).target !== undefined);
}
const cats = LIBRARY.reduce<Record<string, number>>((a, w) => ((a[w.category] = (a[w.category] ?? 0) + 1), a), {});
console.log('categories', JSON.stringify(cats));
for (const w of LIBRARY) console.log(`${w.name.padEnd(22)} ${String(w.duration / 60).padStart(5)} min  TSS ${w.tss.toFixed(1).padStart(5)}  IF ${w.intensityFactor}`);
console.log('test-workouts: OK');

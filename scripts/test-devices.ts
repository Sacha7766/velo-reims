import assert from 'node:assert/strict';
import * as ftms from '../src/devices/ftms.ts';
import * as fec from '../src/devices/fec.ts';
import * as cps from '../src/devices/cps.ts';
import { parseHeartRate } from '../src/devices/hrs.ts';
import * as zw from '../src/devices/zwift.ts';
import { newSimState, stepSimulator } from '../src/devices/simulator.ts';

const dv = (...b: number[]) => new DataView(Uint8Array.from(b).buffer);
const hex = (u: Uint8Array) => [...u].map((x) => x.toString(16).padStart(2, '0')).join(' ');
let n = 0;
function t(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`ok - ${name}`);
}

t('ftms bike data: speed present (bit0=0), cadence, power', () => {
  // flags: bit2 cadence + bit6 power = 0x0044
  const d = ftms.parseIndoorBikeData(dv(0x44, 0x00, 0x10, 0x0e, 0xb0, 0x00, 0xfa, 0x00));
  assert.equal(d.speed, 36); // 3600 * 0.01
  assert.equal(d.cadence, 88); // 176 * 0.5
  assert.equal(d.power, 250);
});

t('ftms bike data: speed absent (bit0=1), power only', () => {
  const d = ftms.parseIndoorBikeData(dv(0x41, 0x00, 0x2c, 0x01));
  assert.equal(d.speed, undefined);
  assert.equal(d.power, 300);
});

t('ftms bike data: many fields + negative power', () => {
  // bits: 0(speed absent) 4 distance, 5 resistance, 6 power, 8 energy, 9 HR, 11 elapsed
  const flags = 0x0001 | 0x0010 | 0x0020 | 0x0040 | 0x0100 | 0x0200 | 0x0800;
  const d = ftms.parseIndoorBikeData(
    dv(
      flags & 0xff, flags >> 8,
      0x10, 0x27, 0x01, // distance 0x012710 = 75536
      0x05, 0x00, // resistance 5
      0xfe, 0xff, // power -2
      0x0a, 0x00, 0x00, 0x00, 0x00, // energy 10 kcal
      0x96, // HR 150
      0x3c, 0x00, // elapsed 60
    ),
  );
  assert.equal(d.distance, 75536);
  assert.equal(d.resistance, 5);
  assert.equal(d.power, -2);
  assert.equal(d.totalEnergy, 10);
  assert.equal(d.heartRate, 150);
  assert.equal(d.elapsedTime, 60);
});

t('ftms bike data: truncated packet does not throw', () => {
  const d = ftms.parseIndoorBikeData(dv(0x44, 0x00, 0x10));
  assert.equal(d.power, undefined);
});

t('ftms control point encodings', () => {
  assert.equal(hex(ftms.encodeRequestControl()), '00');
  assert.equal(hex(ftms.encodeStart()), '07');
  assert.equal(hex(ftms.encodeTargetPower(250)), '05 fa 00');
  // -3.25 % => -325 = 0xfebb ; crr 40 ; cw 51
  assert.equal(hex(ftms.encodeSimParams({ grade: -3.25 })), '11 00 00 bb fe 28 33');
  // 12.5 % => 1250 = 0x04e2 ; wind 2 m/s => 2000 = 0x07d0
  assert.equal(hex(ftms.encodeSimParams({ grade: 12.5, windSpeed: 2, crr: 0.005, cw: 0.4 })), '11 d0 07 e2 04 32 28');
  const r = ftms.parseControlResponse(dv(0x80, 0x05, 0x05));
  assert.deepEqual(r, { requestOp: 5, result: 5 });
});

t('fec framing + checksum', () => {
  const m = fec.frameFec([0x31, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(m.length, 13);
  assert.deepEqual([...m.slice(0, 4)], [0xa4, 0x09, 0x4e, 0x05]);
  assert.equal(m[12], fec.checksum(m, 12));
  assert.equal(fec.checksum(m), 0);
});

t('fec page 0x19 and 0x10 parse', () => {
  const m = fec.frameFec([0x19, 0x01, 90, 0x00, 0x00, 0x2c, 0x91, 0x00]);
  assert.deepEqual(fec.parseFecMessage(m), { cadence: 90, power: 0x12c }); // 300 W
  const g = fec.frameFec([0x10, 0x19, 0x00, 0x00, 0xb8, 0x0b, 0x00, 0x00]); // 3000 mm/s
  const s = fec.parseFecMessage(g)!.speed!;
  assert.ok(Math.abs(s - 10.8) < 1e-9);
  assert.equal(fec.parseFecMessage(Uint8Array.of(1, 2, 3)), null);
});

t('fec control encodings', () => {
  const p = fec.encodeFecTargetPower(250); // 1000 = 0x03e8
  assert.equal(hex(p.slice(4, 12)), '31 ff ff ff ff ff e8 03');
  assert.equal(p[12], fec.checksum(p, 12));
  const g = fec.encodeFecTrackResistance(-3.25, 0.004); // (196.75)/0.01 = 19675 = 0x4cdb
  assert.equal(hex(g.slice(4, 12)), '33 ff ff ff ff db 4c 50');
  assert.equal(g[12], fec.checksum(g, 12));
  const w = fec.encodeFecWind(0.51, 0);
  assert.equal(hex(w.slice(4, 12)), '32 ff ff ff ff 33 7f 64');
});

t('cps power + crank parse', () => {
  // flags: bit5 crank = 0x0020
  const m = cps.parseCpsMeasurement(dv(0x20, 0x00, 0xc8, 0x00, 0x0a, 0x00, 0x00, 0x04))!;
  assert.equal(m.power, 200);
  assert.deepEqual(m.crank, { revs: 10, time: 1024 });
  // balance(bit0) + torque(bit2) + wheel(bit4) + crank(bit5)
  const m2 = cps.parseCpsMeasurement(
    dv(0x35, 0x00, 0x64, 0x00, 0x32, 0x10, 0x00, 1, 0, 0, 0, 0x00, 0x08, 0x07, 0x00, 0x00, 0x02),
  )!;
  assert.equal(m2.power, 100);
  assert.deepEqual(m2.wheel, { revs: 1, time: 2048 });
  assert.deepEqual(m2.crank, { revs: 7, time: 512 });
  assert.equal(cps.parseCpsMeasurement(dv(0, 0)), null);
});

t('cps cadence incl. rollover and stall', () => {
  const c = cps.createCadenceCalculator();
  assert.equal(c.update({ revs: 65534, time: 65000 }, 0), undefined);
  // 3 revs over 2048 ticks (2 s) => 90 rpm; revs and time both roll over
  const rpm = c.update({ revs: 1, time: (65000 + 2048) & 0xffff }, 1000)!;
  assert.ok(Math.abs(rpm - 90) < 1e-9);
  assert.equal(c.update({ revs: 1, time: (65000 + 2048) & 0xffff }, 2500), rpm); // no new event, <3 s
  assert.equal(c.update({ revs: 1, time: (65000 + 2048) & 0xffff }, 4500), 0); // >3 s
});

t('heart rate uint8 / uint16', () => {
  assert.equal(parseHeartRate(dv(0x00, 142)), 142);
  assert.equal(parseHeartRate(dv(0x01, 0x2c, 0x01)), 300);
  assert.equal(parseHeartRate(dv(0x01, 0x2c)), undefined);
});

t('simulator step', () => {
  const s = newSimState();
  let m = stepSimulator(s, { kind: 'erg', watts: 200 }, 100, 0.25, () => 0.5);
  for (let i = 0; i < 80; i++) m = stepSimulator(s, { kind: 'erg', watts: 200 }, 100, 0.25, () => 0.5);
  assert.equal(m.power, 200);
  assert.equal(m.cadence, 88);
  assert.ok(m.heartRate! > 65 && m.heartRate! <= 195);
  const z = stepSimulator(newSimState(), { kind: 'idle' }, 0, 0.25, () => 0.5);
  assert.equal(z.cadence, 0);
});

const bytes = (h: string) => Uint8Array.from(h.split(' ').map((x) => parseInt(x, 16)));

t('zwift hub command encode + decode vectors', () => {
  const cases: [string, zw.HubCommand][] = [
    ['04 2a 04 10 c0 bb 01', { physical: { gearRatioX10000: 24000 } }],
    ['04 2a 0a 10 c0 bb 01 20 bf 06 28 b4 42', { physical: { gearRatioX10000: 24000, bikeWeightX100: 831, riderWeightX100: 8500 } }],
    ['04 22 0b 08 00 10 da 02 18 ec 27 20 90 03', { simulation: { windX100: 0, inclineX100: 173, cwaX10000: 5100, crrX100000: 400 } }],
    ['04 22 03 10 a9 01', { simulation: { inclineX100: -85 } }],
    ['04 22 02 10 00', { simulation: { inclineX100: 0 } }],
  ];
  for (const [h, c] of cases) {
    assert.equal(hex(zw.encodeHubCommand(c)), h);
    assert.deepEqual(zw.decodeHubCommand(bytes(h)), c);
  }
  assert.equal(hex(zw.encodeSimulation(zw.simulationFromGrade(1.73))), '04 22 0b 08 00 10 da 02 18 ec 27 20 90 03');
  assert.equal(hex(zw.encodeSimulation({ inclineX100: Math.round(-0.85 * 100) })), '04 22 03 10 a9 01');
  assert.equal(hex(zw.encodePhysical(zw.physicalFrom(2.4, 8.31, 85))), '04 2a 0a 10 c0 bb 01 20 bf 06 28 b4 42');
});

t('zwift hub request + riding data + handshake bytes', () => {
  assert.equal(hex(zw.encodeHubRequest(520)), '00 08 88 04');
  assert.equal(hex(zw.encodeHubRequest(0)), '00 08 00');
  assert.deepEqual(zw.decodeHubRequest(bytes('00 08 88 04')), { dataId: 520 });
  assert.deepEqual(zw.decodeHubRequest(bytes('00 08 00')), { dataId: 0 });
  const d = zw.decodeRidingData(bytes('03 08 be 01 10 50 18 bd 06 20 00 28 e2 ba 01 30 8b eb 01'))!;
  assert.equal(d.power, 190);
  assert.equal(d.cadence, 80);
  assert.equal(d.speedX100, 829);
  assert.equal(hex(zw.RIDE_ON_TRAINER), '52 69 64 65 4f 6e 02 01');
  assert.equal(hex(zw.RIDE_ON_CONTROLLER), '52 69 64 65 4f 6e');
});

t('zwift zigzag edge cases', () => {
  for (const v of [-1, 1, -2500, 2500, 0, -85, 173]) {
    const out: number[] = [];
    zw.encodeVarint(zw.zigzag(v), out);
    const f = zw.decodeFields(Uint8Array.from([0x08, ...out]))[0]!;
    assert.equal(zw.unzigzag(f.value), v);
  }
  assert.equal(zw.zigzag(-1), 1);
  assert.equal(zw.zigzag(1), 2);
  assert.equal(zw.zigzag(-2500), 4999);
  assert.equal(zw.zigzag(2500), 5000);
  assert.equal(zw.zigzag(-85), 169);
});

t('gear 14 (2.82) at 85/8 kg', () => {
  assert.equal(hex(zw.encodePhysical(zw.physicalFrom(2.82, 8, 85))), '04 2a 0a 10 a8 dc 01 20 a0 06 28 b4 42');
});

t('ride keypad parsing', () => {
  const none = zw.decodeKeyPadStatus(bytes('23 08 ff ff ff ff 0f'))!;
  assert.equal(none.buttonMap, 0xffffffff);
  assert.equal(zw.pressedButtons(none).size, 0);
  const up = ~0x2000 >>> 0;
  const f = zw.decodeKeyPadStatus(zw.encodeKeyPadStatus({ buttonMap: up, analog: [] }))!;
  assert.deepEqual([...zw.pressedButtons(f)], ['shiftUpR']);
  const multi = zw.decodeKeyPadStatus(zw.encodeKeyPadStatus({ buttonMap: ~(0x1 | 0x20000) >>> 0, analog: [] }))!;
  assert.deepEqual([...zw.pressedButtons(multi)].sort(), ['left', 'onOffR']);
  const pad = zw.decodeKeyPadStatus(zw.encodeKeyPadStatus({ buttonMap: 0xffffffff, analog: [{ location: 0, value: -80 }] }))!;
  assert.deepEqual([...zw.pressedButtons(pad)], ['paddleL']);
  const soft = zw.decodeKeyPadStatus(zw.encodeKeyPadStatus({ buttonMap: 0xffffffff, analog: [{ location: 1, value: 10 }] }))!;
  assert.equal(zw.pressedButtons(soft).size, 0);
  // analog entries under field 2 (firmware variant)
  const alt = zw.decodeKeyPadStatus(bytes('23 08 ff ff ff ff 0f 12 04 08 01 10 64'))!;
  assert.deepEqual([...zw.pressedButtons(alt)], ['paddleR']);
});

t('ride button rising edge fires once per hold', () => {
  const frame = (map: number) => zw.pressedButtons(zw.decodeKeyPadStatus(zw.encodeKeyPadStatus({ buttonMap: map, analog: [] }))!);
  const fired: string[] = [];
  let prev = new Set<import('../src/devices/types.ts').ZwiftButton>();
  for (const m of [0xffffffff, ~0x4000 >>> 0, ~0x4000 >>> 0, 0xffffffff, ~0x4000 >>> 0]) {
    const now = frame(m);
    fired.push(...zw.risingEdges(prev, now));
    prev = now;
  }
  assert.deepEqual(fired, ['shiftDnR', 'shiftDnR']);
});

t('ride battery', () => {
  assert.equal(zw.decodeBattery(bytes('19 08 55')), 85);
  assert.equal(zw.decodeBattery(bytes('15 08 55')), undefined);
});

t('ftms fallback gear transform', () => {
  const m = 83;
  const base = zw.gearedGrade(5, 2.4, 6, m);
  // k = 1: gravity + 0.4 % rolling + small drag share
  assert.ok(base > 5.4 && base < 6.5, String(base));
  assert.ok(zw.gearedGrade(5, 3.5, 6, m) > base);
  assert.ok(zw.gearedGrade(5, 1.2, 6, m) < base);
  assert.equal(zw.gearedGrade(18, 5.49, 12, m), 20);
  assert.equal(zw.gearedGrade(-15, 2.4, 1, m), -10);
  assert.ok(Math.abs(zw.gearedGrade(0, 2.4, 1, m) - (0.4 + (100 * 0.5 * 1.2 * 0.32) / (m * 9.80665))) < 1e-9);
});

console.log(`\n${n} tests passed`);

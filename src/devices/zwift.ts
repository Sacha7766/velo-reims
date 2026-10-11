import type { ZwiftButton } from './types.ts';

// Zwift custom BLE service: tiny protobuf codec + message builders/parsers. Pure, no navigator.

export const ZWIFT_SERVICE_LEGACY = '00000001-19ca-4651-86e5-fa29dcdd09d1';
export const ZWIFT_SERVICE_NEW = '0000fc82-0000-1000-8000-00805f9b34fb';
export const ZWIFT_ASYNC = '00000002-19ca-4651-86e5-fa29dcdd09d1';
export const ZWIFT_SYNC_RX = '00000003-19ca-4651-86e5-fa29dcdd09d1';
export const ZWIFT_SYNC_TX = '00000004-19ca-4651-86e5-fa29dcdd09d1';

export const OP_HUB_REQUEST = 0x00;
export const OP_RIDING_DATA = 0x03;
export const OP_HUB_COMMAND = 0x04;
export const OP_BATTERY = 0x19;
export const OP_KEYPAD = 0x23;

export const DATA_ID_GENERAL = 0;
export const DATA_ID_GEAR_RATIO = 520;
export const NEUTRAL_RATIO = 2.4;

const RIDE_ON = Uint8Array.of(0x52, 0x69, 0x64, 0x65, 0x4f, 0x6e); // "RideOn"
export const RIDE_ON_CONTROLLER = RIDE_ON;
/** Short haptic pulse on Zwift Ride / Click controllers (from BikeControl). */
export const VIBRATE = Uint8Array.of(0x12, 0x12, 0x08, 0x0a, 0x06, 0x08, 0x02, 0x10, 0x00, 0x18, 0x20);
export const RIDE_ON_TRAINER = Uint8Array.of(...RIDE_ON, 0x02, 0x01);
export const TRAINER_HANDSHAKE_2 = Uint8Array.of(0x41, 0x08, 0x05);

// ---- protobuf ----

export function encodeVarint(n: number, out: number[]): void {
  let v = Math.max(0, Math.floor(n));
  while (v >= 128) {
    out.push((v % 128) | 128);
    v = Math.floor(v / 128);
  }
  out.push(v);
}

export function zigzag(n: number): number {
  return n >= 0 ? n * 2 : -n * 2 - 1;
}

export function unzigzag(u: number): number {
  return u % 2 === 0 ? u / 2 : -(u + 1) / 2;
}

function uintField(num: number, v: number | undefined, out: number[]) {
  if (v === undefined) return;
  out.push(num * 8);
  encodeVarint(v, out);
}

function sintField(num: number, v: number | undefined, out: number[]) {
  if (v === undefined) return;
  out.push(num * 8);
  encodeVarint(zigzag(v), out);
}

function msgField(num: number, body: number[] | undefined, out: number[]) {
  if (!body) return;
  out.push(num * 8 + 2);
  encodeVarint(body.length, out);
  for (const b of body) out.push(b);
}

export interface PbField {
  num: number;
  wire: number;
  value: number; // varint value (wire 0)
  bytes?: Uint8Array; // length-delimited payload (wire 2)
}

export function decodeFields(buf: Uint8Array): PbField[] {
  const out: PbField[] = [];
  let i = 0;
  const readVarint = (): number | undefined => {
    let v = 0;
    let mul = 1;
    for (let n = 0; n < 10; n++) {
      if (i >= buf.length) return undefined;
      const b = buf[i++]!;
      v += (b & 0x7f) * mul;
      if (!(b & 0x80)) return v;
      mul *= 128;
    }
    return undefined;
  };
  while (i < buf.length) {
    const tag = readVarint();
    if (tag === undefined) break;
    const num = Math.floor(tag / 8);
    const wire = tag % 8;
    if (wire === 0) {
      const v = readVarint();
      if (v === undefined) break;
      out.push({ num, wire, value: v });
    } else if (wire === 2) {
      const len = readVarint();
      if (len === undefined || i + len > buf.length) break;
      out.push({ num, wire, value: len, bytes: buf.subarray(i, i + len) });
      i += len;
    } else if (wire === 1) {
      i += 8;
    } else if (wire === 5) {
      i += 4;
    } else {
      break;
    }
  }
  return out;
}

// ---- trainer -> hub messages ----

export interface SimulationParam {
  windX100?: number;
  inclineX100?: number;
  cwaX10000?: number;
  crrX100000?: number;
}

export interface PhysicalParam {
  gearRatioX10000?: number;
  bikeWeightX100?: number;
  riderWeightX100?: number;
}

export interface HubCommand {
  powerTarget?: number;
  simulation?: SimulationParam;
  physical?: PhysicalParam;
}

export function encodeHubCommand(c: HubCommand): Uint8Array {
  const out: number[] = [OP_HUB_COMMAND];
  uintField(3, c.powerTarget, out);
  if (c.simulation) {
    const s: number[] = [];
    sintField(1, c.simulation.windX100, s);
    sintField(2, c.simulation.inclineX100, s);
    uintField(3, c.simulation.cwaX10000, s);
    uintField(4, c.simulation.crrX100000, s);
    msgField(4, s, out);
  }
  if (c.physical) {
    const p: number[] = [];
    uintField(2, c.physical.gearRatioX10000, p);
    uintField(4, c.physical.bikeWeightX100, p);
    uintField(5, c.physical.riderWeightX100, p);
    msgField(5, p, out);
  }
  return Uint8Array.from(out);
}

export function encodeSimulation(s: SimulationParam): Uint8Array {
  return encodeHubCommand({ simulation: s });
}

export function encodePhysical(p: PhysicalParam): Uint8Array {
  return encodeHubCommand({ physical: p });
}

/** Zwift's own scaling: incline % x100, CWa x10000, Crr x100000, wind 0. */
export function simulationFromGrade(gradePct: number, cw = 0.51, crr = 0.004): SimulationParam {
  return {
    windX100: 0,
    inclineX100: Math.round(gradePct * 100),
    cwaX10000: Math.round(cw * 10000),
    crrX100000: Math.round(crr * 100000),
  };
}

export function physicalFrom(ratio: number | null, bikeKg: number, riderKg: number): PhysicalParam {
  return {
    gearRatioX10000: Math.max(0, Math.round((ratio ?? NEUTRAL_RATIO) * 10000)),
    bikeWeightX100: Math.max(0, Math.round(bikeKg * 100)),
    riderWeightX100: Math.max(0, Math.round(riderKg * 100)),
  };
}

export function encodeHubRequest(dataId: number): Uint8Array {
  const out: number[] = [OP_HUB_REQUEST];
  uintField(1, dataId, out);
  return Uint8Array.from(out);
}

export function decodeHubRequest(msg: Uint8Array): { dataId?: number } | null {
  if (msg[0] !== OP_HUB_REQUEST) return null;
  const f = decodeFields(msg.subarray(1)).find((x) => x.num === 1 && x.wire === 0);
  return f ? { dataId: f.value } : {};
}

export function decodeHubCommand(msg: Uint8Array): HubCommand | null {
  if (msg[0] !== OP_HUB_COMMAND) return null;
  const out: HubCommand = {};
  for (const f of decodeFields(msg.subarray(1))) {
    if (f.num === 3 && f.wire === 0) out.powerTarget = f.value;
    else if (f.num === 4 && f.bytes) {
      const s: SimulationParam = {};
      for (const g of decodeFields(f.bytes)) {
        if (g.wire !== 0) continue;
        if (g.num === 1) s.windX100 = unzigzag(g.value);
        else if (g.num === 2) s.inclineX100 = unzigzag(g.value);
        else if (g.num === 3) s.cwaX10000 = g.value;
        else if (g.num === 4) s.crrX100000 = g.value;
      }
      out.simulation = s;
    } else if (f.num === 5 && f.bytes) {
      const p: PhysicalParam = {};
      for (const g of decodeFields(f.bytes)) {
        if (g.wire !== 0) continue;
        if (g.num === 2) p.gearRatioX10000 = g.value;
        else if (g.num === 4) p.bikeWeightX100 = g.value;
        else if (g.num === 5) p.riderWeightX100 = g.value;
      }
      out.physical = p;
    }
  }
  return out;
}

// ---- notifications ----

export interface RidingData {
  power?: number;
  cadence?: number;
  speedX100?: number;
  heartRate?: number;
}

export function decodeRidingData(msg: Uint8Array): RidingData | null {
  if (msg[0] !== OP_RIDING_DATA) return null;
  const out: RidingData = {};
  for (const f of decodeFields(msg.subarray(1))) {
    if (f.wire !== 0) continue;
    if (f.num === 1) out.power = f.value;
    else if (f.num === 2) out.cadence = f.value;
    else if (f.num === 3) out.speedX100 = f.value;
    else if (f.num === 4) out.heartRate = f.value;
  }
  return out;
}

// Inverse logic on the wire: a cleared bit means pressed.
export const BUTTON_MASKS: readonly (readonly [ZwiftButton, number])[] = [
  ['left', 0x1],
  ['up', 0x2],
  ['right', 0x4],
  ['down', 0x8],
  ['a', 0x10],
  ['b', 0x20],
  ['y', 0x40],
  ['z', 0x100],
  ['shiftUpL', 0x200],
  ['shiftDnL', 0x400],
  ['powerUpL', 0x800],
  ['onOffL', 0x1000],
  ['shiftUpR', 0x2000],
  ['shiftDnR', 0x4000],
  ['powerUpR', 0x10000],
  ['onOffR', 0x20000],
];

export const PADDLE_THRESHOLD = 25;

export interface AnalogPress {
  location: number;
  value: number;
}

export interface KeyPadStatus {
  buttonMap?: number;
  analog: AnalogPress[];
}

export function encodeKeyPadStatus(s: KeyPadStatus): Uint8Array {
  const out: number[] = [OP_KEYPAD];
  uintField(1, s.buttonMap, out);
  for (const a of s.analog) {
    const body: number[] = [];
    uintField(1, a.location, body);
    sintField(2, a.value, body);
    msgField(3, body, out);
  }
  return Uint8Array.from(out);
}

export function decodeKeyPadStatus(msg: Uint8Array): KeyPadStatus | null {
  if (msg[0] !== OP_KEYPAD) return null;
  const out: KeyPadStatus = { analog: [] };
  for (const f of decodeFields(msg.subarray(1))) {
    if (f.num === 1 && f.wire === 0) out.buttonMap = f.value;
    else if ((f.num === 2 || f.num === 3) && f.bytes) {
      let location = 0;
      let value = 0;
      for (const g of decodeFields(f.bytes)) {
        if (g.wire !== 0) continue;
        if (g.num === 1) location = g.value;
        else if (g.num === 2) value = unzigzag(g.value);
      }
      out.analog.push({ location, value });
    }
  }
  return out;
}

export function pressedButtons(s: KeyPadStatus): Set<ZwiftButton> {
  const out = new Set<ZwiftButton>();
  if (s.buttonMap !== undefined) {
    for (const [name, mask] of BUTTON_MASKS) {
      if (Math.floor(s.buttonMap / mask) % 2 === 0) out.add(name);
    }
  }
  for (const a of s.analog) {
    if (Math.abs(a.value) < PADDLE_THRESHOLD) continue;
    if (a.location === 0) out.add('paddleL');
    else if (a.location === 1) out.add('paddleR');
  }
  return out;
}

export function risingEdges(prev: ReadonlySet<ZwiftButton>, next: ReadonlySet<ZwiftButton>): ZwiftButton[] {
  const out: ZwiftButton[] = [];
  for (const b of next) if (!prev.has(b)) out.push(b);
  return out;
}

export function decodeBattery(msg: Uint8Array): number | undefined {
  if (msg[0] !== OP_BATTERY) return undefined;
  const fields = decodeFields(msg.subarray(1));
  let f = fields.find((x) => x.num === 1 && x.wire === 0);
  if (!f) {
    const nested = fields.find((x) => x.num === 1 && x.bytes);
    f = nested?.bytes ? decodeFields(nested.bytes).find((x) => x.num === 1 && x.wire === 0) : undefined;
  }
  return f && f.value >= 0 && f.value <= 100 ? f.value : undefined;
}

// ---- FTMS fallback shifting ----

const G = 9.80665;

/**
 * Emulate a virtual gear on a plain FTMS trainer by rescaling the grade.
 * Trainer speed is mapped to virtual speed by k = ratio / ref; the resistive force there
 * (gravity + rolling + drag) is converted back to an equivalent grade at the trainer's speed.
 */
export function gearedGrade(gradePct: number, ratio: number, trainerSpeedMs: number, massKg: number, ref = NEUTRAL_RATIO): number {
  const k = ratio / ref;
  const vT = Math.max(1, trainerSpeedMs);
  const vV = vT * k;
  const theta = Math.atan(gradePct / 100);
  const F = massKg * G * (Math.sin(theta) + 0.004 * Math.cos(theta)) + 0.5 * 1.2 * 0.32 * vV * vV;
  const sent = (100 * k * F) / (massKg * G);
  return Math.min(20, Math.max(-10, sent));
}

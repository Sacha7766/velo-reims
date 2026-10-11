import type { SimParams } from './types.ts';

export const FTMS_SERVICE = 0x1826;
export const INDOOR_BIKE_DATA = 0x2ad2;
export const FTMS_CONTROL_POINT = 0x2ad9;
export const FTMS_FEATURE = 0x2acc;
export const FTMS_POWER_RANGE = 0x2ad8;

export const OP_REQUEST_CONTROL = 0x00;
export const OP_START = 0x07;
export const OP_SET_TARGET_POWER = 0x05;
export const OP_SET_SIM_PARAMS = 0x11;
export const RESULT_SUCCESS = 0x01;
export const RESULT_NOT_PERMITTED = 0x05;

export interface IndoorBikeData {
  speed?: number; // km/h
  avgSpeed?: number;
  cadence?: number; // rpm
  avgCadence?: number;
  distance?: number; // m
  resistance?: number;
  power?: number; // W
  avgPower?: number;
  totalEnergy?: number; // kcal
  heartRate?: number;
  elapsedTime?: number; // s
  remainingTime?: number; // s
}

export function parseIndoorBikeData(dv: DataView): IndoorBikeData {
  const out: IndoorBikeData = {};
  if (dv.byteLength < 2) return out;
  const flags = dv.getUint16(0, true);
  let o = 2;
  const has = (n: number) => o + n <= dv.byteLength;
  if ((flags & 0x0001) === 0 && has(2)) {
    out.speed = dv.getUint16(o, true) * 0.01;
    o += 2;
  }
  if (flags & 0x0002 && has(2)) {
    out.avgSpeed = dv.getUint16(o, true) * 0.01;
    o += 2;
  }
  if (flags & 0x0004 && has(2)) {
    out.cadence = dv.getUint16(o, true) * 0.5;
    o += 2;
  }
  if (flags & 0x0008 && has(2)) {
    out.avgCadence = dv.getUint16(o, true) * 0.5;
    o += 2;
  }
  if (flags & 0x0010 && has(3)) {
    out.distance = dv.getUint16(o, true) + dv.getUint8(o + 2) * 65536;
    o += 3;
  }
  if (flags & 0x0020 && has(2)) {
    out.resistance = dv.getInt16(o, true);
    o += 2;
  }
  if (flags & 0x0040 && has(2)) {
    out.power = dv.getInt16(o, true);
    o += 2;
  }
  if (flags & 0x0080 && has(2)) {
    out.avgPower = dv.getInt16(o, true);
    o += 2;
  }
  if (flags & 0x0100 && has(5)) {
    out.totalEnergy = dv.getUint16(o, true);
    o += 5;
  }
  if (flags & 0x0200 && has(1)) {
    out.heartRate = dv.getUint8(o);
    o += 1;
  }
  if (flags & 0x0400 && has(1)) o += 1;
  if (flags & 0x0800 && has(2)) {
    out.elapsedTime = dv.getUint16(o, true);
    o += 2;
  }
  if (flags & 0x1000 && has(2)) {
    out.remainingTime = dv.getUint16(o, true);
  }
  return out;
}

export function encodeRequestControl(): Uint8Array {
  return Uint8Array.of(OP_REQUEST_CONTROL);
}

export function encodeStart(): Uint8Array {
  return Uint8Array.of(OP_START);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function encodeTargetPower(watts: number): Uint8Array {
  const out = new Uint8Array(3);
  const dv = new DataView(out.buffer);
  out[0] = OP_SET_TARGET_POWER;
  dv.setInt16(1, clamp(Math.round(watts), 0, 32767), true);
  return out;
}

export function encodeSimParams(p: SimParams): Uint8Array {
  const out = new Uint8Array(7);
  const dv = new DataView(out.buffer);
  out[0] = OP_SET_SIM_PARAMS;
  dv.setInt16(1, clamp(Math.round((p.windSpeed ?? 0) / 0.001), -32768, 32767), true);
  dv.setInt16(3, clamp(Math.round(p.grade / 0.01), -32768, 32767), true);
  out[5] = clamp(Math.round((p.crr ?? 0.004) / 0.0001), 0, 255);
  out[6] = clamp(Math.round((p.cw ?? 0.51) / 0.01), 0, 255);
  return out;
}

export interface ControlResponse {
  requestOp: number;
  result: number;
}

export function parseControlResponse(dv: DataView): ControlResponse | null {
  if (dv.byteLength < 3 || dv.getUint8(0) !== 0x80) return null;
  return { requestOp: dv.getUint8(1), result: dv.getUint8(2) };
}

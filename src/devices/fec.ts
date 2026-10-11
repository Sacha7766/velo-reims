export const FEC_SERVICE = '6e40fec1-b5a3-f393-e0a9-e50e24dcca9e';
export const FEC_NOTIFY = '6e40fec2-b5a3-f393-e0a9-e50e24dcca9e';
export const FEC_WRITE = '6e40fec3-b5a3-f393-e0a9-e50e24dcca9e';

export interface FecData {
  power?: number;
  cadence?: number;
  speed?: number; // km/h
}

export function checksum(bytes: ArrayLike<number>, length = bytes.length): number {
  let x = 0;
  for (let i = 0; i < length; i++) x ^= bytes[i]!;
  return x;
}

/** Wrap an 8-byte data page into an ANT broadcast message on channel 5. */
export function frameFec(page: ArrayLike<number>): Uint8Array {
  const out = new Uint8Array(13);
  out[0] = 0xa4;
  out[1] = 0x09;
  out[2] = 0x4e;
  out[3] = 0x05;
  for (let i = 0; i < 8; i++) out[4 + i] = page[i] ?? 0xff;
  out[12] = checksum(out, 12);
  return out;
}

export function parseFecMessage(msg: ArrayLike<number>): FecData | null {
  if (msg.length < 13 || msg[0] !== 0xa4 || msg[2] !== 0x4e) return null;
  const p = (i: number) => msg[4 + i]!;
  if (p(0) === 0x19) {
    return { cadence: p(2), power: p(5) | ((p(6) & 0x0f) << 8) };
  }
  if (p(0) === 0x10) {
    return { speed: (p(4) | (p(5) << 8)) * 0.001 * 3.6 };
  }
  return null;
}

export function encodeFecTargetPower(watts: number): Uint8Array {
  const units = Math.min(0xffff, Math.max(0, Math.round(watts * 4)));
  return frameFec([0x31, 0xff, 0xff, 0xff, 0xff, 0xff, units & 0xff, units >> 8]);
}

export function encodeFecTrackResistance(grade: number, crr = 0.004): Uint8Array {
  const g = Math.min(0xffff, Math.max(0, Math.round((grade + 200) / 0.01)));
  const c = Math.min(255, Math.max(0, Math.round(crr / 5e-5)));
  return frameFec([0x33, 0xff, 0xff, 0xff, 0xff, g & 0xff, g >> 8, c]);
}

export function encodeFecWind(cw = 0.51, windSpeedMs = 0, drafting = 1): Uint8Array {
  const coeff = Math.min(255, Math.max(0, Math.round(cw / 0.01)));
  const wind = Math.min(254, Math.max(0, Math.round(windSpeedMs * 3.6 + 127)));
  const draft = Math.min(100, Math.max(0, Math.round(drafting * 100)));
  return frameFec([0x32, 0xff, 0xff, 0xff, 0xff, coeff, wind, draft]);
}

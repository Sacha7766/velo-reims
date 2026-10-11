export const HR_SERVICE = 0x180d;
export const HR_MEASUREMENT = 0x2a37;

export function parseHeartRate(dv: DataView): number | undefined {
  if (dv.byteLength < 2) return undefined;
  const flags = dv.getUint8(0);
  if (flags & 0x01) return dv.byteLength >= 3 ? dv.getUint16(1, true) : undefined;
  return dv.getUint8(1);
}

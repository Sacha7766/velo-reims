export const CPS_SERVICE = 0x1818;
export const CPS_MEASUREMENT = 0x2a63;

export interface CpsMeasurement {
  power: number;
  crank?: { revs: number; time: number }; // time in 1/1024 s
  wheel?: { revs: number; time: number }; // time in 1/2048 s
}

export function parseCpsMeasurement(dv: DataView): CpsMeasurement | null {
  if (dv.byteLength < 4) return null;
  const flags = dv.getUint16(0, true);
  const out: CpsMeasurement = { power: dv.getInt16(2, true) };
  let o = 4;
  if (flags & 0x0001) o += 1;
  if (flags & 0x0004) o += 2;
  if (flags & 0x0010 && o + 6 <= dv.byteLength) {
    out.wheel = { revs: dv.getUint32(o, true), time: dv.getUint16(o + 4, true) };
    o += 6;
  }
  if (flags & 0x0020 && o + 4 <= dv.byteLength) {
    out.crank = { revs: dv.getUint16(o, true), time: dv.getUint16(o + 2, true) };
  }
  return out;
}

export interface CadenceCalculator {
  /** Feed crank data (or undefined when absent); returns rpm, or undefined if unknown. */
  update(crank: { revs: number; time: number } | undefined, nowMs: number): number | undefined;
}

export function createCadenceCalculator(): CadenceCalculator {
  let lastRevs: number | undefined;
  let lastTime = 0;
  let lastEventAt = 0;
  let cadence: number | undefined;
  return {
    update(crank, nowMs) {
      if (!crank) return cadence;
      if (lastRevs === undefined) {
        lastRevs = crank.revs;
        lastTime = crank.time;
        lastEventAt = nowMs;
        return cadence;
      }
      const dRevs = (crank.revs - lastRevs) & 0xffff;
      const dTime = (crank.time - lastTime) & 0xffff;
      if (dRevs > 0 && dTime > 0) {
        cadence = (dRevs / (dTime / 1024)) * 60;
        lastEventAt = nowMs;
      } else if (nowMs - lastEventAt > 3000) {
        cadence = 0;
      }
      lastRevs = crank.revs;
      lastTime = crank.time;
      return cadence;
    },
  };
}

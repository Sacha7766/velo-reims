// Individual trees baked from a canopy height model (scripts/bake-trees.py → public/trees/<id>.bin).

import { lonLatToWorld, type WorldFrame } from './mercator.ts';

export interface BakedTrees {
  n: number;
  x: Float32Array;
  z: Float32Array;
  /** Height in metres. */
  h: Uint8Array;
  /** Crown radius in metres. */
  crown: Float32Array;
  /** 1 conifer, 2 broadleaf. */
  kind: Uint8Array;
  /** 1 = tree in open ground (meadow, hedge), not closed forest. */
  open: Uint8Array;
}

export async function loadBakedTrees(routeId: string, frame: WorldFrame): Promise<BakedTrees | null> {
  let buf: ArrayBuffer;
  try {
    const res = await fetch(`/trees/${routeId}.bin`);
    if (!res.ok) return null;
    buf = await res.arrayBuffer();
  } catch {
    return null;
  }
  const dv = new DataView(buf);
  if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'TRE1') return null;
  const n = dv.getUint32(4, true);
  const lon0 = dv.getFloat64(8, true);
  const lat0 = dv.getFloat64(16, true);
  const out: BakedTrees = {
    n,
    x: new Float32Array(n),
    z: new Float32Array(n),
    h: new Uint8Array(n),
    crown: new Float32Array(n),
    kind: new Uint8Array(n),
    open: new Uint8Array(n),
  };
  let o = 24;
  for (let i = 0; i < n; i++, o += 12) {
    const [x, z] = lonLatToWorld(frame, lon0 + dv.getFloat32(o, true), lat0 + dv.getFloat32(o + 4, true));
    out.x[i] = x;
    out.z[i] = z;
    out.h[i] = dv.getUint8(o + 8);
    out.crown[i] = dv.getUint8(o + 9) / 10;
    out.kind[i] = dv.getUint8(o + 10);
    out.open[i] = dv.getUint8(o + 11);
  }
  return out;
}

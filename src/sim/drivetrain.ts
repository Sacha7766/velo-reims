// Configurable drivetrain ("cassette simulator"): the virtual gears are the combinations of a
// real bike's chainrings and cogs, so the easiest gear is as hard as on the road.
// The trainer protocol ratio is chainring / cog; the KICKR's native virtual shifting expects it
// relative to its own 700c wheel (REFERENCE_CIRCUMFERENCE).

export interface Drivetrain {
  id: string;
  label: string;
  /** Chainring teeth, any order. Empty for the Zwift preset. */
  chainrings: number[];
  /** Cog teeth, any order. Empty for the Zwift preset. */
  cassette: number[];
  /** Rolling circumference of the rear wheel in metres. */
  wheelCircumference: number;
}

export interface Gear {
  ratio: number;
  /** Chainring / cog teeth, 0 for Zwift's virtual gears. */
  front: number;
  rear: number;
  label: string;
}

export interface CustomDrivetrain {
  chainrings: number[];
  cassette: number[];
  wheelCircumference: number;
}

/** Wheel the trainer's native virtual shifting is calibrated for (700c). */
export const REFERENCE_CIRCUMFERENCE = 2.105;

/** Zwift's default 24 virtual gears (chainring/cog ratio); gear 12 = 2.40 is neutral. */
export const ZWIFT_RATIOS = [
  0.75, 0.87, 0.99, 1.11, 1.23, 1.38, 1.53, 1.68, 1.86, 2.04, 2.22, 2.4,
  2.61, 2.82, 3.03, 3.24, 3.49, 3.74, 3.99, 4.24, 4.54, 4.84, 5.14, 5.49,
];
export const ZWIFT_NEUTRAL = 12;

export const DEFAULT_CUSTOM_DRIVETRAIN: CustomDrivetrain = {
  chainrings: [50, 34],
  cassette: [11, 12, 13, 14, 15, 17, 19, 21, 24, 28, 32],
  wheelCircumference: REFERENCE_CIRCUMFERENCE,
};

export const DRIVETRAINS: Drivetrain[] = [
  { id: 'zwift', label: 'Zwift (24 virtual gears)', chainrings: [], cassette: [], wheelCircumference: REFERENCE_CIRCUMFERENCE },
  { id: 'road-compact', label: 'Road compact 50/34, 11-32', chainrings: [50, 34], cassette: [11, 12, 13, 14, 15, 16, 17, 19, 21, 24, 28, 32], wheelCircumference: REFERENCE_CIRCUMFERENCE },
  { id: 'road-semi', label: 'Road semi-compact 52/36, 11-30', chainrings: [52, 36], cassette: [11, 12, 13, 14, 15, 16, 17, 19, 21, 24, 27, 30], wheelCircumference: REFERENCE_CIRCUMFERENCE },
  { id: 'road-standard', label: 'Road standard 53/39, 11-28', chainrings: [53, 39], cassette: [11, 12, 13, 14, 15, 17, 19, 21, 23, 25, 28], wheelCircumference: REFERENCE_CIRCUMFERENCE },
  { id: 'gravel-1x', label: 'Gravel 1x 40, 10-44', chainrings: [40], cassette: [10, 11, 13, 15, 17, 19, 21, 24, 28, 32, 38, 44], wheelCircumference: REFERENCE_CIRCUMFERENCE },
  { id: 'custom', label: 'Custom', ...DEFAULT_CUSTOM_DRIVETRAIN },
];

export function resolveDrivetrain(id: string | undefined, custom?: CustomDrivetrain): Drivetrain {
  const base = DRIVETRAINS.find((d) => d.id === id) ?? DRIVETRAINS[0];
  if (base.id !== 'custom' || !custom) return base;
  return { ...base, chainrings: custom.chainrings, cassette: custom.cassette, wheelCircumference: custom.wheelCircumference };
}

/** Gears closer than this (relative) to an already listed one are dropped. */
const MIN_STEP = 0.03;

/**
 * Gears from easiest to hardest. Zwift: its 24 ratios. Real drivetrains: the combinations a rider
 * would actually use. With two or more chainrings each ring covers its own band of the ratio range
 * (small ring easy, big ring hard), cross-chained extremes are left out (big ring on the two
 * largest cogs, small ring on the two smallest) and near-duplicate ratios are removed.
 */
export function gearList(d: Drivetrain): Gear[] {
  const rings = [...d.chainrings].filter((x) => x > 0).sort((a, b) => a - b);
  const cogs = [...d.cassette].filter((x) => x > 0).sort((a, b) => a - b);
  if (!rings.length || !cogs.length) {
    return ZWIFT_RATIOS.map((ratio, i) => ({ ratio, front: 0, rear: 0, label: String(i + 1) }));
  }
  const n = rings.length;
  const lo = Math.log(rings[0] / cogs[cogs.length - 1]);
  const hi = Math.log(rings[n - 1] / cogs[0]);
  const all: Gear[] = [];
  rings.forEach((front, k) => {
    cogs.forEach((rear, j) => {
      if (n > 1) {
        if (k === n - 1 && j >= cogs.length - 2) return; // big ring, big cogs
        if (k === 0 && j < 2) return; // small ring, small cogs
        const x = Math.log(front / rear);
        const a = lo + ((hi - lo) * k) / n;
        const b = lo + ((hi - lo) * (k + 1)) / n;
        if (x < a - 1e-9 || x > b + 1e-9) return;
      }
      all.push({ ratio: front / rear, front, rear, label: `${front}×${rear}` });
    });
  });
  all.sort((a, b) => a.ratio - b.ratio);
  const out: Gear[] = [];
  for (const g of all) {
    const last = out[out.length - 1];
    if (!last || g.ratio >= last.ratio * (1 + MIN_STEP)) out.push(g);
  }
  return out;
}

/** The ratio to send to the trainer for a gear (scaled for the wheel size). */
export function trainerRatio(d: Drivetrain, g: Gear): number {
  return g.ratio * (d.wheelCircumference / REFERENCE_CIRCUMFERENCE);
}

/** Distance covered per crank revolution in a gear, metres. */
export function metresPerRev(d: Drivetrain, g: Gear): number {
  return g.ratio * d.wheelCircumference;
}

/**
 * Index of the gear to start in: Zwift keeps gear 12; real drivetrains start near ratio 2.4
 * on the flat, or in the easiest third when the opening 300 m average more than 5 %.
 */
export function startGearIndex(d: Drivetrain, gears: Gear[], openingGradePct: number): number {
  if (d.id === 'zwift') return Math.min(gears.length, ZWIFT_NEUTRAL) - 1;
  if (openingGradePct > 5) return Math.max(0, Math.floor(gears.length / 6));
  let best = 0;
  gears.forEach((g, i) => {
    if (Math.abs(g.ratio - 2.4) < Math.abs(gears[best].ratio - 2.4)) best = i;
  });
  return best;
}

/** Parse "50, 34" / "11 12 13" into teeth counts. */
export function parseTeeth(text: string): number[] {
  return text
    .split(/[\s,;/]+/)
    .map(Number)
    .filter((x) => Number.isFinite(x) && x >= 8 && x <= 80)
    .map(Math.round);
}

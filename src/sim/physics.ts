// Road cycling longitudinal dynamics (Martin et al. 1998 style):
// propulsion vs. gravity, rolling resistance and aerodynamic drag at altitude-dependent air density.

export interface PhysicsParams {
  mass: number; // rider + bike, kg
  cda: number; // m²
  crr: number;
  drivetrain: number; // efficiency 0..1
}

export const DEFAULT_PHYSICS: Omit<PhysicsParams, 'mass'> = { cda: 0.32, crr: 0.0045, drivetrain: 0.976 };

export function airDensity(altitude: number): number {
  return 1.225 * Math.exp(-altitude / 8400);
}

/** Advance speed (m/s) by dt seconds at the given power (W) and grade (%). */
export function stepSpeed(v: number, power: number, gradePct: number, altitude: number, dt: number, p: PhysicsParams): number {
  const g = 9.80665;
  const th = Math.atan(gradePct / 100);
  const fGrav = p.mass * g * Math.sin(th);
  const fRoll = p.mass * g * p.crr * Math.cos(th);
  const k = 0.5 * airDensity(altitude) * p.cda;
  const inertia = p.mass + 1.4; // wheels
  const steps = Math.max(1, Math.ceil(dt / 0.02));
  const h = dt / steps;
  let vv = v;
  for (let i = 0; i < steps; i++) {
    const fProp = (power * p.drivetrain) / Math.max(vv, 0.4);
    const a = (fProp - fGrav - fRoll - k * vv * vv) / inertia;
    vv = Math.max(0, vv + a * h);
  }
  return vv;
}

/** Comfortable cornering speed for a turn radius (m), ~5.5 m/s² lateral. */
export function cornerSpeed(radius: number): number {
  return Math.sqrt(5.5 * Math.max(radius, 3));
}

/** Power (W) needed to hold a steady speed (m/s) on a grade: gravity + rolling + air, through the drivetrain. */
export function powerAtSpeed(v: number, gradePct: number, altitude: number, p: PhysicsParams): number {
  const g = 9.80665;
  const th = Math.atan(gradePct / 100);
  const force = p.mass * g * (Math.sin(th) + p.crr * Math.cos(th)) + 0.5 * airDensity(altitude) * p.cda * v * v;
  return Math.max(0, (force * v) / p.drivetrain);
}

/** Steady-state speed for a power on a grade (used for estimates in the UI). */
export function steadySpeed(power: number, gradePct: number, altitude: number, p: PhysicsParams): number {
  let v = 5;
  for (let i = 0; i < 400; i++) v = stepSpeed(v, power, gradePct, altitude, 0.25, p);
  return v;
}

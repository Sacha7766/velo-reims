// Shared device-layer contract. The app only talks to DeviceHub.

export type Protocol = 'ftms' | 'fec-ble' | 'cps' | 'hrs' | 'csc' | 'simulator' | 'zwift-ride';
export type Capability = 'power' | 'cadence' | 'heartRate' | 'speed' | 'control' | 'buttons' | 'gears';

/** Zwift Ride / Click buttons, named by physical position. */
export type ZwiftButton =
  | 'left' | 'up' | 'right' | 'down'
  | 'a' | 'b' | 'y' | 'z'
  | 'shiftUpL' | 'shiftDnL' | 'powerUpL' | 'onOffL'
  | 'shiftUpR' | 'shiftDnR' | 'powerUpR' | 'onOffR'
  | 'paddleL' | 'paddleR';

/** How virtual gears reach the trainer. */
export type ShiftingMode = 'native' | 'ftms' | 'none';

/** Latest merged live values. A value is dropped (undefined) once it is >3 s stale. */
export interface Metrics {
  power?: number; // W, instantaneous
  cadence?: number; // rpm
  heartRate?: number; // bpm
  speed?: number; // km/h as reported by the trainer (informational only, physics is ours)
}

export interface SimParams {
  /** Percent, already scaled by trainer difficulty. 7.5 = 7.5 %. */
  grade: number;
  windSpeed?: number; // m/s, default 0
  crr?: number; // default 0.004
  cw?: number; // wind resistance coefficient kg/m, default 0.51
}

export type TrainerMode =
  | { kind: 'idle' }
  | { kind: 'erg'; watts: number }
  | { kind: 'sim'; params: SimParams };

/** What a paired device is for. One device has one role. */
export type DeviceRole = 'trainer' | 'power' | 'hr' | 'controller';

export interface DeviceInfo {
  id: string;
  name: string;
  protocol: Protocol;
  capabilities: Capability[];
  state: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  battery?: number;
}

export interface SimulatorControls {
  /** Fixed virtual cadence (rpm), null = the default ~88 rpm. */
  setCadence?(rpm: number | null): void;
  /** Rider effort used in SIM/idle mode (ERG mode follows the target). */
  readonly effortWatts: number;
  nudge(deltaWatts: number): void;
  setEffort(watts: number): void;
}

export interface DeviceHub {
  readonly supported: boolean; // navigator.bluetooth available
  readonly devices: DeviceInfo[];
  readonly metrics: Metrics;
  readonly hasControllableTrainer: boolean;
  readonly simulatorEnabled: boolean;
  readonly simulator: SimulatorControls;
  /** Fires on any device-list change or metrics update. */
  subscribe(listener: () => void): () => void;
  /** Must be called from a user gesture. */
  pairTrainer(): Promise<void>;
  pairPowerMeter(): Promise<void>;
  pairHeartRate(): Promise<void>;
  /**
   * Reconnect the rider's saved devices where the browser allows it, and keep looking for the ones not found
   * yet for a while (a trainer wakes when pedalled, a Zwift Ride when a button is pressed).
   */
  reconnectKnown(): Promise<void>;
  /** Roles whose saved device is still being looked for. */
  readonly searching: readonly DeviceRole[];
  /** Whether reconnectKnown runs on start (persisted). */
  readonly autoConnect: boolean;
  setAutoConnect(on: boolean): void;
  disconnect(id: string): Promise<void>;
  setSimulator(enabled: boolean): void;
  /** Throttled: ERG re-sent on change; SIM sent at most 1×/s and only when grade moves ≥0.1 %. */
  setMode(mode: TrainerMode): void;

  /** Pair a Zwift Ride (or Click v1) controller. Must be called from a user gesture. */
  pairController(): Promise<void>;
  /** Fires once per button press (rising edge). */
  onButton(listener: (button: ZwiftButton) => void): () => void;
  /** Short buzz on the connected Zwift controller (shift feedback). */
  vibrateController(): void;
  /**
   * Virtual gear ratio (chainring/cog, e.g. 0.75–5.49; 2.4 ≈ Zwift's middle gear).
   * null turns virtual shifting off. Applied in SIM mode only.
   */
  setGearRatio(ratio: number | null): void;
  setRiderWeights(riderKg: number, bikeKg: number): void;
  /** 'native' = Zwift trainer protocol (KICKR Core Zwift One, Zwift Hub …), 'ftms' = emulated via grade. */
  readonly shifting: ShiftingMode;
}

import type { Metrics, SimulatorControls, TrainerMode } from './types.ts';

export interface SimState {
  power: number;
  hr: number;
}

export function newSimState(): SimState {
  return { power: 0, hr: 65 };
}

/** Advance the virtual rider by dt seconds and return the metrics to emit. */
export function stepSimulator(
  s: SimState,
  mode: TrainerMode,
  effortWatts: number,
  dt: number,
  rand: () => number = Math.random,
): Metrics {
  const target = mode.kind === 'erg' ? mode.watts : effortWatts;
  const noise = mode.kind === 'erg' ? 0.02 : 0.03;
  s.power += (target - s.power) * (1 - Math.exp(-dt / 1.5));
  const power = Math.max(0, Math.round(s.power * (1 + (rand() * 2 - 1) * noise)));
  const hrTarget = Math.min(195, 60 + 0.42 * s.power);
  s.hr += (hrTarget - s.hr) * (1 - Math.exp(-dt / 25));
  return {
    power,
    cadence: power > 0 ? Math.round(88 + (rand() * 2 - 1) * 3) : 0,
    heartRate: Math.round(Math.min(195, s.hr)),
  };
}

export interface Simulator {
  controls: SimulatorControls;
  start(): void;
  stop(): void;
  setMode(mode: TrainerMode): void;
}

export function createSimulator(emit: (m: Metrics) => void): Simulator {
  let effort = 180;
  let mode: TrainerMode = { kind: 'idle' };
  let state = newSimState();
  let timer: ReturnType<typeof setInterval> | undefined;
  const clampEffort = (w: number) => Math.min(1500, Math.max(0, w));
  return {
    controls: {
      get effortWatts() {
        return effort;
      },
      nudge(d) {
        effort = clampEffort(effort + d);
      },
      setEffort(w) {
        effort = clampEffort(w);
      },
    },
    start() {
      if (timer) return;
      state = newSimState();
      timer = setInterval(() => emit(stepSimulator(state, mode, effort, 0.25)), 250);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = undefined;
    },
    setMode(m) {
      mode = m;
    },
  };
}

// Structured workout model. Power is expressed as a fraction of FTP.

export type StepKind = 'warmup' | 'cooldown' | 'steady' | 'ramp' | 'on' | 'off' | 'free' | 'maxeffort';

export interface WorkoutStep {
  kind: StepKind;
  duration: number; // seconds
  start: number; // FTP fraction at step start (0.55 = 55 %)
  end: number; // FTP fraction at step end (== start for steady)
  cadence?: number;
  label?: string;
}

export interface WorkoutMessage {
  at: number; // seconds from workout start
  text: string;
  duration?: number; // seconds on screen, default 8
}

export type WorkoutCategory =
  | 'recovery' | 'endurance' | 'tempo' | 'sweetspot' | 'threshold' | 'vo2max' | 'anaerobic' | 'climbing' | 'custom';

export interface Workout {
  id: string;
  name: string;
  description?: string;
  author?: string;
  category: WorkoutCategory;
  steps: WorkoutStep[];
  messages: WorkoutMessage[];
  duration: number; // total seconds
  tss: number;
  intensityFactor: number;
  source: 'builtin' | 'zwo';
}

export interface WorkoutState {
  elapsed: number;
  stepIndex: number;
  step: WorkoutStep;
  stepElapsed: number;
  stepRemaining: number;
  /** Target watts, or null during free-ride / max-effort steps. */
  target: number | null;
  targetFraction: number | null;
  next?: WorkoutStep;
  done: boolean;
  message?: string;
}

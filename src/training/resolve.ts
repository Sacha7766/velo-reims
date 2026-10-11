import { LIBRARY } from '../workouts/library.ts';
import type { Workout } from '../workouts/types.ts';
import { buildRampTest, RAMP_TEST_ID } from './rampTest.ts';

/** Find a plan workout by id: library, ramp test (built for the rider's FTP) or a custom workout. */
export function resolveWorkout(id: string, ftp: number, custom: Workout[] = []): Workout | undefined {
  if (id === RAMP_TEST_ID) return buildRampTest(ftp);
  return LIBRARY.find((w) => w.id === id) ?? custom.find((w) => w.id === id);
}

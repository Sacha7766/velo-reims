// A ride in progress, kept every few seconds so a dead battery, a crash or a page reload can't lose it.
// IndexedDB rather than the disk API: it has to work when the local server is gone too. Cleared once the
// ride is saved or thrown away; Home offers to carry on, save or discard what is left (App.tsx).

import { del, get, set } from 'idb-keyval';
import type { RouteData } from '../geo/route.ts';
import type { Workout } from '../workouts/types.ts';
import { profileKey } from './profiles.ts';
import type { SessionSnapshot } from './session.ts';
import type { RideRecord } from './types.ts';

export interface UnfinishedRide {
  /** How the ride was started (Home's StartRequest), to load the same world again. */
  req: { route: RouteData; workout: Workout | null; holdWatts: number | null };
  /** Started on the route's lead-in. */
  leadIn: boolean;
  snapshot: SessionSnapshot;
  /** The ride as it would be saved now, for "Save ride" without loading the world. */
  record: RideRecord;
  summitTime: number | null;
  savedAt: number;
}

const KEY = 'serpentine.unfinished';

export async function saveUnfinished(ride: UnfinishedRide) {
  try {
    await set(profileKey(KEY), ride);
  } catch (e) {
    console.warn('[unfinished] could not save', e);
  }
}

export async function loadUnfinished(): Promise<UnfinishedRide | null> {
  try {
    return (await get<UnfinishedRide>(profileKey(KEY))) ?? null;
  } catch {
    return null;
  }
}

export async function clearUnfinished() {
  try {
    await del(profileKey(KEY));
  } catch {
    /* storage blocked */
  }
}

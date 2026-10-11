// Browser side of the Strava integration: talks to the local server (server/strava.ts), which holds
// the credentials. Every call resolves quietly when Strava is not set up, so callers need no guards.

import { activeProfile } from './profiles.ts';
import type { StravaSegment } from './strava.ts';

/** Each rider profile links its own Strava account. */
const rider = () => `rider=${encodeURIComponent(activeProfile())}`;

export interface StravaStatus {
  configured: boolean;
  connected: boolean;
  athlete: string | null;
  clientId: string | null;
}

let statusCache: Promise<StravaStatus | null> | null = null;
const segmentCache = new Map<string, Promise<StravaSegment[]>>();

/** Status of the Strava link; null when the local API is not there (static preview). */
export function getStravaStatus(force = false): Promise<StravaStatus | null> {
  if (force || !statusCache) {
    statusCache = fetch(`/api/strava/status?${rider()}`)
      .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? (r.json() as Promise<StravaStatus>) : null))
      .catch(() => null);
  }
  return statusCache;
}

/** Store the owner's own Strava API application; resolves to an error message or null. */
export async function saveStravaConfig(clientId: string, clientSecret: string): Promise<string | null> {
  try {
    const res = await fetch('/api/strava/config', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    statusCache = null;
    segmentCache.clear();
    if (res.ok) return null;
    return ((await res.json()) as { error?: string }).error ?? 'Could not save';
  } catch {
    return 'The local server is not reachable';
  }
}

/** Strava segments on a preset route. [] when not connected or offline. The first lookup of a route
 * makes many Strava API calls on the server and can take a while; it keeps running there and is cached. */
export function fetchStravaSegments(routeId: string, timeoutMs = 45000): Promise<StravaSegment[]> {
  const hit = segmentCache.get(routeId);
  if (hit) return hit;
  const p = (async () => {
    const status = await getStravaStatus();
    if (!status?.connected) return [];
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(`/api/strava/segments?route=${encodeURIComponent(routeId)}&${rider()}`, { signal: ctl.signal });
      if (!res.ok) return [];
      const list = (await res.json()) as StravaSegment[];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  })();
  segmentCache.set(routeId, p);
  // a miss (timeout, offline) must not stick for the rest of the session
  void p.then((l) => l.length === 0 && segmentCache.get(routeId) === p && segmentCache.delete(routeId));
  return p;
}

/** OAuth start for the active rider. */
export const stravaConnectUrl = () => `/api/strava/connect?${rider()}`;

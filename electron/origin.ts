// The app's own origin. The port is part of it, and storage belongs to the origin: keep it fixed.

import type { WebFrameMain } from 'electron';

export const PORT = Number(process.env.SERPENTINE_PORT) || 5198;
export const ORIGIN = `http://localhost:${PORT}`;

export function isAppUrl(url: string | undefined): boolean {
  try {
    return !!url && new URL(url).origin === ORIGIN;
  } catch {
    return false;
  }
}

/** IPC from the app's own page, not from a sign-in page (Strava, Google, Apple) shown in the same window. */
export function fromApp(e: { senderFrame: WebFrameMain | null }): boolean {
  return isAppUrl(e.senderFrame?.url);
}

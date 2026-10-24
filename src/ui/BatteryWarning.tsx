import { useEffect, useRef } from 'react';
import type { RideAudio } from '../audio/RideAudio.ts';
import type { Battery } from './hooks.ts';

/** The percentage while unplugged at 20 % or less, else null. */
export function lowBattery(b: Battery | null): number | null {
  return b && !b.charging && b.level <= 0.2 ? Math.round(b.level * 100) : null;
}

/** A chime when the battery gets down to each of these. */
const STEPS = [20, 10, 5];

function timeLeft(seconds: number | null): string | null {
  // the system's first estimates after unplugging are wild; past a few hours they say nothing useful
  if (seconds === null || seconds <= 0 || seconds > 3 * 3600) return null;
  return `about ${Math.max(1, Math.round(seconds / 60))} min left`;
}

/**
 * Unplugged and low during a ride: big enough to read from the saddle, and it stays when the HUD is hidden.
 * The ride itself survives a dead laptop (sim/unfinished.ts), but the laptop dying still ends it.
 */
export function BatteryWarning({ battery, audio }: { battery: Battery | null; audio: RideAudio }) {
  const pct = lowBattery(battery);
  // the lowest step that has chimed since the charger was last plugged in
  const chimed = useRef(Infinity);
  useEffect(() => {
    if (pct === null) {
      if (battery?.charging) chimed.current = Infinity;
      return;
    }
    const step = STEPS.filter((s) => pct <= s).pop();
    if (step !== undefined && step < chimed.current) {
      chimed.current = step;
      audio.batteryLow(step <= 10);
    }
  }, [pct, battery?.charging, audio]);
  if (pct === null) return null;
  const left = timeLeft(battery?.secondsLeft ?? null);
  return (
    <div className={`battery-warning${pct <= 10 ? ' critical' : ''}`} role="alert">
      <svg viewBox="0 0 44 24" aria-hidden>
        <rect x="1.5" y="1.5" width="37" height="21" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
        <rect x="40" y="8" width="3" height="8" rx="1" fill="currentColor" />
        <rect x="5" y="5" width={Math.max(2, (30 * pct) / 100)} height="14" rx="1.5" fill="currentColor" />
      </svg>
      <span className="bw-pct">{pct} %</span>
      <span className="bw-text">
        Plug in the charger
        {left && <small>{left}</small>}
      </span>
    </div>
  );
}

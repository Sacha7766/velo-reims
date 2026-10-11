import { useEffect, useState } from 'react';
import type { AppSettings } from '../../sim/storage.ts';
import type { StravaSegment } from '../../sim/strava.ts';
import { fetchStravaSegments } from '../../sim/stravaApi.ts';
import { fmtTime } from '../format.ts';

/** Strava segments on the selected preset route with KOM and PR, plus the ghost riders. Hidden when
 * Strava is not connected or the route has none. */
export function StravaSegments({
  routeId,
  preset,
  settings,
  set,
}: {
  routeId: string;
  preset: boolean;
  settings: AppSettings;
  set: <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => void;
}) {
  const [segs, setSegs] = useState<{ route: string; list: StravaSegment[] } | null>(null);
  useEffect(() => {
    if (!preset) return;
    let alive = true;
    void fetchStravaSegments(routeId).then((list) => alive && setSegs({ route: routeId, list }));
    return () => {
      alive = false;
    };
  }, [routeId, preset]);

  const list = preset && segs?.route === routeId ? segs.list : [];
  if (!list.length) return null;
  const target = list.find((g) => g.id === settings.stravaPacerSegment) ?? list.reduce((a, b) => (b.endS - b.startS > a.endS - a.startS ? b : a));
  return (
    <section className="strava-segments" aria-label="Strava segments">
      <div className="company-row">
        <span className="label">Strava</span>
        <span className="muted small">segments on this route, from Strava</span>
      </div>
      <ul className="strava-list">
        {list.map((g) => (
          <li key={g.id}>
            <span className="sl-name">{g.name}</span>
            <span className="sl-meta">
              {(g.distance / 1000).toFixed(1)} km, {g.averageGrade.toFixed(1)} %
            </span>
            <span className="sl-times">
              {g.kom !== null && <span>KOM {fmtTime(g.kom)}</span>}
              {g.prSeconds !== null && <span>PR {fmtTime(g.prSeconds)}</span>}
            </span>
          </li>
        ))}
      </ul>
      <div className="company-row">
        <span className="label">Ghosts</span>
        <label className="toggle">
          <input type="checkbox" checked={settings.stravaKom} disabled={target.kom === null} onChange={(e) => set('stravaKom', e.target.checked)} />
          <span>KOM pace</span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={settings.stravaPr} disabled={target.prSeconds === null} onChange={(e) => set('stravaPr', e.target.checked)} />
          <span>Your PR</span>
        </label>
        {list.length > 1 && (
          <select className="dt-select" aria-label="Segment for the ghosts" value={target.id} onChange={(e) => set('stravaPacerSegment', Number(e.target.value))}>
            {list.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
      </div>
    </section>
  );
}

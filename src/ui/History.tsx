import { useEffect, useMemo, useState } from 'react';
import { listRides, openRidesFolder, type RideSummary } from '../sim/storage.ts';
import { Contours } from './Contours.tsx';
import { fmtTime, int, km } from './format.ts';

const DAY = 86400000;

function weekStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  return d.getTime() - dow * DAY;
}

interface Totals {
  rides: number;
  time: number;
  distance: number;
  gain: number;
  tss: number;
}

function totals(rides: RideSummary[]): Totals {
  return rides.reduce(
    (t, r) => ({ rides: t.rides + 1, time: t.time + r.duration, distance: t.distance + r.distance, gain: t.gain + r.gain, tss: t.tss + r.tss }),
    { rides: 0, time: 0, distance: 0, gain: 0, tss: 0 },
  );
}

const hours = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;

export function History({ onBack, onOpen, embedded = false }: { onBack: () => void; onOpen: (id: string) => void; embedded?: boolean }) {
  const [rides, setRides] = useState<RideSummary[] | null>(null);
  useEffect(() => {
    void listRides().then(setRides);
  }, []);

  const view = useMemo(() => {
    const all = rides ?? [];
    const now = Date.now();
    const thisWeek = weekStart(now);
    const year = new Date(new Date(now).getFullYear(), 0, 1).getTime();
    const periods: [string, RideSummary[]][] = [
      ['This week', all.filter((r) => r.start >= thisWeek)],
      ['Last 4 weeks', all.filter((r) => r.start >= thisWeek - 21 * DAY)],
      [String(new Date(now).getFullYear()), all.filter((r) => r.start >= year)],
      ['All time', all],
    ];
    const weeks: { start: number; tss: number; time: number }[] = [];
    for (let i = 15; i >= 0; i--) {
      const s = thisWeek - i * 7 * DAY;
      const w = all.filter((r) => r.start >= s && r.start < s + 7 * DAY);
      weeks.push({ start: s, tss: w.reduce((a, r) => a + r.tss, 0), time: w.reduce((a, r) => a + r.duration, 0) });
    }
    const pbs = new Map<string, { best: RideSummary; attempts: number }>();
    for (const r of all) {
      if (r.summitTime === null) continue;
      const cur = pbs.get(r.routeId);
      if (!cur) pbs.set(r.routeId, { best: r, attempts: 1 });
      else {
        cur.attempts++;
        if (r.summitTime < cur.best.summitTime!) cur.best = r;
      }
    }
    const efforts = ([5, 60, 300, 1200] as const).map((k) => {
      let best: RideSummary | null = null;
      for (const r of all) if ((r.bestEfforts?.[k] ?? 0) > (best?.bestEfforts?.[k] ?? 0)) best = r;
      return { k, watts: best?.bestEfforts?.[k] ?? 0, ride: best };
    });
    const months = new Map<string, RideSummary[]>();
    for (const r of all) {
      const key = new Date(r.start).toLocaleDateString('de-AT', { month: 'long', year: 'numeric' });
      if (!months.has(key)) months.set(key, []);
      months.get(key)!.push(r);
    }
    return { periods: periods.map(([label, rs]) => ({ label, ...totals(rs) })), weeks, pbs: [...pbs.values()], efforts, months: [...months] };
  }, [rides]);

  const maxTss = Math.max(50, ...view.weeks.map((w) => w.tss));

  return (
    <div className={embedded ? 'history-embedded' : 'history-page'}>
      {!embedded && <Contours />}
      <div className="history-inner">
        <header className="history-head">
          {!embedded && <h1 className="h-title">History</h1>}
          <div className="actions">
            <button className="btn ghost small" onClick={() => void openRidesFolder()}>
              Open rides folder
            </button>
            {!embedded && (
              <button className="btn" onClick={onBack}>
                Back to climbs
              </button>
            )}
          </div>
        </header>

        {rides && rides.length === 0 && (
          <p className="empty">No rides yet. Every ride longer than 30 seconds lands here, with its .fit file saved in Documents/Serpentine/rides.</p>
        )}

        {rides && rides.length > 0 && (
          <>
            <table className="totals">
              <thead>
                <tr>
                  <th />
                  <th>Rides</th>
                  <th>Time</th>
                  <th>Distance</th>
                  <th>Climbed</th>
                  <th>TSS</th>
                </tr>
              </thead>
              <tbody>
                {view.periods.map((p) => (
                  <tr key={p.label}>
                    <th scope="row">{p.label}</th>
                    <td>{p.rides}</td>
                    <td>{hours(p.time)}</td>
                    <td>
                      {km(p.distance)} <small>km</small>
                    </td>
                    <td>
                      {int(p.gain)} <small>hm</small>
                    </td>
                    <td>{int(p.tss)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <section className="weeks" aria-label="Training load per week">
              <h2>Training load, last 16 weeks</h2>
              <div className="week-bars">
                {view.weeks.map((w) => (
                  <div key={w.start} className="week" title={`${new Date(w.start).toLocaleDateString('de-AT')}: TSS ${Math.round(w.tss)}, ${hours(w.time)} h`}>
                    <span className="bar" style={{ height: `${(w.tss / maxTss) * 100}%` }} />
                    <span className="wk">{new Date(w.start).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className="h-row">
              <section>
                <h2>Climb records</h2>
                {view.pbs.length === 0 ? (
                  <p className="muted">Reach a summit to set your first record.</p>
                ) : (
                  <ul className="pbs">
                    {view.pbs.map(({ best, attempts }) => (
                      <li key={best.routeId}>
                        <button className="pb" onClick={() => onOpen(best.id)}>
                          <span className="pb-name">{best.name}</span>
                          <span className="pb-time">{fmtTime(best.summitTime!)}</span>
                          <span className="muted">
                            {new Date(best.start).toLocaleDateString('de-AT')}, {attempts} {attempts === 1 ? 'ascent' : 'ascents'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section>
                <h2>Best efforts</h2>
                <ul className="efforts">
                  {view.efforts.map((e) => (
                    <li key={e.k}>
                      <span>{e.k === 5 ? '5 s' : e.k === 60 ? '1 min' : e.k === 300 ? '5 min' : '20 min'}</span>
                      <b>{e.watts ? `${Math.round(e.watts)} W` : '–'}</b>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {view.months.map(([month, list]) => (
              <section key={month} className="month">
                <h2>{month}</h2>
                <table className="ride-table">
                  <tbody>
                    {list.map((r) => (
                      <tr key={r.id} onClick={() => onOpen(r.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpen(r.id)}>
                        <td className="muted">{new Date(r.start).toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                        <td>
                          {r.name} {r.workoutName && <span className="muted">{r.workoutName}</span>}
                        </td>
                        <td className="num">{fmtTime(r.duration)}</td>
                        <td className="num">{km(r.distance)} km</td>
                        <td className="num">{int(r.gain)} hm</td>
                        <td className="num">{Math.round(r.np)} W NP</td>
                        <td className="num">TSS {Math.round(r.tss)}</td>
                        <td className="num summit">{r.summitTime ? fmtTime(r.summitTime) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

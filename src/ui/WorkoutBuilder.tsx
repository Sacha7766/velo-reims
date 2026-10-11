import { useEffect, useMemo, useRef, useState } from 'react';
import { saveCustomWorkout } from '../sim/storage.ts';
import { buildWorkout } from '../workouts/metrics.ts';
import type { Workout, WorkoutStep } from '../workouts/types.ts';
import { toZwo } from '../workouts/zwo.ts';
import { download } from './download.ts';
import { WorkoutChart } from './WorkoutChart.tsx';

type RowKind = 'warmup' | 'steady' | 'intervals' | 'ramp' | 'cooldown' | 'free';

interface Row {
  key: number;
  kind: RowKind;
  dur: string; // mm:ss
  from: number; // % FTP
  to: number;
  cadence: string;
  reps: number;
  onDur: string;
  offDur: string;
  onPct: number;
  offPct: number;
}

const KINDS: { kind: RowKind; label: string }[] = [
  { kind: 'warmup', label: 'Warmup' },
  { kind: 'steady', label: 'Steady' },
  { kind: 'intervals', label: 'Intervals' },
  { kind: 'ramp', label: 'Ramp' },
  { kind: 'cooldown', label: 'Cooldown' },
  { kind: 'free', label: 'Free ride' },
];

export function fmtDur(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

/** "mm:ss", "h:mm:ss" or plain minutes. NaN when unreadable. */
export function parseDur(text: string): number {
  const t = text.trim();
  if (!t) return NaN;
  if (!t.includes(':')) {
    const m = Number(t.replace(',', '.'));
    return Number.isFinite(m) ? Math.round(m * 60) : NaN;
  }
  const parts = t.split(':').map((p) => Number(p));
  if (parts.length > 3 || parts.some((p) => !Number.isFinite(p) || p < 0)) return NaN;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

let keySeq = 1;
const base = (kind: RowKind): Row => ({
  key: keySeq++, kind, dur: '5:00', from: 75, to: 75, cadence: '', reps: 4, onDur: '3:00', offDur: '2:00', onPct: 110, offPct: 50,
});

function newRow(kind: RowKind): Row {
  const r = base(kind);
  switch (kind) {
    case 'warmup': return { ...r, dur: '10:00', from: 45, to: 75 };
    case 'cooldown': return { ...r, dur: '5:00', from: 60, to: 40 };
    case 'ramp': return { ...r, dur: '5:00', from: 60, to: 100 };
    case 'steady': return { ...r, dur: '10:00', from: 75, to: 75 };
    case 'free': return { ...r, dur: '10:00' };
    default: return r;
  }
}

const pct = (x: number) => Math.round(x * 100);

function rowsFromWorkout(w: Workout): Row[] {
  const rows: Row[] = [];
  const steps = w.steps;
  const cad = (s?: WorkoutStep) => (s?.cadence !== undefined ? String(s.cadence) : '');
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    if (s.kind === 'on') {
      const off = steps[i + 1]?.kind === 'off' ? steps[i + 1] : undefined;
      const last = rows[rows.length - 1];
      const same =
        last?.kind === 'intervals' &&
        last.onDur === fmtDur(s.duration) && last.onPct === pct(s.start) &&
        last.offDur === fmtDur(off?.duration ?? 0) && last.offPct === pct(off?.start ?? 0.5);
      if (same) last.reps += 1;
      else rows.push({ ...base('intervals'), reps: 1, onDur: fmtDur(s.duration), onPct: pct(s.start), offDur: fmtDur(off?.duration ?? 0), offPct: pct(off?.start ?? 0.5), cadence: cad(s) });
      if (off) i += 1;
      continue;
    }
    const dur = fmtDur(s.duration);
    if (s.kind === 'free') rows.push({ ...base('free'), dur, cadence: cad(s) });
    else if (s.kind === 'maxeffort') rows.push({ ...base('steady'), dur, from: 120, to: 120, cadence: cad(s) });
    else if (s.kind === 'warmup' || s.kind === 'cooldown' || s.kind === 'ramp') rows.push({ ...base(s.kind), dur, from: pct(s.start), to: pct(s.end), cadence: cad(s) });
    else rows.push({ ...base(s.start === s.end ? 'steady' : 'ramp'), dur, from: pct(s.start), to: pct(s.end), cadence: cad(s) });
  }
  return rows;
}

function stepsFromRows(rows: Row[]): WorkoutStep[] {
  const out: WorkoutStep[] = [];
  for (const r of rows) {
    const cadence = Number(r.cadence);
    const cad = Number.isFinite(cadence) && cadence > 0 ? { cadence } : {};
    if (r.kind === 'intervals') {
      const on = parseDur(r.onDur);
      const off = parseDur(r.offDur);
      for (let i = 0; i < r.reps; i++) {
        if (on > 0) out.push({ kind: 'on', duration: on, start: r.onPct / 100, end: r.onPct / 100, label: `Interval ${i + 1}/${r.reps}`, ...cad });
        if (off > 0) out.push({ kind: 'off', duration: off, start: r.offPct / 100, end: r.offPct / 100, label: 'Recover' });
      }
      continue;
    }
    const duration = parseDur(r.dur);
    if (!(duration > 0)) continue;
    if (r.kind === 'free') out.push({ kind: 'free', duration, start: 0.6, end: 0.6, ...cad });
    else if (r.kind === 'steady') out.push({ kind: 'steady', duration, start: r.from / 100, end: r.from / 100, ...cad });
    else out.push({ kind: r.kind, duration, start: r.from / 100, end: r.to / 100, ...cad });
  }
  return out;
}

function validate(name: string, rows: Row[]): string | null {
  if (!name.trim()) return 'Give the workout a name.';
  if (rows.length === 0) return 'Add at least one step.';
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.kind === 'intervals') {
      if (!(r.reps >= 1)) return `Step ${i + 1}: repeat at least once.`;
      if (!(parseDur(r.onDur) > 0)) return `Step ${i + 1}: the work duration must be above zero.`;
      if (!(parseDur(r.offDur) >= 0)) return `Step ${i + 1}: the rest duration is not valid.`;
    } else if (!(parseDur(r.dur) > 0)) return `Step ${i + 1}: the duration must be above zero.`;
  }
  return null;
}

function slugOf(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'workout';
}

function shortHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36).padStart(6, '0').slice(0, 6);
}

interface Props {
  ftp: number;
  initial?: Workout;
  onClose: () => void;
  onSaved: (w: Workout) => void;
}

export function WorkoutBuilder({ ftp, initial, onClose, onSaved }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [rows, setRows] = useState<Row[]>(() => (initial ? rowsFromWorkout(initial) : [newRow('warmup'), newRow('intervals'), newRow('cooldown')]));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const error = validate(name, rows);
  const steps = useMemo(() => stepsFromRows(rows), [rows]);
  const preview = useMemo(() => (steps.length ? buildWorkout({ id: 'preview', name: name || 'Preview', steps }) : null), [steps, name]);

  const patch = (key: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const move = (i: number, d: -1 | 1) =>
    setRows((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const next = rs.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const changeKind = (r: Row, kind: RowKind) => {
    const fresh = newRow(kind);
    patch(r.key, { kind, from: fresh.from, to: fresh.to, dur: kind === 'intervals' ? r.dur : r.dur || fresh.dur });
  };

  const finish = (): Workout | null => {
    if (error) return null;
    const keep = initial && initial.id.startsWith('custom-') ? initial.id : null;
    const id = keep ?? `custom-${slugOf(name)}-${shortHash(`${name}${Date.now()}${JSON.stringify(steps)}`)}`;
    return buildWorkout({
      id,
      name: name.trim(),
      description: description.trim() || undefined,
      author: initial?.author,
      category: initial?.category ?? 'custom',
      steps,
      messages: initial ? initial.messages.filter((m) => m.at < steps.reduce((a, s) => a + s.duration, 0)) : [],
      source: 'zwo',
    });
  };

  const save = async () => {
    const w = finish();
    if (!w) return;
    setBusy(true);
    setFailed('');
    try {
      await saveCustomWorkout(w);
      onSaved(w);
      onClose();
    } catch (e) {
      setFailed((e as Error).message);
      setBusy(false);
    }
  };

  const exportZwo = () => {
    const w = finish();
    if (w) download(toZwo(w), `${slugOf(w.name)}.zwo`, 'application/xml');
  };

  const watts = (p: number) => `${Math.round((p / 100) * ftp)} W`;
  const num = (v: string) => Math.max(0, Number(v) || 0);

  return (
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose()} onKeyDown={(e) => e.stopPropagation()}>
      <div className="wb" role="dialog" aria-label="Workout builder">
        <header>
          <h2>{initial ? 'Edit workout' : 'Build a workout'}</h2>
          <button className="btn ghost small" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="wb-body">
          <div className="wb-meta">
            <label className="wb-f grow">
              <span>Name</span>
              <input ref={nameRef} value={name} maxLength={60} placeholder="Tuesday sweet spot" onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="wb-f grow2">
              <span>Description</span>
              <input value={description} maxLength={240} placeholder="What it trains and how it should feel" onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>

          <ol className="wb-steps">
            {rows.map((r, i) => {
              const hasPower = r.kind !== 'free' && r.kind !== 'intervals';
              const range = r.kind === 'warmup' || r.kind === 'ramp' || r.kind === 'cooldown';
              return (
                <li key={r.key} className="wb-step">
                  <label className="wb-f kind">
                    <span>Step {i + 1}</span>
                    <select value={r.kind} onChange={(e) => changeKind(r, e.target.value as RowKind)}>
                      {KINDS.map((k) => (
                        <option key={k.kind} value={k.kind}>
                          {k.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {r.kind === 'intervals' ? (
                    <>
                      <label className="wb-f narrow">
                        <span>Repeat</span>
                        <input type="number" min={1} max={99} value={r.reps} onChange={(e) => patch(r.key, { reps: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
                      </label>
                      <label className="wb-f dur">
                        <span>Work</span>
                        <input value={r.onDur} inputMode="numeric" onChange={(e) => patch(r.key, { onDur: e.target.value })} />
                      </label>
                      <label className="wb-f pow">
                        <span>Work % FTP</span>
                        <span className="wb-pow">
                          <input type="number" min={10} max={300} value={r.onPct} onChange={(e) => patch(r.key, { onPct: num(e.target.value) })} />
                          <em>{watts(r.onPct)}</em>
                        </span>
                      </label>
                      <label className="wb-f dur">
                        <span>Rest</span>
                        <input value={r.offDur} inputMode="numeric" onChange={(e) => patch(r.key, { offDur: e.target.value })} />
                      </label>
                      <label className="wb-f pow">
                        <span>Rest % FTP</span>
                        <span className="wb-pow">
                          <input type="number" min={10} max={300} value={r.offPct} onChange={(e) => patch(r.key, { offPct: num(e.target.value) })} />
                          <em>{watts(r.offPct)}</em>
                        </span>
                      </label>
                    </>
                  ) : (
                    <>
                      <label className="wb-f dur">
                        <span>Duration</span>
                        <input value={r.dur} inputMode="numeric" onChange={(e) => patch(r.key, { dur: e.target.value })} />
                      </label>
                      {hasPower && (
                        <label className="wb-f pow">
                          <span>{range ? 'Start % FTP' : '% FTP'}</span>
                          <span className="wb-pow">
                            <input
                              type="number"
                              min={10}
                              max={300}
                              value={r.from}
                              onChange={(e) => patch(r.key, r.kind === 'steady' ? { from: num(e.target.value), to: num(e.target.value) } : { from: num(e.target.value) })}
                            />
                            <em>{watts(r.from)}</em>
                          </span>
                        </label>
                      )}
                      {hasPower && range && (
                        <label className="wb-f pow">
                          <span>End % FTP</span>
                          <span className="wb-pow">
                            <input type="number" min={10} max={300} value={r.to} onChange={(e) => patch(r.key, { to: num(e.target.value) })} />
                            <em>{watts(r.to)}</em>
                          </span>
                        </label>
                      )}
                      {r.kind === 'free' && <span className="wb-note muted">Ride by feel, no target</span>}
                    </>
                  )}

                  <label className="wb-f narrow">
                    <span>Cadence</span>
                    <input type="number" min={40} max={140} value={r.cadence} placeholder="any" onChange={(e) => patch(r.key, { cadence: e.target.value })} />
                  </label>

                  <span className="wb-tools">
                    <button className="link" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move step ${i + 1} up`}>
                      Up
                    </button>
                    <button className="link" disabled={i === rows.length - 1} onClick={() => move(i, 1)} aria-label={`Move step ${i + 1} down`}>
                      Down
                    </button>
                    <button className="link danger" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} aria-label={`Remove step ${i + 1}`}>
                      Remove
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="wb-add">
            <span className="muted">Add</span>
            {KINDS.map((k) => (
              <button key={k.kind} className="btn ghost small" onClick={() => setRows((rs) => [...rs, newRow(k.kind)])}>
                {k.label}
              </button>
            ))}
          </div>
        </div>

        <footer>
          <div className="wb-preview">
            {preview ? <WorkoutChart workout={preview} height={90} /> : <div className="wb-empty muted">The chart appears once a step has a duration</div>}
          </div>
          <div className="wb-totals">
            <span>
              <b>{preview ? fmtDur(preview.duration) : '0:00'}</b> <span className="muted">duration</span>
            </span>
            <span>
              <b>{preview ? Math.round(preview.tss) : 0}</b> <span className="muted">TSS</span>
            </span>
            <span>
              <b>{preview ? preview.intensityFactor.toFixed(2) : '0.00'}</b> <span className="muted">IF</span>
            </span>
          </div>
          <div className="wb-save">
            {(failed || error) && <span className="wb-error">{failed || error}</span>}
            <button className="btn ghost" disabled={!!error} onClick={exportZwo}>
              Export .zwo
            </button>
            <button className="btn" disabled={!!error || busy} onClick={() => void save()}>
              Save workout
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

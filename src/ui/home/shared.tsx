// Pieces shared by the home tabs: route entries, workout grouping, small form fields, devices.

import { useMemo, useState } from 'react';
import { hub } from '../../devices/index.ts';
import type { RouteData } from '../../geo/route.ts';
import { RAMP_TEST_ID } from '../../training/rampTest.ts';
import type { Workout } from '../../workouts/types.ts';
import { gradeColor, int, km } from '../format.ts';
import { useCanvas, useHub } from '../hooks.ts';
import { climbStats, drawProfile, type ProfileData } from '../profile.ts';

export interface RouteEntry {
  data: RouteData;
  profile: ProfileData;
  custom: boolean;
}

export type RideMode = 'free' | 'workout' | 'hold';

export const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'climb', label: 'Climbs' },
  { id: 'rolling', label: 'Rolling' },
  { id: 'flat', label: 'Flat' },
  { id: 'city', label: 'City' },
  { id: 'mine', label: 'Yours' },
] as const;

export function matchesCategory(r: RouteEntry, cat: string) {
  if (cat === 'all') return true;
  if (cat === 'mine') return r.custom;
  return (r.data.category ?? (r.custom ? 'rolling' : 'climb')) === cat;
}

export const CATEGORY_LABEL: Record<string, string> = { climb: 'Climb', rolling: 'Rolling', flat: 'Flat', city: 'City' };

export type LengthId = 'any' | 'short' | 'mid' | 'long';
export const LENGTHS: { id: LengthId; label: string; min: number; max: number }[] = [
  { id: 'any', label: 'Any length', min: 0, max: Infinity },
  { id: 'short', label: 'Under 1 h', min: 0, max: 60 },
  { id: 'mid', label: '1 to 1.5 h', min: 60, max: 91 },
  { id: 'long', label: 'Over 1.5 h', min: 91, max: Infinity },
];

export const WORKOUT_GROUPS: { id: string; label: string; match: (w: Workout) => boolean }[] = [
  { id: 'test', label: 'Fitness test', match: (w) => w.id === RAMP_TEST_ID },
  { id: 'mine', label: 'Your workouts', match: (w) => w.source !== 'builtin' && w.id !== RAMP_TEST_ID },
  { id: 'easy', label: 'Easy spin and endurance', match: (w) => w.source === 'builtin' && (w.category === 'recovery' || w.category === 'endurance') },
  { id: 'tempo', label: 'Tempo and sweet spot', match: (w) => w.source === 'builtin' && (w.category === 'tempo' || w.category === 'sweetspot') },
  { id: 'threshold', label: 'Threshold', match: (w) => w.source === 'builtin' && w.category === 'threshold' },
  { id: 'vo2', label: 'VO2 max and sprints', match: (w) => w.source === 'builtin' && (w.category === 'vo2max' || w.category === 'anaerobic') },
  { id: 'climb', label: 'Climbing', match: (w) => w.source === 'builtin' && w.category === 'climbing' },
  { id: 'other', label: 'More', match: (w) => w.source === 'builtin' && w.category === 'custom' && w.id !== RAMP_TEST_ID },
];

/** Duration + load label; the ramp test runs to exhaustion so its plan length is meaningless. */
export function workoutMeta(w: Workout): string {
  if (w.id === RAMP_TEST_ID) return 'about 20 min, to exhaustion';
  return `${Math.round(w.duration / 60)} min, TSS ${Math.round(w.tss)}`;
}

export function useRouteStats(entry: RouteEntry | undefined) {
  return useMemo(() => (entry ? climbStats(entry.profile) : null), [entry]);
}

export function Profile({ entry, height, bins, className }: { entry: RouteEntry; height: number; bins?: number; className?: string }) {
  const ref = useCanvas((c) => drawProfile(c, entry.profile, { padTop: 4, minSpan: 120, bins }), [entry]);
  return <canvas ref={ref} className={className} style={{ height }} />;
}

/** Route outline in plan view, coloured by gradient. */
export function RouteShape({ entry, size = 150 }: { entry: RouteEntry; size?: number }) {
  const ref = useCanvas(
    (c) => {
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (!w) return;
      c.width = w * dpr;
      c.height = h * dpr;
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const pts = entry.data.coords;
      const lat0 = pts[0][1];
      const kx = Math.cos((lat0 * Math.PI) / 180);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of pts) {
        x0 = Math.min(x0, p[0] * kx); x1 = Math.max(x1, p[0] * kx);
        y0 = Math.min(y0, -p[1]); y1 = Math.max(y1, -p[1]);
      }
      const span = Math.max(x1 - x0, y1 - y0) || 1;
      const sc = (Math.min(w, h) - 16) / span;
      const ox = (w - (x1 - x0) * sc) / 2;
      const oy = (h - (y1 - y0) * sc) / 2;
      const P = (p: number[]) => [ox + (p[0] * kx - x0) * sc, oy + (-p[1] - y0) * sc];
      const d = entry.profile.dist;
      const e = entry.profile.ele;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(5,12,16,0.6)';
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(...(P(p) as [number, number])) : ctx.moveTo(...(P(p) as [number, number]))));
      ctx.stroke();
      ctx.lineWidth = 2.6;
      const stride = Math.max(1, Math.floor(pts.length / 300));
      for (let i = stride; i < pts.length; i += stride) {
        const a = i - stride;
        const g = ((e[i] - e[a]) / Math.max(d[i] - d[a], 1)) * 100;
        ctx.strokeStyle = gradeColor(g);
        ctx.beginPath();
        ctx.moveTo(...(P(pts[a]) as [number, number]));
        ctx.lineTo(...(P(pts[i]) as [number, number]));
        ctx.stroke();
      }
      const [sx, sy] = P(pts[0]);
      ctx.fillStyle = '#eef3f4';
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.fill();
    },
    [entry],
  );
  return <canvas ref={ref} className="route-shape" style={{ width: size, height: size }} aria-hidden />;
}

export function RouteStatsLine({ entry }: { entry: RouteEntry }) {
  const s = useRouteStats(entry)!;
  return (
    <span className="r-stats">
      <span>
        <b>{km(s.length)}</b> km
      </span>
      <span>
        <b>{int(s.gain)}</b> hm
      </span>
      <span>
        <b>{s.avgGrade.toFixed(1)}</b> %
      </span>
    </span>
  );
}

/** Number input that lets you type freely: in-range values apply as you type, anything else
 * (empty, half-typed "2" for 250) waits and is clamped when you leave the field or press Enter. */
export function NumberInput({
  value, min, max, step = 1, onChange,
}: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = (s: string) => {
    const v = Number(s);
    if (s.trim() !== '' && Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
    setDraft(null);
  };
  return (
    <input
      type="number"
      inputMode="decimal"
      value={draft ?? value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const s = e.target.value;
        setDraft(s);
        const v = Number(s);
        if (s.trim() !== '' && v >= min && v <= max) onChange(v);
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

export function NumberField({
  label, unit, value, min, max, step = 1, onChange,
}: { label: string; unit: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="num-field">
      <span>{label}</span>
      <span className="num-input">
        <NumberInput value={value} min={min} max={max} step={step} onChange={onChange} />
        <i>{unit}</i>
      </span>
    </label>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="color-field">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      <span>{label}</span>
    </label>
  );
}

/** Pairing controls, live values and shifting status. */
export function DevicesPanel() {
  const { devices, metrics, simulator, shifting } = useHub();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [auto, setAuto] = useState(hub.autoConnect);
  const pair = async (kind: string, fn: () => Promise<void>) => {
    setBusy(kind);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      const msg = (e as Error).message;
      if (!/cancel/i.test(msg)) setErr(msg);
    } finally {
      setBusy(null);
    }
  };
  const real = devices.filter((d) => d.protocol !== 'simulator');
  const has = (cap: string) => real.some((d) => d.capabilities.includes(cap as never) && d.state === 'connected');
  const rows = [
    { id: 'trainer', label: 'Smart trainer', ok: has('control'), action: () => hub.pairTrainer() },
    { id: 'ride', label: 'Zwift Ride', ok: has('buttons'), action: () => hub.pairController() },
    { id: 'hr', label: 'Heart rate', ok: real.some((d) => d.protocol === 'hrs' && d.state === 'connected'), action: () => hub.pairHeartRate() },
    { id: 'pm', label: 'Power meter', ok: real.some((d) => d.protocol === 'cps' && d.state === 'connected'), action: () => hub.pairPowerMeter() },
  ];
  return (
    <div className="devices-panel">
      {!hub.supported && <p className="error">Bluetooth needs Chrome or Edge on a desktop. The keyboard simulator still works.</p>}
      <ul className="device-rows">
        {rows.map((r) => {
          const dev = real.find((d) =>
            r.id === 'trainer' ? d.capabilities.includes('control') : r.id === 'ride' ? d.protocol === 'zwift-ride' : r.id === 'hr' ? d.protocol === 'hrs' : d.protocol === 'cps',
          );
          return (
            <li key={r.id} className={r.ok ? 'ok' : ''}>
              <span className="dot" aria-hidden />
              <span className="d-label">{r.label}</span>
              <span className="d-name muted">
                {dev ? `${dev.name}${dev.state !== 'connected' ? `, ${dev.state}` : ''}${dev.battery !== undefined ? `, ${dev.battery} %` : ''}` : 'Not connected'}
              </span>
              {dev ? (
                <button className="link" onClick={() => hub.disconnect(dev.id)}>
                  Disconnect
                </button>
              ) : (
                <button className={`btn small ${r.id === 'trainer' ? '' : 'ghost'}`} disabled={!hub.supported || !!busy} onClick={() => pair(r.id, r.action)}>
                  {busy === r.id ? 'Searching…' : 'Connect'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {has('control') && (
        <p className="muted small">
          {shifting === 'native'
            ? 'Virtual shifting runs natively on the trainer, like in Zwift.'
            : shifting === 'ftms'
              ? 'Virtual shifting is emulated through the gradient. Reconnect once if this is a KICKR Core Zwift One or Zwift Hub.'
              : 'Virtual shifting is off.'}
        </p>
      )}
      <label className="toggle">
        <input type="checkbox" checked={simulator} onChange={(e) => hub.setSimulator(e.target.checked)} />
        <span>Keyboard simulator, ↑ ↓ change watts</span>
      </label>
      <label className="toggle">
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) => {
            hub.setAutoConnect(e.target.checked);
            setAuto(e.target.checked);
          }}
        />
        <span>Reconnect saved devices when the app opens</span>
      </label>
      {(metrics.power !== undefined || metrics.heartRate !== undefined) && (
        <p className="live">
          {metrics.power !== undefined && <span>{Math.round(metrics.power)} W</span>}
          {metrics.cadence !== undefined && <span>{Math.round(metrics.cadence)} rpm</span>}
          {metrics.heartRate !== undefined && <span>{Math.round(metrics.heartRate)} bpm</span>}
        </p>
      )}
      {err && <p className="error">{err}</p>}
    </div>
  );
}

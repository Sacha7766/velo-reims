import { useState } from 'react';
import { DRIVETRAINS, gearList, metresPerRev, parseTeeth, resolveDrivetrain } from '../../sim/drivetrain.ts';
import { DEFAULT_PHYSICS, powerAtSpeed } from '../../sim/physics.ts';
import type { AppSettings } from '../../sim/storage.ts';
import { NumberInput } from './shared.tsx';

const CADENCE = 60;
const GRADES = [5, 10, 15];

export function DrivetrainSection({
  settings,
  set,
}: {
  settings: AppSettings;
  set: <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => void;
}) {
  const custom = settings.customDrivetrain;
  const [rings, setRings] = useState(custom.chainrings.join(', '));
  const [cogs, setCogs] = useState(custom.cassette.join(', '));
  const dt = resolveDrivetrain(settings.drivetrain, custom);
  const gears = gearList(dt);
  const easiest = gears[0];
  const mass = settings.weight + settings.bikeWeight;
  const rows = GRADES.map((g) => {
    const v = (CADENCE / 60) * metresPerRev(dt, easiest);
    const watts = powerAtSpeed(v, g, 0, { ...DEFAULT_PHYSICS, mass });
    return { grade: g, kmh: v * 3.6, watts };
  });
  const realFeel = settings.difficulty >= 0.999;
  const patch = (c: Partial<typeof custom>) => set('customDrivetrain', { ...custom, ...c });

  return (
    <section className="drivetrain">
      <h2>Drivetrain</h2>
      <label className="text-field">
        <span>Gears</span>
        <select className="dt-select" value={settings.drivetrain} onChange={(e) => set('drivetrain', e.target.value)}>
          {DRIVETRAINS.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      {settings.drivetrain === 'custom' && (
        <>
          <label className="text-field">
            <span>Chainrings (teeth, comma separated)</span>
            <input
              value={rings}
              placeholder="50, 34"
              onChange={(e) => {
                setRings(e.target.value);
                const t = parseTeeth(e.target.value);
                if (t.length) patch({ chainrings: t });
              }}
            />
          </label>
          <label className="text-field">
            <span>Cassette (teeth, comma separated)</span>
            <input
              value={cogs}
              placeholder="11, 12, 13, 14, 15, 17, 19, 21, 24, 28, 32"
              onChange={(e) => {
                setCogs(e.target.value);
                const t = parseTeeth(e.target.value);
                if (t.length) patch({ cassette: t });
              }}
            />
          </label>
          <label className="text-field">
            <span>Wheel circumference (m)</span>
            <NumberInput min={1.5} max={2.6} step={0.005} value={custom.wheelCircumference} onChange={(v) => patch({ wheelCircumference: v })} />
          </label>
        </>
      )}
      <p className="muted small">
        {settings.drivetrain === 'zwift'
          ? 'Zwift’s 24 virtual gears, ratio 0.75 to 5.49.'
          : `${gears.length} gears from ${gears[0].label} to ${gears[gears.length - 1].label}, as you would shift them on the bike.`}
      </p>
      <table className="dt-table">
        <caption>
          At {CADENCE} rpm in the easiest gear ({easiest.label}), {mass} kg with bike
        </caption>
        <thead>
          <tr>
            <th>Climb</th>
            <th>Speed</th>
            <th>Power</th>
            <th>W/kg</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.grade}>
              <td>{r.grade} %</td>
              <td>{r.kmh.toFixed(1)} km/h</td>
              <td>{Math.round(r.watts)} W</td>
              <td>{(r.watts / settings.weight).toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">Realistic resistance needs trainer difficulty at 100 %; at lower values the trainer only feels part of the slope.</p>
      <div className="row">
        <button className={`btn ghost small ${realFeel ? 'on' : ''}`} aria-pressed={realFeel} disabled={realFeel} onClick={() => set('difficulty', 1)}>
          {realFeel ? 'Real road feel is on' : 'Real road feel'}
        </button>
      </div>
    </section>
  );
}

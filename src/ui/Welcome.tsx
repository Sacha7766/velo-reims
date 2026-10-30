import { useState } from 'react';
import { KITS } from '../sim/profiles.ts';
import type { AppSettings } from '../sim/storage.ts';
import { NumberField } from './home/shared.tsx';
import { Avatar } from './RiderPicker.tsx';

/** FTP guess before a ramp test: 2.5 W/kg, a fair start for someone who rides, rounded to 5 W. */
const estimateFtp = (kg: number) => Math.round((kg * 2.5) / 5) * 5;

/** First start: who's riding, what they weigh and what they can push, so speeds on the climbs and workout
 * targets fit from the first ride. The rest has sensible defaults under Settings. */
export function Welcome({ settings, onDone }: { settings: AppSettings; onDone: (s: AppSettings) => void }) {
  const [name, setName] = useState('');
  const [weight, setWeight] = useState(75);
  // the FTP follows the weight until the rider types their own
  const [ftp, setFtp] = useState<number | null>(null);
  const [kit, setKit] = useState(KITS[KITS.length - 1]!);
  const shownFtp = ftp ?? estimateFtp(weight);
  return (
    <div className="modal welcome">
      <form
        className="rider-card welcome-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        onSubmit={(e) => {
          e.preventDefault();
          onDone({ ...settings, name: name.trim() || 'Rider', weight, ftp: shownFtp, kit, difficulty: 0.5 });
        }}
      >
        <div className="welcome-head">
          <Avatar p={{ name: name || 'R', kit }} size={56} />
          <div>
            <h2 id="welcome-title">Welcome to Serpentine</h2>
            <p className="muted">Real roads on your smart trainer. Who's riding?</p>
          </div>
        </div>
        <label className="text-field">
          <span>Name</span>
          <input autoFocus placeholder="Your name" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
        </label>
        <div className="fields">
          <NumberField label="Weight" unit="kg" value={weight} min={35} max={150} onChange={setWeight} />
          <NumberField label="FTP" unit="W" value={shownFtp} min={80} max={500} onChange={setFtp} />
        </div>
        <p className="muted small">
          FTP is the power you can hold for about an hour. Not sure? Keep the estimate and take the 20-minute ramp test
          under Train when you're ready.
        </p>
        <div className="kit-swatches" role="radiogroup" aria-label="Your colour">
          <span>Your colour</span>
          {KITS.map((k) => (
            <button key={k} type="button" role="radio" aria-checked={k === kit} aria-label={k} style={{ background: k }} onClick={() => setKit(k)} />
          ))}
        </div>
        <p className="muted small">Trainer difficulty starts at 50 %, like Zwift. Settings has the rest.</p>
        <button className="btn">Let's ride</button>
      </form>
    </div>
  );
}

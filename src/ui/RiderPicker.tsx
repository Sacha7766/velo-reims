import { useState } from 'react';
import { activeProfile, addProfile, listProfiles, markPicked, switchProfile, type Profile } from '../sim/profiles.ts';

export function Avatar({ p, size = 28 }: { p: Pick<Profile, 'name' | 'kit'>; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.46, background: p.kit }} aria-hidden>
      {(p.name.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}

/** "Who's riding?": one tile per rider profile plus "Add rider". Picking someone else reloads the app
 * with their settings, trainer, history and Strava. `onDone` without a reload when the current rider is picked. */
export function RiderPicker({ onDone, required }: { onDone: () => void; required: boolean }) {
  const profiles = listProfiles();
  const current = activeProfile();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const pick = (id: string) => {
    if (id === current) {
      markPicked();
      onDone();
    } else switchProfile(id);
  };
  const create = () => {
    if (!name.trim()) return;
    switchProfile(addProfile(name), true);
  };
  return (
    <div className="modal rider-picker" onClick={(e) => !required && e.target === e.currentTarget && onDone()}>
      <div className="rider-card" role="dialog" aria-modal="true" aria-labelledby="rider-title">
        <h2 id="rider-title">Who's riding?</h2>
        <ul className="rider-tiles">
          {profiles.map((p) => (
            <li key={p.id}>
              <button className={p.id === current ? 'current' : ''} onClick={() => pick(p.id)}>
                <Avatar p={p} size={72} />
                <span>{p.name}</span>
              </button>
            </li>
          ))}
          <li>
            {adding ? (
              <form
                className="rider-new"
                onSubmit={(e) => {
                  e.preventDefault();
                  create();
                }}
              >
                <input autoFocus placeholder="Name" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} aria-label="New rider's name" />
                <button className="btn small" disabled={!name.trim()}>
                  Add
                </button>
              </form>
            ) : (
              <button className="add" onClick={() => setAdding(true)}>
                <span className="avatar plus" style={{ width: 72, height: 72 }} aria-hidden>
                  +
                </span>
                <span>Add rider</span>
              </button>
            )}
          </li>
        </ul>
        <p className="muted small">Each rider keeps their own weight, FTP, trainer, rides, ghosts, plan and Strava.</p>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { HELMETS, helmetById, OUTFITS, outfitById, type Outfit } from '../../engine/outfits.ts';
import { clearTileCache, tileCacheStats } from '../../geo/tileCache.ts';
import { activeProfile, MAIN, removeProfile, switchProfile } from '../../sim/profiles.ts';
import { openRidesFolder, type AppSettings } from '../../sim/storage.ts';
import { DrivetrainSection } from './DrivetrainSection.tsx';
import { KitPreview } from './KitPreview.tsx';
import { ColorField, DevicesPanel, NumberField } from './shared.tsx';
import { StravaCard } from './StravaCard.tsx';

export function SettingsTab({
  settings,
  set,
}: {
  settings: AppSettings;
  set: <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => void;
}) {
  const [tiles, setTiles] = useState<number | null>(null);
  useEffect(() => {
    void tileCacheStats().then((s) => setTiles(s.entries)).catch(() => setTiles(null));
  }, []);
  return (
    <div className="settings-tab">
      <section>
        <h2>Rider</h2>
        <label className="text-field">
          <span>Name</span>
          <input value={settings.name} onChange={(e) => set('name', e.target.value)} />
        </label>
        <div className="fields">
          <NumberField label="FTP" unit="W" value={settings.ftp} min={80} max={500} onChange={(v) => set('ftp', v)} />
          <NumberField label="Weight" unit="kg" value={settings.weight} min={35} max={150} onChange={(v) => set('weight', v)} />
          <NumberField label="Bike" unit="kg" value={settings.bikeWeight} min={5} max={20} step={0.5} onChange={(v) => set('bikeWeight', v)} />
        </div>
        {activeProfile() !== MAIN && (
          <button
            className="btn ghost small remove-rider"
            onClick={() => {
              if (!confirm(`Remove ${settings.name} as a rider? Their rides stay in the rides folder.`)) return;
              removeProfile(activeProfile());
              switchProfile(MAIN);
            }}
          >
            Remove rider {settings.name}
          </button>
        )}
      </section>

      <KitSection settings={settings} set={set} />

      <section>
        <h2>Trainer</h2>
        <label className="slider">
          <span>
            Gradient difficulty <b>{Math.round(settings.difficulty * 100)} %</b>
          </span>
          <input type="range" min={0} max={100} value={Math.round(settings.difficulty * 100)} onChange={(e) => set('difficulty', Number(e.target.value) / 100)} />
          <small>100 % feels every percent of the real road. Zwift ships at 50 %.</small>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={settings.gears} onChange={(e) => set('gears', e.target.checked)} />
          <span>Virtual gears on the shifters or the [ and ] keys</span>
        </label>
        <label className="toggle">
          <input type="checkbox" checked={settings.erg} onChange={(e) => set('erg', e.target.checked)} />
          <span>Start workouts in ERG mode</span>
        </label>
      </section>

      <DrivetrainSection settings={settings} set={set} />

      <StravaCard />

      <section className="settings-devices">
        <h2>Devices</h2>
        <DevicesPanel />
      </section>

      <section>
        <h2>World</h2>
        <div className="segmented" role="radiogroup" aria-label="Graphics quality">
          {(['low', 'medium', 'high'] as const).map((q) => (
            <button key={q} role="radio" aria-checked={settings.quality === q} className={settings.quality === q ? 'on' : ''} onClick={() => set('quality', q)}>
              {q === 'low' ? 'Fast' : q === 'medium' ? 'Balanced' : 'Beautiful'}
            </button>
          ))}
        </div>
        <p className="muted small">Resolution adapts on the fly to hold the frame rate either way.</p>
        <div className="segmented" role="radiogroup" aria-label="Frame rate">
          {([30, 60, 120] as const).map((f) => (
            <button key={f} role="radio" aria-checked={settings.frameRate === f} className={settings.frameRate === f ? 'on' : ''} onClick={() => set('frameRate', f)}>
              {f} fps
            </button>
          ))}
        </div>
        <p className="muted small">120 fps is only smoother on a ProMotion display and takes about twice the power of 60.</p>
        <label className="toggle">
          <input type="checkbox" checked={settings.batterySaver} onChange={(e) => set('batterySaver', e.target.checked)} />
          <span>Save battery when the laptop is unplugged (30 fps, Balanced graphics)</span>
        </label>
        <label className="slider">
          <span>
            Sound <b>{Math.round(settings.volume * 100)} %</b>
          </span>
          <input type="range" min={0} max={100} value={Math.round(settings.volume * 100)} onChange={(e) => set('volume', Number(e.target.value) / 100)} />
        </label>
      </section>

      <section>
        <h2>Data</h2>
        <p className="muted small">Rides are saved as .fit and .json in Documents/Serpentine/rides.</p>
        <div className="row">
          <button className="btn ghost small" onClick={() => void openRidesFolder()}>
            Open rides folder
          </button>
        </div>
        <p className="muted small">
          Map tile cache: {tiles === null ? 'unavailable' : `${tiles.toLocaleString('de-AT')} tiles`}. Rides you repeat load from it instantly.
        </p>
        <div className="row">
          <button
            className="link danger"
            onClick={async () => {
              await clearTileCache();
              setTiles(0);
            }}
          >
            Clear tile cache
          </button>
        </div>
      </section>
    </div>
  );
}

/** The jersey (its print when it has one) beside the bibs, as on the rider. */
function KitSwatch({ o }: { o: Outfit }) {
  return (
    <svg className="kit-swatch" viewBox="0 0 40 24" aria-hidden="true">
      {o.print ? (
        <>
          <rect width="24" height="24" fill={o.print[0]} />
          <path d="M0 24 L12 4 L24 24 Z" fill={o.print[1]} />
          <path d="M12 4 L24 0 L24 24 Z" fill={o.print[2]} />
        </>
      ) : (
        <>
          <rect width="24" height="24" fill={o.jersey} />
          <rect x="18" width="6" height="24" fill={o.panel} />
        </>
      )}
      <rect x="26" width="14" height="24" fill={o.bibs} />
    </svg>
  );
}

/**
 * The rider's kit: an outfit (jersey, bibs, white mid-calf socks and white shoes), the helmet's colourway and the
 * frame, beside the rider wearing them. "Your colours" brings back the jersey and stripe pickers.
 */
function KitSection({
  settings,
  set,
}: {
  settings: AppSettings;
  set: <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => void;
}) {
  const outfit = outfitById(settings.outfit);
  const helmet = helmetById(settings.helmet);
  const style = { kit: settings.kit, accent: settings.accent, bike: settings.bike, outfit, helmet };
  return (
    <section className="kit-section">
      <h2>Kit</h2>
      <div className="kit-pick">
        <fieldset className="kit-options">
          <legend>Jersey and bibs</legend>
          {OUTFITS.map((o) => (
            <label key={o.id} className="kit-option">
              <input type="radio" name="outfit" checked={settings.outfit === o.id} onChange={() => set('outfit', o.id)} />
              <KitSwatch o={o} />
              <span>{o.label}</span>
            </label>
          ))}
          <label className="kit-option">
            <input type="radio" name="outfit" checked={!outfit} onChange={() => set('outfit', 'custom')} />
            <svg className="kit-swatch" viewBox="0 0 40 24" aria-hidden="true">
              <rect width="24" height="24" fill={settings.kit} />
              <rect x="18" width="6" height="24" fill={settings.accent} />
              <rect x="26" width="14" height="24" fill="#141516" />
            </svg>
            <span>Your colours</span>
          </label>
        </fieldset>
        <KitPreview style={style} />
      </div>
      {!outfit && (
        <div className="kit">
          <ColorField label="Jersey" value={settings.kit} onChange={(v) => set('kit', v)} />
          <ColorField label="Stripe" value={settings.accent} onChange={(v) => set('accent', v)} />
        </div>
      )}
      <fieldset className="helmet-options">
        <legend>Helmet, S-Works Evade</legend>
        {HELMETS.map((h) => (
          <label key={h.id} className="helmet-option">
            <input type="radio" name="helmet" checked={helmet.id === h.id} onChange={() => set('helmet', h.id)} />
            <svg viewBox="0 0 22 22" aria-hidden="true">
              <circle cx="11" cy="11" r="11" fill={h.shell} />
              <path d="M11 0 A11 11 0 0 1 22 11 L11 11 Z" fill={h.trim} />
            </svg>
            <span>{h.label}</span>
          </label>
        ))}
      </fieldset>
      <div className="kit">
        <ColorField label="Frame" value={settings.bike} onChange={(v) => set('bike', v)} />
      </div>
      <p className="kit-note">White mid-calf socks and white shoes with every kit.</p>
    </section>
  );
}

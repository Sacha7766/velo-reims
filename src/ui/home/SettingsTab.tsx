import { useEffect, useState } from 'react';
import { clearTileCache, tileCacheStats } from '../../geo/tileCache.ts';
import { openRidesFolder, type AppSettings } from '../../sim/storage.ts';
import { DrivetrainSection } from './DrivetrainSection.tsx';
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
        <div className="kit">
          <ColorField label="Jersey" value={settings.kit} onChange={(v) => set('kit', v)} />
          <ColorField label="Stripe" value={settings.accent} onChange={(v) => set('accent', v)} />
          <ColorField label="Frame" value={settings.bike} onChange={(v) => set('bike', v)} />
        </div>
      </section>

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
        <p className="muted small">Resolution adapts on the fly to hold 60 fps either way.</p>
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

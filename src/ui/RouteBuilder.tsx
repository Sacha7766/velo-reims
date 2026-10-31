import { MAP_STYLE, maplibregl } from './mapLib.ts';
import { useEffect, useRef, useState } from 'react';
import { hash } from '../geo/gpx.ts';
import type { RouteData } from '../geo/route.ts';
import { REIMS_VILLAGES, type Village } from '../geo/villages.ts';
import { km, int } from './format.ts';
import { useCanvas } from './hooks.ts';
import { climbStats, drawProfile, profileFromCoords } from './profile.ts';

type Profile = 'fastbike' | 'trekking';
/** Points clicked on the map, or a start village and the villages to ride through (à la carte). */
type Mode = 'map' | 'villages';

const villagesGeoJson = () => ({
  type: 'FeatureCollection' as const,
  features: REIMS_VILLAGES.map((v) => ({
    type: 'Feature' as const,
    properties: { name: v.name },
    geometry: { type: 'Point' as const, coordinates: [v.lon, v.lat] },
  })),
});

export function RouteBuilder({ onClose, onSave }: { onClose: () => void; onSave: (r: RouteData) => void }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [coords, setCoords] = useState<number[][]>([]);
  const [name, setName] = useState('');
  const [profile, setProfile] = useState<Profile>('fastbike');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('map');
  const modeRef = useRef<Mode>('map');
  // the villages in riding order, and whether the route comes back to the first one
  const [stops, setStops] = useState<Village[]>([]);
  const [loop, setLoop] = useState(true);
  const [pick, setPick] = useState('');

  useEffect(() => {
    const m = new maplibregl.Map({
      container: mapEl.current!,
      style: MAP_STYLE,
      center: [13.6, 47.7],
      zoom: 8,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.on('load', () => {
      m.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'route-casing', type: 'line', source: 'route', paint: { 'line-color': '#0d1b24', 'line-width': 8 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      m.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#ffc93c', 'line-width': 4.5 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      // the villages to pick from (the base map names them); the chosen ones in the route's colour
      m.addSource('villages', { type: 'geojson', data: villagesGeoJson() });
      const dot = (id: string, color: string, r: number) =>
        m.addLayer({
          id,
          type: 'circle',
          source: 'villages',
          layout: { visibility: 'none' },
          paint: { 'circle-radius': r, 'circle-color': color, 'circle-stroke-color': '#0d1b24', 'circle-stroke-width': 2 },
        });
      dot('villages', '#eef3f4', 6);
      dot('villages-on', '#ffc93c', 8);
      m.setFilter('villages-on', ['in', ['get', 'name'], ['literal', []]]);
      m.on('click', 'villages', (e) => {
        const name = e.features?.[0]?.properties?.name as string | undefined;
        const v = REIMS_VILLAGES.find((x) => x.name === name);
        if (v) setStops((s) => [...s, v]);
      });
      m.on('mouseenter', 'villages', () => (m.getCanvas().style.cursor = 'pointer'));
      m.on('mouseleave', 'villages', () => (m.getCanvas().style.cursor = ''));
    });
    m.on('click', (e: maplibregl.MapMouseEvent) => {
      if (modeRef.current === 'map') setPoints((p) => [...p, [e.lngLat.lng, e.lngLat.lat]]);
    });
    map.current = m;
    return () => m.remove();
  }, []);

  // à la carte: the villages, in order, are the route's points
  useEffect(() => {
    modeRef.current = mode;
    const m = map.current;
    const show = (on: boolean) => {
      for (const id of ['villages', 'villages-on']) if (m?.getLayer(id)) m.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
    };
    if (m?.isStyleLoaded()) show(mode === 'villages');
    else m?.once('load', () => show(modeRef.current === 'villages'));
    if (mode !== 'villages') return;
    const pts = stops.map((v): [number, number] => [v.lon, v.lat]);
    if (loop && pts.length > 1) pts.push(pts[0]);
    setPoints(pts);
    if (m?.getLayer('villages-on')) m.setFilter('villages-on', ['in', ['get', 'name'], ['literal', stops.map((v) => v.name)]]);
  }, [mode, stops, loop]);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setPoints([]);
    setStops([]);
    if (next === 'villages') map.current?.flyTo({ center: [4.03, 49.25], zoom: 10.2 });
  };

  const addVillage = () => {
    const v = REIMS_VILLAGES.find((x) => x.name.toLowerCase() === pick.trim().toLowerCase());
    if (!v) {
      setErr(`No village called “${pick}” on the list`);
      return;
    }
    setErr(null);
    setStops((s) => [...s, v]);
    setPick('');
  };

  // markers mirror points (the villages have their own dots)
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = (mode === 'villages' ? [] : points).map((p, i) => {
      const el = document.createElement('div');
      el.className = `wp ${i === 0 ? 'wp-start' : i === points.length - 1 ? 'wp-end' : ''}`;
      const mk = new maplibregl.Marker({ element: el, draggable: true }).setLngLat(p).addTo(m);
      mk.on('dragend', () => {
        const ll = mk.getLngLat();
        setPoints((ps) => ps.map((q, j) => (j === i ? [ll.lng, ll.lat] : q)));
      });
      el.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        setPoints((ps) => ps.filter((_, j) => j !== i));
      });
      return mk;
    });
  }, [points, mode]);

  // route through BRouter whenever waypoints change
  useEffect(() => {
    if (points.length < 2) {
      setCoords([]);
      return;
    }
    const ctrl = new AbortController();
    setBusy(true);
    setErr(null);
    const lonlats = points.map((p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join('|');
    fetch(`https://brouter.de/brouter?lonlats=${lonlats}&profile=${profile}&alternativeidx=0&format=geojson`, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.text()).slice(0, 140));
        return res.json();
      })
      .then((gj) => {
        const c = gj.features[0].geometry.coordinates as number[][];
        setCoords(c);
        const src = map.current?.getSource('route') as maplibregl.GeoJSONSource | undefined;
        src?.setData(gj);
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setErr(`Routing failed: ${(e as Error).message}`);
      })
      .finally(() => !ctrl.signal.aborted && setBusy(false));
    return () => ctrl.abort();
  }, [points, profile]);

  useEffect(() => {
    if (coords.length === 0) {
      const src = map.current?.getSource('route') as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features: [] });
    }
  }, [coords]);

  const prof = coords.length > 1 ? profileFromCoords(coords) : null;
  const stats = prof ? climbStats(prof) : null;
  const canvas = useCanvas((c) => prof && drawProfile(c, prof, { minSpan: 100, bins: 60 }), [coords]);

  const search = async () => {
    if (!query.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`);
      const [hit] = await res.json();
      if (hit) map.current?.flyTo({ center: [Number(hit.lon), Number(hit.lat)], zoom: 12.5 });
      else setErr(`Nothing found for “${query}”`);
    } catch {
      setErr('Place search is unavailable right now');
    }
  };

  return (
    <div className="modal" role="dialog" aria-label="Draw a route">
      <div className="builder">
        <header>
          <h2>Draw a route</h2>
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a place — Pöstlingberg, Feuerkogel, Hochkar …" />
          </form>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="map" ref={mapEl} />
        <footer>
          <div className="builder-info">
            <div className="segmented small" role="radiogroup" aria-label="How to build the route">
              <button className={mode === 'map' ? 'on' : ''} onClick={() => switchMode('map')}>
                On the map
              </button>
              <button className={mode === 'villages' ? 'on' : ''} onClick={() => switchMode('villages')}>
                Village to village
              </button>
            </div>
            {mode === 'map' ? (
              <p className="muted">Click the map to set start, waypoints and finish. Drag to move, right-click to remove.</p>
            ) : (
              <>
                <p className="muted">
                  {stops.length ? 'Then the villages to ride through, in order:' : 'Pick the village you start from:'} click one on the map or type its
                  name.
                </p>
                <form
                  className="village-pick"
                  onSubmit={(e) => {
                    e.preventDefault();
                    addVillage();
                  }}
                >
                  <input value={pick} onChange={(e) => setPick(e.target.value)} list="reims-villages" placeholder="Village" aria-label="Village" />
                  <datalist id="reims-villages">
                    {REIMS_VILLAGES.map((v) => (
                      <option key={v.name} value={v.name} />
                    ))}
                  </datalist>
                  <button className="btn ghost" type="submit" disabled={!pick.trim()}>
                    Add
                  </button>
                </form>
                {stops.length > 0 && (
                  <ol className="village-stops">
                    {stops.map((v, i) => (
                      <li key={`${v.name}-${i}`}>
                        {v.name}
                        <button aria-label={`Remove ${v.name}`} onClick={() => setStops((s) => s.filter((_, j) => j !== i))}>
                          ×
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
                <label className="toggle">
                  <input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
                  <span>Back to the start</span>
                </label>
              </>
            )}
            <div className="segmented small" role="radiogroup" aria-label="Road type">
              <button className={profile === 'fastbike' ? 'on' : ''} onClick={() => setProfile('fastbike')}>
                Road bike
              </button>
              <button className={profile === 'trekking' ? 'on' : ''} onClick={() => setProfile('trekking')}>
                Gravel and paths
              </button>
            </div>
            {stats && (
              <p className="r-stats">
                <span>
                  <b>{km(stats.length)}</b> km
                </span>
                <span>
                  <b>{int(stats.gain)}</b> hm
                </span>
                <span>
                  <b>{stats.avgGrade.toFixed(1)}</b> % avg
                </span>
              </p>
            )}
            {busy && <p className="muted">Routing…</p>}
            {err && <p className="error">{err}</p>}
          </div>
          <canvas ref={canvas} className="builder-profile" />
          <div className="builder-save">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={mode === 'villages' ? 'Name this route' : 'Name this climb'} aria-label="Route name" />
            <button
              className="btn ghost"
              onClick={() => {
                setPoints([]);
                setStops([]);
              }}
              disabled={!points.length && !stops.length}
            >
              Clear
            </button>
            <button
              className="btn"
              disabled={coords.length < 2}
              onClick={() =>
                onSave({
                  id: `drawn-${hash(JSON.stringify(points))}`,
                  name: name.trim() || (mode === 'villages' && stops.length ? villageRouteName(stops, loop) : 'My climb'),
                  source: 'drawn',
                  region: mode === 'villages' ? 'Villages around Reims' : 'Drawn route',
                  coords,
                })
              }
            >
              Save route
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/** "Saint-Thierry – Merfy – Trigny" (a loop: "Saint-Thierry loop via Merfy and Trigny"). */
function villageRouteName(stops: Village[], loop: boolean): string {
  const names = stops.map((v) => v.name);
  if (!loop || names.length < 2) return names.join(' – ');
  const via = names.slice(1);
  return `${names[0]} loop via ${via.length > 1 ? `${via.slice(0, -1).join(', ')} and ${via.at(-1)}` : via[0]}`;
}

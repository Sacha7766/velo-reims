import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { hash } from '../geo/gpx.ts';
import type { RouteData } from '../geo/route.ts';
import { km, int } from './format.ts';
import { useCanvas } from './hooks.ts';
import { climbStats, drawProfile, profileFromCoords } from './profile.ts';

type Profile = 'fastbike' | 'trekking';

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

  useEffect(() => {
    const m = new maplibregl.Map({
      container: mapEl.current!,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [13.6, 47.7],
      zoom: 8,
      attributionControl: { compact: true },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    m.on('load', () => {
      m.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'route-casing', type: 'line', source: 'route', paint: { 'line-color': '#0d1b24', 'line-width': 8 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      m.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#ffc93c', 'line-width': 4.5 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
    });
    m.on('click', (e: maplibregl.MapMouseEvent) => setPoints((p) => [...p, [e.lngLat.lng, e.lngLat.lat]]));
    map.current = m;
    return () => m.remove();
  }, []);

  // markers mirror points
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((mk) => mk.remove());
    markers.current = points.map((p, i) => {
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
  }, [points]);

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
            <p className="muted">Click the map to set start, waypoints and finish. Drag to move, right-click to remove.</p>
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
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this climb" aria-label="Route name" />
            <button className="btn ghost" onClick={() => setPoints([])} disabled={!points.length}>
              Clear
            </button>
            <button
              className="btn"
              disabled={coords.length < 2}
              onClick={() =>
                onSave({
                  id: `drawn-${hash(JSON.stringify(points))}`,
                  name: name.trim() || 'My climb',
                  source: 'drawn',
                  region: 'Drawn route',
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

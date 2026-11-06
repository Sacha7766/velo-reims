// The selected route on a street map, framed to fit: its line and its start. Loaded with the route panel, so
// MapLibre stays out of the first screen's bundle.

import { useEffect, useRef } from 'react';
import { MAP_STYLE, maplibregl } from '../mapLib.ts';
import { hoverPoint, hoverText, setHover, useHover } from './hover.ts';
import type { RouteEntry } from './shared.tsx';

export function RouteMap({ entry, width = 380, height = 250 }: { entry: RouteEntry; width?: number; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const d = useHover();
  const p = d === null ? null : hoverPoint(entry, d);
  const map = useRef<maplibregl.Map | null>(null);
  const loaded = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const m = new maplibregl.Map({ container: el.current!, style: MAP_STYLE, interactive: false, attributionControl: { compact: true } });
    loaded.current = new Promise((done) =>
      m.on('load', () => {
        const none = { type: 'FeatureCollection' as const, features: [] };
        m.addSource('route', { type: 'geojson', data: none });
        m.addSource('start', { type: 'geojson', data: none });
        m.addLayer({ id: 'casing', type: 'line', source: 'route', paint: { 'line-color': '#0d1b24', 'line-width': 7 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        m.addLayer({ id: 'line', type: 'line', source: 'route', paint: { 'line-color': '#ffb400', 'line-width': 4 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
        m.addLayer({ id: 'start', type: 'circle', source: 'start', paint: { 'circle-radius': 6, 'circle-color': '#ffffff', 'circle-stroke-color': '#0d1b24', 'circle-stroke-width': 2.5 } });
        m.addSource('hover', { type: 'geojson', data: none });
        m.addLayer({ id: 'hover', type: 'circle', source: 'hover', paint: { 'circle-radius': 7, 'circle-color': '#e5343d', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2.5 } });
        // the credit folded to its (i) button: opened, it covered a third of the small map
        el.current?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
        done();
      }),
    );
    map.current = m;
    return () => {
      map.current = null;
      m.remove();
    };
  }, []);

  useEffect(() => {
    const coords = entry.data.coords.map((p) => [p[0], p[1]]);
    void loaded.current?.then(() => {
      const m = map.current;
      if (!m) return;
      (m.getSource('route') as maplibregl.GeoJSONSource).setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });
      (m.getSource('start') as maplibregl.GeoJSONSource).setData({ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: coords[0] } });
      const b = new maplibregl.LngLatBounds();
      for (const c of coords) b.extend(c as [number, number]);
      // (the panel may have settled to its size after the map was made)
      m.resize();
      m.fitBounds(b, { padding: 24, duration: 0 });
    });
  }, [entry]);

  // the dot follows the pointer over the map (or over the profile): the point of the route nearest the pointer, if the
  // pointer is within a finger's width of the line
  const onMove = (e: React.PointerEvent) => {
    const m = map.current;
    if (!m) return;
    const r = el.current!.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    const { dist } = entry.profile;
    let best = -1, bd = 24 * 24;
    for (let i = 0; i < entry.data.coords.length; i++) {
      const c = entry.data.coords[i];
      const q = m.project([c[0], c[1]]);
      const dd = (q.x - x) ** 2 + (q.y - y) ** 2;
      if (dd < bd) { bd = dd; best = i; }
    }
    setHover(best < 0 ? null : dist[Math.min(best, dist.length - 1)]);
  };

  useEffect(() => {
    void loaded.current?.then(() => {
      (map.current?.getSource('hover') as maplibregl.GeoJSONSource | undefined)?.setData(
        p ? { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } } : { type: 'FeatureCollection', features: [] },
      );
    });
  }, [d, entry]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => setHover(null), [entry]);

  return (
    <div ref={el} className="route-map" style={{ width, height }} role="img" aria-label={`${entry.data.name} on the map`} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
      {p && <span className="map-readout">{hoverText(p)}</span>}
    </div>
  );
}

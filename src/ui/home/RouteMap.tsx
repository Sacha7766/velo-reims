// The selected route on a street map, framed to fit: its line and its start. Loaded with the route panel, so
// MapLibre stays out of the first screen's bundle.

import { useEffect, useRef } from 'react';
import { MAP_STYLE, maplibregl } from '../mapLib.ts';
import type { RouteEntry } from './shared.tsx';

export function RouteMap({ entry, width = 380, height = 250 }: { entry: RouteEntry; width?: number; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
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

  return <div ref={el} className="route-map" style={{ width, height }} role="img" aria-label={`${entry.data.name} on the map`} />;
}

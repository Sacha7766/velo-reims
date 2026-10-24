import type { RouteData } from './route.ts';

/** Parse GPX (Komoot, Strava, Garmin, RideWithGPS …) into route data. */
export function parseGpx(text: string, fallbackName = 'Imported route'): RouteData {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Not a valid GPX file');
  let pts = [...doc.getElementsByTagName('trkpt')];
  if (pts.length < 2) pts = [...doc.getElementsByTagName('rtept')];
  if (pts.length < 2) throw new Error('GPX contains no track');
  const coords = pts
    .map((p) => {
      const ele = p.getElementsByTagName('ele')[0]?.textContent;
      return [Number(p.getAttribute('lon')), Number(p.getAttribute('lat')), ele ? Number(ele) : NaN];
    })
    // a point without (or with broken) coordinates would turn every distance after it into NaN
    .filter(([lon, lat]) => Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90);
  if (coords.length < 2) throw new Error('GPX contains no track');
  const tagged = doc.querySelector('trk > name')?.textContent?.trim() || doc.querySelector('metadata > name')?.textContent?.trim();
  // router exports carry technical names; the file name is nicer then
  const name = tagged && !/^(brouter|track|route|activity)[\s_-]?/i.test(tagged) ? tagged : fallbackName;
  return { id: `gpx-${hash(text)}`, name, source: 'gpx', coords };
}

export function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

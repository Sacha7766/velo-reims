// Web Mercator helpers + the local "world" frame used by the 3D engine.
// World frame: X = east, Y = up (metres above sea level), Z = south (north is -Z).
// Mercator metres are scaled by cos(lat0) so world units are true metres near the route.

export const EARTH_RADIUS = 6378137;
export const MERC_MAX = Math.PI * EARTH_RADIUS;

export function lonLatToMerc(lon: number, lat: number): [number, number] {
  const x = (EARTH_RADIUS * lon * Math.PI) / 180;
  const y = EARTH_RADIUS * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return [x, y];
}

export function mercToLonLat(x: number, y: number): [number, number] {
  const lon = (x / EARTH_RADIUS) * (180 / Math.PI);
  const lat = (2 * Math.atan(Math.exp(y / EARTH_RADIUS)) - Math.PI / 2) * (180 / Math.PI);
  return [lon, lat];
}

export function tileSizeMerc(z: number): number {
  return (2 * MERC_MAX) / 2 ** z;
}

/** Mercator bounds of a slippy tile: [minX, minY, maxX, maxY]. */
export function tileBoundsMerc(z: number, x: number, y: number): [number, number, number, number] {
  const s = tileSizeMerc(z);
  const minX = -MERC_MAX + x * s;
  const maxY = MERC_MAX - y * s;
  return [minX, maxY - s, minX + s, maxY];
}

/** Fractional tile coordinates of a mercator point. */
export function mercToTile(mx: number, my: number, z: number): [number, number] {
  const s = tileSizeMerc(z);
  return [(mx + MERC_MAX) / s, (MERC_MAX - my) / s];
}

export interface WorldFrame {
  lon0: number;
  lat0: number;
  mx0: number;
  my0: number;
  /** cos(lat0): mercator metres → true metres. */
  k: number;
}

export function makeFrame(lon0: number, lat0: number): WorldFrame {
  const [mx0, my0] = lonLatToMerc(lon0, lat0);
  return { lon0, lat0, mx0, my0, k: Math.cos((lat0 * Math.PI) / 180) };
}

export function mercToWorld(f: WorldFrame, mx: number, my: number): [number, number] {
  return [(mx - f.mx0) * f.k, -(my - f.my0) * f.k];
}

export function worldToMerc(f: WorldFrame, wx: number, wz: number): [number, number] {
  return [wx / f.k + f.mx0, -wz / f.k + f.my0];
}

export function lonLatToWorld(f: WorldFrame, lon: number, lat: number): [number, number] {
  const [mx, my] = lonLatToMerc(lon, lat);
  return mercToWorld(f, mx, my);
}

export function worldToLonLat(f: WorldFrame, wx: number, wz: number): [number, number] {
  const [mx, my] = worldToMerc(f, wx, wz);
  return mercToLonLat(mx, my);
}

export function haversine(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r;
  const dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(a));
}

// Farm parcels of the Registre Parcellaire Graphique (IGN / ASP, Licence Ouverte 2.0), baked per route by
// scripts/bake-fields.mjs: each declared field's outline and crop code. The Champagne plain at the end of August
// is drawn from them: what each crop has become by then, field by field. A drawn route there (village to village)
// has nothing baked and asks the IGN service for them as it loads.

import { lonLatToWorld } from './mercator.ts';
import type { Route } from './route.ts';

/** What a field holds at the end of August (0: not known). */
export const STUBBLE = 1, DISCED = 2, REGROWTH = 3, BEET = 4, MAIZE = 5, POTATO = 6, ALFALFA = 7, GRASS = 8, VINES = 9,
  FALLOW = 10, HEMP = 11, SUNFLOWER = 12, FLAX = 13;

export interface Parcel {
  /** RPG crop code: BTH winter wheat, BTN beet, LUZ alfalfa, VRC vines… */
  crop: string;
  /** Outline in world metres, x/z pairs. */
  ring: Float32Array;
  /** 0..1, fixed per parcel (from its position): picks its state among the likely ones, and its tone. */
  seed: number;
}

interface FieldData {
  crops: string[];
  /** Per parcel: crop index, then the outline in micro-degrees, the first point absolute and the rest as steps. */
  parcels: number[][];
}

const WFS = 'https://data.geopf.fr/wfs/ows';
const LAYER = 'RPG.LATEST:parcelles_graphiques';
const PAGE = 5000;
/** Metres either side of the road the terrain's field mask reaches (the bake's margin). */
const MARGIN = 1100;
/** The Champagne biome's box (biome.ts biomeFor), where the fields are drawn from parcels. */
const inChampagne = (lon: number, lat: number) => lat > 48.4 && lat < 49.9 && lon > 3.3 && lon < 5.3;

/**
 * The parcels along a route that has none baked, from the IGN service: a box every 3 km of road (one box round a
 * whole loop would take in the fields in its middle too), four at a time.
 */
async function fetchParcels(route: Route): Promise<FieldData> {
  const crops: string[] = [];
  const parcels: number[][] = [];
  const seen = new Set<string>();
  const every = Math.max(1, Math.round(3000 / route.step));
  const boxes: string[] = [];
  for (let i = 0; i < route.n; i += every) {
    let s = 90, w = 180, n = -90, e = -180;
    for (let j = i; j < Math.min(route.n, i + every + 1); j++) {
      s = Math.min(s, route.lat[j]);
      n = Math.max(n, route.lat[j]);
      w = Math.min(w, route.lon[j]);
      e = Math.max(e, route.lon[j]);
    }
    const dLat = MARGIN / 110574, dLon = MARGIN / (111320 * Math.cos((((s + n) / 2) * Math.PI) / 180));
    boxes.push(`${(s - dLat).toFixed(5)},${(w - dLon).toFixed(5)},${(n + dLat).toFixed(5)},${(e + dLon).toFixed(5)}`);
  }
  const one = async (bbox: string) => {
    for (let start = 0; ; start += PAGE) {
      const url = `${WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=${LAYER}&OUTPUTFORMAT=application/json` +
        `&SRSNAME=EPSG:4326&COUNT=${PAGE}&STARTINDEX=${start}&BBOX=${bbox},urn:ogc:def:crs:EPSG::4326`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`RPG ${res.status}`);
      const page = (await res.json()) as {
        features: { id?: string; properties: { num_parcel?: string; code_cultu: string }; geometry: { type: string; coordinates: number[][][] | number[][][][] } }[];
      };
      for (const f of page.features) {
        const key = f.properties.num_parcel ?? f.id ?? '';
        if (seen.has(key)) continue;
        seen.add(key);
        let c = crops.indexOf(f.properties.code_cultu);
        if (c < 0) c = crops.push(f.properties.code_cultu) - 1;
        const polys = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) as number[][][][];
        // outer rings only, as baked
        for (const poly of polys) {
          const ring = poly[0];
          if (ring.length < 4) continue;
          const out = [c];
          let px = 0, py = 0;
          for (const [lon, lat] of ring.slice(0, -1)) {
            const x = Math.round(lon * 1e6), y = Math.round(lat * 1e6);
            out.push(x - px, y - py);
            px = x;
            py = y;
          }
          parcels.push(out);
        }
      }
      if (page.features.length < PAGE) return;
    }
  };
  for (let k = 0; k < boxes.length; k += 4) await Promise.all(boxes.slice(k, k + 4).map(one));
  return { crops, parcels };
}

/** The route's parcels: baked, or fetched for a drawn route in the Champagne; none elsewhere or offline. */
export async function loadParcels(route: Route): Promise<Parcel[]> {
  try {
    const res = await fetch(`/fields/${route.id}.json`);
    let data: FieldData;
    if (res.ok && res.headers.get('content-type')?.includes('json')) data = (await res.json()) as FieldData;
    else if (inChampagne(route.lon[0], route.lat[0])) data = await fetchParcels(route);
    else return [];
    return data.parcels.map((p) => {
      const ring = new Float32Array(p.length - 1);
      let lon = 0, lat = 0;
      for (let i = 1; i < p.length; i += 2) {
        lon += p[i];
        lat += p[i + 1];
        const [x, z] = lonLatToWorld(route.frame, lon / 1e6, lat / 1e6);
        ring[i - 1] = x;
        ring[i] = z;
      }
      return { crop: data.crops[p[0]], ring, seed: (Math.imul(p[1], 73856093) ^ Math.imul(p[2], 19349663)) / 4294967296 + 0.5 };
    });
  } catch {
    return [];
  }
}

/**
 * The state of a parcel at the end of August. Cereals, rape and peas are harvested by then: stubble, already
 * disced (déchaumage), or greening with volunteers and cover crops, in shares that follow their harvest dates
 * (winter barley first, early July; spring barley last). Beet, maize, potatoes and hemp still stand; alfalfa grows
 * back between cuts.
 */
export function lateSummer(crop: string, seed: number): number {
  const by = (stubble: number, disced: number) => (seed < stubble ? STUBBLE : seed < stubble + disced ? DISCED : REGROWTH);
  switch (crop) {
    case 'ORH': case 'SGH': case 'AVH': case 'MCR': case 'CAH':
      return by(0.3, 0.5);
    case 'BTH': case 'BDH': case 'TTH': case 'EPE':
      return by(0.5, 0.35);
    case 'ORP': case 'BTP': case 'BDP': case 'AVP': case 'SGP': case 'TTP':
      return by(0.75, 0.2);
    case 'CZH': case 'CZP': case 'MOT':
      return by(0.25, 0.4);
    case 'PHI': case 'PPR': case 'FVL': case 'FVP': case 'MPC': case 'LEC': case 'OEI': case 'OAG': case 'LIP':
      return by(0.4, 0.5);
    // fibre flax is pulled in July and retted in swaths on the field into September
    case 'LIF':
      return FLAX;
    case 'BTN': case 'BVF':
      return BEET;
    case 'MIS': case 'MIE': case 'SOG': case 'MSW':
      return MAIZE;
    case 'PTC': case 'PTF':
      return POTATO;
    case 'LUZ': case 'MLC': case 'MLG': case 'TRE': case 'VES': case 'MOH': case 'CPL':
      return ALFALFA;
    case 'PPH': case 'PTR': case 'PRL': case 'GRA': case 'VRG': case 'TRU': case 'BTA': case 'BOR': case 'BFS':
      return GRASS;
    case 'VRC': case 'VRT':
      return VINES;
    case 'CHV': case 'CSE': case 'HBL':
      return HEMP;
    case 'TRN':
      return SUNFLOWER;
    // fallow, land out of production this year, vegetables, medicinal plants: weedy, half green
    default:
      return FALLOW;
  }
}

// Farm parcels of the Registre Parcellaire Graphique (IGN / ASP, Licence Ouverte 2.0), baked per route by
// scripts/bake-fields.mjs: each declared field's outline and crop code. The Champagne plain at the end of August
// is drawn from them: what each crop has become by then, field by field.

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

/** The route's parcels, or none where nothing is baked (outside France, routes before the bake). */
export async function loadParcels(route: Route): Promise<Parcel[]> {
  try {
    const res = await fetch(`/fields/${route.id}.json`);
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return [];
    const data = (await res.json()) as { crops: string[]; parcels: number[][] };
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

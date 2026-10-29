// Regional look of a route: which plants grow, how roadsides and houses are built, how the
// ground photo is read. Chosen from the route position, overridable per route scene file.

import * as THREE from 'three';
import type { Route } from '../geo/route.ts';

export type BiomeId = 'alpine' | 'mediterranean' | 'champagne';

export interface Biome {
  id: BiomeId;
  /** Foliage atlas (same regions in both, see treeModels.ts REGIONS). */
  atlas: string;
  /** Needle trees: Norway spruce or Aleppo pine. */
  conifer: 'spruce' | 'pine';
  /** Share of conifers in untagged woods below 700 m (default 0.4). */
  lowlandConifers?: number;
  /** Leaf trees keep their leaves all year (holm oak, wild olive). */
  evergreen: boolean;
  /** Grass card colours: lush, dry, pale (high up). */
  grass: [THREE.Color, THREE.Color, THREE.Color];
  /** Tall tussock grass (carritx) instead of meadow tufts. */
  tussocks: boolean;
  /** Share of low shrub cushions (rosemary, mastic) and dwarf fan palms among ground cover. */
  shrubs: number;
  /** Tint of the shrub cushions. */
  shrubTint?: THREE.Color;
  palms: number;
  /** Ferns under the canopy. */
  ferns: boolean;
  /** Rock tint for scanned boulders and how many there are. */
  rock: THREE.Color;
  rockDensity: number;
  /** Boulders on steep slopes (scree below cliffs). */
  steepRocks?: number;
  /** OSM meadows are pushed towards mown green (Alps) or left as photographed. */
  meadowPush: number;
  /** Grey photo pixels are bare limestone (karst) rather than gravel. */
  karst: number;
  /** Karst: slope (1 − normal.y) where the cliff scan takes over; lower makes the banks above cuts rock too. */
  cliffSlope?: [number, number];
  /** Karst: how much of the rock is warm ochre (Formentor's fresh cuts) rather than grey (Tramuntana). */
  rockOchre?: number;
  /** Above this height (m) the ground is bare stone with sparse plants (Mont Ventoux's white top). */
  bareAbove?: number;
  /** Delineator posts (Austrian Leitpflock, none in Spain, French J6) and the barrier on drop-offs. */
  posts: 'at' | 'es' | 'fr';
  barrier: 'wbeam' | 'stonewall';
  /** Centre line dash and gap (m). */
  dash: [number, number];
  /** false: no centre line at all (narrow mountain roads painted only at the edges). */
  centreLine?: boolean;
  /** false: no edge lines (French country roads are painted down the middle only). */
  edgeLines?: boolean;
  /** House style (Buildings.ts): Salzburg Flachgau, Mallorca, French ski resort, Provence, Champagne. */
  buildings: 'flachgau' | 'mallorca' | 'savoie' | 'provence' | 'champagne';
  /** Day of the year the foliage is drawn for, instead of today's date. */
  day?: number;
  /** Orthophoto grading: gain, saturation and gamma (basemap.at needs lifting; IGN plains do not). */
  photoGrade?: [number, number, number];
  /** 1: arable fields photographed in spring are drawn harvested (late summer); see terrainMaterial. */
  fieldSeason?: number;
  /** Herds of cattle on the meadows near the road. */
  cattle?: boolean;
  /** Firewood stacked against farmhouse walls. */
  firewood?: boolean;
}

export const ALPINE: Biome = {
  id: 'alpine',
  atlas: '/textures/foliage.png',
  conifer: 'spruce',
  evergreen: false,
  grass: [new THREE.Color(0.98, 1.22, 0.58), new THREE.Color(1.3, 1.2, 0.72), new THREE.Color(1.1, 1.12, 0.86)],
  tussocks: false,
  shrubs: 0,
  palms: 0,
  ferns: true,
  rock: new THREE.Color(0.86, 0.9, 0.95),
  rockDensity: 1,
  meadowPush: 1,
  karst: 0,
  posts: 'at',
  barrier: 'wbeam',
  dash: [6, 12],
  buildings: 'flachgau',
};

export const MEDITERRANEAN: Biome = {
  id: 'mediterranean',
  atlas: '/textures/foliage-med.png',
  conifer: 'pine',
  evergreen: true,
  // carritx: olive green bases, straw tips in autumn
  // carritx in October: tan-gold blades over an olive base
  grass: [new THREE.Color(0.98, 0.92, 0.62), new THREE.Color(1.12, 0.98, 0.64), new THREE.Color(1.0, 0.95, 0.75)],
  tussocks: true,
  shrubs: 0.045,
  shrubTint: new THREE.Color(0.42, 0.55, 0.34),
  palms: 0.035,
  ferns: false,
  rock: new THREE.Color(0.8, 0.77, 0.7),
  rockDensity: 1.6,
  steepRocks: 0.25,
  meadowPush: 0,
  karst: 1,
  posts: 'es',
  barrier: 'stonewall',
  dash: [5, 9],
  buildings: 'mallorca',
};

// The chalk plain of Champagne (research/champagne/visual-reference.md), drawn at the end of August:
// cereals harvested to pale stubble, sugar beet and maize green, verges dry. Woods of oak, ash and
// hornbeam with plantations of black pine; villages of render, chalk and brick under red-brown tiles.
export const CHAMPAGNE: Biome = {
  id: 'champagne',
  atlas: '/textures/foliage.png',
  conifer: 'pine',
  evergreen: false,
  // late-August verges: green at the foot, straw on top, bleached where the chalk shows
  grass: [new THREE.Color(1.0, 1.1, 0.56), new THREE.Color(1.34, 1.18, 0.66), new THREE.Color(1.26, 1.18, 0.84)],
  tussocks: false,
  shrubs: 0,
  palms: 0,
  ferns: true,
  rock: new THREE.Color(0.93, 0.91, 0.86),
  rockDensity: 0.15,
  meadowPush: 0,
  karst: 0,
  posts: 'fr',
  barrier: 'wbeam',
  // French rural centre line (T1): 3 m dashes, 10 m gaps, no edge lines
  dash: [3, 10],
  edgeLines: false,
  buildings: 'champagne',
  day: 238,
  photoGrade: [1.0, 1.1, 1.08],
  fieldSeason: 1,
  cattle: false,
  firewood: false,
  // copses and the woods of the Mont de Berru are mostly broadleaf; black pine only in a few chalk plantations
  lowlandConifers: 0.15,
};

const BIOMES: Record<BiomeId, Biome> = { alpine: ALPINE, mediterranean: MEDITERRANEAN, champagne: CHAMPAGNE };

/** Mediterranean climate south of ~43.5° N in Europe and around the basin; the Champagne plain; Alpine otherwise. */
export function biomeFor(route: Route, override?: string, tweaks?: Partial<Biome>): Biome {
  const base = pickBiome(route, override);
  return tweaks ? { ...base, ...tweaks } : base;
}

function pickBiome(route: Route, override?: string): Biome {
  if (override && override in BIOMES) return BIOMES[override as BiomeId];
  const lat = route.lat[0];
  const lon = route.lon[0];
  const med = lat > 30 && lat < 43.5 && lon > -10 && lon < 37;
  // Champagne crayeuse and its edges (Reims, Épernay, Châlons, the Suippe and Aisne valleys)
  const champagne = lat > 48.4 && lat < 49.9 && lon > 3.3 && lon < 5.3;
  return med ? MEDITERRANEAN : champagne ? CHAMPAGNE : ALPINE;
}

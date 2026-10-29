// OSM building footprints → merged meshes in the regional style of the Salzburg Flachgau:
// white plaster ground floor, weathered larch upper storey or gable, wide roof overhangs,
// gabled / hipped / half-hipped (Krüppelwalm) roofs from roof:shape, a wooden balcony with
// geranium boxes on the gable front. Windows, shutters, planks and roof tiles are drawn in
// the shader from a per-vertex surface id. Other regions swap the style (Mallorca, Savoie,
// Provence, Champagne: render, chalk ashlar dressed in brick, or brick, under red-brown tiles).

import * as THREE from 'three';
import type { Building, OsmWorld } from '../geo/osm.ts';
import type { RouteIndex } from '../geo/route.ts';
import { patchMaterial } from './atmosphere.ts';
import { ALPINE, type Biome } from './biome.ts';

const BUCKET = 600;

// surface ids (vertex attribute `surf`)
const PLASTER = 0, WOOD = 1, ROOF = 2, TRIM = 3, FLOWERS = 4, GLASSWALL = 5, TIMBER = 6, MALLORCA = 7, MARES = 8, CHALK = 9, BRICK = 10, METAL = 11;
// added to a wall's surface id: no openings (chimneys), wide doors and no windows (garages, barns), tall
// round-headed windows (churches)
const BLIND = 16, DOORS = 32, NAVE = 48;

const srgb = (r: number, g: number, b: number) => new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
const WALLS = [srgb(0.95, 0.93, 0.88), srgb(0.97, 0.96, 0.93), srgb(0.93, 0.88, 0.76), srgb(0.9, 0.9, 0.87), srgb(0.95, 0.9, 0.82)];
const WOODS = [srgb(0.42, 0.29, 0.18), srgb(0.36, 0.25, 0.16), srgb(0.5, 0.36, 0.23)];
const ROOFS = [srgb(0.42, 0.2, 0.14), srgb(0.33, 0.19, 0.14), srgb(0.27, 0.27, 0.28), srgb(0.5, 0.24, 0.16), srgb(0.36, 0.36, 0.37)];
const GERANIUM = srgb(0.86, 0.1, 0.12);
// Mallorca: lime render in cream/ochre, marès sandstone, terracotta 'teula' roofs
const MED_WALLS = [srgb(0.95, 0.92, 0.84), srgb(0.97, 0.95, 0.9), srgb(0.9, 0.8, 0.62), srgb(0.93, 0.86, 0.72), srgb(0.86, 0.72, 0.52)];
const MED_ROOFS = [srgb(0.68, 0.38, 0.24), srgb(0.6, 0.34, 0.22), srgb(0.72, 0.45, 0.3)];
// Savoie / Dauphiné ski resorts (Alpe d'Huez): white and beige render or concrete, grey slate and
// steel roofs, timber upper storeys and plain timber balconies, brown shutters, no geraniums
const SAVOIE_WALLS = [srgb(0.92, 0.9, 0.85), srgb(0.86, 0.83, 0.77), srgb(0.8, 0.78, 0.74), srgb(0.9, 0.86, 0.78)];
const SAVOIE_ROOFS = [srgb(0.3, 0.3, 0.31), srgb(0.36, 0.35, 0.34), srgb(0.25, 0.25, 0.26), srgb(0.4, 0.35, 0.3)];
// Provence (Bédoin, Malaucène): warm stone and ochre render, faded canal-tile roofs
const PROV_WALLS = [srgb(0.88, 0.8, 0.66), srgb(0.92, 0.86, 0.74), srgb(0.84, 0.74, 0.6), srgb(0.9, 0.79, 0.62), srgb(0.8, 0.7, 0.58)];
const PROV_ROOFS = [srgb(0.74, 0.5, 0.38), srgb(0.68, 0.44, 0.32), srgb(0.78, 0.56, 0.43)];
// Champagne (research/champagne): cream, beige, sand and pale grey render; chalk blocks; red brick;
// mechanical tiles in reds and browns, some slate and anthracite; corrugated sheds on the farms
const CHAMP_WALLS = [
  srgb(0.93, 0.9, 0.82), srgb(0.88, 0.82, 0.7), srgb(0.84, 0.76, 0.62), srgb(0.86, 0.86, 0.84),
  srgb(0.95, 0.94, 0.9), srgb(0.9, 0.8, 0.62), srgb(0.82, 0.78, 0.7),
];
const CHALK_WALLS = [srgb(0.9, 0.87, 0.8), srgb(0.86, 0.83, 0.76), srgb(0.92, 0.9, 0.84), srgb(0.88, 0.82, 0.7)];
const BRICKS = [srgb(0.52, 0.27, 0.2), srgb(0.58, 0.31, 0.23), srgb(0.48, 0.25, 0.19), srgb(0.6, 0.36, 0.27)];
const CHAMP_ROOFS = [
  srgb(0.42, 0.27, 0.21), srgb(0.38, 0.24, 0.19), srgb(0.46, 0.3, 0.24), srgb(0.36, 0.25, 0.2),
  srgb(0.41, 0.28, 0.23), srgb(0.3, 0.31, 0.34), srgb(0.22, 0.22, 0.24), srgb(0.37, 0.23, 0.18),
];
const SHEDS = [
  srgb(0.6, 0.62, 0.6), srgb(0.45, 0.5, 0.45), srgb(0.75, 0.72, 0.64), srgb(0.52, 0.55, 0.58), srgb(0.3, 0.38, 0.32), srgb(0.82, 0.8, 0.74),
];
// fibre-cement and steel roofs
const SHED_ROOFS = [srgb(0.6, 0.6, 0.58), srgb(0.36, 0.38, 0.4), srgb(0.5, 0.47, 0.43), srgb(0.45, 0.26, 0.2), srgb(0.42, 0.46, 0.43)];
const SLATE = srgb(0.3, 0.31, 0.34);
const ZINC = srgb(0.46, 0.47, 0.48);

/** A region's houses (biome `buildings`; scenes can override it through `biomeTweaks`). */
interface Style {
  /** Mediterranean massing: low tile roofs, short eaves, render or ashlar with louvred shutters. */
  med: boolean;
  /** Bigger untagged blocks get flat roof terraces (Mallorca); elsewhere houses keep tile roofs. */
  flatTowns: boolean;
  walls: THREE.Color[];
  roofs: THREE.Color[];
  /** Share of rural houses with a timber upper storey. */
  woodTop: number;
  /** Balcony on a gable front: with geranium boxes, plain timber, or none. */
  balcony: 'geranium' | 'plain' | 'none';
  /** Roof pitch range of houses, degrees (Alpine barns are 30°). */
  pitch: [number, number];
  /** Shutter colours, one per house (linear RGB). */
  shutters: [THREE.Vector3, THREE.Vector3];
  /** Two more shutter colours: four per region instead of two. */
  moreShutters?: [THREE.Vector3, THREE.Vector3];
  /** Eave and gable overhangs (m); the Alpine ones grow with the house. */
  eaves?: [number, number];
  /** Shares of houses in chalk ashlar and in brick; the rest are rendered. */
  masonry?: [number, number];
  /** Share of houses with a brick chimney on the ridge. */
  chimneys?: number;
  /** Farm buildings: timber (Alps) or brick, chalk and corrugated sheds. */
  barns?: 'wood' | 'masonry';
  /** Share of houses with a hipped roof where OSM gives none. */
  hips?: number;
}

const V = (r: number, g: number, b: number) => new THREE.Vector3(r, g, b);
const STYLES: Record<Biome['buildings'], Style> = {
  flachgau: {
    med: false, flatTowns: false, walls: WALLS, roofs: ROOFS, woodTop: 0.55, balcony: 'geranium', pitch: [24, 30],
    shutters: [V(0.13, 0.27, 0.16), V(0.3, 0.19, 0.11)],
  },
  mallorca: {
    med: true, flatTowns: true, walls: MED_WALLS, roofs: MED_ROOFS, woodTop: 0, balcony: 'none', pitch: [17, 23],
    shutters: [V(0.16, 0.33, 0.24), V(0.16, 0.33, 0.24)],
  },
  savoie: {
    med: false, flatTowns: false, walls: SAVOIE_WALLS, roofs: SAVOIE_ROOFS, woodTop: 0.7, balcony: 'plain', pitch: [18, 25],
    shutters: [V(0.3, 0.19, 0.11), V(0.22, 0.15, 0.1)],
  },
  // shutters in the faded Provençal blue-grey and sage
  provence: {
    med: true, flatTowns: false, walls: PROV_WALLS, roofs: PROV_ROOFS, woodTop: 0, balcony: 'none', pitch: [17, 23],
    shutters: [V(0.26, 0.38, 0.44), V(0.32, 0.39, 0.26)],
  },
  // shutters off-white, pale blue-grey, brown and oxblood; steep roofs with short eaves and zinc gutters
  champagne: {
    med: false, flatTowns: false, walls: CHAMP_WALLS, roofs: CHAMP_ROOFS, woodTop: 0, balcony: 'none', pitch: [22, 32],
    shutters: [V(0.72, 0.72, 0.68), V(0.32, 0.38, 0.42)], moreShutters: [V(0.16, 0.1, 0.06), V(0.19, 0.06, 0.045)],
    eaves: [0.35, 0.12], masonry: [0.3, 0.04], chimneys: 0.6, barns: 'masonry', hips: 0.25,
  },
};

function rnd(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function parseColour(c: string | undefined, fallback: THREE.Color): THREE.Color {
  if (!c) return fallback;
  try {
    return new THREE.Color().setStyle(c, THREE.SRGBColorSpace);
  } catch {
    return fallback;
  }
}

class Builder {
  pos: number[] = [];
  col: number[] = [];
  surf: number[] = [];
  base: number[] = [];
  private y0 = 0;
  private id = 0;
  private storey = 3;
  /**
   * The building being added: its base height (storeys count from it), an id, 0–255, for per-house variety, and
   * its storey height as a step 0–7 (2.72–3.14 m; 3 is the 2.9 m every region but Champagne keeps).
   */
  setBase(y: number, id = 0, storey = 3) {
    this.y0 = y;
    this.id = id;
    this.storey = storey;
  }
  tri(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, color: THREE.Color, s: number, centre: THREE.Vector3) {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    const mid = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3).sub(centre);
    const pts = n.dot(mid) < 0 ? [a, c, b] : [a, b, c];
    for (const p of pts) {
      this.pos.push(p.x, p.y, p.z);
      this.col.push(color.r, color.g, color.b);
      // surface ids stay below 64: the building id goes above them, the storey step above that
      this.surf.push(s + this.id * 64 + this.storey * 16384);
      this.base.push(this.y0);
    }
  }
  quad(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, color: THREE.Color, s: number, centre: THREE.Vector3) {
    this.tri(a, b, c, color, s, centre);
    this.tri(a, c, d, color, s, centre);
  }
  /** Axis-aligned-in-plan box given by centre, half extents along dir/perp, y range. */
  box(cx: number, cz: number, dir: THREE.Vector2, hu: number, hv: number, y0: number, y1: number, color: THREE.Color, s: number) {
    const perp = new THREE.Vector2(-dir.y, dir.x);
    const P = (u: number, v: number, y: number) => new THREE.Vector3(cx + dir.x * u + perp.x * v, y, cz + dir.y * u + perp.y * v);
    const c = new THREE.Vector3(cx, (y0 + y1) / 2, cz);
    const corners = [[-hu, -hv], [hu, -hv], [hu, hv], [-hu, hv]];
    for (let i = 0; i < 4; i++) {
      const [u0, v0] = corners[i];
      const [u1, v1] = corners[(i + 1) % 4];
      this.quad(P(u0, v0, y0), P(u1, v1, y0), P(u1, v1, y1), P(u0, v0, y1), color, s, c);
    }
    this.quad(P(-hu, -hv, y1), P(hu, -hv, y1), P(hu, hv, y1), P(-hu, hv, y1), color, s, c);
    this.quad(P(-hu, -hv, y0), P(hu, -hv, y0), P(hu, hv, y0), P(-hu, hv, y0), color, s, c);
  }
}

function simplify(ring: Float32Array): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  const n = ring.length / 2;
  for (let i = 0; i < n; i++) pts.push(new THREE.Vector2(ring[i * 2], ring[i * 2 + 1]));
  const out: THREE.Vector2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[(i - 1 + pts.length) % pts.length];
    const c = pts[i];
    const nx = pts[(i + 1) % pts.length];
    const cross = (c.x - p.x) * (nx.y - c.y) - (c.y - p.y) * (nx.x - c.x);
    if (Math.abs(cross) > 0.4 * p.distanceTo(c) * c.distanceTo(nx) * 0.05 || pts.length <= 4) out.push(c);
  }
  return out.length >= 3 ? out : pts;
}

function addBuilding(
  bld: Building, b: Builder, heightAt: (x: number, z: number) => number, seed: number, ox: number, oz: number, style: Style,
  /** On a village street: big untagged farm buildings there are stone and brick, not steel halls. */
  village = false,
) {
  const med = style.med;
  const ring = simplify(bld.ring);
  if (ring.length < 3) return;
  let gmin = Infinity;
  let gmax = -Infinity;
  for (const p of ring) {
    const h = heightAt(p.x, p.y);
    if (!Number.isFinite(h)) return;
    gmin = Math.min(gmin, h);
    gmax = Math.max(gmax, h);
  }
  const base = gmin - 0.6;
  // Champagne houses vary in storey height (low cottages to tall nineteenth-century fronts); other regions keep 2.9 m
  const storeyStep = style.masonry ? Math.floor(rnd(seed + 71) * 8) : 3;
  const storey = 2.9 + 0.06 * (storeyStep - 3);
  b.setBase(gmax, Math.floor(rnd(seed + 61) * 256), storeyStep);
  // Mallorca: small rural houses have low hipped/gabled tile roofs, town blocks are flat with terraces
  let roofShape = bld.roof;
  if (style.flatTowns && !bld.explicitRoof) {
    let ar = 0;
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i], q = ring[(i + 1) % ring.length];
      ar += p.x * q.y - q.x * p.y;
    }
    roofShape = Math.abs(ar) / 2 < 220 ? (rnd(seed + 21) > 0.5 ? 'hipped' : 'gabled') : 'flat';
  }
  // churches and chapels: a steep white nave and, on parish churches, a tower with a spire
  const church = ['church', 'chapel', 'cathedral'].includes(bld.kind) ||
    /kirche|church|église|eglise|chiesa|kapelle|chapelle|cappella/i.test(bld.name ?? '');
  if (church && !bld.explicitRoof) roofShape = 'gabled';
  else if (style.hips && !bld.explicitRoof && roofShape === 'gabled' && rnd(seed + 73) < style.hips) roofShape = 'hipped';
  const pitched = roofShape !== 'flat';
  const levels = bld.levels ?? Math.max(1, Math.round((bld.height - (pitched ? 2.5 : 0)) / 3));
  const wallTop = gmax + Math.max(2.8, levels * storey + 0.4);
  const local = ring.map((p) => new THREE.Vector2(p.x - ox, p.y - oz));
  const cx = local.reduce((s, p) => s + p.x, 0) / local.length;
  const cz = local.reduce((s, p) => s + p.y, 0) / local.length;
  const centre = new THREE.Vector3(cx, (base + wallTop) / 2, cz);
  const barn = ['barn', 'farm_auxiliary', 'hut', 'cabin', 'shed', 'stable', 'cowshed'].includes(bld.kind);
  const big = ['apartments', 'commercial', 'industrial', 'retail', 'office', 'school', 'public', 'hospital'].includes(bld.kind);
  // mountain huts and inns (Goasn Alm, Gersbergalm, the Alpenhaus on the Kitzbüheler Horn…): all-timber
  // chalets with shingle roofs
  const alm = !big && (/alm|hütte|huette|goasn|alpenhaus|berghaus/i.test(bld.name ?? '') || bld.kind === 'hut' || bld.kind === 'cabin');
  const wood = WOODS[Math.floor(rnd(seed + 5) * WOODS.length)];
  const wallSet = style.walls;
  const masonry = style.barns === 'masonry';
  const wall = parseColour(bld.wallColour, barn && !med && !masonry ? wood : wallSet[Math.floor(rnd(seed) * wallSet.length)]).clone();
  const roofSet = style.roofs;
  const roofCol = parseColour(
    bld.roofColour,
    church ? srgb(0.33, 0.34, 0.36) : alm && !med ? srgb(0.33, 0.29, 0.25) : roofSet[Math.floor(rnd(seed + 7) * roofSet.length)],
  ).clone();
  // farmhouse look: wooden upper storey on many rural houses
  const woodTop = bld.woodTop ?? (!med && !barn && !big && !alm && !church && pitched && levels >= 2 && rnd(seed + 3) > 1 - style.woodTop);
  const split = woodTop ? wallTop - 2.7 : wallTop;
  // rural Mallorcan houses are often bare marès / limestone masonry
  const mares = med && (barn || (pitched && rnd(seed + 9) > 0.55));
  // industrial blocks (the base of the Mont Ventoux transmitter), utility buildings (substations) and
  // site containers are bare concrete or metal, never a house
  const plant = bld.kind === 'industrial' || bld.kind === 'container' || bld.kind === 'service' || bld.kind === 'silo';
  let wallSurf = plant || church ? TRIM : med ? (mares ? MARES : MALLORCA) : alm ? TIMBER : barn ? WOOD : big && levels > 3 ? GLASSWALL : PLASTER;
  if (plant && !bld.wallColour) wall.copy(srgb(0.84, 0.84, 0.82));
  if (church && !bld.wallColour) wall.copy(srgb(0.94, 0.93, 0.89));
  if (mares) wall.copy(srgb(0.8, 0.7, 0.55));
  if (alm && !med && !bld.wallColour) wall.copy(srgb(0.46, 0.36, 0.27));
  let area = 0;
  for (let i = 0; i < local.length; i++) {
    const p = local[i], q = local[(i + 1) % local.length];
    area += p.x * q.y - q.x * p.y;
  }
  area = Math.abs(area) / 2;
  // Champagne (research/champagne): houses rendered, in chalk ashlar dressed in brick, or in brick; mairies
  // and schools in pale stone under slate; garages and barns with wide doors and no windows; the big farm
  // buildings, warehouses and shops steel sheds; churches in pale stone. Untagged footprints over ~240 m²
  // are farm buildings, not houses
  const pick = (set: THREE.Color[], k: number) => set[Math.floor(rnd(seed + k) * set.length)];
  let wallMode = 0;
  let roofSurf = ROOF;
  if (masonry && !alm) {
    const r = rnd(seed + 23);
    const works = plant || ['warehouse', 'hangar', 'industrial', 'commercial', 'retail', 'agricultural'].includes(bld.kind);
    const civic = ['school', 'public', 'civic', 'townhall', 'government'].includes(bld.kind) || /mairie|école|ecole|salle des f/i.test(bld.name ?? '');
    if (bld.kind === 'silo') {
      // galvanised steel bins on the farms, concrete cell blocks at the cooperatives
      wallSurf = area < 150 ? METAL : TRIM;
      if (!bld.wallColour) wall.copy(area < 150 ? srgb(0.74, 0.76, 0.76) : srgb(0.8, 0.78, 0.72));
    } else if (church) {
      wallSurf = CHALK;
      wallMode = NAVE;
      if (!bld.wallColour) wall.copy(r < 0.6 ? srgb(0.82, 0.79, 0.72) : srgb(0.7, 0.64, 0.55));
    // the farm courtyards in the villages are stone and brick; steel sheds are the big ones on the edges
    } else if ((works && area > 150) || ((barn || bld.kind === 'yes' || bld.kind === 'farm_auxiliary') && area > (village ? 3000 : 700))) {
      wallSurf = METAL;
      roofSurf = METAL;
      if (!bld.wallColour) wall.copy(pick(SHEDS, 41));
      if (!bld.roofColour) roofCol.copy(pick(SHED_ROOFS, 47));
    } else if (civic) {
      wallSurf = r < 0.7 ? CHALK : PLASTER;
      if (!bld.wallColour) wall.copy(pick(CHALK_WALLS, 43));
      // the nineteenth-century mairie-écoles are slated (Berru, Caurel, Lavannes, Witry)
      if (!bld.roofColour && rnd(seed + 53) < 0.85) roofCol.copy(SLATE);
    } else if (barn || (bld.kind === 'yes' && area > 240)) {
      // garages and garden sheds mostly rendered, barns in brick or chalk
      const small = area < 40;
      wallSurf = r < (small ? 0.55 : 0.15) ? PLASTER : r < (small ? 0.8 : 0.55) ? BRICK : CHALK;
      wallMode = DOORS;
      if (!bld.wallColour) wall.copy(pick(wallSurf === BRICK ? BRICKS : wallSurf === CHALK ? CHALK_WALLS : CHAMP_WALLS, 43));
    } else if (!big && style.masonry) {
      wallSurf = r < style.masonry[0] ? CHALK : r < style.masonry[0] + style.masonry[1] ? BRICK : PLASTER;
      if (!bld.wallColour && wallSurf !== PLASTER) wall.copy(pick(wallSurf === BRICK ? BRICKS : CHALK_WALLS, 43));
    }
  }
  const wallId = wallSurf + wallMode;

  for (let i = 0; i < local.length; i++) {
    const p = local[i];
    const q = local[(i + 1) % local.length];
    b.quad(new THREE.Vector3(p.x, base, p.y), new THREE.Vector3(q.x, base, q.y), new THREE.Vector3(q.x, split, q.y), new THREE.Vector3(p.x, split, p.y), wall, wallId, centre);
    if (woodTop) {
      b.quad(new THREE.Vector3(p.x, split, p.y), new THREE.Vector3(q.x, split, q.y), new THREE.Vector3(q.x, wallTop, q.y), new THREE.Vector3(p.x, wallTop, p.y), wood, WOOD, centre);
    }
  }

  // oriented bounding rectangle along the longest edge
  let best = 0;
  let dir = new THREE.Vector2(1, 0);
  for (let i = 0; i < local.length; i++) {
    const e = new THREE.Vector2().subVectors(local[(i + 1) % local.length], local[i]);
    if (e.length() > best) {
      best = e.length();
      dir = e.clone().normalize();
    }
  }
  const perp = new THREE.Vector2(-dir.y, dir.x);
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (const p of local) {
    const u = p.x * dir.x + p.y * dir.y;
    const v = p.x * perp.x + p.y * perp.y;
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  const rectArea = (u1 - u0) * (v1 - v0);
  const rectish = area / rectArea > 0.78 && v1 - v0 < 34;

  // church tower over one end of the long axis: plain white shaft, a slate spire
  if (church && area > 110) {
    const vm = (v0 + v1) / 2;
    const Q = (u: number, v: number, y: number) => new THREE.Vector3(dir.x * u + perp.x * v, y, dir.y * u + perp.y * v);
    const side = Math.min(7, Math.max(3.5, (v1 - v0) * 0.45));
    const tu = u0 + side / 2;
    const tcx = dir.x * tu + perp.x * vm, tcz = dir.y * tu + perp.y * vm;
    const towerTop = gmax + Math.max(16, (wallTop - gmax) * 2.4 + 6);
    b.box(tcx, tcz, dir, side / 2, side / 2, base, towerTop, wall, masonry ? CHALK + NAVE : TRIM);
    const apex = Q(tu, vm, towerTop + side * 1.9);
    const k = [Q(u0, vm - side / 2, towerTop), Q(u0 + side, vm - side / 2, towerTop), Q(u0 + side, vm + side / 2, towerTop), Q(u0, vm + side / 2, towerTop)];
    const sc = new THREE.Vector3(tcx, towerTop, tcz);
    for (let i = 0; i < 4; i++) b.tri(k[i], k[(i + 1) % 4], apex, roofCol, ROOF, sc);
  }

  if (pitched && rectish) {
    const P = (u: number, v: number, y: number) => new THREE.Vector3(dir.x * u + perp.x * v, y, dir.y * u + perp.y * v);
    const half = (v1 - v0) / 2;
    const vm = (v0 + v1) / 2;
    // Flachgau roofs are fairly flat (~25°) with deep overhangs
    const pitch = THREE.MathUtils.degToRad(
      church ? 44 : wallSurf === METAL ? 14 : barn && !med && !masonry ? 30 : style.pitch[0] + rnd(seed + 11) * (style.pitch[1] - style.pitch[0]),
    );
    const rise = Math.min(half * Math.tan(pitch), 7);
    const ovE = style.eaves ? style.eaves[0] : med ? 0.35 : Math.min(1.4, 0.6 + half * 0.12); // eaves
    const ovG = style.eaves ? style.eaves[1] : med ? 0.25 : Math.min(1.6, 0.8 + half * 0.12); // gable ends
    const eave = wallTop - ovE * (rise / half);
    const roofCentre = new THREE.Vector3(centre.x, wallTop - 50, centre.z);
    const thick = 0.22;
    const shape = roofShape;
    // hip run along the ridge: full hip = half, half-hip only the top third
    const hip = shape === 'hipped' ? half : shape === 'half-hipped' ? half * 0.4 : 0;
    const ridgeY = wallTop + rise;
    // hip line: where the gable is cut, as a fraction along the slope from the eave
    const f = 1 - hip / half;
    const hipY = eave + f * (ridgeY - eave);
    const hipV = (half + ovE) * (hip / half);
    const rA = P(u0 - ovG + hip, vm, ridgeY);
    const rB = P(u1 + ovG - hip, vm, ridgeY);
    const e00 = P(u0 - ovG, v0 - ovE, eave), e10 = P(u1 + ovG, v0 - ovE, eave);
    const e01 = P(u0 - ovG, v1 + ovE, eave), e11 = P(u1 + ovG, v1 + ovE, eave);
    // fascia boards under the roof edge (zinc gutters on Champagne houses)
    const fascia = masonry ? ZINC : wood;
    if (hip === 0 || shape === 'skillion') {
      b.quad(e00, e10, rB, rA, roofCol, roofSurf, roofCentre);
      b.quad(e01, e11, rB, rA, roofCol, roofSurf, roofCentre);
      b.quad(e00, e10, e10.clone().setY(eave - thick), e00.clone().setY(eave - thick), fascia, TRIM, centre);
      b.quad(e01, e11, e11.clone().setY(eave - thick), e01.clone().setY(eave - thick), fascia, TRIM, centre);
    } else if (shape === 'hipped') {
      b.quad(e00, e10, rB, rA, roofCol, roofSurf, roofCentre);
      b.quad(e01, e11, rB, rA, roofCol, roofSurf, roofCentre);
      b.tri(e00, e01, rA, roofCol, roofSurf, roofCentre);
      b.tri(e10, e11, rB, roofCol, roofSurf, roofCentre);
    } else {
      // half-hip: gable wall up to the hip line, small hipped triangle above
      const hA0 = P(u0 - ovG, vm - hipV, hipY);
      const hA1 = P(u0 - ovG, vm + hipV, hipY);
      const hB0 = P(u1 + ovG, vm - hipV, hipY);
      const hB1 = P(u1 + ovG, vm + hipV, hipY);
      b.quad(e00, e10, hB0, hA0, roofCol, roofSurf, roofCentre);
      b.quad(hA0, hB0, rB, rA, roofCol, roofSurf, roofCentre);
      b.quad(e01, e11, hB1, hA1, roofCol, roofSurf, roofCentre);
      b.quad(hA1, hB1, rB, rA, roofCol, roofSurf, roofCentre);
      b.tri(hA0, hA1, rA, roofCol, roofSurf, roofCentre);
      b.tri(hB0, hB1, rB, roofCol, roofSurf, roofCentre);
    }
    // gable walls (wood on farmhouses), clipped at the hip line
    for (const u of [u0, u1]) {
      // apartment and commercial blocks have plastered gables; masonry regions build gables like the walls
      const timberGable = !masonry && !church && (woodTop || barn || (!big && rnd(seed + 13) > 0.5));
      const gw = timberGable ? wood : wall;
      const gs = timberGable ? WOOD : masonry ? wallId : PLASTER;
      if (hip >= half) continue;
      if (hip > 0) {
        b.quad(P(u, v0, wallTop), P(u, v1, wallTop), P(u, vm + hipV, hipY), P(u, vm - hipV, hipY), gw, gs, centre);
      } else {
        b.tri(P(u, v0, wallTop), P(u, v1, wallTop), P(u, vm, ridgeY), gw, gs, centre);
      }
    }
    // a brick chimney through the ridge near one gable
    if (style.chimneys && hip === 0 && !church && !barn && !big && wallSurf !== METAL && rnd(seed + 29) < style.chimneys) {
      const cu = u0 + (u1 - u0) * (rnd(seed + 31) > 0.5 ? 0.2 : 0.8);
      const ccx = dir.x * cu + perp.x * vm, ccz = dir.y * cu + perp.y * vm;
      b.box(ccx, ccz, dir, 0.28, 0.28, ridgeY - 1.2, ridgeY + 0.9, pick(BRICKS, 37), BRICK + BLIND);
    }
    // balcony (with geraniums in the Flachgau) along one gable front of houses with an upper floor
    if (style.balcony !== 'none' && !church && !barn && !big && (levels >= 2 || alm) && (alm || rnd(seed + 17) > 0.25)) {
      const u = rnd(seed + 19) > 0.5 ? u1 : u0;
      const out = u === u1 ? 1 : -1;
      const by = gmax + 2.9;
      const depth = 1.15;
      const cu = u + out * depth / 2;
      const len = (v1 - v0) * 0.82;
      const ccx = dir.x * cu + perp.x * vm, ccz = dir.y * cu + perp.y * vm;
      b.box(ccx, ccz, dir, depth / 2, len / 2, by - 0.12, by, wood, TRIM);
      // solid board railing (typical cut-out larch boards read as solid at a distance)
      const ru = u + out * (depth - 0.04);
      const rcx = dir.x * ru + perp.x * vm, rcz = dir.y * ru + perp.y * vm;
      b.box(rcx, rcz, dir, 0.04, len / 2, by, by + 0.95, wood, WOOD);
      // flower boxes on the railing
      if (style.balcony === 'geranium') {
        const fu = u + out * (depth + 0.08);
        const fcx = dir.x * fu + perp.x * vm, fcz = dir.y * fu + perp.y * vm;
        b.box(fcx, fcz, dir, 0.11, len / 2 - 0.2, by + 0.75, by + 1.12, GERANIUM, FLOWERS);
      }
    }
  } else {
    const roofCentre = new THREE.Vector3(centre.x, wallTop - 50, centre.z);
    // a pitched Alpine roof over an odd footprint (the curved and L-shaped pass hotels): hip faces up
    // from the walls to the footprint inset by a few metres, a short flat top over that
    const hipPitch = wallSurf === METAL ? 14 : (style.pitch[0] + style.pitch[1]) / 2;
    if (pitched && !med && hipRoof(b, local, wallTop, THREE.MathUtils.degToRad(hipPitch), roofCol, roofCentre, roofSurf)) return;
    const tris = THREE.ShapeUtils.triangulateShape(local, []);
    const flatRoof = med ? srgb(0.74, 0.7, 0.64) : srgb(0.38, 0.38, 0.38);
    if (med) {
      // roof terrace parapet, rendered like the walls
      for (let i = 0; i < local.length; i++) {
        const p = local[i], q = local[(i + 1) % local.length];
        b.quad(new THREE.Vector3(p.x, wallTop, p.y), new THREE.Vector3(q.x, wallTop, q.y), new THREE.Vector3(q.x, wallTop + 0.9, q.y), new THREE.Vector3(p.x, wallTop + 0.9, p.y), wall, TRIM, centre);
      }
    }
    for (const [i, j, k] of tris) {
      b.tri(
        new THREE.Vector3(local[i].x, wallTop, local[i].y),
        new THREE.Vector3(local[j].x, wallTop, local[j].y),
        new THREE.Vector3(local[k].x, wallTop, local[k].y),
        flatRoof,
        TRIM,
        roofCentre,
      );
    }
  }
}

/** Hip roof over any simple footprint by insetting it; false (draw it flat) when the inset folds over. */
function hipRoof(b: Builder, ring: THREE.Vector2[], eave: number, pitch: number, col: THREE.Color, centre: THREE.Vector3, surf = ROOF): boolean {
  const n = ring.length;
  let area = 0, perim = 0;
  for (let i = 0; i < n; i++) {
    const p = ring[i], q = ring[(i + 1) % n];
    area += p.x * q.y - q.x * p.y;
    perim += p.distanceTo(q);
  }
  const sgn = Math.sign(area);
  // inset ~3/4 of the half width (area / perimeter ≈ half the width of a long block), at most 4.5 m
  const d = Math.min(4.5, (0.75 * Math.abs(area / 2)) / perim);
  if (d < 1) return false;
  const normal = (i: number) => {
    const e = new THREE.Vector2().subVectors(ring[(i + 1) % n], ring[i]).normalize();
    return new THREE.Vector2(-e.y * sgn, e.x * sgn);
  };
  const inner = ring.map((p, i) => {
    const n0 = normal((i - 1 + n) % n), n1 = normal(i);
    const k = 1 + n0.dot(n1);
    const m = new THREE.Vector2().addVectors(n0, n1).multiplyScalar(d / Math.max(k, 0.22));
    return p.clone().add(m);
  });
  let ia = 0;
  for (let i = 0; i < n; i++) ia += inner[i].x * inner[(i + 1) % n].y - inner[(i + 1) % n].x * inner[i].y;
  if (Math.sign(ia) !== sgn || Math.abs(ia) < Math.abs(area) * 0.08) return false;
  const top = eave + d * Math.tan(pitch);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    b.quad(
      new THREE.Vector3(ring[i].x, eave, ring[i].y), new THREE.Vector3(ring[j].x, eave, ring[j].y),
      new THREE.Vector3(inner[j].x, top, inner[j].y), new THREE.Vector3(inner[i].x, top, inner[i].y), col, surf, centre,
    );
  }
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(inner, [])) {
    b.tri(new THREE.Vector3(inner[i].x, top, inner[i].y), new THREE.Vector3(inner[j].x, top, inner[j].y), new THREE.Vector3(inner[k].x, top, inner[k].y), col, surf, centre);
  }
  return true;
}

/** Windows, shutters, planks, masonry, sheet steel and roof tiles drawn from the surface id and world position. */
function facadeMaterial(style: Style) {
  // double-sided: from the street you look up at the underside of the eaves; with one-sided roofs it
  // vanished and left the gable edge of tall blocks hanging in the sky
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uShutA = { value: style.shutters[0] };
    shader.uniforms.uShutB = { value: style.shutters[1] };
    shader.uniforms.uShutC = { value: style.moreShutters?.[0] ?? style.shutters[0] };
    shader.uniforms.uShutD = { value: style.moreShutters?.[1] ?? style.shutters[1] };
    shader.uniforms.uShut4 = { value: style.moreShutters ? 1 : 0 };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float surf;\nattribute float baseY;\nvarying float vSurf;\nvarying float vBaseY;\nvarying vec3 vFNormal;',
      )
      .replace(
        '#include <beginnormal_vertex>',
        '#include <beginnormal_vertex>\nvFNormal = normalize(mat3(modelMatrix) * objectNormal);\nvSurf = surf;\nvBaseY = baseY;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uShutA;
uniform vec3 uShutB;
uniform vec3 uShutC;
uniform vec3 uShutD;
uniform float uShut4;
varying float vSurf;
varying float vBaseY;
varying vec3 vFNormal;
float fHash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec3 fShutter(float h) {
  if (uShut4 < 0.5) return h > 0.5 ? uShutA : uShutB;
  return h < 0.25 ? uShutA : h < 0.5 ? uShutB : h < 0.75 ? uShutC : uShutD;
}
// masonry: x = 1 on a block face and 0 in a joint, y = a hash per block. px is the size of a pixel on the wall
// (m): joints and then the blocks fade to their mean before they would shimmer
vec2 fChalk(float u, float hy, float px) {
  float ry = hy / 0.32;
  float row = floor(ry);
  float bx = (u + fHash(vec2(row, 1.0)) * 3.0) / (0.42 + 0.36 * fHash(vec2(row, 5.0)));
  float j = smoothstep(0.0, 0.07, fract(ry)) * smoothstep(1.0, 0.93, fract(ry)) * smoothstep(0.0, 0.05, fract(bx)) * smoothstep(1.0, 0.95, fract(bx));
  return vec2(mix(0.9, j, 1.0 - smoothstep(0.01, 0.035, px)), mix(0.5, fHash(vec2(floor(bx), row)), 1.0 - smoothstep(0.08, 0.2, px)));
}
vec2 fBrick(float u, float hy, float px) {
  float ry = hy / 0.075;
  float bx = u / 0.235 + 0.5 * mod(floor(ry), 2.0);
  float j = smoothstep(0.0, 0.16, fract(ry)) * smoothstep(1.0, 0.84, fract(ry)) * smoothstep(0.0, 0.05, fract(bx)) * smoothstep(1.0, 0.95, fract(bx));
  return vec2(mix(0.8, j, 1.0 - smoothstep(0.006, 0.02, px)), mix(0.5, fHash(vec2(floor(bx), floor(ry))), 1.0 - smoothstep(0.03, 0.07, px)));
}`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  vec3 n = normalize(vFNormal);
  vec3 wp = vAtmoWorld;
  float camD = length(wp - cameraPosition);
  float detail = 1.0 - smoothstep(500.0, 1500.0, camD);
  float wallF = 1.0 - smoothstep(0.25, 0.5, abs(n.y));
  float u = abs(n.x) > abs(n.z) ? wp.z : wp.x;
  float hy = wp.y - vBaseY;
  int raw = int(vSurf + 0.5);
  int sto = raw / 16384;
  raw -= sto * 16384;
  int hid = raw / 64;
  raw -= hid * 64;
  float storey = 2.9 + 0.06 * float(sto - 3);
  int mode = raw / 16;
  int sid = raw - mode * 16;
  // a building's id for hashing: its own id (Builder.setBase) and its base height quantised. Hashing the
  // interpolated height alone gave speckle (its last bits differ from pixel to pixel) and, on the flat plain,
  // whole streets of houses with the same hash
  float bid = floor(vBaseY * 4.0 + 0.5) * 0.25 + float(hid) * 7.31;
  // derivatives before any branching on the surface id
  vec3 fw = fwidth(wp);
  float px = max(max(fw.x, fw.y), fw.z);
  if (sid == 1) {
    // vertical larch boards, weathered darker towards the bottom and in the joints
    float board = fract(u / 0.22);
    float joint = smoothstep(0.0, 0.06, board) * smoothstep(1.0, 0.94, board);
    float grain = 0.88 + 0.12 * fHash(vec2(floor(u / 0.22), 3.0));
    diffuseColor.rgb *= mix(0.62, 1.0, joint * detail + (1.0 - detail)) * grain;
  } else if (sid == 2) {
    // roof tiles: rows and staggered courses, moss-darkened towards the eaves
    vec2 t = vec2(wp.x + wp.z, wp.y * 3.2);
    float row = fract(t.y);
    float course = fract(t.x / 0.3 + floor(t.y) * 0.5);
    float tile = smoothstep(0.0, 0.12, row) * (0.85 + 0.15 * smoothstep(0.0, 0.1, course) * smoothstep(1.0, 0.9, course));
    diffuseColor.rgb *= mix(1.0, 0.75 + 0.25 * tile, detail) * (0.9 + 0.2 * fHash(floor(t)));
  } else if (sid == 0 || sid == 5 || sid == 9 || sid == 10) {
    // render (0), glass-walled blocks (5), Champagne chalk ashlar dressed in brick (9) and brick (10): a socle,
    // windows with frames, shutters and sky reflections; or wide doors (garages, barns), or church windows
    float house = fHash(vec2(bid, 0.37));
    float k = wallF * detail;
    // dull red-brown dressings; orange-red read as painted trim
    vec3 brickCol = mix(vec3(0.2, 0.075, 0.045), vec3(0.27, 0.11, 0.065), fHash(vec2(bid, 9.0)));
    float brickTone = 0.8 + 0.4 * fBrick(u, hy, px).y;
    if (sid == 9) {
      vec2 c = fChalk(u, hy, px);
      diffuseColor.rgb = mix(diffuseColor.rgb * 0.8, diffuseColor.rgb * (0.88 + 0.22 * c.y), c.x);
    } else if (sid == 10) {
      vec2 c = fBrick(u, hy, px);
      diffuseColor.rgb = mix(vec3(0.5, 0.48, 0.43), diffuseColor.rgb * (0.78 + 0.44 * c.y), c.x);
    } else {
      diffuseColor.rgb *= 0.96 + 0.04 * fHash(floor(wp.xz * 3.0) + floor(wp.y * 3.0));
    }
    float socle = (1.0 - step(0.55, hy)) * wallF;
    if (sid == 9 && mode != 3) diffuseColor.rgb = mix(diffuseColor.rgb, brickCol * brickTone, socle * step(0.5, house));
    else diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.72, 0.7, 0.66), socle);
    // each house its own window grid: bays of 2.7 to 3.5 m, windows 0.95 to 1.25 m wide, off the neighbours' rhythm
    float bay = sid == 5 ? 2.2 : 2.7 + 0.8 * fHash(vec2(bid, 4.0));
    float gx = u / bay + (sid == 5 ? 0.0 : fHash(vec2(bid, 5.0)));
    float fx = fract(gx);
    float fy = fract((hy - 0.45) / storey);
    float ww = sid == 5 ? 0.42 : (0.95 + 0.3 * fHash(vec2(bid, 6.0))) / (2.0 * bay);
    float open = mode == 0 ? 1.0 : 0.0;
    float rowIn = step(0.3, fy) * step(fy, 0.78) * step(0.4, hy);
    float win = open * step(0.5 - ww, fx) * step(fx, 0.5 + ww) * rowIn;
    float frame = win * (1.0 - step(0.5 - ww + 0.025, fx) * step(fx, 0.5 + ww - 0.025) * step(0.32, fy) * step(fy, 0.76));
    float mullion = win * step(abs(fx - 0.5), 0.008) * (sid == 5 ? 0.0 : 1.0);
    // dressings: brick jambs and lintels on some chalk houses (the Lavannes mairie); a pale stone sill and lintel on brick
    float dx = 0.13 / bay, dy = 0.045;
    float around = open * (1.0 - win) * step(0.5 - ww - dx, fx) * step(fx, 0.5 + ww + dx) * step(0.4, hy);
    float jambs = around * step(0.3 - dy, fy) * step(fy, 0.78 + dy * 1.8);
    float sills = around * (step(0.3 - dy, fy) * step(fy, 0.3) + step(0.78, fy) * step(fy, 0.78 + dy * 1.8));
    if (sid == 9) diffuseColor.rgb = mix(diffuseColor.rgb, brickCol * brickTone, jambs * step(0.55, fHash(vec2(bid, 11.0))) * k);
    if (sid == 10) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.6, 0.55), sills * k);
    // shutters beside rural windows, one colour per house. In Champagne many houses have roller shutters
    // instead (a box over the window, the blind part way down), and some side shutters are closed
    float cell = fHash(floor(vec2(gx, (hy - 0.45) / storey)) + bid);
    float roller = uShut4 * step(sid == 0 ? 0.5 : 0.82, fHash(vec2(bid * 0.71, 2.0)));
    float closed = uShut4 * (1.0 - roller) * step(0.78, cell);
    float side = step(0.5 - ww - 0.13, fx) * step(fx, 0.5 - ww - 0.01) + step(0.5 + ww + 0.01, fx) * step(fx, 0.5 + ww + 0.13);
    float shut = (sid == 5 ? 0.0 : 1.0) * open * rowIn * side * (1.0 - roller) * (1.0 - closed);
    float slats = 1.0 - smoothstep(0.005, 0.015, px);
    vec3 shutterCol = fShutter(house) * mix(0.95, 0.9 + 0.1 * step(0.5, fract(hy * 14.0)), slats);
    float wy = (fy - 0.3) / 0.48;
    float blindDown = win * roller * step(1.0 - 0.7 * pow(cell, 1.6), wy);
    float rollerBox = open * roller * step(0.5 - ww, fx) * step(fx, 0.5 + ww) * step(0.78, fy) * step(fy, 0.83) * step(0.4, hy);
    vec3 v = normalize(wp - cameraPosition);
    vec3 r = reflect(v, n);
    vec3 sky = atmoSky(normalize(vec3(r.x, abs(r.y) * 0.6 + 0.05, r.z)));
    float fres = 0.15 + 0.6 * pow(1.0 - abs(dot(-v, n)), 3.0);
    vec3 glass = mix(vec3(0.04, 0.05, 0.06), sky * 0.9, fres);
    diffuseColor.rgb = mix(diffuseColor.rgb, shutterCol, shut * k);
    diffuseColor.rgb = mix(diffuseColor.rgb, glass, win * k);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.9, 0.86), max(frame, mullion) * k);
    diffuseColor.rgb = mix(diffuseColor.rgb, shutterCol, win * closed * k);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72, 0.72, 0.7) * mix(0.94, 0.88 + 0.12 * step(0.5, fract(hy * 16.0)), slats), max(blindDown, rollerBox) * k);
    if (mode == 2) {
      // a wide door every ~7 m: mostly white (garages), some green, brown or grey, in horizontal panels
      float dxu = fract(u / 7.0 + house * 5.0);
      float door = step(0.32, dxu) * step(dxu, 0.68) * step(hy, 2.4) * wallF;
      vec3 dc = house < 0.65 ? vec3(0.78, 0.78, 0.76) : house < 0.75 ? vec3(0.1, 0.18, 0.12) : house < 0.88 ? vec3(0.13, 0.09, 0.06) : vec3(0.32, 0.33, 0.34);
      diffuseColor.rgb = mix(diffuseColor.rgb, dc * (0.86 + 0.14 * step(0.5, fract(hy * 2.0))), door * detail);
    } else if (mode == 3) {
      // round-headed church windows every 3.8 m
      float ax = (fract(u / 3.8) - 0.5) * 3.8;
      float lancet = min(1.0, step(abs(ax), 0.42) * step(2.6, hy) * step(hy, 5.4) + step(length(vec2(ax, hy - 5.4)), 0.42));
      diffuseColor.rgb = mix(diffuseColor.rgb, glass * 0.7, lancet * k);
    }
  } else if (sid == 7 || sid == 8) {
    // Mallorca: lime render (7) or marès / limestone ashlar (8); tall windows with green
    // louvred shutters (persianes), many half closed; a dark stone socle on render
    if (sid == 8) {
      float row = floor(hy / 0.42);
      float bx = (u + fHash(vec2(row, 1.0)) * 2.0) / (0.55 + 0.25 * fHash(vec2(row, 5.0)));
      float jy = smoothstep(0.0, 0.07, fract(hy / 0.42)) * smoothstep(1.0, 0.93, fract(hy / 0.42));
      float jx = smoothstep(0.0, 0.05, fract(bx)) * smoothstep(1.0, 0.95, fract(bx));
      float st = fHash(vec2(floor(bx), row));
      diffuseColor.rgb *= mix(0.78, 1.0, jx * jy * detail + (1.0 - detail)) * (0.86 + 0.24 * st);
    } else {
      diffuseColor.rgb *= 0.95 + 0.05 * fHash(floor(wp.xz * 2.0) + floor(wp.y * 2.0));
      float socle = 1.0 - step(0.6, hy);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55, 0.5, 0.44), socle * wallF);
    }
    float fx = fract(u / 3.4);
    float fy = fract((hy - 0.5) / 3.0);
    float ww = 0.15;
    float win = step(0.5 - ww, fx) * step(fx, 0.5 + ww) * step(0.18, fy) * step(fy, 0.8) * step(0.6, hy);
    float frame = win * (1.0 - step(0.5 - ww + 0.03, fx) * step(fx, 0.5 + ww - 0.03) * step(0.2, fy) * step(fy, 0.78));
    float cell = fHash(floor(vec2(u / 3.4, (hy - 0.5) / 3.0)) + bid);
    // louvres: horizontal slats; closed shutters cover the window, open ones fold to the sides
    float slat = 0.75 + 0.25 * step(0.5, fract(fy * 26.0));
    vec3 green = (fHash(floor(vec2(vBaseY, vBaseY * 0.37))) > 0.5 ? uShutA : uShutB) * slat;
    float closed = step(0.45, cell);
    float side = step(0.5 - ww - 0.15, fx) * step(fx, 0.5 - ww - 0.005) + step(0.5 + ww + 0.005, fx) * step(fx, 0.5 + ww + 0.15);
    side *= step(0.18, fy) * step(fy, 0.8) * step(0.6, hy) * (1.0 - closed);
    vec3 v = normalize(wp - cameraPosition);
    vec3 r = reflect(v, n);
    vec3 glass = mix(vec3(0.03, 0.035, 0.04), atmoSky(normalize(vec3(r.x, abs(r.y) * 0.6 + 0.05, r.z))) * 0.8, 0.15 + 0.5 * pow(1.0 - abs(dot(-v, n)), 3.0));
    float k = wallF * detail;
    diffuseColor.rgb = mix(diffuseColor.rgb, mix(glass, green, closed), win * k);
    diffuseColor.rgb = mix(diffuseColor.rgb, green, side * k);
    diffuseColor.rgb = mix(diffuseColor.rgb, sid == 8 ? vec3(0.86, 0.82, 0.74) : vec3(0.94, 0.92, 0.88), frame * k * (1.0 - closed));
  } else if (sid == 6) {
    // timber chalet: horizontal larch boards on a stone plinth, white-framed windows
    float board = fract(hy / 0.19);
    float joint = smoothstep(0.0, 0.08, board) * smoothstep(1.0, 0.92, board);
    diffuseColor.rgb *= mix(0.68, 1.0, joint * detail + (1.0 - detail)) * (0.86 + 0.14 * fHash(vec2(floor(hy / 0.19), floor(u / 4.0))));
    float plinth = (1.0 - step(0.7, hy)) * wallF;
    vec3 stoneCol = vec3(0.55, 0.53, 0.5) * (0.8 + 0.3 * fHash(floor(vec2(u * 3.0, hy * 4.0))));
    diffuseColor.rgb = mix(diffuseColor.rgb, stoneCol, plinth);
    float fx = fract(u / 2.6);
    float fy = fract((hy - 0.7) / 2.8);
    float win = step(0.3, fx) * step(fx, 0.7) * step(0.32, fy) * step(fy, 0.76) * step(0.9, hy) * wallF * detail;
    float frame = win * (1.0 - step(0.32, fx) * step(fx, 0.68) * step(0.35, fy) * step(fy, 0.73));
    vec3 v = normalize(wp - cameraPosition);
    vec3 r = reflect(v, n);
    vec3 glass = mix(vec3(0.05, 0.05, 0.06), atmoSky(normalize(vec3(r.x, abs(r.y) * 0.6 + 0.05, r.z))) * 0.85, 0.2 + 0.5 * pow(1.0 - abs(dot(-v, n)), 3.0));
    diffuseColor.rgb = mix(diffuseColor.rgb, glass, win);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.88, 0.84), frame);
  } else if (sid == 11) {
    // steel sheeting: trapezoidal ribs every 0.25 m, up the walls and down the roof slopes; sheets weathered
    // unevenly and dirtier near the ground, a sliding door every 14 m, roof lights on some sheds
    vec2 along = abs(n.y) > 0.97 ? vec2(1.0, 0.0) : normalize(vec2(-n.z, n.x));
    float ru = dot(wp.xz, along);
    float rib = fract(ru / 0.25);
    float web = smoothstep(0.26, 0.3, rib) * smoothstep(0.38, 0.34, rib) + smoothstep(0.88, 0.92, rib) * smoothstep(1.0, 0.96, rib);
    float prof = mix(0.95, 1.04, 1.0 - smoothstep(0.28, 0.32, rib)) * (1.0 - 0.2 * web);
    diffuseColor.rgb *= mix(0.96, prof, 1.0 - smoothstep(0.02, 0.06, px));
    float house = fHash(vec2(bid, 0.37));
    diffuseColor.rgb *= 0.9 + 0.14 * fHash(vec2(floor(ru), bid));
    diffuseColor.rgb *= mix(1.0, mix(0.75, 1.0, smoothstep(-0.2, 1.4, hy)), wallF);
    float dxu = fract(ru / 14.0 + house * 3.0);
    float door = wallF * step(0.25, dxu) * step(dxu, 0.6) * step(hy, 4.5);
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.8, door * detail);
    float roofLight = (1.0 - wallF) * step(0.5, house) * step(0.84, fract(ru / 5.0));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.64, 0.6), roofLight * detail);
  } else if (sid == 4) {
    // geraniums: red blossoms over green leaves
    float b = fHash(floor(vec2(u * 9.0, wp.y * 9.0)));
    diffuseColor.rgb = mix(vec3(0.12, 0.3, 0.1), diffuseColor.rgb, step(0.42, b));
  }
}`,
      );
  };
  return patchMaterial(mat, { key: 'facade4' });
}

/** Whether any point along the footprint's edges (every ~1.5 m) lies within `clear` of the route. */
function reachesRoad(ring: Float32Array, index: RouteIndex, clear: number): boolean {
  const n = ring.length / 2;
  for (let i = 0; i < n; i++) {
    const ax = ring[i * 2], az = ring[i * 2 + 1];
    const bx = ring[((i + 1) % n) * 2], bz = ring[((i + 1) % n) * 2 + 1];
    const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 1.5));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const hit = index.nearest(ax + (bx - ax) * t, az + (bz - az) * t, clear);
      if (hit.index >= 0 && hit.dist < clear) return true;
    }
  }
  return false;
}

export class Buildings extends THREE.Group {
  count = 0;
  centres: number[] = [];

  /** Buildings within r metres, normalised to 0..1 (1 ≈ town centre). */
  densityAt(x: number, z: number, r = 150): number {
    let n = 0;
    for (let i = 0; i < this.centres.length; i += 2) {
      const dx = this.centres[i] - x, dz = this.centres[i + 1] - z;
      if (dx * dx + dz * dz < r * r) n++;
    }
    return Math.min(1, n / 60);
  }

  /** `clear`: half the asphalt width plus a margin; no footprint may reach into it. */
  constructor(
    osm: OsmWorld, index: RouteIndex, heightAt: (x: number, z: number) => number, corridor = 320, biome: Biome = ALPINE, clear = 0,
    /** Within a village's built-up stretch (Signs.builtUpRuns): farm buildings there are not steel halls. */
    village?: (x: number, z: number) => boolean,
  ) {
    super();
    const groups = new Map<string, { builder: Builder; ox: number; oz: number }>();
    const style = STYLES[biome.buildings] ?? STYLES.flachgau;
    const mat = facadeMaterial(style);
    osm.buildings.forEach((bld, i) => {
      const x = bld.ring[0];
      const z = bld.ring[1];
      // skyline: tall buildings count from any distance
      if (bld.height < 30 && index.nearest(x, z, corridor).index < 0) return;
      // old-town streets are narrower than our road: a house whose footprint reaches the asphalt
      // would stand on it (St. Wolfgang, Kitzbühel). Leave it out; the street keeps its other walls
      if (clear > 0 && index.nearest(x, z, 120).index >= 0 && reachesRoad(bld.ring, index, clear)) return;
      const key = `${Math.floor(x / BUCKET)},${Math.floor(z / BUCKET)}`;
      let g = groups.get(key);
      if (!g) {
        g = { builder: new Builder(), ox: Math.floor(x / BUCKET) * BUCKET, oz: Math.floor(z / BUCKET) * BUCKET };
        groups.set(key, g);
      }
      addBuilding(bld, g.builder, heightAt, i + 1, g.ox, g.oz, style, village?.(x, z) ?? false);
      this.centres.push(x, z);
      this.count++;
    });
    for (const { builder, ox, oz } of groups.values()) {
      if (!builder.pos.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(builder.pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(builder.col, 3));
      geo.setAttribute('surf', new THREE.Float32BufferAttribute(builder.surf, 1));
      geo.setAttribute('baseY', new THREE.Float32BufferAttribute(builder.base, 1));
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(ox, 0, oz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.add(mesh);
    }
  }
}

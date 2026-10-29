// Close-range 3D ground cover along the road: grass tufts, alpine flowers and boulders, and on the
// Champagne plain at the end of August the fields' crops, round bales and vine rows, generated in route
// chunks around the rider and recycled as they ride on.

import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Line } from '../geo/osm.ts';
import type { Route, RouteIndex } from '../geo/route.ts';
import { patchMaterial } from './atmosphere.ts';
import { broadleafGeometry, preserveCoverage, REGIONS, treeAtlas } from './treeModels.ts';
import { loadModel } from './Landmarks.ts';
import { ALPINE, type Biome } from './biome.ts';

const CHUNK = 40; // metres of route per chunk
const AHEAD = 280;
const BEHIND = 70;
const REACH = 24; // metres beside the road edge

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tuftGeometry(reg: { u0: number; v0: number; u1: number; v1: number }): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  // the atlas tuft is 2:1, so the card is twice as wide as tall
  const w = 0.42;
  const h = 0.44;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI;
    const cx = Math.cos(a) * w;
    const cz = Math.sin(a) * w;
    const base = pos.length / 3;
    pos.push(-cx, -0.04, -cz, cx, -0.04, cz, cx, h, cz, -cx, h, -cz);
    uv.push(reg.u0, reg.v0, reg.u1, reg.v0, reg.u1, reg.v1, reg.u0, reg.v1);
    for (let i = 0; i < 4; i++) nor.push(0, 1, 0);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/** Low rounded shrub (rosemary, mastic): crossed half-dome cards plus a tilted ring. */
function cushionGeometry(): THREE.BufferGeometry {
  const reg = REGIONS.flowers;
  const pos: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const card = (a: number, tilt: number, r: number, h: number, y0: number) => {
    const dx = Math.cos(a) * r, dz = Math.sin(a) * r;
    const tx = -Math.sin(a) * Math.sin(tilt) * h, tz = Math.cos(a) * Math.sin(tilt) * h;
    const b = pos.length / 3;
    pos.push(-dx, y0, -dz, dx, y0, dz, dx + tx, y0 + h * Math.cos(tilt), dz + tz, -dx + tx, y0 + h * Math.cos(tilt), -dz + tz);
    uv.push(reg.u0, reg.v0, reg.u1, reg.v0, reg.u1, reg.v1, reg.u0, reg.v1);
    for (let i = 0; i < 4; i++) nor.push(0, 1, 0);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  for (let k = 0; k < 4; k++) card((k / 4) * Math.PI, 0, 0.5, 0.5, -0.04);
  for (let k = 0; k < 5; k++) card((k / 5) * Math.PI * 2, 1.0, 0.32, 0.42, 0.12);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/** Card quads sharing one atlas region each, into a geometry (normals up: the cards light like the ground). */
function cards(list: { reg: { u0: number; v0: number; u1: number; v1: number }; p: number[][] }[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  for (const { reg, p } of list) {
    const base = pos.length / 3;
    for (const v of p) pos.push(v[0], v[1], v[2]);
    uv.push(reg.u0, reg.v0, reg.u1, reg.v0, reg.u1, reg.v1, reg.u0, reg.v1);
    for (let i = 0; i < 4; i++) nor.push(0, 1, 0);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

/** Low leafy mound (sugar beet, potato haulm): crossed leaf-cluster cards under a flat one. */
function moundGeometry(): THREE.BufferGeometry {
  const w = 0.36, h = 0.5;
  const list = [0, 1, 2].map((k) => {
    const a = (k / 3) * Math.PI, cx = Math.cos(a) * w, cz = Math.sin(a) * w;
    return { reg: REGIONS.leaves, p: [[-cx, -0.05, -cz], [cx, -0.05, cz], [cx, h, cz], [-cx, h, -cz]] };
  });
  list.push({ reg: REGIONS.leaves, p: [[-w, 0.32, -w], [w, 0.32, -w], [w, 0.32, w], [-w, 0.32, w]] });
  return cards(list);
}

/** Two metres of trellised vine row along +X: leaf walls either side of the wires over a top, trunks below. */
function vineGeometry(): THREE.BufferGeometry {
  const list: { reg: typeof REGIONS.leaves; p: number[][] }[] = [];
  for (const x0 of [-1, 0]) {
    for (const z of [-0.17, 0.17]) list.push({ reg: REGIONS.leaves, p: [[x0, 0.42, z], [x0 + 1, 0.42, z], [x0 + 1, 1.38, z], [x0, 1.38, z]] });
    list.push({ reg: REGIONS.leaves, p: [[x0, 1.3, -0.19], [x0 + 1, 1.3, -0.19], [x0 + 1, 1.34, 0.19], [x0, 1.34, 0.19]] });
  }
  for (const x of [-0.5, 0.5]) {
    list.push({ reg: REGIONS.barkDark, p: [[x - 0.035, -0.05, 0], [x + 0.035, -0.05, 0], [x + 0.035, 0.5, 0], [x - 0.035, 0.5, 0]] });
    list.push({ reg: REGIONS.barkDark, p: [[x, -0.05, -0.035], [x, -0.05, 0.035], [x, 0.5, 0.035], [x, 0.5, -0.035]] });
  }
  return cards(list);
}

// what a field holds at the end of August, read from its spring photo exactly as terrainMaterial's field
// season reads it: green then (winter cereals) is stubble now, bare chalk then is beet, maize or potatoes
const STUBBLE = 1, BEET = 2, MAIZE = 3, POTATO = 4, BARE = 5;
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** The field state (0: not a field) and the parcel's tone hash from an sRGB photo colour. */
function fieldState(rgb: number[]): { state: number; pick: number } {
  // the shader takes the square root of the linear texel: about the sRGB value to the power 1.1
  const [r, g, b] = [rgb[0], rgb[1], rgb[2]].map((v) => Math.pow(v / 255, 1.1));
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const L = (r + g + b) / 3, G = g - Math.max(r, b) * 0.93, S = (mx - mn) / Math.max(mx, 1e-3);
  const green = smooth(0.03, 0.07, G) * smooth(0.12, 0.2, S);
  const bare = (1 - green) * smooth(0.48, 0.6, L) * smooth(0.16, 0.09, S);
  const pick = (((L * 5.3 + G * 23 + S * 3.1) % 1) + 1) % 1;
  if (green + bare < 0.5) return { state: 0, pick };
  if (green >= bare) return { state: STUBBLE, pick };
  return { state: pick < 0.46 ? BEET : pick < 0.73 ? MAIZE : pick < 0.89 ? POTATO : BARE, pick };
}

function rockGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(0.5, 1);
  const p = g.getAttribute('position');
  const r = rng(5);
  for (let i = 0; i < p.count; i++) {
    const s = 0.75 + r() * 0.5;
    p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.65, p.getZ(i) * s);
  }
  g.computeVertexNormals();
  return g.translate(0, 0.12, 0);
}

interface Chunk {
  index: number;
  meshes: THREE.InstancedMesh[];
}

export interface GroundCoverOptions {
  route: Route;
  index: RouteIndex;
  halfWidth: number;
  groundHeight: (x: number, z: number) => number;
  roads?: Line[];
  isWater?: (x: number, z: number) => boolean;
  density?: number;
  /** Land cover at a point: 0 none, 1 meadow, 2 built-up, 3 water. */
  coverAt?: (x: number, z: number) => number;
  /** Tree canopy 0..1 at a point (forest floor gets ferns instead of meadow grass). */
  canopyAt?: (x: number, z: number) => number;
  /** OSM scree / bare rock 0..1 at a point: no grass there, only the odd boulder. */
  screeAt?: (x: number, z: number) => number;
  /** OSM field use at a point: 0 none, 1 arable, 2 meadow, 3 vineyard (biomes with a field season). */
  fieldAt?: (x: number, z: number) => number;
  /** The orthophoto's sRGB colour at parcel scale (Terrain.photoAt); false while no tile covers the point. */
  photoAt?: (x: number, z: number, out: number[]) => boolean;
  biome?: Biome;
}

export class GroundCover extends THREE.Group {
  private o: GroundCoverOptions;
  private chunks = new Map<number, Chunk>();
  private grassMat: THREE.MeshLambertMaterial;
  private flowerMat: THREE.MeshLambertMaterial;
  private rockMat: THREE.Material;
  private sharedRockMat = false;
  private tuft = tuftGeometry(REGIONS.grass);
  private flowerTuft = tuftGeometry(REGIONS.flowers);
  private cushion = cushionGeometry();
  private shrub: THREE.BufferGeometry | null = null;
  private shrubMat: THREE.Material | null = null;
  private rock = rockGeometry();
  private fern: THREE.BufferGeometry | null = null;
  private fernMat: THREE.Material | null = null;
  private palm: THREE.BufferGeometry | null = null;
  private palmMats: THREE.Material | THREE.Material[] | null = null;
  private mound = moundGeometry();
  private vine = vineGeometry();
  private bale = new THREE.CylinderGeometry(0.72, 0.72, 1.2, 18, 1).rotateZ(Math.PI / 2).translate(0, 0.66, 0);
  private baleMat = patchMaterial(new THREE.MeshLambertMaterial({ color: 0xffffff }), { key: 'bale' });
  private biome: Biome;
  private roadGrid = new Map<number, number[]>();
  private roadSegs: number[] = [];

  constructor(o: GroundCoverOptions) {
    super();
    this.o = { density: 1, ...o };
    this.biome = o.biome ?? ALPINE;
    // photographic grass cards from the shared foliage atlas (scripts/bake-foliage.py)
    const grass = new THREE.MeshLambertMaterial({ map: treeAtlas(this.biome.atlas), alphaTest: 0.5, side: THREE.DoubleSide });
    // the cards light like the turf under them: each tuft carries the ground normal (gNormal), and
    // the back faces keep it (three.js flips normals on double-sided back faces, which left half of
    // every tuft unlit: dark olive spikes)
    grass.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 gNormal;')
        .replace(
          '#include <defaultnormal_vertex>',
          '#include <defaultnormal_vertex>\nif (dot(gNormal, gNormal) > 0.5) transformedNormal = normalMatrix * gNormal;',
        );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        '#include <normal_fragment_begin>\nnormal = normalize(vNormal);',
      );
    };
    this.grassMat = preserveCoverage(patchMaterial(grass, { key: 'tuft3', wind: true }));
    this.grassMat.alphaToCoverage = true;
    this.flowerMat = this.grassMat;
    if (this.biome.shrubs > 0) {
      // mastic / lentisk / young holm oak: a round leafy bush (tree model, leaf clusters to the ground)
      this.shrub = broadleafGeometry(11, 0.0, 1.35);
      const sm = preserveCoverage(
        patchMaterial(new THREE.MeshLambertMaterial({ map: treeAtlas(this.biome.atlas), alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true }), {
          key: 'shrub',
          wind: true,
        }),
      );
      sm.alphaToCoverage = true;
      this.shrubMat = sm;
    }
    this.rockMat = patchMaterial(new THREE.MeshStandardMaterial({ color: 0x8b8a84, roughness: 0.95, flatShading: true }), {
      key: 'boulder',
    });
    // photo-scanned limestone (Poly Haven rock_07, decimated in Blender) once it has loaded
    void loadModel('rock_07.glb')
      .then((g) => {
        g.updateMatrixWorld(true);
        g.traverse((c) => {
          const m = c as THREE.Mesh;
          if (!m.isMesh) return;
          this.rock.dispose();
          this.rockMat.dispose();
          this.rock = m.geometry.clone().applyMatrix4(m.matrixWorld);
          // the decimated scan has hard creases: soften so boulders read as weathered stone
          this.rock.deleteAttribute('normal');
          this.rock = mergeVertices(this.rock, 0.02);
          this.rock.computeVertexNormals();
          // shared with the model cache: never disposed here
          // Gaisberg limestone is cool light grey; the scan is warmer
          const rm = (m.material as THREE.MeshStandardMaterial).clone();
          rm.color.copy(this.biome.rock);
          this.rockMat = patchMaterial(rm, { key: 'rockscan' });
        });
      })
      .catch(() => undefined);
    if (this.biome.palms > 0) {
      void loadModel('palm.glb')
        .then((g) => {
          g.updateMatrixWorld(true);
          // one glTF primitive per material: merge them into one geometry with groups
          const geos: THREE.BufferGeometry[] = [];
          const mats: THREE.Material[] = [];
          g.traverse((c) => {
            const m = c as THREE.Mesh;
            if (!m.isMesh) return;
            const geo = m.geometry.clone().applyMatrix4(m.matrixWorld);
            for (const k of Object.keys(geo.attributes)) if (!['position', 'normal'].includes(k)) geo.deleteAttribute(k);
            geos.push(geo.index ? geo.toNonIndexed() : geo);
            const mat = (m.material as THREE.Material).clone();
            (mat as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
            mats.push(patchMaterial(mat, { key: `palm:${mat.name}`, wind: true }));
          });
          if (geos.length) {
            this.palm = mergeGeometries(geos, true);
            this.palmMats = mats;
          }
        })
        .catch(() => undefined);
    }
    // Poly Haven fern_02 (CC0), decimated in Blender: forest-floor cover
    if (this.biome.ferns) void loadModel('fern.glb')
      .then((g) => {
        g.updateMatrixWorld(true);
        g.traverse((c) => {
          const m = c as THREE.Mesh;
          if (!m.isMesh || this.fern) return;
          this.fern = m.geometry.clone().applyMatrix4(m.matrixWorld);
          const fm = (m.material as THREE.MeshStandardMaterial).clone();
          fm.side = THREE.DoubleSide;
          fm.alphaTest = 0.5;
          this.fernMat = patchMaterial(fm, { key: 'fern', wind: true });
        });
      })
      .catch(() => undefined);
    for (const road of o.roads ?? []) {
      if (road.kind === 'path' || road.kind === 'footway') continue;
      const hw = road.width / 2 + 0.6;
      for (let i = 0; i + 3 < road.pts.length; i += 2) {
        const seg = this.roadSegs.length;
        this.roadSegs.push(road.pts[i], road.pts[i + 1], road.pts[i + 2], road.pts[i + 3], hw);
        const x0 = Math.min(road.pts[i], road.pts[i + 2]) - hw, x1 = Math.max(road.pts[i], road.pts[i + 2]) + hw;
        const z0 = Math.min(road.pts[i + 1], road.pts[i + 3]) - hw, z1 = Math.max(road.pts[i + 1], road.pts[i + 3]) + hw;
        for (let cz = Math.floor(z0 / 16); cz <= Math.floor(z1 / 16); cz++) {
          for (let cx = Math.floor(x0 / 16); cx <= Math.floor(x1 / 16); cx++) {
            const k = cx * 100003 + cz;
            let l = this.roadGrid.get(k);
            if (!l) this.roadGrid.set(k, (l = []));
            l.push(seg);
          }
        }
      }
    }
  }

  private onOtherRoad(x: number, z: number): boolean {
    const l = this.roadGrid.get(Math.floor(x / 16) * 100003 + Math.floor(z / 16));
    if (!l) return false;
    const s = this.roadSegs;
    for (const i of l) {
      const ax = s[i], az = s[i + 1], dx = s[i + 2] - ax, dz = s[i + 3] - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      if (Math.hypot(x - ax - dx * t, z - az - dz * t) < s[i + 4]) return true;
    }
    return false;
  }

  update(s: number) {
    const { route } = this.o;
    const count = Math.floor(route.length / CHUNK) + 1;
    const wanted = new Map<number, number>(); // chunk → distance from rider
    const keep = new Set<number>();
    for (let off = -BEHIND - 2 * CHUNK; off <= AHEAD + 2 * CHUNK; off += CHUNK / 2) {
      let c = Math.floor((s + off) / CHUNK);
      if (route.loop) c = ((c % count) + count) % count;
      else if (c < 0 || c >= count) continue;
      keep.add(c);
      if (off >= -BEHIND && off <= AHEAD) wanted.set(c, Math.min(wanted.get(c) ?? Infinity, Math.abs(off)));
    }
    // build at most one chunk per frame, nearest first
    let best = -1;
    let bestD = Infinity;
    for (const [c, d] of wanted) {
      if (!this.chunks.has(c) && d < bestD) {
        bestD = d;
        best = c;
      }
    }
    if (best >= 0) this.build(best);
    for (const [c, chunk] of this.chunks) {
      if (!keep.has(c)) {
        for (const m of chunk.meshes) {
          this.remove(m);
          m.dispose();
          if (m.userData.ownGeometry) m.geometry.dispose();
        }
        this.chunks.delete(c);
      }
    }
  }

  private build(ci: number) {
    const { route, index, halfWidth, groundHeight, isWater } = this.o;
    const density = this.o.density ?? 1;
    const r = rng(ci * 7919 + 13);
    const grass: number[] = [];
    const flowers: number[] = [];
    const rocks: number[] = [];
    const ferns: number[] = [];
    const palms: number[] = [];
    const cushions: number[] = [];
    const beets: number[] = [];
    const maize: number[] = [];
    const potatoes: number[] = [];
    const bales: number[] = [];
    const vines: number[] = [];
    const vineKeys = new Set<string>();
    const rowDir = new Map<number, [number, number]>();
    const rgb = [0, 0, 0];
    const B = this.biome;
    const i0 = Math.floor((ci * CHUNK) / route.step);
    const i1 = Math.min(route.n - 1, Math.floor(((ci + 1) * CHUNK) / route.step));
    for (let i = i0; i < i1; i++) {
      const h = route.heading[i];
      const fx = Math.sin(h), fz = -Math.cos(h);
      const rx = Math.cos(h), rz = Math.sin(h);
      for (const side of [-1, 1]) {
        const tries = Math.round(120 * density);
        for (let k = 0; k < tries; k++) {
          const u = r();
          // denser verge right next to the asphalt, patchier meadow further out
          const d = halfWidth + 0.55 + (u < 0.5 ? r() * 4.5 : 4.5 + r() * (REACH - 4.5));
          const t = r() * route.step;
          const x = route.x[i] + rx * d * side + fx * t;
          const z = route.z[i] + rz * d * side + fz * t;
          const near = index.nearest(x, z, halfWidth + 1.2);
          if (near.index >= 0 && near.dist < halfWidth + 0.5) continue;
          if (this.onOtherRoad(x, z)) continue;
          if (isWater?.(x, z)) continue;
          const cover = this.o.coverAt?.(x, z) ?? 0;
          const canopy = this.o.canopyAt?.(x, z) ?? 0;
          // above a bare top only a few plants hold between the stones
          const bare = B.bareAbove === undefined ? 0 : Math.min(1, Math.max(0, (groundHeight(x, z) - B.bareAbove + 60) / 140)) * 0.9;
          if (((this.o.screeAt?.(x, z) ?? 0) > 0.5 || r() < bare) && d > halfWidth + 1.2) {
            if (r() < 0.012 * B.rockDensity) {
              const by = groundHeight(x, z);
              if (Number.isFinite(by)) rocks.push(x, by - 0.12, z, 0.3 + r() * 0.8, r() * 6.28, 0);
            }
            continue;
          }
          // forest floor: ferns and litter, little grass (the verge right at the road stays grassy)
          if (canopy > 0.5 && d > halfWidth + 1.6) {
            if (r() < 0.16 && this.fern) {
              const fy = groundHeight(x, z);
              if (Number.isFinite(fy)) ferns.push(x, fy - 0.05, z, 0.5 + r() * 0.7, r() * 6.28, 0);
            }
            if (r() < 0.85) continue;
          }
          // built-up: pavements and lawns rather than long grass
          if (cover === 2 && (d > halfWidth + 2.2 ? r() < 0.75 : r() < 0.45)) continue;
          const y = groundHeight(x, z);
          if (!Number.isFinite(y)) continue;
          const sx = groundHeight(x + 1.5, z) - y;
          const sz = groundHeight(x, z + 1.5) - y;
          const slope = Math.hypot(sx, sz) / 1.5;
          const alpine = Math.min(1, Math.max(0, (y - 1900) / 900));
          if (slope > 0.75 || (slope > 0.45 && r() < 0.6)) {
            if (r() < 0.03 * (B.steepRocks ?? B.rockDensity)) rocks.push(x, y - 0.15, z, 0.4 + r() * (B.tussocks ? 0.6 : 1.3), r() * 6.28, 0);
            continue;
          }
          // beyond the verge, what each field holds now; true meadows and gardens keep their grass
          if (B.fieldSeason && d > halfWidth + 3) {
            const field = this.o.fieldAt?.(x, z) ?? 0;
            if (field === 3) {
              this.vineRow(x, z, i0, i1, vines, vineKeys, rowDir);
              continue;
            }
            const f = field !== 2 && cover !== 2 && this.o.photoAt?.(x, z, rgb) ? fieldState(rgb) : null;
            if (f?.state) {
              if (f.state === BEET && r() < 0.75) beets.push(x, y - 0.05, z, 0.85 + r() * 0.35, r() * 6.28, 0);
              else if (f.state === MAIZE && r() < 0.6) maize.push(x, y - 0.05, z, 0.95 + r() * 0.25, r() * 6.28, 0);
              else if (f.state === POTATO && r() < 0.5) potatoes.push(x, y - 0.05, z, 0.7 + r() * 0.3, r() * 6.28, 0);
              // round bales left on some straw-coloured stubble, one every few hundred square metres
              else if (f.state === STUBBLE && f.pick < 0.75 && (f.pick * 7.13) % 1 < 0.45 && r() < 0.003) bales.push(x, y, z, 1, r() * 6.28, 0);
              continue;
            }
          }
          if (B.tussocks) {
            // garrigue: limestone boulders, carritx tussocks, rosemary/mastic cushions, fan palms
            if (r() < 0.012 * B.rockDensity) rocks.push(x, y - 0.18, z, 0.25 + r() * r() * 1.1, r() * 6.28, 0);
            const pick = r();
            if (pick < B.palms * 0.4 * (canopy > 0.3 ? 1.6 : 1) && d > halfWidth + 1.5) {
              // dwarf fan palms grow in clumps of 3–6
              const n = 3 + Math.floor(r() * 4);
              for (let k = 0; k < n; k++) {
                const px = x + (r() - 0.5) * 3.2, pz = z + (r() - 0.5) * 3.2;
                const py = groundHeight(px, pz);
                if (Number.isFinite(py)) palms.push(px, py - 0.05, pz, 0.6 + r() * 0.6, r() * 6.28, 0);
              }
              continue;
            }
            // under pines the understory is open: fewer shrubs, more palms
            if (pick < B.palms + B.shrubs * (canopy > 0.4 ? 0.35 : 1) && d > halfWidth + 1.2) {
              cushions.push(x, y - 0.2, z, 1.1 + r() * 1.5, r() * 6.28, 1);
              continue;
            }
            // carritx grows in clumps with bare ground between; under pines the floor is open
            const clump = Math.sin(x * 0.23 + Math.sin(z * 0.19) * 2.0) * Math.cos(z * 0.21 + x * 0.07);
            if (clump < -0.1 && r() < 0.85) continue;
            // open slopes are covered in carritx; under the pines it thins out
            if (r() < (canopy > 0.4 ? 0.85 : 0.25)) continue;
            const v = d < halfWidth + 1.2 ? 0.55 + r() * 0.25 : 0.75 + r() * 0.5;
            grass.push(x, y - 0.03, z, v, r() * 6.28, 0);
            continue;
          }
          if (alpine > 0.4 && r() < alpine * 0.008) rocks.push(x, y - 0.1, z, 0.3 + r() * 0.9, r() * 6.28, 0);
          // patchy meadow mask
          const patch = Math.sin(x * 0.11 + Math.sin(z * 0.07) * 2.0) * Math.cos(z * 0.09 + x * 0.03);
          if (d > halfWidth + 5 && patch < -0.35 && r() < 0.7) continue;
          // open meadows away from the verge are mown short: only scattered tufts
          if (cover === 1 && d > halfWidth + 4 && r() < 0.55) continue;
          if (alpine > 0.75 && r() < alpine * 0.6) continue;
          // mown verge next to the asphalt and grazed/mown meadows stay short
          const verge = d < halfWidth + 1.8;
          const short = verge || cover === 1 || cover === 2;
          // the verge is mown to a few centimetres in autumn: low tufts over the turf, not blades
          const sc = (verge ? 0.3 + r() * 0.22 : short ? 0.5 + r() * 0.35 : 0.7 + r() * 0.6) - alpine * 0.2;
          // October: only a few late flowers left
          const target = r() < 0.025 + (1 - alpine) * 0.015 ? flowers : grass;
          target.push(x, y, z, sc, r() * 6.28, alpine);
        }
      }
    }
    const meshes: THREE.InstancedMesh[] = [];
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const col = new THREE.Color();
    // the atlas grass is near-neutral; the biome sets the meadow colour
    const [lush, dry, pale] = this.biome.grass;
    const add = (
      geo: THREE.BufferGeometry, mat: THREE.Material, arr: number[], tall: number, shadow: boolean, tint: boolean | THREE.Color, turf = false,
    ) => {
      const n = arr.length / 6;
      if (!n) return;
      if (turf) {
        // the ground normal under each tuft (the grass material lights the cards with it)
        const gn = new Float32Array(n * 3);
        for (let k = 0; k < n; k++) {
          const x = arr[k * 6], z = arr[k * 6 + 2];
          const dx = groundHeight(x + 1, z) - groundHeight(x - 1, z);
          const dz = groundHeight(x, z + 1) - groundHeight(x, z - 1);
          const v = new THREE.Vector3(-dx / 2, 1, -dz / 2);
          if (!Number.isFinite(v.x + v.z)) v.set(0, 1, 0);
          v.normalize().toArray(gn, k * 3);
        }
        geo = geo.clone();
        geo.setAttribute('gNormal', new THREE.InstancedBufferAttribute(gn, 3));
      }
      const mesh = new THREE.InstancedMesh(geo, mat, n);
      if (turf) mesh.userData.ownGeometry = true;
      for (let k = 0; k < n; k++) {
        const [x, y, z, sc, rot, alpine] = arr.slice(k * 6, k * 6 + 6);
        q.setFromAxisAngle(up, rot);
        m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sc, sc * tall, sc));
        mesh.setMatrixAt(k, m);
        if (tint instanceof THREE.Color) {
          // crops and bales: their own colour, each plant a little different
          mesh.setColorAt(k, col.copy(tint).multiplyScalar(0.86 + 0.28 * ((rot * 13.7) % 1)));
        } else if (tint && alpine === 1 && this.biome.shrubTint) {
          // shrub cushions (flag 1): their own green
          mesh.setColorAt(k, col.copy(this.biome.shrubTint).multiplyScalar(0.8 + 0.3 * ((rot * 7.3) % 1)));
        } else if (tint) {
          const v = (Math.sin(x * 0.21 + z * 0.13) + Math.sin(z * 0.17 - x * 0.05)) * 0.25 + 0.5;
          col.copy(lush).lerp(dry, v * 0.6).lerp(pale, alpine * 0.7).multiplyScalar(0.82 + 0.18 * ((rot * 13.7) % 1));
          mesh.setColorAt(k, col);
        }
      }
      mesh.computeBoundingSphere();
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      meshes.push(mesh);
      this.add(mesh);
    };
    // Alpine tufts are wider than tall (tall cards read as spiky blades); carritx tussocks stand up
    add(this.tuft, this.grassMat, grass, this.biome.tussocks ? 1.25 : 0.82, false, true, true);
    if (cushions.length && this.shrub && this.shrubMat) add(this.shrub, this.shrubMat, cushions, 0.8, true, true);
    if (this.palm && this.palmMats) add(this.palm, this.palmMats as unknown as THREE.Material, palms, 1, true, false);
    add(this.flowerTuft, this.flowerMat, flowers, 1.0, false, true, true);
    add(this.rock, this.rockMat, rocks, 1, true, false);
    if (this.fern && this.fernMat) add(this.fern, this.fernMat, ferns, 1, false, false);
    // the atlas leaves are a pale blue-green, its grass near neutral: the crops' own greens
    add(this.mound, this.grassMat, beets, 1, false, new THREE.Color(0.5, 0.8, 0.36), true);
    add(this.mound, this.grassMat, potatoes, 0.8, false, new THREE.Color(0.72, 0.66, 0.3), true);
    add(this.tuft, this.grassMat, maize, 5.6, true, new THREE.Color(0.78, 1.0, 0.46), true);
    add(this.vine, this.grassMat, vines, 1, true, new THREE.Color(0.6, 0.86, 0.44), true);
    add(this.bale, this.baleMat, bales, 1, true, new THREE.Color().setRGB(0.8, 0.67, 0.42, THREE.SRGBColorSpace));
    this.chunks.set(ci, { index: ci, meshes });
  }

  /**
   * One 2 m vine-row segment on the row nearest (x, z). Champagne rows are about 1.15 m apart and run down
   * the slope of their 60 m cell (a parcel-sized patch of straight rows); a segment belongs to the chunk whose
   * stretch of road is nearest, so neighbouring chunks never draw it twice.
   */
  private vineRow(x: number, z: number, i0: number, i1: number, out: number[], keys: Set<string>, dirs: Map<number, [number, number]>) {
    const { groundHeight, index } = this.o;
    const gx = Math.floor(x / 60), gz = Math.floor(z / 60);
    const cell = gx * 100003 + gz;
    let dir = dirs.get(cell);
    if (!dir) {
      const cx = (gx + 0.5) * 60, cz = (gz + 0.5) * 60;
      const sx = groundHeight(cx + 15, cz) - groundHeight(cx - 15, cz);
      const sz = groundHeight(cx, cz + 15) - groundHeight(cx, cz - 15);
      const l = Math.hypot(sx, sz);
      // on the flat the rows keep a direction of their own per cell
      const a = Math.abs(Math.sin(cx * 0.013 + cz * 0.029) * 4375.85) % Math.PI;
      dir = l > 0.6 ? [sx / l, sz / l] : [Math.cos(a), Math.sin(a)];
      dirs.set(cell, dir);
    }
    const [ax, az] = dir;
    const ri = Math.round((z * ax - x * az) / 1.15), si = Math.floor((x * ax + z * az) / 2);
    const key = `${cell},${ri},${si}`;
    if (keys.has(key)) return;
    keys.add(key);
    const across = ri * 1.15, along = (si + 0.5) * 2;
    const px = along * ax - across * az, pz = along * az + across * ax;
    if (Math.floor(px / 60) !== gx || Math.floor(pz / 60) !== gz || (this.o.fieldAt?.(px, pz) ?? 0) !== 3) return;
    const near = index.nearest(px, pz, REACH + 8);
    if (near.index < i0 || near.index >= i1) return;
    const py = groundHeight(px, pz);
    if (Number.isFinite(py)) out.push(px, py - 0.03, pz, 1, Math.atan2(-az, ax), 0);
  }

  dispose() {
    for (const chunk of this.chunks.values()) {
      for (const m of chunk.meshes) {
        m.dispose();
        if (m.userData.ownGeometry) m.geometry.dispose();
      }
    }
    this.chunks.clear();
    this.tuft.dispose();
    this.flowerTuft.dispose();
    this.cushion.dispose();
    this.shrub?.dispose();
    this.shrubMat?.dispose();
    this.rock.dispose();
    this.mound.dispose();
    this.vine.dispose();
    this.bale.dispose();
    this.baleMat.dispose();
    this.grassMat.dispose();
    if (!this.sharedRockMat) this.rockMat.dispose();
  }
}

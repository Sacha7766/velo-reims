// Close-range 3D ground cover along the road: grass tufts, alpine flowers and boulders,
// generated in route chunks around the rider and recycled as they ride on.

import * as THREE from 'three';
import type { Line } from '../geo/osm.ts';
import type { Route, RouteIndex } from '../geo/route.ts';
import { patchMaterial } from './atmosphere.ts';
import { preserveCoverage, REGIONS, treeAtlas } from './treeModels.ts';
import { loadModel } from './Landmarks.ts';

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
  private rock = rockGeometry();
  private fern: THREE.BufferGeometry | null = null;
  private fernMat: THREE.Material | null = null;
  private roadGrid = new Map<number, number[]>();
  private roadSegs: number[] = [];

  constructor(o: GroundCoverOptions) {
    super();
    this.o = { density: 1, ...o };
    // photographic grass cards from the shared foliage atlas (scripts/bake-foliage.py)
    this.grassMat = preserveCoverage(
      patchMaterial(new THREE.MeshLambertMaterial({ map: treeAtlas(), alphaTest: 0.5, side: THREE.DoubleSide }), {
        key: 'tuft2',
        wind: true,
      }),
    );
    this.grassMat.alphaToCoverage = true;
    this.flowerMat = this.grassMat;
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
          // shared with the model cache: never disposed here
          // Gaisberg limestone is cool light grey; the scan is warmer
          const rm = (m.material as THREE.MeshStandardMaterial).clone();
          rm.color.setRGB(0.86, 0.9, 0.95);
          this.rockMat = patchMaterial(rm, { key: 'rockscan' });
        });
      })
      .catch(() => undefined);
    // Poly Haven fern_02 (CC0), decimated in Blender: forest-floor cover
    void loadModel('fern.glb')
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
            if (r() < 0.03) rocks.push(x, y - 0.15, z, 0.4 + r() * 1.3, r() * 6.28, 0);
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
          const sc = (short ? 0.5 + r() * 0.35 : 0.7 + r() * 0.6) - alpine * 0.2;
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
    // the atlas grass is near-neutral; these set the meadow colour
    const lush = new THREE.Color(0.98, 1.22, 0.58);
    const dry = new THREE.Color(1.3, 1.2, 0.72);
    const pale = new THREE.Color(1.1, 1.12, 0.86);
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, arr: number[], tall: number, shadow: boolean, tint: boolean) => {
      const n = arr.length / 6;
      if (!n) return;
      const mesh = new THREE.InstancedMesh(geo, mat, n);
      for (let k = 0; k < n; k++) {
        const [x, y, z, sc, rot, alpine] = arr.slice(k * 6, k * 6 + 6);
        q.setFromAxisAngle(up, rot);
        m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sc, sc * tall, sc));
        mesh.setMatrixAt(k, m);
        if (tint) {
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
    add(this.tuft, this.grassMat, grass, 1.1, false, true);
    add(this.flowerTuft, this.flowerMat, flowers, 1.0, false, true);
    add(this.rock, this.rockMat, rocks, 1, true, false);
    if (this.fern && this.fernMat) add(this.fern, this.fernMat, ferns, 1, false, false);
    this.chunks.set(ci, { index: ci, meshes });
  }

  dispose() {
    for (const chunk of this.chunks.values()) for (const m of chunk.meshes) m.dispose();
    this.chunks.clear();
    this.tuft.dispose();
    this.flowerTuft.dispose();
    this.rock.dispose();
    this.grassMat.dispose();
    if (!this.sharedRockMat) this.rockMat.dispose();
  }
}

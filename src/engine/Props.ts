// Small real-world things from OpenStreetMap points and lines, using the Blender-built props in
// public/models: benches, bus stops, guideposts, wayside crosses, info boards, the summit cross,
// power poles with sagging wires, fences and walls, and firewood stacks beside farmhouses.

import * as THREE from 'three';
import type { Building, OsmWorld } from '../geo/osm.ts';
import type { Route, RouteIndex } from '../geo/route.ts';
import { patchMaterial } from './atmosphere.ts';
import { loadModel } from './Landmarks.ts';
import type { Biome } from './biome.ts';

const POI_MODEL: Record<string, string> = {
  bench: 'prop-bench.glb',
  bus_stop: 'prop-bus_stop.glb',
  guidepost: 'prop-guidepost.glb',
  cross: 'prop-wayside_cross.glb',
  shrine: 'prop-wayside_cross.glb',
  board: 'prop-info_board.glb',
  peak: 'prop-summit_cross.glb',
  'power:pole': 'prop-power_pole.glb',
};

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export class Props extends THREE.Group {
  async build(route: Route, index: RouteIndex, osm: OsmWorld, groundAt: (x: number, z: number) => number, halfWidth: number, biome?: Biome) {
    const place = async (model: string, x: number, z: number, yaw: number, lift = 0) => {
      const y = groundAt(x, z);
      if (!Number.isFinite(y)) return;
      const src = await loadModel(model);
      const o = src.clone(true);
      o.position.set(x, y + lift, z);
      o.rotation.y = yaw;
      o.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.receiveShadow = true;
        }
      });
      this.add(o);
    };
    const jobs: Promise<void>[] = [];
    const poles: { x: number; z: number }[] = [];
    for (const [k, p] of osm.pois.entries()) {
      const model = POI_MODEL[p.kind];
      if (!model) continue;
      const near = index.nearest(p.x, p.z, 400);
      const reach = p.kind === 'peak' || p.kind === 'power:pole' ? 400 : 70;
      if (near.index < 0 || near.dist > reach) continue;
      let x = p.x, z = p.z;
      const h = route.heading[near.index];
      // face the road; keep things off the asphalt
      const rx = Math.cos(h), rz = Math.sin(h);
      const side = (x - route.x[near.index]) * rx + (z - route.z[near.index]) * rz >= 0 ? 1 : -1;
      if (near.dist < halfWidth + 1.4 && p.kind !== 'peak') {
        x = route.x[near.index] + rx * side * (halfWidth + 1.6);
        z = route.z[near.index] + rz * side * (halfWidth + 1.6);
      }
      let yaw = -h + (side > 0 ? -Math.PI / 2 : Math.PI / 2);
      if (p.kind === 'power:pole') {
        poles.push({ x, z });
        yaw = hash(k) * Math.PI;
      }
      if (p.kind === 'peak') yaw = 0.3;
      jobs.push(place(model, x, z, yaw, p.kind === 'peak' ? -0.3 : 0));
    }
    // firewood stacks against farmhouse walls near the road
    osm.buildings.forEach((b, i) => {
      if (!['house', 'farm', 'farm_auxiliary', 'barn', 'yes', 'detached'].includes(b.kind)) return;
      if (hash(i * 7) > 0.32) return;
      const spot = besideWall(b, i);
      if (!spot) return;
      const near = index.nearest(spot.x, spot.z, 150);
      if (near.index < 0 || near.dist < halfWidth + 3) return;
      jobs.push(place('prop-firewood.glb', spot.x, spot.z, spot.yaw));
    });
    await Promise.all(jobs);
    this.add(this.wires(osm, poles, groundAt));
    this.add(this.fences(osm, index, groundAt, halfWidth, biome));
  }

  /** Three sagging conductors between consecutive poles of each OSM power line. */
  private wires(osm: OsmWorld, poles: { x: number; z: number }[], groundAt: (x: number, z: number) => number): THREE.Object3D {
    const pos: number[] = [];
    for (const line of osm.barriers) {
      if (!line.kind.startsWith('power:')) continue;
      const pts = line.pts;
      for (let i = 0; i + 3 < pts.length; i += 2) {
        const ax = pts[i], az = pts[i + 1], bx = pts[i + 2], bz = pts[i + 3];
        // only spans whose ends have a pole we placed (inside the corridor)
        const has = (x: number, z: number) => poles.some((p) => Math.abs(p.x - x) < 2 && Math.abs(p.z - z) < 2);
        if (!has(ax, az) || !has(bx, bz)) continue;
        const ya = groundAt(ax, az), yb = groundAt(bx, bz);
        if (!Number.isFinite(ya) || !Number.isFinite(yb)) continue;
        const dx = bx - ax, dz = bz - az;
        const len = Math.hypot(dx, dz) || 1;
        const px = -dz / len, pz = dx / len;
        for (const [o, top] of [[-0.85, 8.75], [0, 9.15], [0.85, 8.75]] as const) {
          const seg = 12;
          const sag = Math.min(2.2, len * 0.012 + 0.3);
          for (let k = 0; k < seg; k++) {
            for (const t of [k / seg, (k + 1) / seg]) {
              const y = ya + (yb - ya) * t + top - sag * 4 * t * (1 - t);
              pos.push(ax + dx * t + px * o, y, az + dz * t + pz * o);
            }
          }
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const mat = patchMaterial(new THREE.LineBasicMaterial({ color: 0x2a2c2e, transparent: true, opacity: 0.85 }), { key: 'wire' });
    return new THREE.LineSegments(geo, mat);
  }

  /** OSM fences (posts and two rails) and walls (rough stone) near the road. */
  private fences(
    osm: OsmWorld, index: RouteIndex, groundAt: (x: number, z: number) => number, halfWidth = 3.5, biome?: Biome,
  ): THREE.Object3D {
    const g = new THREE.Group();
    const med = biome?.id === 'mediterranean';
    const mesh = med ? new MedFences() : null;
    const wood = patchMaterial(new THREE.MeshLambertMaterial({ color: 0x5a412b }), { key: 'fence' });
    const stone = patchMaterial(new THREE.MeshLambertMaterial({ color: 0x8e8a82 }), { key: 'wall' });
    const post = new THREE.BoxGeometry(0.1, 1.2, 0.1).translate(0, 0.5, 0);
    const postMats: THREE.Matrix4[] = [];
    const railPos: number[] = [];
    const wallPos: number[] = [];
    const quad = (arr: number[], a: number[], b: number[], c: number[], d: number[]) => arr.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (const bar of osm.barriers) {
      if (bar.kind !== 'fence' && bar.kind !== 'wall' && bar.kind !== 'retaining_wall') continue;
      const p = bar.pts;
      // every vertex is checked (a long barrier may only come near the route far from its first node)
      const nearV: boolean[] = [];
      for (let i = 0; i + 1 < p.length; i += 2) nearV.push(index.nearest(p[i], p[i + 1], 250).index >= 0);
      if (!nearV.some(Boolean)) continue;
      for (let i = 0; i + 3 < p.length; i += 2) {
        if (!nearV[i / 2] && !nearV[i / 2 + 1]) continue;
        const ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3];
        if (mesh && bar.kind === 'fence') {
          mesh.fence(ax, az, bx, bz, groundAt);
          continue;
        }
        if (mesh && bar.kind === 'wall') {
          // walls along the road edge are the road parapets (Roadside); these are field walls
          const mid = index.nearest((ax + bx) / 2, (az + bz) / 2, 60);
          const e0 = index.nearest(ax, az, 60), e1 = index.nearest(bx, bz, 60);
          const d = Math.min(mid.dist, e0.dist, e1.dist);
          if (d < halfWidth + 6.5) continue;
          mesh.wall(ax, az, bx, bz, groundAt);
          continue;
        }
        const len = Math.hypot(bx - ax, bz - az);
        const steps = Math.max(1, Math.round(len / 2.5));
        for (let k = 0; k < steps; k++) {
          const t0 = k / steps, t1 = (k + 1) / steps;
          const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0;
          const x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
          const y0 = groundAt(x0, z0), y1 = groundAt(x1, z1);
          if (!Number.isFinite(y0) || !Number.isFinite(y1)) continue;
          if (bar.kind === 'fence') {
            postMats.push(new THREE.Matrix4().makeTranslation(x0, y0 - 0.1, z0));
            for (const hgt of [0.45, 0.95]) {
              quad(railPos, [x0, y0 + hgt, z0], [x1, y1 + hgt, z1], [x1, y1 + hgt + 0.1, z1], [x0, y0 + hgt + 0.1, z0]);
            }
          } else {
            const nx = -(z1 - z0), nz = x1 - x0;
            const nl = Math.hypot(nx, nz) || 1;
            const ox = (nx / nl) * 0.25, oz = (nz / nl) * 0.25;
            const top = 0.9;
            quad(wallPos, [x0 + ox, y0 - 0.2, z0 + oz], [x1 + ox, y1 - 0.2, z1 + oz], [x1 + ox, y1 + top, z1 + oz], [x0 + ox, y0 + top, z0 + oz]);
            quad(wallPos, [x0 - ox, y0 - 0.2, z0 - oz], [x1 - ox, y1 - 0.2, z1 - oz], [x1 - ox, y1 + top, z1 - oz], [x0 - ox, y0 + top, z0 - oz]);
            quad(wallPos, [x0 + ox, y0 + top, z0 + oz], [x1 + ox, y1 + top, z1 + oz], [x1 - ox, y1 + top, z1 - oz], [x0 - ox, y0 + top, z0 - oz]);
          }
        }
      }
    }
    if (mesh) g.add(...mesh.build());
    if (postMats.length) {
      const posts = new THREE.InstancedMesh(post, wood, postMats.length);
      postMats.forEach((m, i) => posts.setMatrixAt(i, m));
      posts.castShadow = true;
      posts.computeBoundingSphere();
      g.add(posts);
    }
    for (const [arr, mat] of [[railPos, wood], [wallPos, stone]] as const) {
      if (!arr.length) continue;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, mat);
      (m.material as THREE.Material).side = THREE.DoubleSide;
      m.castShadow = true;
      m.receiveShadow = true;
      g.add(m);
    }
    return g;
  }
}

/**
 * Mediterranean field boundaries: galvanised wire-mesh fences (thin grey posts every ~2.7 m,
 * 1.5 m diamond mesh) and dry-stone field walls (1.0-1.2 m, scanned limestone texture).
 */
class MedFences {
  private postMats: THREE.Matrix4[] = [];
  private mesh = { pos: [] as number[], uv: [] as number[], idx: [] as number[] };
  private wall_ = { pos: [] as number[], uv: [] as number[], idx: [] as number[] };
  private along = 0;

  fence(ax: number, az: number, bx: number, bz: number, groundAt: (x: number, z: number) => number) {
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.5) return;
    const steps = Math.max(1, Math.round(len / 2.7));
    const H = 1.5;
    const m = this.mesh;
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromAxisAngle(up, -Math.atan2(bz - az, bx - ax));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const y = groundAt(x, z);
      if (!Number.isFinite(y)) continue;
      // the last post of a segment is the first of the next one
      if (k < steps) this.postMats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y - 0.1, z), q, new THREE.Vector3(1, 1, 1)));
      if (k < steps) {
        const t1 = (k + 1) / steps;
        const x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
        const y1 = groundAt(x1, z1);
        if (!Number.isFinite(y1)) continue;
        const b = m.pos.length / 3;
        const w = len / steps;
        m.pos.push(x, y, z, x1, y1, z1, x1, y1 + H, z1, x, y + H, z);
        m.uv.push(0, 0, w, 0, w, H, 0, H);
        m.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
      }
    }
  }

  wall(ax: number, az: number, bx: number, bz: number, groundAt: (x: number, z: number) => number) {
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.5) return;
    const steps = Math.max(1, Math.round(len / 2));
    const nx = -(bz - az) / len, nz = (bx - ax) / len;
    const T = 0.27;
    const H = 1.0 + 0.2 * hash(Math.floor(ax * 0.37 + az * 0.91));
    // cross-section: offset, height (negative = buried), v in metres
    const prof: [number, number][] = [[-T, -0.35], [-T * 0.9, H], [0, H + 0.07], [T * 0.9, H], [T, -0.35]];
    const w = this.wall_;
    const base = w.pos.length / 3;
    let ok = 0;
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const y = groundAt(x, z);
      if (!Number.isFinite(y)) return;
      ok++;
      const u = this.along + len * t;
      prof.forEach(([o, h], j) => {
        w.pos.push(x + nx * o, y + h, z + nz * o);
        w.uv.push(u / 2, j === 0 || j === 4 ? h / 2 + 0.2 : j === 2 ? H / 2 + 0.5 : h / 2);
      });
    }
    this.along += len;
    const P = prof.length;
    for (let k = 0; k < ok - 1; k++)
      for (let j = 0; j < P - 1; j++) {
        const a = base + k * P + j, b = a + 1, c = a + P, d = c + 1;
        w.idx.push(a, c, b, b, c, d);
      }
  }

  build(): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    if (this.postMats.length) {
      const mat = patchMaterial(new THREE.MeshLambertMaterial({ color: 0xa4a8aa }), { key: 'fencepost' });
      const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 1.6, 0.05).translate(0, 0.8, 0), mat, this.postMats.length);
      this.postMats.forEach((m, i) => posts.setMatrixAt(i, m));
      posts.castShadow = true;
      posts.computeBoundingSphere();
      out.push(posts);
    }
    const mk = (d: { pos: number[]; uv: number[]; idx: number[] }, mat: THREE.Material, shadow: boolean) => {
      if (!d.idx.length) return;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
      geo.setIndex(d.idx);
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = shadow;
      m.receiveShadow = true;
      out.push(m);
    };
    mk(this.mesh, patchMaterial(wireMaterial(), { key: 'wiremesh' }), false);
    if (this.wall_.idx.length) {
      const t = new THREE.TextureLoader().load('/textures/med/wall.jpg');
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      const stone = new THREE.MeshStandardMaterial({ map: t, color: new THREE.Color(1.5, 1.45, 1.35), roughness: 0.95, side: THREE.DoubleSide });
      mk(this.wall_, patchMaterial(stone, { key: 'fieldwall' }), true);
    }
    return out;
  }
}

/** Galvanised diamond mesh: 1 m x 1.5 m per texture tile, alpha-tested wires. */
function wireMaterial(): THREE.MeshLambertMaterial {
  const W = 128, H = 192; // 1 m x 1.5 m
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = '#c9cdce';
  ctx.lineWidth = 2.2;
  const cell = 32; // ~25 cm diamonds
  ctx.beginPath();
  for (let i = -H; i <= W + H; i += cell) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.moveTo(i, 0);
    ctx.lineTo(i - H, H);
  }
  ctx.stroke();
  // taut top and bottom strand
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.lineTo(W, 2);
  ctx.moveTo(0, H - 2);
  ctx.lineTo(W, H - 2);
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  const mat = new THREE.MeshLambertMaterial({ map: tex, transparent: false, alphaTest: 0.35, side: THREE.DoubleSide });
  mat.alphaToCoverage = true;
  return mat;
}

/** A spot 0.8 m outside the longest wall of a building, facing along it. */
function besideWall(b: Building, seed: number): { x: number; z: number; yaw: number } | null {
  const r = b.ring;
  const n = r.length / 2;
  if (n < 3) return null;
  let best = -1, bestLen = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const l = Math.hypot(r[j * 2] - r[i * 2], r[j * 2 + 1] - r[i * 2 + 1]);
    if (l > bestLen) {
      bestLen = l;
      best = i;
    }
  }
  if (bestLen < 6) return null;
  const j = (best + 1) % n;
  const ax = r[best * 2], az = r[best * 2 + 1], bx = r[j * 2], bz = r[j * 2 + 1];
  let cx = 0, cz = 0;
  for (let i = 0; i < n; i++) {
    cx += r[i * 2] / n;
    cz += r[i * 2 + 1] / n;
  }
  const t = 0.3 + hash(seed) * 0.4;
  const mx = ax + (bx - ax) * t, mz = az + (bz - az) * t;
  let nx = -(bz - az), nz = bx - ax;
  const nl = Math.hypot(nx, nz);
  nx /= nl;
  nz /= nl;
  if ((mx - cx) * nx + (mz - cz) * nz < 0) {
    nx = -nx;
    nz = -nz;
  }
  return { x: mx + nx * 1.4, z: mz + nz * 1.4, yaw: -Math.atan2(bz - az, bx - ax) };
}

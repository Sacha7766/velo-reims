// Small real-world things from OpenStreetMap points and lines, using the Blender-built props in
// public/models: benches, bus stops, guideposts, wayside crosses, info boards, the summit cross,
// power poles with sagging wires, fences and walls, and firewood stacks beside farmhouses.

import * as THREE from 'three';
import type { Building, OsmWorld } from '../geo/osm.ts';
import type { Route, RouteIndex } from '../geo/route.ts';
import { patchMaterial } from './atmosphere.ts';
import { loadModel } from './Landmarks.ts';

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
  async build(route: Route, index: RouteIndex, osm: OsmWorld, groundAt: (x: number, z: number) => number, halfWidth: number) {
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
    this.add(this.fences(osm, index, groundAt));
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
  private fences(osm: OsmWorld, index: RouteIndex, groundAt: (x: number, z: number) => number): THREE.Object3D {
    const g = new THREE.Group();
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
      if (index.nearest(p[0], p[1], 250).index < 0) continue;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3];
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

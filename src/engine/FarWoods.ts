// Woods beyond the tree corridor. Across the open plain a copse a few kilometres off is a dark island on the
// horizon, where the orthophoto alone lays it flat on the ground. The OSM woods out to 4 km (the bake's landmark
// pass) get low canopy domes along their edges, which make the silhouette from the road, and a few inside, as one
// instanced mesh: the 3,000 ha around the Berru loop are 12,000 domes of 20 triangles.

import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Polygon } from '../geo/osm.ts';
import type { RouteIndex } from '../geo/route.ts';
import { patchMaterial } from './atmosphere.ts';

function inside(x: number, z: number, ring: Float32Array): boolean {
  let c = false;
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const xi = ring[i], zi = ring[i + 1], xj = ring[j], zj = ring[j + 1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

function nearEdge(x: number, z: number, ring: Float32Array, d: number): boolean {
  for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
    const ax = ring[j], az = ring[j + 1], dx = ring[i] - ax, dz = ring[i + 1] - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    if (Math.hypot(x - ax - dx * t, z - az - dz * t) < d) return true;
  }
  return false;
}

/** Canopy domes for the woods farther than `near` from the route (the corridor has real trees). */
export function farWoods(forests: Polygon[], index: RouteIndex, near: number, groundAt: (x: number, z: number) => number): THREE.Object3D {
  let s = 12345;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const at: number[] = [];
  for (const f of forests) {
    const [x0, z0, x1, z1] = f.bbox;
    for (let z = z0 + 12; z < z1; z += 24) {
      for (let x = x0 + 12; x < x1; x += 24) {
        const px = x + (r() - 0.5) * 14, pz = z + (r() - 0.5) * 14;
        if (!inside(px, pz, f.outer) || f.holes.some((h) => inside(px, pz, h))) continue;
        if (index.nearest(px, pz, near).index >= 0) continue;
        // the inside is hidden behind the edge from the road: one dome in ten there, so it still reads from above
        if (r() > 0.1 && !nearEdge(px, pz, f.outer, 22)) continue;
        const y = groundAt(px, pz);
        if (!Number.isFinite(y)) continue;
        at.push(px, y, pz, 11 + r() * 5, 13 + r() * 7);
      }
    }
  }
  const n = at.length / 5;
  if (!n) return new THREE.Group();
  const dome = mergeVertices(new THREE.IcosahedronGeometry(1, 0).deleteAttribute('uv').deleteAttribute('normal'));
  dome.computeVertexNormals();
  const mat = patchMaterial(new THREE.MeshLambertMaterial({ color: 0xffffff }), { key: 'farwood' });
  const mesh = new THREE.InstancedMesh(dome, mat, n);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const col = new THREE.Color();
  for (let k = 0; k < n; k++) {
    const [x, y, z, rad, h] = at.slice(k * 5, k * 5 + 5);
    // a crown from the ground to h: the sphere's top half and a little of its lower one
    q.setFromAxisAngle(up, r() * 6.28);
    mesh.setMatrixAt(k, m.compose(new THREE.Vector3(x, y + h * 0.45, z), q, new THREE.Vector3(rad, h * 0.6, rad)));
    // oak, ash and hornbeam in full leaf, a few darker pines
    mesh.setColorAt(k, col.setRGB(0.05 + r() * 0.025, 0.075 + r() * 0.03, 0.03 + r() * 0.015));
  }
  mesh.computeBoundingSphere();
  return mesh;
}

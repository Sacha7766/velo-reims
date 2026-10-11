// Road furniture that depends on the terrain: galvanised W-beam guard rails where the
// ground drops away beside the road and on the outside of hairpins, Austrian delineator
// posts (Leitpflöcke: white, black band, red reflector on the right, white on the left,
// StVO §57) where there is no rail, and red/white chevron boards at hairpin apexes.

import * as THREE from 'three';
import { findHairpins, type Route } from '../geo/route.ts';
import { patchMaterial } from './atmosphere.ts';
import { mergeColored } from './Road.ts';

interface Run {
  side: 1 | -1;
  a: number;
  b: number;
}

export class Roadside extends THREE.Group {
  railRuns: Run[] = [];

  constructor(route: Route, halfWidth: number, groundAt: (x: number, z: number) => number) {
    super();
    const runs = this.findRailRuns(route, halfWidth, groundAt);
    this.railRuns = runs;
    if (runs.length) this.add(this.rails(route, halfWidth, runs, groundAt));
    this.add(this.posts(route, halfWidth, runs, groundAt));
    const chevrons = this.chevrons(route, halfWidth, groundAt);
    if (chevrons) this.add(chevrons);
  }

  /** Stretches where the ground beside the road falls away (or hairpin outsides). */
  private findRailRuns(route: Route, hw: number, groundAt: (x: number, z: number) => number): Run[] {
    const n = route.n;
    const need = { [1]: new Uint8Array(n), [-1]: new Uint8Array(n) } as Record<1 | -1, Uint8Array>;
    for (let i = 0; i < n; i++) {
      const h = route.heading[i];
      const rx = Math.cos(h), rz = Math.sin(h);
      for (const side of [1, -1] as const) {
        const d = hw + 3.5;
        const g = groundAt(route.x[i] + rx * d * side, route.z[i] + rz * d * side);
        const g2 = groundAt(route.x[i] + rx * (d + 4) * side, route.z[i] + rz * (d + 4) * side);
        if (!Number.isFinite(g)) continue;
        const drop = route.ele[i] - Math.min(g, Number.isFinite(g2) ? g2 + 1.2 : g);
        if (drop > 2.2) need[side][i] = 1;
      }
    }
    // outside of hairpins
    const span = Math.round(36 / route.step);
    for (const s of findHairpins(route)) {
      const c = Math.round(s / route.step);
      let turn = 0;
      for (let j = Math.max(1, c - span); j < Math.min(n, c + span); j++) {
        const d = route.heading[j] - route.heading[j - 1];
        turn += Math.atan2(Math.sin(d), Math.cos(d));
      }
      const outside: 1 | -1 = turn > 0 ? -1 : 1; // turning right → outside is on the left
      for (let j = Math.max(0, c - span); j < Math.min(n, c + span); j++) need[outside][j] = 1;
    }
    const runs: Run[] = [];
    const minLen = Math.round(24 / route.step);
    const gap = Math.round(30 / route.step);
    for (const side of [1, -1] as const) {
      const a = need[side];
      // close small gaps
      let last = -1e9;
      for (let i = 0; i < n; i++) {
        if (a[i]) {
          if (i - last > 1 && i - last <= gap) for (let j = last + 1; j < i; j++) a[j] = 1;
          last = i;
        }
      }
      let start = -1;
      for (let i = 0; i <= n; i++) {
        if (i < n && a[i]) {
          if (start < 0) start = i;
        } else if (start >= 0) {
          if (i - start >= minLen) runs.push({ side, a: start, b: i - 1 });
          start = -1;
        }
      }
    }
    return runs;
  }

  private rails(route: Route, hw: number, runs: Run[], groundAt: (x: number, z: number) => number): THREE.Group {
    const g = new THREE.Group();
    const steel = patchMaterial(new THREE.MeshStandardMaterial({ color: 0xa9adb0, roughness: 0.38, metalness: 0.55 }), {
      key: 'rail',
    });
    // W-beam profile in (outward, up) metres, posts behind it
    const prof: [number, number][] = [
      [0.0, 0.76], [0.045, 0.72], [0.02, 0.665], [0.0, 0.62], [0.02, 0.575], [0.045, 0.52], [0.0, 0.47],
    ];
    const pos: number[] = [];
    const nor: number[] = [];
    const idx: number[] = [];
    const postGeo = new THREE.BoxGeometry(0.1, 0.8, 0.14).translate(0, 0.4, 0);
    const postMats: THREE.Matrix4[] = [];
    const off = hw + 0.75;
    for (const run of runs) {
      const base = pos.length / 3;
      const count = run.b - run.a + 1;
      for (let i = run.a; i <= run.b; i++) {
        const h = route.heading[i];
        const ox = Math.cos(h) * run.side, oz = Math.sin(h) * run.side;
        const cx = route.x[i] + ox * off, cz = route.z[i] + oz * off;
        // the rail follows the road level (it stands on the shoulder)
        const y = route.ele[i] - 0.05;
        for (const [o, up] of prof) {
          pos.push(cx + ox * o, y + up, cz + oz * o);
          nor.push(-ox, 0.15, -oz);
        }
        // a post every ~4 m
        if ((i - run.a) % Math.max(1, Math.round(4 / route.step)) === 0) {
          const gy = Math.min(groundAt(cx + ox * 0.15, cz + oz * 0.15), y);
          const m = new THREE.Matrix4().compose(
            new THREE.Vector3(cx + ox * 0.13, Number.isFinite(gy) ? gy - 0.25 : y - 0.25, cz + oz * 0.13),
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -h),
            new THREE.Vector3(1, (y + 0.7 - (Number.isFinite(gy) ? gy - 0.25 : y - 0.25)) / 0.8, 1),
          );
          postMats.push(m);
        }
      }
      const P = prof.length;
      for (let k = 0; k < count - 1; k++) {
        for (let j = 0; j < P - 1; j++) {
          const a = base + k * P + j;
          const b = a + 1;
          const c = a + P;
          const d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
      }
      // end terminals: the beam ends bent down to the ground over the last 4 m
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const beam = new THREE.Mesh(geo, steel);
    (beam.material as THREE.Material).side = THREE.DoubleSide;
    beam.castShadow = true;
    beam.receiveShadow = true;
    g.add(beam);
    const posts = new THREE.InstancedMesh(postGeo, steel, postMats.length);
    postMats.forEach((m, i) => posts.setMatrixAt(i, m));
    posts.castShadow = true;
    posts.computeBoundingSphere();
    g.add(posts);
    return g;
  }

  /** Leitpflöcke every 50 m (25 m in bends) where there is no guard rail. */
  private posts(route: Route, hw: number, runs: Run[], groundAt: (x: number, z: number) => number): THREE.InstancedMesh {
    const white = new THREE.Color(0.93, 0.93, 0.91);
    const black = new THREE.Color(0.03, 0.03, 0.03);
    // reflector colours are HDR-ish so they catch the light like retroreflectors
    const red = new THREE.Color(1.6, 0.08, 0.05);
    const clear = new THREE.Color(1.6, 1.6, 1.5);
    // local frame: +Z faces the traffic the post is on the right of
    const mk = (front: THREE.Color, back: THREE.Color) =>
      mergeColored([
        [new THREE.BoxGeometry(0.12, 1.0, 0.1).translate(0, 0.5, 0), white],
        [new THREE.BoxGeometry(0.124, 0.25, 0.104).translate(0, 0.8, 0), black],
        [new THREE.BoxGeometry(0.05, 0.12, 0.012).translate(0, 0.8, 0.055), front],
        [new THREE.BoxGeometry(0.05, 0.12, 0.012).translate(0, 0.8, -0.055), back],
      ]);
    const geo = mk(red, clear);
    const mat = patchMaterial(new THREE.MeshLambertMaterial({ vertexColors: true }), { key: 'leitpflock' });
    const railAt = (side: 1 | -1, i: number) => runs.some((r) => r.side === side && i >= r.a - 3 && i <= r.b + 3);
    const mats: THREE.Matrix4[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    let next = 0;
    for (let i = 0; i < route.n; i++) {
      if (i < next) continue;
      const bend = route.radius[i] < 150;
      next = i + Math.round((bend ? 25 : 50) / route.step);
      const h = route.heading[i];
      for (const side of [1, -1] as const) {
        if (railAt(side, i)) continue;
        const off = hw + 0.75;
        const x = route.x[i] + Math.cos(h) * off * side;
        const z = route.z[i] + Math.sin(h) * off * side;
        const g = groundAt(x, z);
        const y = Number.isFinite(g) ? Math.min(g, route.ele[i]) : route.ele[i];
        // right-side posts show red to us; left-side posts are turned around (white to us, red to oncoming)
        const yaw = -h + (side > 0 ? 0 : Math.PI);
        mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y - 0.1, z), new THREE.Quaternion().setFromAxisAngle(up, yaw), new THREE.Vector3(1, 1, 1)));
      }
    }
    const mesh = new THREE.InstancedMesh(geo, mat, mats.length);
    mats.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.castShadow = true;
    mesh.computeBoundingSphere();
    return mesh;
  }

  /** Red boards with white chevrons on the outside of each hairpin. */
  private chevrons(route: Route, hw: number, groundAt: (x: number, z: number) => number): THREE.Group | null {
    const pins = findHairpins(route);
    if (!pins.length) return null;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.fillStyle = '#c4161c';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#f4f4f0';
    for (const x0 of [40, 120, 200]) {
      ctx.beginPath();
      ctx.moveTo(x0 - 30, 14);
      ctx.lineTo(x0 + 10, 64);
      ctx.lineTo(x0 - 30, 114);
      ctx.lineTo(x0 - 6, 114);
      ctx.lineTo(x0 + 34, 64);
      ctx.lineTo(x0 - 6, 14);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const boardMat = patchMaterial(new THREE.MeshLambertMaterial({ map: tex }), { key: 'chevron' });
    const poleMat = patchMaterial(new THREE.MeshLambertMaterial({ color: 0x8a8d90 }), { key: 'chevpole' });
    const g = new THREE.Group();
    const board = new THREE.BoxGeometry(1.0, 0.5, 0.03);
    const pole = new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6).translate(0, 0.8, 0);
    for (const s of pins) {
      const c0 = Math.round(s / route.step);
      let turn = 0;
      const span = Math.round(30 / route.step);
      for (let j = Math.max(1, c0 - span); j < Math.min(route.n, c0 + span); j++) {
        const d = route.heading[j] - route.heading[j - 1];
        turn += Math.atan2(Math.sin(d), Math.cos(d));
      }
      const outside = turn > 0 ? -1 : 1;
      for (const k of [-6, -2, 2, 6]) {
        const i = Math.min(route.n - 1, Math.max(0, c0 + k));
        const h = route.heading[i];
        const off = hw + 1.6;
        const x = route.x[i] + Math.cos(h) * off * outside;
        const z = route.z[i] + Math.sin(h) * off * outside;
        const gy = groundAt(x, z);
        const y = Number.isFinite(gy) ? gy : route.ele[i];
        const p = new THREE.Mesh(pole, poleMat);
        p.position.set(x, y - 0.2, z);
        const b = new THREE.Mesh(board, boardMat);
        b.position.set(x, y + 1.15, z);
        // face the oncoming rider; the arrows point the way the road turns
        b.rotation.y = -h;
        if (turn < 0) b.scale.x = -1;
        p.castShadow = b.castShadow = true;
        g.add(p, b);
      }
    }
    return g;
  }
}

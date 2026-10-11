// Road tunnels (route.tunnels, from OSM tunnel=yes): a rough rock tube with an arched roof
// and a line of ceiling lamps. The terrain above stays untouched (Terrain.flatten), the terrain
// shader cuts the portal openings, and every patched material dims its ambient light inside
// the tube and adds the lamps (atmosphere.ts TUNNEL_GLSL).

import * as THREE from 'three';
import { pointAt, type Route, type RoutePoint } from '../geo/route.ts';
import { patchMaterial, tunnelUniforms, MAX_TUNNEL_PTS } from './atmosphere.ts';

/** Half width of the bore (beyond the road edge) and roof heights above the road. */
export const BORE = { side: 0.9, wall: 3.4, apex: 5.9 };

export class Tunnels extends THREE.Group {
  private spans: { a: number; b: number }[] = [];
  private tmp: Partial<RoutePoint> = {};
  private route: Route;
  private hw: number;

  constructor(route: Route, hw: number) {
    super();
    this.route = route;
    this.hw = hw;
    const pts: number[] = [];
    let first = true;
    for (const [a, b] of route.tunnels) {
      this.spans.push({ a, b });
      this.add(this.tube(a, b));
      this.add(this.portal(a + 4, 1), this.portal(b - 4, -1));
      // centre line for the shaders, ~8 m steps
      const n = Math.max(2, Math.min(MAX_TUNNEL_PTS - pts.length / 4, Math.ceil((b - a + 8) / 8) + 1));
      if (!first) continue;
      for (let i = 0; i < n; i++) {
        const s = a - 4 + ((b - a + 8) * i) / (n - 1);
        const p = pointAt(route, s, this.tmp);
        pts.push(p.x, p.ele, p.z, s);
      }
      first = false; // shader support for one tunnel per route (Formentor has one)
    }
    const u = tunnelUniforms;
    u.uTunnelCount.value = pts.length / 4;
    for (let i = 0; i < MAX_TUNNEL_PTS; i++) {
      if (i * 4 < pts.length) u.uTunnelPts.value[i].set(pts[i * 4], pts[i * 4 + 1], pts[i * 4 + 2], pts[i * 4 + 3]);
    }
    if (pts.length) {
      const c = new THREE.Vector3();
      for (let i = 0; i < pts.length; i += 4) c.add(new THREE.Vector3(pts[i], pts[i + 1], pts[i + 2]));
      c.multiplyScalar(4 / pts.length);
      let r = 0;
      for (let i = 0; i < pts.length; i += 4) r = Math.max(r, c.distanceTo(new THREE.Vector3(pts[i], pts[i + 1], pts[i + 2])));
      u.uTunnelBound.value.set(c.x, c.y, c.z, r + 20);
      u.uTunnelHalf.value = hw + BORE.side;
    }
  }

  /** Is world point (x, z) over a tunnel bore (for camera ground clamping)? */
  contains(s: number): boolean {
    return this.spans.some(({ a, b }) => s > a - 6 && s < b + 6);
  }

  private profile(): [number, number][] {
    const W = this.hw + BORE.side;
    const out: [number, number][] = [[-W, -0.3], [-W, BORE.wall]];
    const steps = 10;
    for (let k = 1; k < steps; k++) {
      const t = k / steps;
      const ang = Math.PI * (1 - t);
      out.push([Math.cos(ang) * W, BORE.wall + Math.sin(ang) * (BORE.apex - BORE.wall)]);
    }
    out.push([W, BORE.wall], [W, -0.3]);
    return out;
  }

  private tube(a: number, b: number): THREE.Object3D {
    const prof = this.profile();
    const P = prof.length;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const step = 1.5;
    const n = Math.ceil((b - a + 2) / step) + 1;
    const lamps: THREE.Matrix4[] = [];
    for (let i = 0; i < n; i++) {
      const s = a - 1 + i * step;
      const p = pointAt(this.route, s, this.tmp);
      const rx = Math.cos(p.heading), rz = Math.sin(p.heading);
      for (let j = 0; j < P; j++) {
        const [across, up] = prof[j];
        // rough-hewn rock: the bore wanders by a few decimetres
        const rough = j > 0 && j < P - 1 ? (Math.sin(s * 1.7 + j * 2.1) * 0.12 + Math.sin(s * 0.53 + j * 0.7) * 0.18) : 0;
        const nx = j < P / 2 ? -1 : 1;
        pos.push(p.x + rx * (across + rough * nx), p.ele + up + rough * 0.5, p.z + rz * (across + rough * nx));
        uv.push(s, j / (P - 1));
      }
      if (i % 8 === 4) {
        lamps.push(
          new THREE.Matrix4().compose(
            new THREE.Vector3(p.x, p.ele + BORE.apex - 0.08, p.z),
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -p.heading),
            new THREE.Vector3(1, 1, 1),
          ),
        );
      }
    }
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < P - 1; j++) {
        const q = i * P + j;
        idx.push(q, q + P, q + 1, q + 1, q + P, q + P + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const g = new THREE.Group();
    const rock = new THREE.Mesh(geo, rockMaterial());
    rock.material.side = THREE.DoubleSide;
    rock.receiveShadow = true;
    g.add(rock);
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.35, 2.2) });
    const lampMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.25, 0.08, 1.2), lampMat, lamps.length);
    lamps.forEach((m, i) => lampMesh.setMatrixAt(i, m));
    lampMesh.computeBoundingSphere();
    g.add(lampMesh);
    // amber reflectors on both walls every 12 m (as photographed)
    const refl: THREE.Matrix4[] = [];
    for (let s = a + 2; s < b; s += 12) {
      const p = pointAt(this.route, s, this.tmp);
      for (const side of [-1, 1]) {
        const off = this.hw + BORE.side - 0.05;
        refl.push(
          new THREE.Matrix4().compose(
            new THREE.Vector3(p.x + Math.cos(p.heading) * off * side, p.ele + 0.9, p.z + Math.sin(p.heading) * off * side),
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -p.heading),
            new THREE.Vector3(1, 1, 1),
          ),
        );
      }
    }
    const reflMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 0.08, 0.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 0.9, 0.1) }), refl.length);
    refl.forEach((m, i) => reflMesh.setMatrixAt(i, m));
    reflMesh.computeBoundingSphere();
    g.add(reflMesh);
    return g;
  }

  /** Rough rock collar around the opening, hiding where the bore meets the terrain. */
  private portal(s: number, dir: 1 | -1): THREE.Mesh {
    const inner = this.profile();
    const p = pointAt(this.route, s, this.tmp);
    const rx = Math.cos(p.heading), rz = Math.sin(p.heading);
    const fx = Math.sin(p.heading) * dir, fz = -Math.cos(p.heading) * dir;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const P = inner.length;
    for (let j = 0; j < P; j++) {
      const [x, y] = inner[j];
      // outer ring: 2.5–4 m of rock around the bore, leaning back into the hill
      const k = 1.0 + (2.8 + Math.sin(j * 1.9) * 0.8) / Math.max(4, Math.hypot(x, y - 2));
      for (const [scale, back] of [[1, 0], [k, 1.6]] as const) {
        pos.push(p.x + rx * x * scale - fx * back, p.ele + (y < 0 ? y : y * scale), p.z + rz * x * scale - fz * back);
        uv.push(s + back, j / (P - 1));
      }
    }
    for (let j = 0; j < P - 1; j++) {
      const q = j * 2;
      idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, rockMaterial());
    m.material.side = THREE.DoubleSide;
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
}

let rockMat: THREE.MeshStandardMaterial | null = null;

/** Rough grey limestone, procedural (no texture): mottled colour and a noisy bump. */
function rockMaterial(): THREE.MeshStandardMaterial {
  if (rockMat) return rockMat;
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vRk;\nvarying vec3 vRkW;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvRk = uv;\nvRkW = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec2 vRk;
varying vec3 vRkW;
float rkH(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float rkN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(rkH(i), rkH(i + vec2(1, 0)), f.x), mix(rkH(i + vec2(0, 1)), rkH(i + vec2(1, 1)), f.x), f.y); }
float rkF(vec2 p) { return rkN(p) * 0.5 + rkN(p * 2.3) * 0.3 + rkN(p * 5.1) * 0.2; }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
// world-space noise on two planes: no stretching along or across the bore
vec2 rp = vec2(vRkW.x + vRkW.z, vRkW.y) * 0.9 + vec2(vRkW.z * 0.37, 0.0);
float rf = rkF(rp);
diffuseColor.rgb = mix(vec3(0.3, 0.29, 0.27), vec3(0.5, 0.47, 0.42), rf) * (0.85 + 0.3 * rkN(rp * 3.0));
diffuseColor.rgb *= 1.0 - 0.35 * smoothstep(0.6, 0.9, rkN(rp * 1.3 + 7.0)); // damp dark streaks`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
{
  float e = 0.06;
  float h0 = rkF(rp * 2.0);
  vec3 bump = vec3(rkF(rp * 2.0 + vec2(e, 0.0)) - h0, rkF(rp * 2.0 + vec2(0.0, e)) - h0, 0.0) * 6.0;
  normal = normalize(normal + bump.x * normalize(dFdx(vViewPosition)) + bump.y * normalize(dFdy(vViewPosition)));
}`,
      );
  };
  rockMat = patchMaterial(mat, { key: 'tunnelrock' });
  return rockMat;
}

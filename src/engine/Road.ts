// Asphalt ribbon along the route with procedural markings, plus Alpine roadside posts.

import * as THREE from 'three';
import type { Route } from '../geo/route.ts';
import { patchMaterial } from './atmosphere.ts';
import { ALPINE, type Biome } from './biome.ts';

const SHOULDER = 0.55;

const TILE = 2.6; // metres per asphalt texture repeat

function asphaltTextures() {
  const load = (f: string, srgb: boolean) => {
    const t = new THREE.TextureLoader().load(`/textures/asphalt/${f}`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { color: load('color.jpg', true), normal: load('normal.jpg', false), rough: load('rough.jpg', false) };
}

function roadMaterial(halfWidth: number, biome: Biome) {
  // CC0 Poly Haven asphalt_02 scan for colour, cracks and micro relief; markings are procedural
  const tex = asphaltTextures();
  const mat = new THREE.MeshStandardMaterial({
    roughness: 1,
    metalness: 0,
    color: 0xffffff,
    normalMap: tex.normal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughnessMap: tex.rough,
    // asphalt only picks up a little sky
    envMapIntensity: 0.35,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uHalf = { value: halfWidth };
    shader.uniforms.uDash = { value: new THREE.Vector2(biome.dash[0], biome.dash[0] + biome.dash[1]) };
    // Mallorca: sun-bleached lighter asphalt, mostly no edge lines, asphalt up to the wall
    shader.uniforms.uMed = { value: biome.id === 'mediterranean' ? 1 : 0 };
    shader.uniforms.uAsphalt = { value: tex.color };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 roadUv;\nvarying vec2 vRoad;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRoad = roadUv;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uHalf;
uniform vec2 uDash;
uniform float uMed;
uniform sampler2D uAsphalt;
varying vec2 vRoad;
float gPaint;
float rh(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 15731.7); }
float rn(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(rh(i), rh(i + vec2(1, 0)), f.x), mix(rh(i + vec2(0, 1)), rh(i + vec2(1, 1)), f.x), f.y);
}`,
      )
      .replace(
        '#include <map_fragment>',
        `{
  float across = vRoad.x; // metres from centre line, signed
  float along = vRoad.y;  // metres along route
  float a = abs(across);
  vec2 p = vec2(across, along);
  vec3 scan = texture2D(uAsphalt, p / ${TILE.toFixed(2)}).rgb;
  vec3 scan2 = texture2D(uAsphalt, p.yx / 7.3 + 0.37).rgb;
  vec3 asphalt = mix(scan, scan2, 0.3) * mix(1.36, 1.22, uMed);
  // Ma-2210: resurfaced, few visible cracks
  asphalt = mix(asphalt, vec3(dot(asphalt, vec3(0.33))) * 0.98 + 0.02, 0.4 * uMed);
  // repair patches and darker fresh tar
  float patches = smoothstep(0.58, 0.72, rn(p * vec2(0.35, 0.06) + 3.1));
  asphalt = mix(asphalt, asphalt * vec3(0.7, 0.7, 0.72), patches);
  asphalt *= 0.9 + 0.2 * rn(p * vec2(0.08, 0.02));
  // wheel tracks are polished a bit darker
  float tk = (a - uHalf * 0.5) / 0.45;
  float track = exp(-tk * tk);
  asphalt *= 1.0 - 0.12 * track;
  vec3 paint = vec3(0.86, 0.86, 0.82);
  float wear = 0.75 + 0.25 * rn(p * vec2(4.0, 0.6));
  float edge = step(abs(a - (uHalf - 0.28)), 0.07) * (1.0 - uMed);
  // centre dashes: Austria 6 m / 12 m, Spain (M-1.3) 3.5 m / 9 m
  float dash = step(fract(along / uDash.y), uDash.x / uDash.y);
  float centre = step(a, 0.06) * dash * step(2.6, uHalf);
  gPaint = max(edge, centre) * wear;
  vec3 col = mix(asphalt, paint * wear, max(edge, centre));
  // gravel shoulder
  float sh = smoothstep(uHalf - 0.02, uHalf + 0.06, a);
  vec3 gravel = mix(vec3(0.3, 0.29, 0.27), vec3(0.42, 0.41, 0.38), rn(p * 14.0));
  gravel = mix(gravel, vec3(0.5, 0.46, 0.4) * (0.8 + 0.3 * rn(p * 9.0)), uMed);
  col = mix(col, gravel, sh);
  diffuseColor.rgb = col;
  diffuseColor.a = 1.0 - smoothstep(uHalf + 0.25, uHalf + ${SHOULDER.toFixed(2)}, a);
}`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
roughnessFactor = mix(clamp(roughnessFactor * 0.95, 0.55, 1.0), 0.5, gPaint);`,
      );
  };
  mat.transparent = true;
  mat.depthWrite = true;
  return patchMaterial(mat, { key: `road:${biome.id}`, depthBias: 0.012 });
}

export class Road extends THREE.Group {
  constructor(route: Route, halfWidth: number, biome: Biome = ALPINE) {
    super();
    const n = route.n;
    const cols = [-(halfWidth + SHOULDER), -halfWidth, 0, halfWidth, halfWidth + SHOULDER];
    const drop = [-0.12, 0, 0, 0, -0.12];
    const pos = new Float32Array(n * cols.length * 3);
    const uv = new Float32Array(n * cols.length * 2);
    const nor = new Float32Array(n * cols.length * 3);
    // build in chunks so frustum culling works on long routes
    const origin = new THREE.Vector3(route.x[0], route.ele[0], route.z[0]);
    for (let i = 0; i < n; i++) {
      const h = route.heading[i];
      const rx = Math.cos(h);
      const rz = Math.sin(h);
      const slope = Math.atan(route.grade[i] / 100);
      for (let c = 0; c < cols.length; c++) {
        const v = i * cols.length + c;
        pos[v * 3] = route.x[i] + rx * cols[c] - origin.x;
        pos[v * 3 + 1] = route.ele[i] + 0.06 + drop[c] - origin.y;
        pos[v * 3 + 2] = route.z[i] + rz * cols[c] - origin.z;
        uv[v * 2] = cols[c];
        uv[v * 2 + 1] = i * route.step;
        nor[v * 3] = -Math.sin(h) * Math.sin(slope);
        nor[v * 3 + 1] = Math.cos(slope);
        nor[v * 3 + 2] = Math.cos(h) * Math.sin(slope);
      }
    }
    const mat = roadMaterial(halfWidth, biome);
    const tuv = new Float32Array(uv.length);
    for (let k = 0; k < uv.length; k++) tuv[k] = uv[k] / TILE;
    const uvTex = new THREE.BufferAttribute(tuv, 2);
    const CHUNK = 250;
    for (let start = 0; start < n - 1; start += CHUNK) {
      const end = Math.min(n - 1, start + CHUNK);
      const idx: number[] = [];
      for (let i = start; i < end; i++) {
        for (let c = 0; c < cols.length - 1; c++) {
          const a = i * cols.length + c;
          const b = a + 1;
          const d = a + cols.length;
          const e = d + 1;
          idx.push(a, b, d, b, e, d);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('roadUv', new THREE.BufferAttribute(uv, 2));
      geo.setAttribute('uv', uvTex);
      geo.setIndex(idx);
      geo.boundingSphere = chunkSphere(pos, start * cols.length, (end + 1) * cols.length);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(origin);
      mesh.receiveShadow = true;
      mesh.renderOrder = 1;
      this.add(mesh);
    }
    // rural delineator posts and guard rails need the terrain: Roadside.ts
    if (route.category === 'city') this.add(lamps(route, halfWidth));
  }
}

/** Street lamps every 32 m, alternating sides (city routes). */
function lamps(route: Route, halfWidth: number): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.CylinderGeometry(0.06, 0.09, 6, 8).translate(0, 3, 0);
  const arm = new THREE.BoxGeometry(0.08, 0.08, 1.4).translate(0, 5.95, -0.65);
  const head = new THREE.BoxGeometry(0.34, 0.14, 0.6).translate(0, 5.85, -1.3);
  const metal = new THREE.Color().setRGB(0.18, 0.2, 0.22, THREE.SRGBColorSpace);
  const geo = mergeColored([
    [pole, metal],
    [arm, metal],
    [head, new THREE.Color(0.25, 0.26, 0.27)],
  ]);
  const mat = patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.6 }), { key: 'lamp' });
  const spacing = Math.round(32 / route.step);
  const count = Math.ceil(route.n / spacing);
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  let k = 0;
  for (let i = 0; i < route.n && k < count; i += spacing) {
    const h = route.heading[i];
    const side = k % 2 ? 1 : -1;
    const off = halfWidth + 1.2;
    // the arm (local -Z) reaches over the road
    q.setFromAxisAngle(up, -h + (side > 0 ? Math.PI / 2 : -Math.PI / 2));
    m.compose(
      new THREE.Vector3(route.x[i] + Math.cos(h) * off * side, route.ele[i] - 0.1, route.z[i] + Math.sin(h) * off * side),
      q,
      new THREE.Vector3(1, 1, 1),
    );
    mesh.setMatrixAt(k++, m);
  }
  mesh.count = k;
  mesh.castShadow = true;
  mesh.computeBoundingSphere();
  g.add(mesh);
  return g;
}

function chunkSphere(pos: Float32Array, from: number, to: number): THREE.Sphere {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (let i = from; i < to; i++) box.expandByPoint(v.fromArray(pos, i * 3));
  return box.getBoundingSphere(new THREE.Sphere());
}

export function mergeColored(parts: [THREE.BufferGeometry, THREE.Color][]): THREE.BufferGeometry {
  const geos = parts.map(([g, c]) => {
    const geo = g.index ? g.toNonIndexed() : g;
    const n = geo.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.toArray(col, i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.deleteAttribute('uv');
    return geo;
  });
  let total = 0;
  for (const g of geos) total += g.getAttribute('position').count;
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let o = 0;
  for (const g of geos) {
    pos.set(g.getAttribute('position').array as Float32Array, o * 3);
    nor.set(g.getAttribute('normal').array as Float32Array, o * 3);
    col.set(g.getAttribute('color').array as Float32Array, o * 3);
    o += g.getAttribute('position').count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

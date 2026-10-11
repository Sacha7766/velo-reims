// Terrain shading: orthophoto as base colour, plus close-range material synthesis.
// The photo is classified per pixel (grass / rock / snow) to add high-frequency
// detail and surface relief near the camera; water (OSM mask or sea level) gets
// sky reflections, waves and sun glints.

import * as THREE from 'three';
import { patchMaterial } from './atmosphere.ts';
import { groundTextures } from './groundTextures.ts';

const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
blank.needsUpdate = true;

export const terrainUniforms = {
  uWaterMask: { value: blank as THREE.Texture },
  uCanopy: { value: blank as THREE.Texture },
  uGrassTex: { value: blank as THREE.Texture },
  uRockTex: { value: blank as THREE.Texture },
  uGravelTex: { value: blank as THREE.Texture },
  uMaskOrigin: { value: new THREE.Vector2(0, 0) },
  uMaskSize: { value: new THREE.Vector2(1, 1) },
};

export function setWaterMask(tex: THREE.Texture, x0: number, z0: number, w: number, h: number, canopy?: THREE.Texture) {
  const old = terrainUniforms.uWaterMask.value;
  const oldC = terrainUniforms.uCanopy.value;
  terrainUniforms.uWaterMask.value = tex;
  terrainUniforms.uCanopy.value = canopy ?? blank;
  terrainUniforms.uMaskOrigin.value.set(x0, z0);
  terrainUniforms.uMaskSize.value.set(w, h);
  if (old !== blank && old !== tex) old.dispose();
  if (oldC !== blank && oldC !== canopy) oldC.dispose();
}

export function clearWaterMask() {
  setWaterMask(blank, 0, 0, 1, 1);
}

const NOISE = /* glsl */ `
float tHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float tNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(tHash(i), tHash(i + vec2(1, 0)), u.x), mix(tHash(i + vec2(0, 1)), tHash(i + vec2(1, 1)), u.x), u.y);
}
float tRidge(vec2 p) { return 1.0 - abs(tNoise(p) * 2.0 - 1.0); }
`;

export function terrainMaterial(map: THREE.Texture) {
  if (terrainUniforms.uGrassTex.value === blank) {
    const g = groundTextures();
    terrainUniforms.uGrassTex.value = g.grass;
    terrainUniforms.uRockTex.value = g.rock;
    terrainUniforms.uGravelTex.value = g.gravel;
  }
  const mat = new THREE.MeshLambertMaterial({ map });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, terrainUniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTWNormal;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvTWNormal = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <map_pars_fragment>',
        `#include <map_pars_fragment>
uniform sampler2D uWaterMask;
uniform sampler2D uCanopy;
uniform sampler2D uGrassTex;
uniform sampler2D uRockTex;
uniform sampler2D uGravelTex;
uniform vec2 uMaskOrigin;
uniform vec2 uMaskSize;
varying vec3 vTWNormal;
${NOISE}`,
      )
      .replace(
        '#include <map_fragment>',
        `vec3 tPert = vec3(0.0);
float tWater = 0.0;
float tDetail = 1.0;
float tBump = 0.0;
#ifdef USE_MAP
{
  vec3 img = texture2D(map, vMapUv).rgb;
  vec3 imgB = texture(map, vMapUv, 2.5).rgb;
  vec3 s = sqrt(max(imgB, vec3(0.0)));
  float mx = max(s.r, max(s.g, s.b));
  float mn = min(s.r, min(s.g, s.b));
  float sat = (mx - mn) / max(mx, 1e-3);
  float L = (s.r + s.g + s.b) / 3.0;
  vec3 wn = normalize(vTWNormal);
  float slope = 1.0 - clamp(wn.y, 0.0, 1.0);
  vec2 p = vAtmoWorld.xz;
  vec3 q = vAtmoWorld;
  float camD = length(vAtmoWorld - cameraPosition);
  float near = 1.0 - smoothstep(40.0, 320.0, camD);

  // OSM land cover (G meadow, B built-up) keeps mown meadows from reading as gravel
  vec2 lmuv = (vAtmoWorld.xz - uMaskOrigin) / uMaskSize;
  bool inMask = lmuv.x > 0.0 && lmuv.y > 0.0 && lmuv.x < 1.0 && lmuv.y < 1.0;
  vec3 land = inMask ? texture2D(uWaterMask, lmuv).rgb : vec3(0.0);
  float canopy = inMask ? smoothstep(0.15, 0.85, texture2D(uCanopy, lmuv).r) : 0.0;
  float meadow = smoothstep(0.3, 0.8, land.g) * (1.0 - smoothstep(0.3, 0.8, land.b)) * (1.0 - canopy);
  float wGrass = max(smoothstep(0.0, 0.07, s.g - max(s.r, s.b) * 0.93), meadow * 0.9) * (1.0 - canopy * 0.85);
  // bright, unsaturated photo pixels are snow only up high: on the Prealps they are mown or dry grass
  float wSnow = smoothstep(0.6, 0.78, L) * (1.0 - smoothstep(0.1, 0.22, sat)) * smoothstep(1500.0, 1950.0, vAtmoWorld.y);
  float steep = smoothstep(0.26, 0.52, slope);
  float wRock = clamp((1.0 - wGrass) * (1.0 - wSnow) * smoothstep(0.24, 0.1, sat) * smoothstep(0.08, 0.3, slope), 0.0, 1.0);
  wRock = max(wRock, steep * (1.0 - wSnow));
  wGrass *= 1.0 - wRock;
  // open ground with any colour is grass (mown meadows photograph pale); only grey, bright,
  // unsaturated ground stays gravel
  // gravel needs a truly grey photo pixel, or a built-up area (car parks, yards)
  // (very bright photo pixels below the snow line are old snow patches in the orthophoto: grass)
  float greyish = max(
    smoothstep(0.07, 0.025, sat) * smoothstep(0.42, 0.6, L) * (1.0 - smoothstep(0.62, 0.74, L)),
    smoothstep(0.3, 0.8, land.b) * smoothstep(0.12, 0.05, sat));
  wGrass = max(wGrass, (1.0 - wRock) * (1.0 - wSnow) * (1.0 - greyish) * 0.92 * (1.0 - canopy * 0.85));
  float wGravel = (1.0 - wGrass) * (1.0 - wRock) * (1.0 - wSnow);

  // photo grading
  float tl = dot(img, vec3(0.2126, 0.7152, 0.0722));
  vec3 tc = pow(max(mix(vec3(tl), img, 1.28), vec3(0.0)), vec3(1.06)) * 1.32;
  vec3 area = texture(map, vMapUv, 5.0).rgb;
  float la = dot(area, vec3(0.2126, 0.7152, 0.0722));
  area = pow(max(mix(vec3(la), area, 1.3), vec3(0.0)), vec3(1.06)) * 1.32;
  vec3 wide = texture(map, vMapUv, 7.5).rgb;
  float lw = dot(wide, vec3(0.2126, 0.7152, 0.0722));
  wide = pow(max(mix(vec3(lw), wide, 1.2), vec3(0.0)), vec3(1.06)) * 1.32;

  // detail textures (mean ~1): two scales against tiling
  float gd = texture2D(uGrassTex, p * 0.6).r * 2.0 * (0.55 + 0.9 * texture2D(uGrassTex, p * 0.063 + 0.31).r);
  gd = 1.0 + (gd - 1.0) * mix(0.5, 0.3, smoothstep(30.0, 160.0, camD));
  vec3 bw = pow(abs(wn), vec3(4.0));
  bw /= (bw.x + bw.y + bw.z);
  float rd = (texture2D(uRockTex, q.zy * vec2(0.13, 0.21)).r * bw.x + texture2D(uRockTex, q.xz * 0.13).r * bw.y + texture2D(uRockTex, q.xy * vec2(0.13, 0.21)).r * bw.z) * 2.0;
  float rd2 = (texture2D(uRockTex, q.zy * 0.037 + 0.5).r * bw.x + texture2D(uRockTex, q.xz * 0.037 + 0.5).r * bw.y + texture2D(uRockTex, q.xy * 0.037 + 0.5).r * bw.z) * 2.0;
  rd = mix(rd, rd * rd2, 0.6);
  rd *= 0.7 + 0.6 * (texture2D(uRockTex, q.xz * 0.021 + q.y * 0.01).r);
  float gv = texture2D(uGravelTex, p * 0.9).r * 2.0;
  float d = 1.0;
  d = mix(d, gd, wGrass);
  d = mix(d, rd, wRock);
  d = mix(d, 1.0 + (gv - 1.0) * 0.55, wGravel * 0.7);
  d = mix(d, 0.97 + 0.06 * gv, wSnow);
  tDetail = mix(1.0, d, near);
  tBump = (d - 1.0) * near * mix(0.6, 2.2, wRock);

  // close to the camera the photo blurs and smears at grazing angles: keep its colour, not its texels
  float soft = (1.0 - smoothstep(30.0, 180.0, camD));
  vec3 base = mix(tc, area, soft * 0.9);
  // meadows: pull bleached summer-photo grass back to a living green-gold
  float bl = dot(base, vec3(0.3, 0.55, 0.15));
  float grassy = max(meadow, wGrass * 0.6) * (1.0 - steep) * (1.0 - canopy);
  // two tones: living green and dry straw patches, like mown autumn meadows
  float straw = smoothstep(0.55, 0.8, tNoise(p * 0.035) * 0.7 + tNoise(p * 0.21) * 0.3);
  // mown grass has a fairly constant albedo: clamp bright (snowy or bleached) photo texels
  float blc = min(bl, 0.3 + 0.06 * straw);
  vec3 meadowCol = mix(blc * vec3(0.8, 1.06, 0.5), blc * vec3(1.05, 1.0, 0.62), straw * 0.6) * 1.05;
  float bright = smoothstep(0.5, 0.75, L) * (1.0 - smoothstep(1500.0, 1950.0, vAtmoWorld.y));
  base = mix(base, meadowCol, clamp(grassy * 0.6 + bright * 0.9 * (1.0 - canopy), 0.0, 1.0));
  // under the canopy: shaded forest floor, leaf litter close up
  vec3 litter = vec3(0.3, 0.22, 0.14) * (0.7 + 0.6 * tNoise(p * 0.7));
  base = mix(base, base * vec3(0.66, 0.64, 0.6), canopy * 0.75);
  base = mix(base, litter * (0.6 + 0.4 * dot(base, vec3(0.33))), canopy * near * 0.55);
  // steep faces: the photo smears vertically, tint rock from the wide average instead
  vec3 rockTint = mix(wide, vec3(dot(wide, vec3(0.33))) * vec3(1.03, 1.0, 0.95), 0.5);
  base = mix(base, rockTint, steep);
  tc = base * tDetail;

  // water: OSM mask, or sea level
  vec2 muv = (p - uMaskOrigin) / uMaskSize;
  float mask = (muv.x > 0.0 && muv.y > 0.0 && muv.x < 1.0 && muv.y < 1.0) ? texture2D(uWaterMask, muv).r : 0.0;
  float sea = (1.0 - smoothstep(0.4, 1.6, vAtmoWorld.y)) * (1.0 - smoothstep(0.01, 0.04, slope));
  tWater = clamp(max(smoothstep(0.35, 0.75, mask), sea), 0.0, 1.0);
  diffuseColor.rgb *= tc;
}
#endif`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
{
  vec3 wn = normalize(vTWNormal);
  vec3 dpx = dFdx(vAtmoWorld);
  vec3 dpy = dFdy(vAtmoWorld);
  float dhx = dFdx(tBump);
  float dhy = dFdy(tBump);
  vec3 r1 = cross(dpy, wn);
  vec3 r2 = cross(wn, dpx);
  float det = dot(dpx, r1);
  if (abs(det) > 1e-10) {
    vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
    vec3 b = abs(det) * wn - grad * 0.35;
    if (dot(b, b) > 1e-20) wn = normalize(b);
  }
  normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
}`,
      )
      .replace(
        '#include <fog_fragment>',
        `if (tWater > 0.001) {
  vec2 wp = vAtmoWorld.xz;
  float t = uTime;
  float n1 = tNoise(wp * 0.35 + vec2(t * 0.11, t * 0.07));
  float n2 = tNoise(wp * 1.3 - vec2(t * 0.23, -t * 0.17));
  float n3 = tNoise(wp * 4.1 + vec2(t * 0.5, t * 0.31));
  vec3 wnrm = normalize(vec3((n1 - 0.5) * 0.12 + (n2 - 0.5) * 0.08 + (n3 - 0.5) * 0.05, 1.0, (n2 - 0.5) * 0.12 + (n3 - 0.5) * 0.06));
  vec3 v = normalize(vAtmoWorld - cameraPosition);
  vec3 r = reflect(v, wnrm);
  r.y = abs(r.y);
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(-v, wnrm), 0.0), 5.0);
  vec3 deep = vec3(0.012, 0.035, 0.045) + gl_FragColor.rgb * 0.18;
  vec3 refl = atmoSky(r);
  float glint = pow(max(dot(r, uSunDir), 0.0), 380.0) * 18.0 + pow(max(dot(r, uSunDir), 0.0), 40.0) * 0.4;
  vec3 water = mix(deep, refl, fres) + uSunColor * glint;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, water, tWater);
}
#include <fog_fragment>`,
      );
  };
  return patchMaterial(mat, { key: 'terrain3' });
}

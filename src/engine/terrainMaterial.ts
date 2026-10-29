// Terrain shading: orthophoto as base colour, plus close-range material synthesis.
// The photo is classified per pixel (grass / rock / snow) to add high-frequency
// detail and surface relief near the camera; water (OSM mask or sea level) gets
// sky reflections, waves and sun glints.

import * as THREE from 'three';
import { patchMaterial, tunnelUniforms } from './atmosphere.ts';
import { groundTextures } from './groundTextures.ts';
import type { Biome } from './biome.ts';
import { ALFALFA, BEET, DISCED, FLAX, GRASS, HEMP, MAIZE, POTATO, REGROWTH, STUBBLE, SUNFLOWER, VINES } from '../geo/fields.ts';

const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
blank.needsUpdate = true;

export const terrainUniforms = {
  uWaterMask: { value: blank as THREE.Texture },
  uCanopy: { value: blank as THREE.Texture },
  uGrassTex: { value: blank as THREE.Texture },
  uRockTex: { value: blank as THREE.Texture },
  uGravelTex: { value: blank as THREE.Texture },
  uMaskOrigin: { value: new THREE.Vector2(0, 0) },
  /** Biome: push OSM meadows to mown green (Alps), read grey ground as limestone (karst), photo sea. */
  uMeadowPush: { value: 1 },
  uBareAbove: { value: 1e5 },
  uKarst: { value: 0 },
  uPhotoSea: { value: 0 },
  /** Mediterranean rock faces (Poly Haven marble_cliff_02, CC0), tri-planar near the camera. */
  uCliffTex: { value: blank as THREE.Texture },
  uCliffNor: { value: blank as THREE.Texture },
  /** Slope range where the cliff scan takes over, and the share of warm ochre in it (biome.cliffSlope, rockOchre). */
  uCliffSlope: { value: new THREE.Vector2(0.42, 0.62) },
  uRockOchre: { value: 1 },
  uMaskSize: { value: new THREE.Vector2(1, 1) },
  /** Orthophoto gain, saturation and gamma (biome.photoGrade). */
  uPhotoGrade: { value: new THREE.Vector3(1.32, 1.28, 1.06) },
  /** Late-summer fields from a spring photo (biome.fieldSeason), over the land mask: each known field's colour at the end
   * of August (sRGB) and A where one is known (Engine.buildWaterMask). */
  uFieldSeason: { value: 0 },
  uFields: { value: blank as THREE.Texture },
  /** Grass that replaces the photo's grey road edge on verges (Alpine green; Champagne dry in August). */
  uVergeCol: { value: new THREE.Vector3(0.13, 0.18, 0.08) },
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

let cliffTex: { c: THREE.Texture; n: THREE.Texture } | null = null;

/** Known fields' late-summer colours over the same area as the land mask (null: none). */
export function setFieldMask(tex: THREE.Texture | null) {
  const old = terrainUniforms.uFields.value;
  terrainUniforms.uFields.value = tex ?? blank;
  if (old !== blank && old !== tex) old.dispose();
}

/** A field's ground at the end of August, linear albedo, for its state (geo/fields.ts) and seed. */
export function fieldColour(state: number, seed: number): [number, number, number] {
  const t = (seed * 7.31) % 1;
  const mix = (a: number[], b: number[]): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  switch (state) {
    // pale beige straw to tan, warm: the Panoramax frames of 26 August show stubble and worked ground around sRGB
    // 148, 133, 115, 1.4 times the asphalt's brightness
    case STUBBLE: return mix([0.38, 0.32, 0.23], [0.33, 0.27, 0.18]);
    // disced chalky soil, beige-grey with the straw worked in: pale, never white or grey
    case DISCED: return mix([0.34, 0.29, 0.22], [0.28, 0.24, 0.18]);
    // stubble greening with volunteer cereals or rape and the first cover crops
    case REGROWTH: return mix([0.27, 0.27, 0.16], [0.2, 0.24, 0.11]);
    case BEET: return mix([0.07, 0.13, 0.045], [0.09, 0.155, 0.055]);
    case MAIZE: return mix([0.1, 0.17, 0.05], [0.13, 0.19, 0.06]);
    // haulms dying back, yellow-brown, some still green
    case POTATO: return mix([0.24, 0.21, 0.1], [0.16, 0.19, 0.07]);
    // alfalfa between cuts; a quarter just cut, pale straw-green
    case ALFALFA: return t < 0.25 ? [0.28, 0.29, 0.16] : mix([0.1, 0.16, 0.05], [0.13, 0.19, 0.065]);
    // grassland dried by the summer
    case GRASS: return mix([0.19, 0.21, 0.1], [0.26, 0.25, 0.13]);
    // the grassed rows between the vines (near the road the vines themselves are 3D rows)
    case VINES: return [0.16, 0.2, 0.09];
    case HEMP: return mix([0.08, 0.14, 0.05], [0.1, 0.16, 0.06]);
    case SUNFLOWER: return [0.2, 0.18, 0.08];
    // flax pulled in July, retting grey-brown in swaths
    case FLAX: return [0.3, 0.28, 0.21];
    // fallow and the rest: weedy, half green, half straw
    default: return mix([0.23, 0.24, 0.11], [0.28, 0.26, 0.15]);
  }
}

export function setTerrainBiome(b: Biome) {
  terrainUniforms.uPhotoGrade.value.set(...(b.photoGrade ?? [1.32, 1.28, 1.06]));
  terrainUniforms.uFieldSeason.value = b.fieldSeason ?? 0;
  terrainUniforms.uVergeCol.value.set(...((b.fieldSeason ? [0.2, 0.2, 0.09] : [0.13, 0.18, 0.08]) as [number, number, number]));
  terrainUniforms.uMeadowPush.value = b.meadowPush;
  terrainUniforms.uKarst.value = b.karst;
  terrainUniforms.uPhotoSea.value = b.id === 'mediterranean' ? 1 : 0;
  terrainUniforms.uCliffSlope.value.set(...(b.cliffSlope ?? [0.42, 0.62]));
  terrainUniforms.uRockOchre.value = b.rockOchre ?? 1;
  terrainUniforms.uBareAbove.value = b.bareAbove ?? 1e5;
  if (b.karst > 0 && !cliffTex) {
    const load = (f: string, srgb: boolean) => {
      const t = new THREE.TextureLoader().load(f);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    cliffTex = { c: load('/textures/med/cliff.jpg', true), n: load('/textures/med/cliff_nor.jpg', false) };
  }
  terrainUniforms.uCliffTex.value = b.karst > 0 && cliffTex ? cliffTex.c : blank;
  terrainUniforms.uCliffNor.value = b.karst > 0 && cliffTex ? cliffTex.n : blank;
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
  // only tunnels, underpasses and a photographed sea cut holes in the ground. Elsewhere the shader has no
  // discard, so the GPU can still drop the ground hidden behind a hill (and what lies behind it) unshaded
  if (tunnelUniforms.uTunnelCount.value > 0 || terrainUniforms.uPhotoSea.value > 0.5) mat.defines = { TERRAIN_CUTS: '' };
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
uniform float uMeadowPush;
uniform float uBareAbove;
uniform float uKarst;
uniform vec2 uCliffSlope;
uniform float uRockOchre;
uniform float uPhotoSea;
uniform sampler2D uCliffTex;
uniform sampler2D uCliffNor;
uniform vec2 uMaskSize;
uniform vec3 uPhotoGrade;
uniform float uFieldSeason;
uniform sampler2D uFields;
uniform vec3 uVergeCol;
varying vec3 vTWNormal;
${NOISE}`,
      )
      .replace(
        '#include <map_fragment>',
        `#ifdef TERRAIN_CUTS
// tunnel portals: no terrain inside the bore
if (atmoTunnel(vAtmoWorld).x > 0.5) discard;
// coastal routes: the open-sea plane takes over far out (no tile edges or skirts on the horizon)
if (uPhotoSea > 0.5 && vAtmoWorld.y < 0.6 && length(vAtmoWorld.xz - cameraPosition.xz) > 8000.0) discard;
#endif
vec3 tPert = vec3(0.0);
float tWater = 0.0;
float tDetail = 1.0;
float tBump = 0.0;
#ifdef USE_MAP
{
  // PNOA orthophotos are cool and bluish compared with the ground seen from the road
  vec3 photoFix = mix(vec3(1.0), vec3(1.0, 0.97, 0.9), uKarst);
  vec3 img = texture2D(map, vMapUv).rgb * photoFix;
  vec3 imgB = texture(map, vMapUv, 2.5).rgb * photoFix;
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
  vec3 canTex = inMask ? texture2D(uCanopy, lmuv).rgb : vec3(0.0);
  float canopy = smoothstep(0.15, 0.85, canTex.r);
  // (cut faces and banks are rock, not verge)
  float verge = smoothstep(0.2, 0.7, canTex.g) * (1.0 - smoothstep(0.18, 0.36, 1.0 - clamp(normalize(vTWNormal).y, 0.0, 1.0)));
  // OSM scree and bare rock: pale stones, never pushed to meadow green
  float scree = smoothstep(0.3, 0.8, canTex.b) * (1.0 - verge);
  // a route's bare top (scene biomeTweaks.bareAbove): pale ground up there is stone, not meadow
  scree = max(scree, smoothstep(uBareAbove - 60.0, uBareAbove + 80.0, vAtmoWorld.y) * smoothstep(0.34, 0.5, L) * (1.0 - canopy) * (1.0 - verge));
  float meadow = smoothstep(0.3, 0.8, land.g) * (1.0 - smoothstep(0.3, 0.8, land.b)) * (1.0 - canopy) * uMeadowPush * (1.0 - scree);
  float wGrass = max(smoothstep(0.0, 0.07, s.g - max(s.r, s.b) * 0.93), meadow * 0.9) * (1.0 - canopy * 0.85);
  // bright, unsaturated photo pixels are snow only up high: on the Prealps they are mown or dry grass.
  // Pale scree and dry grass on the high passes (Stelvio, Esri) reach L 0.75; snow sits above 0.85
  float wSnow = smoothstep(0.8, 0.9, L) * (1.0 - smoothstep(0.1, 0.22, sat)) * smoothstep(1500.0, 1950.0, vAtmoWorld.y);
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
  // karst: pale grey, unsaturated ground is bare limestone pavement, not gravel
  float limestone = uKarst * smoothstep(0.16, 0.07, sat) * smoothstep(0.3, 0.5, L) * (1.0 - canopy) * (1.0 - verge);
  wRock = max(wRock, max(limestone, scree * 0.85));
  wGrass *= 1.0 - max(limestone, scree);
  wGrass = max(wGrass, (1.0 - wRock) * (1.0 - wSnow) * (1.0 - greyish) * 0.92 * (1.0 - canopy * 0.85) * mix(1.0, 0.55, uKarst));
  float wGravel = (1.0 - wGrass) * (1.0 - wRock) * (1.0 - wSnow);

  // photo grading
  float tl = dot(img, vec3(0.2126, 0.7152, 0.0722));
  // PNOA is exposed brighter than basemap.at: grade the Mediterranean photo gently
  float gGain = mix(uPhotoGrade.x, 0.9, uKarst);
  float gSat = mix(uPhotoGrade.y, 1.18, uKarst);
  vec3 tc = pow(max(mix(vec3(tl), img, gSat), vec3(0.0)), vec3(mix(uPhotoGrade.z, 1.12, uKarst))) * gGain;
  vec3 area = texture(map, vMapUv, 5.0).rgb * photoFix;
  float la = dot(area, vec3(0.2126, 0.7152, 0.0722));
  area = pow(max(mix(vec3(la), area, gSat), vec3(0.0)), vec3(mix(uPhotoGrade.z, 1.12, uKarst))) * gGain;

  // detail textures (mean ~1): two scales against tiling
  float gd = texture2D(uGrassTex, p * 0.6).r * 2.0 * (0.55 + 0.9 * texture2D(uGrassTex, p * 0.063 + 0.31).r);
  gd = 1.0 + (gd - 1.0) * mix(0.5, 0.3, smoothstep(30.0, 160.0, camD));
  // the tri-planar rock is 7 of the shader's texture reads: only where there is rock near the camera (its
  // weight has faded to nothing where the branch flips, so the skipped side looks the same)
  float rd = 1.0;
  if (wRock * near > 0.002) {
    vec3 bw = pow(abs(wn), vec3(4.0));
    bw /= (bw.x + bw.y + bw.z);
    rd = (texture2D(uRockTex, q.zy * vec2(0.13, 0.21)).r * bw.x + texture2D(uRockTex, q.xz * 0.13).r * bw.y + texture2D(uRockTex, q.xy * vec2(0.13, 0.21)).r * bw.z) * 2.0;
    float rd2 = (texture2D(uRockTex, q.zy * 0.037 + 0.5).r * bw.x + texture2D(uRockTex, q.xz * 0.037 + 0.5).r * bw.y + texture2D(uRockTex, q.xy * 0.037 + 0.5).r * bw.z) * 2.0;
    rd = mix(rd, rd * rd2, 0.6);
    rd *= 0.7 + 0.6 * (texture2D(uRockTex, q.xz * 0.021 + q.y * 0.01).r);
    // karst pavement is smooth, rounded limestone: much less crackle than Alpine rock
    rd = 1.0 + (rd - 1.0) * mix(1.0, 0.35, uKarst);
  }
  float gv = texture2D(uGravelTex, p * 0.9).r * 2.0;
  float d = 1.0;
  d = mix(d, gd, wGrass);
  d = mix(d, rd, wRock);
  d = mix(d, 1.0 + (gv - 1.0) * 0.55, wGravel * 0.7);
  d = mix(d, 0.97 + 0.06 * gv, wSnow);
  tDetail = mix(1.0, d, near);
  tBump = (d - 1.0) * near * mix(0.6, 2.2, wRock) * mix(1.0, 0.45, uKarst);

  // close to the camera the photo blurs and smears at grazing angles: keep its colour, not its texels
  float soft = (1.0 - smoothstep(30.0, 180.0, camD));
  vec3 base = mix(tc, area, soft * 0.9);
  // Champagne at the end of August: the orthophoto shows the plain in spring. Fields known from the RPG parcels (and
  // OSM meadows and vineyards) carry their late-summer colour in uFields (A: known). Elsewhere each parcel's
  // photographed tone picks its state: green then (winter wheat, barley, rape) is harvested to stubble by now, bare
  // chalk then (the spring-sown beet, maize, potatoes) stands green
  if (uFieldSeason > 0.5) {
    vec4 fk = inMask ? texture2D(uFields, lmuv) : vec4(0.0);
    // ground metres per pixel, for the grain below (derivatives belong outside the per-pixel branches)
    vec2 fw = fwidth(p);
    float foot = max(fw.x, fw.y);
    float open = (1.0 - smoothstep(0.3, 0.8, land.b)) * (1.0 - smoothstep(0.3, 0.8, land.r)) * (1.0 - canopy) * (1.0 - verge) * (1.0 - steep);
    // the parcel's tone: the tile photo at 16 px (about 6 m at zoom 18, Terrain.photoAt reads the same), so a
    // sparse crop with chalk showing through decides as one parcel instead of a camouflage of patches
    vec3 pcl = textureLod(map, vMapUv, 5.0).rgb;
    vec3 pc = sqrt(max(pcl, vec3(0.0)));
    float pMax = max(pc.r, max(pc.g, pc.b));
    float pL = (pc.r + pc.g + pc.b) / 3.0;
    // green over red and blue (a neutral grey reads 0)
    float pV = pc.g - max(pc.r, pc.b);
    float pS = (pMax - min(pc.r, min(pc.g, pc.b))) / max(pMax, 1e-3);
    // hedges and copses OSM doesn't map are dark and rough in the photo: they stay as photographed
    float rough = abs(dot(img - imgB, vec3(0.333)));
    float treeish = smoothstep(0.03, 0.07, rough) * smoothstep(0.36, 0.26, L);
    // keep the photo's tram lines and soil patches inside the parcel, faintly: stronger, they read as a noise texture
    float det = clamp(dot(img, vec3(0.3, 0.55, 0.15)) / max(dot(pcl, vec3(0.3, 0.55, 0.15)), 1e-3), 0.8, 1.2);
    // straw grain close up, tone patches where the swaths lay. Where a pixel spans more ground than the grain it
    // only shimmered as the road went by: there it is its mean
    float grain = 0.97;
    if (foot < 0.35) grain = mix(0.94 + 0.12 * tNoise(p * 0.9) * tNoise(p * 2.7 + 7.0), grain, smoothstep(0.12, 0.35, foot));
    grain *= 0.94 + 0.12 * tNoise(p * 0.11 + 3.0);
    float known = smoothstep(0.2, 0.6, fk.a) * open * (1.0 - treeish);
    if (known > 0.0) {
      // (un-premultiplied: unknown texels are black with no alpha)
      vec3 kc = fk.rgb / max(fk.a, 1e-3);
      // stubble and disced chalk carry the grain; the green crops' own texture is their 3D leaves
      float strawy = smoothstep(0.17, 0.3, dot(kc, vec3(0.3, 0.55, 0.15)));
      kc *= mix(1.0, grain, strawy) * mix(1.0, det, 0.3);
      base = mix(base, kc, known);
    }
    // a crop in spring is green, or dark where it is dense (winter wheat reads near black-green); bare soil is
    // chalk-white to light brown, never grey asphalt (sampled on the Mont de Berru loop at 3 m per pixel)
    float green = max(smoothstep(0.005, 0.03, pV), smoothstep(0.32, 0.24, pL) * 0.8) * smoothstep(0.06, 0.12, pS);
    // (bright chalk with no colour at all is bare too: wide, it read as a white sheet)
    float chalk = smoothstep(0.42, 0.5, pL) * smoothstep(0.08, 0.03, pS);
    float bare = (1.0 - green) * smoothstep(0.26, 0.38, pL) * (1.0 - smoothstep(0.35, 0.45, pS)) * max(smoothstep(0.04, 0.08, pS), chalk);
    float fieldW = open * (1.0 - known) * (1.0 - treeish) * clamp(green + bare, 0.0, 1.0);
    if (fieldW > 0.0) {
      // smooth inside a parcel, different from its neighbours
      float pick = fract(pL * 5.3 + pV * 23.0 + pS * 3.1);
      // harvested: pale beige to tan stubble, some greening again, some already disced to chalky soil (the
      // Panoramax frames of 26 August show stubble around (150, 135, 118)); the colours are fieldColour's
      vec3 stubble = mix(vec3(0.38, 0.32, 0.23), vec3(0.33, 0.27, 0.18), smoothstep(0.2, 0.7, pick));
      stubble = mix(stubble, vec3(0.24, 0.26, 0.14), smoothstep(0.78, 0.84, pick) * (1.0 - smoothstep(0.88, 0.92, pick)));
      stubble = mix(stubble, vec3(0.34, 0.29, 0.22), smoothstep(0.9, 0.95, pick));
      stubble *= grain;
      // spring-sown: spring barley and peas are harvested to stubble by now too; beet dark green, maize mid green,
      // potatoes yellowing, a few fields already disced
      vec3 crop = mix(stubble, vec3(0.08, 0.14, 0.05), smoothstep(0.34, 0.38, pick));
      crop = mix(crop, vec3(0.11, 0.18, 0.055), smoothstep(0.58, 0.62, pick));
      crop = mix(crop, vec3(0.24, 0.21, 0.1), smoothstep(0.7, 0.74, pick));
      crop = mix(crop, vec3(0.34, 0.29, 0.22), max(smoothstep(0.84, 0.88, pick), chalk));
      float wobble = 0.92 + 0.16 * tNoise(p * 0.02);
      vec3 field = mix(stubble, crop, bare / max(bare + green, 1e-3)) * mix(1.0, det, 0.3) * wobble;
      base = mix(base, field, fieldW);
    }
    // verges: the photo's spring-green grass is olive and straw by now (its grey asphalt pixels become
    // verge grass further down)
    float lushVerge = smoothstep(0.015, 0.05, img.g - max(img.r, img.b) * 0.95);
    if (verge * lushVerge > 0.0) {
      vec3 august = mix(vec3(0.22, 0.24, 0.1), vec3(0.34, 0.32, 0.17), tNoise(p * 0.3));
      base = mix(base, august * mix(1.0, det, 0.5), verge * (1.0 - steep) * lushVerge * 0.7);
    }
    // village squares, yards and pavements: the photo's bright concrete and gravel, with its JPEG colour noise, read
    // near white and blue-violet beside the road (Berru km 23.8, Witry km 0.6). In built-up land any pale,
    // unsaturated ground is paved, elsewhere cool bright ground off the fields: worn concrete grey. The photo's
    // building shadows (blue-black, under our own shadows) become a darker ground, not black
    float imgL = dot(img, vec3(0.3, 0.55, 0.15));
    float builtUp = smoothstep(0.3, 0.8, land.b);
    float ground = (1.0 - canopy) * (1.0 - steep) * (1.0 - verge);
    float pale = smoothstep(0.22, 0.4, imgL) * smoothstep(0.3, 0.15, sat);
    // concrete is neutral to cool and the JPEG's noise magenta; chalk (the white field tracks) is warm and stays
    float coolBright = smoothstep(0.3, 0.5, imgL) * smoothstep(0.04, 0.01, (img.r + img.g) * 0.5 - img.b);
    float paved = max(builtUp * pale, (1.0 - max(known, fieldW)) * coolBright) * ground;
    float pvL = min(dot(base, vec3(0.3, 0.55, 0.15)), 0.21);
    base = mix(base, vec3(pvL) * vec3(1.0, 0.96, 0.9) * mix(1.0, det, 0.3), paved);
    float photoShade = builtUp * smoothstep(0.1, 0.04, imgL) * ground;
    base = mix(base, vec3(max(dot(base, vec3(0.3, 0.55, 0.15)), 0.12)) * vec3(1.0, 0.97, 0.9), photoShade * 0.85);
  }
  // meadows: pull bleached summer-photo grass back to a living green-gold
  float grassy = max(meadow, wGrass * 0.6 * uMeadowPush) * (1.0 - steep) * (1.0 - canopy);
  float bright = smoothstep(0.5, 0.75, L) * (1.0 - smoothstep(1500.0, 1950.0, vAtmoWorld.y)) * uMeadowPush * (1.0 - scree);
  float push = clamp(grassy * 0.6 + bright * 0.9 * (1.0 - canopy), 0.0, 1.0);
  if (push > 0.0) {
    float bl = dot(base, vec3(0.3, 0.55, 0.15));
    // two tones: living green and dry straw patches, like mown autumn meadows
    float straw = smoothstep(0.55, 0.8, tNoise(p * 0.035) * 0.7 + tNoise(p * 0.21) * 0.3);
    // mown grass has a fairly constant albedo: clamp bright (snowy or bleached) photo texels
    float blc = min(bl, 0.3 + 0.06 * straw);
    vec3 meadowCol = mix(blc * vec3(0.8, 1.06, 0.5), blc * vec3(1.05, 1.0, 0.62), straw * 0.6) * 1.05;
    base = mix(base, meadowCol, push);
  }
  // under the canopy: shaded forest floor, leaf litter close up
  if (canopy > 0.0) {
    vec3 litter = vec3(0.3, 0.22, 0.14) * (0.7 + 0.6 * tNoise(p * 0.7));
    base = mix(base, base * vec3(0.66, 0.64, 0.6), canopy * 0.75 * (1.0 - uKarst));
    base = mix(base, litter * (0.6 + 0.4 * dot(base, vec3(0.33))), canopy * near * 0.55 * (1.0 - uKarst));
  }
  // steep faces: the photo smears vertically, tint rock from the wide average instead
  if (steep > 0.0) {
    vec3 wide = texture(map, vMapUv, 7.5).rgb * photoFix;
    float lw = dot(wide, vec3(0.2126, 0.7152, 0.0722));
    wide = pow(max(mix(vec3(lw), wide, uPhotoGrade.y * 0.94), vec3(0.0)), vec3(uPhotoGrade.z)) * uPhotoGrade.x;
    vec3 rockTint = mix(wide, vec3(dot(wide, vec3(0.33))) * vec3(1.03, 1.0, 0.95), 0.5);
    // karst coasts: the blurred photo mixes in the sea; cliffs and cuts are grey limestone
    if (uKarst > 0.0) rockTint = mix(rockTint, vec3(0.5, 0.48, 0.44) * (0.85 + 0.3 * tNoise(q.xz * 0.08 + q.y * 0.05)), uKarst);
    base = mix(base, rockTint, steep);
  }
  // limestone weathers warm grey with ochre stains (fresh cuts are orange-ochre)
  float ochre = 0.0;
  if (uKarst > 0.0) {
    ochre = smoothstep(0.45, 0.8, tNoise(q.xz * 0.05 + q.y * 0.03)) * uRockOchre;
    vec3 limeTint = mix(vec3(1.0, 0.95, 0.86), vec3(1.08, 0.88, 0.66), ochre * steep);
    base *= mix(vec3(1.0), limeTint, uKarst * max(limestone, steep));
    // bare limestone reads beige-grey, never snow-white
    float bL = dot(base, vec3(0.3, 0.55, 0.15));
    base = mix(base, base * min(1.0, 0.62 / max(bL, 1e-3)) * vec3(1.0, 0.97, 0.88), uKarst * limestone);
  }
  // the photo was lit by the flight's sun (summer, around midday, from the south-south-east): slopes
  // facing away from it photographed dark and we shade them again, so north-facing valley sides
  // went near-black. Divide that light back out (flat ground unchanged, at most ~2x)
  {
    vec3 Lp = vec3(0.166, 0.766, 0.621); // azimuth ~165°, elevation ~50°
    float flatLit = 0.35 + 0.65 * Lp.y;
    float photoLit = 0.35 + 0.65 * max(dot(wn, Lp), 0.0);
    base *= min(flatLit / photoLit, 1.9);
  }
  // de-light: aerial photos carry the cast shadows of the flight's sun, and we light the ground
  // again; lift near-black photo shadows towards a floor, keeping their hue
  {
    float dl = dot(base, vec3(0.3, 0.55, 0.15));
    float lifted = sqrt(dl * dl + 0.085 * 0.085);
    // photo shadows are blue (skylight only): lift them towards a vegetation hue, not their own
    vec3 vegHue = mix(vec3(0.82, 1.0, 0.68), vec3(1.0, 0.98, 0.8), uKarst);
    float darkW = smoothstep(0.12, 0.02, dl);
    base = mix(base * (lifted / max(dl, 1e-3)), vegHue * lifted, darkW * 0.8);
  }
  // rock faces and cuts near the road: photographed fractured limestone, ochre to grey
  float cliffNear = 1.0 - smoothstep(35.0, 110.0, camD);
  // rock only on steep faces; ~50° banks above road cuts stay garrigue
  float cliffW = uKarst * smoothstep(uCliffSlope.x, uCliffSlope.y, slope) * (1.0 - smoothstep(900.0, 1600.0, camD)) * mix(0.75, 1.0, cliffNear);
  if (cliffW > 0.001) {
    vec3 cw = pow(abs(wn), vec3(5.0));
    cw /= cw.x + cw.y + cw.z;
    // near: rock detail at 5.5 m per repeat; far: the same scan as cliff banding at 40 m
    float sc = mix(1.0 / 40.0, 1.0 / 5.5, cliffNear);
    vec3 cc = texture2D(uCliffTex, q.zy * sc).rgb * cw.x + texture2D(uCliffTex, q.xz * sc).rgb * cw.y + texture2D(uCliffTex, q.xy * sc).rgb * cw.z;
    float cl = dot(cc, vec3(0.3, 0.55, 0.15));
    // mostly grey limestone; ochre where the noise says the face is freshly broken. Grey Tramuntana
    // rock (low uRockOchre) is paler and calmer than the scan: lift it and flatten its streaks
    float clg = mix(cl, 0.55, 0.35 * (1.0 - uRockOchre));
    vec3 greyRock = vec3(clg) * vec3(1.04, 1.0, 0.94) * 1.15 * mix(1.45, 1.0, uRockOchre);
    // fresh road cuts: warm ochre limestone in horizontal beds
    float bed = 0.86 + 0.14 * sin(q.y * 4.2 + tNoise(q.xz * 0.3) * 3.0) + 0.06 * sin(q.y * 11.0);
    vec3 rockC = mix(greyRock, cc * 1.12, 0.15 + (0.4 + 0.4 * ochre) * uRockOchre) * bed;
    base = mix(base, rockC, cliffW);
    tBump = mix(tBump, (cl - 0.45) * 4.0 * cliffNear, cliffW);
    tDetail = mix(tDetail, 1.0, cliffW); // the scan carries its own detail
  }
  if (uKarst > 0.0) {
    // under pines the Mediterranean floor is dry needle litter, not dark mould
    base = mix(base, mix(base * 0.7, vec3(0.36, 0.29, 0.22) * (0.8 + 0.4 * tNoise(p * 0.5)), 0.65), canopy * uKarst);
    // Mediterranean soil is mid grey-brown (terra rossa, needle litter); the orthophoto's
    // sun-bleached open ground photographs far brighter than it looks from the road
    float soilL = dot(base, vec3(0.3, 0.55, 0.15));
    float soilCap = mix(0.2, 0.38, max(limestone, steep));
    base = mix(base, base * min(1.0, soilCap / max(soilL, 1e-3)) * vec3(1.0, 0.95, 0.88), uKarst);
  }
  // the orthophoto's real road is often wider than or offset from our asphalt ribbon: grey,
  // unsaturated photo pixels in the road corridor become verge (grass in the Alps)
  float photoRoad = verge * smoothstep(0.14, 0.06, sat) * (1.0 - uKarst) * (1.0 - steep);
  if (photoRoad > 0.0) {
    vec3 vergeGrass = uVergeCol * (0.85 + 0.3 * tNoise(p * 0.8)) * (0.9 + 0.2 * gd);
    base = mix(base, vergeGrass, photoRoad * 0.9);
  }
  // road verges: grey-brown dirt with pale rubble (not the orthophoto's grey asphalt)
  if (uKarst * verge > 0.0) {
    float rubble = smoothstep(0.72, 0.8, tNoise(p * 2.3)) * 0.5 + smoothstep(0.78, 0.86, tNoise(p * 6.1 + 3.0)) * 0.5;
    vec3 dirt = mix(vec3(0.34, 0.29, 0.24), vec3(0.46, 0.44, 0.39), rubble * 0.6) * (0.82 + 0.3 * tNoise(p * 0.9));
    base = mix(base, dirt, uKarst * verge * (1.0 - steep * 0.6) * 0.85);
  }
  // scree is pale grey stone, never snow-white or smooth: cap its value, mottle it with stones and
  // the odd plant (Mont Ventoux's top)
  if (scree * (1.0 - uKarst) > 0.0) {
    float sL = dot(base, vec3(0.3, 0.55, 0.15));
    vec3 stone = base * min(1.0, 0.36 / max(sL, 1e-3)) * vec3(1.0, 0.98, 0.94);
    stone *= 0.78 + 0.3 * tNoise(p * 0.09) + 0.14 * (tNoise(p * 0.7) - 0.5);
    base = mix(base, stone, scree * (1.0 - uKarst));
  }
  tc = base * tDetail;

  // water: OSM mask (the land mask's red channel), or sea level
  float mask = land.r;
  // DEM sea level (national DEMs store the sea as 0); coastal flats a metre up are land
  float sea = (1.0 - smoothstep(mix(0.4, 0.08, uPhotoSea), mix(1.6, 0.35, uPhotoSea), vAtmoWorld.y)) * (1.0 - smoothstep(0.01, 0.04, slope)) * (1.0 - canopy) * (1.0 - verge);
  tWater = clamp(max(smoothstep(0.35, 0.75, mask), sea), 0.0, 1.0);
  diffuseColor.rgb *= tc;
}
#endif`,
      )
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
{
  // light bounced off the sunlit slopes around: in the mountains a face turned away from the sun
  // still sees the lit valley side opposite, so shade is never skylight alone (it was near-black)
  vec3 bn = normalize(vTWNormal);
  // skylight on grass in shade: the photo's own shadows are already blue, and the blue sky fill on
  // top turned shaded meadow teal (blue above green); shade should be a darker ground colour
  reflectedLight.indirectDiffuse *= vec3(1.04, 1.0, 0.8);
  float away = (1.0 - smoothstep(-0.15, 0.25, dot(bn, uSunDir))) * smoothstep(0.0, 0.2, uSunDir.y);
  reflectedLight.indirectDiffuse += diffuseColor.rgb * uSunColor * vec3(0.92, 1.0, 0.84) * (0.16 * away);
}`,
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
  float chop = mix(1.0, 2.2, uPhotoSea); // open sea: bigger waves, reflections sample higher sky
  float wd = length(vAtmoWorld - cameraPosition);
  float a1 = 1.0 - smoothstep(1500.0, 5000.0, wd);
  float a2 = 1.0 - smoothstep(250.0, 1000.0, wd);
  float a3 = 1.0 - smoothstep(60.0, 260.0, wd);
  vec3 wnrm = normalize(vec3(((n1 - 0.5) * 0.12 * a1 + (n2 - 0.5) * 0.08 * a2 + (n3 - 0.5) * 0.05 * a3) * chop, 1.0,
    ((n2 - 0.5) * 0.12 * a2 + (n3 - 0.5) * 0.06 * a3) * chop));
  vec3 v = normalize(vAtmoWorld - cameraPosition);
  vec3 r = reflect(v, wnrm);
  r.y = abs(r.y);
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(-v, wnrm), 0.0), 5.0);
  vec3 deep = vec3(0.012, 0.035, 0.045) + gl_FragColor.rgb * 0.18;
  // Mediterranean: the orthophoto already shows the water body (turquoise over sand, dark over
  // seagrass and depth); use it as the refracted colour under the reflections
  deep = mix(deep, gl_FragColor.rgb * vec3(0.62, 0.78, 0.88), uPhotoSea);
  vec3 refl = atmoSky(r) * mix(1.0, 0.82, uPhotoSea);
  // lakes lie between mountains: low reflected rays hit the far shore's forest and rock (hazed with
  // distance), only steeper ones the sky; a pale horizon sky alone read as a white sheet
  vec3 shore = mix(vec3(0.045, 0.075, 0.07), atmoSky(normalize(vec3(r.x, 0.03, r.z))), 0.3);
  refl = mix(mix(shore, refl, smoothstep(0.1, 0.5, r.y)), refl, uPhotoSea);
  float glint = pow(max(dot(r, uSunDir), 0.0), 380.0) * mix(18.0, 9.0, uPhotoSea) + pow(max(dot(r, uSunDir), 0.0), 40.0) * mix(0.4, 0.15, uPhotoSea);
  vec3 water = mix(deep, refl, fres) + uSunColor * glint;
  if (uPhotoSea > 0.5) {
    // far out: converge to the open-sea plane's shading (Ocean.ts) so the hand-over is invisible
    float o1 = tNoise(wp * 0.05 + vec2(t * 0.03, t * 0.02));
    float o2 = tNoise(wp * 0.21 - vec2(t * 0.07, -t * 0.05));
    float f2 = 1.0 - smoothstep(900.0, 3500.0, wd);
    float f1 = 1.0 - smoothstep(2000.0, 6000.0, wd);
    vec3 on = normalize(vec3((o1 - 0.5) * 0.22 * f1 + (o2 - 0.5) * 0.16 * f2, 1.0, (o2 - 0.5) * 0.22 * f2));
    vec3 orf = reflect(v, on);
    orf.y = abs(orf.y);
    float ofr = 0.02 + 0.98 * pow(1.0 - max(dot(-v, on), 0.0), 5.0);
    vec3 odeep = vec3(0.012, 0.05, 0.11) * (0.6 + 0.6 * max(uSunDir.y, 0.1));
    float og = pow(max(dot(orf, uSunDir), 0.0), 420.0) * 16.0 + pow(max(dot(orf, uSunDir), 0.0), 45.0) * 0.35;
    vec3 ocean = mix(odeep, atmoSky(orf) * 0.82, ofr) + uSunColor * og;
    water = mix(water, ocean, smoothstep(700.0, 2600.0, wd));
  }
  gl_FragColor.rgb = mix(gl_FragColor.rgb, water, tWater);
}
#include <fog_fragment>`,
      );
  };
  return patchMaterial(mat, { key: 'terrain3' });
}

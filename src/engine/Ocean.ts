// Open sea beyond the streamed terrain: a large disc just below sea level that follows the
// camera, shaded like the terrain's water (sky reflection, fresnel, sun glints) with a deep
// navy body colour. Earth curvature (patchMaterial) bends it down to a true sea horizon.

import * as THREE from 'three';
import { patchMaterial } from './atmosphere.ts';

export class Ocean extends THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> {
  constructor() {
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    mat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
float oH(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float oN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(oH(i), oH(i + vec2(1, 0)), f.x), mix(oH(i + vec2(0, 1)), oH(i + vec2(1, 1)), f.x), f.y); }`,
        )
        .replace(
          '#include <fog_fragment>',
          `{
  vec2 wp = vAtmoWorld.xz;
  float t = uTime;
  float n1 = oN(wp * 0.05 + vec2(t * 0.03, t * 0.02));
  float n2 = oN(wp * 0.21 - vec2(t * 0.07, -t * 0.05));
  float n3 = oN(wp * 0.9 + vec2(t * 0.2, t * 0.13));
  // fade octaves out before they alias into streaks at grazing angles
  float dist = length(vAtmoWorld - cameraPosition);
  float f1 = 1.0 - smoothstep(2000.0, 6000.0, dist);
  float f2 = 1.0 - smoothstep(900.0, 3500.0, dist);
  float f3 = 1.0 - smoothstep(150.0, 700.0, dist);
  vec3 wn = normalize(vec3((n1 - 0.5) * 0.22 * f1 + (n2 - 0.5) * 0.16 * f2 + (n3 - 0.5) * 0.08 * f3, 1.0,
    (n2 - 0.5) * 0.22 * f2 + (n3 - 0.5) * 0.1 * f3));
  vec3 v = normalize(vAtmoWorld - cameraPosition);
  vec3 r = reflect(v, wn);
  r.y = abs(r.y);
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(-v, wn), 0.0), 5.0);
  vec3 deep = vec3(0.012, 0.05, 0.11) * (0.6 + 0.6 * max(uSunDir.y, 0.1));
  vec3 refl = atmoSky(r) * 0.82;
  float glint = pow(max(dot(r, uSunDir), 0.0), 420.0) * 16.0 + pow(max(dot(r, uSunDir), 0.0), 45.0) * 0.35;
  gl_FragColor.rgb = mix(deep, refl, fres) + uSunColor * glint;
}
#include <fog_fragment>`,
        );
    };
    super(polarDisc(150000, 72, 128), patchMaterial(mat, { key: 'ocean' }));
    this.frustumCulled = false;
    this.renderOrder = -5;
    // well below the terrain's sea level so the two never z-fight where the terrain hands over
    this.position.y = -2.0;
  }

  follow(camera: THREE.Camera) {
    this.position.x = camera.position.x;
    this.position.z = camera.position.z;
  }
}

/** Disc with geometric rings so the earth-curvature bend is smooth everywhere (no long thin triangles). */
function polarDisc(radius: number, rings: number, segs: number): THREE.BufferGeometry {
  const pos: number[] = [0, 0, 0];
  const idx: number[] = [];
  const r0 = 4;
  for (let i = 0; i < rings; i++) {
    const r = r0 * Math.pow(radius / r0, i / (rings - 1));
    for (let j = 0; j < segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      pos.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    }
  }
  for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a = 1 + i * segs + j, b = 1 + i * segs + ((j + 1) % segs);
      const c = a + segs, d = b + segs;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

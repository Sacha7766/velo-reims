// Open sea beyond the streamed terrain: a large disc just below sea level that follows the
// camera, shaded like the terrain's water (sky reflection, fresnel, sun glints) with a deep
// navy body colour. Earth curvature (patchMaterial) bends it down to a true sea horizon.

import * as THREE from 'three';
import { patchMaterial } from './atmosphere.ts';

export class Ocean extends THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial> {
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
  vec3 wn = normalize(vec3((n1 - 0.5) * 0.22 + (n2 - 0.5) * 0.16 + (n3 - 0.5) * 0.08, 1.0, (n2 - 0.5) * 0.22 + (n3 - 0.5) * 0.1));
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
    super(new THREE.CircleGeometry(150000, 96).rotateX(-Math.PI / 2), patchMaterial(mat, { key: 'ocean' }));
    this.frustumCulled = false;
    this.renderOrder = -5;
    this.position.y = -0.35;
  }

  follow(camera: THREE.Camera) {
    this.position.x = camera.position.x;
    this.position.z = camera.position.z;
  }
}

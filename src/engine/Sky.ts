import * as THREE from 'three';
import { ATMO_GLSL, atmo } from './atmosphere.ts';

const vertex = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = wp.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const fragment = /* glsl */ `
uniform float uCloudCover;
varying vec3 vDir;
${ATMO_GLSL}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 6; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
  return v;
}

void main() {
  vec3 rd = normalize(vDir);
  vec3 col = atmoSky(rd);

  // sun disc (HDR → bloom)
  float sd = dot(rd, uSunDir);
  col += uSunColor * smoothstep(0.99996, 0.99999, sd) * 40.0;

  // cloud layer on a plane ~5 km above the camera
  if (rd.y > 0.0) {
    float t = 5000.0 / rd.y;
    vec2 p = (cameraPosition.xz + rd.xz * t) / 9000.0 + vec2(uTime * 0.004, uTime * 0.0015);
    float n = fbm(p);
    float cover = 1.0 - uCloudCover;
    float dens = smoothstep(cover - 0.05, cover + 0.35, n);
    float lightN = fbm(p + uSunDir.xz * 0.06);
    float lit = clamp(0.55 + (n - lightN) * 3.0, 0.0, 1.0);
    vec3 cloud = mix(uHorizon * 0.55 + uZenith * 0.25, uSunColor * 1.25 + 0.15, lit);
    cloud += uSunColor * pow(max(sd, 0.0), 12.0) * 0.6 * (1.0 - dens);
    float fade = smoothstep(0.0, 0.18, rd.y);
    col = mix(col, cloud, dens * fade * 0.92);
  }
  if (uFogTop > -1000.0) {
    float below = atmoFogTop(cameraPosition.xz) - cameraPosition.y;
    if (below > 0.0) {
      // inside the inversion: the sky is the grey fog, brightening towards the top
      float path = rd.y > 0.02 ? below / rd.y : 6000.0;
      float Tf = exp(-uFogLayer * path);
      col = col * Tf + atmoFogColour(below * 0.5) * (1.0 - Tf);
    } else if (rd.y < 0.0) {
      // looking down onto the fog sea beyond the terrain
      float t = (atmoFogTop(cameraPosition.xz) - cameraPosition.y) / rd.y;
      col = mix(col, atmoFogColour(0.0), smoothstep(0.0, 0.02, -rd.y) * step(0.0, t));
    }
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export class Sky extends THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
  constructor() {
    super(
      new THREE.SphereGeometry(1000, 48, 24),
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: atmo,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
      }),
    );
    this.frustumCulled = false;
    this.renderOrder = -10;
  }

  follow(camera: THREE.Camera) {
    this.position.copy(camera.position);
  }
}

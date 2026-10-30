// Procedural road bike + rider. Model space: +Z forward, +Y up, origin at ground contact
// midway between the wheels. Legs use two-bone IK onto the pedals, cadence-driven.

import * as THREE from 'three';
import { patchMaterial } from './atmosphere.ts';
import { loadModel } from './Landmarks.ts';
import type { Helmet, Outfit } from './outfits.ts';

const WHEEL_R = 0.34;
const BB = new THREE.Vector3(0, 0.27, -0.09);
const CRANK = 0.1725;
const THIGH = 0.45;
const SHIN = 0.47;
const HIP_Y = 1.0;
const HIP_Z = -0.29;
const UPPER_ARM = 0.29;
const FOREARM = 0.29;

export interface RiderStyle {
  kit: string; // jersey colour
  accent: string;
  bike: string;
  ghost?: boolean;
  /** A whole outfit (outfits.ts): jersey, bibs, socks and shoes; kit and accent are ignored then. */
  outfit?: Outfit;
  helmet?: Helmet;
}

const srgb = (c: string) => new THREE.Color(c).convertSRGBToLinear();

/**
 * Cloth: a soft sheen at grazing angles (the jersey's satin knit, the bibs' Lycra), which the plain matte colour
 * lacked. The rider is a few thousand pixels, so the physical material's extra cost is small.
 */
function cloth(color: string, rough: number, sheen: number, key: string): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: srgb(color), roughness: rough, sheen, sheenRoughness: 0.5 });
  m.sheenColor.copy(srgb(color)).lerp(new THREE.Color(1, 1, 1), 0.45);
  return patchMaterial(m, { key });
}

/**
 * Lettering drawn once into a canvas, white on clear, for the shaders below to stamp in a colour: the kit's
 * "PAS", the helmet's wordmark.
 */
function lettering(text: string, w: number, h: number, font: string, italic = false): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.font = `${italic ? 'italic ' : ''}900 ${Math.round(h * 0.86)}px ${font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#fff';
  const tw = g.measureText(text).width;
  // stretched or squeezed to fill the box, as the print is
  g.setTransform((w * 0.96) / tw, 0, 0, 1, w / 2, h / 2 + h * 0.04);
  g.fillText(text, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

const HEAVY = '"Arial Black", "Helvetica Neue", Arial, sans-serif';

/** The jersey's front: the PNS diamond on the right of the chest, the maker's name on the left, "PAS" across. */
function chestPrint(): THREE.CanvasTexture {
  const w = 512;
  const h = 320;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = g.strokeStyle = '#fff';
  // the diamond, outlined, its three letters inside (the viewer's left)
  const dx = 104;
  const dy = 62;
  const r = 40;
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(dx, dy - r);
  g.lineTo(dx + r, dy);
  g.lineTo(dx, dy + r);
  g.lineTo(dx - r, dy);
  g.closePath();
  g.stroke();
  g.font = `700 17px ${HEAVY}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('P', dx, dy - 19);
  g.fillText('N', dx - 17, dy + 2);
  g.fillText('S', dx + 17, dy + 2);
  g.fillText('·', dx, dy + 20);
  g.font = `700 21px ${HEAVY}`;
  g.textAlign = 'left';
  g.fillText('PAS NORMAL', 318, 50);
  g.fillText('STUDIOS', 318, 76);
  // "PAS" across the lower two thirds, stretched to the width as printed
  const ph = h * 0.62;
  g.font = `900 ${Math.round(ph * 0.86)}px ${HEAVY}`;
  g.textAlign = 'center';
  const tw = g.measureText('PAS').width;
  g.setTransform((w * 0.96) / tw, 0, 0, 1, w / 2, h - ph / 2 + ph * 0.04);
  g.fillText('PAS', 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

let pasTex: THREE.CanvasTexture | null = null;
let chestTex: THREE.CanvasTexture | null = null;
let wordmarkTex: THREE.CanvasTexture | null = null;
const pas = () => (pasTex ??= lettering('PAS', 512, 200, HEAVY));
const chest = () => (chestTex ??= chestPrint());
const wordmark = () => (wordmarkTex ??= lettering('S-WORKS', 512, 96, '"Helvetica Neue", Arial, sans-serif', true));

/**
 * Where a part carries lettering, in its own (unposed) space: GLSL that sets `uv` inside the unit square on the
 * lettering and leaves it outside elsewhere (`second` picks the second texture). `uSide` is +1 on the rider's left,
 * −1 on the right (the mirrored limb, whose lateral face is at −x); text reads the right way round from outside on
 * both.
 */
const DECALS = {
  // the chest print (logos and "PAS", across the zip) and "PAS" between the shoulder blades
  torso: `if (vKit.z > 0.0) { uv = vec2((vKit.x + 0.13) / 0.26, (vKit.y - 0.065) / 0.16); second = 1.0; }
  else uv = vec2((0.145 - vKit.x) / 0.29, (vKit.y - 0.075) / 0.112);`,
  // down the outside of the sleeve, letters' tops to the front
  arm: `if (vKit.x * uSide > 0.02) uv = vec2(uSide > 0.0 ? (0.102 - vKit.y) / 0.088 : (vKit.y - 0.014) / 0.088, 0.5 - vKit.z / 0.036);`,
  // along the outside of the thigh, letters' tops to the front, so it reads from the side as the thigh comes up
  leg: `if (vKit.x * uSide > 0.03) uv = vec2(uSide > 0.0 ? (0.25 - vKit.y) / 0.175 : (vKit.y - 0.075) / 0.175, 0.5 - vKit.z / 0.072);`,
  // along each side of the shell, under the flank slot, reading front to back on the left and on the right
  helmet: `if (abs(vKit.x) > 0.05 && vKit.y < 0.05) uv = vec2(vKit.x > 0.0 ? (0.0 - vKit.z) / 0.11 : (vKit.z + 0.11) / 0.11, (vKit.y + 0.006 + 0.06 * (vKit.z + 0.05)) / 0.022);`,
};

/**
 * A part's print in its own space: the jersey's triangle print (PAS Origami: facets of three tones on a triangular
 * lattice, mostly the ground tone, with a faint crease along each edge) and lettering stamped in `ink`.
 */
function printed(
  m: THREE.MeshPhysicalMaterial,
  opts: { tones?: [string, string, string]; decal?: string; tex?: THREE.Texture; tex2?: THREE.Texture; ink?: string; side?: number },
) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    const { tones, decal, tex, ink } = opts;
    if (tones) {
      shader.uniforms.uPrintA = { value: srgb(tones[0]) };
      shader.uniforms.uPrintB = { value: srgb(tones[1]) };
      shader.uniforms.uPrintC = { value: srgb(tones[2]) };
    }
    shader.uniforms.uLetters = { value: tex ?? null };
    shader.uniforms.uLetters2 = { value: opts.tex2 ?? tex ?? null };
    shader.uniforms.uInk = { value: srgb(ink ?? '#ffffff') };
    shader.uniforms.uSide = { value: opts.side ?? 1 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vKit;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKit = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vKit;\nuniform vec3 uPrintA;\nuniform vec3 uPrintB;\nuniform vec3 uPrintC;\nuniform sampler2D uLetters;\nuniform sampler2D uLetters2;\nuniform vec3 uInk;\nuniform float uSide;',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
${
  tones
    ? `{
  vec2 q = vec2(vKit.x + vKit.z * 0.7, vKit.y) / 0.042;
  vec2 g = vec2(q.x - q.y * 0.57735, q.y * 1.1547);
  vec2 i = floor(g), f = fract(g);
  float up = step(1.0, f.x + f.y);
  float h = fract(sin(dot(i * 2.0 + vec2(up, 0.0), vec2(12.9898, 78.233))) * 43758.5453);
  vec3 tone = h < 0.55 ? uPrintA : h < 0.78 ? uPrintB : uPrintC;
  float e = up > 0.5 ? min(min(1.0 - f.x, 1.0 - f.y), f.x + f.y - 1.0) : min(min(f.x, f.y), 1.0 - f.x - f.y);
  diffuseColor.rgb = tone * mix(0.96, 1.0, smoothstep(0.0, 0.06, e));
}`
    : ''
}
${
  decal
    ? `{
  vec2 uv = vec2(-1.0);
  float second = 0.0;
  ${decal}
  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0)
    diffuseColor.rgb = mix(diffuseColor.rgb, uInk, second > 0.5 ? texture2D(uLetters2, uv).a : texture2D(uLetters, uv).a);
}`
    : ''
}`,
      );
    prev.call(m, shader, renderer);
  };
}

/**
 * Mid-calf socks: the leg's skin below `top` (the shin's own space runs knee −0.235 to ankle +0.235) takes the
 * sock colour, with a ribbed cuff, over the model's ankle-high sock.
 */
function sockedShin(m: THREE.MeshStandardMaterial, sock: string, top: number) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    shader.uniforms.uSock = { value: srgb(sock) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vLegY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLegY = position.y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vLegY;\nuniform vec3 uSock;')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
if (vLegY > ${top.toFixed(3)}) diffuseColor.rgb = uSock * (vLegY < ${(top + 0.016).toFixed(3)} ? 0.9 : 1.0);`,
      )
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nif (vLegY > ${top.toFixed(3)}) roughnessFactor = 0.95;`);
    prev.call(m, shader, renderer);
  };
}

function std(color: THREE.ColorRepresentation, rough = 0.6, metal = 0) {
  return patchMaterial(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }), { key: 'rider' });
}

function tube(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material): THREE.Mesh {
  const len = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r, r, len, 10, 1);
  const m = new THREE.Mesh(g, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}

class Limb {
  mesh: THREE.Mesh;
  readonly len: number;
  constructor(radiusTop: number, radiusBottom: number, len: number, mat: THREE.Material) {
    this.len = len;
    const g = new THREE.CapsuleGeometry((radiusTop + radiusBottom) / 2, len, 4, 10);
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.castShadow = true;
  }
  set(a: THREE.Vector3, b: THREE.Vector3) {
    this.mesh.position.copy(a).add(b).multiplyScalar(0.5);
    const d = b.clone().sub(a);
    this.mesh.scale.set(1, d.length() / this.len, 1);
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  }
}

const LATERAL = new THREE.Vector3(1, 0, 0);

/**
 * A modelled limb skinned to three bones: the upper one from the hip or shoulder, the lower one from the knee or
 * elbow, and one at the joint turned half-way between them, so the joint bends as one surface and keeps its
 * volume (two rigid parts showed a seam and a ball there). The model runs along +Y from the root (y = 0) through
 * the joint (y = `joint`), lateral +X; the right limb is the left one mirrored.
 */
class SkinnedLimb {
  readonly group = new THREE.Group();
  private bones = [new THREE.Bone(), new THREE.Bone(), new THREE.Bone()];
  private readonly l1: number;
  private readonly l2: number;

  constructor(src: THREE.Object3D, joint: number, l2: number, blend: number, side: number) {
    this.l1 = joint;
    this.l2 = l2;
    const [root, mid, end] = this.bones;
    mid.position.y = end.position.y = joint;
    this.group.add(root, mid, end);
    const back = new THREE.Matrix4().makeTranslation(0, -joint, 0);
    const skeleton = new THREE.Skeleton(this.bones, [new THREE.Matrix4(), back, back.clone()]);
    src.updateMatrixWorld(true);
    src.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const g = m.geometry.clone();
      if (side < 0) mirrorX(g);
      const pos = g.attributes.position;
      const idx = new Uint16Array(pos.count * 4);
      const wt = new Float32Array(pos.count * 4);
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        const a = THREE.MathUtils.smoothstep(y, joint - blend, joint);
        const b = THREE.MathUtils.smoothstep(y, joint, joint + blend);
        // upper → joint across the first half of the band, joint → lower across the second
        idx.set(b > 0 ? [1, 2, 0, 0] : [0, 1, 0, 0], i * 4);
        wt.set(b > 0 ? [1 - b, b, 0, 0] : [1 - a, a, 0, 0], i * 4);
      }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4));
      const sm = new THREE.SkinnedMesh(g, m.material);
      sm.castShadow = m.castShadow;
      sm.receiveShadow = m.receiveShadow;
      // (the bounds are the straight limb's; a bent one can leave them)
      sm.frustumCulled = false;
      sm.bind(skeleton, new THREE.Matrix4());
      this.group.add(sm);
    });
  }

  /** Root, joint and end positions (the IK's), in the parent's space. */
  pose(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
    const [root, mid, end] = this.bones;
    const d1 = b.clone().sub(a);
    const d2 = c.clone().sub(b);
    // both bones keep the limb's lateral side towards +X, so the joint's two halves don't twist apart
    aim(root.quaternion, d1);
    aim(end.quaternion, d2);
    root.position.copy(a);
    root.scale.y = d1.length() / this.l1;
    end.position.copy(b);
    end.scale.y = d2.length() / this.l2;
    mid.position.copy(b);
    mid.quaternion.slerpQuaternions(root.quaternion, end.quaternion, 0.5);
    mid.scale.y = (root.scale.y + end.scale.y) / 2;
  }
}

const basis = new THREE.Matrix4();
/** Turns +Y onto `dir` with +X kept lateral. */
function aim(q: THREE.Quaternion, dir: THREE.Vector3) {
  const y = dir.clone().normalize();
  const z = LATERAL.clone().cross(y).normalize();
  const x = y.clone().cross(z);
  q.setFromRotationMatrix(basis.makeBasis(x, y, z));
}

/** The geometry mirrored across x = 0, still facing outwards. */
function mirrorX(g: THREE.BufferGeometry) {
  for (const name of ['position', 'normal']) {
    const a = g.attributes[name];
    if (!a) continue;
    for (let i = 0; i < a.count; i++) a.setX(i, -a.getX(i));
  }
  const ix = g.index;
  if (ix) {
    for (let i = 0; i < ix.count; i += 3) {
      const t = ix.getX(i + 1);
      ix.setX(i + 1, ix.getX(i + 2));
      ix.setX(i + 2, t);
    }
  }
}

/** Solve knee/elbow in a plane: returns joint position given root, end, lengths and bend hint. */
function twoBone(root: THREE.Vector3, end: THREE.Vector3, l1: number, l2: number, bend: THREE.Vector3): THREE.Vector3 {
  const d = end.clone().sub(root);
  const dist = Math.min(d.length(), l1 + l2 - 1e-3);
  const dir = d.normalize();
  const a = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
  const side = bend.clone().sub(dir.clone().multiplyScalar(bend.dot(dir))).normalize();
  return root.clone().add(dir.multiplyScalar(a)).add(side.multiplyScalar(h));
}

export class Rider extends THREE.Group {
  private wheels: THREE.Object3D[] = [];
  private crankArm: THREE.Group;
  private legs: { thigh: Limb; shin: Limb; foot: THREE.Mesh; side: number; skin?: SkinnedLimb }[] = [];
  private torso: THREE.Group;
  private arms: { upper: Limb; fore: Limb; side: number; skin?: SkinnedLimb }[] = [];
  private crankAngle = 0;
  private wheelAngle = 0;
  private body = new THREE.Group();
  private bike!: THREE.Group;
  /** 0 = seated, 1 = out of the saddle (blended). */
  stand = 0;
  /** Settles once the modelled bike and body have replaced the primitive shapes (or failed to load). */
  readonly ready: Promise<void>;
  private standing = false;
  private wantFor = 0;
  private sitFor = 0;
  private parts: {
    bike: THREE.Object3D[];
    head: THREE.Group;
    torso: THREE.Mesh[];
    style: RiderStyle;
  } | null = null;

  constructor(style: RiderStyle) {
    super();
    const ghost = !!style.ghost;
    const mk = (c: THREE.ColorRepresentation, rough = 0.6, metal = 0) => {
      if (!ghost) return std(c, rough, metal);
      return new THREE.MeshBasicMaterial({ color: 0x7ff5ff, transparent: true, opacity: 0.28, depthWrite: false });
    };
    const frameMat = mk(style.bike, 0.35, 0.3);
    const black = mk(0x111214, 0.5);
    const kit = mk(style.kit, 0.55);
    const accent = mk(style.accent, 0.5);
    const skin = mk(0xc99a7c, 0.7);
    const helmet = mk(0xf2f2f2, 0.3);
    const tyre = mk(0x18181a, 0.9);
    const rimMat = mk(0x2a2b2e, 0.3, 0.6);

    const bike = new THREE.Group();
    // frame geometry (metres)
    const rearAxle = new THREE.Vector3(0, WHEEL_R, -0.5);
    const frontAxle = new THREE.Vector3(0, WHEEL_R, 0.5);
    const seatTop = new THREE.Vector3(0, 0.79, -0.245);
    const headTop = new THREE.Vector3(0, 0.86, 0.38);
    const headBot = new THREE.Vector3(0, 0.72, 0.42);
    for (const [a, b, r] of [
      [BB, seatTop, 0.017],
      [seatTop, headTop, 0.016],
      [BB, headBot, 0.022],
      [headBot, headTop, 0.02],
      [BB, rearAxle, 0.012],
      [seatTop, rearAxle, 0.011],
      [headBot, frontAxle, 0.013],
    ] as [THREE.Vector3, THREE.Vector3, number][]) {
      for (const side of a === BB && b === rearAxle ? [-0.05, 0.05] : a === seatTop && b === rearAxle ? [-0.05, 0.05] : [0]) {
        const t = tube(a.clone().setX(side), b.clone().setX(side), r, frameMat);
        t.castShadow = true;
        bike.add(t);
      }
    }
    // seatpost, saddle, stem, bars
    const saddle = new THREE.Vector3(0, 0.97, -0.3);
    bike.add(tube(seatTop, saddle.clone().add(new THREE.Vector3(0, -0.02, 0.01)), 0.012, black));
    const saddleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.27), black);
    saddleMesh.position.copy(saddle);
    bike.add(saddleMesh);
    const bar = new THREE.Vector3(0, 0.95, 0.47);
    bike.add(tube(headTop, bar, 0.014, black));
    bike.add(tube(new THREE.Vector3(-0.21, 0.95, 0.47), new THREE.Vector3(0.21, 0.95, 0.47), 0.013, black));
    for (const s of [-1, 1]) {
      const hood = new THREE.Vector3(0.2 * s, 0.97, 0.53);
      bike.add(tube(new THREE.Vector3(0.21 * s, 0.95, 0.47), hood, 0.012, black));
      bike.add(tube(hood, new THREE.Vector3(0.2 * s, 0.86, 0.52), 0.012, black));
    }
    // wheels
    for (const axle of [rearAxle, frontAxle]) {
      const w = new THREE.Group();
      w.position.copy(axle);
      const t = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_R - 0.012, 0.014, 8, 40), tyre);
      t.rotation.y = Math.PI / 2;
      t.castShadow = true;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_R - 0.045, 0.022, 6, 40), rimMat);
      rim.rotation.y = Math.PI / 2;
      w.add(t, rim);
      for (let k = 0; k < 6; k++) {
        const spoke = tube(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, WHEEL_R - 0.06, 0), 0.0025, rimMat);
        spoke.position.set(0, 0, 0);
        const holder = new THREE.Group();
        holder.add(spoke);
        spoke.position.y = (WHEEL_R - 0.06) / 2;
        holder.rotation.x = (k / 6) * Math.PI * 2;
        w.add(holder);
      }
      this.wheels.push(w);
      bike.add(w);
    }
    // cranks
    this.crankArm = new THREE.Group();
    this.crankArm.position.copy(BB);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.008, 32), rimMat);
    ring.rotation.z = Math.PI / 2;
    ring.position.x = 0.06;
    this.crankArm.add(ring);
    for (const s of [-1, 1]) {
      const arm = tube(new THREE.Vector3(0.07 * s, 0, 0), new THREE.Vector3(0.07 * s, s * CRANK, 0), 0.01, black);
      this.crankArm.add(arm);
    }
    bike.add(this.crankArm);
    this.add(bike);
    this.bike = bike;
    const bikeProcedural = [...bike.children].filter((c) => !this.wheels.includes(c) && c !== this.crankArm);

    // rider
    this.torso = new THREE.Group();
    const hip = new THREE.Vector3(0, HIP_Y, HIP_Z);
    const shoulder = new THREE.Vector3(0, 1.36, 0.14);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.36, 4, 12), kit);
    torso.scale.set(1.1, 1, 0.75);
    torso.position.copy(hip).add(shoulder).multiplyScalar(0.5);
    torso.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), shoulder.clone().sub(hip).normalize());
    torso.castShadow = true;
    const stripe = new THREE.Mesh(new THREE.CapsuleGeometry(0.152, 0.08, 4, 12), accent);
    stripe.scale.set(1.11, 1, 0.76);
    stripe.position.copy(hip).lerp(shoulder, 0.62);
    stripe.quaternion.copy(torso.quaternion);
    const shorts = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), black);
    shorts.scale.set(1.15, 0.9, 1.1);
    shorts.position.copy(hip);
    const head = new THREE.Group();
    head.position.set(0, 1.5, 0.27);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), skin);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.9), helmet);
    lid.scale.set(1, 0.85, 1.3);
    lid.position.set(0, 0.03, -0.02);
    lid.rotation.x = -0.35;
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.05), black);
    glasses.position.set(0, 0.0, 0.085);
    head.add(face, lid, glasses);
    face.castShadow = lid.castShadow = true;
    this.torso.add(torso, stripe, shorts, head);
    this.body.add(this.torso);

    for (const s of [-1, 1]) {
      const thigh = new Limb(0.075, 0.06, THIGH, s < 0 ? black : black);
      const shin = new Limb(0.055, 0.045, SHIN, skin);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.24), black);
      foot.castShadow = true;
      this.body.add(thigh.mesh, shin.mesh, foot);
      this.legs.push({ thigh, shin, foot, side: s });
      const upper = new Limb(0.05, 0.045, UPPER_ARM, kit);
      const fore = new Limb(0.042, 0.036, FOREARM, skin);
      this.body.add(upper.mesh, fore.mesh);
      this.arms.push({ upper, fore, side: s });
    }
    this.add(this.body);
    if (ghost) this.traverse((o) => ((o as THREE.Mesh).castShadow = false));
    this.update(0, 0, 0);
    this.parts = { bike: bikeProcedural, head, torso: [torso, stripe, shorts], style };
    this.ready = this.upgrade(bike, ghost).catch((e) => console.warn('rider model unavailable', e));
  }

  /** Swap the primitive shapes for the Blender-built bike and body parts (public/models/rider.glb). */
  private async upgrade(bike: THREE.Group, ghost: boolean) {
    const src = await loadModel('rider.glb');
    const p = this.parts;
    if (!p) return;
    const ghostMat = ghost ? new THREE.MeshBasicMaterial({ color: 0x7ff5ff, transparent: true, opacity: 0.28, depthWrite: false }) : null;
    const tints: Record<string, string> = { jersey: p.style.kit, accent: p.style.accent, bike_frame: p.style.bike, helmet_trim: p.style.accent };
    const kit = p.style.outfit;
    const helmet = p.style.helmet;
    const matCache = new Map<string, THREE.Material>();
    // an outfit dresses each part on its own: the model's one "accent" is a sleeve end, a sock cuff and a shoe's
    // trim, and the leg's skin carries the taller sock
    const dressed = (m: THREE.Material, part: string, side: number): THREE.Material | null => {
      if (kit) {
        if (m.name === 'jersey') {
          const decal = part === 'torso' || part === 'arm' ? part : undefined;
          const j = cloth(kit.jersey, 0.72, 0.6, `rider:jersey:${decal ?? ''}:${kit.print ? 'print' : ''}`);
          printed(j, { tones: kit.print, decal: decal && DECALS[decal], tex: pas(), tex2: chest(), ink: kit.ink, side });
          return j;
        }
        if (m.name === 'accent') {
          const c = part === 'torso' || part === 'arm' ? kit.panel : part === 'leg' ? kit.socks : part === 'shoe' ? '#3a3b3e' : '#26272a';
          return cloth(c, 0.8, part === 'shoe' ? 0 : 0.4, 'rider:cloth');
        }
        if (m.name === 'shorts') {
          const b = cloth(kit.bibs, 0.55, 0.8, part === 'leg' ? 'rider:bibs' : 'rider:cloth');
          if (part === 'leg') printed(b, { decal: DECALS.leg, tex: pas(), ink: kit.bibsInk, side });
          return b;
        }
        if (m.name === 'shorts_grip') return cloth(kit.gripper, 0.6, 0.5, 'rider:cloth');
        if (m.name === 'sock') return cloth(kit.socks, 0.95, 0.3, 'rider:cloth');
        if (m.name === 'shoe') return patchMaterial(new THREE.MeshPhysicalMaterial({ color: srgb(kit.shoes), roughness: 0.35, clearcoat: 0.4, clearcoatRoughness: 0.3 }), { key: 'rider:shoe' });
        if (m.name === 'shoe_dark') return patchMaterial(new THREE.MeshStandardMaterial({ color: srgb('#9a9b9d'), roughness: 0.45 }), { key: 'rider' });
        if (m.name === 'skin' && part === 'leg') {
          const c = (m as THREE.MeshStandardMaterial).clone();
          sockedShin(c, kit.socks, 0.715);
          return patchMaterial(c, { key: 'rider:shin' });
        }
      }
      if (helmet && (m.name === 'helmet' || m.name === 'helmet_trim')) {
        const shell = m.name === 'helmet';
        const h = new THREE.MeshPhysicalMaterial({
          color: srgb(shell ? helmet.shell : helmet.trim),
          roughness: helmet.gloss ? 0.22 : 0.58,
          clearcoat: helmet.gloss ? 1 : 0,
          clearcoatRoughness: 0.12,
        });
        if (shell) printed(h, { decal: DECALS.helmet, tex: wordmark(), ink: helmet.logo });
        return patchMaterial(h, { key: shell ? 'rider:helmet:shell' : 'rider:helmet' });
      }
      return null;
    };
    const mat = (m: THREE.Material, part: string, side: number): THREE.Material => {
      if (ghostMat) return ghostMat;
      const k = `${part}:${m.name}:${side}`;
      let out = matCache.get(k);
      if (!out) {
        out = dressed(m, part, side) ?? m;
        const tint = out === m ? tints[m.name] : undefined;
        if (tint) {
          const c = m.clone() as THREE.MeshStandardMaterial;
          c.color.set(tint).convertSRGBToLinear();
          patchMaterial(c, { key: `rider:${m.name}` });
          out = c;
        }
        matCache.set(k, out);
      }
      return out;
    };
    const part = (name: string): THREE.Mesh => {
      const o = src.getObjectByName(name) as THREE.Mesh | undefined;
      if (!o) throw new Error(`rider.glb lacks ${name}`);
      // glTF splits multi-material meshes into a group of primitives
      return o;
    };
    const cloneOf = (name: string, side = 1): THREE.Object3D => {
      const o = part(name).clone(true);
      o.position.set(0, 0, 0);
      o.traverse((c) => {
        const m = c as THREE.Mesh;
        if (!m.isMesh) return;
        m.material = Array.isArray(m.material) ? m.material.map((x) => mat(x, name, side)) : mat(m.material, name, side);
        m.castShadow = !ghost;
        m.receiveShadow = !ghost;
      });
      return o;
    };
    for (const o of p.bike) bike.remove(o);
    bike.add(cloneOf('bike'));
    for (const w of this.wheels) {
      w.clear();
      w.add(cloneOf('wheel'));
    }
    this.crankArm.clear();
    this.crankArm.add(cloneOf('crank'));
    // torso: oriented hip → shoulder like the capsule it replaces
    const capsule = p.torso[0];
    const t = cloneOf('torso');
    t.position.copy(capsule.position);
    t.quaternion.copy(capsule.quaternion);
    for (const o of p.torso) this.torso.remove(o);
    this.torso.add(t);
    p.head.clear();
    const hd = cloneOf('head');
    hd.rotation.x = 0.12;
    p.head.add(hd);
    // limbs keep their IK; the modelled leg and arm are skinned onto it. They are authored for the +X side
    // (the rider's left); the right ones mirror them
    const skinLimb = (limb: { thigh?: Limb; shin?: Limb; upper?: Limb; fore?: Limb; side: number; skin?: SkinnedLimb }, name: string, joint: number, l2: number, blend: number) => {
      const s = new SkinnedLimb(cloneOf(name, limb.side), joint, l2, blend, limb.side);
      for (const l of [limb.thigh, limb.shin, limb.upper, limb.fore]) if (l) l.mesh.visible = false;
      this.body.add(s.group);
      limb.skin = s;
    };
    for (const l of this.legs) {
      skinLimb(l, 'leg', THIGH, SHIN, 0.05);
      l.foot.geometry = new THREE.BufferGeometry();
      const shoe = cloneOf('shoe');
      shoe.scale.x = l.side;
      l.foot.add(shoe);
    }
    for (const a of this.arms) skinLimb(a, 'arm', UPPER_ARM, FOREARM, 0.04);
    this.update(0, 0, 0);
  }

  /**
   * Out of the saddle like a real rider: grinding a low cadence at high effort or on a steep
   * ramp, and sprinting. Hysteresis so the rider doesn't bob up and down at the threshold.
   */
  private updateStanding(dt: number, speed: number, cadence: number, effort: number, grade: number) {
    const pedalling = cadence > 20;
    const grind = pedalling && cadence < 68 && effort > 0.85;
    const ramp = pedalling && grade > 8.5 && cadence < 76 && effort > 0.7;
    const sprint = pedalling && effort > 1.6 && cadence > 85 && speed > 8;
    const want = grind || ramp || sprint;
    if (want) {
      this.wantFor += dt;
      this.sitFor = 0;
    } else {
      this.sitFor += dt;
      this.wantFor = 0;
    }
    if (!this.standing && this.wantFor > 1.0) this.standing = true;
    if (this.standing && (this.sitFor > 1.8 || !pedalling)) this.standing = false;
    const target = this.standing ? 1 : 0;
    this.stand += (target - this.stand) * (1 - Math.exp(-dt / 0.35));
  }

  /** Advance animation. speed m/s, cadence rpm, dt s, effort = power / FTP, grade %. */
  update(dt: number, speed: number, cadence: number, effort = 0.5, grade = 0) {
    this.wheelAngle += (speed * dt) / WHEEL_R;
    for (const w of this.wheels) w.rotation.x = this.wheelAngle;
    const rpm = cadence > 5 ? cadence : 0;
    this.crankAngle += (rpm / 60) * Math.PI * 2 * dt;
    this.crankArm.rotation.x = this.crankAngle;
    this.updateStanding(dt, speed, rpm, effort, grade);
    const st = this.stand;
    const push = Math.sin(this.crankAngle); // +1: the +x leg is mid-downstroke

    // the bike rocks under a standing rider, away from the pushing leg
    this.bike.rotation.z = st * 0.11 * push * Math.min(1, rpm / 40);
    this.bike.updateMatrix();
    const bikeM = this.bike.matrix;

    // pelvis: seated on the saddle → up and forward over the bottom bracket when standing;
    // it drops onto each downstroke and swings towards the pushing leg
    const hip = new THREE.Vector3(
      st * 0.035 * push,
      THREE.MathUtils.lerp(HIP_Y, 1.065, st) - st * 0.022 * Math.abs(push),
      THREE.MathUtils.lerp(HIP_Z, -0.11, st),
    );
    const shoulder = new THREE.Vector3(st * 0.02 * push, THREE.MathUtils.lerp(1.36, 1.34, st), THREE.MathUtils.lerp(0.14, 0.29, st));
    // torso group: authored for the seated pose; rotate about the seated hip into the current pose
    const hip0 = new THREE.Vector3(0, HIP_Y, HIP_Z);
    const sh0 = new THREE.Vector3(0, 1.36, 0.14);
    const q = new THREE.Quaternion().setFromUnitVectors(sh0.clone().sub(hip0).normalize(), shoulder.clone().sub(hip).normalize());
    const seatedRock = rpm > 0 ? Math.sin(this.crankAngle) * 0.012 * (0.6 + effort) : 0;
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), seatedRock * (1 - st) - st * 0.05 * push));
    this.torso.quaternion.copy(q);
    this.torso.position.copy(hip).sub(hip0.clone().applyQuaternion(q));

    for (const leg of this.legs) {
      const a = this.crankAngle + (leg.side > 0 ? 0 : Math.PI);
      const pedalB = new THREE.Vector3(0.12 * leg.side, BB.y + Math.cos(a) * CRANK, BB.z + Math.sin(a) * CRANK);
      const pedal = pedalB.clone().applyMatrix4(bikeM);
      const legHip = new THREE.Vector3(0.1 * leg.side, -0.03, 0.02).applyQuaternion(q).add(hip);
      const ankle = pedal.clone().add(new THREE.Vector3(0, 0.07, -0.03));
      const knee = twoBone(legHip, ankle, THIGH, SHIN, new THREE.Vector3(0.04 * leg.side, 0.3, 1));
      if (leg.skin) leg.skin.pose(legHip, knee, ankle);
      else {
        leg.thigh.set(legHip, knee);
        leg.shin.set(knee, ankle);
      }
      leg.foot.position.copy(pedal).add(new THREE.Vector3(0, 0.035, 0.02));
      leg.foot.rotation.set(-0.15 + Math.sin(a) * 0.2 - st * 0.12, 0, this.bike.rotation.z);
    }
    for (const arm of this.arms) {
      const sh = new THREE.Vector3(0.19 * arm.side, 1.34, 0.12).sub(hip0).applyQuaternion(q).add(hip);
      // seated: tops/hoods; standing: hands forward on the hoods, gripping the rocking bike
      const handB = new THREE.Vector3(0.2 * arm.side, THREE.MathUtils.lerp(0.99, 0.97, st), THREE.MathUtils.lerp(0.53, 0.545, st));
      const hand = handB.applyMatrix4(bikeM);
      const elbow = twoBone(sh, hand, UPPER_ARM, FOREARM, new THREE.Vector3(0.6 * arm.side, -0.3 - st * 0.2, -0.6));
      if (arm.skin) arm.skin.pose(sh, elbow, hand);
      else {
        arm.upper.set(sh, elbow);
        arm.fore.set(elbow, hand);
      }
    }
  }
}

// Spanish road signs for Mediterranean routes, built procedurally (canvas textures on instanced
// planes): "curva peligrosa" triangles ~80 m before tight bends, R-301 "40" speed limits, the
// blue tunnel sign with a length plate before each portal, and yellow km posts (Ma-2210 style).
// French routes (Champagne) get the village entry and exit signs (EB10 / EB20) where the road enters
// and leaves each built-up stretch, named after the nearest OSM village.
// Everything stands on the right of the direction of travel (+s) and faces the oncoming rider.
// Canvases use willReadFrequently (CPU canvas): GPU canvases corrupt WebGL on some machines.

import * as THREE from 'three';
import type { OsmWorld } from '../geo/osm.ts';
import type { Route, RouteIndex } from '../geo/route.ts';
import { patchMaterial } from './atmosphere.ts';
import type { Biome } from './biome.ts';

const WARN_RADIUS = 40; // bends tighter than this get a warning sign
const WARN_DIST = 80; // m before the bend
const WARN_SPACING = 120; // never two warnings closer than this
const SPEED_EVERY = 3000;

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  return { c, ctx };
}

function texture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** Slightly bright so the retroreflective faces stay legible in shade. */
const FACE = new THREE.Color(1.2, 1.2, 1.2);

function faceMaterial(map: THREE.Texture, key: string) {
  const m = new THREE.MeshLambertMaterial({ map, color: FACE, alphaTest: 0.5, side: THREE.DoubleSide });
  return patchMaterial(m, { key });
}

function roundedTriangle(ctx: CanvasRenderingContext2D, pts: [number, number][], r: number) {
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const a = pts[i], b = pts[(i + 1) % 3], c = pts[(i + 2) % 3];
    const s = [(a[0] - c[0]), (a[1] - c[1])];
    const e = [(b[0] - a[0]), (b[1] - a[1])];
    const ls = Math.hypot(s[0], s[1]), le = Math.hypot(e[0], e[1]);
    const p0: [number, number] = [a[0] - (s[0] / ls) * r, a[1] - (s[1] / ls) * r];
    const p1: [number, number] = [a[0] + (e[0] / le) * r, a[1] + (e[1] / le) * r];
    if (i === 0) ctx.moveTo(p0[0], p0[1]);
    else ctx.lineTo(p0[0], p0[1]);
    ctx.quadraticCurveTo(a[0], a[1], p1[0], p1[1]);
  }
  ctx.closePath();
}

/** P-13a/b "curva peligrosa": white triangle, red border, black bend arrow. */
function warningTexture(right: boolean): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  ctx.clearRect(0, 0, S, S);
  const tri: [number, number][] = [[S / 2, 8], [S - 6, S - 28], [6, S - 28]];
  roundedTriangle(ctx, tri, 14);
  ctx.fillStyle = '#d4141c';
  ctx.fill();
  const inner: [number, number][] = [[S / 2, 62], [S - 52, S - 56], [52, S - 56]];
  roundedTriangle(ctx, inner, 8);
  ctx.fillStyle = '#f6f6f2';
  ctx.fill();
  ctx.save();
  if (!right) {
    ctx.translate(S, 0);
    ctx.scale(-1, 1);
  }
  // arrow: up the lane, then bending to the right
  ctx.strokeStyle = '#111';
  ctx.fillStyle = '#111';
  ctx.lineWidth = 17;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(108, 206);
  ctx.lineTo(108, 168);
  ctx.quadraticCurveTo(108, 128, 144, 114);
  ctx.stroke();
  // head pointing up-right
  const ang = Math.atan2(-14, 36) ;
  const hx = 142, hy = 115;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.lineTo(-6, -24);
  ctx.lineTo(-6, 24);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
  return texture(c);
}

/** R-301: round, red ring, black number on white. */
function speedTexture(limit: number): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = '#d4141c';
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f6f6f2';
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2 - 3 - 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.font = 'bold 118px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(limit), S / 2, S / 2 + 6);
  return texture(c);
}

/** S-5 tunnel: blue square, white border, tunnel mouth pictogram. */
function tunnelTexture(): THREE.CanvasTexture {
  const S = 256;
  const { c, ctx } = canvas(S, S);
  ctx.clearRect(0, 0, S, S);
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  rr(2, 2, S - 4, S - 4, 22);
  ctx.fillStyle = '#f6f6f2';
  ctx.fill();
  rr(14, 14, S - 28, S - 28, 14);
  ctx.fillStyle = '#0a4ea3';
  ctx.fill();
  // tunnel mouth: white arch block with a dark opening and a road going in
  ctx.fillStyle = '#f6f6f2';
  ctx.beginPath();
  ctx.moveTo(52, 200);
  ctx.lineTo(52, 118);
  ctx.arc(128, 118, 76, Math.PI, 0);
  ctx.lineTo(204, 200);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0a4ea3';
  ctx.beginPath();
  ctx.moveTo(86, 200);
  ctx.lineTo(86, 126);
  ctx.arc(128, 126, 42, Math.PI, 0);
  ctx.lineTo(170, 200);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f6f6f2';
  ctx.beginPath();
  ctx.moveTo(116, 200);
  ctx.lineTo(124, 148);
  ctx.lineTo(132, 148);
  ctx.lineTo(140, 200);
  ctx.closePath();
  ctx.fill();
  return texture(c);
}

interface Plate {
  x: number;
  y: number;
  z: number;
  yaw: number;
  w: number;
  h: number;
  kind: 'km' | 'len';
  a: string;
  b: string;
}

/** Text plates (km faces, tunnel length) merged into one mesh with a small canvas atlas. */
function plateMesh(plates: Plate[]): THREE.Mesh | null {
  if (!plates.length) return null;
  const CW = 256, CH = 192, cols = 4;
  const rows = Math.ceil(plates.length / cols);
  const { c, ctx } = canvas(CW * cols, CH * rows);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  plates.forEach((p, k) => {
    const cx = (k % cols) * CW, cy = Math.floor(k / cols) * CH;
    if (p.kind === 'km') {
      ctx.fillStyle = '#f2f0e6';
      ctx.fillRect(cx, cy, CW, CH);
      ctx.fillStyle = '#d99a00';
      ctx.fillRect(cx, cy, CW, 50);
      ctx.fillStyle = '#222';
      ctx.font = 'bold 26px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.a, cx + CW / 2, cy + 27);
      ctx.fillStyle = '#111';
      ctx.font = 'bold 80px Arial, Helvetica, sans-serif';
      ctx.fillText(p.b, cx + CW / 2, cy + 125);
    } else {
      ctx.fillStyle = '#0a4ea3';
      ctx.fillRect(cx, cy, CW, CH);
      ctx.strokeStyle = '#f6f6f2';
      ctx.lineWidth = 7;
      ctx.strokeRect(cx + 5, cy + 5, CW - 10, CH - 10);
      // the cell is squeezed 4:3 -> 2:1 on the plate, so stretch the text vertically by 1.5
      ctx.save();
      ctx.translate(cx + CW / 2, cy + CH / 2);
      ctx.scale(1, 1.5);
      ctx.fillStyle = '#f6f6f2';
      ctx.font = 'bold 60px Arial, Helvetica, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.a, 0, 2);
      ctx.restore();
    }
    const u0 = cx / (CW * cols), u1 = (cx + CW) / (CW * cols);
    const v1 = 1 - cy / (CH * rows), v0 = 1 - (cy + CH) / (CH * rows);
    const sx = Math.cos(p.yaw), sz = -Math.sin(p.yaw); // local +x in world
    const hw = p.w / 2;
    const b = pos.length / 3;
    for (const [dx, dy] of [[-hw, -p.h / 2], [hw, -p.h / 2], [hw, p.h / 2], [-hw, p.h / 2]] as const) {
      pos.push(p.x + sx * dx, p.y + dy, p.z + sz * dx);
    }
    uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  const mat = faceMaterial(texture(c), 'signplate');
  const m = new THREE.Mesh(geo, mat);
  return m;
}

/** EB10 (entry: black name on white, red border) or EB20 (exit: the same, struck through in red). */
function villageTexture(name: string, exit: boolean): { tex: THREE.CanvasTexture; w: number } {
  const H = 200;
  const text = name.toUpperCase();
  const probe = canvas(8, 8).ctx;
  probe.font = 'bold 96px "Arial Narrow", Arial, Helvetica, sans-serif';
  // long names (La Neuville-en-Tourne-à-Fuy) go on two lines at the hyphen nearest the middle
  let lines = [text];
  if (probe.measureText(text).width > 1100) {
    const cut = [...text.matchAll(/-/g)].map((m) => m.index ?? 0).sort((a, b) => Math.abs(a - text.length / 2) - Math.abs(b - text.length / 2))[0];
    if (cut) lines = [text.slice(0, cut + 1), text.slice(cut + 1)];
  }
  const size = lines.length > 1 ? 70 : 96;
  probe.font = `bold ${size}px "Arial Narrow", Arial, Helvetica, sans-serif`;
  const W = Math.max(420, Math.min(1400, Math.ceil(Math.max(...lines.map((l) => probe.measureText(l).width)) + 110)));
  const { c, ctx } = canvas(W, H);
  ctx.fillStyle = '#d0121b';
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 26);
  ctx.fill();
  ctx.fillStyle = '#f7f7f2';
  ctx.beginPath();
  ctx.roundRect(16, 16, W - 32, H - 32, 14);
  ctx.fill();
  ctx.fillStyle = '#121212';
  ctx.font = `bold ${size}px "Arial Narrow", Arial, Helvetica, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 0.98 + 4));
  if (exit) {
    ctx.strokeStyle = '#d0121b';
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(30, H - 24);
    ctx.lineTo(W - 30, 24);
    ctx.stroke();
  }
  return { tex: texture(c), w: (W / H) * 0.5 };
}

/**
 * Built-up stretches [from, to] (m along the route): where 3+ OSM buildings stand within 50 m of the road, gaps
 * under 150 m bridged, at least 150 m long. The village signs stand just outside them and the French roadside
 * posts stop inside them.
 */
export function builtUpRuns(route: Route, osm: OsmWorld): [number, number][] {
  const step = route.step;
  const cell = (x: number, z: number) => Math.floor(x / 50) * 100003 + Math.floor(z / 50);
  const grid = new Map<number, number[]>();
  for (const b of osm.buildings) {
    const k = cell(b.ring[0], b.ring[1]);
    let l = grid.get(k);
    if (!l) grid.set(k, (l = []));
    l.push(b.ring[0], b.ring[1]);
  }
  const every = Math.max(1, Math.round(10 / step));
  const built: boolean[] = [];
  for (let i = 0; i < route.n; i += every) {
    const x = route.x[i], z = route.z[i];
    let n = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const l = grid.get(cell(x + dx * 50, z + dz * 50));
        if (l) for (let k = 0; k < l.length; k += 2) if (Math.hypot(l[k] - x, l[k + 1] - z) < 50) n++;
      }
    }
    built.push(n >= 3);
  }
  const runs: [number, number][] = [];
  for (let k = 0; k < built.length; k++) {
    if (!built[k]) continue;
    let e = k;
    while (e + 1 < built.length && built[e + 1]) e++;
    const a = k * every * step, b = e * every * step;
    const last = runs.at(-1);
    if (last && a - last[1] < 150) last[1] = b;
    else runs.push([a, b]);
    k = e;
  }
  return runs.filter(([a, b]) => b - a >= 150);
}

/** Where side roads and driveways leave the route (m along it): a way's points switch from on our road to off it. */
export function junctionsAlong(route: Route, index: RouteIndex, osm: OsmWorld): number[] {
  const out: number[] = [];
  for (const l of osm.roads) {
    if (l.kind === 'footway' || l.kind === 'path' || l.kind === 'steps' || l.kind === 'cycleway') continue;
    let prev: { index: number; dist: number } | null = null;
    for (let i = 0; i < l.pts.length; i += 2) {
      const n = index.nearest(l.pts[i], l.pts[i + 1], 40);
      const on = n.index >= 0 && n.dist < 7;
      if (prev && on !== (prev.index >= 0 && prev.dist < 7)) out.push((on ? n : prev).index * route.step);
      prev = n;
    }
  }
  return out;
}

/** Entry and exit signs of each built-up stretch, named after the nearest village place within 2.5 km (hamlets
 *  only when nothing larger is that close). */
function villageSigns(route: Route, halfWidth: number, groundAt: (x: number, z: number) => number, osm: OsmWorld, runs: [number, number][]): THREE.Group {
  const g = new THREE.Group();
  const step = route.step;
  const rank = (kind: string) => (kind === 'hamlet' ? 1 : 0);
  const spot = (s: number) => {
    const i = Math.min(route.n - 1, Math.max(0, Math.round(s / step)));
    const h = route.heading[i];
    const off = halfWidth + 1.4;
    const x = route.x[i] + Math.cos(h) * off, z = route.z[i] + Math.sin(h) * off;
    const gy = groundAt(x, z);
    return { x, y: Number.isFinite(gy) ? Math.min(gy, route.ele[i]) : route.ele[i], z, yaw: -h + 0.12 };
  };
  const poles: THREE.Matrix4[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (const [a, b] of runs) {
    if (a < 20 || b > route.length - 20) continue;
    const mid = Math.min(route.n - 1, Math.round((a + b) / 2 / step));
    const mx = route.x[mid], mz = route.z[mid];
    const named = osm.places
      .map((p) => ({ p, d: Math.hypot(p.x - mx, p.z - mz) + rank(p.kind) * 1500 }))
      .filter((c) => c.d < 2500 + rank(c.p.kind) * 1500)
      .sort((u, v) => u.d - v.d)[0]?.p;
    if (!named) continue;
    for (const [s, exit] of [[a - 15, false], [b + 15, true]] as const) {
      const p = spot(s);
      const { tex, w } = villageTexture(named.name, exit);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.5), faceMaterial(tex, 'sign-village'));
      mesh.position.set(p.x, p.y + 1.75, p.z);
      mesh.quaternion.setFromAxisAngle(up, p.yaw);
      mesh.castShadow = true;
      g.add(mesh);
      // two posts at the panel's thirds
      for (const t of [-w / 3, w / 3]) {
        poles.push(new THREE.Matrix4().compose(
          new THREE.Vector3(p.x + Math.cos(p.yaw) * t, p.y - 0.15, p.z - Math.sin(p.yaw) * t), new THREE.Quaternion(), new THREE.Vector3(1, 1.85, 1),
        ));
      }
    }
  }
  if (poles.length) {
    const geo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6).translate(0, 0.5, 0);
    const pm = new THREE.InstancedMesh(geo, patchMaterial(new THREE.MeshLambertMaterial({ color: 0x9a9da0 }), { key: 'signpole' }), poles.length);
    poles.forEach((m, i) => pm.setMatrixAt(i, m));
    pm.castShadow = true;
    pm.computeBoundingSphere();
    g.add(pm);
  }
  return g;
}

export class Signs extends THREE.Group {
  constructor(
    route: Route,
    halfWidth: number,
    groundAt: (x: number, z: number) => number,
    biome: Biome,
    osm?: OsmWorld,
    towns: [number, number][] = [],
  ) {
    super();
    if (biome.posts === 'fr' && osm) {
      this.add(villageSigns(route, halfWidth, groundAt, osm, towns));
      return;
    }
    if (biome.id !== 'mediterranean') return;
    const step = route.step;
    const at = (s: number) => Math.min(route.n - 1, Math.max(0, Math.round(s / step)));
    const inTunnel = (s: number, pad = 25) => route.tunnels.some(([a, b]) => s > a - pad && s < b + pad);

    // road number for the km plates ("Ma-2210"), from the route name when it carries one
    const roadNo = /\b([A-Z]{1,2}-\d{2,4})\b/.exec(`${route.name} ${route.id}`)?.[1] ?? 'Ma-2210';

    /** Foot of a sign on the right-hand verge. */
    const spot = (s: number, off: number) => {
      const i = at(s);
      const h = route.heading[i];
      const x = route.x[i] + Math.cos(h) * off;
      const z = route.z[i] + Math.sin(h) * off;
      const g = groundAt(x, z);
      const y = Number.isFinite(g) ? Math.min(g, route.ele[i]) : route.ele[i];
      // face the oncoming rider, turned a few degrees towards the road axis
      return { x, y, z, yaw: -h + 0.12 };
    };

    const poleGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 6).translate(0, 0.5, 0);
    const poleMat = patchMaterial(new THREE.MeshLambertMaterial({ color: 0x9a9da0 }), { key: 'signpole' });
    const poles: THREE.Matrix4[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const quat = (yaw: number) => new THREE.Quaternion().setFromAxisAngle(up, yaw);
    const addPole = (p: { x: number; y: number; z: number }, height: number) =>
      poles.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y - 0.15, p.z), new THREE.Quaternion(), new THREE.Vector3(1, height + 0.15, 1)));

    const sets = new Map<string, { tex: THREE.Texture; w: number; h: number; mats: THREE.Matrix4[] }>();
    const face = (key: string, mk: () => THREE.Texture, w: number, h: number, p: { x: number; y: number; z: number; yaw: number }, centre: number) => {
      let set = sets.get(key);
      if (!set) sets.set(key, (set = { tex: mk(), w, h, mats: [] }));
      set.mats.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y + centre, p.z), quat(p.yaw), new THREE.Vector3(1, 1, 1)));
    };

    const off = halfWidth + 1.3;
    const taken: number[] = []; // s positions of placed signs, to keep them apart
    const free = (s: number, gap: number) => taken.every((t) => Math.abs(t - s) > gap);

    // (a) bend warnings
    let lastWarn = -1e9;
    for (let i = 1; i < route.n; i++) {
      if (route.radius[i] >= WARN_RADIUS) continue;
      // start of a tight run; swallow the run and any tight bends within 150 m of it
      let j = i, end = i;
      while (j < route.n && j - end < Math.round(150 / step)) {
        if (route.radius[j] < WARN_RADIUS) end = j;
        j++;
      }
      let turn = 0;
      for (let k = Math.max(1, i); k <= end; k++) {
        const d = route.heading[k] - route.heading[k - 1];
        turn += Math.atan2(Math.sin(d), Math.cos(d));
      }
      const s = i * step - WARN_DIST;
      if (s > 5 && s - lastWarn >= WARN_SPACING && !inTunnel(s) && !inTunnel(i * step, 0)) {
        const right = turn > 0;
        const p = spot(s, off);
        face(right ? 'warnR' : 'warnL', () => warningTexture(right), 0.9, 0.9, p, 1.75);
        addPole(p, 2.2);
        taken.push(s);
        lastWarn = s;
      }
      i = end + 1;
    }

    // (b) speed limit: at the start and then every ~3 km
    for (let s = 40; s < route.length - 50; s += SPEED_EVERY) {
      let ss = s;
      while (!free(ss, 30) || inTunnel(ss, 60)) ss += 40;
      const p = spot(ss, off);
      face('speed40', () => speedTexture(40), 0.6, 0.6, p, 1.7);
      addPole(p, 2.0);
      taken.push(ss);
    }

    // (c) tunnel sign and length plate
    const plates: Plate[] = [];
    for (const [a, b] of route.tunnels) {
      const s = a - 120;
      if (s < 5) continue;
      const p = spot(s, off + 0.2);
      face('tunnel', tunnelTexture, 0.7, 0.7, p, 2.2);
      addPole(p, 2.6);
      plates.push({ x: p.x + Math.sin(p.yaw) * 0.03, y: p.y + 1.55, z: p.z + Math.cos(p.yaw) * 0.03, yaw: p.yaw, w: 0.7, h: 0.35, kind: 'len', a: `${Math.round((b - a) / 10) * 10} m`, b: '' });
      taken.push(s);
    }

    // (d) km posts every km on the right
    const kmBody = new THREE.Group();
    const bodyMats: THREE.Matrix4[] = [];
    for (let km = 1; km * 1000 < route.length; km++) {
      const s = km * 1000;
      if (inTunnel(s, 10)) continue;
      const p = spot(s, halfWidth + 0.9);
      bodyMats.push(new THREE.Matrix4().compose(new THREE.Vector3(p.x, p.y - 0.1, p.z), quat(p.yaw), new THREE.Vector3(1, 1, 1)));
      plates.push({
        x: p.x + Math.sin(p.yaw) * 0.095, y: p.y + 0.6, z: p.z + Math.cos(p.yaw) * 0.095, yaw: p.yaw, w: 0.26, h: 0.195,
        kind: 'km', a: roadNo, b: String(km),
      });
    }
    if (bodyMats.length) {
      // rounded yellow stone: box body with a half-cylinder top
      const body = new THREE.BoxGeometry(0.26, 0.8, 0.18).translate(0, 0.4, 0);
      const shape = new THREE.Shape().moveTo(-0.13, 0).absarc(0, 0, 0.13, Math.PI, 0, true).lineTo(-0.13, 0);
      const cap = new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: false, curveSegments: 10 }).translate(0, 0.8, -0.09);
      const parts = [body, cap].map((g) => (g.index ? g.toNonIndexed() : g));
      const merged = new THREE.BufferGeometry();
      const pp: number[] = [], nn: number[] = [];
      for (const g of parts) {
        pp.push(...(g.getAttribute('position').array as Float32Array));
        nn.push(...(g.getAttribute('normal').array as Float32Array));
      }
      merged.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
      merged.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
      const mat = patchMaterial(new THREE.MeshLambertMaterial({ color: 0xe8b21c, side: THREE.DoubleSide }), { key: 'kmpost' });
      const mesh = new THREE.InstancedMesh(merged, mat, bodyMats.length);
      bodyMats.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = true;
      mesh.computeBoundingSphere();
      kmBody.add(mesh);
      this.add(kmBody);
    }

    // build the instanced faces and poles
    for (const [key, set] of sets) {
      const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(set.w, set.h), faceMaterial(set.tex, `sign-${key}`), set.mats.length);
      set.mats.forEach((m, i) => mesh.setMatrixAt(i, m));
      mesh.castShadow = true;
      mesh.computeBoundingSphere();
      this.add(mesh);
    }
    if (poles.length) {
      const pm = new THREE.InstancedMesh(poleGeo, poleMat, poles.length);
      poles.forEach((m, i) => pm.setMatrixAt(i, m));
      pm.castShadow = true;
      pm.computeBoundingSphere();
      this.add(pm);
    }
    const pl = plateMesh(plates);
    if (pl) this.add(pl);
  }
}

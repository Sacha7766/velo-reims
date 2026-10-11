import * as THREE from 'three';
import { pointAt, type Route, type RoutePoint } from '../geo/route.ts';

export type CameraMode = 'chase' | 'drone' | 'side' | 'first' | 'cinematic';
export const CAMERA_MODES: { id: CameraMode; label: string; key: string }[] = [
  { id: 'chase', label: 'Chase', key: '1' },
  { id: 'drone', label: 'Drone', key: '2' },
  { id: 'side', label: 'Moto', key: '3' },
  { id: 'first', label: 'Rider', key: '4' },
  { id: 'cinematic', label: 'Cinematic', key: '5' },
];

type Shot = 'chase' | 'drone' | 'side' | 'first' | 'heli' | 'ahead';
const CINE: Shot[] = ['chase', 'heli', 'side', 'drone', 'ahead'];

const tmp: Partial<RoutePoint> = {};

export class CameraRig {
  mode: CameraMode = 'chase';
  private pos = new THREE.Vector3();
  private look = new THREE.Vector3();
  private init = false;
  private cineT = 0;
  private cineIdx = 0;
  private heliA = 0;

  snap() {
    this.init = false;
  }

  update(
    cam: THREE.PerspectiveCamera,
    dt: number,
    route: Route,
    s: number,
    dir: 1 | -1,
    lateral: number,
    heightAt: (x: number, z: number) => number,
  ) {
    let shot: Shot = this.mode === 'cinematic' ? CINE[this.cineIdx] : this.mode;
    if (this.mode === 'cinematic') {
      this.cineT += dt;
      if (this.cineT > 13) {
        this.cineT = 0;
        this.cineIdx = (this.cineIdx + 1) % CINE.length;
        shot = CINE[this.cineIdx];
        this.init = false;
        this.heliA = Math.random() * Math.PI * 2;
      }
    }
    const at = (ds: number, lat = lateral) => {
      const p = pointAt(route, s + ds * dir, tmp);
      const h = p.heading + (dir < 0 ? Math.PI : 0);
      return {
        x: p.x + Math.cos(h) * lat,
        y: p.ele,
        z: p.z + Math.sin(h) * lat,
        fx: Math.sin(h),
        fz: -Math.cos(h),
        rx: Math.cos(h),
        rz: Math.sin(h),
      };
    };
    const r = at(0);
    const wantPos = new THREE.Vector3();
    const wantLook = new THREE.Vector3();
    let posK = 3.2;
    let lookK = 6;
    switch (shot) {
      case 'chase': {
        const b = at(-6.5);
        wantPos.set(b.x, b.y + 2.25, b.z);
        wantLook.set(r.x + r.fx * 4, r.y + 1.05, r.z + r.fz * 4);
        break;
      }
      case 'drone': {
        const b = at(-42, lateral + 6);
        wantPos.set(b.x, b.y + 30, b.z);
        const f = at(22);
        wantLook.set(f.x, f.y, f.z);
        posK = 1.4;
        lookK = 2.5;
        break;
      }
      case 'side': {
        wantPos.set(r.x + r.rx * 4.2 + r.fx * 2.5, r.y + 1.25, r.z + r.rz * 4.2 + r.fz * 2.5);
        wantLook.set(r.x, r.y + 0.95, r.z);
        posK = 5;
        break;
      }
      case 'first': {
        const f = at(26);
        wantPos.set(r.x + r.fx * 0.3, r.y + 1.62, r.z + r.fz * 0.3);
        wantLook.set(f.x, f.y + 1.3, f.z);
        posK = 30;
        lookK = 5;
        break;
      }
      case 'ahead': {
        const f = at(9);
        wantPos.set(f.x - f.rx * 1.2, f.y + 1.1, f.z - f.rz * 1.2);
        wantLook.set(r.x, r.y + 1.0, r.z);
        posK = 4;
        break;
      }
      case 'heli': {
        this.heliA += dt * 0.09;
        wantPos.set(r.x + Math.cos(this.heliA) * 38, r.y + 16, r.z + Math.sin(this.heliA) * 38);
        wantLook.set(r.x, r.y + 1, r.z);
        posK = 2;
        lookK = 4;
        break;
      }
    }
    const ground = heightAt(wantPos.x, wantPos.z);
    if (Number.isFinite(ground)) wantPos.y = Math.max(wantPos.y, ground + 1.3);
    if (!this.init) {
      this.pos.copy(wantPos);
      this.look.copy(wantLook);
      this.init = true;
    } else {
      this.pos.lerp(wantPos, 1 - Math.exp(-dt * posK));
      this.look.lerp(wantLook, 1 - Math.exp(-dt * lookK));
    }
    cam.position.copy(this.pos);
    cam.lookAt(this.look);
  }
}

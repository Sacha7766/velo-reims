// Scripted drone film of a preset, captured frame by frame (deterministic 30 fps):
//   node scripts/flyover.mjs [time=inversion] [seconds=48] [out=shots/gaisberg/flyover.mp4]
// The engine is paused and stepped with engine.frame(1/30); the camera follows a shot list.
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const [time = 'inversion', seconds = '48', out = 'shots/gaisberg/flyover.mp4'] = args;
// --test=1,12,25,40 renders single stills at those times instead of a film
const test = process.argv.find((a) => a.startsWith('--test='))?.slice(7).split(',').map(Number);
const FPS = 30;
const frames = Math.round(Number(seconds) * FPS);
const dir = `shots/gaisberg/frames-${time}`;
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:5199/?ride=gaisberg&sim=1&watts=270&at=9420&cam=chase&time=${time}`);
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 150000, polling: 500 });
await page.keyboard.press('h');
// nothing but the 3D view in the film
await page.addStyleTag({ content: '.app > :not(canvas) { visibility: hidden !important; }' });
await page.waitForTimeout(9000); // trees, landmarks, life

await page.evaluate((total) => {
  const e = window.engine;
  const R = e.world.route;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const at = (s) => {
    const f = Math.min(Math.max(s / R.step, 0), R.n - 1.001);
    const i = Math.floor(f), t = f - i;
    return { x: lerp(R.x[i], R.x[i + 1], t), z: lerp(R.z[i], R.z[i + 1], t), y: lerp(R.ele[i], R.ele[i + 1], t), h: R.heading[i] };
  };
  const world = (lon, lat) => {
    const Rm = 6378137;
    const mx = (lon * Math.PI / 180) * Rm;
    const my = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * Rm;
    return { x: (mx - R.frame.mx0) * R.frame.k, z: -(my - R.frame.my0) * R.frame.k };
  };
  const ground = (x, z) => {
    const h = e.world.terrain.heightAt(x, z);
    return Number.isFinite(h) ? h : 1000;
  };
  const tower = world(13.112097, 47.805225);
  const towerY = ground(tower.x, tower.z);
  window.__fly = { t: 0 };
  const shots = [
    { end: 9, f: (u) => {
      // approach over the fog sea from the Salzburg side
      const k = ease(u);
      const d = lerp(2900, 1150, k);
      const ang = Math.PI * 1.08 + 0.25 * k;
      return {
        pos: [tower.x + Math.cos(ang) * d, towerY + lerp(420, 230, k), tower.z + Math.sin(ang) * d],
        look: [tower.x, towerY + lerp(20, 45, k), tower.z],
      };
    } },
    { end: 19, f: (u) => {
      // along the climb: Zistelalm → Nocksteinkehre
      const s = lerp(7250, 8650, u);
      const p = at(s), q = at(s + 160);
      const back = at(s - 110);
      return { pos: [back.x + Math.cos(p.h) * 45, Math.max(back.y, p.y) + 75, back.z + Math.sin(p.h) * 45], look: [q.x, q.y, q.z] };
    } },
    { end: 33, f: (u) => {
      // orbit the summit, transmitter and paragliders
      const ang = 0.4 + ease(u) * 2.1;
      const rad = 300;
      return {
        pos: [tower.x + Math.cos(ang) * rad, towerY + 95 - 25 * u, tower.z + Math.sin(ang) * rad],
        look: [tower.x, towerY + 35, tower.z],
      };
    } },
    { end: total / 30, f: (u) => {
      // low chase on the rider, then crane up into the panorama
      const r = e.world.rider.position;
      const s = e.riderS;
      const b = at(s - lerp(9, 95, ease(u)));
      const p = at(s);
      const side = lerp(0, 25, ease(u));
      return {
        pos: [b.x + Math.cos(p.h) * side, b.y + lerp(2.6, 70, ease(u) ** 1.3), b.z + Math.sin(p.h) * side],
        look: [lerp(r.x, r.x - Math.sin(p.h) * -400, ease(u) * 0.6), r.y + lerp(1.2, -40, ease(u) * 0.8), lerp(r.z, r.z + Math.cos(p.h) * -400, ease(u) * 0.6)],
      };
    } },
  ];
  e.cameraOverride = (cam) => {
    const t = window.__fly.t;
    let start = 0;
    for (const sh of shots) {
      if (t <= sh.end || sh === shots[shots.length - 1]) {
        const u = Math.min(1, Math.max(0, (t - start) / (sh.end - start)));
        const { pos, look } = sh.f(u);
        const g = ground(pos[0], pos[2]);
        cam.position.set(pos[0], Math.max(pos[1], g + 2), pos[2]);
        cam.lookAt(look[0], look[1], look[2]);
        return;
      }
      start = sh.end;
    }
  };
  e.paused = true;
}, frames);

const t0 = Date.now();
const list = test ? test.map((t) => Math.round(t * FPS)) : [...Array(frames).keys()];
let prev = 0;
for (const f of list) {
  // test mode jumps: advance the world quickly to the requested time
  if (test) {
    await page.evaluate(async ([a, b]) => {
      for (let k = a; k < b; k++) {
        window.__fly.t = k / 30;
        window.engine.frame(1 / 30);
      }
    }, [prev, f]);
    prev = f;
  }
  await page.evaluate(async (t) => {
    window.__fly.t = t;
    const e = window.engine;
    e.frame(1 / 30);
    // let nearby terrain tiles stream in before the frame is kept
    const start = performance.now();
    while (e.world.terrain.pendingNear > 0 && performance.now() - start < 900) {
      await new Promise((r) => setTimeout(r, 50));
      e.frame(0);
    }
    await new Promise((r) => requestAnimationFrame(() => r()));
  }, f / FPS);
  await page.screenshot({ path: `${dir}/${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 });
  if (f % 60 === 0) console.log(`frame ${f}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
if (test) process.exit(0);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', `${dir}/%05d.jpg`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-movflags', '+faststart', out]);
console.log('wrote', out);

// Render the game camera from the exact position and heading of street-level reference photos
// and write side-by-side comparisons:
//   node scripts/match-shots.mjs <route> <manifest.json> [--only=ks_03,ks_13] [--time=noon] [--fov=62]
// For every manifest entry with a heading (KartaView), the camera is put at the photo's lat/lon,
// 1.45 m above the road (dashcam), looking along the heading. Output: shots/<route>/match/<file>.jpg
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
// values may contain '=' themselves
const flag = (k, d) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const [route, manifestPath] = args.filter((a) => !a.startsWith('--'));
const only = flag('only', '')?.split(',').filter(Boolean);
const time = flag('time', 'noon');
const fov = Number(flag('fov', '62'));
const py = flag('py', 'python3');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')).filter(
  (e) => e.heading !== null && e.heading !== undefined && (!only.length || only.some((o) => e.file.startsWith(o))),
);
const outDir = `shots/${route}/match`;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
for (const e of manifest) {
  const at = Math.max(0, Math.round(e.routeKm * 1000) - 30);
  await page.goto(`http://localhost:5199/?ride=${route}&sim=1&watts=0&at=${at}&cam=chase&time=${time}`);
  await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 150000, polling: 500 });
  await page.keyboard.press('h');
  await page.addStyleTag({ content: '.app > :not(canvas) { visibility: hidden !important; }' });
  await page.evaluate(({ lon, lat, heading, fov }) => {
    const eng = window.engine;
    const R = eng.world.route;
    const Rm = 6378137;
    const mx = (lon * Math.PI / 180) * Rm;
    const my = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * Rm;
    const x = (mx - R.frame.mx0) * R.frame.k;
    const z = -(my - R.frame.my0) * R.frame.k;
    // road height at the nearest route point
    let best = 1e9, y = 0;
    for (let i = 0; i < R.n; i++) {
      const d = (R.x[i] - x) ** 2 + (R.z[i] - z) ** 2;
      if (d < best) { best = d; y = R.ele[i]; }
    }
    const h = (heading * Math.PI) / 180;
    eng.camera.fov = fov;
    eng.camera.updateProjectionMatrix();
    eng.cameraOverride = (cam) => {
      // the dashcam view: hide our own rider
      eng.world.rider.visible = false;
      cam.position.set(x, y + 1.45, z);
      cam.lookAt(x + Math.sin(h) * 100, y + 1.45 - 2, z - Math.cos(h) * 100);
    };
    // the rider would be in the shot: park it out of view
    eng.riderS = 0;
  }, { lon: e.lon, lat: e.lat, heading: e.heading, fov });
  await page.waitForTimeout(7000);
  const shot = join(outDir, `${e.file.replace(/\.jpg$/, '')}-game.png`);
  await page.screenshot({ path: shot });
  const out = join(outDir, e.file.replace(/\.png$/, '.jpg'));
  execFileSync(py, ['-I', 'scripts/compare.py', join(dirname(manifestPath), e.file), shot, out, `${e.routeKm.toFixed(2)} km  heading ${Math.round(e.heading)}°`]);
  console.log(out);
}
await browser.close();

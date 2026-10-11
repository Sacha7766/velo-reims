// Close-up of the rider from the side: node scripts/probe-rider.mjs "<extra query>" out.png
import { chromium } from 'playwright';
const [extra = '', out = 'shots/rider.png', route = 'gaisberg', at = '6000'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`http://localhost:5199/?ride=${route}&sim=1&at=${at}&cam=chase&time=noon&${extra}`);
await page.waitForFunction(() => window.__ready, null, { timeout: 150000 });
await page.keyboard.press('h');
await page.waitForTimeout(6000);
const st = await page.evaluate(() => {
  const e = window.engine;
  const r = e.world.rider;
  e.cameraOverride = (cam) => {
    r.updateMatrixWorld();
    const p = r.localToWorld(new (cam.position.constructor)(2.6, 1.0, 0.1));
    const t = r.localToWorld(new (cam.position.constructor)(0, 0.85, 0.05));
    cam.position.copy(p);
    cam.lookAt(t);
  };
  return { stand: r.stand, cad: e.riderCadence, eff: e.riderEffort };
});
await page.waitForTimeout(700);
await page.screenshot({ path: out });
console.log(JSON.stringify(st));
await browser.close();

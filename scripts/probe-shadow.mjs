// Dump the terrain shadow texture + route overlay: node scripts/probe-shadow.mjs [time]
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
const time = process.argv[2] ?? 'golden';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
await page.goto(`http://localhost:5199/?ride=gaisberg&sim=1&at=100&cam=chase&time=${time}`);
await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 150000, polling: 500 });
await page.waitForTimeout(3000);
const url = await page.evaluate(() => {
  const e = window.engine;
  const sh = e.world.shadow;
  const N = 2048;
  const px = new Uint8Array(N * N * 4);
  e.renderer.readRenderTargetPixels(sh.target, 0, 0, N, N, px);
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(1024, 1024);
  for (let j = 0; j < 1024; j++) for (let i = 0; i < 1024; i++) {
    const s = ((j * 2) * N + i * 2) * 4, d = (j * 1024 + i) * 4;
    img.data[d] = img.data[d + 1] = img.data[d + 2] = px[s]; img.data[d + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // route in red; texture row 0 = z0 (north is -z, so row 0 is north → draw as-is)
  const r = e.world.route, rect = sh.near;
  ctx.fillStyle = 'red';
  for (let i = 0; i < r.n; i += 3) ctx.fillRect((r.x[i] - rect.x0) / rect.size * 1024, (r.z[i] - rect.z0) / rect.size * 1024, 2, 2);
  return c.toDataURL('image/png');
});
writeFileSync(`shots/gaisberg/shadowmap-${time}.png`, Buffer.from(url.split(',')[1], 'base64'));
await browser.close();

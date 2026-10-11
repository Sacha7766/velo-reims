import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
await page.goto('http://localhost:5199/');
await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
  try {
    const t0 = performance.now();
    const m = await import('/src/engine/groundTextures.ts');
    const g = m.groundTextures();
    return { ok: true, ms: Math.round(performance.now() - t0), w: g.grass.image.width };
  } catch (e) { return { ok: false, err: String(e), stack: e.stack?.slice(0, 400) }; }
});
console.log(JSON.stringify(r));
await browser.close();

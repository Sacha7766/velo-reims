import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
await page.goto('http://localhost:5199/?ride=gaisberg&sim=1&at=2000');
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: 'shots/gt-before.png' });
const which = process.argv[2] ?? 'all';
await page.evaluate(async (which) => {
  if (which === 'filter') {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d'); ctx.filter = 'blur(6px)'; ctx.fillRect(0, 0, 100, 100);
  } else if (which === 'plain') {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const ctx = c.getContext('2d'); ctx.fillRect(0, 0, 100, 100);
  } else {
    const t0 = performance.now(); const m = await import('/src/engine/groundTextures.ts'); m.groundTextures(); console.log('gt ms', performance.now() - t0);
  }
}, which);
await page.waitForTimeout(2000);
await page.screenshot({ path: 'shots/gt-after.png' });
await browser.close();

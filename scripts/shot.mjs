// Screenshot helper: node scripts/shot.mjs "<query>" out.png [extraWaitMs]
import { chromium } from 'playwright';
const [query = '', out = 'shots/shot.png', extra = '4000'] = process.argv.slice(2);
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
const logs = [];
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const t0 = Date.now();
await page.goto(`http://localhost:${process.env.PORT ?? 5199}/${query}`);
const gl = await page.evaluate(() => {
  const c = document.createElement('canvas').getContext('webgl2');
  const ext = c?.getExtension('WEBGL_debug_renderer_info');
  return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no webgl2';
});
console.log('GL:', gl);
if (query.includes('ride=') || query.includes('route=')) {
  try {
    await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 150000, polling: 500 });
  } catch { console.log('timeout waiting ready'); }
}
await page.waitForTimeout(Number(extra));
const info = await page.evaluate(() => ({ status: document.getElementById('status')?.textContent, err: window.__error, stats: window.engine?.stats }));
console.log('loaded in', ((Date.now() - t0) / 1000).toFixed(1), 's', JSON.stringify(info));
await page.screenshot({ path: out });
console.log(logs.slice(0, 15).join('\n'));
await browser.close();

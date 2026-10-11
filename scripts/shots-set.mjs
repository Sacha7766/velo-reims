// Batch screenshots for visual QA, HUD hidden:
//   node scripts/shots-set.mjs <prefix> "<at>:<cam>[:<time>]" ... [--route=gaisberg] [--wait=6000] [--hud]
// Writes shots/<route>/<prefix>-<at>-<cam>[-<time>].png
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
// values may contain '=' themselves (--extra=leadin=1&nobt=1)
const flag = (k, d) => (args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d);
const route = flag('route', 'gaisberg');
const wait = Number(flag('wait', '6000'));
const hud = args.includes('--hud');
const extra = flag('extra', '');
const [prefix, ...specs] = args.filter((a) => !a.startsWith('--'));
mkdirSync(`shots/${route}`, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
for (const spec of specs) {
  const [at, cam = 'chase', time = 'golden'] = spec.split(':');
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  const t0 = Date.now();
  await page.goto(`http://localhost:${process.env.PORT ?? 5199}/?ride=${route}&sim=1&at=${at}&cam=${cam}&time=${time}${extra ? `&${extra}` : ''}`);
  try {
    await page.waitForFunction(() => window.__ready || window.__error, null, { timeout: 150000, polling: 500 });
  } catch { console.log('timeout waiting ready'); }
  if (!hud) await page.keyboard.press('h');
  await page.waitForTimeout(wait);
  const info = await page.evaluate(() => ({ err: window.__error, stats: window.engine?.stats }));
  const out = `shots/${route}/${prefix}-${at}-${cam}${time !== 'golden' ? `-${time}` : ''}.png`;
  await page.screenshot({ path: out });
  console.log(out, ((Date.now() - t0) / 1000).toFixed(1) + 's', JSON.stringify(info.stats ?? info.err));
  if (logs.length) console.log(logs.slice(0, 8).join('\n'));
  await page.close();
}
await browser.close();

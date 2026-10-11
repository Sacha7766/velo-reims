// HUD readability check from the saddle: screenshots at a 16" MacBook Pro's size (1728x1117 CSS px, 2x) and a
// "from 2 m" copy. 1 arcminute at 2 m is 0.58 mm, about 2.9 CSS px on that display, so shrinking by 2.9 keeps
// what 20/20 vision resolves there; if a label is mush in the -2m image, it is mush on the bike.
//   node scripts/hud-shots.mjs <prefix> [climb,workout,segment,leadin,ready]
// Writes shots/hud/<prefix>-<case>.png and -2m.png. PORT defaults to 5199.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const [prefix = 'hud', only] = process.argv.slice(2);
const CASES = {
  climb: 'watts=260&at=3000',
  workout: 'watts=230&at=6000&workout=tempo-trio&bots=3.2,3.6',
  segment: 'watts=320&leadin=1&at=2860',
  leadin: 'watts=200&leadin=1&at=400',
  ready: 'watts=0&at=3000&go=0',
};
mkdirSync('shots/hud', { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const name of only ? only.split(',') : Object.keys(CASES)) {
  const page = await browser.newPage({ viewport: { width: 1728, height: 1117 }, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${process.env.PORT ?? 5199}/?ride=gaisberg&sim=1&nobt=1&${CASES[name]}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 180000 });
  // tiles settle, the rider gets going, VAM has its 30 s window filling
  await page.waitForTimeout(16000);
  const out = `shots/hud/${prefix}-${name}.png`;
  await page.screenshot({ path: out });
  execFileSync('python3', ['-c', `
from PIL import Image
im = Image.open('${out}').convert('RGB'); w, h = im.size
small = im.resize((round(w / 5.8), round(h / 5.8)), Image.LANCZOS)  # 2x device pixels, 2.9 CSS px per arcminute
small.resize((w // 2, h // 2), Image.BICUBIC).save('${out.replace('.png', '-2m.png')}')
`]);
  console.log(out);
  await page.close();
}
await browser.close();

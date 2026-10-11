// Ride through a route's end turnaround and log position: node scripts/probe-turn.mjs <route> <atFromEnd> <seconds> [cam]
import { chromium } from 'playwright';
const [route = 'gaisberg', back = '60', secs = '40', cam = 'chase'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:5199/?ride=${route}&sim=1&watts=320&at=0&cam=${cam}&time=noon&go=0`);
await page.waitForFunction(() => window.__ready, null, { timeout: 150000 });
const L = await page.evaluate(() => window.engine.world.route.length);
await page.goto(`http://localhost:5199/?ride=${route}&sim=1&watts=320&at=${Math.round(L - Number(back))}&cam=${cam}&time=noon`);
await page.waitForFunction(() => window.__ready, null, { timeout: 150000 });
await page.keyboard.press('h');
console.log('length', L.toFixed(0));
for (let t = 0; t < Number(secs); t += 3) {
  await page.waitForTimeout(3000);
  const st = await page.evaluate(() => ({ s: window.engine.riderS, dir: window.engine.riderDir }));
  console.log(`t=${t + 3}s s=${st.s.toFixed(1)} dir=${st.dir}`);
  if (t % 6 === 0) await page.screenshot({ path: `shots/${route}/turn-${String(t + 3).padStart(2, '0')}.png` });
}
await browser.close();

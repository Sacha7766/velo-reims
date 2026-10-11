import { chromium } from 'playwright';
const [query] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });
page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') console.log('[' + m.type() + ']', m.text().slice(0, 160)); });
const t0 = Date.now();
await page.goto(`http://localhost:5199/${query}`);
let last = '';
while (Date.now() - t0 < 240000) {
  const st = await page.evaluate(() => ({ stage: document.querySelector('.l-stage')?.textContent ?? '', ready: !!window.__ready }));
  if (st.stage !== last) { console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', st.stage); last = st.stage; }
  if (st.ready) { console.log(((Date.now() - t0) / 1000).toFixed(1) + 's READY'); break; }
  await page.waitForTimeout(500);
}
await browser.close();

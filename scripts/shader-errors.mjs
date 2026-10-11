import { chromium } from 'playwright';
const [query] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
page.on('console', async (m) => {
  if (m.type() !== 'error' && m.type() !== 'warning') return;
  const parts = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => '?')));
  const text = parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ');
  const lines = text.split('\n');
  const errIdx = lines.findIndex((l) => /ERROR|Program Info Log|error:/i.test(l));
  console.log(lines.slice(0, 3).join('\n'), '\n...\n', errIdx >= 0 ? lines.slice(errIdx, errIdx + 8).join('\n') : '');
});
await page.goto(`http://localhost:${process.env.PORT ?? 5199}/${query}`);
await page.waitForFunction(() => window.__ready, null, { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(2000);
await browser.close();

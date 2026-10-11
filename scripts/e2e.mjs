// End-to-end: home → simulator → pick climb + workout → ride → end → summary → .fit → history
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
const step = (s) => console.log(`· ${s}`);

await page.goto(`http://localhost:${process.env.PORT ?? 5199}/`);
await page.getByRole('button', { name: 'Settings', exact: true }).click();
await page.getByText('Keyboard simulator').click();
step('simulator on');
await page.getByRole('button', { name: 'Ride', exact: true }).click();
await page.locator('.route-row', { hasText: 'Kitzbüheler Horn' }).click();
await page.getByRole('radio', { name: 'Hold watts' }).click();
const startLabel = await page.locator('.start-main').textContent();
step(`start button: "${startLabel}"`);
await page.locator('.start').click();
await page.waitForSelector('.loading');
step('loading screen');
await page.screenshot({ path: 'shots/e2e-loading.png' });
await page.waitForSelector('.hud', { timeout: 120000 });
step('hud visible, status ready');
await page.waitForTimeout(1500);
await page.screenshot({ path: 'shots/e2e-ready.png' });
for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowUp');
await page.waitForTimeout(20000);
for (let i = 0; i < 3; i++) await page.keyboard.press('BracketRight');
await page.keyboard.press('Equal');
await page.waitForTimeout(3000);
console.log('gearbox:', await page.locator('.gearbox').first().textContent().catch(() => 'none'));
await page.screenshot({ path: 'shots/e2e-riding.png' });
const hud = await page.evaluate(() => ({
  power: document.querySelector('.hud-power .value')?.textContent,
  stats: [...document.querySelectorAll('.hud-stats .stat')].map((s) => s.textContent),
  interval: document.querySelector('.hud-workout .interval')?.textContent,
  grade: document.querySelector('.grade-sign')?.getAttribute('aria-label'),
}));
step(`riding: ${JSON.stringify(hud)}`);
await page.keyboard.press('Digit2');
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shots/e2e-drone.png' });
await page.keyboard.press('Digit3');
await page.waitForTimeout(2500);
await page.screenshot({ path: 'shots/e2e-moto.png' });
await page.keyboard.press('Digit1');
await page.waitForTimeout(12000);
await page.keyboard.press('Escape');
await page.getByRole('button', { name: 'Save and finish' }).click();
await page.waitForSelector('.summary');
step('summary visible');
await page.waitForTimeout(800);
await page.screenshot({ path: 'shots/e2e-summary.png' });
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Download \.fit/ }).click()]);
const path = `shots/${dl.suggestedFilename()}`;
await dl.saveAs(path);
step(`downloaded ${path}`);
await page.getByRole('button', { name: 'Back to climbs' }).click();
await page.waitForSelector('.ride-tab');
step(`hero after ride: ${await page.locator('.hero-stats').textContent()}`);
await page.getByRole('button', { name: 'History', exact: true }).click();
await page.waitForSelector('.history-embedded .ride-table tr');
step(`history page rides: ${await page.locator('.ride-table tr').count()}`);
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/e2e-history.png' });
await page.locator('.ride-table tr').first().click();
await page.waitForSelector('.summary');
step(`detail: ${await page.locator('.s-title').textContent()}`);
await page.screenshot({ path: 'shots/e2e-home-after.png', fullPage: false });
console.log(errors.length ? `ERRORS:\n${errors.join('\n')}` : 'no page errors');
await browser.close();

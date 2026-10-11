import { chromium } from 'playwright';
const [query] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:5199/${query}`);
await page.waitForFunction(() => window.__ready, null, { timeout: 150000, polling: 500 });
await page.keyboard.press('h');
await page.waitForTimeout(3000);
const shot = async (name, fn) => {
  await page.evaluate(fn);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `shots/iso-${name}.png` });
  const dark = await page.evaluate(() => 0);
  console.log('shot', name);
};
await shot('all', 'void 0');
await shot('nobuild', 'engine.world.buildings && (engine.world.buildings.visible = false)');
await shot('notrees', 'engine.world.trees && (engine.world.trees.visible = false)');
await shot('noterrain', 'engine.world.terrain.visible = false');
await shot('nothing', 'engine.world.road.visible = false; engine.world.rider.visible=false;');
const info = await page.evaluate(() => {
  const bad = [];
  engine.scene.traverse((o) => {
    const p = o.geometry?.attributes?.position;
    if (!p) return;
    for (let i = 0; i < p.array.length; i++) if (!Number.isFinite(p.array[i])) { bad.push(o.type + ':' + (o.parent?.constructor?.name)); break; }
    if (o.isInstancedMesh) { const a = o.instanceMatrix.array; for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])) { bad.push('inst:' + o.parent?.constructor?.name); break; } }
  });
  return { bad: [...new Set(bad)], cam: engine.camera.position.toArray() };
});
console.log(JSON.stringify(info));
await browser.close();

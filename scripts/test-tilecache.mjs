// Service-worker tile cache + prefetch test. Starts its own Vite on :5397 (never the owner's :5199).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 5397;
const DATA = '/private/tmp/claude-501/serp-sw';
mkdirSync(DATA, { recursive: true });
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  env: { ...process.env, SERPENTINE_DATA: DATA },
  stdio: 'ignore',
});
const base = `http://localhost:${PORT}`;
let browser;
const fail = [];
const check = (name, ok, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${info}`);
  if (!ok) fail.push(name);
};
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) break; } catch { /* wait */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  browser = await chromium.launch({ channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto(base);

  const reg = await page.evaluate(async () => {
    const m = await import('/src/geo/tileCache.ts');
    await m.clearTileCache();
    const ok = await m.registerTileCache();
    // make sure this page is controlled (claim may race the first load)
    if (!navigator.serviceWorker.controller) await new Promise((r) => setTimeout(r, 500));
    return { ok, controlled: !!navigator.serviceWorker.controller };
  });
  check('register', reg.ok, JSON.stringify(reg));
  if (!reg.controlled) { await page.reload(); }

  const urls = [
    'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/2188/1424.png',
    'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/2189/1424.png',
    'https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/17/46960/70200.jpeg',
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/11740/17520',
  ];
  const r = await page.evaluate(async (urls) => {
    const out = { controlled: !!navigator.serviceWorker.controller, t1: [], t2: [], cached: [], pass: [] };
    const run = async (arr) => {
      for (const u of urls) {
        const t = performance.now();
        const res = await fetch(u);
        await res.arrayBuffer();
        arr.push({ status: res.status, ms: Math.round(performance.now() - t) });
      }
    };
    await run(out.t1);
    await run(out.t2);
    const cache = await caches.open('serpentine-tiles-v1');
    for (const u of urls) out.cached.push(!!(await cache.match(u)));
    // non-tile host must not be cached
    await fetch('/routes/index.json').then((x) => x.text());
    out.appCached = !!(await cache.match('/routes/index.json'));
    return out;
  }, urls);
  console.log(JSON.stringify(r));
  check('page controlled', r.controlled);
  r.t1.forEach((x, i) => {
    if (x.status === 200) check(`cached tile ${i}`, r.cached[i], `1st ${x.ms}ms 2nd ${r.t2[i].ms}ms`);
    else console.log(`tile ${i} status ${x.status} (skipped)`);
  });
  check('app files not cached', !r.appCached);

  const pf = await page.evaluate(async () => {
    const { buildRoute } = await import('/src/geo/route.ts');
    const { prefetchRoute } = await import('/src/geo/prefetch.ts');
    const { sourcesFor } = await import('/src/geo/imagery.ts');
    const { tileCacheStats } = await import('/src/geo/tileCache.ts');
    const data = await (await fetch('/routes/gaisberg.json')).json();
    const route = await buildRoute(data);
    const sources = sourcesFor(route.lon[0], route.lat[0]);
    const before = (await tileCacheStats()).entries;
    let last = [0, 0];
    const t = performance.now();
    const res = await prefetchRoute(route, { sources, limit: 60, onProgress: (d, n) => (last = [d, n]) });
    const pre = new AbortController(); pre.abort();
    const full = await prefetchRoute(route, { sources, signal: pre.signal });
    const ctl = new AbortController();
    const p = prefetchRoute(route, { sources, signal: ctl.signal, limit: 300 });
    setTimeout(() => ctl.abort(), 150);
    const ab = await p;
    return { res, ms: Math.round(performance.now() - t), last, before, after: (await tileCacheStats()).entries, ab, fullPlan: full.total };
  });
  console.log(JSON.stringify(pf));
  check('prefetch fetched tiles', pf.res.fetched > 0 && pf.res.failed < pf.res.total, JSON.stringify(pf.res));
  check('progress reached total', pf.last[0] === pf.last[1] && pf.last[1] === pf.res.total);
  check('cache grew', pf.after > pf.before, `${pf.before} -> ${pf.after}`);
  check('abort works', pf.ab.aborted);
} finally {
  await browser?.close();
  vite.kill('SIGTERM');
}
process.exit(fail.length ? 1 : 0);

// The Mac app's local server (electron/server.ts) with the rides API (server/api.ts): rides are saved, and
// requests from other websites or rebound host names are turned away. Runs on its own port with a scratch
// data folder, never the owner's ~/Documents/Serpentine or a running app's :5198.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const data = mkdtempSync(join(tmpdir(), 'serpentine-api-'));
// read by server/api.ts when it loads
process.env.SERPENTINE_DATA = data;
const dist = join(data, 'dist');
mkdirSync(dist);
writeFileSync(join(dist, 'index.html'), '<!doctype html><title>Serpentine</title>');
const { startServer } = await import('../electron/server.ts');

const PORT = 5296;
const SELF = `http://localhost:${PORT}`;
const server = await startServer(dist, PORT);

function call(method: string, path: string, headers: Record<string, string> = {}, body?: string): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: PORT, method, path, headers: { host: `localhost:${PORT}`, ...headers } }, (res) => {
      let text = '';
      res.on('data', (c: Buffer) => (text += c.toString()));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, text }));
    });
    req.on('error', reject);
    req.end(body);
  });
}
// what the app's own page sends
const page = { origin: SELF, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' };
const ride = (name: string) =>
  JSON.stringify({ record: { start: Date.UTC(2026, 9, 24, 8), name }, summary: { start: Date.UTC(2026, 9, 24, 8), name }, rider: 'Test' });

let n = 0;
async function t(name: string, fn: () => Promise<void>) {
  await fn();
  n++;
  console.log(`ok ${name}`);
}

try {
  await t('health and the app page', async () => {
    assert.equal((await call('GET', '/api/health')).status, 200);
    assert.equal((await call('GET', '/')).status, 200);
  });

  await t('the page saves a ride', async () => {
    const r = await call('PUT', '/api/rides/test-ride-1', page, ride('Gaisberg'));
    assert.equal(r.status, 200, r.text);
    const file = (JSON.parse(r.text) as { file: string }).file;
    assert.ok(existsSync(join(data, 'rides', `${file}.json`)));
    const list = JSON.parse((await call('GET', '/api/rides')).text) as { name: string }[];
    assert.deepEqual(list.map((s) => s.name), ['Gaisberg']);
  });

  await t('scripts without an Origin still work', async () => {
    assert.equal((await call('PUT', '/api/rides/test-ride-2', { 'content-type': 'application/json' }, ride('Script'))).status, 200);
  });

  await t('another website cannot change the Strava app', async () => {
    const body = JSON.stringify({ clientId: '12345', clientSecret: 'x' });
    const evil = await call('POST', '/api/strava/config', { origin: 'https://evil.example', 'content-type': 'text/plain' }, body);
    assert.equal(evil.status, 403);
    const fetchMeta = await call('POST', '/api/strava/config', { 'sec-fetch-site': 'cross-site', 'content-type': 'text/plain' }, body);
    assert.equal(fetchMeta.status, 403);
    // localhost on another port is another origin (the Chrome version on :5199 talks to its own server)
    const otherPort = await call('POST', '/api/strava/config', { origin: 'http://localhost:5199', 'content-type': 'text/plain' }, body);
    assert.equal(otherPort.status, 403);
    assert.ok(!existsSync(join(data, 'strava.json')));
  });

  await t('another website cannot delete or open', async () => {
    assert.equal((await call('DELETE', '/api/rides/test-ride-1', { origin: 'https://evil.example' })).status, 403);
    assert.equal((await call('POST', '/api/open', { origin: 'https://evil.example' })).status, 403);
    assert.equal((JSON.parse((await call('GET', '/api/rides')).text) as unknown[]).length, 2);
  });

  await t('a rebound host name gets nothing', async () => {
    assert.equal((await call('GET', '/api/rides', { host: 'evil.example' })).status, 403);
  });

  await t('ride ids cannot leave the rides folder', async () => {
    assert.equal((await call('PUT', '/api/rides/..%2F..%2Fescape', page, ride('x'))).status, 400);
  });

  await t('errors do not leak details', async () => {
    const r = await call('PUT', '/api/rides/test-ride-3', page, '{not json');
    assert.equal(r.status, 500);
    assert.deepEqual(JSON.parse(r.text), { error: 'Server error' });
  });
} finally {
  server.close();
  rmSync(data, { recursive: true, force: true });
}
console.log(`${n} api tests passed`);

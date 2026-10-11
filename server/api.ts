// Local ride storage for the dev/preview server: rides live as .json + .fit files in
// ~/Documents/Serpentine/rides so history survives browser resets and the .fit files
// can be dragged straight into Strava.

import { exec } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { createStrava } from './strava.ts';

const ROOT = process.env.SERPENTINE_DATA ?? join(homedir(), 'Documents', 'Serpentine');
const RIDES = join(ROOT, 'rides');
const INDEX = join(RIDES, 'index.json');
const strava = createStrava(ROOT);

interface IndexEntry {
  id: string;
  file: string; // base name without extension
  summary: Record<string, unknown>;
}

function readIndex(): IndexEntry[] {
  try {
    return JSON.parse(readFileSync(INDEX, 'utf8')) as IndexEntry[];
  } catch {
    return [];
  }
}

function writeIndex(entries: IndexEntry[]) {
  mkdirSync(RIDES, { recursive: true });
  const tmp = `${INDEX}.tmp`;
  writeFileSync(tmp, JSON.stringify(entries, null, 1));
  renameSync(tmp, INDEX);
}

const safeId = (id: string) => /^[a-z0-9-]{3,80}$/i.test(id);

function slug(s: string) {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

function body(req: IncomingMessage, limit = 80e6): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('body too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(data));
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://local');
  const parts = url.pathname.split('/').filter(Boolean); // after /api
  try {
    if (parts[0] === 'health') return send(res, 200, { ok: true, dir: RIDES });
    if (parts[0] === 'strava') return strava(req, res, url, parts);
    if (parts[0] === 'open' && req.method === 'POST') {
      mkdirSync(RIDES, { recursive: true });
      exec(`open ${JSON.stringify(RIDES)}`);
      return send(res, 200, { ok: true });
    }
    if (parts[0] === 'store') {
      const key = parts[1] ?? '';
      if (!/^[a-z0-9-]{1,40}$/.test(key) || parts.length > 2) return send(res, 400, { error: 'bad key' });
      const file = join(ROOT, 'data', `${key}.json`);
      if (req.method === 'GET') {
        res.statusCode = 200;
        res.setHeader('content-type', 'application/json');
        return res.end(existsSync(file) ? readFileSync(file) : 'null');
      }
      if (req.method === 'PUT') {
        const text = await body(req, 20e6);
        JSON.parse(text);
        mkdirSync(join(ROOT, 'data'), { recursive: true });
        const tmp = `${file}.tmp`;
        writeFileSync(tmp, text);
        renameSync(tmp, file);
        return send(res, 200, { ok: true });
      }
      return send(res, 405, { error: 'method' });
    }
    if (parts[0] !== 'rides') return send(res, 404, { error: 'not found' });
    const id = parts[1];
    if (!id) {
      if (req.method === 'GET') return send(res, 200, readIndex().map((e) => e.summary));
      return send(res, 405, { error: 'method' });
    }
    if (!safeId(id)) return send(res, 400, { error: 'bad id' });
    const entries = readIndex();
    const entry = entries.find((e) => e.id === id);
    if (req.method === 'GET') {
      if (!entry) return send(res, 404, { error: 'no such ride' });
      res.setHeader('content-type', 'application/json');
      return res.end(readFileSync(join(RIDES, `${entry.file}.json`)));
    }
    if (req.method === 'PUT') {
      const { record, summary, fit, rider } = JSON.parse(await body(req)) as {
        record: { start: number; name: string };
        summary: Record<string, unknown>;
        fit?: string;
        /** Rider profile name, part of the file name so a household's rides stay apart. */
        rider?: string;
      };
      mkdirSync(RIDES, { recursive: true });
      const d = new Date(record.start);
      const pad = (n: number) => String(n).padStart(2, '0');
      const file =
        entry?.file ??
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}_${rider && slug(rider) ? `${slug(rider)}_` : ''}${slug(record.name) || 'ride'}`;
      writeFileSync(join(RIDES, `${file}.json`), JSON.stringify(record));
      if (fit) writeFileSync(join(RIDES, `${file}.fit`), Buffer.from(fit, 'base64'));
      writeIndex([{ id, file, summary }, ...entries.filter((e) => e.id !== id)].sort((a, b) => Number(b.summary.start) - Number(a.summary.start)));
      return send(res, 200, { ok: true, file });
    }
    if (req.method === 'DELETE') {
      if (entry) {
        for (const ext of ['json', 'fit']) {
          const f = join(RIDES, `${entry.file}.${ext}`);
          if (existsSync(f)) unlinkSync(f);
        }
        writeIndex(entries.filter((e) => e.id !== id));
      }
      return send(res, 200, { ok: true });
    }
    return send(res, 405, { error: 'method' });
  } catch (e) {
    return send(res, 500, { error: (e as Error).message });
  }
}

export function serpentineApi(): Plugin {
  const mount = (mw: { use: (path: string, fn: (req: IncomingMessage, res: ServerResponse) => void) => void }) =>
    mw.use('/api', (req, res) => void handle(req, res));
  return {
    name: 'serpentine-api',
    configureServer(server) {
      mount(server.middlewares);
    },
    configurePreviewServer(server) {
      mount(server.middlewares);
    },
  };
}

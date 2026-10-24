// The app's local server: the built web app from dist/ plus the same /api the dev server mounts (rides on
// disk, Strava). Pages stay on http://localhost:<port> so storage, the tile service worker and Strava's
// localhost callback work exactly as in Chrome.

import { createReadStream, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { serpentineApi } from '../server/api.ts';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.gpx': 'application/gpx+xml',
};

/** The API is the Vite plugin the dev server uses; its preview hook hands over the handler. */
function apiHandler(): Handler {
  let handler: Handler | undefined;
  const hook = serpentineApi().configurePreviewServer as (server: unknown) => void;
  hook({ middlewares: { use: (_path: string, fn: Handler) => (handler = fn) } });
  if (!handler) throw new Error('serpentine-api did not mount');
  return handler;
}

function serveFile(root: string, req: IncomingMessage, res: ServerResponse, pathname: string) {
  let file = normalize(join(root, decodeURIComponent(pathname)));
  if (file !== root && !file.startsWith(root + sep)) {
    res.statusCode = 403;
    return res.end();
  }
  let stat = statSync(file, { throwIfNoEntry: false });
  if (stat?.isDirectory()) {
    file = join(file, 'index.html');
    stat = statSync(file, { throwIfNoEntry: false });
  }
  if (!stat && !extname(file)) {
    // one-page app: unknown paths without an extension get the app
    file = join(root, 'index.html');
    stat = statSync(file, { throwIfNoEntry: false });
  }
  if (!stat) {
    res.statusCode = 404;
    return res.end();
  }
  res.setHeader('content-type', TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream');
  res.setHeader('content-length', stat.size);
  // hashed bundles never change; everything else (index.html, sw.js, baked route data) may with an update
  res.setHeader('cache-control', pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).on('error', () => res.destroy()).pipe(res);
}

/** Serve `root` and the API on localhost only. Resolves once both loopback addresses listen. */
export async function startServer(root: string, port: number): Promise<{ close: () => void }> {
  const api = apiHandler();
  const hosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`]);
  const handle: Handler = (req, res) => {
    // a web page that rebinds its own domain to 127.0.0.1 must not reach the rides or the Strava tokens
    if (!hosts.has(req.headers.host ?? '')) {
      res.statusCode = 403;
      return res.end();
    }
    const url = new URL(req.url ?? '/', 'http://local');
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      req.url = (req.url ?? '/').slice(4) || '/';
      return api(req, res);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      return res.end();
    }
    try {
      serveFile(root, req, res, url.pathname);
    } catch {
      res.statusCode = 500;
      res.end();
    }
  };
  // Chromium may try either loopback address for "localhost"
  const listen = (host: string) =>
    new Promise<Server | null>((resolve, reject) => {
      const server = createServer(handle);
      server.once('error', (e: NodeJS.ErrnoException) =>
        host === '::1' && e.code === 'EADDRNOTAVAIL' ? resolve(null) : reject(e),
      );
      server.listen(port, host, () => resolve(server));
    });
  const servers = [await listen('127.0.0.1'), await listen('::1')];
  return { close: () => servers.forEach((s) => s?.close()) };
}

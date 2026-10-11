// Strava segments for preset routes, through the official API with the owner's own API application
// (https://www.strava.com/settings/api). Credentials and tokens live in the data directory next to the
// rides (strava.json, mode 600), never in the repo and never in logs. No scraping.
//
// Along-route distances (startS / endS) are computed on the raw route coordinates with haversine.
// The app resamples and smooths the route (src/geo/route.ts), so these differ from the app's own
// distances by a fraction of a percent, which is close enough for segment start/finish lines.

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join } from 'node:path';
import { cumulativeDistances, parseStravaTime, projectOnRoute, type StravaSegment } from '../src/sim/strava.ts';

const API = 'https://www.strava.com/api/v3';
const TTL = 7 * 24 * 3600 * 1000;
const NEAR = 40; // m from the route polyline
const MAX_CANDIDATES = 25;

interface Stored {
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  /** Epoch seconds. */
  expiresAt?: number;
  athlete?: string;
}

class StravaError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface SegmentSummary {
  id: number;
  name?: string;
  distance?: number;
  avg_grade?: number;
  average_grade?: number;
  start_latlng?: [number, number] | null;
  end_latlng?: [number, number] | null;
}

interface SegmentDetail extends SegmentSummary {
  xoms?: { kom?: string; qom?: string; overall?: string } | null;
  athlete_segment_stats?: { pr_elapsed_time?: number; pr_date?: string; effort_count?: number } | null;
}

interface Cache {
  at: number;
  segments: StravaSegment[];
}

function send(res: ServerResponse, status: number, data: unknown, headers: Record<string, string> = {}) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(data));
}

function redirect(res: ServerResponse, to: string) {
  res.statusCode = 302;
  res.setHeader('location', to);
  res.end();
}

function body(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > 20_000) {
        reject(new Error('body too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

export function createStrava(root: string) {
  const configFile = join(root, 'strava.json');
  let oauthState: string | null = null;
  const inflight = new Map<string, Promise<{ segments: StravaSegment[]; warning?: string }>>();

  function load(): Stored {
    try {
      return JSON.parse(readFileSync(configFile, 'utf8')) as Stored;
    } catch {
      return {};
    }
  }

  function save(s: Stored) {
    mkdirSync(root, { recursive: true });
    const tmp = `${configFile}.tmp`;
    writeFileSync(tmp, JSON.stringify(s, null, 1), { mode: 0o600 });
    renameSync(tmp, configFile);
  }

  /** Token endpoint call for both the code exchange and the refresh; stores the result. */
  async function tokenRequest(params: Record<string, string>): Promise<Stored> {
    const s = load();
    if (!s.clientId || !s.clientSecret) throw new StravaError(400, 'Strava client id and secret are not set');
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: s.clientId, client_secret: s.clientSecret, ...params }),
    });
    if (!res.ok) throw new StravaError(res.status, `Strava token request failed (${res.status})`);
    const j = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
      athlete?: { firstname?: string; lastname?: string };
    };
    const next: Stored = {
      ...s,
      accessToken: j.access_token,
      refreshToken: j.refresh_token,
      expiresAt: j.expires_at,
      athlete: j.athlete ? [j.athlete.firstname, j.athlete.lastname].filter(Boolean).join(' ') : s.athlete,
    };
    save(next);
    return next;
  }

  async function accessToken(): Promise<string> {
    let s = load();
    if (!s.refreshToken) throw new StravaError(401, 'Strava is not connected');
    if (!s.accessToken || (s.expiresAt ?? 0) < Date.now() / 1000 + 60) {
      s = await tokenRequest({ grant_type: 'refresh_token', refresh_token: s.refreshToken });
    }
    return s.accessToken!;
  }

  async function get<T>(path: string, retry = true): Promise<T> {
    const res = await fetch(`${API}${path}`, { headers: { authorization: `Bearer ${await accessToken()}` } });
    if (res.status === 401 && retry) {
      // access token revoked or expired early: force one refresh
      const s = load();
      save({ ...s, expiresAt: 0 });
      return get<T>(path, false);
    }
    if (!res.ok) throw new StravaError(res.status, `Strava ${res.status} for ${path.split('?')[0]}`);
    return (await res.json()) as T;
  }

  // ---- segments on a route ----

  function routeCoords(id: string): number[][] | null {
    for (const dir of ['public', 'dist']) {
      const f = join(process.cwd(), dir, 'routes', `${id}.json`);
      if (existsSync(f)) {
        try {
          return (JSON.parse(readFileSync(f, 'utf8')) as { coords: number[][] }).coords;
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  function cacheFile(route: string) {
    return join(root, `strava-segments-${route}.json`);
  }

  function readCache(route: string): Cache | null {
    try {
      return JSON.parse(readFileSync(cacheFile(route), 'utf8')) as Cache;
    } catch {
      return null;
    }
  }

  async function computeSegments(route: string, coords: number[][]): Promise<StravaSegment[]> {
    const cum = cumulativeDistances(coords);
    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const pad = 0.002;
    const w = Math.min(...lons) - pad;
    const e = Math.max(...lons) + pad;
    const s = Math.min(...lats) - pad;
    const n = Math.max(...lats) + pad;
    // explore returns at most 10 segments per box, so long routes are split into a grid
    const cells = cum[cum.length - 1] > 5000 ? 3 : 1;
    const found = new Map<number, SegmentSummary>();
    for (let i = 0; i < cells; i++) {
      for (let j = 0; j < cells; j++) {
        const b = [s + ((n - s) * j) / cells, w + ((e - w) * i) / cells, s + ((n - s) * (j + 1)) / cells, w + ((e - w) * (i + 1)) / cells];
        const r = await get<{ segments?: SegmentSummary[] }>(`/segments/explore?bounds=${b.map((x) => x.toFixed(6)).join(',')}&activity_type=riding`);
        for (const seg of r.segments ?? []) found.set(seg.id, seg);
      }
    }
    try {
      for (const seg of await get<SegmentSummary[]>('/segments/starred?per_page=100')) found.set(seg.id, { ...found.get(seg.id), ...seg });
    } catch (err) {
      if (err instanceof StravaError && err.status === 429) throw err;
      /* starred is optional */
    }

    // cheap pre-filter on the summary: both ends within reach of the route, riding the route's way
    const candidates: SegmentSummary[] = [];
    for (const seg of found.values()) {
      if (!seg.start_latlng || !seg.end_latlng) continue;
      const a = projectOnRoute(coords, cum, seg.start_latlng[1], seg.start_latlng[0]);
      const b = projectOnRoute(coords, cum, seg.end_latlng[1], seg.end_latlng[0]);
      if (a.dist <= NEAR && b.dist <= NEAR && b.s > a.s) candidates.push(seg);
    }

    const out: StravaSegment[] = [];
    for (const c of candidates.slice(0, MAX_CANDIDATES)) {
      const d = await get<SegmentDetail>(`/segments/${c.id}`);
      const start = d.start_latlng ?? c.start_latlng;
      const end = d.end_latlng ?? c.end_latlng;
      if (!start || !end) continue;
      const a = projectOnRoute(coords, cum, start[1], start[0]);
      const b = projectOnRoute(coords, cum, end[1], end[0]);
      if (a.dist > NEAR || b.dist > NEAR || b.s <= a.s + 50) continue;
      const distance = d.distance ?? c.distance ?? b.s - a.s;
      if (Math.abs(b.s - a.s - distance) / distance > 0.35) continue; // took a different road
      // geometry: most of the segment's own track has to lie on the route
      try {
        const streams = await get<{ latlng?: { data: [number, number][] } }>(`/segments/${c.id}/streams?keys=latlng,distance,altitude&key_by_type=true`);
        const pts = streams.latlng?.data ?? [];
        if (pts.length > 4) {
          const every = Math.max(1, Math.floor(pts.length / 40));
          const sampled = pts.filter((_, i) => i % every === 0);
          const near = sampled.filter((p) => projectOnRoute(coords, cum, p[1], p[0]).dist <= NEAR).length;
          if (near / sampled.length < 0.85) continue;
        }
      } catch (err) {
        if (err instanceof StravaError && err.status === 429) throw err;
        /* no stream, the end points have to do */
      }
      const stats = d.athlete_segment_stats;
      out.push({
        id: d.id,
        name: d.name ?? c.name ?? `Segment ${d.id}`,
        distance,
        averageGrade: d.average_grade ?? c.avg_grade ?? c.average_grade ?? 0,
        kom: parseStravaTime(d.xoms?.kom ?? d.xoms?.overall),
        qom: parseStravaTime(d.xoms?.qom),
        prSeconds: typeof stats?.pr_elapsed_time === 'number' ? stats.pr_elapsed_time : null,
        prDate: stats?.pr_date ?? null,
        effortCount: typeof stats?.effort_count === 'number' ? stats.effort_count : null,
        startS: Math.round(a.s),
        endS: Math.round(b.s),
      });
    }
    out.sort((x, y) => x.startS - y.startS);
    mkdirSync(root, { recursive: true });
    writeFileSync(cacheFile(route), JSON.stringify({ at: Date.now(), segments: out } satisfies Cache));
    return out;
  }

  async function segmentsFor(route: string, refresh: boolean): Promise<{ segments: StravaSegment[]; warning?: string }> {
    const coords = routeCoords(route);
    if (!coords) throw new StravaError(404, 'no such preset route');
    const cached = readCache(route);
    if (cached && !refresh && Date.now() - cached.at < TTL) return { segments: cached.segments };
    try {
      return { segments: await computeSegments(route, coords) };
    } catch (err) {
      if (err instanceof StravaError && err.status === 429) {
        return { segments: cached?.segments ?? [], warning: 'Strava rate limit reached, showing cached data' };
      }
      throw err;
    }
  }

  function origin(req: IncomingMessage): string {
    const host = req.headers.host ?? '';
    return /^localhost:\d+$/.test(host) ? `http://${host}` : 'http://localhost:5199';
  }

  /** Handles /api/strava/*; `parts` are the path segments after /api. */
  return async function handle(req: IncomingMessage, res: ServerResponse, url: URL, parts: string[]) {
    try {
      const what = parts[1];
      if (what === 'status' && req.method === 'GET') {
        const s = load();
        return send(res, 200, { configured: !!(s.clientId && s.clientSecret), connected: !!s.refreshToken, athlete: s.athlete ?? null, clientId: s.clientId ?? null });
      }
      if (what === 'config' && req.method === 'POST') {
        const { clientId, clientSecret } = JSON.parse(await body(req)) as { clientId?: string; clientSecret?: string };
        const id = String(clientId ?? '').trim();
        const secret = String(clientSecret ?? '').trim();
        if (!/^\d{1,10}$/.test(id)) return send(res, 400, { error: 'Client ID is the number shown on the Strava API page' });
        const s = load();
        const nextSecret = secret || (s.clientId === id ? s.clientSecret : undefined);
        if (!nextSecret) return send(res, 400, { error: 'Client secret is missing' });
        // a different application invalidates the old tokens
        const same = s.clientId === id && s.clientSecret === nextSecret;
        save(same ? s : { clientId: id, clientSecret: nextSecret });
        return send(res, 200, { ok: true });
      }
      if (what === 'connect' && req.method === 'GET') {
        const s = load();
        if (!s.clientId || !s.clientSecret) return redirect(res, '/?strava=unconfigured');
        oauthState = randomBytes(12).toString('hex');
        const q = new URLSearchParams({
          client_id: s.clientId,
          response_type: 'code',
          redirect_uri: `${origin(req)}/api/strava/callback`,
          approval_prompt: 'auto',
          scope: 'read,activity:read',
          state: oauthState,
        });
        return redirect(res, `https://www.strava.com/oauth/authorize?${q}`);
      }
      if (what === 'callback' && req.method === 'GET') {
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        if (url.searchParams.get('error') || !code) return redirect(res, '/?strava=denied');
        if (!oauthState || state !== oauthState) return redirect(res, '/?strava=error');
        oauthState = null;
        await tokenRequest({ grant_type: 'authorization_code', code });
        return redirect(res, '/?strava=connected');
      }
      if (what === 'segments' && req.method === 'GET') {
        const route = url.searchParams.get('route') ?? '';
        if (!/^[a-z0-9-]{1,60}$/i.test(route)) return send(res, 400, { error: 'bad route' });
        const s = load();
        if (!s.refreshToken) return send(res, 401, { error: 'Strava is not connected' });
        const refresh = url.searchParams.get('refresh') === '1';
        let job = inflight.get(route);
        if (!job) {
          job = segmentsFor(route, refresh).finally(() => inflight.delete(route));
          inflight.set(route, job);
        }
        const { segments, warning } = await job;
        return send(res, 200, segments, warning ? { 'x-strava-warning': warning } : {});
      }
      return send(res, 404, { error: 'not found' });
    } catch (e) {
      // messages here never contain tokens or secrets (see StravaError)
      const status = e instanceof StravaError ? (e.status === 429 ? 429 : e.status === 404 ? 404 : 502) : 500;
      if (parts[1] === 'callback') return redirect(res, '/?strava=error');
      return send(res, status, { error: e instanceof StravaError ? e.message : 'Strava request failed' });
    }
  };
}

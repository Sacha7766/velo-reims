import { gradeColor } from './format.ts';

export interface ProfileData {
  dist: ArrayLike<number>; // m
  ele: ArrayLike<number>;
}

export interface ProfileOptions {
  progress?: number; // m ridden (dims everything before)
  marker?: number; // m, rider position
  ghost?: number | null;
  padTop?: number;
  padBottom?: number;
  bins?: number;
  stroke?: string;
  minSpan?: number; // minimum vertical span in metres
  window?: [number, number]; // distance window to draw
}

/** Climb-profile silhouette coloured by gradient, race-TV style. */
export function drawProfile(canvas: HTMLCanvasElement, data: ProfileData, o: ProfileOptions = {}) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (!w || !h) return;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const n = data.dist.length;
  if (n < 2) return;
  const [d0, d1] = o.window ?? [data.dist[0], data.dist[n - 1]];
  let minE = Infinity;
  let maxE = -Infinity;
  for (let i = 0; i < n; i++) {
    if (data.dist[i] < d0 || data.dist[i] > d1) continue;
    minE = Math.min(minE, data.ele[i]);
    maxE = Math.max(maxE, data.ele[i]);
  }
  const span = Math.max(maxE - minE, o.minSpan ?? 60);
  const top = o.padTop ?? 6;
  const bottom = o.padBottom ?? 0;
  const X = (d: number) => ((d - d0) / (d1 - d0 || 1)) * w;
  const Y = (e: number) => h - bottom - ((e - minE) / span) * (h - top - bottom);
  const eleAt = (d: number) => {
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (data.dist[m] < d) lo = m;
      else hi = m;
    }
    const t = (d - data.dist[lo]) / (data.dist[hi] - data.dist[lo] || 1);
    return data.ele[lo] + (data.ele[hi] - data.ele[lo]) * Math.min(1, Math.max(0, t));
  };
  const bins = o.bins ?? Math.max(24, Math.min(160, Math.round(w / 6)));
  const step = (d1 - d0) / bins;
  for (let b = 0; b < bins; b++) {
    const a = d0 + b * step;
    const c = a + step;
    const ea = eleAt(a);
    const ec = eleAt(c);
    ctx.fillStyle = gradeColor(((ec - ea) / step) * 100);
    ctx.beginPath();
    ctx.moveTo(X(a), h);
    const sub = 4;
    for (let k = 0; k <= sub; k++) {
      const d = a + (step * k) / sub;
      ctx.lineTo(X(d), Y(eleAt(d)));
    }
    ctx.lineTo(X(c) + 0.6, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const y = Y(eleAt(d0 + (x / w) * (d1 - d0)));
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = o.stroke ?? 'rgba(238,243,244,0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (o.progress !== undefined && o.progress > d0) {
    ctx.fillStyle = 'rgba(13,27,36,0.62)';
    ctx.fillRect(0, 0, Math.min(w, X(o.progress)), h);
  }
  const pin = (d: number, color: string, r: number) => {
    if (d < d0 || d > d1) return;
    const x = X(d);
    const y = Y(eleAt(d));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, h);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  if (o.ghost !== undefined && o.ghost !== null) pin(o.ghost, '#7ff5ff', 4);
  if (o.marker !== undefined) pin(o.marker, '#ffc93c', 5.5);
}

/** Distance/elevation arrays from raw [lon, lat, ele] coords (home screen silhouettes). */
export function profileFromCoords(coords: number[][]): ProfileData {
  const dist = [0];
  const ele: number[] = [coords[0][2] ?? 0];
  const r = Math.PI / 180;
  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
    dist.push(dist[i - 1] + 2 * 6371008.8 * Math.asin(Math.sqrt(a)));
    ele.push(Number.isFinite(coords[i][2]) ? coords[i][2] : ele[i - 1]);
  }
  // smooth noisy SRTM/GPS elevation
  const sm = ele.map((_, i) => {
    let s = 0;
    let c = 0;
    for (let j = Math.max(0, i - 3); j <= Math.min(ele.length - 1, i + 3); j++) {
      s += ele[j];
      c++;
    }
    return s / c;
  });
  return { dist, ele: sm };
}

export function climbStats(p: ProfileData) {
  const n = p.dist.length;
  let gain = 0;
  let ref = p.ele[0];
  for (let i = 1; i < n; i++) {
    if (p.ele[i] > ref + 2) {
      gain += p.ele[i] - ref;
      ref = p.ele[i];
    } else if (p.ele[i] < ref - 2) ref = p.ele[i];
  }
  const length = p.dist[n - 1];
  let max = -Infinity;
  let min = Infinity;
  for (let i = 0; i < n; i++) {
    max = Math.max(max, p.ele[i]);
    min = Math.min(min, p.ele[i]);
  }
  return { length, gain, top: max, bottom: min, avgGrade: ((p.ele[n - 1] - p.ele[0]) / (length || 1)) * 100 };
}

import { useEffect, useRef } from 'react';
import { DEM_SIZE, loadDem } from '../geo/elevation.ts';

// Topographic contour lines from a real DEM tile (Hohe Tauern, Großglockner) as backdrop.
const TILE = { z: 11, x: 1096, y: 723 };

export function Contours() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let cancelled = false;
    const draw = async () => {
      const c = ref.current;
      if (!c) return;
      const dem = await loadDem(TILE.z, TILE.x, TILE.y).catch(() => null);
      if (!dem || cancelled) return;
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const scale = Math.max(w, h) / (DEM_SIZE - 1);
      const ox = (w - (DEM_SIZE - 1) * scale) / 2;
      const oy = (h - (DEM_SIZE - 1) * scale) / 2;
      const d = dem.data;
      const N = DEM_SIZE;
      const step = 40;
      const paths = new Map<number, Path2D>();
      for (let y = 0; y < N - 1; y++) {
        for (let x = 0; x < N - 1; x++) {
          const a = d[y * N + x], b = d[y * N + x + 1], cc = d[(y + 1) * N + x + 1], e = d[(y + 1) * N + x];
          const lo = Math.min(a, b, cc, e);
          const hi = Math.max(a, b, cc, e);
          for (let lv = Math.ceil(lo / step) * step; lv <= hi; lv += step) {
            const pts: [number, number][] = [];
            const edge = (v0: number, v1: number, x0: number, y0: number, x1: number, y1: number) => {
              if ((v0 < lv) !== (v1 < lv)) {
                const t = (lv - v0) / (v1 - v0);
                pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
              }
            };
            edge(a, b, x, y, x + 1, y);
            edge(b, cc, x + 1, y, x + 1, y + 1);
            edge(cc, e, x + 1, y + 1, x, y + 1);
            edge(e, a, x, y + 1, x, y);
            if (pts.length >= 2) {
              let p = paths.get(lv);
              if (!p) paths.set(lv, (p = new Path2D()));
              for (let k = 0; k + 1 < pts.length; k += 2) {
                p.moveTo(ox + pts[k][0] * scale, oy + pts[k][1] * scale);
                p.lineTo(ox + pts[k + 1][0] * scale, oy + pts[k + 1][1] * scale);
              }
            }
          }
        }
      }
      ctx.clearRect(0, 0, w, h);
      for (const [lv, p] of paths) {
        const major = lv % 200 === 0;
        ctx.strokeStyle = major ? 'rgba(143,163,173,0.22)' : 'rgba(143,163,173,0.09)';
        ctx.lineWidth = major ? 1.1 : 0.7;
        ctx.stroke(p);
      }
    };
    void draw();
    const ro = new ResizeObserver(() => void draw());
    if (ref.current) ro.observe(ref.current);
    return () => {
      cancelled = true;
      ro.disconnect();
    };
  }, []);
  return <canvas ref={ref} className="contours" aria-hidden />;
}

"""Relief for the Serpentine Island map (docs/world/README.md), a miniature of how the game would build the land.

  node scripts/world/layout.mjs && python3 scripts/world/relief.py && node scripts/world/page.mjs

Real heights within each route's radius (AWS Terrain Tiles, Terrarium, z11), placed at its spot on the island;
the land between filled smoothly from those edges (Laplace, multigrid red-black SOR) with rough hills away from
the routes, rivers carved, the drawn coast at 0 m; then hillshaded and tinted. Needs numpy and pillow. Reads
layout.json and $WORLD_OUT/world.json, caches DEM tiles in $WORLD_OUT/dem, writes $WORLD_OUT/relief.jpg.
"""
import json, math, os, sys, tempfile, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('WORLD_OUT') or os.path.join(tempfile.gettempdir(), 'serpentine-world')
DEM = os.path.join(OUT, 'dem')
os.makedirs(DEM, exist_ok=True)
ROUTES = os.path.join(HERE, '..', '..', 'public', 'routes')
P = json.load(open(os.path.join(HERE, 'layout.json')))
WORLD = json.load(open(os.path.join(OUT, 'world.json')))
RES = 0.1                                  # km per cell
X0, X1, Y0, Y1 = 0.0, 90.0, 6.0, 76.0
NX, NY = int((X1 - X0) / RES), int((Y1 - Y0) / RES)
gx = X0 + (np.arange(NX) + 0.5) * RES
gy = Y1 - (np.arange(NY) + 0.5) * RES      # row 0 = north
GX, GY = np.meshgrid(gx, gy)

Z = 11
def tile(x, y):
    f = os.path.join(DEM, f'{Z}_{x}_{y}.png')
    if not os.path.exists(f):
        urllib.request.urlretrieve(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png', f)
    a = np.asarray(Image.open(f).convert('RGB'), dtype=np.float64)
    return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768

def sample(lon, lat):
    n = 2 ** Z
    fx = (lon + 180) / 360 * n
    fy = (1 - np.log(np.tan(np.radians(lat)) + 1 / np.cos(np.radians(lat))) / math.pi) / 2 * n
    tx0, tx1, ty0, ty1 = int(fx.min()), int(fx.max()), int(fy.min()), int(fy.max())
    mos = np.block([[tile(x, y) for x in range(tx0, tx1 + 1)] for y in range(ty0, ty1 + 1)])
    px, py = (fx - tx0) * 256 - 0.5, (fy - ty0) * 256 - 0.5
    x0, y0 = np.clip(np.floor(px).astype(int), 0, mos.shape[1] - 2), np.clip(np.floor(py).astype(int), 0, mos.shape[0] - 2)
    ax, ay = np.clip(px - x0, 0, 1), np.clip(py - y0, 0, 1)
    return (mos[y0, x0] * (1 - ax) * (1 - ay) + mos[y0, x0 + 1] * ax * (1 - ay)
            + mos[y0 + 1, x0] * (1 - ax) * ay + mos[y0 + 1, x0 + 1] * ax * ay)

def dist_to(pts, X, Y):
    d = np.full(X.shape, 1e9)
    for i in range(0, len(pts), 200):
        chunk = pts[i:i + 200]
        dd = np.sqrt((X[..., None] - chunk[:, 0]) ** 2 + (Y[..., None] - chunk[:, 1]) ** 2).min(-1)
        d = np.minimum(d, dd)
    return d

def resample(pts, step):
    out = [pts[0]]
    for p in pts[1:]:
        q = out[-1]
        n = int(math.hypot(p[0] - q[0], p[1] - q[1]) / step)
        for k in range(1, n + 1):
            out.append([q[0] + (p[0] - q[0]) * k / (n + 1), q[1] + (p[1] - q[1]) * k / (n + 1)] + list(p[2:]))
        out.append(p)
    return out

num = np.zeros((NY, NX)); den = np.zeros((NY, NX)); wmax = np.zeros((NY, NX))
sea_core = np.zeros((NY, NX), bool)
for rid, (ox, oy) in P['routes'].items():
    r = json.load(open(os.path.join(ROUTES, rid + '.json')))
    lon0, lat0 = r['coords'][0][0], r['coords'][0][1]
    k = math.cos(math.radians(lat0))
    core, feather = P['radius'].get(rid, P['radius']['default'])
    pts = np.array(WORLD['W'][rid])[::2, :2]
    i0 = max(0, int((Y1 - (pts[:, 1].max() + feather)) / RES)); i1 = min(NY, int((Y1 - (pts[:, 1].min() - feather)) / RES) + 1)
    j0 = max(0, int((pts[:, 0].min() - feather - X0) / RES)); j1 = min(NX, int((pts[:, 0].max() + feather - X0) / RES) + 1)
    X, Y = GX[i0:i1, j0:j1], GY[i0:i1, j0:j1]
    d = dist_to(pts, X, Y)
    w = np.clip((feather - d) / (feather - core), 0, 1)
    w = w * w * (3 - 2 * w)
    m = w > 0
    lon = lon0 + (X[m] - ox) / (111.32 * k)
    lat = lat0 + (Y[m] - oy) / 110.57
    h = np.zeros(X.shape); h[m] = sample(lon, lat)
    num[i0:i1, j0:j1] += w * h; den[i0:i1, j0:j1] += w
    wmax[i0:i1, j0:j1] = np.maximum(wmax[i0:i1, j0:j1], w)
    sea_core[i0:i1, j0:j1] |= (w > 0.5) & (h <= 0.5)
    print(rid, 'ok', file=sys.stderr)
real = np.where(den > 0, num / np.maximum(den, 1e-9), 0)

# land: the drawn coast, except where a coastal route's own real sea is
img = Image.new('L', (NX, NY), 0)
ImageDraw.Draw(img).polygon([((x - X0) / RES, (Y1 - y) / RES) for x, y in P['coast']], fill=255)
poly = np.asarray(img.filter(ImageFilter.GaussianBlur(9)), dtype=float) / 255
cn = np.zeros((NY, NX))
crng = np.random.default_rng(3)
for octave, a in ((48, 0.5), (16, 0.3), (6, 0.2)):
    r_ = crng.standard_normal((NY // octave + 2, NX // octave + 2)).astype(np.float32)
    cn += a * np.asarray(Image.fromarray(r_).resize((NX + octave * 2, NY + octave * 2), Image.BICUBIC))[:NY, :NX]
land = (poly + 0.22 * cn > 0.5) | ((wmax > 0.5) & ~sea_core)
land &= ~sea_core

# rivers outside the routes: fixed heights along the line
riv = np.full((NY, NX), np.nan)
for rv in P['rivers']:
    for x, y, h in resample(rv['pts'], RES * 0.5):
        i, j = int((Y1 - y) / RES), int((x - X0) / RES)
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                if 0 <= i + di < NY and 0 <= j + dj < NX and wmax[i + di, j + dj] < 0.01:
                    riv[i + di, j + dj] = h

fixed = (wmax >= 0.999) | ~land | ~np.isnan(riv)
val = np.where(wmax >= 0.999, real, 0.0)
val = np.where(~np.isnan(riv), riv, val)
val = np.where(~land, 0.0, val)

def relax(u, fx, fv, it):
    # red-black SOR: each colour sees the other's fresh values, so over-relaxation stays stable
    ii, jj = np.indices(u.shape)
    colours = [((ii + jj) % 2 == c) & ~fx for c in (0, 1)]
    u = np.where(fx, fv, u)
    for _ in range(it):
        for c in colours:
            n = np.pad(u, 1, mode='edge')
            avg = (n[:-2, 1:-1] + n[2:, 1:-1] + n[1:-1, :-2] + n[1:-1, 2:]) / 4
            u = np.where(c, u + 1.85 * (avg - u), u)
    return u

def down(a, f, how):
    h, w = a.shape[0] // f * f, a.shape[1] // f * f
    b = a[:h, :w].reshape(h // f, f, w // f, f)
    return b.max(axis=(1, 3)) if how == 'any' else b.mean(axis=(1, 3))

u = None
for f in (16, 8, 4, 2, 1):
    fx = down(fixed.astype(float), f, 'any') > 0 if f > 1 else fixed
    fv = (down(np.where(fixed, val, 0), f, 'mean') / np.maximum(down(fixed.astype(float), f, 'mean'), 1e-9)) if f > 1 else val
    if u is None:
        u = np.where(fx, fv, fv[fx].mean())
    else:
        u = np.asarray(Image.fromarray(u.astype(np.float32)).resize((fx.shape[1], fx.shape[0]), Image.BILINEAR), dtype=np.float64)
    u = relax(u, fx, fv, 400 if f > 2 else 250)
fill = np.zeros((NY, NX)); fill[:u.shape[0], :u.shape[1]] = u

# rough country away from the routes and the coast
rng = np.random.default_rng(7)
noise = np.zeros((NY, NX))
for octave, amp in ((128, 1.3), (64, 0.9), (32, 0.45), (16, 0.22), (8, 0.1)):
    r_ = rng.standard_normal((NY // octave + 2, NX // octave + 2)).astype(np.float32)
    noise += amp * np.asarray(Image.fromarray(r_).resize((NX + octave * 2, NY + octave * 2), Image.BICUBIC))[:NY, :NX]
ridge = 1 - np.abs(noise / 1.4)
allpts = np.array([p for rid in P['routes'] for p in resample(np.array(WORLD['W'][rid])[::6, :2].tolist(), 0.3)])
cg = 5
dr = dist_to(allpts, GX[::cg, ::cg], GY[::cg, ::cg])
dr = np.asarray(Image.fromarray(dr.astype(np.float32)).resize((NX, NY), Image.BICUBIC))
coast_d = np.asarray(Image.fromarray((~land).astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(25)), dtype=float) / 255
amp = np.clip((dr - 1.5) / 4, 0, 1) * (90 + 0.45 * np.maximum(fill, 0)) * np.clip(1 - coast_d * 2.2, 0, 1)
rivpts = np.array([p[:2] for rv in P['rivers'] for p in resample(rv['pts'], 0.3)])
drv = np.asarray(Image.fromarray(dist_to(rivpts, GX[::cg, ::cg], GY[::cg, ::cg]).astype(np.float32)).resize((NX, NY), Image.BICUBIC))
amp *= np.clip((drv - 0.3) / 1.5, 0, 1)
def blur(a, r):
    k = np.ones(2 * r + 1) / (2 * r + 1)
    for ax in (0, 1):
        a = np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode='edge'), k, mode='valid'), ax, a)
    return a
amp = blur(blur(amp, 4), 4)
rough = fill + amp * (ridge - 0.45) * 1.6
height = np.where(wmax >= 0.999, real, wmax * real + (1 - wmax) * rough)
height = np.where(~np.isnan(riv), riv, height)
height = np.where(land, np.maximum(height, 2), -20 - 80 * coast_d)
print('height', round(float(height[land].min())), round(float(height.max())), file=sys.stderr)


# hillshade (light from the northwest, heights x1.6) and tint by height, drawn at 2x
h = height.astype(np.float64)
S = 2
H = np.asarray(Image.fromarray(h.astype(np.float32)).resize((h.shape[1] * S, h.shape[0] * S), Image.BICUBIC), dtype=np.float64)
L = np.asarray(Image.fromarray(land.astype(np.uint8) * 255).resize((h.shape[1] * S, h.shape[0] * S), Image.BILINEAR), dtype=np.float64) / 255
cell = 100.0 / S
gy, gx = np.gradient(H * 1.6, cell)
az, alt = np.radians(315), np.radians(42)
slope = np.arctan(np.hypot(gx, gy))
aspect = np.arctan2(-gx, gy)
shade = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
shade = np.clip(shade, 0, 1)
stops = [(0, (86, 112, 84)), (250, (104, 124, 88)), (600, (124, 132, 92)), (1100, (132, 118, 88)),
         (1700, (128, 112, 96)), (2200, (140, 136, 130)), (2600, (214, 222, 224)), (3200, (240, 244, 245))]
def tint(z):
    out = np.zeros(z.shape + (3,))
    zs = [s[0] for s in stops]
    for c in range(3):
        out[..., c] = np.interp(z, zs, [s[1][c] for s in stops])
    return out
col = tint(H) * (0.35 + 0.95 * shade)[..., None]
# sea: deep ink, lighter over the shelf near the coast
near = np.asarray(Image.fromarray((L * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(28)), dtype=np.float64) / 255
sea = np.array([16, 38, 52]) * (1 - near[..., None] * 1.6).clip(0, 1) + np.array([38, 82, 98]) * (near[..., None] * 1.6).clip(0, 1)
img = col * L[..., None] + sea * (1 - L[..., None])
# lakes: dead flat land inside the routes' real ground
flat = np.zeros_like(H, bool)
r = 3
mx = Image.fromarray(H.astype(np.float32)).filter(ImageFilter.MaxFilter(2 * r + 1))
mn = Image.fromarray(H.astype(np.float32)).filter(ImageFilter.MinFilter(2 * r + 1))
flat = (np.asarray(mx) - np.asarray(mn) < 0.35) & (L > 0.9) & (H > 3)
fl = Image.fromarray(flat.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
flat = np.asarray(fl) > 0
img[flat] = [44, 92, 112]
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(os.path.join(OUT, 'relief.jpg'), quality=86, subsampling=0)
print('wrote', os.path.join(OUT, 'relief.jpg'), file=sys.stderr)

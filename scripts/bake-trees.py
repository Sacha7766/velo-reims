"""Bake individual trees for a preset route from a canopy height model.

Tree tops are local maxima of the (lightly smoothed) Meta/WRI 1 m canopy height map with a
height-dependent search window; species come from the Copernicus Dominant Leaf Type layer.
Writes public/trees/<id>.bin, read by src/engine/Vegetation.ts.

  python scripts/bake-trees.py gaisberg <chm.tif> <dlt.tif> [--corridor 550]

Needs rasterio, numpy, scipy, pyproj (use a venv; nothing here runs in the app).

File format (little endian): magic 'TRE1', u32 count, f64 lon0, f64 lat0, then per tree
f32 dlon, f32 dlat, u8 height (m), u8 crown radius (dm), u8 type (1 conifer, 2 broadleaf),
u8 flags (1 = open-ground tree outside forest).
"""
import json
import struct
import sys

import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.features import rasterize
from scipy import ndimage

route_id, chm_path, dlt_path = sys.argv[1:4]
corridor = float(sys.argv[sys.argv.index('--corridor') + 1]) if '--corridor' in sys.argv else 550.0

route = json.load(open(f'public/routes/{route_id}.json'))
coords = route['coords']

with rasterio.open(chm_path) as src:
    chm = src.read(1).astype(np.float32)
    T = src.transform
    crs = src.crs
px = abs(T.a)  # metres per pixel

# corridor mask: distance (m) from the route polyline
to_utm = Transformer.from_crs('EPSG:4326', crs, always_xy=True)
line = [to_utm.transform(c[0], c[1]) for c in coords]
route_px = rasterize([({'type': 'LineString', 'coordinates': line}, 1)], out_shape=chm.shape, transform=T, all_touched=True)
dist = ndimage.distance_transform_edt(route_px == 0) * px
inside = dist <= corridor

# smooth a little to merge multi-peak crowns, then find tops with a height-dependent window
sm = ndimage.gaussian_filter(chm, sigma=1.1 / px)
tops = np.zeros(chm.shape, bool)
for lo, hi, radius_m in ((3, 10, 1.8), (10, 18, 2.6), (18, 26, 3.3), (26, 99, 4.0)):
    size = int(round(2 * radius_m / px)) | 1
    peak = sm == ndimage.maximum_filter(sm, size=size)
    tops |= peak & (sm >= lo) & (sm < hi)
tops &= inside & (chm >= 3)
rows, cols = np.nonzero(tops)
heights = sm[rows, cols]

xs, ys = rasterio.transform.xy(T, rows, cols)
xs, ys = np.asarray(xs), np.asarray(ys)

# crown radius from spacing: neighbouring crowns touch, so the canopy closes like in the CHM
from scipy.spatial import cKDTree
nn, _ = cKDTree(np.c_[xs, ys]).query(np.c_[xs, ys], k=2)
crown = np.clip(0.62 * nn[:, 1], 1.4, np.clip(0.9 + 0.17 * heights, 2.0, 7.5))

# openness: share of canopy around each tree (forest interior vs single tree / hedge)
canopy = ndimage.uniform_filter((chm >= 3).astype(np.float32), size=int(25 / px))
open_ground = canopy[rows, cols] < 0.35

to_ll = Transformer.from_crs(crs, 'EPSG:4326', always_xy=True)
lon, lat = to_ll.transform(xs, ys)

# species from Copernicus DLT (0 none, 1 broadleaved, 2 coniferous); mixed edges get a share of the other type
with rasterio.open(dlt_path) as d:
    dlt = d.read(1)
    to_d = Transformer.from_crs('EPSG:4326', d.crs, always_xy=True)
    dx, dy = to_d.transform(lon, lat)
    r, c = rasterio.transform.rowcol(d.transform, dx, dy)
    r = np.clip(np.asarray(r), 0, dlt.shape[0] - 1)
    c = np.clip(np.asarray(c), 0, dlt.shape[1] - 1)
    leaf = dlt[r, c]
rng = np.random.default_rng(7)
u = rng.random(len(lon))
conifer = np.where(leaf == 2, u < 0.86, np.where(leaf == 1, u < 0.12, u < 0.22))
# tall narrow tops in closed forest above ~900 m are mostly spruce on the Gaisberg; leave as DLT says
kind = np.where(conifer, 1, 2).astype(np.uint8)

lon0, lat0 = float(np.mean(lon)), float(np.mean(lat))
n = len(lon)
buf = bytearray(b'TRE1' + struct.pack('<Idd', n, lon0, lat0))
rec = np.zeros(n, dtype=[('dlon', '<f4'), ('dlat', '<f4'), ('h', 'u1'), ('cr', 'u1'), ('k', 'u1'), ('f', 'u1')])
rec['dlon'] = lon - lon0
rec['dlat'] = lat - lat0
rec['h'] = np.clip(np.round(heights), 0, 255)
rec['cr'] = np.clip(np.round(crown * 10), 0, 255)
rec['k'] = kind
rec['f'] = open_ground.astype(np.uint8)
buf += rec.tobytes()
import os
os.makedirs('public/trees', exist_ok=True)
open(f'public/trees/{route_id}.bin', 'wb').write(buf)
print(f'{route_id}: {n} trees ({int((kind == 1).sum())} conifer, {int((kind == 2).sum())} broadleaf, '
      f'{int(open_ground.sum())} open-ground), mean height {heights.mean():.1f} m, {len(buf) / 1e6:.2f} MB')

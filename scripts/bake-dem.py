"""Bake a high-resolution DEM into local Terrarium tiles that override the AWS terrain tiles.

  python scripts/bake-dem.py <route-id> <dem.tif> [--zoom 15] [--margin 2500]

Samples the DEM (any CRS rasterio can read; e.g. IGN MDT05, 5 m) at every pixel of the
slippy-map tiles at --zoom that touch the route plus --margin metres, encodes Terrarium PNGs
into public/dem/<z>/<x>/<y>.png and adds them to public/dem/index.json, which the app reads
(src/geo/elevation.ts) to prefer local tiles. Cells outside the DEM keep the AWS height so the
tiles stay seamless.
"""
import json
import math
import os
import sys
import urllib.request

import numpy as np
import rasterio
from PIL import Image
from pyproj import Transformer
from rasterio.warp import transform as warp_transform

route_id, dem_path = sys.argv[1:3]
Z = int(sys.argv[sys.argv.index('--zoom') + 1]) if '--zoom' in sys.argv else 15
MARGIN = float(sys.argv[sys.argv.index('--margin') + 1]) if '--margin' in sys.argv else 2500.0
SIZE = 256
R = 6378137.0
MAXM = math.pi * R

coords = json.load(open(f'public/routes/{route_id}.json'))['coords']
lat0 = sum(c[1] for c in coords) / len(coords)
dlat = MARGIN / 111320
dlon = MARGIN / (111320 * math.cos(math.radians(lat0)))
s = min(c[1] for c in coords) - dlat
n = max(c[1] for c in coords) + dlat
w = min(c[0] for c in coords) - dlon
e = max(c[0] for c in coords) + dlon


def tile_xy(lon, lat):
    k = 2 ** Z
    x = (lon + 180) / 360 * k
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * k
    return x, y


x0, y0 = (int(v) for v in tile_xy(w, n))
x1, y1 = (int(v) for v in tile_xy(e, s))

src = rasterio.open(dem_path)
dem = src.read(1).astype(np.float32)
nodata = src.nodata
inv = ~src.transform
to_src = Transformer.from_crs('EPSG:3857', src.crs, always_xy=True)


def sample(mx, my):
    """Bilinear DEM sample at web-mercator coordinates (arrays); NaN outside."""
    sx, sy = to_src.transform(mx, my)
    col, row = inv * (sx, sy)
    col = np.asarray(col) - 0.5
    row = np.asarray(row) - 0.5
    c0 = np.floor(col).astype(int)
    r0 = np.floor(row).astype(int)
    fc = col - c0
    fr = row - r0
    H, W = dem.shape
    ok = (c0 >= 0) & (r0 >= 0) & (c0 < W - 1) & (r0 < H - 1)
    c0c = np.clip(c0, 0, W - 2)
    r0c = np.clip(r0, 0, H - 2)
    a = dem[r0c, c0c]
    b = dem[r0c, c0c + 1]
    c = dem[r0c + 1, c0c]
    d = dem[r0c + 1, c0c + 1]
    v = (a * (1 - fc) + b * fc) * (1 - fr) + (c * (1 - fc) + d * fc) * fr
    if nodata is not None:
        bad = (a == nodata) | (b == nodata) | (c == nodata) | (d == nodata)
        ok &= ~bad
    return np.where(ok, v, np.nan)


def aws_tile(x, y):
    url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png'
    req = urllib.request.Request(url, headers={'User-Agent': 'serpentine-bake/0.1'})
    with urllib.request.urlopen(req, timeout=30) as r:
        px = np.asarray(Image.open(r).convert('RGB')).astype(np.float32)
    return px[..., 0] * 256 + px[..., 1] + px[..., 2] / 256 - 32768


index_path = 'public/dem/index.json'
index = json.load(open(index_path)) if os.path.exists(index_path) else {'tiles': []}
have = set(index['tiles'])
count = 0
for ty in range(y0, y1 + 1):
    for tx in range(x0, x1 + 1):
        tile = 2 * MAXM / 2 ** Z
        mx0 = -MAXM + tx * tile
        my0 = MAXM - ty * tile
        px = (np.arange(SIZE) + 0.5) / SIZE * tile
        mx, my = np.meshgrid(mx0 + px, my0 - px)
        h = sample(mx.ravel(), my.ravel()).reshape(SIZE, SIZE)
        if np.isnan(h).all():
            continue
        if np.isnan(h).any():
            h = np.where(np.isnan(h), aws_tile(tx, ty), h)
        v = np.clip(h + 32768, 0, 65535.99)
        r = np.floor(v / 256)
        g = np.floor(v - r * 256)
        b = np.floor((v - r * 256 - g) * 256)
        img = np.stack([r, g, b], -1).astype(np.uint8)
        os.makedirs(f'public/dem/{Z}/{tx}', exist_ok=True)
        Image.fromarray(img, 'RGB').save(f'public/dem/{Z}/{tx}/{ty}.png', optimize=True)
        have.add(f'{Z}/{tx}/{ty}')
        count += 1
index['tiles'] = sorted(have)
json.dump(index, open(index_path, 'w'))
print(f'{route_id}: {count} tiles at z{Z} ({x1 - x0 + 1}×{y1 - y0 + 1} box), index now {len(have)} tiles')

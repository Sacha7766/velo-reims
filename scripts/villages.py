"""Write the villages a route can be built from, village to village (src/geo/villages.ts, RouteBuilder).

  python scripts/villages.py <west> <south> <east> <north> <extract.osm.pbf>... [--with=Macô,L'Écaille]

Every OSM village and town node inside the box (not the city itself), placed on its through road: the nearest
point of the best road within 300 m, a better class winning unless it is much farther (class rank x 90 m +
distance). At the place node itself, a route would turn into the centre and out again by the same street wherever
the centre lies off the through road. --with adds hamlets and named localities (any place node of that name). Needs
pyosmium (pip install osmium). Several extracts may overlap; each village is kept once.
"""
import math
import sys
import unicodedata

import osmium

args = [a for a in sys.argv[1:] if not a.startswith('--with=')]
EXTRA = set(next((a[7:].split(',') for a in sys.argv[1:] if a.startswith('--with=')), []))
W, S, E, N = map(float, args[:4])
PBFS = args[4:]
RANK = {'primary': 0, 'secondary': 1, 'tertiary': 2, 'unclassified': 3, 'residential': 4}

places = {}
segs = []


class Handler(osmium.SimpleHandler):
    def node(self, n):
        wanted = n.tags.get('place') in ('village', 'town') or ('place' in n.tags and n.tags.get('name') in EXTRA)
        if wanted and W <= n.location.lon <= E and S <= n.location.lat <= N:
            places.setdefault(n.tags.get('name', ''), (n.location.lon, n.location.lat))

    def way(self, w):
        r = RANK.get(w.tags.get('highway'))
        if r is None:
            return
        pts = [(nd.lon, nd.lat) for nd in w.nodes if nd.location.valid()]
        for a, b in zip(pts, pts[1:]):
            if W - 0.01 < a[0] < E + 0.01 and S - 0.01 < a[1] < N + 0.01:
                segs.append((r, a[0], a[1], b[0], b[1]))


for f in PBFS:
    Handler().apply_file(f, locations=True)
places.pop('', None)


def snap(lon, lat):
    kx, ky = 111320 * math.cos(math.radians(lat)), 110540
    best = None
    for r, ax, ay, bx, by in segs:
        x0, y0 = (ax - lon) * kx, (ay - lat) * ky
        dx, dy = (bx - ax) * kx, (by - ay) * ky
        t = max(0.0, min(1.0, -(x0 * dx + y0 * dy) / (dx * dx + dy * dy or 1)))
        px, py = x0 + dx * t, y0 + dy * t
        d = math.hypot(px, py)
        if d <= 300 and (best is None or d + r * 90 < best[0]):
            best = (d + r * 90, lon + px / kx, lat + py / ky)
    return (round(best[1], 5), round(best[2], 5)) if best else (round(lon, 5), round(lat, 5))


def key(name):
    return unicodedata.normalize('NFD', name).encode('ascii', 'ignore').decode().lower()


def quote(name):
    return f'"{name}"' if "'" in name else f"'{name}'"


rows, line = [], '  '
for name in sorted(places, key=key):
    lon, lat = snap(*places[name])
    item = f'[{quote(name)}, {lon}, {lat}], '
    if len(line) + len(item) > 118:
        rows.append(line.rstrip())
        line = '  '
    line += item
rows.append(line.rstrip())

out = """// The villages around Reims for building a route village to village (RouteBuilder): each one's name and a point on
// its through road (lon, lat), written by scripts/villages.py from the OpenStreetMap extracts of 2026-10-29 and
// 2026-10-30. A point on the main road rather than at the mairie, so a route passes through the village instead of
// turning in and out of a side street.

export interface Village {
  name: string;
  lon: number;
  lat: number;
}

const DATA: [string, number, number][] = [
""" + '\n'.join(rows) + """
];

export const REIMS_VILLAGES: Village[] = DATA.map(([name, lon, lat]) => ({ name, lon, lat }));
"""
open('src/geo/villages.ts', 'w').write(out)
print(len(places), 'villages')

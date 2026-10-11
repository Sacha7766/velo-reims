"""Bake a lead-in for a preset route: an easy approach on real roads to where the route starts.

  python3 -I scripts/bake-leadin.py [id]

Follows the OSM ways of one road (by `ref`) from `from` to the first route point on that road,
samples the elevation from the AWS Terrarium tiles the app uses, and stores
`leadIn: {name, coords, join}` in public/routes/<id>.json (plus `leadInKm` in index.json). `join`
is the index in `coords` where the lead-in meets the route; the app replaces the route before it
with the lead-in, rides the lead-in with easy resistance and starts the climb at the join
(src/geo/leadIn.ts). Afterwards run bake-osm.mjs for the corridor and bake-turnarounds.mjs for
the turn at the lead-in start.
"""
import heapq
import io
import json
import math
import sys
import urllib.parse
import urllib.request

from PIL import Image

LEADINS = [
    # Gnigl (just past the B1 junction at the Schwabenwirtsbrücke) up the B158 Minnesheimstraße, through the
    # two Obergnigl switchbacks on the Grazer Bundesstraße and the Wolfgangseestraße to Guggenthal.
    # BRouter cuts the switchbacks on side streets and a cycle path, so this follows the B158 ways directly.
    {'id': 'gaisberg', 'name': 'Gnigl', 'from': [13.06900, 47.81317], 'ref': 'B158'},
]
OVERPASS = [
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
]
Z = 15


def hav(a, b):
    r = math.pi / 180
    h = math.sin((b[1] - a[1]) * r / 2) ** 2 + math.cos(a[1] * r) * math.cos(b[1] * r) * math.sin((b[0] - a[0]) * r / 2) ** 2
    return 2 * 6371008.8 * math.asin(math.sqrt(h))


def overpass(q):
    last = None
    for url in OVERPASS:
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode(),
                                         headers={'User-Agent': 'serpentine-bake/0.1 (personal indoor cycling app)'})
            body = urllib.request.urlopen(req, timeout=120).read()
            return json.loads(body)['elements']
        except Exception as e:  # noqa: BLE001 - try the next mirror
            last = e
    raise last


def road_graph(ref, a, b):
    """Directed graph of the ways tagged `ref` around a and b: {(lon, lat): [(next, metres)]}."""
    pad = 0.004
    s, n = min(a[1], b[1]) - pad, max(a[1], b[1]) + pad
    w, e = min(a[0], b[0]) - pad, max(a[0], b[0]) + pad
    ways = overpass(f'[out:json][timeout:60];way["ref"="{ref}"]["highway"]({s},{w},{n},{e});out geom;')
    graph = {}
    for way in ways:
        g = [(p['lon'], p['lat']) for p in way['geometry']]
        oneway = way['tags'].get('oneway') == 'yes'
        for p, q in zip(g, g[1:]):
            d = hav(p, q)
            graph.setdefault(p, []).append((q, d))
            graph.setdefault(q, [])
            if not oneway:
                graph[q].append((p, d))
    return graph


def road_path(graph, a, b):
    """Shortest path along the graph from the node nearest a to the node nearest b."""
    start = min(graph, key=lambda p: hav(p, a))
    goal = min(graph, key=lambda p: hav(p, b))
    dist, prev, todo = {start: 0.0}, {}, [(0.0, start)]
    while todo:
        d, p = heapq.heappop(todo)
        if p == goal:
            break
        if d > dist[p]:
            continue
        for q, w_ in graph[p]:
            if d + w_ < dist.get(q, math.inf):
                dist[q], prev[q] = d + w_, p
                heapq.heappush(todo, (d + w_, q))
    if goal not in prev:
        raise SystemExit(f'no path from {a} to {b}')
    path = [goal]
    while path[-1] != start:
        path.append(prev[path[-1]])
    return path[::-1], hav(start, a)


tiles = {}


def ele(lon, lat):
    k = 2 ** Z
    fx = (lon + 180) / 360 * k
    fy = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * k
    x, y = int(fx), int(fy)
    if (x, y) not in tiles:
        url = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png'
        tiles[(x, y)] = Image.open(io.BytesIO(urllib.request.urlopen(url, timeout=60).read())).convert('RGB')
    r, g, b = tiles[(x, y)].getpixel((int((fx - x) * 256), int((fy - y) * 256)))
    return r * 256 + g + b / 256 - 32768


only = sys.argv[1] if len(sys.argv) > 1 else None
index = json.load(open('public/routes/index.json', encoding='utf-8'))
for spec in LEADINS:
    if only and spec['id'] != only:
        continue
    file = f"public/routes/{spec['id']}.json"
    route = json.load(open(file, encoding='utf-8'))
    # join where the route first runs on the road (a route may start on a side street beside it)
    rc = route['coords']
    graph = road_graph(spec['ref'], spec['from'], rc[0])
    nodes = list(graph)
    join = next((i for i, c in enumerate(rc[:200]) if min(hav(c, p) for p in nodes) < 1), None)
    if join is None:
        raise SystemExit(f"{spec['id']}: the route never runs on the {spec['ref']} near its start")
    path, off_a = road_path(graph, spec['from'], rc[join])
    path[-1] = tuple(rc[join][:2])
    coords = [[round(lon, 6), round(lat, 6), round(ele(lon, lat), 1)] for lon, lat in path]
    length = sum(hav(p, q) for p, q in zip(coords, coords[1:]))
    route['leadIn'] = {'name': spec['name'], 'coords': coords, 'join': join}
    json.dump(route, open(file, 'w', encoding='utf-8'), separators=(',', ':'), ensure_ascii=False)
    for entry in index:
        if entry['id'] == spec['id']:
            entry['leadInKm'] = round(length / 1000, 2)
    json.dump(index, open('public/routes/index.json', 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
    cut = sum(hav(p, q) for p, q in zip(rc[:join], rc[1:join + 1]))
    print(f"{spec['id']}: lead-in from {spec['name']} {length / 1000:.2f} km, {coords[0][2]:.0f} → {coords[-1][2]:.0f} m, "
          f"{len(coords)} points, joins at route point {join} (replaces the first {cut:.0f} m; start {off_a:.0f} m from the given point)")

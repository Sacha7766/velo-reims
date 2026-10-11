# Cap de Formentor, Mirador es Colomer (hero F2): Talaia d'Albercutx watchtower, Parietti monument,
# viewpoint walkway with stone parapets. Positions are OpenStreetMap (ODbL) ways and nodes, see DATA.
# Heights are flat (no DEM drape): the walkway and monument sit on the ground plane at their origin.
import math, random
SCRATCH_PREVIEW = "/private/tmp/claude-501/-Users-chrisperkles-Documents-Git/879f1900-260f-4026-a18b-bb1a6429320c/scratchpad/blender"
_src = open(SERPENTINE + "/scripts/blender/bhelp.py").read()
_src = _src.replace('PREVIEW_DIR = "/tmp/serpentine-blender-previews"', 'PREVIEW_DIR = %r' % SCRATCH_PREVIEW)
exec(_src)

col = fresh_collection("FormentorMirador")
# OSM lon/lat: walkway (footway 27445508 + 464795273), path 2 (425545011 + 425545012), viewpoint walls
# (barrier=wall 375106403, 991753708), viewpoint node 301337647, Parietti memorial node 3784965182,
# Talaia d'Albercutx tower way 256182974.
DATA = {"WALK": [[3.112389, 39.930979], [3.112245, 39.930917], [3.112186, 39.930903], [3.112135, 39.930875], [3.112075, 39.930835], [3.112013, 39.930751], [3.111925, 39.930666], [3.111831, 39.930607], [3.111755, 39.930502], [3.111712, 39.930478], [3.111668, 39.930415], [3.111675, 39.930343], [3.111638, 39.930296], [3.111606, 39.93026], [3.111653, 39.930233], [3.111575, 39.930217], [3.111587, 39.930177], [3.111559, 39.930135], [3.111495, 39.930092], [3.11148, 39.930042], [3.111423, 39.93], [3.111433, 39.929956], [3.111379, 39.929927], [3.111321, 39.929916], [3.111241, 39.929852], [3.11113, 39.929769], [3.111012, 39.929702], [3.110872, 39.929618], [3.110693, 39.929449], [3.110566, 39.929307], [3.110528, 39.929184], [3.110498, 39.929061], [3.110559, 39.929002], [3.110688, 39.928877]], "PATH2": [[3.112245, 39.930917], [3.112318, 39.93087], [3.112411, 39.930903], [3.112465, 39.930946]], "WALL_A": [[3.112267, 39.930963], [3.112312, 39.930994], [3.11236, 39.930997], [3.112395, 39.931001], [3.112424, 39.930982], [3.112426, 39.930969], [3.11247, 39.930961], [3.11249, 39.930948], [3.112479, 39.930921], [3.112451, 39.930871], [3.112404, 39.930855]], "WALL_B": [[3.112325, 39.930903], [3.112375, 39.930929], [3.112394, 39.930954], [3.112426, 39.930969]], "MIRADOR": [3.1123889, 39.9309795], "PARIETTI": [3.1103804, 39.929266], "TOWER_WAY": [[3.117169, 39.928779], [3.117176, 39.928784], [3.117184, 39.928787], [3.117194, 39.928788], [3.117204, 39.928787], [3.117213, 39.928783], [3.11722, 39.928776], [3.117224, 39.928769], [3.117224, 39.928761], [3.11722, 39.928753], [3.117214, 39.928747], [3.117205, 39.928743], [3.117195, 39.928741], [3.117185, 39.928742], [3.117176, 39.928745], [3.117169, 39.92875], [3.117164, 39.928757], [3.117163, 39.928764], [3.117164, 39.928772], [3.117169, 39.928779]]}

KY = 110574.0  # metres per degree latitude


def kx(lat):
    return 111320.0 * math.cos(math.radians(lat))


def proj(lonlat, o):
    """OSM (lon, lat) -> metres east/north of origin o = (lon, lat)."""
    return Vector(((lonlat[0] - o[0]) * kx(o[1]), (lonlat[1] - o[1]) * KY))


def stone_set(p):
    return [
        material(p + "_block_a_stone", "#d4c4a3", 0.9),
        material(p + "_block_b_stone", "#c2b08e", 0.92),
        material(p + "_block_c_stone", "#b5a283", 0.93),
        material(p + "_mortar_stone", "#6b6150", 0.95),
        material(p + "_cap_stone", "#ddd2b8", 0.88),
    ]


def prism(mb, b, t, mi, rng=None, jit=0.0):
    """Closed hexahedron from 4 bottom points b and 4 top points t (same order), material slot mi."""
    def J(p, s):
        if not s or rng is None:
            return Vector(p)
        return Vector((p.x + rng.uniform(-s, s), p.y + rng.uniform(-s, s), p.z + rng.uniform(-s, s) * 0.2))
    bv = [mb.bm.verts.new(J(p, jit)) for p in b]
    tv = [mb.bm.verts.new(J(p, jit)) for p in t]
    faces = [(bv[0], bv[3], bv[2], bv[1]), (tv[0], tv[1], tv[2], tv[3])]
    for i in range(4):
        j = (i + 1) % 4
        faces.append((bv[i], bv[j], tv[j], tv[i]))
    for q in faces:
        mb.bm.faces.new(q).material_index = mi


def cumlen(pts):
    c = [0.0]
    for a, b in zip(pts, pts[1:]):
        c.append(c[-1] + (b - a).length)
    return c


def at(pts, cum, s):
    """Point and unit tangent (2D) at arc length s along a polyline."""
    s = min(max(s, 0.0), cum[-1])
    for k in range(len(pts) - 1):
        if s <= cum[k + 1] or k == len(pts) - 2:
            seg = cum[k + 1] - cum[k]
            t = (s - cum[k]) / seg if seg > 1e-9 else 0.0
            p = pts[k].lerp(pts[k + 1], min(max(t, 0.0), 1.0))
            d = (pts[k + 1] - pts[k]).normalized()
            return p, d


def band(pa, na, pb, nb, o1, o2, z0, z1):
    """Prism corners between two stations a and b, offset o1..o2 along the normals, from z0 to z1."""
    def ring(z):
        return [Vector(((pa + na * o1).x, (pa + na * o1).y, z)), Vector(((pb + nb * o1).x, (pb + nb * o1).y, z)),
                Vector(((pb + nb * o2).x, (pb + nb * o2).y, z)), Vector(((pa + na * o2).x, (pa + na * o2).y, z))]
    return ring(z0), ring(z1)


def wall_run(mb, pts, rng, mats, off, sign, seglen, tiers, end=None):
    """Stone parapet / wall along a polyline. off = centre line offset along the right normal (x sign).
    tiers = [(z0, z1, half_thickness, material index or None)], each tier one block per run segment."""
    cum = cumlen(pts)
    total = cum[-1] if end is None else min(end, cum[-1])
    s = 0.0
    while s < total - 0.05:
        s1 = min(total, s + rng.uniform(*seglen))
        if total - s1 < 0.35:
            s1 = total
        pa, da = at(pts, cum, s)
        pb, db = at(pts, cum, s1)
        na = Vector((da.y, -da.x)) * sign
        nb = Vector((db.y, -db.x)) * sign
        for (z0, z1, half, mi) in tiers:
            m = mi if mi is not None else rng.randrange(3)
            b, t = band(pa, na, pb, nb, off - half, off + half, z0, z1)
            prism(mb, b, t, m, rng, 0.025)
        s = s1


def paving(mb, pts, rng, mats, width):
    """Mortar bed plus two staggered rows of irregular flagstones, top at z = 0.10."""
    cum = cumlen(pts)
    total = cum[-1]
    s = 0.0
    while s < total - 1e-6:
        s1 = min(total, s + 1.5)
        pa, da = at(pts, cum, s)
        pb, db = at(pts, cum, s1)
        na = Vector((da.y, -da.x))
        nb = Vector((db.y, -db.x))
        quad = [Vector((q.x, q.y, 0.0)) for q in (pa + na * width / 2, pb + nb * width / 2,
                                                  pb - nb * width / 2, pa - na * width / 2)]
        mb.quad(quad, 3)
        s = s1
    for (o1, o2, s0) in ((-width / 2 + 0.03, -0.015, 0.0), (0.015, width / 2 - 0.03, rng.uniform(0.3, 0.6))):
        s = s0
        while s < total - 0.2:
            s1 = min(total, s + rng.uniform(0.7, 1.2))
            if total - s1 < 0.3:
                s1 = total
            pa, da = at(pts, cum, s)
            pb, db = at(pts, cum, s1)
            na = Vector((da.y, -da.x))
            nb = Vector((db.y, -db.x))
            b, t = band(pa, na, pb, nb, o1, o2, 0.0, 0.10)
            prism(mb, b, t, rng.randrange(3), rng, 0.03)
            s = s1


def tower(mb, rng, H=9.0, r0=2.5, r1=2.15, thick=0.9, course=0.4, door=math.radians(-35)):
    """Round dry-stone talaia: tapered shell of irregular courses, dark door and slits, parapet ring."""
    def R(z):
        return r0 + (r1 - r0) * z / H

    def P(r, a):
        return (r * math.cos(a), r * math.sin(a))

    def V3(xy, z):
        return Vector((xy[0], xy[1], z))

    def ri(r):
        return r - thick

    z = 0.0
    while z < H - 1e-6:
        h = min(course * rng.uniform(0.85, 1.15), H - z)
        if H - (z + h) < 0.2:
            h = H - z
        spans = [rng.uniform(0.7, 1.3) for _ in range(13)]
        tot = sum(spans)
        a = rng.uniform(0, 2 * math.pi)
        for w in spans:
            b = a + w / tot * 2 * math.pi
            ro0, ro1 = R(z), R(z + h)
            bot = [V3(P(ro0, a), z), V3(P(ro0, b), z), V3(P(ri(ro0), b), z), V3(P(ri(ro0), a), z)]
            top = [V3(P(ro1, a), z + h), V3(P(ro1, b), z + h), V3(P(ri(ro1), b), z + h), V3(P(ri(ro1), a), z + h)]
            prism(mb, bot, top, rng.randrange(3), rng, 0.05)
            a = b
        z += h

    def plate(z0, z1, a0, a1, ro_add, ri_add, mi):
        Rz = R((z0 + z1) / 2)
        ro, rin = Rz + ro_add, Rz + ri_add
        b = [V3(P(ro, a0), z0), V3(P(ro, a1), z0), V3(P(rin, a1), z0), V3(P(rin, a0), z0)]
        t = [V3(P(ro, a0), z1), V3(P(ro, a1), z1), V3(P(rin, a1), z1), V3(P(rin, a0), z1)]
        prism(mb, b, t, mi)

    # door (faces ESE toward the access path): dark opening plate with a cap-stone lintel
    plate(2.6, 4.3, door - 0.2, door + 0.2, 0.035, -0.02, 5)
    plate(4.3, 4.55, door - 0.27, door + 0.27, 0.06, -0.05, 4)
    # two slit windows
    plate(5.8, 6.6, door + 2.3 - 0.07, door + 2.3 + 0.07, 0.03, -0.02, 5)
    plate(5.8, 6.6, door - 2.5 - 0.07, door - 2.5 + 0.07, 0.03, -0.02, 5)

    # parapet ring with merlon gaps
    Rt = R(H)
    n = 14
    for i in range(n):
        if i % 4 == 3:
            continue
        a0 = 2 * math.pi * i / n
        a1 = 2 * math.pi * (i + 0.8) / n
        bot = [V3(P(Rt, a0), H), V3(P(Rt, a1), H), V3(P(Rt - 0.5, a1), H), V3(P(Rt - 0.5, a0), H)]
        top = [V3(P(Rt, a0), H + 0.9), V3(P(Rt, a1), H + 0.9), V3(P(Rt - 0.5, a1), H + 0.9), V3(P(Rt - 0.5, a0), H + 0.9)]
        prism(mb, bot, top, rng.randrange(3), rng, 0.03)
        capb = [V3(P(Rt + 0.05, a0), H + 0.9), V3(P(Rt + 0.05, a1), H + 0.9),
                V3(P(Rt - 0.55, a1), H + 0.9), V3(P(Rt - 0.55, a0), H + 0.9)]
        capt = [V3(P(Rt + 0.05, a0), H + 0.98), V3(P(Rt + 0.05, a1), H + 0.98),
                V3(P(Rt - 0.55, a1), H + 0.98), V3(P(Rt - 0.55, a0), H + 0.98)]
        prism(mb, capb, capt, 4, rng, 0.01)
    # floor of the platform inside the shell
    c = mb.bm.verts.new(Vector((0.0, 0.0, H)))
    ring = [mb.bm.verts.new(Vector((*P(ri(Rt), 2 * math.pi * k / 20), H))) for k in range(20)]
    for k in range(20):
        mb.bm.faces.new([c, ring[k], ring[(k + 1) % 20]]).material_index = 1


def parietti(mb, rng):
    """Memorial stone: stepped plinth, tapered stele with a lighter inscription panel on the +Y face, cap."""
    def box(x0, x1, y0, y1, z0, z1, mi):
        b = [Vector((x0, y0, z0)), Vector((x1, y0, z0)), Vector((x1, y1, z0)), Vector((x0, y1, z0))]
        t = [Vector((x0, y0, z1)), Vector((x1, y0, z1)), Vector((x1, y1, z1)), Vector((x0, y1, z1))]
        prism(mb, b, t, mi, rng, 0.012)

    box(-1.2, 1.2, -0.9, 0.9, 0.0, 0.25, 0)
    box(-0.95, 0.95, -0.65, 0.65, 0.25, 0.6, 1)
    # shaft: 1.0 x 0.6 at z=0.6 tapering to 0.72 x 0.44 at z=2.9
    def half(z):
        f = (z - 0.6) / 2.3
        return 0.5 - 0.14 * f, 0.3 - 0.08 * f
    # shaft as irregular courses, each split into two blocks with an uneven joint
    zs = [0.6, 1.2, 1.85, 2.4, 2.9]
    for z0, z1 in zip(zs, zs[1:]):
        f = rng.uniform(-0.2, 0.2)
        for fa, fb in ((-1.0, f), (f, 1.0)):
            bq, tq = [], []
            for z, dst in ((z0, bq), (z1, tq)):
                wx, hd = half(z)
                dst.extend([Vector((fa * wx, -hd, z)), Vector((fb * wx, -hd, z)),
                            Vector((fb * wx, hd, z)), Vector((fa * wx, hd, z))])
            prism(mb, bq, tq, rng.randrange(3), rng, 0.02)
    box(-0.5 - 0.0, 0.5 + 0.0, -0.3, 0.3, 2.9, 3.1, 4)           # cap block, slightly wider than the shaft top
    # inscription panel on the +Y face
    wx1, hd1 = half(1.0)
    wx2, hd2 = half(2.4)
    pb = [Vector((-wx1 + 0.08, hd1, 1.0)), Vector((wx1 - 0.08, hd1, 1.0)),
          Vector((wx1 - 0.08, hd1 + 0.03, 1.0)), Vector((-wx1 + 0.08, hd1 + 0.03, 1.0))]
    pt = [Vector((-wx2 + 0.08, hd2, 2.4)), Vector((wx2 - 0.08, hd2, 2.4)),
          Vector((wx2 - 0.08, hd2 + 0.03, 2.4)), Vector((-wx2 + 0.08, hd2 + 0.03, 2.4))]
    prism(mb, pb, pt, 4)


def build_walk(walk_pts, path2, wall_a, wall_b, rng, mats):
    mb = MeshBuilder(mats)
    paving(mb, walk_pts, rng, mats, 2.0)
    paving(mb, path2, rng, mats, 1.6)
    # parapet on the sea (right-hand, NW) side of the walkway: lower course, upper course, cap stone
    tiers = [(0.0, 0.62, 0.22, None), (0.62, 0.9, 0.18, None), (0.9, 0.98, 0.24, 4)]
    wall_run(mb, walk_pts, rng, mats, 1.25, 1.0, (0.9, 1.6), tiers)
    # viewpoint enclosure walls (OSM barrier=wall), centre line, both faces
    wall_tiers = [(0.0, 0.62, 0.22, None), (0.62, 0.9, 0.18, None), (0.9, 0.98, 0.24, 4)]
    wall_run(mb, wall_a, rng, mats, 0.0, 1.0, (0.9, 1.6), wall_tiers)
    wall_run(mb, wall_b, rng, mats, 0.0, 1.0, (0.9, 1.6), wall_tiers)
    return mb


def tri_count(obj):
    me = obj.data
    me.calc_loop_triangles()
    return len(me.loop_triangles)


out = {}
placements = []
rng_t = random.Random(11)
rng_p = random.Random(23)
rng_w = random.Random(7)

# ---------- Talaia d'Albercutx (OSM way 256182974, historic=tower, material=stone) ----------
ring_ll = DATA["TOWER_WAY"]
o_tower = (sum(p[0] for p in ring_ll) / len(ring_ll), sum(p[1] for p in ring_ll) / len(ring_ll))
mb = MeshBuilder(stone_set("talaia") + [material("talaia_opening_stone", "#3d342a", 0.95)])
tower(mb, rng_t)
tw = mb.to_object("talaia-albercutx", col)
out["talaia-albercutx.glb"] = {"bytes": export_glb([tw], "talaia-albercutx.glb")[1], "tris": tri_count(tw)}
preview([tw], "talaia-albercutx.png", size=(900, 900), dist_scale=1.0, elev=12, azim=35)
placements.append({"model": "talaia-albercutx.glb", "lon": round(o_tower[0], 6), "lat": round(o_tower[1], 6),
                   "rot": 0, "lift": 0,
                   "note": "OSM way 256182974 (historic=tower, man_made=tower, material=stone, heritage 3) "
                           "centroid; peak node 13120868138 (ele 370) is 3 m east. Door faces ESE toward the "
                           "access path (estimated). Height 9 m and 5 m base estimated."})

# ---------- Parietti monument (OSM node 3784965182, historic=memorial, memorial=stone, 1968) ----------
mb = MeshBuilder(stone_set("parietti"))
parietti(mb, rng_p)
pm = mb.to_object("parietti-monument", col)
out["parietti-monument.glb"] = {"bytes": export_glb([pm], "parietti-monument.glb")[1], "tris": tri_count(pm)}
preview([pm], "parietti-monument.png", size=(900, 900), dist_scale=1.0, elev=14, azim=30)
parietti_ll = DATA["PARIETTI"]
placements.append({"model": "parietti-monument.glb", "lon": round(parietti_ll[0], 6), "lat": round(parietti_ll[1], 6),
                   "rot": 42, "lift": 0,
                   "note": "OSM node 3784965182 (historic=memorial, memorial=stone, Antoni Parietti Coll 1968) at the "
                           "coll. Form and size estimated (plinth, stele, inscription panel). Panel faces NE, "
                           "toward the viewpoint (estimated)."})

# ---------- Viewpoint walkway, parapets, viewpoint walls (origin = OSM viewpoint node 301337647) ----------
o_mir = DATA["MIRADOR"]
walk_pts = [proj(p, o_mir) for p in DATA["WALK"]]
path2 = [proj(p, o_mir) for p in DATA["PATH2"]]
wall_a = [proj(p, o_mir) for p in DATA["WALL_A"]]
wall_b = [proj(p, o_mir) for p in DATA["WALL_B"]]
mats_m = stone_set("mirador")
walk = build_walk(walk_pts, path2, wall_a, wall_b, rng_w, mats_m).to_object("mirador-colomer", col)
out["mirador-colomer.glb"] = {"bytes": export_glb([walk], "mirador-colomer.glb")[1], "tris": tri_count(walk)}
# close-up preview of the viewpoint end only (built temporarily, removed afterwards)
close = build_walk(walk_pts[:6], path2, wall_a, wall_b, random.Random(7), mats_m).to_object("mirador-close", col)
preview([close], "mirador-colomer-close.png", size=(900, 700), dist_scale=0.9, elev=28, azim=215)
preview([walk], "mirador-colomer.png", size=(1000, 700), dist_scale=0.9, elev=22, azim=200)
me_close = close.data
bpy.data.objects.remove(close, do_unlink=True)
bpy.data.meshes.remove(me_close)
placements.append({"model": "mirador-colomer.glb", "lon": round(o_mir[0], 6), "lat": round(o_mir[1], 6),
                   "rot": 0, "lift": 0,
                   "note": "OSM node 301337647 tourism=viewpoint 'Mirador d'es Colomer' (origin). Walkway = footway "
                           "27445508 + 464795273 (+ steps/footway 425545011/425545012 as second path); parapets on "
                           "the NW (sea) side, estimated; viewpoint walls barrier=wall 375106403, 991753708. "
                           "Model +Y = north, walkway runs SW. Heights flat (DEM 5 m too noisy at cliff edge)."})

result = {"files": out, "placements": placements,
          "previews": [SCRATCH_PREVIEW + "/" + n for n in ("talaia-albercutx.png", "parietti-monument.png",
                                                            "mirador-colomer.png", "mirador-colomer-close.png")]}

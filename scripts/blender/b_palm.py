# Dwarf fan palm (Chamaerops humilis): a clump of fan leaves on long petioles, a few dry fans
# at the base. Geometry only (thin leaflet blades), origin at the ground, ~1.3 m tall.
exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())
import random
col = fresh_collection("Med_Palm")
rnd = random.Random(5)
green = material("palm_green", "#4f6b3a", 0.6)
green2 = material("palm_green2", "#5f7a44", 0.55)
dry = material("palm_dry", "#8a7350", 0.85)
fibre = material("palm_fibre", "#4a3a2a", 0.9)
mb = MeshBuilder([green, green2, dry, fibre])
# fibrous stub of stems
mb.tube((0, 0, 0), (0.02, 0.01, 0.28), 0.13, 3, 8, 0.09)
fans = 16
for k in range(fans):
    a = 2 * math.pi * k / fans + rnd.uniform(-0.2, 0.2)
    dead = k % 7 == 0
    up = rnd.uniform(0.55, 1.1) if not dead else rnd.uniform(0.0, 0.3)
    L = rnd.uniform(0.55, 0.9)
    d = Vector((math.cos(a), math.sin(a), up)).normalized()
    base = Vector((0, 0, 0.22))
    tip = base + d * L
    mb.tube(base, tip, 0.012, 3 if not dead else 2, 4)
    # the fan: leaflets radiating from the petiole tip across ~200°, facing up and outwards
    side = Vector((-math.sin(a), math.cos(a), 0))
    face = d.cross(side).normalized()
    if face.z < 0:
        face = -face
    n_leaf = 18
    for j in range(n_leaf):
        t = (j / (n_leaf - 1) - 0.5) * math.radians(200)
        ray = (d * math.cos(t) + side * math.sin(t)).normalized()
        ray = (ray + face * 0.15).normalized()
        ln = rnd.uniform(0.32, 0.45) * (0.85 + 0.15 * math.cos(t))
        droop = Vector((0, 0, -0.08 * ln))
        p0 = tip
        p1 = tip + ray * ln * 0.55 + droop * 0.3
        p2 = tip + ray * ln + droop
        w = 0.022
        wv = ray.cross(face).normalized() * w
        m = 2 if dead else (0 if j % 2 else 1)
        mb.quad([p0 - wv * 0.3, p1 - wv, p1 + wv, p0 + wv * 0.3], m)
        mb.quad([p1 - wv, p2, p2, p1 + wv], m)
palm = mb.to_object("palm", col)
palm.location = (0, 0, 0)
size = export_glb([palm], "palm.glb")[1]
palm.location = (50, -20, 0)
img = preview([palm], "palm.png", size=(600, 500), dist_scale=0.9, elev=25, azim=30)
result = {"size": size, "tris": sum(len(p.vertices) - 2 for p in palm.data.polygons)}

# Austrian roadside props for the Gaisberg (each exported as its own GLB, origin at ground).
exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())
from mathutils import Euler

col = fresh_collection("Gaisberg_Props")
M = {
    "wood": material("p_wood", "#7a5536", 0.8),
    "wood_dark": material("p_wood_dark", "#4a3322", 0.85),
    "larch": material("p_larch", "#8b6a45", 0.8),
    "steel": material("p_steel", "#9aa0a5", 0.45, 0.6),
    "green": material("p_green", "#1f5a32", 0.6),
    "yellow": material("p_yellow", "#f2c400", 0.5),
    "red": material("p_red", "#c8201e", 0.55),
    "white": material("p_white", "#f2f1ec", 0.6),
    "stone": material("p_stone", "#8d8a83", 0.95),
    "black": material("p_black", "#1c1c1e", 0.6),
    "gold": material("p_gold", "#c9a227", 0.35, 0.8),
    "ceramic": material("p_ceramic", "#e9e6dc", 0.3),
    "skin": material("p_corpus", "#d8c6a8", 0.7),
}
built = {}


def make(name, parts_fn, mats):
    mb = MeshBuilder([M[m] for m in mats])
    parts_fn(mb, {m: i for i, m in enumerate(mats)})
    ob = mb.to_object(name, col)
    built[name] = ob
    return ob


# 1. bench: larch slats on dark steel legs
def bench(mb, k):
    for x in (-0.8, 0.8):
        mb.box((x, 0, 0.22), (0.06, 0.42, 0.44), k["steel"])
        mb.box((x, 0.17, 0.62), (0.06, 0.06, 0.45), k["steel"], rot=Euler((math.radians(-12), 0, 0)).to_matrix())
    for i, y in enumerate((-0.15, -0.05, 0.05, 0.15)):
        mb.box((0, y, 0.45), (2.0, 0.085, 0.035), k["larch"])
    for z in (0.62, 0.76):
        mb.box((0, 0.21 + (z - 0.62) * 0.2, z), (2.0, 0.035, 0.1), k["larch"])
make("bench", bench, ["larch", "steel"])


# 2. guidepost (Wegweiser): pole with red-white-red band, yellow Alpenverein-style arrow signs
def guidepost(mb, k):
    mb.tube((0, 0, 0), (0, 0, 2.7), 0.038, k["steel"], 10)
    for i, (z0, z1) in enumerate(((1.25, 1.45), (1.45, 1.65), (1.65, 1.85))):
        mb.tube((0, 0, z0), (0, 0, z1), 0.04, k["red"] if i != 1 else k["white"], 10)
    for z, ang, L in ((2.5, 20, 0.62), (2.32, 160, 0.55), (2.14, 70, 0.5)):
        R = Matrix.Rotation(math.radians(ang), 3, 'Z')
        c = R @ Vector((L / 2 + 0.05, 0, 0)) + Vector((0, 0, z))
        mb.box(c, (L, 0.02, 0.15), k["yellow"], rot=R)
        # arrow tip
        tip = R @ Vector((L + 0.05, 0, 0)) + Vector((0, 0, z))
        mb.box(tip, (0.1, 0.018, 0.1), k["yellow"], rot=R @ Matrix.Rotation(math.radians(45), 3, 'Y'))
make("guidepost", guidepost, ["steel", "red", "white", "yellow"])


# 3. bus stop: pole, round green sign with yellow H, timetable box
def bus_stop(mb, k):
    mb.tube((0, 0, 0), (0, 0, 2.75), 0.035, k["steel"], 10)
    # disc: approximated by a 16-gon prism facing +Y and -Y
    seg, r = 20, 0.24
    for s in (1, -1):
        y = 0.02 * s
        for i in range(seg):
            a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
            mb.quad([(0, y, 2.52), (math.cos(a0) * r, y, 2.52 + math.sin(a0) * r), (math.cos(a1) * r, y, 2.52 + math.sin(a1) * r), (0, y, 2.52)], k["green"])
        hy = 0.026 * s
        mb.box((-0.08, hy, 2.52), (0.045, 0.004, 0.24), k["yellow"])
        mb.box((0.08, hy, 2.52), (0.045, 0.004, 0.24), k["yellow"])
        mb.box((0, hy, 2.52), (0.16, 0.004, 0.045), k["yellow"])
    mb.box((0, 0, 2.52), (0.5, 0.03, 0.02), k["steel"])
    mb.box((0, 0.06, 1.55), (0.36, 0.06, 0.5), k["white"])
make("bus_stop", bus_stop, ["steel", "green", "yellow", "white"])


# 4. wayside cross (Wegkreuz): wooden cross with a little gabled roof on a stone base
def wayside_cross(mb, k):
    mb.box((0, 0, 0.25), (0.6, 0.6, 0.5), k["stone"])
    mb.box((0, 0, 2.0), (0.14, 0.12, 3.0), k["wood_dark"])
    mb.box((0, 0, 2.75), (1.15, 0.12, 0.12), k["wood_dark"])
    # corpus
    mb.box((0, -0.08, 2.35), (0.1, 0.05, 0.62), k["skin"])
    mb.box((0, -0.08, 2.72), (0.82, 0.04, 0.06), k["skin"])
    # roof boards
    for s in (1, -1):
        R = Matrix.Rotation(math.radians(35 * s), 3, 'Y')
        mb.box((0.19 * s, 0, 3.47), (0.48, 0.42, 0.03), k["wood"], rot=R)
make("wayside_cross", wayside_cross, ["stone", "wood_dark", "wood", "skin"])


# 5. summit cross (Gipfelkreuz): 6 m larch cross with braces and a gilded sun ring
def summit_cross(mb, k):
    mb.box((0, 0, 0.35), (1.4, 1.4, 0.7), k["stone"])
    mb.box((0, 0, 3.6), (0.24, 0.22, 6.0), k["larch"])
    mb.box((0, 0, 4.9), (2.6, 0.2, 0.22), k["larch"])
    for s in (1, -1):
        R = Matrix.Rotation(math.radians(45 * s), 3, 'Y')
        mb.box((0.45 * s, 0, 4.45), (0.9, 0.12, 0.1), k["larch"], rot=R)
    seg = 24
    for i in range(seg):
        a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
        mb.tube((math.cos(a0) * 0.55, -0.13, 4.9 + math.sin(a0) * 0.55), (math.cos(a1) * 0.55, -0.13, 4.9 + math.sin(a1) * 0.55), 0.03, k["gold"], 5)
    for i in range(12):
        a = 2 * math.pi * i / 12
        mb.tube((math.cos(a) * 0.18, -0.13, 4.9 + math.sin(a) * 0.18), (math.cos(a) * 0.5, -0.13, 4.9 + math.sin(a) * 0.5), 0.015, k["gold"], 4)
make("summit_cross", summit_cross, ["stone", "larch", "gold"])


# 6. info board on two posts with a small roof
def info_board(mb, k):
    for x in (-0.6, 0.6):
        mb.box((x, 0, 1.0), (0.1, 0.1, 2.0), k["wood_dark"])
    mb.box((0, 0, 1.45), (1.3, 0.05, 0.9), k["white"])
    mb.box((0, 0, 1.45), (1.36, 0.06, 0.96), k["wood_dark"])
    mb.box((0, -0.04, 1.45), (1.2, 0.02, 0.8), k["green"])
    for s in (1, -1):
        R = Matrix.Rotation(math.radians(28 * s), 3, 'X')
        mb.box((0, 0.17 * s, 2.08), (1.6, 0.42, 0.03), k["wood"], rot=R)
make("info_board", info_board, ["wood_dark", "white", "wood", "green"])


# 7. snow fence segment (summit plateau): 6 m of horizontal boards on posts with stays
def snow_fence(mb, k):
    for x in (-3.0, 0.0, 3.0):
        mb.box((x, 0, 1.1), (0.12, 0.12, 2.2), k["wood_dark"])
        mb.tube((x, 0, 2.0), (x, -1.6, 0.0), 0.02, k["steel"], 4)
    for i in range(7):
        z = 0.35 + i * 0.27
        mb.box((0, 0.08, z), (6.2, 0.03, 0.14), k["wood_dark"])
make("snow_fence", snow_fence, ["wood_dark", "steel"])


# 8. power pole: impregnated wooden pole with crossarm and three insulators (lines drawn in code)
def power_pole(mb, k):
    mb.tube((0, 0, -0.3), (0, 0, 9.0), 0.13, k["wood_dark"], 8, r2=0.1)
    mb.box((0, 0, 8.6), (1.9, 0.1, 0.12), k["steel"])
    for x in (-0.85, 0.0, 0.85):
        z = 8.75 if x else 9.15
        mb.tube((x, 0, 8.6), (x, 0, z), 0.035, k["ceramic"], 6)
        mb.tube((x, 0, z), (x, 0, z + 0.05), 0.06, k["ceramic"], 8)
make("power_pole", power_pole, ["wood_dark", "steel", "ceramic"])


# 9. firewood stack (Holzstoß) as found beside farmhouses and forest roads
def firewood(mb, k):
    import random
    rnd = random.Random(4)
    mb.box((0, 0, 0.05), (3.2, 1.0, 0.1), k["wood_dark"])
    for row in range(5):
        for i in range(14):
            x = -1.45 + i * 0.22 + (0.11 if row % 2 else 0)
            if x > 1.5:
                continue
            r = 0.09 + rnd.random() * 0.03
            z = 0.2 + row * 0.2
            mb.tube((x, -0.5, z), (x, 0.5, z), r, k["larch"] if rnd.random() > 0.3 else k["wood"], 7)
    for s in (1, -1):
        R = Matrix.Rotation(math.radians(18 * s), 3, 'X')
        mb.box((0, 0.3 * s, 1.32), (3.4, 0.7, 0.03), k["wood_dark"], rot=R)
make("firewood", firewood, ["wood_dark", "larch", "wood"])

paths = {}
for name, ob in built.items():
    loc = ob.location.copy()
    ob.location = (0, 0, 0)
    p, size = export_glb([ob], f"prop-{name}.glb")
    paths[name] = size
# lay them out in a row for the preview and for the user to see in Blender
for i, ob in enumerate(built.values()):
    ob.location = (i * 3.6 - 14, 0, 0)
img = preview(list(built.values()), "props.png", size=(1400, 700), dist_scale=0.45, elev=14, azim=12)
result = {"exported": paths, "preview": img}

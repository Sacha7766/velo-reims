# Nus de sa Corbata viewpoint: timber-roofed shelter with bench and rubble back wall,
# and the blue "P" parking sign with a WC plate. Exported to public/models.
# Origin at the ground centre, front (open side / sign face) toward Blender +Y.
exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())
import random
from mathutils import Euler

PREVIEW_DIR = "/private/tmp/claude-501/-Users-chrisperkles-Documents-Git/879f1900-260f-4026-a18b-bb1a6429320c/scratchpad/blender"
os.makedirs(PREVIEW_DIR, exist_ok=True)

col = fresh_collection("SaCalobraMirador")

# Shelter: photo shows pale, weathered honey-coloured boards, so the roof is mid-light, not the dark estimate.
SH = {
    "roof": material("mirador_roof_wood", "#a0804f", 0.88),
    "post": material("mirador_post_wood", "#7a5a3a", 0.9),
    "bench": material("mirador_bench_wood", "#8f6d48", 0.9),
    "rub1": material("mirador_rubble_stone", "#c9b896", 0.92),
    "rub2": material("mirador_rubble2_stone", "#b8a582", 0.92),
    "cap": material("mirador_cap_stone", "#e6dbc2", 0.9),
    "pad": material("mirador_pad_stone", "#aaa291", 0.95),
}

PAD_TOP = 0.10
ROOF_EAVE_Z = 2.40   # front (+Y) edge
ROOF_RIDGE_Z = 3.00  # back (-Y) edge
ROOF_MID_Z = (ROOF_EAVE_Z + ROOF_RIDGE_Z) / 2


def shelter(mb, k):
    # concrete-look pad, slightly larger than the footprint
    mb.box((0, 0, PAD_TOP / 2), (6.6, 3.8, PAD_TOP), k["pad"])

    # low rubble-stone back wall: three courses of irregular stones, 1.1 m high, 6 m long
    rnd = random.Random(7)
    for c in range(3):
        z0 = PAD_TOP + c * 0.34
        x = -3.0
        while x < 2.95:
            L = min(rnd.uniform(0.45, 0.9), 3.0 - x)
            H = 0.33 + rnd.uniform(-0.02, 0.02)
            D = 0.40 + rnd.uniform(-0.03, 0.03)
            yc = -1.40 + rnd.uniform(-0.02, 0.02)
            mat = k["rub1"] if rnd.random() < 0.6 else k["rub2"]
            mb.box((x + L / 2, yc, z0 + H / 2), (L - 0.03, D, H), mat)
            x += L
    # cream dressed cap on the wall
    mb.box((0, -1.40, 1.14), (6.1, 0.52, 0.06), k["cap"])

    # six square timber posts: three front (open side), three at the back, inside the wall line
    for x in (-2.85, 0.0, 2.85):
        mb.box((x, 1.35, PAD_TOP + (2.30 - PAD_TOP) / 2), (0.15, 0.15, 2.30 - PAD_TOP), k["post"])
        mb.box((x, -1.35, PAD_TOP + (2.78 - PAD_TOP) / 2), (0.15, 0.15, 2.78 - PAD_TOP), k["post"])

    # wall plates carrying the rafters, front and back
    mb.box((0, 1.35, 2.36), (6.2, 0.12, 0.12), k["post"])
    mb.box((0, -1.35, 2.84), (6.2, 0.12, 0.12), k["post"])

    # mono-pitch roof of eight boards, falling 0.6 m from back to front, slight overhang
    a = math.atan((ROOF_RIDGE_Z - ROOF_EAVE_Z) / 3.44)
    R = Matrix.Rotation(-a, 3, 'X')
    for i in range(8):
        x = -2.8 + i * 0.8
        mb.box((x, 0, ROOF_MID_Z), (0.72, 3.44, 0.05), k["roof"], rot=R)
    # front fascia board along the eave
    mb.box((0, 1.66, 2.33), (6.4, 0.10, 0.14), k["post"])

    # timber bench against the back wall: four slats on two end blocks
    for y in (-1.02, -0.94, -0.86, -0.78):
        mb.box((0, y, 0.48), (3.6, 0.07, 0.035), k["bench"])
    for x in (-1.7, 1.7):
        mb.box((x, -0.90, 0.285), (0.07, 0.42, 0.37), k["bench"])


mb = MeshBuilder([SH[m] for m in ("roof", "post", "bench", "rub1", "rub2", "cap", "pad")])
shelter(mb, {"roof": 0, "post": 1, "bench": 2, "rub1": 3, "rub2": 4, "cap": 5, "pad": 6})
shelter_ob = mb.to_object("mirador-shelter", col)

# Sign: grey pole 2.3 m, blue square P sign (front face +Y), small white WC plate under it.
SG = {
    "steel": material("sign_steel", "#8c9196", 0.9, 0.0),
    "blue": material("sign_blue", "#1f5fa8", 0.9),
    "white": material("sign_white", "#f4f4f0", 0.9),
    "dark": material("sign_dark", "#1c2630", 0.9),
}
SIGN_Z = 1.95


def sign(mb, k):
    mb.tube((0, 0, 0), (0, 0, 2.3), 0.035, 0, 8)
    mb.box((0, 0.02, SIGN_Z), (0.05, 0.05, 0.05), 0)  # bracket
    mb.box((0, 0.045, SIGN_Z), (0.6, 0.03, 0.6), 1)  # blue plate

    def glyph(u0, u1, v0, v1):
        # u is mirrored: from the +Y face, +X points to the viewer's left
        mb.box((-(u0 + u1) / 2, 0.066, SIGN_Z + (v0 + v1) / 2), (u1 - u0, 0.01, v1 - v0), 2)

    # white P: stem, top bar, bowl right side, middle bar
    glyph(-0.12, -0.08, -0.18, 0.18)
    glyph(-0.12, 0.08, 0.12, 0.18)
    glyph(0.04, 0.08, -0.02, 0.18)
    glyph(-0.12, 0.08, -0.02, 0.02)

    # WC plate under the sign, white, with a simple dark pictogram (two figures)
    mb.box((0, 0.045, 1.55), (0.24, 0.03, 0.16), 2)
    for x in (-0.05, 0.05):
        mb.box((x, 0.066, 1.61), (0.025, 0.01, 0.025), 3)
        mb.box((x, 0.066, 1.53), (0.05, 0.01, 0.07), 3)


mb = MeshBuilder([SG[m] for m in ("steel", "blue", "white", "dark")])
sign(mb, None)
sign_ob = mb.to_object("prop-parking_sign", col)


def tri_count(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


shelter_tris = tri_count(shelter_ob)
sign_tris = tri_count(sign_ob)
shelter_path, shelter_size = export_glb([shelter_ob], "mirador-shelter.glb")
sign_path, sign_size = export_glb([sign_ob], "prop-parking_sign.glb")
shelter_png = preview([shelter_ob], "mirador-shelter.png", size=(1000, 700), dist_scale=1.0, elev=20, azim=150)
sign_png = preview([sign_ob], "parking-sign.png", size=(600, 800), dist_scale=1.2, elev=8, azim=160)

result = {
    "shelter_glb": shelter_path, "shelter_bytes": shelter_size, "shelter_tris": shelter_tris,
    "sign_glb": sign_path, "sign_bytes": sign_size, "sign_tris": sign_tris,
    "shelter_png": shelter_png, "sign_png": sign_png,
}

# Road bike + rider parts for src/engine/Rider.ts → public/models/rider.glb.
# Coordinates are authored in the three.js rider frame (+Z forward, +Y up, metres) and converted to
# Blender (x, -z, y) by T() so the glTF comes out right.
#
#   b_rider.py        materials, orchestration, export        (this file)
#   b_rider_bike.py   frame, cockpit, drivetrain, wheel, crank
#   b_rider_body.py   thigh, shin, upperarm, forearm+hand, torso+neck, head+helmet, shoe
#   borg.py           lofting / sweeping / revolve toolkit
#
# Limb parts are authored along +Y = proximal → distal (hip→knee, knee→ankle, shoulder→elbow,
# elbow→hand), centred, lateral = +X (Rider.ts mirrors them for the -X side), the front of a leg or an
# arm is -Z.  The torso is centred, +Y = hip → shoulder, chest = +Z.
exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())
exec(open(SERPENTINE + "/scripts/blender/borg.py").read())
bell = gauss
hp = math.pi / 2

ONLY = globals().get("ONLY")  # dev: build just these parts
want = lambda n: ONLY is None or n in ONLY

col = fresh_collection("Serpentine_Rider")

def mat(name, color, rough, metal=0.0, emit=None, es=0.0):
    m = material(name, color, rough, metal)
    b = m.node_tree.nodes.get("Principled BSDF")
    if emit:
        b.inputs["Emission Color"].default_value = srgb(emit)
        b.inputs["Emission Strength"].default_value = es
    return m

# bike: PBR-ish — glossy paint, matte carbon, rubber, anodised alu
frame = mat("bike_frame", "#e9e9e4", 0.22, 0.25)          # tinted per rider
black = mat("bike_black", "#101113", 0.55, 0.05)           # rubber / hoods / saddle
carbon = mat("bike_carbon", "#17181b", 0.42, 0.25)         # matte UD carbon
alu = mat("bike_alu", "#b4bac1", 0.28, 0.9)
steel = mat("bike_steel", "#6f757c", 0.35, 0.85)
tyre = mat("bike_tyre", "#161617", 0.92)
tan = mat("bike_tanwall", "#a77b4f", 0.8)
bottle = mat("bike_bottle", "#ecece8", 0.28)
decal = mat("bike_decal", "#cfcfc9", 0.35, 0.2)
# rider
jersey = mat("jersey", "#e2462f", 0.88)                     # tinted per rider
accent = mat("accent", "#f4f1ea", 0.85)                     # tinted per rider
shorts = mat("shorts", "#111215", 0.82)
grip = mat("shorts_grip", "#3a3b40", 0.7)
skin = mat("skin", "#c99a7c", 0.52, 0.0, emit="#d4623a", es=0.035)   # slight warm "subsurface" glow
lips = mat("lips", "#b97466", 0.45)
hair = mat("hair", "#2e2119", 0.8)
sock = mat("sock", "#f2f2f2", 0.92)
shoe = mat("shoe", "#f1f1f1", 0.38)
shoe_dark = mat("shoe_dark", "#17181a", 0.5)
sole = mat("shoe_sole", "#1b1c1f", 0.35, 0.2)
helmet = mat("helmet", "#f4f4f4", 0.22)
helmet_dark = mat("helmet_dark", "#121316", 0.7)
strap = mat("strap", "#0c0c0e", 0.85)
lens = mat("lens", "#3b2a63", 0.06, 0.92)
lens2 = mat("lens2", "#1f4a6b", 0.06, 0.92)
rim_black = mat("lens_frame", "#101012", 0.4, 0.1)
glove = mat("glove", "#17171a", 0.9)
glove_palm = mat("glove_palm", "#2b2c30", 0.7)

objs = {}


def obj(name, bm, mats, smooth_shade=True):
    o = to_obj(bm, name, mats, col, smooth_shade)
    objs[name] = o
    return o


def finish(o, level=0, split=40, bevel=None):
    """modifiers: optional bevel + subsurf, edge-split for crisp creases, then bake (apply)."""
    if bevel:
        add_mod(o, 'BEVEL', width=bevel, segments=2, limit_method='ANGLE', angle_limit=math.radians(35))
    if level:
        subsurf(o, level)
    if split:
        edge_split(o, split)
    bake(o)
    return o


WHEEL_R = 0.34
BB = (0, 0.27, -0.09)

if want("bike") or want("wheel") or want("crank"):
    exec(open(SERPENTINE + "/scripts/blender/b_rider_bike.py").read())
if any(want(n) for n in ("thigh", "shin", "upperarm", "forearm", "torso", "head", "shoe")):
    exec(open(SERPENTINE + "/scripts/blender/b_rider_body.py").read())

stats = {n: tris(o) for n, o in objs.items()}
if ONLY is None:
    for name, o in objs.items():
        o.location = (0, 0, 0)
    path, size = export_glb(list(objs.values()), "rider.glb")
    result = {"size": size, "tris": stats, "total": sum(stats.values())}
else:
    result = {"tris": stats}

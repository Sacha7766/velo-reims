# Road bike + rider parts for src/engine/Rider.ts. Coordinates are authored in the three.js rider
# frame (+Z forward, +Y up, metres) and converted to Blender (x, -z, y) so the glTF comes out right.
exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())

col = fresh_collection("Serpentine_Rider")
T = lambda x, y, z: Vector((x, -z, y))  # three → blender

frame = material("bike_frame", "#e9e9e4", 0.25, 0.35)
black = material("bike_black", "#121315", 0.45, 0.2)
carbon = material("bike_carbon", "#1a1b1e", 0.3, 0.3)
alu = material("bike_alu", "#9da3a9", 0.3, 0.85)
tyre = material("bike_tyre", "#1b1b1c", 0.85)
tan = material("bike_tanwall", "#a77b4f", 0.8)
bottle = material("bike_bottle", "#e8e8e8", 0.3)
jersey = material("jersey", "#e2462f", 0.55)
accent = material("accent", "#f4f1ea", 0.55)
shorts = material("shorts", "#141518", 0.6)
skin = material("skin", "#c99a7c", 0.6)
sock = material("sock", "#f2f2f2", 0.7)
shoe = material("shoe", "#f1f1f1", 0.35)
helmet = material("helmet", "#f4f4f4", 0.3)
lens = material("lens", "#2a1d3a", 0.1, 0.6)
glove = material("glove", "#151515", 0.6)

objs = {}

def obj(name, mb):
    o = mb.to_object(name, col)
    objs[name] = o
    return o

# ------------------------------------------------------------------ bike frame
WHEEL_R = 0.34
BB = (0, 0.27, -0.09)
rear, front = (0, WHEEL_R, -0.5), (0, WHEEL_R, 0.5)
seat_top, head_top, head_bot = (0, 0.79, -0.245), (0, 0.86, 0.38), (0, 0.72, 0.42)
mb = MeshBuilder([frame, black, alu, bottle, carbon])
def t(a, b, r, m=0, seg=10, r2=None):
    mb.tube(T(*a), T(*b), r, m, seg, r2)
t(BB, seat_top, 0.022)                  # seat tube
t(seat_top, head_top, 0.02, 0, 10, 0.022)   # top tube
t(BB, head_bot, 0.03, 0, 12, 0.026)     # down tube (oversized)
t(head_bot, head_top, 0.026, 0, 12)     # head tube
for s in (-0.055, 0.055):
    t((s, 0.27, -0.12), (s, WHEEL_R, -0.5), 0.011)          # chainstays
    t((s * 0.8, 0.74, -0.27), (s, WHEEL_R, -0.5), 0.01)     # dropped seatstays
    t((s * 0.9, 0.72, 0.43), (s, WHEEL_R, 0.5), 0.013, 0, 8, 0.009)  # fork legs
t((0, 0.72, 0.43), (0, 0.68, 0.44), 0.03)  # fork crown
# seatpost + saddle
t(seat_top, (0, 0.95, -0.285), 0.014, 4)
mb.box(T(0, 0.968, -0.3), (0.13, 0.27, 0.04), 1)
mb.box(T(0, 0.962, -0.39), (0.14, 0.08, 0.035), 1)
# stem + bars (drops and hoods)
t(head_top, (0, 0.9, 0.47), 0.016, 1)
t((-0.2, 0.9, 0.47), (0.2, 0.9, 0.47), 0.014, 1)
for s in (-1, 1):
    t((0.2 * s, 0.9, 0.47), (0.2 * s, 0.92, 0.55), 0.014, 1)    # hood body
    t((0.2 * s, 0.92, 0.55), (0.2 * s, 0.95, 0.56), 0.016, 1)   # hood top
    t((0.2 * s, 0.9, 0.47), (0.2 * s, 0.84, 0.53), 0.013, 1)    # drop
    t((0.2 * s, 0.84, 0.53), (0.2 * s, 0.79, 0.47), 0.013, 1)
    t((0.2 * s, 0.79, 0.47), (0.2 * s, 0.78, 0.38), 0.013, 1)
# bottle in cage on the down tube
t((0, 0.42, 0.06), (0, 0.6, 0.22), 0.036, 3, 12)
# rear derailleur + cassette (at the right side, +x)
mb.box(T(0.07, 0.24, -0.48), (0.02, 0.08, 0.12), 2)
t((0.06, WHEEL_R, -0.5), (0.085, WHEEL_R, -0.5), 0.055, 2, 14)
# chain (upper and lower runs)
t((0.07, 0.27 + 0.1, -0.09), (0.07, WHEEL_R + 0.05, -0.5), 0.004, 1, 4)
t((0.07, 0.27 - 0.1, -0.09), (0.07, WHEEL_R - 0.06, -0.5), 0.004, 1, 4)
obj("bike", mb)

# ------------------------------------------------------------------ wheels (origin at the axle)
def wheel(name):
    mb = MeshBuilder([tyre, carbon, alu, tan])
    seg = 48
    for i in range(seg):
        a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
        p = lambda a, r, x: T(x, math.cos(a) * r, math.sin(a) * r)
        # tyre: torus-ish section of 4 quads
        for (r0, x0), (r1, x1), m in (((WHEEL_R, 0.0), (WHEEL_R - 0.012, 0.013), 0), ((WHEEL_R - 0.012, 0.013), (WHEEL_R - 0.026, 0.012), 3),
                                       ((WHEEL_R, 0.0), (WHEEL_R - 0.012, -0.013), 0), ((WHEEL_R - 0.012, -0.013), (WHEEL_R - 0.026, -0.012), 3)):
            mb.quad([p(a0, r0, x0), p(a1, r0, x0), p(a1, r1, x1), p(a0, r1, x1)], m)
        # deep carbon rim 45 mm
        for x in (0.0115, -0.0115):
            mb.quad([p(a0, WHEEL_R - 0.026, x), p(a1, WHEEL_R - 0.026, x), p(a1, WHEEL_R - 0.072, x * 0.8), p(a0, WHEEL_R - 0.072, x * 0.8)], 1)
    for k in range(24):
        a = 2 * math.pi * k / 24
        side = 0.022 if k % 2 else -0.022
        mb.tube(T(side, 0, 0), T(0, math.cos(a) * (WHEEL_R - 0.07), math.sin(a) * (WHEEL_R - 0.07)), 0.0012, 2, 3)
    mb.tube(T(-0.05, 0, 0), T(0.05, 0, 0), 0.018, 2, 10)
    return obj(name, mb)
wheel("wheel")

# ------------------------------------------------------------------ crankset (origin at the bottom bracket)
mb = MeshBuilder([carbon, alu])
for r, x in ((0.105, 0.06), (0.08, 0.052)):
    mb.tube(T(x - 0.003, 0, 0), T(x + 0.003, 0, 0), r, 1, 36)
for s in (-1, 1):
    mb.tube(T(0.07 * s, 0, 0), T(0.07 * s, s * 0.1725, 0), 0.012, 0, 8)
    mb.box(T(0.1 * s, s * 0.1725, 0), (0.07, 0.09, 0.015), 1)
obj("crank", mb)

# ------------------------------------------------------------------ rider parts (modelled along +Y_three, centred, unit length handled in code)
def segment(name, length, profile, mats_by_t):
    """Lofted limb along three +Y: profile [(t, rx, rz)], mats_by_t [(t_from, material)] from bottom (t=0) to top."""
    mats = [m for _, m in mats_by_t]
    mb = MeshBuilder(mats)
    seg = 14
    rings = []
    for (tt, rx, rz) in profile:
        y = (tt - 0.5) * length
        rings.append([(math.cos(2 * math.pi * i / seg) * rx, y, math.sin(2 * math.pi * i / seg) * rz) for i in range(seg)])
    for k in range(len(rings) - 1):
        tm = (profile[k][0] + profile[k + 1][0]) / 2
        mi = 0
        for j, (tf, _) in enumerate(mats_by_t):
            if tm >= tf:
                mi = j
        for i in range(seg):
            j = (i + 1) % seg
            a, b = rings[k][i], rings[k][j]
            c, d = rings[k + 1][j], rings[k + 1][i]
            mb.quad([T(*a), T(*b), T(*c), T(*d)], mi)
    # caps
    for ring, m in ((rings[0], 0), (rings[-1], len(mats) - 1)):
        mb.quad([T(*ring[i]) for i in range(0, seg, seg // 4)][:4], m)
    o = obj(name, mb)
    for p in o.data.polygons:
        p.use_smooth = True
    return o

# thigh 0.45 m: shorts with leg gripper, skin above the knee; quad bulge in the middle
segment("thigh", 0.45, [(0, 0.052, 0.055), (0.15, 0.06, 0.062), (0.4, 0.07, 0.074), (0.65, 0.074, 0.08), (0.85, 0.075, 0.08), (1, 0.07, 0.072)],
        [(0, skin), (0.2, shorts)])
# shin 0.47 m: sock at the bottom, calf bulge high
segment("shin", 0.47, [(0, 0.035, 0.035), (0.14, 0.036, 0.037), (0.3, 0.042, 0.045), (0.6, 0.055, 0.06), (0.78, 0.056, 0.06), (1, 0.048, 0.05)],
        [(0, sock), (0.2, skin)])
# upper arm 0.29: short sleeve
segment("upperarm", 0.29, [(0, 0.037, 0.037), (0.3, 0.043, 0.043), (0.55, 0.047, 0.047), (0.62, 0.049, 0.049), (1, 0.05, 0.052)],
        [(0, skin), (0.55, jersey)])
# forearm 0.29: glove at the end
segment("forearm", 0.29, [(0, 0.026, 0.03), (0.12, 0.03, 0.033), (0.5, 0.036, 0.034), (0.85, 0.04, 0.038), (1, 0.038, 0.036)],
        [(0, glove), (0.12, skin)])

# torso: from hip to shoulder line, flattened, jersey with a white chest band and side panels
mb = MeshBuilder([jersey, accent, shorts])
seg = 20
L = 0.56
prof = [(0, 0.15, 0.12), (0.15, 0.16, 0.12), (0.35, 0.15, 0.115), (0.6, 0.155, 0.11), (0.8, 0.18, 0.11), (0.92, 0.18, 0.1), (1, 0.12, 0.07)]
rings = [[(math.cos(2 * math.pi * i / seg) * rx, (tt - 0.5) * L, math.sin(2 * math.pi * i / seg) * rz) for i in range(seg)] for tt, rx, rz in prof]
for k in range(len(rings) - 1):
    tm = (prof[k][0] + prof[k + 1][0]) / 2
    for i in range(seg):
        j = (i + 1) % seg
        m = 2 if tm < 0.12 else 1 if 0.55 < tm < 0.68 else 0
        mb.quad([T(*rings[k][i]), T(*rings[k][j]), T(*rings[k + 1][j]), T(*rings[k + 1][i])], m)
mb.quad([T(*rings[-1][i]) for i in range(0, seg, seg // 4)][:4], 0)
torso = obj("torso", mb)
for p in torso.data.polygons:
    p.use_smooth = True

# head with aero road helmet (vents), wrap glasses; origin at head centre, facing +Z_three
mb = MeshBuilder([skin, helmet, lens, black])
seg, rings_n = 18, 10
def ellipsoid(cx, cy, cz, rx, ry, rz, m, theta_max=math.pi, skip=None):
    for k in range(rings_n):
        t0, t1 = theta_max * k / rings_n, theta_max * (k + 1) / rings_n
        for i in range(seg):
            if skip and skip(k, i):
                continue
            p0, p1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
            pt = lambda th, ph: T(cx + rx * math.sin(th) * math.cos(ph), cy + ry * math.cos(th), cz + rz * math.sin(th) * math.sin(ph))
            mb.quad([pt(t0, p0), pt(t0, p1), pt(t1, p1), pt(t1, p0)], m)
ellipsoid(0, -0.01, 0.01, 0.075, 0.105, 0.09, 0)
# helmet shell: upper 55 % with three dark vent channels
ellipsoid(0, 0.02, -0.01, 0.105, 0.11, 0.135, 1, math.pi * 0.55,
          skip=lambda k, i: k in (3, 4) and i in (2, 3, 6, 7, 11, 12))
ellipsoid(0, 0.015, -0.01, 0.098, 0.1, 0.128, 3, math.pi * 0.55)
mb.box(T(0, -0.005, 0.088), (0.17, 0.035, 0.03), 2)
for s in (-1, 1):
    mb.box(T(0.078 * s, 0.0, 0.04), (0.012, 0.012, 0.09), 3)
head = obj("head", mb)
for p in head.data.polygons:
    p.use_smooth = True

# shoe: road shoe with stiff sole, origin at the cleat
mb = MeshBuilder([shoe, black])
mb.box(T(0, 0.03, 0.02), (0.085, 0.24, 0.07), 0)
mb.box(T(0, -0.008, 0.02), (0.09, 0.25, 0.015), 1)
mb.box(T(0, 0.05, -0.08), (0.08, 0.06, 0.06), 0)
obj("shoe", mb)

for name, o in objs.items():
    o.location = (0, 0, 0)
path, size = export_glb(list(objs.values()), "rider.glb")
# lay out for a look in Blender
x = -3
for o in objs.values():
    o.location = (x, 8, 0.5)
    x += 0.7
objs["bike"].location = (0, 8, 0)
objs["wheel"].location = Vector((0, 8, 0)) + T(0, WHEEL_R, 0.5)
objs["crank"].location = Vector((0, 8, 0)) + T(*BB)
img = preview([objs["bike"], objs["wheel"], objs["crank"]], "bike.png", size=(900, 600), dist_scale=0.8, elev=8, azim=90)
result = {"size": size, "preview": img, "parts": list(objs)}

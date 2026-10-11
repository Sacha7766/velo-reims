# Nus de la Corbata (Sa Calobra): stone arch underpass under the upper road, Serpentine.
# Lower road runs along Y through the arch (origin = road centre), upper road along X on top.
exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())
import random

random.seed(20261011)
JOINT = 0.025
BOT = -1.0                # foot of facades and end walls (below the ground dip)
ARC_CZ = 1.2              # centre z of the segmental arch circle
R_IN, R_OUT = 4.2, 4.75   # voussoir ring: 0.55 m deep
R_CORE = 4.22             # mortar reveal behind the ring (hidden inside the voussoirs)
C_X = 3.3                 # clear half width of the passage
Z_SP = 3.8                # springing line
DECK_Z0 = 6.55            # deck underside
PREVIEW_DIR = "/private/tmp/claude-501/-Users-chrisperkles-Documents-Git/879f1900-260f-4026-a18b-bb1a6429320c/scratchpad/blender"
os.makedirs(PREVIEW_DIR, exist_ok=True)
col = fresh_collection("SaCalobra")

STONE = [material("nus_rubble_%d_stone" % i, c, 0.9)
         for i, c in enumerate(["#c9b896", "#b8a582", "#d4c4a3", "#a8977a"], 1)]
MORTAR = material("nus_mortar_stone", "#6b6150", 0.95)
DRESS = material("nus_dressed_stone", "#d4c4a3", 0.88)
KEY = material("nus_keystone_stone", "#e2d6bc", 0.88)
VAULT = [material("nus_vault_%s_stone" % k, c, 0.92)
         for k, c in (("a", "#6f6553"), ("b", "#7d7262"), ("c", "#8a7f6b"))]
CAP = material("nus_cap_stone", "#d9cdb2", 0.9)
DECK = material("nus_deck_stone", "#a8977a", 0.92)
ALL = STONE + [MORTAR, DRESS, KEY] + VAULT + [CAP, DECK]
I_STONE = [0, 1, 2, 3]
I_MORT, I_DRESS, I_KEY = 4, 5, 6
I_VAULT = [7, 8, 9]
I_CAP, I_DECK = 10, 11

mb = MeshBuilder(ALL)


def box_pts(p0, p1, mat):
    p0, p1 = Vector(p0), Vector(p1)
    s = (abs(p1.x - p0.x), abs(p1.y - p0.y), abs(p1.z - p0.z))
    if min(s) < 0.01:
        return
    mb.box((p0 + p1) / 2, s, mat)


def prism_xz(pts, y0, y1, mat):
    """Closed prism: polygon in the XZ plane extruded from y0 to y1."""
    y0, y1 = min(y0, y1), max(y0, y1)
    back = [mb.bm.verts.new((x, y0, z)) for x, z in pts]
    front = [mb.bm.verts.new((x, y1, z)) for x, z in pts]
    n = len(pts)
    faces = [back, list(reversed(front))]
    for i in range(n):
        j = (i + 1) % n
        faces.append([back[i], back[j], front[j], front[i]])
    for f in faces:
        mb.bm.faces.new(f).material_index = mat


def pol(R, t):
    return (R * math.cos(t), ARC_CZ + R * math.sin(t))


def to_fac(u, v, n):   # facade / parapet: u = x, v = z, n = y (signed)
    return Vector((u, n, v))


def to_side(u, v, n):  # side walls / end walls: u = y, v = z, n = x (signed)
    return Vector((n, u, v))


def in_S(x, z, m=0.0):
    """Points occupied by the opening, the jamb ring or the voussoir ring (facade plane)."""
    if abs(x) <= C_X + 0.55 + m and z <= Z_SP + m:
        return True
    return z >= Z_SP - m and math.hypot(x, z - ARC_CZ) <= R_OUT + m


def skip_S(ua, ub, va, vb):
    for i in range(5):
        for j in range(5):
            if in_S(ua + (ub - ua) * i / 4, va + (vb - va) * j / 4, 0.03):
                return True
    return False


def fill_block(ua, ub, va, vb, na, nb, to_xyz, skip_fn, depth):
    """Place a stone; where it hits the opening or the ring, split it in halves so the
    wall stays filled up to the arch edge instead of leaving dark holes."""
    if not (skip_fn and skip_fn(ua, ub, va, vb)):
        box_pts(to_xyz(ua, va, na), to_xyz(ub, vb, nb), I_STONE[random.randrange(4)])
        return
    if depth >= 3 or min(ub - ua, vb - va) < 0.22:
        return
    if (ub - ua) >= (vb - va):
        m = (ua + ub) / 2
        fill_block(ua, m - JOINT / 2, va, vb, na, nb, to_xyz, skip_fn, depth + 1)
        fill_block(m + JOINT / 2, ub, va, vb, na, nb, to_xyz, skip_fn, depth + 1)
    else:
        m = (va + vb) / 2
        fill_block(ua, ub, va, m - JOINT / 2, na, nb, to_xyz, skip_fn, depth + 1)
        fill_block(ua, ub, m + JOINT / 2, vb, na, nb, to_xyz, skip_fn, depth + 1)


def course_field(u0, u1, v0, v1, n_a, n_b, to_xyz, skip_fn=None, jit=0.03):
    """Coursed rubble over (u0..u1, v0..v1). Each course is either a long flat course
    (0.25-0.35 m high, 1.0-1.3 m stones) or a squarer one (0.4-0.7 m, 0.4-0.8 m stones);
    every course starts at a random offset, so vertical joints never line up."""
    v = v0
    while v < v1 - 1e-6:
        if random.random() < 0.35:
            h, wlo, whi = random.uniform(0.25, 0.35), 1.0, 1.3
        else:
            h, wlo, whi = random.uniform(0.4, 0.7), 0.4, 0.8
        h = min(h, v1 - v)
        if v1 - (v + h) < 0.2:
            h = v1 - v
        va = v + (JOINT / 2 if v > v0 + 1e-6 else 0)
        vb = v + h - (JOINT / 2 if v + h < v1 - 1e-6 else 0)
        u = u0 - random.uniform(0, whi)
        while u < u1 - 1e-6:
            w = random.uniform(wlo, whi)
            if u1 - (u + w) < 0.3:
                w = u1 - u
            ua = max(u, u0)
            ub = min(u + w, u1)
            if ub - ua >= 0.15:
                ua2 = ua + (JOINT / 2 if ua > u0 + 1e-6 else 0)
                ub2 = ub - (JOINT / 2 if ub < u1 - 1e-6 else 0)
                na = n_a + random.uniform(-jit, jit)
                nb = n_b + random.uniform(-jit, jit)
                fill_block(ua2, ub2, va, vb, na, nb, to_xyz, skip_fn, 0)
            u += w
        v += h


def jamb(sgn, s):
    """Dressed voussoir jamb column (0.55 m deep) beside the opening, one side."""
    xa, xb = (C_X, C_X + 0.55) if s > 0 else (-C_X - 0.55, -C_X)
    z = BOT
    while z < Z_SP - 1e-6:
        h = min(random.uniform(0.45, 0.8), Z_SP - z)
        if Z_SP - (z + h) < 0.3:
            h = Z_SP - z
        za = z + (JOINT / 2 if z > BOT + 1e-6 else 0)
        zb = z + h - (JOINT / 2 if z + h < Z_SP - 1e-6 else 0)
        box_pts((xa, sgn * 3.5, za), (xb, sgn * 4.3, zb), I_DRESS)
        z += h


# ---------- the two facades (y = +-3.5 .. +-4.3), each with a segmental arch opening ----------
CORE_BOT = -0.95
for sgn in (1, -1):
    course_field(-8, 8, BOT, 7.0, sgn * 3.5, sgn * 4.3, to_fac, skip_fn=skip_S, jit=0.03)
    for s in (1, -1):
        jamb(sgn, s)

    # voussoir ring around the arch (radial depth 0.55, 11 stones, lighter dressed stone)
    th_s = math.atan2(Z_SP - ARC_CZ, C_X)          # springing angle (~38 deg)
    NV = 11
    span = math.pi - 2 * th_s
    for k in range(NV):
        t0 = th_s + span * k / NV
        t1 = th_s + span * (k + 1) / NV
        pts = [pol(R_IN, t0), pol(R_IN, t1), pol(R_OUT, t1), pol(R_OUT, t0)]
        key = (k == NV // 2)
        prism_xz(pts, sgn * 3.5, sgn * (4.36 if key else 4.3), I_KEY if key else I_DRESS)

    # mortar core behind the stones: shows dark in every joint and forms the arch reveal
    xc = C_X + 0.01
    zc = ARC_CZ + math.sqrt(R_CORE ** 2 - xc ** 2)
    tc = math.atan2(zc - ARC_CZ, xc)
    core = [(-8, CORE_BOT), (-xc, CORE_BOT), (-xc, zc)]
    core += [pol(R_CORE, (math.pi - tc) - (math.pi - 2 * tc) * k / 20) for k in range(1, 20)]
    core += [(xc, zc), (xc, CORE_BOT), (8, CORE_BOT), (8, 6.98), (-8, 6.98)]
    prism_xz(core, sgn * 3.56, sgn * 4.24, I_MORT)

    # parapet on top of the facade (z 7.0 .. 7.85, 0.45 thick, centred on the wall)
    course_field(-8, 8, 7.0, 7.85, sgn * 3.675, sgn * 4.125, to_fac, jit=0.015)

    # flat cap stones, 0.06 m proud on each side of the parapet
    xs = [-8 + 1.6 * k for k in range(11)]
    for xa, xb in zip(xs[:-1], xs[1:]):
        box_pts((xa + 0.01, sgn * 3.615, 7.85), (xb - 0.01, sgn * 4.185, 7.93), I_CAP)

# ---------- end walls closing the bridge body at x = +-8 (between the facades) ----------
for s in (1, -1):
    course_field(-3.5, 3.5, BOT, DECK_Z0, s * 8.0, s * 7.2, to_side, jit=0.02)

# ---------- passage side walls at x = +-3.3 (from the foot up to the springing line) ----------
for s in (1, -1):
    course_field(-3.55, 3.55, BOT, Z_SP, s * 3.3, s * 3.6, to_side, jit=0.01)

# ---------- barrel vault (soffit) over the 7.0 m passage, darker shadowed masonry ----------
th_s = math.atan2(Z_SP - ARC_CZ, C_X)
NA, NY = 24, 10
Y0, Y1 = -3.56, 3.56
for i in range(NA):
    t0 = th_s + (math.pi - 2 * th_s) * i / NA
    t1 = th_s + (math.pi - 2 * th_s) * (i + 1) / NA
    for j in range(NY):
        ya = Y0 + (Y1 - Y0) * j / NY
        yb = Y0 + (Y1 - Y0) * (j + 1) / NY
        P = [(pol(R_IN, t0), ya), (pol(R_IN, t1), ya), (pol(R_IN, t1), yb), (pol(R_IN, t0), yb)]
        verts = [mb.bm.verts.new((x, y, z)) for (x, z), y in P]
        mb.bm.faces.new(verts).material_index = random.choice(I_VAULT)

# ---------- upper deck slab between the facades (top bare; the app draws the road on it) ----------
box_pts((-8, -3.5, DECK_Z0), (8, 3.5, 6.95), I_DECK)

# drop leftovers of earlier runs of this model only (keeps the object name clean)
for o in list(bpy.data.objects):
    if o.name.startswith("nus-corbata"):
        bpy.data.objects.remove(o, do_unlink=True)
for me in list(bpy.data.meshes):
    if me.name.startswith("nus-corbata") and me.users == 0:
        bpy.data.meshes.remove(me)
ob = mb.to_object("nus-corbata", col)

# triangle count of the final mesh
bm2 = bmesh.new()
bm2.from_mesh(ob.data)
bmesh.ops.triangulate(bm2, faces=bm2.faces[:])
tris = len(bm2.faces)
bm2.free()

glb_path, glb_bytes = export_glb([ob], "nus-corbata.glb")

# previews (bhelp's preview() writes into PREVIEW_DIR; point it at the scratchpad)
PREVIEW_DIR = "/private/tmp/claude-501/-Users-chrisperkles-Documents-Git/879f1900-260f-4026-a18b-bb1a6429320c/scratchpad/blender"
pa = preview([ob], "nus-corbata-a.png", size=(1200, 900), dist_scale=1.1, elev=-5, azim=0)
pb = preview([ob], "nus-corbata-b.png", size=(1200, 900), dist_scale=1.1, elev=35, azim=35)

result = {"glb": glb_path, "glb_bytes": glb_bytes, "triangles": tris, "previews": [pa, pb]}

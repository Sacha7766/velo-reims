# Living things: paraglider, Pinzgauer cow, cars and a motorbike (each its own GLB, origin at ground / pilot).
exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())
from mathutils import Euler

col = fresh_collection("Gaisberg_Life")
out = {}


def finish(ob, name):
    out[name] = export_glb([ob], f"{name}.glb")[1]
    return ob


# ---------- paraglider: elliptical arc wing 11 m, alternating cells, lines, pilot in a pod harness ----------
M = [material("pg_a", "#f5a11a", 0.6), material("pg_b", "#e9e4d6", 0.6), material("pg_line", "#d8d4c8", 0.7),
     material("pg_pod", "#1d2a44", 0.6), material("pg_helmet", "#e8e8e8", 0.4), material("pg_skin", "#c99a7c", 0.7)]
mb = MeshBuilder(M)
cells, span, rise = 26, 11.0, 7.4
def wing_pt(t, chord_frac, thick):
    # t in [-1, 1] across the span; arc in the front view, chord along +Y (forward)
    ang = t * math.radians(62)
    R = span / 2 / math.sin(math.radians(62))
    x = R * math.sin(ang)
    z = rise + R * (math.cos(ang) - 1) * 0.55
    chord = 2.7 * math.sqrt(max(0.0, 1 - (t * 0.92) ** 2)) + 0.25
    y = (chord_frac - 0.35) * chord
    # thin airfoil: thicker near the leading edge
    zz = z + thick * (1 - chord_frac) * chord * 0.12
    return Vector((x, y, zz)), chord
for c in range(cells):
    t0, t1 = -1 + 2 * c / cells, -1 + 2 * (c + 1) / cells
    m = 0 if (c // 2) % 2 == 0 else 1
    for side in (1, -1):
        a0, _ = wing_pt(t0, 0.0, side); a1, _ = wing_pt(t1, 0.0, side)
        b0, _ = wing_pt(t0, 1.0, side * 0.2); b1, _ = wing_pt(t1, 1.0, side * 0.2)
        mb.quad([a0, a1, b1, b0], m)
# lines: from every 4th cell to the risers at the pilot's shoulders
for c in range(0, cells + 1, 3):
    t = -1 + 2 * c / cells
    p, _ = wing_pt(t, 0.25, 0)
    mb.tube(p, Vector((0.25 * (1 if t > 0 else -1), 0.05, 1.25)), 0.012, 2, 3)
# pilot: seated in a pod harness, legs forward
mb.tube((0, -0.35, 0.55), (0, 0.65, 0.45), 0.24, 3, 8, r2=0.18)
mb.tube((0, -0.15, 0.6), (0, -0.05, 1.15), 0.2, 3, 8, r2=0.17)
mb.tube((0, -0.05, 1.2), (0, -0.03, 1.38), 0.12, 4, 10)
for s in (1, -1):
    mb.tube((0.2 * s, -0.05, 1.05), (0.28 * s, 0.05, 1.3), 0.045, 3, 5)
pg = finish(mb.to_object("paraglider", col), "paraglider")
pg.location = (-30, 20, 0)

# ---------- Pinzgauer cow: skin-modifier body, chestnut with the white back stripe and belly ----------
me = bpy.data.meshes.new("cow_skel")
V = [
    (-0.75, 0, 0.95), (-0.2, 0, 1.0), (0.35, 0, 1.02), (0.75, 0, 1.05),  # 0-3 spine (rump → withers)
    (1.0, 0, 0.95), (1.25, 0, 0.62), (1.32, 0, 0.42),  # 4-6 neck → head (grazing, head down)
    (-0.62, 0.22, 0.8), (-0.62, 0.22, 0.05), (-0.62, -0.22, 0.8), (-0.62, -0.22, 0.05),  # 7-10 hind legs
    (0.62, 0.22, 0.8), (0.62, 0.22, 0.05), (0.62, -0.22, 0.8), (0.62, -0.22, 0.05),  # 11-14 front legs
    (-0.95, 0, 0.92), (-1.0, 0, 0.35),  # 15-16 tail
    (-0.62, 0.21, 0.42), (-0.62, -0.21, 0.42), (0.62, 0.21, 0.42), (0.62, -0.21, 0.42),  # 17-20 knees
]
E = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (0, 7), (7, 17), (17, 8), (0, 9), (9, 18), (18, 10),
     (3, 11), (11, 19), (19, 12), (3, 13), (13, 20), (20, 14), (0, 15), (15, 16)]
me.from_pydata(V, E, [])
cow = bpy.data.objects.new("cow_tmp", me)
col.objects.link(cow)
sk = cow.modifiers.new("skin", 'SKIN')
cow.modifiers.new("sub", 'SUBSURF').levels = 2
R = {0: (0.42, 0.36), 1: (0.45, 0.4), 2: (0.46, 0.4), 3: (0.4, 0.34), 4: (0.22, 0.2), 5: (0.16, 0.15), 6: (0.12, 0.14),
     7: (0.14, 0.13), 8: (0.06, 0.06), 9: (0.14, 0.13), 10: (0.06, 0.06), 11: (0.12, 0.12), 12: (0.06, 0.06),
     13: (0.12, 0.12), 14: (0.06, 0.06), 15: (0.05, 0.05), 16: (0.03, 0.03), 17: (0.08, 0.08), 18: (0.08, 0.08),
     19: (0.07, 0.07), 20: (0.07, 0.07)}
for i, r in R.items():
    me.skin_vertices[0].data[i].radius = r
me.skin_vertices[0].data[0].use_root = True
dg = bpy.context.evaluated_depsgraph_get()
ev = cow.evaluated_get(dg)
cm = bpy.data.meshes.new_from_object(ev)
bpy.data.objects.remove(cow, do_unlink=True)
chest = material("cow_chestnut", "#6e2f17", 0.75)
white = material("cow_white", "#ece6da", 0.75)
dark = material("cow_dark", "#2a1c14", 0.7)
cm.materials.append(chest); cm.materials.append(white); cm.materials.append(dark)
for p in cm.polygons:
    c = p.center
    back = c.z > 0.9 + 0.12 * abs(c.y) * 4 and c.x < 0.85 and abs(c.y) < 0.18
    belly = c.z < 0.72 and c.z > 0.5 and abs(c.y) < 0.2 and -0.6 < c.x < 0.6
    tail = c.x < -0.9
    hoof = c.z < 0.12
    p.material_index = 2 if hoof else 1 if (back or belly or (tail and c.z > 0.5)) else 0
    p.use_smooth = True
cowob = bpy.data.objects.new("cow", cm)
col.objects.link(cowob)
# horns and ears
mb = MeshBuilder([white, dark])
for s in (1, -1):
    mb.tube((1.32, 0.08 * s, 0.6), (1.28, 0.2 * s, 0.7), 0.025, 0, 6, r2=0.012)
    mb.box((1.27, 0.16 * s, 0.52), (0.06, 0.16, 0.1), 1)
horns = mb.to_object("cow_horns", col)
horns.parent = cowob
bpy.ops.object.select_all(action='DESELECT')
cowob.select_set(True); horns.select_set(True)
bpy.context.view_layer.objects.active = cowob
bpy.ops.object.join()
finish(cowob, "cow")
cowob.location = (-30, 0, 0)

# ---------- cars: hatchback and van; motorbike with rider ----------
def car(name, L, W, H, cabin_from, cabin_to, roof, body_col, glass_col="#1b2328"):
    body = material(f"{name}_body", body_col, 0.35, 0.4)
    glass = material(f"{name}_glass", glass_col, 0.15, 0.2)
    tyre = material(f"{name}_tyre", "#151515", 0.9)
    rim = material(f"{name}_rim", "#b7bbbf", 0.3, 0.8)
    lamp = material(f"{name}_lamp", "#f4f1e6", 0.2, 0.0)
    tail = material(f"{name}_tail", "#a01010", 0.3, 0.0)
    mb = MeshBuilder([body, glass, tyre, rim, lamp, tail])
    hw = W / 2
    # lower body with slightly tapered nose/tail
    mb.box((0, 0, 0.62), (W, L, 0.62), 0)
    mb.box((0, L / 2 - 0.25, 0.55), (W * 0.96, 0.5, 0.48), 0)
    # cabin: trapezoid prism (glass sides), roof slab
    y0, y1 = cabin_from * L - L / 2, cabin_to * L - L / 2
    z0, z1 = 0.93, roof
    inset = 0.1
    pts_lo = [(-hw + 0.04, y0), (hw - 0.04, y0), (hw - 0.04, y1), (-hw + 0.04, y1)]
    pts_hi = [(-hw + inset + 0.08, y0 + 0.35), (hw - inset - 0.08, y0 + 0.35), (hw - inset - 0.08, y1 - 0.15), (-hw + inset + 0.08, y1 - 0.15)]
    for i in range(4):
        j = (i + 1) % 4
        a, b = pts_lo[i], pts_lo[j]
        c, d = pts_hi[j], pts_hi[i]
        mb.quad([(a[0], a[1], z0), (b[0], b[1], z0), (c[0], c[1], z1), (d[0], d[1], z1)], 1)
    mb.quad([(p[0], p[1], z1) for p in pts_hi], 0)
    # wheels
    for wy in (L / 2 - 0.75, -L / 2 + 0.7):
        for s in (1, -1):
            mb.tube((s * (hw - 0.12), wy, 0.32), (s * (hw + 0.02), wy, 0.32), 0.32, 2, 14)
            mb.tube((s * (hw + 0.005), wy, 0.32), (s * (hw + 0.025), wy, 0.32), 0.2, 3, 12)
    for s in (1, -1):
        mb.box((s * (hw - 0.22), L / 2 + 0.005, 0.72), (0.32, 0.03, 0.12), 4)
        mb.box((s * (hw - 0.2), -L / 2 - 0.005, 0.78), (0.3, 0.03, 0.12), 5)
    ob = mb.to_object(name, col)
    return finish(ob, name)

hb = car("car-hatchback", 4.1, 1.78, 1.45, 0.3, 0.86, 1.45, "#5d6f86")
hb.location = (-24, -12, 0)
van = car("car-van", 4.9, 1.9, 1.95, 0.08, 0.95, 1.95, "#e6e4dc")
van.location = (-18, -12, 0)

# motorbike with rider
mbm = [material("moto_body", "#202326", 0.4, 0.5), material("moto_tank", "#b3201c", 0.3, 0.3), material("moto_tyre", "#151515", 0.9),
       material("moto_suit", "#2b2e33", 0.7), material("moto_helmet", "#f0f0f0", 0.3)]
mb = MeshBuilder(mbm)
for wy in (0.72, -0.7):
    mb.tube((-0.07, wy, 0.32), (0.07, wy, 0.32), 0.32, 2, 14)
mb.box((0, 0.05, 0.62), (0.3, 1.0, 0.32), 0)
mb.box((0, 0.25, 0.86), (0.36, 0.5, 0.22), 1)
mb.box((0, -0.35, 0.84), (0.28, 0.6, 0.1), 0)
mb.tube((0, 0.72, 0.32), (0, 0.55, 1.0), 0.04, 0)
mb.tube((-0.36, 0.5, 1.02), (0.36, 0.5, 1.02), 0.025, 0)
mb.tube((0, -0.25, 0.92), (0, 0.15, 1.42), 0.17, 3, 8)
mb.tube((0, 0.18, 1.48), (0, 0.2, 1.62), 0.14, 4, 10)
for s in (1, -1):
    mb.tube((0.17 * s, -0.2, 0.9), (0.2 * s, 0.25, 0.62), 0.07, 3, 6)
    mb.tube((0.2 * s, 0.25, 0.62), (0.2 * s, 0.05, 0.35), 0.06, 3, 6)
    mb.tube((0.18 * s, 0.05, 1.32), (0.34 * s, 0.48, 1.04), 0.05, 3, 6)
moto = finish(mb.to_object("motorbike", col), "motorbike")
moto.location = (-12, -12, 0)

result = {"exported": out, "preview": preview([pg, cowob, hb, van, moto], "life.png", size=(1400, 800), dist_scale=0.55, elev=20, azim=25)}

# Cap de Formentor: the lighthouse tower (Far de Formentor, 1863, ~22 m), feral goats, sailboats.
exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())
col = fresh_collection("Formentor")
out = {}

# ---------- lighthouse: white masonry tower, gallery with railing, glazed lantern with a grey dome ----------
white = material("lh_white", "#efece4", 0.6)
stone = material("lh_stone", "#cdb58e", 0.85)
grey = material("lh_grey", "#6d7378", 0.4, 0.6)
glass = material("lh_glass", "#2c3a40", 0.08, 0.4)
lamp = material("lh_lamp", "#fff6d8", 0.2, emission="#fff2c8")
mb = MeshBuilder([white, stone, grey, glass, lamp])
mb.tube((0, 0, 0), (0, 0, 1.6), 2.6, 1, 24, 2.5)            # marès base course
mb.tube((0, 0, 1.6), (0, 0, 17.5), 2.3, 0, 24, 1.85)        # tapering white shaft
mb.tube((0, 0, 17.5), (0, 0, 18.1), 2.45, 1, 24)            # cornice
mb.tube((0, 0, 18.1), (0, 0, 18.35), 2.6, 2, 24)            # gallery floor
for k in range(24):                                          # railing posts
    a = 2 * math.pi * k / 24
    mb.tube((math.cos(a) * 2.5, math.sin(a) * 2.5, 18.35), (math.cos(a) * 2.5, math.sin(a) * 2.5, 19.3), 0.03, 2, 4)
for z in (18.85, 19.3):
    for k in range(24):
        a0, a1 = 2 * math.pi * k / 24, 2 * math.pi * (k + 1) / 24
        mb.tube((math.cos(a0) * 2.5, math.sin(a0) * 2.5, z), (math.cos(a1) * 2.5, math.sin(a1) * 2.5, z), 0.025, 2, 4)
mb.tube((0, 0, 18.35), (0, 0, 19.0), 1.4, 2, 16)            # lantern base
mb.tube((0, 0, 19.0), (0, 0, 21.0), 1.35, 3, 16)            # glazing
for k in range(8):
    a = 2 * math.pi * k / 8
    mb.tube((math.cos(a) * 1.37, math.sin(a) * 1.37, 19.0), (math.cos(a) * 1.37, math.sin(a) * 1.37, 21.0), 0.05, 2, 4)
mb.tube((0, 0, 19.6), (0, 0, 20.4), 0.5, 4, 12)             # the lens glowing inside
mb.tube((0, 0, 21.0), (0, 0, 21.9), 1.5, 2, 16, 0.25)       # dome
mb.tube((0, 0, 21.9), (0, 0, 22.6), 0.08, 2, 6)             # vent + lightning rod
# small windows up the shaft
for z in (6.0, 10.5, 14.5):
    mb.box((0, -2.08 + (z - 6) * 0.02, z), (0.5, 0.2, 0.9), 3)
lh = mb.to_object("far-formentor", col)
out["far-formentor"] = export_glb([lh], "far-formentor.glb")[1]
lh.location = (60, 0, 0)

# ---------- feral goat (Mallorcan 'cabra salvatge'): dark brown/black, pale belly, swept-back horns ----------
dark = material("goat_dark", "#3a2a1f", 0.8)
brown = material("goat_brown", "#7a5434", 0.8)
pale = material("goat_pale", "#c8b79a", 0.8)
horn = material("goat_horn", "#5c5248", 0.6)
hoof = material("goat_hoof", "#1c1916", 0.7)
parts = []
def rbox(size, loc, mat, bevel=0.05, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    m = o.modifiers.new("b", 'BEVEL'); m.width = bevel; m.segments = 3
    o.modifiers.new("s", 'SUBSURF').levels = 1
    o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    parts.append(o)
def leg(top, bottom, r0, r1, mat):
    d = Vector(bottom) - Vector(top)
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=r0, radius2=r1, depth=d.length, location=(Vector(top) + Vector(bottom)) / 2)
    o = bpy.context.active_object
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    o.data.materials.append(mat)
    parts.append(o)
rbox((0.85, 0.3, 0.36), (0, 0, 0.62), brown, 0.12)
rbox((0.6, 0.22, 0.1), (0.02, 0, 0.44), pale, 0.04)
rbox((0.3, 0.2, 0.28), (0.5, 0, 0.82), dark, 0.08, (0, math.radians(-40), 0))       # neck
rbox((0.26, 0.15, 0.15), (0.66, 0, 0.92), brown, 0.05, (0, math.radians(30), 0))    # head
rbox((0.1, 0.08, 0.14), (0.74, 0, 0.8), dark, 0.03)                                  # beard
for s in (1, -1):
    leg((0.6, 0.05 * s, 1.0), (0.48, 0.1 * s, 1.22), 0.03, 0.012, horn)              # horns sweeping back
    leg((0.48, 0.1 * s, 1.22), (0.34, 0.12 * s, 1.18), 0.014, 0.006, horn)
for x in (0.3, -0.3):
    for s in (1, -1):
        leg((x, 0.1 * s, 0.5), (x, 0.1 * s, 0.06), 0.05, 0.035, dark)
        leg((x, 0.1 * s, 0.06), (x, 0.1 * s, 0.0), 0.035, 0.035, hoof)
leg((-0.42, 0, 0.75), (-0.5, 0, 0.82), 0.03, 0.01, dark)                              # tail
bpy.ops.object.select_all(action='DESELECT')
for o in parts:
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
goat = bpy.context.active_object
goat.name = "goat"
for c in list(goat.users_collection):
    c.objects.unlink(goat)
col.objects.link(goat)
# model axes: nose along +X in Blender → turn so the nose is +Y (our convention: Blender +Y = glTF -Z = forward)
goat.rotation_euler = (0, 0, math.radians(90))
bpy.ops.object.select_all(action='DESELECT'); goat.select_set(True); bpy.context.view_layer.objects.active = goat
bpy.ops.object.transform_apply(rotation=True)
out["goat"] = export_glb([goat], "goat.glb")[1]
goat.location = (66, 0, 0)

# ---------- sailboat: white hull, mast, mainsail and jib ----------
hull = material("boat_hull", "#f4f4f2", 0.3)
deck = material("boat_deck", "#c9a77c", 0.7)
sail = material("boat_sail", "#f6f3ea", 0.8)
mastm = material("boat_mast", "#b8bcc0", 0.3, 0.8)
mb = MeshBuilder([hull, deck, sail, mastm])
L, W = 11.0, 3.6
# hull: lofted sections bow (+Y) to stern
secs = []
for k in range(9):
    t = k / 8
    y = -L / 2 + L * t
    w = W / 2 * (math.sin(math.pi * min(1.0, t * 1.15 + 0.05)) ** 0.6 if t < 0.95 else 0.05)
    secs.append([(-w, y, 0.9), (-w * 0.85, y, 0.1), (0, y, -0.4 + 0.3 * t * t), (w * 0.85, y, 0.1), (w, y, 0.9)])
for k in range(len(secs) - 1):
    for j in range(4):
        mb.quad([secs[k][j], secs[k][j + 1], secs[k + 1][j + 1], secs[k + 1][j]], 0)
    mb.quad([secs[k][0], secs[k + 1][0], secs[k + 1][4], secs[k][4]], 1)
mb.tube((0, 0.6, 0.9), (0, 0.6, 15.0), 0.09, 3, 8)
mb.quad([(0, 0.5, 1.9), (0, -3.6, 2.1), (0, 0.5, 14.5)], 2)          # mainsail
mb.quad([(0, 0.7, 13.8), (0, 5.2, 1.2), (0, 0.8, 1.4)], 2)            # jib
boat = mb.to_object("sailboat", col)
out["sailboat"] = export_glb([boat], "sailboat.glb")[1]
boat.location = (80, 0, 0)
img = preview([lh, goat, boat], "formentor.png", size=(1000, 700), dist_scale=0.6, elev=10, azim=20)
result = out

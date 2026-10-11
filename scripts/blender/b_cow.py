exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())
col = bpy.data.collections["Gaisberg_Life"]
old = bpy.data.objects.get("cow")
if old: bpy.data.objects.remove(old, do_unlink=True)
chest = material("cow_chestnut", "#6b2c15", 0.75)
white = material("cow_white", "#ede7db", 0.75)
dark = material("cow_dark", "#24180f", 0.7)
pink = material("cow_pink", "#c9928a", 0.7)
parts = []
def rounded_box(name, size, loc, mat, bevel=0.12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(scale=True)
    m = o.modifiers.new("bevel", 'BEVEL'); m.width = bevel; m.segments = 4
    o.modifiers.new("sub", 'SUBSURF').levels = 1
    o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    parts.append(o)
    return o
def leg(name, top, bottom, r0, r1, mat):
    d = Vector(bottom) - Vector(top)
    bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=r0, radius2=r1, depth=d.length, location=(Vector(top) + Vector(bottom)) / 2)
    o = bpy.context.active_object
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    parts.append(o)
    return o
# body: boxy barrel, 2.1 m long, back at 1.35 m
rounded_box("body", (2.05, 0.72, 0.78), (0, 0, 1.0), chest, 0.26)
rounded_box("stripe", (1.9, 0.26, 0.1), (-0.02, 0, 1.38), white, 0.05)        # Pinzgauer white back line
rounded_box("belly", (1.3, 0.5, 0.12), (0.0, 0, 0.62), white, 0.05)
rounded_box("udder", (0.32, 0.3, 0.18), (-0.55, 0, 0.58), pink, 0.08)
# neck and grazing head
rounded_box("neck", (0.62, 0.42, 0.46), (1.15, 0, 0.98), chest, 0.15, (0, math.radians(38), 0))
rounded_box("head", (0.56, 0.3, 0.3), (1.45, 0, 0.55), chest, 0.1, (0, math.radians(62), 0))
rounded_box("muzzle", (0.18, 0.24, 0.2), (1.58, 0, 0.3), dark, 0.06, (0, math.radians(62), 0))
for s in (1, -1):
    rounded_box(f"ear{s}", (0.08, 0.18, 0.05), (1.38, 0.2 * s, 0.76), chest, 0.02)
    leg(f"horn{s}", (1.4, 0.12 * s, 0.8), (1.36, 0.24 * s, 0.9), 0.03, 0.012, white)
# legs: chestnut upper, white lower (as on Pinzgauer), dark hooves
for x in (0.72, -0.72):
    for s in (1, -1):
        leg(f"leg{x}{s}", (x, 0.24 * s, 0.85), (x, 0.24 * s, 0.35), 0.1, 0.075, chest)
        leg(f"shin{x}{s}", (x, 0.24 * s, 0.38), (x, 0.24 * s, 0.07), 0.07, 0.06, white)
        leg(f"hoof{x}{s}", (x, 0.24 * s, 0.08), (x, 0.24 * s, 0.0), 0.065, 0.07, dark)
leg("tail", (-1.05, 0, 1.3), (-1.12, 0, 0.55), 0.03, 0.02, chest)
rounded_box("tuft", (0.08, 0.08, 0.16), (-1.12, 0, 0.5), white, 0.03)
bpy.ops.object.select_all(action='DESELECT')
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
for o in parts:
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
cow = bpy.context.active_object
cow.name = "cow"
for c in list(cow.users_collection):
    c.objects.unlink(cow)
col.objects.link(cow)
cow.location = (0, 0, 0)
size = export_glb([cow], "cow.glb")[1]
tris = sum(len(p.vertices) - 2 for p in cow.data.polygons)
cow.location = (-30, 0, 0)
img = preview([cow], "cow.png", size=(700, 500), dist_scale=0.9, elev=12, azim=65)
result = {"size": size, "tris": tris}

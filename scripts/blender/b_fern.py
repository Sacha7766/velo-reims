# Poly Haven fern_02 (CC0) decimated for instancing as forest-floor cover.
exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())
import glob
col = fresh_collection("Gaisberg_Fern")
path = glob.glob(SERPENTINE + "/research/gaisberg/assets/polyhaven/fern_02/*.gltf")[0]
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=path)
meshes = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
for o in [x for x in bpy.data.objects if x not in before and x.type != 'MESH']:
    bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.parent = None
    for c in list(o.users_collection):
        c.objects.unlink(o)
    col.objects.link(o)
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
o = bpy.context.active_object
tris0 = sum(len(p.vertices) - 2 for p in o.data.polygons)
m = o.modifiers.new("dec", 'DECIMATE')
m.ratio = min(1.0, 900 / max(tris0, 1))
bpy.ops.object.modifier_apply(modifier="dec")
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
bb = [Vector(c) for c in o.bound_box]
h = max(v.z for v in bb) - min(v.z for v in bb)
o.data.transform(Matrix.Scale(1.0 / h, 4))
bb = [Vector(c) for c in o.bound_box]
o.data.transform(Matrix.Translation((-(sum(v.x for v in bb) / 8), -(sum(v.y for v in bb) / 8), -min(v.z for v in bb))))
o.location = (0, 0, 0)
o.name = "fern"
tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
size = export_glb([o], "fern.glb")[1]
o.location = (10, -20, 0)
result = {"tris0": tris0, "tris": tris, "size": size, "materials": [s.material.name for s in o.material_slots]}

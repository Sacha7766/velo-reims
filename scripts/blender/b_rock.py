# Decimate Poly Haven scanned rocks into light instancing-friendly GLBs (CC0).
exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())
import glob
col = fresh_collection("Gaisberg_Rocks")
res = {}
for name in ("rock_07", "rock_09", "stone_01"):
    path = glob.glob(SERPENTINE + f"/research/gaisberg/assets/polyhaven/{name}/*.gltf")[0]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
    o = new[0]
    for c in list(o.users_collection):
        c.objects.unlink(o)
    col.objects.link(o)
    for x in [x for x in bpy.data.objects if x not in before and x is not o]:
        bpy.data.objects.remove(x, do_unlink=True)
    o.parent = None
    tris0 = sum(len(p.vertices) - 2 for p in o.data.polygons)
    m = o.modifiers.new("dec", 'DECIMATE')
    m.ratio = min(1.0, 700 / max(tris0, 1))
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier="dec")
    # normalise: 1 m across, sitting on z = 0
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    size = max(max(v[i] for v in bb) - min(v[i] for v in bb) for i in range(2))
    o.scale = [s / size for s in o.scale]
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bb = [Vector(c) for c in o.bound_box]
    zmin = min(v.z for v in bb)
    cx = sum(v.x for v in bb) / 8; cy = sum(v.y for v in bb) / 8
    o.data.transform(Matrix.Translation((-cx, -cy, -zmin - 0.1)))
    o.location = (0, 0, 0)
    o.name = name
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    res[name] = [tris0, tris, export_glb([o], f"{name}.glb")[1]]
    o.location = (len(res) * 1.5 - 3, -20, 0)
result = res

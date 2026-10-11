# Cars with real side profiles (extruded silhouette with tumblehome, bevelled), nose +Y, origin at ground.
exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())
col = fresh_collection("Gaisberg_Cars")


def car(name, profile, W, wheel_y, wheel_r, belt, glass_runs, body_col):
    body = material(f"{name}_body", body_col, 0.32, 0.12)
    glass = material(f"{name}_glass", "#11161a", 0.06, 0.4)
    tyre = material(f"{name}_tyre", "#141414", 0.9)
    rim = material(f"{name}_rim", "#b7bbbf", 0.25, 0.85)
    lamp = material(f"{name}_lamp", "#f6f3ea", 0.15)
    tail = material(f"{name}_tail", "#9e0f0f", 0.25)
    trim = material(f"{name}_trim", "#1b1d1f", 0.6)
    mats = [body, glass, tyre, rim, lamp, tail, trim]
    bm = bmesh.new()
    hw = W / 2
    top = max(z for _, z in profile)

    def half(z):  # tumblehome above the beltline
        return hw - (0.16 * (z - belt) / max(top - belt, 0.1) if z > belt else 0.0)
    L = [bm.verts.new((-half(z), y, z)) for y, z in profile]
    R = [bm.verts.new((half(z), y, z)) for y, z in profile]
    n = len(profile)
    fl = bm.faces.new(L); fr = bm.faces.new(list(reversed(R)))
    for i in range(n):
        j = (i + 1) % n
        f = bm.faces.new((L[i], L[j], R[j], R[i]))
        (y0, z0), (y1, z1) = profile[i], profile[j]
        f.material_index = 1 if (i in glass_runs) else 0
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    bv = ob.modifiers.new("bevel", 'BEVEL'); bv.width = 0.06; bv.segments = 3; bv.limit_method = 'ANGLE'
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
    bpy.ops.object.modifier_apply(modifier="bevel")
    for p in ob.data.polygons:
        p.use_smooth = False
    # side windows, wheels, lights, bumpers as an extra mesh joined in
    mb = MeshBuilder(mats)
    ys = [y for y, _ in profile]
    for s in (1, -1):
        for (ya, yb, za, zb) in glass_side(profile, belt):
            x = s * (half((za + zb) / 2) + 0.004)
            mb.quad([(x, ya, belt + 0.04), (x, yb, belt + 0.04), (x, yb - 0.08, zb - 0.05), (x, ya + 0.12, zb - 0.05)], 1)
        for wy in wheel_y:
            mb.tube((s * (hw - 0.22), wy, wheel_r), (s * (hw + 0.01), wy, wheel_r), wheel_r, 2, 18)
            mb.tube((s * (hw - 0.005), wy, wheel_r), (s * (hw + 0.015), wy, wheel_r), wheel_r * 0.62, 3, 14)
        mb.box((s * (hw - 0.25), max(ys) - 0.03, 0.78), (0.34, 0.06, 0.12), 4)
        mb.box((s * (hw - 0.2), min(ys) + 0.03, 0.88), (0.3, 0.06, 0.14), 5)
    mb.box((0, max(ys) - 0.02, 0.42), (W - 0.1, 0.1, 0.2), 6)
    mb.box((0, min(ys) + 0.02, 0.45), (W - 0.1, 0.1, 0.22), 6)
    extra = mb.to_object(name + "_x", col)
    bpy.ops.object.select_all(action='DESELECT')
    ob.select_set(True); extra.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.join()
    return ob


def glass_side(profile, belt):
    """Window rectangle(s) along the side between beltline and roof (y range of points above belt)."""
    up = [(y, z) for y, z in profile if z > belt + 0.15]
    ya, yb = min(y for y, _ in up), max(y for y, _ in up)
    return [(ya + 0.05, yb - 0.05, belt, max(z for _, z in up))]


out = {}
hatch = car("car-hatchback", [(-2.05, 0.3), (-2.07, 0.8), (-1.98, 1.06), (-1.62, 1.45), (0.2, 1.48), (1.02, 1.0), (1.96, 0.82), (2.06, 0.36)],
            1.78, (1.35, -1.25), 0.31, 1.0, {2, 4}, "#5d6f86")
van = car("car-van", [(-2.45, 0.3), (-2.47, 1.92), (-2.32, 2.0), (1.45, 2.0), (2.2, 1.18), (2.45, 0.92), (2.47, 0.36)],
          1.92, (1.6, -1.55), 0.33, 1.15, {4}, "#e6e4dc")
for o, nm in ((hatch, "car-hatchback"), (van, "car-van")):
    o.location = (0, 0, 0)
    out[nm] = export_glb([o], f"{nm}.glb")[1]
hatch.location = (-24, -12, 0); van.location = (-18, -12, 0)
img = preview([hatch, van], "cars.png", size=(900, 450), dist_scale=0.75, elev=14, azim=40)
result = {"exported": out}

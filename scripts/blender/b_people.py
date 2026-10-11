# Hikers: standing and mid-stride, jacket tintable (material name ends in _body), origin at feet, facing +Y.
exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())
col = fresh_collection("Gaisberg_People")
for o in list(bpy.data.collections["Gaisberg_Life"].objects):
    if o.name.startswith("car-"):
        bpy.data.objects.remove(o, do_unlink=True)
jacket = material("person_body", "#c0392b", 0.7)
pants = material("person_pants", "#2c3036", 0.8)
skin = material("person_skin", "#d1a284", 0.6)
hair = material("person_hair", "#3b2a1e", 0.8)
pack = material("person_pack", "#2f4a3a", 0.7)
boot = material("person_boot", "#4a3526", 0.8)


def person(name, stride):
    mb = MeshBuilder([jacket, pants, skin, hair, pack, boot])
    a = math.radians(24) * stride
    hip = Vector((0, 0, 0.95))
    for s, ph in ((1, 1), (-1, -1)):
        x = 0.1 * s
        knee = hip + Vector((x, math.sin(a * ph) * 0.46, -math.cos(a * ph) * 0.46))
        foot = knee + Vector((0, math.sin(a * ph * 0.6) * 0.45 - (0.08 if ph < 0 and stride else 0), -0.45))
        foot.z = max(foot.z, 0.05)
        mb.tube((x, 0, 0.95), knee, 0.075, 1, 10, 0.06)
        mb.tube(knee, foot, 0.06, 1, 10, 0.05)
        mb.box(foot + Vector((0, 0.06, -0.02)), (0.1, 0.26, 0.1), 5)
        # arms swing opposite
        sh = Vector((0.21 * s, 0.0, 1.43))
        el = sh + Vector((0.03 * s, -math.sin(a * ph) * 0.27, -0.26))
        hd = el + Vector((0.0, -math.sin(a * ph) * 0.22 + 0.06, -0.24))
        mb.tube(sh, el, 0.055, 0, 8, 0.05)
        mb.tube(el, hd, 0.048, 0, 8, 0.042)
        mb.box(hd + Vector((0, 0, -0.05)), (0.07, 0.08, 0.1), 2)
    # torso (jacket), hips, neck, head with hair/cap
    mb.tube((0, 0, 0.9), (0, 0.01, 1.05), 0.17, 1, 12, 0.18)
    mb.tube((0, 0.01, 1.03), (0, 0.02, 1.47), 0.19, 0, 12, 0.21)
    mb.tube((0, 0.02, 1.47), (0, 0.03, 1.55), 0.06, 2, 8)
    mb.tube((0, 0.03, 1.55), (0, 0.04, 1.77), 0.1, 2, 12, 0.095)
    mb.tube((0, 0.0, 1.7), (0, 0.0, 1.8), 0.108, 3, 12, 0.09)
    # backpack
    mb.box((0, -0.24, 1.25), (0.32, 0.18, 0.46), 4)
    mb.box((0, -0.25, 1.52), (0.28, 0.16, 0.1), 4)
    ob = mb.to_object(name, col)
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob

stand = person("person-stand", 0)
walk = person("person-walk", 1)
out = {}
for o in (stand, walk):
    o.location = (0, 0, 0)
    out[o.name] = export_glb([o], f"{o.name}.glb")[1]
stand.location = (40, -20, 0); walk.location = (41, -20, 0)
img = preview([stand, walk], "people.png", size=(700, 600), dist_scale=0.9, elev=8, azim=60)
result = out

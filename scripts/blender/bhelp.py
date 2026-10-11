# Shared Blender helpers for Serpentine asset scripts (exec'd at the top of each script).
# SERPENTINE (the repo path) is injected by bl.py.
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

OUT_DIR = SERPENTINE + "/public/models"
PREVIEW_DIR = "/tmp/serpentine-blender-previews"
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(PREVIEW_DIR, exist_ok=True)


def srgb(h):
    """'#rrggbb' -> linear RGBA tuple."""
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, 1.0)


def material(name, color, rough=0.6, metal=0.0, emission=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = srgb(color) if isinstance(color, str) else color
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emission:
        b.inputs["Emission Color"].default_value = srgb(emission)
        b.inputs["Emission Strength"].default_value = 4.0
    return m


def fresh_collection(name):
    """Remove a previous build of this asset and return an empty, linked collection."""
    old = bpy.data.collections.get(name)
    if old:
        for o in list(old.all_objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(old)
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    return col


class MeshBuilder:
    """bmesh with per-face material slots: tubes, boxes, raw quads."""

    def __init__(self, mats):
        self.bm = bmesh.new()
        self.mats = mats  # list of materials; index = slot

    def tube(self, a, b, r, mat=0, seg=6, r2=None):
        a, b = Vector(a), Vector(b)
        d = b - a
        L = d.length
        if L < 1e-6:
            return
        z = d.normalized()
        x = z.orthogonal().normalized()
        y = z.cross(x)
        r2 = r if r2 is None else r2
        ring_a, ring_b = [], []
        for i in range(seg):
            t = 2 * math.pi * i / seg
            off = x * math.cos(t) + y * math.sin(t)
            ring_a.append(self.bm.verts.new(a + off * r))
            ring_b.append(self.bm.verts.new(b + off * r2))
        for i in range(seg):
            j = (i + 1) % seg
            f = self.bm.faces.new((ring_a[i], ring_a[j], ring_b[j], ring_b[i]))
            f.material_index = mat
        fa = self.bm.faces.new(list(reversed(ring_a)))
        fb = self.bm.faces.new(ring_b)
        fa.material_index = fb.material_index = mat

    def box(self, center, size, mat=0, rot_z=0.0, rot=None):
        c = Vector(center)
        sx, sy, sz = (s / 2 for s in size)
        R = rot if rot is not None else Matrix.Rotation(rot_z, 3, 'Z')
        pts = [c + R @ Vector((dx * sx, dy * sy, dz * sz)) for dz in (-1, 1) for dy in (-1, 1) for dx in (-1, 1)]
        v = [self.bm.verts.new(p) for p in pts]
        for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
            f = self.bm.faces.new([v[i] for i in q])
            f.material_index = mat

    def quad(self, pts, mat=0):
        v = [self.bm.verts.new(Vector(p)) for p in pts]
        f = self.bm.faces.new(v)
        f.material_index = mat
        return f

    def to_object(self, name, col):
        me = bpy.data.meshes.new(name)
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        for p in me.polygons:
            p.use_smooth = False
        ob = bpy.data.objects.new(name, me)
        col.objects.link(ob)
        return ob


def export_glb(objects, filename):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    path = os.path.join(OUT_DIR, filename)
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', use_selection=True, export_apply=True,
        export_yup=True, export_texcoords=True, export_normals=True, export_materials='EXPORT',
        export_animations=False, export_cameras=False, export_lights=False,
    )
    return path, os.path.getsize(path)


def preview(objects, filename, size=(900, 900), dist_scale=1.6, elev=18, azim=35, sun_elev=40, sun_azim=210):
    """EEVEE still of the given objects on a neutral background into PREVIEW_DIR."""
    scn = bpy.context.scene
    bpy.context.view_layer.update()
    keep = set(o.name for o in objects) | {"PreviewCam", "PreviewSun"}
    hidden = []
    for o in scn.objects:
        if o.name not in keep and not o.hide_render:
            o.hide_render = True
            hidden.append(o)
    mn = Vector((1e9, 1e9, 1e9))
    mx = Vector((-1e9, -1e9, -1e9))
    for o in objects:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            mn = Vector(map(min, mn, w))
            mx = Vector(map(max, mx, w))
    center = (mn + mx) / 2
    radius = (mx - mn).length / 2
    cam = bpy.data.objects.get("PreviewCam")
    if not cam:
        cam = bpy.data.objects.new("PreviewCam", bpy.data.cameras.new("PreviewCam"))
        scn.collection.objects.link(cam)
    cam.data.lens = 50
    e, a = math.radians(elev), math.radians(azim)
    d = radius * dist_scale * 2.2
    cam.location = center + Vector((math.cos(e) * math.sin(a), -math.cos(e) * math.cos(a), math.sin(e))) * d
    cam.rotation_euler = (center - cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.clip_end = d * 4
    sun = bpy.data.objects.get("PreviewSun")
    if not sun:
        sun = bpy.data.objects.new("PreviewSun", bpy.data.lights.new("PreviewSun", 'SUN'))
        scn.collection.objects.link(sun)
    sun.data.energy = 4.0
    sun.rotation_euler = (math.radians(90 - sun_elev), 0, math.radians(sun_azim))
    if not scn.world:
        scn.world = bpy.data.worlds.new("World")
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    bg.inputs[0].default_value = (0.55, 0.68, 0.85, 1)
    bg.inputs[1].default_value = 0.8
    scn.camera = cam
    scn.render.engine = 'BLENDER_EEVEE'
    scn.render.resolution_x, scn.render.resolution_y = size
    scn.render.resolution_percentage = 100
    scn.render.filepath = os.path.join(PREVIEW_DIR, filename)
    scn.render.image_settings.file_format = 'PNG'
    bpy.ops.render.render(write_still=True)
    for o in hidden:
        o.hide_render = False
    return scn.render.filepath

# Sender Gaisberg: 100 m red/white steel lattice mast with UKW/DVB-T panel antennas,
# platforms and a slim antenna top section (ORS info board photo at the summit).
exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())

col = fresh_collection("Gaisberg_Transmitter")
RED, WHITE, STEEL, PANEL, DARK, LAMP = range(6)
mats = [
    material("tx_red", "#c8371f", 0.55, 0.2),
    material("tx_white", "#e9e7e1", 0.5, 0.2),
    material("tx_steel", "#8d9196", 0.45, 0.7),
    material("tx_panel", "#f1f0ec", 0.4, 0.0),
    material("tx_dark", "#2a2c2f", 0.6, 0.3),
    material("tx_lamp", "#ff2a1a", 0.3, 0.0, emission="#ff2a1a"),
]
H = 100.0
BANDS = 7


def band(z):
    # aviation banding, red at top and bottom
    k = min(BANDS - 1, max(0, int((H - z) / (H / BANDS))))
    return RED if k % 2 == 0 else WHITE


def lattice(mb, z0, z1, w0, w1, panel, leg_r, girt_r, diag_r):
    """Square lattice from z0..z1, half-width w0..w1, panels of ~panel metres."""
    n = max(1, round((z1 - z0) / panel))
    hw = lambda z: w0 + (w1 - w0) * (z - z0) / (z1 - z0)
    corners = [(1, 1), (-1, 1), (-1, -1), (1, -1)]
    for k in range(n):
        za, zb = z0 + (z1 - z0) * k / n, z0 + (z1 - z0) * (k + 1) / n
        wa, wb = hw(za), hw(zb)
        m = band((za + zb) / 2)
        pa = [Vector((cx * wa, cy * wa, za)) for cx, cy in corners]
        pb = [Vector((cx * wb, cy * wb, zb)) for cx, cy in corners]
        for i in range(4):
            j = (i + 1) % 4
            mb.tube(pa[i], pb[i], leg_r, m, 6)
            mb.tube(pb[i], pb[j], girt_r, m, 5)
            # X bracing on each face
            mb.tube(pa[i], pb[j], diag_r, m, 4)
            mb.tube(pa[j], pb[i], diag_r, m, 4)
        if k == 0:
            for i in range(4):
                mb.tube(pa[i], pa[(i + 1) % 4], girt_r, m, 5)


def platform(mb, z, hw, rail=1.1):
    mb.box((0, 0, z), (2 * hw, 2 * hw, 0.18), DARK)
    corners = [(1, 1), (-1, 1), (-1, -1), (1, -1)]
    for i in range(4):
        a = Vector((corners[i][0] * hw, corners[i][1] * hw, z + rail))
        b = Vector((corners[(i + 1) % 4][0] * hw, corners[(i + 1) % 4][1] * hw, z + rail))
        mb.tube(a, b, 0.035, STEEL, 4)
        for t in range(0, 5):
            p = a.lerp(b, t / 4)
            mb.tube(Vector((p.x, p.y, z)), p, 0.03, STEEL, 4)


mb = MeshBuilder(mats)
# lower heavy section, bolted to the roof of the station building (~12 m)
lattice(mb, 0.0, 50.0, 3.6, 1.55, 3.6, 0.16, 0.07, 0.055)
platform(mb, 50.0, 2.6)
# panel antenna rings (white panels on all four faces), the cluttered look of the info-board photo
for ring, z in enumerate((26.0, 32.5, 39.0, 45.5)):
    w = 3.6 + (1.55 - 3.6) * z / 50.0 + 0.55
    for face in range(4):
        ang = face * math.pi / 2
        R = Matrix.Rotation(ang, 3, 'Z')
        for s in (-1, 0, 1):
            p = R @ Vector((w, s * (w - 0.6) * 0.62, z))
            mb.box(p, (0.22, 0.62, 2.6), PANEL, rot_z=ang)
            mb.tube(R @ Vector((w - 0.5, s * (w - 0.6) * 0.62, z + 1.0)), p + R @ Vector((-0.1, 0, 1.0)), 0.04, STEEL, 4)
            mb.tube(R @ Vector((w - 0.5, s * (w - 0.6) * 0.62, z - 1.0)), p + R @ Vector((-0.1, 0, -1.0)), 0.04, STEEL, 4)
# dish / microwave links (A1 Telekom uses the mast as a radio relay station)
for k, (z, ang) in enumerate(((20.0, 0.6), (21.5, 2.4), (36.0, 4.1))):
    R = Matrix.Rotation(ang, 3, 'Z')
    c = R @ Vector((3.3, 0, z))
    dish = R @ Matrix.Rotation(math.pi / 2, 3, 'Y')
    mb.box(c, (0.25, 1.4, 1.4), PANEL, rot=R)
# upper section
lattice(mb, 50.0, 84.0, 1.05, 0.75, 3.4, 0.11, 0.05, 0.04)
platform(mb, 84.0, 1.5, 0.9)
for z in (58.0, 66.0, 74.0):
    for face in range(4):
        ang = face * math.pi / 2 + math.pi / 4
        R = Matrix.Rotation(ang, 3, 'Z')
        mb.box(R @ Vector((1.25, 0, z)), (0.18, 0.5, 1.8), PANEL, rot_z=ang)
# top: slim antenna cylinder in red/white bands, lightning rod, obstruction lamp
segs = 6
for k in range(segs):
    za, zb = 84.0 + k * 14.5 / segs, 84.0 + (k + 1) * 14.5 / segs
    mb.tube((0, 0, za), (0, 0, zb), 0.42, RED if k % 2 == 0 else WHITE, 12)
mb.tube((0, 0, 98.5), (0, 0, 100.8), 0.05, STEEL, 5)
mb.box((0, 0, 98.7), (0.3, 0.3, 0.3), LAMP)
mb.box((0, 0, 50.6), (0.25, 0.25, 0.25), LAMP)
tower = mb.to_object("SenderGaisberg", col)

# smaller neighbour mast (OSM way 173298345, no height tag): 36 m lattice
mb2 = MeshBuilder(mats)
H2 = 36.0
for k in range(9):
    za, zb = k * H2 / 9, (k + 1) * H2 / 9
    w = lambda z: 1.1 - 0.55 * z / H2
    corners = [(1, 1), (-1, 1), (-1, -1), (1, -1)]
    pa = [Vector((cx * w(za), cy * w(za), za)) for cx, cy in corners]
    pb = [Vector((cx * w(zb), cy * w(zb), zb)) for cx, cy in corners]
    for i in range(4):
        j = (i + 1) % 4
        mb2.tube(pa[i], pb[i], 0.07, STEEL, 5)
        mb2.tube(pb[i], pb[j], 0.035, STEEL, 4)
        mb2.tube(pa[i], pb[j], 0.03, STEEL, 4)
for z in (24.0, 30.0, 34.0):
    for face in range(3):
        ang = face * 2.1
        R = Matrix.Rotation(ang, 3, 'Z')
        mb2.box(R @ Vector((0.9, 0, z)), (0.16, 0.4, 1.6), PANEL, rot_z=ang)
mb2.box((0.0, 0.9, 18.0), (0.2, 1.0, 1.0), PANEL)
small = mb2.to_object("SenderGaisbergSmall", col)
small.location.x = 18.0

tris = sum(len(p.vertices) - 2 for o in (tower, small) for p in o.data.polygons)
p1 = export_glb([tower], "sender-gaisberg.glb")
small.location.x = 0.0
p2 = export_glb([small], "sender-gaisberg-small.glb")
small.location.x = 18.0
img = preview([tower, small], "transmitter.png", size=(700, 1000), dist_scale=0.75, elev=12, azim=30)
result = {"tris": tris, "glb": [p1, p2], "preview": img}

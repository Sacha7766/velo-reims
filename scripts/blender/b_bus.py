# 12 m regional bus (generic white/red livery; line 151 serves the summit), origin at ground centre, nose +Y.
exec(open(SERPENTINE + "/scripts/blender/bhelp.py").read())
col = fresh_collection("Gaisberg_Bus")
body = material("bus_body", "#f1f1ee", 0.35, 0.3)
stripe = material("bus_stripe", "#c4161c", 0.4, 0.2)
glass = material("bus_glass", "#15191d", 0.08, 0.3)
tyre = material("bus_tyre", "#151515", 0.9)
rim = material("bus_rim", "#b9bdc1", 0.3, 0.8)
lamp = material("bus_lamp", "#f4f1e6", 0.2)
dark = material("bus_dark", "#26292c", 0.6)
mb = MeshBuilder([body, stripe, glass, tyre, rim, lamp, dark])
L, W, H = 12.0, 2.55, 3.05
mb.box((0, 0, 0.35 + (H - 0.35) / 2), (W, L, H - 0.35), 0)
# window band both sides + windscreen + rear window
for s in (1, -1):
    mb.box((s * (W / 2 + 0.005), 0.4, 2.05), (0.01, L - 1.8, 1.05), 2)
    mb.box((s * (W / 2 + 0.006), 0, 1.12), (0.01, L - 0.2, 0.22), 1)
    for y in (3.6, -3.4):
        mb.tube((s * (W / 2 - 0.25), y, 0.5), (s * (W / 2 + 0.02), y, 0.5), 0.5, 3, 16)
        mb.tube((s * (W / 2 + 0.01), y, 0.5), (s * (W / 2 + 0.03), y, 0.5), 0.3, 4, 12)
mb.box((0, L / 2 + 0.005, 1.95), (W - 0.2, 0.01, 1.6), 2)
mb.box((0, -L / 2 - 0.005, 2.2), (W - 0.6, 0.01, 0.8), 2)
mb.box((0, L / 2 + 0.006, 0.75), (W - 0.1, 0.01, 0.35), 6)
for s in (1, -1):
    mb.box((s * 0.95, L / 2 + 0.01, 0.75), (0.3, 0.02, 0.14), 5)
# destination display and roof units
mb.box((0, L / 2 + 0.01, 2.85), (1.6, 0.02, 0.22), 6)
mb.box((0, -1.0, H + 0.12), (1.8, 3.2, 0.24), 0)
ob = mb.to_object("bus", col)
ob.location = (0, 0, 0)
size = export_glb([ob], "bus.glb")[1]
ob.location = (30, -20, 0)
result = {"size": size}

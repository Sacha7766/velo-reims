# Mediterranean foliage atlas (exec'd by bake-foliage.py with BIOME=mediterranean); same regions,
# different plants: BRANCH = Aleppo pine needle tufts, LEAVES = holm oak / wild olive leaves,
# BARK_D = pine bark, BARK_L = oak bark, GRASS = carritx (Ampelodesmos) tussock,
# FLOWERS = rosemary / mastic cushion. Writes public/textures/foliage-med.png.
from PIL import ImageDraw


def bark(path, box_px):
    im = Image.open(path).convert('RGB').resize((box_px[2] - box_px[0], box_px[3] - box_px[1]), Image.LANCZOS)
    im.putalpha(255)
    atlas.paste(im, box_px[:2])

needles = load_rgba('PineNeedles001', 'PineNeedles001_1K-PNG_Color.png', 'PineNeedles001_1K-PNG_Opacity.png')
def greyGreen(im, f=1.0):
    # needle scans are brownish: keep their luminance, recolour to a light grey-green that the
    # per-instance tint can push towards Aleppo-pine grey-green
    a = np.asarray(im).astype(np.float32)
    L = (a[..., 0] * 0.3 + a[..., 1] * 0.55 + a[..., 2] * 0.15) / 255.0
    L = np.clip(0.35 + L * 1.1, 0, 1) * f
    out = np.stack([L * 205, L * 228, L * 200, a[..., 3]], -1).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

needle_sprites = [greyGreen(s_) for s_ in sprites(needles, 1500)]

# ---------- Aleppo pine twig with needle tufts (top-left) ----------
pt = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
d = ImageDraw.Draw(pt)
tufts = []
# a short twig network: main shoot left→right with side shoots, tufts at every shoot end
main = [(40, 560), (300, 520), (560, 470), (820, 440), (990, 430)]
d.line(main, fill=(96, 74, 58, 255), width=10)
for k, (x, y) in enumerate(main[1:]):
    tufts.append((x, y, 1.0))
    for side in (-1, 1):
        ex, ey = x + rng.uniform(40, 130), y + side * rng.uniform(110, 230)
        d.line([(x - 60, y + side * 10), (ex, ey)], fill=(96, 74, 58, 255), width=6)
        tufts.append((ex, ey, 0.8))
for layer in range(3):
    for (tx, ty, sc) in tufts:
        # needles radiate from the shoot end, more forwards than backwards (a "pom-pom")
        for k in range(46):
            sp = needle_sprites[rng.integers(len(needle_sprites))]
            ang = rng.uniform(-180, 180)
            if abs(ang) > 120 and rng.random() < 0.6:
                ang *= 0.5
            L = rng.uniform(0.32, 0.5) * sc
            s2 = sp.resize((max(1, int(sp.width * L)), max(1, int(sp.height * L))), Image.LANCZOS)
            s2 = shade(s2, 0.62 + 0.18 * layer + rng.uniform(-0.06, 0.06))
            s2 = s2.rotate(ang, resample=Image.BICUBIC, expand=True)
            # sprite anchor at its centre: push it outwards so the needle base sits at the shoot end
            r = s2.width * 0.28
            cx = tx + math.cos(math.radians(-ang)) * r * 0.5
            cy = ty + math.sin(math.radians(-ang)) * r * 0.5
            pt.alpha_composite(s2, (int(cx - s2.width / 2), int(cy - s2.height / 2)))
atlas.alpha_composite(pt, (0, 0))

# ---------- holm oak / wild olive cluster (top-right) ----------
lv = load_rgba('LeafSet013', 'LeafSet013_1K-PNG_Color.png', 'LeafSet013_1K-PNG_Opacity.png')
leaf_sprites = [neutral(s_, 0.3, 1.25) for s_ in sprites(lv, 3000)]
lc = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
d = ImageDraw.Draw(lc)
twigs = []
for k in range(22):
    a = 2 * math.pi * k / 22 + rng.uniform(-0.1, 0.1)
    r0, r1 = rng.uniform(20, 90), rng.uniform(320, 450)
    twigs.append(((512 + math.cos(a) * r0, 512 + math.sin(a) * r0), (512 + math.cos(a) * r1, 512 + math.sin(a) * r1)))
for (a_, b_) in twigs[::2]:
    d.line([a_, b_], fill=(84, 76, 64, 255), width=4)
for layer in range(3):
    for k in range(900):
        tw = twigs[rng.integers(len(twigs))]
        t = rng.uniform(0.1, 1.0) ** 0.7
        x = tw[0][0] + (tw[1][0] - tw[0][0]) * t + rng.normal(0, 26)
        y = tw[0][1] + (tw[1][1] - tw[0][1]) * t + rng.normal(0, 26)
        if (x - 512) ** 2 + (y - 512) ** 2 > 470 ** 2:
            continue
        sp = leaf_sprites[rng.integers(len(leaf_sprites))]
        # small (holm oak 3–5 cm), pointing outwards along the twig
        tw_ang = math.degrees(math.atan2(tw[1][1] - tw[0][1], tw[1][0] - tw[0][0]))
        paste(lc, sp, x, y, -tw_ang + 90 + rng.normal(0, 40), rng.uniform(0.09, 0.13), 0.58 + 0.2 * layer + rng.uniform(-0.08, 0.08))
for k in range(300):
    a, r = rng.uniform(0, 2 * math.pi), rng.uniform(0, 170)
    sp = leaf_sprites[rng.integers(len(leaf_sprites))]
    paste(lc, sp, 512 + math.cos(a) * r, 512 + math.sin(a) * r, rng.uniform(0, 360), rng.uniform(0.09, 0.12), rng.uniform(0.62, 0.85))
atlas.alpha_composite(lc, (1024, 0))

# ---------- barks ----------
bark(os.path.join(A, 'ambientcg', 'Bark014', 'Bark014_1K-PNG_Color.png'), (0, 1024, 512, 1536))
bark(os.path.join(A, 'ambientcg', 'Bark012', 'Bark012_1K-PNG_Color.png'), (512, 1024, 1024, 1536))

# ---------- carritx tussock: fountain of long arching blades, straw tips (right, row 2) ----------
def carritx():
    t = Image.new('RGBA', (1024, 512), (0, 0, 0, 0))
    d = ImageDraw.Draw(t)
    for k in range(700):
        side = rng.uniform(-1, 1)
        L = rng.uniform(260, 500)
        x0 = 512 + rng.normal(0, 40)
        pts = []
        # blade rises then arches outward and droops
        for i in range(14):
            u = i / 13
            x = x0 + side * L * 0.9 * u ** 1.4
            y = 511 - L * (0.95 * u - 0.55 * u ** 2.2 * abs(side) ** 0.8)
            pts.append((x, y))
        g = rng.uniform(0.75, 1.15)
        base = (int(70 * g), int(92 * g), int(48 * g))
        tip = (int(176 * g), int(166 * g), int(110 * g))
        for i in range(len(pts) - 1):
            u = i / (len(pts) - 1)
            c = tuple(int(base[j] + (tip[j] - base[j]) * u ** 1.3) for j in range(3))
            d.line([pts[i], pts[i + 1]], fill=c + (255,), width=max(1, int(4 * (1 - u) + 1)))
    # a few flowering culms (tall straw stalks with plumes)
    for k in range(9):
        x0 = 512 + rng.normal(0, 60)
        lean = rng.normal(0, 60)
        top = (x0 + lean, rng.uniform(10, 80))
        d.line([(x0, 511), top], fill=(190, 176, 128, 255), width=3)
        for j in range(26):
            u = rng.uniform(0, 0.35)
            px, py = x0 + lean * (1 - u), top[1] + (511 - top[1]) * u
            d.line([(px, py), (px + rng.normal(0, 14), py + rng.uniform(8, 30))], fill=(205, 192, 150, 255), width=2)
    return t
atlas.alpha_composite(carritx(), (1024, 1024))

# ---------- rosemary / mastic cushion (right, bottom row) ----------
def cushion():
    t = Image.new('RGBA', (1024, 512), (0, 0, 0, 0))
    d = ImageDraw.Draw(t)
    # dark interior so the cushion reads solid; leafy edge on top
    d.ellipse([60, 120, 964, 1000], fill=(46, 60, 42, 255))
    for layer in range(3):
        for k in range(5200):
            a = rng.uniform(math.pi * 1.0, math.pi * 2.0)
            r = math.sqrt(rng.random()) * (1.02 if layer == 2 else 0.97)
            x = 512 + math.cos(a) * r * 455
            y = 560 + math.sin(a) * r * 440
            if y > 511:
                continue
            g = rng.uniform(0.6, 1.0) * (0.72 + 0.16 * layer)
            c = (int(70 * g), int(92 * g), int(62 * g), 255)
            ang = rng.uniform(0, math.pi)
            L = rng.uniform(7, 16)
            d.line([(x, y), (x + math.cos(ang) * L, y + math.sin(ang) * L)], fill=c, width=4)
    for k in range(220):  # tiny pale-blue rosemary flowers
        a = rng.uniform(math.pi * 1.05, math.pi * 1.95)
        r = math.sqrt(rng.random()) * 0.95
        x, y = 512 + math.cos(a) * r * 455, 560 + math.sin(a) * r * 440
        if y < 505:
            d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(180, 190, 228, 255))
    return t
atlas.alpha_composite(cushion(), (1024, 1536))

arr = np.asarray(atlas).astype(np.float32)
alpha = arr[..., 3] > 8
if (~alpha).any():
    idx = ndimage.distance_transform_edt(~alpha, return_distances=False, return_indices=True)
    bled = arr[idx[0], idx[1]]
    arr[..., :3] = np.where(alpha[..., None], arr[..., :3], bled[..., :3])
os.makedirs('public/textures', exist_ok=True)
Image.fromarray(arr.astype(np.uint8), 'RGBA').save('public/textures/foliage-med.png', optimize=True)
print('wrote public/textures/foliage-med.png', os.path.getsize('public/textures/foliage-med.png') // 1024, 'KB')

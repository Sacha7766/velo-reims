"""Compose the photographic foliage atlas from CC0 ambientCG / Poly Haven scans.

  python scripts/bake-foliage.py <assets dir>   (research/gaisberg/assets)

Writes public/textures/foliage.png (RGBA, 2048²). Layout in UV space (v up, as used by
src/engine/treeModels.ts):
  BRANCH  u 0.00–0.50, v 0.50–1.00  spruce branch (sprigs of LeafSet019 on a drooping stem)
  LEAVES  u 0.50–1.00, v 0.50–1.00  broadleaf cluster (LeafSet005 leaves on twigs)
  BARK_D  u 0.00–0.25, v 0.25–0.50  spruce bark (Poly Haven bark_brown_01)
  BARK_L  u 0.25–0.50, v 0.25–0.50  smooth grey beech bark (ambientCG Bark005)
  GRASS   u 0.50–1.00, v 0.25–0.50  meadow tuft (Foliage001 blades + Foliage003 seed heads)
  FLOWERS u 0.50–1.00, v 0.00–0.25  meadow tuft with flowers
Foliage colour is kept fairly neutral (bright, low saturation) so the renderer can tint per
tree and season through instance colours.
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from scipy import ndimage

A = sys.argv[1]
S = 2048
rng = np.random.default_rng(11)
atlas = Image.new('RGBA', (S, S), (0, 0, 0, 0))


def load_rgba(name, color, opacity):
    c = Image.open(os.path.join(A, 'ambientcg', name, color)).convert('RGB')
    o = Image.open(os.path.join(A, 'ambientcg', name, opacity)).convert('L')
    im = c.copy()
    im.putalpha(o)
    return im


def sprites(im, min_px=800, pad=2):
    """Split an atlas into its separate cut-out elements (connected opacity components)."""
    a = np.asarray(im.getchannel('A')) > 100
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=3))
    out = []
    for sl in ndimage.find_objects(lab):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if h * w < min_px:
            continue
        box = (max(0, sl[1].start - pad), max(0, sl[0].start - pad), sl[1].stop + pad, sl[0].stop + pad)
        out.append(im.crop(box))
    return out


def neutral(im, sat=0.45, bright=1.25):
    """Reduce saturation and lift brightness so instance colours can tint it."""
    rgb = im.convert('RGB')
    rgb = ImageEnhance.Color(rgb).enhance(sat)
    rgb = ImageEnhance.Brightness(rgb).enhance(bright)
    out = rgb.copy()
    out.putalpha(im.getchannel('A'))
    return out


def shade(im, f):
    rgb = ImageEnhance.Brightness(im.convert('RGB')).enhance(f)
    rgb.putalpha(im.getchannel('A'))
    return rgb


def paste(dst, src, cx, cy, angle, scale, f=1.0):
    s = src.resize((max(1, int(src.width * scale)), max(1, int(src.height * scale))), Image.LANCZOS)
    if f != 1.0:
        s = shade(s, f)
    s = s.rotate(angle, resample=Image.BICUBIC, expand=True)
    dst.alpha_composite(s, (int(cx - s.width / 2), int(cy - s.height / 2)))


# ---------- spruce branch (top-left 1024²) ----------
needles = load_rgba('LeafSet019', 'LeafSet019_1K-PNG_Color.png', 'LeafSet019_1K-PNG_Opacity.png')
sprigs = [neutral(s, 0.55, 1.15) for s in sprites(needles, 4000)]
br = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
from PIL import ImageDraw
# stem: from the left edge (trunk side), drooping towards the right, slight upturn at the tip
stem = lambda t: (20 + t * 980, 420 + 230 * t * t - 60 * t ** 4)
for layer in range(3):
    for k in range(170):
        t = 0.05 + 0.93 * (k / 170) + rng.uniform(-0.005, 0.005)
        x, y = stem(t)
        side = -1 if (k + layer) % 2 else 1
        width = 1.0 - 0.55 * t
        sp = sprigs[rng.integers(len(sprigs))]
        # sprig points forward-outward and hangs ("comb" spruce habit)
        ang = (side * (40 + rng.uniform(-12, 12)) - 18 * t) + (-8 if side > 0 else 8) * layer
        sc = (0.17 + 0.13 * width) * (0.9 + 0.2 * rng.random())
        dy = side * (50 + 90 * width) * rng.random() + 60 * layer
        # deeper layers are darker (self-shadowing inside the branch)
        paste(br, sp, x + 30 * width, y + dy * 0.85, ang, sc, 0.55 + 0.25 * layer + 0.2 * t)
stem_layer = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
ImageDraw.Draw(stem_layer).line([stem(t / 40) for t in range(41)], fill=(70, 52, 38, 255), width=8)
stem_layer.alpha_composite(br)
atlas.alpha_composite(stem_layer, (0, 0))

# ---------- broadleaf cluster (top-right 1024²) ----------
leaves_im = load_rgba('LeafSet005', 'LeafSet005_1K-PNG_Color.png', 'LeafSet005_1K-PNG_Opacity.png')
leaf_sprites = [neutral(s, 0.35, 1.35) for s in sprites(leaves_im, 6000)]
# single leaves only (drop the stem with attached leaves: widest sprite)
leaf_sprites.sort(key=lambda s: s.width * s.height)
singles = leaf_sprites[:-1] if len(leaf_sprites) > 2 else leaf_sprites
lc = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
d = ImageDraw.Draw(lc)
twigs = []
for k in range(26):
    a = 2 * math.pi * k / 26 + rng.uniform(-0.1, 0.1)
    r0, r1 = rng.uniform(20, 90), rng.uniform(330, 440)
    twigs.append(((512 + math.cos(a) * r0, 512 + math.sin(a) * r0), (512 + math.cos(a) * r1, 512 + math.sin(a) * r1)))
for (a, b) in twigs[::2]:
    d.line([a, b], fill=(70, 62, 52, 255), width=3)
for layer in range(3):
    for k in range(1300):
        tw = twigs[rng.integers(len(twigs))]
        t = rng.uniform(0.1, 1.0) ** 0.7
        x = tw[0][0] + (tw[1][0] - tw[0][0]) * t + rng.normal(0, 30)
        y = tw[0][1] + (tw[1][1] - tw[0][1]) * t + rng.normal(0, 30)
        if (x - 512) ** 2 + (y - 512) ** 2 > 470 ** 2:
            continue
        sp = singles[rng.integers(len(singles))]
        # leaves hang mostly downwards with random twist, not radially (avoids a rosette pattern)
        paste(lc, sp, x, y, 180 + rng.normal(0, 55), rng.uniform(0.075, 0.11), 0.6 + 0.2 * layer + rng.uniform(-0.08, 0.08))
for k in range(380):  # fill the middle of the cluster
    a, r = rng.uniform(0, 2 * math.pi), rng.uniform(0, 160)
    sp = singles[rng.integers(len(singles))]
    paste(lc, sp, 512 + math.cos(a) * r, 512 + math.sin(a) * r, rng.uniform(0, 360), rng.uniform(0.08, 0.11), rng.uniform(0.7, 0.95))
atlas.alpha_composite(lc, (1024, 0))

# ---------- barks (row 0.25–0.5 → pixel rows 1024..1536) ----------
def bark(path, box_px):
    im = Image.open(path).convert('RGB').resize((box_px[2] - box_px[0], box_px[3] - box_px[1]), Image.LANCZOS)
    im.putalpha(255)
    atlas.paste(im, box_px[:2])

pb = os.path.join(A, 'polyhaven', 'textures', 'bark_brown_01')
dark = [f for f in os.listdir(pb) if 'diff' in f.lower() or 'Diffuse' in f]
bark(os.path.join(pb, sorted(dark)[0]), (0, 1024, 512, 1536))
lb = os.path.join(A, 'ambientcg', 'Bark005', 'Bark005_1K-PNG_Color.png')
bark(lb, (512, 1024, 1024, 1536))

# ---------- grass tufts (right half, rows 1024..2048) ----------
blades = load_rgba('Foliage001', 'Foliage001_1K-PNG_Color.png', 'Foliage001_1K-PNG_Opacity.png')
heads = load_rgba('Foliage003', 'Foliage003_1K-PNG_Color.png', 'Foliage003_1K-PNG_Opacity.png')
blade_sprites = [neutral(s, 0.6, 1.15) for s in sprites(blades, 1500)]
head_sprites = [neutral(s, 0.5, 1.2) for s in sprites(heads, 1500)]


def tuft(flowers):
    t = Image.new('RGBA', (1024, 512), (0, 0, 0, 0))
    for layer in range(3):
        for k in range(55):
            sp = blade_sprites[rng.integers(len(blade_sprites))]
            h = rng.uniform(260, 470) * (0.8 + 0.1 * layer)
            sc = h / sp.height
            x = rng.normal(512, 170)
            ang = rng.normal(0, 14)
            s2 = sp.resize((max(1, int(sp.width * sc * 1.4)), max(1, int(h))), Image.LANCZOS)
            s2 = shade(s2, 0.72 + 0.14 * layer)
            s2 = s2.rotate(ang, resample=Image.BICUBIC, expand=True)
            t.alpha_composite(s2, (int(x - s2.width / 2), max(0, 512 - s2.height)))
        for k in range(10 if flowers else 5):
            sp = head_sprites[rng.integers(len(head_sprites))]
            h = rng.uniform(330, 500)
            s2 = sp.resize((max(1, int(sp.width * h / sp.height)), int(h)), Image.LANCZOS)
            s2 = s2.rotate(rng.normal(0, 10), resample=Image.BICUBIC, expand=True)
            t.alpha_composite(s2, (int(rng.normal(512, 190) - s2.width / 2), max(0, 512 - s2.height)))
    if flowers:
        d = ImageDraw.Draw(t)
        palette = [(250, 248, 236), (246, 214, 70), (150, 110, 220), (250, 250, 250), (232, 120, 90), (120, 150, 235)]
        for k in range(16):
            x, y = rng.normal(512, 190), rng.uniform(60, 260)
            col = palette[rng.integers(len(palette))]
            r = rng.uniform(5, 8)
            for p in range(6):
                a = p / 6 * 2 * math.pi
                d.ellipse([x + math.cos(a) * r * 0.7 - r * 0.55, y + math.sin(a) * r * 0.7 - r * 0.55,
                           x + math.cos(a) * r * 0.7 + r * 0.55, y + math.sin(a) * r * 0.7 + r * 0.55], fill=col + (255,))
            d.ellipse([x - r * 0.35, y - r * 0.35, x + r * 0.35, y + r * 0.35], fill=(236, 196, 58, 255))
            d.line([(x, y + r * 0.4), (x + rng.normal(0, 6), min(511, y + rng.uniform(120, 260)))], fill=(70, 110, 50, 255), width=3)
    return t


atlas.alpha_composite(tuft(False), (1024, 1024))
atlas.alpha_composite(tuft(True), (1024, 1536))

# alpha-tested cards sample their colour at the alpha edge: bleed colour into transparent texels
arr = np.asarray(atlas).astype(np.float32)
alpha = arr[..., 3] > 8
if (~alpha).any():
    idx = ndimage.distance_transform_edt(~alpha, return_distances=False, return_indices=True)
    bled = arr[idx[0], idx[1]]
    arr[..., :3] = np.where(alpha[..., None], arr[..., :3], bled[..., :3])
os.makedirs('public/textures', exist_ok=True)
Image.fromarray(arr.astype(np.uint8), 'RGBA').save('public/textures/foliage.png', optimize=True)
print('wrote public/textures/foliage.png', os.path.getsize('public/textures/foliage.png') // 1024, 'KB')

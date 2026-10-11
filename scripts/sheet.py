"""Contact sheet: python scripts/sheet.py out.jpg img1.png img2.png ... (2 columns, labelled)."""
import os
import sys

from PIL import Image, ImageDraw

out, files = sys.argv[1], sys.argv[2:]
rows = (len(files) + 1) // 2
W = Image.new('RGB', (1600, 450 * rows))
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB').resize((800, 450))
    W.paste(im, ((i % 2) * 800, (i // 2) * 450))
    ImageDraw.Draw(W).text(((i % 2) * 800 + 10, (i // 2) * 450 + 10), os.path.basename(f), fill=(255, 255, 0))
W.save(out, quality=85)

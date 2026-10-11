"""Side-by-side: python scripts/compare.py <reference.jpg> <render.png> <out.jpg> [label]
The reference is cropped to 16:9 (dashcam frames carry the bonnet at the bottom)."""
import sys

from PIL import Image, ImageDraw

ref_path, game_path, out = sys.argv[1:4]
label = sys.argv[4] if len(sys.argv) > 4 else ''
ref = Image.open(ref_path).convert('RGB')
w, h = ref.size
# 16:9 crop from the top (drop the dashboard)
th = min(h, int(w * 9 / 16))
ref = ref.crop((0, 0, w, th)).resize((960, 540))
game = Image.open(game_path).convert('RGB').resize((960, 540))
W = Image.new('RGB', (1920, 570), (12, 12, 14))
W.paste(ref, (0, 30))
W.paste(game, (960, 30))
d = ImageDraw.Draw(W)
d.text((10, 8), f'REAL (KartaView)  {label}', fill=(240, 240, 240))
d.text((970, 8), 'SERPENTINE', fill=(240, 240, 240))
W.save(out, quality=86)

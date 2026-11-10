#!/usr/bin/env python
"""Generate the original demo illustrations used by the layout proof."""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).with_name("art")
OUT.mkdir(exist_ok=True)
NAVY = (11, 27, 43)
GOLD = (200, 164, 93)
PAPER = (241, 232, 216)
LIGHT = (250, 245, 232)
RED = (199, 53, 42)


def scaled(draw_fn, width, height, scale=2):
    image = Image.new("RGB", (width * scale, height * scale), NAVY)
    draw = ImageDraw.Draw(image)
    draw_fn(draw, width * scale, height * scale)
    return image.resize((width, height), Image.Resampling.LANCZOS)


def observatory(draw, w, h):
    cx, cy = w // 2, int(h * 0.54)
    for radius in (int(w * 0.42), int(w * 0.31), int(w * 0.20)):
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=GOLD, width=3)
    draw.line((int(w * 0.08), cy, int(w * 0.92), cy), fill=GOLD, width=3)
    draw.line((cx, int(h * 0.12), cx, int(h * 0.92)), fill=GOLD, width=3)
    for x, y, r in [(0.22, 0.18, 4), (0.76, 0.14, 3), (0.84, 0.36, 4), (0.15, 0.73, 3), (0.36, 0.12, 3), (0.72, 0.78, 4), (0.30, 0.86, 3), (0.90, 0.84, 2)]:
        draw.ellipse((int(w * x) - r, int(h * y) - r, int(w * x) + r, int(h * y) + r), fill=LIGHT)
    dome = (int(w * 0.18), int(h * 0.52), int(w * 0.82), int(h * 0.72))
    draw.arc(dome, 180, 360, fill=LIGHT, width=10)
    draw.line((int(w * 0.18), int(h * 0.62), int(w * 0.82), int(h * 0.62)), fill=LIGHT, width=10)
    draw.rectangle((int(w * 0.38), int(h * 0.62), int(w * 0.62), int(h * 0.82)), outline=LIGHT, width=10)
    draw.line((cx, int(h * 0.47), cx, int(h * 0.30)), fill=GOLD, width=5)
    draw.line((cx, int(h * 0.30), int(w * 0.42), int(h * 0.22)), fill=GOLD, width=5)
    draw.line((cx, int(h * 0.30), int(w * 0.58), int(h * 0.22)), fill=GOLD, width=5)
    d = int(w * 0.055)
    draw.polygon([(cx, int(h * 0.27) - d), (cx + d, int(h * 0.27)), (cx, int(h * 0.27) + d), (cx - d, int(h * 0.27))], fill=RED)


def clock(draw, w, h):
    cx, cy = int(w * 0.30), h // 2
    for radius in (int(h * 0.40), int(h * 0.30), int(h * 0.20)):
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline=GOLD, width=3)
    draw.line((cx - int(h * 0.40), cy, cx + int(h * 0.40), cy), fill=GOLD, width=3)
    draw.line((cx, cy - int(h * 0.40), cx, cy + int(h * 0.40)), fill=GOLD, width=3)
    draw.line((cx, cy, cx, cy - int(h * 0.23)), fill=LIGHT, width=9)
    draw.line((cx, cy, cx + int(h * 0.26), cy + int(h * 0.10)), fill=LIGHT, width=9)
    for i in range(5):
        x = int(w * 0.62) + i * int(w * 0.055)
        draw.rectangle((x, int(h * 0.25), x + int(w * 0.035), int(h * 0.75)), fill=LIGHT)
    d = int(w * 0.025)
    x, y = int(w * 0.90), int(h * 0.50)
    draw.polygon([(x, y - d), (x + d, y), (x, y + d), (x - d, y)], fill=RED)
    for x, y, r in [(0.12, 0.16, 3), (0.48, 0.12, 2), (0.55, 0.82, 3), (0.84, 0.18, 2), (0.95, 0.82, 3)]:
        draw.ellipse((int(w * x) - r, int(h * y) - r, int(w * x) + r, int(h * y) + r), fill=LIGHT)


scaled(observatory, 1000, 1150).save(OUT / "observatory.png")
scaled(clock, 1200, 700).save(OUT / "clock.png")
print(OUT / "observatory.png")
print(OUT / "clock.png")

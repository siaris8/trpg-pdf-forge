#!/usr/bin/env python
"""Compose a small contact sheet from one or more page images."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageDraw


def main() -> int:
    parser = argparse.ArgumentParser(description="拼合页面缩略图")
    parser.add_argument("out", type=Path)
    parser.add_argument("images", type=Path, nargs="+")
    parser.add_argument("--width", type=int, default=620)
    args = parser.parse_args()
    if not args.images:
        print("至少给一张图片。", file=sys.stderr)
        return 2
    thumbs: list[tuple[str, Image.Image]] = []
    for file in args.images:
        if not file.exists():
            print(f"找不到图片：{file}", file=sys.stderr)
            return 2
        image = Image.open(file).convert("RGB")
        ratio = args.width / image.width
        image = image.resize((args.width, max(1, int(image.height * ratio))), Image.Resampling.LANCZOS)
        thumbs.append((file.stem, image))
    width = args.width
    height = max(image.height for _, image in thumbs)
    margin = 18
    label_height = 26
    sheet = Image.new("RGB", (len(thumbs) * width + (len(thumbs) + 1) * margin, height + label_height + 2 * margin), "#f1e8d8")
    draw = ImageDraw.Draw(sheet)
    for index, (label, image) in enumerate(thumbs):
        x = margin + index * (width + margin)
        y = margin
        sheet.paste(image, (x, y))
        draw.text((x + 4, y + height + 6), f"p{index + 1} · {label}", fill="#171717")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    print(f"OK：{args.out}")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

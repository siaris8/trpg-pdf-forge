#!/usr/bin/env python
"""Render PDF pages to PNG and make a contact sheet for review."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    import pymupdf as fitz
except ImportError:  # pragma: no cover
    import fitz  # type: ignore

from PIL import Image, ImageDraw


def render_one(pdf: Path, out: Path, dpi: int) -> Path:
    doc = fitz.open(pdf)
    if len(doc) == 0:
        raise ValueError("PDF 没有页面。")
    page = doc[0]
    pix = page.get_pixmap(dpi=dpi, alpha=False)
    out.parent.mkdir(parents=True, exist_ok=True)
    pix.save(out)
    return out


def render_all(pdf: Path, out_dir: Path, dpi: int) -> list[Path]:
    doc = fitz.open(pdf)
    out_dir.mkdir(parents=True, exist_ok=True)
    files: list[Path] = []
    for index, page in enumerate(doc, start=1):
        pix = page.get_pixmap(dpi=dpi, alpha=False)
        target = out_dir / f"page-{index:03d}.png"
        pix.save(target)
        files.append(target)
    if files:
        contact_sheet(files, out_dir / "contact-sheet.png")
    return files


def parse_pages(spec: str, total: int) -> list[int]:
    pages: list[int] = []
    for part in str(spec).split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            start, end = part.split("-", 1)
            pages.extend(range(int(start), int(end) + 1))
        else:
            pages.append(int(part))
    return [page for page in sorted(set(pages)) if 1 <= page <= total]


def render_selected(pdf: Path, out_dir: Path, dpi: int, numbers: list[int]) -> list[Path]:
    doc = fitz.open(pdf)
    out_dir.mkdir(parents=True, exist_ok=True)
    files: list[Path] = []
    for number in numbers:
        if not (1 <= number <= len(doc)):
            continue
        pix = doc[number - 1].get_pixmap(dpi=dpi, alpha=False)
        target = out_dir / f"page-{number:03d}.png"
        pix.save(target)
        files.append(target)
    if files:
        contact_sheet(files, out_dir / "contact-sheet.png")
    return files


def contact_sheet(files: list[Path], out: Path, columns: int = 4) -> Path:
    thumbs: list[Image.Image] = []
    for file in files:
        image = Image.open(file).convert("RGB")
        ratio = 260 / image.width
        thumbs.append(image.resize((260, max(1, int(image.height * ratio))), Image.Resampling.LANCZOS))
    if not thumbs:
        raise ValueError("没有可拼图的页面。")
    width = 260
    height = max(image.height for image in thumbs)
    rows = (len(thumbs) + columns - 1) // columns
    margin = 14
    label_height = 22
    sheet = Image.new("RGB", (columns * width + (columns + 1) * margin, rows * (height + label_height) + (rows + 1) * margin), "#f1e8d8")
    draw = ImageDraw.Draw(sheet)
    for index, image in enumerate(thumbs):
        column = index % columns
        row = index // columns
        x = margin + column * (width + margin)
        y = margin + row * (height + label_height + margin)
        sheet.paste(image, (x, y))
        draw.text((x + 3, y + height + 3), f"p{index + 1}", fill="#171717")
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="PDF 转 PNG")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--dpi", type=int, default=150)
    parser.add_argument("--all", action="store_true", help="render every page into a directory")
    parser.add_argument("--pages", default=None, help="render selected source pages, e.g. 19-34,40")
    args = parser.parse_args()
    if not args.pdf.exists():
        print(f"找不到 PDF：{args.pdf}", file=sys.stderr)
        return 2
    try:
        if args.pages:
            doc = fitz.open(args.pdf)
            total = len(doc)
            numbers = parse_pages(args.pages, total)
            files = render_selected(args.pdf, args.out, args.dpi, numbers)
            print(f"OK：{len(files)} 页 → {args.out}")
        elif args.all or args.out.suffix.lower() not in (".png", ".jpg", ".jpeg"):
            files = render_all(args.pdf, args.out, args.dpi)
            print(f"OK：{len(files)} 页 + {args.out / 'contact-sheet.png'}")
        else:
            target = render_one(args.pdf, args.out, args.dpi)
            print(f"OK：{target}")
    except Exception as error:  # noqa: BLE001
        print(f"渲染失败：{error}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

#!/usr/bin/env python
"""Fail when the source has usable illustrations but the printed pages have none.

This is a guard against the common failure mode of extracting source art into
work/images and then never placing it in the HTML/PDF.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from reportpath import display

try:
    import pymupdf as fitz
except ImportError:  # pragma: no cover
    import fitz  # type: ignore


def unique_images(doc) -> dict[int, tuple[int, int, float]]:
    found: dict[int, tuple[int, int, float]] = {}
    for page in doc:
        for info in page.get_images(full=True):
            xref = int(info[0])
            width = int(info[2] or 0)
            height = int(info[3] or 0)
            try:
                bbox = page.get_image_bbox(info)
                page_area = page.rect.width * page.rect.height
                coverage = min(1.0, max(0.0, abs(bbox.width * bbox.height) / page_area)) if page_area else 0.0
            except Exception:
                coverage = 0.0
            current = found.get(xref)
            if current is None or coverage > current[2]:
                found[xref] = (width, height, coverage)
    return found


def usable(width: int, height: int, coverage: float = 0.0) -> bool:
    # A full-page scan is a page image, not a book illustration.
    if coverage >= 0.8 and width * height >= 200_000:
        return False
    return width >= 200 and height >= 200 and width * height >= 80_000


def main() -> int:
    parser = argparse.ArgumentParser(description="检查源插图是否实际进入 PDF")
    parser.add_argument("source", type=Path)
    parser.add_argument("targets", type=Path, nargs="+")
    parser.add_argument("--json", type=Path, default=None)
    parser.add_argument("--min-target", type=int, default=1)
    args = parser.parse_args()
    for path in [args.source, *args.targets]:
        if not path.exists():
            print(f"找不到文件：{path}", file=sys.stderr)
            return 2
    source_doc = fitz.open(args.source)
    source_images = unique_images(source_doc)
    source_usable = {xref: size for xref, size in source_images.items() if usable(*size)}
    source_page_scans = sum(1 for size in source_images.values() if not usable(*size) and size[0] * size[1] >= 200_000 and size[2] >= 0.8)
    target_images: dict[str, int] = {}
    target_total = 0
    for target in args.targets:
        doc = fitz.open(target)
        images = unique_images(doc)
        target_images[display(target)] = len(images)
        target_total += len(images)
    required = min(args.min_target, len(source_usable)) if source_usable else 0
    zero_allowed = len(source_usable) == 0
    ok = target_total >= required
    if not source_images:
        note = "源 PDF 没有可识别的位图插图；0 图允许，请在 REPORT 中说明（若是矢量插图，可渲染页图后裁切）。"
    elif zero_allowed:
        note = "源 PDF 只有图标/扫描页，没有可用插图；0 图允许，请不要硬塞图标或整页扫描。"
    elif not ok:
        note = "源 PDF 有可用插图，但导出的 PDF 没有嵌入足够的图。"
    else:
        note = "源插图已进入导出 PDF。"
    result = {
        "ok": ok,
        "zeroAllowed": zero_allowed,
        "source": display(args.source),
        "sourceImages": len(source_images),
        "sourceUsableIllustrations": len(source_usable),
        "sourcePageScans": source_page_scans,
        "targets": target_images,
        "targetImages": target_total,
        "required": required,
        "note": note,
    }
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if not ok:
        print("FAIL：源 PDF 有可用插图，但输出 PDF 没有嵌入至少 1 张。请把 work/images 中的图实际放进 HTML。", file=sys.stderr)
        return 1
    print(f"OK：sourceImages={len(source_images)}, sourceUsable={len(source_usable)}, targetImages={target_total}")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

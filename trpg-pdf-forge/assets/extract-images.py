#!/usr/bin/env python
"""Extract and classify images embedded in the source PDF.

The agent must decide what to place; this script only inventories and extracts.
Outputs work/images/manifest.json with size, page, kind and a recommended use.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

from reportpath import display

try:
    import pymupdf as fitz
except ImportError:  # pragma: no cover
    import fitz  # type: ignore


def classify(width: int, height: int) -> tuple[str, str]:
    pixels = width * height
    short = min(width, height)
    if short <= 160 or pixels < 40_000:
        return "icon", "small icon or ornament; use CSS/inline, not a photo"
    if pixels >= 200_000 or short >= 300:
        return "illustration", "preferred for a figure, chapter opener or NPC/room art"
    return "small", "inspect; may be a map fragment, item or decorative image"


def main() -> int:
    parser = argparse.ArgumentParser(description="提取并分类源 PDF 插图")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--out", type=Path, default=Path("work/images"))
    args = parser.parse_args()
    if not args.pdf.exists():
        print(f"找不到 PDF：{args.pdf}", file=sys.stderr)
        return 2
    doc = fitz.open(args.pdf)
    args.out.mkdir(parents=True, exist_ok=True)
    by_xref: dict[int, dict] = {}
    by_digest: dict[str, dict] = {}
    for page_no, page in enumerate(doc, start=1):
        for info in page.get_images(full=True):
            xref = int(info[0])
            if xref in by_xref:
                if page_no not in by_xref[xref]["pages"]:
                    by_xref[xref]["pages"].append(page_no)
                continue
            try:
                extracted = doc.extract_image(xref)
            except Exception:
                continue
            data = extracted.get("image")
            if not data:
                continue
            width = int(extracted.get("width") or info[2] or 0)
            height = int(extracted.get("height") or info[3] or 0)
            try:
                bbox = page.get_image_bbox(info)
                page_area = page.rect.width * page.rect.height
                coverage = min(1.0, max(0.0, abs(bbox.width * bbox.height) / page_area)) if page_area else 0.0
            except Exception:
                coverage = 0.0
            digest = hashlib.sha256(data).hexdigest()
            if digest in by_digest:
                record = by_digest[digest]
                by_xref[xref] = record
                if page_no not in record["pages"]:
                    record["pages"].append(page_no)
                record["coverage"] = max(record.get("coverage", 0.0), round(coverage, 3))
                continue
            extension = (extracted.get("ext") or "png").lower()
            name = f"p{page_no:03d}-{digest[:12]}.{extension}"
            target = args.out / name
            if not target.exists():
                target.write_bytes(data)
            kind, note = classify(width, height)
            use = "review"
            if coverage >= 0.8 and width * height >= 200_000:
                kind = "page-scan"
                note = "full-page scan; use for OCR/reading, not as a book illustration"
                use = "skip"
            record = {
                "file": str(target.as_posix()),
                "name": name,
                "pages": [page_no],
                "width": width,
                "height": height,
                "bytes": len(data),
                "sha256": digest,
                "kind": kind,
                "note": note,
                "coverage": round(coverage, 3),
                "use": use,
            }
            by_xref[xref] = record
            by_digest[digest] = record
    records = sorted(by_digest.values(), key=lambda item: (item["pages"][0], -item["width"] * item["height"]))
    manifest = {
        "source": display(args.pdf),
        "images": records,
        "counts": {
            "total": len(records),
            "illustration": sum(1 for item in records if item["kind"] == "illustration"),
            "small": sum(1 for item in records if item["kind"] == "small"),
            "icon": sum(1 for item in records if item["kind"] == "icon"),
            "page-scan": sum(1 for item in records if item["kind"] == "page-scan"),
        },
    }
    manifest_path = args.out / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest["counts"], ensure_ascii=False))
    print(f"manifest: {manifest_path}")
    if not records:
        print("提示：源 PDF 没有可提取的位图。若确有插图，可能是矢量图；需要整页渲染后再裁切。")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

#!/usr/bin/env python
"""Check a printed PDF for WPS compatibility: fonts, Type3, page size, text."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    import pymupdf as fitz
except ImportError:  # pragma: no cover
    import fitz  # type: ignore


def inspect(pdf: Path, require_bookmarks: bool = False) -> dict:
    doc = fitz.open(pdf)
    pages = len(doc)
    if pages == 0:
        raise ValueError("PDF 没有页面。")
    first = doc[0].rect
    toc = doc.get_toc(simple=True)
    try:
        raw_mode = doc.xref_get_key(doc.pdf_catalog(), "PageMode")
        page_mode = raw_mode[1].lstrip("/") if raw_mode and raw_mode[0] == "name" else None
    except Exception:  # noqa: BLE001
        page_mode = None
    sizes = sorted({(round(page.rect.width, 1), round(page.rect.height, 1)) for page in doc})
    fonts: dict[tuple, dict] = {}
    type3_fonts: set[tuple] = set()
    image_count = 0
    text_chars = 0
    for index, page in enumerate(doc, start=1):
        text_chars += len(page.get_text("text"))
        image_count += len(page.get_images(full=True))
        for font in page.get_fonts(full=True):
            xref, ext, ftype, basefont = font[0], font[1], font[2], font[3]
            key = (basefont, ftype, ext)
            fonts.setdefault(key, {
                "basefont": basefont,
                "type": ftype,
                "ext": ext,
                "pages": [],
            })
            if index not in fonts[key]["pages"]:
                fonts[key]["pages"].append(index)
            if ftype == "Type3":
                type3_fonts.add((xref, basefont, ftype))
    font_list = sorted(fonts.values(), key=lambda item: (item["type"], item["basefont"]))
    embedded = [item for item in font_list if item["ext"] not in ("n/a", "", None)]
    unembedded = [item for item in font_list if item["ext"] in ("n/a", "", None) and item["type"] != "Type3"]
    bookmarks = len(toc)
    result = {
        "ok": len(type3_fonts) == 0
        and len(unembedded) == 0
        and pages > 0
        and (bookmarks > 0 or not require_bookmarks),
        "file": str(pdf.resolve()),
        "pages": pages,
        "width": round(first.width, 2),
        "height": round(first.height, 2),
        "sizes": [{"width": width, "height": height} for width, height in sizes],
        "type3": len(type3_fonts),
        "bookmarks": bookmarks,
        "bookmarksRequired": require_bookmarks,
        "bookmarkDepth": max((level for level, _, _ in toc), default=0),
        "bookmarkItems": [
            {"level": level, "title": title, "page": page}
            for level, title, page in toc[:200]
        ],
        "pageMode": page_mode,
        "fonts": font_list,
        "embeddedFonts": len(embedded),
        "unembeddedFonts": len(unembedded),
        "textChars": text_chars,
        "images": image_count,
        "bytes": pdf.stat().st_size,
    }
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="检查 PDF 的字体与 Type3")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--json", type=Path, default=None)
    parser.add_argument("--require-bookmarks", action="store_true")
    args = parser.parse_args()
    if not args.pdf.exists():
        print(f"找不到 PDF：{args.pdf}", file=sys.stderr)
        return 2
    try:
        result = inspect(args.pdf, args.require_bookmarks)
    except Exception as error:  # noqa: BLE001
        print(f"检查失败：{error}", file=sys.stderr)
        return 2
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result["type3"]:
        print(f"\nFAIL：发现 {result['type3']} 个 Type3 字体，WPS 兼容性不合格。", file=sys.stderr)
        return 1
    if args.require_bookmarks and result["bookmarks"] == 0:
        print("\nFAIL：没有 PDF 书签；全篇必须带书签。", file=sys.stderr)
        return 1
    print(
        f"\nOK：{result['pages']} 页，{result['type3']} 个 Type3，"
        f"{result['bookmarks']} 条书签（{result['pageMode'] or '未设置 PageMode'}），字体全部嵌入。"
    )
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

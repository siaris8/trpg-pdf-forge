#!/usr/bin/env python
"""Add a WPS-friendly PDF outline to an existing PDF.

The outline is a bookmark tree, not link annotations. WPS/Adobe show it in the
bookmarks pane. `merge-pdf.py` reuses `add_outline()` so there is one nesting
implementation.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter

MAX_BOOKMARKS = 500


def read_outline(path: Path) -> tuple[list[dict], int, str]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    items = data.get("items") if isinstance(data, dict) else data
    if not isinstance(items, list):
        raise ValueError("outline JSON 必须有 items 数组。")
    sections = int(data.get("sections") or 0) if isinstance(data, dict) else 0
    source = str(data.get("source") or "") if isinstance(data, dict) else ""
    return items, sections, source


def clean_title(value: object) -> str:
    title = " ".join(str(value or "").split())
    return title[:160]


def add_outline(
    writer: PdfWriter,
    items: list[dict],
    *,
    offset: int = 0,
    cover_title: str | None = None,
    total_pages: int | None = None,
    max_bookmarks: int = MAX_BOOKMARKS,
) -> dict:
    """Add a 1–3 level outline to `writer`; page values in items are 1-based."""
    if total_pages is None:
        total_pages = len(writer.pages)
    if len(items) + (1 if cover_title else 0) > max_bookmarks:
        raise ValueError(f"书签超过 {max_bookmarks} 条；先减少 h3 书签。")

    parents: dict[int, object] = {}
    result_items: list[dict] = []

    if cover_title:
        if total_pages < 1:
            raise ValueError("PDF 没有页面，不能加封面书签。")
        bookmark = writer.add_outline_item(cover_title, 0, is_open=True)
        parents[1] = bookmark
        result_items.append({"title": cover_title, "level": 1, "page": 1})

    for raw in items:
        if not isinstance(raw, dict):
            raise ValueError("outline items 必须是对象。")
        title = clean_title(raw.get("title"))
        if not title:
            continue
        try:
            level = int(raw.get("level") or 1)
            page = int(raw.get("page") or 0)
        except (TypeError, ValueError) as error:
            raise ValueError(f"书签 {title} 的 level/page 不是整数。") from error
        level = max(1, min(3, level))
        target = page + offset
        if target < 1 or target > total_pages:
            raise ValueError(f"书签 {title} 的页码 {target} 超出 PDF 范围 1..{total_pages}。")
        parent = None
        if level > 1:
            for parent_level in range(level - 1, 0, -1):
                if parent_level in parents:
                    parent = parents[parent_level]
                    break
        bookmark = writer.add_outline_item(
            title,
            target - 1,
            parent=parent,
            is_open=(level == 1),
        )
        parents[level] = bookmark
        for stale in [key for key in parents if key > level]:
            del parents[stale]
        result_items.append({"title": title, "level": level, "page": target})

    if result_items:
        writer.page_mode = "/UseOutlines"
    depth = max((item["level"] for item in result_items), default=0)
    return {
        "ok": True,
        "count": len(result_items),
        "depth": depth,
        "pageMode": "UseOutlines" if result_items else None,
        "items": result_items,
    }


def write_pdf(reader: PdfReader, writer: PdfWriter, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    temp = out_path.with_name(f".{out_path.stem}.tmp.pdf")
    with temp.open("wb") as stream:
        writer.write(stream)
    os.replace(temp, out_path)


def main() -> int:
    parser = argparse.ArgumentParser(description="给 PDF 添加 WPS/Adobe 书签")
    parser.add_argument("pdf", type=Path)
    parser.add_argument("--outline", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--offset", type=int, default=0, help="在书签页码上加偏移")
    parser.add_argument("--cover-title", default="")
    parser.add_argument("--report", type=Path, default=None)
    parser.add_argument("--strict-pages", action="store_true")
    args = parser.parse_args()
    if not args.pdf.exists():
        print(f"找不到 PDF：{args.pdf}", file=sys.stderr)
        return 2
    if not args.outline.exists():
        print(f"找不到 outline：{args.outline}", file=sys.stderr)
        return 2
    try:
        items, sections, source = read_outline(args.outline)
        reader = PdfReader(str(args.pdf))
        pages = len(reader.pages)
        if args.strict_pages and sections and sections != pages:
            raise ValueError(f"PDF 有 {pages} 页，outline sections={sections}；先修分页。")
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        result = add_outline(
            writer,
            items,
            offset=args.offset,
            cover_title=args.cover_title or None,
            total_pages=pages,
        )
        out_path = args.out or args.pdf.with_name(f"{args.pdf.stem}-bookmarked.pdf")
        write_pdf(reader, writer, out_path)
        report = {
            **result,
            "sourcePdf": str(args.pdf.resolve()),
            "outputPdf": str(out_path.resolve()),
            "outline": str(args.outline.resolve()),
            "outlineSource": source,
            "sections": sections,
            "pages": pages,
        }
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False, indent=2))
        print(f"OK：{result['count']} 条书签；{out_path}")
        return 0
    except Exception as error:  # noqa: BLE001
        print(f"添加书签失败：{error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

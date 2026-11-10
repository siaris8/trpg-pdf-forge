#!/usr/bin/env python
"""Merge cover and body PDFs, preserving pages and embedded fonts.

Optionally adds a WPS/Adobe outline from `outline-body.json`. The body outline
page numbers are 1-based body pages; cover pages are added as an offset.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter

from bookmarks import add_outline, read_outline


def main() -> int:
    parser = argparse.ArgumentParser(description="合并封面与正文 PDF，并写入书签")
    parser.add_argument("cover", type=Path)
    parser.add_argument("body", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--outline", type=Path, default=None)
    parser.add_argument("--strict-outline", action="store_true")
    parser.add_argument("--report", type=Path, default=None)
    parser.add_argument("--cover-title", default="封面")
    args = parser.parse_args()
    for item in (args.cover, args.body):
        if not item.exists():
            print(f"找不到文件：{item}", file=sys.stderr)
            return 2
    try:
        cover_reader = PdfReader(str(args.cover))
        body_reader = PdfReader(str(args.body))
        cover_pages = len(cover_reader.pages)
        body_pages = len(body_reader.pages)
        outline_items: list[dict] = []
        sections = 0
        outline_source = ""
        if args.outline:
            if not args.outline.exists():
                raise ValueError(f"找不到 outline：{args.outline}")
            outline_items, sections, outline_source = read_outline(args.outline)
            if args.strict_outline and sections and sections != body_pages:
                raise ValueError(
                    f"正文 PDF 有 {body_pages} 页，outline sections={sections}；"
                    "先修分页/溢出，再合并。"
                )
            for item in outline_items:
                try:
                    page = int(item.get("page") or 0)
                except (TypeError, ValueError) as error:
                    raise ValueError(f"书签页码不是整数：{item}") from error
                if page < 1 or page > body_pages:
                    raise ValueError(f"书签页码 {page} 超出正文 1..{body_pages}。")

        writer = PdfWriter()
        for reader in (cover_reader, body_reader):
            for page in reader.pages:
                writer.add_page(page)
        outline = add_outline(
            writer,
            outline_items,
            offset=cover_pages,
            cover_title=(args.cover_title or None) if outline_items else None,
            total_pages=len(writer.pages),
        )
        args.out.parent.mkdir(parents=True, exist_ok=True)
        with args.out.open("wb") as stream:
            writer.write(stream)
        report = {
            **outline,
            "sourcePdf": str(args.out.resolve()),
            "cover": str(args.cover.resolve()),
            "body": str(args.body.resolve()),
            "outline": str(args.outline.resolve()) if args.outline else None,
            "outlineSource": outline_source,
            "coverPages": cover_pages,
            "bodyPages": body_pages,
            "sections": sections,
            "pages": len(writer.pages),
        }
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(report, ensure_ascii=False, indent=2))
        print(f"OK：{args.out}（{len(writer.pages)} 页，{outline['count']} 条书签）")
        return 0
    except Exception as error:  # noqa: BLE001
        print(f"合并失败：{error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

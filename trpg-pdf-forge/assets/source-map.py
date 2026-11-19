#!/usr/bin/env python
"""Full-book structural inventory: tables, images, columns, page kinds.

Usage:
  source-map.py --pdf source/source.pdf --out work/source-map.json --merge
  source-map.py --pdf source/source.pdf --pages 1-40 --out work/source-map.json --merge

The existing manual audit (blocks/titles/tables/images) is preserved by --merge;
auto entries carry "source": "auto" so a later manual pass can replace them.
"""
from __future__ import annotations

import argparse
import json
import math
import multiprocessing as mp
import os
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from reportpath import display

from batchlib import read_json, write_json


def page_title(entries: list[tuple[int, str]], number: int) -> str:
    exact = [title for page, title in entries if page == number]
    if exact:
        return exact[-1]
    previous = [title for page, title in entries if page < number]
    return previous[-1] if previous else ""


def detect_columns(blocks) -> int:
    starts = sorted(float(block[0]) for block in blocks if len(block) > 4 and (block[4] or "").strip())
    if not starts:
        return 0
    groups: list[list[float]] = []
    for value in starts:
        if groups and value - groups[-1][-1] <= 35:
            groups[-1].append(value)
        else:
            groups.append([value])
    return min(3, len(groups))


def scan_chunk(task) -> list[dict]:
    pdf_path, numbers, table_mode = task
    try:
        import pymupdf
    except ImportError:  # pragma: no cover
        import fitz as pymupdf  # type: ignore
    document = pymupdf.open(pdf_path)
    rows: list[dict] = []
    for number in numbers:
        if not (1 <= number <= len(document)):
            continue
        page = document[number - 1]
        text = page.get_text("text")
        blocks = page.get_text("blocks")
        chars = len(text.strip())
        drawings = page.get_drawings()
        rects = 0
        for drawing in drawings:
            for item in drawing.get("items", []):
                if item[0] == "re":
                    rects += 1
                    break
        tables = []
        # Full find_tables() on every page is too slow for a full-length book.
        # "auto" runs it only on pages with a real grid; manual table pages are
        # preserved by --merge even when their rect count is low.
        if table_mode == "all" or (table_mode == "auto" and rects >= 6):
            try:
                for table in page.find_tables().tables:
                    bbox = [round(float(value), 1) for value in table.bbox]
                    width = max(0.0, bbox[2] - bbox[0])
                    height = max(0.0, bbox[3] - bbox[1])
                    area = width * height
                    if table.row_count < 2 or table.col_count < 2:
                        continue
                    if area < page.rect.width * page.rect.height * 0.04:
                        continue
                    tables.append({
                        "bbox": bbox,
                        "rows": int(table.row_count),
                        "cols": int(table.col_count),
                    })
            except Exception:  # noqa: BLE001
                tables = []
        images = []
        for image in page.get_image_info(xrefs=True):
            bbox = [float(value) for value in image.get("bbox", [0, 0, 0, 0])]
            width = max(0.0, bbox[2] - bbox[0])
            height = max(0.0, bbox[3] - bbox[1])
            if width < 30 or height < 30:
                continue
            coverage = (width * height) / (page.rect.width * page.rect.height) if page.rect.width and page.rect.height else 0
            images.append({
                "bbox": [round(value, 1) for value in bbox],
                "width": round(width, 1),
                "height": round(height, 1),
                "coverage": round(min(1.0, max(0.0, coverage)), 3),
                "xref": int(image.get("xref") or 0),
            })
        rows.append({
            "page": number,
            "rect": [round(page.rect.width, 1), round(page.rect.height, 1)],
            "chars": chars,
            "lines": len([line for line in text.splitlines() if line.strip()]),
            "words": len(page.get_text("words")),
            "rects": rects,
            "drawings": len(drawings),
            "columns": detect_columns(blocks),
            "tables": tables,
            "images": images,
            "scan": False,
        })
    document.close()
    return rows


def image_frequency(pdf_path: Path) -> Counter:
    try:
        import pymupdf
    except ImportError:  # pragma: no cover
        import fitz as pymupdf  # type: ignore
    document = pymupdf.open(pdf_path)
    counter: Counter = Counter()
    for page in document:
        for image in page.get_images(full=True):
            counter[int(image[0])] += 1
    document.close()
    return counter


def scan(pdf: Path, pages: list[int], workers: int, table_mode: str) -> list[dict]:
    if workers <= 1 or len(pages) < 8:
        return scan_chunk((str(pdf), pages, table_mode))
    chunks = []
    size = max(1, math.ceil(len(pages) / (workers * 2)))
    for start in range(0, len(pages), size):
        chunks.append((str(pdf), pages[start:start + size], table_mode))
    rows: list[dict] = []
    try:
        context = mp.get_context("spawn")
        with context.Pool(processes=min(workers, len(chunks))) as pool:
            for batch in pool.imap_unordered(scan_chunk, chunks):
                rows.extend(batch)
    except Exception as error:  # noqa: BLE001
        print(f"并行扫描失败（{error}），退回串行。", file=sys.stderr)
        rows = scan_chunk((str(pdf), pages, table_mode))
    rows.sort(key=lambda row: row["page"])
    return rows


def load_manifest(path: Path | None) -> list[dict]:
    if not path or not path.exists():
        return []
    data = read_json(path, {})
    return [item for item in data.get("images", []) if isinstance(item, dict)]


def merge_manual(existing: dict, auto_pages: list[dict]) -> list[dict]:
    manual_pages = {
        int(page["page"]): page
        for page in existing.get("pages", [])
        if isinstance(page, dict) and page.get("page")
    }
    merged = []
    for auto in auto_pages:
        number = auto["page"]
        manual = manual_pages.get(number)
        if manual:
            row = dict(auto)
            # Manual audit wins for narrative fields; auto fills structure.
            for key in ("title", "blocks", "columns"):
                if manual.get(key):
                    row[key] = manual[key]
            for key, value in manual.items():
                if key not in row:
                    row[key] = value
            merged.append(row)
        else:
            merged.append(auto)
    known = {row["page"] for row in merged}
    for number, manual in manual_pages.items():
        if number not in known:
            merged.append(manual)
    merged.sort(key=lambda row: int(row["page"]))
    return merged


def build_auto_entries(pages: list[dict], frequency: Counter, manifest: list[dict]) -> tuple[list[dict], list[dict]]:
    tables: list[dict] = []
    images: list[dict] = []
    manifest_by_page: dict[int, list[dict]] = {}
    for item in manifest:
        if len(item.get("pages") or []) > 10:
            continue
        if item.get("kind") == "icon":
            continue
        if float(item.get("coverage") or 0) < 0.04:
            continue
        for page in item.get("pages") or []:
            manifest_by_page.setdefault(int(page), []).append(item)

    for page in pages:
        number = page["page"]
        for table in page.get("tables") or []:
            tables.append({
                "page": number,
                "kind": "auto-table",
                "rows": table["rows"],
                "columns": table["cols"],
                "bbox": table["bbox"],
                "source": "auto",
            })
        kept = []
        seen_boxes = set()
        for image in page.get("images") or []:
            xref = int(image.get("xref") or 0)
            if xref and frequency.get(xref, 0) > 10:
                continue
            coverage = float(image.get("coverage") or 0)
            if coverage < 0.08:
                continue
            if coverage >= 0.9 and page["chars"] >= 200:
                continue
            page_width, page_height = (page.get("rect") or [0, 0])[:2]
            width = float(image.get("width") or 0)
            height = float(image.get("height") or 0)
            if page_width and page_height:
                if height >= page_height * 0.85 and width <= page_width * 0.55:
                    continue  # full-height column background
                if width >= page_width * 0.85 and height <= page_height * 0.2:
                    continue  # full-width band
            box = tuple(round(float(value)) for value in image.get("bbox") or [])
            signature = (round(coverage, 2), round(float(image.get("width") or 0)), round(float(image.get("height") or 0)))
            if box in seen_boxes or signature in seen_boxes:
                continue
            seen_boxes.add(box)
            seen_boxes.add(signature)
            kind = "page-scan" if coverage >= 0.85 and page["chars"] < 200 else "illustration" if coverage >= 0.2 else "small"
            kept.append({
                "page": number,
                "bbox": image["bbox"],
                "coverage": image["coverage"],
                "kind": kind,
                "source": "auto",
                "file": None,
            })
        for item in manifest_by_page.get(number, [])[:4]:
            file = item.get("file")
            if not file:
                continue
            if any(existing.get("file") == file for existing in kept):
                continue
            kept.append({
                "page": number,
                "file": file,
                "width": item.get("width"),
                "height": item.get("height"),
                "coverage": item.get("coverage"),
                "kind": item.get("kind") or "illustration",
                "source": "auto",
            })
        images.extend(kept[:6])
    return tables, images


def main() -> int:
    parser = argparse.ArgumentParser(description="全量扫描源 PDF 的结构清单")
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=Path("work/source-map.json"))
    parser.add_argument("--merge", action="store_true")
    parser.add_argument("--workers", type=int, default=1, help="并行进程数；PyMuPDF 表格检测通常单进程更快")
    parser.add_argument("--pages", default=None, help="只扫描指定页，如 1-40")
    parser.add_argument("--tables", choices=["auto", "all", "off"], default="auto", help="auto=只扫网格页；all=全部；off=跳过")
    parser.add_argument("--no-tables", action="store_true")
    parser.add_argument("--images-manifest", type=Path, default=Path("work/images/manifest.json"))
    args = parser.parse_args()

    if not args.pdf.exists():
        print(f"找不到 PDF：{args.pdf}", file=sys.stderr)
        return 2

    try:
        import pymupdf
    except ImportError:  # pragma: no cover
        import fitz as pymupdf  # type: ignore
    document = pymupdf.open(args.pdf)
    total = len(document)
    toc = document.get_toc(simple=True)
    document.close()

    pages = list(range(1, total + 1))
    if args.pages:
        wanted = set()
        for part in str(args.pages).split(","):
            part = part.strip()
            if not part:
                continue
            if "-" in part:
                start, end = part.split("-", 1)
                wanted.update(range(int(start), int(end) + 1))
            else:
                wanted.add(int(part))
        pages = [page for page in pages if page in wanted]

    table_mode = "off" if args.no_tables else args.tables
    print(f"扫描 {len(pages)} 页（workers={args.workers}, tables={table_mode}）…")
    auto_pages = scan(args.pdf, pages, max(1, args.workers), table_mode)
    frequency = image_frequency(args.pdf)
    titles = sorted((int(page), str(title)) for level, title, page in toc if int(level) in (1, 2))
    for row in auto_pages:
        row["title"] = page_title(titles, row["page"])
        has_large_image = any(float(image.get("coverage") or 0) >= 0.8 for image in row.get("images") or [])
        if row["chars"] < 80 and has_large_image:
            row["kind"] = "scan"
            row["scan"] = True
        elif row.get("tables"):
            row["kind"] = "table"
        elif any(float(image.get("coverage") or 0) >= 0.25 for image in row.get("images") or []):
            row["kind"] = "figure"
        else:
            row["kind"] = "text"
            row["scan"] = False

    manifest = load_manifest(args.images_manifest if args.images_manifest else None)
    auto_tables, auto_images = build_auto_entries(auto_pages, frequency, manifest)

    existing = read_json(args.out, {}) if args.merge and args.out.exists() else {}
    merged_pages = merge_manual(existing, auto_pages) if existing else auto_pages
    manual_pages = {
        int(page["page"])
        for page in existing.get("pages", [])
        if isinstance(page, dict) and page.get("page")
    }

    manual_tables = [item for item in existing.get("tableCandidates", []) if isinstance(item, dict) and item.get("source") != "auto"]
    existing_auto_tables = [item for item in existing.get("tableCandidates", []) if isinstance(item, dict) and item.get("source") == "auto"]
    manual_table_pages = {int(item.get("page") or 0) for item in manual_tables}
    manual_images = [item for item in existing.get("images", []) if isinstance(item, dict) and item.get("source") != "auto"]
    existing_auto_images = [item for item in existing.get("images", []) if isinstance(item, dict) and item.get("source") == "auto"]
    manual_image_pages = {int(item.get("page") or 0) for item in manual_images}

    def table_key(item):
        bbox = item.get("bbox")
        if bbox:
            return (int(item.get("page") or 0), tuple(float(value) for value in bbox))
        return (int(item.get("page") or 0), str(item.get("kind")), item.get("rows"), str(item.get("columns")))

    def image_key(item):
        bbox = item.get("bbox")
        if item.get("file"):
            return (int(item.get("page") or 0), str(item.get("file")))
        if bbox:
            return (int(item.get("page") or 0), tuple(float(value) for value in bbox))
        return (int(item.get("page") or 0), str(item.get("kind")))

    def dedupe(items, key):
        seen = {}
        for item in items:
            marker = key(item)
            if marker not in seen or (item.get("source") != "auto" and seen[marker].get("source") == "auto"):
                seen[marker] = item
        return list(seen.values())

    table_candidates = dedupe(
        manual_tables
        + [item for item in auto_tables if item["page"] not in manual_table_pages]
        + existing_auto_tables,
        table_key,
    )
    image_entries = dedupe(
        manual_images
        + [item for item in auto_images if item["page"] not in manual_image_pages]
        + existing_auto_images,
        image_key,
    )

    risks = [item for item in existing.get("risks", []) if isinstance(item, dict)]
    scan_pages = [row["page"] for row in auto_pages if row.get("scan")]
    if scan_pages and not any("scan" in str(item.get("kind", "")) for item in risks):
        risks.append({
            "page": f"{scan_pages[0]}–{scan_pages[-1]}" if len(scan_pages) > 1 else str(scan_pages[0]),
            "kind": "scan",
            "note": f"自动检测到 {len(scan_pages)} 个整页扫描/无文字页；插图需改为页图裁切。",
        })

    audited = {
        int(value)
        for value in ((existing.get("survey") or {}).get("auditedPages") or [])
        if str(value).isdigit()
    }
    audited |= set(pages) | manual_pages

    result = {
        "version": 2,
        "source": display(args.pdf),
        "totalPages": total,
        "textLayer": any(row["chars"] > 80 for row in auto_pages),
        "auditScope": "全量自动结构扫描（source-map.py v2）；手工 blocks/表/图保留，自动条目 source=auto。",
        "chapters": existing.get("chapters") or [
            {"n": index + 1, "title": str(title), "srcPage": int(page)}
            for index, (level, title, page) in enumerate(
                [entry for entry in toc if int(entry[0]) == 1]
            )
        ],
        "pages": merged_pages,
        "tableCandidates": table_candidates,
        "images": image_entries,
        "risks": risks,
        "survey": {
            "version": 2,
            "complete": set(range(1, total + 1)) <= audited,
            "pages": len(audited),
            "auditedPages": sorted(audited),
            "totalPages": total,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "workers": args.workers,
            "tableCount": len(table_candidates),
            "imageCount": len(image_entries),
            "method": f"pymupdf-find-tables[{table_mode}]+image-info",
        },
    }
    if existing.get("pageSize"):
        result["pageSize"] = existing["pageSize"]
    if existing.get("producer"):
        result["producer"] = existing["producer"]

    temp = args.out.with_suffix(args.out.suffix + ".tmp")
    write_json(temp, result)
    temp.replace(args.out)
    print(f"OK：{len(result['pages'])} 页，表候选 {len(table_candidates)}，图片 {len(image_entries)} → {args.out}")
    return 0


if __name__ == "__main__":
    mp.freeze_support()
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass
    raise SystemExit(main())

#!/usr/bin/env python
"""Advisory layout check: report pages that are obviously under-filled.

This is a hint, not a gate. Normal whitespace around tables, figures, chapter
openers and chapter ends is expected and is classified as `context` / `exempt`.
Only plain-text pages that are clearly too empty are reported as `strong`.

Usage:
  layout-check.py --pdf out/body.pdf --html book/body.html --out out/LAYOUT.json
  layout-check.py --pdf out/pass1/preview.pdf --html book/pass1/preview.html \
                  --pdf out/pass1/hard.pdf --html book/pass1/hard.html \
                  --out out/pass1/LAYOUT.json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from reportpath import display

try:
    import pymupdf as fitz
except ImportError:  # pragma: no cover
    import fitz  # type: ignore

MM = 72 / 25.4
CELL_MM = 4.0
REFERENCE_HEADING = re.compile(r"(术语表|索引|glossary|index)", re.I)
BACK_MATTER_HEADING = re.compile(r"(后记|附录|版权|致谢|colophon|afterword|credits|appendix)", re.I)


def load_sections(html: Path | None) -> list[dict]:
    if html is None or not html.exists():
        return []
    text = html.read_text("utf-8", errors="ignore")
    openings = list(re.finditer(r"<section\b([^>]*)>", text, re.I))
    sections: list[dict] = []
    for index, opening in enumerate(openings):
        attributes = opening.group(1) or ""
        end = openings[index + 1].start() if index + 1 < len(openings) else len(text)
        body = text[opening.end():end]
        class_match = re.search(r'class="([^"]*)"', attributes)
        class_name = class_match.group(1) if class_match else ""
        sparse = bool(
            "section-opener" in class_name
            or re.search(r'data-layout\s*=\s*["\']sparse["\']', attributes, re.I)
        )
        heading_match = re.search(r"<h1\b[^>]*>(.*?)</h1>", body, re.S | re.I)
        heading = re.sub(r"<[^>]+>", "", heading_match.group(1)).strip() if heading_match else ""
        sections.append({
            "className": class_name,
            "sparse": sparse,
            "hasTable": bool(re.search(r"<table\b", body, re.I)),
            "hasFigure": bool(re.search(r"<(figure|img)\b", body, re.I)),
            "heading": heading,
        })
    return sections


def page_geometry(page) -> tuple[float, float, float, float]:
    width = float(page.rect.width)
    height = float(page.rect.height)
    left = 18 * MM
    right = width - 18 * MM
    top = 18 * MM
    bottom = height - 20 * MM
    return left, top, right, bottom


def page_boxes(page) -> tuple[list[tuple[float, float, float, float]], float]:
    boxes: list[tuple[float, float, float, float]] = []
    for block in page.get_text("blocks"):
        if len(block) < 7 or block[6] != 0:
            continue
        if not (block[4] or "").strip():
            continue
        boxes.append((float(block[0]), float(block[1]), float(block[2]), float(block[3])))
    image_area = 0.0
    try:
        images = page.get_image_info()
    except Exception:  # noqa: BLE001
        images = []
    for image in images:
        rect = image.get("bbox")
        if not rect:
            continue
        x0, y0, x1, y1 = (float(value) for value in rect)
        boxes.append((x0, y0, x1, y1))
        image_area += max(0.0, x1 - x0) * max(0.0, y1 - y0)
    return boxes, image_area


def largest_blank(boxes, left, top, right, bottom) -> tuple[float, float, float]:
    cell = CELL_MM * MM
    columns = max(1, int(round((right - left) / cell)))
    rows = max(1, int(round((bottom - top) / cell)))
    grid = [[0] * columns for _ in range(rows)]
    for x0, y0, x1, y1 in boxes:
        c0 = max(0, int((x0 - left) / cell))
        c1 = min(columns - 1, int((x1 - left) / cell))
        r0 = max(0, int((y0 - top) / cell))
        r1 = min(rows - 1, int((y1 - top) / cell))
        if c1 < c0 or r1 < r0:
            continue
        for row in range(r0, r1 + 1):
            line = grid[row]
            for column in range(c0, c1 + 1):
                line[column] = 1

    heights = [0] * columns
    best = (0.0, 0.0, 0.0)
    for row in range(rows):
        for column in range(columns):
            heights[column] = heights[column] + 1 if grid[row][column] == 0 else 0
        stack: list[tuple[int, int]] = []
        for column in range(columns + 1):
            height = heights[column] if column < columns else 0
            start = column
            while stack and stack[-1][1] > height:
                begin, stack_height = stack.pop()
                start = begin
                width_mm = (column - begin) * cell / MM
                height_mm = stack_height * cell / MM
                area = width_mm * height_mm
                if area > best[2]:
                    best = (width_mm, height_mm, area)
            stack.append((start, height))
    return best


def inspect_page(page, section: dict | None, is_chapter_end: bool) -> dict:
    left, top, right, bottom = page_geometry(page)
    boxes, image_area = page_boxes(page)
    content_area = max(1.0, (right - left) * (bottom - top))
    clipped = [
        (max(left, x0), max(top, y0), min(right, x1), min(bottom, y1))
        for (x0, y0, x1, y1) in boxes
        if x1 > left and x0 < right and y1 > top and y0 < bottom
    ]
    content_bottom = max((y1 for (_, _, _, y1) in clipped), default=top)
    fill = max(0.0, min(1.0, (content_bottom - top) / max(1.0, bottom - top)))
    blank_width, blank_height, blank_area = largest_blank(clipped, left, top, right, bottom)
    chars = len(page.get_text("text").strip())

    has_large_image = image_area >= content_area * 0.25
    has_table = bool(section and section.get("hasTable"))
    heading = section.get("heading", "") if section else ""
    reference = bool(REFERENCE_HEADING.search(heading)) or bool(section and section.get("hasTable") and chars < 400)
    sparse = bool(section and section.get("sparse"))

    kind = "text"
    if has_large_image:
        kind = "figure"
    elif has_table:
        kind = "table"
    elif is_chapter_end:
        kind = "chapter-end"
    elif reference:
        kind = "reference"

    return {
        "contentBottomMm": round((content_bottom - top) / MM, 1),
        "fill": round(fill, 3),
        "blankWidthMm": round(blank_width, 1),
        "blankHeightMm": round(blank_height, 1),
        "blankAreaMm2": round(blank_area, 1),
        "imageCover": round(min(1.0, image_area / content_area), 3),
        "chars": chars,
        "kind": kind,
        "sparse": sparse,
        "heading": heading,
    }


def classify(page: dict, options: dict) -> tuple[str, str]:
    if page["sparse"]:
        return "exempt", "章节扉页/有意稀疏页"
    if page["page"] <= 2 and page["chars"] < 600:
        return "context", "封面/扉页/目录等前置页"
    if page["kind"] == "figure":
        return "context", "整页插图/图版页"
    if page["kind"] == "reference":
        return "context", "术语表/索引/表格页"
    if page["kind"] == "chapter-end":
        return "context", "本章最后一页"
    if BACK_MATTER_HEADING.search(page.get("heading", "")):
        return "context", "后记/附录/版权页"
    if page["chars"] < 200 and page["imageCover"] < 0.25:
        return "content-missing", "本页文字明显偏少，可能缺译或漏页"
    if page["kind"] == "table" and page["fill"] >= 0.30:
        return "context", "表格页（表格附近留白正常）"

    strong = page["fill"] < options["strongFill"] or (
        page["blankHeightMm"] >= options["strongBlankMm"] and page["blankWidthMm"] >= 80
    )
    if strong:
        return "strong", "页底大块空白，建议并入相邻页或前移内容"
    if page["fill"] < options["mildFill"] or (
        page["blankHeightMm"] >= options["mildBlankMm"] and page["blankWidthMm"] >= 40
    ):
        return "mild", "偏空，可考虑并入相邻页"
    return "ok", ""


def merge_groups(pages: list[dict]) -> list[list[int]]:
    groups: list[list[int]] = []
    current: list[dict] = []
    total = 0.0

    def flush() -> None:
        nonlocal current, total
        if len(current) >= 2:
            groups.append([page["page"] for page in current])
        current = []
        total = 0.0

    for page in pages:
        mergeable = page["kind"] == "text" and page["level"] in ("strong", "mild")
        if not mergeable:
            flush()
            continue
        if current and total + page["fill"] > 0.95:
            flush()
        current.append(page)
        total += page["fill"]
    flush()
    return groups


def check(pdf_specs: list[tuple[Path, Path | None]], options: dict) -> dict:
    files = []
    pages: list[dict] = []
    for pdf, html in pdf_specs:
        sections = load_sections(html)
        document = fitz.open(pdf)
        if sections and len(sections) != len(document):
            files.append({
                "pdf": display(pdf),
                "html": display(html) if html else None,
                "warning": f"HTML {len(sections)} 页与 PDF {len(document)} 页不一致，已关闭上下文映射",
            })
            sections = []
        else:
            files.append({
                "pdf": display(pdf),
                "html": display(html) if html else None,
                "warning": None,
            })
        total = len(document)
        for index, page in enumerate(document):
            section = sections[index] if sections else None
            next_section = sections[index + 1] if sections and index + 1 < len(sections) else None
            is_chapter_end = bool(next_section and next_section.get("sparse"))
            metrics = inspect_page(page, section, is_chapter_end)
            metrics["page"] = index + 1
            level, reason = classify(metrics, options)
            pages.append({
                "source": pdf.name,
                "page": index + 1,
                "level": level,
                "reason": reason,
                **metrics,
            })
        document.close()

    groups = merge_groups(pages)
    summary = {
        "pages": len(pages),
        "strong": sum(1 for page in pages if page["level"] == "strong"),
        "mild": sum(1 for page in pages if page["level"] == "mild"),
        "context": sum(1 for page in pages if page["level"] == "context"),
        "exempt": sum(1 for page in pages if page["level"] == "exempt"),
        "contentMissing": sum(1 for page in pages if page["level"] == "content-missing"),
        "mergeGroups": len(groups),
        "minFill": min((page["fill"] for page in pages), default=0.0),
        "maxBlankHeightMm": max((page["blankHeightMm"] for page in pages), default=0.0),
    }
    return {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "ok": summary["strong"] == 0,
        "thresholds": options,
        "summary": summary,
        "files": files,
        "pages": pages,
        "mergeGroups": groups,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="书页填充体检（提示，不阻断）")
    parser.add_argument("--pdf", action="append", required=True, type=Path)
    parser.add_argument("--html", action="append", default=[], type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--strong-fill", type=float, default=0.45)
    parser.add_argument("--mild-fill", type=float, default=0.60)
    parser.add_argument("--strong-blank-mm", type=float, default=120.0)
    parser.add_argument("--mild-blank-mm", type=float, default=80.0)
    parser.add_argument("--strict", action="store_true", help="有 strong 页时返回 1（默认始终返回 0）")
    args = parser.parse_args()

    for pdf in args.pdf:
        if not pdf.exists():
            print(f"找不到 PDF：{pdf}", file=sys.stderr)
            return 2
    if len(args.html) not in (0, len(args.pdf)):
        print("--html 数量必须为 0 或与 --pdf 相同", file=sys.stderr)
        return 2

    specs = []
    for index, pdf in enumerate(args.pdf):
        html = args.html[index] if args.html else None
        specs.append((pdf, html))

    options = {
        "strongFill": args.strong_fill,
        "mildFill": args.mild_fill,
        "strongBlankMm": args.strong_blank_mm,
        "mildBlankMm": args.mild_blank_mm,
    }
    try:
        result = check(specs, options)
    except Exception as error:  # noqa: BLE001
        print(f"体检失败：{error}", file=sys.stderr)
        return 2

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = result["summary"]
    print(
        f"排版体检：{summary['pages']} 页，明显偏空 {summary['strong']}，偏空 {summary['mild']}，"
        f"上下文页 {summary['context']}，缺译页 {summary['contentMissing']}，可合并 {summary['mergeGroups']} 组"
    )
    if summary["mergeGroups"]:
        print(f"建议合并：{result['mergeGroups'][:8]}")
    print(f"报告：{args.out}")
    if args.strict and not result["ok"]:
        return 1
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass
    raise SystemExit(main())

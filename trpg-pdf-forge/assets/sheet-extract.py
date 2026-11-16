#!/usr/bin/env python
"""Extract a source rule file into work/source.txt and optional work/source.json."""
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from pathlib import Path

from langlib import normalize_text, pregen_keywords, resolve

HEADING = re.compile(r"^\s{0,3}(#{1,6})\s+(.+?)\s*$")


def _sections_from_text(text: str, lang: str) -> list[dict]:
    sections: list[dict] = []
    current = {"title": "", "level": 0, "line": 0, "lines": []}
    keywords = [item.lower() for item in pregen_keywords(lang)]
    for index, line in enumerate(text.splitlines(), start=1):
        match = HEADING.match(line)
        title = match.group(2).strip() if match else ""
        if not title and line.strip() and any(key in line.lower() for key in keywords):
            if len(line.strip()) <= 80:
                title = line.strip()
        if title:
            if current["lines"]:
                current["text"] = "\n".join(current["lines"]).strip()
                sections.append(current)
            current = {"title": title, "level": len(match.group(1)) if match else 1, "line": index, "lines": []}
        else:
            current["lines"].append(line)
    if current["lines"]:
        current["text"] = "\n".join(current["lines"]).strip()
        sections.append(current)
    return [{"title": item["title"], "level": item["level"], "line": item["line"], "text": item["text"]} for item in sections]


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        import pymupdf
        doc = pymupdf.open(path)
        return "\n\n".join(page.get_text("text") for page in doc)
    if suffix == ".docx":
        from docx import Document
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    if suffix == ".xlsx":
        from openpyxl import load_workbook
        wb = load_workbook(path, data_only=True, read_only=True)
        lines = []
        for ws in wb.worksheets:
            lines.append(f"# {ws.title}")
            for row in ws.iter_rows(values_only=True):
                values = [str(value) for value in row if value is not None]
                if values:
                    lines.append("\t".join(values))
        return "\n".join(lines)
    if suffix == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as stream:
            return "\n".join("\t".join(row) for row in csv.reader(stream))
    if suffix in {".md", ".txt"}:
        return path.read_text(encoding="utf-8-sig")
    raise ValueError(f"不支持的源文件类型：{suffix}")


def extract_structured(path: Path, lang: str) -> dict:
    suffix = path.suffix.lower()
    pages = []
    if suffix == ".pdf":
        import pymupdf
        doc = pymupdf.open(path)
        pages = [{"page": index, "text": normalize_text(page.get_text("text"), lang)} for index, page in enumerate(doc, start=1)]
        text = "\n\n".join(item["text"] for item in pages)
    else:
        text = normalize_text(extract_text(path), lang)
    sections = _sections_from_text(text, lang)
    for section in sections:
        probe = next((line.strip() for line in section["text"].splitlines() if line.strip()), "")[:24]
        if probe and pages:
            section["page"] = next((item["page"] for item in pages if probe in item["text"]), None)
    return {
        "schemaVersion": 1,
        "source": str(path.resolve()),
        "lang": resolve(lang)["code"],
        "text": text,
        "pages": pages,
        "sections": sections,
        "tables": [],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="提取规则文本")
    parser.add_argument("source", nargs="?", type=Path)
    parser.add_argument("--out", type=Path, default=Path("work/source.txt"))
    parser.add_argument("--json", type=Path, default=None)
    parser.add_argument("--lang", default="de")
    args = parser.parse_args()
    if args.source and args.source.exists():
        text = extract_text(args.source)
        structured = extract_structured(args.source, args.lang)
    else:
        brief = Path("source/brief.md")
        if not brief.exists():
            print("找不到源文件或 source/brief.md。", file=sys.stderr)
            return 2
        text = brief.read_text(encoding="utf-8-sig")
        structured = {
            "schemaVersion": 1, "source": str(brief.resolve()), "lang": resolve(args.lang)["code"],
            "text": normalize_text(text, args.lang), "pages": [], "sections": _sections_from_text(text, args.lang), "tables": [],
        }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(normalize_text(text, args.lang), encoding="utf-8")
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(structured, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK：{args.out}（{len(text)} 字符）")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

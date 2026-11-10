#!/usr/bin/env python
"""Extract text from a source rule file into work/source.txt."""
from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path


def extract(path: Path) -> str:
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


def main() -> int:
    parser = argparse.ArgumentParser(description="提取规则文本")
    parser.add_argument("source", nargs="?", type=Path)
    parser.add_argument("--out", type=Path, default=Path("work/source.txt"))
    args = parser.parse_args()
    if args.source and args.source.exists():
        text = extract(args.source)
    else:
        brief = Path("source/brief.md")
        if not brief.exists():
            print("找不到源文件或 source/brief.md。", file=sys.stderr)
            return 2
        text = brief.read_text(encoding="utf-8-sig")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(text, encoding="utf-8")
    print(f"OK：{args.out}（{len(text)} 字符）")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

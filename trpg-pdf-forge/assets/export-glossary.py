#!/usr/bin/env python
"""Package the filled glossary as a WPS/Excel-friendly CSV and a readable Markdown table."""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

HEADERS = ["source", "target", "category", "notes", "locked"]
EMPTY_CATEGORY = "未分类"


def read_rows(source: Path) -> list[dict[str, str]]:
    with source.open("r", encoding="utf-8-sig", newline="") as stream:
        reader = csv.DictReader(stream)
        if not reader.fieldnames:
            raise ValueError("术语表没有表头。")
        missing = [name for name in HEADERS if name not in reader.fieldnames]
        if missing:
            raise ValueError(f"术语表缺少列：{', '.join(missing)}")
        rows = []
        for raw in reader:
            item = {name: (raw.get(name) or "").strip() for name in HEADERS}
            if not item["source"]:
                continue
            item["locked"] = "1" if item["locked"] in ("1", "true", "TRUE", "yes", "Y") else "0"
            rows.append(item)
        return rows


def markdown_escape(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ").strip()


def write_markdown(rows: list[dict[str, str]], target: Path, source: Path) -> None:
    categories: dict[str, list[dict[str, str]]] = {}
    for row in rows:
        categories.setdefault(row["category"] or EMPTY_CATEGORY, []).append(row)
    locked = sum(1 for row in rows if row["locked"] == "1")
    lines = [
        "# 术语表",
        "",
        f"- 来源：`{source.as_posix()}`",
        f"- 条目：{len(rows)}",
        f"- 分类：{len(categories)}",
        f"- 锁定条目：{locked}",
        "",
        "> 这份术语表是翻译交付的一部分；CSV 用于 WPS/Excel 编辑，本文件用于阅读。",
        "",
    ]
    for category in sorted(categories):
        lines.extend([
            f"## {category}",
            "",
            "| Source | Target | Notes | Locked |",
            "|---|---|---|---|",
        ])
        for row in categories[category]:
            lines.append(
                f"| {markdown_escape(row['source'])} | {markdown_escape(row['target'])} | "
                f"{markdown_escape(row['notes'])} | {'是' if row['locked'] == '1' else ''} |"
            )
        lines.append("")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="导出术语表 CSV + Markdown")
    parser.add_argument("--source", type=Path, default=Path("glossary/glossary.filled.csv"))
    parser.add_argument("--csv", type=Path, default=Path("out/GLOSSARY.csv"))
    parser.add_argument("--md", type=Path, default=Path("out/GLOSSARY.md"))
    args = parser.parse_args()
    source = args.source
    if not source.exists() and source.name == "glossary.filled.csv":
        fallback = source.with_name("glossary.csv")
        if fallback.exists():
            source = fallback
    if not source.exists():
        print(f"找不到术语表：{source}", file=sys.stderr)
        return 2
    try:
        rows = read_rows(source)
    except Exception as error:  # noqa: BLE001
        print(f"术语表读取失败：{error}", file=sys.stderr)
        return 2
    args.csv.parent.mkdir(parents=True, exist_ok=True)
    with args.csv.open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(rows)
    write_markdown(rows, args.md, source)
    result = {
        "ok": True,
        "source": str(source.resolve()),
        "csv": str(args.csv.resolve()),
        "markdown": str(args.md.resolve()),
        "entries": len(rows),
        "categories": len({row["category"] or EMPTY_CATEGORY for row in rows}),
        "locked": sum(1 for row in rows if row["locked"] == "1"),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

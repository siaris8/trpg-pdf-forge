"""Glossary name/title consistency, including a conservative page-level scan."""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

from termlib import normalize
from titlelib import load_title

NAME_CATEGORIES = {"name", "place", "organization", "title", "archetype", "faction"}
MIN_SOURCE_CHARS = 4
LATIN_NAME = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]")


def read_rows(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def page_texts(root: Path) -> list[tuple[str, str]]:
    rows = []
    directory = root / "work" / "pages"
    if not directory.exists():
        return rows
    for file in sorted(directory.glob("*.json")):
        try:
            data = json.loads(file.read_text(encoding="utf-8-sig"))
        except Exception:
            continue
        rows.append((file.name, json.dumps(data, ensure_ascii=False)))
    return rows


def check_names(root: Path, glossary: Path | None = None) -> dict:
    root = Path(root)
    glossary = glossary or root / "glossary" / "glossary.csv"
    rows = read_rows(glossary)
    errors: list[str] = []
    warnings: list[str] = []
    by_source: dict[str, list[dict]] = {}
    by_target: dict[str, list[dict]] = {}
    names = []
    for number, row in enumerate(rows, start=2):
        source = str(row.get("source") or "").strip()
        target = str(row.get("target") or "").strip()
        category = str(row.get("category") or "").strip()
        if not source or not target:
            continue
        by_source.setdefault(normalize(source), []).append({"number": number, **row})
        if category in NAME_CATEGORIES:
            names.append({"number": number, "source": source, "target": target, "category": category})
            by_target.setdefault(normalize(target), []).append({"number": number, **row})

    for entries in by_source.values():
        targets = {normalize(item["target"]) for item in entries}
        if len(targets) > 1:
            errors.append(f"source“{entries[0]['source']}”有多个 target：{sorted(targets)}")
    for entries in by_target.values():
        sources = {normalize(item["source"]) for item in entries}
        if len(sources) > 1:
            warnings.append(f"target“{entries[0]['target']}”对应多个 source：{sorted(sources)}")

    title_rows = [row for row in rows if str(row.get("category") or "").strip() == "title"]
    title = load_title(root)
    if len(title_rows) > 1:
        errors.append(f"glossary 有 {len(title_rows)} 行 category=title，只能有一行")
    if title and title_rows:
        expected = str(title.get("titleZh") or "").strip()
        actual = str(title_rows[0].get("target") or "").strip()
        if expected and actual != expected:
            errors.append(f"glossary title“{actual}”与 TITLE.titleZh“{expected}”不一致")

    pages = page_texts(root)
    checked = 0
    for item in names:
        if item["category"] not in {"name", "place", "organization"}:
            continue
        source = item["source"]
        target = item["target"]
        if len(source) < MIN_SOURCE_CHARS or not LATIN_NAME.search(source):
            continue
        for filename, text in pages:
            if source in text:
                checked += 1
                if target not in text:
                    errors.append(f"{filename}: 出现专名“{source}”，但同一页没有统一译名“{target}”")
                    break

    return {
        "schemaVersion": 1,
        "ok": not errors,
        "errors": errors,
        "warnings": warnings,
        "titleRows": len(title_rows),
        "nameRows": len(names),
        "pageChecked": checked,
        "rows": len(rows),
    }

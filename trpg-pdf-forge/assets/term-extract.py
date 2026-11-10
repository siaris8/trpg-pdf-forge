#!/usr/bin/env python
"""Extract untranslated English term-list candidates into a CSV."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from termlib import base_term, normalize, read_glossary, term_lists, write_candidates


def main() -> int:
    parser = argparse.ArgumentParser(description="从页 JSON 提取术语候选")
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--pages", type=Path, default=Path("work/pages"))
    parser.add_argument("--glossary", type=Path, default=Path("glossary/glossary.csv"))
    parser.add_argument("--out", type=Path, default=Path("work/term-candidates.csv"))
    args = parser.parse_args()

    root = args.root.resolve()
    pages = (root / args.pages) if not args.pages.is_absolute() else args.pages
    glossary = (root / args.glossary) if not args.glossary.is_absolute() else args.glossary
    _rows, index, _errors = read_glossary(glossary)

    candidates: dict[str, dict] = {}
    for file in sorted(Path(pages).glob("*.json")):
        if file.name.startswith("_"):
            continue
        try:
            spec = json.loads(file.read_text(encoding="utf-8-sig"))
        except Exception:
            continue
        if not isinstance(spec, dict):
            continue
        spec["_file"] = file.name
        for _path, label, _text, terms in term_lists(spec):
            for term in terms:
                source = base_term(term)
                key = normalize(source)
                if not key or key in index:
                    continue
                row = candidates.setdefault(key, {
                    "source": source,
                    "target": "",
                    "category": "schtick",
                    "notes": f"来自 {file.name} · {label}",
                })
                if file.name not in row["notes"]:
                    row["notes"] += f"；{file.name}"

    out = (root / args.out) if not args.out.is_absolute() else args.out
    write_candidates(out, list(candidates.values()))
    print(f"候选术语 {len(candidates)} 条 → {out}")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

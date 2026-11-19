#!/usr/bin/env python
"""Check that term lists are translated through glossary.csv, and names agree."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from termlib import audit_terms, read_json, summarize_terms, write_candidates


def load_specs(pages_dir: Path) -> list[dict]:
    specs = []
    for file in sorted(Path(pages_dir).glob("*.json")):
        if file.name.startswith("_"):
            continue
        try:
            spec = json.loads(file.read_text(encoding="utf-8-sig"))
        except Exception:
            continue
        if isinstance(spec, dict):
            spec["_file"] = file.name
            specs.append(spec)
    return specs


def main() -> int:
    parser = argparse.ArgumentParser(description="术语表覆盖与原型名一致性检查")
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--pages", type=Path, default=Path("work/pages"))
    parser.add_argument("--glossary", type=Path, default=Path("glossary/glossary.csv"))
    parser.add_argument("--source-map", type=Path, default=Path("work/source-map.json"))
    parser.add_argument("--out", type=Path, default=Path("work/TERM-QA.json"))
    parser.add_argument("--summary", type=Path, default=Path("work/TERM-SUMMARY.json"))
    parser.add_argument("--write-candidates", type=Path, default=None)
    args = parser.parse_args()

    root = args.root.resolve()
    pages = (root / args.pages) if not args.pages.is_absolute() else args.pages
    glossary = (root / args.glossary) if not args.glossary.is_absolute() else args.glossary
    source_map_path = (root / args.source_map) if not args.source_map.is_absolute() else args.source_map
    source_map = read_json(source_map_path, {})
    specs = load_specs(pages)

    result = audit_terms(root, specs, glossary, source_map)
    out = (root / args.out) if not args.out.is_absolute() else args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary = (root / args.summary) if not args.summary.is_absolute() else args.summary
    summary.parent.mkdir(parents=True, exist_ok=True)
    summary.write_text(json.dumps(summarize_terms(result), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    if args.write_candidates:
        target = (root / args.write_candidates) if not args.write_candidates.is_absolute() else args.write_candidates
        write_candidates(target, result["candidates"])
        print(f"候选术语：{len(result['candidates'])} → {target}")

    print(f"术语表 {result['stats']['glossaryRows']} 行，术语列表 {result['stats']['termLists']} 个；"
          f"缺失 {result['stats']['missingTerms']}，错误 {len(result['errors'])}")
    for error in result["errors"][:40]:
        print(f"ERROR {error}", file=sys.stderr)
    if result["errors"]:
        print(f"FAIL：{len(result['errors'])} 个错误", file=sys.stderr)
        return 1
    print("OK：术语表覆盖与原型名一致")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

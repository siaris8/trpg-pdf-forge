#!/usr/bin/env python
"""Check glossary name/title conflicts before the book build."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from namelib import check_names


def main() -> int:
    parser = argparse.ArgumentParser(description="姓名/地名/组织/书名一致性检查")
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--glossary", type=Path, default=Path("glossary/glossary.csv"))
    parser.add_argument("--out", type=Path, default=Path("work/NAME-QA.json"))
    args = parser.parse_args()
    root = args.root.resolve()
    glossary = args.glossary if args.glossary.is_absolute() else root / args.glossary
    result = check_names(root, glossary)
    out = args.out if args.out.is_absolute() else root / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for error in result["errors"]:
        print(f"ERROR {error}", file=sys.stderr)
    for warning in result["warnings"]:
        print(f"WARN {warning}", file=sys.stderr)
    if not result["ok"]:
        print(f"FAIL：{len(result['errors'])} 个名称冲突", file=sys.stderr)
        return 1
    print(f"OK：名称/书名一致（{result['nameRows']} 条专名，扫描 {result['pageChecked']} 处）")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

#!/usr/bin/env python
"""Report context sizes so prompt/context growth is visible before it costs money."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

FILES = {
    "task": "TASK.md",
    "styleMini": ".trpg/STYLE-MINI.md",
    "batchProtocol": ".trpg/BATCH-PROTOCOL.md",
    "pageSchema": ".trpg/PAGE-SCHEMA.md",
    "instructions": ".trpg/INSTRUCTIONS.md",
    "style": ".trpg/STYLE.md",
    "workflow": ".trpg/WORKFLOW.md",
    "tableGuide": ".trpg/TABLE-GUIDE.md",
    "proofGuide": ".trpg/PROOF-GUIDE.md",
}


def size(path: Path) -> dict:
    if not path.exists() or not path.is_file():
        return {"chars": 0, "exists": False, "estimatedTokens": 0}
    chars = len(path.read_text(encoding="utf-8-sig", errors="replace"))
    return {"chars": chars, "exists": True, "estimatedTokens": round(chars / 4)}


def main() -> int:
    parser = argparse.ArgumentParser(description="上下文/预算体检")
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--out", type=Path, default=Path("work/CONTEXT-BUDGET.json"))
    args = parser.parse_args()
    root = args.root.resolve()

    rows = {}
    for key, relative in FILES.items():
        rows[key] = size(root / relative)

    batches = []
    batch_dir = root / "work" / "batches"
    if batch_dir.exists():
        for directory in sorted(item for item in batch_dir.iterdir() if item.is_dir()):
            row = {"batch": directory.name}
            for key, name in {
                "brief": "BRIEF.md", "proofBrief": "PROOF-BRIEF.md",
                "check": "CHECK.json", "checkSummary": "CHECK-SUMMARY.json",
            }.items():
                row[key] = size(directory / name)
            batches.append(row)

    result = {
        "schemaVersion": 1,
        "root": str(root),
        "files": rows,
        "batches": batches,
        "note": "estimatedTokens = chars / 4，仅用于趋势，不是实际计费 token。",
    }
    out = args.out if args.out.is_absolute() else root / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"TASK {rows['task']['chars']} 字符；STYLE-MINI {rows['styleMini']['chars']}；"
          f"BATCH-PROTOCOL {rows['batchProtocol']['chars']}；PAGE-SCHEMA {rows['pageSchema']['chars']}")
    if batches:
        for row in batches[-3:]:
            print(f"{row['batch']}: BRIEF {row['brief']['chars']} / PROOF {row['proofBrief']['chars']} / "
                  f"CHECK {row['check']['chars']} / SUMMARY {row['checkSummary']['chars']}")
    print(f"→ {out}")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

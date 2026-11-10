#!/usr/bin/env python
"""Create/verify a batch PROOF.json skeleton."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from pageio import read_json, write_json
from prooflib import batch_page_files, proof_status, proof_template


def main() -> int:
    parser = argparse.ArgumentParser(description="批次校对 PROOF.json")
    sub = parser.add_subparsers(dest="command", required=True)

    init = sub.add_parser("init", help="生成 PROOF 骨架（含当前 pageDigest）")
    init.add_argument("--root", type=Path, default=Path("."))
    init.add_argument("--batch", required=True)
    init.add_argument("--reviewer", default="self")
    init.add_argument("--force", action="store_true")

    verify = sub.add_parser("verify", help="检查 PROOF 是否有效/过期")
    verify.add_argument("--root", type=Path, default=Path("."))
    verify.add_argument("--batch", required=True)

    args = parser.parse_args()
    root = args.root.resolve()
    plan = read_json(root / "work" / "batches.json", {})
    batch = next((item for item in plan.get("batches", []) if item["id"] == args.batch), None)
    if not batch:
        print(f"找不到批次：{args.batch}", file=sys.stderr)
        return 2

    if args.command == "init":
        files = batch_page_files(root, batch)
        if not files:
            print("批次还没有页 JSON，先翻译再校对。", file=sys.stderr)
            return 2
        target = root / "work" / "batches" / batch["id"] / "PROOF.json"
        if target.exists() and not args.force:
            current = proof_status(root, batch)
            if not current["stale"]:
                print(f"PROOF 已存在且 digest 未变：{target}")
                return 0
            print("页 JSON 已改动，PROOF 已过期；确认重置请加 --force", file=sys.stderr)
            return 2
        template = proof_template(batch, files, args.reviewer)
        write_json(target, template)
        print(f"PROOF 骨架：{target}")
        print("下一步：逐段对照源页，修改页 JSON，填 checks 全 true、ok=true、issues=[]。")
        return 0

    result = proof_status(root, batch)
    print(f"proof: exists={result['exists']} ok={result['ok']} stale={result['stale']} "
          f"reviewer={result['reviewer'] or '-'}")
    for error in result["errors"]:
        print(f"ERROR {error}", file=sys.stderr)
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

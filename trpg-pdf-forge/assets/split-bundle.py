#!/usr/bin/env python
"""Split one batch bundle into work/pages/<batch>-NN.json."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="拆分批次 bundle")
    parser.add_argument("--bundle", type=Path, required=True)
    parser.add_argument("--batch", required=True)
    parser.add_argument("--pages", type=Path, default=Path("work/pages"))
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    bundle_path = args.bundle
    if not bundle_path.exists():
        print(f"找不到 bundle：{bundle_path}", file=sys.stderr)
        return 2
    data = json.loads(bundle_path.read_text(encoding="utf-8-sig"))
    pages = data.get("pages") if isinstance(data, dict) else data
    if not isinstance(pages, list) or not pages:
        print("bundle 没有 pages 数组", file=sys.stderr)
        return 2

    target_dir = args.pages
    target_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for index, spec in enumerate(pages, start=1):
        if not isinstance(spec, dict):
            print(f"第 {index} 页不是对象", file=sys.stderr)
            return 2
        sources = spec.get("src")
        if not isinstance(sources, list) or not sources:
            print(f"第 {index} 页缺少 src 数组", file=sys.stderr)
            return 2
        target = target_dir / f"{args.batch}-{index:02d}.json"
        if target.exists() and not args.force:
            print(f"已存在：{target}（确认覆盖加 --force）", file=sys.stderr)
            return 2
        target.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        written.append(target.name)
    print(f"OK：{len(written)} 页 → {target_dir}（{args.batch}-01 … {written[-1]}）")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

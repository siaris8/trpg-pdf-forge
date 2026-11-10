#!/usr/bin/env python
"""Validate work/table-plan.json and preserve original character/card images.

This does not judge the design. It catches the two common failures:
1. A card was marked "abstract+original" but the original image is missing.
2. A table has no real columns, so it is not a table at all.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

DECISIONS = {"as-table", "abstract+original", "prose"}


def resolve(project: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else (project / path)


def unique_target(directory: Path, name: str) -> Path:
    target = directory / name
    if not target.exists():
        return target
    stem = Path(name).stem
    suffix = Path(name).suffix
    index = 2
    while (directory / f"{stem}-{index}{suffix}").exists():
        index += 1
    return directory / f"{stem}-{index}{suffix}"


def main() -> int:
    parser = argparse.ArgumentParser(description="校验表格/人物卡计划并保留原卡")
    parser.add_argument("plan", type=Path, nargs="?", default=Path("work/table-plan.json"))
    parser.add_argument("--project", type=Path, default=Path("."))
    parser.add_argument("--out", type=Path, default=Path("out/TABLE-PLAN.json"))
    parser.add_argument("--source-cards", type=Path, default=Path("out/SOURCE-CARDS"))
    args = parser.parse_args()
    project = args.project.resolve()
    plan_path = args.plan if args.plan.is_absolute() else (project / args.plan)
    if not plan_path.exists():
        print(f"找不到表格计划：{plan_path}", file=sys.stderr)
        return 2
    try:
        data = json.loads(plan_path.read_text(encoding="utf-8-sig"))
    except Exception as error:  # noqa: BLE001
        print(f"表格计划无法解析：{error}", file=sys.stderr)
        return 2
    items = data.get("items")
    if not isinstance(items, list):
        print("表格计划必须有 items 数组。", file=sys.stderr)
        return 2
    cards_dir = args.source_cards if args.source_cards.is_absolute() else (project / args.source_cards)
    out_path = args.out if args.out.is_absolute() else (project / args.out)
    cards_dir.mkdir(parents=True, exist_ok=True)
    errors: list[str] = []
    checked: list[dict] = []
    index_rows: list[str] = []
    counts = {"asTable": 0, "abstractOriginal": 0, "prose": 0}
    for index, raw in enumerate(items, start=1):
        if not isinstance(raw, dict):
            errors.append(f"items[{index}] 不是对象")
            continue
        item = dict(raw)
        item_id = str(item.get("id") or f"item-{index}")
        decision = str(item.get("decision") or "")
        if decision not in DECISIONS:
            errors.append(f"{item_id}: decision 必须是 {sorted(DECISIONS)}")
            continue
        columns = item.get("columns") or []
        if decision == "as-table":
            counts["asTable"] += 1
            if not isinstance(columns, list) or len(columns) < 2:
                errors.append(f"{item_id}: as-table 至少需要 2 列")
        elif decision == "abstract+original":
            counts["abstractOriginal"] += 1
            source_value = item.get("source") or item.get("original")
            if not source_value:
                errors.append(f"{item_id}: abstract+original 缺少 source 原图")
            else:
                source = resolve(project, str(source_value))
                if not source.is_file():
                    errors.append(f"{item_id}: 找不到原图 {source_value}")
                else:
                    target = unique_target(cards_dir, source.name)
                    shutil.copy2(source, target)
                    item["copied"] = str(target.relative_to(project).as_posix())
                    index_rows.append(
                        f"| {item_id} | {item.get('page', '')} | {item.get('kind', '')} | "
                        f"{source_value} | `{item['copied']}` | {item.get('abstract', '')} |"
                    )
        else:
            counts["prose"] += 1
        checked.append(item)
    if errors:
        result = {
            "ok": False,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "counts": {"items": len(checked), **counts, "errors": len(errors)},
            "errors": errors,
            "items": checked,
        }
    else:
        index_path = cards_dir / "INDEX.md"
        index_path.write_text(
            "# 原始角色卡与图表\n\n"
            "| 条目 | 页码 | 类型 | 原图 | 交付副本 | 抽象表 |\n"
            "|---|---|---|---|---|---|\n"
            + ("\n".join(index_rows) if index_rows else "| — | — | — | — | — | — |")
            + "\n",
            encoding="utf-8",
        )
        result = {
            "ok": True,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "counts": {"items": len(checked), **counts, "sourceCards": len(index_rows)},
            "sourceCardsIndex": str(index_path.relative_to(project).as_posix()),
            "items": checked,
        }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if not result["ok"]:
        print("FAIL：表格/原卡计划不完整，见 errors。", file=sys.stderr)
        return 1
    print(f"OK：{len(checked)} 项；原卡 {len(index_rows)} 张；输出 {out_path}")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

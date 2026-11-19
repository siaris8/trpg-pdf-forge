#!/usr/bin/env python
"""Create/check the book-title authority file work/TITLE.json."""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from namelib import check_names
from titlelib import load_title, validate


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="书名权威文件")
    sub = parser.add_subparsers(dest="command", required=True)

    init = sub.add_parser("init")
    init.add_argument("--root", type=Path, default=Path("."))
    init.add_argument("--original", required=True)
    init.add_argument("--zh", required=True)
    init.add_argument("--literal", default="")
    init.add_argument("--source-pages", default="1")
    init.add_argument("--reason", default="")
    init.add_argument("--reviewer", default="self")
    init.add_argument("--force", action="store_true")

    check = sub.add_parser("check")
    check.add_argument("--root", type=Path, default=Path("."))
    check.add_argument("--allow-draft", action="store_true")
    check.add_argument("--no-artifacts", action="store_true")
    check.add_argument("--json", type=Path, default=Path("work/TITLE-QA.json"))

    apply = sub.add_parser("apply")
    apply.add_argument("--root", type=Path, default=Path("."))

    args = parser.parse_args()
    root = args.root.resolve()
    target = root / "work" / "TITLE.json"

    if args.command == "apply":
        result = validate(root, require_verified=True, check_artifacts=False)
        if not result["ok"]:
            for error in result["errors"]:
                print(f"ERROR {error}", file=sys.stderr)
            return 1
        project_path = root / "project.json"
        if not project_path.exists():
            print("找不到 project.json", file=sys.stderr)
            return 2
        project = json.loads(project_path.read_text(encoding="utf-8-sig"))
        project["title"] = result["title"]["titleZh"]
        project["titlePolicy"] = "strict"
        project["updatedAt"] = datetime.now(timezone.utc).isoformat()
        write_json(project_path, project)
        print(f"OK：project.title → {project['title']}（strict）")
        return 0

    if args.command == "init":
        if target.exists() and not args.force:
            print(f"已存在：{target}（确认覆盖加 --force）", file=sys.stderr)
            return 2
        pages = []
        for value in str(args.source_pages).split(","):
            value = value.strip()
            if value.isdigit():
                pages.append(int(value))
        if not pages:
            pages = [1]
        write_json(target, {
            "schemaVersion": 1,
            "titleOriginal": args.original.strip(),
            "titleZh": args.zh.strip(),
            "literal": args.literal.strip(),
            "aliases": [],
            "sourcePages": pages,
            "contentEvidence": [],
            "rationale": args.reason.strip(),
            "status": "draft",
            "verifiedAfterRead": False,
            "verifiedAt": None,
            "reviewer": args.reviewer.strip(),
            "outputs": {},
        })
        print(f"OK：{target}（draft；读完封面/目录/章节后补全并改为 verified）")
        return 0

    result = validate(root, require_verified=not args.allow_draft, check_artifacts=not args.no_artifacts)
    names = check_names(root)
    write_json(root / "work" / "NAME-QA.json", names)
    result["names"] = names
    if not names["ok"]:
        result["ok"] = False
        result["errors"].extend(names["errors"])
    out = args.json if args.json.is_absolute() else root / args.json
    write_json(out, result)
    for error in result["errors"]:
        print(f"ERROR {error}", file=sys.stderr)
    for warning in result["warnings"]:
        print(f"WARN {warning}", file=sys.stderr)
    if not result["ok"]:
        print(f"FAIL：{len(result['errors'])} 个错误", file=sys.stderr)
        return 1
    print(f"OK：书名 {result['title']['titleZh']}（{result['title'].get('status')}）")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

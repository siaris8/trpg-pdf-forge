#!/usr/bin/env python
"""Validate one batch of page JSON and refresh work/progress.json."""
from __future__ import annotations

import argparse
import importlib.util
import sys
from datetime import datetime, timezone
from pathlib import Path

from batchlib import compute_progress, load_page_sources, read_json, write_json
from pageio import load_specs
from prooflib import proof_status
from termlib import audit_terms, summarize_terms
from textlib import audit_specs

HERE = Path(__file__).resolve().parent


def load_builder():
    spec = importlib.util.spec_from_file_location("build_book", HERE / "build-book.py")
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def walk_blocks(spec: dict):
    for block in list(spec.get("top") or []) + list(spec.get("col1") or []) + list(spec.get("col2") or []) + list(spec.get("bottom") or []):
        if isinstance(block, dict):
            yield block
            for key in ("left", "right", "bottom"):
                for item in block.get(key) or []:
                    if isinstance(item, dict) and item.get("table"):
                        yield {"type": "table", **item["table"]}


def referenced_images(spec: dict) -> list[str]:
    images = []
    for block in walk_blocks(spec):
        if block.get("type") in ("figure", "portrait") and block.get("src"):
            images.append(str(block["src"]))
    opener = spec.get("opener") or {}
    if opener.get("art") and opener["art"].get("src"):
        images.append(str(opener["art"]["src"]))
    for block in walk_blocks(spec):
        if block.get("type") == "sheet" and block.get("portrait"):
            images.append(str(block["portrait"]))
    return images


def main() -> int:
    parser = argparse.ArgumentParser(description="检查一个批次的页 JSON")
    parser.add_argument("--batch", default=None)
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--plan", type=Path, default=Path("work/batches.json"))
    parser.add_argument("--pages", type=Path, default=Path("work/pages"))
    parser.add_argument("--progress", type=Path, default=Path("work/progress.json"))
    args = parser.parse_args()

    root = args.root.resolve()
    plan_path = args.plan if args.plan.is_absolute() else root / args.plan
    pages_dir = args.pages if args.pages.is_absolute() else root / args.pages
    progress_path = args.progress if args.progress.is_absolute() else root / args.progress
    plan = read_json(plan_path)
    sources = load_page_sources(pages_dir)
    builder = load_builder()
    all_specs = load_specs(pages_dir)
    source_map = read_json(root / "work" / "source-map.json", {})

    batches = plan.get("batches", [])
    if args.batch:
        batches = [item for item in batches if item["id"] == args.batch]
        if not batches:
            print(f"找不到批次：{args.batch}", file=sys.stderr)
            return 2

    all_errors: list[str] = []
    failed = False
    for batch in batches:
        start, end = batch["pages"]
        pages = set(range(start, end + 1))
        specs = []
        for file in sorted(pages_dir.glob("*.json")):
            spec = read_json(file, {})
            if any(page in pages for page in (spec.get("src") or [])):
                spec["_file"] = file.name
                specs.append(spec)
        covered = {page for spec in specs for page in (spec.get("src") or []) if page in pages}
        missing = sorted(pages - covered)
        errors: list[str] = []
        warnings: list[str] = []
        proof = proof_status(root, batch)
        if not proof["ok"]:
            errors.extend(f"校对未通过：{item}" for item in proof["errors"])
        for spec in specs:
            spec_errors, spec_warnings = builder.validate_spec(spec)
            errors.extend(spec_errors)
            warnings.extend(spec_warnings)
            for image in referenced_images(spec):
                target = Path(image)
                if not target.is_absolute():
                    target = root / target
                if not target.exists():
                    errors.append(f"{spec.get('_file')}: 图片不存在 {image}")
        source_map = source_map or {}
        project_meta = read_json(root / "project.json", {})
        text_audit = audit_specs(root, specs, source_map, pages, source_lang=project_meta.get("sourceLang") or "en")
        glossary_path = root / "glossary" / "glossary.csv"
        term_audit = audit_terms(root, specs, glossary_path, source_map) if glossary_path.exists() else {
            "ok": True, "errors": [], "warnings": [], "missing": [], "mismatched": [], "candidates": [],
            "stats": {"glossaryRows": 0, "termLists": 0, "missingTerms": 0},
        }
        errors.extend(text_audit["errors"])
        warnings.extend(text_audit["warnings"])
        errors.extend(term_audit["errors"])
        warnings.extend(term_audit["warnings"])
        check = {
            "schemaVersion": 2,
            "ok": not errors and not missing,
            "batch": batch["id"],
            "title": batch.get("title", ""),
            "sourcePages": [start, end],
            "covered": len(covered),
            "total": len(pages),
            "missing": missing,
            "errors": errors[:50],
            "warnings": warnings[:50],
            "text": text_audit,
            "term": term_audit,
            "proof": {
                "ok": proof["ok"],
                "stale": proof["stale"],
                "reviewer": proof["reviewer"],
                "reviewedAt": proof["reviewedAt"],
                "digest": proof["digest"],
                "checks": proof["checks"],
            },
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
        target_dir = root / "work" / "batches" / batch["id"]
        target_dir.mkdir(parents=True, exist_ok=True)
        write_json(target_dir / "CHECK.json", check)
        write_json(target_dir / "CHECK-SUMMARY.json", {
            "schemaVersion": 1,
            "ok": check["ok"],
            "batch": batch["id"],
            "pages": [start, end],
            "missing": missing,
            "errorCount": len(errors),
            "warningCount": len(warnings),
            "topErrors": errors[:5],
            "topWarnings": warnings[:3],
            "term": summarize_terms(term_audit),
            "proof": {
                "ok": proof["ok"],
                "stale": proof["stale"],
                "reviewer": proof["reviewer"],
            },
            "updatedAt": check["updatedAt"],
        })
        status = "OK" if check["ok"] else "FAIL"
        print(f"{status} {batch['id']} {batch.get('title', '')}：{len(covered)}/{len(pages)} 页")
        if missing:
            print(f"  缺口：{missing[:20]}{'…' if len(missing) > 20 else ''}")
        for error in errors[:8]:
            print(f"  ERROR {error}")
        failed = failed or not check["ok"]
        all_errors.extend(errors)

    progress = compute_progress(plan, sources, root)
    write_json(progress_path, progress)
    glossary_path = root / "glossary" / "glossary.csv"
    if glossary_path.exists():
        full_term = audit_terms(root, all_specs, glossary_path, source_map)
        full_term["schemaVersion"] = 2
        full_term["generatedAt"] = datetime.now(timezone.utc).isoformat()
        write_json(root / "work" / "TERM-QA.json", full_term)
        write_json(root / "work" / "TERM-SUMMARY.json", summarize_terms(full_term))
    print(f"进度：{progress['translated']}/{progress['total']}（{round(progress['percent'] * 100)}%），"
          f"已校 {progress['proofed']}/{progress['proofTotal']}，当前 {progress['current']}")
    if args.all and progress["gaps"]:
        print(f"缺口：{progress['gaps'][:8]}")
    if args.batch:
        return 0 if not failed else 1
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass
    raise SystemExit(main())

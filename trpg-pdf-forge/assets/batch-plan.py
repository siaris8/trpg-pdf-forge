#!/usr/bin/env python
"""Plan and brief chapter-sized translation batches.

Usage:
  batch-plan.py plan --pdf source/source.pdf --source-map work/source-map.json \
      --pages work/pages --out work/batches.json --progress work/progress.json
  batch-plan.py brief b03 --root .
  batch-plan.py status --plan work/batches.json --pages work/pages --out work/progress.json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from batchlib import compute_progress, load_page_sources, read_json, write_json
from pageio import load_specs

BACK_MATTER = re.compile(r"(index|glossary|appendix|backer|reference|shot counter|character sheet|briefing)", re.I)


def load_toc(args) -> list[list]:
    if args.toc_json:
        return read_json(args.toc_json)
    if args.pdf:
        try:
            import pymupdf
        except ImportError:  # pragma: no cover
            import fitz as pymupdf  # type: ignore
        document = pymupdf.open(args.pdf)
        return [[level, title, page] for level, title, page in document.get_toc(simple=True)]
    return []


def chunk_range(start: int, end: int, size: int):
    cursor = start
    while end - cursor + 1 > size:
        yield cursor, cursor + size - 1
        cursor += size
    if cursor <= end:
        yield cursor, end


def chapter_chunks(start: int, end: int, sections: list[tuple[int, str]], size: int):
    """Split [start, end] at level-2 boundaries, never exceeding `size` pages."""
    chunks: list[tuple[int, int]] = []
    cursor = start
    for page, _title in sections:
        if page <= cursor:
            continue
        if page - cursor > size:
            chunks.extend(chunk_range(cursor, page - 1, size))
            cursor = page
    chunks.extend(chunk_range(cursor, end, size))
    # Merge a tiny tail into the previous chunk when the combined size still fits.
    if len(chunks) >= 2 and chunks[-1][1] - chunks[-1][0] + 1 < 4:
        prev = chunks[-2]
        if chunks[-1][1] - prev[0] + 1 <= size:
            chunks[-2] = (prev[0], chunks[-1][1])
            chunks.pop()
    return chunks


def merge_small_batches(batches: list[dict], max_pages: int, tolerance: int = 4) -> list[dict]:
    """Merge tiny neighbours so a 1-page chapter does not become its own task."""
    changed = True
    while changed:
        changed = False
        for index in range(len(batches) - 1):
            left, right = batches[index], batches[index + 1]
            span = right["pages"][1] - left["pages"][0] + 1
            left_size = left["pages"][1] - left["pages"][0] + 1
            right_size = right["pages"][1] - right["pages"][0] + 1
            if span <= max_pages + tolerance and (left_size <= 4 or right_size <= 4):
                left["pages"][1] = right["pages"][1]
                left["toc"] = (left.get("toc") or []) + (right.get("toc") or [])
                if left.get("kind") == "front":
                    left["kind"] = "front"
                batches.pop(index + 1)
                changed = True
                break
    return batches


def build_batches(toc: list[list], total: int, max_pages: int) -> list[dict]:
    level1: list[tuple[int, str]] = []
    seen: set[int] = set()
    for entry in toc:
        if len(entry) < 3:
            continue
        level, title, page = int(entry[0]), str(entry[1]), int(entry[2])
        if level != 1 or not (1 <= page <= total) or page in seen:
            continue
        seen.add(page)
        level1.append((page, title))
    level1.sort()

    batches: list[dict] = []
    if not level1:
        for index, (start, end) in enumerate(chunk_range(1, total, max_pages)):
            batches.append({
                "id": f"b{index:02d}",
                "kind": "chapter",
                "title": f"第 {start}-{end} 页",
                "pages": [start, end],
                "toc": [],
            })
        return batches

    first = level1[0][0]
    if first > 1:
        batches.append({"id": "", "kind": "front", "title": "前置与目录", "pages": [1, first - 1], "toc": []})

    for index, (start, title) in enumerate(level1):
        end = level1[index + 1][0] - 1 if index + 1 < len(level1) else total
        sections = sorted({
            (int(entry[2]), str(entry[1]))
            for entry in toc
            if len(entry) >= 3 and int(entry[0]) == 2 and start < int(entry[2]) <= end
        })
        chunks = chapter_chunks(start, end, sections, max_pages)
        for chunk_start, chunk_end in chunks:
            label = title
            if len(chunks) > 1:
                sub = next((name for page, name in sections if chunk_start <= page <= chunk_end), "")
                label = f"{title} · {sub}" if sub else f"{title} · {chunk_start}-{chunk_end}"
            kind = "back" if BACK_MATTER.search(title) and chunk_start > total * 0.7 else "chapter"
            toc_slice = [
                {"level": int(entry[0]), "title": str(entry[1]), "page": int(entry[2])}
                for entry in toc
                if len(entry) >= 3 and 1 <= int(entry[2]) <= total
                and chunk_start <= int(entry[2]) <= chunk_end and int(entry[0]) <= 3
            ][:40]
            batches.append({
                "id": "",
                "kind": kind,
                "title": label,
                "pages": [chunk_start, chunk_end],
                "toc": toc_slice,
            })

    batches = merge_small_batches(batches, max_pages)
    for index, batch in enumerate(batches):
        batch["id"] = f"b{index:02d}"
    return batches


def source_title_map(source_map: dict) -> dict[int, str]:
    rows = {}
    for page in source_map.get("pages", []) if source_map else []:
        number = int(page.get("page") or 0)
        title = str(page.get("title") or "").strip()
        if number and title:
            rows[number] = title
    return rows


def write_brief(root: Path, batch: dict, plan: dict, sources: dict[str, list[int]], source_map: dict) -> Path:
    pages = batch["pages"]
    page_set = set(range(pages[0], pages[1] + 1))
    covered = len(page_set & {number for values in sources.values() for number in values})
    target = root / "work" / "batches" / batch["id"] / "BRIEF.md"
    target.parent.mkdir(parents=True, exist_ok=True)

    titles = source_title_map(source_map)
    toc_lines = [
        f"- L{entry['level']} p{entry['page']} {entry['title']}"
        for entry in batch.get("toc", [])
    ]
    survey = (source_map or {}).get("survey") or {}
    audited = {int(value) for value in (survey.get("auditedPages") or []) if str(value).isdigit()}
    trusted = survey.get("complete") is True and page_set <= audited

    table_lines = []
    for item in source_map.get("tableCandidates", []) if source_map else []:
        page = int(item.get("page") or 0)
        if page not in page_set:
            continue
        columns = item.get("columns")
        if isinstance(columns, int):
            column_text = f"{columns} 列"
        elif isinstance(columns, list):
            column_text = f"{len(columns)} 列"
        else:
            column_text = "? 列"
        table_lines.append(
            f"- p{page} · {item.get('kind', 'table')} · {item.get('rows', '?')} 行 × {column_text}"
            + (" · 自动" if item.get("source") == "auto" else "")
        )
    image_lines = []
    for item in source_map.get("images", []) if source_map else []:
        page = int(item.get("page") or 0)
        if page not in page_set:
            continue
        coverage = item.get("coverage")
        detail = item.get("file") or (f"bbox {item.get('bbox')}" if item.get("bbox") else "")
        image_lines.append(
            f"- p{page} · {item.get('kind', 'image')}"
            + (f" · 覆盖 {round(float(coverage) * 100)}%" if coverage else "")
            + (f" · {detail}" if detail else "")
        )
    table_lines = table_lines[:12]
    image_lines = image_lines[:12]

    audit_command = (
        "node .trpg/run-python.mjs .trpg/source-map.py source/source.pdf "
        "--out work/source-map.json --merge"
    )
    table_heading = "## 表格候选" if trusted else "## 表格候选（未审计）"
    image_heading = "## 图片" if trusted else "## 图片（未审计）"
    table_body = (
        chr(10).join(table_lines) if table_lines else ("- 无（已审计）" if trusted else f"- 这批还没有全量结构清单；先运行：`{audit_command}`")
    )
    image_body = (
        chr(10).join(image_lines) if image_lines else ("- 无（已审计）" if trusted else f"- 这批还没有全量结构清单；先运行：`{audit_command}`")
    )

    body = f"""# 第 {batch['id']} 批 · {batch['title']}

- 源页：{pages[0]}–{pages[1]}（{pages[1] - pages[0] + 1} 页）
- 当前覆盖：{covered}/{pages[1] - pages[0] + 1}
- 类型：{batch.get('kind', 'chapter')}
- 结构清单：{'全量已审计' if trusted else '未全量审计'}

## 目录切片

{chr(10).join(toc_lines) if toc_lines else '- （无目录条目）'}

{table_heading}

{table_body}

{image_heading}

{image_body}

## 产出

- 页 JSON：`work/pages/{batch['id']}-01.json`、`{batch['id']}-02.json`……
- 每页 JSON 的 `src` 写来源页（可多页，如 `[22,23]`）；规范见 `.trpg/PAGE-SCHEMA.md`。
- 翻译完成后**必须校对**：见 `work/batches/{batch['id']}/PROOF-BRIEF.md`，写 `PROOF.json` 后才能 batch-check。
- 只做本批；不要改其他批次的页 JSON。

## 命令

```powershell
# 0) 若上面显示“未审计”，先补全量结构清单
{audit_command}

# 1) 渲染本批源页（供识读）
node .trpg/run-python.mjs .trpg/render-pages.py source/source.pdf work/src/{batch['id']} --pages {pages[0]}-{pages[1]} --dpi 150

# 2) 翻译后校验并构建本批
node .trpg/run-python.mjs .trpg/build-book.py --batch {batch['id']} --out book/batches/{batch['id']}.html
node .trpg/run-python.mjs .trpg/batch-check.py --batch {batch['id']}
```

## 停止条件

本批源页全部有页 JSON、`work/batches/{batch['id']}/CHECK.json` 为 `ok:true` 后：
- 自动模式：立即继续下一批，不要询问用户；
- 只有用户明确要求单批时才停下。
"""
    target.write_text(body, encoding="utf-8")

    page_files = [
        spec["_file"] for spec in load_specs(root / "work" / "pages")
        if any(pages[0] <= int(page) <= pages[1] for page in (spec.get("src") or []) if isinstance(page, (int, float)))
    ]
    proof_text = f"""# 第 {batch['id']} 批 · 校对任务

> 你是校对，不是翻译。逐页对照源图/源文，先查漏译，再查术语、名称、数字、表格和中文表达。

- 源页：{pages[0]}–{pages[1]}
- 页 JSON：{', '.join(page_files) if page_files else '（还没有，先翻译）'}
- 源页图：`work/src/{batch['id']}/page-{pages[0]:03d}.png` 起

## 1. 初始化 PROOF

```powershell
node .trpg/run-python.mjs .trpg/proof.py init --batch {batch['id']} --reviewer subagent
```

## 2. 逐项校对

- [ ] omissions：源页每段/每卡/每表行都有中文，没有只译标题
- [ ] terms：英文特技/道途/技能/武器名走 glossary；无整段英文列表；无“沿用原书英文名”脚注
- [ ] names：原型/人物/地点一致；opener 与 `· 人物卡` 和 glossary `archetype` 一致
- [ ] numbers：骰式、伤害、难度、创伤、价格、页码
- [ ] tables：表头/行列/合并语义/长描述不丢
- [ ] fluency：错别字、病句、标点、引号、翻译腔
- [ ] placeholders：无 `【】`、`TODO`、`[待校对]`、英文句子
- [ ] layout：p/table/card/statblock 没有混用

## 3. 修改与签字

只改本批页 JSON。改完后：

1. 重新运行 `proof.py init --force`（或手工更新 `PROOF.pageDigest`）；
2. 把 `PROOF.json` 的 `checks` 全部设为 true，`issues` 清空，`ok` 设为 true；
3. 运行：

```powershell
node .trpg/run-python.mjs .trpg/proof.py verify --batch {batch['id']}
node .trpg/run-python.mjs .trpg/batch-check.py --batch {batch['id']}
```

`proof.py verify` 和 `CHECK.json` 都 ok 后停止；不要开始下一批。
"""
    proof_target = root / "work" / "batches" / batch["id"] / "PROOF-BRIEF.md"
    proof_target.write_text(proof_text, encoding="utf-8")
    return target


def command_plan(args) -> int:
    toc = load_toc(args)
    source_map = read_json(args.source_map, {}) if args.source_map else {}
    survey = (source_map or {}).get("survey") or {}
    if survey.get("complete") is not True:
        print(
            "提示：source-map 尚未全量审计；BRIEF 会显示“未审计”。先运行 "
            "source-map.py --pdf source/source.pdf --out work/source-map.json --merge",
            file=sys.stderr,
        )
    pdf_total = 0
    if args.pdf:
        try:
            import pymupdf
        except ImportError:  # pragma: no cover
            import fitz as pymupdf  # type: ignore
        document = pymupdf.open(args.pdf)
        pdf_total = len(document)
        document.close()
    total = int(args.total_pages or pdf_total or 0)
    if not total:
        pages = [int(entry[2]) for entry in toc if len(entry) >= 3 and int(entry[2]) > 0]
        total = max(pages) if pages else len(source_map.get("pages", []) or [])
    if total <= 0:
        print("找不到总页数：请传 --total-pages 或带目录的 PDF", file=sys.stderr)
        return 2
    batches = build_batches(toc, total, max(4, int(args.max_pages)))
    plan = {
        "version": 1,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "source": str(args.pdf) if args.pdf else "",
        "totalSourcePages": total,
        "maxPages": max(4, int(args.max_pages)),
        "batches": batches,
    }
    write_json(args.out, plan)
    sources = load_page_sources(args.pages)
    progress = compute_progress(plan, sources, args.root)
    write_json(args.progress, progress)
    print(f"批次计划：{len(batches)} 批 / {total} 页 → {args.out}")
    print(f"进度：{progress['translated']}/{progress['total']}（{round(progress['percent'] * 100)}%），当前 {progress['current']}")
    return 0


def command_brief(args) -> int:
    root = Path(args.root).resolve()
    plan = read_json(root / "work" / "batches.json")
    batch = next((item for item in plan.get("batches", []) if item["id"] == args.batch), None)
    if not batch:
        print(f"找不到批次：{args.batch}", file=sys.stderr)
        return 2
    sources = load_page_sources(root / "work" / "pages")
    source_map = read_json(root / "work" / "source-map.json", {})
    target = write_brief(root, batch, plan, sources, source_map)
    print(f"批次说明：{target}")
    return 0


def command_status(args) -> int:
    plan = read_json(args.plan)
    sources = load_page_sources(args.pages)
    progress = compute_progress(plan, sources, args.root)
    write_json(args.out, progress)
    print(f"进度：{progress['translated']}/{progress['total']}（{round(progress['percent'] * 100)}%），当前 {progress['current']}")
    if progress["gaps"]:
        print(f"缺口：{progress['gaps'][:8]}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="大规模书稿的批次计划与进度")
    sub = parser.add_subparsers(dest="command", required=True)

    plan_parser = sub.add_parser("plan", help="从 PDF 目录/源页清单生成批次")
    plan_parser.add_argument("--pdf", type=Path, default=None)
    plan_parser.add_argument("--toc-json", type=Path, default=None)
    plan_parser.add_argument("--source-map", type=Path, default=None)
    plan_parser.add_argument("--pages", type=Path, default=Path("work/pages"))
    plan_parser.add_argument("--out", type=Path, default=Path("work/batches.json"))
    plan_parser.add_argument("--progress", type=Path, default=Path("work/progress.json"))
    plan_parser.add_argument("--max-pages", type=int, default=16)
    plan_parser.add_argument("--total-pages", type=int, default=0)
    plan_parser.add_argument("--root", type=Path, default=Path("."))

    brief_parser = sub.add_parser("brief", help="生成某一批的 BRIEF.md")
    brief_parser.add_argument("batch")
    brief_parser.add_argument("--root", type=Path, default=Path("."))

    status_parser = sub.add_parser("status", help="重新计算进度")
    status_parser.add_argument("--plan", type=Path, default=Path("work/batches.json"))
    status_parser.add_argument("--pages", type=Path, default=Path("work/pages"))
    status_parser.add_argument("--out", type=Path, default=Path("work/progress.json"))
    status_parser.add_argument("--root", type=Path, default=Path("."))

    args = parser.parse_args()
    try:
        if args.command == "plan":
            return command_plan(args)
        if args.command == "brief":
            return command_brief(args)
        return command_status(args)
    except Exception as error:  # noqa: BLE001
        print(f"批次计划失败：{error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass
    raise SystemExit(main())

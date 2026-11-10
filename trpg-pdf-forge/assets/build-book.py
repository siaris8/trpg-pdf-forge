#!/usr/bin/env python
"""Build book/body.html (or one batch fragment) from work/pages/*.json.

The page JSON schema is documented in PAGE-SCHEMA.md.

Usage:
  build-book.py --all --out book/body.html --title "书名"
  build-book.py --batch b03 --out book/batches/b03.html
  build-book.py --all --check
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from pathlib import Path

from prooflib import proof_status
from termlib import audit_terms
from textlib import audit_specs

BLOCK_TYPES = {
    "p", "h2", "h3", "h4", "read", "rule", "note", "info", "table", "figure",
    "statblock", "list", "quote", "pullquote", "card", "sheet", "display",
    "footnote",
}
try:
    _schema = json.loads((Path(__file__).with_name("page-schema.json")).read_text(encoding="utf-8"))
    if isinstance(_schema.get("blockTypes"), list):
        BLOCK_TYPES = set(_schema["blockTypes"])
except Exception:
    pass
PLACEHOLDER = re.compile(r"【|】|TODO|待补")


def esc(text) -> str:
    return html.escape(str(text), quote=False)


def inline(text) -> str:
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", str(text), flags=re.S)
    parts = re.split(r"(<b>|</b>|<br\s*/?>|<i>|</i>|<em>|</em>)", text)
    out = []
    keep = {"<b>", "</b>", "<br>", "<br/>", "<br />", "<i>", "</i>", "<em>", "</em>"}
    for part in parts:
        if part in keep:
            out.append("<br>" if part.startswith("<br") else part)
        else:
            out.append(esc(part))
    return "".join(out)


class Renderer:
    def __init__(self, root: Path, out_dir: Path):
        self.root = Path(root)
        self.out_dir = Path(out_dir)

    def rel(self, src: str) -> str:
        if not src:
            return ""
        target = Path(src)
        if not target.is_absolute():
            target = self.root / target
        try:
            return Path(os.path.relpath(target, self.out_dir)).as_posix()
        except ValueError:
            return target.as_posix()

    def table(self, block: dict) -> str:
        cls = ["table"]
        if block.get("compact"):
            cls.append("compact")
        if block.get("wide"):
            cls.append("wide")
        if block.get("sheet"):
            cls.append("sheet")
        cls.extend(block.get("class") or [])
        widths = block.get("widths") or []
        out = [f'<table class="{" ".join(cls)}">']
        if block.get("caption"):
            out.append(f'<caption>{inline(block["caption"])}</caption>')
        if block.get("head"):
            ths = []
            for index, cell in enumerate(block["head"]):
                style = f' style="width:{widths[index]}"' if index < len(widths) else ""
                align = block.get("align", [])[index] if index < len(block.get("align", [])) else ""
                cls_attr = f' class="{align}"' if align else ""
                ths.append(f'<th scope="col"{cls_attr}{style}>{inline(cell)}</th>')
            out.append("<thead><tr>" + "".join(ths) + "</tr></thead>")
        out.append("<tbody>")
        for row in block.get("rows", []):
            tds = []
            for index, cell in enumerate(row):
                align = block.get("align", [])[index] if index < len(block.get("align", [])) else ""
                cls_attr = f' class="{align}"' if align else ""
                tds.append(f"<td{cls_attr}>{inline(cell)}</td>")
            out.append("<tr>" + "".join(tds) + "</tr>")
        out.append("</tbody></table>")
        return "".join(out)

    def figure(self, block: dict) -> str:
        src = self.rel(block.get("src", ""))
        height = block.get("height")
        style = f' style="max-height:{height};width:100%;object-fit:cover"' if height else ""
        cap = f'<figcaption>{inline(block["caption"])}</figcaption>' if block.get("caption") else ""
        return (
            f'<figure class="figure{" full-bleed" if block.get("fullBleed") else ""}">'
            f'<img src="{esc(src)}" alt="{esc(block.get("alt", ""))}"{style}>{cap}</figure>'
        )

    def sheet(self, block: dict) -> str:
        out = [f'<div class="character-sheet" id="{block.get("id", "")}">']
        out.append('<div class="character-head">')
        if block.get("portrait"):
            out.append(
                '<figure class="portrait" style="flex:0 0 21mm;margin:0">'
                f'<img src="{esc(self.rel(block["portrait"]))}" alt="{esc(block.get("name", ""))}" '
                'style="display:block;width:21mm;height:21mm;object-fit:cover"></figure>'
            )
        out.append('<div style="flex:1 1 auto">')
        out.append('<div class="eyebrow">OPERATIVE PROFILE · 原型卡</div>')
        out.append(f'<h2 style="font-size:16pt;margin:0 0 1mm">{inline(block.get("name", ""))}</h2>')
        out.append(f'<div class="role">{inline(block.get("role", ""))}</div>')
        out.append("</div>")
        meta = block.get("meta") or []
        if meta:
            spans = []
            for key, value in meta:
                if value:
                    spans.append(f"<span><b>{inline(key)}</b> {inline(value)}</span>")
                else:
                    spans.append(f'<span><b>{inline(key)}</b> <span class="fill"></span></span>')
            out.append('<div class="character-meta">' + "".join(spans) + "</div>")
        out.append("</div>")

        def section(item: dict) -> str:
            if item.get("blank"):
                body = "".join('<div class="blank-line"></div>' for _ in range(int(item["blank"])))
                return f'<h3>{inline(item["title"])}</h3>{body}'
            if item.get("table"):
                table = dict(item["table"])
                table.setdefault("sheet", True)
                table.setdefault("compact", True)
                return f'<h3>{inline(item["title"])}</h3>' + self.table(table)
            return ""

        left = "".join(section(item) for item in block.get("left") or [])
        right = "".join(section(item) for item in block.get("right") or [])
        if left or right:
            out.append('<div class="character-grid">')
            out.append(f'<div class="sheet-section">{left}</div>')
            out.append(f'<div class="sheet-section">{right}</div>')
            out.append("</div>")
        for item in block.get("bottom") or []:
            out.append(section(item))
        if block.get("track"):
            track = block["track"]
            impair1, impair2 = 25, 30
            if isinstance(track, dict):
                impair1 = int(track.get("impair1", 25))
                impair2 = int(track.get("impair2", 30))
            cells = []
            for number in range(1, 61):
                cls = ' class="th"' if number in (impair1, impair2) else ""
                cells.append(f"<span{cls}>{number}</span>")
            out.append(
                '<div class="track"><div class="track-head">'
                '<span class="label">创伤点 WOUND POINTS</span>'
                '<span class="track-note" style="font-family:var(--sans);font-size:6.4pt;color:var(--muted)">'
                f"削弱 –1 出现在 {impair1} 点 · 削弱 –2 出现在 {impair2} 点</span></div>"
                '<div class="track-grid">' + "".join(cells) + "</div></div>"
            )
        if block.get("marks"):
            boxes = '<span class="box"></span>' * int(block["marks"])
            out.append(
                '<div class="marks-row"><span class="label">死亡印记 MARKS OF DEATH</span>'
                + boxes + "</div>"
            )
        out.append("</div>")
        return "".join(out)

    def block(self, block: dict) -> str:
        kind = block.get("type")
        if kind == "p":
            return f'<p>{inline(block.get("text", ""))}</p>'
        if kind == "h2":
            return f'<h2{" class=\"sec\"" if block.get("sec") else ""}>{inline(block.get("text", ""))}</h2>'
        if kind == "h3":
            return f'<h3{" class=\"sec\"" if block.get("sec") else ""}>{inline(block.get("text", ""))}</h3>'
        if kind == "h4":
            return f'<h4>{inline(block.get("text", ""))}</h4>'
        if kind == "read":
            return (
                f'<aside class="read"><span class="label">{inline(block.get("label", "READ · 朗读"))}</span>'
                f'<p>{inline(block.get("text", ""))}</p></aside>'
            )
        if kind == "rule":
            return (
                f'<div class="rule"><span class="label">{inline(block.get("label", "RULE · 规则"))}</span>'
                f'<p>{inline(block.get("text", ""))}</p></div>'
            )
        if kind == "note":
            return (
                f'<div class="note"><span class="label">{inline(block.get("label", "NOTE · 提示"))}</span>'
                f'<p>{inline(block.get("text", ""))}</p></div>'
            )
        if kind == "info":
            return f'<div class="info"><p>{inline(block.get("text", ""))}</p></div>'
        if kind == "table":
            return self.table(block)
        if kind == "figure":
            return self.figure(block)
        if kind == "statblock":
            stats = "".join(
                f"<div><span>{inline(a)}</span><span>{inline(b)}</span></div>"
                for a, b in block.get("stats", [])
            )
            text = f'<p>{inline(block["text"])}</p>' if block.get("text") else ""
            return (
                f'<div class="statblock"><div class="name">{inline(block.get("name", ""))}</div>'
                f'<div class="tagline">{inline(block.get("tagline", ""))}</div>'
                f'<div class="stats">{stats}</div>{text}</div>'
            )
        if kind == "list":
            items = "".join(f"<li>{inline(item)}</li>" for item in block.get("items", []))
            return f"<ul>{items}</ul>"
        if kind == "quote":
            return f'<p class="quote-line">{inline(block.get("text", ""))}</p>'
        if kind == "pullquote":
            cite = f'<cite>{inline(block["cite"])}</cite>' if block.get("cite") else ""
            return f'<div class="pullquote">{inline(block.get("text", ""))}{cite}</div>'
        if kind == "card":
            fields = "".join(
                f"<dt>{inline(a)}</dt><dd>{inline(b)}</dd>" for a, b in block.get("fields", [])
            )
            role = f'<div class="role">{inline(block["role"])}</div>' if block.get("role") else ""
            return (
                f'<div class="card"><div class="card-label">{inline(block.get("label", ""))}</div>'
                f'<h3>{inline(block.get("title", ""))}</h3>{role}<dl>{fields}</dl></div>'
            )
        if kind == "sheet":
            return self.sheet(block)
        if kind == "display":
            return (
                f'<div class="display {block.get("class", "")}" style="{block.get("style", "")}">'
                f'{inline(block.get("text", ""))}</div>'
            )
        if kind == "footnote":
            return f'<p class="footnote">{inline(block.get("text", ""))}</p>'
        raise ValueError(f"unknown block type: {kind}")

    def page(self, spec: dict) -> str:
        cls = "page" + (" dense" if spec.get("dense") else "")
        out = [f'<section class="{cls}">']
        opener = spec.get("opener")
        if opener:
            has_flow = bool(spec.get("top") or spec.get("col1") or spec.get("col2"))
            out.append('<div class="opener compact">' if has_flow else '<div class="opener">')
            if opener.get("art"):
                out.append(
                    f'<figure class="op-art"><img src="{esc(self.rel(opener["art"]["src"]))}" '
                    f'alt="{esc(opener["art"].get("alt", ""))}"></figure>'
                )
            if opener.get("number"):
                out.append(f'<div class="op-num">{inline(opener["number"])}</div>')
            if opener.get("en"):
                out.append(f'<div class="op-en">{inline(opener["en"])}</div>')
            out.append(f'<h1>{inline(opener.get("title", spec.get("h1", "")))}</h1>')
            out.append('<div class="gold-line"></div>')
            if opener.get("lede"):
                out.append(f'<p class="op-lede">{inline(opener["lede"])}</p>')
            out.append("</div>")
        else:
            head = spec.get("eyebrow") or spec.get("h1") or spec.get("h2") or spec.get("dek")
            if head:
                out.append('<div class="page-head">')
                if spec.get("eyebrow"):
                    out.append(f'<div class="eyebrow">{inline(spec["eyebrow"])}</div>')
                if spec.get("h1"):
                    out.append(f'<h1>{inline(spec["h1"])}</h1>')
                elif spec.get("h2"):
                    out.append(f'<h2 class="pagename">{inline(spec["h2"])}</h2>')
                if spec.get("dek"):
                    out.append(f'<p class="dek">{inline(spec["dek"])}</p>')
                out.append("</div>")

        for block in spec.get("top") or []:
            out.append(self.block(block))

        col1 = spec.get("col1") or []
        col2 = spec.get("col2") or []
        if col1 or col2:
            out.append('<div class="columns">')
            if col1:
                out.append('<div class="col">' + "".join(self.block(item) for item in col1) + "</div>")
            if col2:
                out.append('<div class="col">' + "".join(self.block(item) for item in col2) + "</div>")
            out.append("</div>")

        for block in spec.get("bottom") or []:
            out.append(self.block(block))
        out.append("</section>")
        return "".join(out)


def load_specs(pages_dir: Path, toc_after: int = 2) -> list[dict]:
    specs = []
    for file in sorted(Path(pages_dir).glob("*.json")):
        if file.name.startswith("_"):
            continue
        try:
            spec = json.loads(file.read_text(encoding="utf-8-sig"))
        except Exception as error:  # noqa: BLE001
            raise ValueError(f"{file.name}: 不是有效 JSON（{error}）")
        if not isinstance(spec, dict):
            raise ValueError(f"{file.name}: 顶层必须是对象")
        spec["_file"] = file.name
        specs.append(spec)
    content = [spec for spec in specs if spec.get("kind") != "toc"]
    tocs = [spec for spec in specs if spec.get("kind") == "toc"]
    content.sort(key=lambda item: (min(item.get("src") or [10**9]), item["_file"]))
    tocs.sort(key=lambda item: item["_file"])
    # TOC pages have no source page; put them after the front matter (title/credits).
    insert_at = 0
    for index, spec in enumerate(content):
        if min(spec.get("src") or [10**9]) <= toc_after:
            insert_at = index + 1
    return content[:insert_at] + tocs + content[insert_at:]


def validate_spec(spec: dict) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    name = spec.get("_file", "?")
    src = spec.get("src")
    if spec.get("kind") == "toc":
        return errors, warnings
    if not isinstance(src, list) or not src:
        errors.append(f"{name}: 缺少 src 源页数组")
    for block in list(spec.get("top") or []) + list(spec.get("col1") or []) + list(spec.get("col2") or []) + list(spec.get("bottom") or []):
        if not isinstance(block, dict):
            errors.append(f"{name}: block 不是对象")
            continue
        kind = block.get("type")
        if kind not in BLOCK_TYPES:
            errors.append(f"{name}: 未知 block 类型 {kind}")
        if kind == "table":
            head = block.get("head") or []
            rows = block.get("rows") or []
            if head and rows and any(len(row) != len(head) for row in rows):
                errors.append(f"{name}: 表格行列不一致")
        if kind == "figure" and not block.get("src"):
            errors.append(f"{name}: figure 缺少 src")
    text = json.dumps(spec, ensure_ascii=False)
    if PLACEHOLDER.search(text):
        errors.append(f"{name}: 还有【】/TODO/待补 占位符")
    for page in src or []:
        if not isinstance(page, int) or page <= 0:
            errors.append(f"{name}: src 含非法页号 {page}")
    return errors, warnings


def build(specs: list[dict], renderer: Renderer, title: str, root: Path, include_toc: bool) -> str:
    toc_specs = [spec for spec in specs if spec.get("kind") == "toc"]
    content = [spec for spec in specs if spec.get("kind") != "toc"]
    toc_pages = len(toc_specs)

    headings = []
    page_no = toc_pages + 1
    for spec in content:
        heading = spec.get("h1")
        if not heading and spec.get("opener"):
            heading = spec["opener"].get("title")
        if heading and not spec.get("noToc"):
            headings.append({"title": heading, "page": page_no + 1})
        page_no += 1

    toc_html = []
    if include_toc and toc_specs:
        per_page = int(toc_specs[0].get("perPage", 68))
        chunks = [headings[index:index + per_page] for index in range(0, len(headings), per_page)]
        while len(chunks) < toc_pages:
            chunks.append([])
        for index, chunk in enumerate(chunks[:toc_pages]):
            rows = "".join(
                f'<div class="toc-row"><span class="part"></span>'
                f'<span class="title">{inline(item["title"])}</span>'
                f'<span class="page-number">{item["page"]}</span></div>'
                for item in chunk
            )
            toc_html.append(
                '<section class="page">'
                + (
                    '<div class="page-head"><div class="eyebrow">CONTENTS · 目录</div><h1>目录</h1></div>'
                    if index == 0
                    else '<div class="page-head"><div class="eyebrow">CONTENTS · 目录（续）</div><h1>目录（续）</h1></div>'
                )
                + f'<div class="toc-list">{rows}</div></section>'
            )

    body = []
    toc_iter = iter(toc_html)
    for spec in specs:
        if spec.get("kind") == "toc":
            body.append(next(toc_iter, '<section class="page"></section>'))
        else:
            body.append(renderer.page(spec))

    try:
        theme_rel = os.path.relpath(root / ".trpg" / "theme.css", renderer.out_dir).replace(os.sep, "/")
    except ValueError:
        theme_rel = (root / ".trpg" / "theme.css").as_posix()
    book_css = ""
    css_file = root / "book" / "book.css"
    if css_file.exists():
        book_css = css_file.read_text(encoding="utf-8")

    return f"""<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>{esc(title)}</title>
<link rel="stylesheet" href="{esc(theme_rel)}">
<style>
{book_css}
</style>
</head>
<body>
{chr(10).join(body)}
</body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="从页 JSON 构建 book/body.html 或单批 fragment")
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--pages", type=Path, default=Path("work/pages"))
    parser.add_argument("--toc-after", type=int, default=2, help="TOC 插在源页 <= N 的前置页之后")
    parser.add_argument("--plan", type=Path, default=Path("work/batches.json"))
    parser.add_argument("--batch", default=None)
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--out", type=Path, default=None)
    parser.add_argument("--title", default="TRPG")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--source-map", type=Path, default=Path("work/source-map.json"))
    parser.add_argument("--glossary", type=Path, default=Path("glossary/glossary.csv"))
    args = parser.parse_args()

    root = args.root.resolve()
    pages_dir = (root / args.pages).resolve()
    specs = load_specs(pages_dir, args.toc_after)
    if not specs:
        print(f"找不到页 JSON：{pages_dir}", file=sys.stderr)
        return 2

    errors: list[str] = []
    warnings: list[str] = []
    for spec in specs:
        spec_errors, spec_warnings = validate_spec(spec)
        errors.extend(spec_errors)
        warnings.extend(spec_warnings)

    if args.batch:
        plan = json.loads((root / args.plan).read_text(encoding="utf-8"))
        batch = next((item for item in plan.get("batches", []) if item["id"] == args.batch), None)
        if not batch:
            print(f"找不到批次：{args.batch}", file=sys.stderr)
            return 2
        start, end = batch["pages"]
        specs = [
            spec for spec in specs
            if any(start <= page <= end for page in (spec.get("src") or []))
        ]
        if not specs:
            print(f"批次 {args.batch} 还没有页 JSON", file=sys.stderr)
            return 2

    plan_path = root / args.plan
    if plan_path.exists() and (root / "work" / "progress.json").exists():
        plan = json.loads(plan_path.read_text(encoding="utf-8"))
        targets = [item for item in plan.get("batches", []) if args.batch in (None, item["id"])]
        for target in targets:
            proof = proof_status(root, target)
            if not proof["ok"]:
                errors.extend(f"批次 {target['id']} 校对未通过：{item}" for item in proof["errors"])

    source_map_path = (root / args.source_map) if args.source_map else None
    if source_map_path and source_map_path.exists():
        try:
            source_map = json.loads(source_map_path.read_text(encoding="utf-8-sig"))
        except Exception:
            source_map = {}
        audit = audit_specs(root, specs, source_map)
        errors.extend(audit["errors"])
        warnings.extend(audit["warnings"])
        glossary_path = (root / args.glossary) if args.glossary else None
        if glossary_path and glossary_path.exists():
            term_audit = audit_terms(root, specs, glossary_path, source_map)
            errors.extend(term_audit["errors"])
            warnings.extend(term_audit["warnings"])

    if errors:
        for error in errors[:30]:
            print(f"ERROR {error}", file=sys.stderr)
        print(f"校验失败：{len(errors)} 个错误", file=sys.stderr)
        return 1
    if args.check:
        print(f"OK：{len(specs)} 页，{len(warnings)} 个警告")
        return 0

    out = args.out or (root / "book" / "batches" / f"{args.batch}.html" if args.batch else root / "book" / "body.html")
    out = out if out.is_absolute() else root / out
    out.parent.mkdir(parents=True, exist_ok=True)
    renderer = Renderer(root, out.parent)
    html_text = build(specs, renderer, args.title, root, include_toc=not args.batch)
    out.write_text(html_text, encoding="utf-8")
    print(f"OK：{len(specs)} 页 → {out}")
    if warnings:
        for warning in warnings[:10]:
            print(f"WARN {warning}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:  # noqa: BLE001
        pass
    raise SystemExit(main())

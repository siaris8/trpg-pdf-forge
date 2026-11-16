"""Terminology completeness checks for translated page JSON.

The goal is not to translate terms automatically. It is to make sure that a
term list (gun/driving/martial-path schticks, skills) is actually rendered in
Chinese from glossary.csv, instead of being left as an English list with a
footnote.
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path


def read_json(path, fallback=None):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8-sig"))
    except Exception:
        if fallback is not None:
            return fallback
        raise

CJK = re.compile(r"[\u4e00-\u9fff]")
LATIN = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]")
LIST_LABEL = re.compile(r"^\*\*(.+?)\*\*\s*(?:（[^）]*）|\([^)]*\))?\s*[：:]")
PROPER_PAGE = re.compile(r"(backers|kickstarter|index|glossary|contents|credits|filmography|spis treści|indeks|glosariusz)", re.I)
FOOTNOTE = re.compile(r"(沿用原书英文名|英文名见|保留英文名|保留原文英文|英文名沿用|Originalnamen beibehalten|Namen im Original|englische Namen|oryginalne nazwy|nazwy w oryginale|pozostaw.*oryginał)", re.I)
ROMAN = r"(?:I{1,3}|IV|V|VI|VII|VIII|IX|X)"
RANK = re.compile(rf"\s*(?:{ROMAN}|\d+\s*[-–]\s*\d+|{ROMAN}\s*[-–]\s*{ROMAN})\s*$")
ALLOWED_CATEGORIES = {
    "title", "term", "check", "stat", "mechanic", "chapter", "section",
    "archetype", "schtick", "skill", "dice", "faction", "path", "spell", "weapon",
}
CATEGORY_HINTS = [
    ("枪械特技", "schtick"),
    ("驾驶特技", "schtick"),
    ("异类特技", "schtick"),
    ("变异特技", "schtick"),
    ("拾荒科技特技", "schtick"),
    ("武术道途", "path"),
    ("道途", "path"),
    ("新增技能", "skill"),
    ("技能", "skill"),
    ("法术", "spell"),
    ("武器", "weapon"),
]


def normalize(value: str) -> str:
    text = str(value or "").strip().lower()
    text = text.replace("’", "'").replace("‘", "'")
    text = text.replace("–", "-").replace("—", "-").replace("−", "-")
    text = re.sub(r"\s+", " ", text)
    return text.strip(" .。:：")


def base_term(value: str) -> str:
    text = str(value or "").strip().rstrip("。")
    previous = None
    while previous != text:
        previous = text
        text = RANK.sub("", text).strip()
    return text


def read_glossary(path: Path) -> tuple[list[dict], dict[str, dict], list[str]]:
    rows: list[dict] = []
    index: dict[str, dict] = {}
    errors: list[str] = []
    if not path.exists():
        return rows, index, [f"找不到术语表：{path}"]
    with path.open(encoding="utf-8-sig", newline="") as handle:
        for number, row in enumerate(csv.DictReader(handle), start=2):
            source = str(row.get("source") or "").strip()
            target = str(row.get("target") or "").strip()
            category = str(row.get("category") or "").strip()
            if not source:
                continue
            entry = {
                "source": source,
                "target": target,
                "category": category,
                "line": number,
                "locked": str(row.get("locked") or "").strip() in ("1", "true", "TRUE"),
            }
            rows.append(entry)
            for key in {normalize(source), normalize(base_term(source))}:
                if not key:
                    continue
                if key in index and normalize(index[key]["source"]) != normalize(source):
                    errors.append(
                        f"术语表第 {number} 行与第 {index[key]['line']} 行重复：{source} / {index[key]['source']}"
                    )
                else:
                    index[key] = entry
            if not target:
                errors.append(f"术语表第 {number} 行缺 target：{source}")
            elif normalize(source) == normalize(target) and category not in ("term", "title"):
                errors.append(f"术语表第 {number} 行 source 与 target 相同：{source}")
            if category and category not in ALLOWED_CATEGORIES:
                errors.append(f"术语表第 {number} 行 category 未知：{category}")
    return rows, index, errors


def iter_blocks(spec: dict):
    for key in ("top", "col1", "col2", "bottom"):
        for index, block in enumerate(spec.get(key) or []):
            if isinstance(block, dict):
                yield f"{key}[{index}]", block


def split_terms(text: str) -> list[str]:
    content = text
    match = LIST_LABEL.match(content.strip())
    if match:
        content = content.strip()[match.end():]
    content = content.replace("；", "、").replace(";", "、")
    if "、" in content:
        parts = content.split("、")
    elif "," in content:
        parts = content.split(",")
    else:
        parts = [content]
    return [part.strip().strip("。.") for part in parts if part.strip()]


def term_lists(spec: dict):
    """Yield (path, label, text, terms) for clearly labelled term lists."""
    for path, block in iter_blocks(spec):
        if block.get("type") not in ("display", "list", "p"):
            continue
        text = block.get("text")
        if not isinstance(text, str):
            if block.get("type") == "list" and isinstance(block.get("items"), list):
                text = "、".join(str(item) for item in block["items"])
            else:
                continue
        match = LIST_LABEL.match(text.strip())
        if not match:
            continue
        label = str(match.group(1)).strip()
        terms = split_terms(text)
        english = [term for term in terms if LATIN.search(term) and len(CJK.findall(term)) <= 1]
        if len(terms) < 4 or len(english) < 4:
            continue
        yield path, label, text, terms


def category_for(label: str) -> str:
    for hint, category in CATEGORY_HINTS:
        if hint in label:
            return category
    return "term"


def page_titles(source_map: dict) -> dict[int, str]:
    return {
        int(page.get("page") or 0): str(page.get("title") or "")
        for page in (source_map.get("pages") or [])
        if isinstance(page, dict) and page.get("page")
    }


def audit_terms(root, specs: list[dict], glossary_path: Path, source_map: dict | None = None) -> dict:
    rows, index, errors = read_glossary(glossary_path)
    warnings: list[str] = []
    missing: list[dict] = []
    mismatched: list[dict] = []
    titles = page_titles(source_map or {})

    archetypes = {
        normalize(row["source"]): row
        for row in rows
        if row.get("category") == "archetype" and row.get("target")
    }
    archetype_targets = {normalize(row["target"]) for row in archetypes.values()}

    for spec in specs:
        file = spec.get("_file", "?")
        pages = [int(page) for page in (spec.get("src") or []) if isinstance(page, (int, float))]
        title = titles.get(pages[0], "") if pages else ""
        if spec.get("kind") == "toc" or PROPER_PAGE.search(title):
            continue

        page_text = str(spec)
        if FOOTNOTE.search(page_text):
            errors.append(f"{file}: 不得用“沿用原书英文名/保留原文名”脚注绕过术语翻译")

        for path, label, text, terms in term_lists(spec):
            category = category_for(label)
            english = [term for term in terms if LATIN.search(term) and len(CJK.findall(term)) <= 1]
            for term in english:
                key = normalize(base_term(term))
                entry = index.get(key) or index.get(normalize(term))
                if not entry or not entry.get("target"):
                    missing.append({
                        "source": base_term(term),
                        "category": category,
                        "page": pages[0] if pages else 0,
                        "file": file,
                        "path": path,
                    })
                    errors.append(f"{file} {path}: 术语未入表或未翻译：{base_term(term)}")
                    continue
                target = entry["target"]
                if normalize(target) == normalize(entry["source"]):
                    continue
                if target not in text:
                    errors.append(
                        f"{file} {path}: 术语列表仍用源语言/拉丁文：{term} → 应使用“{target}”"
                    )

        opener = spec.get("opener") or {}
        en = str(opener.get("en") or "").strip()
        if en:
            entry = archetypes.get(normalize(en))
            if not entry:
                other = any(
                    normalize(row["source"]) == normalize(en)
                    and row.get("category") in ("chapter", "title", "section")
                    for row in rows
                )
                if not other:
                    warnings.append(f"{file}: 原型 {en} 不在术语表 archetype 中（按章节/标题跳过的除外）")
            elif str(opener.get("title") or "").strip() != entry["target"]:
                mismatched.append({
                    "source": en,
                    "expected": entry["target"],
                    "actual": str(opener.get("title") or ""),
                    "file": file,
                })
                errors.append(
                    f"{file}: 原型名“{opener.get('title')}”与术语表“{entry['target']}”不一致"
                )

        for key in ("h1", "h2"):
            heading = str(spec.get(key) or "")
            match = re.match(r"^(.+?)\s*·\s*人物卡", heading)
            if not match:
                continue
            actual = match.group(1).strip()
            if normalize(actual) not in archetype_targets:
                mismatched.append({
                    "source": "",
                    "expected": "、".join(sorted(target for target in archetype_targets)),
                    "actual": actual,
                    "file": file,
                })
                errors.append(f"{file}: 人物卡标题“{actual}”不是术语表中的原型名")

    candidates: dict[str, dict] = {}
    for item in missing:
        key = normalize(item["source"])
        row = candidates.setdefault(key, {
            "source": item["source"],
            "target": "",
            "category": item["category"],
            "notes": f"出现在 {item['file']} {item['path']}",
        })
        if item["file"] not in row["notes"]:
            row["notes"] += f"；{item['file']}"

    return {
        "ok": not errors,
        "errors": errors,
        "warnings": warnings,
        "missing": missing,
        "mismatched": mismatched,
        "candidates": list(candidates.values()),
        "stats": {
            "glossaryRows": len(rows),
            "archetypes": len(archetypes),
            "termLists": sum(1 for spec in specs for _ in term_lists(spec)),
            "missingTerms": len(candidates),
        },
    }


def write_candidates(path: Path, candidates: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=["source", "target", "category", "notes"])
        writer.writeheader()
        for row in candidates:
            writer.writerow(row)

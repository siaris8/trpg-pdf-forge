"""Text completeness checks for translated page JSON.

Two independent signals:

1. Source-language leftovers: a narrative block that is still a full German,
   Polish or English sentence.
2. Low source coverage: translated characters for a source page are far below
   the source page's character count (excluding TOC/index/backers/glossary).
The second check catches omitted paragraphs, not just English text. Thresholds
are deliberately conservative: errors catch severe omissions; warnings ask the
agent to look without blocking a build.
"""
from __future__ import annotations

import re

CJK = re.compile(r"[\u4e00-\u9fff]")
LATIN = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿĀ-ž]")
PROSE = re.compile(
    r"\b(the|and|of|to|is|are|you|your|with|that|this|for|from|can|will|not|must|when|if|on|in)\b",
    re.I,
)
GERMAN_PROSE = re.compile(
    r"\b(der|die|das|und|oder|nicht|mit|von|für|ist|sind|wird|werden|kann|können|muss|müssen|ein|eine|einen|dem|den|des|im|am|zum|zur|auf|aus|bei)\b",
    re.I,
)
POLISH_PROSE = re.compile(
    r"\b(i|w|z|na|do|nie|jest|są|się|oraz|ale|jak|dla|od|po|przez|tym|tego|jako|może|musi|gdy|jeśli|który|która|które)\b",
    re.I,
)
SKIP_TITLE = re.compile(r"(index|backers|glossary|contents|filmography|title page|credits|inhalt|glossar|stichwortverzeichnis|spis treści|indeks|glosariusz)", re.I)
SUMMARY_TITLE = re.compile(r"(briefing|quick reference|速览|速查|摘要|übersicht|kurzreferenz|szybki start|skróty)", re.I)
NARRATIVE = {"p", "read", "note", "info", "quote", "pullquote", "statblock", "card"}
METADATA = {
    "src", "type", "kind", "eyebrow", "h1", "h2", "h3", "h4", "perPage",
    "widths", "align", "class", "style", "height", "fullBleed", "noToc",
    "dense", "id", "portrait", "file", "name", "alt", "href", "download", "url",
}


def iter_narrative(spec: dict):
    """Yield (path, text) for blocks that must contain translated prose."""
    for key in ("top", "col1", "col2", "bottom"):
        for index, block in enumerate(spec.get(key) or []):
            if not isinstance(block, dict):
                continue
            kind = block.get("type")
            if kind in NARRATIVE and isinstance(block.get("text"), str):
                yield f"{key}[{index}]/{kind}", block["text"]
    opener = spec.get("opener") or {}
    if isinstance(opener.get("lede"), str):
        yield "opener/lede", opener["lede"]
    if isinstance(spec.get("dek"), str):
        yield "dek", spec["dek"]


def iter_all_text(value, path=""):
    if isinstance(value, dict):
        for key, item in value.items():
            if key in METADATA:
                continue
            yield from iter_all_text(item, f"{path}/{key}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from iter_all_text(item, f"{path}[{index}]")
    elif isinstance(value, str):
        yield path, value


def english_leftovers(spec: dict) -> list[dict]:
    return source_leftovers(spec, "en")


def source_leftovers(spec: dict, source_lang: str = "en") -> list[dict]:
    rows = []
    code = str(source_lang).lower()
    prose = PROSE
    if code.startswith("de"):
        prose = GERMAN_PROSE
    elif code.startswith("pl"):
        prose = POLISH_PROSE
    for path, text in iter_narrative(spec):
        value = text.strip()
        if len(value) < 40:
            continue
        cjk = len(CJK.findall(value))
        latin = len(LATIN.findall(value))
        if latin < 30 or cjk / (cjk + latin + 1) >= 0.06:
            continue
        if not prose.search(value):
            continue
        if not any(mark in value for mark in (". ", "! ", "? ")):
            continue
        if value.count("、") >= 3:
            continue
        rows.append({
            "page": int((spec.get("src") or [0])[0] or 0),
            "file": spec.get("_file", "?"),
            "path": path,
            "text": value[:160],
            "chars": latin,
            "lang": "pl" if code.startswith("pl") else ("de" if code.startswith("de") else "en"),
        })
    return rows


def text_length(spec: dict) -> int:
    total = 0
    for _path, text in iter_all_text(spec):
        total += len(CJK.findall(text)) + len(LATIN.findall(text))
    return total


def page_records(source_map: dict) -> dict[int, dict]:
    return {
        int(page.get("page") or 0): page
        for page in (source_map.get("pages") or [])
        if isinstance(page, dict) and page.get("page")
    }


def audit_specs(root, specs: list[dict], source_map: dict, pages: set[int] | None = None, source_lang: str = "en") -> dict:
    """Return {errors, warnings, pages} for the given page JSONs."""
    errors: list[str] = []
    warnings: list[str] = []
    page_rows = page_records(source_map)
    if pages is None:
        pages = {
            int(page)
            for spec in specs
            for page in (spec.get("src") or [])
            if isinstance(page, (int, float))
        }

    for spec in specs:
        for row in source_leftovers(spec, source_lang):
            language = {"de": "德语", "pl": "波兰语"}.get(row.get("lang"), "英文")
            errors.append(
                f"{row['file']} {row['path']}: 仍有整段{language}未翻译（{row['text']}…）"
            )

    by_page: dict[int, list[dict]] = {}
    for spec in specs:
        for page in (spec.get("src") or []):
            if isinstance(page, (int, float)):
                by_page.setdefault(int(page), []).append(spec)

    low: list[dict] = []
    for page in sorted(pages):
        source = page_rows.get(page) or {}
        source_chars = int(source.get("chars") or 0)
        if source_chars < 800:
            continue
        title = str(source.get("title") or "")
        if source.get("kind") == "toc" or SKIP_TITLE.search(title):
            continue
        if SUMMARY_TITLE.search(title):
            continue
        files = by_page.get(page) or []
        if not files or all(str(item.get("kind") or "") == "toc" for item in files):
            continue
        if any(bool(item.get("abridged")) for item in files):
            continue
        translated = sum(text_length(item) for item in files)
        ratio = translated / source_chars
        row = {
            "page": page,
            "sourceChars": source_chars,
            "translatedChars": translated,
            "ratio": round(ratio, 3),
            "files": [item.get("_file", "?") for item in files],
            "title": title,
        }
        if ratio < 0.20:
            low.append(row)
            errors.append(
                f"p{page:03d} 疑似漏译：译文 {translated} 字 / 源页 {source_chars} 字"
                f"（{round(ratio * 100)}%），{','.join(row['files'])}"
            )
        elif ratio < 0.28:
            low.append(row)
            warnings.append(
                f"p{page:03d} 可能偏短：译文 {translated} 字 / 源页 {source_chars} 字"
                f"（{round(ratio * 100)}%），建议对照源页核对是否漏段"
            )

    return {"errors": errors, "warnings": warnings, "pages": low}

"""Book-title authority: TITLE.json, validation and artifact propagation checks."""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

TITLE_PATH = "work/TITLE.json"
PLACEHOLDER = re.compile(r"(\[待校对\]|\[待确认\]|未命名|untitled|TBD)", re.I)
SLUG = re.compile(r"(_|\.pdf$|\.docx$|^project-|^b\d{2,}$)", re.I)


def load_title(root) -> dict | None:
    path = Path(root) / TITLE_PATH
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
        return value if isinstance(value, dict) else None
    except Exception:
        return None


def title_zh(root, fallback: str | None = None) -> str:
    value = load_title(root) or {}
    return str(value.get("titleZh") or "").strip() or (fallback or "")


def title_original(root, fallback: str = "") -> str:
    value = load_title(root) or {}
    return str(value.get("titleOriginal") or "").strip() or fallback


def validate(root, require_verified: bool = True, check_artifacts: bool = True) -> dict:
    root = Path(root)
    title = load_title(root)
    errors: list[str] = []
    warnings: list[str] = []
    if not title:
        return {
            "ok": False,
            "errors": ["缺少 work/TITLE.json；先运行 title.py init，再在读完封面/目录后补全"],
            "warnings": [],
            "title": None,
        }

    original = str(title.get("titleOriginal") or "").strip()
    zh = str(title.get("titleZh") or "").strip()
    if not original:
        errors.append("TITLE.titleOriginal 为空")
    if not zh:
        errors.append("TITLE.titleZh 为空")
    if zh and (PLACEHOLDER.search(zh) or SLUG.search(zh)):
        errors.append(f"TITLE.titleZh 仍是工作名/占位符：{zh}")
    if zh and len(zh) < 2:
        errors.append("TITLE.titleZh 过短")
    if not isinstance(title.get("sourcePages"), list) or not title.get("sourcePages"):
        errors.append("TITLE.sourcePages 不能为空")
    if not isinstance(title.get("contentEvidence"), list) or not title.get("contentEvidence"):
        errors.append("TITLE.contentEvidence 不能为空（需要读过封面/目录/章节后的依据）")
    if len(str(title.get("rationale") or "").strip()) < 8:
        errors.append("TITLE.rationale 太短，需要说明为什么这样译")
    if require_verified:
        if title.get("status") != "verified":
            errors.append("TITLE.status 不是 verified")
        if title.get("verifiedAfterRead") is not True:
            errors.append("TITLE.verifiedAfterRead 不是 true")
        if not str(title.get("reviewer") or "").strip():
            errors.append("TITLE.reviewer 为空")

    glossary = root / "glossary" / "glossary.csv"
    title_rows = []
    if glossary.exists():
        try:
            with glossary.open("r", encoding="utf-8-sig", newline="") as stream:
                for row in csv.DictReader(stream):
                    if str(row.get("category") or "").strip() == "title":
                        title_rows.append(row)
        except Exception as error:  # noqa: BLE001
            warnings.append(f"无法读取 glossary：{error}")
    if title_rows:
        for row in title_rows:
            target = str(row.get("target") or "").strip()
            if target and zh and target != zh:
                errors.append(f"glossary title 行 target“{target}”与 TITLE.titleZh“{zh}”不一致")
    else:
        warnings.append("glossary 没有 category=title 行；建议补一行书名")

    aliases = [str(value) for value in title.get("aliases") or [] if str(value).strip()]
    artifacts = ["book/body.html", "book/cover.html", "out/TRANSLATION-REPORT.md"]
    if check_artifacts:
        for relative in artifacts:
            file = root / relative
            if not file.exists():
                continue
            text = file.read_text(encoding="utf-8-sig", errors="replace")
            if zh and zh not in text:
                errors.append(f"{relative} 没有出现书名“{zh}”")
            for alias in aliases:
                if alias and alias != zh and alias in text:
                    errors.append(f"{relative} 仍有旧书名“{alias}”")
        report = root / "out" / "TRANSLATION-REPORT.md"
        if report.exists() and zh not in report.read_text(encoding="utf-8-sig", errors="replace"):
            errors.append("out/TRANSLATION-REPORT.md 没有出现书名")
        glossary_out = root / "out" / "GLOSSARY.csv"
        if glossary_out.exists():
            try:
                with glossary_out.open("r", encoding="utf-8-sig", newline="") as stream:
                    rows = list(csv.DictReader(stream))
                targets = [str(row.get("target") or "").strip() for row in rows if str(row.get("category") or "").strip() == "title"]
                if targets and zh and targets[0] != zh:
                    errors.append(f"out/GLOSSARY.csv title target“{targets[0]}”与 TITLE.titleZh 不一致")
            except Exception:  # noqa: BLE001
                warnings.append("无法检查 out/GLOSSARY.csv")
        bookmarks = root / "out" / "BOOKMARKS.json"
        if bookmarks.exists() and zh:
            try:
                data = json.loads(bookmarks.read_text(encoding="utf-8-sig"))
                blob = json.dumps(data, ensure_ascii=False)
                if zh not in blob:
                    errors.append("out/BOOKMARKS.json 没有出现书名")
            except Exception:  # noqa: BLE001
                warnings.append("无法检查 out/BOOKMARKS.json")

    return {"ok": not errors, "errors": errors, "warnings": warnings, "title": title}

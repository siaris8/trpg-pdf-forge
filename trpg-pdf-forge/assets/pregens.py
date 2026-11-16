#!/usr/bin/env python
"""Detect, normalize and build pregenerated-character workbooks.

The Agent extracts the actual cards into work/pregens.json (because pregens are
layout-heavy), then this script builds the workbook(s) and index. Detection
only marks candidate sections so no ready-to-play card is silently skipped.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment
from sheet_style import (
    BORDER, CENTER, GOLD, INK, INPUT, LEFT, MUTED, NAVY, PAPER, RED,
    fill, font, label_value, section, setup, table_header, title,
)

SCHEMA_VERSION = 1
MAX_SINGLE_WORKBOOK = 8
PREGEN_KINDS = {"pregen-pc", "npc", "archetype", "unknown"}
SHEET_BAD = re.compile(r"[\\/*?:\[\]]")


def sanitize(value: str, fallback: str = "预设卡") -> str:
    text = SHEET_BAD.sub("-", str(value or "")).strip() or fallback
    return text[:31]


def read_json(path: Path, fallback=None):
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        return fallback


def normalize_data(data: dict) -> dict:
    items = data.get("pregens") if isinstance(data, dict) else data
    rows = []
    for index, raw in enumerate(items or [], start=1):
        if not isinstance(raw, dict):
            continue
        name = str(raw.get("name") or raw.get("nameOriginal") or f"预设卡 {index}").strip()
        kind = str(raw.get("kind") or "pregen-pc")
        if kind not in PREGEN_KINDS:
            kind = "unknown"
        rows.append({
            "id": str(raw.get("id") or f"pregen-{index:02d}"),
            "kind": kind,
            "name": name,
            "nameOriginal": str(raw.get("nameOriginal") or ""),
            "archetype": str(raw.get("archetype") or ""),
            "sourcePages": raw.get("sourcePages") or [],
            "sourceSection": str(raw.get("sourceSection") or ""),
            "attributes": raw.get("attributes") or [],
            "skills": raw.get("skills") or [],
            "weapons": raw.get("weapons") or [],
            "abilities": raw.get("abilities") or [],
            "resources": raw.get("resources") or [],
            "gear": raw.get("gear") or [],
            "notes": str(raw.get("notes") or ""),
            "missing": raw.get("missing") or [],
        })
    return {"schemaVersion": SCHEMA_VERSION, "pregens": rows}


def detect(source: dict, lang: str = "de") -> dict:
    keywords = [
        "vorgefertigte", "spielfertige", "schnellstart", "beispielcharakter",
        "pregenerated", "ready-to-play", "sample character",
        "gotowe postacie", "postacie startowe", "przykładowe postacie",
        "szybki start", "bohaterowie", "nsc",
        "预设角色", "预设卡", "快速开始",
    ]
    candidates = []
    for section_item in source.get("sections") or []:
        title_text = str(section_item.get("title") or "")
        if any(key in title_text.lower() for key in keywords):
            body = str(section_item.get("text") or "")
            names = []
            for line in body.splitlines():
                value = line.strip()
                if 2 <= len(value) <= 40 and not any(mark in value for mark in (":", "：", "=", "|")):
                    names.append(value)
            candidates.append({
                "title": title_text,
                "line": section_item.get("line"),
                "text": body[:4000],
                "possibleNames": names[:30],
            })
    return {"schemaVersion": 1, "lang": lang, "candidates": candidates}


def _pairs(values) -> list[list[str]]:
    rows = []
    for item in values or []:
        if isinstance(item, dict):
            name = item.get("name") or item.get("label") or ""
            value = item.get("value") if "value" in item else item.get("text", "")
            rows.append([str(name), str(value)])
        elif isinstance(item, (list, tuple)):
            rows.append([str(item[0]) if len(item) > 0 else "", str(item[1]) if len(item) > 1 else ""])
        elif item is not None:
            rows.append(["", str(item)])
    return rows


def _write_table(ws, row: int, headers: list[str], rows: list[list[str]]) -> int:
    table_header(ws, row, headers)
    current = row + 1
    for values in rows:
        for col in range(1, 9):
            cell = ws.cell(row=current, column=col)
            cell.border = BORDER
            cell.fill = fill(INPUT)
            cell.font = font(10.5, False, INK)
            cell.alignment = LEFT
        for col, value in enumerate(values[: len(headers)], start=1):
            ws.cell(row=current, column=col, value=value)
        ws.row_dimensions[current].height = 24
        current += 1
    return current


def add_pregen_sheet(wb: Workbook, pregen: dict) -> None:
    if len(wb.sheetnames) == 1 and wb.sheetnames[0] == "Sheet":
        wb.remove(wb["Sheet"])
    ws = wb.create_sheet(sanitize(f"预设卡-{pregen['name']}"))
    setup(ws, "A1:H36", freeze="A5", tab=GOLD if pregen["kind"] == "pregen-pc" else RED)
    title(ws, f"预设角色 · {pregen['name']}", "H", "PREGEN · 可直接使用；带 [待确认] 的字段需对照原书")
    section(ws, 4, "身份")
    label_value(ws, 5, [("类型", "预设玩家" if pregen["kind"] == "pregen-pc" else pregen["kind"], 1, 1), ("原型", pregen["archetype"] or "—", 1, 2), ("来源页", ",".join(str(p) for p in pregen["sourcePages"]) or "—", 1, 1)])
    label_value(ws, 6, [("中文名", pregen["name"], 1, 2), ("原名", pregen["nameOriginal"] or "—", 1, 2)])
    row = 8
    attributes = _pairs(pregen["attributes"])
    if attributes:
        section(ws, row, "属性")
        row = _write_table(ws, row + 1, ["属性", "数值", "修正", "说明"], attributes)
    resources = _pairs(pregen["resources"])
    if resources:
        section(ws, row, "资源")
        row = _write_table(ws, row + 1, ["资源", "当前", "上限", "恢复"], resources)
    skills = _pairs(pregen["skills"])
    if skills:
        section(ws, row, "技能")
        row = _write_table(ws, row + 1, ["技能", "等级", "备注", ""], skills)
    weapons = _pairs(pregen["weapons"])
    if weapons:
        section(ws, row, "武器")
        row = _write_table(ws, row + 1, ["武器", "伤害", "射程", "备注"], weapons)
    abilities = _pairs(pregen["abilities"])
    if abilities:
        section(ws, row, "能力/特技")
        row = _write_table(ws, row + 1, ["名称", "效果", "", ""], abilities)
    gear = _pairs(pregen["gear"])
    if gear:
        section(ws, row, "装备")
        row = _write_table(ws, row + 1, ["装备", "数量", "备注", ""], gear)
    if pregen["notes"] or pregen["missing"]:
        section(ws, row, "备注")
        note = pregen["notes"]
        if pregen["missing"]:
            note += ("；" if note else "") + "待确认：" + "、".join(str(item) for item in pregen["missing"])
        ws.merge_cells(start_row=row + 1, start_column=1, end_row=row + 1, end_column=8)
        cell = ws.cell(row=row + 1, column=1, value=note)
        cell.font = font(10.5, False, MUTED)
        cell.fill = fill(PAPER)
        cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
        cell.border = BORDER
        ws.row_dimensions[row + 1].height = 30
        row += 2
    ws.print_area = f"A1:H{max(10, row)}"


def add_index(wb: Workbook, pregens: list[dict], locations: dict[str, str]) -> None:
    ws = wb.active
    ws.title = "预设卡索引"
    setup(ws, "A1:H40", freeze="A5", tab=GOLD)
    title(ws, "预设卡索引", "H", "预设玩家与 NPC 分开标记；空白车卡见 character-sheet.xlsx")
    table_header(ws, 4, ["编号", "中文名", "德文原名", "类型", "原型", "来源页", "位置", "完整度"])
    for index, pregen in enumerate(pregens, start=5):
        values = [
            pregen["id"], pregen["name"], pregen["nameOriginal"], pregen["kind"],
            pregen["archetype"], ",".join(str(p) for p in pregen["sourcePages"]),
            locations.get(pregen["id"], ""), "partial" if pregen["missing"] else "complete",
        ]
        for col, value in enumerate(values, start=1):
            cell = ws.cell(row=index, column=col, value=value)
            cell.font = font(10.5, False, INK)
            cell.fill = fill(INPUT)
            cell.border = BORDER
            cell.alignment = LEFT
        ws.row_dimensions[index].height = 24
    ws.print_area = f"A1:H{max(10, 5 + len(pregens))}"


def build(data: dict, out: Path) -> dict:
    normalized = normalize_data(data)
    pregens = normalized["pregens"]
    if not pregens:
        return {"schemaVersion": SCHEMA_VERSION, "ok": True, "count": 0, "mode": "none", "files": [], "pregens": []}
    files = []
    if len(pregens) <= MAX_SINGLE_WORKBOOK:
        wb = Workbook()
        locations = {item["id"]: f"out/pregens.xlsx / 预设卡-{item['name']}" for item in pregens}
        add_index(wb, pregens, locations)
        for pregen in pregens:
            add_pregen_sheet(wb, pregen)
        out.parent.mkdir(parents=True, exist_ok=True)
        wb.save(out)
        files.append(str(out))
    else:
        directory = out.parent / "pregens"
        directory.mkdir(parents=True, exist_ok=True)
        if out.exists():
            out.unlink()
        index_wb = Workbook()
        locations = {}
        for number, pregen in enumerate(pregens, start=1):
            filename = f"{number:02d}-{sanitize(pregen['name'], 'pregen')}.xlsx"
            wb = Workbook()
            add_pregen_sheet(wb, pregen)
            wb.save(directory / filename)
            locations[pregen["id"]] = f"out/pregens/{filename}"
            files.append(str(directory / filename))
        add_index(index_wb, pregens, locations)
        index_wb.save(directory / "INDEX.xlsx")
        files.insert(0, str(directory / "INDEX.xlsx"))
    summary = {
        "schemaVersion": SCHEMA_VERSION,
        "ok": True,
        "count": len(pregens),
        "mode": "single" if len(pregens) <= MAX_SINGLE_WORKBOOK else "multiple",
        "files": files,
        "pregens": [{"id": item["id"], "name": item["name"], "kind": item["kind"], "missing": item["missing"]} for item in pregens],
    }
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description="预设卡检测/生成")
    sub = parser.add_subparsers(dest="command", required=True)
    detect_cmd = sub.add_parser("detect")
    detect_cmd.add_argument("--source", type=Path, default=Path("work/source.json"))
    detect_cmd.add_argument("--out", type=Path, default=Path("work/pregen-candidates.json"))
    detect_cmd.add_argument("--lang", default="de")
    build_cmd = sub.add_parser("build")
    build_cmd.add_argument("--data", type=Path, default=Path("work/pregens.json"))
    build_cmd.add_argument("--out", type=Path, default=Path("out/pregens.xlsx"))
    build_cmd.add_argument("--summary", type=Path, default=Path("out/PREGEN-QA.json"))
    args = parser.parse_args()
    if args.command == "detect":
        source = read_json(args.source, {})
        result = detect(source, args.lang)
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"OK：{args.out}（候选章节 {len(result['candidates'])}）")
        return 0
    data = read_json(args.data, {})
    try:
        summary = build(data, args.out)
    except Exception as error:  # noqa: BLE001
        print(f"FAIL：{error}", file=sys.stderr)
        return 1
    args.summary.parent.mkdir(parents=True, exist_ok=True)
    args.summary.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"OK：{summary['count']} 张预设卡，{summary['mode']}，{len(summary['files'])} 个文件")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

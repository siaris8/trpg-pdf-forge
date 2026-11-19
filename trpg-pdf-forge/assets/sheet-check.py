#!/usr/bin/env python
"""Validate an Excel character sheet: layout first, formulas optional."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from reportpath import display

from openpyxl import load_workbook

REQUIRED_SHEETS = ["说明", "车卡步骤", "人物卡", "资源", "技能", "武器", "规则数据"]
REQUIRED_NAMES = [
    "PC_Name", "HP_Current", "HP_Max", "Points_Total", "Points_Used", "Points_Left",
    "Steps_Done", "Steps_Total",
]
MIN_STEPS = 3
MIN_RESOURCES = 2
LAYOUT_VERSION = 3
LAYOUT_SHEETS = ["说明", "车卡步骤", "人物卡", "资源", "技能", "武器", "法术能力"]
GRID_WIDTH = 13.5
GRID_TOLERANCE = 0.6


def is_dark(cell) -> bool:
    try:
        rgb = str(cell.fill.fgColor.rgb or "")
        return rgb not in ("", "00000000", "None")
    except Exception:  # noqa: BLE001
        return False


def check_layout(wb) -> tuple[list[str], dict]:
    issues: list[str] = []
    details = {}
    for name in LAYOUT_SHEETS:
        if name not in wb.sheetnames:
            continue
        ws = wb[name]
        sheet_issues: list[str] = []
        merged = {str(item) for item in ws.merged_cells.ranges}
        if "A1:H2" not in merged:
            sheet_issues.append("标题未合并 A1:H2")
        if not ws.print_area:
            sheet_issues.append("未设置 print_area")
        if ws.sheet_view.showGridLines is not False:
            sheet_issues.append("网格线未关闭")
        if not ws.freeze_panes:
            sheet_issues.append("未冻结表头")
        if ws.page_setup.fitToWidth != 1:
            sheet_issues.append("fitToWidth 不是 1")
        if str(ws.page_setup.paperSize) not in ("9", "9.0"):
            sheet_issues.append("纸张不是 A4")
        if str(ws.page_setup.orientation or "portrait") != "portrait":
            sheet_issues.append("不是纵向")
        if not ws.print_options.horizontalCentered:
            sheet_issues.append("未水平居中")
        if not (0.3 <= float(ws.page_margins.left or 0) <= 0.5):
            sheet_issues.append("左边距不在 0.3–0.5")
        if not (0.3 <= float(ws.page_margins.right or 0) <= 0.5):
            sheet_issues.append("右边距不在 0.3–0.5")
        if (ws.row_dimensions[1].height or 0) < 26:
            sheet_issues.append("标题行高不足 26")
        if (ws.row_dimensions[4].height or 0) < 22:
            sheet_issues.append("分区行高不足 22")
        if (ws["A1"].font.sz or 0) < 16:
            sheet_issues.append("标题字号不足 16")
        if not is_dark(ws.cell(row=4, column=1)):
            sheet_issues.append("分区/表头缺少深色填充")
        widths = []
        for col in "ABCDEFGH":
            width = ws.column_dimensions[col].width
            if not width:
                sheet_issues.append(f"{col} 列宽未设置")
            elif not (11 <= width <= 17):
                sheet_issues.append(f"{col} 列宽不在 11–17")
            else:
                widths.append(round(width, 1))
        if widths and max(widths) - min(widths) > GRID_TOLERANCE:
            sheet_issues.append("A–H 列宽不等（不是 8 等分方格）")
        row_heights = []
        for row in range(5, ws.max_row + 1):
            values = [cell.value for cell in ws[row]]
            if not any(value is not None for value in values):
                continue
            height = ws.row_dimensions[row].height or 0
            row_heights.append(round(height, 1))
            if height and not (20 <= height <= 34):
                sheet_issues.append(f"第 {row} 行行高不在 20–34")
        details[name] = {
            "merged": sorted(merged),
            "printArea": str(ws.print_area or ""),
            "freeze": str(ws.freeze_panes or ""),
            "widths": widths,
            "rowHeights": row_heights,
            "pageSize": str(ws.page_setup.paperSize or ""),
            "margins": [float(ws.page_margins.left or 0), float(ws.page_margins.right or 0)],
            "gridlines": ws.sheet_view.showGridLines,
        }
        issues.extend(f"{name}: {item}" for item in sheet_issues)
    return issues, details


def check_pregen_layout(ws) -> list[str]:
    issues = []
    merged = {str(item) for item in ws.merged_cells.ranges}
    if "A1:H2" not in merged:
        issues.append("标题未合并 A1:H2")
    if not ws.print_area:
        issues.append("未设置 print_area")
    if ws.sheet_view.showGridLines is not False:
        issues.append("网格线未关闭")
    if not ws.freeze_panes:
        issues.append("未冻结表头")
    widths = []
    for col in "ABCDEFGH":
        width = ws.column_dimensions[col].width
        if not width or not (11 <= width <= 17):
            issues.append(f"{col} 列宽不在 11–17")
        else:
            widths.append(round(width, 1))
    if widths and max(widths) - min(widths) > GRID_TOLERANCE:
        issues.append("A–H 列宽不等")
    if (ws.row_dimensions[1].height or 0) < 26:
        issues.append("标题行高不足 26")
    if (ws["A1"].font.sz or 0) < 16:
        issues.append("标题字号不足 16")
    if not is_dark(ws.cell(row=4, column=1)):
        issues.append("分区/表头缺少深色填充")
    return issues


def inspect_pregens(root: Path) -> dict:
    data_path = root / "work" / "pregens.json"
    data = json.loads(data_path.read_text(encoding="utf-8-sig")) if data_path.exists() else {}
    expected = data.get("pregens") if isinstance(data.get("pregens"), list) else []
    candidates_path = root / "work" / "pregen-candidates.json"
    candidates = []
    if candidates_path.exists():
        try:
            candidates = json.loads(candidates_path.read_text(encoding="utf-8-sig")).get("candidates") or []
        except Exception:  # noqa: BLE001
            candidates = []
    if candidates and not expected:
        return {"ok": False, "count": 0, "files": [], "errors": ["检测到预设角色章节，但 work/pregens.json 为空；请逐张提取或说明为何无预设卡"], "warnings": []}
    single = root / "out" / "pregens.xlsx"
    directory = root / "out" / "pregens"
    files: list[Path] = []
    if single.exists():
        files = [single]
        index = single
    elif (directory / "INDEX.xlsx").exists():
        index = directory / "INDEX.xlsx"
        files = [index] + sorted(item for item in directory.glob("*.xlsx") if item.name != "INDEX.xlsx")
    elif expected:
        return {"ok": False, "count": 0, "files": [], "errors": [f"work/pregens.json 有 {len(expected)} 张卡，但没有 out/pregens.xlsx 或 out/pregens/INDEX.xlsx"], "warnings": []}
    else:
        return {"ok": True, "count": 0, "files": [], "errors": [], "warnings": ["没有预设卡文件"], "skipped": True}

    errors: list[str] = []
    warnings: list[str] = []
    names: list[str] = []
    try:
        index_wb = load_workbook(index, data_only=False)
    except Exception as error:  # noqa: BLE001
        return {"ok": False, "count": 0, "files": [str(item) for item in files], "errors": [f"索引无法打开：{error}"], "warnings": []}
    if "预设卡索引" not in index_wb.sheetnames:
        errors.append("预设卡索引缺少 sheet：预设卡索引")
    else:
        index_ws = index_wb["预设卡索引"]
        if str(index_ws["A4"].value or "") != "编号":
            errors.append("预设卡索引 A4 不是“编号”")
    for file in files:
        try:
            wb = load_workbook(file, data_only=False)
        except Exception as error:  # noqa: BLE001
            errors.append(f"{file.name} 无法打开：{error}")
            continue
        for ws in wb.worksheets:
            if not ws.title.startswith("预设卡-"):
                if file == single and ws.title == "预设卡索引":
                    continue
                warnings.append(f"{file.name} 有非预设卡 sheet：{ws.title}")
                continue
            names.append(ws.title)
            for issue in check_pregen_layout(ws):
                errors.append(f"{ws.title}: {issue}")
            if "预设角色" not in str(ws["A1"].value or ""):
                errors.append(f"{ws.title}: 标题缺少“预设角色”标记")
    if expected and len(names) < len(expected):
        errors.append(f"预设卡数量不一致：work/pregens.json {len(expected)}，工作簿 {len(names)}")
    if len(names) != len(set(names)):
        errors.append("预设卡 sheet 名称重复")
    return {
        "ok": not errors,
        "count": len(names),
        "expected": len(expected),
        "files": [str(item) for item in files],
        "sheets": names,
        "errors": errors,
        "warnings": warnings,
    }


def inspect(path: Path, plan_path: Path) -> dict:
    plan = json.loads(plan_path.read_text(encoding="utf-8-sig")) if plan_path.exists() else {}
    wb = load_workbook(path, data_only=False)
    sheets = wb.sheetnames
    formulas: list[dict] = []
    data_validations = 0
    for ws in wb.worksheets:
        data_validations += len(ws.data_validations.dataValidation)
        for row in ws.iter_rows():
            for cell in row:
                if isinstance(cell.value, str) and cell.value.startswith("="):
                    formulas.append({"sheet": ws.title, "cell": cell.coordinate, "formula": cell.value})
    names = list(wb.defined_names.keys())
    errors: list[str] = []
    required_missing = [name for name in REQUIRED_SHEETS if name not in sheets]
    if required_missing:
        errors.append(f"缺少 sheet：{', '.join(required_missing)}")
    missing_names = [name for name in REQUIRED_NAMES if name not in names]
    if missing_names:
        errors.append(f"缺少命名区域：{', '.join(missing_names)}")
    steps = plan.get("steps") if isinstance(plan.get("steps"), list) else []
    resources = plan.get("resources") if isinstance(plan.get("resources"), list) else []
    if len(steps) < MIN_STEPS:
        errors.append(f"车卡步骤不足：{len(steps)} < {MIN_STEPS}")
    if len(resources) < MIN_RESOURCES:
        errors.append(f"资源不足：{len(resources)} < {MIN_RESOURCES}")
    bad_formulas = [item for item in formulas if "#REF!" in item["formula"] or "#VALUE!" in item["formula"]]
    if bad_formulas:
        errors.append(f"公式包含错误引用：{len(bad_formulas)} 个")
    if formulas and getattr(wb.calculation, "fullCalcOnLoad", False) is not True:
        errors.append("有公式，但 workbook.calculation.fullCalcOnLoad 未设置为 True")
    if path.suffix.lower() != ".xlsx":
        errors.append("输出必须是 .xlsx（不支持宏）")
    layout_issues, layout_details = check_layout(wb)
    errors.extend(layout_issues)
    result = {
        "ok": not errors,
        "layoutVersion": LAYOUT_VERSION,
        "layoutScore": max(0, 100 - len(layout_issues) * 4),
        "layoutIssues": layout_issues,
        "layout": layout_details,
        "file": display(path),
        "sheets": sheets,
        "formulas": len(formulas),
        "formulaOptional": True,
        "formulaItems": formulas[:200],
        "namedRanges": names,
        "dataValidations": data_validations,
        "steps": len(steps),
        "resources": len(resources),
        "fullCalcOnLoad": bool(getattr(wb.calculation, "fullCalcOnLoad", False)),
        "calculated": False,
        "calculationNote": "openpyxl 不计算公式；Excel/WPS 打开时由 fullCalcOnLoad 重算。",
        "ambiguities": plan.get("ambiguities") or [],
        "errors": errors,
    }
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="检查 Excel 人物卡/预设卡版式与结构")
    parser.add_argument("xlsx", nargs="?", type=Path)
    parser.add_argument("--plan", type=Path, default=Path("work/sheet-plan.json"))
    parser.add_argument("--json", type=Path, default=None)
    parser.add_argument("--mode", choices=["base", "pregens", "all"], default="base")
    parser.add_argument("--root", type=Path, default=Path("."))
    args = parser.parse_args()
    root = args.root.resolve()
    base = None
    if args.mode in {"base", "all"}:
        workbook = args.xlsx or Path("out/character-sheet.xlsx")
        if not workbook.is_absolute():
            workbook = root / workbook
        if not workbook.exists():
            print(f"找不到工作簿：{workbook}", file=sys.stderr)
            return 2
        try:
            base = inspect(workbook, args.plan if args.plan.is_absolute() else root / args.plan)
        except Exception as error:  # noqa: BLE001
            print(f"检查失败：{error}", file=sys.stderr)
            return 2
    pregens = inspect_pregens(root) if args.mode in {"pregens", "all"} else None
    if args.mode == "pregens":
        result = pregens
    elif args.mode == "all":
        result = {
            **base,
            "schemaVersion": 2,
            "mode": "all",
            "base": base,
            "pregens": pregens,
            "ok": bool(base.get("ok") and pregens.get("ok")),
            "errors": list(base.get("errors") or []) + list(pregens.get("errors") or []),
        }
    else:
        result = {**base, "schemaVersion": 2, "mode": "base", "base": base}
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if not result["ok"]:
        print("\nFAIL：" + "；".join(result.get("errors") or []), file=sys.stderr)
        return 1
    if args.mode == "pregens":
        print(f"\nOK：预设卡 {result['count']} 张，{len(result['files'])} 个文件。")
    else:
        print(f"\nOK：版式 {result['layoutScore']} 分，{result['formulas']} 个公式（可选），{result['steps']} 个步骤。")
        if pregens:
            print(f"预设卡：{pregens['count']} 张，{len(pregens['files'])} 个文件。")
    return 0


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass
    raise SystemExit(main())

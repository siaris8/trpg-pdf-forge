from pathlib import Path
from openpyxl import Workbook
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule
from sheet_style import (
    BORDER, CALC, CENTER, GOLD, INK, INPUT, LEFT, MUTED, NAVY, PAPER, RED,
    font, fill, title, section, table_header, data_row, setup, note, label_value,
)

HERE = Path(__file__).resolve().parent
OUT = HERE / "sheet-demo.xlsx"
PLAN = HERE / "sheet-demo-plan.json"

wb = Workbook()
wb.calculation.fullCalcOnLoad = True
wb.properties.title = "Excel 人物卡示例"
wb.properties.creator = "TRPG 翻译工坊"

# 说明
info = wb.active
info.title = "说明"
setup(info, "A1:H18", freeze="A5", tab=GOLD)
title(info, "钟表守卫 · Excel 人物卡", "H", "一张可以自己算、也可以只填数值的人物卡。BETA 示例。")
section(info, 4, "三步开始")
blocks = [
    ("01", "填人物", "在「人物卡」填姓名、职阶、属性。"),
    ("02", "配资源", "在「资源」填当前值；上限可公式，也可直接填。"),
    ("03", "走步骤", "在「车卡步骤」把完成列改成「完成」。"),
]
for i, (num, head, body) in enumerate(blocks):
    start = 1 + i * 3
    info.merge_cells(start_row=5, start_column=start, end_row=5, end_column=start + 1)
    info.merge_cells(start_row=6, start_column=start, end_row=7, end_column=start + 1)
    c = info.cell(row=5, column=start, value=f"{num}  {head}")
    c.font = font(11, True, PAPER); c.fill = fill(NAVY); c.alignment = LEFT; c.border = BORDER
    c = info.cell(row=6, column=start, value=body)
    c.font = font(10, False, INK); c.fill = fill(INPUT); c.alignment = LEFT; c.border = BORDER
    for row in (5, 6, 7):
        for col in range(start, start + 2):
            info.cell(row=row, column=col).border = BORDER
    info.row_dimensions[6].height = 30
    info.row_dimensions[7].height = 30
section(info, 9, "颜色含义")
legend = [("输入格", "FBF6EA", "你来填"), ("计算格", "E9E4D8", "公式或自动值"), ("表头", "18212B", "不要改文字")]
for i, (label, color, desc) in enumerate(legend):
    row = 10 + i
    info.cell(row=row, column=1, value="").fill = fill(color)
    info.cell(row=row, column=1).border = BORDER
    info.merge_cells(start_row=row, start_column=2, end_row=row, end_column=4)
    c = info.cell(row=row, column=2, value=label); c.font = font(10, True, INK); c.alignment = LEFT
    info.merge_cells(start_row=row, start_column=5, end_row=row, end_column=8)
    c = info.cell(row=row, column=5, value=desc); c.font = font(10, False, MUTED); c.alignment = LEFT
    info.row_dimensions[row].height = 24
section(info, 14, "重算与规则")
note(info, 15, "公式由 Excel/WPS 打开时重算；openpyxl 只写公式，不缓存结果。")
note(info, 16, "本示例沿用 FIST 风格；你的规则不同，Agent 会按源文重写字段与步骤。")
note(info, 17, "带 [待确认] 的字段不是定论，请对照原书/译文。")

# 车卡步骤
steps = wb.create_sheet("车卡步骤")
setup(steps, "A1:H10", freeze="A5", tab=RED)
title(steps, "车卡步骤", "H", "按顺序做；完成列用下拉。")
table_header(steps, 4, ["序号", "步骤", "操作", "前置", "消耗", "完成", "备注", "标记"])
step_rows = [
    (1, "选职阶", "选择「钟表守卫」", "无", "0", "完成", "示例", ""),
    (2, "分配属性", "8 点分配到 4 项属性", "选职阶", "8 点", "完成", "每项 1–4", ""),
    (3, "选武器", "左轮或钟表钥匙", "分配属性", "2 点", "未完成", "可改", ""),
]
for i, values in enumerate(step_rows, start=5):
    data_row(steps, i, list(values), height=26)
    steps.cell(row=i, column=1).alignment = CENTER
    steps.cell(row=i, column=6).alignment = CENTER
steps.merge_cells("A8:F8")
steps["A8"] = "完成数"
steps["A8"].font = font(10.5, True, MUTED); steps["A8"].fill = fill(PAPER); steps["A8"].alignment = LEFT; steps["A8"].border = BORDER
steps["G8"] = "=COUNTIF(F5:F7,\"完成\")"
steps["G8"].font = font(11, True, INK); steps["G8"].fill = fill(CALC); steps["G8"].alignment = CENTER; steps["G8"].border = BORDER
steps.merge_cells("A9:F9")
steps["A9"] = "总步骤"
steps["A9"].font = font(10.5, True, MUTED); steps["A9"].fill = fill(PAPER); steps["A9"].alignment = LEFT; steps["A9"].border = BORDER
steps["G9"] = "=COUNTA(B5:B7)"
steps["G9"].font = font(11, True, INK); steps["G9"].fill = fill(CALC); steps["G9"].alignment = CENTER; steps["G9"].border = BORDER
steps.merge_cells("A10:F10")
steps["A10"] = "车卡进度"
steps["A10"].font = font(11, True, PAPER); steps["A10"].fill = fill(NAVY); steps["A10"].alignment = LEFT; steps["A10"].border = BORDER
steps["G10"] = "=G8&\" / \"&G9"
steps["G10"].font = font(11, True, RED); steps["G10"].fill = fill(PAPER); steps["G10"].alignment = CENTER; steps["G10"].border = BORDER
dv = DataValidation(type="list", formula1='"未完成,完成"', allow_blank=False)
steps.add_data_validation(dv)
dv.add("F5:F7")
steps.conditional_formatting.add("F5:F7", CellIsRule(operator="equal", formula=['"完成"'], fill=fill("DDEBD8")))
steps.conditional_formatting.add("F5:F7", CellIsRule(operator="notEqual", formula=['"完成"'], fill=fill("F6DAD4")))

# 人物卡
pc = wb.create_sheet("人物卡")
setup(pc, "A1:H28", freeze="A5", tab=NAVY)
title(pc, "人物卡", "H", "先填姓名和属性；资源在「资源」页。")
section(pc, 4, "身份")
label_value(pc, 5, [("姓名", "钟表守卫", 1, 2), ("职阶", "调查员", 1, 1), ("等级", 3, 1, 1)])
label_value(pc, 6, [("玩家", "", 1, 2), ("所属", "天文台", 1, 1), ("经验", 0, 1, 1)])
section(pc, 8, "属性")
table_header(pc, 9, ["属性", "数值", "修正", "说明"])
attrs = [
    ("强横 FRC", 3, "=B10-3", "力量/耐久"),
    ("战术 TAC", 2, "=B11-3", "战斗/指挥"),
    ("创造 CRE", 4, "=B12-3", "灵感/机械"),
    ("感知 PER", 2, "=B13-3", "侦查/直觉"),
]
for i, (name, value, mod, desc) in enumerate(attrs, start=10):
    data_row(pc, i, [name, value, mod, desc], calc_columns=(3,), height=25)
    pc.cell(row=i, column=2).alignment = CENTER
    pc.cell(row=i, column=3).alignment = CENTER
pc.merge_cells("F9:G9")
pc["F9"] = "点数"
pc["F9"].font = font(10.5, True, PAPER); pc["F9"].fill = fill(NAVY); pc["F9"].alignment = CENTER; pc["F9"].border = BORDER
pc["F10"] = "总额"; pc["G10"] = 12
pc["F11"] = "已用"; pc["G11"] = "=SUM(B10:B13)"
pc["F12"] = "剩余"; pc["G12"] = "=G10-G11"
for row in (10, 11, 12):
    pc[f"F{row}"].font = font(10.5, True, MUTED); pc[f"F{row}"].fill = fill(PAPER); pc[f"F{row}"].border = BORDER; pc[f"F{row}"].alignment = LEFT
    pc[f"G{row}"].font = font(10.5, True, INK); pc[f"G{row}"].fill = fill(CALC); pc[f"G{row}"].border = BORDER; pc[f"G{row}"].alignment = CENTER
section(pc, 15, "资源摘要")
table_header(pc, 16, ["资源", "当前", "上限", "恢复"])
res_summary = [("生命 HP", "=HP_Current", "=HP_Max", "长休"), ("意志 WILL", "=Will_Current", "=Will_Max", "短休")]
for i, values in enumerate(res_summary, start=17):
    data_row(pc, i, list(values), calc_columns=(2, 3), height=24)
    for col in (2, 3):
        pc.cell(row=i, column=col).alignment = CENTER
pc.merge_cells("F16:H16")
pc["F16"] = "当前状态"
pc["F16"].font = font(10.5, True, PAPER); pc["F16"].fill = fill(NAVY); pc["F16"].alignment = CENTER; pc["F16"].border = BORDER
pc.merge_cells("F17:H17")
pc["F17"] = "正常"
pc["F17"].font = font(10.5, False, INK); pc["F17"].fill = fill(INPUT); pc["F17"].alignment = CENTER; pc["F17"].border = BORDER
pc.merge_cells("F18:H18")
pc["F18"] = "待确认：无"
pc["F18"].font = font(9, False, MUTED); pc["F18"].fill = fill(PAPER); pc["F18"].alignment = CENTER; pc["F18"].border = BORDER
section(pc, 20, "技能 / 武器摘要")
table_header(pc, 21, ["名称", "类型", "总值 / 伤害", "备注"])
summary = [("射击", "技能", "=技能!E5", "远程"), ("侦查", "技能", "=技能!E6", "探索"), ("左轮手枪", "武器", "=武器!B5", "2D6"), ("钟表钥匙", "武器", "=武器!B6", "D6")]
for i, values in enumerate(summary, start=22):
    data_row(pc, i, list(values), calc_columns=(3,), height=24)
    pc.cell(row=i, column=3).alignment = CENTER
pc.merge_cells("F21:H21")
pc["F21"] = "线索 / 备注"
pc["F21"].font = font(10.5, True, PAPER); pc["F21"].fill = fill(NAVY); pc["F21"].alignment = CENTER; pc["F21"].border = BORDER
pc.merge_cells("F22:H25")
pc["F22"] = "钟表不是陷阱，房间才是。\n手写备注写在这里，不覆盖公式格。"
pc["F22"].font = font(10, False, INK); pc["F22"].fill = fill(INPUT); pc["F22"].alignment = LEFT; pc["F22"].border = BORDER
note(pc, 27, "备注：手写内容请写在「说明」或本页底部；不要覆盖公式格。")

# 资源
res = wb.create_sheet("资源")
setup(res, "A1:H10", freeze="A5", tab=GOLD)
title(res, "资源", "H", "当前值可改；上限可公式，也可直接填。")
table_header(res, 4, ["资源", "类型", "当前", "上限", "恢复", "备注", "标记", ""])
res_rows = [("生命 HP", "生存", 12, "=10+人物卡!B10*2", "长休", "归零即倒下", "", ""), ("意志 WILL", "精神", 4, "=4+人物卡!B12", "短休", "法术/意志", "", ""), ("弹药", "消耗", 6, 6, "补给", "左轮", "", "")]
for i, values in enumerate(res_rows, start=5):
    data_row(res, i, list(values), calc_columns=(4,), height=25)
    for col in (3, 4):
        res.cell(row=i, column=col).alignment = CENTER
res["A8"] = "合计"
res["C8"] = "=SUM(C5:C7)"
res["D8"] = "=SUM(D5:D7)"
for col in range(1, 9):
    cell = res.cell(row=8, column=col)
    cell.font = font(10.5, True, PAPER); cell.fill = fill(NAVY); cell.border = BORDER; cell.alignment = CENTER
res.conditional_formatting.add("C5:C7", CellIsRule(operator="lessThan", formula=["0"], fill=fill("F6DAD4")))

# 技能
skills = wb.create_sheet("技能")
setup(skills, "A1:H15", freeze="A5", tab=GOLD)
title(skills, "技能", "H", "总值 = 基础 + 加点 + 属性修正。")
table_header(skills, 4, ["技能", "属性", "基础", "加点", "总值", "消耗", "备注", "标记"])
skill_rows = [("射击", "TAC", 2, 2, "=C5+D5+人物卡!C11", 1, "远程", ""), ("侦查", "PER", 2, 1, "=C6+D6+人物卡!C13", 1, "探索", ""), ("机械", "CRE", 2, 1, "=C7+D7+人物卡!C12", 1, "修理", "")]
for i, values in enumerate(skill_rows, start=5):
    data_row(skills, i, list(values), calc_columns=(5,), height=25)
    for col in (3, 4, 5, 6):
        skills.cell(row=i, column=col).alignment = CENTER
skills["A8"] = "技能总点"
skills["E8"] = "=SUM(E5:E7)"
for col in range(1, 9):
    cell = skills.cell(row=8, column=col)
    cell.font = font(10.5, True, PAPER); cell.fill = fill(NAVY); cell.border = BORDER; cell.alignment = CENTER

# 武器
weapons = wb.create_sheet("武器")
setup(weapons, "A1:H9", freeze="A5", tab=RED)
title(weapons, "武器", "H", "特性写短句；长规则写在「说明」页。")
table_header(weapons, 4, ["名称", "伤害", "射程", "弹药", "特性", "重量", "攻击值", "备注"])
weapon_rows = [("左轮手枪", "2D6", 12, 6, "响亮；装填 2", 1, "=技能!E5", ""), ("钟表钥匙", "D6", "接触", "—", "能打开一扇错误之门", 0, "=人物卡!C12", "")]
for i, values in enumerate(weapon_rows, start=5):
    data_row(weapons, i, list(values), calc_columns=(7,), height=26)
    for col in (3, 4, 5, 7):
        weapons.cell(row=i, column=col).alignment = CENTER
    weapons.cell(row=i, column=6).alignment = CENTER

# 法术能力
spells = wb.create_sheet("法术能力")
setup(spells, "A1:H6", freeze="A5", tab=GOLD)
title(spells, "法术 / 能力", "H", "消耗、时间、射程、效果。")
table_header(spells, 4, ["名称", "消耗", "时间", "射程", "成分/持续", "效果", "持续", "备注"])
spell_rows = [("秒针", "1 意志", "即时", "近距", "手势 / 1 轮", "让一座钟停 1 轮。", "", ""), ("错误之门", "2 意志", "1 轮", "自身", "钥匙 / 瞬时", "选一个出口；它总是错的。", "", "")]
for i, values in enumerate(spell_rows, start=5):
    data_row(spells, i, list(values), height=26)
    for col in (2, 3, 4, 5):
        spells.cell(row=i, column=col).alignment = CENTER

# 规则数据
rules = wb.create_sheet("规则数据")
rules["A1"] = "属性成本"
rules["A2"], rules["B2"] = 1, 1
rules["A3"], rules["B3"] = 2, 2
rules["A4"], rules["B4"] = 3, 3
rules["A5"], rules["B5"] = 4, 4
rules["D1"] = "技能基础"
rules["D2"], rules["E2"] = "射击", 2
rules["D3"], rules["E3"] = "侦查", 2
rules["D4"], rules["E4"] = "机械", 2
rules.sheet_state = "hidden"

names = {
    "PC_Name": "'人物卡'!$C$5",
    "HP_Current": "'资源'!$C$5",
    "HP_Max": "'资源'!$D$5",
    "Will_Current": "'资源'!$C$6",
    "Will_Max": "'资源'!$D$6",
    "Points_Total": "'人物卡'!$G$10",
    "Points_Used": "'人物卡'!$G$11",
    "Points_Left": "'人物卡'!$G$12",
    "Steps_Done": "'车卡步骤'!$G$8",
    "Steps_Total": "'车卡步骤'!$G$9",
}
for name, ref in names.items():
    wb.defined_names.add(DefinedName(name, attr_text=ref))

wb.active = wb.sheetnames.index("人物卡")
wb.save(OUT)
PLAN.write_text("""
{
  "system": "FIST / 示例",
  "sourcePages": [14, 15],
  "attributes": [
    {"id": "frc", "label": "强横", "min": 1, "max": 4, "default": 3},
    {"id": "tac", "label": "战术", "min": 1, "max": 4, "default": 2},
    {"id": "cre", "label": "创造", "min": 1, "max": 4, "default": 4},
    {"id": "per", "label": "感知", "min": 1, "max": 4, "default": 2}
  ],
  "resources": [
    {"id": "hp", "label": "生命", "maxFormula": "=10+FRC*2"},
    {"id": "will", "label": "意志", "maxFormula": "=4+CRE"}
  ],
  "steps": [
    {"no": 1, "title": "选职阶"},
    {"no": 2, "title": "分配属性"},
    {"no": 3, "title": "选武器"}
  ],
  "ambiguities": ["示例数据，不是完整规则"]
}
""".strip() + "\n", encoding="utf-8")
print(OUT)
print(PLAN)

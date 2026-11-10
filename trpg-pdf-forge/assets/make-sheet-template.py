"""Create the blank, pre-styled character-sheet template from the demo layout."""
from pathlib import Path
from openpyxl import load_workbook
from openpyxl.cell.cell import MergedCell

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "sheet-demo.xlsx"
OUT = HERE / "sheet-template.xlsx"


def clear(ws, row, col):
    cell = ws.cell(row=row, column=col)
    if not isinstance(cell, MergedCell):
        cell.value = None


def clear_grid(ws, rows, cols):
    for row in rows:
        for col in cols:
            clear(ws, row, col)


wb = load_workbook(SOURCE, data_only=False)
wb.properties.title = "Excel 人物卡模板"
wb.properties.creator = "TRPG 翻译工坊"

info = wb["说明"]
info["A1"] = "Excel 人物卡模板"
info["A3"] = "先复制本文件，再把 [待填写] 换成你的规则数据；不要从空白工作簿重排。"

people = wb["人物卡"]
clear_grid(people, (5, 6), range(2, 9))
clear_grid(people, range(10, 14), (2, 3))
clear_grid(people, (10, 11, 12), (7,))
clear_grid(people, (17, 18), range(2, 5))
clear_grid(people, range(22, 26), range(2, 5))
people["F18"] = "待填写"

steps = wb["车卡步骤"]
clear_grid(steps, range(5, 8), range(2, 8))
for cell in ("G8", "G9", "G10"):
    steps[cell].value = None

resources = wb["资源"]
clear_grid(resources, range(5, 8), range(2, 7))
resources["C8"] = None
resources["D8"] = None

skills = wb["技能"]
clear_grid(skills, range(5, 8), range(2, 8))
skills["E8"] = None

weapons = wb["武器"]
clear_grid(weapons, range(5, 7), range(2, 8))

spells = wb["法术能力"]
clear_grid(spells, range(5, 7), range(2, 7))

wb.active = wb.sheetnames.index("人物卡")
wb.save(OUT)
print(OUT)

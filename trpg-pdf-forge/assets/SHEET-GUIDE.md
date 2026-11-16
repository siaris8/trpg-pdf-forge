# Excel 人物卡指南

这是一个**独立于 PDF 翻译**的实验项目：把规则/译文分析成可自行计算的 `.xlsx`。**版式优先，公式可选。**

## 1. 工作簿结构

必备：

- `说明`：使用方法、规则系统、颜色含义、重算提示
- `车卡步骤`：步骤、前置、消耗、完成状态、进度
- `人物卡`：身份、属性、衍生值、资源/技能摘要
- `资源`：HP/MP/SAN/弹药/货币等，当前/上限/恢复
- `技能`：基础、加点、总值、消耗
- `武器`：伤害、射程、弹药、特性、重量
- `规则数据`：隐藏的查找表、点数成本、步骤定义

可选：`法术能力`、`原文对照`。

## 2. 版式强制规则

- 每个主 sheet 的标题必须 `A1:H2` 合并。
- 标题深蓝底、纸色 18 pt；分区标题深蓝底、纸色 11.5 pt。
- 表头深蓝底、纸色 10.5 pt；输入格 `FBF6EA`，计算格 `E9E4D8`。
- 数据行行高 24；文本列 `wrap_text=True`。
- **8 列等分方格**：A–H 列宽统一 13.5（±0.5）；数据行高 24/26；标题 A1:H2、分区 A4:H4。
- 面板按 8 列对齐；长文本用换行，不要用超宽单列塞大段文字；每个可见 sheet 的 A–H 都应有用途，不留大片空列。
- 关闭网格线，设置 `print_area`，`fitToWidth=1`，A4 纵向，水平居中，页边距 0.35。
- 数据表冻结表头；不要留大片空表或空白行。
- 优先从 `.trpg/sheet-template.xlsx` 复制，不要从空白工作簿重排。

## 3. 命名区域

用 ASCII 名称，界面标签保持中文：

| 名称 | 用途 |
|---|---|
| `PC_Name` | 人物名 |
| `HP_Current` / `HP_Max` | 生命当前/上限 |
| `Will_Current` / `Will_Max` | 意志当前/上限 |
| `Points_Total` / `Points_Used` / `Points_Left` | 点数 |
| `Steps_Done` / `Steps_Total` | 车卡步骤进度 |

至少 5 个命名区域；关键资源、属性、技能、武器字段都要可引用。

## 4. 公式

- **公式可选**：先保证版式可读，再考虑计算。
- 用 `SUM`、`IF`、`MIN`、`MAX`、`ROUND`、`VLOOKUP`、`INDEX`、`MATCH`、`COUNTIF`。
- 避免 `XLOOKUP`、`INDIRECT`、`OFFSET` 等兼容性风险。
- 有公式时设置 `wb.calculation.fullCalcOnLoad = True`；没有公式也允许。
- 例：
  - 属性总点 `=SUM(人物卡!B10:B13)`
  - 剩余点 `=Points_Total-Points_Used`
  - HP 上限 `=10+FRC*2`
  - 技能总值 `=基础+加点+修正`
  - 步骤进度 `=Steps_Done&" / "&Steps_Total`

## 5. 车卡步骤

推荐列：`序号 / 步骤 / 操作 / 前置 / 消耗 / 完成 / 备注`。

- `完成` 用数据验证下拉：`未完成`、`完成`。
- 进度用 `COUNTIF` / `COUNTA`。
- 步骤不要写成一段散文；每步一行，前置条件可引用其他步骤。
- 空白步骤行不要加条件格式，避免出现大片红/绿块。

## 6. 数据验证与格式

- 属性范围、技能、武器、法术用下拉列表引用 `规则数据`。
- 超点/资源为负用条件格式标红。
- 不写宏，不写外部链接，不生成 `.xlsm`。

## 7. 分析不足时

源规则没有给出数值/公式时：

- 生成可用骨架；
- 字段标 `[待确认]`；
- 在 `work/sheet-plan.json` 的 `ambiguities` 和 `SHEET-REPORT.md` 写明；
- 不编造规则。

## 8. 检查

```powershell
node .trpg/run-python.mjs .trpg/sheet-check.py out/character-sheet.xlsx --plan work/sheet-plan.json --json out/SHEET-QA.json
```

`SHEET-QA.json` 必须 `ok:true`，否则不能通过审核。检查重点是版式/结构；公式只统计，不强制。

## 预设卡（Quickstart / 模组）

如果源书有已经填好的预设角色，必须和空白车卡分开：

- 基础卡仍是 `out/character-sheet.xlsx`，`人物卡` 保持空白/可填；
- 预设卡写到 `out/pregens.xlsx`（≤8 张）或 `out/pregens/` + `INDEX.xlsx`（>8 张）；
- 索引区分 `pregen-pc` / `npc`；原型模板不是预设卡；
- 详细字段、检测和生成命令见 `.trpg/PREGEN-GUIDE.md`；
- `sheet-check.py --mode all` 同时检查 base 和 pregens。

## 德语源

德语原文 → 中文时：

- `sourceLang=de`、`targetLang=zh-CN`；
- 保留 `ä ö ü ß`，不要用 ae/oe/ue/ss 替换（除非术语表明确要求）；
- 德语引号 `„ “ ‚ ‘` 只出现在原文对照，中文译文用中文标点；
- 德语长复合词按语义翻译，不逐字硬拆；
- 人名/地名/组织名以 glossary 为唯一来源。

## 波兰语源

波兰语原文 → 中文时：

- `sourceLang=pl`、`targetLang=zh-CN`；
- 保留 `ą ć ę ł ń ó ś ź ż`，不要转成 `a c e l n o s z z`（除非术语表明确要求）；
- 波兰语引号 `„ ”` 只出现在原文对照，中文译文用中文标点；
- 人名/地名/组织名以 glossary 的波兰语 source 为唯一来源；
- 波兰语长词按语义翻译，不逐字硬拆。

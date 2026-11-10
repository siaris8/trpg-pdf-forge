import path from 'node:path';

function win(file) {
  return path.resolve(file);
}

export function buildSheetTask(project, dir) {
  const source = project.source?.path ? win(path.join(dir, project.source.path)) : '';
  const brief = win(path.join(dir, 'source', 'brief.md'));
  const sourceLine = source
    ? `- 源文件：${source}`
    : '- 源文件：（无，只有补充说明）';
  return `# ${project.title} — Excel 人物卡任务

> SHEET_TASK_VERSION: 3
> 项目类型：Excel 人物卡（实验，独立于 PDF 翻译）
> 规则系统：${project.system || '自定义规则'}
> 目标语言：${project.sourceLang || 'zh-CN'}

## 0. 目标

分析下面的规则/译文，制作一份可自行计算的 Excel 人物卡。不是排版 PDF，不涉及预览页、书签、Type3。

## 1. 输入

- 项目目录：${win(dir)}
${sourceLine}
- 补充说明/规则摘录：${brief}
- 规则指南：.trpg/SHEET-GUIDE.md
- 可选模板：.trpg/sheet-spec.template.json

先复制模板，再填内容（不要从空白工作簿重排）：

    Copy-Item .trpg/sheet-template.xlsx out/character-sheet.xlsx

先运行文本提取（如果没有 source）：

    node .trpg/run-python.mjs .trpg/sheet-extract.py ${source ? `"${source}"` : ''} --out work/source.txt

## 2. 分析计划

先写 work/sheet-plan.json，至少包含：

- 规则系统、源页/来源；
- 属性：id、中文名、范围、默认值、点数成本；
- 资源：HP/MP/SAN/弹药/货币等，当前值、上限公式、恢复；
- 衍生值公式；
- 车卡步骤（前置条件、消耗、完成状态）；
- 技能/武器/法术表；
- 公式清单（sheet、cell、formula、purpose）；
- 无法确认的规则（ambiguities）。

## 3. 必须产出

| 文件 | 要求 |
|---|---|
| out/character-sheet.xlsx | 可编辑、带公式、无宏 |
| work/sheet-plan.json | 分析计划 |
| out/SHEET-QA.json | 由 sheet-check.py 生成，ok:true |
| out/SHEET-REPORT.md | 源页、公式、假设、待确认项 |

工作簿必需 sheet：

- 说明
- 车卡步骤
- 人物卡
- 资源
- 技能
- 武器
- 规则数据（可隐藏）

可选：法术能力、原文对照。

要求：

- **版式优先**：复制 .trpg/sheet-template.xlsx，不要从空白工作簿重排。
- 8 列等分方格：A–H 列宽统一 13.5（±0.5），数据行高 24/26；标题 A1:H2；分区 A4:H4；关闭网格线、设置打印区域、A4 纵向、水平居中。
- 面板按 8 列对齐，长文本用换行，不要用超宽单列塞大段文字；每个可见 sheet 的 A–H 都要有用途，不留大片空列。
- 至少 5 个命名区域、3 个车卡步骤、2 个资源。
- 公式可选；有公式时用标准函数，并设置 fullCalcOnLoad；没有公式也允许。
- 资源、属性、技能、武器关键字段用命名区域（ASCII 名，如 HP_Current、HP_Max、Points_Left）。
- 车卡步骤用下拉/条件格式表示完成；不要用宏；空白行不要加条件格式。
- 不确定的规则标 [待确认]，不要编造数值。

## 4. 检查

    node .trpg/run-python.mjs .trpg/sheet-check.py out/character-sheet.xlsx --plan work/sheet-plan.json --json out/SHEET-QA.json

必须 SHEET-QA.json 为 ok:true。失败时按 errors 修，不要改 QA 文件。

## 5. 停止条件

生成工作簿、QA、报告后停下等待审核；不要生成 PDF，不要调用 PDF 工坊流程。
`;
}

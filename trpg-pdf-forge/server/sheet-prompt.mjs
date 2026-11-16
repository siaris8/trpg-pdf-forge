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
  const sourceLang = project.sourceLang || 'zh-CN';
  const targetLang = project.targetLang || 'zh-CN';
  return `# ${project.title} — Excel 人物卡任务

> SHEET_TASK_VERSION: 4
> 项目类型：Excel 人物卡（实验，独立于 PDF 翻译）
> 规则系统：${project.system || '自定义规则'}
> 源语言：${sourceLang}
> 目标语言：${targetLang}

## 0. 目标

分析下面的规则/译文，制作：

1. 一份空白/可自行计算的 **基础人物卡**；
2. 如果源书/Quickstart/模组里存在 **预设角色（Pregenerated Characters）**，把它们逐张提取出来，单独成表。

预设卡不是空白车卡，不能塞进基础卡的「人物卡」sheet。NPC/敌人和预设玩家角色要分开标记。

源语言规则：德语保留 “ä ö ü ß”；波兰语保留 “ą ć ę ł ń ó ś ź ż”；两者都不要转成 ASCII，术语表 source 使用源语言，target 用中文。

## 1. 输入

- 项目目录：${win(dir)}
${sourceLine}
- 补充说明/规则摘录：${brief}
- 规则指南：.trpg/SHEET-GUIDE.md
- 预设卡指南：.trpg/PREGEN-GUIDE.md
- 可选模板：.trpg/sheet-spec.template.json

先复制模板，再填内容（不要从空白工作簿重排）：

    Copy-Item .trpg/sheet-template.xlsx out/character-sheet.xlsx

先运行结构化文本提取：

    node .trpg/run-python.mjs .trpg/sheet-extract.py ${source ? `"${source}"` : ''} --out work/source.txt --json work/source.json --lang ${sourceLang}

## 2. 预设卡检测

先扫描 Quickstart/模组里的预设角色章节，关键词包括：

- 德语：Vorgefertigte Charaktere、Spielfertige Charaktere、Schnellstart-Charaktere、Beispielcharaktere、NSC；
- 英语：Pregenerated Characters、Ready-to-Play、Sample Characters；
- 中文：预设角色、预设卡、快速开始角色。

运行：

    node .trpg/run-python.mjs .trpg/pregens.py detect --source work/source.json --out work/pregen-candidates.json --lang ${sourceLang}

然后人工/Agent 对照源页，把每张预设卡写入 work/pregens.json：

- id、kind（pregen-pc / npc / archetype / unknown）、name、nameOriginal、
  archetype、sourcePages、sourceSection；
- attributes、skills、weapons、abilities、resources、gear；
- missing：源书没有或看不清的字段，用 [待确认] 标记；
- 不要编造数值；不要把原型模板、普通怪物数据块当成预设玩家卡。

如果源书确实没有预设卡，在 work/pregens.json 写 {"pregens": []}，并在报告中写“无预设卡”，不要生成空的预置工作簿。

## 3. 分析计划

先写 work/sheet-plan.json，至少包含：

- 规则系统、源页/来源、源语言/目标语言；
- 属性：id、中文名、范围、默认值、点数成本；
- 资源：HP/MP/SAN/弹药/货币等，当前值、上限公式、恢复；
- 衍生值公式；
- 车卡步骤（前置条件、消耗、完成状态）；
- 技能/武器/法术表；
- 公式清单（sheet、cell、formula、purpose）；
- 预设卡数量、文件模式、来源页；
- 无法确认的规则（ambiguities）。

## 4. 必须产出

| 文件 | 要求 |
|---|---|
| out/character-sheet.xlsx | 空白/可编辑基础卡，带公式、无宏；不含预设卡数据 |
| work/pregens.json | 预设卡结构化数据；无预设卡时 pregens: [] |
| out/pregens.xlsx 或 out/pregens/*.xlsx | 预设卡；≤8 张合并为一个工作簿，>8 张分文件 + INDEX.xlsx |
| work/sheet-plan.json | 分析计划 |
| out/SHEET-QA.json | 由 sheet-check.py --mode all 生成，ok:true |
| out/SHEET-REPORT.md | 源页、预设卡清单、公式、假设、待确认项 |

基础工作簿必需 sheet：

- 说明
- 车卡步骤
- 人物卡
- 资源
- 技能
- 武器
- 规则数据（可隐藏）

可选：法术能力、原文对照。

预设卡工作簿：

- 预设卡索引（编号、中文名、德文/英文原名、类型、原型、来源页、位置、完整度）
- 每张卡一个 sheet：预设卡-<中文名>
- 预置卡标题必须带“预设角色”标记，和基础「人物卡」明确区分。

## 5. 版式

- **版式优先**：基础卡复制 .trpg/sheet-template.xlsx；预设卡用 .trpg/pregens.py 生成，不要手工从空白工作簿重排。
- 8 列等分方格：A–H 列宽统一 13.5（±0.5），数据行高 24/26；标题 A1:H2；分区 A4:H4；关闭网格线、设置打印区域、A4 纵向、水平居中。
- 面板按 8 列对齐，长文本用换行，不要用超宽单列塞大段文字。
- 至少 5 个命名区域、3 个车卡步骤、2 个资源（基础卡）。
- 公式可选；有公式时用标准函数，并设置 fullCalcOnLoad。
- 不确定的规则标 [待确认]，不要编造数值。

## 6. 检查

    node .trpg/run-python.mjs .trpg/pregens.py build --data work/pregens.json --out out/pregens.xlsx --summary out/PREGEN-QA.json
    node .trpg/run-python.mjs .trpg/sheet-check.py out/character-sheet.xlsx --mode all --plan work/sheet-plan.json --json out/SHEET-QA.json

必须 SHEET-QA.json 的 base.ok 和 pregens.ok 都为 true。失败时按 errors 修，不要改 QA 文件。

## 7. 停止条件

生成基础卡、预设卡、QA、报告后停下等待审核；不要生成 PDF，不要调用 PDF 工坊流程。
`;
}

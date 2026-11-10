# 项目工作流

完整阶段、文件、命令、恢复规则见 `PIPELINE.md`；本文件只保留门禁摘要。

## 阶段

| 阶段 | 含义 | 必须产物 | 下一动作 |
|---|---|---|---|
| draft | 缺源 PDF，或上传术语表但未上传文件 | 项目骨架 | 补齐材料 |
| ready | 源 PDF + 术语表就绪 | `TASK.md` | 复制作业指令 |
| pass1 | 两页已渲染 | 两页 PDF/PNG、接触表、报告、两页 QA、图片守卫、表格计划 | 审核 |
| changes | 用户要求修改两页 | 修改后的两页 + 新 QA | 再次审核 |
| approved | 两页审核通过，尚无批次计划 | `REVIEW.json=approve` | 开始全篇（自动分批+校对） |
| batches | 有批次进度，未全部 done | 页 JSON、PROOF、CHECK | 翻译/校对当前批 |
| build | 所有批次已译、已校、CHECK ok | `work/progress.json` | 构建全篇 |
| full | 全篇 PDF 已存在，但最终交付不完整 | 见下方“全篇” | 补齐/修复 |
| done | 全篇 + 所有最终产物 + 门禁通过 | 全部交付 | 结束 |

## 批次流水线（大规模书）

- 审核通过后先做一次**全量结构清单**：`extract-images.py` + `source-map.py --merge`（整本表候选/插图/整页扫描/栏数；页数以 `survey.totalPages` 为准）。BRIEF 只在这之后可信。
- 再运行 `batch-plan.py plan` 生成 `work/batches.json`，按 PDF 目录拆成每批 ≤16 源页。
- 当前批由 `work/progress.json` 的 `current` 指定；每批只做 `work/batches/<id>/BRIEF.md` 的范围。
- 每批产出 `work/pages/<id>-*.json`，先按 `PROOF-BRIEF.md` 校对并写 `PROOF.json`，再运行 `build-book.py --batch` 与 `batch-check.py --batch`；`CHECK.json` 为 `ok:true` 后**自动继续下一批**，不再逐批询问用户。
- `PROOF.json` 的 `pageDigest` 必须匹配当前页 JSON；页改动后校对失效。
- `batch-check` 会查漏译：整段英文、译文/源页字数 <20% 直接失败，<28% 警告；速查页用 `abridged: true` 明确豁免。
- 术语门禁：页 JSON 不得出现整段英文特技/道途列表，不得用“沿用原书英文名”脚注；原型名与术语表 `archetype` 行不一致直接失败；`work/TERM-QA.json` 必须 ok。
- 全部批次 `translated == total` 后，同一次自动流程内构建全篇。
- 中断后按 `progress.json` 继续，不重翻已有批；同一批连续两次修不好才停下报告。

## Excel 车卡版式

- 模板/示例统一 8 等分方格：A–H 列宽 13.5（±0.5），数据行高 24/26，标题 A1:H2，分区 A4:H4。
- A4 纵向、页边距 0.35、水平居中、`fitToWidth=1`、`print_area` 覆盖内容、关闭网格线。
- `sheet-check.py` 的 `layoutVersion=3` 会拒绝宽窄不一、行高缺失、非 A4 或未设打印区域的工作簿。

## Pass 1 门禁

`writeReview(approve)` 只接受完整的两页交付：

- `out/pass1/preview.pdf` / `preview.png`
- `out/pass1/hard.pdf` / `hard.png`
- `out/pass1/contact-sheet.png`
- `out/pass1/REPORT.md`
- `out/pass1/preview-qa.json`：`ok:true`、`type3:0`
- `out/pass1/hard-qa.json`：`ok:true`、`type3:0`
- `out/pass1/IMAGE-CHECK.json`：`ok:true`（无可用图时 0 图允许）
- `out/TABLE-PLAN.json`：`ok:true`
- `out/pass1/LAYOUT.json`：建议生成（体检提示，不作为通过条件）

缺项时 UI 会列出具体文件；不要用“通过”绕过。

## 全篇门禁

`done` 需要：

- `out/book.pdf`（层级书签）
- `out/book.html`
- `out/QA.json`：`ok:true`、0 Type3
- `out/BOOKMARKS.json`：`ok:true`、`PageMode=UseOutlines`
- `out/IMAGE-CHECK.json`：全篇图片守卫 `ok:true`
- `out/TABLE-PLAN.json`：`ok:true`
- `out/TRANSLATION-REPORT.md`：无 `【】` 占位
- `out/GLOSSARY.csv` / `out/GLOSSARY.md`
- `out/SOURCE-CARDS/INDEX.md`
- `out/pages/`
- `out/LAYOUT.json`：建议生成（体检提示，不作为交付条件）
- `work/progress.json`：`translated == total`（所有批次完成）

缺任何一项时 phase 仍为 `full`，UI 显示待补齐，不会显示 `done`。

## 排版体检（提示，不阻断）

- 渲染后运行 `layout-check.py`，生成 `out/pass1/LAYOUT.json` / `out/LAYOUT.json`。
- `strong`（页底大块空白）、`mild`（偏空）只做提示；表格/图/章节扉页/后记/术语表会被标成 `context` 或 `exempt`。
- UI 显示偏空页数和合并建议，**不影响**“通过/交付”。
- 常规留白（表格旁、图前后、章节末页）不需要处理；只有“整页只排一半 / 整栏空着”才值得前移内容或合并页。

## 任务书

- `TASK.md` 头部有 `TASK_VERSION: 8`。
- Pass 1 只包含两页命令、两页 QA、图片守卫、表格计划；不包含全篇命令/交付。
- Revision 只包含两页修改和 `REVIEW.json` 意见。
- Full 只包含全篇构建、渲染、书签、QA、图片、表格计划、报告/术语表；不再包含逐页翻译。
- 批次任务由工坊根据 `work/progress.json` 动态生成；一次“开始全篇（自动分批）”后，Agent 自动循环到构建完成。
- `done` 不再生成“继续全篇”任务。
- 老项目任务书版本过旧时，UI 提示刷新；调用一次 `/finalize` 重新生成即可，不删除旧产物。

## 问题分类

- `health=warning` 表示当前阶段有缺项/未通过门禁，但 phase 仍保留；UI 同时显示阶段和问题。
- Type3、图片守卫、表格计划、书签、报告占位符分别有独立 code；修复时按 code 定位，不要用删文件绕过。


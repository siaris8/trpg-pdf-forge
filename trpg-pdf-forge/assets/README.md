# assets 脚本索引

## 项目/批次

| 脚本 | 作用 | 主要产物 |
|---|---|---|
| `source-map.py` | 全量扫描源 PDF：表候选、插图、扫描、栏数、标题 | `work/source-map.json` |
| `batch-plan.py` | 生成批次、BRIEF、PROOF-BRIEF、刷新进度 | `work/batches.json`、`work/progress.json` |
| `build-book.py` | 从页 JSON 构建 `body.html` 或单批 HTML | `book/body.html`、`book/batches/*.html` |
| `batch-check.py` | 结构/漏译/术语/校对门禁 | `CHECK.json`、`progress.json`、`TERM-QA.json` |
| `proof.py` | 生成/校验批次 PROOF 骨架 | `work/batches/<id>/PROOF.json` |
| `pregens.py` | 预设卡检测/生成（Quickstart/模组） | `work/pregens.json`、`out/pregens*` |
| `langlib.py` | 语言配置/德语/波兰语源规范化 | — |
| `titlelib.py` / `title.py` | 书名权威、核验与传播 | `work/TITLE.json`、`work/TITLE-QA.json` |
| `namelib.py` / `name-check.py` | 名称/书名 glossary 冲突 + 页面专名一致性 | `work/NAME-QA.json` |
| `textlib.py` | 漏译/英文段落检查库 | — |
| `termlib.py` | 术语表覆盖、原型名一致性库 | — |
| `prooflib.py` | PROOF digest/校验库 | — |
| `pageio.py` | JSON/页 JSON 读取公共层 | — |
| `reportpath.py` | 报告内路径统一为相对路径（不写本机绝对路径） | — |
| `split-bundle.py` | 整批 bundle 拆成单页 JSON | `work/pages/<batch>-NN.json` |
| `context-report.py` | 上下文/预算体检 | `work/CONTEXT-BUDGET.json` |
| `batchlib.py` | 进度计算 | — |

## 渲染与 PDF

`extract-images.py`、`render-pages.py`、`render-pdf.mjs`、`merge-pdf.py`、`check-pdf.py`、`layout-check.py`、`bookmarks.py`、`export-glossary.py`、`image-check.py`。

## Excel 车卡

| 脚本 | 作用 |
|---|---|
| `make-sheet-demo.py` | 生成 8 等分方格示例 + plan |
| `make-sheet-template.py` | 从示例生成空白模板 |
| `sheet-check.py` | layout v3 与结构检查 |
| `sheet_style.py` | 共享颜色/字体/网格 |
| `sheet-extract.py` | 源文件文本提取 |

## 文档

`PIPELINE.md`（总流程）、`BATCH-PROTOCOL.md`（批次纪律）、`PILOT-GUIDE.md`（10 页试点）、`TITLE-GUIDE.md`（书名）、`PROOF-GUIDE.md`（校对）、`PAGE-SCHEMA.md`（页 JSON）、`INSTRUCTIONS.md`（操作细则）、`STYLE.md`、`TABLE-GUIDE.md`、`BOOKMARKS.md`、`SHEET-GUIDE.md`。

# TRPG 翻译工坊

当前版本：**3.0.1**（插件页标题旁会显示版本号）

开发者：**希亚蕾丝**

> 3.0.1：**去掉机器路径与旧项目残留 + 测试包归档**——所有报告类 JSON（`*-qa.json`、`IMAGE-CHECK.json`、`manifest.json`、`BOOKMARKS.json`、`LAYOUT.json`）只记录相对路径，不再写入本机绝对路径（新增 `assets/reportpath.py`）；清理示例产物、文档与测试里的旧工作区/旧项目名；测试包每次按版本新生成，旧包自动归档到 `oldversion/`。
>
> 3.0.0：**书名权威 + 译名一致性**——`work/TITLE.json`、完成全篇后的 `title-review`、`title.py check --require-verified`；glossary title/name/place/organization 冲突检查；新项目启用 strict 书名门禁。
>
> 2.3.0：**成本优先的批次上下文**——每批新 subagent、正文默认不读图、整批 bundle、STYLE-MINI、BATCH-PROTOCOL、CHECK/TERM 摘要、术语子集与步骤预算。
>
> 2.2.0：新增**波兰语源 → 中文**（`sourceLang=pl`，保留 ą ć ę ł ń ó ś ź ż、波兰语术语表/预设卡关键词/校对清单），并清理德语/波兰语提示词的编码问题。
>
> 2.1.1：修复**无关工作区被创建 `trpg-projects` / `trpg-sheets` 空目录**；`/info` 改为只读，只有真正新建项目时才建目录，并清理已产生的空根。
>
> 2.1.0：车卡支持**预设卡提取**（Quickstart/模组的 pregen/NPC，≤8 张合一个工作簿，>8 张分文件+索引）；新增**德语源 → 中文**（`sourceLang=de`，保留 ä ö ü ß、德语术语表、德语校对清单）。
>
> 2.0.1：清理提示词/文档里的项目残留（旧项目页数、固定页段、具体案例），改为按 `survey.totalPages`/总页数动态处理，避免 Agent 把旧项目规模当成当前项目。
>
> 2.0.0：每批翻译强制**独立校对**（`PROOF.json` + pageDigest）；状态/门禁/action 收口到 `snapshot → workflow → gates`，阶段增加 `batches/build`；页 JSON 统一 `page-schema.json`；文档收口到 `PIPELINE.md` / `PROOF-GUIDE.md`。
>
> 1.11.0：新增**术语完整性门禁**（英文特技/道途列表、原型名不一致、术语表缺条目都会阻断）；Excel 车卡改为 **8 等分方格 + 固定行高** 的方正版式（layout v3）。
>
> 1.10.1：修复“部分段落未翻译”漏检——`batch-check` / `build-book` 现在检查整段英文和源页字数覆盖率（<20% 失败，<28% 警告）；速查页用 `abridged: true` 明确豁免。不再只看“源页有没有页 JSON”。
>
> 1.10.0：新增**全量结构清单**（`source-map.py`：整本表候选/插图/整页扫描/栏数）与**一次输入自动分批**——审核通过后只复制一次，Agent 自动从当前批做到全篇构建；BRIEF 未审计时不再显示“无”。
>
> 1.9.0：大规模书改为**批次流水线**——按 PDF 目录自动拆成每批 ≤16 源页，逐批翻译、构建、检查；工坊显示总进度和当前批，支持断点续做。全篇阶段只做构建/渲染/QA。
>
> 1.8.0：新增「排版体检」——按译文体量分页，减少整页半空；栏数按内容自适应（1/2/3 栏等分）。体检只提示，不阻断审核；表格/图/章节扉页/后记附近的留白会被豁免。
>
> 1.7.1：补上开发者署名（界面标题旁与文档）。功能与 1.7.0 相同。
>
> 1.7.0：项目库改为**跨工作区聚合**——换工作区不会再看不到旧项目；PDF 项目与 Excel 车卡都支持「删除 → 回收站 → 恢复 / 彻底删除」。旧项目原地保留，不搬家、不复制。

把一份 TRPG 模组 PDF 变成一本可读的中文排版书。工坊不会一上来就翻全篇：它先把资料整理成项目，生成一份**只讲当前阶段**的任务书，让 Agent **只做「预览页 + 难页」**；你审核通过后，才继续全篇。

阶段、产物和门禁总览见 [`assets/WORKFLOW.md`](assets/WORKFLOW.md)。

侧栏另有独立实验面板 **Excel 车卡**：上传规则/译文，生成带资源、车卡步骤和公式的 `.xlsx`；它不经过 PDF 翻译流程。

## 做什么

- 上传模组 PDF；可选上传术语表，或让 Agent 先建空表并填满。
- 默认使用「纸本档案」版式：奶油纸、黑墨、金线、红色菱形、深表头表格、朗读框、规则条、便签、数据块。
- 自动生成 `TASK.md`、`.trpg/INSTRUCTIONS.md`、`.trpg/STYLE.md`、`.trpg/theme.css`。
- 首轮只产出 `out/pass1/preview.pdf/png` 与 `hard.pdf/png`，并写 `REPORT.md`。
- 自动提取并分类源 PDF 插图：优先保留关键场景/地图/NPC/道具图，小图标不要求逐张嵌入；源书有可用图时，首轮至少 1 张、全篇至少 3 张（不足 3 张则保留全部可用图）。
- `image-check.py` 会在“源书有可用图、导出 PDF 却 0 图”时直接失败；如果源书没有可用插图（只有图标/扫描页/没有图），它会返回 `ok: true`，**0 图允许**。
- 表格优先：人物卡、武器/护甲/装备、法术/能力、弹药、随机表、房间钥匙优先做表；角色卡用 `.character-sheet`。
- 原卡难以表格化时做抽象表，同时把原图保留到 `out/SOURCE-CARDS/` 与 PDF 附录；`check-card-plan.py` 防止漏原图。
- 审核通过写 `REVIEW.json`，再生成全篇指令；要求修改则只重做两页。
- 全篇同时交付 `out/TRANSLATION-REPORT.md`、`out/GLOSSARY.csv`、`out/GLOSSARY.md`、`out/TABLE-PLAN.json`、`out/SOURCE-CARDS/`、`out/BOOKMARKS.json` 和 QA 文件。
- **PDF 书签**：全篇自动生成 WPS/Adobe 可展开的层级书签，不要求正文超链接；封面自动偏移，书签页码与物理页一致。
- 内置 Chrome/Edge 打印器：A4、页眉页脚、页码，0 Type3 检查。

## 安装 / 启用

### 在其他设备安装（测试包）

1. 解压插件测试包，得到 `trpg-pdf-forge/` 文件夹。**不要只把 zip 文件选进插件管理器。**
2. 打开 DeepSeek Harness → 设置 → 插件 → 从本地目录安装，选择 `trpg-pdf-forge/`。
3. 重启 DSH；左侧栏应出现「翻译工坊」。
4. 打开工坊，标题旁应显示 `v3.0.1`；Excel 车卡面板也会显示 `BETA`。PDF 流程可上传 `trpg-pdf-forge/assets/demo/source.en.pdf` 测试。

测试设备需要 DSH 桌面版；PDF 打印使用本机 Chrome/Edge；Python 辅助脚本通过 `run-python.mjs` 自动寻找 DSH 自带运行时。不要手动改 profile 的 `package.json`，也不要在 profile 里跑 `pnpm install`。

### 本机

当前桌面 profile 已把 `@local/mystery-atelier-ui` 链接到本目录，DSH 直接从工作区加载这个插件，没有第二份拷贝要同步：

| 改动 | 生效方式 |
|---|---|
| `client.js`（界面） | 刷新 DSH 页面 |
| `index.js`、`server/*.mjs`（Host） | 重启 DeepSeek Harness |
| `assets/*.py`、`assets/*.mjs` | 下一次调用即生效 |
| `assets/theme.css`、模板 | 下次生成页面时生效 |

内部包名保留为 `@local/mystery-atelier-ui`；界面标题和元数据是「TRPG 翻译工坊」。

## 使用

1. 新建翻译，拖入 PDF。
2. 选择术语表：有就上传；没有就选「帮我建空表」。
3. 可选补充图片；默认版式和字体已适合大多数模组。
4. 创建项目，复制开工指令，回到对话粘贴发送。
5. Agent 完成后，在工坊看预览页/难页：
   - 先确认 `out/pass1/IMAGE-CHECK.json` 为 `ok: true`；源书有可用图却 0 图时不能通过。
   - 「通过，继续全篇」→ 写 `REVIEW.json`，复制继续指令。
   - 「要求修改」→ 写修改意见，复制修改指令。
   - 注意：预览页只用于确认版式与可读性，不一定是最终成品；全篇阶段仍可能微调。
6. 全篇完成后在工坊打开 `out/book.pdf`；顶部“工作流”卡片会显示当前阶段、下一动作和缺失项。
7. 删除项目：详情页右上「删除项目」→ 移入回收站；左侧垃圾桶图标里可恢复或彻底删除。Agent 正在跑时先让它停下。

## 大规模书（自动分批）

审核通过后，工坊只给一个入口：「开始全篇（自动分批）」。复制一次后，Agent 自动：

1. 先做全量结构清单：`extract-images.py` + `source-map.py --merge`（整本的表候选、插图、整页扫描、栏数、标题）。
2. 生成 `work/batches.json`，按 PDF 目录拆成每批 ≤16 源页。
3. 从 `work/progress.json` 的 `current` 开始，逐批读 `work/batches/<id>/BRIEF.md`、渲染源页、写 `work/pages/<id>-*.json`、`build-book.py --batch`、`batch-check.py --batch`；每批 `ok` 后自动下一批，不再询问用户。
4. 全部 `translated == total` 后，同一次流程内构建全篇、渲染、书签、QA、报告。

- 进度卡显示「已译 81/xxx 页 · 23% · 第 3/N 批」；中断后从 `current` 继续，不重翻。
- BRIEF 的表格/图片来自全量清单；未审计时明确写“未审计”，不会假装“无”。
- 页 JSON 规范见 `assets/PAGE-SCHEMA.md`；构建器 `build-book.py` 已内置。

## 排版体检（提示）

全篇渲染后运行 `.trpg/layout-check.py`，生成 `out/LAYOUT.json`；工坊审核卡片会显示「排版体检：N 页偏空 · M 组可合并」。

- 只提示，不阻断审核/交付；表格旁、图前后、章节扉页、章节末页、后记/术语表的留白会被标为 `context` / `exempt`。
- `strong`：页底大块空白，建议把下一页开头内容前移或合并相邻页；`mild`：轻微偏空，可接受。
- 分页按译文体量（目标 65%–85%），不按源书页硬切；栏数按内容选（1/2/3 栏自动等分，不再出现掉行空格）。

## 术语完整性（1.11.0）

- `term-extract.py` 把页 JSON 里未入表的英文特技/道途/技能名导出到 `work/term-candidates.csv`。
- `term-check.py` 强制：术语表必须有中文词条、页 JSON 必须用中文名、原型名必须与 `archetype` 行一致；禁止“沿用原书英文名”脚注。
- `batch-check` / `build-book` 都会跑这个门禁；工坊会显示缺失术语数和「打开术语表」入口。

## Excel 车卡（实验）

1. 侧栏打开「Excel 车卡 · 实验」。
2. 新建：填人物卡标题、规则系统；上传 PDF/DOCX/MD/TXT/CSV/XLSX，或直接粘贴规则/译文。
3. 创建后复制「车卡任务」给 Agent。
4. Agent 生成 `out/character-sheet.xlsx`、`work/sheet-plan.json`、`out/SHEET-QA.json`、`out/SHEET-REPORT.md`。
5. 在工坊打开 XLSX、看公式/命名区域/步骤统计，再「通过」或「要求修改」。
6. 车卡项目同样支持删除/回收站：详情页「删除项目」、左侧垃圾桶恢复或彻底删除。

Excel 项目存放在 `trpg-sheets/`，和 PDF 项目完全分离；示例工作簿是 `assets/sheet-demo.xlsx`，空白模板是 `assets/sheet-template.xlsx`。版式优先，公式可选；模板已固定 **8 等分方格**（A–H 等宽 13.5、行高 24/26）、标题、边框、颜色、冻结、A4 打印区域和水平居中。

## 项目目录与多工作区

新建项目写入**当前会话工作区**的 `trpg-projects/`（车卡写同级 `trpg-sheets/`）。工坊会把所有已知工作区的项目聚合显示，所以换工作区不会再“找不到”：

- 根来源：当前工作区、DSH 工作区注册表、会话历史、`~/.dsh/sessions` 里可解码的旧目录，以及 `TRPG_STUDIO_LEGACY_ROOTS`（分号分隔的目录）。
- 发现过的根会记到 profile 下的 `trpg-studio-roots.json`；即使以后会话目录被清理，也能找回。
- 标「其他工作区」的项目**留在原地**，不复制、不搬家；继续之前请确认 Agent 对那个目录有写权限（或切换 DSH 工作区）。
- `TRPG_STUDIO_ROOT` / `TRPG_SHEET_ROOT` 可显式指定单一根目录（设置后不再自动发现）。

删除的项目会移到所在根的 `.trash/<id>__<时间>/`，不会立刻删文件；回收站里可恢复或彻底删除。

每个项目：

```text
project.json
source/source.pdf
glossary/glossary.csv
glossary/glossary.filled.csv
assets/user/
work/images/           # 从源 PDF 提取的插图 + manifest.json
.trpg/                 # 任务书、样式、渲染与 QA 脚本
TASK.md
REVIEW.json
out/pass1/             # 两页 + preview-qa/hard-qa + IMAGE-CHECK + REPORT
out/book.pdf           # 全篇
out/TRANSLATION-REPORT.md
out/TABLE-PLAN.json
out/SOURCE-CARDS/
out/BOOKMARKS.json
out/GLOSSARY.csv
out/GLOSSARY.md
out/QA.json
```

## 字体与 WPS

默认字体：正文 `SimSun`，标题 `Microsoft YaHei`，拉丁展示 `Arial Narrow`。示例样张已检查为 Type0、0 Type3。

参考 PDF 只用于版式参考：它的抽样页实际是 Type3 字体，不能沿用其字体管线。

不要使用变量字体（如 `NotoSerifSC-VF`），也不要在 SVG 里写 `<text>`：Chrome/Edge 可能把这些输出为 Type3。`check-pdf.py` 会把 Type3 当作失败。

Python 辅助脚本统一通过 `node assets/run-python.mjs` 调用；它会优先找 DSH 自带、带 PyMuPDF/pypdf/Pillow 的 Python，避免系统 PATH 里的 WindowsApps 占位程序。

## 本地验证

```powershell
node --test test/*.test.mjs
node assets/render-pdf.mjs --html assets/demo/preview.html --pdf assets/demo/preview.pdf --header "锁闭的天文台 · 预览页"
node assets/run-python.mjs assets/check-pdf.py assets/demo/preview.pdf
```

示例文件在 `assets/demo/`：`preview.png`、`hard.png`、`preview.pdf`、`hard.pdf`、`contact-sheet.png`。

## 已知限制

- 首版通过剪贴板把指令交给 Agent，不自动发消息。
- 只输出 PDF + HTML + PNG；不生成 DOCX/EPUB，避免重排破坏版式。
- 扫描件的文字识读依赖 Agent 的视觉能力；无法确认处会标 `[待校对]`，不编造。
- 翻译正文会发送给当前模型；原始文件保存在本机项目目录。
- 本机没有 WPS，无法自动做 WPS 打开测试；以 0 Type3 + 嵌入字体作为兼容性门槛。






# 更新日志

版本号以 `trpg-pdf-forge/package.json` 为准，插件页标题旁显示的版本号也来自这里。

## 3.0.1 — 2026-11-19

**去掉机器路径与旧项目残留**

- 报告类 JSON（`*-qa.json`、`IMAGE-CHECK.json`、`manifest.json`、`BOOKMARKS.json`、`LAYOUT.json`）只记录相对路径，不再写入本机绝对路径；新增 `assets/reportpath.py`。
- `check-pdf`、`image-check`、`extract-images`、`bookmarks`、`merge-pdf`、`layout-check`、`sheet-check`、`sheet-extract`、`export-glossary`、`render-pdf` 全部改用相对路径。
- 清理示例产物、文档和测试里的旧工作区路径与旧项目名；示例书签/QA 文件不再指向作者本机目录。
- 测试包改为每次按版本重新生成，旧压缩包自动归档到 `oldversion/`。
- 测试 81 项通过。

## 3.0.0 — 2026-11-19

**书名权威 + 译名一致性**

- 新增 `work/TITLE.json` 与 `title.py init/check/apply`；全篇完成后用 `title-review` 核验书名。
- 新项目启用 strict：书名未 `verified` 不能 build；旧项目按 legacy 处理，不强制迁移。
- 封面、页眉、TOC、书签、报告、glossary 统一使用同一个 `titleZh`；旧书名残留会直接失败。
- 术语表（glossary）增加 `name` / `place` / `organization` / `title` 类别；新增 `name-check.py` 检查译名冲突。
- 测试 81 项通过。

## 2.3.0 — 2026-11-19

**成本优先的批次上下文**

- 每批使用全新 subagent；主会话只保留 `CHECK-SUMMARY`，不保留页全文。
- 正文默认不读整页图：只有遇到表格、图文混排或文本缺失才读，每批 ≤2 张。
- 整批先写一个 `pages-bundle`，再用 `split-bundle` 拆分，减少往返。
- 新增 `STYLE-MINI`、`BATCH-PROTOCOL`、`CHECK-SUMMARY`、`TERM-SUMMARY` 与术语子集。
- 每 10 页目标 ≤30 steps、≤20 次工具调用；测试 78 项通过。

## 2.2.0 — 2026-11-16

**波兰语源 → 中文**

- 新增 `sourceLang=pl`，目标默认 `zh-CN`；保留 ą ć ę ł ń ó ś ź ż。
- `langlib.py` 增加波兰语 profile 与预设卡关键词（`Gotowe postacie`、`Szybki start`、`NSC` 等）。
- `sheet-extract.py --lang pl`；PDF 与车卡 UI 的源语言/目标语言下拉都加入 Polski。
- `textlib.py` 增加波兰语整段残留检测；`termlib.py` 支持波兰语变音字符与 `nazwy w oryginale` 脚注。
- `PROOF-GUIDE.md`、`SHEET-GUIDE.md`、`STYLE.md`、`PREGEN-GUIDE.md`、`PIPELINE.md`、`INSTRUCTIONS.md` 增加波兰语检查项。
- 测试 76 项通过。

## 2.1.1 — 2026-11-12

**停止在无关工作区创建空目录**

- `/api/trpg-studio/info` 与 `/api/trpg-sheets/info` 改为只读，不再 `mkdir` 当前工作区。
- 只有真正新建项目时才创建根目录；根记录只保存含 `project-*` / `sheet-*` 的目录，含 `.trash` 的保留。
- 新增 `cleanup-empty-trg-roots.ps1`（默认 dry-run，`-Apply` 才删除），只清空目录，不动非空项目与 `.trash`。
- 测试 74 项通过。

## 2.1.0 — 2026-11-12

**预设卡 + 德语源**

- 车卡项目自动检测 Quickstart / 模组预设角色：`assets/pregens.py` + `work/pregens.json`。
- ≤8 张输出 `out/pregens.xlsx`（索引 + 每卡一个 sheet）；>8 张输出 `out/pregens/INDEX.xlsx` + 每卡独立文件。
- 预设卡与空白 `out/character-sheet.xlsx` 分离；`sheet-check.py --mode all` 同时检查基础卡和预设卡。
- 新增德语源 → 中文：`sourceLang=de`，保留 ä ö ü ß，德语术语表与校对清单。
- `TASK_VERSION 9` / `SHEET_TASK_VERSION 4`；测试 72 项通过。

## 2.0.1 — 2026-11-10

**首次公开发布**

- 提示词与文档去掉旧项目的页数、页段和案例，改为按 `survey.totalPages` / 总页数动态处理。
- 每批翻译后强制独立校对（`PROOF.json` + pageDigest），页 JSON 改动会让 PROOF 过期。
- 全篇批次流水线、术语门禁、PDF 书签、排版体检、跨工作区项目库与回收站。
- PDF 翻译面板 + 独立 Excel 车卡面板；66 项测试通过。

> 2.1.0 / 2.1.1 / 2.3.0 的测试包只在本地留档；它们的改动都已包含在后续版本里。2.0.1 → 2.2.0 的详细说明见 [`docs/UPDATE-REPORT-2.2.0.md`](docs/UPDATE-REPORT-2.2.0.md)。

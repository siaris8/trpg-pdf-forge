# 更新日志

版本号以 `trpg-pdf-forge/package.json` 为准，插件页标题旁显示的版本号也来自这里。

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
- 新增文件：`assets/pregens.py`、`assets/langlib.py`、`assets/PREGEN-GUIDE.md`、`test/pregens.test.mjs`、`test/lang.test.mjs`。
- `TASK_VERSION 9` / `SHEET_TASK_VERSION 4`；测试 72 项通过。

## 2.0.1 — 2026-11-10

**首次公开发布**

- 提示词与文档去掉旧项目的页数、页段和案例，改为按 `survey.totalPages` / 总页数动态处理。
- 每批翻译后强制独立校对（`PROOF.json` + pageDigest），页 JSON 改动会让 PROOF 过期。
- 全篇批次流水线、术语门禁、PDF 书签、排版体检、跨工作区项目库与回收站。
- PDF 翻译面板 + 独立 Excel 车卡面板；66 项测试通过。

> 2.1.0 与 2.1.1 的测试包只在本地留档，未发布到本仓库；两者的改动都已包含在 2.2.0 里。

# TRPG 翻译工坊 · 更新报告

**2.0.1 之后的版本：2.1.0 / 2.1.1 / 2.2.0**

2026-11-17 · 开发者：希亚蕾丝

> 本文由 Word 版更新报告转换而来，公开发布版隐去了本机绝对路径与个人目录名，其余内容与原文一致。

## 一、摘要

2.0.1 之后，插件完成了三项阶段性更新：

- 2.1.0：车卡支持预设卡（Quickstart / 模组 Pregenerated Characters）提取；新增德语源 → 中文。
- 2.1.1：修复插件在无关工作区创建 `trpg-projects` / `trpg-sheets` 空目录的问题，并清理历史空根。
- 2.2.0：新增波兰语源 → 中文，补齐语言配置、预设卡关键词、术语/文本门禁和校对指南。

截至 2.2.0：

- 测试：76 项通过 / 0 失败
- 文件：136 个
- 测试包：141 条，2.68 MB
- 现有翻译项目数据未被修改；2.1.1 只清理了空目录。

## 二、版本总览

| 版本 | 日期 | 主题 | 测试 |
| --- | --- | --- | --- |
| 2.0.1 | 2026-11-10 | 提示词去项目残留（基线） | 66 |
| 2.1.0 | 2026-11-12 | 预设卡 + 德语源 | 72 |
| 2.1.1 | 2026-11-12 | 停止污染无关工作区 | 74 |
| 2.2.0 | 2026-11-16 | 波兰语源 | 76 |

## 三、2.1.0：预设卡 + 德语源

### 3.1 预设卡提取

Quickstart 和模组里经常带有已经填好、可直接开玩的角色。旧版只有一个空白人物卡工作簿，无法区分“玩家自己建的角色”和“书里给的预设角色”。

2.1.0 新增：

- `assets/pregens.py`
  - detect：扫描 `Vorgefertigte Charaktere` / `Pregenerated Characters` / 预设角色 等章节，输出候选；
  - build：根据 `work/pregens.json` 生成预设卡工作簿。
- `work/pregens.json`
  - 每张卡包含：id、kind（pregen-pc / npc / archetype / unknown）、中文名、原名、原型、来源页、属性、技能、武器、能力、资源、装备、缺失字段。
- 输出规则：
  - ≤ 8 张：一个 `out/pregens.xlsx`，包含「预设卡索引」+ 每张卡一个「预设卡-<名字>」sheet；
  - \> 8 张：`out/pregens/INDEX.xlsx` + 每张卡一个独立 xlsx；
  - 基础空白卡始终是 `out/character-sheet.xlsx`，不混入预设卡。
- 检查：
  - `sheet-check.py --mode all` 同时检查基础卡和预设卡；
  - `SHEET-QA.json` 必须 `base.ok=true` 且 `pregens.ok=true`；
  - 检测到预设角色章节但 `work/pregens.json` 为空时，直接失败，防止静默漏掉。

预设卡提取由 Agent 对照源页完成，插件负责检测候选、强制结构化、生成工作簿和 QA。没有把每个 stat block 盲目当预设卡，避免把怪物、模板、示例数值混进玩家预设卡。

### 3.2 德语源 → 中文

- `sourceLang=de`，`targetLang=zh-CN`。
- 保留 ä ö ü ß，不自动转成 ae/oe/ue/ss。
- 新增 `assets/langlib.py`：语言配置、德语文本规范化、预设卡关键词。
- `sheet-extract.py --json --lang de`：生成章节/页码/文本结构，供翻译和预设卡提取共用。
- `textlib.py`：德语整段残留检测。
- `termlib.py`：德语术语表、德语“保留原文名”脚注识别。
- PDF 和车卡 UI 都增加 Deutsch 源语言。
- `PROOF-GUIDE.md`、`SHEET-GUIDE.md`、`STYLE.md`、`INSTRUCTIONS.md` 增加德语检查项。

### 3.3 新增文件

- `assets/pregens.py`
- `assets/langlib.py`
- `assets/PREGEN-GUIDE.md`
- `test/pregens.test.mjs`
- `test/lang.test.mjs`

### 3.4 验证与交付

- 72 项测试通过。
- 测试包：`TRPG-Studio-plugin-test-2026-11-12-v2.1.0.zip`
- SHA-256：`A2F521F8A5330F83D27E2D6A48B3E45954D3188368AA648C2A2D5A717C432439`

## 四、2.1.1：停止在无关工作区创建空目录

### 4.1 问题

用户发现多个与 TRPG 无关的工作区里出现了 `trpg-projects` / `trpg-sheets`。

根因：

- `server/routes.mjs` 的 `/api/trpg-studio/info` 每次调用都执行 `fs.mkdir(current)`；
- `server/sheet-routes.mjs` 的 `/api/trpg-sheets/info` 同样创建当前工作区目录；
- `server/roots.mjs` 会把所有“存在的根”写入 `trpg-studio-roots.json`，包括空根。

因此，只要在某个工作区打开过面板，就会留下空目录；这些空根又被记录，后续看起来像“每个工作区都有文件”。

### 4.2 修复

- `/info` 改为只读，不再创建目录；返回 `root` 与 `rootExists`。
- 只有真正 `createProject` / `createSheetProject` 时才创建根。
- 新增 `rootHasEntries`：
  - 只有包含 `project-*` / `sheet-*` 的根才持久化；
  - 含 `.trash` 的根保留，避免回收站丢失；
  - 空根、失效根不再写入 `trpg-studio-roots.json`。
- 新增 `_dsh-sync/cleanup-empty-trg-roots.ps1`：
  - 默认 dry-run；
  - `-Apply` 才删除；
  - 只删除完全为空的 `trpg-projects` / `trpg-sheets`；
  - 不删除任何非空项目或 `.trash`。
- `sync-to-dsh.ps1` 增加目标目录自动重建，避免加载目录被删后同步直接失败。

### 4.3 清理结果

清理了 15 个空目录/失效根，保留 8 个真实项目根。被清理的都是“打开过面板但从未建项目”的目录，以及已经不存在的工作区路径；非空项目、`.trash` 和默认工作区里的真实项目全部保留。

> 公开发布版隐去了这些目录的具体路径。

### 4.4 验证与交付

- 74 项测试通过。
- 测试包：`TRPG-Studio-plugin-test-2026-11-12-v2.1.1.zip`
- SHA-256：`185750CAF0F4DF3FC70217C2CB3BD465BED38DB397798D43F5E14F36D8710518`

## 五、2.2.0：波兰语源 → 中文

### 5.1 语言配置

- 新增 `sourceLang=pl`，目标默认 `zh-CN`。
- `langlib.py` 增加 pl profile：
  - 名称：Polski；
  - 保留 ą ć ę ł ń ó ś ź ż；
  - 预设卡关键词：`Gotowe postacie`、`Postacie gotowe do gry`、`Postacie startowe`、`Przykładowe postacie`、`Szybki start`、`Bohaterowie`、`NSC`。

### 5.2 提取与 UI

- `sheet-extract.py --lang pl`。
- PDF 与车卡源语言下拉框增加 Polski；目标语言也增加 Polski。
- `pregens.py` detect 支持波兰语预设卡章节。
- 波兰语原名保留在预设卡索引的“原名”列。

### 5.3 门禁与校对

- `textlib.py`：
  - 增加波兰语常见词检测；
  - 拉丁字符范围扩展到波兰语变音字符；
  - 整段波兰语未翻译会报“波兰语未翻译”。
- `termlib.py`：
  - 支持 ą ć ę ł ń ó ś ź ż；
  - 识别 `nazwy w oryginale` / `oryginalne nazwy` 等“保留原文名”脚注。
- `PROOF-GUIDE.md`、`SHEET-GUIDE.md`、`STYLE.md`、`PREGEN-GUIDE.md`、`PIPELINE.md`、`INSTRUCTIONS.md` 增加波兰语检查项。

### 5.4 范围说明

本轮完成的是波兰语作为源语言 → 中文。目标语言下拉虽然加入 Polski，但完整波兰语输出排版/校对不是本轮验收范围。

### 5.5 验证与交付

- 76 项测试通过。
- 测试包：`TRPG-Studio-plugin-test-2026-11-16-v2.2.0.zip`
- SHA-256：`5420BF6F0F6D5D80820E1076C1F5C9075E7DE17C1C3450D2007D5E56FC265B3A`

## 六、共同质量与交付

### 6.1 测试

| 版本 | 测试数 | 结果 |
| --- | --- | --- |
| 2.0.1 基线 | 66 | 通过 |
| 2.1.0 | 72 | 通过 |
| 2.1.1 | 74 | 通过 |
| 2.2.0 | 76 | 通过 |

新增测试覆盖：

- 预设卡单工作簿 / 多文件 + 索引；
- `sheet-check --mode all` 基础卡 + 预设卡；
- 德语 / 波兰语源文本提取；
- 德语 / 波兰语整段残留；
- 波兰语变音字符保留；
- `/info` 不创建目录；
- 空根不写入 roots 记录；
- 创建项目时才建根。

### 6.2 同步与备份

- 开发时把插件目录同步到 DSH 加载目录，逐文件 SHA-256 校验 + `robocopy /MIR`。
- 每次升级前自动备份到 `_dsh-sync/backups`。

> 公开发布版隐去了本机的加载目录与源码目录路径。

### 6.3 测试包清单

| 版本 | 测试包 | 条目 | 大小 |
| --- | --- | --- | --- |
| 2.1.0 | `TRPG-Studio-plugin-test-2026-11-12-v2.1.0.zip` | 141 | 2.68 MB |
| 2.1.1 | `TRPG-Studio-plugin-test-2026-11-12-v2.1.1.zip` | 141 | 2.68 MB |
| 2.2.0 | `TRPG-Studio-plugin-test-2026-11-16-v2.2.0.zip` | 141 | 2.68 MB |

### 6.4 完整 SHA-256

- 2.1.0：`A2F521F8A5330F83D27E2D6A48B3E45954D3188368AA648C2A2D5A717C432439`
- 2.1.1：`185750CAF0F4DF3FC70217C2CB3BD465BED38DB397798D43F5E14F36D8710518`
- 2.2.0：`5420BF6F0F6D5D80820E1076C1F5C9075E7DE17C1C3450D2007D5E56FC265B3A`

## 七、影响与注意事项

### 7.1 对现有项目

- 2.1.0 / 2.2.0 没有修改任何已有翻译项目内容。
- 2.1.1 只删除了空的 `trpg-projects` / `trpg-sheets` 目录；
- 非空项目、`.trash`、项目内部的 `.trpg/`、`work/`、`out/` 全部保留。

### 7.2 部署

`client.js`、`server/*.mjs` 有改动，必须完整重启 DSH，只刷新页面不够。

### 7.3 依赖路径

DSH profile 通过本地 `link:` 依赖加载插件目录。不要删除或移动该目录；如果移动，需要同步修改 profile 依赖和 `node_modules` junction。

### 7.4 已知限制

- 预设卡提取是 Agent 对照源页写入 `work/pregens.json`，插件负责检测/生成/QA，不是完全自动的版面解析。
- 德语/波兰语源仍需要 PROOF 语义校对；自动文本/术语门禁不能替代逐段校对。
- 本轮波兰语只覆盖“波兰语源 → 中文”，不包含完整波兰语目标排版。

## 八、结论

2.0.1 之后，插件从“单语言、单人物卡”扩展为：

- 支持预设卡与空白车卡分离；
- 支持德语、波兰语源；
- 修复了工作区目录污染；
- 保持了 76 项测试全通过；
- 每次升级都有备份和可校验测试包。

当前建议版本：**2.2.0**。部署后需重启 DSH，并确认标题旁显示 `v2.2.0`。

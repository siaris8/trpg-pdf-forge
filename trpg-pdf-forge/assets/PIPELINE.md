# 流水线总览

这是阶段、文件、门禁与恢复的唯一入口；`INSTRUCTIONS.md` 只讲操作细节，`WORKFLOW.md` 只是短索引。

## 阶段

```text
draft → ready → pass1 → changes?
                    ↘ approved → batches → build → full → done
```

| 阶段 | 条件 | 下一步 |
|---|---|---|
| draft | 缺源 PDF / 术语表文件 | 补材料 |
| ready | 源 PDF + 术语表 | 复制开工指令 |
| pass1 | 两页已渲染，未审核 | 审核/修复 |
| changes | 用户要求修改两页 | 重做两页 |
| approved | 两页通过，无批次计划 | 自动分批 |
| batches | 有批次进度，未全部 done | 翻译+校对当前批 |
| build | 所有批次已译、已校、CHECK ok | 构建全篇 |
| full | book 已存在，最终交付未齐 | 补齐 |
| done | 最终门禁通过 | 结束 |

## 每批

```text
BRIEF.md → 翻译页 JSON → PROOF-BRIEF.md → 校对 → PROOF.json
→ proof.py verify → build-book --batch → batch-check --batch → 下一批
```

- 只处理 `progress.current`，已 done 的跳过。
- 页 JSON 改动后 PROOF digest 失效，必须重新校对。
- `batch-check` 同时检查结构、漏译、术语、校对；全过才写 `CHECK.ok=true`。

## 文件契约

| 文件 | 作用 |
|---|---|
| `project.json` | 项目元数据 |
| `work/source-map.json` | 全量结构清单（表/图/扫描/栏数） |
| `work/batches.json` | 批次计划 |
| `work/progress.json` | 已译/已校/current/失败批次 |
| `work/pages/*.json` | 翻译数据，schema 见 `PAGE-SCHEMA.md` |
| `work/batches/<id>/BRIEF.md` | 翻译任务 |
| `work/batches/<id>/PROOF-BRIEF.md` | 校对任务 |
| `work/batches/<id>/PROOF.json` | 校对签字 + pageDigest |
| `work/batches/<id>/CHECK.json` | 批次门禁结果 |
| `work/TERM-QA.json` | 术语表覆盖/原型名一致性 |
| `out/LAYOUT.json` | 排版体检（提示，不阻断） |
| `out/QA.json` / `out/BOOKMARKS.json` | 最终 PDF 检查 |

## 门禁

- **pass1**：两页 PDF/PNG/接触表、QA、图片守卫、表格计划。
- **term**：`TERM-QA.ok=true`；英文特技/道途列表必须中文化。
- **proof**：每批 `PROOF.ok=true`、checks 全 true、digest 未过期。
- **batch**：CHECK ok，所有批次 done。
- **final**：book/QA/书签/图片/表格/报告/术语表/页面 PNG。

## 恢复

- 中断后从 `progress.current` 继续；已 done 不重翻。
- 校对失败：修页 JSON → 更新 PROOF → batch-check。
- 术语失败：补 `glossary.csv` → `term-check.py --all` → 重跑 batch-check。
- 最终构建要求所有批次 PROOF 有效。

## 车卡项目（独立于 PDF）

- 源语言可为 `de`（德语）/`pl`（波兰语）/`en`/`zh-CN`，目标默认 `zh-CN`。
- 先 `sheet-extract.py --json --lang <sourceLang>` 生成 `work/source.json`。
- `pregens.py detect` 标记 Quickstart/模组预设角色章节；Agent 写 `work/pregens.json`。
- `pregens.py build` 输出 `out/pregens.xlsx`（≤8）或 `out/pregens/` + `INDEX.xlsx`（>8）。
- 基础空白卡始终是 `out/character-sheet.xlsx`，不与预设卡混放。
- `sheet-check.py --mode all` 同时检查基础卡和预设卡；`SHEET-QA.json` 的 `base.ok` 与 `pregens.ok` 都必须为 true。
- 德语源保留 `ä ö ü ß`；术语表 source 用德语；具体见 `SHEET-GUIDE.md` / `PREGEN-GUIDE.md`。

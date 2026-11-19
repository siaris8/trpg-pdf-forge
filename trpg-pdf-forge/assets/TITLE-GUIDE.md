# 书名核验指南（TITLE）

书名不是项目创建时的工作名。工作名只用于目录/文件；成品书名以 `work/TITLE.json` 为准。

## 1. pass1 后：草稿

读封面、版权页、目录、前言，运行：

```powershell
node .trpg/run-python.mjs .trpg/title.py init --original "The Clockwork Observatory" --zh "钟表天文台" --source-pages 1,2 --reason "读完封面/目录后的暂定理由"
```

然后把 `work/TITLE.json` 补全：

- `titleOriginal`：封面/版权页上的原名；
- `titleZh`：暂定中文名；
- `literal`：字面直译；
- `aliases`：工作名、旧名；
- `sourcePages`、`contentEvidence`；
- `rationale`。

## 2. 全篇完成后：核验

新开一个 title-review 子代理，只读：

- 封面/封底/版权页；
- 目录；
- 每章 `h1`/`opener`；
- 章节摘要/PROOF 结论；
- 终章/封底。

不要重读整本正文。确认后：

```json
"status": "verified",
"verifiedAfterRead": true,
"reviewer": "subagent"
```

并补 `contentEvidence` 与 `rationale`，说明为什么不是字面直译。

## 3. 检查

```powershell
node .trpg/run-python.mjs .trpg/name-check.py --root .
node .trpg/run-python.mjs .trpg/title.py check --require-verified
```

检查：

- 不是工作名/下划线/占位符；
- glossary 的 `category=title` 与 `titleZh` 一致；
- 封面/页眉/TOC/书签/报告/out/GLOSSARY 一致；
- 旧书名变体不再出现。

## 4. 传播

`build-book` 默认从 `work/TITLE.json` 取书名；TASK/页眉也使用同一书名。书名定稿后重新构建封面/正文/书签/报告。

## 5. 旧项目

`titlePolicy=legacy` 的旧项目不会被阻断；手动运行 `title.py init` 后，把 `project.json` 的 `titlePolicy` 改为 `strict` 即可启用门禁。

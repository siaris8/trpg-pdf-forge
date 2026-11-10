# 校对指南（PROOF）

每一批翻译都必须经过校对，不能以“页 JSON 写完”为完成。

## 1. 顺序

```text
翻译页 JSON → 独立校对 → 修正 → PROOF.json → batch-check → 下一批
```

- 校对者优先由独立 `subagent` 担任；没有 subagent 时，主 Agent 必须重新打开源页做第二遍。
- 翻译者不能自己勾 `PROOF.ok`。
- 页 JSON 改动后，`PROOF.pageDigest` 会失效，必须重新校对并更新。

## 2. 初始化与签字

```powershell
node .trpg/run-python.mjs .trpg/proof.py init --batch <批次> --reviewer subagent
node .trpg/run-python.mjs .trpg/proof.py verify --batch <批次>
node .trpg/run-python.mjs .trpg/batch-check.py --batch <批次>
```

`proof.py init` 生成带当前页 JSON digest 的骨架；校对完成后把 `checks` 全部设为 true、`issues` 清空、`ok` 设为 true。

## 3. 八项检查

1. **漏译**：源页每个段落/卡片/表格行都有对应中文；没有只译标题。
2. **术语**：英文特技/道途/技能/武器名走 glossary；没有整段英文列表；没有“沿用原书英文名”脚注。
3. **名称**：原型、人物、地点前后一致；`opener` 和 `· 人物卡` 与 glossary `archetype` 一致。
4. **数字**：骰式、伤害、难度、创伤点、价格、页码不误译。
5. **表格**：表头/行列/合并语义与源表一致；长描述没有丢。
6. **中文**：错别字、病句、标点、引号、重复词、翻译腔。
7. **占位/残留**：无 `【】`、`TODO`、`[待校对]`、英文句子。
8. **版式语义**：p/table/card/statblock 没有混用；长文本没有塞进错误块。

## 4. 失败处理

- `PROOF.ok=false` 或任一 check false：不能继续下一批。
- `proof-digest-stale`：页 JSON 被改过，重跑 `proof.py init --force`，重新校对。
- `batch-check` 仍报术语/漏译/图片错误：回到校对，修完后更新 PROOF，再跑 batch-check。
- 只有同一批连续两次修不好、或源 PDF 不可读时，才停下报告，不要跳过。

## 5. 与自动门禁的关系

`textlib`（漏译/英文段落）、`termlib`（术语/原型名）、`build-book`（结构）是自动门禁，能挡住明显问题；`PROOF` 是语义第二遍，负责它们挡不住的内容。两者不能互相替代。


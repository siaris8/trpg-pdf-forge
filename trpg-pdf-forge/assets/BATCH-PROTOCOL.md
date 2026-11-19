# 批次协议（BATCH-PROTOCOL）

> 批次翻译/校对只读本文件 + 本批 BRIEF/PROOF-BRIEF + STYLE-MINI + PAGE-SCHEMA。  
> 不要每批重读完整 INSTRUCTIONS/STYLE/TABLE/BOOKMARKS。

## 每批顺序

1. 读 `work/batches/<id>/BRIEF.md`。
2. 渲染本批源页；正文优先读文本，只有表格/图文/文本缺失才看图。
3. 翻译：写一个 `work/bundles/<id>.json`，再运行：
   ```powershell
   node .trpg/run-python.mjs .trpg/split-bundle.py --bundle work/bundles/<id>.json --batch <id>
   ```
4. 校对：新 subagent 只读 `PROOF-BRIEF.md`、源文本、页 JSON、glossary；不要读 build-book/proof.py/TASK/完整规则。只修明显错漏，写 PROOF.json。
5. 运行 `proof.py verify`、`build-book.py --batch`、`batch-check.py --batch`。
6. 只读 `CHECK-SUMMARY.json`；失败才读完整 `CHECK.json` 的相关段。
7. `CHECK.ok=true` 后立即下一批；不要询问用户。

## 上下文纪律

- 每批使用全新 subagent；主会话只保留 `CHECK-SUMMARY.json`。
- 不读全量 `source-map.json`；只看 BRIEF 切片。
- 不重复读 TASK/完整规则；本批材料就够。
- 每 10 页目标 ≤30 steps、≤20 次工具调用、≤2 张图。
- 超过上限先停下报告，不要继续烧 token。

## 最终构建

全部批次 done 后，才读 TASK 的 FULL 段，运行 build-book --all、渲染、合并、书签、QA、报告。

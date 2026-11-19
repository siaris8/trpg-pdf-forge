# 10 页成本试点指南

目标：验证新批次协议是否真的降低 token，而不是只看静态预算。

## 准备

- 新建一个 10 页左右的小项目，不要拿现有正式项目试。
- 新建项目使用当前 3.0.x 的 `.trpg` 资产。
- 记录起始账单或本会话 usage。

## 方案 A：旧流程

1. 读完整 TASK/INSTRUCTIONS/STYLE。
2. 每页单独 `write`，逐页翻译。
3. 每次完成读完整 `CHECK.json`。
4. 记录会话审计。

## 方案 B：新流程

1. 读 `TASK` 一次，之后只读 `BRIEF` / `PROOF-BRIEF` / `STYLE-MINI` / `PAGE-SCHEMA`。
2. 每批使用全新 subagent。
3. 正文只读文本；表格/图文才读图，最多 2 张。
4. 写一个 `pages-bundle.json`，运行 `split-bundle.py`。
5. 只读 `CHECK-SUMMARY.json`。
6. 记录会话审计。

## 审计命令

```powershell
node <会话审计脚本>/audit-session.mjs <session.v4.jsonl.zstd>
```

记录：

- steps
- calls
- read_image 次数
- maxContext
- input/output/cacheRead
- 实际账单金额

## 对比指标

| 指标 | 旧 | 新 |
|---|---:|---:|
| 10 页费用 | ~2 元 | 目标 ≤0.8 元 |
| steps | ? | ≤30 |
| 工具调用 | ? | ≤20 |
| read_image | ? | ≤2 |
| 主会话最大 context | ? | ≤50k |
| 漏译/错名 | 基线 | 不增加 |

## 通过条件

- 费用明显下降；
- 漏译、错名、数字/表格错误没有增加；
- 校对仍独立完成；
- 书名/专名门禁不被绕过。

如果新流程没有降费，优先检查：

1. 是否仍在主会话逐页翻译；
2. 是否读了整页图；
3. 是否每批重读完整 TASK/规则；
4. 是否读了完整 CHECK；
5. 是否没有使用全新 subagent。

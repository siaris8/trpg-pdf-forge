# 页 JSON 规范

`work/pages/*.json` 是翻译与排版之间的唯一数据结构；`build-book.py` 只认这个 schema，不再每个项目现写构建脚本。

## 顶层字段

| 字段 | 必填 | 说明 |
|---|---|---|
| `src` | 是（`kind=toc` 除外） | 来源 PDF 页号数组，如 `[22,23]`；一个输出页可合并多个源页 |
| `kind` | 否 | `text`（默认）、`opener`、`card`、`table`、`toc` |
| `dense` | 否 | 紧凑页，给 `section` 加 `dense` |
| `eyebrow` | 否 | 页眉小字（如“第 2 章 · 创建你的英雄”） |
| `h1` | 否 | 页内一级标题（会进书签） |
| `h2` | 否 | 页名（无 h1 时使用） |
| `dek` | 否 | 导语 |
| `opener` | 否 | 章节扉页：`{number,en,title,lede,art:{src,alt}}` |
| `top` | 否 | 全宽块（表格前） |
| `col1` / `col2` | 否 | 左右栏块；给 1/2/3 个 `.col` 都能等分 |
| `bottom` | 否 | 全宽块（栏后） |
| `abridged` | 否 | 明确声明这是速查/摘要页（允许译文明显短于源页；仍会检查整段英文） |
| `toc` | 否 | 目录页；允许译文短于源页，不触发漏译比例 |
| `noToc` | 否 | 不进目录 |
| `perPage` | 否 | 目录页每页行数（默认 68） |

## 块类型

| `type` | 关键字段 |
|---|---|
| `p` | `text` |
| `h2` / `h3` / `h4` | `text`、`sec` |
| `read` | `label`、`text` |
| `rule` | `label`、`text` |
| `note` | `label`、`text` |
| `info` | `text` |
| `table` | `caption`、`head[]`、`rows[][]`、`widths[]`、`align[]`、`compact`、`wide`、`sheet` |
| `figure` | `src`、`caption`、`alt`、`height`、`fullBleed` |
| `statblock` | `name`、`tagline`、`stats[[k,v]]`、`text` |
| `list` | `items[]` |
| `quote` | `text` |
| `pullquote` | `text`、`cite` |
| `card` | `label`、`title`、`role`、`fields[[k,v]]` |
| `sheet` | `name`、`role`、`meta[[k,v]]`、`portrait`、`left[]`、`right[]`、`bottom[]`、`track`、`marks` |
| `display` | `text`、`class`、`style` |
| `footnote` | `text` |

## 校验

`build-book.py --check` / `batch-check.py` 会检查：

- `src` 存在且为合法页号；
- 块类型在表内；表格 `rows` 每行长度等于 `head`；
- `figure` 有 `src`，且图片文件存在；
- 页 JSON 内没有 `【】` / `TODO` / `待补` 占位符。

未知块类型直接报错，不会静默丢内容。

## 示例

```json
{
  "src": [22, 23],
  "kind": "text",
  "eyebrow": "第 2 章 · 创建你的英雄",
  "h2": "个人化",
  "col1": [
    { "type": "p", "text": "正文……" },
    { "type": "read", "label": "READ · 朗读", "text": "……" }
  ],
  "col2": [
    { "type": "table", "caption": "表 2 · 属性", "head": ["属性", "数值"], "rows": [["强横", "3"]] }
  ]
}
```

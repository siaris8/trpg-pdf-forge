# PDF 书签（WPS / Adobe）

目标：PDF 不要求正文超链接，但必须有**书签树**；WPS 左侧「书签/目录」能展开、点击跳页。

## 1. 规则

- 全篇 PDF 必须有书签；单页预览/难页不强制。
- `h1` = 1 级（章）；`h2` = 2 级（节）；`h3` 只有显式 `data-bookmark` 时才进书签（3 级）。
- 默认每条 `.page` 第一个 `h1` 是章；同一页的 `h2` 是节。
- 角色卡、数据块、NPC 卡里的标题不会自动成为书签；需要时加 `data-bookmark`。
- 书签标题与印刷目录一致；目录可以是纯文本，不要求可点击。
- 书签页码 = PDF 物理页；封面页自动偏移。
- 最多 500 条；超过时减少 `h3`，不要删章/节。

## 2. HTML 写法

```html
<section class="page">
  <div class="page-head">
    <h1>第一章 锁闭的天文台</h1>
  </div>
  <h2>天文台入口</h2>
  ...
  <h3 data-bookmark data-bookmark-level="3">钟表守卫的笔记</h3>
</section>
```

可选：

- `data-bookmark="自定义书签标题"`：覆盖显示文字。
- `data-bookmark-level="1|2|3"`：覆盖层级。

## 3. 生成流程

```powershell
# 1. 正文 HTML → PDF，同时扫描 .page 标题
node .trpg/render-pdf.mjs --html book/body.html --pdf out/body.pdf --header "书名" --outline out/outline-body.json

# 2. 合并封面 + 正文，写书签和报告
node .trpg/run-python.mjs .trpg/merge-pdf.py out/cover.pdf out/body.pdf out/book.pdf --outline out/outline-body.json --strict-outline --report out/BOOKMARKS.json

# 3. 检查书签/字体/Type3
node .trpg/run-python.mjs .trpg/check-pdf.py out/book.pdf --require-bookmarks --json out/QA.json
```

`--strict-outline` 会检查：正文 PDF 页数 == `.page` section 数。不一致说明有分页溢出，先修排版，不能带错书签交付。

## 4. 书签 JSON

`outline-body.json` 的页码是正文页（不含封面），`merge-pdf.py` 会加封面偏移：

```json
{
  "sections": 120,
  "items": [
    { "title": "第一章 锁闭的天文台", "level": 1, "page": 1 },
    { "title": "天文台入口", "level": 2, "page": 1 }
  ]
}
```

合并后 `out/BOOKMARKS.json` 记录最终页码、层级、`PageMode`。

## 5. WPS 注意

- 设置 `/PageMode /UseOutlines`，WPS 打开时可直接看到书签面板。
- 只写 outline，不写正文链接注释；没有超链接也正常。
- WPS 版本差异以实际打开为准；自动检查只能验证 PDF outline/PageMode。
- 目录页码与书签页码应一致；封面偏移由脚本处理，不手填。

## 6. 常见故障

- `正文 PDF 页数 != sections`：某页内容溢出，先修页面高度/拆表。
- 书签页码全偏 1：封面页数未计入；用 `merge-pdf.py`，不要手工加。
- WPS 不显示：确认文件确实是合并后的 `out/book.pdf`，不是 `out/body.pdf`。
- 书签重复：同一标题在多个 `.page` 的 `h1/h2` 重复；用 `data-bookmark` 或去掉多余标题层级。

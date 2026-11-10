# 演示样张：锁闭的天文台

这是一份原创的英文迷你模组，用于验证「TRPG 翻译工坊」的翻译、排版、字体和审核流程。它不是《庄家优势》的正文，也不使用参考 PDF 的插图。

## 文件

- `source.en.md` / `source.en.pdf`：原创英文源文件，内嵌 2 张原创插图。
- `art/`：原创插图（圆顶、钟表室）。
- `extracted/`：从源 PDF 提取的插图与 `manifest.json`。
- `preview.html` / `preview.pdf` / `preview.png`：展示页，包含章节扉页、朗读框、规则条、表格、便签和 1 张源插图。
- `hard.html` / `hard.pdf` / `hard.png`：难页，包含 3 张表、数据块、NPC 卡、1 张源插图和提示框。
- `tables.html` / `tables.pdf` / `tables.png`：表格/人物卡样张，包含角色卡、武器表、法术表、原卡附录、WPS 书签。
- `tables-outline.json` / `tables-bookmarks.json`：书签来源与最终页码/PageMode。
- `art/character-card.png`：用于“抽象表 + 原卡保留”演示的原创原卡。
- `contact-sheet.png`：两页并排预览。
- `preview-qa.json` / `hard-qa.json` / `tables-qa.json`：字体、Type3 与嵌入图片数量检查结果。
- `image-check.json`：源 PDF 插图是否实际进入两页的守卫结果。

> 预览页只用于预览版式与可读性，不一定是最终成品；这也是工坊审核门的含义。

## 验收

- A4，一页一张，无裁切。
- 字体：SimSun / Microsoft YaHei，Type0，0 Type3。
- 表格 8.5 pt 以上，图有图注。
- 预览页与难页各嵌入 1 张源 PDF 插图（PDF `images` = 1），不是只提取不排版。
- 难页元素多但仍可读。
- 表格样张：角色卡/武器表/法术表可见；原卡在附录保留；0 Type3；2 条书签、`UseOutlines`。

## 重新生成

在插件目录运行：

```powershell
node assets/run-python.mjs assets/demo/make-art.py
node assets/demo/make-source.mjs
node assets/render-pdf.mjs --html assets/demo/source.en.html --pdf assets/demo/source.en.pdf --no-header
node assets/run-python.mjs assets/extract-images.py assets/demo/source.en.pdf --out assets/demo/extracted
node assets/render-pdf.mjs --html assets/demo/preview.html --pdf assets/demo/preview.pdf --header "锁闭的天文台 · 预览页"
node assets/render-pdf.mjs --html assets/demo/hard.html --pdf assets/demo/hard.pdf --header "锁闭的天文台 · 难页"
node assets/run-python.mjs assets/check-pdf.py assets/demo/preview.pdf --json assets/demo/preview-qa.json
node assets/run-python.mjs assets/check-pdf.py assets/demo/hard.pdf --json assets/demo/hard-qa.json
node assets/run-python.mjs assets/image-check.py assets/demo/source.en.pdf assets/demo/preview.pdf assets/demo/hard.pdf --json assets/demo/image-check.json
node assets/run-python.mjs assets/render-pages.py assets/demo/preview.pdf assets/demo/preview.png
node assets/run-python.mjs assets/render-pages.py assets/demo/hard.pdf assets/demo/hard.png
node assets/run-python.mjs assets/contact-sheet.py assets/demo/contact-sheet.png assets/demo/preview.png assets/demo/hard.png
node assets/run-python.mjs assets/demo/make-character-card.py
node assets/render-pdf.mjs --html assets/demo/tables.html --pdf assets/demo/tables-raw.pdf --header "锁闭的天文台 · 表格/人物卡样张" --outline assets/demo/tables-outline.json
node assets/run-python.mjs assets/bookmarks.py assets/demo/tables-raw.pdf --outline assets/demo/tables-outline.json --out assets/demo/tables.pdf --report assets/demo/tables-bookmarks.json --strict-pages
node assets/run-python.mjs assets/check-pdf.py assets/demo/tables.pdf --require-bookmarks --json assets/demo/tables-qa.json
node assets/run-python.mjs assets/render-pages.py assets/demo/tables.pdf assets/demo/tables-pages
```

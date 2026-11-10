# 字体说明

目标：WPS 能打开，PDF 内所有字体都已嵌入，且 **0 个 Type3**。

## 默认：系统静态字体（推荐）

- 正文：`SimSun` / 宋体
- 标题：`Microsoft YaHei` / 微软雅黑
- 拉丁展示：`Arial Narrow` / `Arial`

这些字体在 Windows 和 WPS 环境中通常可用，Chrome/Edge 会把它们嵌入为 Type0。示例样张就是用这套字体导出的。

## 可选：静态思源字体

如果机器上已安装静态版：

- 正文：`Source Han Serif SC` / 思源宋体
- 标题：`Source Han Sans SC` / 思源黑体

请确认字体文件是静态 TTF/OTF，不是 `*-VF.ttf` 变量字体。变量字体在 Chrome/Edge 中可能被输出为 Type3。

可参考（自行确认许可与版本）：

- Adobe Source Han Serif：<https://github.com/adobe-fonts/source-han-serif/releases>
- Adobe Source Han Sans：<https://github.com/adobe-fonts/source-han-sans/releases>
- 霞鹜文楷：<https://github.com/lxgw/LxgwWenKai/releases>

下载后建议放进本目录或系统字体目录，并在渲染前用 `check-pdf.py` 检查。

## 禁止

- 不要使用 `NotoSerifSC-VF.ttf`、`NotoSansSC-VF.ttf` 等变量字体；实测可能产生 Type3。
- 不要在 SVG 中写 `<text>`；SVG 文字可能被 Chrome 输出为 Type3。
- 不要给含中文的标签设置纯拉丁字体栈；逐字回退也可能产生 Type3。

## 检查命令

```powershell
node .trpg/run-python.mjs .trpg/check-pdf.py out/book.pdf --json out/QA.json
```

`type3` 必须为 0；如果有，先回退到宋体/雅黑，重新渲染。

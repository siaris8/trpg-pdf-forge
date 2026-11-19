TRPG 翻译工坊 · 插件测试包
版本：3.0.1 / 2026-11-19

这个包是 DeepSeek Harness 的插件源码目录。
压缩包内：
- trpg-pdf-forge/       插件目录（安装这个）
- sheet-demo-project/   Excel 示例（xlsx + plan + QA + preview）
- README-FIRST.txt      本说明

版本 3.0.1：去掉机器路径与旧项目残留 + 测试包归档
- 报告类 JSON（*-qa.json、IMAGE-CHECK.json、manifest.json、BOOKMARKS.json、LAYOUT.json）只记相对路径，不再写本机绝对路径。
- 新增 assets/reportpath.py；check-pdf / image-check / extract-images / bookmarks / merge-pdf / layout-check / sheet-check / sheet-extract / export-glossary / render-pdf 全部改用相对路径。
- 清理示例产物、文档和测试里的旧工作区路径与旧项目名；示例书签/QA 文件不再指向作者本机目录。
- 测试包每次按版本重新生成，旧压缩包自动移入 oldversion/。
- 测试 81 项。

版本 3.0.0：书名权威 + 译名一致性
- 新增 work/TITLE.json、title.py init/check/apply；全篇完成后 title-review 核验书名。
- 新项目 strict：书名未 verified 不能 build；旧项目 legacy 不强制迁移。
- 封面/页眉/TOC/书签/报告/glossary 使用同一 titleZh；旧书名残留会失败。
- glossary 增加 name/place/organization/title 类别；name-check.py 检查冲突。
- 测试 81 项。

版本 2.3.0：成本优先的批次上下文
- 每批使用全新 subagent；主会话只保留 CHECK-SUMMARY，不保留页全文。
- 正文默认不读整页图，只有表格/图文/文本缺失才读，每批 ≤2 张。
- 整批写一个 pages-bundle，再 split-bundle 拆分。
- 新增 STYLE-MINI / BATCH-PROTOCOL / CHECK-SUMMARY / TERM-SUMMARY。
- 每 10 页目标 ≤30 steps、≤20 工具调用；测试 78 项。

版本 2.2.0：波兰语源
- 新增 sourceLang=pl：波兰语原文 → 中文；保留 ą ć ę ł ń ó ś ź ż。
- PDF/车卡 UI 增加 Polski；sheet-extract --lang pl；预设卡识别加入波兰语关键词。
- terms/textlib/PROOF/SHEET/PREGEN 指南增加波兰语检查。
- 测试 76 项。

版本 2.1.1：停止污染无关工作区
- `/info` 不再创建 trpg-projects / trpg-sheets；只有真正新建项目时才建目录。
- 根记录只保存有项目的目录；空目录/失效路径已清理。
- 新增 cleanup-empty-trg-roots.ps1（默认 dry-run，-Apply 才删除空目录）。
- 测试 74 项。

版本 2.1.0：预设卡 + 德语源
- 车卡项目自动检测 Quickstart/模组预设角色，输出 out/pregens.xlsx 或 out/pregens/ 多文件 + 索引。
- 预设卡（pregen-pc）与 NPC 分开标记，不混入空白「人物卡」。
- 新增德语源 → 中文：sourceLang=de、保留 ä ö ü ß、德语术语表和校对清单。
- TASK_VERSION 10 / SHEET_TASK_VERSION 4；测试 72 项。

版本 2.0.1：提示词去项目残留
- 移除提示词/文档中的旧项目页数、固定页段和具体案例；改为按 survey.totalPages / 总页数动态处理。
- 避免 Agent 把旧项目规模、旧页面名或旧术语当成当前项目。
- TASK_VERSION 8；测试 66 项。

版本 2.0.0：强制校对 + 状态/门禁收口
- 每批翻译后必须独立校对：PROOF.json（pageDigest + 8 项 checks）通过后才能 batch-check。
- 页 JSON 改动会让 PROOF 过期；翻译者不能自己勾 PROOF。
- 阶段增加 batches/build；下一步按钮、门禁、状态统一由 workflow/gates 生成。
- 页 JSON 统一 page-schema.json；删除旧 block-schema.json；文档收口到 PIPELINE.md / PROOF-GUIDE.md。
- TASK_VERSION 8；测试 66 项。

版本 1.11.0：术语门禁 + 方正车卡
- 新增 term-check.py / term-extract.py：英文特技/道途列表、缺词条、原型名不一致（如原型名变体）都会阻断。
- 术语表候选可导出为 work/term-candidates.csv；必须用中文名，禁止“沿用原书英文名”脚注。
- Excel 模板/示例改为 8 等分方格：A–H 列宽 13.5、行高 24/26、A4 纵向、水平居中。
- sheet-check.py layout v3：列宽不等、行高缺失、非 A4 或未设打印区域直接失败。
- TASK_VERSION 7 / SHEET_TASK_VERSION 3；测试 61 项。

版本 1.10.1：修复漏译漏检
- batch-check / build-book 新增文本完整性门禁：整段英文、译文/源页字数 <20% 直接失败，<28% 警告。
- 速查/摘要页可在页 JSON 顶层写 abridged: true 明确豁免。
- 进度状态要求 CHECK.json 为 ok:true 才算 done；失败批次不会被跳过。
- TASK_VERSION 升到 6；测试 56 项。

版本 1.10.0：全量结构清单 + 一次输入自动分批
- 新增 source-map.py：一次扫描整本，产出表候选、插图、整页扫描、栏数与标题；保留手工审计。
- BRIEF 未全量审计时明确写“未审计”，不再一律“无”；审计后列出真实表/图。
- 工坊只保留一个“开始全篇（自动分批）”入口：复制一次后，Agent 从 current 顺序做到全篇构建。
- 每批 check ok 后自动继续，不再逐批询问用户；同一批连续两次修不好才停下报告。
- TASK_VERSION 升到 5；页 JSON 规范见 PAGE-SCHEMA.md；测试 54 项。

版本 1.9.0：大规模书批次流水线
- 新增 batch-plan.py：按 PDF 目录自动拆批（默认每批 ≤16 源页），生成 work/batches.json 和每批 BRIEF.md。
- 新增 build-book.py：统一页 JSON 构建器，替代每个项目现写的 build-body.py；支持 --all / --batch / --check。
- 新增 batch-check.py：检查覆盖、占位符、图片、表格，写 CHECK.json 与 progress.json。
- 工坊显示总进度/当前批/批次列表；可复制“本批任务”，全部完成才构建全篇。
- 页 JSON 规范见 PAGE-SCHEMA.md；TASK_VERSION 升到 4。
- 测试 51 项。

版本 1.8.0：排版体检 + 栏数自适应
- 新增 layout-check.py：逐页填充率与大块空白体检，生成 LAYOUT.json；只提示，不阻断审核。
- 分页改为按译文体量（目标 65%–85%），不再“一源页 = 一输出页”；表格/图/章节扉页/后记的留白豁免。
- .columns 改为 flex 自适应：1/2/3 个栏自动等分，不再出现“第 3 栏掉行、旁边空一格”。
- 工坊审核卡片显示偏空页数与合并建议；TASK_VERSION 升到 3。
- 体检只是建议：表格旁、章节末页、图前后的正常留白不会被当成问题。
- 测试 40 项。

版本 1.7.1：开发者署名
- 开发者：希亚蕾丝（界面标题旁与 README 均已署名）。
- 功能与 1.7.0 相同。

版本 1.7.0：项目库跨工作区 + 删除/回收站
- 换工作区不再看不到旧项目：工坊聚合所有已知工作区（注册表、会话历史、可解码的旧会话目录、TRPG_STUDIO_LEGACY_ROOTS）。
- 发现过的根记录到 profile 的 trpg-studio-roots.json，会话目录被清理也能找回。
- PDF 项目与 Excel 车卡都支持删除：移到所在根的 .trash；回收站可恢复或彻底删除。
- 旧项目原地保留，不复制不搬家；列表里标「其他工作区」。
- 新增 /delete 与 /trash/list|restore|purge 接口；测试 36 项。

版本 1.6.1：维护版（功能与 1.6.0 相同）
- 版本号只从 package.json 读取，index.js / client.js / README 不再各存一份。
- Python 辅助脚本设置 PYTHONDONTWRITEBYTECODE=1，不再往 assets/ 写 __pycache__。
- test/make-demo-project.mjs 不再写死绝对路径，支持命令行参数和 TRPG_STUDIO_ROOT。
- 测试包不再打包含 __pycache__。

版本 1.6.0：Excel 人物卡版式重做
- 新增 sheet-template.xlsx：统一标题 A1:H2、列宽、行高、边框、输入/计算格配色、冻结、打印区域。
- 版式优先：深蓝标题带、金色分区、深色表头、关闭网格线、A4 打印区域、fitToWidth。
- 公式可选：0 公式也能通过；有公式时才检查 fullCalcOnLoad。
- sheet-check.py 增加 layoutScore/layoutIssues；标题未合并/无打印区域/网格线未关会失败。
- 人物卡/车卡步骤/资源/技能/武器/说明全部重排；不再用 90 宽单列堆字。
- 保留 1.5 的独立 Excel 面板/项目/API/审核门禁；PDF 1.4 功能不变。

安装
1. 解压整个 zip。
2. DeepSeek Harness → 设置 → 插件 → 从本地目录安装。
3. 选择 trpg-pdf-forge 文件夹（不要只选 zip）。
4. 重启 DSH；标题旁应显示 v3.0.1。
5. 侧栏两个入口：PDF 翻译、Excel 车卡 · 实验。
6. 打开工坊应能看到以前工作区里的旧项目（标「其他工作区」）；删除后可在左侧垃圾桶恢复。

Excel 快速测试
1. 打开「Excel 车卡 · 实验」，欢迎页会显示新版人物卡预览。
2. 新建项目：填标题/规则系统，上传规则或粘贴说明。
3. 复制车卡任务给 Agent；Agent 从 .trpg/sheet-template.xlsx 复制，不从空白重排。
4. 产出 character-sheet.xlsx + SHEET-QA.json + SHEET-REPORT.md 后通过审核。
5. 示例：sheet-demo-project/sheet-demo.xlsx；空白模板：trpg-pdf-forge/assets/sheet-template.xlsx。

检查
- node --test test/*.test.mjs：81 项通过。
- sheet-demo：版式 100 分、27 公式、10 命名区域、3 步骤。
- 无公式副本仍通过（公式可选）。
- 取消标题合并/打印区域会失败（版式门禁）。
- 多工作区聚合、删除→回收站→恢复/彻底删除均有测试覆盖。

说明
- openpyxl 不计算公式；Excel/WPS 打开时由 fullCalcOnLoad 重算。
- 只生成 .xlsx，不生成宏/VBA。
- 实验功能；复杂规则仍需人工校对。

开发者：希亚蕾丝
内部包名：@local/mystery-atelier-ui
界面名称：TRPG 翻译工坊



















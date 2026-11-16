import path from 'node:path';

const STAGES = {
  pass1: {
    label: 'PASS 1 ONLY — 预览页 + 难页',
    goal: '只做预览页 + 难页，证明版式、表格、图片和字体可用；完成后停下等审核。',
    forbidden: '禁止生成 out/book.pdf、禁止翻译全篇、禁止进入全篇目录。',
    next: '用户审核两页后才会生成全篇任务。',
  },
  revision: {
    label: 'PASS 1 REVISION — 只重做预览页 + 难页',
    goal: '按 REVIEW.json 的意见只修两页；修完停下等再次审核。',
    forbidden: '禁止重做全篇、禁止生成 out/book.pdf。',
    next: '用户再次审核。',
  },
  full: {
    label: 'FULL BOOK — 构建与交付',
    goal: '所有批次完成后，构建全篇并交付 PDF、报告、术语表、表格计划和书签。',
    forbidden: '禁止在批次未完成时构建全篇；禁止重新翻译整本或跳过最终 QA/书签/图片/表格门禁。',
    next: '全篇交付后由用户验收。',
  },
  done: {
    label: 'DELIVERED — 已完成',
    goal: '项目已交付；除非用户提出修改，不要继续改写。',
    forbidden: '不要重新生成或覆盖已交付文件。',
    next: '等待用户反馈。',
  },
};

function win(file) {
  return path.resolve(file);
}

function pass1Commands({ headerArg, source, pass1Dir }) {
  return `# 1) 提取并分类源插图
node .trpg/run-python.mjs .trpg/extract-images.py source/source.pdf --out work/images

# 2) 渲染两页
node .trpg/render-pdf.mjs --html ${pass1Dir}/preview.html --pdf out/pass1/preview.pdf --header "${headerArg} · 预览页"
node .trpg/render-pdf.mjs --html ${pass1Dir}/hard.html --pdf out/pass1/hard.pdf --header "${headerArg} · 难页"

# 3) 两页 QA（必须分别写文件）
node .trpg/run-python.mjs .trpg/check-pdf.py out/pass1/preview.pdf --json out/pass1/preview-qa.json
node .trpg/run-python.mjs .trpg/check-pdf.py out/pass1/hard.pdf --json out/pass1/hard-qa.json

# 4) 图片与表格/原卡门禁
node .trpg/run-python.mjs .trpg/image-check.py ${source} out/pass1/preview.pdf out/pass1/hard.pdf --json out/pass1/IMAGE-CHECK.json
node .trpg/run-python.mjs .trpg/check-card-plan.py work/table-plan.json --out out/TABLE-PLAN.json

# 5) PNG 与接触表
node .trpg/run-python.mjs .trpg/render-pages.py out/pass1/preview.pdf out/pass1/preview.png
node .trpg/run-python.mjs .trpg/render-pages.py out/pass1/hard.pdf out/pass1/hard.png
node .trpg/run-python.mjs .trpg/contact-sheet.py out/pass1/contact-sheet.png out/pass1/preview.png out/pass1/hard.png

# 6) 书页填充体检（只提示，不阻断审核）
node .trpg/run-python.mjs .trpg/layout-check.py out/pass1/preview.pdf --html book/pass1/preview.html --pdf out/pass1/hard.pdf --html book/pass1/hard.html --out out/pass1/LAYOUT.json`;
}

function fullCommands({ headerArg, source, title }) {
  return `# 0) 构建全篇（所有批次 done 之后）
node .trpg/run-python.mjs .trpg/build-book.py --all --title "${title}" --out book/body.html

# 1) 全篇渲染 + 书签
node .trpg/render-pdf.mjs --html book/cover.html --pdf out/cover.pdf --no-header
node .trpg/render-pdf.mjs --html book/body.html --pdf out/body.pdf --header "${headerArg}" --outline out/outline-body.json
node .trpg/run-python.mjs .trpg/merge-pdf.py out/cover.pdf out/body.pdf out/book.pdf --outline out/outline-body.json --strict-outline --report out/BOOKMARKS.json
node .trpg/run-python.mjs .trpg/check-pdf.py out/book.pdf --require-bookmarks --json out/QA.json
node .trpg/run-python.mjs .trpg/layout-check.py out/book.pdf --html book/body.html --out out/LAYOUT.json

# 2) 全篇图片 + 表格/原卡
node .trpg/run-python.mjs .trpg/image-check.py ${source} out/book.pdf --min-target 3 --json out/IMAGE-CHECK.json
node .trpg/run-python.mjs .trpg/check-card-plan.py work/table-plan.json --out out/TABLE-PLAN.json

# 3) 术语表 + 报告 + 页面 PNG
node .trpg/run-python.mjs .trpg/export-glossary.py --source glossary/glossary.filled.csv --csv out/GLOSSARY.csv --md out/GLOSSARY.md
Copy-Item .trpg/REPORT.template.md out/TRANSLATION-REPORT.md
# 填完报告所有【】占位，不要保留占位符
node .trpg/run-python.mjs .trpg/render-pages.py out/book.pdf out/pages`;
}

const COMMON = `- 不编造规则、数值、表格内容；不确定处标 \`[待校对]\`。
- 术语表先完成再翻译；用户 \`locked=1\` 的条目绝不覆盖。
- 0 Type3、字体全部嵌入；表格 8.5 pt 起；正文不堆砌。
- 人物卡/武器/法术/装备优先表格；原卡难表格化时“抽象表 + 原图”。
- 分页按译文体量：单页目标 65%–85%，不足先合并相邻页/前移内容，不按源书页硬切。
- 大规模书按 \`work/batches.json\` 分批：每批只做 \`work/batches/<id>/BRIEF.md\` 的范围；自动模式 check ok 后立即继续下一批，不要一次翻整本。
- 每页逐段对照源页，不得只译标题或部分段落；\`batch-check\` 会按源页字数比例和整段源语言查漏译。速查/摘要页才可在页 JSON 顶层写 \`abridged: true\`。
- 术语表先行：每个源语言特技/道途/技能/法术/武器/组织名都必须有中文词条；页 JSON 必须使用中文名，禁止整段保留源语言，禁止用“沿用原书英文名/保留原文名”脚注绕过；原型名以术语表 \`archetype\` 行为唯一来源。\`term-check.py\` 会检查并生成候选。
- 德语源：保留 ä ö ü ß 的正确编码；术语表 source 用德语；不要把德语长复合词硬拆成错误中文；德语引号只在源文对照中出现，译文用中文标点。
- 波兰语源：保留 ą ć ę ł ń ó ś ź ż；术语表 source 用波兰语；不要把波兰语变音字符转成 ASCII；波兰语引号只在源文对照中出现，译文用中文标点。
- 每批翻译后必须先校对：读 \`PROOF-BRIEF.md\`，逐段对照源页，写 \`PROOF.json\`（checks 全 true、digest 未过期）后才运行 \`batch-check\`；翻译者不能自己勾 PROOF。
- 完整规则见 \`.trpg/PIPELINE.md\`、\`.trpg/PROOF-GUIDE.md\`、\`.trpg/INSTRUCTIONS.md\`、\`.trpg/STYLE.md\`、\`.trpg/TABLE-GUIDE.md\`、\`.trpg/BOOKMARKS.md\`。`;

export function buildTask(project, dir, gate) {
  const options = project.options || {};
  const stage = STAGES[gate] || STAGES.pass1;
  const source = win(path.join(dir, project.source?.path || 'source/source.pdf'));
  const glossary = win(path.join(dir, 'glossary/glossary.csv'));
  const filled = win(path.join(dir, 'glossary/glossary.filled.csv'));
  const reviewPath = win(path.join(dir, 'REVIEW.json'));
  const headerArg = String(project.title || 'TRPG').replace(/["\r\n]/g, ' ');
  const pass1Dir = 'book/pass1';
  const review = project.review || {};
  const reviewBlock = review.decision
    ? `\n## 最近一次审核\n\n- 决定：${review.decision}\n- 意见：${review.note || '（无）'}\n- 时间：${review.at || ''}\n`
    : '';
  const isPass1 = gate === 'pass1' || gate === 'revision';
  if (gate === 'done') {
    return `# ${project.title} — 已交付

> TASK_VERSION: 9
> 当前阶段：**DELIVERED — 已完成**

不要继续改写。若用户提出修改，先读 \`REVIEW.json\` 和 \`out/TRANSLATION-REPORT.md\`，确认范围后再动文件。
`;
  }
  const deliverables = isPass1
    ? `| 文件 | 要求 |
|---|---|
| \`out/pass1/preview.pdf\` / \`preview.png\` | 预览页 |
| \`out/pass1/hard.pdf\` / \`hard.png\` | 难页 |
| \`out/pass1/contact-sheet.png\` | 两页接触表 |
| \`out/pass1/preview-qa.json\` / \`hard-qa.json\` | 各自 \`ok:true\`、\`type3:0\` |
| \`out/pass1/IMAGE-CHECK.json\` | \`ok:true\`；源书无可用图时 0 图允许 |
| \`out/TABLE-PLAN.json\` | 表格/人物卡计划，\`ok:true\` |
| \`out/pass1/REPORT.md\` | 选页理由、难点、图片/表格统计、已知问题 |
| \`out/pass1/LAYOUT.json\` | 排版体检（提示，不阻断审核） |`
    : `| 文件 | 要求 |
|---|---|
| \`out/book.pdf\` | 最终 PDF，带层级书签 |
| \`out/book.html\` | 可编辑 HTML |
| \`out/QA.json\` / \`out/QA.md\` | \`ok:true\`，0 Type3，书签/页面信息完整 |
| \`out/BOOKMARKS.json\` | \`ok:true\`，\`PageMode=UseOutlines\` |
| \`out/IMAGE-CHECK.json\` | 全篇图片守卫 \`ok:true\` |
| \`out/TABLE-PLAN.json\` / \`out/SOURCE-CARDS/\` | 表格/原卡计划与索引 |
| \`out/TRANSLATION-REPORT.md\` | 填完，无 \`【】\` 占位 |
| \`out/GLOSSARY.csv\` / \`out/GLOSSARY.md\` | 术语表 |
| \`out/pages/\` | 页面 PNG |
| \`out/LAYOUT.json\` | 排版体检（提示，不阻断交付） |
| \`work/progress.json\` | 批次进度（translated == total 才能构建） |`;
  const gateChecks = isPass1
    ? `- [ ] 两页 PDF/PNG/接触表齐全
- [ ] \`preview-qa.json\`、\`hard-qa.json\` 均 \`ok:true\`、\`type3:0\`
- [ ] \`IMAGE-CHECK.json\` 为 \`ok:true\`
- [ ] \`TABLE-PLAN.json\` 为 \`ok:true\`，原卡已复制到 \`out/SOURCE-CARDS/\`
- [ ] \`REPORT.md\` 写明选页/难点/已知问题
- [ ] 已生成 \`out/pass1/LAYOUT.json\`（偏空页已处理或确认可接受）
- [ ] 停下，等待用户审核`
    : `- [ ] \`check-pdf.py --require-bookmarks\` 通过，0 Type3
- [ ] \`BOOKMARKS.json\` 为 \`ok:true\`
- [ ] 全篇图片守卫与 \`TABLE-PLAN.json\` 均 \`ok:true\`
- [ ] 报告无 \`【】\` 占位；术语表/原卡/页面 PNG 齐全
- [ ] 已生成 \`out/LAYOUT.json\`（偏空页已处理或确认可接受）
- [ ] \`work/progress.json\` 的 \`translated\` 等于 \`total\`（所有批次 done）
- [ ] 停下，等待用户验收`;
  return `# ${project.title} — ${stage.label}

> TASK_VERSION: 9
> 当前阶段：**${stage.label}**
> 下一阶段：${stage.next}
> 源语言：${project.sourceLang || 'en'} / 目标语言：${project.targetLang || 'zh-CN'}

## 0. 本轮目标

${stage.goal}

**禁止**：${stage.forbidden}

## 1. 输入

- 项目目录：\`${win(dir)}\`
- 源 PDF：\`${source}\`
- 术语表：\`${glossary}\`
- 已填术语表：\`${filled}\`
- 审核记录：\`${reviewPath}\`
- 版式：${options.style || 'paper-archive'}；字体：${options.fontPair === 'source-han' ? 'source-han' : 'wps-safe'}；宽表：${options.wideTables || 'auto'}
- 必读：\`.trpg/WORKFLOW.md\`、\`.trpg/INSTRUCTIONS.md\`、\`.trpg/STYLE.md\`、\`.trpg/TABLE-GUIDE.md\`${isPass1 ? '' : '、`.trpg/BOOKMARKS.md`'}
${reviewBlock}
## 2. 必须产出

${deliverables}

## 3. 本轮命令

\`\`\`powershell
${isPass1 ? pass1Commands({ headerArg, source, pass1Dir }) : fullCommands({ headerArg, source, title: headerArg })}
\`\`\`

## 4. 验收门

${gateChecks}

## 5. 底线（完整规则见参考文件）

${COMMON}
${isPass1 ? '' : '- 全篇书签由 PDF outline 提供，不要求正文超链接；书签页码必须与物理页一致。'}

## 6. 停止条件

完成本轮产出与验收后停止，不要自行进入下一阶段。若某检查失败，先按错误修，不要用删文件/改状态绕过。
`;
}

export function promptsFor(project, dir, phase, progress = null) {
  const task = win(path.join(dir, 'TASK.md'));
  const current = progress?.current
    ? (progress.batches || []).find((batch) => batch.id === progress.current) || null
    : null;
  const start = `请读取并执行这个 TRPG 翻译排版项目的任务书：\n${task}\n\n硬性要求：首轮只完成“预览页 + 难页”，导出 PDF/PNG 后立即停止，不要翻译全篇。`;
  const revise = `我要求修改预览页/难页。请读取并执行：\n${task}\n\n先读 REVIEW.json 的修改意见，只重做这两页，完成后停止。`;
  const plan = `请读取并执行：\n${task}\n\n这本书较大：先运行批次计划（不要翻译正文）：\nnode .trpg/run-python.mjs .trpg/batch-plan.py plan --pdf source/source.pdf --source-map work/source-map.json --pages work/pages --out work/batches.json --progress work/progress.json\n然后为当前批生成说明：\nnode .trpg/run-python.mjs .trpg/batch-plan.py brief <当前批 id>\n完成后停下，等待用户复制下一批任务。`;
  const batch = current
    ? `我已在工坊通过预览页和难页。请读取 work/batches/${current.id}/BRIEF.md 与 TASK.md，只完成第 ${current.id} 批（${current.title}，源页 ${current.pages?.[0]}–${current.pages?.[1]}）：\n1. 只翻译本批，写成 work/pages/${current.id}-*.json；\n2. 运行 build-book.py --batch ${current.id} 与 batch-check.py --batch ${current.id}；\n3. CHECK.json 为 ok:true 后：自动模式继续下一批；只有用户要求单批时才停下。`
    : plan;
  const proof = current
    ? `请读取 work/batches/${current.id}/PROOF-BRIEF.md 与 TASK.md，只校对第 ${current.id} 批（源页 ${current.pages?.[0]}–${current.pages?.[1]}）。\n1. 逐段对照源图/源文，先查漏译，再查术语、名称、数字、表格、中文表达；\n2. 只改本批页 JSON，然后运行 proof.py init --force（或更新 pageDigest）、填 checks/ok、proof.py verify；\n3. 运行 batch-check.py --batch ${current.id}；CHECK.ok 后停下，不要开始下一批。`
    : `当前没有待校对批次。请读取 progress.json 与 work/batches/*/PROOF-BRIEF.md 后再开始。`;
  const auto = `请读取并执行 TASK.md。TASK.md 的 FULL 阶段只描述最后的构建门禁；本轮以本指令的批次流程为准，不要直接构建。这是一次性授权：自动完成整本，不要每批等用户输入。\n1) 若 work/source-map.json 的 survey.complete 不为 true：先运行 extract-images.py，再运行 source-map.py --merge，补全整本结构清单（表/图/整页扫描；总页数以 survey.totalPages 为准）。若一次扫描超时，用 --pages 按总页数均分三段 --merge。\n2) 运行 batch-plan.py plan 生成或更新 work/batches.json。\n3) 从 work/progress.json 的 current 开始，按顺序循环，直到所有批次 status 都为 done：\n   - 每批开始前重新读 progress.json；只处理 status != done 的批次，已 done 的批次跳过，不要重翻；\n   - batch-plan.py brief <id>；\n   - render-pages.py --pages <源页范围> 渲染到 work/src/<id>；\n   - 只翻译本批，写 work/pages/<id>-*.json；\n   - 先不要 batch-check：按 PROOF-BRIEF 做独立校对（有 subagent 就用独立 subagent；没有就自己重新对照源页），修改页 JSON 并写 PROOF.json；\n   - proof.py verify、build-book.py --batch <id>、batch-check.py --batch <id>；\n   - 失败先修；ok 后用 batch-plan.py status 更新进度，立即下一批，不要询问用户。\n4) 全部完成后运行 build-book.py --all，再按 TASK 的全篇命令渲染、合并、书签、QA、报告。\n如果当前环境有 subagent，优先每批交给一个 subagent（同一工作区、同一 BRIEF），校对再交给另一个 subagent；没有就顺序做。\n只有同一批连续两次修不好、或源 PDF 不可读时停下并报告具体批次/缺口；不要跳过批次。`;
  const build = `所有批次都已完成。请读取 TASK.md，运行 build-book.py --all 构建 book/body.html，然后按全篇命令渲染、合并、书签、QA、报告；完成后停下等待验收。`;
  const fix = phase === 'full'
    ? `工坊检测到全篇交付不完整。请读取：\n${task}\n\n先读 out/QA.json、out/BOOKMARKS.json、out/TABLE-PLAN.json 和 out/TRANSLATION-REPORT.md，补齐缺失项后再停下等待检查。`
    : `工坊检测到本批/两页问题。请读取：\n${task}\n\n并阅读 out/pass1/REPORT.md、out/pass1/*-qa.json 与 work/batches/*/CHECK.json，先修复 Type3、图片、表格计划、缺页或占位符；修好后再停下等待检查。`;
  return { start, revise, continue: auto, plan, batch, proof, auto, build, fix, status: phase };
}



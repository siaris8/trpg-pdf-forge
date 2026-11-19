window.__ModuleLoader__.load({
  id: '@local/mystery-atelier-ui',
  factory(require) {
    const React = require('react');
    const { useCallback, useEffect, useRef, useState } = React;
    const h = React.createElement;
    const NS = 'trpg-studio';
    const API = '/api/trpg-studio';
    const SHEET_API = '/api/trpg-sheets';
    const FALLBACK_VERSION = '3.0.1';
    const MAX_PDF = 150 * 1024 * 1024;

    const zh = {
      panel: '翻译工坊',
      title: 'TRPG 翻译工坊',
      subtitle: '上传模组，先把两页做对，再翻整本书。',
      author: '开发者：希亚蕾丝',
      newProject: '新建翻译',
      refresh: '刷新',
      projects: '项目',
      noProjects: '还没有项目。',
      selectProject: '从左边选一个项目，或新建翻译。',
      loading: '加载中…',
      retry: '重试',
      error: '出错了',
      statusDraft: '草稿',
      statusReady: '待开工',
      statusPass1: '待审核',
      statusChanges: '要修改',
      statusApproved: '已通过',
      statusBatches: '分批翻译/校对',
      statusTitle: '核验书名',
      statusBuild: '待构建全篇',
      statusFull: '全篇完成',
      statusDone: '已完成',
      statusWarning: '待修问题',
      workflow: '工作流',
      nextAction: '下一步',
      workflowBlocked: '需处理',
      workflowClear: '门禁已通过',
      upload: '上传',
      workflowIssues: '待补齐',
      refreshTask: '更新任务书',
      taskRefreshed: '任务书已更新',
      emptyTitle: '先做对两页，再翻整本书',
      emptyBody: '工坊会把模组、术语表和排版要求整理成一份任务书。Agent 首轮只做“预览页 + 难页”，你确认后才会翻全篇。',
      openDemo: '看示例样张',
      demoTitle: '示例：预览页 / 难页 / 表格',
      demoBody: '原创迷你模组，展示纸本版式、表格、人物卡、原卡保留和难页处理。只参考版式，不复制参考书内容。',
      newTitle: '新建翻译项目',
      newSub: '两步就够：放素材，定风格。剩下的交给 Agent。',
      stepMaterials: '1 · 放素材',
      stepStyle: '2 · 定风格',
      stepPages: '3 · 先看两页',
      stepFull: '4 · 全篇',
      source: '模组 PDF',
      sourceHint: '把 PDF 拖进来，或点击选择',
      sourceChosen: '已选择',
      glossary: '术语表',
      glossaryUpload: '有术语表，上传',
      glossaryBlank: '没有，帮我建空表',
      glossaryHint: '支持 CSV、XLSX、MD、JSON、TXT。Agent 会先规范化，并在翻译前填满。',
      assets: '补充图片（可选）',
      assetsHint: '图标、地图、插图；关键插图会优先嵌入，小图标不逐一嵌入。PNG / JPEG / WebP，最多 8 张。',
      titleLabel: '书名',
      originalTitle: '原名',
      bookTitle: '书名核验',
      titleVerified: '已核验',
      titleDraft: '待核验',
      verifyTitle: '核验书名',
      titleSourcePages: '来源页',
      titlePlaceholder: '默认使用 PDF 文件名',
      advanced: '语言与风格',
      sourceLang: '源语言',
      targetLang: '目标语言',
      style: '版式',
      stylePaper: '纸本档案',
      styleNoir: '暗色赌场',
      styleClean: '简洁规则书',
      font: '字体',
      fontSafe: '宋体 + 雅黑（WPS 安全）',
      fontSource: '思源宋体 + 思源黑体（需已安装）',
      wide: '宽表',
      wideAuto: '自动拆表 / 横排',
      wideSplit: '总是拆表',
      create: '创建项目',
      creating: '正在创建…',
      uploadSource: '上传 PDF',
      uploadGlossary: '上传术语表',
      uploadAssets: '上传图片',
      back: '返回',
      project: '项目',
      path: '项目目录',
      settings: '设置',
      preview: '预览页',
      hard: '难页',
      previewHint: '最能代表全书气质的一页',
      previewDisclaimer: '预览页只用于确认版式与可读性，不一定是最终成品；全篇阶段仍可能微调。',
      hardHint: '元素最多、最难排的一页',
      waitingAgent: '等待 Agent 导出',
      waitingBody: '复制开工指令，让 Agent 先把这两页做出来。',
      openPdf: '打开 PDF',
      report: '查看报告',
      review: '审核两页',
      approve: '通过，继续全篇',
      changes: '要求修改',
      changePlaceholder: '哪里不对？越具体越好：字号、密度、表格、图片、语气……',
      submitChanges: '提交修改意见',
      approved: '已通过',
      changesSent: '修改意见已保存',
      copyStart: '复制开工指令',
      copyRevise: '复制修改指令',
      copyContinue: '开始全篇（自动分批）',
      copyAndClose: '复制并回到对话',
      copied: '指令已复制，回到对话粘贴发送。',
      copyFailed: '复制失败，请手动选择下面的文本。',
      missingSource: '还没有上传 PDF。',
      missingGlossary: '还没有上传术语表。',
      qa: '排版检查',
      pageCount: '页',
      type3: 'Type3',
      embeddedImages: 'PDF 内嵌图',
      imageGuardNeeded: '还没有运行插图守卫（image-check.py）；源书有可用图时要确认它们真的进入 PDF，源书没有可用图时 0 图也可以通过。',
      imageGuardFailed: '源书有可用插图，但两页没有嵌入足够的图；请先补图再通过。',
      zeroImagesConfirmed: '已确认：源书没有可用插图，0 图允许。',
      noGlossary: '空术语表已建，Agent 会先填。',
      glossaryReady: '术语表就绪',
      sourceReady: 'PDF 就绪',
      busy: '处理中…',
      createFailed: '项目已创建，但文件上传失败',
      uploadFailed: '上传失败',
      task: '任务书',
      fullBook: '全篇 PDF',
      openHtml: '打开 HTML',
      deliverables: '交付文件',
      deliverablesSub: '报告、术语表与检查说明',
      translationReport: '翻译与排版报告',
      glossaryOutput: '术语表（CSV）',
      glossaryRead: '术语表阅读版',
      qaDoc: 'QA 说明',
      tablePlan: '表格/原卡计划',
      sourceCards: '原始角色卡',
      bookmarks: 'PDF 书签',
      bookmarksReport: '书签报告',
      tablePolicy: '人物卡、武器、法术、装备会优先表格化；原卡难以表格化时保留原图并做抽象表。',
      workingGlossary: '术语表（工作版）',
      openFile: '打开',
      download: '下载',
      notYet: '还没有导出',
      currentPrompt: '给 Agent 的指令',
      copyHint: '首轮只会做预览页和难页，不会直接翻全篇。',
      changeNote: '修改意见',
      unknown: '未知',
      demoPdf: '示例 PDF',
      fileTooLarge: 'PDF 超过 150 MB。',
      notPdf: '请选择 PDF 文件。',
      notImage: '只支持 PNG、JPEG、WebP。',
      tooManyAssets: '最多 8 张补充图片。',
      changeNeeded: '请先写修改意见。',
      type3Warning: 'PDF 仍有 Type3 字体，请让 Agent 换回静态宋体/雅黑后重新导出。',
      qaFailed: '排版检查未通过，请查看 QA.json 让 Agent 修复。',
      approvedHint: '预览页和难页已通过。复制一次“开始全篇”，Agent 自动分批做完。',
      pass1Hint: '先看两页。通过后才会进入全篇。',
      reviewNote: '修改意见会写进 REVIEW.json，Agent 只重做两页。',
      selectAll: '全选',
      close: '关闭',
      demoPreview: '示例预览页',
      demoHard: '示例难页',
      demoTables: '示例：表格/人物卡',
      glossaryUploaded: '已上传术语表',
      options: '版式设置',
      noPage: '暂无页面',
      created: '项目已创建，开工指令已准备好。',
      copiedShort: '已复制',
      sheetPanel: 'Excel 车卡 · 实验',
      sheetTitle: 'Excel 人物卡',
      sheetSubtitle: '上传规则或译文，生成可自行计算的 xlsx。独立于 PDF 翻译。',
      sheetNew: '新建人物卡',
      sheetSystem: '规则系统',
      sheetSystemHint: '例如 FIST / COC / 自定义',
      sheetSource: '规则文件',
      sheetSourceHint: 'PDF、DOCX、MD、TXT、CSV、XLSX',
      sheetSourceLang: '源语言',
      sheetTargetLang: '目标语言',
      sheetLangGerman: '德语',
      sheetLangPolish: '波兰语',
      sheetLangEnglish: '英语',
      sheetLangChinese: '中文',
      sheetBase: '基础车卡',
      sheetPregens: '预设卡',
      sheetOpenPregens: '打开预设卡',
      sheetNoPregens: '无预设卡',
      sheetNotes: '规则摘录 / 译文 / 补充说明',
      sheetNotesHint: '没有文件时，可以直接粘贴规则或车卡要点。',
      sheetCreate: '创建车卡项目',
      sheetProjects: '车卡项目',
      sheetEmpty: '还没有人物卡项目。',
      sheetOpen: '打开 XLSX',
      sheetCopy: '复制车卡任务',
      sheetApprove: '通过并归档',
      sheetChanges: '要求修改',
      sheetDemo: '下载示例 XLSX',
      sheetQa: '工作簿检查',
      sheetFormulas: '公式',
      sheetNames: '命名区域',
      sheetSteps: '车卡步骤',
      sheetStatusDraft: '草稿',
      sheetStatusReady: '待开工',
      sheetStatusReview: '待审核',
      sheetStatusChanges: '要修改',
      sheetStatusDone: '已完成',
      sheetStatusWarning: '检查未通过',
      sheetNoSource: '还没有规则文件',
      sheetCreated: '车卡项目已创建，任务书已准备好。',
      sheetApproved: '已通过并归档。',
      sheetChangesSent: '修改意见已记录。',
      sheetChangeNote: '要改哪里？',
      sheetBeta: 'BETA · 实验',
      deleteProject: '删除项目',
      cancel: '取消',
      deleteConfirmTitle: '删除这个项目？',
      deleteConfirmBody: '项目会移到回收站（.trash），文件不会立刻消失。如果 Agent 还在跑，请先让它停下。',
      deleteConfirm: '移到回收站',
      deletedToTrash: '已移入回收站',
      trash: '回收站',
      trashTitle: '回收站',
      trashHint: '删除的项目会保留在这里，直到你彻底删除。',
      trashEmpty: '回收站是空的。',
      restore: '恢复',
      restored: '已恢复',
      purge: '彻底删除',
      purgeConfirm: '再点一次彻底删除',
      purged: '已彻底删除',
      projectElsewhere: '其他工作区',
      trashFailed: '回收站操作失败',
      layoutHint: '排版体检',
      layoutStrong: '页明显偏空',
      layoutMild: '页偏空',
      layoutMerge: '组可合并',
      layoutTip: '仅提示，不影响审核',
      layoutNone: '未生成',
      batchProgress: '批次进度',
      proofed: '已校',
      proofPending: '待校对',
      batchCurrent: '当前批',
      batchPages: '源页',
      batchList: '批次列表',
      batchPending: '待译',
      batchPartial: '部分完成',
      batchDone: '已完成',
      batchChecked: '已检查',
      planBatches: '生成批次计划',
      copyBatch: '复制本批任务',
      buildBook: '构建全篇',
      autoBook: '开始全篇（自动分批）',
      autoContinue: '继续自动分批',
      autoHint: '一次输入，Agent 自动从 B00 做到构建全篇，中途不用逐批确认。',
      termTitle: '术语表',
      termMissing: '未覆盖术语',
      termOpen: '打开术语表',
      actionUpload: '补齐材料',
      actionStart: '复制开工指令',
      actionReview: '审核预览页与难页',
      actionRevise: '复制修改指令',
      actionFix: '先修复问题',
      actionProof: '开始校对',
      actionTitle: '核验书名',
      actionAuto: '开始全篇（自动分批 + 校对）',
      actionBuild: '构建全篇',
      actionNone: '已交付',
    };

    const en = {
      panel: 'Translation Studio',
      title: 'TRPG Translation Studio',
      subtitle: 'Upload a module. Get the two pages right before the whole book.',
      author: 'Developer · 希亚蕾丝',
      newProject: 'New translation',
      refresh: 'Refresh',
      projects: 'Projects',
      noProjects: 'No projects yet.',
      selectProject: 'Select a project on the left, or start a new one.',
      loading: 'Loading…',
      retry: 'Retry',
      error: 'Something went wrong',
      statusDraft: 'Draft',
      statusReady: 'Ready',
      statusPass1: 'Review',
      statusChanges: 'Changes',
      statusApproved: 'Approved',
      statusBatches: 'Batches / proof',
      statusTitle: 'Verify title',
      statusBuild: 'Ready to build',
      statusFull: 'Full book',
      statusDone: 'Done',
      statusWarning: 'Needs fixes',
      workflow: 'Workflow',
      nextAction: 'Next',
      workflowBlocked: 'Blocked',
      workflowClear: 'Gates clear',
      upload: 'Upload',
      workflowIssues: 'Missing',
      refreshTask: 'Refresh task brief',
      taskRefreshed: 'Task brief refreshed',
      emptyTitle: 'Get the two pages right first',
      emptyBody: 'The studio turns your module, glossary and layout rules into a task brief. The agent only makes a preview page and a hard page first; you approve before the full book.',
      openDemo: 'View sample pages',
      demoTitle: 'Sample: preview / hard / tables',
      demoBody: 'An original mini-module showing paper layout, tables, character cards, source-card preservation and a dense page. Layout only; no reference content is copied.',
      newTitle: 'New translation project',
      newSub: 'Two steps: materials and style. The agent does the rest.',
      stepMaterials: '1 · Materials',
      stepStyle: '2 · Style',
      stepPages: '3 · Two pages',
      stepFull: '4 · Full book',
      source: 'Module PDF',
      sourceHint: 'Drop a PDF here, or click to choose',
      sourceChosen: 'Selected',
      glossary: 'Glossary',
      glossaryUpload: 'I have a glossary',
      glossaryBlank: 'No glossary; create an empty one',
      glossaryHint: 'CSV, XLSX, MD, JSON, TXT. The agent normalizes it and fills it before translating.',
      assets: 'Extra images (optional)',
      assetsHint: 'Icons, maps, illustrations; key art is embedded first, small icons are not all embedded. PNG / JPEG / WebP, up to 8.',
      titleLabel: 'Title',
      originalTitle: 'Original title',
      bookTitle: 'Book title',
      titleVerified: 'Verified',
      titleDraft: 'Needs verification',
      verifyTitle: 'Verify title',
      titleSourcePages: 'Source pages',
      titlePlaceholder: 'Defaults to the PDF file name',
      advanced: 'Language and style',
      sourceLang: 'Source language',
      targetLang: 'Target language',
      style: 'Layout',
      stylePaper: 'Paper archive',
      styleNoir: 'Noir casino',
      styleClean: 'Clean rulebook',
      font: 'Fonts',
      fontSafe: 'SimSun + YaHei (WPS safe)',
      fontSource: 'Source Han (must be installed)',
      wide: 'Wide tables',
      wideAuto: 'Auto split / landscape',
      wideSplit: 'Always split',
      create: 'Create project',
      creating: 'Creating…',
      uploadSource: 'Uploading PDF',
      uploadGlossary: 'Uploading glossary',
      uploadAssets: 'Uploading images',
      back: 'Back',
      project: 'Project',
      path: 'Project folder',
      settings: 'Settings',
      preview: 'Preview page',
      hard: 'Hard page',
      previewHint: 'The page that best shows the book',
      previewDisclaimer: 'The preview page is for checking layout and readability only; it is not necessarily the final result. The full-book pass may still fine-tune it.',
      hardHint: 'The page with the most elements',
      waitingAgent: 'Waiting for the agent',
      waitingBody: 'Copy the start brief so the agent makes these two pages first.',
      openPdf: 'Open PDF',
      report: 'View report',
      review: 'Review pages',
      approve: 'Approve and continue',
      changes: 'Request changes',
      changePlaceholder: 'What should change? Be specific: type size, density, tables, images, tone…',
      submitChanges: 'Save change request',
      approved: 'Approved',
      changesSent: 'Change request saved',
      copyStart: 'Copy start brief',
      copyRevise: 'Copy revision brief',
      copyContinue: 'Start full book (auto batches)',
      copyAndClose: 'Copy and return to chat',
      copied: 'Brief copied. Paste it in the chat.',
      copyFailed: 'Copy failed. Select the text manually.',
      missingSource: 'No PDF uploaded yet.',
      missingGlossary: 'No glossary uploaded yet.',
      qa: 'Layout check',
      pageCount: 'pages',
      type3: 'Type3',
      embeddedImages: 'Embedded images',
      imageGuardNeeded: 'The image guard (image-check.py) has not run yet. It confirms source art reached the PDF; when the source has no usable art, 0 images is allowed.',
      imageGuardFailed: 'The source has usable illustrations, but the two pages do not embed enough of them. Add the images before approval.',
      zeroImagesConfirmed: 'Confirmed: the source has no usable illustrations, so 0 images is allowed.',
      noGlossary: 'An empty glossary was created; the agent fills it first.',
      glossaryReady: 'Glossary ready',
      sourceReady: 'PDF ready',
      busy: 'Working…',
      createFailed: 'Project created, but a file upload failed',
      uploadFailed: 'Upload failed',
      task: 'Task brief',
      fullBook: 'Full PDF',
      openHtml: 'Open HTML',
      deliverables: 'Deliverables',
      deliverablesSub: 'Report, glossary and QA notes',
      translationReport: 'Translation and layout report',
      glossaryOutput: 'Glossary (CSV)',
      glossaryRead: 'Glossary (readable)',
      qaDoc: 'QA notes',
      tablePlan: 'Table/card plan',
      sourceCards: 'Source character cards',
      bookmarks: 'PDF bookmarks',
      bookmarksReport: 'Bookmark report',
      tablePolicy: 'Character sheets, weapons, spells and gear are table-first. Hard-to-table cards keep the original image plus an abstract table.',
      workingGlossary: 'Working glossary',
      openFile: 'Open',
      download: 'Download',
      notYet: 'Not exported yet',
      currentPrompt: 'Brief for the agent',
      copyHint: 'The first pass is only the preview page and the hard page.',
      changeNote: 'Change request',
      unknown: 'Unknown',
      demoPdf: 'Sample PDF',
      fileTooLarge: 'PDF is over 150 MB.',
      notPdf: 'Please choose a PDF.',
      notImage: 'Only PNG, JPEG and WebP.',
      tooManyAssets: 'Up to 8 extra images.',
      changeNeeded: 'Write a change request first.',
      type3Warning: 'The PDF still contains Type3 fonts. Ask the agent to switch to static SimSun/YaHei and re-export.',
      qaFailed: 'The layout check did not pass. Ask the agent to read QA.json and fix it.',
      approvedHint: 'The two pages are approved. Copy the auto-batch brief once; the agent finishes the book.',
      pass1Hint: 'Review the two pages first. The full book unlocks after approval.',
      reviewNote: 'Your note goes into REVIEW.json; the agent only redoes the two pages.',
      selectAll: 'Select all',
      close: 'Close',
      demoPreview: 'Sample preview',
      demoHard: 'Sample hard page',
      demoTables: 'Sample: tables / character card',
      glossaryUploaded: 'Glossary uploaded',
      options: 'Layout settings',
      noPage: 'No pages yet',
      created: 'Project created. The start brief is ready.',
      copiedShort: 'Copied',
      sheetPanel: 'Excel Character Sheet · Lab',
      sheetTitle: 'Excel Character Sheet',
      sheetSubtitle: 'Upload rules or a translation and generate a self-calculating xlsx. Independent from PDF translation.',
      sheetNew: 'New character sheet',
      sheetSystem: 'Ruleset',
      sheetSystemHint: 'e.g. FIST / CoC / custom',
      sheetSource: 'Rule file',
      sheetSourceHint: 'PDF, DOCX, MD, TXT, CSV, XLSX',
      sheetSourceLang: 'Source language',
      sheetTargetLang: 'Target language',
      sheetLangGerman: 'German',
      sheetLangPolish: 'Polish',
      sheetLangEnglish: 'English',
      sheetLangChinese: 'Chinese',
      sheetBase: 'Base sheet',
      sheetPregens: 'Pregens',
      sheetOpenPregens: 'Open pregens',
      sheetNoPregens: 'No pregens',
      sheetNotes: 'Rules excerpt / translation / notes',
      sheetNotesHint: 'If there is no file, paste the rules or character-creation notes.',
      sheetCreate: 'Create sheet project',
      sheetProjects: 'Sheet projects',
      sheetEmpty: 'No character-sheet projects yet.',
      sheetOpen: 'Open XLSX',
      sheetCopy: 'Copy sheet brief',
      sheetApprove: 'Approve and archive',
      sheetChanges: 'Request changes',
      sheetDemo: 'Download sample XLSX',
      sheetQa: 'Workbook check',
      sheetFormulas: 'Formulas',
      sheetNames: 'Named ranges',
      sheetSteps: 'Creation steps',
      sheetStatusDraft: 'Draft',
      sheetStatusReady: 'Ready',
      sheetStatusReview: 'Review',
      sheetStatusChanges: 'Changes',
      sheetStatusDone: 'Done',
      sheetStatusWarning: 'Check failed',
      sheetNoSource: 'No rule file yet',
      sheetCreated: 'Sheet project created; brief is ready.',
      sheetApproved: 'Approved and archived.',
      sheetChangesSent: 'Change request saved.',
      sheetChangeNote: 'What should change?',
      sheetBeta: 'BETA · LAB',
      deleteProject: 'Delete project',
      cancel: 'Cancel',
      deleteConfirmTitle: 'Delete this project?',
      deleteConfirmBody: 'The project moves to the trash (.trash); files are not erased immediately. If the agent is still running, stop it first.',
      deleteConfirm: 'Move to trash',
      deletedToTrash: 'Moved to trash',
      trash: 'Trash',
      trashTitle: 'Trash',
      trashHint: 'Deleted projects stay here until you delete them forever.',
      trashEmpty: 'Trash is empty.',
      restore: 'Restore',
      restored: 'Restored',
      purge: 'Delete forever',
      purgeConfirm: 'Click again to delete forever',
      purged: 'Deleted forever',
      projectElsewhere: 'Other workspace',
      trashFailed: 'Trash operation failed',
      layoutHint: 'Layout check',
      layoutStrong: 'clearly under-filled',
      layoutMild: 'under-filled',
      layoutMerge: 'merge groups',
      layoutTip: 'advisory only',
      layoutNone: 'not generated',
      batchProgress: 'Batch progress',
      proofed: 'proofed',
      proofPending: 'proof pending',
      batchCurrent: 'Current batch',
      batchPages: 'Source pages',
      batchList: 'Batch list',
      batchPending: 'Pending',
      batchPartial: 'Partial',
      batchDone: 'Done',
      batchChecked: 'Checked',
      planBatches: 'Plan batches',
      copyBatch: 'Copy batch task',
      buildBook: 'Build book',
      autoBook: 'Start full book (auto batches)',
      autoContinue: 'Continue auto batches',
      autoHint: 'One input; the agent runs from B00 through the full build without per-batch confirmation.',
      termTitle: 'Glossary',
      termMissing: 'missing terms',
      termOpen: 'Open glossary',
      actionUpload: 'Add missing files',
      actionStart: 'Copy start brief',
      actionReview: 'Review preview pages',
      actionRevise: 'Copy revision brief',
      actionFix: 'Fix issues first',
      actionProof: 'Start proofreading',
      actionTitle: 'Verify title',
      actionAuto: 'Start full book (batches + proof)',
      actionBuild: 'Build book',
      actionNone: 'Delivered',
    };

    const strings = { zh, en };
    const CSS = `
      .trpg-root {
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: var(--dsw-alias-bg-base, #f7f7f5);
        color: var(--dsw-alias-label-primary, #1d1d1f);
        font-size: 13px;
        line-height: 1.5;
      }
      .trpg-root *, .trpg-root *::before, .trpg-root *::after { box-sizing: border-box; }
      .trpg-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px 18px;
        padding: 18px 24px 14px;
        border-bottom: 1px solid var(--dsw-alias-border-l2, #e5e5e5);
        background: var(--dsw-alias-bg-base, #fff);
      }
      .trpg-brand { display: flex; gap: 11px; align-items: flex-start; min-width: 0; }
      .trpg-brand-mark {
        width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center;
        color: var(--dsw-alias-label-primary-inverted, #fff);
        background: var(--dsw-alias-label-primary, #171717);
        flex: none;
      }
      .trpg-title-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .trpg-credit { color: var(--dsw-alias-label-tertiary, #888); font-size: 10.5px; white-space: nowrap; }
      .trpg-title { font-size: 18px; font-weight: 650; letter-spacing: .01em; line-height: 1.25; }
      .trpg-version {
        display: inline-flex; align-items: center; height: 19px; padding: 0 7px;
        border: 1px solid var(--dsw-alias-border-l2, #e0e0e0); border-radius: 99px;
        background: var(--dsw-alias-fill-l1, #f4f4f2); color: var(--dsw-alias-label-tertiary, #888);
        font-family: var(--dsw-font-family-mono, ui-monospace, Consolas, monospace);
        font-size: 10px; font-weight: 600; letter-spacing: .02em; white-space: nowrap;
      }
      .trpg-subtitle { margin-top: 3px; color: var(--dsw-alias-label-secondary, #666); font-size: 12px; }
      .trpg-header-actions { display: flex; gap: 8px; align-items: center; flex: none; }
      .trpg-body {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: 268px minmax(0, 1fr);
      }
      .trpg-rail {
        border-right: 1px solid var(--dsw-alias-border-l2, #e5e5e5);
        padding: 12px;
        overflow: auto;
        background: var(--dsw-alias-bg-l1, #fafafa);
      }
      .trpg-rail-head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 2px 4px 9px; color: var(--dsw-alias-label-secondary, #666);
        font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
      }
      .trpg-project-list { display: flex; flex-direction: column; gap: 4px; }
      .trpg-project-row {
        width: 100%; text-align: left; border: 1px solid transparent; background: transparent;
        border-radius: 9px; padding: 9px 10px; cursor: pointer; color: inherit; font-family: inherit;
        display: flex; flex-direction: column; gap: 4px;
      }
      .trpg-project-row:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.045)); }
      .trpg-project-row[aria-current="true"] {
        background: var(--dsw-alias-bg-layer-1, #fff);
        border-color: var(--dsw-alias-border-l2, #e5e5e5);
        box-shadow: 0 1px 2px rgba(0,0,0,.04);
      }
      .trpg-project-name { font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .trpg-project-meta { display: flex; align-items: center; gap: 6px; color: var(--dsw-alias-label-tertiary, #888); font-size: 10.5px; }
      .trpg-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; background: var(--dsw-alias-label-quaternary, #bbb); }
      .trpg-dot.ready { background: var(--dsw-alias-brand-primary, #3b82f6); }
      .trpg-dot.pass1, .trpg-dot.changes, .trpg-dot.approved { background: var(--dsw-alias-state-warn-primary, #b7791f); }
      .trpg-dot.full, .trpg-dot.done { background: var(--dsw-alias-state-success-primary, #23824c); }
      .trpg-dot.warning { background: var(--dsw-alias-state-error-primary, #c62828); }
      .trpg-tag {
        padding: 0 5px; border-radius: 4px; background: var(--dsw-alias-bg-l2, #eee);
        color: var(--dsw-alias-label-tertiary, #888); font-size: 9.5px; white-space: nowrap;
      }
      .trpg-rail-foot {
        margin-top: 12px; padding: 8px 4px 0;
        border-top: 1px solid var(--dsw-alias-border-l2, #e5e5e5);
        color: var(--dsw-alias-label-quaternary, #aaa); font-size: 10px; line-height: 1.4;
        word-break: break-all;
      }
      .trpg-trash-list { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; max-height: 52vh; overflow: auto; }
      .trpg-trash-row {
        display: flex; align-items: center; justify-content: space-between; gap: 10px;
        padding: 8px 0; border-bottom: 1px solid var(--dsw-alias-border-l2, #eee);
      }
      .trpg-trash-title { font-size: 12.5px; font-weight: 600; word-break: break-all; }
      .trpg-trash-actions { display: flex; gap: 6px; flex: none; }
      .trpg-modal-sub { color: var(--dsw-alias-label-tertiary, #888); font-size: 12px; line-height: 1.55; margin-bottom: 6px; }
      .trpg-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
      .trpg-layout-note {
        margin-top: 9px; padding: 8px 10px; border-radius: 6px;
        border-left: 2px solid var(--dsw-alias-state-warn-primary, #b7791f);
        background: var(--dsw-alias-state-warn-secondary, #fff8e6);
      }
      .trpg-layout-list { margin: 5px 0 0; padding-left: 16px; font-size: 11px; line-height: 1.5; color: var(--dsw-alias-label-secondary, #666); }
      .trpg-batch-track { height: 6px; margin-top: 9px; border-radius: 99px; background: var(--dsw-alias-fill-l1, #eee); overflow: hidden; }
      .trpg-batch-fill { height: 100%; background: var(--dsw-alias-brand-primary, #3b82f6); }
      .trpg-batch-list { display: flex; flex-direction: column; gap: 2px; margin-top: 6px; max-height: 220px; overflow: auto; }
      .trpg-batch-row { display: flex; align-items: center; gap: 8px; padding: 3px 2px; border-bottom: 1px dotted var(--dsw-alias-border-l2, #eee); font-size: 10.5px; }
      .trpg-batch-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; background: var(--dsw-alias-label-quaternary, #bbb); }
      .trpg-batch-dot.partial { background: var(--dsw-alias-state-warn-primary, #b7791f); }
      .trpg-batch-dot.done { background: var(--dsw-alias-state-success-primary, #23824c); }
      .trpg-batch-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .trpg-batch-pages, .trpg-batch-count, .trpg-batch-id { flex: none; color: var(--dsw-alias-label-tertiary, #888); }
      .trpg-btn.danger-solid { background: var(--dsw-alias-state-error-primary, #c62828); border-color: transparent; color: #fff; }
      .trpg-btn.danger-solid:hover { background: var(--dsw-alias-state-error-primary, #c62828); opacity: .9; }
      .trpg-main { min-width: 0; overflow: auto; padding: 22px 26px 12px; }
      .trpg-page { max-width: 980px; margin: 0 auto; padding-bottom: 76px; }
      .trpg-page.narrow { max-width: 760px; }
      .trpg-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        min-height: 32px; padding: 0 11px; border-radius: 8px;
        border: 1px solid var(--dsw-alias-border-l2, #ddd);
        background: var(--dsw-alias-bg-layer-1, #fff);
        color: var(--dsw-alias-label-primary, #1d1d1f);
        font-family: inherit; font-size: 12px; font-weight: 550; cursor: pointer;
        text-decoration: none; white-space: nowrap; transition: background .12s ease, border-color .12s ease, opacity .12s ease;
      }
      .trpg-btn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.045)); }
      .trpg-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #3b82f6); outline-offset: 2px; }
      .trpg-btn:disabled { opacity: .5; cursor: not-allowed; }
      .trpg-btn.primary {
        background: var(--dsw-alias-button-primary-fill, #171717);
        border-color: transparent;
        color: var(--dsw-alias-label-primary-foreground, #fff);
      }
      .trpg-btn.primary:hover { background: var(--dsw-alias-button-primary-hover, #333); }
      .trpg-btn.ghost { background: transparent; border-color: transparent; }
      .trpg-btn.danger { color: var(--dsw-alias-state-error-primary, #c62828); }
      .trpg-btn.small { min-height: 27px; padding: 0 9px; font-size: 11px; }
      .trpg-btn.wide { width: 100%; }
      .trpg-card {
        border: 1px solid var(--dsw-alias-border-l2, #e5e5e5);
        background: var(--dsw-alias-bg-layer-1, #fff);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
      }
      .trpg-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
      .trpg-card-title { font-size: 13px; font-weight: 650; }
      .trpg-card-sub { color: var(--dsw-alias-label-tertiary, #888); font-size: 11px; margin-top: 2px; }
      .trpg-hero {
        border-radius: 16px; padding: 26px 28px; border: 1px solid var(--dsw-alias-border-l2, #e5e5e5);
        background:
          radial-gradient(900px 280px at 12% -10%, var(--dsw-alias-brand-primary, #3b82f6) 0%, transparent 55%),
          var(--dsw-alias-bg-layer-1, #fff);
        overflow: hidden;
      }
      .trpg-hero h1 { margin: 0; font-size: 27px; letter-spacing: -.01em; line-height: 1.25; }
      .trpg-hero p { max-width: 600px; color: var(--dsw-alias-label-secondary, #555); font-size: 13px; line-height: 1.7; margin: 9px 0 0; }
      .trpg-hero-actions { display: flex; gap: 8px; margin-top: 18px; flex-wrap: wrap; }
      .trpg-hero-art {
        float: right; width: 190px; height: 138px; margin: -4px -8px 8px 18px;
        border-radius: 12px; border: 1px solid var(--dsw-alias-border-l2, #e5e5e5);
        background: var(--dsw-alias-bg-layer-2, #f4f4f2); overflow: hidden;
      }
      .trpg-hero-art img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
      .trpg-kicker { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--dsw-alias-brand-primary, #3b82f6); margin-bottom: 8px; }
      .trpg-steps { display: flex; gap: 6px; flex-wrap: wrap; margin: 14px 0 0; }
      .trpg-step {
        display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px;
        border-radius: 99px; background: var(--dsw-alias-fill-l1, #f2f2f2);
        color: var(--dsw-alias-label-tertiary, #888); font-size: 11px;
      }
      .trpg-step.active { background: var(--dsw-alias-brand-primary, #3b82f6); color: var(--dsw-alias-label-primary-inverted, #fff); }
      .trpg-step.done { background: var(--dsw-alias-state-success-tertiary, #e6f3eb); color: var(--dsw-alias-state-success-primary, #23824c); }
      .trpg-section-title { font-size: 12px; font-weight: 650; margin: 18px 0 8px; display: flex; align-items: center; gap: 8px; }
      .trpg-meta { color: var(--dsw-alias-label-tertiary, #888); font-size: 11px; }
      .trpg-path {
        font-family: var(--dsw-font-family-mono, ui-monospace, SFMono-Regular, Consolas, monospace);
        font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #888);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;
      }
      .trpg-badge {
        display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px;
        border-radius: 99px; font-size: 10.5px; font-weight: 600;
        background: var(--dsw-alias-fill-l1, #f2f2f2); color: var(--dsw-alias-label-secondary, #666);
        white-space: nowrap;
      }
      .trpg-badge.success { background: var(--dsw-alias-state-success-tertiary, #e6f3eb); color: var(--dsw-alias-state-success-primary, #23824c); }
      .trpg-badge.warn { background: var(--dsw-alias-state-warn-tertiary, #fdf3df); color: var(--dsw-alias-state-warn-primary, #9a6700); }
      .trpg-badge.danger { background: var(--dsw-alias-state-error-secondary, #fde8e8); color: var(--dsw-alias-state-error-primary, #c62828); }
      .trpg-alert {
        border: 1px solid var(--dsw-alias-state-error-secondary, #f3c1c1);
        background: var(--dsw-alias-state-error-secondary, #fde8e8);
        color: var(--dsw-alias-state-error-primary, #9b1c1c);
        border-radius: 10px; padding: 10px 12px; font-size: 12px; margin-bottom: 12px;
      }
      .trpg-alert.info { border-color: var(--dsw-alias-border-l2, #e5e5e5); background: var(--dsw-alias-bg-layer-2, #f5f5f3); color: var(--dsw-alias-label-secondary, #555); }
      .trpg-drop {
        border: 1.5px dashed var(--dsw-alias-border-l3, #cfcfcf);
        border-radius: 12px; padding: 22px; text-align: center; cursor: pointer;
        background: var(--dsw-alias-bg-layer-2, #f7f7f5); color: var(--dsw-alias-label-secondary, #666);
        transition: border-color .12s ease, background .12s ease;
      }
      .trpg-drop:hover, .trpg-drop:focus-visible { border-color: var(--dsw-alias-brand-primary, #3b82f6); background: var(--dsw-alias-interactive-bg-hover, #f1f5ff); outline: none; }
      .trpg-drop strong { display: block; color: var(--dsw-alias-label-primary, #1d1d1f); font-size: 13px; margin-bottom: 3px; }
      .trpg-drop span { font-size: 11px; }
      .trpg-file {
        display: flex; align-items: center; gap: 10px; padding: 10px 12px;
        border: 1px solid var(--dsw-alias-border-l2, #e5e5e5); border-radius: 10px; background: var(--dsw-alias-bg-layer-1, #fff);
      }
      .trpg-file-icon { width: 30px; height: 34px; border-radius: 6px; display: grid; place-items: center; background: var(--dsw-alias-fill-l1, #f2f2f2); font-size: 9px; font-weight: 700; color: var(--dsw-alias-label-secondary, #666); flex: none; }
      .trpg-file-name { font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .trpg-file-meta { color: var(--dsw-alias-label-tertiary, #888); font-size: 10.5px; margin-top: 1px; }
      .trpg-file-actions { margin-left: auto; display: flex; gap: 6px; }
      .trpg-seg { display: flex; gap: 6px; flex-wrap: wrap; }
      .trpg-seg button {
        border: 1px solid var(--dsw-alias-border-l2, #ddd); background: var(--dsw-alias-bg-layer-1, #fff);
        color: var(--dsw-alias-label-secondary, #555); border-radius: 8px; padding: 7px 10px;
        font-family: inherit; font-size: 11.5px; cursor: pointer;
        line-height: 1.4;
      }
      .trpg-seg button[aria-pressed="true"] { border-color: var(--dsw-alias-brand-primary, #3b82f6); color: var(--dsw-alias-brand-primary, #3b82f6); background: var(--dsw-alias-bg-layer-2, #f4f7ff); font-weight: 600; }
      .trpg-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
      .trpg-label { font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-secondary, #666); }
      .trpg-input, .trpg-select, .trpg-textarea {
        width: 100%; border: 1px solid var(--dsw-alias-border-l2, #ddd); border-radius: 8px;
        background: var(--dsw-alias-bg-layer-1, #fff); color: var(--dsw-alias-label-primary, #1d1d1f);
        padding: 8px 10px; font-family: inherit; font-size: 12px; outline: none;
      }
      .trpg-input:focus, .trpg-select:focus, .trpg-textarea:focus { border-color: var(--dsw-alias-brand-primary, #3b82f6); box-shadow: 0 0 0 3px var(--dsw-alias-bg-mask-1, rgba(59,130,246,.1)); }
      .trpg-textarea { min-height: 84px; resize: vertical; line-height: 1.55; }
      .trpg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .trpg-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
      .trpg-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 16px; margin-top: 4px; }
      .trpg-summary div { display: flex; gap: 8px; justify-content: space-between; border-bottom: 1px dotted var(--dsw-alias-border-l2, #e5e5e5); padding: 5px 0; font-size: 11.5px; }
      .trpg-summary span:first-child { color: var(--dsw-alias-label-tertiary, #888); }
      .trpg-workflow { border: 1px solid var(--dsw-alias-border-l2, #e5e5e5); border-radius: 12px; padding: 11px 13px; background: var(--dsw-alias-bg-layer-1, #fff); }
      .trpg-workflow-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
      .trpg-workflow-title { font-size: 12px; font-weight: 650; }
      .trpg-workflow-next { margin-top: 6px; color: var(--dsw-alias-label-secondary, #666); font-size: 11px; }
      .trpg-workflow-issues { margin: 8px 0 0; padding: 0; list-style: none; display: grid; gap: 4px; }
      .trpg-workflow-issues li { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #888); }
      .trpg-workflow-issues li::before { content: '·'; margin-right: 5px; color: var(--dsw-alias-state-error-primary, #c62828); }
      .trpg-preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .trpg-preview-note {
        display: flex; gap: 7px; align-items: flex-start;
        margin-top: 9px; padding: 7px 9px; border-radius: 8px;
        background: var(--dsw-alias-fill-l1, #f5f5f3);
        color: var(--dsw-alias-label-tertiary, #777);
        font-size: 10.5px; line-height: 1.55;
      }
      .trpg-preview-note::before {
        content: "i"; flex: none; width: 13px; height: 13px; margin-top: 1px;
        border-radius: 50%; border: 1px solid currentColor;
        display: inline-grid; place-items: center;
        font-family: Georgia, serif; font-size: 9px; font-weight: 700;
      }
      .trpg-shot {
        border: 1px solid var(--dsw-alias-border-l2, #e5e5e5); border-radius: 12px;
        background: var(--dsw-alias-bg-layer-2, #f4f2ee); overflow: hidden;
      }
      .trpg-shot-head { display: flex; align-items: center; justify-content: space-between; padding: 9px 11px; border-bottom: 1px solid var(--dsw-alias-border-l2, #e5e5e5); background: var(--dsw-alias-bg-layer-1, #fff); }
      .trpg-shot-title { font-size: 11.5px; font-weight: 650; }
      .trpg-shot-body { min-height: 260px; display: grid; place-items: center; padding: 10px; }
      .trpg-shot-body img { display: block; width: 100%; height: auto; border: 1px solid rgba(0,0,0,.08); box-shadow: 0 4px 14px rgba(0,0,0,.08); background: #fff; }
      .trpg-shot-empty { text-align: center; color: var(--dsw-alias-label-tertiary, #888); font-size: 11.5px; padding: 28px 18px; }
      .trpg-shot-empty strong { display: block; color: var(--dsw-alias-label-secondary, #666); margin-bottom: 4px; }
      .trpg-shot-foot { display: flex; gap: 8px; padding: 9px 11px; border-top: 1px solid var(--dsw-alias-border-l2, #e5e5e5); background: var(--dsw-alias-bg-layer-1, #fff); }
      .trpg-progress { height: 5px; border-radius: 99px; background: var(--dsw-alias-fill-l1, #eee); overflow: hidden; margin-top: 10px; }
      .trpg-progress > div { height: 100%; background: var(--dsw-alias-brand-primary, #3b82f6); transition: width .18s ease; }
      .trpg-sticky {
        position: sticky; bottom: 0; z-index: 3;
        margin: 18px -26px -12px; padding: 12px 26px;
        border-top: 1px solid var(--dsw-alias-border-l2, #e5e5e5);
        background: color-mix(in srgb, var(--dsw-alias-bg-base, #fff) 92%, transparent);
        backdrop-filter: blur(10px);
        display: flex; align-items: center; justify-content: space-between; gap: 14px;
      }
      .trpg-sticky-copy { min-width: 0; }
      .trpg-sticky-title { font-size: 11.5px; font-weight: 650; }
      .trpg-sticky-sub { color: var(--dsw-alias-label-tertiary, #888); font-size: 10.5px; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .trpg-toast {
        position: fixed; z-index: 30; left: 50%; bottom: 26px; transform: translateX(-50%);
        background: var(--dsw-alias-toast-bg, #171717); color: var(--dsw-alias-toast-label, #fff);
        border-radius: 10px; padding: 9px 14px; font-size: 12px; box-shadow: 0 10px 28px rgba(0,0,0,.2);
        max-width: min(520px, 88vw);
      }
      .trpg-modal {
        position: fixed; inset: 0; z-index: 40; display: grid; place-items: center;
        background: rgba(0,0,0,.42); padding: 24px;
      }
      .trpg-modal-card { width: min(640px, 94vw); background: var(--dsw-alias-bg-layer-1, #fff); border-radius: 14px; padding: 16px; box-shadow: 0 24px 80px rgba(0,0,0,.3); }
      .trpg-modal-card h2 { font-size: 15px; margin: 0 0 8px; }
      .trpg-modal-card textarea { min-height: 220px; font-family: ui-monospace, Consolas, monospace; font-size: 11px; }
      .trpg-empty { padding: 34px 8px; text-align: center; color: var(--dsw-alias-label-tertiary, #888); font-size: 12px; }
      .trpg-skeleton { height: 72px; border-radius: 10px; background: linear-gradient(90deg, var(--dsw-alias-bg-skeleton, #eee), var(--dsw-alias-bg-layer-2, #f7f7f5), var(--dsw-alias-bg-skeleton, #eee)); background-size: 200% 100%; animation: trpg-shimmer 1.2s linear infinite; margin-bottom: 8px; }
      @keyframes trpg-shimmer { to { background-position: -200% 0; } }
      .trpg-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
      @media (max-width: 940px) {
        .trpg-body { grid-template-columns: 1fr; }
        .trpg-rail { border-right: 0; border-bottom: 1px solid var(--dsw-alias-border-l2, #e5e5e5); max-height: 178px; }
        .trpg-main { padding: 16px 16px 10px; }
        .trpg-sticky { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
        .trpg-preview-grid, .trpg-grid-2, .trpg-grid-3 { grid-template-columns: 1fr; }
        .trpg-hero-art { float: none; width: 100%; height: 160px; margin: 14px 0 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .trpg-root *, .trpg-root *::before, .trpg-root *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
      }
    `;

    function dict(t, key) {
      return t(key);
    }

    function statusKey(status) {
      return {
        draft: 'statusDraft',
        ready: 'statusReady',
        pass1: 'statusPass1',
        changes: 'statusChanges',
        approved: 'statusApproved',
        batches: 'statusBatches',
        title: 'statusTitle',
        build: 'statusBuild',
        full: 'statusFull',
        done: 'statusDone',
        warning: 'statusWarning',
      }[status] || 'statusDraft';
    }

    function statusTone(status) {
      if (status === 'done' || status === 'full' || status === 'approved') return 'success';
      if (status === 'pass1' || status === 'changes' || status === 'batches' || status === 'title' || status === 'build') return 'warn';
      if (status === 'warning') return 'danger';
      return '';
    }

    function workflowNextLabel(t, next) {
      if (!next) return '';
      const base = next.labelKey ? t(next.labelKey) : (next.label || t('statusDone'));
      return next.detail ? `${base} · ${next.detail}` : base;
    }

    function styleLabel(t, style) {
      return style === 'noir-casino' ? t('styleNoir') : style === 'clean-rulebook' ? t('styleClean') : t('stylePaper');
    }

    function formatBytes(bytes) {
      const value = Number(bytes) || 0;
      if (value < 1024) return `${value} B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
      return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    }

    function formatDate(value) {
      try {
        return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      } catch {
        return '';
      }
    }

    function baseName(file) {
      return String(file || '').split(/[\\/]/).pop() || '';
    }

    async function api(path, options = {}, base = API) {
      const response = await fetch(`${base}${path}`, {
        credentials: 'same-origin',
        ...options,
        headers: {
          ...(options.body && !(options.body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
          ...(options.headers || {}),
        },
      });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(`HTTP ${response.status}`);
      }
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error?.message || `HTTP ${response.status}`);
      }
      return data;
    }

    function uploadFile(projectId, kind, file, onProgress, base = API) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const query = new URLSearchParams({ projectId, kind, name: file.name });
        xhr.open('POST', `${base}/upload?${query.toString()}`);
        xhr.withCredentials = true;
        xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && typeof onProgress === 'function') {
            onProgress(Math.max(1, Math.min(99, Math.round((event.loaded / event.total) * 100))));
          }
        };
        xhr.onload = () => {
          let data;
          try {
            data = JSON.parse(xhr.responseText || '{}');
          } catch {
            reject(new Error(`上传失败：HTTP ${xhr.status}`));
            return;
          }
          if (xhr.status < 200 || xhr.status >= 300 || data?.ok === false) {
            reject(new Error(data?.error?.message || `上传失败：HTTP ${xhr.status}`));
            return;
          }
          if (typeof onProgress === 'function') onProgress(100);
          resolve(data);
        };
        xhr.onerror = () => reject(new Error('上传失败：网络错误。'));
        xhr.onabort = () => reject(new Error('上传已取消。'));
        xhr.send(file);
      });
    }

    function fileUrl(project, relative, download = false, base = API) {
      const query = new URLSearchParams({ projectId: project.id, path: relative });
      if (download) query.set('download', '1');
      return `${base}/file?${query.toString()}`;
    }

    function demoUrl(name) {
      return `${API}/demo?name=${encodeURIComponent(name)}`;
    }

    function copyText(text) {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
      }
      return Promise.resolve(fallbackCopy(text));
    }

    function fallbackCopy(text) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
      } catch {
        return false;
      }
    }

    function Icon({ children, size = 16, viewBox = '0 0 24 24' }) {
      return h('svg', {
        width: size,
        height: size,
        viewBox,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
      }, children);
    }

    function StudioMark({ size = 18 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z', fill: 'currentColor', opacity: .92 }),
        h('path', { d: 'M20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5a2.5 2.5 0 0 0 2.5-2.5v-12Z', fill: 'currentColor', opacity: .55 }),
        h('path', { d: 'm18 3 2 2-2 2-2-2 2-2Z', fill: '#c7352a', stroke: 'none' }),
      );
    }

    function StudioPage({ t, close }) {
      const [projects, setProjects] = useState([]);
      const [selectedId, setSelectedId] = useState(null);
      const [mode, setMode] = useState('welcome');
      const [root, setRoot] = useState('');
      const [version, setVersion] = useState(FALLBACK_VERSION);
      const [demo, setDemo] = useState(false);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState('');
      const [toast, setToast] = useState('');
      const [draft, setDraft] = useState(emptyDraft());
      const [progress, setProgress] = useState(null);
      const [busy, setBusy] = useState(false);
      const [manual, setManual] = useState('');
      const [showChange, setShowChange] = useState(false);
      const [changeNote, setChangeNote] = useState('');
      const [trashOpen, setTrashOpen] = useState(false);
      const [pendingDelete, setPendingDelete] = useState(null);
      const toastTimer = useRef(null);

      const selected = projects.find((project) => project.id === selectedId) || (mode === 'project' ? projects[0] : null);

      const notify = useCallback((message) => {
        setToast(message);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(''), 3600);
      }, []);

      useEffect(() => () => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
      }, []);

      const load = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        try {
          const [info, listing] = await Promise.all([
            api('/info'),
            api('/list', { method: 'POST', body: '{}' }),
          ]);
          setRoot(info.root || '');
          setVersion(info.version || FALLBACK_VERSION);
          setDemo(Boolean(info.demo));
          const rows = Array.isArray(listing.projects) ? listing.projects : [];
          setProjects(rows);
          setSelectedId((previous) => (previous && rows.some((row) => row.id === previous) ? previous : rows[0]?.id || null));
          setMode((previous) => {
            if (previous === 'new') return previous;
            return rows.length > 0 ? 'project' : 'welcome';
          });
          setError('');
        } catch (cause) {
          if (!quiet) setError(cause.message || String(cause));
        } finally {
          if (!quiet) setLoading(false);
        }
      }, []);

      useEffect(() => {
        load();
        const timer = setInterval(() => {
          if (document.visibilityState === 'visible') load(true);
        }, 4000);
        return () => clearInterval(timer);
      }, [load]);

      const copyPrompt = useCallback(async (text, closeAfter = true) => {
        if (!text) return;
        const ok = await copyText(text);
        if (!ok) {
          setManual(text);
          notify(t('copyFailed'));
          return;
        }
        if (closeAfter) close();
        else notify(t('copiedShort'));
      }, [close, notify, t]);

      const startNew = () => {
        setDraft(emptyDraft());
        setMode('new');
        setError('');
        setProgress(null);
        setShowChange(false);
        setChangeNote('');
      };

      const selectProject = (id) => {
        setSelectedId(id);
        setMode('project');
        setShowChange(false);
        setChangeNote('');
        setError('');
      };

      const create = async () => {
        if (!draft.source || busy) return;
        setBusy(true);
        setError('');
        let created = null;
        try {
          const title = draft.title.trim() || draft.source.name.replace(/\.pdf$/i, '') || '未命名模组';
          setProgress({ label: t('creating'), value: 3 });
          const result = await api('/projects', {
            method: 'POST',
            body: JSON.stringify({
              title,
              sourceLang: draft.sourceLang,
              targetLang: draft.targetLang,
              titlePolicy: 'strict',
              glossaryMode: draft.glossaryMode,
              options: {
                style: draft.style,
                fontPair: draft.fontPair,
                wideTables: draft.wideTables,
                imageFallback: 'table-or-text',
              },
            }),
          });
          created = result.project;
          setSelectedId(created.id);
          setProgress({ label: t('uploadSource'), value: 5 });
          await uploadFile(created.id, 'source', draft.source, (value) => setProgress({ label: t('uploadSource'), value }));
          if (draft.glossaryMode === 'uploaded' && draft.glossaryFile) {
            setProgress({ label: t('uploadGlossary'), value: 5 });
            await uploadFile(created.id, 'glossary', draft.glossaryFile, (value) => setProgress({ label: t('uploadGlossary'), value }));
          }
          if (draft.assets.length > 0) {
            for (let index = 0; index < draft.assets.length; index += 1) {
              const file = draft.assets[index];
              setProgress({ label: `${t('uploadAssets')} ${index + 1}/${draft.assets.length}`, value: 5 });
              await uploadFile(created.id, 'asset', file, (value) => {
                setProgress({ label: `${t('uploadAssets')} ${index + 1}/${draft.assets.length}`, value });
              });
            }
          }
          setProgress({ label: t('creating'), value: 96 });
          await api('/finalize', { method: 'POST', body: JSON.stringify({ projectId: created.id }) });
          await load(true);
          setSelectedId(created.id);
          setMode('project');
          setDraft(emptyDraft());
          notify(t('created'));
        } catch (cause) {
          if (created) {
            setSelectedId(created.id);
            setMode('project');
          }
          setError(`${created ? t('createFailed') : t('error')}：${cause.message || cause}`);
          await load(true);
        } finally {
          setBusy(false);
          setProgress(null);
        }
      };

      const refreshTask = async (project) => {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
          await api('/finalize', { method: 'POST', body: JSON.stringify({ projectId: project.id }) });
          await load(true);
          notify(t('taskRefreshed'));
        } catch (cause) {
          setError(cause.message || String(cause));
        } finally {
          setBusy(false);
        }
      };

      const repair = async (project, kind, file) => {
        if (!file || busy) return;
        setBusy(true);
        setError('');
        try {
          setProgress({ label: kind === 'source' ? t('uploadSource') : t('uploadGlossary'), value: 5 });
          await uploadFile(project.id, kind, file, (value) => {
            setProgress({ label: kind === 'source' ? t('uploadSource') : t('uploadGlossary'), value });
          });
          setProgress({ label: t('creating'), value: 95 });
          await api('/finalize', { method: 'POST', body: JSON.stringify({ projectId: project.id }) });
          await load(true);
          notify(t('created'));
        } catch (cause) {
          setError(`${t('uploadFailed')}：${cause.message || cause}`);
          await load(true);
        } finally {
          setBusy(false);
          setProgress(null);
        }
      };

      const approve = async (project) => {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
          await api('/action', {
            method: 'POST',
            body: JSON.stringify({ projectId: project.id, decision: 'approve', note: '' }),
          });
          await load(true);
          notify(t('approved'));
        } catch (cause) {
          setError(cause.message || String(cause));
        } finally {
          setBusy(false);
        }
      };

      const requestChanges = async (project) => {
        if (!changeNote.trim()) {
          notify(t('changeNeeded'));
          return;
        }
        if (busy) return;
        setBusy(true);
        setError('');
        try {
          await api('/action', {
            method: 'POST',
            body: JSON.stringify({ projectId: project.id, decision: 'changes', note: changeNote.trim() }),
          });
          setShowChange(false);
          setChangeNote('');
          await load(true);
          notify(t('changesSent'));
        } catch (cause) {
          setError(cause.message || String(cause));
        } finally {
          setBusy(false);
        }
      };

      const removeProject = async () => {
        const project = pendingDelete;
        if (!project || busy) return;
        setBusy(true);
        setError('');
        try {
          await api('/delete', { method: 'POST', body: JSON.stringify({ projectId: project.id }) });
          setPendingDelete(null);
          setSelectedId(null);
          await load(true);
          notify(t('deletedToTrash'));
        } catch (cause) {
          setError(cause.message || String(cause));
        } finally {
          setBusy(false);
        }
      };

      const header = h('header', { className: 'trpg-header' },
        h('div', { className: 'trpg-brand' },
          h('div', { className: 'trpg-brand-mark' }, h(StudioMark, { size: 19 })),
          h('div', null,
            h('div', { className: 'trpg-title-line' },
              h('span', { className: 'trpg-title' }, t('title')),
              h('span', { className: 'trpg-version', title: `TRPG Studio v${version}` }, `v${version}`),
              h('span', { className: 'trpg-credit' }, t('author')),
            ),
            h('div', { className: 'trpg-subtitle' }, t('subtitle')),
          ),
        ),
        h('div', { className: 'trpg-header-actions' },
          h('button', { type: 'button', className: 'trpg-btn ghost small', onClick: () => load(false), title: t('refresh') },
            h(Icon, { size: 14 }, h('path', { d: 'M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6' })),
            t('refresh'),
          ),
          h('button', { type: 'button', className: 'trpg-btn primary', onClick: startNew },
            h(Icon, { size: 14 }, h('path', { d: 'M12 5v14M5 12h14' })),
            t('newProject'),
          ),
        ),
      );

      let main;
      if (loading && projects.length === 0) {
        main = h('div', { className: 'trpg-page' },
          h('div', { className: 'trpg-skeleton' }),
          h('div', { className: 'trpg-skeleton' }),
          h('div', { className: 'trpg-skeleton' }),
        );
      } else if (mode === 'new') {
        main = h(NewProject, {
          t,
          root,
          draft,
          setDraft,
          busy,
          progress,
          error,
          create,
          cancel: () => {
            setMode(projects.length > 0 ? 'project' : 'welcome');
            setError('');
          },
        });
      } else if (selected) {
        main = h(ProjectDetail, {
          t,
          project: selected,
          root,
          busy,
          error,
          showChange,
          setShowChange,
          changeNote,
          setChangeNote,
          approve,
          requestChanges,
          copyPrompt,
          onRepair: repair,
          onRefreshTask: refreshTask,
          onDelete: () => setPendingDelete(selected),
        });
      } else {
        main = h(Welcome, { t, demo, error, onNew: startNew, onDemo: () => window.open(demoUrl('preview.pdf'), '_blank', 'noopener') });
      }

      return h('div', { className: 'trpg-root' },
        h('style', null, CSS),
        header,
        h('div', { className: 'trpg-body' },
          h(ProjectRail, {
            t,
            projects,
            selectedId: selected?.id,
            onSelect: selectProject,
            onNew: startNew,
            onTrash: () => setTrashOpen(true),
            root,
          }),
          h('main', { className: 'trpg-main' }, main),
        ),
        toast ? h('div', { className: 'trpg-toast', role: 'status' }, toast) : null,
        manual ? h('div', { className: 'trpg-modal', role: 'dialog', 'aria-modal': 'true', onClick: (event) => { if (event.target === event.currentTarget) setManual(''); } },
          h('div', { className: 'trpg-modal-card' },
            h('h2', null, t('currentPrompt')),
            h('textarea', { className: 'trpg-textarea', readOnly: true, value: manual, onFocus: (event) => event.target.select() }),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: 10 } },
              h('button', { type: 'button', className: 'trpg-btn', onClick: () => setManual('') }, t('close')),
            ),
          ),
        ) : null,
        pendingDelete ? h(ConfirmDialog, {
          t,
          title: t('deleteConfirmTitle'),
          body: t('deleteConfirmBody'),
          confirmLabel: t('deleteConfirm'),
          busy,
          onConfirm: removeProject,
          onCancel: () => setPendingDelete(null),
        }) : null,
        trashOpen ? h(TrashDialog, {
          t,
          base: API,
          kind: 'project',
          onClose: () => setTrashOpen(false),
          onChanged: () => load(true),
        }) : null,
      );
    }

    function Welcome({ t, demo, error, onNew, onDemo }) {
      return h('div', { className: 'trpg-page' },
        error ? h('div', { className: 'trpg-alert', role: 'alert' }, error) : null,
        h('section', { className: 'trpg-hero' },
          h('div', { className: 'trpg-kicker' }, 'TRPG TRANSLATION STUDIO'),
          h('h1', null, t('emptyTitle')),
          h('p', null, t('emptyBody')),
          h('div', { className: 'trpg-hero-actions' },
            h('button', { type: 'button', className: 'trpg-btn primary', onClick: onNew },
              h(Icon, { size: 14 }, h('path', { d: 'M12 5v14M5 12h14' })), t('newProject')),
            demo ? h('button', { type: 'button', className: 'trpg-btn', onClick: onDemo }, t('openDemo')) : null,
          ),
          h('div', { className: 'trpg-steps' },
            h('span', { className: 'trpg-step active' }, t('stepMaterials')),
            h('span', { className: 'trpg-step' }, t('stepStyle')),
            h('span', { className: 'trpg-step' }, t('stepPages')),
          ),
          demo ? h('div', { className: 'trpg-hero-art' },
            h('img', { src: demoUrl('preview.png'), alt: t('demoPreview') }),
          ) : null,
        ),
        demo ? h('section', { className: 'trpg-card', style: { marginTop: 14 } },
          h('div', { className: 'trpg-card-head' },
            h('div', null,
              h('div', { className: 'trpg-card-title' }, t('demoTitle')),
              h('div', { className: 'trpg-card-sub' }, t('demoBody')),
            ),
            h('button', { type: 'button', className: 'trpg-btn small', onClick: () => window.open(demoUrl('contact-sheet.png'), '_blank', 'noopener') }, t('openDemo')),
          ),
          h('div', { className: 'trpg-preview-grid' },
            h('div', { className: 'trpg-shot' },
              h('div', { className: 'trpg-shot-head' }, h('span', { className: 'trpg-shot-title' }, t('demoPreview')), h('span', { className: 'trpg-badge' }, 'PNG')),
              h('div', { className: 'trpg-shot-body' }, h('img', { src: demoUrl('preview.png'), alt: t('demoPreview') })),
              h('div', { className: 'trpg-shot-foot' }, h('button', { type: 'button', className: 'trpg-btn small', onClick: () => window.open(demoUrl('preview.pdf'), '_blank', 'noopener') }, t('openPdf'))),
            ),
            h('div', { className: 'trpg-shot' },
              h('div', { className: 'trpg-shot-head' }, h('span', { className: 'trpg-shot-title' }, t('demoHard')), h('span', { className: 'trpg-badge warn' }, t('hard'))),
              h('div', { className: 'trpg-shot-body' }, h('img', { src: demoUrl('hard.png'), alt: t('demoHard') })),
              h('div', { className: 'trpg-shot-foot' }, h('button', { type: 'button', className: 'trpg-btn small', onClick: () => window.open(demoUrl('hard.pdf'), '_blank', 'noopener') }, t('openPdf'))),
            ),
            h('div', { className: 'trpg-shot' },
              h('div', { className: 'trpg-shot-head' }, h('span', { className: 'trpg-shot-title' }, t('demoTables')), h('span', { className: 'trpg-badge success' }, 'CARD')),
              h('div', { className: 'trpg-shot-body' }, h('img', { src: demoUrl('tables.png'), alt: t('demoTables') })),
              h('div', { className: 'trpg-shot-foot' }, h('button', { type: 'button', className: 'trpg-btn small', onClick: () => window.open(demoUrl('tables.pdf'), '_blank', 'noopener') }, t('openPdf'))),
            ),
          ),
        ) : null,
      );
    }

    function ProjectRail({ t, projects, selectedId, onSelect, onNew, onTrash, root }) {
      const current = String(root || '').toLowerCase();
      return h('aside', { className: 'trpg-rail' },
        h('div', { className: 'trpg-rail-head' }, h('span', null, `${t('projects')} · ${projects.length}`),
          h('div', { style: { display: 'flex', gap: 4 } },
            h('button', { type: 'button', className: 'trpg-btn ghost small', onClick: onTrash, title: t('trash') },
              h(Icon, { size: 13 }, h('path', { d: 'M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13' })),
            ),
            h('button', { type: 'button', className: 'trpg-btn ghost small', onClick: onNew, title: t('newProject') },
              h(Icon, { size: 13 }, h('path', { d: 'M12 5v14M5 12h14' })),
            ),
          ),
        ),
        projects.length === 0
          ? h('div', { className: 'trpg-empty' }, t('noProjects'))
          : h('div', { className: 'trpg-project-list' }, projects.map((project) =>
            h('button', {
              key: `${project.root || ''}|${project.id}`,
              type: 'button',
              className: 'trpg-project-row',
              'aria-current': selectedId === project.id ? 'true' : 'false',
              onClick: () => onSelect(project.id),
            },
              h('span', { className: 'trpg-project-name' }, project.title || t('unknown')),
              h('span', { className: 'trpg-project-meta' },
                h('span', { className: `trpg-dot ${project.status}` }),
                h('span', null, t(statusKey(project.status))),
                h('span', null, '·'),
                h('span', null, formatDate(project.updatedAt)),
                current && project.root && String(project.root).toLowerCase() !== current
                  ? h('span', { className: 'trpg-tag', title: project.root }, t('projectElsewhere'))
                  : null,
              ),
            ),
          )),
        root ? h('div', { className: 'trpg-rail-foot', title: root }, root) : null,
      );
    }

    function ConfirmDialog({ t, title, body, confirmLabel, busy, onConfirm, onCancel }) {
      return h('div', {
        className: 'trpg-modal',
        role: 'dialog',
        'aria-modal': 'true',
        onClick: (event) => { if (event.target === event.currentTarget && !busy) onCancel(); },
      },
        h('div', { className: 'trpg-modal-card' },
          h('h2', null, title),
          h('div', { className: 'trpg-modal-sub' }, body),
          h('div', { className: 'trpg-modal-actions' },
            h('button', { type: 'button', className: 'trpg-btn', disabled: busy, onClick: onCancel }, t('cancel')),
            h('button', { type: 'button', className: 'trpg-btn danger-solid', disabled: busy, onClick: onConfirm }, confirmLabel),
          ),
        ),
      );
    }

    function TrashDialog({ t, base, kind, onClose, onChanged }) {
      const [items, setItems] = useState(null);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const [pendingPurge, setPendingPurge] = useState(null);

      const load = useCallback(async () => {
        try {
          const data = await api('/trash/list', { method: 'POST', body: '{}' }, base);
          setItems(Array.isArray(data.items) ? data.items : []);
          setError('');
        } catch (cause) {
          setItems([]);
          setError(cause.message || String(cause));
        }
      }, [base]);

      useEffect(() => { load(); }, [load]);

      const restore = async (item) => {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
          await api('/trash/restore', {
            method: 'POST',
            body: JSON.stringify({ root: item.root, trashId: item.trashId, kind }),
          }, base);
          await load();
          onChanged?.();
        } catch (cause) {
          setError(cause.message || String(cause));
        } finally {
          setBusy(false);
        }
      };

      const purge = async (item) => {
        if (busy) return;
        if (pendingPurge !== item.trashId) {
          setPendingPurge(item.trashId);
          return;
        }
        setBusy(true);
        setError('');
        try {
          await api('/trash/purge', {
            method: 'POST',
            body: JSON.stringify({ root: item.root, trashId: item.trashId, kind }),
          }, base);
          setPendingPurge(null);
          await load();
          onChanged?.();
        } catch (cause) {
          setError(cause.message || String(cause));
        } finally {
          setBusy(false);
        }
      };

      return h('div', {
        className: 'trpg-modal',
        role: 'dialog',
        'aria-modal': 'true',
        onClick: (event) => { if (event.target === event.currentTarget) onClose(); },
      },
        h('div', { className: 'trpg-modal-card' },
          h('h2', null, t('trashTitle')),
          h('div', { className: 'trpg-modal-sub' }, t('trashHint')),
          error ? h('div', { className: 'trpg-alert', style: { marginTop: 10 } }, error) : null,
          items === null
            ? h('div', { className: 'trpg-meta', style: { marginTop: 12 } }, t('loading'))
            : items.length === 0
              ? h('div', { className: 'trpg-empty' }, t('trashEmpty'))
              : h('div', { className: 'trpg-trash-list' }, items.map((item) => h('div', {
                className: 'trpg-trash-row',
                key: `${item.root}|${item.trashId}`,
              },
                h('div', { style: { minWidth: 0 } },
                  h('div', { className: 'trpg-trash-title' }, item.title || item.id),
                  h('div', { className: 'trpg-meta', style: { marginTop: 3 } },
                    `${item.deletedAt ? formatDate(item.deletedAt) : ''}${item.root ? ` · ${item.root}` : ''}`),
                ),
                h('div', { className: 'trpg-trash-actions' },
                  h('button', { type: 'button', className: 'trpg-btn small', disabled: busy, onClick: () => restore(item) }, t('restore')),
                  h('button', { type: 'button', className: 'trpg-btn small danger', disabled: busy, onClick: () => purge(item) },
                    pendingPurge === item.trashId ? t('purgeConfirm') : t('purge')),
                ),
              ))),
          h('div', { className: 'trpg-modal-actions' },
            h('button', { type: 'button', className: 'trpg-btn', onClick: onClose }, t('close')),
          ),
        ),
      );
    }

    function WorkflowCard({ t, workflow, busy, onRefreshTask }) {
      if (!workflow) return null;
      const issues = Array.isArray(workflow.issues) ? workflow.issues : [];
      const needsRefresh = issues.some((issue) => issue.code === 'task-version');
      return h('section', { className: 'trpg-workflow' },
        h('div', { className: 'trpg-workflow-head' },
          h('span', { className: 'trpg-workflow-title' }, t('workflow')),
          h('span', { className: `trpg-badge ${workflow.health === 'warning' ? 'warn' : 'success'}` },
            workflow.health === 'warning' ? t('workflowBlocked') : t('workflowClear')),
        ),
        h('div', { className: 'trpg-workflow-next' },
          h('span', null, `${t('nextAction')}：${workflowNextLabel(t, workflow.next)}`),
        ),
        issues.length > 0 ? h('ul', { className: 'trpg-workflow-issues' },
          issues.slice(0, 4).map((issue) => h('li', { key: issue.code + issue.message }, issue.message)),
        ) : null,
        needsRefresh && onRefreshTask ? h('button', {
          type: 'button', className: 'trpg-btn small', style: { marginTop: 8 }, disabled: busy,
          onClick: () => onRefreshTask(),
        }, t('refreshTask')) : null,
      );
    }

    function TitleCard({ t, project, busy, copyPrompt }) {
      const title = project.files?.title || null;
      const strict = project.titlePolicy === 'strict';
      if (!title && !strict) return null;
      const verified = title?.status === 'verified' && title?.verifiedAfterRead === true;
      return h('section', { className: 'trpg-card', style: { marginTop: 12 } },
        h('div', { className: 'trpg-card-head' },
          h('div', { className: 'trpg-card-title' }, t('bookTitle')),
          h('span', { className: `trpg-badge ${verified ? 'success' : 'warn'}` }, verified ? t('titleVerified') : t('titleDraft')),
        ),
        h('div', { className: 'trpg-summary' },
          h('div', null, h('span', null, t('titleLabel')), h('span', null, project.title || '—')),
          h('div', null, h('span', null, t('originalTitle')), h('span', null, title?.titleOriginal || project.titleOriginal || '—')),
          title?.sourcePages?.length ? h('div', null, h('span', null, t('titleSourcePages')), h('span', null, title.sourcePages.join(', '))) : null,
          title?.rationale ? h('div', null, h('span', null, t('sheetNotes')), h('span', null, title.rationale)) : null,
        ),
        !verified && project.prompts?.title ? h('div', { style: { display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' } },
          h('button', { type: 'button', className: 'trpg-btn small primary', disabled: busy, onClick: () => copyPrompt(project.prompts.title) }, t('verifyTitle')),
        ) : null,
      );
    }

    function StepBar({ t, workflow, status }) {
      const step = Number.isFinite(workflow?.step) ? workflow.step : 0;
      const items = [
        { label: t('stepMaterials') },
        { label: t('stepStyle') },
        { label: t('stepPages') },
        { label: t('stepFull') },
      ];
      const complete = workflow?.phase === 'done';
      return h('div', { className: 'trpg-steps', 'aria-label': t('stepPages') },
        items.map((item, index) => h('span', {
          key: item.label,
          className: `trpg-step${index === step && !complete ? ' active' : index < step || complete ? ' done' : ''}`,
        }, h('span', { 'aria-hidden': 'true' }, index < step || complete ? '✓' : String(index + 1)), item.label)),
      );
    }

    function ProjectDetail({ t, project, root, busy, error, showChange, setShowChange, changeNote, setChangeNote, approve, requestChanges, copyPrompt, onRepair, onRefreshTask, onDelete }) {
      const sourceRepairInput = useRef(null);
      const glossaryRepairInput = useRef(null);
      const files = project.files || {};
      const status = project.status;
      const hasPass1 = Boolean(files.previewPng && files.hardPng && files.previewPdf && files.hardPdf);
      const qa = files.qa || null;
      const type3 = Number(files.type3 || 0);
      const qaFailed = Boolean(qa && qa.ok === false);
      const imageGuardOk = Boolean(files.imageCheck && files.imageCheckOk);
      const prompt = project.prompts || {};
      const primary = primaryAction(t, project);
      const workingGlossary = files.glossaryFilled
        ? { path: 'glossary/glossary.filled.csv', label: t('workingGlossary') }
        : files.glossary
          ? { path: 'glossary/glossary.csv', label: t('workingGlossary') }
          : null;
      const deliverables = [
        files.translationReport ? { path: 'out/TRANSLATION-REPORT.md', label: t('translationReport'), icon: 'MD' } : null,
        files.tablePlan ? { path: 'out/TABLE-PLAN.json', label: t('tablePlan'), icon: 'JSON' } : null,
        files.sourceCards ? { path: 'out/SOURCE-CARDS/INDEX.md', label: t('sourceCards'), icon: 'MD' } : null,
        files.bookmarksReport ? { path: 'out/BOOKMARKS.json', label: t('bookmarksReport'), icon: 'JSON' } : null,
        files.glossaryCsv ? { path: 'out/GLOSSARY.csv', label: t('glossaryOutput'), icon: 'CSV', download: true } : null,
        files.glossaryMd ? { path: 'out/GLOSSARY.md', label: t('glossaryRead'), icon: 'MD' } : null,
        files.qaMd ? { path: 'out/QA.md', label: t('qaDoc'), icon: 'MD' } : null,
        (files.layoutStrong > 0 || files.layoutMild > 0 || files.layoutMergeGroups > 0) ? { path: 'out/pass1/LAYOUT.json', label: t('layoutHint'), icon: 'JSON' } : null,
        (files.fullLayoutStrong > 0 || files.fullLayoutMild > 0 || files.fullLayoutMergeGroups > 0) ? { path: 'out/LAYOUT.json', label: t('layoutHint'), icon: 'JSON' } : null,
        workingGlossary ? { ...workingGlossary, icon: 'CSV', download: true } : null,
      ].filter(Boolean);
      return h('div', { className: 'trpg-page' },
        error ? h('div', { className: 'trpg-alert', role: 'alert' }, error) : null,
        h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 4 } },
          h('div', { style: { minWidth: 0 } },
            h('div', { className: 'trpg-kicker' }, t('project')),
            h('h1', { style: { margin: 0, fontSize: 24, lineHeight: 1.25 } }, project.title),
            project.titleOriginal ? h('div', { className: 'trpg-meta', style: { marginTop: 3 } }, `${t('originalTitle')}：${project.titleOriginal}`) : null,
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 7 } },
              h('span', { className: `trpg-badge ${statusTone(status)}` }, t(statusKey(status))),
              h('span', { className: 'trpg-meta' }, project.source?.bytes ? `${t('sourceReady')} · ${formatBytes(project.source.bytes)}` : t('missingSource')),
              h('span', { className: 'trpg-meta' }, project.glossary?.mode === 'blank' ? t('noGlossary') : (project.glossary?.original ? t('glossaryUploaded') : t('missingGlossary'))),
              project.root ? h('span', { className: 'trpg-meta', title: project.root },
                root && String(project.root).toLowerCase() !== String(root).toLowerCase()
                  ? `${t('projectElsewhere')} · ${project.root}`
                  : project.root) : null,
            ),
          ),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' } },
            project.source ? h('a', { className: 'trpg-btn small', href: fileUrl(project, 'TASK.md'), target: '_blank', rel: 'noopener' }, t('task')) : null,
            h('button', { type: 'button', className: 'trpg-btn small danger', disabled: busy, onClick: onDelete }, t('deleteProject')),
          ),
        ),
        h(WorkflowCard, { t, workflow: project.workflow, busy, onRefreshTask: () => onRefreshTask?.(project) }),
        h(TitleCard, { t, project, busy, copyPrompt }),
        h(StepBar, { t, workflow: project.workflow, status }),
        (files.progress || ['auto', 'proof', 'build'].includes(project.workflow?.next?.action)) ? (() => {
          const progress = files.progress || { translated: 0, total: 0, proofed: 0, proofTotal: 0, percent: 0, batches: [], batchCount: 0, current: null };
          const percent = Math.round(Number(progress.percent || 0) * 100);
          const currentBatch = (progress.batches || []).find((item) => item.id === progress.current) || null;
          const next = project.workflow?.next;
          const actionKey = next?.promptKey || null;
          const actionLabel = next?.labelKey ? workflowNextLabel(t, next) : '';
          return h('section', { className: 'trpg-card', style: { marginTop: 12 } },
            h('div', { className: 'trpg-card-head' },
              h('div', { style: { minWidth: 0 } },
                h('div', { className: 'trpg-card-title' }, `${t('batchProgress')} · ${progress.translated}/${progress.total} · ${t('proofed')} ${progress.proofed || 0}/${progress.proofTotal || 0}`),
                h('div', { className: 'trpg-card-sub' }, currentBatch ? `${currentBatch.id} · ${currentBatch.title}` : t('batchDone')),
              ),
              h('span', { className: `trpg-badge ${progress.translated >= progress.total && progress.total ? 'success' : ''}` }, `${percent}%`),
            ),
            h('div', { className: 'trpg-batch-track' },
              h('div', { className: 'trpg-batch-fill', style: { width: `${Math.max(0, Math.min(100, percent))}%` } }),
            ),
            currentBatch ? h('div', { className: 'trpg-meta', style: { marginTop: 6 } },
              `${t('batchPages')} ${currentBatch.pages?.[0]}–${currentBatch.pages?.[1]} · ${currentBatch.covered}/${currentBatch.total} · ${currentBatch.proofed ? t('proofed') : t('proofPending')} · ${t(currentBatch.checked ? 'batchChecked' : currentBatch.status === 'done' ? 'batchDone' : currentBatch.status === 'partial' ? 'batchPartial' : 'batchPending')}`,
            ) : null,
            h('details', { style: { marginTop: 8 } },
              h('summary', { style: { cursor: 'pointer', fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)' } }, `${t('batchList')} · ${progress.batchCount || (progress.batches || []).length}`),
              h('div', { className: 'trpg-batch-list' }, (progress.batches || []).map((item) => h('div', { className: 'trpg-batch-row', key: item.id },
                h('span', { className: `trpg-batch-dot ${item.status}` }),
                h('span', { className: 'trpg-batch-id' }, item.id),
                h('span', { className: 'trpg-batch-title', title: item.title }, item.title),
                h('span', { className: 'trpg-batch-pages' }, `${item.pages?.[0]}–${item.pages?.[1]}`),
                h('span', { className: 'trpg-batch-count' }, `${item.covered}/${item.total}`),
              ))),
            ),
            actionKey ? h('div', { style: { marginTop: 10 } },
              h('button', {
                type: 'button',
                className: 'trpg-btn primary',
                disabled: busy,
                onClick: () => copyPrompt(prompt[actionKey] || '', false),
              }, actionLabel),
              actionKey === 'auto' ? h('div', { className: 'trpg-meta', style: { marginTop: 5 } }, t('autoHint')) : null,
            ) : null,
          );
        })() : null,

        files.termQa && (files.termQa.errors?.length || files.termQa.stats?.missingTerms) ? h('section', { className: 'trpg-card', style: { marginTop: 12 } },
          h('div', { className: 'trpg-card-head' },
            h('div', null,
              h('div', { className: 'trpg-card-title' }, t('termTitle')),
              h('div', { className: 'trpg-card-sub' }, `${files.termQa.stats?.glossaryRows || 0} 条 · ${t('termMissing')} ${files.termQa.stats?.missingTerms || 0}`),
            ),
            h('span', { className: 'trpg-badge warn' }, t('termMissing')),
          ),
          h('div', { className: 'trpg-meta', style: { marginTop: 6 } },
            (files.termQa.errors || []).slice(0, 3).join('；'),
          ),
          h('a', { className: 'trpg-btn small', style: { marginTop: 8 }, href: fileUrl(project, 'glossary/glossary.csv'), target: '_blank', rel: 'noopener' }, t('termOpen')),
        ) : null,

        h('section', { className: 'trpg-card', style: { marginTop: 16 } },
          h('div', { className: 'trpg-card-head' },
            h('div', null,
              h('div', { className: 'trpg-card-title' }, t('source')),
              h('div', { className: 'trpg-card-sub' }, t('copyHint')),
            ),
            h('span', { className: 'trpg-badge' }, styleLabel(t, project.options?.style)),
          ),
          project.source
            ? h('div', { className: 'trpg-file' },
              h('div', { className: 'trpg-file-icon' }, 'PDF'),
              h('div', { style: { minWidth: 0 } },
                h('div', { className: 'trpg-file-name', title: baseName(project.source.path) }, baseName(project.source.path) || 'source.pdf'),
                h('div', { className: 'trpg-file-meta' }, `${formatBytes(project.source.bytes)} · ${project.sourceLang} → ${project.targetLang}`),
              ),
              h('div', { className: 'trpg-file-actions' },
                h('a', { className: 'trpg-btn small', href: fileUrl(project, project.source.path), target: '_blank', rel: 'noopener' }, t('openPdf')),
              ),
            )
            : h('div', { className: 'trpg-alert info', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' } },
              h('span', null, t('missingSource')),
              h('button', { type: 'button', className: 'trpg-btn small', disabled: busy, onClick: () => sourceRepairInput.current?.click() }, t('uploadSource')),
            ),
          h('input', {
            ref: sourceRepairInput,
            type: 'file',
            accept: '.pdf,application/pdf',
            className: 'trpg-sr',
            onChange: (event) => {
              const file = event.target.files?.[0];
              if (file) onRepair(project, 'source', file);
              event.target.value = '';
            },
          }),
          h('div', { className: 'trpg-summary' },
            h('div', null, h('span', null, t('glossary')), h('span', null, project.glossary?.mode === 'blank' ? t('noGlossary') : (project.glossary?.original ? t('glossaryUploaded') : t('missingGlossary')))),
            project.glossary?.mode === 'uploaded' && !project.glossary?.original ? h('div', null,
              h('span', null, ''),
              h('button', { type: 'button', className: 'trpg-btn small', disabled: busy, onClick: () => glossaryRepairInput.current?.click() }, t('glossaryUpload'))) : null,
            h('div', null, h('span', null, t('font')), h('span', null, project.options?.fontPair === 'source-han' ? t('fontSource') : t('fontSafe'))),
            h('div', null, h('span', null, t('wide')), h('span', null, project.options?.wideTables === 'split' ? t('wideSplit') : t('wideAuto'))),
            h('div', null, h('span', null, t('path')), h('span', { className: 'trpg-path', title: project.path || root }, project.path || root || '—')),
          ),
          h('input', {
            ref: glossaryRepairInput,
            type: 'file',
            accept: '.csv,.tsv,.txt,.md,.json,.xlsx,.xls',
            className: 'trpg-sr',
            onChange: (event) => {
              const file = event.target.files?.[0];
              if (file) onRepair(project, 'glossary', file);
              event.target.value = '';
            },
          }),
        ),

        h('section', { className: 'trpg-card' },
          h('div', { className: 'trpg-card-head' },
            h('div', null,
              h('div', { className: 'trpg-card-title' }, t('review')),
              h('div', { className: 'trpg-card-sub' }, t('pass1Hint')),
            ),
            hasPass1 ? h('span', { className: 'trpg-badge success' }, t('statusPass1')) : h('span', { className: 'trpg-badge' }, t('waitingAgent')),
          ),
          h('div', { className: 'trpg-preview-grid' },
            h(PreviewShot, {
              t,
              project,
              title: t('preview'),
              hint: t('previewHint'),
              image: hasPass1 ? fileUrl(project, 'out/pass1/preview.png') : '',
              pdf: hasPass1 ? fileUrl(project, 'out/pass1/preview.pdf') : '',
            }),
            h(PreviewShot, {
              t,
              project,
              title: t('hard'),
              hint: t('hardHint'),
              image: hasPass1 ? fileUrl(project, 'out/pass1/hard.png') : '',
              pdf: hasPass1 ? fileUrl(project, 'out/pass1/hard.pdf') : '',
              hard: true,
            }),
          ),
          h('div', { className: 'trpg-preview-note', role: 'note' }, t('previewDisclaimer')),
          files.embeddedImages ? h('div', { className: 'trpg-meta', style: { marginTop: 6 } }, `${t('embeddedImages')}：${files.embeddedImages}`) : null,
          files.imageCheckOk && files.embeddedImages === 0 ? h('div', { className: 'trpg-meta', style: { marginTop: 6 } }, t('zeroImagesConfirmed')) : null,
          hasPass1 && !files.imageCheck ? h('div', { className: 'trpg-alert info', style: { marginTop: 9 } }, t('imageGuardNeeded')) : null,
          hasPass1 && files.imageCheck && !files.imageCheckOk ? h('div', { className: 'trpg-alert', role: 'alert', style: { marginTop: 9 } }, t('imageGuardFailed')) : null,
          (files.layoutStrong > 0 || files.layoutMild > 0 || files.layoutMergeGroups > 0) ? h('div', { className: 'trpg-layout-note' },
            h('div', { className: 'trpg-meta' },
              `${t('layoutHint')} · ${t('layoutStrong')} ${files.layoutStrong || 0} · ${t('layoutMild')} ${files.layoutMild || 0}`
              + (files.layoutMergeGroups ? ` · ${t('layoutMerge')} ${files.layoutMergeGroups}` : '')
              + ` · ${t('layoutTip')}`),
            Array.isArray(files.layoutPages) && files.layoutPages.length ? h('ul', { className: 'trpg-layout-list' },
              files.layoutPages.map((item) => h('li', { key: `${item.source}-${item.page}` },
                `${item.page} · ${Math.round(Number(item.fill || 0) * 100)}% · ${item.reason}`))) : null,
          ) : null,
          files.report ? h('details', { style: { marginTop: 10 } },
            h('summary', { style: { cursor: 'pointer', fontSize: 11.5, color: 'var(--dsw-alias-label-secondary)' } }, t('report')),
            h('pre', { style: { whiteSpace: 'pre-wrap', fontSize: 11, lineHeight: 1.6, maxHeight: 220, overflow: 'auto', margin: '8px 0 0', color: 'var(--dsw-alias-label-secondary)' } }, files.report),
          ) : null,
          (type3 > 0 || qaFailed || status === 'warning') ? h('div', { className: 'trpg-alert', role: 'alert', style: { marginTop: 10 } },
            type3 > 0 ? `${t('type3Warning')} (${type3} Type3)` : t('qaFailed')) : null,
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 } },
            hasPass1 && project.review?.decision !== 'approve' ? h('button', { type: 'button', className: 'trpg-btn primary', disabled: busy || type3 > 0 || qaFailed || !imageGuardOk, onClick: () => approve(project) }, t('approve')) : null,
            hasPass1 ? h('button', { type: 'button', className: 'trpg-btn', disabled: busy, onClick: () => setShowChange(!showChange) }, t('changes')) : null,
            !hasPass1 && status === 'ready' ? h('button', { type: 'button', className: 'trpg-btn primary', onClick: () => copyPrompt(prompt.start) }, t('copyStart')) : null,
            project.review?.decision === 'changes' ? h('button', { type: 'button', className: 'trpg-btn', onClick: () => copyPrompt(prompt.revise) }, t('copyRevise')) : null,
          ),
          project.review?.decision === 'approve' ? h('div', { className: 'trpg-meta', style: { marginTop: 8 } }, `${t('approved')} · ${formatDate(project.review.at)}`) : null,
          project.review?.decision === 'changes' ? h('div', { className: 'trpg-meta', style: { marginTop: 8 } }, `${t('changesSent')} · ${project.review.note || ''}`) : null,
          showChange ? h('div', { style: { marginTop: 12 } },
            h('label', { className: 'trpg-label', htmlFor: 'trpg-change' }, t('changeNote')),
            h('textarea', {
              id: 'trpg-change',
              className: 'trpg-textarea',
              placeholder: t('changePlaceholder'),
              value: changeNote,
              onChange: (event) => setChangeNote(event.target.value),
            }),
            h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 } },
              h('button', { type: 'button', className: 'trpg-btn', onClick: () => setShowChange(false) }, t('back')),
              h('button', { type: 'button', className: 'trpg-btn primary', disabled: busy, onClick: () => requestChanges(project) }, t('submitChanges')),
            ),
            h('div', { className: 'trpg-meta', style: { marginTop: 5 } }, t('reviewNote')),
          ) : null,
        ),

        h('section', { className: 'trpg-card' },
          h('div', { className: 'trpg-card-head' },
            h('div', null,
              h('div', { className: 'trpg-card-title' }, t('fullBook')),
              h('div', { className: 'trpg-card-sub' }, t('stepFull')),
            ),
            files.book ? h('span', { className: 'trpg-badge success' }, t('statusFull')) : h('span', { className: 'trpg-badge' }, t('notYet')),
          ),
          files.book ? h('div', { style: { display: 'grid', gap: 10 } },
            h('div', { className: 'trpg-file' },
              h('div', { className: 'trpg-file-icon' }, 'PDF'),
              h('div', { style: { minWidth: 0 } },
                h('div', { className: 'trpg-file-name' }, 'book.pdf'),
                h('div', { className: 'trpg-file-meta' }, qa ? `${qa.pages || files.pageCount || '—'} ${t('pageCount')} · ${t('type3')}: ${Number(qa.type3 || 0)}` : t('notYet')),
              ),
              h('div', { className: 'trpg-file-actions' },
                h('a', { className: 'trpg-btn small', href: fileUrl(project, 'out/book.pdf'), target: '_blank', rel: 'noopener' }, t('openPdf')),
                h('a', { className: 'trpg-btn small', href: fileUrl(project, 'out/book.pdf', true), download: 'book.pdf' }, '↓'),
              ),
            ),
            qa ? h('div', { className: 'trpg-summary' },
              h('div', null, h('span', null, t('qa')), h('span', null, Number(qa.type3 || 0) === 0 ? 'Type3 0' : `Type3 ${qa.type3}`)),
              h('div', null, h('span', null, t('pageCount')), h('span', null, String(qa.pages || '—'))),
              h('div', null, h('span', null, t('embeddedImages')), h('span', null, String(qa.images ?? 0))),
              h('div', null, h('span', null, t('bookmarks')), h('span', null, String(qa.bookmarks ?? 0))),
            ) : null,
          ) : h('div', { className: 'trpg-meta' }, t('notYet')),
          (files.fullLayoutStrong > 0 || files.fullLayoutMild > 0 || files.fullLayoutMergeGroups > 0) ? h('div', { className: 'trpg-layout-note' },
            h('div', { className: 'trpg-meta' },
              `${t('layoutHint')} · ${t('layoutStrong')} ${files.fullLayoutStrong || 0} · ${t('layoutMild')} ${files.fullLayoutMild || 0}`
              + (files.fullLayoutMergeGroups ? ` · ${t('layoutMerge')} ${files.fullLayoutMergeGroups}` : '')
              + ` · ${t('layoutTip')}`),
            Array.isArray(files.fullLayoutPages) && files.fullLayoutPages.length ? h('ul', { className: 'trpg-layout-list' },
              files.fullLayoutPages.map((item) => h('li', { key: `${item.source}-${item.page}` },
                `${item.page} · ${Math.round(Number(item.fill || 0) * 100)}% · ${item.reason}`))) : null,
          ) : null,
        ),

        h('section', { className: 'trpg-card' },
          h('div', { className: 'trpg-card-head' },
            h('div', null,
              h('div', { className: 'trpg-card-title' }, t('deliverables')),
              h('div', { className: 'trpg-card-sub' }, t('deliverablesSub')),
            ),
            h('span', { className: `trpg-badge${deliverables.length ? ' success' : ''}` }, deliverables.length ? `${deliverables.length}` : t('notYet')),
          ),
          deliverables.length > 0
            ? h('div', { style: { display: 'grid', gap: 9 } }, deliverables.map((item) =>
              h('div', { className: 'trpg-file', key: item.path },
                h('div', { className: 'trpg-file-icon' }, item.icon),
                h('div', { style: { minWidth: 0 } },
                  h('div', { className: 'trpg-file-name' }, item.label),
                  h('div', { className: 'trpg-file-meta' }, baseName(item.path)),
                ),
                h('div', { className: 'trpg-file-actions' },
                  h('a', { className: 'trpg-btn small', href: fileUrl(project, item.path), target: '_blank', rel: 'noopener' }, t('openFile')),
                  item.download ? h('a', { className: 'trpg-btn small', href: fileUrl(project, item.path, true), download: baseName(item.path) }, '↓') : null,
                ),
              ),
            ))
            : h('div', { className: 'trpg-meta' }, t('notYet')),
        ),

        primary ? h('div', { className: 'trpg-sticky' },
          h('div', { className: 'trpg-sticky-copy' },
            h('div', { className: 'trpg-sticky-title' }, primary.label),
            h('div', { className: 'trpg-sticky-sub' }, primary.hint || t('copyHint')),
          ),
          h('button', { type: 'button', className: 'trpg-btn primary', onClick: () => copyPrompt(primary.text) },
            h(Icon, { size: 14 }, h('path', { d: 'M8 8h11v11H8zM5 16V5h11' })),
            t('copyAndClose'),
          ),
        ) : null,
      );
    }

    function previewAction(t, project) {
      const prompt = project.prompts || {};
      const next = project.workflow?.next;
      if (!next?.promptKey || !prompt[next.promptKey]) return null;
      return {
        label: workflowNextLabel(t, next),
        text: prompt[next.promptKey],
      };
    }

    function primaryAction(t, project) {
      return previewAction(t, project);
    }

    function PreviewShot({ t, project, title, hint, image, pdf, hard }) {
      return h('div', { className: 'trpg-shot' },
        h('div', { className: 'trpg-shot-head' },
          h('span', { className: 'trpg-shot-title' }, title),
          h('span', { className: `trpg-badge${hard ? ' warn' : ''}` }, hard ? t('hard') : t('preview')),
        ),
        image
          ? h('div', { className: 'trpg-shot-body' }, h('img', { src: image, alt: title }))
          : h('div', { className: 'trpg-shot-body' }, h('div', { className: 'trpg-shot-empty' },
            h('strong', null, t('waitingAgent')),
            h('span', null, t('waitingBody')),
          )),
        h('div', { className: 'trpg-shot-foot' },
          h('span', { className: 'trpg-meta', style: { alignSelf: 'center' } }, hint),
          pdf ? h('a', { className: 'trpg-btn small', href: pdf, target: '_blank', rel: 'noopener', style: { marginLeft: 'auto' } }, t('openPdf')) : null,
        ),
      );
    }

    function NewProject({ t, root, draft, setDraft, busy, progress, error, create, cancel }) {
      const sourceInput = useRef(null);
      const glossaryInput = useRef(null);
      const assetInput = useRef(null);
      const [localError, setLocalError] = useState('');

      const acceptSource = useCallback((file) => {
        if (!file) return;
        if (!/\.pdf$/i.test(file.name)) {
          setLocalError(t('notPdf'));
          return;
        }
        if (file.size > MAX_PDF) {
          setLocalError(t('fileTooLarge'));
          return;
        }
        setLocalError('');
        setDraft((current) => ({ ...current, source: file }));
      }, [setDraft, t]);

      const acceptAssets = useCallback((fileList) => {
        setLocalError('');
        const incoming = [...fileList].filter((file) => /\.(png|jpe?g|webp)$/i.test(file.name));
        if (incoming.length !== fileList.length) setLocalError(t('notImage'));
        const room = Math.max(0, 8 - draft.assets.length);
        if (incoming.length > room) setLocalError(t('tooManyAssets'));
        const unique = incoming.filter((file) => !draft.assets.some((item) => item.name === file.name && item.size === file.size));
        setDraft((current) => ({ ...current, assets: [...current.assets, ...unique.slice(0, room)] }));
      }, [draft.assets, setDraft, t]);

      const onDrop = (event) => {
        event.preventDefault();
        const file = event.dataTransfer.files?.[0];
        acceptSource(file);
      };

      return h('div', { className: 'trpg-page narrow' },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 } },
          h('div', null,
            h('div', { className: 'trpg-kicker' }, t('newProject')),
            h('h1', { style: { margin: 0, fontSize: 23 } }, t('newTitle')),
            h('div', { className: 'trpg-meta', style: { marginTop: 4 } }, t('newSub')),
          ),
          h('button', { type: 'button', className: 'trpg-btn small', onClick: cancel }, t('back')),
        ),
        error ? h('div', { className: 'trpg-alert', role: 'alert' }, error) : null,
        localError ? h('div', { className: 'trpg-alert', role: 'alert' }, localError) : null,

        h('section', { className: 'trpg-card' },
          h('div', { className: 'trpg-card-head' },
            h('div', null,
              h('div', { className: 'trpg-card-title' }, t('stepMaterials')),
              h('div', { className: 'trpg-card-sub' }, t('copyHint')),
            ),
          ),
          h('div', { className: 'trpg-field' },
            h('div', { className: 'trpg-label' }, t('source')),
            draft.source
              ? h('div', { className: 'trpg-file' },
                h('div', { className: 'trpg-file-icon' }, 'PDF'),
                h('div', { style: { minWidth: 0 } },
                  h('div', { className: 'trpg-file-name' }, draft.source.name),
                  h('div', { className: 'trpg-file-meta' }, formatBytes(draft.source.size)),
                ),
                h('div', { className: 'trpg-file-actions' },
                  h('button', { type: 'button', className: 'trpg-btn small', onClick: () => sourceInput.current?.click() }, t('sourceChosen')),
                  h('button', { type: 'button', className: 'trpg-btn small ghost', onClick: () => setDraft((current) => ({ ...current, source: null })) }, '×'),
                ),
              )
              : h('div', {
                className: 'trpg-drop',
                role: 'button',
                tabIndex: 0,
                onClick: () => sourceInput.current?.click(),
                onKeyDown: (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    sourceInput.current?.click();
                  }
                },
                onDragOver: (event) => event.preventDefault(),
                onDrop,
              },
                h('strong', null, t('sourceHint')),
                h('span', null, 'PDF · ≤ 150 MB'),
              ),
            h('input', {
              ref: sourceInput,
              type: 'file',
              accept: '.pdf,application/pdf',
              className: 'trpg-sr',
              onChange: (event) => {
                acceptSource(event.target.files?.[0]);
                event.target.value = '';
              },
            }),
          ),
          h('div', { className: 'trpg-field' },
            h('div', { className: 'trpg-label' }, t('glossary')),
            h('div', { className: 'trpg-seg', role: 'group' },
              h('button', {
                type: 'button',
                'aria-pressed': draft.glossaryMode === 'blank',
                onClick: () => setDraft((current) => ({ ...current, glossaryMode: 'blank', glossaryFile: null })),
              }, t('glossaryBlank')),
              h('button', {
                type: 'button',
                'aria-pressed': draft.glossaryMode === 'uploaded',
                onClick: () => setDraft((current) => ({ ...current, glossaryMode: 'uploaded' })),
              }, t('glossaryUpload')),
            ),
            draft.glossaryMode === 'uploaded'
              ? h('div', { style: { marginTop: 8 } },
                draft.glossaryFile
                  ? h('div', { className: 'trpg-file' },
                    h('div', { className: 'trpg-file-icon' }, 'CSV'),
                    h('div', { style: { minWidth: 0 } },
                      h('div', { className: 'trpg-file-name' }, draft.glossaryFile.name),
                      h('div', { className: 'trpg-file-meta' }, formatBytes(draft.glossaryFile.size)),
                    ),
                    h('div', { className: 'trpg-file-actions' },
                      h('button', { type: 'button', className: 'trpg-btn small', onClick: () => glossaryInput.current?.click() }, t('glossaryUpload')),
                      h('button', { type: 'button', className: 'trpg-btn small ghost', onClick: () => setDraft((current) => ({ ...current, glossaryFile: null })) }, '×'),
                    ),
                  )
                  : h('button', { type: 'button', className: 'trpg-btn wide', onClick: () => glossaryInput.current?.click() }, t('glossaryUpload')),
                h('input', {
                  ref: glossaryInput,
                  type: 'file',
                  accept: '.csv,.tsv,.txt,.md,.json,.xlsx,.xls',
                  className: 'trpg-sr',
                  onChange: (event) => {
                    const file = event.target.files?.[0];
                    if (file) setDraft((current) => ({ ...current, glossaryMode: 'uploaded', glossaryFile: file }));
                    event.target.value = '';
                  },
                }),
              )
              : h('div', { className: 'trpg-meta', style: { marginTop: 6 } }, t('glossaryHint')),
          ),
          h('div', { className: 'trpg-field' },
            h('div', { className: 'trpg-label' }, t('assets')),
            h('button', { type: 'button', className: 'trpg-btn wide', onClick: () => assetInput.current?.click() }, t('assetsHint')),
            h('input', {
              ref: assetInput,
              type: 'file',
              accept: 'image/png,image/jpeg,image/webp',
              multiple: true,
              className: 'trpg-sr',
              onChange: (event) => {
                acceptAssets(event.target.files || []);
                event.target.value = '';
              },
            }),
            draft.assets.length > 0 ? h('div', { className: 'trpg-meta', style: { marginTop: 5 } }, `${draft.assets.length} / 8 · ${draft.assets.map((file) => file.name).join('、')}`) : null,
          ),
        ),

        h('section', { className: 'trpg-card' },
          h('div', { className: 'trpg-card-head' },
            h('div', null,
              h('div', { className: 'trpg-card-title' }, t('stepStyle')),
              h('div', { className: 'trpg-card-sub' }, t('advanced')),
            ),
          ),
          h('div', { className: 'trpg-field' },
            h('label', { className: 'trpg-label', htmlFor: 'trpg-title' }, t('titleLabel')),
            h('input', {
              id: 'trpg-title',
              className: 'trpg-input',
              value: draft.title,
              placeholder: t('titlePlaceholder'),
              onChange: (event) => setDraft((current) => ({ ...current, title: event.target.value })),
            }),
          ),
          h('div', { className: 'trpg-grid-2' },
            h('div', { className: 'trpg-field' },
              h('label', { className: 'trpg-label' }, t('sourceLang')),
              h('select', { className: 'trpg-select', value: draft.sourceLang, onChange: (event) => setDraft((current) => ({ ...current, sourceLang: event.target.value })) },
                h('option', { value: 'de' }, 'Deutsch'),
                h('option', { value: 'pl' }, 'Polski'),
                h('option', { value: 'en' }, 'English'),
                h('option', { value: 'ja' }, '日本語'),
                h('option', { value: 'other' }, t('unknown')),
              ),
            ),
            h('div', { className: 'trpg-field' },
              h('label', { className: 'trpg-label' }, t('targetLang')),
              h('select', { className: 'trpg-select', value: draft.targetLang, onChange: (event) => setDraft((current) => ({ ...current, targetLang: event.target.value })) },
                h('option', { value: 'zh-CN' }, '简体中文'),
                h('option', { value: 'zh-TW' }, '繁體中文'),
                h('option', { value: 'de' }, 'Deutsch'),
                h('option', { value: 'pl' }, 'Polski'),
                h('option', { value: 'en' }, 'English'),
              ),
            ),
          ),
          h('div', { className: 'trpg-field' },
            h('div', { className: 'trpg-label' }, t('style')),
            h('div', { className: 'trpg-grid-3' },
              styleChoice(t, draft, setDraft, 'paper-archive', t('stylePaper'), '01'),
              styleChoice(t, draft, setDraft, 'noir-casino', t('styleNoir'), '02'),
              styleChoice(t, draft, setDraft, 'clean-rulebook', t('styleClean'), '03'),
            ),
          ),
          h('div', { className: 'trpg-alert info', style: { marginTop: 9 } }, t('tablePolicy')),
          h('div', { className: 'trpg-grid-2' },
            h('div', { className: 'trpg-field' },
              h('label', { className: 'trpg-label' }, t('font')),
              h('select', { className: 'trpg-select', value: draft.fontPair, onChange: (event) => setDraft((current) => ({ ...current, fontPair: event.target.value })) },
                h('option', { value: 'wps-safe' }, t('fontSafe')),
                h('option', { value: 'source-han' }, t('fontSource')),
              ),
            ),
            h('div', { className: 'trpg-field' },
              h('label', { className: 'trpg-label' }, t('wide')),
              h('select', { className: 'trpg-select', value: draft.wideTables, onChange: (event) => setDraft((current) => ({ ...current, wideTables: event.target.value })) },
                h('option', { value: 'auto' }, t('wideAuto')),
                h('option', { value: 'split' }, t('wideSplit')),
              ),
            ),
          ),
        ),

        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
          h('button', { type: 'button', className: 'trpg-btn primary', disabled: !draft.source || busy || (draft.glossaryMode === 'uploaded' && !draft.glossaryFile), onClick: create },
            busy ? t('creating') : t('create')),
          h('span', { className: 'trpg-meta' }, t('copyHint')),
        ),
        progress ? h('div', { className: 'trpg-progress', role: 'status', 'aria-label': progress.label },
          h('div', { style: { width: `${Math.max(2, Math.min(100, progress.value || 0))}%` } }),
        ) : null,
        progress ? h('div', { className: 'trpg-meta', style: { marginTop: 5 } }, progress.label) : null,
      );
    }

    function styleChoice(t, draft, setDraft, value, label, number) {
      return h('button', {
        type: 'button',
        'aria-pressed': draft.style === value,
        onClick: () => setDraft((current) => ({ ...current, style: value })),
        style: {
          textAlign: 'left',
          border: `1px solid ${draft.style === value ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)'}`,
          background: draft.style === value ? 'var(--dsw-alias-bg-layer-2)' : 'var(--dsw-alias-bg-layer-1)',
          borderRadius: 9,
          padding: '9px 10px',
          cursor: 'pointer',
          color: 'inherit',
          fontFamily: 'inherit',
        },
      },
        h('span', { style: { display: 'block', fontSize: 10, letterSpacing: '.12em', color: 'var(--dsw-alias-label-tertiary)' } }, number),
        h('span', { style: { display: 'block', fontSize: 12, fontWeight: 600, marginTop: 3 } }, label),
      );
    }

    function emptySheetDraft() {
      return { title: '', system: '', sourceLang: 'de', targetLang: 'zh-CN', notes: '', source: null };
    }

    function sheetStatusKey(status) {
      return {
        draft: 'sheetStatusDraft',
        ready: 'sheetStatusReady',
        review: 'sheetStatusReview',
        changes: 'sheetStatusChanges',
        done: 'sheetStatusDone',
        warning: 'sheetStatusWarning',
      }[status] || 'sheetStatusDraft';
    }

    function SheetStudioPage({ t, close }) {
      const [projects, setProjects] = useState([]);
      const [selectedId, setSelectedId] = useState(null);
      const [mode, setMode] = useState('welcome');
      const [draft, setDraft] = useState(emptySheetDraft());
      const [loading, setLoading] = useState(true);
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const [notice, setNotice] = useState('');
      const [showChange, setShowChange] = useState(false);
      const [changeNote, setChangeNote] = useState('');
      const [version, setVersion] = useState(FALLBACK_VERSION);
      const [root, setRoot] = useState('');
      const [trashOpen, setTrashOpen] = useState(false);
      const [pendingDelete, setPendingDelete] = useState(null);
      const sourceInput = useRef(null);
      const selected = projects.find((project) => project.id === selectedId) || (mode === 'project' ? projects[0] : null);

      const sheetApi = (path, options = {}) => api(path, options, SHEET_API);
      const sheetFile = (project, relative, download = false) => fileUrl(project, relative, download, SHEET_API);
      const load = useCallback(async (quiet = false) => {
        if (!quiet) setLoading(true);
        try {
          const [info, listing] = await Promise.all([sheetApi('/info'), sheetApi('/list', { method: 'POST', body: '{}' })]);
          setRoot(info.root || '');
          setVersion(info.version || FALLBACK_VERSION);
          const rows = Array.isArray(listing.projects) ? listing.projects : [];
          setProjects(rows);
          setSelectedId((previous) => (previous && rows.some((row) => row.id === previous) ? previous : rows[0]?.id || null));
          setMode((previous) => (previous === 'new' ? previous : rows.length ? 'project' : 'welcome'));
          setError('');
        } catch (cause) {
          if (!quiet) setError(cause.message || String(cause));
        } finally {
          if (!quiet) setLoading(false);
        }
      }, []);
      useEffect(() => {
        load();
        const timer = setInterval(() => {
          if (document.visibilityState === 'visible') load(true);
        }, 5000);
        return () => clearInterval(timer);
      }, [load]);

      const create = async () => {
        setBusy(true);
        setError('');
        try {
          const result = await sheetApi('/projects', {
            method: 'POST',
            body: JSON.stringify({
              title: draft.title,
              system: draft.system,
              sourceLang: draft.sourceLang,
              targetLang: draft.targetLang,
              notes: draft.notes,
            }),
          });
          if (draft.source) {
            await uploadFile(result.project.id, 'source', draft.source, () => {}, SHEET_API);
          }
          await sheetApi('/finalize', { method: 'POST', body: JSON.stringify({ projectId: result.project.id }) });
          setDraft(emptySheetDraft());
          setSelectedId(result.project.id);
          setMode('project');
          await load(true);
          setNotice(t('sheetCreated'));
        } catch (cause) {
          setError(cause.message || String(cause));
        } finally {
          setBusy(false);
        }
      };

      const approve = async (project) => {
        setBusy(true);
        setError('');
        try {
          await sheetApi('/action', { method: 'POST', body: JSON.stringify({ projectId: project.id, decision: 'approve', note: '' }) });
          await load(true);
          setNotice(t('sheetApproved'));
        } catch (cause) {
          setError(cause.message || String(cause));
        } finally {
          setBusy(false);
        }
      };

      const requestChanges = async (project) => {
        if (!changeNote.trim()) {
          setError(t('changeNeeded'));
          return;
        }
        setBusy(true);
        setError('');
        try {
          await sheetApi('/action', { method: 'POST', body: JSON.stringify({ projectId: project.id, decision: 'changes', note: changeNote.trim() }) });
          setShowChange(false);
          setChangeNote('');
          await load(true);
          setNotice(t('sheetChangesSent'));
        } catch (cause) {
          setError(cause.message || String(cause));
        } finally {
          setBusy(false);
        }
      };

      const copy = async (text) => {
        const ok = await copyText(text);
        if (ok) setNotice(t('copiedShort'));
        else setError(t('copyFailed'));
      };

      const removeProject = async () => {
        const project = pendingDelete;
        if (!project || busy) return;
        setBusy(true);
        setError('');
        try {
          await sheetApi('/delete', { method: 'POST', body: JSON.stringify({ projectId: project.id }) });
          setPendingDelete(null);
          setSelectedId(null);
          await load(true);
          setNotice(t('deletedToTrash'));
        } catch (cause) {
          setError(cause.message || String(cause));
        } finally {
          setBusy(false);
        }
      };

      const header = h('header', { className: 'trpg-header' },
        h('div', { className: 'trpg-brand' },
          h('div', { className: 'trpg-brand-mark' }, h(StudioMark, { size: 19 })),
          h('div', null,
            h('div', { className: 'trpg-title-line' },
              h('span', { className: 'trpg-title' }, t('sheetTitle')),
              h('span', { className: 'trpg-version' }, t('sheetBeta')),
              h('span', { className: 'trpg-version' }, `v${version}`),
              h('span', { className: 'trpg-credit' }, t('author')),
            ),
            h('div', { className: 'trpg-subtitle' }, t('sheetSubtitle')),
          ),
        ),
        h('div', { className: 'trpg-header-actions' },
          h('button', { type: 'button', className: 'trpg-btn ghost small', onClick: () => load(false) }, t('refresh')),
          h('button', { type: 'button', className: 'trpg-btn small', onClick: () => window.open(`${SHEET_API}/demo?name=sheet-demo.xlsx`, '_blank', 'noopener') }, t('sheetDemo')),
          h('button', { type: 'button', className: 'trpg-btn primary', onClick: () => { setDraft(emptySheetDraft()); setMode('new'); setError(''); } }, t('sheetNew')),
        ),
      );

      let main;
      if (loading && !projects.length) {
        main = h('div', { className: 'trpg-page' }, h('div', { className: 'trpg-skeleton' }), h('div', { className: 'trpg-skeleton' }));
      } else if (mode === 'new') {
        main = h('div', { className: 'trpg-page' },
          h('div', { className: 'trpg-card' },
            h('div', { className: 'trpg-card-title' }, t('sheetNew')),
            h('div', { className: 'trpg-field' },
              h('label', { className: 'trpg-label' }, t('titleLabel')),
              h('input', { className: 'trpg-input', value: draft.title, placeholder: t('sheetTitle'), onChange: (e) => setDraft((d) => ({ ...d, title: e.target.value })) }),
            ),
            h('div', { className: 'trpg-field' },
              h('label', { className: 'trpg-label' }, t('sheetSystem')),
              h('input', { className: 'trpg-input', value: draft.system, placeholder: t('sheetSystemHint'), onChange: (e) => setDraft((d) => ({ ...d, system: e.target.value })) }),
            ),
            h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
              h('div', { className: 'trpg-field', style: { flex: 1, minWidth: 150 } },
                h('label', { className: 'trpg-label' }, t('sheetSourceLang')),
                h('select', { className: 'trpg-input', value: draft.sourceLang, onChange: (e) => setDraft((d) => ({ ...d, sourceLang: e.target.value })) },
                  h('option', { value: 'de' }, t('sheetLangGerman')),
                  h('option', { value: 'pl' }, t('sheetLangPolish')),
                  h('option', { value: 'en' }, t('sheetLangEnglish')),
                  h('option', { value: 'zh-CN' }, t('sheetLangChinese')),
                ),
              ),
              h('div', { className: 'trpg-field', style: { flex: 1, minWidth: 150 } },
                h('label', { className: 'trpg-label' }, t('sheetTargetLang')),
                h('select', { className: 'trpg-input', value: draft.targetLang, onChange: (e) => setDraft((d) => ({ ...d, targetLang: e.target.value })) },
                  h('option', { value: 'zh-CN' }, t('sheetLangChinese')),
                  h('option', { value: 'de' }, t('sheetLangGerman')),
                  h('option', { value: 'pl' }, t('sheetLangPolish')),
                ),
              ),
            ),
            h('div', { className: 'trpg-field' },
              h('label', { className: 'trpg-label' }, t('sheetSource')),
              h('button', { type: 'button', className: 'trpg-btn wide', onClick: () => sourceInput.current?.click() }, draft.source ? `${draft.source.name} · ${formatBytes(draft.source.size)}` : t('sheetSourceHint')),
              h('input', { ref: sourceInput, type: 'file', className: 'trpg-sr', accept: '.pdf,.docx,.md,.txt,.csv,.xlsx', onChange: (e) => setDraft((d) => ({ ...d, source: e.target.files?.[0] || null })) }),
            ),
            h('div', { className: 'trpg-field' },
              h('label', { className: 'trpg-label' }, t('sheetNotes')),
              h('textarea', { className: 'trpg-textarea', rows: 5, value: draft.notes, placeholder: t('sheetNotesHint'), onChange: (e) => setDraft((d) => ({ ...d, notes: e.target.value })) }),
            ),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 12 } },
              h('button', { type: 'button', className: 'trpg-btn primary', disabled: busy || (!draft.source && !draft.notes.trim()), onClick: create }, busy ? t('creating') : t('sheetCreate')),
              h('button', { type: 'button', className: 'trpg-btn', onClick: () => setMode(projects.length ? 'project' : 'welcome') }, t('back')),
            ),
          ),
        );
      } else if (selected) {
        const status = selected.status;
        const files = selected.files || {};
        const workbook = sheetFile(selected, 'out/character-sheet.xlsx');
        main = h('div', { className: 'trpg-page' },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            h('div', null,
              h('div', { className: 'trpg-kicker' }, selected.system || t('sheetSystem')),
              h('h1', { style: { margin: 0, fontSize: 24 } }, selected.title),
              h('div', { style: { display: 'flex', gap: 8, marginTop: 7, flexWrap: 'wrap' } },
                h('span', { className: `trpg-badge ${status === 'done' ? 'success' : status === 'warning' ? 'danger' : 'warn'}` }, t(sheetStatusKey(status))),
                h('span', { className: 'trpg-meta' }, selected.source?.name || t('sheetNoSource')),
                selected.files?.pregens ? h('span', { className: 'trpg-meta' }, `${t('sheetPregens')}: ${selected.files.pregenCount}`) : null,
                selected.root ? h('span', { className: 'trpg-meta', title: selected.root },
                  root && String(selected.root).toLowerCase() !== String(root).toLowerCase()
                    ? `${t('projectElsewhere')} · ${selected.root}`
                    : selected.root) : null,
              ),
            ),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              selected.files?.workbook ? h('a', { className: 'trpg-btn small primary', href: workbook, target: '_blank', rel: 'noopener' }, t('sheetBase')) : null,
              selected.files?.pregens && selected.files?.pregenFiles?.length
                ? h('a', { className: 'trpg-btn small', href: sheetFile(selected, selected.files.pregenFiles[0]), target: '_blank', rel: 'noopener' }, `${t('sheetOpenPregens')} (${selected.files.pregenCount})`)
                : null,
              h('a', { className: 'trpg-btn small', href: sheetFile(selected, 'SHEET-TASK.md'), target: '_blank', rel: 'noopener' }, t('task')),
              h('button', { type: 'button', className: 'trpg-btn small danger', disabled: busy, onClick: () => setPendingDelete(selected) }, t('deleteProject')),
            ),
          ),
          h('section', { className: 'trpg-card', style: { marginTop: 16 } },
            h('div', { className: 'trpg-card-head' },
              h('div', { className: 'trpg-card-title' }, t('sheetQa')),
              h('span', { className: `trpg-badge ${files.qaOk ? 'success' : 'warn'}` }, files.qaOk ? 'ok' : t('notYet')),
            ),
            h('div', { className: 'trpg-summary' },
              h('div', null, h('span', null, t('sheetFormulas')), h('span', null, String(files.formulas || 0))),
              h('div', null, h('span', null, t('sheetNames')), h('span', null, String(files.namedRanges || 0))),
              h('div', null, h('span', null, t('sheetSteps')), h('span', null, String(files.steps || 0))),
            ),
            h('div', { style: { display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' } },
              h('button', { type: 'button', className: 'trpg-btn small', disabled: busy, onClick: () => copy(selected.prompts?.start || '') }, t('sheetCopy')),
              selected.status === 'review' ? h('button', { type: 'button', className: 'trpg-btn small primary', disabled: busy, onClick: () => approve(selected) }, t('sheetApprove')) : null,
              selected.status === 'review' ? h('button', { type: 'button', className: 'trpg-btn small', onClick: () => setShowChange(true) }, t('sheetChanges')) : null,
            ),
            selected.review?.decision ? h('div', { className: 'trpg-meta', style: { marginTop: 8 } }, `${selected.review.decision} · ${selected.review.note || ''}`) : null,
            showChange ? h('div', { style: { marginTop: 10 } },
              h('textarea', { className: 'trpg-textarea', rows: 3, value: changeNote, placeholder: t('sheetChangeNote'), onChange: (e) => setChangeNote(e.target.value) }),
              h('div', { style: { display: 'flex', gap: 7, marginTop: 8 } },
                h('button', { type: 'button', className: 'trpg-btn small', onClick: () => setShowChange(false) }, t('back')),
                h('button', { type: 'button', className: 'trpg-btn small primary', disabled: busy, onClick: () => requestChanges(selected) }, t('submitChanges')),
              ),
            ) : null,
          ),
          h('div', { className: 'trpg-meta', style: { marginTop: 12 } }, selected.notes || ''),
          error ? h('div', { className: 'trpg-alert', style: { marginTop: 12 } }, error) : null,
        );
      } else {
        main = h('div', { className: 'trpg-page' },
          h('h1', null, t('sheetTitle')),
          h('p', { className: 'trpg-meta' }, t('sheetSubtitle')),
          h('button', { type: 'button', className: 'trpg-btn primary', onClick: () => setMode('new') }, t('sheetNew')),
          h('img', { src: `${SHEET_API}/demo?name=sheet-demo-preview.png`, alt: t('sheetDemo'), style: { width: '100%', maxWidth: 760, marginTop: 14, border: '1px solid var(--dsw-alias-border-l2, #e5e5e5)', borderRadius: 10 } }),
          h('div', { className: 'trpg-meta', style: { marginTop: 10 } }, t('sheetEmpty')),
        );
      }

      return h('div', { className: 'trpg-root' },
        h('style', null, CSS),
        header,
        h('div', { className: 'trpg-body' },
          h('aside', { className: 'trpg-rail' },
            h('div', { className: 'trpg-rail-head' }, h('span', null, `${t('sheetProjects')} · ${projects.length}`),
              h('button', { type: 'button', className: 'trpg-btn ghost small', onClick: () => setTrashOpen(true), title: t('trash') },
                h(Icon, { size: 13 }, h('path', { d: 'M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13' })),
              ),
            ),
            projects.length ? h('div', { className: 'trpg-project-list' }, projects.map((project) => h('button', {
              key: `${project.root || ''}|${project.id}`, type: 'button', className: 'trpg-project-row', 'aria-current': selectedId === project.id ? 'true' : 'false',
              onClick: () => { setSelectedId(project.id); setMode('project'); },
            }, h('span', { className: 'trpg-project-name' }, project.title), h('span', { className: 'trpg-project-meta' },
              h('span', { className: `trpg-dot ${project.status}` }),
              h('span', null, t(sheetStatusKey(project.status))),
              root && project.root && String(project.root).toLowerCase() !== String(root).toLowerCase()
                ? h('span', { className: 'trpg-tag', title: project.root }, t('projectElsewhere'))
                : null,
            )))) : h('div', { className: 'trpg-empty' }, t('sheetEmpty')),
            root ? h('div', { className: 'trpg-rail-foot', title: root }, root) : null,
          ),
          h('main', { className: 'trpg-main' }, main),
        ),
        notice ? h('div', { className: 'trpg-toast' }, notice) : null,
        pendingDelete ? h(ConfirmDialog, {
          t,
          title: t('deleteConfirmTitle'),
          body: t('deleteConfirmBody'),
          confirmLabel: t('deleteConfirm'),
          busy,
          onConfirm: removeProject,
          onCancel: () => setPendingDelete(null),
        }) : null,
        trashOpen ? h(TrashDialog, {
          t,
          base: SHEET_API,
          kind: 'sheet',
          onClose: () => setTrashOpen(false),
          onChanged: () => load(true),
        }) : null,
      );
    }

    function emptyDraft() {
      return {
        title: '',
        source: null,
        glossaryMode: 'blank',
        glossaryFile: null,
        assets: [],
        sourceLang: 'en',
        targetLang: 'zh-CN',
        style: 'paper-archive',
        fontPair: 'wps-safe',
        wideTables: 'auto',
      };
    }

    function StudioIcon() {
      return h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('path', { d: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H12v17H6.5A2.5 2.5 0 0 1 4 17.5v-12Z', fill: 'currentColor', opacity: .9 }),
        h('path', { d: 'M20 5.5A2.5 2.5 0 0 0 17.5 3H12v17h5.5a2.5 2.5 0 0 0 2.5-2.5v-12Z', fill: 'currentColor', opacity: .5 }),
        h('path', { d: 'm18 3 2 2-2 2-2-2 2-2Z', fill: '#c7352a', stroke: 'none' }),
      );
    }

    function SheetIcon() {
      return h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' },
        h('rect', { x: 4, y: 3, width: 16, height: 18, rx: 2, stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', { d: 'M4 9h16M4 15h16M10 3v18', stroke: 'currentColor', strokeWidth: 1.4, opacity: .7 }),
      );
    }

    return {
      inject: ['slots', 'locale', 'layout'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, strings), 'trpg-studio: dictionaries');
        const t = ctx.locale.bind(NS);
        ctx.slots.inject('main', function* () {
          yield ctx.slots.register({
            name: 'main',
            key: 'trpg-studio',
            locale: NS,
            inject: () => ({
              t,
              close: () => ctx.layout.selectPanel(null),
            }),
          }, StudioPage);
        });
        ctx.slots.inject('main', function* () {
          yield ctx.slots.register({
            name: 'main',
            key: 'trpg-sheets',
            locale: NS,
            inject: () => ({
              t,
              close: () => ctx.layout.selectPanel(null),
            }),
          }, SheetStudioPage);
        });
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'trpg-studio',
          order: 12,
          label: () => t('panel'),
          locale: NS,
        }, StudioIcon));
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: 'trpg-sheets',
          order: 13,
          label: () => t('sheetPanel'),
          locale: NS,
        }, SheetIcon));
      },
    };
  },
});


/**
 * Single source of truth for project phases, artifacts, gates and next actions.
 * Keep this module pure: it receives project metadata and a files snapshot.
 */

export const WORKFLOW_VERSION = 3;

import { makeNext } from './actions.mjs';

export const PHASES = {
  draft: { label: '草稿', step: 0 },
  ready: { label: '待开工', step: 1 },
  pass1: { label: '待审核', step: 2 },
  changes: { label: '要修改', step: 2 },
  approved: { label: '已通过', step: 3 },
  batches: { label: '分批翻译/校对', step: 3 },
  build: { label: '待构建全篇', step: 4 },
  full: { label: '全篇交付中', step: 4 },
  done: { label: '已完成', step: 5 },
};

const PASS1_REQUIRED = [
  ['previewPdf', '预览页 PDF'],
  ['previewPng', '预览页 PNG'],
  ['hardPdf', '难页 PDF'],
  ['hardPng', '难页 PNG'],
  ['contact', '两页接触表'],
];

const PASS1_QA = [
  ['pass1PreviewQa', '预览页 QA（preview-qa.json）'],
  ['pass1HardQa', '难页 QA（hard-qa.json）'],
];

const FINAL_REQUIRED = [
  ['book', '全篇 PDF'],
  ['bookHtml', '全篇 HTML'],
  ['qa', '全篇 QA.json'],
  ['bookmarksReport', '书签报告 BOOKMARKS.json'],
  ['fullImageCheck', '全篇图片守卫'],
  ['tablePlan', '表格/原卡计划'],
  ['translationReport', '翻译与排版报告'],
  ['glossaryCsv', '术语表 CSV'],
  ['glossaryMd', '术语表 Markdown'],
  ['sourceCards', '原始卡索引'],
  ['pages', '页面 PNG 目录'],
];

function hasPass1(files) {
  return Boolean(files.previewPdf && files.previewPng && files.hardPdf && files.hardPng);
}

function pass1Issues(files) {
  const issues = [];
  const pass1Paths = {
    previewPdf: 'out/pass1/preview.pdf',
    previewPng: 'out/pass1/preview.png',
    hardPdf: 'out/pass1/hard.pdf',
    hardPng: 'out/pass1/hard.png',
    contact: 'out/pass1/contact-sheet.png',
  };
  for (const [key, label] of PASS1_REQUIRED) {
    if (!files[key]) issues.push({ code: `pass1-${key}`, message: `缺少${label}`, file: pass1Paths[key] });
  }
  for (const [key, label] of PASS1_QA) {
    const qa = files[key];
    if (!qa) issues.push({ code: `pass1-${key}`, message: `缺少${label}`, file: 'out/pass1/*-qa.json' });
    else if (qa.ok === false || Number(qa.type3 || 0) > 0) {
      issues.push({ code: `pass1-${key}-fail`, message: `${label} 未通过（Type3）`, file: 'out/pass1/*-qa.json' });
    }
  }
  if (!files.report) issues.push({ code: 'pass1-report', message: '缺少首轮 REPORT.md', file: 'out/pass1/REPORT.md' });
  if (!files.imageCheck) issues.push({ code: 'pass1-image-missing', message: '缺少图片守卫', file: 'out/pass1/IMAGE-CHECK.json' });
  else if (files.imageCheckOk === false) issues.push({ code: 'pass1-image-fail', message: '图片守卫未通过', file: 'out/pass1/IMAGE-CHECK.json' });
  if (!files.tablePlan) issues.push({ code: 'table-plan-missing', message: '缺少表格/原卡计划', file: 'out/TABLE-PLAN.json' });
  else if (files.tablePlanOk === false) issues.push({ code: 'table-plan-fail', message: '表格/原卡计划未通过', file: 'out/TABLE-PLAN.json' });
  return issues;
}

function finalIssues(files) {
  const issues = [];
  for (const [key, label] of FINAL_REQUIRED) {
    if (!files[key]) issues.push({ code: `final-${key}`, message: `缺少${label}`, file: key === 'book' ? 'out/book.pdf' : '' });
  }
  if (files.qa && (files.qa.ok === false || Number(files.qa.type3 || 0) > 0)) {
    issues.push({ code: 'final-qa-fail', message: '全篇 QA 未通过（字体/Type3）', file: 'out/QA.json' });
  }
  if (files.bookmarksReport && files.bookmarksReportOk === false) {
    issues.push({ code: 'final-bookmarks-fail', message: '书签报告未通过', file: 'out/BOOKMARKS.json' });
  }
  if (files.bookmarks === 0) {
    issues.push({ code: 'final-bookmarks-empty', message: '全篇 PDF 没有书签', file: 'out/book.pdf' });
  }
  if (files.fullImageCheck && files.fullImageCheckOk === false) {
    issues.push({ code: 'final-image-fail', message: '全篇图片守卫未通过', file: 'out/IMAGE-CHECK.json' });
  }
  if (files.translationReport && files.reportComplete === false) {
    issues.push({ code: 'final-report-placeholder', message: '报告仍有未填占位符', file: 'out/TRANSLATION-REPORT.md' });
  }
  return issues;
}

export function reviewGate(files) {
  return { ok: pass1Issues(files).length === 0, issues: pass1Issues(files) };
}

export function finalGate(files) {
  return { ok: finalIssues(files).length === 0, issues: finalIssues(files) };
}

export function deriveWorkflow(project, files) {
  const uploadedMissing = project.glossary?.mode === 'uploaded' && !project.glossary?.original;
  const pass1 = hasPass1(files);
  const approved = project.review?.decision === 'approve';
  const changes = project.review?.decision === 'changes';
  const book = Boolean(files.book);
  let phase = 'ready';
  if (!files.source || uploadedMissing) phase = 'draft';
  else if (changes) phase = 'changes';
  else if (approved) phase = book ? 'full' : 'approved';
  else if (book) phase = 'full';
  else if (pass1) phase = 'pass1';

  let issues = [];
  if (phase === 'pass1' || phase === 'changes' || phase === 'approved') issues = pass1Issues(files);
  if (phase === 'full' && approved) {
    issues = finalIssues(files);
    if (issues.length === 0) phase = 'done';
  }
  if (phase === 'full' && !approved) {
    issues = [{ code: 'book-before-approval', message: '全篇 PDF 已存在，但两页尚未审核通过', file: 'out/book.pdf' }];
  }
  if (phase !== 'draft' && files.taskVersion !== undefined && files.taskVersion < 8) {
    issues.push({ code: 'task-version', message: '任务书版本过旧，请刷新任务书', file: 'TASK.md' });
  }
  const progress = files.progress || null;
  const term = files.term || files.termQa || null;
  const proofed = Number(progress?.proofed ?? 0);
  const proofTotal = Number(progress?.proofTotal ?? 0);
  const batchesDone = Boolean(progress && progress.total && progress.translated >= progress.total
    && proofTotal > 0 && proofed >= proofTotal);
  if (term && term.ok === false) {
    issues.push({ code: 'term-gate', message: '术语表未覆盖/未使用中文', file: 'work/TERM-QA.json' });
  }
  if (progress && proofTotal > 0 && proofed < proofTotal) {
    issues.push({ code: 'proof-pending', message: `还有 ${proofTotal - proofed} 批未校对`, file: 'work/progress.json' });
  }
  if (phase === 'approved' && progress && batchesDone) phase = 'build';
  if (phase === 'approved' && progress && !batchesDone) phase = 'batches';

  const health = issues.length > 0 ? 'warning' : 'ok';
  let next = null;
  if (phase === 'draft') next = makeNext('upload', '补齐源文件或术语表');
  else if (phase === 'ready') next = makeNext('start', '复制开工指令');
  else if (phase === 'changes') next = makeNext('revise', '复制修改指令');
  else if (phase === 'pass1') next = issues.length ? makeNext('fix', '先补齐两页检查') : makeNext('review', '审核预览页与难页');
  else if (phase === 'approved') next = makeNext('auto', '开始全篇（自动分批 + 校对）');
  else if (phase === 'batches') {
    const current = progress?.batches?.find((item) => item.id === progress.current) || null;
    next = makeNext('auto', current ? `继续 ${current.id}（${current.proofed ? '已校对' : '待校对'}）` : '继续自动分批');
  } else if (phase === 'build') next = makeNext('build', '所有批次已校对，构建全篇');
  else if (phase === 'full') next = issues.length ? makeNext('fix', '补齐全篇交付') : makeNext('none', '已交付');

  const gates = [
    { id: 'source', status: files.source ? 'pass' : 'fail', issues: files.source ? [] : ['缺少源 PDF'] },
    { id: 'pass1', status: phase === 'draft' || phase === 'ready' ? 'pending' : (pass1Issues(files).length ? 'fail' : 'pass'), issues: pass1Issues(files).map((item) => item.message) },
    { id: 'term', status: term ? (term.ok ? 'pass' : 'fail') : 'pending', issues: term?.errors?.slice(0, 5) || [] },
    { id: 'proof', status: progress ? (proofed >= proofTotal && proofTotal > 0 ? 'pass' : 'fail') : 'pending', issues: progress && proofed < proofTotal ? [`未校对 ${proofTotal - proofed}/${proofTotal} 批`] : [] },
    { id: 'batch', status: progress ? (batchesDone ? 'pass' : 'pending') : 'pending', issues: progress && progress.current ? [`当前批次 ${progress.current}`] : [] },
    { id: 'final', status: phase === 'done' ? 'pass' : (phase === 'full' ? 'fail' : 'pending'), issues: finalIssues(files).map((item) => item.message) },
  ];

  const artifacts = {
    pass1: { required: PASS1_REQUIRED.map(([, label]) => label), missing: issues.filter((item) => item.code.startsWith('pass1') || item.code.startsWith('table-')).map((item) => item.message) },
    full: { required: FINAL_REQUIRED.map(([, label]) => label), missing: issues.filter((item) => item.code.startsWith('final-')).map((item) => item.message) },
  };
  return {
    version: WORKFLOW_VERSION,
    phase,
    step: PHASES[phase]?.step ?? 0,
    label: PHASES[phase]?.label || phase,
    health,
    issues,
    progress,
    gates,
    next: phase === 'done' ? null : next,
    artifacts,
  };
}

export function statusFromWorkflow(workflow) {
  return workflow.health === 'warning' ? 'warning' : workflow.phase;
}

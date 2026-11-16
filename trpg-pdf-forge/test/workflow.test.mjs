import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { deriveWorkflow, reviewGate } from '../server/workflow.mjs';

const source = { source: true, taskVersion: 9 };
const pass1 = {
  ...source,
  previewPdf: true, previewPng: true, hardPdf: true, hardPng: true, contact: true,
  pass1PreviewQa: { ok: true, type3: 0 }, pass1HardQa: { ok: true, type3: 0 },
  report: 'report', imageCheck: true, imageCheckOk: true,
  tablePlan: true, tablePlanOk: true,
};
const final = {
  ...pass1,
  book: true, bookHtml: true,
  qa: { ok: true, type3: 0, bookmarks: 2, pageMode: 'UseOutlines' },
  bookmarksReport: true, bookmarksReportOk: true, bookmarks: 2,
  fullImageCheck: true, fullImageCheckOk: true,
  translationReport: true, reportComplete: true,
  glossaryCsv: true, glossaryMd: true, sourceCards: true, pages: true,
};

test('workflow phases and next actions', () => {
  assert.equal(deriveWorkflow({}, { source: false }).phase, 'draft');
  assert.equal(deriveWorkflow({}, source).phase, 'ready');
  assert.equal(deriveWorkflow({}, pass1).phase, 'pass1');
  assert.equal(deriveWorkflow({ review: { decision: 'changes' } }, pass1).phase, 'changes');
  assert.equal(deriveWorkflow({ review: { decision: 'approve' } }, pass1).phase, 'approved');
  const full = deriveWorkflow({ review: { decision: 'approve' } }, {
    ...pass1, book: true, qa: { ok: true, type3: 0, bookmarks: 2 },
  });
  assert.equal(full.phase, 'full');
  assert.equal(full.health, 'warning');
  assert.equal(full.next.action, 'fix');
  const done = deriveWorkflow({ review: { decision: 'approve' } }, final);
  assert.equal(done.phase, 'done');
  assert.equal(done.health, 'ok');
  assert.equal(done.next, null);
});

test('final gate blocks done when bookmarks/report are missing', () => {
  const broken = { ...final, bookmarksReport: false, bookmarks: 0, reportComplete: false };
  const workflow = deriveWorkflow({ review: { decision: 'approve' } }, broken);
  assert.equal(workflow.phase, 'full');
  assert.equal(workflow.health, 'warning');
  assert.ok(workflow.issues.some((issue) => issue.code === 'final-bookmarks-empty'));
  assert.ok(workflow.issues.some((issue) => issue.code === 'final-report-placeholder'));
});

test('stale task version is surfaced for migration', () => {
  const workflow = deriveWorkflow({}, { ...pass1, taskVersion: 0 });
  assert.equal(workflow.health, 'warning');
  assert.ok(workflow.issues.some((issue) => issue.code === 'task-version'));
});

test('pass1 gate requires QA, report, image and table plan', () => {
  assert.equal(reviewGate(pass1).ok, true);
  const missing = { ...pass1, pass1PreviewQa: { ok: false, type3: 0 }, report: '', tablePlan: false };
  const gate = reviewGate(missing);
  assert.equal(gate.ok, false);
  assert.ok(gate.issues.some((issue) => issue.code.includes('pass1PreviewQa')));
  assert.ok(gate.issues.some((issue) => issue.code === 'pass1-report'));
  assert.ok(gate.issues.some((issue) => issue.code === 'table-plan-missing'));
});

test('approved projects advance through auto mode', () => {
  const approved = { review: { decision: 'approve' } };
  const noPlan = deriveWorkflow(approved, pass1);
  assert.equal(noPlan.next.promptKey, 'auto');
  assert.match(noPlan.next.detail, /自动分批/);
  const stale = deriveWorkflow(approved, { ...pass1, taskVersion: 0 });
  assert.equal(stale.next.promptKey, 'auto');
  assert.ok(stale.issues.some((issue) => issue.code === 'task-version'));
  const partial = {
    ...pass1,
    progress: {
      plan: true, total: 100, translated: 20, proofed: 0, proofTotal: 2, current: 'b03',
      batches: [{ id: 'b03', title: '第三章', pages: [41, 60], covered: 3, total: 20, status: 'partial', checked: false, proofed: false }],
    },
  };
  const batch = deriveWorkflow(approved, partial);
  assert.equal(batch.phase, 'batches');
  assert.equal(batch.next.promptKey, 'auto');
  assert.match(batch.next.detail, /b03/);
  const complete = { ...partial, progress: { ...partial.progress, translated: 100, proofed: 2, current: null } };
  const build = deriveWorkflow(approved, complete);
  assert.equal(build.phase, 'build');
  assert.equal(build.next.promptKey, 'build');
  assert.match(build.next.detail, /构建全篇/);
});

test('a translated but unproofed branch cannot build', () => {
  const approved = { review: { decision: 'approve' } };
  const workflow = deriveWorkflow(approved, {
    ...pass1,
    progress: {
      total: 100, translated: 100, proofed: 0, proofTotal: 2, current: null,
      batches: [{ id: 'b00', pages: [1, 50], proofed: false }, { id: 'b01', pages: [51, 100], proofed: false }],
    },
  });
  assert.equal(workflow.phase, 'batches');
  assert.ok(workflow.issues.some((issue) => issue.code === 'proof-pending'));
  assert.equal(workflow.gates.find((gate) => gate.id === 'proof').status, 'fail');
});

test('batch prompts stay scoped to the current batch', async () => {
  const { promptsFor } = await import('../server/prompt.mjs');
  const progress = {
    plan: true,
    total: 100,
    translated: 20,
    current: 'b03',
    batches: [{ id: 'b03', title: '第三章', pages: [41, 60], covered: 3, total: 20, status: 'partial' }],
  };
  const prompts = promptsFor({}, 'C:/tmp/project', 'approved', progress);
  assert.match(prompts.auto, /source-map\.py/);
  assert.match(prompts.auto, /batch-plan\.py plan/);
  assert.match(prompts.auto, /所有批次 status 都为 done/);
  assert.match(prompts.auto, /只处理 status != done/);
  assert.match(prompts.auto, /build-book\.py --all/);
  assert.match(prompts.auto, /不要每批等用户输入/);
  assert.match(prompts.auto, /PROOF-BRIEF/);
  assert.match(prompts.proof, /PROOF-BRIEF/);
  assert.ok(!prompts.auto.includes('354'));
  assert.ok(!prompts.auto.includes('1-120'));
  assert.match(prompts.batch, /work\/batches\/b03\/BRIEF\.md/);
  assert.match(prompts.batch, /41–60/);
  assert.match(prompts.plan, /batch-plan\.py/);
  assert.match(prompts.build, /build-book\.py --all/);
});

test('task briefs stay scoped to their phase', async () => {
  const { buildTask } = await import('../server/prompt.mjs');
  const dir = path.join('C:', 'tmp', 'trpg-task-test');
  const project = { title: '任务测试', source: { path: 'source/source.pdf' }, options: {} };
  const p1 = buildTask(project, dir, 'pass1');
  assert.match(p1, /TASK_VERSION: 9/);
  assert.match(p1, /preview-qa\.json/);
  assert.match(p1, /layout-check\.py/);
  assert.ok(!p1.includes('merge-pdf.py'));
  assert.ok(!p1.includes('TRANSLATION-REPORT.md'));
  assert.ok(!p1.includes('BOOKMARKS.json'));
  assert.ok(!p1.includes('全篇必须交付'));

  const full = buildTask(project, dir, 'full');
  assert.match(full, /FULL BOOK/);
  assert.match(full, /BOOKMARKS\.json/);
  assert.match(full, /TRANSLATION-REPORT\.md/);
  assert.match(full, /layout-check\.py/);
  assert.ok(!full.includes('render-pages.py out/pass1/preview.pdf'));

  const done = buildTask(project, dir, 'done');
  assert.match(done, /已交付/);
  assert.ok(!done.includes('复制全篇指令'));
});







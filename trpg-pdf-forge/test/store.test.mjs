import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';
import {
  createProject,
  finalizeProject,
  findProjectRoot,
  inspectFiles,
  listAllProjects,
  listProjects,
  saveUpload,
  statusOf,
  writeReview,
} from '../server/store.mjs';
import { exists, safeJoin } from '../server/util.mjs';

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-store-root-'));
  const assets = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-store-assets-'));
  await fs.writeFile(path.join(assets, 'INSTRUCTIONS.md'), '# instructions\n', 'utf8');
  await fs.writeFile(path.join(assets, 'STYLE.md'), '# style\n', 'utf8');
  return { root, assets };
}

async function upload(root, id, kind, name, bytes) {
  return saveUpload(root, id, kind, name, Readable.from([Buffer.from(bytes)]), 10 * 1024 * 1024);
}

test('creates a project with an empty glossary and a task brief', async () => {
  const { root, assets } = await fixture();
  try {
    const project = await createProject(root, assets, { title: '测试模组', glossaryMode: 'blank' });
    assert.equal(project.status, 'draft');
    assert.match(project.id, /^project-/);
    const csv = await fs.readFile(path.join(root, project.id, 'glossary', 'glossary.csv'), 'utf8');
    assert.ok(csv.startsWith('\uFEFFsource,target,category,notes,locked'));
    const task = await fs.readFile(path.join(root, project.id, 'TASK.md'), 'utf8');
    assert.match(task, /PASS 1 ONLY/);
    assert.match(task, /0 Type3/);
    assert.match(task, /TASK_VERSION: 10/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('finalize preserves a glossary the agent or user already filled', async () => {
  const { root, assets } = await fixture();
  try {
    const project = await createProject(root, assets, { title: '术语保留', glossaryMode: 'blank' });
    await upload(root, project.id, 'source', 'module.pdf', '%PDF-1.4\n%%EOF\n');
    const glossary = path.join(root, project.id, 'glossary', 'glossary.csv');
    const filled = '\uFEFFsource,target,category,notes,locked\nClock,钟,term,,1\n';
    await fs.writeFile(glossary, filled, 'utf8');
    await finalizeProject(root, project.id);
    assert.equal(await fs.readFile(glossary, 'utf8'), filled);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('uploads a PDF, finalizes, and reports ready', async () => {
  const { root, assets } = await fixture();
  try {
    const project = await createProject(root, assets, { title: '上传测试', glossaryMode: 'blank' });
    const uploaded = await upload(root, project.id, 'source', 'module.pdf', '%PDF-1.4\n%%EOF\n');
    assert.equal(uploaded.kind, 'source');
    assert.ok(uploaded.bytes > 0);
    const result = await finalizeProject(root, project.id);
    assert.equal(result.project.status, 'ready');
    const task = await fs.readFile(path.join(root, project.id, 'TASK.md'), 'utf8');
    assert.match(task, /source\\source\.pdf/);
    assert.match(task, /PASS 1 ONLY/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('rejects traversal and non-PDF uploads', async () => {
  const { root, assets } = await fixture();
  try {
    const project = await createProject(root, assets, { title: '安全测试' });
    await assert.rejects(
      () => upload(root, project.id, 'source', 'notes.txt', 'hello'),
      /PDF/,
    );
    assert.throws(() => safeJoin(root, project.id, '..', '..', 'outside.txt'), /项目目录/);
    const sanitized = await upload(root, project.id, 'source', '..\\evil.pdf', '%PDF-1.4\n%%EOF\n');
    assert.equal(sanitized.path, 'source/source.pdf');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('review gate requires the two pages and blocks Type3 approval', async () => {
  const { root, assets } = await fixture();
  try {
    const project = await createProject(root, assets, { title: '审核测试', titlePolicy: 'legacy' });
    await upload(root, project.id, 'source', 'module.pdf', '%PDF-1.4\n%%EOF\n');
    await finalizeProject(root, project.id);
    await assert.rejects(() => writeReview(root, project.id, 'approve'), /还不能通过/);
    const dir = path.join(root, project.id);
    for (const name of ['preview.pdf', 'preview.png', 'hard.pdf', 'hard.png', 'contact-sheet.png']) {
      await fs.writeFile(path.join(dir, 'out', 'pass1', name), 'x');
    }
    await fs.writeFile(path.join(dir, 'out', 'pass1', 'REPORT.md'), 'report', 'utf8');
    await fs.writeFile(path.join(dir, 'out', 'pass1', 'preview-qa.json'), JSON.stringify({ ok: true, type3: 2 }), 'utf8');
    await fs.writeFile(path.join(dir, 'out', 'pass1', 'hard-qa.json'), JSON.stringify({ ok: true, type3: 0 }), 'utf8');
    await fs.writeFile(path.join(dir, 'out', 'pass1', 'IMAGE-CHECK.json'), JSON.stringify({ ok: true, sourceImages: 1, targetImages: 1 }), 'utf8');
    await fs.writeFile(path.join(dir, 'out', 'TABLE-PLAN.json'), JSON.stringify({ ok: true, counts: { abstractOriginal: 0 } }), 'utf8');
    await assert.rejects(() => writeReview(root, project.id, 'approve'), /Type3/);
    await fs.writeFile(path.join(dir, 'out', 'pass1', 'preview-qa.json'), JSON.stringify({ ok: true, type3: 0 }), 'utf8');
    const approved = await writeReview(root, project.id, 'approve');
    assert.equal(approved.project.status, 'approved');
    const task = await fs.readFile(path.join(dir, 'TASK.md'), 'utf8');
    assert.match(task, /FULL BOOK/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('inspectFiles exposes the advisory layout summary', async () => {
  const { root, assets } = await fixture();
  try {
    const project = await createProject(root, assets, { title: '排版体检', glossaryMode: 'blank' });
    const dir = path.join(root, project.id);
    await fs.mkdir(path.join(dir, 'out', 'pass1'), { recursive: true });
    await fs.writeFile(path.join(dir, 'out', 'pass1', 'LAYOUT.json'), JSON.stringify({
      ok: false,
      summary: { strong: 2, mild: 3 },
      mergeGroups: [[1, 2]],
      pages: [
        { source: 'preview.pdf', page: 1, fill: 0.41, level: 'strong', reason: '页底大块空白' },
        { source: 'hard.pdf', page: 1, fill: 0.55, level: 'mild', reason: '偏空' },
      ],
    }), 'utf8');
    const files = await inspectFiles(dir);
    assert.equal(files.pass1LayoutOk, false);
    assert.equal(files.layoutStrong, 2);
    assert.equal(files.layoutMild, 3);
    assert.equal(files.layoutMergeGroups, 1);
    assert.equal(files.layoutPages.length, 2);
    assert.equal(files.layoutPages[0].page, 1);
    assert.equal(files.layoutPages[0].level, 'strong');
    assert.equal(files.fullLayoutStrong, 0);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('inspectFiles exposes batch progress and plan flag', async () => {
  const { root, assets } = await fixture();
  try {
    const project = await createProject(root, assets, { title: '批次进度', glossaryMode: 'blank' });
    const dir = path.join(root, project.id);
    await fs.mkdir(path.join(dir, 'work'), { recursive: true });
    await fs.writeFile(path.join(dir, 'work', 'batches.json'), JSON.stringify({
      totalSourcePages: 100,
      batches: [{ id: 'b00', pages: [1, 12] }, { id: 'b01', pages: [13, 24] }],
    }), 'utf8');
    await fs.writeFile(path.join(dir, 'work', 'progress.json'), JSON.stringify({
      total: 100, translated: 20, percent: 0.2, current: 'b01',
      batches: [
        { id: 'b00', total: 12, covered: 12, status: 'done', checked: true },
        { id: 'b01', total: 12, covered: 8, status: 'partial', checked: false },
      ],
    }), 'utf8');
    const files = await inspectFiles(dir);
    assert.equal(files.progress.total, 100);
    assert.equal(files.progress.translated, 20);
    assert.equal(files.progress.current, 'b01');
    assert.equal(files.progress.plan, true);
    assert.equal(files.progress.batchCount, 2);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('inspectFiles exposes terminology QA', async () => {
  const { root, assets } = await fixture();
  try {
    const project = await createProject(root, assets, { title: '术语检查', glossaryMode: 'blank' });
    const dir = path.join(root, project.id);
    await fs.mkdir(path.join(dir, 'work'), { recursive: true });
    await fs.writeFile(path.join(dir, 'work', 'TERM-QA.json'), JSON.stringify({
      ok: false,
      errors: ['p001.json: 术语未入表'],
      stats: { glossaryRows: 178, missingTerms: 12, termLists: 21 },
    }), 'utf8');
    const files = await inspectFiles(dir);
    assert.equal(files.termQa.ok, false);
    assert.equal(files.termQa.stats.missingTerms, 12);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('listProjects tolerates a missing root and findProjectRoot resolves the owner', async () => {
  const { root, assets } = await fixture();
  const missing = path.join(root, 'missing-root');
  try {
    assert.deepEqual(await listProjects(missing, assets), []);
    assert.equal(await exists(missing), false);
    const project = await createProject(root, assets, { title: '定位测试', glossaryMode: 'blank' });
    assert.equal(await findProjectRoot([missing, root], project.id), root);
    assert.equal(await findProjectRoot([missing], project.id), null);
    const aggregated = await listAllProjects([missing, root], assets);
    assert.equal(aggregated.length, 1);
    assert.equal(aggregated[0].root, root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('status is derived from files, review, and QA', async () => {
  const project = { review: { decision: null } };
  assert.equal(statusOf(project, { source: false }), 'draft');
  assert.equal(statusOf({ glossary: { mode: 'uploaded', original: null } }, { source: true }), 'draft');
  assert.equal(statusOf(project, { source: true }), 'ready');
  const pass1 = {
    source: true, previewPng: true, hardPng: true, previewPdf: true, hardPdf: true, contact: true,
    pass1PreviewQa: { ok: true, type3: 0 }, pass1HardQa: { ok: true, type3: 0 },
    report: 'report', imageCheck: true, imageCheckOk: true,
    tablePlan: true, tablePlanOk: true, taskVersion: 10,
  };
  assert.equal(statusOf(project, pass1), 'pass1');
  assert.equal(statusOf({ review: { decision: 'approve' } }, pass1), 'approved');
  assert.equal(statusOf({ review: { decision: 'approve' } }, { ...pass1, book: true, qa: { ok: true, type3: 0, bookmarks: 2 } }), 'warning');
  const done = {
    ...pass1,
    book: true, bookHtml: true,
    qa: { ok: true, type3: 0, bookmarks: 2, pageMode: 'UseOutlines' },
    bookmarksReport: true, bookmarksReportOk: true, bookmarks: 2,
    fullImageCheck: true, fullImageCheckOk: true,
    translationReport: true, reportComplete: true,
    glossaryCsv: true, glossaryMd: true, sourceCards: true, pages: true,
  };
  assert.equal(statusOf({ review: { decision: 'approve' } }, done), 'done');
  assert.equal(statusOf({ review: { decision: 'approve' } }, { ...done, bookmarksReport: false }), 'warning');
});







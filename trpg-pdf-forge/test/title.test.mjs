import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { deriveWorkflow } from '../server/workflow.mjs';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');
const titleCli = path.join(root, 'assets', 'title.py');
const nameCheck = path.join(root, 'assets', 'name-check.py');

function python(args, cwd) {
  return execFileSync(process.execPath, [runner, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function approvedFiles(progress) {
  return {
    source: true, taskVersion: 10,
    previewPdf: true, previewPng: true, hardPdf: true, hardPng: true, contact: true,
    pass1PreviewQa: { ok: true, type3: 0 }, pass1HardQa: { ok: true, type3: 0 },
    report: true, imageCheck: { ok: true }, tablePlan: { ok: true },
    progress,
  };
}

test('title gate waits for a verified book title on new projects', () => {
  const progress = {
    total: 10, translated: 10, proofed: 1, proofTotal: 1, current: null,
    batches: [{ id: 'b00', pages: [1, 10], proofed: true, checked: true }],
  };
  const pending = deriveWorkflow({ review: { decision: 'approve' }, titlePolicy: 'strict' }, approvedFiles(progress));
  assert.equal(pending.phase, 'title');
  assert.equal(pending.next.action, 'title');
  assert.equal(pending.gates.find((gate) => gate.id === 'title').status, 'fail');

  const verified = deriveWorkflow({ review: { decision: 'approve' }, titlePolicy: 'strict' }, {
    ...approvedFiles(progress),
    title: { status: 'verified', verifiedAfterRead: true, titleZh: '钟表天文台', titleOriginal: 'The Clockwork Observatory' },
    titleQa: { ok: true },
  });
  assert.equal(verified.phase, 'build');
  assert.equal(verified.next.action, 'build');
  assert.equal(verified.gates.find((gate) => gate.id === 'title').status, 'pass');
});

test('legacy projects are not blocked by an unverified title', () => {
  const progress = {
    total: 10, translated: 10, proofed: 1, proofTotal: 1, current: null,
    batches: [{ id: 'b00', pages: [1, 10], proofed: true, checked: true }],
  };
  const workflow = deriveWorkflow({ review: { decision: 'approve' }, titlePolicy: 'legacy' }, approvedFiles(progress));
  assert.equal(workflow.phase, 'build');
  assert.equal(workflow.next.action, 'build');
});

test('title.py validates TITLE.json and artifact propagation', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-title-'));
  try {
    await fs.mkdir(path.join(dir, 'work'), { recursive: true });
    await fs.mkdir(path.join(dir, 'glossary'), { recursive: true });
    await fs.mkdir(path.join(dir, 'book'), { recursive: true });
    await fs.mkdir(path.join(dir, 'out'), { recursive: true });
    await fs.writeFile(path.join(dir, 'glossary', 'glossary.csv'), 'source,target,category,notes,locked\nThe Clockwork Observatory,钟表天文台,title,书名,0\n', 'utf8');
    await fs.writeFile(path.join(dir, 'work', 'TITLE.json'), JSON.stringify({
      schemaVersion: 1,
      titleOriginal: 'The Clockwork Observatory',
      titleZh: '钟表天文台',
      literal: '发条天文台',
      aliases: ['The_Clockwork_Observatory-1'],
      sourcePages: [1, 2],
      contentEvidence: ['第 1 章', '终章'],
      rationale: '封面与目录一致，取钟表天文台。',
      status: 'verified',
      verifiedAfterRead: true,
      verifiedAt: new Date().toISOString(),
      reviewer: 'subagent',
      outputs: {},
    }), 'utf8');
    await fs.writeFile(path.join(dir, 'book', 'body.html'), '<title>钟表天文台</title><h1>钟表天文台</h1>', 'utf8');
    await fs.writeFile(path.join(dir, 'book', 'cover.html'), '<title>钟表天文台 · 封面</title>', 'utf8');
    await fs.writeFile(path.join(dir, 'out', 'TRANSLATION-REPORT.md'), '# 钟表天文台 翻译报告\n', 'utf8');
    const output = python([titleCli, 'check', '--root', dir], dir);
    assert.match(output, /OK：书名 钟表天文台/);
    const qa = JSON.parse(await fs.readFile(path.join(dir, 'work', 'TITLE-QA.json'), 'utf8'));
    assert.equal(qa.ok, true);

    await fs.writeFile(path.join(dir, 'glossary', 'glossary.csv'), [
      'source,target,category,notes,locked',
      'The Clockwork Observatory,钟表天文台,title,书名,0',
      'Captain Vega,维加船长,name,人物,0',
      'Captain Vega,维加舰长,name,人物,0',
    ].join('\n'), 'utf8');
    let conflict = false;
    try {
      python([nameCheck, '--root', dir], dir);
    } catch (error) {
      conflict = true;
      assert.equal(error.status, 1);
    }
    assert.equal(conflict, true);

    const title = JSON.parse(await fs.readFile(path.join(dir, 'work', 'TITLE.json'), 'utf8'));
    title.titleZh = 'The_Clockwork_Observatory-1';
    await fs.writeFile(path.join(dir, 'work', 'TITLE.json'), JSON.stringify(title), 'utf8');
    let failed = false;
    try {
      python([titleCli, 'check', '--root', dir], dir);
    } catch (error) {
      failed = true;
      assert.equal(error.status, 1);
    }
    assert.equal(failed, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

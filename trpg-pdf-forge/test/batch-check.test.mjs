import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');
const checker = path.join(root, 'assets', 'batch-check.py');

function python(args, cwd) {
  return execFileSync(process.execPath, [runner, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-batch-check-'));
  await fs.mkdir(path.join(dir, 'work', 'pages'), { recursive: true });
  await fs.mkdir(path.join(dir, 'assets', 'user'), { recursive: true });
  await fs.writeFile(path.join(dir, 'assets', 'user', 'x.png'), 'png', 'utf8');
  await fs.writeFile(path.join(dir, 'work', 'batches.json'), JSON.stringify({
    totalSourcePages: 4,
    batches: [
      { id: 'b00', title: '第一段', pages: [1, 2] },
      { id: 'b01', title: '第二段', pages: [3, 4] },
    ],
  }), 'utf8');
  await fs.writeFile(path.join(dir, 'work', 'pages', 'p1.json'), JSON.stringify({
    src: [1], col1: [{ type: 'p', text: '第一页' }],
  }), 'utf8');
  await fs.writeFile(path.join(dir, 'work', 'pages', 'p2.json'), JSON.stringify({
    src: [2], col1: [{ type: 'figure', src: 'assets/user/x.png', alt: 'x' }],
  }), 'utf8');
  return dir;
}

async function writeProof(dir, batchId = 'b00') {
  const plan = JSON.parse(await fs.readFile(path.join(dir, 'work', 'batches.json'), 'utf8'));
  const batch = plan.batches.find((item) => item.id === batchId);
  const [start, end] = batch.pages;
  const files = [];
  for (const name of (await fs.readdir(path.join(dir, 'work', 'pages'))).sort()) {
    if (!name.endsWith('.json')) continue;
    const spec = JSON.parse(await fs.readFile(path.join(dir, 'work', 'pages', name), 'utf8'));
    if ((spec.src || []).some((page) => page >= start && page <= end)) files.push(name);
  }
  const digest = crypto.createHash('sha256');
  for (const name of files) {
    digest.update(Buffer.from(name, 'utf8'));
    digest.update(Buffer.from([0]));
    digest.update(await fs.readFile(path.join(dir, 'work', 'pages', name)));
  }
  const target = path.join(dir, 'work', 'batches', batchId);
  await fs.mkdir(target, { recursive: true });
  await fs.writeFile(path.join(target, 'PROOF.json'), JSON.stringify({
    schemaVersion: 1,
    batch: batchId,
    sourcePages: [start, end],
    files,
    pageDigest: `sha256:${digest.digest('hex')}`,
    reviewer: 'self',
    reviewedAt: new Date().toISOString(),
    ok: true,
    checks: Object.fromEntries(['omissions', 'terms', 'names', 'numbers', 'tables', 'fluency', 'placeholders', 'layout'].map((key) => [key, true])),
    issues: [],
    fixed: [],
  }), 'utf8');
}

test('batch-check passes a complete batch and updates progress', async () => {
  const dir = await fixture();
  try {
    await writeProof(dir);
    python([checker, '--batch', 'b00', '--root', dir], dir);
    const check = JSON.parse(await fs.readFile(path.join(dir, 'work', 'batches', 'b00', 'CHECK.json'), 'utf8'));
    assert.equal(check.ok, true);
    assert.equal(check.covered, 2);
    const summary = JSON.parse(await fs.readFile(path.join(dir, 'work', 'batches', 'b00', 'CHECK-SUMMARY.json'), 'utf8'));
    assert.equal(summary.ok, true);
    assert.equal(summary.errorCount, 0);
    assert.deepEqual(summary.pages, [1, 2]);
    const progress = JSON.parse(await fs.readFile(path.join(dir, 'work', 'progress.json'), 'utf8'));
    assert.equal(progress.translated, 2);
    assert.equal(progress.current, 'b01');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('batch-check fails a page that only translated a small part of the source', async () => {
  const dir = await fixture();
  try {
    await fs.writeFile(path.join(dir, 'work', 'source-map.json'), JSON.stringify({
      pages: [{ page: 1, chars: 1000, title: 'Test Page' }],
    }), 'utf8');
    await fs.writeFile(path.join(dir, 'work', 'pages', 'p1.json'), JSON.stringify({
      src: [1], col1: [{ type: 'p', text: '只译了一句。' }],
    }), 'utf8');
    await writeProof(dir);
    let failed = false;
    try {
      python([checker, '--batch', 'b00', '--root', dir], dir);
    } catch (error) {
      failed = true;
      assert.equal(error.status, 1);
    }
    assert.equal(failed, true);
    const check = JSON.parse(await fs.readFile(path.join(dir, 'work', 'batches', 'b00', 'CHECK.json'), 'utf8'));
    assert.equal(check.ok, false);
    assert.ok(check.errors.some((item) => item.includes('疑似漏译')));

    await fs.writeFile(path.join(dir, 'work', 'pages', 'p1.json'), JSON.stringify({
      src: [1], abridged: true, col1: [{ type: 'p', text: '速查页，只保留要点。' }],
    }), 'utf8');
    await writeProof(dir);
    python([checker, '--batch', 'b00', '--root', dir], dir);
    const ok = JSON.parse(await fs.readFile(path.join(dir, 'work', 'batches', 'b00', 'CHECK.json'), 'utf8'));
    assert.equal(ok.ok, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('batch-check flags a whole English paragraph left untranslated', async () => {
  const dir = await fixture();
  try {
    await fs.writeFile(path.join(dir, 'work', 'source-map.json'), JSON.stringify({
      pages: [{ page: 1, chars: 1000, title: 'Test Page' }],
    }), 'utf8');
    await fs.writeFile(path.join(dir, 'work', 'pages', 'p1.json'), JSON.stringify({
      src: [1],
      col1: [{ type: 'p', text: 'The quick brown fox jumps over the lazy dog. This is a full English paragraph that should have been translated.' }],
    }), 'utf8');
    await writeProof(dir);
    let failed = false;
    try {
      python([checker, '--batch', 'b00', '--root', dir], dir);
    } catch (error) {
      failed = true;
      assert.equal(error.status, 1);
    }
    assert.equal(failed, true);
    const check = JSON.parse(await fs.readFile(path.join(dir, 'work', 'batches', 'b00', 'CHECK.json'), 'utf8'));
    assert.ok(check.errors.some((item) => item.includes('英文')));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('batch-check reports missing pages, missing images and placeholders', async () => {
  const dir = await fixture();
  try {
    await fs.rm(path.join(dir, 'work', 'pages', 'p2.json'));
    await fs.writeFile(path.join(dir, 'work', 'pages', 'p3.json'), JSON.stringify({
      src: [3], col1: [{ type: 'p', text: '【待补】' }, { type: 'figure', src: 'assets/user/missing.png' }],
    }), 'utf8');
    let failed = false;
    try {
      python([checker, '--batch', 'b00', '--root', dir], dir);
    } catch (error) {
      failed = true;
      assert.equal(error.status, 1);
    }
    assert.equal(failed, true);
    const check = JSON.parse(await fs.readFile(path.join(dir, 'work', 'batches', 'b00', 'CHECK.json'), 'utf8'));
    assert.equal(check.ok, false);
    assert.deepEqual(check.missing, [2]);
    await fs.rm(path.join(dir, 'work', 'pages', 'p3.json'));
    let second = false;
    try {
      python([checker, '--batch', 'b01', '--root', dir], dir);
    } catch (error) {
      second = true;
      assert.equal(error.status, 1);
    }
    assert.equal(second, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');
const contextReport = path.join(root, 'assets', 'context-report.py');
const splitBundle = path.join(root, 'assets', 'split-bundle.py');

function python(args, cwd) {
  return execFileSync(process.execPath, [runner, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

test('context report measures task, batch and summary files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-context-'));
  try {
    await fs.mkdir(path.join(dir, '.trpg'), { recursive: true });
    await fs.mkdir(path.join(dir, 'work', 'batches', 'b00'), { recursive: true });
    await fs.writeFile(path.join(dir, 'TASK.md'), 'x'.repeat(1000), 'utf8');
    await fs.writeFile(path.join(dir, '.trpg', 'STYLE-MINI.md'), 'y'.repeat(100), 'utf8');
    await fs.writeFile(path.join(dir, '.trpg', 'BATCH-PROTOCOL.md'), 'z'.repeat(200), 'utf8');
    await fs.writeFile(path.join(dir, '.trpg', 'PAGE-SCHEMA.md'), 's'.repeat(300), 'utf8');
    await fs.writeFile(path.join(dir, 'work', 'batches', 'b00', 'BRIEF.md'), 'b'.repeat(400), 'utf8');
    await fs.writeFile(path.join(dir, 'work', 'batches', 'b00', 'CHECK.json'), 'c'.repeat(800), 'utf8');
    await fs.writeFile(path.join(dir, 'work', 'batches', 'b00', 'CHECK-SUMMARY.json'), '{}', 'utf8');
    python([contextReport, '--root', dir], dir);
    const report = JSON.parse(await fs.readFile(path.join(dir, 'work', 'CONTEXT-BUDGET.json'), 'utf8'));
    assert.equal(report.files.task.chars, 1000);
    assert.equal(report.files.styleMini.chars, 100);
    assert.equal(report.batches[0].brief.chars, 400);
    assert.equal(report.batches[0].check.chars, 800);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('split bundle writes page JSON files and rejects missing src', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-bundle-'));
  try {
    const bundle = path.join(dir, 'work', 'b01-bundle.json');
    await fs.mkdir(path.dirname(bundle), { recursive: true });
    await fs.writeFile(bundle, JSON.stringify({
      pages: [
        { src: [1], col1: [{ type: 'p', text: '第一页' }] },
        { src: [2, 3], col1: [{ type: 'p', text: '第二页' }] },
      ],
    }), 'utf8');
    python([splitBundle, '--bundle', bundle, '--batch', 'b01', '--pages', path.join(dir, 'work', 'pages')], dir);
    const first = JSON.parse(await fs.readFile(path.join(dir, 'work', 'pages', 'b01-01.json'), 'utf8'));
    const second = JSON.parse(await fs.readFile(path.join(dir, 'work', 'pages', 'b01-02.json'), 'utf8'));
    assert.deepEqual(first.src, [1]);
    assert.deepEqual(second.src, [2, 3]);

    await fs.writeFile(bundle, JSON.stringify({ pages: [{ col1: [] }] }), 'utf8');
    let failed = false;
    try {
      python([splitBundle, '--bundle', bundle, '--batch', 'b02', '--pages', path.join(dir, 'work', 'pages')], dir);
    } catch (error) {
      failed = true;
      assert.equal(error.status, 2);
    }
    assert.equal(failed, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

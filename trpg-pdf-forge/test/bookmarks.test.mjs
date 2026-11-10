import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');
const merge = path.join(root, 'assets', 'merge-pdf.py');
const addBookmarks = path.join(root, 'assets', 'bookmarks.py');
const check = path.join(root, 'assets', 'check-pdf.py');
const preview = path.join(root, 'assets', 'demo', 'preview.pdf');
const hard = path.join(root, 'assets', 'demo', 'hard.pdf');

function python(args, cwd) {
  return execFileSync(process.execPath, [runner, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function outline(dir, sections = 1) {
  const file = path.join(dir, 'outline.json');
  await fs.writeFile(file, JSON.stringify({
    sections,
    items: [{ title: '难页：钟表室', level: 1, page: 1 }],
  }), 'utf8');
  return file;
}

test('merge adds cover-offset bookmarks and check-pdf sees UseOutlines', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-bookmarks-merge-'));
  try {
    const outlinePath = await outline(dir);
    const book = path.join(dir, 'book.pdf');
    const report = path.join(dir, 'BOOKMARKS.json');
    python([merge, preview, hard, book, '--outline', outlinePath, '--strict-outline', '--report', report], dir);
    const reportJson = JSON.parse(await fs.readFile(report, 'utf8'));
    assert.equal(reportJson.ok, true);
    assert.equal(reportJson.count, 2);
    assert.equal(reportJson.coverPages, 1);
    assert.equal(reportJson.bodyPages, 1);
    const qa = path.join(dir, 'QA.json');
    python([check, book, '--require-bookmarks', '--json', qa], dir);
    const data = JSON.parse(await fs.readFile(qa, 'utf8'));
    assert.equal(data.bookmarks, 2);
    assert.equal(data.bookmarkDepth, 1);
    assert.equal(data.pageMode, 'UseOutlines');
    assert.equal(data.type3, 0);
    assert.deepEqual(data.bookmarkItems.map((item) => item.page), [1, 2]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('standalone bookmarks.py adds an outline to one PDF', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-bookmarks-standalone-'));
  try {
    const outlinePath = await outline(dir);
    const out = path.join(dir, 'preview-bookmarked.pdf');
    const report = path.join(dir, 'BOOKMARKS.json');
    python([addBookmarks, preview, '--outline', outlinePath, '--out', out, '--report', report, '--strict-pages'], dir);
    const reportJson = JSON.parse(await fs.readFile(report, 'utf8'));
    assert.equal(reportJson.count, 1);
    assert.equal(reportJson.pageMode, 'UseOutlines');
    const qa = path.join(dir, 'QA.json');
    python([check, out, '--require-bookmarks', '--json', qa], dir);
    const data = JSON.parse(await fs.readFile(qa, 'utf8'));
    assert.equal(data.bookmarks, 1);
    assert.equal(data.pageMode, 'UseOutlines');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

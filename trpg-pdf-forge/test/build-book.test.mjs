import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');
const builder = path.join(root, 'assets', 'build-book.py');

function python(args, cwd) {
  return execFileSync(process.execPath, [runner, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-build-'));
  await fs.mkdir(path.join(dir, 'work', 'pages'), { recursive: true });
  await fs.mkdir(path.join(dir, 'book'), { recursive: true });
  await fs.mkdir(path.join(dir, '.trpg'), { recursive: true });
  await fs.writeFile(path.join(dir, '.trpg', 'theme.css'), 'body{color:#000}\n', 'utf8');
  const pages = {
    'a1.json': { src: [1], kind: 'opener', opener: { number: '1', title: '第一章', lede: '导语' }, col1: [{ type: 'p', text: '正文一' }] },
    'a2.json': { src: [2], kind: 'text', h2: '小节', col1: [{ type: 'table', head: ['A', 'B'], rows: [['1', '2']] }] },
    'a3.json': { kind: 'toc', perPage: 68 },
    'a4.json': { src: [3], kind: 'text', h2: '第三节', col1: [{ type: 'p', text: '正文三' }] },
  };
  for (const [name, value] of Object.entries(pages)) {
    await fs.writeFile(path.join(dir, 'work', 'pages', name), JSON.stringify(value), 'utf8');
  }
  await fs.writeFile(path.join(dir, 'work', 'page-index.json'), JSON.stringify({
    files: ['a1.json', 'a2.json', 'a3.json', 'a4.json'],
  }), 'utf8');
  await fs.writeFile(path.join(dir, 'work', 'batches.json'), JSON.stringify({
    totalSourcePages: 3,
    batches: [
      { id: 'b00', title: '第一段', pages: [1, 2] },
      { id: 'b01', title: '第二段', pages: [3, 3] },
    ],
  }), 'utf8');
  return dir;
}

test('build-book builds the full body with a TOC and respects page order', async () => {
  const dir = await fixture();
  try {
    python([builder, '--root', dir, '--all', '--out', 'book/body.html', '--title', '测试书'], dir);
    const html = await fs.readFile(path.join(dir, 'book', 'body.html'), 'utf8');
    assert.equal((html.match(/<section class="page/g) || []).length, 4);
    assert.match(html, /第一章/);
    assert.match(html, /toc-row/);
    assert.match(html, /\.\.\/\.trpg\/theme\.css/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('build-book --batch only emits that batch', async () => {
  const dir = await fixture();
  try {
    python([builder, '--root', dir, '--batch', 'b00', '--out', 'book/batches/b00.html'], dir);
    const html = await fs.readFile(path.join(dir, 'book', 'batches', 'b00.html'), 'utf8');
    assert.equal((html.match(/<section class="page/g) || []).length, 2);
    assert.match(html, /正文一/);
    assert.ok(!html.includes('正文三'));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('build-book rejects unknown blocks and placeholders', async () => {
  const dir = await fixture();
  try {
    await fs.writeFile(path.join(dir, 'work', 'pages', 'bad.json'), JSON.stringify({
      src: [4], col1: [{ type: 'unknown', text: 'x' }],
    }), 'utf8');
    let failed = false;
    try {
      python([builder, '--root', dir, '--check'], dir);
    } catch (error) {
      failed = true;
      assert.equal(error.status, 1);
    }
    assert.equal(failed, true);

    await fs.writeFile(path.join(dir, 'work', 'pages', 'bad.json'), JSON.stringify({
      src: [4], col1: [{ type: 'p', text: '【待补】' }],
    }), 'utf8');
    failed = false;
    try {
      python([builder, '--root', dir, '--check'], dir);
    } catch (error) {
      failed = true;
      assert.equal(error.status, 1);
    }
    assert.equal(failed, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');
const checker = path.join(root, 'assets', 'layout-check.py');

function python(args, cwd) {
  return execFileSync(process.execPath, [runner, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const SECTION = (attributes = '') => `<section class="page${attributes}">`;
const lines = (count, start = 80, step = 20) => Array.from({ length: count }, (_, index) => start + index * step);

async function buildFixture(dir) {
  const pages = [
    { lines: lines(3) },
    { lines: lines(10) },
    { lines: lines(38, 80, 18) },
    { lines: lines(12) },
    { lines: lines(10) },
    { lines: lines(10) },
    { lines: lines(6) },
  ];
  const spec = pages.map((page) => page.lines);
  const specPath = path.join(dir, 'pages.json');
  await fs.writeFile(specPath, JSON.stringify(spec), 'utf8');

  const generator = path.join(dir, 'make_pdf.py');
  await fs.writeFile(generator, [
    'import json, sys',
    'import pymupdf',
    'pages = json.load(open(sys.argv[1], encoding="utf-8"))',
    'doc = pymupdf.open()',
    'for rows in pages:',
    '    page = doc.new_page(width=595, height=842)',
    '    for y in rows:',
    '        page.insert_text((60, y), "The quick brown fox jumps over the lazy dog. " * 2, fontsize=9)',
    'doc.save(sys.argv[2])',
  ].join('\n'), 'utf8');
  const pdf = path.join(dir, 'book.pdf');
  python([generator, specPath, pdf], dir);

  const table = '<table><tr><td>1</td><td>2</td></tr></table>';
  const html = [
    '<!doctype html><html><body>',
    SECTION(), '<h1>书名</h1></section>',
    SECTION(), '<p>text</p></section>',
    SECTION(), '<p>text</p></section>',
    SECTION(), table, '</section>',
    SECTION(' data-layout="sparse"'), '<p>text</p></section>',
    SECTION(), '<p>text</p></section>',
    SECTION(' section-opener'), '<h1>章扉页</h1></section>',
    '</body></html>',
  ].join('\n');
  const htmlPath = path.join(dir, 'book.html');
  await fs.writeFile(htmlPath, html, 'utf8');
  return { pdf, html: htmlPath };
}

test('layout check classifies text, table, sparse, chapter-end and front matter pages', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-layout-'));
  try {
    const { pdf, html } = await buildFixture(dir);
    const out = path.join(dir, 'LAYOUT.json');
    python([checker, '--pdf', pdf, '--html', html, '--out', out], dir);
    const report = JSON.parse(await fs.readFile(out, 'utf8'));
    const page = (number) => report.pages.find((item) => item.page === number);

    assert.equal(report.ok, false);
    assert.equal(report.summary.strong, 1);
    assert.equal(page(1).level, 'context');
    assert.equal(page(2).level, 'strong');
    assert.equal(page(3).level, 'ok');
    assert.equal(page(4).level, 'context');
    assert.equal(page(5).level, 'exempt');
    assert.equal(page(6).level, 'context');
    assert.equal(page(7).level, 'exempt');
    assert.ok(page(2).fill < page(3).fill);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('layout check always exits zero unless --strict is requested', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-layout-exit-'));
  try {
    const { pdf, html } = await buildFixture(dir);
    const out = path.join(dir, 'LAYOUT.json');
    python([checker, '--pdf', pdf, '--html', html, '--out', out], dir);
    let failed = false;
    try {
      python([checker, '--pdf', pdf, '--html', html, '--out', out, '--strict'], dir);
    } catch (error) {
      failed = true;
      assert.equal(error.status, 1);
    }
    assert.equal(failed, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('layout check still measures pages when no HTML context is supplied', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-layout-mismatch-'));
  try {
    const { pdf } = await buildFixture(dir);
    const out = path.join(dir, 'LAYOUT.json');
    python([checker, '--pdf', pdf, '--out', out], dir);
    const report = JSON.parse(await fs.readFile(out, 'utf8'));
    assert.equal(report.pages.length, 7);
    assert.ok(report.files[0].warning === null);
    assert.ok(report.summary.pages === 7);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');
const sourceMap = path.join(root, 'assets', 'source-map.py');

const MAKE_PDF = `
import pymupdf, sys
doc = pymupdf.open()
p = doc.new_page(width=300, height=400)
p.insert_text((40, 40), 'Hello table page', fontsize=12)
for x in (50, 150, 250):
    p.draw_line((x, 100), (x, 220))
for y in (100, 140, 180, 220):
    p.draw_line((50, y), (250, y))
for i, (x, y) in enumerate([(60, 125), (160, 125), (60, 165), (160, 165)]):
    p.insert_text((x, y), 'cell%d' % i, fontsize=8)
p2 = doc.new_page(width=300, height=400)
pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 300, 400), False)
pix.set_rect(pix.irect, (200, 30, 30))
p2.insert_image(p2.rect, pixmap=pix)
p3 = doc.new_page(width=300, height=400)
p3.insert_text((40, 40), 'only text', fontsize=12)
doc.save(sys.argv[1])
`;

function python(args, cwd) {
  return execFileSync(process.execPath, [runner, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-source-map-'));
  python(['-c', MAKE_PDF, path.join(dir, 'sample.pdf')], dir);
  return dir;
}

test('source-map detects a table, a page scan and page kinds', async () => {
  const dir = await fixture();
  try {
    python([sourceMap, '--pdf', 'sample.pdf', '--out', 'work/source-map.json', '--workers', '1', '--tables', 'all'], dir);
    const map = JSON.parse(await fs.readFile(path.join(dir, 'work', 'source-map.json'), 'utf8'));
    assert.equal(map.survey.complete, true);
    assert.equal(map.survey.pages, 3);
    assert.ok(map.tableCandidates.some((item) => item.page === 1 && item.rows >= 2));
    assert.ok(map.images.some((item) => item.page === 2 && item.kind === 'page-scan'));
    const pages = new Map(map.pages.map((page) => [page.page, page]));
    assert.equal(pages.get(1).kind, 'table');
    assert.equal(pages.get(2).kind, 'scan');
    assert.equal(pages.get(2).scan, true);
    assert.equal(pages.get(3).kind, 'text');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('source-map --merge preserves manual audit fields', async () => {
  const dir = await fixture();
  try {
    python([sourceMap, '--pdf', 'sample.pdf', '--out', 'work/source-map.json', '--workers', '1', '--tables', 'all'], dir);
    const file = path.join(dir, 'work', 'source-map.json');
    const map = JSON.parse(await fs.readFile(file, 'utf8'));
    map.pages = map.pages.map((page) => (page.page === 1
      ? { ...page, title: '手工标题', blocks: [{ type: 'h2', text: '手工块' }] }
      : page));
    map.tableCandidates = [{ page: 1, kind: 'manual-table', rows: 2, columns: ['A', 'B'] }];
    map.images = [{ page: 2, file: 'work/images/manual.png', kind: 'page-scan' }];
    await fs.writeFile(file, JSON.stringify(map), 'utf8');
    python([sourceMap, '--pdf', 'sample.pdf', '--out', 'work/source-map.json', '--workers', '1', '--tables', 'all', '--merge'], dir);
    const merged = JSON.parse(await fs.readFile(file, 'utf8'));
    const page1 = merged.pages.find((page) => page.page === 1);
    assert.equal(page1.title, '手工标题');
    assert.deepEqual(page1.blocks, [{ type: 'h2', text: '手工块' }]);
    assert.ok(merged.tableCandidates.some((item) => item.kind === 'manual-table'));
    assert.ok(merged.images.some((item) => item.file === 'work/images/manual.png'));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('partial scan is not marked complete', async () => {
  const dir = await fixture();
  try {
    python([sourceMap, '--pdf', 'sample.pdf', '--pages', '1-1', '--out', 'work/source-map.json', '--workers', '1', '--tables', 'all'], dir);
    const map = JSON.parse(await fs.readFile(path.join(dir, 'work', 'source-map.json'), 'utf8'));
    assert.equal(map.survey.complete, false);
    assert.equal(map.survey.pages, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});


import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');
const planner = path.join(root, 'assets', 'batch-plan.py');

function python(args, cwd) {
  return execFileSync(process.execPath, [runner, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-batch-'));
  const pages = path.join(dir, 'work', 'pages');
  await fs.mkdir(pages, { recursive: true });
  await fs.writeFile(path.join(dir, 'toc.json'), JSON.stringify([
    [1, 'Chapter One', 1],
    [2, 'Section A', 1],
    [2, 'Section B', 40],
    [1, 'Chapter Two', 50],
    [2, 'Section C', 50],
    [1, 'Chapter Three', 100],
  ]), 'utf8');
  await fs.mkdir(path.join(dir, 'work'), { recursive: true });
  await fs.writeFile(path.join(dir, 'work', 'source-map.json'), JSON.stringify({
    pages: Array.from({ length: 120 }, (_, index) => ({ page: index + 1, title: '' })),
    tableCandidates: [{ page: 10, kind: 'table', rows: 3, columns: 2 }],
    images: [{ page: 11, file: 'assets/user/x.png', note: '' }],
  }), 'utf8');
  for (let page = 1; page <= 20; page += 1) {
    await fs.writeFile(path.join(pages, `p${String(page).padStart(3, '0')}.json`), JSON.stringify({
      src: [page],
      kind: page === 1 ? 'opener' : 'text',
      opener: page === 1 ? { title: 'Chapter One' } : undefined,
      col1: [{ type: 'p', text: `第 ${page} 页` }],
    }), 'utf8');
  }
  return { dir, pages };
}

test('batch plan covers every page within max size and tracks progress', async () => {
  const { dir } = await fixture();
  try {
    python([planner, 'plan', '--toc-json', 'toc.json', '--source-map', 'work/source-map.json',
      '--pages', 'work/pages', '--out', 'work/batches.json', '--progress', 'work/progress.json',
      '--total-pages', '120', '--max-pages', '12'], dir);
    const plan = JSON.parse(await fs.readFile(path.join(dir, 'work', 'batches.json'), 'utf8'));
    const progress = JSON.parse(await fs.readFile(path.join(dir, 'work', 'progress.json'), 'utf8'));
    assert.equal(plan.totalSourcePages, 120);
    const covered = new Set();
    for (const batch of plan.batches) {
      const [start, end] = batch.pages;
      assert.ok(end - start + 1 <= 16, `batch ${batch.id} too large`);
      for (let page = start; page <= end; page += 1) {
        assert.ok(!covered.has(page), `page ${page} covered twice`);
        covered.add(page);
      }
    }
    assert.equal(covered.size, 120);
    assert.equal(plan.batches[0].id, 'b00');
    assert.equal(progress.total, 120);
    assert.equal(progress.translated, 20);
    assert.equal(progress.current, 'b00');
    assert.equal(progress.batches[0].status, 'partial');
    assert.equal(progress.batches[0].checked, false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('batch plan falls back to fixed ranges without a TOC', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-batch-fallback-'));
  try {
    python([planner, 'plan', '--pages', 'work/pages', '--out', 'work/batches.json',
      '--progress', 'work/progress.json', '--total-pages', '30', '--max-pages', '10'], dir);
    const plan = JSON.parse(await fs.readFile(path.join(dir, 'work', 'batches.json'), 'utf8'));
    assert.equal(plan.batches.length, 3);
    assert.deepEqual(plan.batches.map((batch) => batch.pages), [[1, 10], [11, 20], [21, 30]]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('batch brief lists source pages, tables and commands', async () => {
  const { dir } = await fixture();
  try {
    python([planner, 'plan', '--toc-json', 'toc.json', '--source-map', 'work/source-map.json',
      '--pages', 'work/pages', '--out', 'work/batches.json', '--progress', 'work/progress.json',
      '--total-pages', '120', '--max-pages', '12'], dir);
    python([planner, 'brief', 'b00', '--root', dir], dir);
    const brief = await fs.readFile(path.join(dir, 'work', 'batches', 'b00', 'BRIEF.md'), 'utf8');
    assert.match(brief, /源页：1–12/);
    assert.match(brief, /render-pages\.py/);
    assert.match(brief, /build-book\.py/);
    assert.match(brief, /batch-check\.py/);
    assert.match(brief, /table/);
    assert.match(brief, /PROOF-BRIEF\.md/);
    const proofBrief = await fs.readFile(path.join(dir, 'work', 'batches', 'b00', 'PROOF-BRIEF.md'), 'utf8');
    assert.match(proofBrief, /proof\.py init/);
    assert.match(proofBrief, /omissions/);
    assert.match(brief, /结构清单：未全量审计/);
    assert.match(brief, /表格候选（未审计）/);

    const mapPath = path.join(dir, 'work', 'source-map.json');
    const map = JSON.parse(await fs.readFile(mapPath, 'utf8'));
    map.survey = { complete: true, pages: 120, auditedPages: Array.from({ length: 120 }, (_, i) => i + 1) };
    await fs.writeFile(mapPath, JSON.stringify(map), 'utf8');
    python([planner, 'brief', 'b00', '--root', dir], dir);
    const trusted = await fs.readFile(path.join(dir, 'work', 'batches', 'b00', 'BRIEF.md'), 'utf8');
    assert.match(trusted, /结构清单：全量已审计/);
    assert.match(trusted, /## 表格候选\r?\n/);
    assert.ok(!trusted.includes('表格候选（未审计）'));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});


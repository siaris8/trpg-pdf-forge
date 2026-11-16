import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');
const checker = path.join(root, 'assets', 'term-check.py');

function python(args, cwd) {
  return execFileSync(process.execPath, [runner, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-term-'));
  await fs.mkdir(path.join(dir, 'work', 'pages'), { recursive: true });
  await fs.mkdir(path.join(dir, 'glossary'), { recursive: true });
  await fs.writeFile(path.join(dir, 'glossary', 'glossary.csv'), [
    'source,target,category,notes,locked',
    'Example Archetype,示例原型,archetype,auto,0',
    'Bag Full of Guns,成袋枪械,schtick,auto,0',
    'Bank Shot,跳弹射击,schtick,auto,0',
  ].join('\n'), 'utf8');
  return dir;
}

async function writePage(dir, value) {
  await fs.writeFile(path.join(dir, 'work', 'pages', 'p001-01.json'), JSON.stringify(value), 'utf8');
}

test('term-check rejects an English schtick list, a footnote and a name mismatch', async () => {
  const dir = await fixture();
  try {
    await writePage(dir, {
      src: [1],
      kind: 'opener',
      opener: { en: 'EXAMPLE ARCHETYPE', title: '错误译名' },
      col1: [{ type: 'footnote', text: '特技与道途条目沿用原书英文名，中文译名见后文。' }],
      col2: [{
        type: 'display',
        text: '**枪械特技**（有前置的须已满足）：Bag Full of Guns I–IV、Bank Shot、Covering Fire、Wild Grenade。',
      }],
    });
    let failed = false;
    try {
      python([checker, '--root', dir, '--glossary', 'glossary/glossary.csv'], dir);
    } catch (error) {
      failed = true;
      assert.equal(error.status, 1);
    }
    assert.equal(failed, true);
    const qa = JSON.parse(await fs.readFile(path.join(dir, 'work', 'TERM-QA.json'), 'utf8'));
    assert.equal(qa.ok, false);
    assert.ok(qa.errors.some((item) => item.includes('沿用原书英文名')));
    assert.ok(qa.errors.some((item) => item.includes('术语列表仍用源语言/拉丁文')));
    assert.ok(qa.errors.some((item) => item.includes('原型名')));
    assert.ok(qa.missing.length > 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('term-check passes a Chinese term list without an English-name footnote', async () => {
  const dir = await fixture();
  try {
    await writePage(dir, {
      src: [1],
      kind: 'opener',
      opener: { en: 'EXAMPLE ARCHETYPE', title: '示例原型' },
      col2: [{
        type: 'display',
        text: '**枪械特技**（有前置的须已满足）：成袋枪械、跳弹射击、掩护射击、野性手雷。',
      }],
    });
    python([checker, '--root', dir, '--glossary', 'glossary/glossary.csv'], dir);
    const qa = JSON.parse(await fs.readFile(path.join(dir, 'work', 'TERM-QA.json'), 'utf8'));
    assert.equal(qa.ok, true);
    assert.deepEqual(qa.errors, []);
    assert.equal(qa.missing.length, 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('term-extract writes missing terms as CSV candidates', async () => {
  const dir = await fixture();
  try {
    await writePage(dir, {
      src: [1],
      kind: 'opener',
      opener: { en: 'EXAMPLE ARCHETYPE', title: '示例原型' },
      col2: [{
        type: 'display',
        text: '**枪械特技**：Covering Fire、Wild Grenade、Covering Fire II、Lone Wolf。',
      }],
    });
    python([path.join(root, 'assets', 'term-extract.py'), '--root', dir,
      '--glossary', 'glossary/glossary.csv', '--out', 'work/term-candidates.csv'], dir);
    const csv = await fs.readFile(path.join(dir, 'work', 'term-candidates.csv'), 'utf8');
    assert.match(csv, /Covering Fire/);
    assert.match(csv, /Wild Grenade/);
    assert.match(csv, /Lone Wolf/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});


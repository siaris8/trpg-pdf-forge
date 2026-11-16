import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');
const pregens = path.join(root, 'assets', 'pregens.py');
const checker = path.join(root, 'assets', 'sheet-check.py');
const extractor = path.join(root, 'assets', 'sheet-extract.py');

function python(args, cwd) {
  return execFileSync(process.execPath, [runner, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function card(index, kind = 'pregen-pc') {
  return {
    id: `pregen-${String(index).padStart(2, '0')}`,
    kind,
    name: `预设角色${index}`,
    nameOriginal: `Uhrenwächter ${index}`,
    archetype: '守卫',
    sourcePages: [index + 10],
    attributes: [['强横', 3], ['战术', 2]],
    skills: [['侦查', 3]],
    weapons: [['左轮', '2d6']],
    resources: [['HP', 10, 12]],
    abilities: ['时间回响'],
    gear: [],
    missing: [],
  };
}

async function fixture(cards) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-pregens-'));
  await fs.mkdir(path.join(dir, 'work'), { recursive: true });
  await fs.mkdir(path.join(dir, 'out'), { recursive: true });
  await fs.writeFile(path.join(dir, 'work', 'pregens.json'), JSON.stringify({ schemaVersion: 1, pregens: cards }), 'utf8');
  return dir;
}

test('pregens build a single workbook and pass the pregen gate', async () => {
  const dir = await fixture([card(1), card(2, 'npc')]);
  try {
    python([pregens, 'build', '--data', path.join(dir, 'work', 'pregens.json'), '--out', path.join(dir, 'out', 'pregens.xlsx'), '--summary', path.join(dir, 'out', 'PREGEN-QA.json')], dir);
    const output = python([checker, '--mode', 'pregens', '--root', dir, '--json', path.join(dir, 'out', 'SHEET-QA.json')], dir);
    assert.match(output, /预设卡 2 张/);
    const qa = JSON.parse(await fs.readFile(path.join(dir, 'out', 'SHEET-QA.json'), 'utf8'));
    assert.equal(qa.ok, true);
    assert.equal(qa.count, 2);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('more than eight pregens switch to separate files and an index', async () => {
  const dir = await fixture(Array.from({ length: 9 }, (_, index) => card(index + 1)));
  try {
    python([pregens, 'build', '--data', path.join(dir, 'work', 'pregens.json'), '--out', path.join(dir, 'out', 'pregens.xlsx'), '--summary', path.join(dir, 'out', 'PREGEN-QA.json')], dir);
    const summary = JSON.parse(await fs.readFile(path.join(dir, 'out', 'PREGEN-QA.json'), 'utf8'));
    assert.equal(summary.mode, 'multiple');
    assert.equal(summary.files.length, 10);
    const output = python([checker, '--mode', 'pregens', '--root', dir], dir);
    assert.match(output, /预设卡 9 张/);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('mode all checks the base sheet and pregens together', async () => {
  const dir = await fixture([card(1)]);
  try {
    await fs.copyFile(path.join(root, 'assets', 'sheet-demo.xlsx'), path.join(dir, 'out', 'character-sheet.xlsx'));
    await fs.copyFile(path.join(root, 'assets', 'sheet-demo-plan.json'), path.join(dir, 'work', 'sheet-plan.json'));
    python([pregens, 'build', '--data', path.join(dir, 'work', 'pregens.json'), '--out', path.join(dir, 'out', 'pregens.xlsx'), '--summary', path.join(dir, 'out', 'PREGEN-QA.json')], dir);
    python([checker, path.join(dir, 'out', 'character-sheet.xlsx'), '--mode', 'all', '--root', dir, '--plan', path.join(dir, 'work', 'sheet-plan.json'), '--json', path.join(dir, 'out', 'SHEET-QA.json')], dir);
    const qa = JSON.parse(await fs.readFile(path.join(dir, 'out', 'SHEET-QA.json'), 'utf8'));
    assert.equal(qa.ok, true);
    assert.equal(qa.base.ok, true);
    assert.equal(qa.pregens.count, 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('Polish source extraction detects pregen sections', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-polish-'));
  try {
    const brief = path.join(dir, 'source.md');
    await fs.writeFile(brief, '# Szybki start\n\n## Gotowe postacie\n\nStrażnik — ą ć ę ł ń ó ś ź ż\n', 'utf8');
    python([extractor, brief, '--out', path.join(dir, 'work', 'source.txt'), '--json', path.join(dir, 'work', 'source.json'), '--lang', 'pl'], dir);
    const source = JSON.parse(await fs.readFile(path.join(dir, 'work', 'source.json'), 'utf8'));
    assert.equal(source.lang, 'pl');
    assert.ok(source.text.includes('ą ć ę ł ń ó ś ź ż'));
    python([pregens, 'detect', '--source', path.join(dir, 'work', 'source.json'), '--out', path.join(dir, 'work', 'pregen-candidates.json'), '--lang', 'pl'], dir);
    const candidates = JSON.parse(await fs.readFile(path.join(dir, 'work', 'pregen-candidates.json'), 'utf8'));
    assert.ok(candidates.candidates.length >= 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('German source extraction preserves umlauts and detects pregen sections', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-german-'));
  try {
    const brief = path.join(dir, 'source.md');
    await fs.writeFile(brief, '# Schnellstart\n\n## Vorgefertigte Charaktere\n\nUhrenwächter — ä ö ü ß\n\n## Regeln\n\nDer Wächter schützt die Straße.\n', 'utf8');
    python([extractor, brief, '--out', path.join(dir, 'work', 'source.txt'), '--json', path.join(dir, 'work', 'source.json'), '--lang', 'de'], dir);
    const source = JSON.parse(await fs.readFile(path.join(dir, 'work', 'source.json'), 'utf8'));
    assert.equal(source.lang, 'de');
    assert.ok(source.text.includes('ä ö ü ß'));
    assert.ok(source.sections.some((section) => section.title.includes('Vorgefertigte Charaktere')));
    python([pregens, 'detect', '--source', path.join(dir, 'work', 'source.json'), '--out', path.join(dir, 'work', 'pregen-candidates.json'), '--lang', 'de'], dir);
    const candidates = JSON.parse(await fs.readFile(path.join(dir, 'work', 'pregen-candidates.json'), 'utf8'));
    assert.ok(candidates.candidates.length >= 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

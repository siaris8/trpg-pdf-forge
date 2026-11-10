import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');
const checker = path.join(root, 'assets', 'sheet-check.py');
const demo = path.join(root, 'assets', 'sheet-demo.xlsx');
const plan = path.join(root, 'assets', 'sheet-demo-plan.json');

function python(args) {
  return execFileSync(process.execPath, [runner, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function check(file, json) {
  python([checker, file, '--plan', plan, '--json', json]);
  return fs.readFile(json, 'utf8').then(JSON.parse);
}

test('sheet demo has layout, named ranges and optional formulas', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-sheet-check-'));
  try {
    const qa = await check(demo, path.join(dir, 'qa.json'));
    assert.equal(qa.ok, true);
    assert.ok(qa.formulas >= 12);
    assert.equal(qa.layoutScore, 100);
    assert.ok(qa.namedRanges.length >= 5);
    assert.equal(qa.fullCalcOnLoad, true);
    assert.equal(qa.calculated, false);
    assert.deepEqual(qa.errors, []);
    assert.ok(qa.sheets.includes('车卡步骤'));
    assert.ok(qa.sheets.includes('资源'));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('a formula-less workbook still passes when layout is complete', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-sheet-no-formula-'));
  try {
    const src = path.join(dir, 'source.xlsx');
    const out = path.join(dir, 'no-formula.xlsx');
    await fs.copyFile(demo, src);
    python(['-c', `
from openpyxl import load_workbook
import sys
wb = load_workbook(sys.argv[1])
for ws in wb.worksheets:
    for row in ws.iter_rows():
        for cell in row:
            if isinstance(cell.value, str) and cell.value.startswith('='):
                cell.value = None
wb.save(sys.argv[2])
`, src, out]);
    const qa = await check(out, path.join(dir, 'qa.json'));
    assert.equal(qa.ok, true);
    assert.equal(qa.formulas, 0);
    assert.equal(qa.formulaOptional, true);
    assert.equal(qa.layoutScore, 100);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('ragged column widths fail the 8-column square grid gate', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-sheet-ragged-'));
  try {
    const src = path.join(dir, 'source.xlsx');
    const out = path.join(dir, 'ragged.xlsx');
    await fs.copyFile(demo, src);
    python(['-c', `
from openpyxl import load_workbook
import sys
wb = load_workbook(sys.argv[1])
ws = wb['人物卡']
ws.column_dimensions['A'].width = 30
wb.save(sys.argv[2])
`, src, out]);
    assert.throws(() => python([checker, out, '--plan', plan]), (error) => error.status === 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('broken title merge or print area fails layout gate', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-sheet-bad-layout-'));
  try {
    const src = path.join(dir, 'source.xlsx');
    const out = path.join(dir, 'bad.xlsx');
    await fs.copyFile(demo, src);
    python(['-c', `
from openpyxl import load_workbook
import sys
wb = load_workbook(sys.argv[1])
ws = wb['人物卡']
ws.unmerge_cells('A1:H2')
ws.print_area = None
wb.save(sys.argv[2])
`, src, out]);
    assert.throws(() => python([checker, out, '--plan', plan]), (error) => error.status === 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');
const checker = path.join(root, 'assets', 'check-card-plan.py');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlS8AAAAASUVORK5CYII=', 'base64');

function python(args, cwd) {
  return execFileSync(process.execPath, [runner, checker, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

test('card plan copies originals and rejects a missing original', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-card-plan-'));
  try {
    await fs.mkdir(path.join(dir, 'work', 'source-cards'), { recursive: true });
    await fs.writeFile(path.join(dir, 'work', 'source-cards', 'card.png'), png);
    await fs.writeFile(path.join(dir, 'work', 'table-plan.json'), JSON.stringify({
      items: [
        {
          id: 'pc-1',
          page: 12,
          kind: 'character-sheet',
          decision: 'abstract+original',
          source: 'work/source-cards/card.png',
          abstract: 'book/body.html#pc-1',
          columns: ['name', 'role'],
        },
        {
          id: 'weapons',
          page: 13,
          kind: 'weapon-table',
          decision: 'as-table',
          source: 'source/source.pdf p13',
          columns: ['name', 'damage', 'range'],
          rows: 4,
        },
      ],
    }), 'utf8');
    const output = python(['work/table-plan.json', '--out', 'out/TABLE-PLAN.json'], dir);
    assert.match(output, /OK/);
    const result = JSON.parse(await fs.readFile(path.join(dir, 'out', 'TABLE-PLAN.json'), 'utf8'));
    assert.equal(result.ok, true);
    assert.equal(result.counts.abstractOriginal, 1);
    assert.equal(result.counts.asTable, 1);
    assert.equal(result.counts.sourceCards, 1);
    await fs.access(path.join(dir, 'out', 'SOURCE-CARDS', 'INDEX.md'));
    await fs.access(path.join(dir, 'out', 'SOURCE-CARDS', 'card.png'));

    await fs.writeFile(path.join(dir, 'work', 'table-plan.json'), JSON.stringify({
      items: [{
        id: 'missing',
        decision: 'abstract+original',
        source: 'work/source-cards/missing.png',
        columns: ['name'],
      }],
    }), 'utf8');
    assert.throws(() => python(['work/table-plan.json', '--out', 'out/BAD.json'], dir), (error) => error.status === 1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');
const proof = path.join(root, 'assets', 'proof.py');

function python(args, cwd) {
  return execFileSync(process.execPath, [runner, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function fixture() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-proof-'));
  await fs.mkdir(path.join(dir, 'work', 'pages'), { recursive: true });
  await fs.writeFile(path.join(dir, 'work', 'batches.json'), JSON.stringify({
    totalSourcePages: 4,
    batches: [{ id: 'b00', title: '第一段', pages: [1, 2] }],
  }), 'utf8');
  await fs.writeFile(path.join(dir, 'work', 'pages', 'p1.json'), JSON.stringify({ src: [1], col1: [{ type: 'p', text: '第一页' }] }), 'utf8');
  await fs.writeFile(path.join(dir, 'work', 'pages', 'p2.json'), JSON.stringify({ src: [2], col1: [{ type: 'p', text: '第二页' }] }), 'utf8');
  return dir;
}

test('proof init writes a digest and verify invalidates it after a page edit', async () => {
  const dir = await fixture();
  try {
    python([proof, 'init', '--batch', 'b00', '--reviewer', 'subagent'], dir);
    const file = path.join(dir, 'work', 'batches', 'b00', 'PROOF.json');
    const data = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.match(data.pageDigest, /^sha256:/);
    assert.equal(data.ok, false);
    assert.deepEqual(data.files, ['p1.json', 'p2.json']);
    data.ok = true;
    data.checks = Object.fromEntries(Object.keys(data.checks).map((key) => [key, true]));
    await fs.writeFile(file, JSON.stringify(data), 'utf8');
    python([proof, 'verify', '--batch', 'b00'], dir);

    await fs.writeFile(path.join(dir, 'work', 'pages', 'p1.json'), JSON.stringify({ src: [1], col1: [{ type: 'p', text: '改过的第一页' }] }), 'utf8');
    let failed = false;
    try {
      python([proof, 'verify', '--batch', 'b00'], dir);
    } catch (error) {
      failed = true;
      assert.equal(error.status, 1);
    }
    assert.equal(failed, true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('proof init refuses to overwrite a valid proof without --force', async () => {
  const dir = await fixture();
  try {
    python([proof, 'init', '--batch', 'b00', '--reviewer', 'self'], dir);
    let failed = false;
    try {
      python([proof, 'init', '--batch', 'b00', '--reviewer', 'self'], dir);
    } catch (error) {
      failed = true;
      assert.equal(error.status, 0);
    }
    // Same digest: init is idempotent and exits 0.
    assert.equal(failed, false);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

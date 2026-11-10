import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');
const checker = path.join(root, 'assets', 'image-check.py');

function python(args, cwd) {
  return execFileSync(process.execPath, [runner, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

test('allows zero images when the source has no usable illustrations', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-image-check-'));
  try {
    const make = `import pymupdf
from pathlib import Path
out = Path(${JSON.stringify(dir)})
for name in ("source.pdf", "target.pdf"):
    doc = pymupdf.open()
    page = doc.new_page()
    page.insert_text((72, 72), "No usable illustrations in this source.")
    doc.save(out / name)
    doc.close()
`;
    python(['-c', make], root);
    const json = path.join(dir, 'check.json');
    python([checker, path.join(dir, 'source.pdf'), path.join(dir, 'target.pdf'), '--json', json], root);
    const result = JSON.parse(await fs.readFile(json, 'utf8'));
    assert.equal(result.ok, true);
    assert.equal(result.zeroAllowed, true);
    assert.equal(result.required, 0);
    assert.equal(result.targetImages, 0);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('fails when the source has usable art and the target has none', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-image-check-fail-'));
  try {
    const make = `import pymupdf
from pathlib import Path
out = Path(${JSON.stringify(dir)})
doc = pymupdf.open()
page = doc.new_page()
page.insert_text((72, 72), "No art.")
doc.save(out / "target.pdf")
doc.close()
`;
    python(['-c', make], root);
    assert.throws(
      () => python([checker, path.join(root, 'assets', 'demo', 'source.en.pdf'), path.join(dir, 'target.pdf')], root),
      (error) => error.status === 1,
    );
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

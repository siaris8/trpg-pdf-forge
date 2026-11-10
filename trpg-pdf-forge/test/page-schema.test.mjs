import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');

test('page schema and build-book share one block type list', () => {
  const code = `
import importlib.util, json, sys
from pathlib import Path
assets = Path(r"${path.join(root, 'assets').replaceAll('\\', '\\\\')}")
sys.path.insert(0, str(assets))
schema = json.loads((assets / 'page-schema.json').read_text(encoding='utf-8'))
spec = importlib.util.spec_from_file_location('build_book', assets / 'build-book.py')
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
assert set(schema['blockTypes']) == mod.BLOCK_TYPES
print('ok')
`;
  const output = execFileSync(process.execPath, [runner, '-c', code], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.match(output, /ok/);
});

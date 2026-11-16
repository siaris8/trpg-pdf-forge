import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const runner = path.join(root, 'assets', 'run-python.mjs');

function python(code) {
  return execFileSync(process.execPath, [runner, '-c', code], {
    cwd: path.join(root, 'assets'),
    encoding: 'utf8',
  });
}

test('German leftovers are detected when sourceLang is de', () => {
  const output = python(`
from textlib import audit_specs
spec = {"src": [1], "_file": "p001.json", "col1": [{"type": "p", "text": "Der Wächter schützt die Straße und die Menschen in der Stadt. Er bleibt bis zum Morgen."}]}
de = audit_specs(".", [spec], {}, {1}, source_lang="de")
assert de["errors"], de
print("ok")
`);
  assert.match(output, /ok/);
});

test('Polish leftovers and diacritics are handled', () => {
  const output = python(`
from textlib import audit_specs
from langlib import normalize_text, special_chars
from termlib import FOOTNOTE
spec = {"src": [1], "_file": "p001.json", "col1": [{"type": "p", "text": "Strażnik chroni ulicę i ludzi w mieście. Zostaje tam do rana i pilnuje bramy."}]}
pl = audit_specs(".", [spec], {}, {1}, source_lang="pl")
assert pl["errors"], pl
value = normalize_text("Źródło światła i żółć — ą ć ę ł ń ó ś ź ż", "pl")
assert "Źródło" in value and "żółć" in value
assert all(ch in special_chars("pl") for ch in "ąćęłńóśźż")
assert FOOTNOTE.search("nazwy w oryginale")
print("ok")
`);
  assert.match(output, /ok/);
});

test('German normalization keeps umlauts and repairs soft hyphen wraps', () => {
  const output = python(`
from langlib import normalize_text
value = normalize_text("Uhrenw\\u00e4chter und Stra\\u00dfe mit Weich\\u00adhyphen", "de")
assert "ä" in value and "ß" in value
assert "\\u00ad" not in value
print("ok")
`);
  assert.match(output, /ok/);
});

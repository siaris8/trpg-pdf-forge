import assert from 'node:assert/strict';
import test from 'node:test';
import { ACTIONS, makeNext, validateActions } from '../server/actions.mjs';
import { promptsFor } from '../server/prompt.mjs';

test('every action has a label and a real prompt', () => {
  const prompts = promptsFor({}, 'C:/tmp/project', 'approved', {
    plan: true, total: 10, translated: 5, proofed: 0, proofTotal: 2, current: 'b00',
    batches: [{ id: 'b00', title: '', pages: [1, 5], covered: 5, total: 5, status: 'partial' }],
  });
  const errors = validateActions(Object.keys(prompts));
  assert.deepEqual(errors, []);
  for (const [name, entry] of Object.entries(ACTIONS)) {
    assert.ok(entry.labelKey.startsWith('action'), name);
    const next = makeNext(name);
    assert.equal(next.action, name);
    if (entry.prompt) assert.ok(prompts[entry.prompt], `${name} prompt missing`);
  }
  assert.equal(makeNext('auto', '第 b00 批').promptKey, 'auto');
  assert.equal(makeNext('unknown').action, 'none');
});

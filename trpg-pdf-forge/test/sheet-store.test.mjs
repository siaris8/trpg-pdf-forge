import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';
import {
  createSheetProject,
  finalizeSheetProject,
  findSheetRoot,
  listAllSheetProjects,
  listSheetProjects,
  loadSheetProject,
  saveSheetSource,
  writeSheetReview,
} from '../server/sheet-store.mjs';

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-sheet-root-'));
  const assets = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-sheet-assets-'));
  await fs.writeFile(path.join(assets, 'SHEET-GUIDE.md'), '# sheet guide\n', 'utf8');
  await fs.writeFile(path.join(assets, 'sheet-spec.template.json'), '{}', 'utf8');
  return { root, assets };
}

test('creates a sheet project from pasted rules and finalizes', async () => {
  const { root, assets } = await fixture();
  try {
    const project = await createSheetProject(root, assets, {
      title: '钟表守卫',
      system: 'FIST',
      notes: '生命 = 10 + 强横*2；车卡步骤：选职阶、分配属性、选武器。',
    });
    assert.match(project.id, /^sheet-/);
    assert.equal(project.status, 'ready');
    const task = await fs.readFile(path.join(root, project.id, 'SHEET-TASK.md'), 'utf8');
    assert.match(task, /Excel 人物卡任务/);
    assert.match(task, /sheet-check\.py/);
    const finalized = await finalizeSheetProject(root, project.id);
    assert.equal(finalized.project.status, 'ready');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('uploads a source, reviews and archives a valid workbook', async () => {
  const { root, assets } = await fixture();
  try {
    const project = await createSheetProject(root, assets, { title: '上传测试', system: '自定义' });
    const uploaded = await saveSheetSource(
      root,
      project.id,
      'rules.txt',
      Readable.from([Buffer.from('力量 3；技能：射击。')]),
    );
    assert.equal(uploaded.path, 'source/source.txt');
    await finalizeSheetProject(root, project.id);
    const dir = path.join(root, project.id);
    await fs.copyFile(path.join(process.cwd(), 'assets', 'sheet-demo.xlsx'), path.join(dir, 'out', 'character-sheet.xlsx'));
    await fs.copyFile(path.join(process.cwd(), 'assets', 'sheet-demo-plan.json'), path.join(dir, 'work', 'sheet-plan.json'));
    await fs.copyFile(path.join(process.cwd(), 'assets', 'sheet-demo-qa.json'), path.join(dir, 'out', 'SHEET-QA.json'));
    await fs.writeFile(path.join(dir, 'out', 'SHEET-REPORT.md'), '# report\n', 'utf8');
    const reviewed = await writeSheetReview(root, project.id, 'approve');
    assert.equal(reviewed.project.status, 'done');
    const listed = await listSheetProjects(root);
    assert.equal(listed[0].status, 'done');
    const loaded = await loadSheetProject(root, project.id);
    assert.equal(loaded.files.qaOk, true);
    assert.ok(loaded.files.formulas > 10);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('sheet listing tolerates a missing root and findSheetRoot resolves the owner', async () => {
  const { root, assets } = await fixture();
  const missing = path.join(root, 'missing-sheet-root');
  try {
    assert.deepEqual(await listSheetProjects(missing), []);
    assert.equal(await fs.access(missing).then(() => true).catch(() => false), false);
    const project = await createSheetProject(root, assets, { title: '定位车卡', notes: '规则' });
    assert.equal(await findSheetRoot([missing, root], project.id), root);
    assert.equal(await findSheetRoot([missing], project.id), null);
    const aggregated = await listAllSheetProjects([missing, root]);
    assert.equal(aggregated.length, 1);
    assert.equal(aggregated[0].root, root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('approval is blocked without SHEET-QA ok', async () => {
  const { root, assets } = await fixture();
  try {
    const project = await createSheetProject(root, assets, { title: '门禁', notes: '规则' });
    await finalizeSheetProject(root, project.id);
    await assert.rejects(() => writeSheetReview(root, project.id, 'approve'), /character-sheet|SHEET-QA/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

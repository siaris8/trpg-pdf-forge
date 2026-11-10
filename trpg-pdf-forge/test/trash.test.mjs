import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createProject, listProjects } from '../server/store.mjs';
import { createSheetProject, listSheetProjects } from '../server/sheet-store.mjs';
import { exists } from '../server/util.mjs';
import { listTrash, purgeTrash, restoreTrash, trashProject } from '../server/trash.mjs';

async function fixture(prefix, files = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-root-`));
  const assets = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-assets-`));
  for (const [name, content] of Object.entries(files)) {
    await fs.writeFile(path.join(assets, name), content, 'utf8');
  }
  return { root, assets };
}

async function cleanup(root, assets) {
  await fs.rm(root, { recursive: true, force: true });
  await fs.rm(assets, { recursive: true, force: true });
}

test('PDF project: delete, list, restore and purge', async () => {
  const { root, assets } = await fixture('trpg-trash');
  try {
    const project = await createProject(root, assets, { title: '删除测试', glossaryMode: 'blank' });
    const first = await trashProject(root, project.id, 'project');
    assert.match(first.trashId, /__\d{8}-\d{6}$/);
    assert.equal(await exists(path.join(root, project.id)), false);
    assert.deepEqual(await listProjects(root, assets), []);

    const items = await listTrash(root, 'project');
    assert.equal(items.length, 1);
    assert.equal(items[0].id, project.id);
    assert.equal(items[0].title, '删除测试');
    assert.equal(items[0].root, path.resolve(root));
    assert.equal((await listTrash(root, 'sheet')).length, 0);

    const restoredId = await restoreTrash(root, first.trashId, 'project');
    assert.equal(restoredId, project.id);
    assert.equal((await listProjects(root, assets)).length, 1);
    assert.equal((await listTrash(root, 'project')).length, 0);

    const second = await trashProject(root, project.id, 'project');
    await purgeTrash(root, second.trashId, 'project');
    assert.equal((await listTrash(root, 'project')).length, 0);
    assert.equal(await exists(path.join(root, '.trash', second.trashId)), false);
  } finally {
    await cleanup(root, assets);
  }
});

test('Excel sheet project: delete, list and restore', async () => {
  const { root, assets } = await fixture('trpg-sheet-trash');
  try {
    const project = await createSheetProject(root, assets, { title: '车卡删除', notes: '规则' });
    const trashed = await trashProject(root, project.id, 'sheet');
    assert.deepEqual(await listSheetProjects(root), []);
    const items = await listTrash(root, 'sheet');
    assert.equal(items.length, 1);
    assert.equal(items[0].id, project.id);
    assert.equal((await listTrash(root, 'project')).length, 0);

    await restoreTrash(root, trashed.trashId, 'sheet');
    assert.equal((await listSheetProjects(root)).length, 1);
  } finally {
    await cleanup(root, assets);
  }
});

test('rejects invalid trash ids, wrong kinds and restore conflicts', async () => {
  const { root, assets } = await fixture('trpg-trash-guard');
  try {
    const project = await createProject(root, assets, { title: '守卫', glossaryMode: 'blank' });
    await assert.rejects(() => trashProject(root, project.id, 'sheet'), /类型不匹配/);
    await assert.rejects(() => restoreTrash(root, '..\\..\\escape', 'project'), /回收站编号/);
    await assert.rejects(() => restoreTrash(root, 'not-a-trash-id', 'project'), /回收站编号/);

    const trashed = await trashProject(root, project.id, 'project');
    await fs.mkdir(path.join(root, project.id));
    await assert.rejects(() => restoreTrash(root, trashed.trashId, 'project'), /同名项目/);
    await fs.rm(path.join(root, project.id), { recursive: true, force: true });
  } finally {
    await cleanup(root, assets);
  }
});

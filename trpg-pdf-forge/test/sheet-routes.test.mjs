import assert from 'node:assert/strict';
import { promises as fs, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { installSheetRoutes } from '../server/sheet-routes.mjs';

const packageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

test('sheet info does not create the workspace root', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-sheet-lazy-'));
  const root = path.join(base, 'not-created', 'trpg-sheets');
  const assets = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-sheet-lazy-assets-'));
  const previous = process.env.TRPG_SHEET_ROOT;
  process.env.TRPG_SHEET_ROOT = root;
  const routes = new Map();
  const ctx = {
    connection: { fetch: { register(route) { routes.set(route.path, route); return () => {}; } } },
    effect(callback) { return callback(); },
    sessions: { list: () => [] },
  };
  try {
    installSheetRoutes(ctx, { assetsDir: assets, version: packageVersion });
    const response = await routes.get('/api/trpg-sheets/info').fetch(new Request('http://dsh.internal/api/trpg-sheets/info'));
    const info = await response.json();
    assert.equal(info.root, root);
    assert.equal(info.rootExists, false);
    assert.equal(await fs.stat(root).then(() => true).catch(() => false), false);
  } finally {
    if (previous === undefined) delete process.env.TRPG_SHEET_ROOT;
    else process.env.TRPG_SHEET_ROOT = previous;
    await fs.rm(base, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('sheet routes expose info and list', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-sheet-routes-'));
  const assets = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-sheet-routes-assets-'));
  const previous = process.env.TRPG_SHEET_ROOT;
  process.env.TRPG_SHEET_ROOT = root;
  const routes = new Map();
  const ctx = {
    connection: { fetch: { register(route) { routes.set(route.path, route); return () => {}; } } },
    effect(callback) { return callback(); },
    sessions: { list: () => [] },
  };
  try {
    installSheetRoutes(ctx, { assetsDir: assets, version: packageVersion });
    const infoRoute = routes.get('/api/trpg-sheets/info');
    assert.ok(infoRoute);
    const info = await (await infoRoute.fetch(new Request('http://dsh.internal/api/trpg-sheets/info'))).json();
    assert.equal(info.ok, true);
    assert.equal(info.version, packageVersion);
    const listRoute = routes.get('/api/trpg-sheets/list');
    const list = await (await listRoute.fetch(new Request('http://dsh.internal/api/trpg-sheets/list', { method: 'POST', body: '{}' }))).json();
    assert.equal(list.ok, true);
    assert.ok(Array.isArray(list.projects));
  } finally {
    if (previous === undefined) delete process.env.TRPG_SHEET_ROOT;
    else process.env.TRPG_SHEET_ROOT = previous;
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('sheet routes delete, list trash, restore and purge', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-sheet-trash-routes-'));
  const assets = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-sheet-trash-assets-'));
  const previous = process.env.TRPG_SHEET_ROOT;
  process.env.TRPG_SHEET_ROOT = root;
  const routes = new Map();
  const ctx = {
    connection: { fetch: { register(route) { routes.set(route.path, route); return () => {}; } } },
    effect(callback) { return callback(); },
    sessions: { list: () => [] },
  };
  const call = (routePath, body) => routes.get(routePath).fetch(new Request(`http://dsh.internal${routePath}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body || {}),
  }));
  try {
    installSheetRoutes(ctx, { assetsDir: assets, version: packageVersion });
    const created = await (await call('/api/trpg-sheets/projects', { title: '回收站车卡', system: 'FIST', notes: '规则说明' })).json();
    const projectId = created.project.id;

    assert.equal((await call('/api/trpg-sheets/delete', { projectId })).status, 200);
    assert.equal((await (await call('/api/trpg-sheets/list')).json()).projects.length, 0);
    const trash = await (await call('/api/trpg-sheets/trash/list')).json();
    assert.equal(trash.items.length, 1);
    assert.equal(trash.items[0].root, path.resolve(root));

    const restored = await call('/api/trpg-sheets/trash/restore', { root: trash.items[0].root, trashId: trash.items[0].trashId });
    assert.equal(restored.status, 200);
    assert.equal((await (await call('/api/trpg-sheets/list')).json()).projects.length, 1);

    assert.equal((await call('/api/trpg-sheets/delete', { projectId })).status, 200);
    const second = await (await call('/api/trpg-sheets/trash/list')).json();
    assert.equal((await call('/api/trpg-sheets/trash/purge', { root: second.items[0].root, trashId: second.items[0].trashId })).status, 200);
    assert.equal((await (await call('/api/trpg-sheets/trash/list')).json()).items.length, 0);
  } finally {
    if (previous === undefined) delete process.env.TRPG_SHEET_ROOT;
    else process.env.TRPG_SHEET_ROOT = previous;
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});


import assert from 'node:assert/strict';
import { promises as fs, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { installRoutes } from '../server/routes.mjs';
import { createProject } from '../server/store.mjs';

const packageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

async function setup() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-routes-root-'));
  const assets = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-routes-assets-'));
  await fs.writeFile(path.join(assets, 'INSTRUCTIONS.md'), '# instructions\n', 'utf8');
  await fs.writeFile(path.join(assets, 'STYLE.md'), '# style\n', 'utf8');
  await fs.writeFile(path.join(assets, 'theme.css'), 'body{}\n', 'utf8');
  const previous = process.env.TRPG_STUDIO_ROOT;
  process.env.TRPG_STUDIO_ROOT = root;
  const routes = new Map();
  const ctx = {
    connection: {
      fetch: {
        register(route) {
          routes.set(route.path, route);
          return () => routes.delete(route.path);
        },
      },
    },
    effect(callback) {
      return callback();
    },
    sessions: { list: () => [] },
  };
  installRoutes(ctx, { assetsDir: assets, version: packageVersion });
  return {
    root,
    assets,
    routes,
    call: (routePath, init) => {
      const pathname = routePath.split('?')[0];
      const route = routes.get(pathname);
      assert.ok(route, `route ${pathname} is missing`);
      return route.fetch(new Request(`http://dsh.internal${routePath}`, init));
    },
    cleanup: async () => {
      if (previous === undefined) delete process.env.TRPG_STUDIO_ROOT;
      else process.env.TRPG_STUDIO_ROOT = previous;
      await fs.rm(root, { recursive: true, force: true });
      await fs.rm(assets, { recursive: true, force: true });
    },
  };
}

test('info does not create a workspace project root', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-info-lazy-'));
  const root = path.join(base, 'not-created', 'trpg-projects');
  const assets = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-info-lazy-assets-'));
  const previous = process.env.TRPG_STUDIO_ROOT;
  process.env.TRPG_STUDIO_ROOT = root;
  const routes = new Map();
  const ctx = {
    connection: { fetch: { register(route) { routes.set(route.path, route); return () => {}; } } },
    effect(callback) { return callback(); },
    sessions: { list: () => [] },
  };
  try {
    installRoutes(ctx, { assetsDir: assets, version: packageVersion });
    const response = await routes.get('/api/trpg-studio/info').fetch(new Request('http://dsh.internal/api/trpg-studio/info'));
    const info = await response.json();
    assert.equal(info.root, root);
    assert.equal(info.rootExists, false);
    assert.equal(await fs.stat(root).then(() => true).catch(() => false), false);
  } finally {
    if (previous === undefined) delete process.env.TRPG_STUDIO_ROOT;
    else process.env.TRPG_STUDIO_ROOT = previous;
    await fs.rm(base, { recursive: true, force: true });
    await fs.rm(assets, { recursive: true, force: true });
  }
});

test('routes create, upload, finalize, list and serve a project', async () => {
  const env = await setup();
  try {
    const infoResponse = await env.call('/api/trpg-studio/info');
    const info = await infoResponse.json();
    assert.equal(info.version, packageVersion);
    const createdResponse = await env.call('/api/trpg-studio/projects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '璺敱娴嬭瘯', glossaryMode: 'blank' }),
    });
    assert.equal(createdResponse.status, 200);
    const created = await createdResponse.json();
    const projectId = created.project.id;
    assert.match(projectId, /^project-/);

    const uploadResponse = await env.call(`/api/trpg-studio/upload?projectId=${encodeURIComponent(projectId)}&kind=source&name=module.pdf`, {
      method: 'POST',
      body: Buffer.from('%PDF-1.4\n%%EOF\n'),
    });
    assert.equal(uploadResponse.status, 200);
    const uploaded = await uploadResponse.json();
    assert.equal(uploaded.path, 'source/source.pdf');

    const finalizeResponse = await env.call('/api/trpg-studio/finalize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId }),
    });
    assert.equal(finalizeResponse.status, 200);
    const finalized = await finalizeResponse.json();
    assert.equal(finalized.project.status, 'ready');

    const listResponse = await env.call('/api/trpg-studio/list', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const listed = await listResponse.json();
    assert.equal(listed.projects.length, 1);
    assert.match(listed.projects[0].prompts.start, /首轮只完成/);

    const fileResponse = await env.call(`/api/trpg-studio/file?projectId=${encodeURIComponent(projectId)}&path=source%2Fsource.pdf`);
    assert.equal(fileResponse.status, 200);
    const bytes = Buffer.from(await fileResponse.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString('ascii'), '%PDF-');

    const traversal = await env.call(`/api/trpg-studio/file?projectId=${encodeURIComponent(projectId)}&path=..%2F..%2Foutside.txt`);
    assert.equal(traversal.status, 400);
  } finally {
    await env.cleanup();
  }
});

test('aggregates and deletes projects that live in another workspace', async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-routes-multi-'));
  const profile = path.join(base, 'profile');
  const home = path.join(base, 'home');
  const legacy = path.join(base, 'legacy-ws');
  const assets = path.join(base, 'assets');
  const previous = {
    studio: process.env.TRPG_STUDIO_ROOT,
    sheet: process.env.TRPG_SHEET_ROOT,
    legacy: process.env.TRPG_STUDIO_LEGACY_ROOTS,
    profile: process.env.DSH_PROFILE_DIR,
    home: process.env.DSH_HOME,
  };
  delete process.env.TRPG_STUDIO_ROOT;
  delete process.env.TRPG_SHEET_ROOT;
  process.env.TRPG_STUDIO_LEGACY_ROOTS = legacy;
  process.env.DSH_PROFILE_DIR = profile;
  process.env.DSH_HOME = home;
  await fs.mkdir(path.join(home, 'sessions'), { recursive: true });
  await fs.mkdir(assets, { recursive: true });

  const legacyRoot = path.join(legacy, 'trpg-projects');
  const project = await createProject(legacyRoot, assets, { title: '旧工作区项目', glossaryMode: 'blank' });
  const routes = new Map();
  const ctx = {
    connection: { fetch: { register(route) { routes.set(route.path, route); return () => {}; } } },
    effect(callback) { return callback(); },
    sessions: { list: () => [] },
  };
  const call = (routePath, body) => {
    const pathname = routePath.split('?')[0];
    return routes.get(pathname).fetch(new Request(`http://dsh.internal${routePath}`, body === undefined
      ? {}
      : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) }));
  };

  try {
    installRoutes(ctx, { assetsDir: assets, version: packageVersion });
    const listed = await (await call('/api/trpg-studio/list', {})).json();
    assert.equal(listed.projects.length, 1);
    assert.equal(listed.projects[0].root, legacyRoot);

    const fileResponse = await call(`/api/trpg-studio/file?projectId=${project.id}&path=TASK.md`);
    assert.equal(fileResponse.status, 200);

    assert.equal((await call('/api/trpg-studio/delete', { projectId: project.id })).status, 200);
    assert.equal((await (await call('/api/trpg-studio/list', {})).json()).projects.length, 0);
    const trash = await (await call('/api/trpg-studio/trash/list', {})).json();
    assert.equal(trash.items.length, 1);
    assert.equal(trash.items[0].root, legacyRoot);

    const restored = await call('/api/trpg-studio/trash/restore', { root: legacyRoot, trashId: trash.items[0].trashId });
    assert.equal(restored.status, 200);
    assert.equal((await (await call('/api/trpg-studio/list', {})).json()).projects.length, 1);
  } finally {
    if (previous.studio === undefined) delete process.env.TRPG_STUDIO_ROOT;
    else process.env.TRPG_STUDIO_ROOT = previous.studio;
    if (previous.sheet === undefined) delete process.env.TRPG_SHEET_ROOT;
    else process.env.TRPG_SHEET_ROOT = previous.sheet;
    if (previous.legacy === undefined) delete process.env.TRPG_STUDIO_LEGACY_ROOTS;
    else process.env.TRPG_STUDIO_LEGACY_ROOTS = previous.legacy;
    if (previous.profile === undefined) delete process.env.DSH_PROFILE_DIR;
    else process.env.DSH_PROFILE_DIR = previous.profile;
    if (previous.home === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previous.home;
    await fs.rm(base, { recursive: true, force: true });
  }
});


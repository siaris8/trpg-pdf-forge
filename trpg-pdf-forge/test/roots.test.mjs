import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildRootList,
  decodeSessionWorkspaceName,
  flushRootPersistence,
  resolveProjectRoots,
  resolveSheetRoots,
} from '../server/roots.mjs';

async function tempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function withEnv(values) {
  const previous = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  return () => {
    for (const key of Object.keys(previous)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  };
}

test('buildRootList keeps the current root first, dedupes and drops missing paths', async () => {
  const base = await tempDir('trpg-roots-');
  try {
    const wsA = path.join(base, 'ws-a');
    const wsB = path.join(base, 'ws-b');
    const projectsA = path.join(wsA, 'trpg-projects');
    const projectsB = path.join(wsB, 'trpg-projects');
    const sheetsA = path.join(wsA, 'trpg-sheets');
    await fs.mkdir(projectsA, { recursive: true });
    await fs.mkdir(projectsB, { recursive: true });
    await fs.mkdir(sheetsA, { recursive: true });

    const current = path.join(base, 'current', 'trpg-projects');
    const roots = await buildRootList({
      current,
      stored: [projectsA, projectsB],
      bases: [wsA, wsB, path.join(base, 'missing')],
      dirname: 'trpg-projects',
    });
    assert.deepEqual(roots, [current, projectsA, projectsB]);

    const sheets = await buildRootList({
      current: path.join(base, 'current', 'trpg-sheets'),
      stored: [],
      bases: [wsA, wsB],
      dirname: 'trpg-sheets',
    });
    assert.deepEqual(sheets, [path.join(base, 'current', 'trpg-sheets'), sheetsA]);
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
});

test('explicit roots collapse discovery to a single root', async () => {
  const base = await tempDir('trpg-roots-env-');
  const restore = withEnv({
    TRPG_STUDIO_ROOT: path.join(base, 'studio'),
    TRPG_SHEET_ROOT: path.join(base, 'sheets'),
    DSH_PROFILE_DIR: path.join(base, 'profile'),
    DSH_HOME: path.join(base, 'home'),
  });
  try {
    await fs.mkdir(path.join(base, 'home'), { recursive: true });
    assert.deepEqual(await resolveProjectRoots({}), [path.resolve(base, 'studio')]);
    assert.deepEqual(await resolveSheetRoots({}), [path.resolve(base, 'sheets')]);
  } finally {
    restore();
    await fs.rm(base, { recursive: true, force: true });
  }
});

test('discovery merges registry, session cwd, explicit legacy bases and persists them', async () => {
  const base = await tempDir('trpg-roots-discover-');
  const profile = path.join(base, 'profile');
  const home = path.join(base, 'home');
  const wsA = path.join(base, 'ws-a');
  const wsB = path.join(base, 'ws-b');
  const wsC = path.join(base, 'ws-c');
  const restore = withEnv({
    TRPG_STUDIO_ROOT: undefined,
    TRPG_SHEET_ROOT: undefined,
    TRPG_STUDIO_LEGACY_ROOTS: wsC,
    DSH_PROFILE_DIR: profile,
    DSH_HOME: home,
  });
  try {
    await fs.mkdir(path.join(home, 'sessions'), { recursive: true });
    for (const workspace of [wsA, wsB, wsC]) {
      await fs.mkdir(path.join(workspace, 'trpg-projects'), { recursive: true });
    }
    const ctx = {
      get: (name) => (name === 'workspaceRegistry' ? { list: () => [{ path: wsA }] } : undefined),
      sessions: { list: () => [{ header: { cwd: wsB } }] },
    };
    const roots = await resolveProjectRoots(ctx);
    await flushRootPersistence();
    for (const workspace of [wsA, wsB, wsC]) {
      assert.ok(roots.includes(path.join(workspace, 'trpg-projects')), `missing ${workspace}`);
    }
    const known = JSON.parse(await fs.readFile(path.join(profile, 'trpg-studio-roots.json'), 'utf8'));
    assert.ok(known.projects.includes(path.join(wsA, 'trpg-projects')));
    assert.equal(known.version, 1);
  } finally {
    restore();
    await fs.rm(base, { recursive: true, force: true });
  }
});

test('decodes DSH session directory names back to workspace paths', () => {
  if (process.platform !== 'win32') return;
  assert.equal(decodeSessionWorkspaceName('--D-~5220~9664~7A7A~884C--'), 'D:\\删除空行');
  assert.equal(decodeSessionWorkspaceName('--D-fengshui--'), 'D:\\fengshui');
  assert.equal(decodeSessionWorkspaceName('not-a-session'), null);
});

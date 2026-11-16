import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { resolveSheetRoot } from './config.mjs';
import { resolveSheetRoots, samePath } from './roots.mjs';
import {
  createSheetProject,
  finalizeSheetProject,
  findSheetRoot,
  listAllSheetProjects,
  loadSheetProject,
  MAX_SOURCE_BYTES,
  saveSheetSource,
  sheetFileStat,
  sheetPublic,
  writeSheetReview,
} from './sheet-store.mjs';
import { listTrash, purgeTrash, restoreTrash, trashProject } from './trash.mjs';
import { exists, httpError, mimeFor, safeProjectId, serveError } from './util.mjs';

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function failure(error) {
  const { status, body } = serveError(error);
  return json(body, status);
}

async function bodyJson(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > 1024 * 1024) throw httpError(413, '请求内容过大。');
  const text = await request.text();
  if (text.length > 1024 * 1024) throw httpError(413, '请求内容过大。');
  try {
    const value = JSON.parse(text || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    throw httpError(400, '请求不是有效的 JSON。');
  }
}

function requireProjectId(value) {
  const id = safeProjectId(value);
  if (!id.startsWith('sheet-')) throw httpError(400, '项目 ID 无效。');
  return id;
}

function root(ctx) {
  return resolveSheetRoot(ctx);
}

async function knownRoots(ctx) {
  return resolveSheetRoots(ctx);
}

async function rootOf(ctx, id) {
  const found = await findSheetRoot(await knownRoots(ctx), id);
  if (!found) throw httpError(404, '找不到这个项目。');
  return found;
}

async function knownRoot(ctx, value) {
  if (typeof value !== 'string' || !value.trim()) throw httpError(400, '缺少项目目录。');
  const found = (await knownRoots(ctx)).find((candidate) => samePath(candidate, value));
  if (!found) throw httpError(400, '项目目录不在已知范围内。');
  return found;
}

async function info(ctx, assetsDir, version) {
  const current = root(ctx);
  const roots = await knownRoots(ctx);
  return json({
    ok: true,
    version,
    root: current,
    rootExists: await exists(current),
    roots,
    demo: await exists(path.join(assetsDir, 'sheet-demo.xlsx')),
    maxSourceBytes: MAX_SOURCE_BYTES,
  });
}

async function create(ctx, assetsDir, request) {
  const input = await bodyJson(request);
  const project = await createSheetProject(root(ctx), assetsDir, input);
  return json({ ok: true, project });
}

async function upload(ctx, request) {
  if (!request.body) throw httpError(400, '没有收到文件内容。');
  const url = new URL(request.url);
  const projectId = requireProjectId(url.searchParams.get('projectId'));
  const name = url.searchParams.get('name') || '';
  const file = await saveSheetSource(await rootOf(ctx, projectId), projectId, name, Readable.fromWeb(request.body), MAX_SOURCE_BYTES);
  return json(file);
}

async function finalize(ctx, request) {
  const input = await bodyJson(request);
  const projectId = requireProjectId(input.projectId);
  return json(await finalizeSheetProject(await rootOf(ctx, projectId), projectId));
}

async function list(ctx) {
  const roots = await knownRoots(ctx);
  return json({ ok: true, root: root(ctx), roots, projects: await listAllSheetProjects(roots) });
}

async function action(ctx, request) {
  const input = await bodyJson(request);
  const projectId = requireProjectId(input.projectId);
  const decision = input.decision === 'approve' ? 'approve' : input.decision === 'changes' ? 'changes' : null;
  if (!decision) throw httpError(400, '审核决定无效。');
  return json(await writeSheetReview(await rootOf(ctx, projectId), projectId, decision, input.note));
}

async function file(ctx, request) {
  const url = new URL(request.url);
  const projectId = requireProjectId(url.searchParams.get('projectId'));
  const relative = url.searchParams.get('path') || '';
  if (!relative) throw httpError(400, '缺少文件路径。');
  const { dir } = await loadSheetProject(await rootOf(ctx, projectId), projectId);
  const { file: resolved, size } = await sheetFileStat(dir, relative);
  const extension = path.extname(resolved).toLowerCase();
  let type = mimeFor(resolved);
  if (extension === '.html') type = 'text/plain; charset=utf-8';
  const download = url.searchParams.get('download') === '1';
  const fileName = path.basename(resolved);
  return new Response(Readable.toWeb(createReadStream(resolved)), {
    status: 200,
    headers: {
      'content-type': type,
      'content-length': String(size),
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'content-disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    },
  });
}

async function demo(assetsDir, request) {
  const url = new URL(request.url);
  const name = path.basename(url.searchParams.get('name') || '');
  if (!new Set(['sheet-demo.xlsx', 'sheet-demo-preview.png']).has(name)) throw httpError(404, '示例文件不存在。');
  const file = path.join(assetsDir, name);
  if (!(await exists(file))) throw httpError(404, '示例还没有生成。');
  const data = await fs.readFile(file);
  return new Response(data, {
    headers: {
      'content-type': mimeFor(name),
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
    },
  });
}

async function remove(ctx, request) {
  const input = await bodyJson(request);
  const projectId = requireProjectId(input.projectId);
  const projectRoot = await rootOf(ctx, projectId);
  const trashed = await trashProject(projectRoot, projectId, 'sheet');
  return json({ ok: true, trashed });
}

async function trashList(ctx) {
  const roots = await knownRoots(ctx);
  const items = [];
  for (const projectRoot of roots) {
    items.push(...(await listTrash(projectRoot, 'sheet')));
  }
  items.sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
  return json({ ok: true, items });
}

async function trashRestore(ctx, request) {
  const input = await bodyJson(request);
  const projectRoot = await knownRoot(ctx, input.root);
  const projectId = await restoreTrash(projectRoot, input.trashId, 'sheet');
  const state = await loadSheetProject(projectRoot, projectId);
  return json({ ok: true, project: sheetPublic(state, state.dir) });
}

async function trashPurge(ctx, request) {
  const input = await bodyJson(request);
  const projectRoot = await knownRoot(ctx, input.root);
  await purgeTrash(projectRoot, input.trashId, 'sheet');
  return json({ ok: true });
}

export function installSheetRoutes(ctx, options) {
  const assetsDir = options.assetsDir;
  const handlers = [
    { path: '/api/trpg-sheets/info', methods: ['GET'], requestBody: 'buffered', fetch: () => info(ctx, assetsDir, options.version).catch(failure) },
    { path: '/api/trpg-sheets/projects', methods: ['POST'], requestBody: 'buffered', fetch: (request) => create(ctx, assetsDir, request).catch(failure) },
    { path: '/api/trpg-sheets/upload', methods: ['POST'], requestBody: 'buffered', fetch: (request) => upload(ctx, request).catch(failure) },
    { path: '/api/trpg-sheets/finalize', methods: ['POST'], requestBody: 'buffered', fetch: (request) => finalize(ctx, request).catch(failure) },
    { path: '/api/trpg-sheets/list', methods: ['POST'], requestBody: 'buffered', fetch: () => list(ctx).catch(failure) },
    { path: '/api/trpg-sheets/action', methods: ['POST'], requestBody: 'buffered', fetch: (request) => action(ctx, request).catch(failure) },
    { path: '/api/trpg-sheets/delete', methods: ['POST'], requestBody: 'buffered', fetch: (request) => remove(ctx, request).catch(failure) },
    { path: '/api/trpg-sheets/trash/list', methods: ['POST'], requestBody: 'buffered', fetch: () => trashList(ctx).catch(failure) },
    { path: '/api/trpg-sheets/trash/restore', methods: ['POST'], requestBody: 'buffered', fetch: (request) => trashRestore(ctx, request).catch(failure) },
    { path: '/api/trpg-sheets/trash/purge', methods: ['POST'], requestBody: 'buffered', fetch: (request) => trashPurge(ctx, request).catch(failure) },
    { path: '/api/trpg-sheets/file', methods: ['GET'], requestBody: 'buffered', fetch: (request) => file(ctx, request).catch(failure) },
    { path: '/api/trpg-sheets/demo', methods: ['GET'], requestBody: 'buffered', fetch: (request) => demo(assetsDir, request).catch(failure) },
  ];
  for (const handler of handlers) {
    ctx.effect(
      () => ctx.connection.fetch.register(handler),
      `trpg-sheets: exact route ${handler.path}`,
    );
  }
}

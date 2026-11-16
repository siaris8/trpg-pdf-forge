import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import {
  MAX_ASSET_BYTES,
  MAX_GLOSSARY_BYTES,
  MAX_PDF_BYTES,
  resolveProjectsRoot,
} from './config.mjs';
import { resolveProjectRoots, samePath } from './roots.mjs';
import {
  createProject,
  finalizeProject,
  findProjectRoot,
  inspectFiles,
  listAllProjects,
  loadProject,
  projectFileStat,
  publicProject,
  saveUpload,
  writeReview,
} from './store.mjs';
import { listTrash, purgeTrash, restoreTrash, trashProject } from './trash.mjs';
import {
  exists,
  httpError,
  mimeFor,
  safeProjectId,
  serveError,
} from './util.mjs';

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
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
  return safeProjectId(value);
}

function root(ctx) {
  return resolveProjectsRoot(ctx);
}

async function knownRoots(ctx) {
  return resolveProjectRoots(ctx);
}

/** Resolve the root that owns a project id (projects may live in any known workspace). */
async function rootOf(ctx, id) {
  const found = await findProjectRoot(await knownRoots(ctx), id);
  if (!found) throw httpError(404, '找不到这个项目。');
  return found;
}

/** Validate a client-supplied root against the discovered roots. */
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
    demo: await exists(path.join(assetsDir, 'demo', 'preview.png')),
    maxPdfBytes: MAX_PDF_BYTES,
    maxGlossaryBytes: MAX_GLOSSARY_BYTES,
    maxAssetBytes: MAX_ASSET_BYTES,
  });
}

async function create(ctx, assetsDir, request) {
  const input = await bodyJson(request);
  const project = await createProject(root(ctx), assetsDir, input);
  return json({ ok: true, project });
}

async function upload(ctx, request) {
  if (!request.body) throw httpError(400, '没有收到文件内容。');
  const url = new URL(request.url);
  const projectId = requireProjectId(url.searchParams.get('projectId'));
  const kind = url.searchParams.get('kind');
  if (!['source', 'glossary', 'asset'].includes(kind)) throw httpError(400, '上传类型无效。');
  const name = url.searchParams.get('name') || '';
  const limit = kind === 'source' ? MAX_PDF_BYTES : kind === 'glossary' ? MAX_GLOSSARY_BYTES : MAX_ASSET_BYTES;
  const file = await saveUpload(await rootOf(ctx, projectId), projectId, kind, name, Readable.fromWeb(request.body), limit);
  return json(file);
}

async function finalize(ctx, request) {
  const input = await bodyJson(request);
  const projectId = requireProjectId(input.projectId);
  const result = await finalizeProject(await rootOf(ctx, projectId), projectId);
  return json(result);
}

async function list(ctx, assetsDir) {
  const roots = await knownRoots(ctx);
  const projects = await listAllProjects(roots, assetsDir);
  return json({ ok: true, root: root(ctx), roots, projects });
}

async function action(ctx, request) {
  const input = await bodyJson(request);
  const projectId = requireProjectId(input.projectId);
  const decision = input.decision === 'approve' ? 'approve' : input.decision === 'changes' ? 'changes' : null;
  if (!decision) throw httpError(400, '审核决定无效。');
  const result = await writeReview(await rootOf(ctx, projectId), projectId, decision, input.note);
  return json(result);
}

async function file(ctx, request) {
  const url = new URL(request.url);
  const projectId = requireProjectId(url.searchParams.get('projectId'));
  const relative = url.searchParams.get('path') || '';
  if (!relative) throw httpError(400, '缺少文件路径。');
  const { dir } = await loadProject(await rootOf(ctx, projectId), projectId);
  const { file: resolved, size } = await projectFileStat(dir, relative);
  const extension = path.extname(resolved).toLowerCase();
  let type = mimeFor(resolved);
  if (extension === '.html') type = 'text/plain; charset=utf-8';
  const download = url.searchParams.get('download') === '1';
  const fileName = path.basename(resolved);
  const headers = {
    'content-type': type,
    'content-length': String(size),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  };
  const stream = Readable.toWeb(createReadStream(resolved));
  return new Response(stream, { status: 200, headers });
}

async function demo(assetsDir, request) {
  const url = new URL(request.url);
  const name = path.basename(url.searchParams.get('name') || '');
  const allowed = new Set(['preview.png', 'hard.png', 'tables.png', 'preview.pdf', 'hard.pdf', 'tables.pdf', 'contact-sheet.png']);
  if (!allowed.has(name)) throw httpError(404, '示例文件不存在。');
  const file = path.join(assetsDir, 'demo', name);
  if (!(await exists(file))) throw httpError(404, '示例还没有导出。');
  const data = await fs.readFile(file);
  return new Response(data, {
    headers: {
      'content-type': mimeFor(name),
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

async function remove(ctx, request) {
  const input = await bodyJson(request);
  const projectId = requireProjectId(input.projectId);
  const projectRoot = await rootOf(ctx, projectId);
  const trashed = await trashProject(projectRoot, projectId, 'project');
  return json({ ok: true, trashed });
}

async function trashList(ctx) {
  const roots = await knownRoots(ctx);
  const items = [];
  for (const projectRoot of roots) {
    items.push(...(await listTrash(projectRoot, 'project')));
  }
  items.sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
  return json({ ok: true, items });
}

async function trashRestore(ctx, request) {
  const input = await bodyJson(request);
  const projectRoot = await knownRoot(ctx, input.root);
  const projectId = await restoreTrash(projectRoot, input.trashId, 'project');
  const { project, dir } = await loadProject(projectRoot, projectId);
  return json({ ok: true, project: publicProject(project, dir, await inspectFiles(dir)) });
}

async function trashPurge(ctx, request) {
  const input = await bodyJson(request);
  const projectRoot = await knownRoot(ctx, input.root);
  await purgeTrash(projectRoot, input.trashId, 'project');
  return json({ ok: true });
}

/**
 * Register the studio's owner-only exact routes on the shared DSH connection.
 * @param ctx - Host context carrying `connection`.
 * @param options - package assets directory.
 */
export function installRoutes(ctx, options) {
  const assetsDir = options.assetsDir;
  const handlers = [
    {
      path: '/api/trpg-studio/info',
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: () => info(ctx, assetsDir, options.version).catch(failure),
    },
    {
      path: '/api/trpg-studio/projects',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: (request) => create(ctx, assetsDir, request).catch(failure),
    },
    {
      path: '/api/trpg-studio/upload',
      methods: ['POST'],
      requestBody: 'streaming',
      fetch: (request) => upload(ctx, request).catch(failure),
    },
    {
      path: '/api/trpg-studio/finalize',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: (request) => finalize(ctx, request).catch(failure),
    },
    {
      path: '/api/trpg-studio/list',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: () => list(ctx, assetsDir).catch(failure),
    },
    {
      path: '/api/trpg-studio/action',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: (request) => action(ctx, request).catch(failure),
    },
    {
      path: '/api/trpg-studio/delete',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: (request) => remove(ctx, request).catch(failure),
    },
    {
      path: '/api/trpg-studio/trash/list',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: () => trashList(ctx).catch(failure),
    },
    {
      path: '/api/trpg-studio/trash/restore',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: (request) => trashRestore(ctx, request).catch(failure),
    },
    {
      path: '/api/trpg-studio/trash/purge',
      methods: ['POST'],
      requestBody: 'buffered',
      fetch: (request) => trashPurge(ctx, request).catch(failure),
    },
    {
      path: '/api/trpg-studio/file',
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: (request) => file(ctx, request).catch(failure),
    },
    {
      path: '/api/trpg-studio/demo',
      methods: ['GET'],
      requestBody: 'buffered',
      fetch: (request) => demo(assetsDir, request).catch(failure),
    },
  ];
  for (const handler of handlers) {
    ctx.effect(
      () => ctx.connection.fetch.register(handler),
      `trpg-studio: exact route ${handler.path}`,
    );
  }
}

import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  exists,
  httpError,
  nowIso,
  readJson,
  safeJoin,
  safeProjectId,
  writeJsonAtomic,
} from './util.mjs';

export const TRASH_DIRNAME = '.trash';
const META_FILENAME = 'trash-meta.json';
const TRASH_ID = /^[a-z0-9][a-z0-9-]*__\d{8}-\d{6}(-\d+)?$/;

const KINDS = {
  project: { prefix: 'project-', doc: 'project.json', label: '项目' },
  sheet: { prefix: 'sheet-', doc: 'sheet.json', label: '人物卡项目' },
};

function kindOf(kind) {
  const value = KINDS[kind];
  if (!value) throw httpError(400, '回收站类型无效。');
  return value;
}

function stamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

function trashRootOf(root) {
  return path.join(root, TRASH_DIRNAME);
}

function requireTrashId(value) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!TRASH_ID.test(id)) throw httpError(400, '回收站编号无效。');
  return id;
}

async function readMeta(trashDir) {
  return readJson(path.join(trashDir, META_FILENAME), null);
}

/** Move one project directory into `<root>/.trash` and record its metadata. */
export async function trashProject(root, id, kind = 'project') {
  const config = kindOf(kind);
  const safe = safeProjectId(id);
  if (!safe.startsWith(config.prefix)) throw httpError(400, '项目 ID 与类型不匹配。');
  const dir = path.join(root, safe);
  if (!(await exists(path.join(dir, config.doc)))) throw httpError(404, '找不到这个项目。');

  const document = await readJson(path.join(dir, config.doc), null);
  const title = String(document?.title || safe);
  const trashRoot = trashRootOf(root);
  await fs.mkdir(trashRoot, { recursive: true });

  const createdAt = nowIso();
  let name = `${safe}__${stamp()}`;
  let suffix = 2;
  while (await exists(path.join(trashRoot, name))) {
    name = `${safe}__${stamp()}-${suffix}`;
    suffix += 1;
  }
  const destination = safeJoin(trashRoot, name);

  try {
    await fs.rename(dir, destination);
  } catch (error) {
    const code = error?.code;
    if (code === 'EXDEV') {
      await fs.cp(dir, destination, { recursive: true });
      await fs.rm(dir, { recursive: true, force: true });
    } else if (code === 'EPERM' || code === 'EBUSY' || code === 'EACCES') {
      throw httpError(409, '项目文件正被占用（可能 Agent 还在写），请先让它停下再删除。');
    } else {
      throw error;
    }
  }

  const meta = {
    version: 1,
    id: safe,
    kind,
    title,
    deletedAt: createdAt,
    originalRoot: path.resolve(root),
  };
  await writeJsonAtomic(path.join(destination, META_FILENAME), meta);
  return {
    trashId: name,
    id: safe,
    title,
    deletedAt: createdAt,
  };
}

/** List the trash of one root for one kind. */
export async function listTrash(root, kind = 'project') {
  kindOf(kind);
  const trashRoot = trashRootOf(root);
  let entries;
  try {
    entries = await fs.readdir(trashRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  const rows = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !TRASH_ID.test(entry.name)) continue;
    const meta = await readMeta(path.join(trashRoot, entry.name));
    if (!meta || meta.kind !== kind) continue;
    rows.push({
      root: path.resolve(root),
      trashId: entry.name,
      id: String(meta.id || ''),
      title: String(meta.title || meta.id || ''),
      deletedAt: String(meta.deletedAt || ''),
    });
  }
  rows.sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
  return rows;
}

/** Restore one trashed project back to its original root. */
export async function restoreTrash(root, trashId, kind = 'project') {
  kindOf(kind);
  const safeId = requireTrashId(trashId);
  const trashRoot = trashRootOf(root);
  const source = safeJoin(trashRoot, safeId);
  const meta = await readMeta(source);
  if (!meta || meta.kind !== kind) throw httpError(404, '回收站里没有这一项。');

  const id = safeProjectId(meta.id);
  const destination = path.join(root, id);
  if (await exists(destination)) {
    throw httpError(409, '原位置已经有同名项目，无法恢复；请先处理冲突。');
  }
  try {
    await fs.rename(source, destination);
  } catch (error) {
    if (error?.code === 'EXDEV') {
      await fs.cp(source, destination, { recursive: true });
      await fs.rm(source, { recursive: true, force: true });
    } else {
      throw error;
    }
  }
  await fs.rm(path.join(destination, META_FILENAME), { force: true });
  return id;
}

/** Permanently delete one trashed project. */
export async function purgeTrash(root, trashId, kind = 'project') {
  kindOf(kind);
  const safeId = requireTrashId(trashId);
  const source = safeJoin(trashRootOf(root), safeId);
  const meta = await readMeta(source);
  if (!meta || meta.kind !== kind) throw httpError(404, '回收站里没有这一项。');
  await fs.rm(source, { recursive: true, force: true });
  return true;
}

export { TRASH_ID };

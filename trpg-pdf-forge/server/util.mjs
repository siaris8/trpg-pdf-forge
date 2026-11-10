import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const PROJECT_ID = /^[a-z0-9][a-z0-9-]{2,80}$/;

export function nowIso() {
  return new Date().toISOString();
}

export function clampText(value, max = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function safeProjectId(value) {
  const id = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!PROJECT_ID.test(id)) throw httpError(400, '项目编号无效。');
  return id;
}

/** Resolve a path below base; reject absolute paths, drive letters, `..` and NUL. */
export function safeJoin(base, ...parts) {
  const joined = path.resolve(base, ...parts);
  const root = path.resolve(base);
  const relative = path.relative(root, joined);
  if (relative === '' || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw httpError(400, '文件路径超出项目目录。');
  }
  return joined;
}

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

export async function readJson(file, fallback = undefined) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT' && fallback !== undefined) return fallback;
    if (fallback !== undefined) return fallback;
    throw error;
  }
}

export async function writeTextAtomic(file, text) {
  await ensureDir(path.dirname(file));
  const temp = `${file}.${randomUUID().slice(0, 8)}.tmp`;
  await fs.writeFile(temp, text, 'utf8');
  try {
    await fs.rename(temp, file);
  } catch (error) {
    await fs.rm(temp, { force: true }).catch(() => {});
    throw error;
  }
}

export async function writeJsonAtomic(file, value) {
  await writeTextAtomic(file, `${JSON.stringify(value, null, 2)}\n`);
}

export async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function fileSize(file) {
  try {
    return (await fs.stat(file)).size;
  } catch {
    return 0;
  }
}

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function httpError(status, message, code = undefined) {
  const error = new Error(message);
  error.status = status;
  if (code) error.code = code;
  return error;
}

export function serveError(error) {
  return {
    status: Number.isInteger(error?.status) ? error.status : 500,
    body: {
      ok: false,
      error: {
        code: error?.code || (Number.isInteger(error?.status) ? 'request-failed' : 'internal-error'),
        message: error?.message || '工坊遇到未知错误。',
      },
    },
  };
}

export function mimeFor(file) {
  const extension = path.extname(file).toLowerCase();
  return {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }[extension] || 'application/octet-stream';
}

export function isImageName(name) {
  return /\.(png|jpe?g|webp)$/i.test(name);
}

export function isAllowedGlossaryName(name) {
  return /\.(csv|tsv|txt|md|json|xlsx|xls)$/i.test(name);
}

export function isPdfName(name) {
  return /\.pdf$/i.test(name);
}

export function displayName(name, fallback = 'file') {
  const base = path.basename(String(name || fallback)).replace(/[\u0000-\u001f<>:"/\\|?*]/g, '_').trim();
  return base.slice(0, 120) || fallback;
}

export function uniqueName(name, used) {
  const parsed = path.parse(name);
  let candidate = name;
  let index = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${parsed.name}-${index}${parsed.ext}`;
    index += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

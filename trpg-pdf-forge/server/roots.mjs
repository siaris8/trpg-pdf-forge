import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  PROJECTS_DIRNAME,
  SHEET_DIRNAME,
  resolveProfileBase,
  resolveProjectsRoot,
  resolveSheetRoot,
} from './config.mjs';
import { readJson, writeJsonAtomic } from './util.mjs';

const ROOTS_FILENAME = 'trpg-studio-roots.json';
const ROOTS_VERSION = 1;

/** Normalize a candidate directory; returns null for empty/invalid values. */
export function normalizeRoot(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const resolved = path.resolve(value.trim());
    return resolved.length > 1 ? resolved.replace(/[\\/]+$/, '') : resolved;
  } catch {
    return null;
  }
}

function samePath(a, b) {
  const left = normalizeRoot(a);
  const right = normalizeRoot(b);
  if (!left || !right) return false;
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

async function isDirectory(value) {
  try {
    return (await fs.stat(value)).isDirectory();
  } catch {
    return false;
  }
}

/** A root is worth remembering only when it contains a real project directory. */
export async function rootHasEntries(root, dirname) {
  const pattern = dirname === PROJECTS_DIRNAME ? /^project-[a-z0-9-]+$/ : /^sheet-[a-z0-9-]+$/;
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    return entries.some((entry) => entry.isDirectory() && (entry.name === '.trash' || pattern.test(entry.name)));
  } catch {
    return false;
  }
}

async function filterExistingRoots(values, dirname) {
  const kept = [];
  for (const value of uniquePaths(values)) {
    if (await rootHasEntries(value, dirname)) kept.push(value);
  }
  return kept;
}

/**
 * Decode one DSH session directory name back into its workspace path.
 * DSH encodes the cwd as `--` + escaped path + `--`, where a non-ASCII code
 * unit becomes `~XXXX` (hex) and separators become `-`.
 * This is a best-effort recovery hint: a wrong guess is filtered by existence.
 */
export function decodeSessionWorkspaceName(name) {
  if (process.platform !== 'win32' || typeof name !== 'string') return null;
  const match = /^--(.+)--$/.exec(name);
  if (!match) return null;
  const decoded = match[1].replace(/~([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const dash = decoded.indexOf('-');
  if (dash < 1) return null;
  const drive = decoded.slice(0, dash);
  if (!/^[A-Za-z]$/.test(drive)) return null;
  const rest = decoded.slice(dash + 1).replace(/-/g, '\\');
  return `${drive}:\\${rest}`;
}

/** Workspaces that only exist in DSH's session history (e.g. removed from the registry). */
export async function decodeSessionWorkspaces() {
  if (process.platform !== 'win32') return [];
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
  let entries;
  try {
    entries = await fs.readdir(path.join(home, 'sessions'), { withFileTypes: true });
  } catch {
    return [];
  }
  const found = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const decoded = decodeSessionWorkspaceName(entry.name);
    if (decoded && (await isDirectory(decoded))) found.push(decoded);
  }
  return found;
}

async function workspacePathsOf(ctx) {
  const values = [];
  try {
    const registry = typeof ctx?.get === 'function' ? ctx.get('workspaceRegistry') : ctx?.workspaceRegistry;
    for (const workspace of registry?.list?.() || []) {
      if (workspace?.path) values.push(workspace.path);
    }
  } catch {
    // Optional service: absence is not an error.
  }
  try {
    for (const session of ctx?.sessions?.list?.() || []) {
      const cwd = session?.header?.cwd || session?.meta?.cwd || session?.cwd;
      if (typeof cwd === 'string' && cwd.trim()) values.push(cwd);
    }
  } catch {
    // Session listing is best-effort.
  }
  return values;
}

async function collectBases(ctx) {
  const bases = new Set();
  const add = (value) => {
    const normalized = normalizeRoot(value);
    if (normalized) bases.add(normalized);
  };
  for (const value of await workspacePathsOf(ctx)) add(value);
  for (const value of await decodeSessionWorkspaces()) add(value);
  add(resolveProfileBase());
  for (const value of String(process.env.TRPG_STUDIO_LEGACY_ROOTS || '').split(';')) add(value);
  return [...bases];
}

/**
 * Merge and normalize candidate roots in priority order:
 * current -> remembered -> every discovered workspace -> explicit legacy bases.
 * `requireExists` filters paths that are not directories; the current root is
 * allowed to be missing because the caller creates it.
 */
export async function buildRootList({ current, stored = [], bases = [], dirname, requireExists = true }) {
  const rows = [];
  const seen = new Set();
  const push = async (value, allowMissing = false) => {
    const normalized = normalizeRoot(value);
    if (!normalized) return;
    const key = process.platform === 'win32' ? normalized.toLowerCase() : normalized;
    if (seen.has(key)) return;
    if (!allowMissing && requireExists && !(await isDirectory(normalized))) return;
    seen.add(key);
    rows.push(normalized);
  };
  await push(current, true);
  for (const value of stored) await push(value, false);
  for (const base of bases) await push(path.join(base, dirname), false);
  return rows;
}

function knownRootsPath() {
  return path.join(resolveProfileBase(), ROOTS_FILENAME);
}

function uniquePaths(values) {
  const rows = [];
  const seen = new Set();
  for (const value of values) {
    const normalized = normalizeRoot(value);
    if (!normalized) continue;
    const key = process.platform === 'win32' ? normalized.toLowerCase() : normalized;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(normalized);
  }
  return rows;
}

async function readKnownRoots() {
  const value = await readJson(knownRootsPath(), null);
  return {
    projects: Array.isArray(value?.projects) ? uniquePaths(value.projects) : [],
    sheets: Array.isArray(value?.sheets) ? uniquePaths(value.sheets) : [],
  };
}

let persistChain = Promise.resolve();

function persistKnownRoots(projects, sheets) {
  persistChain = persistChain
    .then(async () => {
      const current = await readKnownRoots();
      const next = {
        version: ROOTS_VERSION,
        projects: await filterExistingRoots([...current.projects, ...projects], PROJECTS_DIRNAME),
        sheets: await filterExistingRoots([...current.sheets, ...sheets], SHEET_DIRNAME),
      };
      await writeJsonAtomic(knownRootsPath(), next);
      return next;
    })
    .catch(() => undefined);
  return persistChain;
}

/** Wait for any pending roots-file write (used by tests and shutdown). */
export function flushRootPersistence() {
  return persistChain;
}

async function rootsFor(ctx, { current, dirname, allowOverride }) {
  if (allowOverride) return [current];
  const known = await readKnownRoots();
  const bases = await collectBases(ctx);
  const remembered = dirname === PROJECTS_DIRNAME ? known.projects : known.sheets;
  const roots = await buildRootList({ current, stored: remembered, bases, dirname });
  const visible = [];
  for (const root of roots) {
    if (await rootHasEntries(root, dirname) || samePath(root, current)) visible.push(root);
  }
  // Remember everything with actual projects, never an empty workspace that was
  // merely opened once. The current (possibly missing/empty) root stays visible
  // for project creation but is not persisted until a project exists.
  void persistKnownRoots(
    dirname === PROJECTS_DIRNAME ? visible : known.projects,
    dirname === SHEET_DIRNAME ? visible : known.sheets,
  );
  return visible;
}

/** Every known PDF project root, newest source first. */
export async function resolveProjectRoots(ctx) {
  return rootsFor(ctx, {
    current: resolveProjectsRoot(ctx),
    dirname: PROJECTS_DIRNAME,
    allowOverride: Boolean(process.env.TRPG_STUDIO_ROOT),
  });
}

/** Every known Excel sheet root, paired with the project roots. */
export async function resolveSheetRoots(ctx) {
  return rootsFor(ctx, {
    current: resolveSheetRoot(ctx),
    dirname: SHEET_DIRNAME,
    allowOverride: Boolean(process.env.TRPG_SHEET_ROOT),
  });
}

export { samePath, isDirectory };

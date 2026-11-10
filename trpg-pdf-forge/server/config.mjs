import os from 'node:os';
import path from 'node:path';

export const PROJECTS_DIRNAME = 'trpg-projects';
export const SHEET_DIRNAME = 'trpg-sheets';
export const MAX_PDF_BYTES = 150 * 1024 * 1024;
export const MAX_GLOSSARY_BYTES = 20 * 1024 * 1024;
export const MAX_ASSET_BYTES = 20 * 1024 * 1024;

/**
 * Profile-scoped data directory. Deliberately independent of the live session
 * workspace so the studio's bookkeeping never moves when the user switches
 * workspace.
 */
export function resolveProfileBase() {
  return path.resolve(
    process.env.DSH_PROFILE_DIR || process.env.DSH_HOME || path.join(os.homedir(), '.dsh'),
  );
}

function sessionWorkspace(ctx) {
  try {
    const sessions = typeof ctx?.sessions?.list === 'function' ? ctx.sessions.list() : [];
    let cwd;
    for (const session of sessions) {
      const candidate = session?.header?.cwd || session?.meta?.cwd || session?.cwd;
      if (typeof candidate === 'string' && candidate.trim()) cwd = candidate;
    }
    return cwd;
  } catch {
    return undefined;
  }
}

/**
 * Root that receives newly created PDF projects: explicit override, else the
 * live session workspace (so the Agent keeps write permission), else the profile.
 * Recomputed on every call; no process-wide cache to go stale.
 */
export function resolveProjectsRoot(ctx) {
  const override = process.env.TRPG_STUDIO_ROOT;
  if (override) return path.resolve(override);
  const cwd = sessionWorkspace(ctx);
  if (cwd) return path.join(path.resolve(cwd), PROJECTS_DIRNAME);
  return path.join(resolveProfileBase(), PROJECTS_DIRNAME);
}

/** Root that receives newly created Excel sheet projects (sibling of the PDF root). */
export function resolveSheetRoot(ctx) {
  const override = process.env.TRPG_SHEET_ROOT;
  if (override) return path.resolve(override);
  return path.join(path.dirname(resolveProjectsRoot(ctx)), SHEET_DIRNAME);
}

import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  clampText,
  displayName,
  ensureDir,
  exists,
  httpError,
  nowIso,
  readJson,
  safeJoin,
  safeProjectId,
  sha256,
  writeJsonAtomic,
  writeTextAtomic,
} from './util.mjs';
import { buildSheetTask } from './sheet-prompt.mjs';
import { resolveSheetRoot } from './config.mjs';

const ALLOWED_SOURCE = /\.(pdf|docx|md|txt|csv|xlsx)$/i;
const MAX_SOURCE_BYTES = 50 * 1024 * 1024;

function projectId() {
  return `sheet-${Date.now().toString(36)}-${randomUUID().slice(0, 6)}`;
}

export { resolveSheetRoot };

async function sourceFiles(dir) {
  const sourceDir = path.join(dir, 'source');
  if (!(await exists(sourceDir))) return [];
  return (await fs.readdir(sourceDir))
    .filter((name) => name === 'brief.md' || /^source\.[a-z0-9]+$/i.test(name))
    .map((name) => path.join(sourceDir, name));
}

async function inspect(dir) {
  const project = await readJson(path.join(dir, 'sheet.json'), null);
  if (!project) throw httpError(404, '项目不存在。');
  const sources = await sourceFiles(dir);
  const brief = sources.some((file) => path.basename(file) === 'brief.md');
  const sourcePath = project.source?.path ? path.join(dir, project.source.path) : null;
  const source = Boolean(sourcePath && (await exists(sourcePath)));
  const plan = (await exists(path.join(dir, 'work', 'sheet-plan.json')))
    ? await readJson(path.join(dir, 'work', 'sheet-plan.json'), null)
    : null;
  const workbook = await exists(path.join(dir, 'out', 'character-sheet.xlsx'));
  const qa = (await exists(path.join(dir, 'out', 'SHEET-QA.json')))
    ? await readJson(path.join(dir, 'out', 'SHEET-QA.json'), null)
    : null;
  const report = await exists(path.join(dir, 'out', 'SHEET-REPORT.md'));
  const review = (await exists(path.join(dir, 'SHEET-REVIEW.json')))
    ? await readJson(path.join(dir, 'SHEET-REVIEW.json'), null)
    : project.review || null;
  const qaOk = qa?.ok === true;
  let status = 'ready';
  if (!source && !brief) status = 'draft';
  else if (review?.decision === 'changes') status = 'changes';
  else if (review?.decision === 'approve' && workbook && qaOk && plan && report) status = 'done';
  else if (workbook && qa && !qaOk) status = 'warning';
  else if (workbook && qa) status = 'review';
  return {
    project: { ...project, review },
    source,
    brief,
    sources,
    plan,
    workbook,
    qa,
    qaOk,
    report,
    review,
    status,
    files: {
      source,
      brief,
      plan: Boolean(plan),
      workbook,
      qa: Boolean(qa),
      qaOk,
      report,
      formulas: Number(qa?.formulas || 0),
      namedRanges: Number(qa?.namedRanges || 0),
      steps: Number(qa?.steps || plan?.steps?.length || 0),
      ambiguities: Array.isArray(qa?.ambiguities) ? qa.ambiguities : (plan?.ambiguities || []),
    },
  };
}

export function sheetPublic(state, dir) {
  const task = path.join(dir, 'SHEET-TASK.md');
  const prompt = `请读取并执行这个 Excel 人物卡项目：\n${task}\n\n先分析源规则/译文，再生成可计算的工作簿；完成后运行 sheet-check.py 并停下等待审核。`;
  return {
    id: state.project.id,
    title: state.project.title,
    system: state.project.system,
    createdAt: state.project.createdAt,
    updatedAt: state.project.updatedAt,
    notes: state.project.notes,
    sourceLang: state.project.sourceLang,
    options: state.project.options,
    status: state.status,
    files: state.files,
    source: state.project.source || null,
    review: state.review,
    path: dir,
    root: path.dirname(dir),
    prompts: { start: prompt, revise: prompt },
  };
}

export async function createSheetProject(root, assetsDir, input = {}) {
  await ensureDir(root);
  const id = projectId();
  const dir = path.join(root, id);
  await ensureDir(path.join(dir, 'source'));
  await ensureDir(path.join(dir, 'work'));
  await ensureDir(path.join(dir, 'out'));
  await fs.cp(assetsDir, path.join(dir, '.trpg'), {
    recursive: true,
    force: true,
    filter: (source) => !source.split(path.sep).includes('demo'),
  });
  const project = {
    version: 1,
    id,
    kind: 'excel-character-sheet',
    title: clampText(input.title, 120) || '未命名人物卡',
    system: clampText(input.system, 120) || '自定义规则',
    sourceLang: input.sourceLang || 'zh-CN',
    notes: clampText(input.notes, 4000),
    options: {
      includeSpells: input.includeSpells !== false,
      includeEquipment: input.includeEquipment !== false,
      formulaMode: 'standard',
    },
    source: null,
    review: { decision: null, note: '', at: null },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  if (project.notes) {
    await writeTextAtomic(path.join(dir, 'source', 'brief.md'), `# 补充规则/说明\n\n${project.notes}\n`);
  }
  await writeJsonAtomic(path.join(dir, 'sheet.json'), project);
  await refreshTask(project, dir);
  const state = await inspect(dir);
  return sheetPublic(state, dir);
}

async function refreshTask(project, dir) {
  const content = buildSheetTask(project, dir);
  await writeTextAtomic(path.join(dir, 'SHEET-TASK.md'), content);
  project.updatedAt = nowIso();
  await writeJsonAtomic(path.join(dir, 'sheet.json'), project);
}

export async function loadSheetProject(root, id) {
  const safe = safeProjectId(id);
  if (!safe.startsWith('sheet-')) throw httpError(400, '项目 ID 无效。');
  const dir = safeJoin(root, safe);
  const state = await inspect(dir);
  return { ...state, dir };
}

export async function saveSheetSource(root, id, rawName, stream, limit = MAX_SOURCE_BYTES) {
  const safe = safeProjectId(id);
  if (!safe.startsWith('sheet-')) throw httpError(400, '项目 ID 无效。');
  const dir = safeJoin(root, safe);
  const { project } = await loadSheetProject(root, safe);
  const name = displayName(rawName, 'source.txt');
  if (!ALLOWED_SOURCE.test(name)) throw httpError(415, '支持 PDF、DOCX、MD、TXT、CSV、XLSX。');
  await ensureDir(path.join(dir, 'source'));
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > limit) throw httpError(413, '源文件超过 50 MB。');
    chunks.push(buffer);
  }
  if (!total) throw httpError(400, '文件为空。');
  const data = Buffer.concat(chunks);
  if (/\.pdf$/i.test(name) && data.subarray(0, 5).toString('ascii') !== '%PDF-') {
    throw httpError(415, '这个文件不是有效的 PDF。');
  }
  const target = path.join(dir, 'source', `source${path.extname(name).toLowerCase()}`);
  await fs.writeFile(target, data);
  project.source = {
    path: `source/${path.basename(target)}`,
    name,
    bytes: total,
    sha256: sha256(data),
    uploadedAt: nowIso(),
  };
  project.updatedAt = nowIso();
  await writeJsonAtomic(path.join(dir, 'sheet.json'), project);
  await refreshTask(project, dir);
  return { ok: true, path: project.source.path, bytes: total, name, sha256: project.source.sha256 };
}

export async function finalizeSheetProject(root, id) {
  const { project, dir } = await loadSheetProject(root, id);
  if (!project.source && !(await exists(path.join(dir, 'source', 'brief.md')))) {
    throw httpError(409, '请先上传规则文件，或在补充说明里粘贴规则/译文。');
  }
  await refreshTask(project, dir);
  const state = await inspect(dir);
  return { ok: true, project: sheetPublic(state, dir), task: await fs.readFile(path.join(dir, 'SHEET-TASK.md'), 'utf8') };
}

export async function writeSheetReview(root, id, decision, note = '') {
  const { project, dir } = await loadSheetProject(root, id);
  if (decision !== 'approve' && decision !== 'changes') throw httpError(400, '审核决定无效。');
  if (decision === 'changes' && !clampText(note, 2000)) throw httpError(400, '请写下需要修改的地方。');
  if (decision === 'approve') {
    if (!(await exists(path.join(dir, 'out', 'character-sheet.xlsx')))) throw httpError(409, '还没有生成 character-sheet.xlsx。');
    const qa = await readJson(path.join(dir, 'out', 'SHEET-QA.json'), null);
    if (!qa || qa.ok !== true) throw httpError(409, 'SHEET-QA 尚未通过，请先运行 sheet-check.py。');
    if (!(await exists(path.join(dir, 'work', 'sheet-plan.json')))) throw httpError(409, '缺少 work/sheet-plan.json。');
    if (!(await exists(path.join(dir, 'out', 'SHEET-REPORT.md')))) throw httpError(409, '缺少 out/SHEET-REPORT.md。');
  }
  const review = { decision, note: clampText(note, 2000), at: nowIso() };
  await writeJsonAtomic(path.join(dir, 'SHEET-REVIEW.json'), review);
  project.review = review;
  project.updatedAt = nowIso();
  await writeJsonAtomic(path.join(dir, 'sheet.json'), project);
  await refreshTask(project, dir);
  const state = await inspect(dir);
  return { ok: true, project: sheetPublic(state, dir), task: await fs.readFile(path.join(dir, 'SHEET-TASK.md'), 'utf8') };
}

export async function listSheetProjects(root) {
  if (!(await exists(root))) return [];
  const rows = [];
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^sheet-[a-z0-9-]+$/.test(entry.name)) continue;
    try {
      const state = await inspect(path.join(root, entry.name));
      rows.push(sheetPublic(state, path.join(root, entry.name)));
    } catch {
      // Skip damaged projects.
    }
  }
  rows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return rows;
}

/** Aggregate every known sheet root into one list, newest first. */
export async function listAllSheetProjects(roots) {
  const rows = [];
  for (const root of roots) {
    const batch = await listSheetProjects(root);
    rows.push(...batch);
  }
  rows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return rows;
}

/** Find the root that owns a sheet project id, or null. */
export async function findSheetRoot(roots, id) {
  const safe = safeProjectId(id);
  if (!safe.startsWith('sheet-')) throw httpError(400, '项目 ID 无效。');
  for (const root of roots) {
    if (await exists(path.join(root, safe, 'sheet.json'))) return root;
  }
  return null;
}

export async function sheetFileStat(dir, relative) {
  const file = safeJoin(dir, relative);
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw httpError(404, '文件不存在。');
  return { file, size: stat.size };
}

export { MAX_SOURCE_BYTES };

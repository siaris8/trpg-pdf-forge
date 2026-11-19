import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { deriveWorkflow, reviewGate, statusFromWorkflow } from './workflow.mjs';
import {
  clampText,
  displayName,
  ensureDir,
  exists,
  fileSize,
  httpError,
  isAllowedGlossaryName,
  isImageName,
  isPdfName,
  nowIso,
  readJson,
  safeJoin,
  safeProjectId,
  uniqueName,
  writeJsonAtomic,
  writeTextAtomic,
} from './util.mjs';
import { buildTask, promptsFor } from './prompt.mjs';

const DEFAULT_OPTIONS = {
  style: 'paper-archive',
  fontPair: 'wps-safe',
  wideTables: 'auto',
  imageFallback: 'table-or-text',
};

function projectDir(root, id) {
  return safeJoin(root, safeProjectId(id));
}

function projectRelative(dir, file) {
  return path.relative(dir, file).split(path.sep).join('/');
}

function defaultProject(id, title, input) {
  const now = nowIso();
  const options = { ...DEFAULT_OPTIONS };
  if (input?.options && typeof input.options === 'object') {
    for (const key of Object.keys(DEFAULT_OPTIONS)) {
      if (typeof input.options[key] === 'string' && input.options[key].trim()) {
        options[key] = input.options[key].trim().slice(0, 80);
      }
    }
  }
  return {
    version: 1,
    id,
    title,
    titlePolicy: input?.titlePolicy === 'strict' ? 'strict' : 'legacy',
    schemaVersion: 3,
    createdAt: now,
    updatedAt: now,
    sourceLang: clampText(input?.sourceLang, 40) || 'en',
    targetLang: clampText(input?.targetLang, 40) || 'zh-CN',
    options,
    source: null,
    glossary: {
      mode: input?.glossaryMode === 'uploaded' ? 'uploaded' : 'blank',
      original: null,
      filled: false,
    },
    review: {
      decision: null,
      note: '',
      at: null,
    },
  };
}

export async function createProject(root, assetsDir, input = {}) {
  await ensureDir(root);
  const title = clampText(input.title, 160) || '未命名模组';
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const id = `project-${stamp}-${randomUUID().slice(0, 4)}`;
  const dir = projectDir(root, id);
  await ensureDir(dir);
  await Promise.all([
    ensureDir(path.join(dir, 'source')),
    ensureDir(path.join(dir, 'glossary', 'original')),
    ensureDir(path.join(dir, 'assets', 'user')),
    ensureDir(path.join(dir, 'work')),
    ensureDir(path.join(dir, 'book', 'pass1')),
    ensureDir(path.join(dir, 'out', 'pass1')),
    ensureDir(path.join(dir, '.trpg')),
  ]);
  try {
    await fs.cp(assetsDir, path.join(dir, '.trpg'), {
      recursive: true,
      force: true,
      filter: (source) => !source.split(path.sep).includes('demo'),
    });
  } catch (error) {
    // The project is still usable without the copied helper files; surface the cause.
    throw httpError(500, `无法复制工坊模板：${error.message}`);
  }
  const project = defaultProject(id, title, input);
  await writeJsonAtomic(path.join(dir, 'project.json'), project);
  if (project.glossary.mode === 'blank') {
    await writeBlankGlossary(dir);
  }
  await writeTextAtomic(
    path.join(dir, 'README.md'),
    `# ${title}\n\n这是「TRPG 翻译工坊」项目。\n\n- 任务书：\`TASK.md\`\n- 源文件：\`source/source.pdf\`\n- 术语表：\`glossary/glossary.csv\`\n- 首轮样张：\`out/pass1/\`\n- 最终文件：\`out/book.pdf\`\n\n请让 Agent 先读 \`TASK.md\`，不要直接开始全篇。\n`,
  );
  await refreshTask(project, dir);
  return publicProject(project, dir, await inspectFiles(dir));
}

export async function writeBlankGlossary(dir) {
  const csv = '\uFEFFsource,target,category,notes,locked\n';
  await ensureDir(path.join(dir, 'glossary'));
  await fs.writeFile(path.join(dir, 'glossary', 'glossary.csv'), csv, 'utf8');
  await writeTextAtomic(
    path.join(dir, 'glossary', 'README.md'),
    `# 术语表\n\n这个表由 Agent 在翻译前填满。\n\n- 不要删除用户提供的条目。\n- 锁定条目的 \`locked\` 必须保持为 \`1\`。\n- 专名、规则术语、骰式、组织名全篇一致。\n- 空表也要先填再翻译；完成后另存为 \`glossary.filled.csv\`。\n\n列：\`source,target,category,notes,locked\`。\n`,
  );
}

async function ensureBlankGlossary(dir) {
  const file = path.join(dir, 'glossary', 'glossary.csv');
  if (!(await exists(file))) await writeBlankGlossary(dir);
}

async function refreshTask(project, dir) {
  const reviewPath = path.join(dir, 'REVIEW.json');
  const review = await readJson(reviewPath, null);
  if (review && review.decision) {
    project.review = {
      decision: review.decision === 'approve' ? 'approve' : 'changes',
      note: String(review.note || ''),
      at: String(review.at || ''),
    };
  }
  let gate = 'pass1';
  if (project.review.decision === 'approve') gate = 'full';
  else if (project.review.decision === 'changes') gate = 'revision';
  const task = buildTask(project, dir, gate);
  await writeTextAtomic(path.join(dir, 'TASK.md'), task);
  project.updatedAt = nowIso();
  await writeJsonAtomic(path.join(dir, 'project.json'), project);
  return task;
}

export async function loadProject(root, id) {
  const dir = projectDir(root, id);
  const project = await readJson(path.join(dir, 'project.json'), null);
  if (!project) throw httpError(404, '找不到这个项目。');
  return { project, dir };
}

function layoutSummaryOf(report) {
  if (!report || typeof report !== 'object') {
    return { ok: false, strong: 0, mild: 0, mergeGroups: 0, pages: [] };
  }
  const pages = (Array.isArray(report.pages) ? report.pages : [])
    .filter((item) => item?.level === 'strong' || item?.level === 'mild')
    .slice(0, 3)
    .map((item) => ({
      source: String(item.source || ''),
      page: Number(item.page || 0),
      fill: Number(item.fill || 0),
      level: String(item.level || ''),
      reason: String(item.reason || ''),
    }));
  return {
    ok: report.ok === true,
    strong: Number(report.summary?.strong || 0),
    mild: Number(report.summary?.mild || 0),
    mergeGroups: Array.isArray(report.mergeGroups) ? report.mergeGroups.length : 0,
    pages,
  };
}

async function inspectFiles(dir) {
  const [
    source,
    previewPdf,
    previewPng,
    hardPdf,
    hardPng,
    contact,
    book,
    bookHtml,
    qaJson,
    qaMd,
    imageCheckJson,
    report,
    translationReport,
    glossaryCsv,
    glossaryMd,
    tablePlanJson,
    sourceCards,
    bookmarksJson,
    pass1PreviewQaJson,
    pass1HardQaJson,
    fullImageCheckJson,
    pagesDir,
    taskFile,
    pass1LayoutJson,
    layoutJson,
    progressJson,
    batchesJson,
    termQaJson,
  ] = await Promise.all([
    exists(path.join(dir, 'source', 'source.pdf')),
    exists(path.join(dir, 'out', 'pass1', 'preview.pdf')),
    exists(path.join(dir, 'out', 'pass1', 'preview.png')),
    exists(path.join(dir, 'out', 'pass1', 'hard.pdf')),
    exists(path.join(dir, 'out', 'pass1', 'hard.png')),
    exists(path.join(dir, 'out', 'pass1', 'contact-sheet.png')),
    exists(path.join(dir, 'out', 'book.pdf')),
    exists(path.join(dir, 'out', 'book.html')),
    exists(path.join(dir, 'out', 'QA.json')),
    exists(path.join(dir, 'out', 'QA.md')),
    exists(path.join(dir, 'out', 'pass1', 'IMAGE-CHECK.json')),
    exists(path.join(dir, 'out', 'pass1', 'REPORT.md')),
    exists(path.join(dir, 'out', 'TRANSLATION-REPORT.md')),
    exists(path.join(dir, 'out', 'GLOSSARY.csv')),
    exists(path.join(dir, 'out', 'GLOSSARY.md')),
    exists(path.join(dir, 'out', 'TABLE-PLAN.json')),
    exists(path.join(dir, 'out', 'SOURCE-CARDS', 'INDEX.md')),
    exists(path.join(dir, 'out', 'BOOKMARKS.json')),
    exists(path.join(dir, 'out', 'pass1', 'preview-qa.json')),
    exists(path.join(dir, 'out', 'pass1', 'hard-qa.json')),
    exists(path.join(dir, 'out', 'IMAGE-CHECK.json')),
    exists(path.join(dir, 'out', 'pages')),
    exists(path.join(dir, 'TASK.md')),
    exists(path.join(dir, 'out', 'pass1', 'LAYOUT.json')),
    exists(path.join(dir, 'out', 'LAYOUT.json')),
    exists(path.join(dir, 'work', 'progress.json')),
    exists(path.join(dir, 'work', 'batches.json')),
    exists(path.join(dir, 'work', 'TERM-QA.json')),
  ]);
  const glossaryFilled = await exists(path.join(dir, 'glossary', 'glossary.filled.csv'));
  const glossary = await exists(path.join(dir, 'glossary', 'glossary.csv'));
  const qa = qaJson ? await readJson(path.join(dir, 'out', 'QA.json'), null) : null;
  const imageCheck = imageCheckJson ? await readJson(path.join(dir, 'out', 'pass1', 'IMAGE-CHECK.json'), null) : null;
  const fullImageCheck = fullImageCheckJson ? await readJson(path.join(dir, 'out', 'IMAGE-CHECK.json'), null) : null;
  const tablePlan = tablePlanJson ? await readJson(path.join(dir, 'out', 'TABLE-PLAN.json'), null) : null;
  const bookmarks = bookmarksJson ? await readJson(path.join(dir, 'out', 'BOOKMARKS.json'), null) : null;
  const pass1PreviewQa = pass1PreviewQaJson ? await readJson(path.join(dir, 'out', 'pass1', 'preview-qa.json'), null) : null;
  const pass1HardQa = pass1HardQaJson ? await readJson(path.join(dir, 'out', 'pass1', 'hard-qa.json'), null) : null;
  const pass1Layout = pass1LayoutJson ? await readJson(path.join(dir, 'out', 'pass1', 'LAYOUT.json'), null) : null;
  const fullLayout = layoutJson ? await readJson(path.join(dir, 'out', 'LAYOUT.json'), null) : null;
  const pass1Summary = layoutSummaryOf(pass1Layout);
  const fullSummary = layoutSummaryOf(fullLayout);
  const progressRaw = progressJson ? await readJson(path.join(dir, 'work', 'progress.json'), null) : null;
  const batchPlan = batchesJson ? await readJson(path.join(dir, 'work', 'batches.json'), null) : null;
  const termQa = termQaJson ? await readJson(path.join(dir, 'work', 'TERM-QA.json'), null) : null;
  const currentBatch = progressRaw?.current
    ? (progressRaw.batches || []).find((batch) => batch.id === progressRaw.current) || null
    : null;
  const proof = currentBatch
    ? await readJson(path.join(dir, 'work', 'batches', currentBatch.id, 'PROOF.json'), null)
    : null;
  const title = (await exists(path.join(dir, 'work', 'TITLE.json')))
    ? await readJson(path.join(dir, 'work', 'TITLE.json'), null)
    : null;
  const titleQa = (await exists(path.join(dir, 'work', 'TITLE-QA.json')))
    ? await readJson(path.join(dir, 'work', 'TITLE-QA.json'), null)
    : null;
  const nameQa = (await exists(path.join(dir, 'work', 'NAME-QA.json')))
    ? await readJson(path.join(dir, 'work', 'NAME-QA.json'), null)
    : null;
  const progress = progressRaw && typeof progressRaw === 'object'
    ? {
      ...progressRaw,
      plan: Boolean(batchPlan),
      batchCount: Array.isArray(batchPlan?.batches)
        ? batchPlan.batches.length
        : Array.isArray(progressRaw.batches) ? progressRaw.batches.length : 0,
    }
    : null;
  const reportText = report ? (await fs.readFile(path.join(dir, 'out', 'pass1', 'REPORT.md'), 'utf8')).slice(0, 1600) : '';
  const reportFullText = translationReport ? await fs.readFile(path.join(dir, 'out', 'TRANSLATION-REPORT.md'), 'utf8') : '';
  const taskHead = taskFile ? (await fs.readFile(path.join(dir, 'TASK.md'), 'utf8')).slice(0, 400) : '';
  const taskVersion = Number(taskHead.match(/TASK_VERSION:\s*(\d+)/)?.[1] || 0);
  return {
    source,
    glossary,
    glossaryFilled,
    previewPdf,
    previewPng,
    hardPdf,
    hardPng,
    contact,
    book,
    bookHtml,
    qa,
    qaMd,
    translationReport,
    glossaryCsv,
    glossaryMd,
    tablePlan: Boolean(tablePlan),
    tablePlanOk: tablePlan?.ok === true,
    sourceCards,
    bookmarksReport: Boolean(bookmarks),
    bookmarksReportOk: bookmarks?.ok === true,
    bookmarks: Number(qa?.bookmarks ?? bookmarks?.count ?? 0),
    pageMode: qa?.pageMode || bookmarks?.pageMode || null,
    imageCheck: Boolean(imageCheck),
    imageCheckOk: imageCheck?.ok === true,
    fullImageCheck: Boolean(fullImageCheck),
    fullImageCheckOk: fullImageCheck?.ok === true,
    pages: Boolean(pagesDir),
    pass1PreviewQa,
    pass1HardQa,
    pass1QaOk: Boolean(
      pass1PreviewQa?.ok === true && pass1HardQa?.ok === true
      && Number(pass1PreviewQa?.type3 || 0) === 0
      && Number(pass1HardQa?.type3 || 0) === 0
    ),
    reportComplete: Boolean(translationReport && reportFullText.includes('【') === false && reportFullText.trim().length > 200),
    pass1LayoutOk: pass1Summary.ok,
    layoutOk: fullSummary.ok,
    layoutStrong: pass1Summary.strong,
    layoutMild: pass1Summary.mild,
    layoutMergeGroups: pass1Summary.mergeGroups,
    layoutPages: pass1Summary.pages,
    fullLayoutStrong: fullSummary.strong,
    fullLayoutMild: fullSummary.mild,
    fullLayoutMergeGroups: fullSummary.mergeGroups,
    fullLayoutPages: fullSummary.pages,
    progress,
    termQa,
    term: termQa,
    proof,
    title,
    titleQa,
    nameQa,
    taskVersion,
    report: reportText,
    type3: Number(qa?.type3 || 0),
    pageCount: Number(qa?.pages || 0),
    embeddedImages: Number(imageCheck?.targetImages ?? qa?.images ?? 0),
  };
}

export function statusOf(project, files) {
  return statusFromWorkflow(deriveWorkflow(project, files));
}

export function publicProject(project, dir, files, status = undefined) {
  const workflow = deriveWorkflow(project, files);
  const derived = status || statusFromWorkflow(workflow);
  return {
    id: project.id,
    title: files.title?.titleZh || project.title,
    titleOriginal: files.title?.titleOriginal || '',
    titlePolicy: project.titlePolicy || 'legacy',
    workingTitle: project.title,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    sourceLang: project.sourceLang,
    targetLang: project.targetLang,
    options: project.options,
    source: project.source,
    glossary: project.glossary,
    review: project.review,
    status: derived,
    workflow,
    path: dir,
    root: path.dirname(dir),
    files,
    prompts: promptsFor(project, dir, workflow.phase, files.progress),
  };
}

export async function listProjects(root, assetsDir) {
  if (!(await exists(root))) return [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  const rows = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^project-[a-z0-9-]+$/.test(entry.name)) continue;
    try {
      const { project, dir } = await loadProject(root, entry.name);
      const files = await inspectFiles(dir);
      if (!project.updatedAt) project.updatedAt = project.createdAt || nowIso();
      rows.push(publicProject(project, dir, files));
    } catch {
      // Skip a damaged project instead of taking down the whole list.
    }
  }
  rows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return rows;
}

/** Aggregate every known project root into one list, newest first. */
export async function listAllProjects(roots, assetsDir) {
  const rows = [];
  for (const root of roots) {
    const batch = await listProjects(root, assetsDir);
    rows.push(...batch);
  }
  rows.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return rows;
}

/** Find the root that owns a project id, or null when no known root has it. */
export async function findProjectRoot(roots, id) {
  const safe = safeProjectId(id);
  for (const root of roots) {
    if (await exists(path.join(root, safe, 'project.json'))) return root;
  }
  return null;
}

async function writeStreamToTemp(stream, temp, limit) {
  await ensureDir(path.dirname(temp));
  const handle = await fs.open(temp, 'w');
  const hash = createHash('sha256');
  let total = 0;
  let head = Buffer.alloc(0);
  try {
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      total += buffer.byteLength;
      if (total > limit) throw httpError(413, '文件超过工坊大小限制。');
      hash.update(buffer);
      if (head.length < 16) head = Buffer.concat([head, buffer.subarray(0, 16 - head.length)]);
      await handle.write(buffer);
    }
    await handle.sync();
  } finally {
    await handle.close();
  }
  return { total, sha256: hash.digest('hex'), head };
}

function imageMagic(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

export async function saveUpload(root, id, kind, rawName, stream, limit) {
  const { project, dir } = await loadProject(root, id);
  const name = displayName(rawName, kind === 'source' ? 'source.pdf' : 'upload.bin');
  if (kind === 'source' && !isPdfName(name)) throw httpError(415, '源文件必须是 PDF。');
  if (kind === 'glossary' && !isAllowedGlossaryName(name)) throw httpError(415, '术语表支持 CSV、TSV、TXT、MD、JSON、XLSX、XLS。');
  if (kind === 'asset' && !isImageName(name)) throw httpError(415, '补充图片只支持 PNG、JPEG、WebP。');
  const temp = path.join(dir, '.upload', `${randomUUID()}.part`);
  let result;
  try {
    result = await writeStreamToTemp(stream, temp, limit);
    if (kind === 'source') {
      if (result.head.subarray(0, 5).toString('ascii') !== '%PDF-') throw httpError(415, '这个文件不是有效的 PDF。');
    } else if (kind === 'asset') {
      const magic = imageMagic(result.head);
      if (!magic) throw httpError(415, '这个图片无法识别。');
    }
    let relative;
    if (kind === 'source') {
      const dest = path.join(dir, 'source', 'source.pdf');
      await fs.rm(dest, { force: true });
      await fs.rename(temp, dest);
      relative = projectRelative(dir, dest);
      project.source = { path: relative, bytes: result.total, sha256: result.sha256, uploadedAt: nowIso() };
      project.updatedAt = nowIso();
      await writeJsonAtomic(path.join(dir, 'project.json'), project);
    } else if (kind === 'glossary') {
      const original = path.join(dir, 'glossary', 'original');
      await ensureDir(original);
      const used = new Set();
      const targetName = uniqueName(name, used);
      const dest = path.join(original, targetName);
      await fs.rename(temp, dest);
      relative = projectRelative(dir, dest);
      project.glossary = { ...project.glossary, mode: 'uploaded', original: relative };
      project.updatedAt = nowIso();
      await writeJsonAtomic(path.join(dir, 'project.json'), project);
      await writeTextAtomic(
        path.join(dir, 'glossary', 'README.md'),
        `# 术语表\n\n用户原始文件：\`${relative}\`。\n\n请先规范化为 \`glossary.csv\`（列：\`source,target,category,notes,locked\`），保留所有用户条目并锁定。\n`,
      );
    } else {
      const userDir = path.join(dir, 'assets', 'user');
      await ensureDir(userDir);
      const existing = new Set((await fs.readdir(userDir)).map((entry) => entry.toLowerCase()));
      const targetName = uniqueName(name, existing);
      const dest = path.join(userDir, targetName);
      await fs.rename(temp, dest);
      relative = projectRelative(dir, dest);
      project.updatedAt = nowIso();
      await writeJsonAtomic(path.join(dir, 'project.json'), project);
    }
    return { ok: true, kind, name, path: relative, bytes: result.total, sha256: result.sha256 };
  } catch (error) {
    await fs.rm(temp, { force: true }).catch(() => {});
    throw error;
  }
}

export async function finalizeProject(root, id) {
  const { project, dir } = await loadProject(root, id);
  if (!(await exists(path.join(dir, 'source', 'source.pdf')))) {
    throw httpError(409, '请先上传模组 PDF。');
  }
  if (project.glossary.mode === 'blank') await ensureBlankGlossary(dir);
  if (project.glossary.mode === 'uploaded' && !project.glossary.original) {
    throw httpError(409, '你选择了上传术语表，但还没有上传文件。');
  }
  const task = await refreshTask(project, dir);
  const files = await inspectFiles(dir);
  return { ok: true, project: publicProject(project, dir, files), task };
}

export async function writeReview(root, id, decision, note = '') {
  const { project, dir } = await loadProject(root, id);
  if (decision !== 'approve' && decision !== 'changes') throw httpError(400, '审核决定无效。');
  if (decision === 'changes' && !clampText(note, 2000)) throw httpError(400, '请写下需要修改的地方。');
  if (decision === 'approve') {
    const files = await inspectFiles(dir);
    const gate = reviewGate(files);
    if (!gate.ok) {
      throw httpError(409, `预览页/难页还不能通过：${gate.issues.map((issue) => issue.message).join('；')}`);
    }
  }
  const review = {
    decision,
    note: clampText(note, 2000),
    at: nowIso(),
  };
  await writeJsonAtomic(path.join(dir, 'REVIEW.json'), review);
  project.review = review;
  project.updatedAt = nowIso();
  await writeJsonAtomic(path.join(dir, 'project.json'), project);
  await refreshTask(project, dir);
  const files = await inspectFiles(dir);
  return { ok: true, project: publicProject(project, dir, files), task: await fs.readFile(path.join(dir, 'TASK.md'), 'utf8') };
}

export function projectFiles(dir) {
  return {
    projectJson: path.join(dir, 'project.json'),
    reviewJson: path.join(dir, 'REVIEW.json'),
    task: path.join(dir, 'TASK.md'),
    source: path.join(dir, 'source', 'source.pdf'),
    glossary: path.join(dir, 'glossary', 'glossary.csv'),
  };
}

export async function projectFileStat(dir, relative) {
  const file = safeJoin(dir, relative);
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw httpError(404, '文件不存在。');
  return { file, size: stat.size };
}

export { projectDir, projectRelative, inspectFiles };

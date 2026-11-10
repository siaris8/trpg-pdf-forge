#!/usr/bin/env node
/**
 * Run a project Python helper with the Python that carries PyMuPDF/pypdf/Pillow.
 * Prefers DSH's bundled runtime, then TRPG_PYTHON / DSH_PYTHON, then python.
 *
 * Usage:
 *   node .trpg/run-python.mjs .trpg/check-pdf.py out/book.pdf --json out/QA.json
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node run-python.mjs <script.py> [...args]');
  process.exit(2);
}

const candidates = [];
for (const value of [process.env.TRPG_PYTHON, process.env.DSH_PYTHON, process.env.PYTHON]) {
  if (value) candidates.push(value);
}
const home = process.env.USERPROFILE || os.homedir();
for (const base of [process.env.DSH_HOME, path.join(home, '.dsh')]) {
  if (!base) continue;
  candidates.push(path.join(base, 'dsh-runtimes', 'dsh-primary-runtime', 'dependencies', 'python', 'python.exe'));
}
candidates.push(resolveCommand('python3'));
candidates.push(resolveCommand('python'));

const python = candidates.find((candidate) => {
  if (!candidate) return false;
  if (candidate === 'python' || candidate === 'python3') return true;
  return existsSync(candidate) && !candidate.toLowerCase().includes('windowsapps');
});

if (!python) {
  console.error('找不到可用的 Python。请设置 TRPG_PYTHON 指向带 pymupdf/pypdf/Pillow 的 python.exe。');
  process.exit(127);
}

function resolveCommand(name) {
  try {
    const command = process.platform === 'win32' ? 'where.exe' : 'which';
    const output = execFileSync(command, [name], { encoding: 'utf8', windowsHide: true });
    const found = output.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    if (!found || found.toLowerCase().includes('windowsapps')) return null;
    return found;
  } catch {
    return null;
  }
}

const child = spawn(python, args, {
  stdio: 'inherit',
  windowsHide: true,
  // 不在插件目录里生成 __pycache__，保持插件包干净、同步时无噪音。
  env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
});
child.on('error', (error) => {
  console.error(`无法启动 Python：${error.message}`);
  process.exit(127);
});
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});

#!/usr/bin/env node
/**
 * Print a local HTML file to PDF with Chrome/Edge, including running header and
 * footer page numbers. No npm dependencies; uses the DevTools Protocol directly.
 *
 * Usage:
 *   node render-pdf.mjs --html book/preview.html --pdf out/preview.pdf --header "书名 · 预览页"
 *   node render-pdf.mjs --html book/cover.html --pdf out/cover.pdf --no-header
 */
import { spawn } from 'node:child_process';
import { existsSync, promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = parseArgs(process.argv.slice(2));
const html = args.html;
const pdf = args.pdf;
if (!html || !pdf) {
  console.error('usage: node render-pdf.mjs --html <file.html> --pdf <file.pdf> [--header text] [--no-header] [--outline outline.json]');
  process.exit(2);
}
const outlinePath = args.outline ? path.resolve(String(args.outline)) : null;
const noHeader = Boolean(args['no-header']);
const noFooter = Boolean(args['no-footer']) || noHeader;
const headerText = String(args.header || '');
const footerText = String(args.footer || headerText || 'TRPG');
const timeoutMs = Number(args.timeout || 45000);

const chromePath = findChrome();
if (!chromePath) {
  console.error('找不到 Chrome 或 Edge。请设置 CHROME_PATH。');
  process.exit(2);
}

const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'trpg-pdf-'));
const browser = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-background-networking',
  `--user-data-dir=${profile}`,
  '--remote-debugging-port=0',
  'about:blank',
], { stdio: 'ignore', windowsHide: true });

let ws;
let cdp;
try {
  const port = await waitForPort(profile, timeoutMs);
  const targets = await fetchJson(`http://127.0.0.1:${port}/json/list`);
  const page = targets.find((target) => target.type === 'page');
  if (!page?.webSocketDebuggerUrl) throw new Error('Chrome 没有可用的页面目标。');
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('连接 Chrome DevTools 超时。')), 10000);
    ws.onopen = () => {
      clearTimeout(timer);
      resolve();
    };
    ws.onerror = (event) => {
      clearTimeout(timer);
      reject(new Error(`连接 Chrome DevTools 失败：${event?.message || 'unknown'}`));
    };
  });
  cdp = makeCdp(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 794,
    height: 1123,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await cdp.send('Emulation.setEmulatedMedia', { media: 'print' });
  const url = pathToFileURL(path.resolve(html)).href;
  const navigation = await cdp.send('Page.navigate', { url });
  if (navigation?.errorText) throw new Error(`打开 HTML 失败：${navigation.errorText}`);
  await waitForReady(cdp, timeoutMs);
  await cdp.send('Runtime.evaluate', {
    expression: `Promise.all([
      document.fonts ? document.fonts.ready : Promise.resolve(true),
      Promise.all([...document.images].map((image) => image.complete ? true : new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
        setTimeout(resolve, 5000);
      })))
    ]).then(() => true)`,
    awaitPromise: true,
    returnByValue: true,
  });

  const report = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const viewport = document.documentElement.clientWidth;
      const elements = [...document.querySelectorAll('table, .read, .rule, .note, .statblock, .card, .figure, .pullquote, .section-opener')];
      const overflow = [];
      for (const element of elements) {
        const rect = element.getBoundingClientRect();
        if (element.scrollWidth > element.clientWidth + 2 || rect.right > viewport + 2) {
          overflow.push({
            tag: element.tagName.toLowerCase(),
            className: String(element.className || ''),
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            right: Math.round(rect.right),
            viewport,
          });
        }
      }
      const pages = [...document.querySelectorAll('.page')].map((page, index) => {
        const rect = page.getBoundingClientRect();
        return {
          page: index + 1,
          height: Math.round(rect.height),
          scrollHeight: page.scrollHeight,
          width: Math.round(rect.width),
          scrollWidth: page.scrollWidth,
        };
      });
      return { viewport, overflow, pages, title: document.title };
    })()`,
    returnByValue: true,
  });

  const outline = await cdp.send('Runtime.evaluate', {
    expression: `(() => {
      const items = [];
      const pages = [...document.querySelectorAll('.page')];
      pages.forEach((page, index) => {
        for (const node of page.querySelectorAll('h1, h2, [data-bookmark]')) {
          if (!node.hasAttribute('data-bookmark') && node.closest('.character-sheet, .card, .statblock, .toc')) {
            continue;
          }
          const title = String(node.getAttribute('data-bookmark') || node.textContent || '')
            .replace(/\\s+/g, ' ').trim().slice(0, 160);
          if (!title) continue;
          const tag = node.tagName.toLowerCase();
          const rawLevel = Number(node.getAttribute('data-bookmark-level') || 0);
          const level = rawLevel >= 1 && rawLevel <= 3
            ? rawLevel
            : tag === 'h1' ? 1 : tag === 'h2' ? 2 : 3;
          items.push({ title, level, page: index + 1, kind: tag });
        }
      });
      return { sections: pages.length, items, title: document.title };
    })()`,
    returnByValue: true,
  });
  const outlineValue = outline.result?.value || { sections: 0, items: [], title: '' };

  const fullBleed = noHeader && noFooter;
  const printed = await cdp.send('Page.printToPDF', {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: !fullBleed,
    headerTemplate: noHeader ? '<div></div>' : headerTemplate(headerText),
    footerTemplate: noFooter ? '<div></div>' : footerTemplate(footerText),
    marginTop: fullBleed ? 0 : 0.7,
    marginBottom: fullBleed ? 0 : 0.8,
    marginLeft: fullBleed ? 0 : 0.7,
    marginRight: fullBleed ? 0 : 0.7,
    paperWidth: 8.27,
    paperHeight: 11.69,
    scale: 1,
    transferMode: 'ReturnAsBase64',
  });
  await fs.mkdir(path.dirname(path.resolve(pdf)), { recursive: true });
  await fs.writeFile(path.resolve(pdf), Buffer.from(printed.data, 'base64'));
  const reportPath = path.join(path.dirname(path.resolve(pdf)), 'layout-report.json');
  await fs.writeFile(reportPath, `${JSON.stringify({
    source: path.resolve(html),
    pdf: path.resolve(pdf),
    createdAt: new Date().toISOString(),
    outlineSections: outlineValue.sections,
    outlineItems: outlineValue.items.length,
    ...(report.result?.value || {}),
  }, null, 2)}\n`, 'utf8');
  if (outlinePath) {
    await fs.mkdir(path.dirname(outlinePath), { recursive: true });
    await fs.writeFile(outlinePath, `${JSON.stringify({
      source: path.resolve(html),
      sections: outlineValue.sections,
      title: outlineValue.title,
      items: outlineValue.items,
      createdAt: new Date().toISOString(),
    }, null, 2)}\n`, 'utf8');
    console.log(`Outline: ${outlinePath}（${outlineValue.items.length} 条 / ${outlineValue.sections} 页）`);
  }
  console.log(`PDF: ${path.resolve(pdf)}`);
  console.log(`Layout report: ${reportPath}`);
  const overflow = report.result?.value?.overflow || [];
  if (overflow.length > 0) {
    console.warn(`警告：发现 ${overflow.length} 个可能溢出的元素，请查看 layout-report.json。`);
  }
} catch (error) {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  try {
    cdp?.close();
  } catch { /* ignore */ }
  browser.kill();
  await new Promise((resolve) => setTimeout(resolve, 250));
  await fs.rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 }).catch(() => {});
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    if (key === 'no-header' || key === 'no-footer') {
      result[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      result[key] = true;
      continue;
    }
    result[key] = value;
    index += 1;
  }
  return result;
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/microsoft-edge',
  ];
  return candidates.find((candidate) => candidate && existsSync(candidate)) || null;
}

async function waitForPort(profileDir, timeout) {
  const portFile = path.join(profileDir, 'DevToolsActivePort');
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    try {
      const text = await fs.readFile(portFile, 'utf8');
      const port = Number(text.split(/\r?\n/)[0]);
      if (Number.isInteger(port) && port > 0) return port;
    } catch {
      // The browser is still starting.
    }
    await sleep(100);
  }
  throw new Error('Chrome 启动超时。');
}

async function waitForReady(cdpClient, timeout) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await cdpClient.send('Runtime.evaluate', {
      expression: 'document.readyState',
      returnByValue: true,
    });
    if (result?.result?.value === 'complete') return;
    await sleep(100);
  }
  throw new Error('HTML 加载超时。');
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}

function makeCdp(socket) {
  let id = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (!message.id || !pending.has(message.id)) return;
    const entry = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(entry.timer);
    if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
    else entry.resolve(message.result);
  };
  socket.onclose = () => {
    for (const entry of pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(new Error('Chrome DevTools 连接已关闭。'));
    }
    pending.clear();
  };
  return {
    send(method, params = {}) {
      id += 1;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (!pending.has(id)) return;
          pending.delete(id);
          reject(new Error(`DevTools 命令超时：${method}`));
        }, 60000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      try { socket.close(); } catch { /* ignore */ }
    },
  };
}

function headerTemplate(text) {
  return `<div style="width:100%;padding:0 18mm;font-family:SimSun,serif;font-size:7pt;color:#5f5a51;letter-spacing:.04em;display:flex;justify-content:space-between;box-sizing:border-box;">
    <span>${escapeHtml(text)}</span><span>TRPG TRANSLATION</span>
  </div>`;
}

function footerTemplate(text) {
  return `<div style="width:100%;padding:0 18mm;font-family:SimSun,serif;font-size:7pt;color:#5f5a51;display:flex;justify-content:space-between;box-sizing:border-box;">
    <span>${escapeHtml(text)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

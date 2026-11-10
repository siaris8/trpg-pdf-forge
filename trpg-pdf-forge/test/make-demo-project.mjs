import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import {
  createProject,
  finalizeProject,
  saveUpload,
} from '../server/store.mjs';

// 项目根：第一个参数 > TRPG_STUDIO_ROOT > 当前目录下的 trpg-projects。
// 不再写死某台机器的绝对路径，换工作区/换机器都能跑。
const root = path.resolve(
  process.argv[2] || process.env.TRPG_STUDIO_ROOT || path.join(process.cwd(), 'trpg-projects'),
);
const assets = path.resolve('assets');
const demo = path.join(assets, 'demo');
const project = await createProject(root, assets, {
  title: '示例：锁闭的天文台',
  sourceLang: 'en',
  targetLang: 'zh-CN',
  glossaryMode: 'blank',
  options: {
    style: 'paper-archive',
    fontPair: 'wps-safe',
    wideTables: 'auto',
    imageFallback: 'table-or-text',
  },
});

const source = await fs.readFile(path.join(demo, 'source.en.pdf'));
await saveUpload(root, project.id, 'source', 'source.en.pdf', Readable.from([source]), 150 * 1024 * 1024);

const glossary = [
  'source,target,category,notes,locked',
  'The Locked Observatory,锁闭的天文台,title,示例项目,1',
  'FIST,FIST,system,保留原文,1',
  'Operative,特工,role,,1',
  'Clock Warden,钟表守卫,creature,,1',
].join('\n') + '\n';
await saveUpload(root, project.id, 'glossary', 'glossary.csv', Readable.from([Buffer.from(glossary, 'utf8')]), 20 * 1024 * 1024);

const dir = path.join(root, project.id);
const pass1 = path.join(dir, 'out', 'pass1');
await fs.mkdir(pass1, { recursive: true });
for (const name of ['preview.pdf', 'preview.png', 'hard.pdf', 'hard.png', 'contact-sheet.png']) {
  await fs.copyFile(path.join(demo, name), path.join(pass1, name));
}
await fs.writeFile(path.join(dir, 'glossary', 'glossary.filled.csv'), glossary, 'utf8');
await fs.writeFile(path.join(pass1, 'REPORT.md'), `# 首轮样张报告

- 预览页：章节扉页 + 朗读框 + 规则条 + 四行表格 + 便签，代表全书气质。
- 难页：3 张表 + 数据块 + NPC 卡 + 图示 + 2 个提示框，元素密度最高。
- 字体：SimSun / Microsoft YaHei / 静态字体，Type3 = 0。
- 版式：A4，纸本档案；表格 8.5 pt 以上，图有图注。
- 已知限制：这是工坊内置示例，不是用户模组的真实翻译。

请审核这两页；通过后 Agent 才会继续全篇。
`, 'utf8');
await fs.writeFile(path.join(dir, 'out', 'QA.json'), JSON.stringify({
  ok: true,
  pages: 2,
  type3: 0,
  textChars: 1400,
  fonts: [
    { basefont: 'SimSun', type: 'Type0', ext: 'ttf' },
    { basefont: 'MicrosoftYaHei', type: 'Type0', ext: 'ttf' },
  ],
}, null, 2), 'utf8');
await finalizeProject(root, project.id);
console.log(JSON.stringify({ id: project.id, dir }, null, 2));

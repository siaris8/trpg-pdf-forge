import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const md = readFileSync(path.join(here, 'source.en.md'), 'utf8');
const escaped = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:A4;margin:22mm}
body{font-family:Georgia,serif;font-size:10.5pt;line-height:1.55;color:#171717}
pre{white-space:pre-wrap;font-family:Georgia,serif;margin:0}
figure{margin:10mm 0 0;break-inside:avoid}
img{display:block;width:100%;height:auto;border:1px solid #ccc}
figcaption{font-family:Georgia,serif;font-size:9pt;color:#555;margin-top:2mm}
</style></head><body><pre>${escaped}</pre>
<figure><img src="art/observatory.png" alt="Original observatory illustration"><figcaption>Figure 1. The observatory dome and star chart (original demo art).</figcaption></figure>
<figure><img src="art/clock.png" alt="Original clock room diagram"><figcaption>Figure 2. The clock room: twelve doors and one clock (original demo art).</figcaption></figure>
</body></html>`;
writeFileSync(path.join(here, 'source.en.html'), html, 'utf8');
console.log(path.join(here, 'source.en.html'));

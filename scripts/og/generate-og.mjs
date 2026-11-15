// One-off generator for the per-page share images in public/og/ (1200x630 JPEG). Not part of the build:
//   npm run og:generate        (needs Playwright + chromium, both already dev dependencies)
// Page list: scripts/og/pages.cjs. Uses the site's tokens (dark surface, sky accent) and self-hosted fonts.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');
const { IMAGES } = require('./pages.cjs');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = path.join(root, 'public', 'og');
const pub = (p) => pathToFileURL(path.join(root, 'public', p)).href;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const MAX_BYTES = 120 * 1024;
const only = process.argv.slice(2);

const page = (img) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;font-weight:100 900;src:url(${pub('fonts/inter-latin-var.woff2')}) format("woff2")}
@font-face{font-family:JBM;font-weight:100 800;src:url(${pub('fonts/jetbrains-mono-latin-var.woff2')}) format("woff2")}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#09090b;color:#f4f4f5;font-family:Inter,sans-serif;position:relative;overflow:hidden}
.glow{position:absolute;right:-180px;top:-220px;width:760px;height:760px;border-radius:50%;background:radial-gradient(circle,rgba(14,165,233,.30),rgba(14,165,233,0) 68%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:48px 48px}
.edge{position:absolute;left:0;top:0;bottom:0;width:10px;background:#0ea5e9}
.wrap{position:absolute;inset:0;padding:56px 80px 56px 90px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:16px;font-weight:700;font-size:30px}
.brand img{width:56px;height:56px}
.brand span{color:#a1a1aa;font-family:JBM,monospace;font-weight:500;font-size:22px;margin-left:auto}
.main{flex:1;display:flex;flex-direction:column;justify-content:center}
.kind{font-family:JBM,monospace;font-weight:600;font-size:24px;letter-spacing:.14em;color:#0ea5e9;margin-bottom:22px}
h1{font-size:${img.title.length > 34 ? 66 : 80}px;line-height:1.06;font-weight:800;letter-spacing:-.025em;max-width:960px}
p{margin-top:26px;font-size:36px;line-height:1.3;color:#a1a1aa;max-width:900px}
.foot{font-family:JBM,monospace;font-size:22px;color:#71717a}
</style></head><body><div class="glow"></div><div class="grid"></div><div class="edge"></div>
<div class="wrap"><div class="brand"><img src="${pub('logo-zerobox-128.webp')}" alt="">ZeroBox<span>ctftracker.com</span></div>
<div class="main"><div class="kind">${esc(img.kind)}</div><h1>${esc(img.title)}</h1><p>${esc(img.sub)}</p></div>
<div class="foot">Free offline CTF tracker and OSCP exam simulator</div></div></body></html>`;

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
let total = 0;
for (const img of Object.values(IMAGES)) {
  if (only.length && !only.includes(img.key)) continue;
  const p = await ctx.newPage();
  const tmp = path.join(outDir, `.${img.key}.html`); // file:// page so the font and logo URLs load
  fs.writeFileSync(tmp, page(img));
  await p.goto(pathToFileURL(tmp).href);
  await p.evaluate(() => document.fonts.ready);
  const buf = await p.screenshot({ type: 'jpeg', quality: 88 });
  fs.unlinkSync(tmp);
  await p.close();
  if (buf.length > MAX_BYTES) throw new Error(`${img.key}.jpg is ${buf.length} bytes (max ${MAX_BYTES})`);
  fs.writeFileSync(path.join(outDir, `${img.key}.jpg`), buf);
  total += buf.length;
  console.log(`${img.key}.jpg ${(buf.length / 1024).toFixed(1)} KB`);
}
await browser.close();
console.log(`total ${(total / 1024).toFixed(0)} KB`);

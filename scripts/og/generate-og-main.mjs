// One-off generator for the site-wide share image public/og.png (1200x630). Not part of the build:
//   node scripts/og/generate-og-main.mjs        (needs Playwright + chromium, both already dev dependencies)
// Dark surface and sky accent from the site tokens, self-hosted fonts, logo, and the landing tracker screenshot.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const pub = (p) => pathToFileURL(path.join(root, 'public', p)).href;
const out = path.join(root, 'public', 'og.png');
const MAX_BYTES = 300 * 1024;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;font-weight:100 900;src:url(${pub('fonts/inter-latin-var.woff2')}) format("woff2")}
@font-face{font-family:JBM;font-weight:100 800;src:url(${pub('fonts/jetbrains-mono-latin-var.woff2')}) format("woff2")}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#09090b;color:#f4f4f5;font-family:Inter,sans-serif;position:relative;overflow:hidden}
.glow{position:absolute;right:-160px;top:-260px;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(14,165,233,.26),rgba(14,165,233,0) 66%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff07 1px,transparent 1px),linear-gradient(90deg,#ffffff07 1px,transparent 1px);background-size:48px 48px}
.copy{position:absolute;left:72px;top:64px;bottom:64px;width:520px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:16px;font-weight:700;font-size:34px;letter-spacing:-.01em}
.brand img{width:64px;height:64px}
h1{margin-top:auto;font-size:58px;line-height:1.06;font-weight:800;letter-spacing:-.03em}
h1 em{font-style:normal;color:#38bdf8}
p{margin-top:22px;font-size:25px;line-height:1.35;color:#a1a1aa}
.url{margin-top:auto;font-family:JBM,monospace;font-size:22px;color:#71717a}
.shot{position:absolute;left:640px;top:92px;width:760px;border-radius:14px;border:1px solid #3f3f46;overflow:hidden;box-shadow:0 30px 80px -20px rgba(0,0,0,.8),0 0 0 6px rgba(255,255,255,.03)}
.shot .bar{height:30px;background:#18181b;border-bottom:1px solid #27272a;display:flex;align-items:center;gap:7px;padding-left:14px}
.shot .bar i{width:10px;height:10px;border-radius:50%;background:#3f3f46}
.shot img{display:block;width:100%}
</style></head><body><div class="glow"></div><div class="grid"></div>
<div class="copy"><div class="brand"><img src="${pub('logo-zerobox-128.webp')}" alt="">ZeroBox</div>
<h1>Free offline <em>CTF tracker</em> and OSCP exam simulator</h1>
<p>Track Hack The Box, TryHackMe, Proving Grounds and VulnHub machines. No signup, data stays in your browser.</p>
<div class="url">ctftracker.com</div></div>
<div class="shot"><div class="bar"><i></i><i></i><i></i></div><img src="${pub('images/landing/hero-app-1575.webp')}" alt=""></div>
</body></html>`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const tmp = path.join(root, 'public', '.og-main.html'); // file:// page so the font, logo and screenshot URLs load
fs.writeFileSync(tmp, html);
try {
  await page.goto(pathToFileURL(tmp).href);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => i.decode()));
  });
  const buf = await page.screenshot({ type: 'png' });
  if (buf.length > MAX_BYTES) throw new Error(`og.png is ${buf.length} bytes (max ${MAX_BYTES})`);
  fs.writeFileSync(out, buf);
  console.log(`og.png ${(buf.length / 1024).toFixed(1)} KB`);
} finally {
  fs.rmSync(tmp, { force: true });
  await browser.close();
}

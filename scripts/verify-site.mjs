#!/usr/bin/env node
/**
 * Standalone verifier for the built static site in dist/ (Node + Playwright).
 *
 * Usage:
 *   npm run build && node scripts/verify-site.mjs [--shots <dir>] [--html-validate] [--dist <dir>] [--verbose]
 *
 * Serves dist/ with a tiny node:http static server (dir -> index.html, real MIME types,
 * no SPA fallback), then for each page x variant checks CSP violations, console errors,
 * horizontal overflow, <img> attrs, heading structure, inline style="" (non-landing pages),
 * axe-core, and (once per page) internal link resolution. Exit 1 on any failure.
 * The landing page "/" is exempt from the style="" rule.
 *
 * .htmlvalidate.json disabled rules (each is an intentional pattern):
 *  no-inline-style: landing page uses style="" deliberately (other pages are checked by this script)
 *  void-style / attribute-*-style / no-trailing-whitespace / long-title: stylistic output of generators
 *  prefer-native-element / no-redundant-role: explicit ARIA roles kept for older AT
 *  no-raw-characters: code samples contain literal & < > " in prose
 *  require-sri: only same-origin assets are loaded
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const DIST = path.resolve(ROOT, opt('--dist') || 'dist');
const SHOTS = flag('--shots') ? path.resolve(opt('--shots') || 'reports/site-shots') : null;
const VERBOSE = flag('--verbose');
const HTML_VALIDATE_VERSION = '11.16.2';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml', '.mp4': 'video/mp4', '.webm': 'video/webm', '.map': 'application/json',
};

function resolveFile(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split('#')[0].split('?')[0]); } catch { return null; }
  const abs = path.normalize(path.join(DIST, p));
  if (abs !== DIST && !abs.startsWith(DIST + path.sep)) return null;
  const cands = p.endsWith('/') ? [path.join(abs, 'index.html')]
    : [abs, abs + '.html', path.join(abs, 'index.html')];
  for (const c of cands) {
    try { if (fs.statSync(c).isFile()) return c; } catch { /* next */ }
  }
  return null;
}

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const f = resolveFile(req.url || '/');
      if (!f) {
        const nf = path.join(DIST, '404.html');
        res.writeHead(404, { 'content-type': MIME['.html'] });
        return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'Not found');
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

function firstSub(dir) {
  const d = path.join(DIST, dir);
  if (!fs.existsSync(d)) return null;
  const sub = fs.readdirSync(d, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(d, e.name, 'index.html')))
    .map((e) => e.name).sort()[0];
  return sub ? `/${dir}/${sub}/` : null;
}

function pageList() {
  const want = [
    ['home', '/'], ['machines', '/machines/'], ['machine', firstSub('machines')],
    ['revshells', '/revshells/'], ['cheatsheet', firstSub('cheatsheets')],
    ['methodology', '/methodology-guide/'], ['techniques', '/techniques/'],
  ];
  return want.map(([name, url]) => ({ name, url, missing: !url || !resolveFile(url) }));
}

if (flag('--html-validate')) {
  const files = [];
  for (const p of pageList()) {
    if (p.missing) { console.log(`[html-validate] skipping missing ${p.name} ${p.url || ''}`); continue; }
    files.push(path.relative(DIST, resolveFile(p.url)).replace(/\\/g, '/'));
  }
  const args = ['--yes', `html-validate@${HTML_VALIDATE_VERSION}`, '-c', path.join(ROOT, '.htmlvalidate.json'),
    ...files.map((f) => path.join(DIST, f))];
  console.log(`[html-validate] ${files.join(', ')}`);
  const r = spawnSync('npx', args.map((a) => (a.includes(' ') ? `"${a}"` : a)), { stdio: 'inherit', shell: true, cwd: ROOT });
  console.log(`[html-validate] ${r.status === 0 ? 'PASS' : 'FAIL'}`);
  process.exit(r.status === 0 ? 0 : 1);
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(`dist/index.html not found at ${DIST}. Run: npm run build`);
  process.exit(2);
}

const { chromium } = await import('playwright');
let axeSrc = null;
try { axeSrc = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8'); } catch { /* skipped */ }
if (!axeSrc) console.log('axe-core: SKIPPED (node_modules/axe-core/axe.min.js not found)');

// Runs inside the page: returns failure strings (axe / CSP / console handled outside).
function inPageChecks(isLanding) {
  const out = [];
  const de = document.documentElement;
  if (de.scrollWidth > window.innerWidth) out.push(`overflow: scrollWidth ${de.scrollWidth} > innerWidth ${window.innerWidth}`);
  document.querySelectorAll('img').forEach((img) => {
    const id = (img.getAttribute('src') || '?').slice(-50);
    if (!img.hasAttribute('width') || !img.hasAttribute('height')) out.push(`img missing width/height: ${id}`);
    const alt = img.getAttribute('alt');
    if (alt === null) out.push(`img missing alt: ${id}`);
    else if (alt.trim() === '' && !(img.getAttribute('role') === 'presentation' || img.getAttribute('aria-hidden') === 'true'))
      out.push(`img empty alt without role=presentation/aria-hidden: ${id}`);
  });
  const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  const h1s = hs.filter((h) => h.tagName === 'H1').length;
  if (h1s !== 1) out.push(`expected exactly 1 h1, found ${h1s}`);
  let prev = 0;
  for (const h of hs) {
    const l = Number(h.tagName[1]);
    if (prev && l > prev + 1) out.push(`heading skip h${prev} -> h${l}: "${h.textContent.trim().slice(0, 40)}"`);
    prev = l;
  }
  if (!isLanding) {
    const n = document.querySelectorAll('[style]').length;
    if (n) out.push(`${n} element(s) with style="" attribute (CSP)`);
  }
  return out;
}

const srv = await startServer();
const base = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch();
const pages = pageList();
const variants = [];
for (const scheme of ['dark', 'light']) for (const w of [375, 768, 1440]) variants.push({ w, scheme, rm: false });
variants.push({ w: 1440, scheme: 'dark', rm: true });
const vkey = (v) => `${v.w}/${v.scheme}${v.rm ? '/reduced' : ''}`;

const results = [];
const resolveCache = new Map();
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

for (const v of variants) {
  const vname = vkey(v);
  const ctx = await browser.newContext({
    viewport: { width: v.w, height: 900 }, colorScheme: v.scheme,
    reducedMotion: v.rm ? 'reduce' : 'no-preference',
  });
  if (v.scheme === 'light') await ctx.addInitScript(() => { try { localStorage.setItem('zb-site-theme', 'light'); } catch {} });
  await ctx.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push(`${e.violatedDirective} blocked ${String(e.blockedURI).slice(0, 60)}`));
  });
  for (const pg of pages) {
    const fails = [];
    if (pg.missing) { fails.push(`page not found in dist (${pg.url || 'no candidate'})`); results.push({ page: pg.name, vname, fails }); continue; }
    const page = await ctx.newPage();
    const consoleErrs = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 140)); });
    page.on('pageerror', (e) => consoleErrs.push('pageerror: ' + String(e.message).slice(0, 140)));
    try {
      const resp = await page.goto(base + pg.url, { waitUntil: 'load' });
      if (!resp || resp.status() !== 200) fails.push(`HTTP ${resp && resp.status()}`);
      await page.waitForTimeout(300);
      fails.push(...await page.evaluate(inPageChecks, pg.name === 'home'));
      (await page.evaluate(() => window.__csp)).forEach((c) => fails.push('CSP violation: ' + c));
      consoleErrs.forEach((c) => fails.push('console error: ' + c));
      if (axeSrc) {
        try {
          await page.evaluate(axeSrc); // evaluate bypasses page CSP
          const r = await page.evaluate(() => window.axe.run(document, { resultTypes: ['violations'] }));
          r.violations.forEach((a) => fails.push(`axe ${a.id} (${a.impact}) x${a.nodes.length}`));
        } catch (e) { fails.push('axe run error: ' + String(e.message).slice(0, 100)); }
      }
      if (v.w === 1440 && v.scheme === 'dark' && !v.rm) {
        const hrefs = await page.evaluate(() => [...document.querySelectorAll('a[href]')]
          .map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/') && !h.startsWith('//')));
        const broken = [...new Set(hrefs)].filter((h) => {
          if (!resolveCache.has(h)) resolveCache.set(h, !!resolveFile(h));
          return !resolveCache.get(h);
        });
        if (broken.length) fails.push(`${broken.length} broken internal link(s): ${broken.slice(0, 5).join(', ')}${broken.length > 5 ? ', ...' : ''}`);
      }
      if (SHOTS && !v.rm) {
        const shot = path.join(SHOTS, `${pg.name}-${v.w}-${v.scheme}.png`);
        try { await page.screenshot({ path: shot, fullPage: true }); } catch {
          // very tall pages (e.g. revshells) exceed the GPU texture limit: cap at 12000px
          await page.screenshot({ path: shot, fullPage: true, clip: { x: 0, y: 0, width: v.w, height: 12000 } });
        }
      }
    } catch (e) {
      fails.push('navigation/check error: ' + String(e.message).slice(0, 120));
    }
    results.push({ page: pg.name, vname, fails });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
srv.close();

const pad = (s, n) => String(s).padEnd(n);
console.log(`\nverify-site: ${DIST}`);
console.log(pad('page', 12) + variants.map((v) => pad(`${v.w}${v.scheme[0]}${v.rm ? 'R' : ''}`, 7)).join('') + 'fails');
let total = 0;
for (const pg of pages) {
  const rs = results.filter((r) => r.page === pg.name);
  const cells = variants.map((v) => {
    const r = rs.find((x) => x.vname === vkey(v));
    return pad(r && r.fails.length ? `F${r.fails.length}` : 'ok', 7);
  });
  const n = rs.reduce((a, r) => a + r.fails.length, 0);
  total += n;
  console.log(pad(pg.name, 12) + cells.join('') + n);
}
console.log('\nFailure details (unique per page; variants where seen):');
for (const pg of pages) {
  const m = new Map();
  for (const r of results.filter((x) => x.page === pg.name))
    for (const f of r.fails) { if (!m.has(f)) m.set(f, []); m.get(f).push(r.vname); }
  if (!m.size) continue;
  console.log(`- ${pg.name} ${pg.url || ''}`);
  let i = 0;
  for (const [f, vs] of m) {
    if (!VERBOSE && ++i > 12) { console.log(`    ... ${m.size - 12} more (use --verbose)`); break; }
    console.log(`    ${f}  [${vs.length === variants.length ? 'all' : vs.join(' ')}]`);
  }
}
console.log(`\n${total ? 'FAIL' : 'PASS'}: ${total} failure(s) across ${results.length} page/variant runs${axeSrc ? '' : ' (axe SKIPPED)'}`);
process.exit(total ? 1 : 0);

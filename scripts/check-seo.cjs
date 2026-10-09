#!/usr/bin/env node
// SEO checker for the built site in dist/. Lists offenders and exits 1 when any exist.
//   title        : present, <= 60 chars
//   description  : present, <= 155 chars, ends with . ! or ? and never "…"
//   og/twitter   : title and description match the page's own title and description
//   duplicates   : the same title or description on two pages
//   json-ld      : every application/ld+json block parses
//   sitemap      : dist/sitemap.xml is well formed (no changefreq/priority, W3C dates, no duplicates, absolute https URLs),
//                  every URL has a dist file whose canonical equals the URL, every indexable page (has a title, no noindex)
//                  is listed, 404.html / app-shell.html are not, and every <image:loc> resolves to a dist file
//   404          : dist/404.html is noindex, has no canonical and returns the designed page
// Usage: node scripts/check-seo.cjs [--dist <dir>] [--verbose]
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const di = argv.indexOf('--dist');
const DIST = path.resolve(__dirname, '..', di >= 0 ? argv[di + 1] : 'dist');
const VERBOSE = argv.includes('--verbose');
const MAX_TITLE = 60;
const MAX_DESC = 155;

const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'assets' || e.name === 'node_modules') continue;
      walk(p, out);
    } else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

const attr = (html, re) => {
  const m = re.exec(html);
  return m ? decode(m[1]) : null;
};

const ORIGIN = 'https://ctftracker.com';
const offenders = [];
const pageInfo = []; // { name, url, file, canonical, noindex, hasTitle }
const titles = new Map();
const descs = new Map();
let pages = 0;
let ldBlocks = 0;
const rel = (f) => path.relative(DIST, f).replace(/\\/g, '/');

for (const file of walk(DIST)) {
  const html = fs.readFileSync(file, 'utf8');
  const title = attr(html, /<title>([^<]*)<\/title>/);
  if (title === null) continue; // not a page (verification stub etc.)
  pages++;
  const name = '/' + rel(file).replace(/index\.html$/, '');
  pageInfo.push({
    name,
    file,
    canonical: attr(html, /<link rel="canonical" href="([^"]*)"/),
    noindex: /<meta name="robots" content="[^"]*noindex/.test(html),
  });
  const desc = attr(html, /<meta name="description" content="([^"]*)"/);
  const bad = (what) => offenders.push(`${name}  ${what}`);

  if (!title.trim()) bad('title empty');
  else if (title.length > MAX_TITLE) bad(`title ${title.length} > ${MAX_TITLE}: ${title}`);
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  if (desc === null || !desc.trim()) {
    if (!noindex) bad('description missing'); // redirect stubs marked noindex need none
  }
  else {
    if (desc.length > MAX_DESC) bad(`description ${desc.length} > ${MAX_DESC}: ${desc}`);
    if (/…|\.\.\.$/.test(desc)) bad(`description has ellipsis: ${desc}`);
    else if (!/[.!?]$/.test(desc)) bad(`description is not a complete sentence: ${desc}`);
  }
  for (const [label, re, want] of [
    ['og:title', /<meta property="og:title" content="([^"]*)"/, title],
    ['twitter:title', /<meta name="twitter:title" content="([^"]*)"/, title],
    ['og:description', /<meta property="og:description" content="([^"]*)"/, desc],
    ['twitter:description', /<meta name="twitter:description" content="([^"]*)"/, desc],
  ]) {
    const v = attr(html, re);
    if (v !== null && want !== null && v !== want) bad(`${label} differs from page ${label.endsWith('title') ? 'title' : 'description'}`);
  }

  if (!noindex) {
    if (title) titles.set(title, (titles.get(title) || []).concat(name));
    if (desc) descs.set(desc, (descs.get(desc) || []).concat(name));
  }

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    ldBlocks++;
    try {
      JSON.parse(m[1]);
    } catch (e) {
      bad(`JSON-LD does not parse: ${e.message}`);
    }
  }
}

for (const [t, list] of titles) if (list.length > 1) offenders.push(`duplicate title on ${list.join(', ')}: ${t}`);
for (const [d, list] of descs) if (list.length > 1) offenders.push(`duplicate description on ${list.join(', ')}: ${d}`);

// ---- sitemap integrity ----
const sm = { urls: 0, images: 0, indexable: 0 };
const { parseRoutes } = require('./route-parse.cjs');
const spa404 = { routes: 0 };
const smFile = path.join(DIST, 'sitemap.xml');
if (!fs.existsSync(smFile)) offenders.push('sitemap.xml missing from dist');
else {
  const xml = fs.readFileSync(smFile, 'utf8');
  if (!/^<\?xml version="1\.0" encoding="UTF-8"\?>\s*<urlset\b/.test(xml) || !/<\/urlset>\s*$/.test(xml)) offenders.push('sitemap.xml is not a <urlset> document');
  if (/<(changefreq|priority)\b/.test(xml)) offenders.push('sitemap.xml still has <changefreq> or <priority> (Google ignores both)');
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  if (blocks.length !== (xml.match(/<url>/g) || []).length) offenders.push('sitemap.xml has an unclosed <url>');
  const fileFor = (u) => {
    const p = u.slice(ORIGIN.length).replace(/^\//, '');
    return path.join(DIST, p === '' || p.endsWith('/') ? p + 'index.html' : p);
  };
  const byName = new Map(pageInfo.map((p) => [ORIGIN + p.name, p]));
  const seenLoc = new Set();
  for (const b of blocks) {
    const loc = decode((/<loc>([^<]*)<\/loc>/.exec(b) || [])[1] || '').trim();
    const bad = (what) => offenders.push(`sitemap ${loc || '(no loc)'}  ${what}`);
    sm.urls++;
    if (!loc.startsWith(ORIGIN + '/')) { bad(`not an absolute ${ORIGIN} URL`); continue; }
    if (seenLoc.has(loc)) bad('duplicate URL');
    seenLoc.add(loc);
    if (/\.html$/.test(loc) || /[?#]/.test(loc)) bad('not a clean page URL (html file, query or fragment)');
    const lm = (/<lastmod>([^<]*)<\/lastmod>/.exec(b) || [])[1];
    if (!lm || !/^\d{4}-\d{2}-\d{2}$/.test(lm) || Number.isNaN(Date.parse(lm))) bad(`lastmod missing or not YYYY-MM-DD: ${lm}`);
    if (!fs.existsSync(fileFor(loc))) { bad('no matching file in dist'); continue; }
    const page = byName.get(loc);
    if (!page) bad('file is not an HTML page with a title');
    else {
      if (page.noindex) bad('page is noindex');
      if (page.canonical !== loc) bad(`canonical differs from the sitemap URL: ${page.canonical}`);
    }
    for (const im of b.matchAll(/<image:loc>([^<]*)<\/image:loc>/g)) {
      sm.images++;
      const u = decode(im[1]).trim();
      if (!u.startsWith(ORIGIN + '/') || !fs.existsSync(fileFor(u))) bad(`image has no matching file in dist: ${u}`);
    }
  }
  if (/<image:image>/.test(xml) && !/xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/.test(xml)) offenders.push('sitemap.xml uses <image:image> without the xmlns:image declaration');
  for (const p of pageInfo) {
    if (p.noindex) continue;
    sm.indexable++;
    if (!p.canonical) offenders.push(`${p.name}  indexable page has no canonical`);
    if (!seenLoc.has(ORIGIN + p.name)) offenders.push(`${p.name}  indexable page is missing from sitemap.xml`);
  }
}

// ---- 404 page ----
const f404 = path.join(DIST, '404.html');
if (!fs.existsSync(f404)) offenders.push('404.html missing from dist');
else {
  const h = fs.readFileSync(f404, 'utf8');
  if (!/<meta name="robots" content="[^"]*noindex/.test(h)) offenders.push("404.html is not noindex");
  if (/<link rel="canonical"/.test(h)) offenders.push('404.html has a canonical');
  if (!/<h1>[^<]*isn't on the board/.test(h) && !/<h1>[^<]*isn&#39;t on the board/.test(h)) offenders.push('404.html is not the designed 404 page');
  if (!/<script src="\/404\.js\?v=[0-9a-f]{8}"><\/script>/.test(h)) offenders.push('404.html does not load /404.js');
  // /404.js must boot the app shell for every client route in src/App.tsx (the ones GitHub Pages has no folder for).
  try {
    const js = fs.readFileSync(path.join(DIST, '404.js'), 'utf8');
    const spa = new Function('return ' + /var SPA = (\/.*\/i?);/.exec(js)[1])();
    const srcDir = process.env.CHECK_SEO_SRC || path.join(__dirname, '..', 'src');
    const found = [];
    (function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const fp = path.join(d, e.name);
        if (e.isDirectory()) walk(fp);
        else if (/\.(tsx?|jsx?)$/.test(e.name)) found.push(fp);
      }
    })(srcDir);
    const routes = [];
    for (const fp of found) {
      const text = fs.readFileSync(fp, 'utf8');
      const rel = path.relative(srcDir, fp).replace(/\\/g, '/');
      if (/\b(useRoutes|createBrowserRouter)\b/.test(text)) offenders.push(`${rel} uses useRoutes/createBrowserRouter; the 404 drift check only understands <Route>`);
      const r = parseRoutes(text, rel);
      r.bad.forEach((b) => offenders.push(b));
      routes.push(...r.routes);
    }
    const uniq = [...new Set(routes.filter((r) => r.startsWith('/') && r !== '/' && !r.includes('*')))];
    routes.length = 0; routes.push(...uniq);
    spa404.routes = routes.length;
    for (const r of routes) {
      const sample = r.replace(/:\w+/g, 'abc123');
      if (!spa.test(sample) || !spa.test(sample + '/')) offenders.push(`404.js does not boot the app for route ${r} (tested ${sample})`);
    }
    for (const nope of ['/does-not-exist', '/machines/nope', '/tracker/xyz', '/target', '/targets/a/b']) {
      if (spa.test(nope)) offenders.push(`404.js treats ${nope} as an app route`);
    }
  } catch (e) {
    offenders.push('404.js app-route pattern could not be checked: ' + e.message);
  }
}

console.log(`check-seo: ${pages} pages, ${ldBlocks} JSON-LD blocks, title <= ${MAX_TITLE}, description <= ${MAX_DESC}`);
console.log(`check-seo: sitemap ${sm.urls} URLs, ${sm.images} images, ${sm.indexable} indexable pages, 404 boots ${spa404.routes} app routes`);
if (VERBOSE || offenders.length) for (const o of offenders) console.log('  OFFENDER ' + o);
console.log(`check-seo: ${offenders.length} offenders`);
process.exit(offenders.length ? 1 : 0);

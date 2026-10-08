#!/usr/bin/env node
// SEO checker for the built site in dist/. Lists offenders and exits 1 when any exist.
//   title        : present, <= 60 chars
//   description  : present, <= 155 chars, ends with . ! or ? and never "…"
//   og/twitter   : title and description match the page's own title and description
//   duplicates   : the same title or description on two pages
//   json-ld      : every application/ld+json block parses
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

const offenders = [];
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

console.log(`check-seo: ${pages} pages, ${ldBlocks} JSON-LD blocks, title <= ${MAX_TITLE}, description <= ${MAX_DESC}`);
if (VERBOSE || offenders.length) for (const o of offenders) console.log('  OFFENDER ' + o);
console.log(`check-seo: ${offenders.length} offenders`);
process.exit(offenders.length ? 1 : 0);

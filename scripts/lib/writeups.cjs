// Owner writeups: content/writeups/<machine slug>.md (YAML frontmatter + fixed H2 sections).
// Parsed, validated and rendered at build time; every failure throws Error("<file>: <reason>") so the build fails.
// Files starting with "_" (fixtures, e.g. _example.md) and README.md are skipped. WRITEUPS_DIR overrides the folder (used by tests).
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const MarkdownIt = require('markdown-it');

const rootDir = path.resolve(__dirname, '..', '..');
const DEFAULT_DIR = path.join(rootDir, 'content', 'writeups');

const PLATFORMS = ['HTB', 'THM', 'PG'];
const OSES = ['Linux', 'Windows', 'Android', 'BSD', 'Other', 'macOS'];
const DIFFICULTIES = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];
const REQUIRED = ['machine', 'platform', 'os', 'difficulty', 'solved', 'time', 'tags', 'takeaway', 'timeBreakdown'];
const OPTIONAL = ['related', 'gitbook', 'draft'];
// Fixed H2 set, in this order; the last one is optional.
const SECTIONS = ['Summary', 'Approach', 'Key steps', 'What I would do differently'];
const REQUIRED_SECTIONS = 3;
const MIN_WORDS = 250;
const MIN_TECH_LINKS = 3;
const ALLOW_HASH = '<!-- allow-hash -->';

const words = (s) => String(s).split(/\s+/).filter(Boolean).length;
const slugOf = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function splitFrontmatter(raw) {
  const m = /^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/.exec(raw);
  return m ? { front: m[1], body: m[2] || '' } : null;
}

const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

/** Walk the token stream: enforce headings/links/images, collect text stats, put ids on headings, return { html, toc, ... }. */
function renderBody(body, fail, techSlugs) {
  const tokens = md.parse(body, {});
  const toc = [];
  const sections = [];
  const used = new Set();
  let proseWords = 0;
  let personal = false;
  const techLinks = new Set();
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === 'html_block' || t.type === 'html_inline') fail('raw HTML is not allowed');
    if (t.type === 'heading_open') {
      const level = Number(t.tag.slice(1));
      const text = (tokens[i + 1].children || []).map((c) => c.content).join('');
      if (level === 1 || level > 3) fail(`heading level ${t.tag} is not allowed ("${text}")`);
      let id = 'w-' + slugOf(text);
      for (let n = 2; used.has(id); n++) id = `w-${slugOf(text)}-${n}`;
      used.add(id);
      t.attrSet('id', id);
      if (level === 2) {
        sections.push(text);
        toc.push({ id, text });
      } else if (!sections.length) {
        fail(`"${text}" appears before the first H2`);
      }
    } else if (!sections.length && t.type !== 'heading_open' && (t.type === 'paragraph_open' || t.type === 'fence' || t.type === 'bullet_list_open' || t.type === 'ordered_list_open' || t.type === 'blockquote_open' || t.type === 'code_block' || t.type === 'table_open')) {
      fail('content before the first H2');
    }
    if (t.type === 'inline') {
      const own = [];
      for (const c of t.children || []) {
        if (c.type === 'image') fail('images are not allowed');
        if (c.type === 'html_inline') fail('raw HTML is not allowed');
        if (c.type === 'link_open') {
          const href = c.attrGet('href') || '';
          if (!/^https:\/\/[^\s]+$/i.test(href) && !/^\/(?!\/)[^\s]*$/.test(href)) fail(`link "${href}" must be https:// or site-relative`);
          if (href.startsWith('https://')) c.attrSet('rel', 'noopener');
          const tm = /^\/techniques\/([a-z0-9-]+)\/?(?:#\S*)?$/.exec(href);
          if (tm && techSlugs.has(tm[1])) techLinks.add(tm[1]);
        }
        if (c.type === 'text' || c.type === 'softbreak') {
          if (/<[a-zA-Z/!]/.test(c.content)) fail('raw HTML is not allowed');
          own.push(c.content);
        }
      }
      const text = own.join(' ');
      proseWords += words(text);
      if (/\b(I|I'm|I'd|I've|my|me)\b/i.test(text) && /\d/.test(text)) personal = true;
    }
  }
  const order = sections.map((s) => SECTIONS.indexOf(s));
  const bad = sections.find((s) => !SECTIONS.includes(s));
  if (bad) fail(`H2 "${bad}" is not allowed (allowed: ${SECTIONS.join(', ')})`);
  if (new Set(sections).size !== sections.length || order.some((o, i) => i && o < order[i - 1])) fail(`H2 sections must appear once each, in this order: ${SECTIONS.join(', ')}`);
  if (sections.length < REQUIRED_SECTIONS) fail(`missing required H2 section "${SECTIONS[sections.length]}"`);
  return { html: md.renderer.render(tokens, md.options, {}), toc, proseWords, personal, techLinks: techLinks.size, techList: [...techLinks].sort() };
}

function validateFront(fm, fail, today) {
  if (!fm || typeof fm !== 'object' || Array.isArray(fm)) fail('frontmatter must be a YAML mapping');
  for (const k of REQUIRED) if (fm[k] === undefined || fm[k] === null || fm[k] === '') fail(`missing frontmatter key "${k}"`);
  if ('noindex' in fm) fail('noindex is not supported for machine pages; use draft: true');
  for (const k of Object.keys(fm)) if (!REQUIRED.includes(k) && !OPTIONAL.includes(k)) fail(`unknown frontmatter key "${k}"`);
  if (typeof fm.machine !== 'string') fail('machine must be a string');
  if (!PLATFORMS.includes(fm.platform)) fail(`platform must be one of ${PLATFORMS.join(', ')}`);
  if (!OSES.includes(fm.os)) fail(`os must be one of ${OSES.join(', ')}`);
  if (!DIFFICULTIES.includes(fm.difficulty)) fail(`difficulty must be one of ${DIFFICULTIES.join(', ')}`);
  const solved = typeof fm.solved === 'string' ? fm.solved : '';
  const d = new Date(solved + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(solved) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== solved) fail('solved must be a valid YYYY-MM-DD date');
  if (solved > today) fail(`solved date ${solved} is in the future`);
  if (typeof fm.time !== 'number' || !(fm.time > 0)) fail('time must be a number of hours greater than 0');
  if (!Array.isArray(fm.tags) || !fm.tags.length || fm.tags.some((t) => typeof t !== 'string' || !t.trim())) fail('tags must be a non-empty list of strings');
  if (typeof fm.takeaway !== 'string') fail('takeaway must be a string');
  const tw = words(fm.takeaway);
  if (tw < 40 || tw > 60) fail(`takeaway must be 40-60 words (got ${tw})`);
  const tb = fm.timeBreakdown;
  if (!Array.isArray(tb) || !tb.length || tb.some((r) => !Array.isArray(r) || r.length !== 2 || typeof r[0] !== 'string' || !r[0].trim() || typeof r[1] !== 'number' || !(r[1] > 0))) fail('timeBreakdown must be a list of [phase, minutes] pairs with minutes > 0');
  const sum = tb.reduce((a, r) => a + r[1], 0);
  if (Math.abs(sum - fm.time * 60) > fm.time * 60 * 0.1) fail(`timeBreakdown sums to ${sum} min, more than 10% away from time (${fm.time * 60} min)`);
  if (fm.related !== undefined && (!Array.isArray(fm.related) || fm.related.some((r) => typeof r !== 'string'))) fail('related must be a list of strings');
  if (fm.gitbook !== undefined && !(typeof fm.gitbook === 'string' && /^https:\/\/\S+$/.test(fm.gitbook))) fail('gitbook must be an https:// URL');
  if (fm.draft !== undefined && typeof fm.draft !== 'boolean') fail('draft must be true or false');
}

/** Flag/hash scan over the raw file (frontmatter and code included). Lines carrying <!-- allow-hash --> are exempt from the hash rules only. */
function scanFlags(raw, fail) {
  raw.split(/\r?\n/).forEach((line, i) => {
    const n = i + 1;
    if (/[A-Za-z0-9]{3,8}\{[^}\s]{6,}\}/.test(line)) fail(`line ${n} looks like a flag (NAME{...})`);
    if (line.includes(ALLOW_HASH)) return;
    if (/\b[a-f0-9]{32}\b/i.test(line)) fail(`line ${n} contains a 32-character hex string (looks like a flag hash); add ${ALLOW_HASH} if it is legitimate`);
    if (/\b(user|root)\.txt\b/i.test(line) && /\b[a-f0-9]{20,}\b/i.test(line)) fail(`line ${n} pairs user.txt/root.txt with a hash; add ${ALLOW_HASH} if it is legitimate`);
  });
}

/**
 * Load, validate and render every writeup. ctx: { machinesBySlug: Map, techSlugs: Set, today?: 'YYYY-MM-DD', dir?: string }.
 * Tooling options: files (explicit absolute paths instead of the folder listing; skips the cross-file `related` check) and includeDrafts (validate draft files too).
 * Returns [{ slug, file, relPath, fm, html, toc, stats }]; a missing folder yields [].
 */
function loadWriteups(ctx) {
  const dir = ctx.dir || (process.env.WRITEUPS_DIR ? path.resolve(process.env.WRITEUPS_DIR) : DEFAULT_DIR);
  if (!ctx.files && !fs.existsSync(dir)) return [];
  const today = ctx.today || new Date().toISOString().slice(0, 10);
  const out = [];
  const files = ctx.files ? ctx.files.map((f) => path.resolve(f)) : fs.readdirSync(dir).filter((f) => f.endsWith('.md') && !f.startsWith('_') && f.toLowerCase() !== 'readme.md').sort();
  for (const entry of files) {
    const abs = ctx.files ? entry : path.join(dir, entry);
    const file = path.basename(abs);
    const fail = (msg) => {
      throw new Error(`${file}: ${msg}`);
    };
    const slug = file.slice(0, -3);
    const raw = fs.readFileSync(abs, 'utf8');
    const parts = splitFrontmatter(raw);
    if (!parts) fail('missing YAML frontmatter (--- block at the top)');
    let fm;
    try {
      fm = YAML.parse(parts.front);
    } catch (e) {
      fail(`invalid YAML frontmatter: ${String(e.message).split('\n')[0]}`);
    }
    if (fm && fm.draft === true && !ctx.includeDrafts) continue;
    validateFront(fm, fail, today);
    if (fm.machine !== slug) fail(`machine "${fm.machine}" must equal the file name "${slug}"`);
    const m = ctx.machinesBySlug.get(slug);
    if (!m) fail(`no machine with slug "${slug}"`);
    if (!m.hasPage) fail(`machine "${slug}" has no page (writeups need an owner-solved, non-active machine)`);
    if (m.platform !== fm.platform || m.os !== fm.os || m.difficulty !== fm.difficulty) fail(`platform/os/difficulty must match the catalog (${m.platform} ${m.os} ${m.difficulty})`);
    scanFlags(raw, fail);
    if (/\]\(\s*(?:javascript|data|vbscript):/i.test(parts.body)) fail('links with javascript:, data: or vbscript: schemes are not allowed');
    const body = parts.body.split(/\r?\n/).map((l) => l.split(ALLOW_HASH).join('').replace(/[ \t]+$/, '')).join('\n');
    const r = renderBody(body, fail, ctx.techSlugs);
    if (r.proseWords < MIN_WORDS) fail(`body needs at least ${MIN_WORDS} words of prose, code excluded (got ${r.proseWords})`);
    if (r.techLinks < MIN_TECH_LINKS) fail(`body needs at least ${MIN_TECH_LINKS} distinct links to /techniques/<slug>/ pages (got ${r.techLinks})`);
    if (!r.personal) fail('body needs a personal data point (a sentence with "I"/"my" and a number, e.g. how long a step took)');
    out.push({ slug, file, relPath: path.relative(rootDir, abs).split(path.sep).join('/'), fm, html: r.html, toc: r.toc, stats: { proseWords: r.proseWords, techLinks: r.techList } });
  }
  if (ctx.files) return out;
  const slugs = new Set(out.map((w) => w.slug));
  for (const w of out) {
    for (const rel of w.fm.related || []) {
      if (!/^https:\/\/\S+$/.test(rel) && !slugs.has(rel)) throw new Error(`${w.file}: related "${rel}" is neither an existing writeup slug nor an https:// URL`);
    }
  }
  return out;
}

module.exports = { loadWriteups, SECTIONS, ALLOW_HASH, MIN_WORDS, MIN_TECH_LINKS };

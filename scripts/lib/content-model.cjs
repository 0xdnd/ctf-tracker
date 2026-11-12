// Shared content model for the static SEO pages. Loads the app's TS data via esbuild
// (bundled into a temp CJS file, required, then deleted) and derives slugs/lists.
const fs = require('fs');
const os = require('os');
const path = require('path');
const esbuild = require('esbuild');

const rootDir = path.resolve(__dirname, '..', '..');
let cached;

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function loadData() {
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'zb-content-')), 'bundle.cjs');
  try {
    esbuild.buildSync({
      stdin: {
        contents: `
export { INITIAL_MACHINES } from './src/data/machinesCatalog';
export { CHEATSHEET_CATEGORIES, INITIAL_CHEATSHEET } from './src/data/cheatsheetsData';
export { ALL_SHELL_ITEMS } from './src/data/revshellsData';
export { MASTER_METHODOLOGY_FRAMEWORK } from './src/data/methodologyFramework';
export { EXAM_TRACK_CONFIGS } from './src/utils/examComplianceUtils';
export { PRACTICE_TRACKS } from './src/data/tracksData';
export { OFFICIAL_HTB_PRO_LABS } from './src/data/proLabsData';
`,
        resolveDir: rootDir,
        loader: 'ts',
      },
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: tmp,
      logLevel: 'error',
    });
    return require(tmp);
  } finally {
    try {
      fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

const MIN_WORDS = 150;
// CTF machines = the HTB + THM rows in machinesCatalog.ts (counted from data) plus the PG and VulnHub source rows
// (loaded at runtime by loadMachinesCatalog); the rest of machinesCatalog.ts is guided labs.
// catalogCounts.htbThm scopes copy that names only HTB/THM; catalogCounts.ctf is the full count.
// The PG and VulnHub rows are kept apart from `machines` (and from catalogCounts): only the /machines/ list reads them, as plain rows without pages.
const EXTRA_SOURCES = ['pg', 'vulnhub'];
const EXTRA_ROWS = EXTRA_SOURCES.map((f) => JSON.parse(fs.readFileSync(path.join(rootDir, 'src', 'data', 'catalogSources', f + '.json'), 'utf8')));
const EXTRA_PLATFORM_COUNT = EXTRA_ROWS.reduce((n, rows) => n + rows.length, 0);
// Words that only restate the catalog facts shown beside a summary (platform, OS, difficulty): a hint made of nothing else is a stub.
const STUB_WORDS = new Set(['a', 'an', 'the', 'is', 'hack', 'box', 'tryhackme', 'proving', 'grounds', 'vulnhub', 'machine', 'rated', 'difficulty', 'level', 'very', 'easy', 'medium', 'hard', 'insane', 'linux', 'windows', 'freebsd', 'openbsd', 'android', 'other']);
/**
 * A machine's hint counts as a real summary only when it is a complete sentence (not cut off mid-sentence) and says more than
 * the platform, OS and difficulty that the page already shows. Anything else renders as "Summary pending".
 */
function isRealSummary(hint) {
  const h = String(hint || '').replace(/\s+/g, ' ').trim();
  if (!/[.!?]["')\]]?$/.test(h) || /(\.\.\.|…)["')\]]?$/.test(h)) return false;
  return h.toLowerCase().split(/[^a-z0-9]+/).some((w) => w && !STUB_WORDS.has(w));
}

// Starting Point rows all carry this one generic room URL: it is the track's hub page, not a page of that machine.
const STARTING_POINT_HUB_URL = 'https://app.hackthebox.com/starting-point';
const isStartingPointHub = (url) => url === STARTING_POINT_HUB_URL;

const wordCount = (s) => (s ? String(s).split(/\s+/).filter(Boolean).length : 0);

const TRACK_TO_CERT = {
  'tjnull-oscp': 'OSCP',
  'cpts-path': 'CPTS',
  'ippsec-cpts': 'IppSec-CPTS',
  'osep': 'OSEP',
  'oswe': 'OSWE',
  'cwee-web': 'CWEE',
  'crto-ad': 'Active-Directory',
};

function getModel() {
  if (cached) return cached;
  const d = loadData();
  const trackById = new Map((d.PRACTICE_TRACKS || []).map((t) => [t.id, t]));
  const ippsecTrack = trackById.get('ippsec-vault');

  // ---- Machines ----
  const used = new Set();
  // Active HTB machines (src/data/activeMachines.json): listed by name/os/difficulty/room link only, never a page.
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const known = new Set(d.INITIAL_MACHINES.filter((m) => m.platform === 'HTB').map((m) => norm(m.name)));
  const active = require(path.join(rootDir, 'src', 'data', 'activeMachines.json'))
    .machines.filter((a) => !known.has(norm(a.name)))
    .map((a) => ({ id: `htb-${norm(a.name)}`, name: a.name, platform: 'HTB', os: a.os, difficulty: a.difficulty, tags: [], certifications: [], roomUrl: `https://app.hackthebox.com/machines/${a.name}`, isActive: true }));
  const machines = [...d.INITIAL_MACHINES, ...active].map((m) => {
    let slug = slugify(`${m.platform}-${m.name}`);
    if (!slug || used.has(slug)) slug = slugify(m.id) || slug;
    const base = slug;
    let n = 2;
    while (used.has(slug)) slug = `${base}-${n++}`;
    used.add(slug);
    // Only the owner's own solved retired targets get a detail page (HTB ToS AUP §8.2 compliance)
    const isAct = Boolean(m.isActive);
    const safe = isAct
      ? { ...m, ip: '', tags: [], userFlag: '', rootFlag: '', hint: '', writeupUrl: '', openPorts: [], services: [] }
      : m;
    const certs = new Set(safe.certifications || []);
    if (!isAct) {
      for (const [tid, certKey] of Object.entries(TRACK_TO_CERT)) {
        const tr = trackById.get(tid);
        if (tr && tr.filterFn(safe)) certs.add(certKey);
      }
    }
    const hasIppsec = Boolean(!isAct && ippsecTrack && ippsecTrack.filterFn(safe));
    const ownerSolved = !isAct && (m.status === 'completed' || /0xdnd\.gitbook\.io/.test(m.writeupUrl || ''));
    const ownWriteup = (!isAct && /^https:\/\/0xdnd\.gitbook\.io\//.test(m.writeupUrl || '')) ? m.writeupUrl : '';
    return { ...safe, certifications: [...certs], hasIppsec, slug, ownWriteup, hasPage: ownerSolved };
  });

  // ---- Owner notes (scripts/data/machine-notes.json: { "<machine slug>": "note text" }, see scripts/data/README.md) ----
  const notesFile = process.env.MACHINE_NOTES_FILE ? path.resolve(process.env.MACHINE_NOTES_FILE) : path.join(rootDir, 'scripts', 'data', 'machine-notes.json');
  const ownerNotes = fs.existsSync(notesFile) ? JSON.parse(fs.readFileSync(notesFile, 'utf8')) : {};
  const bySlug = new Map(machines.map((m) => [m.slug, m]));
  for (const [key, val] of Object.entries(ownerNotes)) {
    const target = bySlug.get(key);
    const text = typeof val === 'string' ? val.trim() : '';
    if (!target || !target.hasPage) {
      console.warn(`machine-notes: key "${key}" matches no page-eligible machine, ignored`);
    } else if (text) {
      target.myNotes = text;
    }
  }

  // ---- Cheatsheets ----
  const topics = d.CHEATSHEET_CATEGORIES.filter((c) => !['all', 'revshell', 'custom'].includes(c.id))
    .map((c) => ({
      id: c.id,
      slug: slugify(c.id),
      name: c.name.replace(/^\d+\.\s*/, ''),
      items: d.INITIAL_CHEATSHEET.filter((i) => i.category === c.id),
    }))
    .filter((t) => t.items.length);

  // ---- Methodology ----
  const phases = d.MASTER_METHODOLOGY_FRAMEWORK.map((p) => ({
    ...p,
    slug: p.id.replace(/^phase-/, ''),
    shortTitle: p.title.replace(/^Phase \d+:\s*/, ''),
    itemCount: p.subcategories.reduce((a, s) => a + s.items.length, 0),
  }));

  // ---- Reverse shells (grouped by language) ----
  const langMap = new Map();
  for (const s of d.ALL_SHELL_ITEMS) {
    if (!langMap.has(s.language)) langMap.set(s.language, []);
    langMap.get(s.language).push(s);
  }
  // A row is unavailable when the data says so, or when it has no usable command (blank, or just a copy of its own name).
  const shellUnavailable = (s) => s.unavailable === true || !String(s.command || '').trim() || String(s.command).trim() === String(s.name || '').trim();
  const shellLangs = [...langMap.entries()]
    .map(([language, items]) => ({ language, anchor: slugify(language), items, availableCount: items.filter((s) => !shellUnavailable(s)).length }))
    .sort((a, b) => b.items.length - a.items.length || a.language.localeCompare(b.language));
  // shellCount stays the full count (frozen meta description only); every visible count uses shellAvailableCount.
  const shellAvailableCount = d.ALL_SHELL_ITEMS.filter((s) => !shellUnavailable(s)).length;

  // ---- Methodology notes (SEO generator input only; never part of the app bundle) ----
  const notes = require(path.join(rootDir, 'scripts', 'content', 'methodology-notes.json'))
    .notes.filter((n) => n.rawMarkdown && n.rawMarkdown.length > 400)
    .map((n) => ({ ...n, slug: slugify(n.id) }));

  const examTracks = Object.values(d.EXAM_TRACK_CONFIGS).map((t) => t.id);
  const htbThm = machines.filter((m) => m.platform === 'HTB' || m.platform === 'THM').length;
  const catalogCounts = { total: machines.length, htbThm, ctf: htbThm + EXTRA_PLATFORM_COUNT, guided: machines.length - htbThm };
  const proLabs = d.OFFICIAL_HTB_PRO_LABS || [];

  // Proving Grounds and VulnHub catalog rows (name, OS, difficulty, tags, room link only; no hint, flags or ids beyond the catalog's own).
  const extraMachines = EXTRA_ROWS.flat().map((m) => ({ id: m.id, name: m.name, platform: m.platform, os: m.os, difficulty: m.difficulty, tags: m.tags || [], roomUrl: m.roomUrl || '', hasPage: false }));

  cached = { machines, extraMachines, proLabs, topics, phases, shellLangs, shellCount: d.ALL_SHELL_ITEMS.length, shellAvailableCount, shellUnavailable, notes, examTracks, catalogCounts, MIN_WORDS };
  return cached;
}

let guidesCache;
/**
 * Long-form guide pages from ./guides.cjs: [{ path, title, description, html, lastmod }].
 * Tolerant: when guides.cjs is absent it logs one line and returns [] so the rest of the build still works.
 */
function getGuides() {
  if (guidesCache) return guidesCache;
  let buildGuidePages;
  try {
    ({ buildGuidePages } = require('./guides.cjs'));
  } catch (e) {
    if (e && e.code === 'MODULE_NOT_FOUND' && /[\\/]guides\.cjs'/.test(String(e.message).split('\n')[0])) {
      console.log('guides: scripts/lib/guides.cjs not found, skipping guide pages');
      guidesCache = [];
      return guidesCache;
    }
    throw e;
  }
  const layout = require('./layout.cjs');
  const site = { ORIGIN: layout.ORIGIN, REPO: layout.REPO, name: 'ZeroBox' };
  guidesCache = buildGuidePages({ model: getModel(), renderPage: layout.renderPage, site });
  return guidesCache;
}

let writeupsCache;
/**
 * Owner writeups from content/writeups/*.md (see ./writeups.cjs): [{ slug, fm, html, toc, relPath }].
 * Joins on the machine slug: sets hasSiteWriteup + siteWriteup on the machine. Never touches ownWriteup (page title/H1 depend on it).
 * Tolerant of a missing folder (returns []); any invalid writeup throws, so the build fails.
 */
/** Technique hub slugs that are actually emitted (>= 5 machines, same cut as gen-content-pages TECH_MIN); the rest are redirect stubs. */
function getTechSlugs() {
  const { GROUPS, matchesMachine } = require('./techniques.cjs');
  const machines = getModel().machines;
  return new Set(GROUPS.filter((g) => machines.filter((m) => matchesMachine(g, m)).length >= 5).map((g) => g.slug));
}

/**
 * Side-effect-free variant for tooling (scripts/check-writeups.cjs): validates with loader options (files, includeDrafts, dir),
 * bypasses the cache and does not touch the machine model.
 */
function checkWriteups(opts) {
  const { loadWriteups } = require('./writeups.cjs');
  const bySlug = new Map(getModel().machines.map((m) => [m.slug, m]));
  return loadWriteups({ ...opts, machinesBySlug: bySlug, techSlugs: getTechSlugs() });
}

function getWriteups() {
  if (writeupsCache) return writeupsCache;
  const { loadWriteups } = require('./writeups.cjs');
  const machines = getModel().machines;
  const bySlug = new Map(machines.map((m) => [m.slug, m]));
  writeupsCache = loadWriteups({ machinesBySlug: bySlug, techSlugs: getTechSlugs() });
  for (const w of writeupsCache) {
    const m = bySlug.get(w.slug);
    m.hasSiteWriteup = true;
    m.siteWriteup = w;
  }
  return writeupsCache;
}

/**
 * Machine pages that stay live but are noindex,follow and out of sitemap.xml / llms until the owner adds a real writeup.
 * Only slugs listed here are affected (GSC: "crawled - not indexed", no writeup). Add a slug to park another thin page.
 * A listed page becomes indexable automatically once hasOwnerWriteup(m) is true (site writeup, gitbook writeup, or notes >= 250 words).
 */
const NOINDEX_UNTIL_WRITEUP = ['htb-granny', 'htb-redeemer'];
const OWNER_NOTES_MIN_WORDS = 250;
const hasOwnerWriteup = (m) =>
  Boolean(m.hasSiteWriteup || m.ownWriteup || String(m.myNotes || '').split(/\s+/).filter(Boolean).length >= OWNER_NOTES_MIN_WORDS);
const isNoindexMachine = (m) => NOINDEX_UNTIL_WRITEUP.includes(m.slug) && !hasOwnerWriteup(m);

module.exports = { TRACK_TO_CERT, hasOwnerWriteup, isNoindexMachine, NOINDEX_UNTIL_WRITEUP, getModel, getGuides, getWriteups, getTechSlugs, checkWriteups, slugify, isRealSummary, isStartingPointHub, STARTING_POINT_HUB_URL };

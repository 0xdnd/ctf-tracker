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
const wordCount = (s) => (s ? String(s).split(/\s+/).filter(Boolean).length : 0);

function getModel() {
  if (cached) return cached;
  const d = loadData();

  // ---- Machines ----
  const used = new Set();
  const machines = d.INITIAL_MACHINES.map((m) => {
    let slug = slugify(`${m.platform}-${m.name}`);
    if (!slug || used.has(slug)) slug = slugify(m.id) || slug;
    const base = slug;
    let n = 2;
    while (used.has(slug)) slug = `${base}-${n++}`;
    used.add(slug);
    // Only the owner's own solved targets get a detail page.
    const safe = m;
    const ownerSolved = m.status === 'completed' || /0xdnd\.gitbook\.io/.test(m.writeupUrl || '');
    const ownWriteup = /^https:\/\/0xdnd\.gitbook\.io\//.test(m.writeupUrl || '') ? m.writeupUrl : '';
    return { ...safe, slug, ownWriteup, hasPage: ownerSolved };
  });

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
  const shellLangs = [...langMap.entries()]
    .map(([language, items]) => ({ language, anchor: slugify(language), items }))
    .sort((a, b) => b.items.length - a.items.length || a.language.localeCompare(b.language));

  // ---- CPTS notes ----
  const notes = require(path.join(rootDir, 'src', 'data', 'cptsNotesIndex.json'))
    .notes.filter((n) => n.rawMarkdown && n.rawMarkdown.length > 400)
    .map((n) => ({ ...n, slug: slugify(n.id) }));

  cached = { machines, topics, phases, shellLangs, shellCount: d.ALL_SHELL_ITEMS.length, notes, MIN_WORDS };
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

module.exports = { getModel, getGuides, slugify };

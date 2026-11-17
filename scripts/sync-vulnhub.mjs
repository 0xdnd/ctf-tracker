// Refreshes src/data/catalogSources/vulnhub.json from the public VulnHub site (no login, no token).
// Port of the reference scraper (vulnhub_catalog.py): sitemap -> entry pages -> raw cache -> app rows.
//
//   node scripts/sync-vulnhub.mjs                    live: fetch only the entries missing from the raw cache
//   node scripts/sync-vulnhub.mjs --seed <file>      import a vulnhub_catalog.json dump instead of fetching
//   node scripts/sync-vulnhub.mjs --dry-run          do everything except write files
//   node scripts/sync-vulnhub.mjs --limit N          fetch at most N new entry pages (testing)
//
// vulnhub.json is written in the packed row format of scripts/lib/vulnhub-pack.cjs (bundle budget).
// Files: scripts/data/vulnhub-raw.json (cache, one entry per slug), scripts/data/vulnhub-id-map.json (the legacy
// app ids, each mapped to a VulnHub slug or null), scripts/data/vulnhub-legacy-rows.json (those legacy rows, the
// source of their os / fallback difficulty / tags). Legacy ids are never dropped or renamed.
// Safety guards (exit non-zero, write nothing): sitemap with fewer than MIN_SITEMAP entries; a cached slug missing
// from the sitemap or the seed (removals are refused); a legacy id missing from the output.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const { packRows } = createRequire(import.meta.url)('./lib/vulnhub-pack.cjs');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RAW_FILE = resolve(ROOT, 'scripts/data/vulnhub-raw.json');
const MAP_FILE = resolve(ROOT, 'scripts/data/vulnhub-id-map.json');
const LEGACY_FILE = resolve(ROOT, 'scripts/data/vulnhub-legacy-rows.json');
const OUT_FILE = resolve(ROOT, 'src/data/catalogSources/vulnhub.json');
const COUNTS_SCRIPT = resolve(ROOT, 'scripts/update-catalog-counts.mjs');

const BASE = 'https://www.vulnhub.com';
const SITEMAP = `${BASE}/sitemap.xml`;
const ENTRY_PREFIX = `${BASE}/entry/`;
export const MIN_SITEMAP = 500;
const DELAY_MS = 500;
const DESC_MAX = 400;
const UA = 'ZeroBox-catalog-sync/1.0 (scripts/sync-vulnhub.mjs; +https://ctftracker.com)';

const DIFF_MAP = {
  beginner: 'Very Easy', 'very easy': 'Very Easy', easy: 'Easy', intermediate: 'Medium', medium: 'Medium',
  hard: 'Hard', advanced: 'Hard', insane: 'Insane',
};
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

// ---------- parsing (mirrors vulnhub_catalog.py) ----------

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', times: '×', hellip: '…', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
export function unescapeHtml(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, g) => {
    if (g[0] === '#') {
      const code = g[1].toLowerCase() === 'x' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return NAMED[g.toLowerCase()] ?? m;
  });
}

const cleanText = (fragment) => unescapeHtml(String(fragment).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Value of a '<li><b>Label</b>: value</li>' row (link text if linked). */
export function liValue(page, label) {
  let m = new RegExp(`<b>${escapeRe(label)}</b>:\\s*<a[^>]*>([^<]+)</a>`).exec(page);
  if (m) return unescapeHtml(m[1]).trim();
  m = new RegExp(`<b>${escapeRe(label)}</b>:\\s*([^<]+)`).exec(page);
  return m ? unescapeHtml(m[1]).trim() : '';
}

/** Raw HTML of one <div class="panel" id="..."> section. */
export function panel(page, panelId) {
  const i = page.indexOf(`id="${panelId}"`);
  if (i === -1) return '';
  const j = page.indexOf('<div class="panel"', i + 10);
  return page.slice(i, j !== -1 ? j : page.length);
}

/** Drops the leading "Description" heading word and everything from the site boilerplate ("Description ×") on. */
export function cleanDescription(text) {
  let s = String(text).replace(/\s+/g, ' ');
  const cut = s.indexOf('Description ×');
  if (cut !== -1) s = s.slice(0, cut);
  return s.replace(/^\s*Description\b\s*/, '').trim();
}

/** Difficulty only when the description itself states it ("Difficulty: Medium-Hard" -> medium); '' otherwise. */
export function extractDifficulty(description) {
  const words = '(very\\s+easy|insane|hard|medium|easy|beginner|intermediate|advanced)';
  let m = new RegExp(`difficulty\\s*(?:level)?\\s*(?:is|[:=\\-])?\\s*${words}`, 'i').exec(description);
  if (m) return m[1].toLowerCase().replace(/\s+/g, ' ');
  m = /\b(insane|hard|medium|easy)\s+difficulty\b/i.exec(description);
  return m ? m[1].toLowerCase() : '';
}

/** "%d %b %Y" -> YYYY-MM-DD; unparsable text is kept as is (like the reference scraper). */
export function parseDate(raw) {
  const m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/.exec(String(raw).trim());
  const mon = m && MONTHS[m[2].toLowerCase()];
  if (!mon) return String(raw).trim();
  return `${m[3]}-${String(mon).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

export function slugFromUrl(url) {
  const tail = url.replace(/\/+$/, '').split('/entry/').pop();
  const i = tail.indexOf(',');
  return { slug: i === -1 ? tail : tail.slice(0, i), vid: i === -1 ? '' : tail.slice(i + 1) };
}

const oneLine = (v) => String(v ?? '').replace(/[\r\n`]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Raw cache entry from a parsed record. Returns null when the url is not a VulnHub entry url. */
export function toCacheEntry({ slug, vid, name, url, description, difficulty, date, author }) {
  if (typeof url !== 'string' || !url.startsWith(ENTRY_PREFIX)) return null;
  const full = cleanDescription(description);
  const stated = String(difficulty || '').toLowerCase().trim();
  const diff = DIFF_MAP[stated] ? stated : extractDifficulty(full);
  const nm = oneLine(name);
  if (!slug || !nm) return null;
  return { slug, vid: String(vid ?? ''), name: nm, url, description: full.slice(0, DESC_MAX).trimEnd(), difficulty: diff, date: oneLine(date), author: oneLine(author) };
}

/** Parses one live entry page. */
export function parseEntryPage(url, page) {
  const { slug, vid } = slugFromUrl(url);
  let name = liValue(page, 'Name');
  if (!name) {
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(page);
    name = h1 ? cleanText(h1[1]) : slug;
  }
  let descHtml = panel(page, 'description');
  const cut = descHtml.indexOf('</a>'); // drop the panel header ("Description / Back to the Top")
  if (cut !== -1) descHtml = descHtml.slice(cut + 4);
  return toCacheEntry({
    slug, vid, name, url, description: cleanText(descHtml), difficulty: '',
    date: parseDate(liValue(page, 'Date release')), author: liValue(page, 'Author'),
  });
}

// ---------- mapping to app rows ----------

const WINDOWS = /\bwindows\b/i;

/**
 * Pure: raw cache entries + legacy id map + legacy rows -> app rows (sorted: date desc, name, id).
 * Row = { id, name, os, difficulty, roomUrl, difficultyUnrated?, tags?, certifications? }.
 */
export function buildRows(cache, idMap, legacyRows) {
  const legacyById = new Map(legacyRows.map((r) => [r.id, r]));
  const slugToLegacy = new Map();
  for (const [id, slug] of Object.entries(idMap)) {
    if (slug === null) continue;
    if (!legacyById.has(id)) throw new Error(`id map lists ${id} but vulnhub-legacy-rows.json has no such row`);
    if (slugToLegacy.has(slug)) throw new Error(`id map points two ids at slug ${slug}`);
    slugToLegacy.set(slug, id);
  }
  const rows = [];
  const dates = new Map();
  for (const e of cache) {
    const oldId = slugToLegacy.get(e.slug);
    const old = oldId ? legacyById.get(oldId) : null;
    const stated = DIFF_MAP[e.difficulty];
    const row = { id: oldId || `vulnhub-${e.slug}`, name: old ? old.name : e.name };
    if (old) {
      row.os = old.os;
      row.difficulty = stated || old.difficulty;
    } else {
      row.os = WINDOWS.test(`${e.name} ${e.description}`) ? 'Windows' : 'Linux';
      row.difficulty = stated || 'Medium';
    }
    row.roomUrl = e.url;
    if (!stated && !old) row.difficultyUnrated = true;
    if (old && old.tags) row.tags = [...old.tags];
    if (old && old.certifications) row.certifications = [...old.certifications];
    rows.push(row);
    dates.set(row.id, e.date || '');
  }
  const have = new Set(rows.map((r) => r.id));
  for (const old of legacyRows) {
    if (have.has(old.id)) continue;
    if (idMap[old.id] !== null) continue; // mapped to a slug that is not in the cache: caught by the guard in guardRows
    rows.push({ ...old }); // no real match: stays exactly as it was
    dates.set(old.id, '');
  }
  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.id)) throw new Error(`duplicate output id ${r.id}`);
    seen.add(r.id);
  }
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  rows.sort((a, b) => cmp(dates.get(b.id), dates.get(a.id)) || cmp(a.name, b.name) || cmp(a.id, b.id));
  return rows;
}

/** Pure: error message if a legacy id would be dropped, else null. */
export function guardRows(rows, idMap) {
  const ids = new Set(rows.map((r) => r.id));
  const missing = Object.keys(idMap).filter((id) => !ids.has(id));
  return missing.length ? `${missing.length} legacy id(s) missing from the output (e.g. ${missing.slice(0, 3).join(', ')}); refusing to write` : null;
}

// ---------- io ----------

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
const lines = (arr) => (arr.length ? `[\n${arr.map((x) => JSON.stringify(x)).join(',\n')}\n]\n` : '[]\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  let last;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xml' }, signal: AbortSignal.timeout(30000) });
      if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      last = e;
      await sleep(1000);
    }
  }
  throw last;
}

function parseArgs(argv) {
  const opts = { seed: null, dry: false, limit: 0 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') opts.dry = true;
    else if (argv[i] === '--seed') opts.seed = argv[++i];
    else if (argv[i] === '--limit') opts.limit = Number(argv[++i]);
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (opts.seed !== null && !opts.seed) throw new Error('--seed needs a file path');
  if (!Number.isInteger(opts.limit) || opts.limit < 0) throw new Error('--limit needs a whole number');
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const cache = new Map(readJson(RAW_FILE, []).map((e) => [e.slug, e]));
  const before = cache.size;
  const added = [];
  const rejected = [];

  if (opts.seed) {
    const list = JSON.parse(readFileSync(resolve(opts.seed), 'utf8'));
    if (!Array.isArray(list)) throw new Error('seed file is not a JSON array');
    const seedSlugs = new Set();
    for (const rec of list) {
      const entry = toCacheEntry({ ...rec, vid: rec.id });
      if (!entry) {
        rejected.push(rec && rec.url);
        console.error(`seed: skipped ${JSON.stringify(rec && (rec.url || rec.name))} (not a ${ENTRY_PREFIX} url or missing name/slug)`);
        continue;
      }
      seedSlugs.add(entry.slug);
      if (!cache.has(entry.slug)) added.push(entry.name);
      cache.set(entry.slug, entry);
    }
    const lost = [...cache.keys()].filter((s) => !seedSlugs.has(s));
    if (before > 0 && lost.length) throw new Error(`${lost.length} cached slug(s) missing from the seed (e.g. ${lost.slice(0, 3).join(', ')}); refusing to remove entries`);
  } else {
    const xml = await fetchText(SITEMAP);
    const urls = [...new Set(xml.match(/https:\/\/www\.vulnhub\.com\/entry\/[^<\s]+/g) || [])].sort();
    if (urls.length < MIN_SITEMAP) throw new Error(`sitemap lists only ${urls.length} entries (min ${MIN_SITEMAP}); refusing to continue`);
    const sitemapSlugs = new Set(urls.map((u) => slugFromUrl(u).slug));
    const lost = [...cache.keys()].filter((s) => !sitemapSlugs.has(s));
    if (lost.length) throw new Error(`${lost.length} cached slug(s) missing from the sitemap (e.g. ${lost.slice(0, 3).join(', ')}); refusing to remove entries`);
    let todo = urls.filter((u) => !cache.has(slugFromUrl(u).slug));
    if (opts.limit) todo = todo.slice(0, opts.limit);
    console.log(`Sitemap entries: ${urls.length} | to fetch now: ${todo.length}`);
    let failed = 0;
    for (let n = 0; n < todo.length; n++) {
      try {
        const entry = parseEntryPage(todo[n], await fetchText(todo[n]));
        if (!entry) throw new Error('page did not parse into an entry');
        cache.set(entry.slug, entry);
        added.push(entry.name);
      } catch (e) {
        failed++;
        console.error(`fetch failed, skipped: ${todo[n]} (${e && e.message ? e.message : e})`);
      }
      if (n < todo.length - 1) await sleep(DELAY_MS);
    }
    if (failed) console.log(`Failed fetches (retried next run): ${failed}`);
  }

  const cacheList = [...cache.values()].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const idMap = readJson(MAP_FILE, {});
  const legacy = readJson(LEGACY_FILE, []);
  const rows = buildRows(cacheList, idMap, legacy);
  const guard = guardRows(rows, idMap);
  if (guard) throw new Error(guard);

  const unrated = rows.filter((r) => r.difficultyUnrated).length;
  const mapped = Object.values(idMap).filter((s) => s !== null).length;
  console.log(`Cache: ${cacheList.length} entries (was ${before}); app rows: ${rows.length}`);
  console.log(`Legacy ids kept: ${Object.keys(idMap).length} (${mapped} matched to a slug, ${Object.keys(idMap).length - mapped} unmatched)`);
  console.log(`New (${added.length}): ${added.slice(0, 20).join(', ') || '-'}${added.length > 20 ? `, ... +${added.length - 20} more` : ''}`);
  console.log(`Rows with no stated difficulty (shown as Medium, flagged unrated): ${unrated}`);
  if (rejected.length) console.log(`Rejected entries (bad url): ${rejected.length}`);
  if (opts.dry) { console.log('Dry run: nothing written.'); return; }

  writeFileSync(RAW_FILE, lines(cacheList));
  writeFileSync(OUT_FILE, lines(packRows(rows)));
  console.log(`Wrote ${RAW_FILE}\nWrote ${OUT_FILE}`);
  const r = spawnSync(process.execPath, [COUNTS_SCRIPT], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('update-catalog-counts.mjs failed');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`sync-vulnhub failed: ${e && e.message ? e.message : e}`);
    process.exit(1);
  });
}

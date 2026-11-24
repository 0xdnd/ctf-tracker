// Refreshes src/data/catalogSources/pg.json from the official PG lab list (a JSON array exported from the
// OffSec public search index; fields used: name, tier Play/Practice, difficulty, os_family, content_id).
//
//   node scripts/sync-pg.mjs                  live mode: fetch the current lab list from the public OffSec portal
//                                             search index (no account needed), then rebuild pg.json
//   node scripts/sync-pg.mjs --seed <file>    offline mode: use <file> (a JSON array, read as data only) as the list
//   node scripts/sync-pg.mjs --dry-run        do everything except write files
// Live fetch: portal config.json -> search host(s); scoped-search-keys -> short-lived search-only key; paged
// documents/search over the all-content collection (contentType lab); keeps labs in the Play/Practice groups.
// The fetched list is normalised to the shape of scripts/data/pg-raw.json and written there on a real run.
//
// Files: scripts/data/pg-raw.json (cached list), scripts/data/pg-id-map.json (content_id -> app id, written here),
// scripts/data/pg-legacy-rows.json (snapshot of the rows that existed before the first run; their ids are never
// dropped). This script owns pg.json (written in the compact format of scripts/lib/pg-pack.cjs); scripts/import-catalog-candidates.cjs no longer writes it.
// Rules: existing rows keep id, name and createdAt/updatedAt (two approved renames aside); os, difficulty, tier tag
// and roomUrl come from the official list. OSCP = exact lowercase name match against the TJ-Null list.
// Play labs that already live in a VulnHub row tagged Also-on-PG-Play get no PG row.
// Guards (exit non-zero, write nothing): fewer than MIN_LABS labs; unknown tier/difficulty/os; two labs resolving to
// one id; a protected id (legacy snapshot or already shipped) missing from the output; a protected OSCP id that lost OSCP; duplicate output ids.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { recordCatalogChanges } from './lib/record-catalog-changes.mjs';

const require = createRequire(import.meta.url);
const { unpackRows } = require('./lib/vulnhub-pack.cjs');
const { normalize } = require('./import-catalog-candidates.cjs');
const { packRows, unpackRows: unpackPgRows } = require('./lib/pg-pack.cjs');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RAW_FILE = resolve(ROOT, 'scripts/data/pg-raw.json');
const MAP_FILE = resolve(ROOT, 'scripts/data/pg-id-map.json');
const LEGACY_FILE = resolve(ROOT, 'scripts/data/pg-legacy-rows.json');
const OUT_FILE = resolve(ROOT, 'src/data/catalogSources/pg.json');
const VULNHUB_FILE = resolve(ROOT, 'src/data/catalogSources/vulnhub.json');
const TJ_FILE = resolve(ROOT, 'src/data/trackSources/tjnull-oscp.json');
const COUNTS_SCRIPT = resolve(ROOT, 'scripts/update-catalog-counts.mjs');

export const MIN_LABS = 300;
const AS_OF = '2026-10-28T00:00:00.000Z';
const TIER_URL = { Play: 'https://portal.offsec.com/labs/play', Practice: 'https://portal.offsec.com/labs/practice' };
const DIFF_MAP = { Fundamental: 'Easy', Intermediate: 'Medium', Advanced: 'Hard', Expert: 'Insane' };
const OS_MAP = { Linux: 'Linux', Windows: 'Windows' };
// The only two existing rows that change name: official name -> existing app id.
export const APPROVED_RENAMES = { GlasgowSmile: 'pg-glasgow-smile-1-1', Powergrid: 'pg-powergrid-1-0-1' };

const PORTAL = 'https://portal.offsec.com';
const KEYS_URL = `${PORTAL}/services/search/collections/scoped-search-keys?collections=all-content`;
const COLLECTION = 'all-content';
const PER_PAGE = 250;
const PAGE_DELAY_MS = 300;
const UA = 'ZeroBox-catalog-sync/1.0 (scripts/sync-pg.mjs; +https://ctftracker.com)';
const DIFFICULTY_LABELS = { 1: 'Fundamental', 2: 'Intermediate', 3: 'Advanced', 4: 'Expert' };
const FIELDS = 'name,description,difficulty,level,primaryOsName,primaryOsFamily,points,completionCount,contentCode,releaseDate,labGroups,contentId,contentType,labType';

const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const tierTag = (tier) => `PG-${tier}`;

function need(map, key, ctx) {
  if (!Object.prototype.hasOwnProperty.call(map, key)) throw new Error(`unmapped value "${key}" in ${ctx}`);
  return map[key];
}

/**
 * Pure: official labs + legacy rows + id map + OSCP names + VulnHub rows -> { rows, idMap, stats }.
 * oscpNames: Set of lowercase TJ-Null PG names. vulnhubRows: unpacked rows ({ name, tags? }).
 */
export function buildRows(labs, legacyRows, oldMap, oscpNames, vulnhubRows) {
  const legacyById = new Map(legacyRows.map((r) => [r.id, r]));
  const byName = new Map(legacyRows.map((r) => [r.name, r.id]));
  const byNorm = new Map();
  for (const r of legacyRows) {
    const k = normalize(r.name);
    byNorm.set(k, byNorm.has(k) ? null : r.id); // null = ambiguous, never used
  }
  const twinNorms = new Set(vulnhubRows.filter((r) => (r.tags || []).includes('Also-on-PG-Play')).map((r) => normalize(r.name)));

  const claimed = new Map(); // app id -> official name
  const rows = [];
  const idMap = {};
  const used = new Set(legacyRows.map((r) => r.id));
  const stats = { play: 0, practice: 0, added: [], renamed: [], tierMoves: [], twinsSkipped: [], legacyKept: [] };
  const fresh = [];

  for (const lab of labs) {
    const tier = need({ Play: 1, Practice: 1 }, lab.tier, `tier of ${lab.name}`) && lab.tier;
    const difficulty = need(DIFF_MAP, lab.difficulty, `difficulty of ${lab.name}`);
    const os = need(OS_MAP, lab.os_family, `os_family of ${lab.name}`);
    const cid = String(lab.content_id);

    let id = null;
    if (oldMap[cid] && legacyById.has(oldMap[cid])) id = oldMap[cid];
    else if (APPROVED_RENAMES[lab.name] && legacyById.has(APPROVED_RENAMES[lab.name])) id = APPROVED_RENAMES[lab.name];
    else if (byName.has(lab.name)) id = byName.get(lab.name);
    else if (byNorm.get(normalize(lab.name))) id = byNorm.get(normalize(lab.name));

    if (id === null && tier === 'Play' && twinNorms.has(normalize(lab.name))) {
      stats.twinsSkipped.push(lab.name);
      continue;
    }
    if (id !== null) {
      if (claimed.has(id)) throw new Error(`id collision: "${claimed.get(id)}" and "${lab.name}" both resolve to ${id}`);
      claimed.set(id, lab.name);
    }

    let row;
    if (id !== null) {
      const old = legacyById.get(id);
      row = { ...old };
      if (APPROVED_RENAMES[lab.name] === id && old.name !== lab.name) {
        stats.renamed.push(`${old.name} -> ${lab.name}`);
        row.name = lab.name;
      }
      const oldTier = (old.tags || []).find((t) => t === 'PG-Play' || t === 'PG-Practice');
      if (oldTier && oldTier !== tierTag(tier)) stats.tierMoves.push(`${row.name}: ${oldTier} -> ${tierTag(tier)}`);
      row.os = os;
      row.difficulty = difficulty;
      row.tags = [...(old.tags || []).filter((t) => t !== 'PG-Play' && t !== 'PG-Practice'), tierTag(tier)];
      row.roomUrl = TIER_URL[tier];
    } else {
      row = {
        id: null, name: lab.name, ip: '10.10.x.x', os, platform: 'PG', difficulty, status: 'backlog',
        tags: [tierTag(tier)], certifications: [], roomUrl: TIER_URL[tier], writeupUrl: '', hint: '',
        timeSpentSeconds: 0, createdAt: AS_OF, updatedAt: AS_OF,
      };
      fresh.push({ row, lab });
      stats.added.push(lab.name);
    }
    row.certifications = oscpNames.has(row.name.toLowerCase()) ? ['OSCP'] : [];
    stats[tier.toLowerCase()]++;
    if (id !== null) { idMap[cid] = id; rows.push(row); } else rows.push(row);
  }

  // New ids, assigned after existing ones so a new lab can never take a legacy id.
  for (const { row, lab } of fresh) {
    let id = `pg-${slug(lab.name)}`;
    for (let n = 2; used.has(id); n++) id = `pg-${slug(lab.name)}-${n}`;
    used.add(id);
    row.id = id;
    idMap[String(lab.content_id)] = id;
  }

  for (const old of legacyRows) {
    if (claimed.has(old.id)) continue;
    rows.push({ ...old }); // not in the official list: stays exactly as it was
    stats.legacyKept.push(old.name);
  }

  const seen = new Set();
  for (const r of rows) {
    if (seen.has(r.id)) throw new Error(`duplicate output id ${r.id}`);
    seen.add(r.id);
  }
  return { rows, idMap, stats };
}

/**
 * Pure: every id that ever shipped = the legacy snapshot plus the rows of the current pg.json, deduped by id.
 * The current row wins; legacy order first, then ids that only the current file has.
 */
export function protectedRows(legacyRows, currentRows) {
  const cur = new Map(currentRows.map((r) => [r.id, r]));
  const out = legacyRows.map((r) => cur.get(r.id) || r);
  const have = new Set(legacyRows.map((r) => r.id));
  for (const r of currentRows) if (!have.has(r.id)) out.push(r);
  return out;
}

/** Pure: error message when a legacy id is dropped or a legacy OSCP id loses OSCP, else null. */
export function guardRows(rows, legacyRows) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const missing = legacyRows.filter((l) => !byId.has(l.id)).map((l) => l.id);
  if (missing.length) return `${missing.length} legacy id(s) missing from the output (e.g. ${missing.slice(0, 3).join(', ')}); refusing to write`;
  const lost = legacyRows.filter((l) => (l.certifications || []).includes('OSCP') && !(byId.get(l.id).certifications || []).includes('OSCP')).map((l) => l.id);
  if (lost.length) return `${lost.length} legacy OSCP id(s) lost OSCP (e.g. ${lost.slice(0, 3).join(', ')}); refusing to write`;
  return null;
}

/** Pure: search hosts from the portal config.json (nearest node first, then the other nodes, deduped). */
export function hostsFromConfig(cfg) {
  const ts = (cfg && cfg.TYPESENSE_CONFIG) || {};
  const hosts = [];
  if (ts.nearestNode && ts.nearestNode.host) hosts.push(ts.nearestNode.host);
  for (const n of ts.nodes || []) if (n && n.host && !hosts.includes(n.host)) hosts.push(n.host);
  if (!hosts.length) throw new Error('no search host found in the portal config');
  return hosts;
}

/** Pure: the search-only key (collection all-content, type visibility) from the scoped-search-keys response. */
export function pickSearchKey(data) {
  for (const entry of Array.isArray(data) ? data : []) {
    if (entry && entry.collection === COLLECTION) {
      for (const k of entry.apiKeys || []) if (k && k.type === 'visibility' && k.key) return k.key;
    }
  }
  throw new Error('no visibility search key in the portal response');
}

/** Pure: one search document -> 0..2 raw records (one per tier the lab belongs to), in the pg-raw.json shape. */
export function normalizeDoc(doc) {
  const groups = [];
  for (const g of doc.labGroups || []) if (g && typeof g === 'object' && g.name) groups.push(g.name);
  const tiers = ['Play', 'Practice'].filter((t) => groups.includes(t));
  const diff = doc.difficulty;
  const base = {
    name: doc.name || '',
    difficulty: DIFFICULTY_LABELS[diff] || '',
    difficulty_level: diff === undefined ? null : diff,
    level: doc.level === undefined ? null : doc.level,
    os: doc.primaryOsName || '',
    os_family: doc.primaryOsFamily || '',
    xp: doc.points === undefined ? null : doc.points,
    solves: doc.completionCount === undefined ? null : doc.completionCount,
    release_date: (doc.releaseDate || '').slice(0, 10),
    description: doc.description || '',
    groups,
    content_code: doc.contentCode || '',
    content_id: String(doc.contentId || doc.id || ''),
    source: 'OffSec Proving Grounds',
  };
  return tiers.map((tier) => ({ ...base, tier }));
}

/** Pure: search documents -> raw records, deduped by (content_id, tier), sorted by tier then name. */
export function collectLabs(docs) {
  const items = [];
  const seen = new Set();
  for (const d of docs) {
    for (const item of normalizeDoc(d)) {
      const k = `${item.content_id}|${item.tier}`;
      if (!seen.has(k)) { seen.add(k); items.push(item); }
    }
  }
  items.sort((a, b) => (a.tier < b.tier ? -1 : a.tier > b.tier ? 1 : a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0));
  return items;
}

/**
 * Fetches the live lab list. `fetchJson(url, headers)` is injectable so tests can use a fake response.
 * Tries each search host in turn; throws one error naming the last failure if all fail.
 */
export async function fetchLabs(fetchJson, sleep = (ms) => new Promise((r) => setTimeout(r, ms))) {
  const hosts = hostsFromConfig(await fetchJson(`${PORTAL}/config.json`, {}));
  const key = pickSearchKey(await fetchJson(KEYS_URL, {}));
  let lastErr = null;
  for (const host of hosts) {
    try {
      const page = async (p) => {
        const qs = new URLSearchParams({ q: '*', query_by: 'name', filter_by: 'contentType:=lab', include_fields: FIELDS, per_page: String(PER_PAGE), page: String(p) });
        return fetchJson(`https://${host}/collections/${COLLECTION}/documents/search?${qs}`, { 'X-TYPESENSE-API-KEY': key });
      };
      const first = await page(1);
      const docs = (first.hits || []).map((h) => h.document);
      const pages = Math.ceil((first.found || 0) / PER_PAGE);
      for (let p = 2; p <= pages; p++) {
        await sleep(PAGE_DELAY_MS);
        docs.push(...((await page(p)).hits || []).map((h) => h.document));
      }
      return collectLabs(docs);
    } catch (e) {
      lastErr = new Error(`search host ${host} failed: ${e && e.message ? e.message : e}`);
    }
  }
  throw new Error(`all search hosts failed. Last error: ${lastErr && lastErr.message}`);
}

async function httpJson(url, headers) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url.split('?')[0]}`);
  return res.json();
}

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback);
const lines = (arr) => (arr.length ? `[\n${arr.map((x) => JSON.stringify(x)).join(',\n')}\n]\n` : '[]\n');
const pretty = (v) => `${JSON.stringify(v, null, 2)}\n`;

function parseArgs(argv) {
  const opts = { seed: null, dry: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') opts.dry = true;
    else if (argv[i] === '--seed') opts.seed = argv[++i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (opts.seed !== null && !opts.seed) throw new Error('--seed needs a file path');
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  let labs;
  if (opts.seed) {
    labs = JSON.parse(readFileSync(resolve(opts.seed), 'utf8'));
    if (!Array.isArray(labs)) throw new Error('seed file is not a JSON array');
  } else {
    labs = await fetchLabs(httpJson);
    console.log(`Fetched ${labs.length} labs from the live OffSec portal index.`);
  }
  if (labs.length < MIN_LABS) throw new Error(`only ${labs.length} labs in the list (min ${MIN_LABS}); refusing to continue`);
  const snapshot = readJson(LEGACY_FILE, []);
  if (!snapshot.length) throw new Error('scripts/data/pg-legacy-rows.json is missing or empty');
  // Protected = legacy snapshot + the rows currently shipped: none of these ids may change or drop.
  const legacy = protectedRows(snapshot, existsSync(OUT_FILE) ? unpackPgRows(readJson(OUT_FILE, [])) : []);
  const tj = readJson(TJ_FILE, null);
  const oscp = new Set([...tj.names.pgPlay, ...tj.names.pgPractice].map((e) => e.name.toLowerCase()));
  const vulnhub = unpackRows(readJson(VULNHUB_FILE, []));

  const { rows, idMap, stats } = buildRows(labs, legacy, readJson(MAP_FILE, {}), oscp, vulnhub);
  const guard = guardRows(rows, legacy);
  if (guard) throw new Error(guard);

  const list = (a) => (a.length ? `${a.slice(0, 20).join(', ')}${a.length > 20 ? `, ... +${a.length - 20} more` : ''}` : '-');
  console.log(`Labs in list: ${labs.length} (Play ${stats.play}, Practice ${stats.practice}) | PG rows: ${rows.length}`);
  console.log(`Added (${stats.added.length}): ${list(stats.added)}`);
  console.log(`Renamed (${stats.renamed.length}): ${list(stats.renamed)}`);
  console.log(`Tier moves (${stats.tierMoves.length}): ${list(stats.tierMoves)}`);
  console.log(`Kept, not in list (${stats.legacyKept.length}): ${list(stats.legacyKept)}`);
  console.log(`Play twins skipped, already in VulnHub rows (${stats.twinsSkipped.length}): ${list(stats.twinsSkipped)}`);
  console.log(`OSCP rows: ${rows.filter((r) => r.certifications.includes('OSCP')).length} (protected ${legacy.filter((r) => r.certifications.includes('OSCP')).length})`);
  if (opts.dry) { console.log('Dry run: nothing written.'); return; }

  writeFileSync(RAW_FILE, pretty(labs));
  writeFileSync(MAP_FILE, pretty(idMap));
  writeFileSync(OUT_FILE, lines(packRows(rows))); // compact rows, one per line (scripts/lib/pg-pack.cjs)
  console.log(`Wrote ${MAP_FILE}\nWrote ${OUT_FILE}`);
  if (stats.added.length > 0) {
    const addedSet = new Set(stats.added);
    const addedItems = rows
      .filter((r) => addedSet.has(r.name))
      .map((r) => ({ name: r.name, platform: 'PG', os: r.os, difficulty: r.difficulty }));
    recordCatalogChanges({ date: new Date().toISOString().slice(0, 10), platform: 'PG', added: addedItems });
  }
  const r = spawnSync(process.execPath, [COUNTS_SCRIPT], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('update-catalog-counts.mjs failed');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (e) {
    console.error(`sync-pg failed: ${e && e.message ? e.message : e}`);
    process.exit(1);
  }
}

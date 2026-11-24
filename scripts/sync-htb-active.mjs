// Weekly refresh of src/data/activeMachines.json from the HTB labs API.
// Reads the token ONLY from env HTB_TOKEN; it is never printed or written.
// Keeps listing metadata only (name, os, difficulty, releasedAt, season) per HTB AUP 8.2.
// NOTE: --dry-run still requires HTB_TOKEN and still calls the HTB API; it only skips the file write.
// Safety guards (refuse, exit non-zero, write nothing): fewer than MIN_ACTIVE rows, more than
// MAX_ACTIVE rows, more than half of the previous names removed, or MAX_PAGES reached without a last page.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { recordCatalogChanges } from './lib/record-catalog-changes.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILE = resolve(ROOT, 'src/data/activeMachines.json');
const RETIRED_FILE = resolve(ROOT, 'src/data/retiredHtb.json');
const API = 'https://labs.hackthebox.com/api/v5/machines';
export const MIN_ACTIVE = 10;
export const MAX_ACTIVE = 60;
const MAX_PAGES = 50;

const cleanName = (v) => String(v).replace(/[`\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

/** "Active (2018 Retired)" -> "active": strips trailing parenthetical, then letters and digits only. */
export const baseNameSlug = (name) =>
  String(name).replace(/\s*\([^)]*\)\s*$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Pure: archives HTB machines removed from activeMachines.json into retiredHtb.json metadata rows,
 * skipping any HTB machine already present in the static catalog (by baseNameSlug) and pruning any
 * retired entry whose slug re-appeared in nextActive or was later merged into the static catalog.
 */
export function archiveRetiredMachines(prevActive, nextActive, existingRetired, staticCatalogHtbBaseNames, retiredAt) {
  const nextActiveSlugs = new Set(nextActive.map((m) => baseNameSlug(m.name)).filter(Boolean));
  const staticSlugs = new Set([...staticCatalogHtbBaseNames].map((n) => baseNameSlug(n)).filter(Boolean));
  const seen = new Set();
  const kept = [];
  const pruned = [];

  for (const item of existingRetired) {
    const slug = baseNameSlug(item.name);
    if (!slug || nextActiveSlugs.has(slug) || staticSlugs.has(slug) || seen.has(slug)) {
      if (item && item.name) pruned.push(item.name);
      continue;
    }
    seen.add(slug);
    kept.push(item);
  }

  const newlyArchived = [];
  for (const item of prevActive) {
    const slug = baseNameSlug(item.name);
    if (!slug || nextActiveSlugs.has(slug) || staticSlugs.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    newlyArchived.push({
      name: item.name,
      os: item.os,
      difficulty: item.difficulty,
      releasedAt: item.releasedAt,
      retiredAt,
    });
  }

  return {
    machines: [...newlyArchived, ...kept],
    archived: newlyArchived.map((m) => m.name),
    pruned,
  };
}

export function loadStaticHtbBaseNames() {
  const dir = mkdtempSync(join(tmpdir(), 'zb-htb-sync-'));
  const out = join(dir, 'bundle.cjs');
  const req = createRequire(import.meta.url);
  const esbuild = req('esbuild');
  try {
    esbuild.buildSync({
      stdin: {
        contents: `export { STATIC_INITIAL_MACHINES } from './src/data/machinesCatalog';`,
        resolveDir: ROOT,
        loader: 'ts',
      },
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: out,
      logLevel: 'error',
    });
    const { STATIC_INITIAL_MACHINES } = req(out);
    return new Set(
      STATIC_INITIAL_MACHINES
        .filter((m) => m.platform === 'HTB')
        .map((m) => baseNameSlug(m.name))
        .filter(Boolean)
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Pure: returns an error message if the new list must not replace the previous one, else null. */
export function checkCeiling(prevNames, newNames) {
  if (newNames.length > MAX_ACTIVE) return `${newNames.length} active machines exceeds the ceiling of ${MAX_ACTIVE}; refusing to write`;
  const next = new Set(newNames);
  const removed = prevNames.filter((n) => !next.has(n)).length;
  if (prevNames.length > 0 && removed > prevNames.length / 2) {
    return `${removed} of ${prevNames.length} previous machines would be removed (more than half); refusing to write`;
  }
  return null;
}

const first = (o, keys) => {
  for (const k of keys) if (o && o[k] !== undefined && o[k] !== null && o[k] !== '') return o[k];
  return undefined;
};

const OS_MAP = { linux: 'Linux', windows: 'Windows', bsd: 'BSD', freebsd: 'BSD', openbsd: 'BSD', android: 'Android', macos: 'macOS', other: 'Other' };
const DIFF_MAP = { 'very easy': 'Very Easy', easy: 'Easy', medium: 'Medium', hard: 'Hard', insane: 'Insane' };
const DIFF_BY_NUM = (n) => (n <= 2 ? 'Very Easy' : n <= 4 ? 'Easy' : n <= 7 ? 'Medium' : n <= 9 ? 'Hard' : 'Insane');

function toDate(v) {
  if (typeof v !== 'string') return undefined;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(v);
  return m ? m[1] : undefined;
}

function pageItems(page) {
  if (Array.isArray(page)) return page;
  if (page && typeof page === 'object') {
    for (const k of ['data', 'items', 'machines']) if (Array.isArray(page[k])) return page[k];
  }
  return null;
}

/** Pure: takes an array of raw API pages, returns normalized active machines (newest first). */
export function normalizeMachines(pages) {
  const out = [];
  const seen = new Set();
  for (const page of pages) {
    const items = pageItems(page);
    if (!items) throw new Error('Unrecognized API response shape');
    for (const m of items) {
      if (!m || typeof m !== 'object') continue;
      if (first(m, ['retiredDate', 'retired_date', 'retired_at', 'retiredAt'])) continue;
      if (m.retired === true || m.retired === 1) continue;
      const rawName = first(m, ['name', 'machine_name', 'title']);
      if (typeof rawName !== 'string') continue;
      const name = cleanName(rawName);
      if (!name) continue;
      const osRaw = String(first(m, ['os', 'operatingSystem', 'operating_system']) ?? 'Other').toLowerCase();
      const os = OS_MAP[osRaw] ?? 'Other';
      const dRaw = first(m, ['difficultyText', 'difficulty_text', 'difficulty']);
      let difficulty = typeof dRaw === 'string' ? DIFF_MAP[dRaw.trim().toLowerCase()] : undefined;
      if (!difficulty && typeof dRaw === 'number') difficulty = DIFF_BY_NUM(dRaw);
      const releasedAt = toDate(first(m, ['release', 'release_date', 'releaseDate', 'releasedAt', 'released_at']));
      if (!difficulty || !releasedAt) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = { name, os, difficulty, releasedAt };
      const sRaw = first(m, ['season', 'season_name', 'seasonName']);
      const season = typeof sRaw === 'string' ? sRaw : sRaw && typeof sRaw === 'object' ? first(sRaw, ['name', 'title']) : undefined;
      if (typeof season === 'string' && cleanName(season)) entry.season = cleanName(season);
      out.push(entry);
    }
  }
  out.sort((a, b) => (a.releasedAt < b.releasedAt ? 1 : a.releasedAt > b.releasedAt ? -1 : a.name.localeCompare(b.name)));
  return out;
}

const scrub = (text, token) => {
  let s = String(text);
  if (token) s = s.split(token).join('[redacted]');
  return s.replace(/Bearer\s+\S+/gi, 'Bearer [redacted]');
};

async function fetchAll(token) {
  const pages = [];
  for (let n = 1; n <= MAX_PAGES; n++) {
    const res = await fetch(`${API}?per_page=100&page=${n}`, {
      redirect: 'manual',
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'curl/8.5.0', Accept: 'application/json' },
    });
    if (res.status === 302 || res.status === 401 || res.status === 403) throw new Error('token invalid or expired');
    if (res.status !== 200) throw new Error(`HTTP ${res.status} from HTB API`);
    let body;
    try { body = await res.json(); } catch { throw new Error('API returned non-JSON body'); }
    const items = pageItems(body);
    if (!items) throw new Error('Unrecognized API response shape');
    if (items.length === 0) break;
    pages.push(body);
    const last = body && body.meta && (body.meta.last_page ?? body.meta.lastPage);
    if (typeof last === 'number' && n >= last) return pages;
    if (n === MAX_PAGES) throw new Error(`reached MAX_PAGES (${MAX_PAGES}) without a last page; refusing partial list`);
  }
  return pages;
}

async function main() {
  const token = process.env.HTB_TOKEN;
  const dry = process.argv.includes('--dry-run');
  if (!token) throw new Error('HTB_TOKEN is not set');
  const machines = normalizeMachines(await fetchAll(token));
  if (machines.length < MIN_ACTIVE) throw new Error(`only ${machines.length} active machines found (min ${MIN_ACTIVE}); refusing to write`);

  const prev = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  const guard = checkCeiling(prev.machines.map((m) => m.name), machines.map((m) => m.name));
  if (guard) throw new Error(guard);
  const oldNames = new Set(prev.machines.map((m) => m.name));
  const newNames = new Set(machines.map((m) => m.name));
  const added = machines.filter((m) => !oldNames.has(m.name)).map((m) => m.name);
  const removed = prev.machines.filter((m) => !newNames.has(m.name)).map((m) => m.name);

  const asOf = new Date().toISOString().slice(0, 10);
  const existingRetired = existsSync(RETIRED_FILE)
    ? JSON.parse(readFileSync(RETIRED_FILE, 'utf8'))
    : { asOf, source: 'labs.hackthebox.com API, auto-archived on retirement', machines: [] };
  const retiredUpdate = archiveRetiredMachines(
    prev.machines,
    machines,
    Array.isArray(existingRetired.machines) ? existingRetired.machines : [],
    loadStaticHtbBaseNames(),
    asOf,
  );

  console.log(`Active machines: ${machines.length}`);
  console.log(`Added (${added.length}): ${added.join(', ') || '-'}`);
  console.log(`Removed (${removed.length}): ${removed.join(', ') || '-'}`);
  console.log(`Archived to retired (${retiredUpdate.archived.length}): ${retiredUpdate.archived.join(', ') || '-'}`);
  if (retiredUpdate.pruned.length > 0) {
    console.log(`Pruned from retired (${retiredUpdate.pruned.length}): ${retiredUpdate.pruned.join(', ')}`);
  }
  if (dry) { console.log('Dry run: nothing written.'); return; }

  const note = String(prev.note ?? '').replace(/\(\d+ active machines\)/, `(${machines.length} active machines)`);
  const next = { asOf, source: 'labs.hackthebox.com API, automated sync', note, machines };
  writeFileSync(DATA_FILE, JSON.stringify(next, null, 2) + '\n');
  console.log(`Wrote ${DATA_FILE}`);

  if (retiredUpdate.archived.length > 0 || retiredUpdate.pruned.length > 0 || !existsSync(RETIRED_FILE)) {
    const nextRetired = {
      asOf,
      source: 'labs.hackthebox.com API, auto-archived on retirement',
      machines: retiredUpdate.machines,
    };
    writeFileSync(RETIRED_FILE, JSON.stringify(nextRetired, null, 2) + '\n');
    console.log(`Wrote ${RETIRED_FILE}`);
  }
  const addedItems = machines.filter((m) => !oldNames.has(m.name)).map((m) => ({
    name: m.name,
    platform: 'HTB',
    os: m.os,
    difficulty: m.difficulty,
    releasedAt: m.releasedAt,
  }));
  const retiredItems = prev.machines.filter((m) => !newNames.has(m.name)).map((m) => ({
    name: m.name,
    platform: 'HTB',
    os: m.os,
    difficulty: m.difficulty,
  }));
  if (addedItems.length > 0 || retiredItems.length > 0) {
    recordCatalogChanges({ date: asOf, platform: 'HTB', added: addedItems, active: addedItems, retired: retiredItems });
  }
  if (spawnSync(process.execPath, [resolve(ROOT, 'scripts/update-catalog-counts.mjs')], { stdio: 'inherit' }).status !== 0) throw new Error('update-catalog-counts.mjs failed');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`sync-htb-active failed: ${scrub(e && e.message ? e.message : e, process.env.HTB_TOKEN)}`);
    process.exit(1);
  });
}

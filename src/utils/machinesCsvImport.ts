import type { ActivitySession, CredAttempt, Credential, Difficulty, LootItem, Machine, OperatingSystem, PipelineStatus, Platform } from '../types';
import { getLoadedMachinesCatalog } from '../data/loadMachinesCatalog';
import { isPlaceholderIp } from './ipInput';
import { parseCsv } from './csv';
import { matchCandidateNamesToCatalog, normalizeTargetName } from './bulkPwnImporter';
import { hasUserProgress, isGenuineCustom } from '../store/machineNormalization';
import { useCtfStore } from '../store/useCtfStore';

export const MAX_CSV_BYTES = 2 * 1024 * 1024;
export const MAX_CSV_ROWS = 5000;
const MAX_NAME_LENGTH = 120;
const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 40;

export type CsvField = 'name' | 'platform' | 'status' | 'difficulty' | 'os' | 'tags' | 'userPwnedAt' | 'rootPwnedAt';
/** Column index per field, -1 when the file has no such column. */
export type ColumnMap = Record<CsvField, number>;

const FIELD_ALIASES: Record<CsvField, string[]> = {
  name: ['name', 'machine', 'machine name', 'box', 'box name', 'target', 'room', 'title'],
  platform: ['platform', 'source', 'provider', 'site'],
  status: ['status', 'state', 'progress'],
  difficulty: ['difficulty', 'level', 'diff'],
  os: ['os', 'operating system'],
  tags: ['tags', 'tag', 'labels'],
  userPwnedAt: ['user pwned at', 'user owned at', 'user solved at', 'user date'],
  rootPwnedAt: ['root pwned at', 'root owned at', 'root solved at', 'root date', 'solved at', 'pwned at', 'completed at', 'date solved'],
};
const FIELDS = Object.keys(FIELD_ALIASES) as CsvField[];

const headerKey = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const looseKey = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Finds each field's column by heading, case-insensitively. The first matching heading wins. */
export function detectColumns(headers: string[]): ColumnMap {
  const map = Object.fromEntries(FIELDS.map((f) => [f, -1])) as ColumnMap;
  headers.forEach((h, i) => {
    const key = headerKey(h);
    if (!key) return;
    const field = FIELDS.find((f) => map[f] === -1 && FIELD_ALIASES[f].includes(key));
    if (field) map[field] = i;
  });
  return map;
}

const PLATFORMS: Record<string, Platform> = {
  htb: 'HTB', hackthebox: 'HTB',
  thm: 'THM', tryhackme: 'THM',
  pg: 'PG', pgpractice: 'PG', provinggrounds: 'PG', offsec: 'PG',
  vulnhub: 'VulnHub',
  custom: 'Custom',
};

const STATUSES: Record<string, PipelineStatus> = {
  backlog: 'backlog', todo: 'backlog', notstarted: 'backlog', unsolved: 'backlog', new: 'backlog', planned: 'backlog', queued: 'backlog',
  recon: 'recon', inprogress: 'recon', started: 'recon', active: 'recon', working: 'recon', enumerating: 'recon', activerecon: 'recon',
  foothold: 'foothold', user: 'foothold', userowned: 'foothold', userpwned: 'foothold', footholdobtained: 'foothold',
  root: 'root', rooted: 'root', rootowned: 'root', rootpwned: 'root', pwned: 'root', owned: 'root',
  completed: 'completed', complete: 'completed', done: 'completed', solved: 'completed', finished: 'completed', passed: 'completed',
};

const DIFFICULTIES: Record<string, Difficulty> = {
  veryeasy: 'Very Easy', trivial: 'Very Easy',
  easy: 'Easy',
  medium: 'Medium', med: 'Medium', intermediate: 'Medium',
  hard: 'Hard', difficult: 'Hard',
  insane: 'Insane',
};

const OPERATING_SYSTEMS: Record<string, OperatingSystem> = {
  linux: 'Linux', windows: 'Windows', win: 'Windows', bsd: 'BSD', freebsd: 'BSD', openbsd: 'BSD',
  android: 'Android', macos: 'macOS', osx: 'macOS', mac: 'macOS',
};

/** Table lookup that ignores inherited keys such as "constructor". */
function lookup<T>(table: Record<string, T>, key: string): T | undefined {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

/** An ISO date or date-time as an ISO string, or undefined when it does not parse. */
function parseIsoDate(value: string): string | undefined {
  const v = value.trim();
  if (!ISO_DATE.test(v)) return undefined;
  const t = Date.parse(v.replace(' ', 'T'));
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

/** The export guards cells that start like a formula with a leading apostrophe; take it off again. */
const unguardCell = (cell: string) => cell.replace(/^'(?=[=+\-@\t\r])/, '');

export interface ImportRow {
  /** Spreadsheet row number (the heading row is row 1). */
  line: number;
  name: string;
  platform?: Platform;
  os: OperatingSystem;
  difficulty: Difficulty;
  /** Undefined when the cell is empty or not a known status. */
  status?: PipelineStatus;
  statusUnknown: boolean;
  userPwnedAt?: string;
  rootPwnedAt?: string;
  tags: string[];
}

export type ParsedCsv =
  | { ok: true; headers: string[]; rows: string[][] }
  | { ok: false; error: string };

const LINE_BREAK = /\r?\n/;

function sniffDelimiter(text: string): string {
  const first = (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).split(LINE_BREAK, 1)[0] ?? '';
  const count = (c: string) => first.split(c).length - 1;
  const best = [',', ';', '\t'].reduce((a, c) => (count(c) > count(a) ? c : a), ',');
  return count(best) > 0 ? best : ',';
}

/** Splits CSV text into headings and data rows. Blank rows are dropped. Applies the row limit. */
export function parseMachinesCsv(text: string): ParsedCsv {
  const all = parseCsv(text, sniffDelimiter(text)).filter((r) => r.some((c) => c.trim() !== ''));
  if (all.length === 0) return { ok: false, error: 'That file is empty.' };
  if (all.length < 2) return { ok: false, error: 'No machines found under the column headings.' };
  const rows = all.slice(1);
  if (rows.length > MAX_CSV_ROWS) {
    return { ok: false, error: `That file has ${rows.length.toLocaleString('en-US')} rows. The limit is ${MAX_CSV_ROWS.toLocaleString('en-US')}; split it and import the parts.` };
  }
  return { ok: true, headers: all[0].map((h) => h.trim()), rows };
}

function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[;,|]/)) {
    const tag = part.trim();
    const key = tag.toLowerCase();
    if (!tag || tag.length > MAX_TAG_LENGTH || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/** Reads one parsed CSV row per machine into typed values. Rows with no data at all are dropped. */
export function toImportRows(rows: string[][], map: ColumnMap): ImportRow[] {
  const cell = (r: string[], field: CsvField) => (map[field] >= 0 ? unguardCell((r[map[field]] ?? '').trim()) : '');
  return rows.map((r, i) => {
    const statusText = cell(r, 'status');
    const status = statusText ? lookup(STATUSES, looseKey(statusText)) : undefined;
    return {
      line: i + 2,
      name: cell(r, 'name'),
      platform: lookup(PLATFORMS, looseKey(cell(r, 'platform'))),
      os: lookup(OPERATING_SYSTEMS, looseKey(cell(r, 'os'))) ?? 'Other',
      difficulty: lookup(DIFFICULTIES, looseKey(cell(r, 'difficulty'))) ?? 'Medium',
      status,
      statusUnknown: Boolean(statusText) && !status,
      userPwnedAt: parseIsoDate(cell(r, 'userPwnedAt')),
      rootPwnedAt: parseIsoDate(cell(r, 'rootPwnedAt')),
      tags: parseTags(cell(r, 'tags')),
    };
  });
}

type MachineDraft = Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>;

export interface PlanLink {
  line: number;
  machineId: string;
  name: string;
  platform: Platform;
  status: PipelineStatus;
  userPwnedAt?: string;
  rootPwnedAt?: string;
  /** Tags from the file that the catalog machine does not have yet. */
  addTags: string[];
}
export interface PlanSkip {
  line: number;
  name: string;
  platform?: Platform;
  reason: string;
}
export interface PlanAdd {
  line: number;
  draft: MachineDraft;
  /** The file's status text was not recognised, so the default was used. */
  statusUnknown: boolean;
}
export interface PlanError {
  line: number;
  name: string;
  message: string;
}
export interface ImportPlan {
  link: PlanLink[];
  skipped: PlanSkip[];
  add: PlanAdd[];
  errors: PlanError[];
}

/** The parts of the store that hold user data keyed by machine id. */
export interface ImportStoreData {
  lootItems?: LootItem[];
  credentials?: Credential[];
  credAttempts?: CredAttempt[];
  activitySessions?: ActivitySession[];
}

/** Ids of machines that loot, credentials, attempts or activity sessions point at. */
function touchedMachineIds(data: ImportStoreData): Set<string> {
  const ids = new Set<string>();
  for (const l of data.lootItems ?? []) {
    if (l.machineId) ids.add(l.machineId);
    for (const k of Object.keys(l.verifications ?? {})) ids.add(k);
  }
  for (const c of data.credentials ?? []) {
    if (c.sourceMachineId) ids.add(c.sourceMachineId);
    for (const k of Object.keys(c.verifications ?? {})) ids.add(k);
  }
  for (const a of data.credAttempts ?? []) ids.add(a.machineId);
  for (const s of data.activitySessions ?? []) ids.add(s.machineId);
  return ids;
}

let catalogIpById: { source: Machine[]; map: Map<string, string> } | null = null;
/** The IP the catalog itself gives a machine (a placeholder for most), so only a changed IP counts as the user's. */
function catalogIp(id: string): string | undefined {
  const source = getLoadedMachinesCatalog();
  if (!source) return undefined;
  if (catalogIpById?.source !== source) catalogIpById = { source, map: new Map(source.map((m) => [m.id, m.ip])) };
  return catalogIpById.map.get(id);
}

const hasList = (v: unknown) => Array.isArray(v) && v.length > 0;

/**
 * True when the machine carries nothing of the user's: no progress (hasUserProgress), no loot, credentials,
 * attempts or activity sessions pointing at it, and none of the fields users set by hand (IP, writeup link,
 * skills, review schedule, time to user/root). Stricter than hasUserProgress, which other callers rely on.
 */
export function isUntouchedForImport(m: Machine, touchedIds: ReadonlySet<string>): boolean {
  if (hasUserProgress(m) || touchedIds.has(m.id)) return false;
  if (m.ip && !isPlaceholderIp(m.ip) && m.ip !== catalogIp(m.id)) return false;
  if (typeof m.writeupUrl === 'string' && m.writeupUrl.trim()) return false;
  if (hasList(m.skillsLearned)) return false;
  if ((m.reviewCount ?? 0) > 0 || m.nextReviewAt !== undefined) return false;
  if (m.timeToUserSeconds !== undefined || m.timeToRootSeconds !== undefined) return false;
  return true;
}

const isPwned = (s: PipelineStatus) => s === 'root' || s === 'completed';

/** Pwned dates for a status: the file's date when it parsed, otherwise now (as the status buttons do). */
function resolveDates(status: PipelineStatus, row: ImportRow, now: string): { userPwnedAt?: string; rootPwnedAt?: string } {
  const pwned = isPwned(status);
  const hasUser = status === 'foothold' || pwned;
  return {
    userPwnedAt: hasUser ? row.userPwnedAt ?? (pwned ? row.rootPwnedAt : undefined) ?? now : undefined,
    rootPwnedAt: pwned ? row.rootPwnedAt ?? now : undefined,
  };
}

/**
 * Decides, row by row, what an import would do. Pure: it reads the tracker and writes nothing.
 * - A machine already in the tracker with any progress is skipped, and so is a custom machine of the same name.
 * - A catalog machine with no progress is linked: the file's status, dates and tags are applied to it.
 * - Anything else becomes a new custom machine.
 */
export function planMachinesImport(
  rows: ImportRow[],
  machines: Machine[],
  now: string = new Date().toISOString(),
  data: ImportStoreData = {}
): ImportPlan {
  const plan: ImportPlan = { link: [], skipped: [], add: [], errors: [] };
  const touched = touchedMachineIds(data);
  const customsByKey = new Map<string, Machine[]>();
  const catalog: Machine[] = [];
  for (const m of machines) {
    if (isGenuineCustom(m)) {
      const key = normalizeTargetName(m.name);
      customsByKey.set(key, [...(customsByKey.get(key) ?? []), m]);
    } else {
      catalog.push(m);
    }
  }
  const byId = new Map(machines.map((m) => [m.id, m]));

  // Which rows still need a catalog lookup, grouped by the platform column so each group searches only that platform.
  const seen = new Set<string>();
  const pending: ImportRow[] = [];
  const skip = (row: ImportRow, reason: string) => plan.skipped.push({ line: row.line, name: row.name, platform: row.platform, reason });
  for (const row of rows) {
    if (!row.name) {
      plan.errors.push({ line: row.line, name: '', message: 'Name is empty.' });
      continue;
    }
    const key = normalizeTargetName(row.name);
    if (!key) {
      plan.errors.push({ line: row.line, name: row.name, message: 'Name has no letters or digits.' });
      continue;
    }
    if (row.name.length > MAX_NAME_LENGTH) {
      plan.errors.push({ line: row.line, name: row.name.slice(0, 40) + '...', message: `Name is longer than ${MAX_NAME_LENGTH} characters.` });
      continue;
    }
    const dupKey = `${key}|${row.platform ?? ''}`;
    if (seen.has(dupKey)) {
      skip(row, 'Repeated in this file');
      continue;
    }
    seen.add(dupKey);
    const custom = customsByKey.get(key)?.find((c) => !row.platform || c.platform === row.platform);
    if (custom) {
      skip(row, 'Already in your tracker');
      continue;
    }
    pending.push(row);
  }

  const groups = new Map<string, ImportRow[]>();
  for (const row of pending) {
    if (row.platform === 'Custom') continue;
    const g = row.platform ?? '';
    groups.set(g, [...(groups.get(g) ?? []), row]);
  }
  // Exact and id-derived matches only. The matcher's substring fallback could link "Forestry" to "Forest".
  const matchByRow = new Map<ImportRow, string | null>();
  for (const [g, groupRows] of groups) {
    const pool = g ? catalog.filter((m) => m.platform === g) : catalog;
    const result = matchCandidateNamesToCatalog(groupRows.map((r) => r.name), pool);
    const found = new Map(result.allMatches.map((m) => [m.rawInput, m]));
    const unmatched = new Set(result.unmatched);
    for (const row of groupRows) {
      let hit = found.get(row.name);
      // The matcher drops a name whose machine an earlier name in the batch already took (even by a loose
      // substring match). Look such a row up on its own so it still gets its own answer.
      if (!hit && !unmatched.has(row.name)) hit = matchCandidateNamesToCatalog([row.name], pool).allMatches[0];
      matchByRow.set(row, hit && hit.confidence >= 0.95 ? hit.machineId : null);
    }
  }

  const claimed = new Set<string>();
  const addedKeys = new Set<string>();
  for (const row of pending) {
    const matchedId = matchByRow.get(row) ?? null;
    const machine = matchedId ? byId.get(matchedId) : undefined;
    if (machine) {
      if (claimed.has(machine.id)) {
        skip(row, 'Same machine as an earlier row');
        continue;
      }
      claimed.add(machine.id);
      if (!isUntouchedForImport(machine, touched)) {
        skip(row, 'Already tracked: your progress is kept');
        continue;
      }
      const status = row.status ?? 'backlog';
      const have = new Set((machine.tags ?? []).map((t) => t.toLowerCase()));
      const addTags = row.tags.filter((t) => !have.has(t.toLowerCase()));
      if (status === 'backlog' && addTags.length === 0) {
        skip(row, 'Already in your tracker');
        continue;
      }
      plan.link.push({
        line: row.line,
        machineId: machine.id,
        name: machine.name,
        platform: machine.platform,
        status,
        ...(status === 'backlog' ? {} : resolveDates(status, row, now)),
        addTags,
      });
      continue;
    }
    // New customs get an id from the clock and the name, so two of one name (say HTB and THM) must not both be added.
    const addKey = normalizeTargetName(row.name);
    if (addedKeys.has(addKey)) {
      skip(row, 'Repeated in this file');
      continue;
    }
    addedKeys.add(addKey);
    const status = row.status ?? 'backlog';
    plan.add.push({
      line: row.line,
      statusUnknown: row.statusUnknown,
      draft: {
        name: row.name,
        ip: '10.10.x.x',
        os: row.os,
        platform: row.platform ?? 'Custom',
        difficulty: row.difficulty,
        status,
        isActive: false,
        tags: row.tags,
        certifications: [],
        timeSpentSeconds: 0,
        ...resolveDates(status, row, now),
      },
    });
  }
  plan.skipped.sort((a, b) => a.line - b.line);
  return plan;
}

export interface ImportResult {
  linked: number;
  added: number;
  skipped: number;
}

/**
 * Writes a plan to the tracker. Re-checks every linked machine first: one that gained progress since the
 * preview is left alone. Existing machines with progress are never in the plan, so they are never written.
 */
export function applyMachinesImport(plan: ImportPlan): ImportResult {
  const store = useCtfStore;
  const state = store.getState();
  const current = new Map(state.machines.map((m) => [m.id, m]));
  const touched = touchedMachineIds(state);
  const links = plan.link.filter((l) => {
    const m = current.get(l.machineId);
    return m !== undefined && isUntouchedForImport(m, touched);
  });
  const stamp = new Date().toISOString();

  const statusUpdates = links.filter((l) => l.status !== 'backlog').map((l) => ({ machineId: l.machineId, status: l.status }));
  if (statusUpdates.length > 0) store.getState().batchUpdateMachineStatus(statusUpdates);

  const patches = new Map(links.map((l) => [l.machineId, l]));
  if (patches.size > 0) {
    store.setState((s) => ({
      machines: s.machines.map((m) => {
        const l = patches.get(m.id);
        if (!l) return m;
        return {
          ...m,
          ...(l.userPwnedAt ? { userPwnedAt: l.userPwnedAt } : {}),
          ...(l.rootPwnedAt ? { rootPwnedAt: l.rootPwnedAt } : {}),
          tags: l.addTags.length > 0 ? [...(m.tags ?? []), ...l.addTags] : m.tags,
          // Newer than any older copy, so a sync merge keeps this edit (tag-only links included).
          updatedAt: stamp,
        };
      }),
      unexportedChangesCount: (s.unexportedChangesCount || 0) + 1,
    }));
  }

  // Same creation path as addCustomMachine, in one write: 5,000 single adds would re-save the whole profile 5,000 times.
  store.getState().addCustomMachines(plan.add.map((a) => a.draft));

  return {
    linked: links.length,
    added: plan.add.length,
    skipped: plan.skipped.length + (plan.link.length - links.length),
  };
}

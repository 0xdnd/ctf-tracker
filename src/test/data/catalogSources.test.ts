import { describe, it, expect } from 'vitest';
import pg from '../../data/catalogSources/pg.json';
import vulnhub from '../../data/catalogSources/vulnhub.json';
import { INITIAL_MACHINES } from '../../data/machinesCatalog';
import { appendActiveMachines } from '../../data/activeMachines';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expandPgRows, expandVulnhubRows, unpackVulnhubRows } from '../../data/loadMachinesCatalog';
import type { PgRow, VulnhubPackedRow } from '../../types';
import tjnull from '../../data/trackSources/tjnull-oscp.json';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { normalize, TJ_ALIASES } = require('../../../scripts/import-catalog-candidates.cjs') as {
  normalize: (n: string) => string;
  TJ_ALIASES: Record<string, string>;
};

type Row = { id: string; name: string; hint?: string; difficulty: string; tags: string[]; certifications: string[] };
const PG_PACKED = pg as unknown as PgRow[];
const PG_ROWS = expandPgRows(PG_PACKED) as unknown as Row[];
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pgPack = require('../../../scripts/lib/pg-pack.cjs') as { unpackRows: (p: unknown) => unknown[]; packRows: (r: unknown) => unknown[] };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pack = require('../../../scripts/lib/vulnhub-pack.cjs') as { unpackRows: (p: unknown) => unknown[]; packRows: (r: unknown) => unknown[] };
const VH_PACKED = vulnhub as unknown as VulnhubPackedRow[];
const VH_COMPACT = unpackVulnhubRows(VH_PACKED);
const VH_ROWS = expandVulnhubRows(VH_PACKED) as unknown as Row[];
const readData = (rel: string) => JSON.parse(readFileSync(resolve(__dirname, '../../..', rel), 'utf8')) as unknown;
const VH_RAW = readData('scripts/data/vulnhub-raw.json') as { slug: string; url: string }[];
const PG_LEGACY = readData('scripts/data/pg-legacy-rows.json') as { id: string; certifications: string[] }[];
const PG_ID_MAP = readData('scripts/data/pg-id-map.json') as Record<string, string>;
const VH_ID_MAP = readData('scripts/data/vulnhub-id-map.json') as Record<string, string | null>;
// PG rows = every mapped official lab id (scripts/data/pg-id-map.json) plus any legacy row not in the official list.
const EXPECTED_PG_IDS = new Set([...Object.values(PG_ID_MAP), ...PG_LEGACY.map((r) => r.id)]);
const MIN_PG_COUNT = 339;
const ALL = [...PG_ROWS, ...VH_ROWS];
const DIFFICULTIES = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];

describe('catalog source JSON', () => {
  it('has the expected row counts', () => {
    // The VulnHub rows are generated from the raw cache plus the legacy rows that have no match in it.
    const unmatched = Object.values(VH_ID_MAP).filter((s) => s === null).length;
    expect(VH_ROWS).toHaveLength(VH_RAW.length + unmatched);
    // Every mapped official lab id and legacy id must exist; pg.json may also keep previously-shipped labs
    // that OffSec later unlisted (protectedRows in scripts/sync-pg.mjs).
    const pgIds = new Set(PG_ROWS.map((r) => r.id));
    for (const id of EXPECTED_PG_IDS) expect(pgIds.has(id), id).toBe(true);
    expect(PG_ROWS.length).toBeGreaterThanOrEqual(EXPECTED_PG_IDS.size);
    expect(PG_ROWS.length).toBeGreaterThanOrEqual(MIN_PG_COUNT);
  });

  it('decodes the compact PG file the same way in the app and in the build scripts, and repacks to the same file', () => {
    expect(JSON.stringify(pgPack.unpackRows(PG_PACKED))).toBe(JSON.stringify(PG_ROWS));
    expect(pgPack.packRows(PG_ROWS)).toEqual(PG_PACKED);
  });

  it('keeps every legacy PG id, and every legacy OSCP id keeps OSCP', () => {
    const byId = new Map(PG_ROWS.map((m) => [m.id, m]));
    for (const old of PG_LEGACY) {
      const row = byId.get(old.id);
      expect(row, old.id).toBeDefined();
      if (old.certifications.includes('OSCP')) expect(row!.certifications, old.id).toContain('OSCP');
    }
  });

  it('decodes the packed file the same way in the app and in the build scripts, and repacks to the same file', () => {
    expect(pack.unpackRows(VH_PACKED)).toEqual(VH_COMPACT);
    expect(pack.packRows(VH_COMPACT)).toEqual(VH_PACKED);
  });

  it('keeps every legacy VulnHub id, each pointing at its mapped entry', () => {
    const byId = new Map(VH_COMPACT.map((r) => [r.id, r]));
    const urlBySlug = new Map(VH_RAW.map((e) => [e.slug, e.url]));
    expect(Object.keys(VH_ID_MAP).length).toBeGreaterThanOrEqual(122);
    for (const [id, slug] of Object.entries(VH_ID_MAP)) {
      expect(byId.has(id), id).toBe(true);
      if (slug !== null) expect(byId.get(id)!.roomUrl, id).toBe(urlBySlug.get(slug));
    }
  });

  it('links every real VulnHub entry row to its entry page and flags only unrated rows', () => {
    const entry = VH_COMPACT.filter((r) => r.roomUrl.startsWith('https://www.vulnhub.com/entry/'));
    expect(entry).toHaveLength(VH_RAW.length);
    expect(VH_COMPACT.filter((r) => r.difficultyUnrated && r.difficulty !== 'Medium')).toEqual([]);
  });

  it('imports no hint text', () => {
    expect(ALL.filter((m) => m.hint)).toEqual([]);
  });

  it('has unique ids that do not collide with existing catalog rows', () => {
    const existing = new Set<string>(appendActiveMachines(INITIAL_MACHINES).map((m) => m.id));
    const ids = ALL.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => existing.has(id))).toEqual([]);
  });

  it('drops Smasher 1 and Scarlet 1 and keeps Kira: CTF', () => {
    const names = ALL.map((m) => m.name);
    expect(names).not.toContain('Smasher 1');
    expect(names).not.toContain('Scarlet 1');
    expect(names).toContain('Kira: CTF');
  });

  it('uses valid difficulties', () => {
    expect(ALL.filter((m) => !DIFFICULTIES.includes(m.difficulty))).toEqual([]);
  });

  it('keeps no pg- twin for rows tagged Also-on-PG-Play (normalized names)', () => {
    const pgNames = new Set(PG_ROWS.map((m) => normalize(m.name)));
    const tagged = VH_ROWS.filter((m) => m.tags.includes('Also-on-PG-Play'));
    expect(tagged).toHaveLength(15);
    expect(tagged.filter((m) => pgNames.has(normalize(m.name)))).toEqual([]);
  });

  it('grants OSCP only to TJ-Null PG rows and their deduped VulnHub twins', () => {
    const pgNames = new Set(PG_ROWS.map((m) => m.name.toLowerCase()));
    const tjPG = new Set([...tjnull.names.pgPlay, ...tjnull.names.pgPractice].map((e) => e.name.toLowerCase()));
    const tjPlay = new Set(tjnull.names.pgPlay.map((e) => normalize(e.name)));
    for (const m of PG_ROWS) {
      expect(m.certifications.includes('OSCP'), m.id).toBe(tjPG.has(m.name.toLowerCase()));
    }
    for (const m of VH_ROWS) {
      const expected = m.tags.includes('Also-on-PG-Play') && (tjPlay.has(normalize(m.name)) || tjPlay.has(TJ_ALIASES[normalize(m.name)]));
      expect(m.certifications.includes('OSCP'), m.id).toBe(expected);
    }
    expect(pgNames.size).toBeGreaterThan(0);
  });
});

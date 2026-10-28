import { describe, it, expect } from 'vitest';
import pg from '../../data/catalogSources/pg.json';
import vulnhub from '../../data/catalogSources/vulnhub.json';
import { INITIAL_MACHINES } from '../../data/machinesCatalog';
import { appendActiveMachines } from '../../data/activeMachines';
import tjnull from '../../data/trackSources/tjnull-oscp.json';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { normalize, TJ_ALIASES } = require('../../../scripts/import-catalog-candidates.cjs') as {
  normalize: (n: string) => string;
  TJ_ALIASES: Record<string, string>;
};

type Row = { id: string; name: string; hint?: string; difficulty: string; tags: string[]; certifications: string[] };
const PG_ROWS = pg as unknown as Row[];
const VH_ROWS = vulnhub as unknown as Row[];
// 238 PG rows minus 15 PG Play rows deduped into VulnHub (script prints this).
const PG_COUNT = 223;
const ALL = [...PG_ROWS, ...VH_ROWS];
const DIFFICULTIES = ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];

describe('catalog source JSON', () => {
  it('has the expected row counts', () => {
    expect(VH_ROWS).toHaveLength(122);
    expect(PG_ROWS).toHaveLength(PG_COUNT);
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

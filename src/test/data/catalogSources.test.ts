import { describe, it, expect } from 'vitest';
import pg from '../../data/catalogSources/pg.json';
import vulnhub from '../../data/catalogSources/vulnhub.json';
import active from '../../data/activeMachines.json';
import { INITIAL_MACHINES } from '../../data/machinesCatalog';

type Row = { id: string; name: string; hint?: string; difficulty: string; tags: string[] };
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
    const existing = new Set<string>([
      ...INITIAL_MACHINES.map((m) => m.id),
      ...(active.machines as { name: string }[]).map((m) => `htb-${m.name.toLowerCase()}`),
    ]);
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

  it('keeps no pg- twin for rows tagged Also-on-PG-Play', () => {
    const pgNames = new Set(PG_ROWS.map((m) => m.name.toLowerCase()));
    const tagged = VH_ROWS.filter((m) => m.tags.includes('Also-on-PG-Play'));
    expect(tagged.length).toBeGreaterThan(0);
    expect(tagged.filter((m) => pgNames.has(m.name.toLowerCase()))).toEqual([]);
  });
});

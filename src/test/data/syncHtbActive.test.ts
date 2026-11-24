import { describe, it, expect } from 'vitest';
// @ts-expect-error plain ESM script without types
import { normalizeMachines, checkCeiling, archiveRetiredMachines, baseNameSlug, MIN_ACTIVE, MAX_ACTIVE } from '../../../scripts/sync-htb-active.mjs';
import { appendRetiredHtbMachines, RETIRED_HTB } from '../../data/retiredHtb';
import { ACTIVE_MACHINES, appendActiveMachines } from '../../data/activeMachines';
import { STATIC_INITIAL_MACHINES } from '../../data/machinesCatalog';
import { LIST_BASED_TRACK_IDS, PRACTICE_TRACKS, TRACK_BY_ID, TRACK_NAME_LISTS, trackNameSlug } from '../../data/tracksData';
import type { Machine } from '../../types';

type Row = { name: string; releasedAt: string };

const mk = (i: number, extra: Record<string, unknown> = {}) => ({
  name: `Box${i}`,
  os: 'Linux',
  difficultyText: 'Medium',
  release: `2026-10-${String(10 + (i % 15)).padStart(2, '0')}T19:00:00.000000Z`,
  retired: false,
  user_flag: 'SECRET',
  hint: 'x',
  ...extra,
});

describe('sync-htb-active normalizeMachines', () => {
  const page = {
    data: [
      ...Array.from({ length: 12 }, (_, i) => mk(i)),
      mk(100, { retiredDate: '2026-01-01T00:00:00Z' }),
      mk(101, { name: 'Seasonal', os: 'Windows', difficultyText: 'Hard', season: { name: 'AERO' } }),
    ],
  };

  it('filters retired and maps fields', () => {
    const out: Row[] = normalizeMachines([page]);
    expect(out.find((m) => m.name === 'Box100')).toBeUndefined();
    expect(out.find((m) => m.name === 'Seasonal')).toEqual({
      name: 'Seasonal',
      os: 'Windows',
      difficulty: 'Hard',
      releasedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      season: 'AERO',
    });
    expect(out).toHaveLength(13);
    const dates = out.map((m) => m.releasedAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it('keeps metadata only and no token-like strings', () => {
    const out: Record<string, unknown>[] = normalizeMachines([page]);
    expect(JSON.stringify(out)).not.toMatch(/SECRET|user_flag|hint|Bearer|eyJ[A-Za-z0-9_-]{10,}/);
    for (const m of out) {
      expect(Object.keys(m).every((k) => ['name', 'os', 'difficulty', 'releasedAt', 'season'].includes(k))).toBe(true);
    }
  });

  it('rejects unrecognized shapes and exposes the 10-machine floor', () => {
    expect(() => normalizeMachines([{ nope: 1 }])).toThrow();
    expect(MIN_ACTIVE).toBe(10);
    expect(normalizeMachines([{ data: [mk(1), mk(2)] }]).length).toBeLessThan(MIN_ACTIVE);
  });
});

describe('sync-htb-active guards', () => {
  const names = (n: number, p = 'A') => Array.from({ length: n }, (_, i) => `${p}${i}`);

  it('accepts a normal refresh', () => {
    expect(checkCeiling(names(20), [...names(18), 'New1', 'New2'])).toBeNull();
  });

  it('refuses more than the active ceiling', () => {
    expect(MAX_ACTIVE).toBe(60);
    expect(checkCeiling(names(20), names(MAX_ACTIVE + 1))).toMatch(/ceiling/);
    expect(checkCeiling(names(20), names(MAX_ACTIVE))).toBeNull();
  });

  it('refuses when more than half of previous names would be removed', () => {
    expect(checkCeiling(names(20), names(20, 'B'))).toMatch(/more than half/);
    expect(checkCeiling(names(20), [...names(10), ...names(10, 'B')])).toBeNull();
  });

  it('strips backticks and newlines from names', () => {
    const out: Row[] = normalizeMachines([{ data: [mk(1, { name: 'Ev`il\nBox' })] }]);
    expect(out[0].name).toBe('Ev il Box');
  });
});

describe('sync-htb-active archiveRetiredMachines & appendRetiredHtbMachines', () => {
  const pingPong = { name: 'PingPong', os: 'Windows' as const, difficulty: 'Insane' as const, releasedAt: '2026-04-25' };
  const handler = { name: 'Handler', os: 'Linux' as const, difficulty: 'Medium' as const, releasedAt: '2026-11-21' };
  const connected = { name: 'Connected', os: 'Linux' as const, difficulty: 'Easy' as const, releasedAt: '2026-06-06' };

  it('archives retired HTB boxes as metadata-only rows without duplicating static or parenthetical names', () => {
    const res = archiveRetiredMachines(
      [connected, pingPong, { name: 'Active', os: 'Windows', difficulty: 'Easy', releasedAt: '2018-07-28' }],
      [handler, connected],
      [],
      new Set(['Active (2018 Retired)', 'Lame']),
      '2026-11-23',
    );
    expect(res.archived).toEqual(['PingPong']);
    expect(res.pruned).toEqual([]);
    expect(res.machines).toEqual([
      { name: 'PingPong', os: 'Windows', difficulty: 'Insane', releasedAt: '2026-04-25', retiredAt: '2026-11-23' },
    ]);
    expect(baseNameSlug('Active (2018 Retired)')).toBe('active');
  });

  it('prunes retired entries that re-appear in nextActive or later join static catalog', () => {
    const res = archiveRetiredMachines(
      [handler],
      [handler, pingPong],
      [
        { name: 'PingPong', os: 'Windows', difficulty: 'Insane', releasedAt: '2026-04-25', retiredAt: '2026-11-23' },
        { name: 'Lame', os: 'Linux', difficulty: 'Easy', releasedAt: '2017-03-14', retiredAt: '2026-11-20' },
        { name: 'OlderRetired', os: 'Linux', difficulty: 'Medium', releasedAt: '2026-01-01', retiredAt: '2026-11-01' },
      ],
      new Set(['Lame']),
      '2026-11-30',
    );
    expect(res.archived).toEqual([]);
    expect(res.pruned).toEqual(['PingPong', 'Lame']);
    expect(res.machines.map((m: { name: string }) => m.name)).toEqual(['OlderRetired']);
  });

  it('keeps retired AD track machines resolvable with explicit isActive: false, zero spoilers, and collision-safe ids', () => {
    const base: Machine[] = [
      {
        id: 'htb-pingpong',
        name: 'OtherBox',
        ip: '10.10.10.x',
        os: 'Linux',
        platform: 'THM',
        difficulty: 'Easy',
        status: 'backlog',
        tags: [],
        certifications: [],
        roomUrl: 'https://tryhackme.com/room/other',
        timeSpentSeconds: 0,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const withRetired = appendRetiredHtbMachines(base, {
      asOf: '2026-11-23',
      source: 'test',
      machines: [{ ...pingPong, retiredAt: '2026-11-23' }],
    });
    const full = appendActiveMachines(withRetired, {
      asOf: '2026-11-23',
      source: 'test',
      machines: [handler, connected],
    });
    const row = full.find((m) => m.platform === 'HTB' && trackNameSlug(m.name) === 'pingpong');
    expect(row).toBeDefined();
    expect(row!.id).toBe('htb-retired-pingpong');
    expect(row!.isActive).toBe(false);
    expect(row!.tags).toEqual([]);
    expect(row!.hint).toBeUndefined();
    expect(row!.writeupUrl).toBeUndefined();
    expect(TRACK_BY_ID.get('crto-ad')!.filterFn(row!)).toBe(true);
    expect(full.filter((m) => m.isActive)).toHaveLength(2);
  });

  it('end-to-end simulation: retiring the oldest active HTB box keeps every practice track and id invariant green', () => {
    const oldest = ACTIVE_MACHINES.machines[ACTIVE_MACHINES.machines.length - 1];
    const nextActive = [
      { name: 'SimulatedFreshBox', os: 'Linux' as const, difficulty: 'Medium' as const, releasedAt: '2026-11-24' },
      ...ACTIVE_MACHINES.machines.slice(0, -1),
    ];
    const staticHtbNames = new Set(
      STATIC_INITIAL_MACHINES.filter((m) => m.platform === 'HTB').map((m) => baseNameSlug(m.name)),
    );
    const archived = archiveRetiredMachines(
      ACTIVE_MACHINES.machines,
      nextActive,
      RETIRED_HTB.machines,
      staticHtbNames,
      '2026-11-24',
    );
    expect(archived.archived).toContain(oldest.name);

    const nextInitial = appendRetiredHtbMachines(STATIC_INITIAL_MACHINES, {
      asOf: '2026-11-24',
      source: 'test-sim',
      machines: archived.machines,
    });
    const nextFull = appendActiveMachines(nextInitial, {
      asOf: '2026-11-24',
      source: 'test-sim',
      machines: nextActive,
    });

    // Unique ids across full HTB+THM catalog
    expect(new Set(nextFull.map((m) => m.id)).size).toBe(nextFull.length);
    // Every practice track name resolves to exactly 1 row (guards against the Nov 23 PingPong failure)
    for (const [key, list] of Object.entries(TRACK_NAME_LISTS)) {
      for (const platform of ['HTB', 'THM'] as const) {
        for (const name of list[platform]) {
          const hits = nextFull.filter((m) => m.platform === platform && trackNameSlug(m.name) === trackNameSlug(name));
          expect(hits, `${key} ${platform} ${name}`).toHaveLength(1);
        }
      }
    }
    // No active machine enters any list-based track
    const activeRows = nextFull.filter((m) => m.isActive);
    for (const t of PRACTICE_TRACKS.filter((tr) => LIST_BASED_TRACK_IDS.has(tr.id))) {
      expect(activeRows.filter(t.filterFn).map((m) => m.name), t.id).toEqual([]);
    }
  });
});

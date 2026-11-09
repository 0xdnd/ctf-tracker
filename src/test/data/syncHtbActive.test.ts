import { describe, it, expect } from 'vitest';
// @ts-expect-error plain ESM script without types
import { normalizeMachines, checkCeiling, MIN_ACTIVE, MAX_ACTIVE } from '../../../scripts/sync-htb-active.mjs';

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

import { afterEach, describe, expect, it } from 'vitest';
import { buildActivityCounts, computeStreaks, startOfWeek, weeklyProgress } from './streakEngine';
import { toLocalDateKey } from './analyticsHeatmap';

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h);

describe('computeStreaks', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it('handles an empty history', () => {
    expect(computeStreaks({}, at(2026, 10, 7))).toEqual({ current: 0, longest: 0, lastActiveDay: null, activeToday: false });
    expect(computeStreaks([], at(2026, 10, 7)).current).toBe(0);
  });

  it('counts a single day today', () => {
    const r = computeStreaks({ '2026-10-07': 2 }, at(2026, 10, 7));
    expect(r).toEqual({ current: 1, longest: 1, lastActiveDay: '2026-10-07', activeToday: true });
  });

  it('breaks the current streak on a gap but keeps the longest', () => {
    const r = computeStreaks(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-06', '2026-10-07'], at(2026, 10, 7));
    expect(r.current).toBe(2);
    expect(r.longest).toBe(3);
  });

  it('keeps the streak alive through the grace window when only yesterday is active', () => {
    const r = computeStreaks(['2026-10-05', '2026-10-06'], at(2026, 10, 7, 23));
    expect(r.current).toBe(2);
    expect(r.activeToday).toBe(false);
    expect(r.lastActiveDay).toBe('2026-10-06');
  });

  it('resets once a full day is missed', () => {
    const r = computeStreaks(['2026-10-04', '2026-10-05'], at(2026, 10, 7));
    expect(r.current).toBe(0);
    expect(r.longest).toBe(2);
  });

  it('ignores zero counts, future days and malformed keys', () => {
    const r = computeStreaks({ '2026-10-07': 0, '2026-10-08': 3, nope: 4, '2026-10-06': 1 }, at(2026, 10, 7));
    expect(r.current).toBe(1);
    expect(r.lastActiveDay).toBe('2026-10-06');
  });

  it('separates longest from current', () => {
    const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-10-06', '2026-10-07'];
    const r = computeStreaks(days, at(2026, 10, 7));
    expect(r.current).toBe(2);
    expect(r.longest).toBe(5);
  });

  [undefined, 'Europe/Berlin', 'America/New_York'].forEach((tz) => {
    it(`stays consecutive across DST changes (TZ=${tz ?? 'default'})`, () => {
      if (tz) process.env.TZ = tz;
      const eu = ['2026-03-27', '2026-03-28', '2026-03-29', '2026-03-30', '2026-03-31'];
      expect(computeStreaks(eu, at(2026, 3, 31)).current).toBe(5);
      const usSpring = ['2026-03-07', '2026-03-08', '2026-03-09'];
      expect(computeStreaks(usSpring, at(2026, 3, 9, 0)).longest).toBe(3);
      const usFall = ['2026-10-31', '2026-11-01', '2026-11-02'];
      const r = computeStreaks(usFall, at(2026, 11, 2, 0));
      expect(r.current).toBe(3);
      expect(r.longest).toBe(3);
    });
  });

  it('merges legacy UTC date-only keys and local keys', () => {
    const local = new Date(2026, 9, 7, 0, 30);
    const counts = buildActivityCounts(
      [{ date: '2026-10-05' }, { date: '2026-10-06' }], // legacy date-only strings
      [{ rootPwnedAt: local.toISOString() }], // stamp converted to the local key
    );
    expect(counts[toLocalDateKey(local)]).toBe(1);
    const r = computeStreaks(counts, at(2026, 10, 7));
    expect(r.current).toBe(3);
    expect(r.activeToday).toBe(true);
  });

  it('counts a day with multiple sources once', () => {
    const counts = buildActivityCounts([{ date: '2026-10-07' }], [{ userPwnedAt: at(2026, 10, 7).toISOString() }]);
    expect(counts['2026-10-07']).toBe(2);
    expect(computeStreaks(counts, at(2026, 10, 7)).current).toBe(1);
  });

  it('localizes sessions with UTC timestamps on read without altering stored date', () => {
    const parsed = new Date('2026-03-01T23:30:00Z');
    const localDay = toLocalDateKey(parsed);
    const counts = buildActivityCounts([{ date: '2026-03-01T23:30:00Z' }], []);
    expect(counts[localDay]).toBe(1);
    expect(counts['2026-03-01T23:30:00Z']).toBeUndefined();
  });
});

describe('weeklyProgress', () => {
  it('starts weeks on Monday', () => {
    expect(toLocalDateKey(startOfWeek(at(2026, 10, 11)))).toBe('2026-10-05'); // Sunday -> prior Monday
    expect(toLocalDateKey(startOfWeek(at(2026, 10, 5)))).toBe('2026-10-05');
    expect(toLocalDateKey(startOfWeek(at(2026, 10, 7), 0))).toBe('2026-10-04');
  });

  it('counts roots and flags inside the week only', () => {
    const machines = [
      { rootPwnedAt: at(2026, 10, 5).toISOString(), userPwnedAt: at(2026, 10, 5).toISOString() },
      { userPwnedAt: at(2026, 10, 11).toISOString() },
      { rootPwnedAt: at(2026, 10, 4).toISOString(), userPwnedAt: at(2026, 10, 4).toISOString() }, // previous Sunday
      { rootPwnedAt: at(2026, 10, 12).toISOString() }, // next Monday
      {},
    ];
    expect(weeklyProgress(machines, startOfWeek(at(2026, 10, 8)))).toEqual({ rootedThisWeek: 1, flagsThisWeek: 3 });
  });
});

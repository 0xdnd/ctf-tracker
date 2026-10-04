import { describe, it, expect } from 'vitest';
import { buildBurndownSeries, resolveChartWindow } from './examBurndown';
import { calculateExamScore, createDefaultProof, ExamBox, AdRole } from './examComplianceUtils';

const START = Date.parse('2026-01-01T00:00:00.000Z');
const HOUR = 3600 * 1000;
const END = START + 24 * HOUR;
const at = (h: number) => new Date(START + h * HOUR).toISOString();

function box(id: string, overrides: Partial<ExamBox> = {}): ExamBox {
  return {
    id,
    name: id,
    ip: '10.0.0.1',
    os: 'Linux',
    difficulty: 'Medium',
    type: 'standalone',
    label: id,
    userPoints: 10,
    rootPoints: 10,
    userPwned: false,
    rootPwned: false,
    userProof: createDefaultProof(),
    rootProof: createDefaultProof(),
    ...overrides,
  } as ExamBox;
}

function adBox(id: string, role: AdRole, userPoints: number, rootPoints: number, overrides: Partial<ExamBox> = {}) {
  return box(id, { type: `ad-${role}`, adRole: role, userPoints, rootPoints, ...overrides });
}

function pwned(b: ExamBox, userH: number | null, rootH: number | null): ExamBox {
  return {
    ...b,
    userPwned: userH !== null,
    rootPwned: rootH !== null,
    initialAccessAt: userH !== null ? at(userH) : undefined,
    privEscAt: rootH !== null ? at(rootH) : undefined,
    userProof: { ...b.userProof, pwnedAt: userH !== null ? at(userH) : undefined },
    rootProof: { ...b.rootProof, pwnedAt: rootH !== null ? at(rootH) : undefined },
  };
}

describe('buildBurndownSeries', () => {
  it('returns a flat 0 series for empty boxes', () => {
    const s = buildBurndownSeries([], START, END, 70);
    expect(s.steps).toEqual([{ t: START, points: 0, remainingToPass: 70 }]);
    expect(s.steps.every((p) => p.points === 0 && p.remainingToPass === 70)).toBe(true);
  });

  it('returns a flat 0 series when boxes exist but nothing is pwned', () => {
    const s = buildBurndownSeries([box('a'), box('b')], START, END, 70);
    expect(s.steps.map((p) => p.points)).toEqual([0]);
  });

  it('builds the ideal pace line from start to expiry', () => {
    const s = buildBurndownSeries([], START, END, 70);
    expect(s.ideal).toEqual([
      { t: START, points: 0 },
      { t: END, points: 70 },
    ]);
  });

  it('sorts out-of-order events and accumulates points', () => {
    const late = pwned(box('late'), 6, 7);
    const early = pwned(box('early'), 1, null);
    const mid = pwned(box('mid'), 3, 4);
    const s = buildBurndownSeries([late, early, mid], START, END, 70);
    const ts = s.steps.map((p) => p.t);
    expect(ts).toEqual([...ts].sort((a, b) => a - b));
    expect(s.steps.map((p) => p.points)).toEqual([0, 10, 20, 30, 40, 50]);
    expect(s.steps[s.steps.length - 1].remainingToPass).toBe(20);
  });

  it('final step agrees with calculateExamScore on the full box set', () => {
    const boxes = [pwned(box('a'), 1, 2), pwned(box('b'), 5, null), pwned(box('c'), 9, 10)];
    const s = buildBurndownSeries(boxes, START, END, 70);
    expect(s.steps[s.steps.length - 1].points).toBe(calculateExamScore('OSCP', boxes).totalScore);
  });

  it('AD set only scores once every AD box is complete (all-or-nothing)', () => {
    const boxes = [
      pwned(adBox('ad1', 'foothold', 10, 0), 1, null),
      pwned(adBox('ad2', 'lateral', 10, 0), 2, null),
      pwned(adBox('dc', 'dc', 0, 20), null, 5),
      pwned(box('s1'), 3, 4), // standalone scores independently: +10 at 3h, +10 at 4h
    ];
    const s = buildBurndownSeries(boxes, START, END, 70);
    const byHour = (h: number) =>
      [...s.steps].reverse().find((p) => p.t <= START + h * HOUR)!.points;

    expect(byHour(0)).toBe(0);
    expect(byHour(2)).toBe(0); // AD partially done: 0 pts
    expect(byHour(3)).toBe(10); // standalone user only
    expect(byHour(4)).toBe(20);
    expect(byHour(5)).toBe(60); // AD completes: 40 pts land at once
    expect(s.steps[s.steps.length - 1].points).toBe(calculateExamScore('OSCP', boxes).totalScore);
  });

  it('non-OSCP tracks score partial progress without the AD rule', () => {
    const boxes = [pwned(adBox('ad1', 'foothold', 10, 0), 1, null), pwned(box('s1'), 2, null)];
    const s = buildBurndownSeries(boxes, START, END, 85, { track: 'CPTS' });
    expect(s.steps.map((p) => p.points)).toEqual([0, 10, 20]);
  });

  it('applies includeBonusPoints exactly as calculateExamScore does', () => {
    const boxes = [pwned(box('a'), 1, null)];
    const s = buildBurndownSeries(boxes, START, END, 70, { includeBonusPoints: true });
    expect(s.steps[0].points).toBe(calculateExamScore('OSCP', [box('a')], { includeBonusPoints: true }).totalScore);
    expect(s.steps[s.steps.length - 1].points).toBe(calculateExamScore('OSCP', boxes, { includeBonusPoints: true }).totalScore);
  });

  it('EXCLUDES events after expiresAt', () => {
    const boxes = [pwned(box('a'), 1, null), pwned(box('b'), 25, 26)];
    const s = buildBurndownSeries(boxes, START, END, 70);
    expect(s.steps.map((p) => p.points)).toEqual([0, 10]);
    expect(s.steps.every((p) => p.t <= END)).toBe(true);
  });

  it('CLAMPS events before startedAt to startedAt', () => {
    const boxes = [pwned(box('a'), -2, null)];
    const s = buildBurndownSeries(boxes, START, END, 70);
    expect(s.steps).toEqual([{ t: START, points: 10, remainingToPass: 60 }]);
  });

  it('treats a pwned flag with no timestamp as captured at startedAt', () => {
    const s = buildBurndownSeries([box('a', { userPwned: true })], START, END, 70);
    expect(s.steps[0].points).toBe(10);
  });

  it('remainingToPass never goes negative', () => {
    const boxes = [pwned(box('a'), 1, 1), pwned(box('b'), 2, 2), pwned(box('c'), 3, 3), pwned(box('d'), 4, 4)];
    const s = buildBurndownSeries(boxes, START, END, 70);
    const last = s.steps[s.steps.length - 1];
    expect(last.points).toBe(80);
    expect(last.remainingToPass).toBe(0);
  });
});

describe('resolveChartWindow (pause -> resume -> pause)', () => {
  const DUR = 24 * 3600;
  // t=3h pause (21h left) -> t=4h resume (expires 25h) -> t=6h pause (19h left)
  const resumedExpiry = START + 25 * HOUR;
  const flagged = [pwned(box('a'), 5.5, null)];
  const pausedInput = {
    startedAt: START,
    examExpiresAt: null,
    lastExpiresAt: resumedExpiry,
    totalDurationSeconds: DUR,
    timerPausedRemainingSeconds: 19 * 3600,
    currentRemainingSeconds: 19 * 3600,
    boxes: flagged,
  };

  it('puts "now" on the wall-clock pause moment, not startedAt + duration - remaining', () => {
    const { nowMs } = resolveChartWindow(pausedInput);
    expect(nowMs).toBe(START + 6 * HOUR);
    // the buggy derivation lands before the latest flag
    expect(START + DUR * 1000 - 19 * 3600 * 1000).toBeLessThan(START + 5.5 * HOUR);
  });

  it('keeps end stable between running and paused (no x-scale jump)', () => {
    const running = resolveChartWindow({
      ...pausedInput,
      examExpiresAt: resumedExpiry,
      timerPausedRemainingSeconds: null,
      currentRemainingSeconds: 19 * 3600,
    });
    const paused = resolveChartWindow(pausedInput);
    expect(paused.end).toBe(running.end);
    expect(paused.nowMs).toBe(running.nowMs);
  });

  it('keeps the latest flag <= now and inside the window', () => {
    const { end, nowMs } = resolveChartWindow(pausedInput);
    const series = buildBurndownSeries(flagged, START, end, 70);
    const last = series.steps[series.steps.length - 1];
    expect(last.t).toBe(START + 5.5 * HOUR);
    expect(last.t).toBeLessThanOrEqual(nowMs);
  });

  it('without a remembered expiry falls back to >= latest event', () => {
    const late = [pwned(box('a'), 26, null)];
    const { end, nowMs } = resolveChartWindow({ ...pausedInput, lastExpiresAt: null, boxes: late });
    expect(end).toBeGreaterThanOrEqual(START + 26 * HOUR);
    expect(nowMs).toBeGreaterThanOrEqual(START + 26 * HOUR);
  });

  it('never trails a flag captured within the floored last second', () => {
    const edge = [{ ...pwned(box('a'), null, null), userPwned: true, userProof: { ...createDefaultProof(), pwnedAt: new Date(START + 6 * HOUR - 400).toISOString() } }];
    const { nowMs } = resolveChartWindow({ ...pausedInput, boxes: edge });
    expect(nowMs).toBeGreaterThanOrEqual(START + 6 * HOUR - 400);
  });
});

import { describe, it, expect } from 'vitest';
import {
  calculateOscpPoints,
  emptyOscpInput,
  scoringModeForStart,
  OSCP_PASS_MARK,
  OSCP_MAX_POINTS,
  OSCP_SCALED_SCORING_START_MS,
  type OscpCalculatorInput,
} from './oscpPointsCalculator';

/** Build an input: ad = number of AD machines done in order (0-3); standalones as [local, proof] pairs. */
function input(ad: boolean[], standalones: [boolean, boolean][]): OscpCalculatorInput {
  return { ad, standalones: standalones.map(([local, proof]) => ({ local, proof })) };
}
const NONE: [boolean, boolean] = [false, false];
const LOCAL: [boolean, boolean] = [true, false];
const FULL: [boolean, boolean] = [true, true];

describe('OSCP points calculator constants', () => {
  it('uses the official 70 / 100 split', () => {
    expect(OSCP_PASS_MARK).toBe(70);
    expect(OSCP_MAX_POINTS).toBe(100);
  });

  it('switches to scaled scoring at 1 Dec 2026 08:00 GMT', () => {
    expect(scoringModeForStart(Date.UTC(2026, 10, 30, 23, 59))).toBe('fixed');
    expect(scoringModeForStart(Date.UTC(2026, 11, 1, 7, 59, 59))).toBe('fixed');
    expect(scoringModeForStart(OSCP_SCALED_SCORING_START_MS)).toBe('scaled');
    expect(scoringModeForStart(Date.UTC(2027, 0, 1))).toBe('scaled');
  });
});

describe('calculateOscpPoints (fixed 70 point mode)', () => {
  // The four passing scenarios listed in the OffSec OSCP+ Exam FAQ.
  it('40 AD + 3 local.txt = 70 passes', () => {
    const r = calculateOscpPoints(input([true, true, true], [LOCAL, LOCAL, LOCAL]), 'fixed');
    expect(r.total).toBe(70);
    expect(r.passed).toBe(true);
    expect(r.pointsNeeded).toBe(0);
    expect(r.fewestToPass).toEqual([]);
  });

  it('40 AD + 2 local.txt + 1 proof.txt = 70 passes', () => {
    const r = calculateOscpPoints(input([true, true, true], [FULL, LOCAL, NONE]), 'fixed');
    expect(r.total).toBe(70);
    expect(r.passed).toBe(true);
  });

  it('20 AD + 3 local.txt + 2 proof.txt = 70 passes (partial AD credit)', () => {
    const r = calculateOscpPoints(input([true, true, false], [FULL, FULL, LOCAL]), 'fixed');
    expect(r.adPoints).toBe(20);
    expect(r.total).toBe(70);
    expect(r.passed).toBe(true);
  });

  it('10 AD + 3 full standalones = 70 passes (partial AD credit)', () => {
    const r = calculateOscpPoints(input([true, false, false], [FULL, FULL, FULL]), 'fixed');
    expect(r.adPoints).toBe(10);
    expect(r.standalonePoints).toBe(60);
    expect(r.passed).toBe(true);
  });

  it('3 full standalones with no AD points stop at 60 and fail', () => {
    const r = calculateOscpPoints(input([false, false, false], [FULL, FULL, FULL]), 'fixed');
    expect(r.total).toBe(60);
    expect(r.passed).toBe(false);
    expect(r.pointsNeeded).toBe(10);
    // One 10 point AD machine closes the gap exactly (no overshoot to the 20 point machine).
    expect(r.fewestToPass.map((i) => i.id)).toEqual(['ad-1']);
  });

  it('counts the 20 point AD machine #3 on its own', () => {
    const r = calculateOscpPoints(input([false, false, true], [NONE, NONE, NONE]), 'fixed');
    expect(r.adPoints).toBe(20);
    expect(r.total).toBe(20);
  });

  it('awards proof.txt without local.txt', () => {
    const r = calculateOscpPoints(input([false, false, false], [[false, true], NONE, NONE]), 'fixed');
    expect(r.total).toBe(10);
  });

  it('empty input scores 0 and lists every item', () => {
    const r = calculateOscpPoints(emptyOscpInput(), 'fixed');
    expect(r.total).toBe(0);
    expect(r.remaining).toBe(100);
    expect(r.openItems).toHaveLength(9);
    expect(r.openItems[0].points).toBe(20);
    expect(r.pointsNeeded).toBe(70);
    // Fewest items to 70 from nothing: AD #3 (20) plus five 10 point items = 6 items.
    const sum = r.fewestToPass.reduce((s, i) => s + i.points, 0);
    expect(sum).toBe(70);
    expect(r.fewestToPass).toHaveLength(6);
  });

  it('full marks reach 100 with nothing open', () => {
    const r = calculateOscpPoints(input([true, true, true], [FULL, FULL, FULL]), 'fixed');
    expect(r.total).toBe(100);
    expect(r.openItems).toEqual([]);
    expect(r.remaining).toBe(0);
  });

  it('suggests the fewest items, preferring the least overshoot', () => {
    // 50 points: needs 20 more. One item (AD #3, 20) beats two 10 point items.
    const r = calculateOscpPoints(input([true, true, false], [FULL, LOCAL, NONE]), 'fixed');
    expect(r.total).toBe(50);
    expect(r.fewestToPass.map((i) => i.id)).toEqual(['ad-3']);
  });
});

describe('calculateOscpPoints (scaled mode)', () => {
  it('reports raw points but never a pass or fail', () => {
    const r = calculateOscpPoints(input([true, true, true], [FULL, FULL, FULL]), 'scaled');
    expect(r.total).toBe(100);
    expect(r.passed).toBeNull();
    expect(r.pointsNeeded).toBeNull();
    expect(r.fewestToPass).toEqual([]);
  });

  it('still lists open items', () => {
    const r = calculateOscpPoints(input([true, false, false], [LOCAL, NONE, NONE]), 'scaled');
    expect(r.total).toBe(20);
    expect(r.remaining).toBe(80);
    expect(r.openItems.reduce((s, i) => s + i.points, 0)).toBe(80);
  });
});

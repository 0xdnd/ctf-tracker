/**
 * OSCP+ exam points calculator: pure scoring logic shared by the public /oscp-points-calculator/ page
 * and the in-app entry points (exam simulator link, command palette).
 *
 * Rules, checked 2026-11-05 against OffSec's own pages:
 * - OSCP+ Exam Guide: https://help.offsec.com/hc/en-us/articles/360040165632-OSCP-Exam-Guide
 *   3 standalone machines, 20 points each (10 for initial access / local.txt, 10 for privilege
 *   escalation / proof.txt). 1 Active Directory set of 3 machines, 40 points: 10 for machine #1,
 *   10 for machine #2, 20 for machine #3. Maximum 100 raw points.
 * - OSCP+ Exam FAQ: https://help.offsec.com/hc/en-us/articles/4412170923924-OSCP-Exam-FAQ
 *   No bonus points. Passing scenarios include partial AD credit (10 or 20 AD points), so AD points
 *   are counted per machine, not all-or-nothing.
 * - OSCP+ Equated Scaled Scoring FAQ:
 *   https://help.offsec.com/hc/en-us/articles/54589877508884-OSCP-Equated-Scaled-Scoring-FAQ
 *   Exams starting before 1 Dec 2026 08:00 GMT pass at 70 raw points. Exams starting on or after that
 *   time are reported on a 100 to 500 scale (400 to pass); the raw points needed vary by exam set and
 *   are not published, so this calculator never derives pass or fail from raw points in that mode.
 * - Exam length: 23 hours 45 minutes of exam time, per the OSCP+ Exam Guide above.
 *
 * This module is the single source of the OSCP+ rules and has no imports. The exam simulator
 * (examComplianceUtils.ts) takes its OSCP pass mark, maximum, duration and per-machine point values
 * from here, and scores the AD set per machine the same way calculateOscpPoints() does.
 */
export const OSCP_PASS_MARK = 70;
export const OSCP_MAX_POINTS = 100;
/** OSCP+ exam time: 23 hours 45 minutes (85,500 seconds). */
export const OSCP_EXAM_DURATION_SECONDS = 23 * 3600 + 45 * 60;
export const OSCP_LOCAL_POINTS = 10;
export const OSCP_PROOF_POINTS = 10;
export const OSCP_STANDALONE_COUNT = 3;
/** Points for AD machine #1, #2 and #3, in order. */
export const OSCP_AD_MACHINE_POINTS: readonly number[] = [10, 10, 20];
/** Exams starting at or after this instant use equated scaled scoring (1 Dec 2026 08:00 GMT). */
export const OSCP_SCALED_SCORING_START_MS = Date.UTC(2026, 11, 1, 8, 0, 0);
export const OSCP_SCALED_PASS_SCORE = 400;
export const OSCP_SCALED_MIN = 100;
export const OSCP_SCALED_MAX = 500;

export type OscpScoringMode = 'fixed' | 'scaled';

export interface OscpStandaloneState {
  local: boolean;
  proof: boolean;
}

export interface OscpCalculatorInput {
  standalones: OscpStandaloneState[];
  /** Compromised state of AD machine #1, #2 and #3. */
  ad: boolean[];
}

export interface OscpOpenItem {
  id: string;
  label: string;
  points: number;
}

export interface OscpCalculatorResult {
  mode: OscpScoringMode;
  total: number;
  standalonePoints: number;
  adPoints: number;
  maxPoints: number;
  /** Raw points still on the table. */
  remaining: number;
  /** Fixed mode only: pass or fail against the 70 point mark. Null in scaled mode. */
  passed: boolean | null;
  /** Fixed mode only: points short of 70 (0 once passed). Null in scaled mode. */
  pointsNeeded: number | null;
  /** Fixed mode only: the fewest open items that reach 70 (least overshoot on ties). Empty otherwise. */
  fewestToPass: OscpOpenItem[];
  /** Every item not yet earned, largest first. */
  openItems: OscpOpenItem[];
}

export function scoringModeForStart(startMs: number): OscpScoringMode {
  return startMs >= OSCP_SCALED_SCORING_START_MS ? 'scaled' : 'fixed';
}

export function emptyOscpInput(): OscpCalculatorInput {
  return {
    standalones: Array.from({ length: OSCP_STANDALONE_COUNT }, () => ({ local: false, proof: false })),
    ad: OSCP_AD_MACHINE_POINTS.map(() => false),
  };
}

function openItemsFor(input: OscpCalculatorInput): OscpOpenItem[] {
  const items: OscpOpenItem[] = [];
  OSCP_AD_MACHINE_POINTS.forEach((pts, i) => {
    if (!input.ad[i]) items.push({ id: `ad-${i + 1}`, label: `Active Directory machine ${i + 1}`, points: pts });
  });
  for (let i = 0; i < OSCP_STANDALONE_COUNT; i++) {
    const s = input.standalones[i] ?? { local: false, proof: false };
    if (!s.local) items.push({ id: `sa-${i + 1}-local`, label: `Standalone ${i + 1} local.txt`, points: OSCP_LOCAL_POINTS });
    if (!s.proof) items.push({ id: `sa-${i + 1}-proof`, label: `Standalone ${i + 1} proof.txt`, points: OSCP_PROOF_POINTS });
  }
  // Stable sort: largest first, original order on ties.
  return items.map((it, idx) => ({ it, idx })).sort((a, b) => b.it.points - a.it.points || a.idx - b.idx).map((x) => x.it);
}

/** Fewest items whose points reach `needed`; ties broken by least overshoot, then list order. */
function fewestItemsToReach(items: OscpOpenItem[], needed: number): OscpOpenItem[] {
  if (needed <= 0) return [];
  let best: { mask: number; count: number; sum: number } | null = null;
  const n = items.length; // at most 9 items, so 512 subsets
  for (let mask = 1; mask < 1 << n; mask++) {
    let count = 0;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        count++;
        sum += items[i].points;
      }
    }
    if (sum < needed) continue;
    if (!best || count < best.count || (count === best.count && sum < best.sum)) best = { mask, count, sum };
  }
  if (!best) return [];
  const chosen = best.mask;
  return items.filter((_, i) => chosen & (1 << i));
}

export function calculateOscpPoints(input: OscpCalculatorInput, mode: OscpScoringMode): OscpCalculatorResult {
  let standalonePoints = 0;
  for (let i = 0; i < OSCP_STANDALONE_COUNT; i++) {
    const s = input.standalones[i];
    if (s?.local) standalonePoints += OSCP_LOCAL_POINTS;
    if (s?.proof) standalonePoints += OSCP_PROOF_POINTS;
  }
  const adPoints = OSCP_AD_MACHINE_POINTS.reduce((sum, pts, i) => sum + (input.ad[i] ? pts : 0), 0);
  const total = Math.min(OSCP_MAX_POINTS, standalonePoints + adPoints);
  const openItems = openItemsFor(input);
  const remaining = OSCP_MAX_POINTS - total;

  if (mode === 'scaled') {
    return { mode, total, standalonePoints, adPoints, maxPoints: OSCP_MAX_POINTS, remaining, passed: null, pointsNeeded: null, fewestToPass: [], openItems };
  }
  const pointsNeeded = Math.max(0, OSCP_PASS_MARK - total);
  return {
    mode,
    total,
    standalonePoints,
    adPoints,
    maxPoints: OSCP_MAX_POINTS,
    remaining,
    passed: pointsNeeded === 0,
    pointsNeeded,
    fewestToPass: fewestItemsToReach(openItems, pointsNeeded),
    openItems,
  };
}

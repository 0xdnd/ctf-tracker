import type { Machine, SolveIndependence } from '../types';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** First-review interval in days per solve independence: the more help a solve needed, the sooner it comes back. */
export const REVIEW_BASE_DAYS: Record<SolveIndependence, number> = {
  solo: 7,
  nudged: 3,
  assisted: 1,
};

export const MAX_REVIEW_INTERVAL_DAYS = 120;

/** Interval in days: base * 2^reviewCount, capped at MAX_REVIEW_INTERVAL_DAYS. */
export function reviewIntervalDays(independence: SolveIndependence, reviewCount: number): number {
  const base = REVIEW_BASE_DAYS[independence] ?? REVIEW_BASE_DAYS.assisted;
  const count = Number.isFinite(reviewCount) && reviewCount > 0 ? Math.floor(reviewCount) : 0;
  // 2^7 already exceeds the cap for every base, so clamp the exponent to avoid huge numbers.
  return Math.min(MAX_REVIEW_INTERVAL_DAYS, base * Math.pow(2, Math.min(count, 16)));
}

/** Epoch ms of the next review. */
export function scheduleNextReview(independence: SolveIndependence, reviewCount: number, now: number): number {
  return now + reviewIntervalDays(independence, reviewCount) * DAY_MS;
}

/** True when the machine has a scheduled review at or before `now`. */
export function isDueForReview(machine: Pick<Machine, 'nextReviewAt'> | null | undefined, now: number): boolean {
  const at = machine?.nextReviewAt;
  return typeof at === 'number' && Number.isFinite(at) && at <= now;
}

/** Number of machines whose scheduled review is due at or before `now`. */
export function countDueReviews(machines: ReadonlyArray<Pick<Machine, 'nextReviewAt'>>, now: number): number {
  let n = 0;
  for (const m of machines) if (isDueForReview(m, now)) n++;
  return n;
}

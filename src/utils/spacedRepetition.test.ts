import { describe, it, expect } from 'vitest';
import {
  DAY_MS,
  MAX_REVIEW_INTERVAL_DAYS,
  isDueForReview,
  reviewIntervalDays,
  scheduleNextReview,
} from './spacedRepetition';

const NOW = Date.UTC(2026, 9, 14);

describe('spacedRepetition', () => {
  it('uses base intervals solo 7 / nudged 3 / assisted 1 on the first review', () => {
    expect(scheduleNextReview('solo', 0, NOW)).toBe(NOW + 7 * DAY_MS);
    expect(scheduleNextReview('nudged', 0, NOW)).toBe(NOW + 3 * DAY_MS);
    expect(scheduleNextReview('assisted', 0, NOW)).toBe(NOW + 1 * DAY_MS);
  });

  it('doubles the interval with each review', () => {
    expect(reviewIntervalDays('nudged', 1)).toBe(6);
    expect(reviewIntervalDays('nudged', 2)).toBe(12);
    expect(reviewIntervalDays('assisted', 3)).toBe(8);
  });

  it('orders assisted < nudged < solo for the same review count', () => {
    for (let c = 0; c < 4; c++) {
      expect(reviewIntervalDays('assisted', c)).toBeLessThan(reviewIntervalDays('nudged', c));
      expect(reviewIntervalDays('nudged', c)).toBeLessThan(reviewIntervalDays('solo', c));
    }
  });

  it('caps the interval at 120 days', () => {
    expect(reviewIntervalDays('solo', 5)).toBe(MAX_REVIEW_INTERVAL_DAYS);
    expect(reviewIntervalDays('assisted', 1000)).toBe(MAX_REVIEW_INTERVAL_DAYS);
    expect(scheduleNextReview('solo', 50, NOW)).toBe(NOW + 120 * DAY_MS);
  });

  it('treats negative or non-finite review counts as zero', () => {
    expect(reviewIntervalDays('solo', -3)).toBe(7);
    expect(reviewIntervalDays('solo', Number.NaN)).toBe(7);
  });

  it('isDueForReview is true only when nextReviewAt is set and not in the future', () => {
    expect(isDueForReview({ nextReviewAt: NOW - 1 }, NOW)).toBe(true);
    expect(isDueForReview({ nextReviewAt: NOW }, NOW)).toBe(true);
    expect(isDueForReview({ nextReviewAt: NOW + 1 }, NOW)).toBe(false);
    expect(isDueForReview({}, NOW)).toBe(false);
    expect(isDueForReview(null, NOW)).toBe(false);
  });
});

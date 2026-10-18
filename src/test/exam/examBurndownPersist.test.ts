import { describe, it, expect, beforeEach } from 'vitest';
import {
  persistChartExpiry,
  readPersistedChartExpiry,
  resolveChartWindow,
} from '../../utils/examBurndown';

const START = Date.parse('2026-01-01T00:00:00.000Z');
const HOUR = 3600 * 1000;

describe('chart expiry persistence across reload while paused', () => {
  beforeEach(() => localStorage.clear());

  it('yields the same window end after reload as before pause', () => {
    const liveExpiry = START + 24 * HOUR + 30 * 60 * 1000; // includes earlier pause time
    const base = {
      startedAt: START,
      totalDurationSeconds: 24 * 3600,
      timerPausedRemainingSeconds: 10 * 3600,
      currentRemainingSeconds: 10 * 3600,
      boxes: [],
    };
    const before = resolveChartWindow({ ...base, examExpiresAt: liveExpiry, lastExpiresAt: liveExpiry, timerPausedRemainingSeconds: null });
    persistChartExpiry(START, liveExpiry);

    // Reload: ref is empty, session is paused (examExpiresAt null)
    const lost = resolveChartWindow({ ...base, examExpiresAt: null, lastExpiresAt: null });
    expect(lost.end).not.toBe(before.end);
    const recovered = resolveChartWindow({ ...base, examExpiresAt: null, lastExpiresAt: readPersistedChartExpiry(START) });
    expect(recovered.end).toBe(before.end);
  });

  it('is scoped per session and tolerates empty/invalid storage', () => {
    expect(readPersistedChartExpiry(START)).toBeNull();
    persistChartExpiry(START, 123);
    expect(readPersistedChartExpiry(START + 1)).toBeNull();
    localStorage.setItem('exam-burndown-expiry:' + START, 'junk');
    expect(readPersistedChartExpiry(START)).toBeNull();
  });
});

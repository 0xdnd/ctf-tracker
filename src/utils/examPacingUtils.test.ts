import { describe, it, expect } from 'vitest';
import {
  computeExamPacing,
  checkRabbitHole,
  calculateBreakCountdown,
  formatSecondsToHms,
  formatSecondsToHoursMinutes,
} from './examPacingUtils';
import { generateExamTargetsForTrack, EXAM_TRACK_CONFIGS } from './examComplianceUtils';

describe('examPacingUtils Dynamic Pacing & Rabbit Hole Engine', () => {
  const mockBoxes = generateExamTargetsForTrack('OSCP');

  describe('computeExamPacing', () => {
    it('reports PASSED status when currentScore meets or exceeds passThreshold', () => {
      const session = {
        examStartedAt: Date.now() - 10000000,
        examExpiresAt: Date.now() + 50000000,
        timerPausedRemainingSeconds: null,
        totalDurationSeconds: 86400,
        boxes: mockBoxes,
      };

      const analysis = computeExamPacing(session, { totalScore: 70, passThreshold: 70 });
      expect(analysis.pacingStatus).toBe('PASSED');
      expect(analysis.pointsNeeded).toBe(0);
      expect(analysis.recommendation).toContain('PASSING THRESHOLD ACHIEVED');
    });

    it('reports CRITICAL when <= 6 hours remaining and > 20 points needed', () => {
      const now = Date.now();
      const fiveHoursMs = 5 * 3600 * 1000;
      const session = {
        examStartedAt: now - 19 * 3600 * 1000,
        examExpiresAt: now + fiveHoursMs, // 5 hours left
        timerPausedRemainingSeconds: null,
        totalDurationSeconds: 86400,
        boxes: mockBoxes,
      };

      const analysis = computeExamPacing(
        session,
        { totalScore: 40, passThreshold: 70 }, // 30 points needed
        now
      );

      expect(analysis.pacingStatus).toBe('CRITICAL');
      expect(analysis.pointsNeeded).toBe(30);
      expect(analysis.recommendation).toContain('CRITICAL TIME PRESSURE');
    });

    it('reports BEHIND_SCHEDULE when required pace is drastically higher than current pace or > 15 pts/hr', () => {
      const now = Date.now();
      const tenHoursMs = 10 * 3600 * 1000;
      const session = {
        examStartedAt: now - 14 * 3600 * 1000, // 14h elapsed
        examExpiresAt: now + 3 * 3600 * 1000, // 3h remaining
        timerPausedRemainingSeconds: null,
        totalDurationSeconds: 86400,
        boxes: mockBoxes,
      };

      // 10 pts in 14h (~0.7 pts/hr), needs 60 pts in 3h (20 pts/hr)
      const analysis = computeExamPacing(
        session,
        { totalScore: 10, passThreshold: 70 },
        now
      );

      expect(analysis.pacingStatus).toBe('CRITICAL'); // <= 6h remaining & pointsNeeded > 20 triggers CRITICAL
    });

    it('reports BEHIND_SCHEDULE when required pace > 15 pts/hr with > 6h remaining', () => {
      const now = Date.now();
      const session = {
        examStartedAt: now - 14 * 3600 * 1000,
        examExpiresAt: now + 7 * 3600 * 1000, // 7h remaining (> 6h)
        timerPausedRemainingSeconds: null,
        totalDurationSeconds: 86400,
        boxes: mockBoxes,
      };

      // 0 pts earned, needs 70 pts in 4h? In 7h: 70 / 7 = 10 pts/hr. Let's make it need 70 pts in 4h or 6.5h
      // For > 15 pts/hr with > 6h left, say 100 pts needed in 6.2h (16.1 pts/hr)
      const analysis = computeExamPacing(
        session,
        { totalScore: 0, passThreshold: 120 }, // 120 pts / 7h = 17.1 pts/hr
        now
      );

      expect(analysis.pacingStatus).toBe('BEHIND_SCHEDULE');
      expect(analysis.recommendation).toContain('Pacing alert');
    });

    it('reports ON_TRACK for steady healthy pacing', () => {
      const now = Date.now();
      const session = {
        examStartedAt: now - 8 * 3600 * 1000, // 8h elapsed
        examExpiresAt: now + 16 * 3600 * 1000, // 16h remaining
        timerPausedRemainingSeconds: null,
        totalDurationSeconds: 86400,
        boxes: mockBoxes,
      };

      // 40 pts in 8h (5 pts/hr), needs 30 pts in 16h (~1.88 pts/hr)
      const analysis = computeExamPacing(
        session,
        { totalScore: 40, passThreshold: 70 },
        now
      );

      expect(analysis.pacingStatus).toBe('ON_TRACK');
      expect(analysis.recommendation).toContain('Pacing is healthy');
    });

    it('correctly calculates time remaining per unrooted box', () => {
      const now = Date.now();
      const remainingSeconds = 18000; // 5 hours
      const session = {
        examStartedAt: now - 3600000,
        examExpiresAt: now + remainingSeconds * 1000,
        timerPausedRemainingSeconds: null,
        totalDurationSeconds: 86400,
        boxes: mockBoxes, // all unrooted initially (6 boxes)
      };

      const analysis = computeExamPacing(
        session,
        { totalScore: 0, passThreshold: 70 },
        now
      );

      expect(analysis.unrootedBoxesCount).toBe(6);
      expect(analysis.timeRemainingPerUnrootedBoxSeconds).toBe(Math.floor(remainingSeconds / 6)); // 3000s
    });
  });

  describe('computeExamPacing track-aware thresholds', () => {
    const HOUR = 3600 * 1000;
    const makeSession = (
      now: number,
      elapsedH: number,
      remainingH: number,
      totalH: number
    ) => ({
      examStartedAt: now - elapsedH * HOUR,
      examExpiresAt: now + remainingH * HOUR,
      timerPausedRemainingSeconds: null,
      totalDurationSeconds: totalH * 3600,
      boxes: mockBoxes,
    });

    it('CPTS (240h): 30h left with 40 pts needed is CRITICAL (<= 25% of duration)', () => {
      const now = Date.now();
      const analysis = computeExamPacing(
        makeSession(now, 210, 30, 240),
        { totalScore: 45, passThreshold: 85 },
        now,
        EXAM_TRACK_CONFIGS.CPTS
      );
      expect(analysis.pacingStatus).toBe('CRITICAL');
    });

    it('CPTS (240h): 30h left with only 10 pts needed is not CRITICAL (<= 20% of maxScore)', () => {
      const now = Date.now();
      const analysis = computeExamPacing(
        makeSession(now, 210, 30, 240),
        { totalScore: 75, passThreshold: 85 },
        now,
        EXAM_TRACK_CONFIGS.CPTS
      );
      expect(analysis.pacingStatus).not.toBe('CRITICAL');
    });

    it('CPTS (240h): 70h left (> 25% of duration) is not CRITICAL even with 40 pts needed', () => {
      const now = Date.now();
      const session = makeSession(now, 170, 70, 240);
      const cpts = computeExamPacing(session, { totalScore: 45, passThreshold: 85 }, now, EXAM_TRACK_CONFIGS.CPTS);
      expect(cpts.pacingStatus).not.toBe('CRITICAL');
    });

    it('CRTO (48h): CRITICAL at 12h left with > 20 pts needed, not at 13h', () => {
      const now = Date.now();
      const at12 = computeExamPacing(
        makeSession(now, 36, 12, 48),
        { totalScore: 40, passThreshold: 75 },
        now,
        EXAM_TRACK_CONFIGS.CRTO
      );
      expect(at12.pacingStatus).toBe('CRITICAL');

      const at13 = computeExamPacing(
        makeSession(now, 35, 13, 48),
        { totalScore: 40, passThreshold: 75 },
        now,
        EXAM_TRACK_CONFIGS.CRTO
      );
      expect(at13.pacingStatus).not.toBe('CRITICAL');
    });

    it('zero score is BEHIND_SCHEDULE only once 15% of the track duration has elapsed', () => {
      const now = Date.now();
      // CRTO: 15% of 48h = 7.2h
      const early = computeExamPacing(
        makeSession(now, 6, 42, 48),
        { totalScore: 0, passThreshold: 75 },
        now,
        EXAM_TRACK_CONFIGS.CRTO
      );
      expect(early.pacingStatus).toBe('ON_TRACK');

      const late = computeExamPacing(
        makeSession(now, 8, 40, 48),
        { totalScore: 0, passThreshold: 75 },
        now,
        EXAM_TRACK_CONFIGS.CRTO
      );
      expect(late.pacingStatus).toBe('BEHIND_SCHEDULE');
    });

    it('does not flag BEHIND_SCHEDULE on an absolute pts/hr rule when the pace is steady', () => {
      const now = Date.now();
      // OSCP, 20h left, 60 pts needed => 3 pts/hr required vs 20 pts / 4h = 5 pts/hr current
      const analysis = computeExamPacing(
        makeSession(now, 4, 20, 24),
        { totalScore: 20, passThreshold: 80 },
        now
      );
      expect(analysis.pacingStatus).toBe('ON_TRACK');
    });

    it('caps the projected score at the track maxScore, not a literal 100', () => {
      const now = Date.now();
      const cfg = { ...EXAM_TRACK_CONFIGS.CRTO, maxScore: 80 };
      const analysis = computeExamPacing(
        makeSession(now, 2, 46, 48),
        { totalScore: 50, passThreshold: 75 },
        now,
        cfg
      );
      expect(analysis.projectedFinalScore).toBe(80);
    });

    it('defaults to the OSCP 24h / 100 pts behaviour when no config is passed', () => {
      const now = Date.now();
      const session = {
        examStartedAt: now - 10 * HOUR,
        examExpiresAt: null,
        timerPausedRemainingSeconds: null,
        boxes: mockBoxes,
      };
      const analysis = computeExamPacing(session, { totalScore: 10, passThreshold: 70 }, now);
      expect(analysis.remainingSeconds).toBe(86400);

      // 6h left (25% of 24h) with 30 pts needed: CRITICAL, exactly as before
      const critical = computeExamPacing(
        makeSession(now, 18, 6, 24),
        { totalScore: 40, passThreshold: 70 },
        now
      );
      expect(critical.pacingStatus).toBe('CRITICAL');

      // Projection cap of 100
      const capped = computeExamPacing(
        makeSession(now, 1, 23, 24),
        { totalScore: 90, passThreshold: 70 + 30 },
        now
      );
      expect(capped.projectedFinalScore).toBe(100);
    });

    it('uses the track duration as the default remaining time when the session has none', () => {
      const now = Date.now();
      const session = {
        examStartedAt: null,
        examExpiresAt: null,
        timerPausedRemainingSeconds: null,
        boxes: mockBoxes,
      };
      const analysis = computeExamPacing(
        session,
        { totalScore: 0, passThreshold: 85 },
        now,
        EXAM_TRACK_CONFIGS.CPTS
      );
      expect(analysis.remainingSeconds).toBe(EXAM_TRACK_CONFIGS.CPTS.durationSeconds);
    });
  });

  describe('checkRabbitHole Detection', () => {
    it('returns isRabbitHole: false if box is already pwned', () => {
      const now = Date.now();
      const twoHoursAgo = now - 2 * 3600 * 1000;
      const warning = checkRabbitHole('box-1', 'DC01', twoHoursAgo, true, 90, now);
      expect(warning.isRabbitHole).toBe(false);
      expect(warning.message).toBeUndefined();
    });

    it('returns isRabbitHole: false if elapsed time is under threshold', () => {
      const now = Date.now();
      const fiftyMinutesAgo = now - 50 * 60 * 1000;
      const warning = checkRabbitHole('box-1', 'ALPHA', fiftyMinutesAgo, false, 90, now);
      expect(warning.isRabbitHole).toBe(false);
      expect(warning.timeSpentSeconds).toBe(50 * 60);
    });

    it('triggers rabbit hole alert with actionable advice when > 90m spent without progress', () => {
      const now = Date.now();
      const oneHundredMinutesAgo = now - 100 * 60 * 1000;
      const warning = checkRabbitHole('box-1', 'BRAVO', oneHundredMinutesAgo, false, 90, now);
      expect(warning.isRabbitHole).toBe(true);
      expect(warning.message).toContain('RABBIT HOLE DETECTED');
      expect(warning.message).toContain('BRAVO');
      expect(warning.message).toContain('Recommendation: Reset machine');
    });
  });

  describe('calculateBreakCountdown', () => {
    it('calculates remaining break time and expiration accurately', () => {
      const now = Date.now();
      const startedAt = now - 300 * 1000; // 5 min ago
      const durationSeconds = 900; // 15 min

      const countdown = calculateBreakCountdown(startedAt, durationSeconds, now);
      expect(countdown.remainingSeconds).toBe(600); // 10 min left
      expect(countdown.isExpired).toBe(false);
      expect(countdown.formattedTime).toBe('00:10:00');
    });

    it('identifies expired breaks', () => {
      const now = Date.now();
      const startedAt = now - 1000 * 1000; // past duration
      const durationSeconds = 900;

      const countdown = calculateBreakCountdown(startedAt, durationSeconds, now);
      expect(countdown.remainingSeconds).toBe(0);
      expect(countdown.isExpired).toBe(true);
      expect(countdown.formattedTime).toBe('00:00:00');
    });
  });

  describe('Time Formatters', () => {
    it('formats seconds to HH:MM:SS format', () => {
      expect(formatSecondsToHms(0)).toBe('00:00:00');
      expect(formatSecondsToHms(59)).toBe('00:00:59');
      expect(formatSecondsToHms(3665)).toBe('01:01:05');
      expect(formatSecondsToHms(86400)).toBe('24:00:00');
    });

    it('formats seconds to hours and minutes string', () => {
      expect(formatSecondsToHoursMinutes(3600)).toBe('1h 0m');
      expect(formatSecondsToHoursMinutes(7320)).toBe('2h 2m');
      expect(formatSecondsToHoursMinutes(1500)).toBe('25m');
    });
  });
});

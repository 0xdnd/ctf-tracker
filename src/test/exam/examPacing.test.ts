/**
 * examPacing.test.ts
 * Opaque-box, requirement-driven Vitest test suite for Certification Exam Simulator pacing engine.
 * Verifies R4 (Operator Pacing & Bio-Break Manager) from ORIGINAL_REQUEST.md.
 */

import { describe, it, expect } from 'vitest';
import {
  computeExamPacing,
  checkRabbitHole,
  calculateBreakCountdown,
  formatSecondsToHms,
  formatSecondsToHoursMinutes,
  PacingAnalysis,
  RabbitHoleWarning,
} from '../../utils/examPacingUtils';
import { ExamBox } from '../../utils/examComplianceUtils';

// Helper to create mock ExamBox
function createMockBox(id: string, userPwned: boolean, rootPwned: boolean): ExamBox {
  return {
    id,
    name: `Target-${id}`,
    ip: `192.168.1.${id}`,
    os: 'Linux',
    difficulty: 'Medium',
    type: 'standalone',
    label: `Target ${id}`,
    userPoints: 10,
    rootPoints: 10,
    userPwned,
    rootPwned,
    userProof: { flagText: '', whoamiOutput: '', ipconfigOutput: '', screenshotTaken: false },
    rootProof: { flagText: '', whoamiOutput: '', ipconfigOutput: '', screenshotTaken: false },
  };
}

describe('Certification Exam Pacing Engine & Bio-Break Manager (R4)', () => {
  const ONE_HOUR = 3600;
  const BASE_TIME = 1727370000000; // Fixed epoch for reproducible tests

  // =========================================================================
  // 1. Pacing Velocity & Mathematical Formulas
  // =========================================================================
  describe('Pacing Velocity Calculations (pts/hr, projected score)', () => {
    it('PACE-01: Correctly calculates required pace (pts/hr) based on remaining hours and points needed', () => {
      // 24-hour OSCP exam: 8 hours elapsed, 16 hours remaining
      // Started 8 hours ago, expires in 16 hours
      const startedAt = BASE_TIME - 8 * ONE_HOUR * 1000;
      const expiresAt = BASE_TIME + 16 * ONE_HOUR * 1000;

      // Current score: 30 pts (e.g. 1 standalone full pwn + 1 user)
      // Pass threshold: 70 pts -> Points needed: 40 pts
      // Required pace = 40 pts / 16 hours = 2.50 pts/hr
      const session = {
        examStartedAt: startedAt,
        examExpiresAt: expiresAt,
        timerPausedRemainingSeconds: null,
        boxes: [
          createMockBox('1', true, true),   // 20 pts pwned
          createMockBox('2', true, false),  // 10 pts pwned
          createMockBox('3', false, false), // 0 pts pwned
        ],
      };

      const scoreData = { totalScore: 30, passThreshold: 70 };
      const analysis: PacingAnalysis = computeExamPacing(session, scoreData, BASE_TIME);

      expect(analysis.currentScore).toBe(30);
      expect(analysis.passThreshold).toBe(70);
      expect(analysis.pointsNeeded).toBe(40);
      expect(analysis.remainingSeconds).toBe(16 * ONE_HOUR);
      expect(analysis.elapsedSeconds).toBe(8 * ONE_HOUR);
      expect(analysis.requiredPacePtsPerHour).toBe(2.5); // 40 / 16 = 2.5
      expect(analysis.currentPacePtsPerHour).toBe(3.75); // 30 / 8 = 3.75
      // Projected final score = 30 + (3.75 * 16) = 30 + 60 = 90 pts
      expect(analysis.projectedFinalScore).toBe(90);
      expect(analysis.pacingStatus).toBe('ON_TRACK');
      expect(analysis.recommendation).toContain('Pacing is healthy');
    });

    it('PACE-02: Projected score is capped at 100 points maximum', () => {
      // High velocity: 60 pts in 4 hours = 15 pts/hr. Remaining 20 hours -> 60 + 300 = 360 -> capped at 100
      const startedAt = BASE_TIME - 4 * ONE_HOUR * 1000;
      const expiresAt = BASE_TIME + 20 * ONE_HOUR * 1000;

      const session = {
        examStartedAt: startedAt,
        examExpiresAt: expiresAt,
        timerPausedRemainingSeconds: null,
        boxes: [createMockBox('1', true, true)],
      };

      const analysis = computeExamPacing(session, { totalScore: 60, passThreshold: 70 }, BASE_TIME);
      expect(analysis.projectedFinalScore).toBe(100);
    });

    it('PACE-03: Zero division protection on edge conditions (0 seconds elapsed or 0 remaining)', () => {
      // Exact start moment (0 ms elapsed)
      const sessionStart = {
        examStartedAt: BASE_TIME,
        examExpiresAt: BASE_TIME + 24 * ONE_HOUR * 1000,
        timerPausedRemainingSeconds: null,
        boxes: [],
      };

      const analysisStart = computeExamPacing(sessionStart, { totalScore: 0, passThreshold: 70 }, BASE_TIME);
      expect(Number.isFinite(analysisStart.currentPacePtsPerHour)).toBe(true);
      expect(Number.isFinite(analysisStart.requiredPacePtsPerHour)).toBe(true);
      expect(analysisStart.pointsNeeded).toBe(70);

      // Exact expiration moment (0 seconds remaining)
      const sessionEnd = {
        examStartedAt: BASE_TIME - 24 * ONE_HOUR * 1000,
        examExpiresAt: BASE_TIME,
        timerPausedRemainingSeconds: null,
        boxes: [],
      };

      const analysisEnd = computeExamPacing(sessionEnd, { totalScore: 50, passThreshold: 70 }, BASE_TIME);
      expect(Number.isFinite(analysisEnd.requiredPacePtsPerHour)).toBe(true);
      expect(analysisEnd.remainingSeconds).toBe(0);
      expect(analysisEnd.pointsNeeded).toBe(20);
    });

    it('PACE-04: Accurately calculates time remaining per unrooted box', () => {
      // 12 hours remaining, 3 unrooted boxes -> 4 hours (14,400s) per unrooted box
      const session = {
        examStartedAt: BASE_TIME - 12 * ONE_HOUR * 1000,
        examExpiresAt: BASE_TIME + 12 * ONE_HOUR * 1000,
        timerPausedRemainingSeconds: null,
        boxes: [
          createMockBox('1', true, true),   // rooted
          createMockBox('2', true, false),  // user only (unrooted root)
          createMockBox('3', false, false), // fully unrooted
          createMockBox('4', false, false), // fully unrooted
        ],
      };

      const analysis = computeExamPacing(session, { totalScore: 30, passThreshold: 70 }, BASE_TIME);
      expect(analysis.unrootedBoxesCount).toBe(3); // boxes 2, 3, 4
      expect(analysis.timeRemainingPerUnrootedBoxSeconds).toBe(Math.floor((12 * ONE_HOUR) / 3));
    });
  });

  // =========================================================================
  // 2. Dynamic Pacing Status Transitions (PASSED, ON_TRACK, BEHIND_SCHEDULE, CRITICAL)
  // =========================================================================
  describe('Pacing Status Transitions & Tactical Recommendations', () => {
    it('STATUS-01: Transitions to PASSED status immediately when currentScore >= passThreshold', () => {
      const session = {
        examStartedAt: BASE_TIME - 10 * ONE_HOUR * 1000,
        examExpiresAt: BASE_TIME + 14 * ONE_HOUR * 1000,
        timerPausedRemainingSeconds: null,
        boxes: [createMockBox('1', true, true)],
      };

      const analysis = computeExamPacing(session, { totalScore: 70, passThreshold: 70 }, BASE_TIME);
      expect(analysis.pacingStatus).toBe('PASSED');
      expect(analysis.pointsNeeded).toBe(0);
      expect(analysis.recommendation).toContain('PASSING THRESHOLD ACHIEVED');
    });

    it('STATUS-02: Transitions to CRITICAL status when remaining time <= 6h and pointsNeeded > 20', () => {
      // 5 hours remaining, only 20 points achieved (50 pts needed for 70 pt pass)
      const session = {
        examStartedAt: BASE_TIME - 19 * ONE_HOUR * 1000,
        examExpiresAt: BASE_TIME + 5 * ONE_HOUR * 1000,
        timerPausedRemainingSeconds: null,
        boxes: [createMockBox('1', true, true)],
      };

      const analysis = computeExamPacing(session, { totalScore: 20, passThreshold: 70 }, BASE_TIME);
      expect(analysis.pacingStatus).toBe('CRITICAL');
      expect(analysis.pointsNeeded).toBe(50);
      expect(analysis.recommendation).toContain('CRITICAL TIME PRESSURE');
      expect(analysis.recommendation).toContain('5.0h remaining');
    });

    it('STATUS-03: Transitions to BEHIND_SCHEDULE when required pace > 15 pts/hr', () => {
      // 10 hours remaining, 10 points scored in 14 hours (pace = 0.71 pts/hr)
      // Points needed = 60 pts -> Required pace = 6.0 pts/hr, which is > 1.5 * 0.71 (1.065 pts/hr)
      const session = {
        examStartedAt: BASE_TIME - 14 * ONE_HOUR * 1000,
        examExpiresAt: BASE_TIME + 10 * ONE_HOUR * 1000,
        timerPausedRemainingSeconds: null,
        boxes: [createMockBox('1', true, false)],
      };

      const analysis = computeExamPacing(session, { totalScore: 10, passThreshold: 70 }, BASE_TIME);
      expect(analysis.pacingStatus).toBe('BEHIND_SCHEDULE');
      expect(analysis.recommendation).toContain('Pacing alert');
      expect(analysis.recommendation).toContain('pivot immediately');
    });

    it('STATUS-04: Remains ON_TRACK when required pace is well within operator current velocity', () => {
      // 12 hours remaining, 40 points scored in 12 hours (current velocity: 3.33 pts/hr)
      // Points needed: 30 pts in 12 hours -> required pace: 2.50 pts/hr (2.50 <= 3.33)
      const session = {
        examStartedAt: BASE_TIME - 12 * ONE_HOUR * 1000,
        examExpiresAt: BASE_TIME + 12 * ONE_HOUR * 1000,
        timerPausedRemainingSeconds: null,
        boxes: [createMockBox('1', true, true), createMockBox('2', true, true)],
      };

      const analysis = computeExamPacing(session, { totalScore: 40, passThreshold: 70 }, BASE_TIME);
      expect(analysis.pacingStatus).toBe('ON_TRACK');
      expect(analysis.recommendation).toContain('Pacing is healthy');
    });
  });

  // =========================================================================
  // 3. Rabbit Hole Detection Engine (>90m on a single target without progress)
  // =========================================================================
  describe('Rabbit Hole Detection Engine (checkRabbitHole)', () => {
    it('RABBIT-01: Does NOT trigger alert when operator has spent < 90m on target', () => {
      const activeSince = BASE_TIME - 45 * 60 * 1000; // 45 minutes ago
      const result: RabbitHoleWarning = checkRabbitHole(
        'target-1',
        'BRAVO',
        activeSince,
        false, // not pwned
        90,    // 90m threshold
        BASE_TIME
      );

      expect(result.isRabbitHole).toBe(false);
      expect(result.timeSpentSeconds).toBe(45 * 60);
      expect(result.thresholdSeconds).toBe(90 * 60);
      expect(result.message).toBeUndefined();
    });

    it('RABBIT-02: TRIGGERS alert when operator has spent >= 90m on target without root', () => {
      const activeSince = BASE_TIME - 105 * 60 * 1000; // 1h 45m ago (105m)
      const result: RabbitHoleWarning = checkRabbitHole(
        'target-2',
        'ALPHA',
        activeSince,
        false, // not pwned
        90,
        BASE_TIME
      );

      expect(result.isRabbitHole).toBe(true);
      expect(result.timeSpentSeconds).toBe(105 * 60);
      expect(result.message).toBeDefined();
      expect(result.message).toContain('⚠️ RABBIT HOLE DETECTED');
      expect(result.message).toContain('1h 45m spent on target "ALPHA"');
      expect(result.message).toContain('Reset machine, take a 10m walk, or pivot');
    });

    it('RABBIT-03: Boundary condition at exactly 90 minutes triggers the alert', () => {
      const activeSince = BASE_TIME - 90 * 60 * 1000; // Exactly 90 minutes
      const result = checkRabbitHole('target-3', 'CORP-DC01', activeSince, false, 90, BASE_TIME);

      expect(result.isRabbitHole).toBe(true);
      expect(result.timeSpentSeconds).toBe(90 * 60);
      expect(result.message).toContain('1h 30m');
    });

    it('RABBIT-04: Does NOT trigger alert if the target is already pwned (isPwned: true)', () => {
      const activeSince = BASE_TIME - 120 * 60 * 1000; // 2 hours ago
      // Operator spent 2h on target, but successfully rooted it
      const result = checkRabbitHole('target-4', 'OMEGA', activeSince, true, 90, BASE_TIME);

      expect(result.isRabbitHole).toBe(false);
      expect(result.message).toBeUndefined();
    });

    it('RABBIT-05: Handles null targetActiveSince gracefully with no error or false alarm', () => {
      const result = checkRabbitHole('target-5', 'IDLE', null, false, 90, BASE_TIME);
      expect(result.isRabbitHole).toBe(false);
      expect(result.timeSpentSeconds).toBe(0);
    });

    it('RABBIT-06: Supports custom threshold configurations (e.g. 60m for fast-paced trials)', () => {
      const activeSince = BASE_TIME - 65 * 60 * 1000; // 65m
      const result = checkRabbitHole('target-6', 'SPEED-RUN', activeSince, false, 60, BASE_TIME);

      expect(result.isRabbitHole).toBe(true);
      expect(result.thresholdSeconds).toBe(3600);
      expect(result.message).toContain('1h 5m');
    });
  });

  // =========================================================================
  // 4. Bio-Break Parallel Countdown & Duration Formatting
  // =========================================================================
  describe('Bio-Break Countdown & Formatting (calculateBreakCountdown)', () => {
    it('BREAK-01: Calculates remaining break time without modifying master clock', () => {
      const breakDuration = 15 * 60; // 15m bio break = 900s
      const breakStartedAt = BASE_TIME - 5 * 60 * 1000; // Started 5m ago

      const result = calculateBreakCountdown(breakStartedAt, breakDuration, BASE_TIME);

      expect(result.remainingSeconds).toBe(10 * 60); // 10m remaining
      expect(result.isExpired).toBe(false);
      expect(result.formattedTime).toBe('00:10:00');
    });

    it('BREAK-02: Flags isExpired: true when break duration elapses', () => {
      const breakDuration = 30 * 60; // 30m food break = 1800s
      const breakStartedAt = BASE_TIME - 31 * 60 * 1000; // Started 31m ago

      const result = calculateBreakCountdown(breakStartedAt, breakDuration, BASE_TIME);

      expect(result.remainingSeconds).toBe(0);
      expect(result.isExpired).toBe(true);
      expect(result.formattedTime).toBe('00:00:00');
    });

    it('BREAK-03: Returns initial duration when startedAt is null', () => {
      const result = calculateBreakCountdown(null, 7200, BASE_TIME); // 2h rest
      expect(result.remainingSeconds).toBe(7200);
      expect(result.isExpired).toBe(false);
      expect(result.formattedTime).toBe('02:00:00');
    });
  });

  // =========================================================================
  // 5. Time Formatting Helper Invariants
  // =========================================================================
  describe('Time Formatter Invariants (formatSecondsToHms & formatSecondsToHoursMinutes)', () => {
    it('FMT-01: Formats seconds to zero-padded HH:MM:SS', () => {
      expect(formatSecondsToHms(0)).toBe('00:00:00');
      expect(formatSecondsToHms(59)).toBe('00:00:59');
      expect(formatSecondsToHms(60)).toBe('00:01:00');
      expect(formatSecondsToHms(3599)).toBe('00:59:59');
      expect(formatSecondsToHms(3600)).toBe('01:00:00');
      expect(formatSecondsToHms(86400)).toBe('24:00:00');
      expect(formatSecondsToHms(864000)).toBe('240:00:00'); // CPTS 10 days
    });

    it('FMT-02: Formats seconds to human-readable hours and minutes', () => {
      expect(formatSecondsToHoursMinutes(45 * 60)).toBe('45m');
      expect(formatSecondsToHoursMinutes(90 * 60)).toBe('1h 30m');
      expect(formatSecondsToHoursMinutes(24 * 3600)).toBe('24h 0m');
      expect(formatSecondsToHoursMinutes(0)).toBe('0m');
    });

    it('FMT-03: Handles negative numbers gracefully with 0 bounds', () => {
      expect(formatSecondsToHms(-500)).toBe('00:00:00');
      expect(formatSecondsToHoursMinutes(-100)).toBe('0m');
    });
  });
});

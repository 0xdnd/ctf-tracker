import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useExamStore, EXAM_STORAGE_KEY } from '../../store/examStore';
import {
  playCyberAlert,
  setAudioMuted,
  isAudioMuted,
  audioAlertEngine,
  _resetAudioContextForTesting,
} from '../../utils/audioAlerts';
import {
  computeExamPacing,
  checkRabbitHole,
  calculateBreakCountdown,
  formatSecondsToHms,
  formatSecondsToHoursMinutes,
} from '../../utils/examPacingUtils';
import { generateExamTargetsForTrack, calculateExamScore, ExamBox } from '../../utils/examComplianceUtils';

describe('EMPIRICAL ADVERSARIAL STRESS SUITE — Exam State, Audio Engine & Pacing Math', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetAudioContextForTesting();
    setAudioMuted(false);
    useExamStore.getState().resetExam('OSCP');
  });

  afterEach(() => {
    localStorage.clear();
    _resetAudioContextForTesting();
    vi.restoreAllMocks();
  });

  /* =====================================================================
   * ADVERSARIAL CHALLENGE 1: SOAK ENDURANCE & DISCRETE STORAGE INVARIANT
   * ===================================================================== */
  describe('Challenge 1: Soak Endurance & Storage Write Invariants', () => {
    it('EMP-SOAK-01: 10,000 tick countdown calls result in ZERO localStorage.setItem invocations', () => {
      let currentTime = 1700000000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      // Start exam (triggers 1 initial save from startExam)
      useExamStore.getState().startExam('OSCP');

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockClear();

      // Simulate 10,000 continuous 1-second countdown ticks (2.77 hours of exam session)
      for (let i = 0; i < 10000; i++) {
        currentTime += 1000;
        useExamStore.getState().tick();
      }

      // Assert zero write amplification
      expect(setItemSpy).toHaveBeenCalledTimes(0);

      // Invariant: remainingSeconds must decrement accurately without drift
      const remaining = useExamStore.getState().getRemainingSeconds();
      expect(remaining).toBe(86400 - 10000); // 76,400s
    });

    it('EMP-SOAK-02: 5,000 ticks while exam is paused result in ZERO localStorage.setItem calls and 0 drift', () => {
      let currentTime = 1700000000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      useExamStore.getState().startExam('OSCP');
      currentTime += 3600 * 1000; // 1 hour in
      useExamStore.getState().pauseExam();

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockClear();

      // Simulate 5,000 ticks during pause
      for (let i = 0; i < 5000; i++) {
        currentTime += 1000;
        useExamStore.getState().tick();
      }

      expect(setItemSpy).toHaveBeenCalledTimes(0);
      expect(useExamStore.getState().getRemainingSeconds()).toBe(86400 - 3600);
      expect(useExamStore.getState().status).toBe('paused');
    });

    it('EMP-SOAK-03: Exam expiration boundary transition via tick cleanly transitions to completed', () => {
      let currentTime = 1700000000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      useExamStore.getState().startExam('OSCP');
      // Fast forward to 1 second before expiry
      currentTime += 86399 * 1000;
      useExamStore.getState().tick();

      expect(useExamStore.getState().status).toBe('running');
      expect(useExamStore.getState().getRemainingSeconds()).toBe(1);

      // Final tick that crosses expiry
      currentTime += 1000;
      useExamStore.getState().tick();

      expect(useExamStore.getState().status).toBe('completed');
      expect(useExamStore.getState().remainingSeconds).toBe(0);

      // Invariant: getRemainingSeconds() returns 0 when exam status is completed
      const getterRemaining = useExamStore.getState().getRemainingSeconds();
      expect(getterRemaining).toBe(0);
    });

    it('EMP-SOAK-04: Bio-break tick write behavior analysis (empirical measurement)', () => {
      let currentTime = 1700000000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      useExamStore.getState().startExam('OSCP');
      useExamStore.getState().startBreak('bio'); // 15m break = 900s

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockClear();

      // Tick 60 times with time advancing 1s each tick
      for (let i = 0; i < 60; i++) {
        currentTime += 1000;
        useExamStore.getState().tick();
      }

      // Invariant: 60 continuous break ticks produce ZERO localStorage.setItem calls
      const breakWrites = setItemSpy.mock.calls.length;
      expect(breakWrites).toBe(0);
    });

    it('EMP-SOAK-05: Bio-break expiry triggers alarm once and marks break completed/inactive', () => {
      let currentTime = 1700000000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      useExamStore.getState().startExam('OSCP');
      useExamStore.getState().startBreak('bio'); // 15m break = 900s

      expect(useExamStore.getState().activeBreak.isActive).toBe(true);

      // Fast forward to expiry
      currentTime += 900 * 1000;
      useExamStore.getState().tick();

      // Break must now be marked inactive and completed
      expect(useExamStore.getState().activeBreak.isActive).toBe(false);
      expect(useExamStore.getState().breakHistory.length).toBe(1);
      expect(useExamStore.getState().breakHistory[0].type).toBe('bio');

      // Subsequent ticks must NOT re-trigger alarm or add duplicate break history
      const historyCount = useExamStore.getState().breakHistory.length;
      for (let i = 0; i < 10; i++) {
        currentTime += 1000;
        useExamStore.getState().tick();
      }
      expect(useExamStore.getState().breakHistory.length).toBe(historyCount);
    });
  });

  /* =====================================================================
   * ADVERSARIAL CHALLENGE 2: AUDIO ENGINE SAFETY & CONCURRENCY HARNESS
   * ===================================================================== */
  describe('Challenge 2: Web Audio Synthesizer Safety & Concurrency', () => {
    it('EMP-AUDIO-01: Rapid burst of 500 concurrent playCyberAlert calls across all types reuses singleton AudioContext', () => {
      let contextCreations = 0;
      let oscillatorsCreated = 0;
      let gainsCreated = 0;
      let disconnectedCount = 0;

      const activeOscillators: any[] = [];

      class MockAudioContext {
        state = 'running';
        currentTime = 100.0;
        destination = {};

        createOscillator() {
          oscillatorsCreated++;
          const osc = {
            type: 'sine',
            frequency: { setValueAtTime: vi.fn() },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            disconnect: vi.fn(() => {
              disconnectedCount++;
            }),
            onended: null as any,
          };
          activeOscillators.push(osc);
          return osc;
        }

        createGain() {
          gainsCreated++;
          return {
            gain: {
              setValueAtTime: vi.fn(),
              exponentialRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn(),
            disconnect: vi.fn(),
          };
        }

        resume = vi.fn().mockResolvedValue(undefined);
        close = vi.fn().mockResolvedValue(undefined);

        constructor() {
          contextCreations++;
        }
      }

      (window as any).AudioContext = MockAudioContext;

      const soundTypes: ('alarm' | 'tick' | 'flag_captured' | 'victory_fanfare')[] = [
        'alarm',
        'tick',
        'flag_captured',
        'victory_fanfare',
      ];

      // Fire 500 interleaved rapid calls
      for (let i = 0; i < 500; i++) {
        const type = soundTypes[i % soundTypes.length];
        playCyberAlert(type);
      }

      // Assert singleton context creation: EXACTLY 1!
      expect(contextCreations).toBe(1);
      expect(oscillatorsCreated).toBeGreaterThan(500);
      expect(gainsCreated).toBeGreaterThan(500);

      // Verify node cleanup: trigger onended on all created oscillators
      activeOscillators.forEach((osc) => {
        if (typeof osc.onended === 'function') {
          osc.onended();
        }
      });

      expect(disconnectedCount).toBe(oscillatorsCreated);
    });

    it('EMP-AUDIO-02: Handles suspended AudioContext state by invoking resume()', () => {
      let resumeCalls = 0;
      class SuspendedAudioContext {
        state = 'suspended';
        currentTime = 0;
        destination = {};
        createOscillator = vi.fn().mockReturnValue({
          frequency: { setValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          disconnect: vi.fn(),
        });
        createGain = vi.fn().mockReturnValue({
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
          disconnect: vi.fn(),
        });
        resume = vi.fn(() => {
          resumeCalls++;
          this.state = 'running';
          return Promise.resolve();
        });
        close = vi.fn().mockResolvedValue(undefined);
      }

      (window as any).AudioContext = SuspendedAudioContext;
      _resetAudioContextForTesting();

      playCyberAlert('tick');
      expect(resumeCalls).toBe(1);
    });

    it('EMP-AUDIO-03: Gracefully survives AudioContext hardware exceptions without throwing', () => {
      class CrashingAudioContext {
        state = 'running';
        currentTime = 0;
        destination = {};
        createOscillator() {
          throw new DOMException('Hardware device unavailable / quota exceeded', 'QuotaExceededError');
        }
        createGain() {
          throw new Error('Gain allocation failed');
        }
        resume = vi.fn().mockResolvedValue(undefined);
        close = vi.fn().mockResolvedValue(undefined);
      }

      (window as any).AudioContext = CrashingAudioContext;

      // None of the alert types should throw uncaught exceptions
      expect(() => playCyberAlert('alarm')).not.toThrow();
      expect(() => playCyberAlert('tick')).not.toThrow();
      expect(() => playCyberAlert('flag_captured')).not.toThrow();
      expect(() => playCyberAlert('victory_fanfare')).not.toThrow();
    });

    it('EMP-AUDIO-04: Mute state guarantees zero nodes created and rapid toggling is thread-safe', () => {
      let createdOscillators = 0;
      class MonitoredAudioContext {
        state = 'running';
        currentTime = 0;
        destination = {};
        createOscillator = vi.fn(() => {
          createdOscillators++;
          return {
            frequency: { setValueAtTime: vi.fn() },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
            disconnect: vi.fn(),
          };
        });
        createGain = vi.fn(() => ({
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
          disconnect: vi.fn(),
        }));
        resume = vi.fn().mockResolvedValue(undefined);
      }

      (window as any).AudioContext = MonitoredAudioContext;
      _resetAudioContextForTesting();

      setAudioMuted(true);
      playCyberAlert('alarm');
      playCyberAlert('victory_fanfare');
      expect(createdOscillators).toBe(0);

      // Rapidly toggle mute while firing alerts
      for (let i = 0; i < 100; i++) {
        setAudioMuted(i % 2 === 0);
        playCyberAlert('tick');
      }

      // Created oscillators should be approximately half
      expect(createdOscillators).toBe(50);
    });
  });

  /* =====================================================================
   * ADVERSARIAL CHALLENGE 3: PACING MATH & BOUNDARY ORACLE
   * ===================================================================== */
  describe('Challenge 3: Pacing Math Boundary Invariants & Division-by-Zero Defense', () => {
    const defaultBoxes = generateExamTargetsForTrack('OSCP');

    it('EMP-PACE-01: Zero time remaining never produces NaN, Infinity, or unhandled errors', () => {
      const now = Date.now();
      const session = {
        examStartedAt: now - 86400 * 1000,
        examExpiresAt: now, // 0 remaining
        timerPausedRemainingSeconds: null,
        boxes: defaultBoxes,
      };

      const result = computeExamPacing(session, { totalScore: 30, passThreshold: 70 }, now);

      expect(result.remainingSeconds).toBe(0);
      expect(Number.isFinite(result.requiredPacePtsPerHour)).toBe(true);
      expect(Number.isNaN(result.requiredPacePtsPerHour)).toBe(false);
      expect(Number.isFinite(result.currentPacePtsPerHour)).toBe(true);
      expect(Number.isNaN(result.currentPacePtsPerHour)).toBe(false);
      expect(result.timeRemainingPerUnrootedBoxSeconds).toBe(0);
    });

    it('EMP-PACE-02: Negative delta / future clock jump handled gracefully without negative elapsed', () => {
      const now = Date.now();
      const session = {
        // System clock warped: startedAt appears 2 hours in the future
        examStartedAt: now + 7200 * 1000,
        // Expiration in the distant past
        examExpiresAt: now - 3600 * 1000,
        timerPausedRemainingSeconds: null,
        boxes: defaultBoxes,
      };

      const result = computeExamPacing(session, { totalScore: 0, passThreshold: 70 }, now);

      // elapsedSeconds clamped to Math.max(1, ...)
      expect(result.elapsedSeconds).toBeGreaterThanOrEqual(1);
      expect(result.remainingSeconds).toBe(0);
      expect(Number.isFinite(result.requiredPacePtsPerHour)).toBe(true);
      expect(Number.isFinite(result.currentPacePtsPerHour)).toBe(true);
      expect(Number.isNaN(result.projectedFinalScore)).toBe(false);
    });

    it('EMP-PACE-03: Zero points scored (0 pts) produces 0 current pace and finite projected score', () => {
      const now = Date.now();
      const session = {
        examStartedAt: now - 3600 * 1000,
        examExpiresAt: now + 3600 * 1000,
        timerPausedRemainingSeconds: null,
        boxes: defaultBoxes,
      };

      const result = computeExamPacing(session, { totalScore: 0, passThreshold: 70 }, now);

      expect(result.currentScore).toBe(0);
      expect(result.currentPacePtsPerHour).toBe(0);
      expect(result.projectedFinalScore).toBe(0);
      expect(result.pointsNeeded).toBe(70);
    });

    it('EMP-PACE-04: Perfect score (100 pts) and bonus points (>100 pts) correctly mark PASSED with 0 pointsNeeded', () => {
      const now = Date.now();
      const session = {
        examStartedAt: now - 3600 * 1000,
        examExpiresAt: now + 3600 * 1000,
        timerPausedRemainingSeconds: null,
        boxes: defaultBoxes,
      };

      const result100 = computeExamPacing(session, { totalScore: 100, passThreshold: 70 }, now);
      expect(result100.pacingStatus).toBe('PASSED');
      expect(result100.pointsNeeded).toBe(0);
      expect(result100.requiredPacePtsPerHour).toBe(0);

      // Over 100 (e.g. 110 with bonus)
      const result110 = computeExamPacing(session, { totalScore: 110, passThreshold: 70 }, now);
      expect(result110.pacingStatus).toBe('PASSED');
      expect(result110.pointsNeeded).toBe(0);
      expect(result110.projectedFinalScore).toBe(100); // Clamped at 100
    });

    it('EMP-PACE-05: Zero unrooted boxes (100% completion) avoids division by zero', () => {
      const now = Date.now();
      // All boxes pwned
      const pwnedBoxes: ExamBox[] = defaultBoxes.map((b) => ({
        ...b,
        userPwned: true,
        rootPwned: true,
      }));

      const session = {
        examStartedAt: now - 3600 * 1000,
        examExpiresAt: now + 3600 * 1000,
        timerPausedRemainingSeconds: null,
        boxes: pwnedBoxes,
      };

      const result = computeExamPacing(session, { totalScore: 100, passThreshold: 70 }, now);

      expect(result.unrootedBoxesCount).toBe(0);
      // Fallback to remainingSeconds when 0 unrooted boxes:
      expect(result.timeRemainingPerUnrootedBoxSeconds).toBe(result.remainingSeconds);
      expect(Number.isNaN(result.timeRemainingPerUnrootedBoxSeconds)).toBe(false);
    });

    it('EMP-PACE-06: Empty boxes array ([]), zero passThreshold, and negative scores handled safely', () => {
      const now = Date.now();
      const session = {
        examStartedAt: now,
        examExpiresAt: now + 10000,
        timerPausedRemainingSeconds: null,
        boxes: [],
      };

      // Empty boxes + 0 passThreshold
      const result = computeExamPacing(session, { totalScore: 0, passThreshold: 0 }, now);
      expect(result.unrootedBoxesCount).toBe(0);
      expect(result.pacingStatus).toBe('PASSED');
      expect(result.pointsNeeded).toBe(0);

      // Negative score
      const negResult = computeExamPacing(session, { totalScore: -50, passThreshold: 70 }, now);
      expect(negResult.pointsNeeded).toBe(120);
      expect(Number.isFinite(negResult.requiredPacePtsPerHour)).toBe(true);
    });

    it('EMP-PACE-07: Rabbit hole detector boundary tests (null active time, 0 threshold, clock warp)', () => {
      const now = Date.now();

      // Null active time
      const resNull = checkRabbitHole('t1', 'Target1', null, false, 90, now);
      expect(resNull.isRabbitHole).toBe(false);
      expect(resNull.timeSpentSeconds).toBe(0);

      // Box already pwned
      const resPwned = checkRabbitHole('t1', 'Target1', now - 1000000, true, 90, now);
      expect(resPwned.isRabbitHole).toBe(false);

      // Clock in the future
      const resFuture = checkRabbitHole('t1', 'Target1', now + 50000, false, 90, now);
      expect(resFuture.isRabbitHole).toBe(false);
      expect(resFuture.timeSpentSeconds).toBe(0);

      // 0 threshold
      const resZero = checkRabbitHole('t1', 'Target1', now - 1000, false, 0, now);
      expect(resZero.isRabbitHole).toBe(true);
      expect(resZero.message).toContain('RABBIT HOLE DETECTED');
    });

    it('EMP-PACE-08: Break countdown boundary tests (null startedAt, 0 duration, expired)', () => {
      const now = Date.now();

      // null startedAt
      const resNull = calculateBreakCountdown(null, 900, now);
      expect(resNull.remainingSeconds).toBe(900);
      expect(resNull.isExpired).toBe(false);
      expect(resNull.formattedTime).toBe('00:15:00');

      // 0 duration
      const resZero = calculateBreakCountdown(now, 0, now);
      expect(resZero.remainingSeconds).toBe(0);
      expect(resZero.isExpired).toBe(true);

      // Negative duration
      const resNeg = calculateBreakCountdown(now, -500, now);
      expect(resNeg.remainingSeconds).toBe(0);
      expect(resNeg.isExpired).toBe(true);
      expect(resNeg.formattedTime).toBe('00:00:00');
    });

    it('EMP-PACE-09: Time formatters boundary tests (negative, NaN, 0, large values)', () => {
      expect(formatSecondsToHms(0)).toBe('00:00:00');
      expect(formatSecondsToHms(-100)).toBe('00:00:00');
      expect(formatSecondsToHms(86400)).toBe('24:00:00');
      expect(formatSecondsToHms(359999)).toBe('99:59:59');

      expect(formatSecondsToHoursMinutes(0)).toBe('0m');
      expect(formatSecondsToHoursMinutes(-50)).toBe('0m');
      expect(formatSecondsToHoursMinutes(3600)).toBe('1h 0m');
      expect(formatSecondsToHoursMinutes(3660)).toBe('1h 1m');
      expect(formatSecondsToHoursMinutes(59)).toBe('0m');
    });
  });

  /* =====================================================================
   * ADVERSARIAL CHALLENGE 4: OSCP RULESET ADVERSARIAL INVARIANTS
   * ===================================================================== */
  describe('Challenge 4: OSCP Ruleset Adversarial Invariants', () => {
    it('EMP-OSCP-01: Exhaustive verification that all 7 partial AD permutations yield exactly 0 AD points', () => {
      // Test all 7 partial combinations: [foothold, lateral, dc]
      const permutations: [boolean, boolean, boolean][] = [
        [false, false, false],
        [true, false, false],
        [false, true, false],
        [false, false, true],
        [true, true, false],
        [true, false, true],
        [false, true, true],
      ];

      permutations.forEach(([fh, lat, dc]) => {
        const boxes = generateExamTargetsForTrack('OSCP');
        const adFoothold = boxes.find((b) => b.type === 'ad-foothold')!;
        const adLateral = boxes.find((b) => b.type === 'ad-lateral')!;
        const adDc = boxes.find((b) => b.type === 'ad-dc')!;

        adFoothold.userPwned = fh;
        adLateral.userPwned = lat;
        adDc.rootPwned = dc;

        const score = calculateExamScore('OSCP', boxes);
        expect(score.totalScore).toBe(0);
        expect(score.adSetCompromised).toBe(false);
        expect(score.isPassing).toBe(false);
      });

      // Full compromise yields 40
      const boxesFull = generateExamTargetsForTrack('OSCP');
      boxesFull.find((b) => b.type === 'ad-foothold')!.userPwned = true;
      boxesFull.find((b) => b.type === 'ad-lateral')!.userPwned = true;
      boxesFull.find((b) => b.type === 'ad-dc')!.rootPwned = true;
      const scoreFull = calculateExamScore('OSCP', boxesFull);
      expect(scoreFull.totalScore).toBe(40);
      expect(scoreFull.adSetCompromised).toBe(true);
    });

    it('EMP-OSCP-02: 70 points passing threshold edge cases and bonus point integration', () => {
      const boxes = generateExamTargetsForTrack('OSCP');
      // Pwn all 3 standalones: 60 pts
      boxes.filter((b) => !b.type.startsWith('ad-')).forEach((b) => {
        b.userPwned = true;
        b.rootPwned = true;
      });

      // Without bonus: 60 pts -> Fail
      const score60 = calculateExamScore('OSCP', boxes, { includeBonusPoints: false });
      expect(score60.totalScore).toBe(60);
      expect(score60.isPassing).toBe(false);
      expect(score60.pointsNeeded).toBe(10);

      // With bonus: 60 + 10 = 70 pts -> Pass
      const score70 = calculateExamScore('OSCP', boxes, { includeBonusPoints: true });
      expect(score70.totalScore).toBe(70);
      expect(score70.isPassing).toBe(true);
      expect(score70.pointsNeeded).toBe(0);
    });

    it('EMP-OSCP-03: useExamStore getPassingStatus behavior on 70-point standalone + bonus scenario', () => {
      useExamStore.getState().startExam('OSCP');
      useExamStore.getState().setIncludeBonusPoints(true);

      const standalones = useExamStore.getState().boxes.filter((b) => !b.type.startsWith('ad-'));
      standalones.forEach((st) => {
        useExamStore.getState().submitFlag(st.id, 'user', '11111111111111111111111111111111');
        useExamStore.getState().submitFlag(st.id, 'root', '22222222222222222222222222222222');
      });

      const score = useExamStore.getState().getScore();
      expect(score.totalScore).toBe(70);
      expect(score.isPassing).toBe(true);

      // Invariant: Candidates reaching 70+ pts via 3 Standalone boxes (60 pts) + 10 bonus points pass
      const status = useExamStore.getState().getPassingStatus();
      expect(status).toBe('Passing');
    });
  });

  /* =====================================================================
   * ADVERSARIAL CHALLENGE 5: CPTS RULESET ADVERSARIAL INVARIANTS
   * ===================================================================== */
  describe('Challenge 5: CPTS Ruleset Adversarial Invariants', () => {
    it('EMP-CPTS-01: Exactly 14 flag objectives across 7 machines totaling 100 points, 85 pt threshold', () => {
      const boxes = generateExamTargetsForTrack('CPTS');
      expect(boxes.length).toBe(7);

      let flagCount = 0;
      let totalPts = 0;
      boxes.forEach((b) => {
        if (b.userPoints > 0) { flagCount++; totalPts += b.userPoints; }
        if (b.rootPoints > 0) { flagCount++; totalPts += b.rootPoints; }
      });
      expect(flagCount).toBe(14);
      expect(totalPts).toBe(100);

      // Boundary: 84 pts (12 flags) fails
      for (let i = 0; i < 6; i++) {
        boxes[i].userPwned = true;
        boxes[i].rootPwned = true;
      }
      const score84 = calculateExamScore('CPTS', boxes);
      expect(score84.totalScore).toBe(84);
      expect(score84.isPassing).toBe(false);
      expect(score84.pointsNeeded).toBe(1);

      // Boundary: 92 pts (13 flags) passes
      boxes[6].userPwned = true;
      const score92 = calculateExamScore('CPTS', boxes);
      expect(score92.totalScore).toBe(92);
      expect(score92.isPassing).toBe(true);
      expect(score92.pointsNeeded).toBe(0);
    });
  });

  /* =====================================================================
   * ADVERSARIAL CHALLENGE 6: CRTO RULESET ADVERSARIAL INVARIANTS
   * ===================================================================== */
  describe('Challenge 6: CRTO Ruleset Adversarial Invariants', () => {
    it('EMP-CRTO-01: Exactly 8 objectives @ 12.5 pts = 100 pts, 75 pt threshold', () => {
      const boxes = generateExamTargetsForTrack('CRTO');
      expect(boxes.length).toBe(8);

      boxes.forEach((b) => {
        expect(b.rootPoints).toBe(12.5);
      });

      // 5 objectives = 62.5 pts -> Fail
      for (let i = 0; i < 5; i++) boxes[i].rootPwned = true;
      const score62 = calculateExamScore('CRTO', boxes);
      expect(score62.totalScore).toBe(62.5);
      expect(score62.isPassing).toBe(false);
      expect(score62.pointsNeeded).toBe(12.5);

      // 6 objectives = 75 pts -> Pass
      boxes[5].rootPwned = true;
      const score75 = calculateExamScore('CRTO', boxes);
      expect(score75.totalScore).toBe(75);
      expect(score75.isPassing).toBe(true);
      expect(score75.pointsNeeded).toBe(0);
    });
  });

  /* =====================================================================
   * ADVERSARIAL CHALLENGE 7: TIMER EDGE CASES & TIME-WARP DELTA RETENTION
   * ===================================================================== */
  describe('Challenge 7: Timer Edge Cases & Time-Warp Delta Retention', () => {
    it('EMP-TIME-01: Pause/resume retains exact delta across massive 10-day simulated time jump', () => {
      let currentTime = 1700000000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      useExamStore.getState().startExam('OSCP'); // 86400s
      expect(useExamStore.getState().getRemainingSeconds()).toBe(86400);

      // Elapse 1,000s
      currentTime += 1000 * 1000;
      expect(useExamStore.getState().getRemainingSeconds()).toBe(85400);

      // Pause exam
      useExamStore.getState().pauseExam();
      expect(useExamStore.getState().status).toBe('paused');
      expect(useExamStore.getState().getRemainingSeconds()).toBe(85400);

      // Massive time warp: 10 days pass while paused (864,000 seconds)
      currentTime += 864000 * 1000;

      // Assert that while paused, remaining seconds did NOT decrement
      expect(useExamStore.getState().getRemainingSeconds()).toBe(85400);

      // Resume exam
      useExamStore.getState().resumeExam();
      expect(useExamStore.getState().status).toBe('running');

      // Assert remaining seconds are STILL exactly 85,400 after resume
      expect(useExamStore.getState().getRemainingSeconds()).toBe(85400);

      // Advance 100 seconds after resume
      currentTime += 100 * 1000;
      expect(useExamStore.getState().getRemainingSeconds()).toBe(85300);
    });

    it('EMP-TIME-02: Negative time remaining and extreme durations handled safely without crashes', () => {
      let currentTime = 1700000000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      useExamStore.getState().startExam('OSCP');

      // Fast forward past expiration by 24 hours into the negative
      currentTime += (86400 + 86400) * 1000;

      // getRemainingSeconds() must clamp to 0, never negative
      expect(useExamStore.getState().getRemainingSeconds()).toBeGreaterThanOrEqual(0);

      // tick() when remaining is negative transitions to completed
      useExamStore.getState().tick();
      expect(useExamStore.getState().status).toBe('completed');
    });
  });
});


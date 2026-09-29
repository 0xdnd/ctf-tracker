import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useExamStore, EXAM_STORAGE_KEY } from './examStore';
import { calculateExamScore } from '../utils/examComplianceUtils';

describe('useExamStore Zustand 5 State & Endurance Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    useExamStore.getState().resetExam('OSCP');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Session Lifecycle & Clock Invariants', () => {
    it('initializes with default OSCP state in idle status', () => {
      const state = useExamStore.getState();
      expect(state.track).toBe('OSCP');
      expect(state.status).toBe('idle');
      expect(state.boxes.length).toBe(6);
      expect(state.totalDurationSeconds).toBe(86400);
      expect(state.examExpiresAt).toBeNull();
      expect(state.activeBreak.isActive).toBe(false);
    });

    it('starts exam with absolute epoch expiration and initial milestone', () => {
      const now = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(now);

      useExamStore.getState().startExam('OSCP');

      const state = useExamStore.getState();
      expect(state.status).toBe('running');
      expect(state.startedAt).toBe(now);
      expect(state.examExpiresAt).toBe(now + 86400 * 1000);
      expect(state.timerPausedRemainingSeconds).toBeNull();
      expect(state.milestones.length).toBe(1);
      expect(state.milestones[0].notes).toContain('Exam session initiated');

      vi.restoreAllMocks();
    });

    it('pauses and resumes exam without losing remaining seconds or accumulating drift', () => {
      let currentTime = 1700000000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      useExamStore.getState().startExam('OSCP');

      // Advance clock by 3,600s (1 hour)
      currentTime += 3600 * 1000;
      expect(useExamStore.getState().getRemainingSeconds()).toBe(86400 - 3600);

      // Pause exam
      useExamStore.getState().pauseExam();
      let state = useExamStore.getState();
      expect(state.status).toBe('paused');
      expect(state.examExpiresAt).toBeNull();
      expect(state.timerPausedRemainingSeconds).toBe(86400 - 3600);

      // Simulated computer sleep / pause for 5 hours while paused
      currentTime += 5 * 3600 * 1000;
      expect(useExamStore.getState().getRemainingSeconds()).toBe(86400 - 3600);

      // Resume exam
      useExamStore.getState().resumeExam();
      state = useExamStore.getState();
      expect(state.status).toBe('running');
      expect(state.examExpiresAt).toBe(currentTime + (86400 - 3600) * 1000);
      expect(state.timerPausedRemainingSeconds).toBeNull();

      // Advance clock another 1,800s (30m)
      currentTime += 1800 * 1000;
      expect(useExamStore.getState().getRemainingSeconds()).toBe(86400 - 3600 - 1800);

      vi.restoreAllMocks();
    });

    it('resets exam session to clean default state', () => {
      useExamStore.getState().startExam('OSCP');
      useExamStore.getState().submitFlag(useExamStore.getState().boxes[3].id, 'user', 'a3f789e02c1145b209d84e1bfa892104');

      expect(useExamStore.getState().status).toBe('running');
      expect(useExamStore.getState().boxes[3].userPwned).toBe(true);

      useExamStore.getState().resetExam('OSCP');

      const resetState = useExamStore.getState();
      expect(resetState.status).toBe('idle');
      expect(resetState.boxes[3].userPwned).toBe(false);
      expect(resetState.examExpiresAt).toBeNull();
    });
  });

  describe('Flag Submission & Milestone Automation', () => {
    it('rejects invalid or empty flag strings without modifying state', () => {
      const box = useExamStore.getState().boxes[3];
      const submitted = useExamStore.getState().submitFlag(box.id, 'user', 'bad');
      expect(submitted).toBe(false);
      expect(useExamStore.getState().boxes[3].userPwned).toBe(false);
    });

    it('submits valid flag, updates proof, and automatically timestamps initial access milestone', () => {
      const box = useExamStore.getState().boxes[3]; // Standalone
      const validHash = '1234567890abcdef1234567890abcdef';

      const submitted = useExamStore.getState().submitFlag(box.id, 'user', validHash);
      expect(submitted).toBe(true);

      const updatedBox = useExamStore.getState().boxes.find((b) => b.id === box.id)!;
      expect(updatedBox.userPwned).toBe(true);
      expect(updatedBox.userProof.flagText).toBe(validHash);
      expect(updatedBox.initialAccessAt).toBeDefined();

      const milestones = useExamStore.getState().milestones;
      expect(milestones.some((m) => m.type === 'initial_access' && m.targetId === box.id)).toBe(true);
    });

    it('records domain_admin milestone when Active Directory Domain Controller root is submitted', () => {
      const dcBox = useExamStore.getState().boxes.find((b) => b.type === 'ad-dc')!;
      const validHash = 'fedcba0987654321fedcba0987654321';

      const submitted = useExamStore.getState().submitFlag(dcBox.id, 'root', validHash);
      expect(submitted).toBe(true);

      const updatedDc = useExamStore.getState().boxes.find((b) => b.id === dcBox.id)!;
      expect(updatedDc.rootPwned).toBe(true);
      expect(updatedDc.domainCompromiseAt).toBeDefined();

      const milestones = useExamStore.getState().milestones;
      expect(milestones.some((m) => m.type === 'domain_admin' && m.targetId === dcBox.id)).toBe(true);
    });

    it('triggers pass_achieved milestone when passing threshold is achieved', () => {
      useExamStore.getState().startExam('OSCP');

      // Pwn AD Foothold, Lateral, and DC (40 pts)
      const adTargets = useExamStore.getState().boxes.filter((b) => b.type.startsWith('ad-'));
      adTargets.forEach((t) => {
        if (t.userPoints > 0) useExamStore.getState().submitFlag(t.id, 'user', '11111111111111111111111111111111');
        if (t.rootPoints > 0) useExamStore.getState().submitFlag(t.id, 'root', '22222222222222222222222222222222');
      });

      // Pwn Standalone 1 User + Root (20 pts) -> 60 pts
      const standalones = useExamStore.getState().boxes.filter((b) => !b.type.startsWith('ad-'));
      useExamStore.getState().submitFlag(standalones[0].id, 'user', '33333333333333333333333333333333');
      useExamStore.getState().submitFlag(standalones[0].id, 'root', '44444444444444444444444444444444');

      expect(useExamStore.getState().getScore().totalScore).toBe(60);
      expect(useExamStore.getState().getPassingStatus()).toBe('In Progress');

      // Pwn Standalone 2 User (10 pts) -> 70 pts (THRESHOLD REACHED!)
      useExamStore.getState().submitFlag(standalones[1].id, 'user', '55555555555555555555555555555555');

      expect(useExamStore.getState().getScore().totalScore).toBe(70);
      expect(useExamStore.getState().getScore().isPassing).toBe(true);
      expect(useExamStore.getState().getPassingStatus()).toBe('Passing');

      const passMilestone = useExamStore.getState().milestones.find((m) => m.type === 'pass_achieved');
      expect(passMilestone).toBeDefined();
      expect(passMilestone?.notes).toContain('PASSING THRESHOLD ACHIEVED: 70 / 100 PTS!');
    });
  });

  describe('Bio-Break Management', () => {
    it('initiates bio, food, rest, and custom breaks with parallel countdown without stopping exam clock', () => {
      const now = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(now);

      useExamStore.getState().startExam('OSCP');
      const examExpiresAtBeforeBreak = useExamStore.getState().examExpiresAt;

      // Start 15m bio break
      useExamStore.getState().startBreak('bio');

      const state = useExamStore.getState();
      expect(state.activeBreak.isActive).toBe(true);
      expect(state.activeBreak.type).toBe('bio');
      expect(state.activeBreak.durationSeconds).toBe(900);
      expect(state.activeBreak.expiresAt).toBe(now + 900 * 1000);

      // Exam clock must continue unaltered!
      expect(state.examExpiresAt).toBe(examExpiresAtBeforeBreak);

      // Cancel / end break
      useExamStore.getState().cancelBreak();
      const afterBreakState = useExamStore.getState();
      expect(afterBreakState.activeBreak.isActive).toBe(false);
      expect(afterBreakState.breakHistory.length).toBe(1);
      expect(afterBreakState.breakHistory[0].type).toBe('bio');

      vi.restoreAllMocks();
    });

    it('supports custom duration breaks', () => {
      const now = 1700000000000;
      vi.spyOn(Date, 'now').mockReturnValue(now);

      useExamStore.getState().startBreak('custom', 45); // 45 minutes = 2700s
      expect(useExamStore.getState().activeBreak.durationSeconds).toBe(2700);
      expect(useExamStore.getState().activeBreak.expiresAt).toBe(now + 2700 * 1000);

      vi.restoreAllMocks();
    });
  });

  describe('Evidence Proofs & Screenshots', () => {
    it('adds and removes screenshot proofs for a target', () => {
      const box = useExamStore.getState().boxes[0];
      const screenshot = {
        id: 'sc-123',
        dataUrl: 'data:image/png;base64,mockImage',
        caption: 'whoami proof screenshot',
        timestamp: new Date().toISOString(),
      };

      useExamStore.getState().addScreenshot(box.id, 'user', screenshot);

      let updatedBox = useExamStore.getState().boxes.find((b) => b.id === box.id)!;
      expect(updatedBox.userProof.screenshotTaken).toBe(true);
      expect(updatedBox.userProof.screenshots?.length).toBe(1);
      expect(updatedBox.userProof.screenshots?.[0].id).toBe('sc-123');

      // Remove screenshot
      useExamStore.getState().removeScreenshot(box.id, 'user', 'sc-123');
      updatedBox = useExamStore.getState().boxes.find((b) => b.id === box.id)!;
      expect(updatedBox.userProof.screenshots?.length).toBe(0);
      expect(updatedBox.userProof.screenshotTaken).toBe(false);
    });

    it('updates whoami, ipconfig, and tools used via updateProof', () => {
      const box = useExamStore.getState().boxes[0];
      useExamStore.getState().updateProof(box.id, 'user', {
        whoamiOutput: 'root',
        ipconfigOutput: '192.168.1.30',
        toolsUsed: 'sqlmap, nmap',
      });

      const updatedBox = useExamStore.getState().boxes.find((b) => b.id === box.id)!;
      expect(updatedBox.userProof.whoamiOutput).toBe('root');
      expect(updatedBox.userProof.ipconfigOutput).toBe('192.168.1.30');
      expect(updatedBox.userProof.toolsUsed).toBe('sqlmap, nmap');
    });
  });

  describe('Soak Endurance & Memory Invariants: Discrete Writes Check', () => {
    it('ensures 1,000 clock ticks NEVER trigger write amplification to localStorage', () => {
      useExamStore.getState().startExam('OSCP');

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockClear();

      // Simulate 1,000 1Hz countdown ticks
      for (let i = 0; i < 1000; i++) {
        useExamStore.getState().tick();
      }

      // 1,000 in-memory ticks must result in ZERO calls to localStorage.setItem!
      expect(setItemSpy).toHaveBeenCalledTimes(0);

      setItemSpy.mockRestore();
    });
  });

  describe('Milestone 1 Iteration 2: Remediation Invariants', () => {
    it('returns 0 remaining seconds when exam status is completed', () => {
      let currentTime = 1700000000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      useExamStore.getState().startExam('OSCP');
      currentTime += 86400 * 1000;
      useExamStore.getState().tick();

      expect(useExamStore.getState().status).toBe('completed');
      expect(useExamStore.getState().getRemainingSeconds()).toBe(0);

      vi.restoreAllMocks();
    });

    it('ensures 60 continuous bio-break ticks produce ZERO calls to localStorage.setItem', () => {
      let currentTime = 1700000000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      useExamStore.getState().startExam('OSCP');
      useExamStore.getState().startBreak('bio');

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockClear();

      for (let i = 0; i < 60; i++) {
        currentTime += 1000;
        useExamStore.getState().tick();
      }

      expect(setItemSpy).toHaveBeenCalledTimes(0);
      expect(useExamStore.getState().getBreakRemainingSeconds()).toBe(900 - 60);

      setItemSpy.mockRestore();
      vi.restoreAllMocks();
    });

    it('awards Passing status when candidate achieves 70 pts via standalones + bonus points without AD set', () => {
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
      expect(score.adSetCompromised).toBe(false);

      expect(useExamStore.getState().getPassingStatus()).toBe('Passing');
    });

    it('triggers bio-break expiry alarm once, concludes break, and does not repeat alarm on next ticks', () => {
      let currentTime = 1700000000000;
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      useExamStore.getState().startExam('OSCP');
      useExamStore.getState().startBreak('bio'); // 900s

      expect(useExamStore.getState().activeBreak.isActive).toBe(true);

      currentTime += 900 * 1000;
      useExamStore.getState().tick();

      expect(useExamStore.getState().activeBreak.isActive).toBe(false);
      expect(useExamStore.getState().breakHistory.length).toBe(1);

      // Subsequent ticks should not re-trigger or add more history
      for (let i = 0; i < 10; i++) {
        currentTime += 1000;
        useExamStore.getState().tick();
      }
      expect(useExamStore.getState().breakHistory.length).toBe(1);

      vi.restoreAllMocks();
    });
  });
});

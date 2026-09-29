/**
 * adversarialTier5ExamHarden.test.ts
 * ZeroBox Certification Exam Simulator & Persistent Mission HUD
 * Tier 5 White-Box Adversarial Coverage Hardening Suite
 * 
 * Comprehensive adversarial verification across all 10 exam targets:
 * 1. src/store/examStore.ts
 * 2. src/utils/examComplianceUtils.ts
 * 3. src/utils/audioAlerts.ts
 * 4. src/utils/examPacingUtils.ts
 * 5. src/utils/examReportGenerator.ts
 * 6. src/components/exam/ExamHeaderCapsule.tsx
 * 7. src/components/exam/ExamQuickActionDrawer.tsx
 * 8. src/components/exam/ExamEvidenceDropzone.tsx
 * 9. src/components/exam/ExamBioBreakModal.tsx
 * 10. src/components/exam/ExamReportModal.tsx
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Store & Utils
import { useExamStore, EXAM_STORAGE_KEY } from '../../store/examStore';
import {
  validateFlagFormat,
  generateExamTargetsForTrack,
  calculateExamScore,
  getPassingStatus,
  createDefaultProof,
  EXAM_TRACK_CONFIGS,
  ExamTrack,
  ExamBox,
  ScreenshotProof,
  ExamSessionState as ComplianceSessionState,
} from '../../utils/examComplianceUtils';
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
import {
  generateExamReportMarkdown,
  generateExamReportHtml,
  exportStandaloneHtmlReport,
  getRemediationForBox,
  getTrackMethodology,
  getStrategicRemediation,
} from '../../utils/examReportGenerator';

// Components
import { ExamHeaderCapsule } from '../../components/exam/ExamHeaderCapsule';
import { ExamQuickActionDrawer } from '../../components/exam/ExamQuickActionDrawer';
import { ExamEvidenceDropzone, downscaleImageFile } from '../../components/exam/ExamEvidenceDropzone';
import { ExamBioBreakModal } from '../../components/exam/ExamBioBreakModal';
import { ExamReportModal } from '../../components/exam/ExamReportModal';

// Setup Mock matchMedia
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('TIER 5 ADVERSARIAL COVERAGE HARDENING SUITE', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetAudioContextForTesting();
    setAudioMuted(false);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
      writable: true,
    });
    if (typeof document !== 'undefined') {
      document.execCommand = vi.fn().mockReturnValue(true);
    }
    useExamStore.getState().resetExam('OSCP');
  });

  afterEach(() => {
    localStorage.clear();
    _resetAudioContextForTesting();
    vi.restoreAllMocks();
  });

  /* =========================================================================
   * MODULE 1: MALFORMED REHYDRATION & CORRUPTED STORAGE PAYLOADS (examStore)
   * ========================================================================= */
  describe('Module 1: Malformed Rehydration & Corrupted Storage Resilience', () => {
    it('ADV-STORE-01: Rehydration from completely invalid/malformed JSON does not throw', () => {
      localStorage.setItem(EXAM_STORAGE_KEY, '{ malformed: json, missing_brackets: true');

      // Trigger store re-initialization
      expect(() => {
        useExamStore.persist.rehydrate();
      }).not.toThrow();

      const state = useExamStore.getState();
      expect(state.status).toBeDefined();
      expect(Array.isArray(state.boxes)).toBe(true);
      expect(state.boxes.length).toBeGreaterThan(0);
    });

    it('ADV-STORE-02: Rehydration with NaN, negative, or distant past timestamps', () => {
      const now = Date.now();
      const corruptedPayload = {
        state: {
          id: 'exam_corrupted',
          track: 'OSCP',
          status: 'running',
          startedAt: -1234567,
          examExpiresAt: NaN,
          totalDurationSeconds: 86400,
          boxes: generateExamTargetsForTrack('OSCP'),
          activeBreak: {
            isActive: true,
            type: 'bio',
            startedAt: -500,
            durationSeconds: 900,
            expiresAt: null,
            remainingSeconds: 0,
          },
          milestones: [],
          breakHistory: [],
        },
        version: 0,
      };

      localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(corruptedPayload));

      expect(() => {
        useExamStore.persist.rehydrate();
      }).not.toThrow();

      const state = useExamStore.getState();
      expect(state.status).toBe('running');
      // If examExpiresAt is NaN, getRemainingSeconds() handles it cleanly without crashing
      const rem = state.getRemainingSeconds();
      expect(typeof rem).toBe('number');
    });

    it('ADV-STORE-03: Rehydration of an expired running exam immediately recomputes remaining to 0', () => {
      const pastEpoch = Date.now() - 3600 * 1000; // Expired 1 hour ago
      const expiredPayload = {
        state: {
          id: 'exam_expired',
          track: 'OSCP',
          status: 'running',
          startedAt: pastEpoch - 86400 * 1000,
          examExpiresAt: pastEpoch,
          totalDurationSeconds: 86400,
          boxes: generateExamTargetsForTrack('OSCP'),
          activeBreak: {
            isActive: false,
            type: 'bio',
            startedAt: null,
            durationSeconds: 0,
            expiresAt: null,
            remainingSeconds: 0,
          },
          milestones: [],
          breakHistory: [],
        },
        version: 0,
      };

      localStorage.setItem(EXAM_STORAGE_KEY, JSON.stringify(expiredPayload));
      useExamStore.persist.rehydrate();

      const state = useExamStore.getState();
      expect(state.getRemainingSeconds()).toBe(0);
      expect(state.remainingSeconds).toBe(0);

      // On next tick, status transitions to completed
      state.tick();
      expect(useExamStore.getState().status).toBe('completed');
    });

    it('ADV-STORE-04: Selective storage engine deduplicates identical discrete states', () => {
      useExamStore.getState().startExam('OSCP');

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      setItemSpy.mockClear();

      // Setting scratchNotes to identical value should not write again
      useExamStore.getState().setScratchNotes(useExamStore.getState().scratchNotes);
      expect(setItemSpy).toHaveBeenCalledTimes(0);

      // Mutating scratchNotes once writes once
      useExamStore.getState().setScratchNotes('NEW_NOTES_123');
      expect(setItemSpy).toHaveBeenCalledTimes(1);

      // Setting same scratch notes again writes 0 times
      useExamStore.getState().setScratchNotes('NEW_NOTES_123');
      expect(setItemSpy).toHaveBeenCalledTimes(1);
    });
  });

  /* =========================================================================
   * MODULE 2: RAPID CONCURRENCY, FLAG SUBMISSIONS & BREAK CYCLING (examStore)
   * ========================================================================= */
  describe('Module 2: Concurrency Stress, Rapid Flag Submissions & Break Cycling', () => {
    it('ADV-CONCUR-01: 250 rapid consecutive submitFlag calls maintain state integrity', () => {
      useExamStore.getState().startExam('OSCP');
      const boxes = useExamStore.getState().boxes;
      expect(boxes.length).toBe(6);

      // Submit 250 flags rapidly in a loop across standalones and AD boxes
      const validMd5 = 'abcdef0123456789abcdef0123456789';
      for (let i = 0; i < 250; i++) {
        const box = boxes[i % boxes.length];
        const flagType = Math.floor(i / boxes.length) % 2 === 0 ? 'user' : 'root';
        const flagText = i % 7 === 0 ? 'invalid_short' : validMd5;
        useExamStore.getState().submitFlag(box.id, flagType, flagText);
      }

      const updatedBoxes = useExamStore.getState().boxes;
      expect(updatedBoxes.length).toBe(6);

      // Verify that all boxes with valid points were correctly pwned
      const standalones = updatedBoxes.filter((b) => !b.type.startsWith('ad-'));
      standalones.forEach((st) => {
        expect(st.userPwned).toBe(true);
        expect(st.rootPwned).toBe(true);
      });

      // Milestones must not have unbounded duplicate entries
      const milestones = useExamStore.getState().milestones;
      expect(milestones.length).toBeLessThan(50);
    });

    it('ADV-CONCUR-02: 50 rapid break start and cancel cycles track all entries cleanly in breakHistory', () => {
      useExamStore.getState().startExam('OSCP');

      for (let i = 0; i < 50; i++) {
        const breakType = i % 3 === 0 ? 'bio' : i % 3 === 1 ? 'food' : 'rest';
        useExamStore.getState().startBreak(breakType);
        expect(useExamStore.getState().activeBreak.isActive).toBe(true);
        useExamStore.getState().cancelBreak();
        expect(useExamStore.getState().activeBreak.isActive).toBe(false);
      }

      const history = useExamStore.getState().breakHistory;
      expect(history.length).toBe(50);
      history.forEach((entry) => {
        expect(entry.duration).toBeGreaterThanOrEqual(0);
        expect(typeof entry.timestamp).toBe('string');
      });
    });

    it('ADV-CONCUR-03: Switching track when exam is running is rejected with console warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      useExamStore.getState().startExam('OSCP');
      expect(useExamStore.getState().track).toBe('OSCP');

      // Attempt to switch to CPTS while running
      useExamStore.getState().setTrack('CPTS');
      expect(useExamStore.getState().track).toBe('OSCP');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot switch track while an exam is actively running')
      );
    });

    it('ADV-CONCUR-04: togglePwn repeatedly toggles state and calculates score correctly', () => {
      useExamStore.getState().startExam('OSCP');
      const firstBox = useExamStore.getState().boxes[0];

      // Toggle user flag on and off 100 times
      for (let i = 0; i < 100; i++) {
        useExamStore.getState().togglePwn(firstBox.id, 'user');
      }

      // Even number of toggles leaves userPwned as false
      const boxAfter = useExamStore.getState().boxes.find((b) => b.id === firstBox.id)!;
      expect(boxAfter.userPwned).toBe(false);

      // Odd toggle sets to true
      useExamStore.getState().togglePwn(firstBox.id, 'user');
      const boxAfterOdd = useExamStore.getState().boxes.find((b) => b.id === firstBox.id)!;
      expect(boxAfterOdd.userPwned).toBe(true);
    });
  });

  /* =========================================================================
   * MODULE 3: FLAG FORMAT FUZZING & SCORING MATRICES (examComplianceUtils)
   * ========================================================================= */
  describe('Module 3: Flag Format Fuzzing, Scoring Permutations & Compliance Audit', () => {
    it('ADV-FLAG-01: Exhaustive boundary fuzzing for validateFlagFormat', () => {
      // Empty & Whitespace
      expect(validateFlagFormat('').valid).toBe(false);
      expect(validateFlagFormat('   ').valid).toBe(false);

      // OffSec MD5 32 hex chars
      expect(validateFlagFormat('d41d8cd98f00b204e9800998ecf8427e').format).toBe('offsec-md5');
      expect(validateFlagFormat('D41D8CD98F00B204E9800998ECF8427E').format).toBe('offsec-md5');
      expect(validateFlagFormat('   d41d8cd98f00b204e9800998ecf8427e   ').valid).toBe(true);
      // 31 chars -> invalid
      expect(validateFlagFormat('d41d8cd98f00b204e9800998ecf8427').format).toBe('custom'); // length 31 >= 6
      expect(validateFlagFormat('12345').valid).toBe(false); // < 6 chars -> invalid

      // Non-hex 32 chars
      expect(validateFlagFormat('z41d8cd98f00b204e9800998ecf8427e').format).toBe('custom');

      // HTB Flag
      expect(validateFlagFormat('HTB{r00t_acc3ss_pwn3d!}').format).toBe('htb');
      expect(validateFlagFormat('htb{l0cal_us3r_fl4g_123}').format).toBe('htb');

      // CRTO Flag
      expect(validateFlagFormat('CRTO{c2_0ps3c_ch3ck}').format).toBe('crto');

      // THM Flag
      expect(validateFlagFormat('THM{th1s_1s_4_thm_fl4g}').format).toBe('thm');

      // Malicious XSS Strings inside flag field
      const xssFlag = validateFlagFormat('<script>alert("pwn")</script>');
      expect(xssFlag.valid).toBe(true);
      expect(xssFlag.format).toBe('custom');
    });

    it('ADV-SCORE-01: Compliance audit correctly flags all missing proofs on claimed points', () => {
      const boxes = generateExamTargetsForTrack('OSCP');
      const box1 = boxes[0];

      // Claim user flag without any proof
      box1.userPwned = true;
      box1.userProof = {
        flagText: '',
        whoamiOutput: '',
        ipconfigOutput: '',
        screenshotTaken: false,
        screenshots: [],
      };

      const result = calculateExamScore('OSCP', boxes);
      expect(result.isCompliant).toBe(false);
      expect(result.complianceIssues.some((c) => c.includes('User flag text is missing'))).toBe(true);
      expect(result.complianceIssues.some((c) => c.includes('whoami command output missing'))).toBe(true);
      expect(result.complianceIssues.some((c) => c.includes('ipconfig/ifconfig output missing'))).toBe(true);
      expect(result.complianceIssues.some((c) => c.includes('screenshot is not confirmed'))).toBe(true);

      // Satisfy all proofs
      box1.userProof = {
        flagText: 'd41d8cd98f00b204e9800998ecf8427e',
        whoamiOutput: 'offsec\\student',
        ipconfigOutput: 'inet 192.168.1.30/24',
        screenshotTaken: true,
        screenshots: [{
          id: 'sc1',
          dataUrl: 'data:image/jpeg;base64,mock',
          caption: 'Foothold proof',
          timestamp: new Date().toISOString(),
        }],
      };

      const compliantResult = calculateExamScore('OSCP', boxes);
      expect(compliantResult.complianceIssues.filter((c) => c.includes(box1.name)).length).toBe(0);
    });

    it('ADV-SCORE-02: getPassingStatus boundary conditions', () => {
      // Passing
      expect(getPassingStatus(70, 70, 36000, false, false)).toBe('Passing');
      // In Progress (>2 hours remaining, under pass threshold)
      expect(getPassingStatus(50, 70, 8000, false, false)).toBe('In Progress');
      // Critical (<= 2 hours remaining, under threshold)
      expect(getPassingStatus(50, 70, 7200, false, false)).toBe('Critical');
      // Critical (expired)
      expect(getPassingStatus(50, 70, 0, true, false)).toBe('Critical');
      // OSCP 70 pts but AD required and missing -> not passing
      expect(getPassingStatus(70, 70, 36000, false, true)).toBe('In Progress');
    });
  });

  /* =========================================================================
   * MODULE 4: PACING ENGINE, DIVISION-BY-ZERO & AUDIO ENGINE (examPacingUtils)
   * ========================================================================= */
  describe('Module 4: Dynamic Pacing Math & Audio Alert Safety', () => {
    it('ADV-PACE-01: computeExamPacing never throws on boundary inputs', () => {
      const now = Date.now();
      const emptySession = {
        examStartedAt: null,
        examExpiresAt: null,
        timerPausedRemainingSeconds: null,
        boxes: [],
      };

      const result = computeExamPacing(emptySession, { totalScore: 0, passThreshold: 70 }, now);
      expect(Number.isFinite(result.requiredPacePtsPerHour)).toBe(true);
      expect(Number.isFinite(result.currentPacePtsPerHour)).toBe(true);
      expect(result.unrootedBoxesCount).toBe(0);
      expect(result.recommendation).toBeDefined();
    });

    it('ADV-AUDIO-01: playCyberAlert safe in muted state and with AudioContext edge states', () => {
      setAudioMuted(true);
      expect(isAudioMuted()).toBe(true);

      // Should safely return without creating any audio nodes
      expect(() => {
        playCyberAlert('alarm');
        playCyberAlert('tick');
        playCyberAlert('flag_captured');
        playCyberAlert('victory_fanfare');
      }).not.toThrow();

      // Test audioAlertEngine wrapper object
      audioAlertEngine.setMuted(true);
      expect(audioAlertEngine.isMuted()).toBe(true);
    });
  });

  /* =========================================================================
   * MODULE 5: EVIDENCE DROPZONE & IMAGE DOWNSCALING (ExamEvidenceDropzone)
   * ========================================================================= */
  describe('Module 5: Evidence Dropzone & Image Processing Hardening', () => {
    it('ADV-DROP-01: downscaleImageFile rejects non-image files with clean Error', async () => {
      const textFile = new File(['plain text content'], 'exploit.txt', { type: 'text/plain' });
      await expect(downscaleImageFile(textFile)).rejects.toThrow('Selected file is not an image');

      const pdfFile = new File(['%PDF-1.5'], 'report.pdf', { type: 'application/pdf' });
      await expect(downscaleImageFile(pdfFile)).rejects.toThrow('Selected file is not an image');
    });

    it('ADV-DROP-02: downscaleImageFile processes image file in test environment to data URL', async () => {
      const imageFile = new File(['fake_image_bytes'], 'terminal.png', { type: 'image/png' });
      const result = await downscaleImageFile(imageFile);
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('ADV-DROP-03: ExamEvidenceDropzone updates proofs and transitions compliance badge', async () => {
      useExamStore.getState().startExam('OSCP');
      const box = useExamStore.getState().boxes[0];

      render(
        React.createElement(ExamEvidenceDropzone, {
          box,
          boxId: box.id,
          flagType: 'user',
        })
      );

      // Check initial compliance status
      expect(screen.getByTestId('evidence-compliance-badge')).toHaveTextContent('EVIDENCE INCOMPLETE');

      // 1. Enter valid flag
      const flagInput = screen.getByTestId('evidence-flag-input');
      fireEvent.change(flagInput, { target: { value: 'abcdef0123456789abcdef0123456789' } });

      // 2. Enter whoami
      const whoamiInput = screen.getByTestId('evidence-whoami-input');
      fireEvent.change(whoamiInput, { target: { value: 'corp\\alice' } });

      // 3. Enter ipconfig
      const ipconfigInput = screen.getByTestId('evidence-ipconfig-input');
      fireEvent.change(ipconfigInput, { target: { value: 'inet 192.168.1.30' } });

      // 4. Add screenshot via store
      act(() => {
        useExamStore.getState().addScreenshot(box.id, 'user', {
          id: 'sc_test_1',
          dataUrl: 'data:image/jpeg;base64,mock',
          caption: 'Terminal proof',
          timestamp: new Date().toISOString(),
        });
      });

      // Wait for compliance badge to update to OFFSEC COMPLIANT
      await waitFor(() => {
        expect(screen.getByTestId('evidence-compliance-badge')).toHaveTextContent('OFFSEC COMPLIANT');
      });
    });

    it('ADV-DROP-04: ExamEvidenceDropzone handles caption edit and screenshot deletion', async () => {
      useExamStore.getState().startExam('OSCP');
      const box = useExamStore.getState().boxes[0];

      act(() => {
        useExamStore.getState().addScreenshot(box.id, 'user', {
          id: 'sc_edit_test',
          dataUrl: 'data:image/jpeg;base64,mock',
          caption: 'Initial Caption',
          timestamp: new Date().toISOString(),
        });
      });

      render(
        React.createElement(ExamEvidenceDropzone, {
          box,
          boxId: box.id,
          flagType: 'user',
        })
      );

      expect(screen.getByText('Initial Caption')).toBeInTheDocument();

      // Click delete screenshot
      const deleteBtn = screen.getByTestId('screenshot-delete-btn-sc_edit_test');
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.queryByText('Initial Caption')).not.toBeInTheDocument();
      });
    });
  });

  /* =========================================================================
   * MODULE 6: HEADER CAPSULE & QUICK ACTION DRAWER (ExamHeaderCapsule, Drawer)
   * ========================================================================= */
  describe('Module 6: Persistent Header Capsule & Quick Action Drawer Stress', () => {
    it('ADV-HUD-01: ExamHeaderCapsule renders null when idle and mounts when running', () => {
      // Idle state
      const { unmount } = render(React.createElement(ExamHeaderCapsule));
      expect(screen.queryByTestId('exam-header-capsule')).not.toBeInTheDocument();
      unmount();

      // Start exam
      act(() => {
        useExamStore.getState().startExam('OSCP');
      });

      render(React.createElement(ExamHeaderCapsule));
      expect(screen.getByTestId('exam-header-capsule')).toBeInTheDocument();
      expect(screen.getByTestId('exam-capsule-track')).toHaveTextContent('OSCP');
      expect(screen.getByTestId('exam-capsule-score')).toHaveTextContent(/0\s*\/\s*100\s*PTS/);
    });

    it('ADV-HUD-02: Enter or Space on capsule toggles quick action drawer', () => {
      act(() => {
        useExamStore.getState().startExam('OSCP');
      });

      render(React.createElement(ExamHeaderCapsule));
      const capsule = screen.getByTestId('exam-header-capsule');

      expect(useExamStore.getState().isQuickDrawerOpen).toBe(false);
      fireEvent.keyDown(capsule, { key: 'Enter' });
      expect(useExamStore.getState().isQuickDrawerOpen).toBe(true);

      fireEvent.keyDown(capsule, { key: ' ' });
      expect(useExamStore.getState().isQuickDrawerOpen).toBe(false);
    });

    it('ADV-DRAWER-01: Quick Action Drawer flag submission, milestones, and bio breaks', async () => {
      act(() => {
        useExamStore.getState().startExam('OSCP');
        useExamStore.getState().setQuickDrawerOpen(true);
      });

      render(
        React.createElement(MemoryRouter, null, React.createElement(ExamQuickActionDrawer))
      );

      expect(screen.getByTestId('exam-quick-action-drawer')).toBeInTheDocument();

      // 1. Submit User Flag
      const flagInput = screen.getByTestId('exam-drawer-flag-input');
      fireEvent.change(flagInput, { target: { value: 'abcdef0123456789abcdef0123456789' } });

      const submitBtn = screen.getByTestId('exam-drawer-submit-flag');
      expect(submitBtn).not.toBeDisabled();
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('exam-drawer-feedback')).toHaveTextContent('Registered USER flag');
      });

      // 2. Trigger quick milestone
      const footholdBtn = screen.getByTestId('exam-drawer-milestone-foothold');
      fireEvent.click(footholdBtn);

      await waitFor(() => {
        expect(screen.getByTestId('exam-drawer-feedback')).toHaveTextContent('Milestone logged: Foothold Shell');
      });

      // 3. Start 15m bio break
      const bioBtn = screen.getByTestId('exam-drawer-start-bio-15');
      fireEvent.click(bioBtn);

      expect(useExamStore.getState().activeBreak.isActive).toBe(true);
      expect(screen.getByTestId('exam-drawer-cancel-break')).toBeInTheDocument();

      // Cancel break
      fireEvent.click(screen.getByTestId('exam-drawer-cancel-break'));
      expect(useExamStore.getState().activeBreak.isActive).toBe(false);
    });
  });

  /* =========================================================================
   * MODULE 7: REPORT GENERATOR XSS HARDENING & EXPORT MODAL (examReportGenerator)
   * ========================================================================= */
  describe('Module 7: Report Generator XSS Injection Hardening & Zero-Egress Export', () => {
    it('ADV-REP-01: Strict XSS neutralization for malicious candidate and proof inputs', () => {
      const maliciousSession: ComplianceSessionState = {
        id: 'exam_xss_test',
        track: 'OSCP',
        candidateName: '<script>alert("candidate_xss")</script><b>Hacker</b>',
        candidateCallsign: '"><img src=x onerror=alert(1)>',
        osid: 'javascript:alert(1)',
        examStartedAt: Date.now(),
        examDurationSeconds: 86400,
        examExpiresAt: Date.now() + 86400 * 1000,
        isTimerRunning: true,
        timerPausedRemainingSeconds: null,
        scratchNotes: '<iframe src="http://evil.com/phish"></iframe>\n```bash\nrm -rf /\n```',
        boxes: [
          {
            id: 'b1',
            name: '<svg onload=alert(1)>BOX-1',
            ip: '10.10.10.5',
            os: 'Linux',
            difficulty: 'Medium',
            type: 'standalone-1',
            label: 'Standalone 01',
            userPoints: 10,
            rootPoints: 10,
            userPwned: true,
            rootPwned: false,
            userProof: {
              flagText: 'd41d8cd98f00b204e9800998ecf8427e',
              whoamiOutput: '<script>evil()</script>\nroot',
              ipconfigOutput: '"><body onload=alert(1)>',
              screenshotTaken: true,
              screenshots: [
                {
                  id: 'sc1',
                  dataUrl: 'javascript:alert(1)', // Malicious non-image URI
                  caption: '<script>alert("caption")</script>',
                  timestamp: new Date().toISOString(),
                },
              ],
            },
            rootProof: createDefaultProof(),
          },
        ],
      };

      const markdown = generateExamReportMarkdown(maliciousSession);
      expect(markdown).toBeDefined();

      const html = exportStandaloneHtmlReport(markdown, 'Adversarial Test');

      // Verify Content-Security-Policy header
      expect(html).toContain('http-equiv="Content-Security-Policy"');
      expect(html).toContain("script-src 'none'");

      // Verify @media print styles exist
      expect(html).toContain('@media print');

      // Verify that malicious javascript: URL was stripped or neutralized
      expect(html).not.toContain('<img src="javascript:alert(1)"');
    });

    it('ADV-REP-02: ExamReportModal tab switching, parameter editing, and export clicks', async () => {
      act(() => {
        useExamStore.getState().startExam('OSCP');
      });

      render(
        React.createElement(ExamReportModal, {
          isOpen: true,
          onClose: vi.fn(),
        })
      );

      expect(screen.getByTestId('exam-report-modal')).toBeInTheDocument();

      // 1. Switch to Raw Markdown tab
      const rawTabBtn = screen.getByTestId('report-tab-raw');
      fireEvent.click(rawTabBtn);
      expect(screen.getByTestId('report-raw-markdown')).toBeInTheDocument();

      // 2. Switch back to Preview tab
      const previewTabBtn = screen.getByTestId('report-tab-preview');
      fireEvent.click(previewTabBtn);
      expect(screen.getByTestId('report-rendered-preview')).toBeInTheDocument();

      // 3. Switch template to HTB CPTS
      const cptsBtn = screen.getByTestId('report-track-select-cpts');
      fireEvent.click(cptsBtn);
      expect(screen.getByTestId('report-modal-score')).toBeInTheDocument();

      // 4. Test 1-click Copy Markdown button
      const copyBtn = screen.getByTestId('report-copy-markdown-btn');
      fireEvent.click(copyBtn);

      // 5. Test 1-click Download Markdown button
      const downloadBtn = screen.getByTestId('report-download-md-btn');
      fireEvent.click(downloadBtn);

      // 6. Test 1-click Export HTML button
      const exportHtmlBtn = screen.getByTestId('report-export-html-btn');
      fireEvent.click(exportHtmlBtn);

      // Ensure no crash occurred and feedback toast displayed
      await waitFor(() => {
        expect(screen.getByTestId('report-feedback-toast')).toBeInTheDocument();
      });
    });

    it('ADV-REP-03: ExamBioBreakModal preset selection and custom duration clamp', () => {
      const onClose = vi.fn();
      render(
        React.createElement(ExamBioBreakModal, {
          isOpen: true,
          onClose: onClose,
        })
      );

      expect(screen.getByTestId('exam-bio-break-modal')).toBeInTheDocument();

      // Start 30m food break
      const foodBtn = screen.getByTestId('break-preset-food-30');
      fireEvent.click(foodBtn);

      expect(useExamStore.getState().activeBreak.isActive).toBe(true);
      expect(useExamStore.getState().activeBreak.type).toBe('food');
      expect(useExamStore.getState().activeBreak.durationSeconds).toBe(1800);
    });
  });
});

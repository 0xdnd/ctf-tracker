import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExamSimulatorPage } from '../../pages/ExamSimulatorPage';
import { useExamStore } from '../../store/examStore';
import {
  EXAM_TRACK_CONFIGS,
  calculateExamScore,
  generateExamTargetsForTrack,
  isObjectiveTrack,
  ExamSessionState,
} from '../../utils/examComplianceUtils';
import { computeExamPacing } from '../../utils/examPacingUtils';
import { buildBurndownSeries } from '../../utils/examBurndown';
import { generateExamReportMarkdown, getTrackMethodology } from '../../utils/examReportGenerator';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

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

const DAY = 24 * 3600;

function pwnFirst(n: number) {
  return generateExamTargetsForTrack('PNPT').map((b, i) => ({
    ...b,
    rootPwned: i < n,
    rootProof: { ...b.rootProof, screenshotTaken: i < n },
  }));
}

describe('PNPT track (modeled on the published PNPT rules)', () => {
  it('has the published durations and an objective scoring model', () => {
    const c = EXAM_TRACK_CONFIGS.PNPT;
    expect(c.durationSeconds).toBe(5 * DAY);
    expect(c.reportWindowSeconds).toBe(2 * DAY);
    expect(c.debriefMinutes).toBe(15);
    expect(c.scoringModel).toBe('objective');
    expect(isObjectiveTrack('PNPT')).toBe(true);
    expect(isObjectiveTrack('OSCP')).toBe(false);
  });

  it('generates five flag-less objectives ending at the domain controller', () => {
    const boxes = generateExamTargetsForTrack('PNPT');
    expect(boxes).toHaveLength(5);
    expect(boxes.every((b) => b.id.startsWith('pnpt-') && b.userPoints === 0)).toBe(true);
    expect(boxes.reduce((s, b) => s + b.rootPoints, 0)).toBe(EXAM_TRACK_CONFIGS.PNPT.maxScore);
    expect(boxes[4].adRole).toBe('dc');
  });

  it('passes only when every objective is complete', () => {
    expect(calculateExamScore('PNPT', pwnFirst(4)).isPassing).toBe(false);
    expect(calculateExamScore('PNPT', pwnFirst(4)).totalScore).toBe(80);
    const full = calculateExamScore('PNPT', pwnFirst(5));
    expect(full.isPassing).toBe(true);
    expect(full.isCompliant).toBe(true);
  });

  it('asks for objective evidence, not flag/whoami proofs', () => {
    const boxes = generateExamTargetsForTrack('PNPT').map((b, i) => ({ ...b, rootPwned: i === 0 }));
    const issues = calculateExamScore('PNPT', boxes).complianceIssues;
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain('Objective evidence');
  });

  it('paces by objectives and mentions the report window and debrief on completion', () => {
    const now = Date.now();
    const cfg = EXAM_TRACK_CONFIGS.PNPT;
    const session = (n: number, elapsedDays: number) => ({
      examStartedAt: now - elapsedDays * DAY * 1000,
      examExpiresAt: now + (5 - elapsedDays) * DAY * 1000,
      timerPausedRemainingSeconds: null,
      totalDurationSeconds: cfg.durationSeconds,
      boxes: pwnFirst(n),
    });

    const done = computeExamPacing(session(5, 2), calculateExamScore('PNPT', pwnFirst(5)), now, cfg);
    expect(done.pacingStatus).toBe('PASSED');
    expect(done.recommendation).toContain('ALL OBJECTIVES COMPLETE (5/5)');
    expect(done.recommendation).toContain('48h report window');
    expect(done.recommendation).toContain('15-minute live debrief');

    const mid = computeExamPacing(session(2, 2), calculateExamScore('PNPT', pwnFirst(2)), now, cfg);
    expect(mid.unrootedBoxesCount).toBe(3);
    expect(mid.pointsNeeded).toBe(60);
    expect(mid.recommendation).toContain('2/5 objectives');
  });

  it('builds a burndown series against 100 with objective steps of 20', () => {
    const start = Date.now() - 1000;
    const boxes = pwnFirst(3).map((b, i) => ({
      ...b,
      rootProof: { ...b.rootProof, pwnedAt: new Date(start + (i + 1) * 100).toISOString() },
    }));
    const series = buildBurndownSeries(boxes, start, start + 5 * DAY * 1000, 100, { track: 'PNPT' });
    expect(series.steps.map((p) => p.points)).toEqual([0, 20, 40, 60]);
    expect(series.steps[series.steps.length - 1].remainingToPass).toBe(40);
    expect(series.ideal[1].points).toBe(100);
  });

  it('report includes PNPT methodology, tool disclosure and debrief sections', () => {
    expect(getTrackMethodology('PNPT')).toContain('TCM Security PNPT Network Penetration Test Methodology');
    const session = {
      track: 'PNPT',
      examStartedAt: Date.now(),
      boxes: pwnFirst(5),
      scratchNotes: '',
    } as unknown as ExamSessionState;
    const md = generateExamReportMarkdown(session);
    expect(md).toContain('TCM SECURITY PNPT // NETWORK PENETRATION TEST REPORT');
    expect(md).toContain('PNPT Submission Checklist');
    expect(md).toContain('Tool & AI usage disclosure');
    expect(md).toContain('15-minute live report debrief');
    expect(md).toContain('TECHNICAL OBJECTIVES COMPLETE');
    expect(md).not.toContain('PEN-200 Practical Penetration Testing Methodology');
  });
});

describe('PNPT in the track picker', () => {
  beforeEach(() => {
    useExamStore.getState().resetExam('OSCP');
    useExamStore.setState({ status: 'idle' });
  });

  it('lists PNPT and loads its objectives on select', () => {
    render(
      <MemoryRouter>
        <ExamSimulatorPage />
      </MemoryRouter>
    );
    const card = screen.getByTestId('exam-track-select-pnpt');
    expect(card).toHaveTextContent('Pass: all objectives');
    expect(card).toHaveTextContent('Duration: 120h + 48h report');
    fireEvent.click(card);
    const state = useExamStore.getState();
    expect(state.track).toBe('PNPT');
    expect(state.totalDurationSeconds).toBe(5 * DAY);
    expect(state.boxes.every((b) => b.id.startsWith('pnpt-'))).toBe(true);
  });
});

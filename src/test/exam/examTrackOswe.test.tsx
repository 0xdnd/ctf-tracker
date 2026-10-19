import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExamSimulatorPage } from '../../pages/ExamSimulatorPage';
import { useExamStore } from '../../store/examStore';
import {
  EXAM_TRACK_CONFIGS,
  calculateExamScore,
  generateExamTargetsForTrack,
  ExamBox,
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

const proof = { flagText: 'c0ffee1234567890abcdef1234567890', whoamiOutput: 'www-data', ipconfigOutput: 'eth0', screenshotTaken: true };

/** Marks the first `n` of the 4 stages (app1 user, app1 root, app2 user, app2 root) as captured. */
function stages(n: number): ExamBox[] {
  const order: Array<[number, 'user' | 'root']> = [[0, 'user'], [0, 'root'], [1, 'user'], [1, 'root']];
  const boxes = generateExamTargetsForTrack('OSWE');
  order.slice(0, n).forEach(([i, kind]) => {
    boxes[i] =
      kind === 'user'
        ? { ...boxes[i], userPwned: true, userProof: { ...boxes[i].userProof, ...proof } }
        : { ...boxes[i], rootPwned: true, rootProof: { ...boxes[i].rootProof, ...proof } };
  });
  return boxes;
}

describe('OSWE track (modeled on the published OSWE rules)', () => {
  it('has the published duration, pass mark and documentation window', () => {
    const c = EXAM_TRACK_CONFIGS.OSWE;
    expect(c.durationSeconds).toBe(47 * 3600 + 45 * 60);
    expect(c.maxScore).toBe(100);
    expect(c.passThreshold).toBe(85);
    expect(c.reportWindowSeconds).toBe(24 * 3600);
    expect(c.scoringModel ?? 'points').toBe('points');
  });

  it('generates two web apps whose stages total 100 points', () => {
    const boxes = generateExamTargetsForTrack('OSWE');
    expect(boxes).toHaveLength(2);
    expect(boxes.every((b) => b.id.startsWith('oswe-'))).toBe(true);
    expect(boxes.reduce((s, b) => s + b.userPoints + b.rootPoints, 0)).toBe(100);
  });

  it('scores against the 85-point pass mark (35 auth bypass + 15 RCE per app)', () => {
    expect(calculateExamScore('OSWE', stages(1)).totalScore).toBe(35);
    const partial = calculateExamScore('OSWE', stages(2));
    expect(partial.totalScore).toBe(50);
    expect(partial.isPassing).toBe(false);
    expect(partial.pointsNeeded).toBe(35);
    expect(calculateExamScore('OSWE', stages(3)).totalScore).toBe(85);
    expect(calculateExamScore('OSWE', stages(3)).isPassing).toBe(true);
    const full = calculateExamScore('OSWE', stages(4));
    expect(full.totalScore).toBe(100);
    expect(full.isPassing).toBe(true);
    expect(full.isCompliant).toBe(true);
  });

  it('paces against the 47h45m window', () => {
    const cfg = EXAM_TRACK_CONFIGS.OSWE;
    const now = Date.now();
    const elapsedH = 10;
    const session = {
      examStartedAt: now - elapsedH * 3600 * 1000,
      examExpiresAt: now + (cfg.durationSeconds - elapsedH * 3600) * 1000,
      timerPausedRemainingSeconds: null,
      totalDurationSeconds: cfg.durationSeconds,
      boxes: stages(2),
    };
    const pacing = computeExamPacing(session, calculateExamScore('OSWE', stages(2)), now, cfg);
    expect(pacing.currentScore).toBe(50);
    expect(pacing.pointsNeeded).toBe(35);
    expect(pacing.remainingSeconds).toBe(cfg.durationSeconds - elapsedH * 3600);
    expect(pacing.currentPacePtsPerHour).toBe(5);
    expect(pacing.requiredPacePtsPerHour).toBeCloseTo(35 / 37.75, 2);
    expect(pacing.unrootedBoxesCount).toBe(1);
    expect(pacing.pacingStatus).toBe('ON_TRACK');
    expect(pacing.recommendation).not.toContain('objectives');
  });

  it('builds a burndown series stepping 35 then 15 points toward 85', () => {
    const start = Date.now() - 1000;
    const boxes = stages(3).map((b, i) => ({
      ...b,
      userProof: { ...b.userProof, pwnedAt: b.userPwned ? new Date(start + (i + 1) * 100).toISOString() : undefined },
      rootProof: { ...b.rootProof, pwnedAt: b.rootPwned ? new Date(start + (i + 1) * 100 + 50).toISOString() : undefined },
    }));
    const series = buildBurndownSeries(boxes, start, start + EXAM_TRACK_CONFIGS.OSWE.durationSeconds * 1000, 85, {
      track: 'OSWE',
    });
    expect(series.passThreshold).toBe(85);
    expect(series.steps.map((p) => p.points)).toEqual([0, 35, 50, 85]);
    expect(series.steps[series.steps.length - 1].remainingToPass).toBe(0);
  });

  it('report includes OSWE methodology and documentation checklist', () => {
    expect(getTrackMethodology('OSWE')).toContain('OffSec WEB-300 Advanced Web Attacks & Exploitation Methodology');
    const session = {
      track: 'OSWE',
      examStartedAt: Date.now(),
      boxes: stages(4),
      scratchNotes: '',
    } as unknown as ExamSessionState;
    const md = generateExamReportMarkdown(session);
    expect(md).toContain('OFFSEC OSWE // ADVANCED WEB ATTACKS & EXPLOITATION EXAM REPORT');
    expect(md).toContain('OSWE Documentation Checklist');
    expect(md).toContain('85 required to pass');
    expect(md).toContain('PASSED (REQUIREMENTS SATISFIED)');
    expect(md).not.toContain('PEN-200 Practical Penetration Testing Methodology');
  });
});

describe('OSWE in the track picker', () => {
  beforeEach(() => {
    useExamStore.getState().resetExam('OSCP');
    useExamStore.setState({ status: 'idle' });
  });

  it('lists OSWE and loads its web apps on select', () => {
    render(
      <MemoryRouter>
        <ExamSimulatorPage />
      </MemoryRouter>
    );
    const card = screen.getByTestId('exam-track-select-oswe');
    expect(card).toHaveTextContent('Pass: 85 pts');
    expect(card).toHaveTextContent('Duration: 48h + 24h report');
    fireEvent.click(card);
    const state = useExamStore.getState();
    expect(state.track).toBe('OSWE');
    expect(state.totalDurationSeconds).toBe(47 * 3600 + 45 * 60);
    expect(state.boxes.every((b) => b.id.startsWith('oswe-'))).toBe(true);
  });
});

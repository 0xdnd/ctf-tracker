import { describe, it, expect } from 'vitest';
import { getTrackMethodology, generateExamReportMarkdown } from '../../utils/examReportGenerator';
import { generateExamTargetsForTrack, ExamSessionState, ExamTrack } from '../../utils/examComplianceUtils';

function sessionFor(track: ExamTrack): ExamSessionState {
  return {
    track,
    status: 'completed',
    examStartedAt: Date.now(),
    examExpiresAt: null,
    isTimerRunning: false,
    timerPausedRemainingSeconds: null,
    boxes: generateExamTargetsForTrack(track),
    scratchNotes: '',
  } as unknown as ExamSessionState;
}

describe('OSEP and CRTP track-specific report sections', () => {
  it('OSEP uses PEN-300 methodology and report title', () => {
    expect(getTrackMethodology('OSEP')).toContain('PEN-300 Evasion Techniques & Breaching Defenses Methodology');
    const md = generateExamReportMarkdown(sessionFor('OSEP'));
    expect(md).toContain('OFFSEC OSEP // EVASION TECHNIQUES');
    expect(md).not.toContain('PEN-200 Practical Penetration Testing Methodology');
  });

  it('CRTP uses Active Directory attack methodology and report title', () => {
    expect(getTrackMethodology('CRTP')).toContain('Altered Security CRTP Active Directory Attack Methodology');
    const md = generateExamReportMarkdown(sessionFor('CRTP'));
    expect(md).toContain('ALTERED SECURITY CRTP // CERTIFIED RED TEAM PROFESSIONAL');
    expect(md).not.toContain('PEN-200 Practical Penetration Testing Methodology');
  });
});

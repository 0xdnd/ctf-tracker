import { describe, it, expect } from 'vitest';
import { useExamStore } from '../../store/examStore';
import { generateExamReportMarkdown as generateComplianceReport, type ExamSessionState } from '../../utils/examComplianceUtils';
import { generateExamReportMarkdown as generateGeneratorReport } from '../../utils/examReportGenerator';

const OWNER_IDENTITY = ['Daniel', '0xdnd', 'OS-94821'];

describe('exam candidate identity defaults', () => {
  it('a default new exam session has empty candidate identity', () => {
    useExamStore.getState().resetExam('OSCP');
    const { candidateName, candidateCallsign, osid } = useExamStore.getState();
    expect(candidateName).toBe('');
    expect(candidateCallsign).toBe('');
    expect(osid).toBe('');
  });

  it('reports generated with empty identity contain no owner identity', () => {
    useExamStore.getState().resetExam('OSCP');
    const session = useExamStore.getState() as unknown as ExamSessionState;
    for (const report of [generateComplianceReport(session), generateGeneratorReport(session)]) {
      for (const needle of OWNER_IDENTITY) expect(report).not.toContain(needle);
      expect(report).toContain('Candidate');
    }
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ExamReportModal } from '../../components/exam/ExamReportModal';
import { EditableIpBadge } from '../../components/common/EditableIpBadge';
import { useExamStore, EXAM_STORAGE_KEY } from '../../store/examStore';
import { useCtfStore } from '../../store/useCtfStore';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

afterEach(() => cleanup());

describe('ExamReportModal header persistence', () => {
  beforeEach(() => {
    useExamStore.getState().resetExam('OSCP');
    useExamStore.setState({ status: 'running', startedAt: Date.UTC(2026, 0, 2) });
    useCtfStore.setState({ soundEnabled: false });
  });

  it('restores name, callsign, OSID and date typed in a previous opening', () => {
    const first = render(<ExamReportModal isOpen onClose={() => {}} />);
    fireEvent.change(screen.getByTestId('report-candidate-name'), { target: { value: 'Jane Operator' } });
    fireEvent.change(screen.getByTestId('report-candidate-callsign'), { target: { value: 'j4ne' } });
    fireEvent.change(screen.getByTestId('report-candidate-osid'), { target: { value: 'OS-11111' } });
    fireEvent.change(screen.getByTestId('report-exam-date'), { target: { value: '2026-02-03' } });
    first.unmount();

    // Persisted with the exam session (survives a reload).
    const stored = JSON.parse(localStorage.getItem(EXAM_STORAGE_KEY)!).state;
    expect(stored).toMatchObject({ candidateName: 'Jane Operator', candidateCallsign: 'j4ne', osid: 'OS-11111', reportExamDate: '2026-02-03' });

    render(<ExamReportModal isOpen onClose={() => {}} />);
    expect((screen.getByTestId('report-candidate-name') as HTMLInputElement).value).toBe('Jane Operator');
    expect((screen.getByTestId('report-candidate-callsign') as HTMLInputElement).value).toBe('j4ne');
    expect((screen.getByTestId('report-candidate-osid') as HTMLInputElement).value).toBe('OS-11111');
    expect((screen.getByTestId('report-exam-date') as HTMLInputElement).value).toBe('2026-02-03');
  });

  it('starts a new session with the derived date again', () => {
    useExamStore.getState().setCandidateInfo({ reportExamDate: '2026-02-03' });
    useExamStore.getState().startExam('OSCP');
    expect(useExamStore.getState().reportExamDate).toBeNull();
  });
});

describe('EditableIpBadge clearing and blur', () => {
  beforeEach(() => {
    useCtfStore.setState({
      soundEnabled: false,
      machines: [
        {
          id: 'ip-box',
          name: 'IP Box',
          ip: '10.10.11.5',
          os: 'Linux',
          platform: 'HTB',
          difficulty: 'Easy',
          status: 'backlog',
          tags: [],
          certifications: [],
          timeSpentSeconds: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    } as any);
  });
  const ip = () => useCtfStore.getState().machines.find((m) => m.id === 'ip-box')!.ip;
  const startEdit = () => {
    render(<EditableIpBadge machineId="ip-box" initialIp="10.10.11.5" />);
    fireEvent.click(screen.getByLabelText('Change target IP'));
    return screen.getByLabelText('Edit machine IP address') as HTMLInputElement;
  };

  it('saves an emptied IP on Enter', () => {
    const input = startEdit();
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(ip()).toBe('');
  });

  it('saves on blur', () => {
    const input = startEdit();
    fireEvent.change(input, { target: { value: '10.10.11.99' } });
    fireEvent.blur(input);
    expect(ip()).toBe('10.10.11.99');
  });

  it('Escape cancels without saving, even if a blur follows', () => {
    const input = startEdit();
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.blur(input);
    expect(ip()).toBe('10.10.11.5');
  });
});

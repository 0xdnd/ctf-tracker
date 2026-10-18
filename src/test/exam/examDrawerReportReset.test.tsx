import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExamQuickActionDrawer } from '../../components/exam/ExamQuickActionDrawer';
import { useExamStore } from '../../store/examStore';
import { useCtfStore } from '../../store/useCtfStore';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

describe('ExamQuickActionDrawer report modal state', () => {
  beforeEach(() => {
    useExamStore.getState().resetExam('OSCP');
    useExamStore.setState({ status: 'running', isQuickDrawerOpen: true });
    useCtfStore.setState({ soundEnabled: false });
  });

  it('does not re-pop the report modal after the drawer is closed and reopened', () => {
    render(
      <MemoryRouter>
        <ExamQuickActionDrawer />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByTestId('exam-drawer-export-report'));
    expect(screen.getByTestId('exam-report-modal')).toBeInTheDocument();

    // Store-driven close (not via the modal's own onClose)
    act(() => useExamStore.setState({ isQuickDrawerOpen: false }));
    expect(screen.queryByTestId('exam-report-modal')).not.toBeInTheDocument();

    act(() => useExamStore.setState({ isQuickDrawerOpen: true }));
    expect(screen.queryByTestId('exam-report-modal')).not.toBeInTheDocument();
  });
});

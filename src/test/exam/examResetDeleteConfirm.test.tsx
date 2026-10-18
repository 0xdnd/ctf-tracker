import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExamSimulatorPage } from '../../pages/ExamSimulatorPage';
import { ExamEvidenceDropzone } from '../../components/exam/ExamEvidenceDropzone';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useExamStore } from '../../store/examStore';
import { useCtfStore } from '../../store/useCtfStore';
import { useConfirmStore } from '../../store/useConfirmStore';

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

afterEach(() => {
  act(() => useConfirmStore.getState().settle(false));
  cleanup();
});

describe('exam destructive actions require confirmation', () => {
  beforeEach(() => {
    useExamStore.getState().resetExam('OSCP');
    useCtfStore.setState({ soundEnabled: false });
  });

  describe('resetExam from ExamSimulatorPage', () => {
    const setup = () => {
      useExamStore.getState().startExam('OSCP');
      return render(
        <MemoryRouter>
          <ExamSimulatorPage />
          <ConfirmDialog />
        </MemoryRouter>,
      );
    };

    it('cancel leaves the running exam untouched', async () => {
      setup();
      fireEvent.click(screen.getByTestId('exam-timer-reset-btn'));
      await screen.findByRole('alertdialog');
      fireEvent.click(screen.getByText('Cancel'));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(useExamStore.getState().status).toBe('running');
      expect(screen.queryByTestId('exam-setup-view')).toBeNull();
    });

    it('confirm resets the exam to idle', async () => {
      setup();
      fireEvent.click(screen.getByTestId('exam-timer-reset-btn'));
      await screen.findByRole('alertdialog');
      fireEvent.click(screen.getByRole('button', { name: 'Reset exam' }));
      await waitFor(() => expect(useExamStore.getState().status).toBe('idle'));
      expect(await screen.findByTestId('exam-setup-view')).toBeInTheDocument();
    });

    it('the completed-state "Start New Simulation" button also confirms', async () => {
      useExamStore.getState().startExam('OSCP');
      useExamStore.setState({ status: 'completed' });
      render(
        <MemoryRouter>
          <ExamSimulatorPage />
          <ConfirmDialog />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByText('Start new simulation'));
      await screen.findByRole('alertdialog');
      fireEvent.click(screen.getByText('Cancel'));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(useExamStore.getState().status).toBe('completed');

      fireEvent.click(screen.getByText('Start new simulation'));
      await screen.findByRole('alertdialog');
      fireEvent.click(screen.getByRole('button', { name: 'Reset exam' }));
      await waitFor(() => expect(useExamStore.getState().status).toBe('idle'));
    });
  });

  describe('screenshot deletion in ExamEvidenceDropzone', () => {
    const setup = () => {
      useExamStore.getState().startExam('OSCP');
      const box = useExamStore.getState().boxes[0];
      act(() => {
        useExamStore.getState().addScreenshot(box.id, 'user', {
          id: 'sc_confirm_1',
          dataUrl: 'data:image/jpeg;base64,mock',
          caption: 'Confirm me',
          timestamp: new Date().toISOString(),
        });
      });
      const fresh = useExamStore.getState().boxes[0];
      render(
        <>
          <ExamEvidenceDropzone box={fresh} boxId={fresh.id} flagType="user" />
          <ConfirmDialog />
        </>,
      );
      return fresh.id;
    };

    const count = (id: string) =>
      useExamStore.getState().boxes.find((b) => b.id === id)!.userProof.screenshots?.length ?? 0;

    it('cancel keeps the screenshot', async () => {
      const id = setup();
      fireEvent.click(screen.getByTestId('screenshot-delete-btn-sc_confirm_1'));
      await screen.findByRole('alertdialog');
      fireEvent.click(screen.getByText('Cancel'));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(count(id)).toBe(1);
    });

    it('confirm deletes the screenshot', async () => {
      const id = setup();
      fireEvent.click(screen.getByTestId('screenshot-delete-btn-sc_confirm_1'));
      await screen.findByRole('alertdialog');
      fireEvent.click(screen.getByRole('button', { name: 'Delete screenshot' }));
      await waitFor(() => expect(count(id)).toBe(0));
    });
  });
});

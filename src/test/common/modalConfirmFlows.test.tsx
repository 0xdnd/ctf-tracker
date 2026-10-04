import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { MachineDetailModal } from '../../components/tracker/MachineDetailModal';
import { BackupModal } from '../../components/backup/BackupModal';
import { useCtfStore } from '../../store/useCtfStore';
import { useConfirmStore } from '../../store/useConfirmStore';

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

describe('confirm flows opened from inside modals', () => {
  describe('MachineDetailModal: delete custom machine', () => {
    const deleteMachine = vi.fn();

    beforeEach(() => {
      deleteMachine.mockClear();
      const base = useCtfStore.getState().machines[0];
      const custom = { ...base, id: 'custom-confirm-1', name: 'ConfirmBox', isCustom: true };
      useCtfStore.setState({
        machines: [custom, ...useCtfStore.getState().machines],
        selectedMachineId: custom.id,
        deleteMachine,
        soundEnabled: false,
      });
    });

    const setup = () =>
      render(
        <MemoryRouter>
          <MachineDetailModal />
          <ConfirmDialog />
        </MemoryRouter>
      );

    it('cancel keeps the machine and leaves the outer modal open', async () => {
      setup();
      fireEvent.click(screen.getByRole('button', { name: 'Delete custom machine' }));
      await screen.findByRole('alertdialog');
      fireEvent.click(screen.getByText('Cancel'));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(deleteMachine).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: 'Delete custom machine' })).toBeInTheDocument();
      expect(useCtfStore.getState().selectedMachineId).toBe('custom-confirm-1');
    });

    it('confirm deletes the machine', async () => {
      setup();
      fireEvent.click(screen.getByRole('button', { name: 'Delete custom machine' }));
      await screen.findByRole('alertdialog');
      fireEvent.click(screen.getByText('Delete machine'));
      await waitFor(() => expect(deleteMachine).toHaveBeenCalledWith('custom-confirm-1'));
    });
  });

  describe('BackupModal: reset all progress', () => {
    const resetAllProgress = vi.fn();

    beforeEach(() => {
      resetAllProgress.mockClear();
      useCtfStore.setState({ backupModalOpen: true, resetAllProgress, soundEnabled: false });
    });

    const setup = () =>
      render(
        <>
          <BackupModal />
          <ConfirmDialog />
        </>
      );

    it('cancel resets nothing and keeps the backup modal open', async () => {
      setup();
      fireEvent.click(screen.getByRole('button', { name: /reset all progress/i }));
      await screen.findByRole('alertdialog');
      fireEvent.click(screen.getByText('Cancel'));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(resetAllProgress).not.toHaveBeenCalled();
      expect(useCtfStore.getState().backupModalOpen).toBe(true);
    });

    it('confirm resets progress and closes the modal', async () => {
      setup();
      fireEvent.click(screen.getByRole('button', { name: /reset all progress/i }));
      await screen.findByRole('alertdialog');
      fireEvent.click(screen.getByText('Reset progress'));
      await waitFor(() => expect(resetAllProgress).toHaveBeenCalledTimes(1));
      expect(useCtfStore.getState().backupModalOpen).toBe(false);
    });
  });
});

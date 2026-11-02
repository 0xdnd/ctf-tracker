import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupReminderCard } from './BackupReminderCard';
import { DAY_MS, useBackupReminderStore } from '../../utils/backupReminder';
import { useCtfStore } from '../../store/useCtfStore';
import { useExamStore } from '../../store/examStore';
import { useOnboardingStore } from '../../onboarding/useOnboardingStore';
import { useToastStore } from '../../store/useToastStore';

const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY_MS).toISOString();

const resetAll = () => {
  window.localStorage.clear();
  useBackupReminderStore.setState({ lastBackupAt: undefined, snoozeUntil: undefined, firstActivityAt: undefined });
  useOnboardingStore.setState({ tourActive: false, guide: null, hintShowing: false });
  useExamStore.setState({ status: 'idle' });
  useCtfStore.setState({
    machines: [{ id: 'm1', name: 'Lame', status: 'recon' }] as never,
    userNotes: [],
    customNotes: [],
    settingsModalOpen: false,
    backupModalOpen: false,
    selectedMachineId: null,
  });
};

const makeDue = () => useBackupReminderStore.setState({ lastBackupAt: iso(20) });

describe('BackupReminderCard', () => {
  beforeEach(resetAll);
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows when a backup is overdue, with the last backup age', () => {
    makeDue();
    render(<BackupReminderCard />);
    expect(screen.getByRole('region', { name: 'Your progress only lives in this browser.' })).toBeInTheDocument();
    expect(screen.getByText('Last backup: 20 days ago')).toBeInTheDocument();
  });

  it('says so when no backup was ever made', () => {
    useBackupReminderStore.setState({ firstActivityAt: iso(5) });
    render(<BackupReminderCard />);
    expect(screen.getByText('You have not made a backup yet.')).toBeInTheDocument();
  });

  it('stays hidden when there is no meaningful data or the backup is fresh', () => {
    useCtfStore.setState({ machines: [{ id: 'm1', name: 'Lame', status: 'backlog' }] as never });
    useBackupReminderStore.setState({ firstActivityAt: iso(30) });
    const { unmount } = render(<BackupReminderCard />);
    expect(screen.queryByTestId('backup-reminder')).not.toBeInTheDocument();
    unmount();
    useCtfStore.setState({ machines: [{ id: 'm1', name: 'Lame', status: 'recon' }] as never });
    useBackupReminderStore.setState({ lastBackupAt: iso(2) });
    render(<BackupReminderCard />);
    expect(screen.queryByTestId('backup-reminder')).not.toBeInTheDocument();
  });

  it('records the first activity once meaningful data exists', () => {
    render(<BackupReminderCard />);
    expect(useBackupReminderStore.getState().firstActivityAt).toBeDefined();
  });

  it('hides under a modal, the tour, a guide, a visible hint, and an exam', () => {
    makeDue();
    render(<BackupReminderCard />);
    expect(screen.getByTestId('backup-reminder')).toBeInTheDocument();

    act(() => useCtfStore.getState().setSettingsModalOpen(true));
    expect(screen.queryByTestId('backup-reminder')).not.toBeInTheDocument();
    act(() => useCtfStore.getState().setSettingsModalOpen(false));
    expect(screen.getByTestId('backup-reminder')).toBeInTheDocument();

    act(() => useOnboardingStore.setState({ tourActive: true }));
    expect(screen.queryByTestId('backup-reminder')).not.toBeInTheDocument();
    act(() => useOnboardingStore.setState({ tourActive: false, guide: { id: 'vault', stepIndex: 0 } }));
    expect(screen.queryByTestId('backup-reminder')).not.toBeInTheDocument();
    act(() => useOnboardingStore.setState({ guide: null, hintShowing: true }));
    expect(screen.queryByTestId('backup-reminder')).not.toBeInTheDocument();
    act(() => useOnboardingStore.setState({ hintShowing: false }));
    act(() => useExamStore.setState({ status: 'running' }));
    expect(screen.queryByTestId('backup-reminder')).not.toBeInTheDocument();
    act(() => useExamStore.setState({ status: 'paused' }));
    expect(screen.queryByTestId('backup-reminder')).not.toBeInTheDocument();
    act(() => useExamStore.setState({ status: 'idle' }));
    expect(screen.getByTestId('backup-reminder')).toBeInTheDocument();
  });

  it('Remind me in 7 days snoozes and hides the card', () => {
    makeDue();
    render(<BackupReminderCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Remind me in 7 days' }));
    expect(screen.queryByTestId('backup-reminder')).not.toBeInTheDocument();
    const until = Date.parse(useBackupReminderStore.getState().snoozeUntil as string);
    expect(Math.abs(until - (Date.now() + 7 * DAY_MS))).toBeLessThan(5000);
  });

  it('Back up now runs the workspace export, records the backup and hides the card', async () => {
    makeDue();
    const exportWorkspace = vi.fn(async () => {
      useBackupReminderStore.getState().recordBackup();
    });
    useCtfStore.setState({ exportWorkspace: exportWorkspace as never });
    render(<BackupReminderCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Back up now' }));
    await waitFor(() => expect(exportWorkspace).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByTestId('backup-reminder')).not.toBeInTheDocument());
    expect(Date.now() - Date.parse(useBackupReminderStore.getState().lastBackupAt as string)).toBeLessThan(5000);
  });

  it('a failing export shows the error toast, records nothing and keeps the card', async () => {
    makeDue();
    const before = useBackupReminderStore.getState().lastBackupAt;
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const exportWorkspace = vi.fn(async () => {
      throw new Error('disk full');
    });
    useCtfStore.setState({ exportWorkspace: exportWorkspace as never });
    useToastStore.setState({ toasts: [] } as never);
    render(<BackupReminderCard />);
    fireEvent.click(screen.getByRole('button', { name: 'Back up now' }));
    await waitFor(() => expect(exportWorkspace).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(useToastStore.getState().toasts.some((t) => t.type === 'error' && t.message === 'Backup failed. Try again from Settings.')).toBe(true),
    );
    expect(useBackupReminderStore.getState().lastBackupAt).toBe(before);
    expect(screen.getByTestId('backup-reminder')).toBeInTheDocument();
  });
});

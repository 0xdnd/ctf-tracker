import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupModal } from '../components/backup/BackupModal';
import { useCtfStore } from '../store/useCtfStore';
import { useOnboardingStore } from './useOnboardingStore';
import { useBackupReminderStore } from '../utils/backupReminder';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
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

describe('Backup modal tab request', () => {
  beforeEach(() => {
    useOnboardingStore.setState({ requestedBackupTab: null, backupTab: null });
    useCtfStore.setState({ backupModalOpen: true, soundEnabled: false });
  });

  it('opens on the Backup tab by default', () => {
    render(<BackupModal />);
    expect(screen.getByRole('button', { name: /Bulk import/ })).toBeInTheDocument();
    expect(screen.getByText('Export state (JSON)')).toBeInTheDocument();
    expect(useOnboardingStore.getState().backupTab).toBe('backup');
  });

  it('opens on the Bulk import tab when the guide asks for it, and consumes the request', () => {
    useOnboardingStore.getState().requestBackupTab('bulk_pwn');
    render(<BackupModal />);
    expect(screen.getByLabelText('Paste machine names or CSV')).toBeInTheDocument();
    expect(screen.queryByText('Export state (JSON)')).not.toBeInTheDocument();
    expect(useOnboardingStore.getState().requestedBackupTab).toBeNull();
    expect(useOnboardingStore.getState().backupTab).toBe('bulk_pwn');
  });

  it('Download JSON in the modal records the backup for the reminder', async () => {
    useBackupReminderStore.setState({ lastBackupAt: undefined, snoozeUntil: undefined });
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<BackupModal />);
    expect(screen.getByTestId('backup-last-backup')).toHaveTextContent('Never backed up');
    fireEvent.click(screen.getByRole('button', { name: /^download json$/i }));
    await waitFor(() => expect(useBackupReminderStore.getState().lastBackupAt).toBeDefined());
  });
});

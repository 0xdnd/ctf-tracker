import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor, within } from '@testing-library/react';
import { BackupModal } from '../../components/backup/BackupModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useCtfStore } from '../../store/useCtfStore';
import type { PreMigrationBackupSummary } from '../../store/preMigrationBackup';

const snapshotApi = vi.hoisted(() => ({
  list: vi.fn<() => Promise<PreMigrationBackupSummary[]>>(),
  restore: vi.fn<(key: string) => Promise<boolean>>(),
}));

vi.mock('../../store/preMigrationBackup', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../store/preMigrationBackup')>()),
  listPreMigrationBackups: snapshotApi.list,
  restorePreMigrationBackup: snapshotApi.restore,
}));

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

const SNAP: PreMigrationBackupSummary = {
  key: 'premigration_2_1760000000000',
  fromVersion: 2,
  toVersion: 3,
  createdAt: '2026-10-01T10:00:00.000Z',
  keyCount: 5,
  bytes: 4096,
};

const deferred = () => {
  let resolve!: (v: boolean) => void;
  const promise = new Promise<boolean>((r) => (resolve = r));
  return { promise, resolve };
};

const esc = () => {
  act(() => {
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
  });
};

const renderModal = () =>
  render(
    <>
      <BackupModal />
      <ConfirmDialog />
    </>
  );

const backupDialog = () => screen.getByRole('dialog', { name: 'Backup and bulk import' });

/** Click Restore on the snapshot row and confirm. */
const startRestore = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /^restore$/i }));
  fireEvent.click(await screen.findByRole('button', { name: 'Restore snapshot' }));
};

beforeEach(() => {
  snapshotApi.list.mockResolvedValue([SNAP]);
  snapshotApi.restore.mockReset();
  useCtfStore.setState({ backupModalOpen: true, soundEnabled: false });
});

afterEach(() => {
  cleanup();
  useCtfStore.setState({ backupModalOpen: false });
});

describe('BackupModal: pre-update snapshot section', () => {
  it('(a) renders inside the Modal body, in the scrolling content area', async () => {
    renderModal();
    const heading = await screen.findByText('Restore pre-update snapshot');
    const dialog = backupDialog();
    expect(dialog.contains(heading)).toBe(true);
    const scroller = heading.closest('.overflow-y-auto');
    expect(scroller).not.toBeNull();
    expect(dialog.contains(scroller)).toBe(true);
  });

  it('(b) the restore confirmation stacks above the BackupModal and owns Esc', async () => {
    renderModal();
    fireEvent.click(await screen.findByRole('button', { name: /^restore$/i }));
    const confirm = await screen.findByRole('alertdialog', { name: 'Restore pre-update snapshot?' });

    const z = (el: Element, re: RegExp) => Number(re.exec(el.className)?.[1]);
    const confirmZ = z(confirm.parentElement!, /z-\[(\d+)\]/);
    expect(backupDialog().parentElement).toHaveClass('z-modal'); // 100
    expect(confirmZ).toBeGreaterThan(100);

    esc(); // top of the focus-trap stack: closes the confirmation only
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(useCtfStore.getState().backupModalOpen).toBe(true);
    expect(snapshotApi.restore).not.toHaveBeenCalled();
  });

  it('(c) Esc and the close button are disabled while the restore promise is in flight', async () => {
    const pending = deferred();
    snapshotApi.restore.mockReturnValue(pending.promise);
    renderModal();
    await startRestore();
    await waitFor(() => expect(snapshotApi.restore).toHaveBeenCalledWith(SNAP.key));
    expect(await screen.findByRole('button', { name: 'Restoring…' })).toBeDisabled();

    esc();
    const close = within(backupDialog()).getByRole('button', { name: 'Close backup modal' });
    expect(close).toBeDisabled();
    fireEvent.click(close);
    expect(useCtfStore.getState().backupModalOpen).toBe(true);

    // A failed restore re-enables closing.
    await act(async () => {
      pending.resolve(false);
      await pending.promise;
    });
    await waitFor(() => expect(close).not.toBeDisabled());
    esc();
    expect(useCtfStore.getState().backupModalOpen).toBe(false);
  });

  it('(c) unmounting mid-restore does not break the restore: it runs to completion on its own', async () => {
    const pending = deferred();
    snapshotApi.restore.mockReturnValue(pending.promise);
    const view = renderModal();
    await startRestore();
    await waitFor(() => expect(snapshotApi.restore).toHaveBeenCalledTimes(1));

    const errors = vi.spyOn(console, 'error');
    view.unmount(); // e.g. the store closed the modal from elsewhere
    await act(async () => {
      pending.resolve(false);
      await pending.promise;
    });
    expect(snapshotApi.restore).toHaveBeenCalledTimes(1);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});

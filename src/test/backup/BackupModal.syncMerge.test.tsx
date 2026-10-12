import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, configure, within } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { BackupModal } from '../../components/backup/BackupModal';
import { useCtfStore, type MergeBackupResult } from '../../store/useCtfStore';
import { decryptBackup } from '../../utils/backupCrypto';
import type { SyncConflict, SyncMergeSummary } from '../../utils/syncMerge';

vi.mock('../../store/preMigrationBackup', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../store/preMigrationBackup')>()),
  listPreMigrationBackups: vi.fn(async () => []),
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

configure({ asyncUtilTimeout: 45000 });

const PASSPHRASE = 'correct horse battery staple';
const PLAINTEXT = JSON.stringify({ version: '2.0.0', machines: [{ id: 'm1', name: 'Lame' }] });
const SUMMARY: SyncMergeSummary = {
  added: 2, updated: 1, removed: 1, conflictsResolved: 0, notesAdded: 0, sessionsAdded: 0, edgesAdded: 0, lootAdded: 0,
};
const side = (status: string, notesChars: number) => ({
  status, userFlag: true, rootFlag: status === 'root', notesChars, writeupChars: 0, timeSpentSeconds: 600, updatedAt: '2026-10-01T10:00:00.000Z',
});
const CONFLICTS: SyncConflict[] = [
  { id: 'htb-lame', name: 'Lame', local: side('root', 12), incoming: side('foothold', 40) },
  { id: 'htb-blue', name: 'Blue', local: side('foothold', 0), incoming: side('root', 5) },
];

let mergeBackup: ReturnType<typeof vi.fn<(json: string, res?: Record<string, string>) => Promise<MergeBackupResult>>>;
let importBackup: ReturnType<typeof vi.fn>;
let exportSyncFile: ReturnType<typeof vi.fn>;
let downloads: { filename: string; blob: Blob }[] = [];

const paste = (text: string) => fireEvent.change(screen.getByLabelText('Paste JSON backup content'), { target: { value: text } });
const readBlob = (blob: Blob) =>
  new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsText(blob);
  });

beforeEach(() => {
  if (typeof globalThis.crypto?.subtle === 'undefined') vi.stubGlobal('crypto', webcrypto);
  downloads = [];
  const blobs = new Map<string, Blob>();
  let n = 0;
  URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
    const url = `blob:mock-${n++}`;
    blobs.set(url, blob as Blob);
    return url;
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ filename: this.download, blob: blobs.get(this.href) as Blob });
  });
  mergeBackup = vi.fn(
    async () => ({ status: 'merged', summary: SUMMARY, snapshot: 'saved', legacy: false, warnings: [] }) as MergeBackupResult
  );
  importBackup = vi.fn(() => true);
  exportSyncFile = vi.fn(async () => PLAINTEXT);
  useCtfStore.setState({
    backupModalOpen: true,
    soundEnabled: false,
    mergeBackup: mergeBackup as never,
    importBackup: importBackup as never,
    exportSyncFile: exportSyncFile as never,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  useCtfStore.setState({ backupModalOpen: false });
});

describe('BackupModal: merge import', () => {
  it('Merge is the default and recommended; Replace keeps its warning', () => {
    render(<BackupModal />);
    expect(screen.getByRole('radio', { name: /merge \(recommended\)/i })).toBeChecked();
    expect(screen.queryByText(/Replace discards your current machines/)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: /^replace/i }));
    expect(screen.getByText(/Replace discards your current machines/)).toBeInTheDocument();
  });

  it('merges and shows the summary with the pre-sync snapshot note; Replace is never called', async () => {
    render(<BackupModal />);
    paste(PLAINTEXT);
    fireEvent.click(screen.getByRole('button', { name: 'Merge into this device' }));
    expect(await screen.findByText('Merge complete')).toBeInTheDocument();
    expect(screen.getByText(/Added 2, updated 1, removed 1, conflicts resolved 0\./)).toBeInTheDocument();
    expect(screen.getByText(/A pre-sync snapshot was saved/)).toBeInTheDocument();
    expect(mergeBackup).toHaveBeenCalledWith(PLAINTEXT, undefined);
    expect(importBackup).not.toHaveBeenCalled();
  });

  it('shows "merged with warnings" when a save failed after the merge was applied', async () => {
    mergeBackup.mockResolvedValueOnce({
      status: 'merged',
      summary: SUMMARY,
      snapshot: 'saved',
      legacy: false,
      warnings: ['Credentials and loot could not be saved (The quota has been exceeded.).'],
    });
    render(<BackupModal />);
    paste(PLAINTEXT);
    fireEvent.click(screen.getByRole('button', { name: 'Merge into this device' }));
    expect(await screen.findByText('Merged with warnings')).toBeInTheDocument();
    expect(screen.getByText(/Credentials and loot could not be saved/)).toBeInTheDocument();
    expect(screen.queryByText('Merge complete')).toBeNull();
  });

  it('blocks the write until every conflict is resolved, then applies the chosen copies', async () => {
    mergeBackup
      .mockResolvedValueOnce({ status: 'conflicts', conflicts: CONFLICTS, summary: SUMMARY })
      .mockResolvedValueOnce({
        status: 'merged',
        summary: { ...SUMMARY, conflictsResolved: 2 },
        snapshot: 'saved',
        legacy: false,
        warnings: [],
      });
    render(<BackupModal />);
    paste(PLAINTEXT);
    fireEvent.click(screen.getByRole('button', { name: 'Merge into this device' }));

    const review = await screen.findByRole('region', { name: /2 machines changed on both devices/i });
    const apply = within(review).getByRole('button', { name: /apply merge/i });
    expect(apply).toBeDisabled();
    expect(within(review).getAllByText(/Root · user flag \+ root flag · notes 12 chars/)).toHaveLength(1);

    const lame = within(review).getByRole('group', { name: 'Lame' });
    fireEvent.click(within(lame).getByRole('radio', { name: /keep local/i }));
    expect(apply).toBeDisabled(); // one of two resolved: still nothing written
    expect(mergeBackup).toHaveBeenCalledTimes(1);
    const blue = within(review).getByRole('group', { name: 'Blue' });
    fireEvent.click(within(blue).getByRole('radio', { name: /keep incoming/i }));
    expect(apply).toBeEnabled();

    fireEvent.click(apply);
    expect(await screen.findByText('Merge complete')).toBeInTheDocument();
    expect(mergeBackup).toHaveBeenLastCalledWith(PLAINTEXT, { 'htb-lame': 'local', 'htb-blue': 'incoming' });
    expect(screen.getByText(/conflicts resolved 2/)).toBeInTheDocument();
  });

  it('cancel leaves no changes: no second merge call and no replace', async () => {
    mergeBackup.mockResolvedValueOnce({ status: 'conflicts', conflicts: CONFLICTS, summary: SUMMARY });
    render(<BackupModal />);
    paste(PLAINTEXT);
    fireEvent.click(screen.getByRole('button', { name: 'Merge into this device' }));
    fireEvent.click(await screen.findByRole('button', { name: /cancel merge/i }));
    expect(screen.getByText('Merge cancelled. Nothing was changed.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /changed on both devices/i })).toBeNull();
    expect(mergeBackup).toHaveBeenCalledTimes(1);
    expect(importBackup).not.toHaveBeenCalled();
  });

  it.each([
    ['busy', /Another ZeroBox tab is merging/],
    ['gated', /Writes are blocked in this tab/],
    ['snapshot-failed', /Could not save a pre-sync snapshot, so nothing was merged/],
    ['invalid', /Invalid backup format/],
  ] as const)('reports a %s merge', async (status, message) => {
    mergeBackup.mockResolvedValueOnce({ status } as MergeBackupResult);
    render(<BackupModal />);
    paste(PLAINTEXT);
    fireEvent.click(screen.getByRole('button', { name: 'Merge into this device' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });
});

describe('BackupModal: export sync file', () => {
  it('is always encrypted: asks for a passphrase first, then downloads an encrypted sync file', async () => {
    render(<BackupModal />);
    fireEvent.click(screen.getByRole('button', { name: 'Export sync file' }));
    expect(screen.getByText(/Sync files are always encrypted/)).toBeInTheDocument();
    expect(exportSyncFile).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Export sync file' })).toBeDisabled(); // no passphrase yet

    fireEvent.change(screen.getByLabelText('Export passphrase'), { target: { value: PASSPHRASE } });
    fireEvent.change(screen.getByLabelText('Confirm export passphrase'), { target: { value: PASSPHRASE } });
    fireEvent.click(screen.getByRole('button', { name: 'Export sync file' }));

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(exportSyncFile).toHaveBeenCalledTimes(1);
    expect(downloads[0].filename).toMatch(/^zerobox_sync_\d{4}-\d{2}-\d{2}\.json$/);
    const text = await readBlob(downloads[0].blob);
    expect(text).not.toContain('Lame');
    expect(await decryptBackup(text, PASSPHRASE)).toBe(PLAINTEXT);
  });
});

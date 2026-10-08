import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { webcrypto } from 'node:crypto';
import { BackupModal } from '../../components/backup/BackupModal';
import { useCtfStore } from '../../store/useCtfStore';
import { decryptBackup, encryptBackup, isEncryptedBackup } from '../../utils/backupCrypto';

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

// jsdom may not expose WebCrypto; fall back to Node's implementation for these tests only.
const needsNodeCrypto = typeof globalThis.crypto?.subtle === 'undefined';

const PASSPHRASE = 'correct horse battery staple';
const dateStr = () => new Date().toISOString().slice(0, 10);

const backupJson = (redact: boolean) =>
  JSON.stringify({ isRedacted: redact, machines: [{ id: 'm1', name: 'Lame', notes: 'secret-note-123' }] });
const PLAINTEXT = backupJson(false);

const readBlob = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

interface Download {
  filename: string;
  blob: Blob;
}

let downloads: Download[] = [];
let exportBackup: ReturnType<typeof vi.fn>;
let importBackup: ReturnType<typeof vi.fn>;

const fillExportPassphrase = (value: string, confirm = value) => {
  fireEvent.change(screen.getByLabelText('Export passphrase'), { target: { value } });
  fireEvent.change(screen.getByLabelText('Confirm export passphrase'), { target: { value: confirm } });
};

const enableEncryption = () => fireEvent.click(screen.getByLabelText(/encrypt with passphrase/i));

beforeEach(() => {
  if (needsNodeCrypto) vi.stubGlobal('crypto', webcrypto);

  downloads = [];
  const blobs = new Map<string, Blob>();
  let counter = 0;
  URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
    const url = `blob:mock-${counter++}`;
    blobs.set(url, blob as Blob);
    return url;
  });
  URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ filename: this.download, blob: blobs.get(this.href) as Blob });
  });

  exportBackup = vi.fn((options?: { redactSecrets?: boolean }) => backupJson(Boolean(options?.redactSecrets)));
  importBackup = vi.fn(() => true);
  useCtfStore.setState({
    backupModalOpen: true,
    soundEnabled: false,
    exportBackup: exportBackup as never,
    importBackup: importBackup as never,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  useCtfStore.setState({ backupModalOpen: false });
});

describe('BackupModal: plaintext export is unchanged', () => {
  it('downloads the plain JSON with the plain filename', async () => {
    render(<BackupModal />);
    expect(screen.queryByLabelText('Export passphrase')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^download json$/i }));
    expect(downloads).toHaveLength(1);
    expect(downloads[0].filename).toBe(`zerobox_ctf_backup_${dateStr()}.json`);
    expect(await readBlob(downloads[0].blob)).toBe(PLAINTEXT);
    expect(exportBackup).toHaveBeenCalledWith({ redactSecrets: false });
  });

  it('keeps the redacted filename when only redaction is on', () => {
    render(<BackupModal />);
    fireEvent.click(screen.getByLabelText(/redact sensitive credentials/i));
    fireEvent.click(screen.getByRole('button', { name: /^download json$/i }));
    expect(downloads[0].filename).toBe(`zerobox_ctf_backup_redacted_${dateStr()}.json`);
    expect(exportBackup).toHaveBeenCalledWith({ redactSecrets: true });
  });
});

describe('BackupModal: encrypted export', () => {
  it('shows the no-recovery warning and gates export on a valid, matching passphrase', () => {
    render(<BackupModal />);
    enableEncryption();
    expect(
      screen.getByText('There is no recovery. If you lose this passphrase, the backup cannot be opened.')
    ).toBeInTheDocument();

    const download = screen.getByRole('button', { name: /download encrypted json/i });
    expect(download).toBeDisabled();

    fillExportPassphrase('short');
    expect(screen.getByText('Passphrase must be at least 12 characters.')).toBeInTheDocument();
    expect(screen.getByText(/Strength: Too short/)).toBeInTheDocument();
    expect(download).toBeDisabled();

    fillExportPassphrase(PASSPHRASE, PASSPHRASE + 'x');
    expect(screen.getByText('Passphrases do not match.')).toBeInTheDocument();
    expect(download).toBeDisabled();

    fillExportPassphrase(PASSPHRASE);
    expect(screen.queryByText('Passphrases do not match.')).toBeNull();
    expect(screen.getByText(/Strength: Strong/)).toBeInTheDocument();
    expect(download).toBeEnabled();

    // Validation messages are announced through a polite live region.
    expect(document.getElementById('backup-export-passphrase-notice')).toHaveAttribute('aria-live', 'polite');
  });

  it('downloads an envelope under the encrypted filename and decrypts back to the exact backup', async () => {
    render(<BackupModal />);
    enableEncryption();
    fillExportPassphrase(PASSPHRASE);
    fireEvent.click(screen.getByRole('button', { name: /download encrypted json/i }));

    // spinner while the key is derived
    expect(screen.getByText(/Encrypting backup/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download encrypted json/i })).toBeDisabled();

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0].filename).toBe(`zerobox_ctf_backup_encrypted_${dateStr()}.json`);
    const text = await readBlob(downloads[0].blob);
    expect(isEncryptedBackup(text)).toBe(true);
    const envelope = JSON.parse(text);
    expect(envelope.format).toBe('zerobox-backup-encrypted');
    expect(envelope.v).toBe(1);
    expect(text).not.toContain('secret-note-123');
    expect(await decryptBackup(text, PASSPHRASE)).toBe(PLAINTEXT);

    await waitFor(() => expect(screen.queryByText(/Encrypting backup/)).toBeNull());
    // passphrase fields are wiped after a successful export
    expect(screen.getByLabelText('Export passphrase')).toHaveValue('');
  });

  it('combines with redaction: isRedacted stays inside the plaintext, filename stays encrypted', async () => {
    render(<BackupModal />);
    fireEvent.click(screen.getByLabelText(/redact sensitive credentials/i));
    enableEncryption();
    fillExportPassphrase(PASSPHRASE);
    fireEvent.click(screen.getByRole('button', { name: /download encrypted json/i }));
    await waitFor(() => expect(downloads).toHaveLength(1));

    expect(exportBackup).toHaveBeenCalledWith({ redactSecrets: true });
    expect(downloads[0].filename).toBe(`zerobox_ctf_backup_encrypted_${dateStr()}.json`);
    const text = await readBlob(downloads[0].blob);
    expect(JSON.parse(text)).not.toHaveProperty('isRedacted');
    expect(JSON.parse(await decryptBackup(text, PASSPHRASE)).isRedacted).toBe(true);
  });

  it('copies the encrypted envelope to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<BackupModal />);
    enableEncryption();
    fillExportPassphrase(PASSPHRASE);
    fireEvent.click(screen.getByRole('button', { name: /copy encrypted json/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const copied = writeText.mock.calls[0][0] as string;
    expect(isEncryptedBackup(copied)).toBe(true);
    expect(await decryptBackup(copied, PASSPHRASE)).toBe(PLAINTEXT);
  });

  it('disables the toggle and explains why when WebCrypto is unavailable', () => {
    vi.stubGlobal('crypto', undefined);
    render(<BackupModal />);
    const toggle = screen.getByLabelText(/encrypt with passphrase/i);
    expect(toggle).toBeDisabled();
    expect(toggle).not.toBeChecked();
    expect(screen.getByText(/not in a secure context/i)).toBeInTheDocument();
    expect(toggle).toHaveAccessibleDescription(/not in a secure context/i);
    // plaintext export still works
    fireEvent.click(screen.getByRole('button', { name: /^download json$/i }));
    expect(downloads).toHaveLength(1);
  });

  it('clears passphrases when the modal is closed and reopened', () => {
    render(<BackupModal />);
    enableEncryption();
    fillExportPassphrase(PASSPHRASE);
    act(() => useCtfStore.setState({ backupModalOpen: false }));
    act(() => useCtfStore.setState({ backupModalOpen: true }));
    expect(screen.getByLabelText('Export passphrase')).toHaveValue('');
    expect(screen.getByLabelText('Confirm export passphrase')).toHaveValue('');
  });
});

describe('BackupModal: import', () => {
  let envelope: string;

  beforeEach(async () => {
    envelope = await encryptBackup(PLAINTEXT, PASSPHRASE);
  });

  const typeImportPassphrase = (value: string) =>
    fireEvent.change(screen.getByLabelText('Backup passphrase'), { target: { value } });

  it('prompts for the passphrase on a file upload, then imports the decrypted plaintext', async () => {
    render(<BackupModal />);
    expect(screen.queryByLabelText('Backup passphrase')).toBeNull();

    const file = new File([envelope], 'zerobox_ctf_backup_encrypted.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText('Upload JSON backup file'), { target: { files: [file] } });

    const passphraseInput = await screen.findByLabelText('Backup passphrase');
    expect(passphraseInput).toHaveAttribute('type', 'password');
    const importButton = screen.getByRole('button', { name: /decrypt and import/i });
    expect(importButton).toBeDisabled();

    typeImportPassphrase(PASSPHRASE);
    expect(importButton).toBeEnabled();
    fireEvent.click(importButton);

    expect(await screen.findByText(/Decrypting backup/)).toBeInTheDocument();
    await waitFor(() => expect(importBackup).toHaveBeenCalledTimes(1));
    expect(importBackup).toHaveBeenCalledWith(PLAINTEXT);
    expect(await screen.findByText(/State restored/)).toBeInTheDocument();
  });

  it('prompts on the paste path too, and Enter submits', async () => {
    render(<BackupModal />);
    fireEvent.change(screen.getByLabelText('Paste JSON backup content'), { target: { value: envelope } });
    typeImportPassphrase(PASSPHRASE);
    fireEvent.keyDown(screen.getByLabelText('Backup passphrase'), { key: 'Enter' });
    await waitFor(() => expect(importBackup).toHaveBeenCalledTimes(1));
    expect(importBackup).toHaveBeenCalledWith(PLAINTEXT);
  });

  it('shows the generic error for a wrong passphrase and never calls importBackup', async () => {
    render(<BackupModal />);
    fireEvent.change(screen.getByLabelText('Paste JSON backup content'), { target: { value: envelope } });
    typeImportPassphrase('definitely the wrong passphrase');
    fireEvent.click(screen.getByRole('button', { name: /decrypt and import/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Wrong passphrase or corrupted file');
    expect(importBackup).not.toHaveBeenCalled();

    // retry with the right passphrase succeeds
    typeImportPassphrase(PASSPHRASE);
    fireEvent.click(screen.getByRole('button', { name: /decrypt and import/i }));
    await waitFor(() => expect(importBackup).toHaveBeenCalledWith(PLAINTEXT));
  });

  it('shows the unsupported-version error without importing', async () => {
    const v2 = JSON.stringify({ ...JSON.parse(envelope), v: 2 });
    render(<BackupModal />);
    fireEvent.change(screen.getByLabelText('Paste JSON backup content'), { target: { value: v2 } });
    typeImportPassphrase(PASSPHRASE);
    fireEvent.click(screen.getByRole('button', { name: /decrypt and import/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/unsupported backup version/i);
    expect(importBackup).not.toHaveBeenCalled();
  });

  it('shows an invalid-envelope error for a malformed envelope', async () => {
    const bad = JSON.stringify({ ...JSON.parse(envelope), kdf: { ...JSON.parse(envelope).kdf, iterations: 1 } });
    render(<BackupModal />);
    fireEvent.change(screen.getByLabelText('Paste JSON backup content'), { target: { value: bad } });
    typeImportPassphrase(PASSPHRASE);
    fireEvent.click(screen.getByRole('button', { name: /decrypt and import/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid encrypted backup/i);
    expect(importBackup).not.toHaveBeenCalled();
  });

  it('imports a plaintext backup exactly as before: no prompt, importBackup gets the raw text', () => {
    render(<BackupModal />);
    fireEvent.change(screen.getByLabelText('Paste JSON backup content'), { target: { value: PLAINTEXT } });
    expect(screen.queryByLabelText('Backup passphrase')).toBeNull();
    const button = screen.getByRole('button', { name: /^import and apply$/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(importBackup).toHaveBeenCalledTimes(1);
    expect(importBackup).toHaveBeenCalledWith(PLAINTEXT);
    expect(screen.getByText(/State restored/)).toBeInTheDocument();
  });

  it('keeps the existing error messages for plaintext imports', () => {
    importBackup.mockReturnValueOnce(false);
    render(<BackupModal />);
    fireEvent.change(screen.getByLabelText('Paste JSON backup content'), { target: { value: '{"nope":1}' } });
    fireEvent.click(screen.getByRole('button', { name: /^import and apply$/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid backup format. Ensure it contains a valid "machines" array.');

    importBackup.mockImplementationOnce(() => {
      throw new Error('boom');
    });
    fireEvent.click(screen.getByRole('button', { name: /^import and apply$/i }));
    expect(screen.getByRole('alert')).toHaveTextContent('Malformed JSON syntax. Please check the imported text.');
  });
});

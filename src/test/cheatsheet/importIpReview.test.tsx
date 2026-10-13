import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { useCtfStore } from '../../store/useCtfStore';
import { saveVaultToIndexedDb } from '../../utils/indexedDbVault';
import { NotesImportModal } from '../../components/cheatsheet/NotesImportModal';

const SCAN_MD = '# Scan\n\n```bash\nnmap -sV 10.129.5.5\n```\n';

function mdFile(path: string, text: string): File {
  const file = new File([text], path.split('/').pop()!, { type: 'text/markdown' });
  Object.defineProperty(file, 'webkitRelativePath', { value: path });
  // jsdom's File has no text() in every version; make it deterministic.
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) });
  return file;
}

async function selectFolder(files: File[]) {
  const input = document.getElementById('notes-import-folder-input') as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { files } });
  });
}

describe('NotesImportModal — IP review before saving', () => {
  beforeEach(() => {
    vi.mocked(saveVaultToIndexedDb).mockClear();
    act(() => {
      useCtfStore.setState({
        notesImportModalOpen: true,
        userNotes: [],
        customNotes: [],
        globalVars: { ...useCtfStore.getState().globalVars, lhost: '', targetIp: '' },
      });
    });
  });

  it('holds a folder import for review and saves the templated notes', async () => {
    render(<NotesImportModal />);
    await selectFolder([mdFile('vault/recon/scan.md', SCAN_MD), mdFile('vault/recon/plain.md', '# Plain\ntext')]);

    await waitFor(() => screen.getByTestId('import-ip-review'));
    expect(saveVaultToIndexedDb).not.toHaveBeenCalled();
    expect(useCtfStore.getState().userNotes).toHaveLength(0);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Import with replacements' }));
    });
    await waitFor(() => expect(useCtfStore.getState().userNotes).toHaveLength(2));
    const scan = useCtfStore.getState().userNotes.find((n) => n.title === 'scan')!;
    expect(scan.rawMarkdown).toContain('nmap -sV {TARGET}');
    expect(scan.rawMarkdown).toContain('original_ips_target: 10.129.5.5');
    expect(scan.commands).toEqual(['nmap -sV {TARGET}']);
    expect(saveVaultToIndexedDb).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Replaced 1 IP with placeholders/)).toBeTruthy();
  });

  it('imports as-is when the user skips the replacements', async () => {
    render(<NotesImportModal />);
    await selectFolder([mdFile('vault/scan.md', SCAN_MD)]);
    await waitFor(() => screen.getByTestId('import-ip-review'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Import as-is' }));
    });
    await waitFor(() => expect(useCtfStore.getState().userNotes).toHaveLength(1));
    expect(useCtfStore.getState().userNotes[0].rawMarkdown).toBe(SCAN_MD);
  });

  it('keeps the pending import for retry when saving fails', async () => {
    vi.mocked(saveVaultToIndexedDb).mockRejectedValueOnce(new Error('disk full'));
    render(<NotesImportModal />);
    await selectFolder([mdFile('vault/scan.md', SCAN_MD)]);
    await waitFor(() => screen.getByTestId('import-ip-review'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Import with replacements' }));
    });
    await waitFor(() => expect(screen.getByText('disk full')).toBeTruthy());
    expect(screen.getByTestId('import-ip-review')).toBeTruthy();
    expect(useCtfStore.getState().userNotes).toHaveLength(0);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Import with replacements' }));
    });
    await waitFor(() => expect(useCtfStore.getState().userNotes).toHaveLength(1));
    expect(screen.queryByTestId('import-ip-review')).toBeNull();
  });

  it('cancelling saves nothing', async () => {
    render(<NotesImportModal />);
    await selectFolder([mdFile('vault/scan.md', SCAN_MD)]);
    await waitFor(() => screen.getByTestId('import-ip-review'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel import' }));
    expect(screen.queryByTestId('import-ip-review')).toBeNull();
    expect(saveVaultToIndexedDb).not.toHaveBeenCalled();
    expect(useCtfStore.getState().userNotes).toHaveLength(0);
  });

  it('saves straight away when no note contains an IP', async () => {
    render(<NotesImportModal />);
    await selectFolder([mdFile('vault/plain.md', '# Plain\n`ls -la`')]);
    await waitFor(() => expect(useCtfStore.getState().userNotes).toHaveLength(1));
    expect(screen.queryByTestId('import-ip-review')).toBeNull();
  });

  it('reviews pasted JSON before importing it through the store', async () => {
    render(<NotesImportModal />);
    fireEvent.click(screen.getByRole('button', { name: /Paste JSON/ }));
    const payload = JSON.stringify({
      notes: [{ id: 'n1', title: 'N1', commands: ['nmap 10.129.9.9'], rawMarkdown: '`nmap 10.129.9.9`' }],
      wikilinkMap: { n1: 'n1' },
    });
    fireEvent.change(screen.getByLabelText('Paste raw JSON notes payload'), { target: { value: payload } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Import From Text/ }));
    });
    await waitFor(() => screen.getByTestId('import-ip-review'));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Import with replacements' }));
    });
    await waitFor(() => expect(useCtfStore.getState().userNotes).toHaveLength(1));
    const n1 = useCtfStore.getState().userNotes[0];
    expect(n1.rawMarkdown).toContain('`nmap {TARGET}`');
    expect(useCtfStore.getState().userWikilinkMap).toEqual({ n1: 'n1' });
  });
});

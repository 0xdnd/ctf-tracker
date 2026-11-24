import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { useCtfStore } from '../../store/useCtfStore';
import { useToastStore } from '../../store/useToastStore';
import { saveVaultStrict } from '../../utils/indexedDbVault';
import { NotesImportModal } from '../../components/cheatsheet/NotesImportModal';
import { MAX_JSON_IMPORT_BYTES } from '../../utils/importLimits';

const fileOfSize = (name: string, content: string, size: number) => {
  const file = new File([content], name, { type: 'application/json' });
  Object.defineProperty(file, 'size', { value: size });
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(content) });
  return file;
};

describe('NotesImportModal import size limits', () => {
  beforeEach(() => {
    vi.mocked(saveVaultStrict).mockClear();
    useToastStore.setState({ toasts: [] });
    act(() => {
      useCtfStore.setState({ notesImportModalOpen: true, userNotes: [], customNotes: [] });
    });
  });

  afterEach(() => {
    cleanup();
    useToastStore.setState({ toasts: [] });
    act(() => useCtfStore.setState({ notesImportModalOpen: false }));
  });

  it('shows a friendly toast for a JSON file over the limit and imports nothing', async () => {
    render(<NotesImportModal />);
    const input = screen.getByLabelText('Upload Obsidian vault zip or json');
    const oversized = fileOfSize('huge.json', '{"notes":[{"id":"a","title":"A","commands":[]}]}', MAX_JSON_IMPORT_BYTES + 1);

    await act(async () => {
      fireEvent.change(input, { target: { files: [oversized] } });
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toMatch(/over the 50 MB limit/);
    expect(saveVaultStrict).not.toHaveBeenCalled();
    expect(useCtfStore.getState().userNotes).toHaveLength(0);
  });

  it('applies the same limit to pasted JSON, measured in bytes', async () => {
    render(<NotesImportModal />);
    fireEvent.click(screen.getByRole('button', { name: /paste json/i }));
    // Multi-byte characters: the text length alone (about 26 million) is under the limit, its byte size is over.
    const pasted = '€'.repeat(Math.ceil((MAX_JSON_IMPORT_BYTES + 1) / 3));

    fireEvent.change(screen.getByLabelText('Paste raw JSON notes payload'), { target: { value: pasted } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /import from text/i }));
    });

    const toasts = useToastStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].type).toBe('error');
    expect(toasts[0].message).toMatch(/over the 50 MB limit/);
    expect(saveVaultStrict).not.toHaveBeenCalled();
  });
});

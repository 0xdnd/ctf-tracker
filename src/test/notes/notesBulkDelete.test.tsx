import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheatsheetView } from '../../components/cheatsheet/CheatsheetView';
import { useCtfStore } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useToastStore } from '../../store/useToastStore';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
import { registerUnsavedNoteEdits } from '../../utils/unsavedNoteEdits';
import { clearVaultFromIndexedDb } from '../../utils/indexedDbVault';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
}
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IntersectionObserverStub;
}

const mk = (id: string): CptsNoteEntry =>
  ({ id, title: `Note ${id}`, category: 'Test', rawMarkdown: `body ${id}`, isCustom: true }) as unknown as CptsNoteEntry;

const renderManual = () =>
  render(
    <MemoryRouter initialEntries={['/field-manual']}>
      <CheatsheetView defaultMode="cpts-manual" />
    </MemoryRouter>,
  );

/** What the storage-event merge leaves in this tab after another tab deleted `id`. */
const deletedElsewhere = (id: string) =>
  act(() => {
    useCtfStore.setState((s) => ({
      customNotes: s.customNotes.filter((n) => n.id !== id),
      deletedNoteIds: [...s.deletedNoteIds, id],
    }));
  });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  resetNoteIndexCacheForTests();
  useNotesWorkspaceStore.setState({ isNoteSwitcherOpen: false });
  useToastStore.setState({ toasts: [] });
  vi.mocked(clearVaultFromIndexedDb).mockClear();
  useCtfStore.setState({ soundEnabled: false, customNotes: [mk('A'), mk('B')], userNotes: [], deletedNoteIds: [] });
});
afterEach(() => cleanup());

describe('field manual bulk delete', () => {
  it('confirm deletes the counted notes as tombstones, like the per-note delete', async () => {
    renderManual();
    const btn = screen.getByTestId('header-delete-notes-btn');
    expect(btn).toHaveTextContent('Delete (2)');
    fireEvent.click(btn);
    expect(screen.getByTestId('header-delete-notes-btn')).toHaveTextContent('Confirm Delete (2)?');
    fireEvent.click(screen.getByTestId('header-delete-notes-btn'));

    await waitFor(() => expect(useCtfStore.getState().customNotes).toHaveLength(0));
    expect([...useCtfStore.getState().deletedNoteIds].sort()).toEqual(['A', 'B']);
    // Not the whole-vault wipe: the stored vault is left to the per-note path.
    expect(clearVaultFromIndexedDb).not.toHaveBeenCalled();
    expect(screen.queryByTestId('header-delete-notes-btn')).toBeNull();
    // Restore would bring nothing back (the notes are gone, only tombstones remain), so it is not offered.
    expect(screen.queryByRole('button', { name: /Restore/ })).toBeNull();
  });

  it('closes the tabs of the deleted notes', async () => {
    localStorage.setItem('zerobox_obsidian_open_tabs', JSON.stringify(['A', 'B']));
    renderManual();
    expect(screen.getByTestId('note-tab-A')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('header-delete-notes-btn'));
    fireEvent.click(screen.getByTestId('header-delete-notes-btn'));
    await waitFor(() => expect(screen.queryByTestId('note-tab-A')).toBeNull());
    expect(screen.queryByTestId('note-tab-B')).toBeNull();
  });
});

describe('note deleted in another tab', () => {
  it('closes its tab and shows the next open note', async () => {
    localStorage.setItem('zerobox_obsidian_open_tabs', JSON.stringify(['A', 'B']));
    renderManual();
    expect(screen.getByTestId('note-tab-A')).toBeInTheDocument();
    expect(screen.getByTestId('tab-content-A')).toBeInTheDocument();

    deletedElsewhere('A');

    await waitFor(() => expect(screen.queryByTestId('note-tab-A')).toBeNull());
    expect(screen.queryByTestId('tab-content-A')).toBeNull();
    expect(screen.getByTestId('note-tab-B')).toBeInTheDocument();
  });

  it('shows the empty state when it was the only open note', async () => {
    localStorage.setItem('zerobox_obsidian_open_tabs', JSON.stringify(['A']));
    renderManual();
    expect(screen.getByTestId('tab-content-A')).toBeInTheDocument();

    deletedElsewhere('A');

    await waitFor(() => expect(screen.queryByTestId('tab-content-A')).toBeNull());
    expect(screen.queryByTestId('note-tab-A')).toBeNull();
  });

  it('keeps the tab open with a warning when it has unsaved edits', async () => {
    localStorage.setItem('zerobox_obsidian_open_tabs', JSON.stringify(['A', 'B']));
    const unregister = registerUnsavedNoteEdits('A', () => true);
    try {
      renderManual();
      deletedElsewhere('A');
      await waitFor(() =>
        expect(useToastStore.getState().toasts.some((t) => /deleted/i.test(t.title ?? ''))).toBe(true),
      );
      expect(screen.getByTestId('note-tab-A')).toBeInTheDocument();
      expect(useToastStore.getState().toasts.filter((t) => /deleted/i.test(t.title ?? ''))).toHaveLength(1);
    } finally {
      unregister();
    }
  });
});

describe('editor unsaved-edits probe', () => {
  it('reports typed-but-unsaved text for its note, and nothing once unmounted', async () => {
    const { MarkdownEditor } = await import('../../components/cheatsheet/MarkdownEditor');
    const { hasUnsavedNoteEdits } = await import('../../utils/unsavedNoteEdits');
    const view = render(
      <MarkdownEditor noteId="A" initialContent="body A" storeContent="body A" onContentChange={() => {}} soundEnabled={false} />,
    );
    expect(hasUnsavedNoteEdits('A')).toBe(false);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'body A edited' } });
    expect(hasUnsavedNoteEdits('A')).toBe(true);
    view.unmount();
    expect(hasUnsavedNoteEdits('A')).toBe(false);
  });
});

describe('re-import after delete', () => {
  it('shows re-imported notes again instead of keeping them hidden by their tombstones', async () => {
    const x = { ...mk('X'), isCustom: false } as CptsNoteEntry;
    useCtfStore.setState({ customNotes: [mk('A')], userNotes: [x], deletedNoteIds: [] });
    useCtfStore.getState().deleteNotes(['A', 'X']);
    expect([...useCtfStore.getState().deletedNoteIds].sort()).toEqual(['A', 'X']);
    const before = useCtfStore.getState().tombstonesEpoch;

    await useCtfStore.getState().replaceUserNotes([x], {});

    expect(useCtfStore.getState().deletedNoteIds).toEqual(['A']);
    // A newer tombstones epoch, so another tab adopts the shorter list instead of unioning X back in.
    expect(useCtfStore.getState().tombstonesEpoch).not.toBe(before);
  });
});

describe('saving a note that was deleted', () => {
  it('rejects for an authored note that no longer exists', async () => {
    useCtfStore.setState({ customNotes: [], userNotes: [], deletedNoteIds: ['A'] });
    await expect(useCtfStore.getState().updateNoteContent('A', 'edit')).rejects.toThrow(/deleted/);
  });

  it('rejects for an imported note the stored vault no longer has', async () => {
    const { mutateVault } = await import('../../utils/indexedDbVault');
    const x = { ...mk('X'), isCustom: false } as CptsNoteEntry;
    useCtfStore.setState({ customNotes: [], userNotes: [x], deletedNoteIds: [] });
    // Another tab removed X from the stored vault; this tab still holds it.
    vi.mocked(mutateVault).mockImplementationOnce(async (fn) =>
      fn({ notes: [mk('Y')], wikilinkMap: {}, exists: true }),
    );
    await expect(useCtfStore.getState().updateNoteContent('X', 'edit')).rejects.toThrow(/deleted/);
  });

  it('keeps the tab open with the text unsaved when the save fails after a remote delete', async () => {
    const { hasUnsavedNoteEdits } = await import('../../utils/unsavedNoteEdits');
    localStorage.setItem('zerobox_obsidian_open_tabs', JSON.stringify(['A', 'B']));
    renderManual();
    const tab = screen.getByTestId('tab-content-A');
    expect(tab).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Switch to Edit View'));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      fireEvent.change(within(screen.getByTestId('tab-content-A')).getByRole('textbox'), {
        target: { value: 'body A edited' },
      });
      deletedElsewhere('A'); // edits still pending: the tab stays
      await act(async () => {
        vi.advanceTimersByTime(700); // the debounced save runs and is rejected
      });
    } finally {
      vi.useRealTimers();
    }
    await waitFor(() => expect(screen.getByText('Unsaved')).toBeInTheDocument());
    const kept = screen.getByTestId('tab-content-A');
    expect(within(kept).getByRole('textbox')).toHaveValue('body A edited');
    expect(screen.getByTestId('note-tab-A')).toBeInTheDocument();
    expect(hasUnsavedNoteEdits('A')).toBe(true);
  });
});

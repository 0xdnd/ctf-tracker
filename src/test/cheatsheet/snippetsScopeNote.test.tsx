import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheatsheetView } from '../../components/cheatsheet/CheatsheetView';
import { useCtfStore } from '../../store/useCtfStore';
import { FIXTURE_IMPORTED_NOTES, seedImportedNotes } from '../fixtures/userNoteFixtures';

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
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IntersectionObserverStub;
}

function renderSnippets() {
  return render(
    <MemoryRouter initialEntries={['/cheatsheets']}>
      <CheatsheetView defaultMode="tactical" />
    </MemoryRouter>
  );
}

describe('Snippets page explains what the sidebar badge counts', () => {
  beforeEach(() => {
    localStorage.clear();
    useCtfStore.setState({ soundEnabled: false, customNotes: [], userNotes: [], deletedNoteIds: [] });
  });
  afterEach(() => cleanup());

  it('shows no note when the user has no notes', () => {
    renderSnippets();
    expect(screen.queryByTestId('snippets-scope-note')).toBeNull();
  });

  it('says the sidebar badge adds the notes to the snippet count', () => {
    seedImportedNotes();
    renderSnippets();
    const snippets = useCtfStore.getState().cheatsheets.length;
    const notes = FIXTURE_IMPORTED_NOTES.length;
    expect(screen.getByTestId('snippets-scope-note')).toHaveTextContent(
      `${snippets} snippets here. The sidebar badge also counts your ${notes} ${notes === 1 ? 'note' : 'notes'} (${snippets + notes} in total).`
    );
  });

  it('counts authored notes and leaves out deleted ones, matching the Field manual tab', () => {
    useCtfStore.getState().addCustomNote({ title: 'Authored note' });
    renderSnippets();
    const snippets = useCtfStore.getState().cheatsheets.length;
    expect(screen.getByTestId('snippets-scope-note')).toHaveTextContent(
      `${snippets} snippets here. The sidebar badge also counts your 1 note (${snippets + 1} in total).`
    );

    const first = useCtfStore.getState().customNotes[0];
    act(() => useCtfStore.setState({ customNotes: [first, { ...first, id: 'custom-note-second' }] }));
    expect(screen.getByTestId('snippets-scope-note')).toHaveTextContent(`(${snippets + 2} in total)`);

    act(() => useCtfStore.getState().deleteNote(first.id));
    expect(screen.getByTestId('snippets-scope-note')).toHaveTextContent(`(${snippets + 1} in total)`);
  });
});

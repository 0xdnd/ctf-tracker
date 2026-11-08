import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheatsheetView } from '../../components/cheatsheet/CheatsheetView';
import { useCtfStore } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
import { NARROW_QUERY } from '../../hooks/useMediaQuery';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IntersectionObserverStub;
}

const mk = (id: string, rawMarkdown = `body ${id}`): CptsNoteEntry =>
  ({ id, title: `Note ${id}`, category: 'Test', rawMarkdown }) as unknown as CptsNoteEntry;

const originalMatchMedia = window.matchMedia;
function mockNarrow(narrow: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: narrow && query === NARROW_QUERY,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function setup() {
  return render(
    <MemoryRouter initialEntries={['/field-manual']}>
      <CheatsheetView defaultMode="cpts-manual" />
    </MemoryRouter>,
  );
}

const left = () => screen.getByTestId('notes-left-panel');
const right = () => screen.getByTestId('notes-right-sidebar');

describe('field manual drawers under 768 px', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetNoteIndexCacheForTests();
    useNotesWorkspaceStore.setState({ isNoteSwitcherOpen: false });
    useCtfStore.setState({ soundEnabled: false, customNotes: [mk('A'), mk('B')], userNotes: [], deletedNoteIds: [] });
    mockNarrow(true);
  });
  afterEach(() => {
    cleanup();
    window.matchMedia = originalMatchMedia;
  });

  it('drawers start closed even when the desktop flag is open', () => {
    localStorage.setItem('zerobox_obsidian_sidebar_open', 'true');
    setup();
    expect(left()).toHaveAttribute('data-state', 'closed');
    expect(right()).toHaveAttribute('data-state', 'closed');
    expect(screen.queryByTestId('notes-drawer-scrim')).toBeNull();
  });

  it('closed drawers are inert and hidden from assistive tech', () => {
    setup();
    expect(left()).toHaveAttribute('aria-hidden', 'true');
    expect(left()).toHaveAttribute('inert');
    fireEvent.click(screen.getByRole('button', { name: 'Files' }));
    expect(left()).not.toHaveAttribute('inert');
    expect(left()).not.toHaveAttribute('aria-hidden');
  });

  it('ribbon Files opens the left drawer with a scrim; the scrim closes it', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Files' }));
    expect(left()).toHaveAttribute('data-state', 'open');
    fireEvent.click(screen.getByTestId('notes-drawer-scrim'));
    expect(left()).toHaveAttribute('data-state', 'closed');
    expect(screen.queryByTestId('notes-drawer-scrim')).toBeNull();
  });

  it('opening the right drawer closes the left', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Files' }));
    fireEvent.click(screen.getByTestId('toggle-right-panel'));
    expect(left()).toHaveAttribute('data-state', 'closed');
    expect(right()).toHaveAttribute('data-state', 'open');
  });

  it('choosing a note in the tree closes the drawer', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Files' }));
    fireEvent.click(screen.getByTitle('Open Obsidian Note: Note B'));
    expect(left()).toHaveAttribute('data-state', 'closed');
    expect(screen.getByTestId('note-tab-B')).toHaveAttribute('aria-selected', 'true');
  });

  it('Escape closes the drawer and keeps tabs', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Files' }));
    fireEvent.click(screen.getByTitle('Open Obsidian Note: Note B'));
    fireEvent.click(screen.getByRole('button', { name: 'Files' }));
    expect(left()).toHaveAttribute('data-state', 'open');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(left()).toHaveAttribute('data-state', 'closed');
    expect(screen.getByTestId('note-tab-B')).toBeInTheDocument();
  });

  it('drawer toggles, Ctrl+B included, never write the desktop flag', () => {
    localStorage.setItem('zerobox_obsidian_sidebar_open', 'true');
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Files' }));
    expect(left()).toHaveAttribute('data-state', 'open');
    fireEvent.click(screen.getByRole('button', { name: 'Files' }));
    expect(left()).toHaveAttribute('data-state', 'closed');
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(left()).toHaveAttribute('data-state', 'open');
    expect(localStorage.getItem('zerobox_obsidian_sidebar_open')).toBe('true');
  });

  it('back to ZeroBox is reachable with drawers closed', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Back to ZeroBox' }).closest('[data-testid="notes-left-panel"]')).toBeNull();
  });
});

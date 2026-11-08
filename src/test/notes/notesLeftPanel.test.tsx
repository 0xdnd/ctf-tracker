import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotesLeftPanel } from '../../components/notes/NotesLeftPanel';
import { CheatsheetView } from '../../components/cheatsheet/CheatsheetView';
import { useCtfStore } from '../../store/useCtfStore';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
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

const mk = (id: string, relPath: string, rawMarkdown: string, tags: string[] = []): CptsNoteEntry =>
  ({
    id,
    title: `Note ${id}`,
    category: 'Test',
    subCategory: '',
    summary: '',
    tags,
    tools: [],
    commands: [],
    relPath,
    rawMarkdown,
  }) as unknown as CptsNoteEntry;

const inTree = (name: string) =>
  within(screen.getByTestId('notes-left-panel')).queryAllByText(name).length > 0;

function setup() {
  return render(
    <MemoryRouter initialEntries={['/field-manual']}>
      <CheatsheetView defaultMode="cpts-manual" />
    </MemoryRouter>,
  );
}

describe('field manual left panel', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('zerobox_obsidian_expanded_folders', JSON.stringify({}));
    resetNoteIndexCacheForTests();
    useCtfStore.setState({
      soundEnabled: false,
      customNotes: [
        mk('n1', 'Top/Mid/n1.md', 'intro\nthe zebrafish line'),
        mk('n2', 'Top/n2.md', 'plain text #web'),
      ],
      userNotes: [],
      deletedNoteIds: [],
    });
  });

  it('Expand all opens nested folders, Collapse all closes every one', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Expand all folders' }));
    expect(screen.getAllByTitle('Collapse folder')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all folders' }));
    expect(screen.queryAllByTitle('Collapse folder')).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('zerobox_obsidian_expanded_folders')!)).toEqual({});
  });

  it('folders stay collapsed after a note edit', async () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse all folders' }));
    await act(async () => {
      await useCtfStore.getState().updateNoteContent('n1', 'changed');
    });
    expect(screen.queryAllByTitle('Collapse folder')).toHaveLength(0);
  });

  it('ribbon Search focuses the input and lists body matches with a snippet', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    const box = screen.getByLabelText('Search field manual notes');
    expect(box).toHaveFocus();
    fireEvent.change(box, { target: { value: 'zebrafish' } });
    const results = screen.getByTestId('notes-search-results');
    expect(within(results).getByTitle('Open Obsidian Note: Note n1')).toBeInTheDocument();
    expect(within(results).queryByTitle('Open Obsidian Note: Note n2')).toBeNull();
    expect(within(results).getByTestId('note-match-snippets').textContent).toContain('the zebrafish line');
  });

  it('Search shows a hint for an empty query and "No results." for a miss', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByText('Type to search note text.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search field manual notes'), { target: { value: 'qqqqq' } });
    expect(screen.getByText('No results.')).toBeInTheDocument();
  });

  it('the Files tree ignores search text', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Expand all folders' }));
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    fireEvent.change(screen.getByLabelText('Search field manual notes'), { target: { value: 'zebrafish' } });
    fireEvent.click(screen.getByRole('button', { name: 'Files' }));
    expect(screen.getByTestId('notes-left-panel')).toHaveAttribute('data-state', 'open');
    expect(inTree('Note n1')).toBe(true);
    expect(inTree('Note n2')).toBe(true);
  });

  it('exactly one button is named Tags', () => {
    setup();
    expect(screen.getAllByRole('button', { name: 'Tags' })).toHaveLength(1);
  });

  it('selecting a tag switches back to Files filtered to that tag', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Expand all folders' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    fireEvent.click(screen.getByRole('button', { name: /^web\s*1$/ }));
    expect(screen.getByRole('button', { name: 'Clear tag filter' })).toHaveTextContent('× #web');
    expect(inTree('Note n2')).toBe(true);
    expect(inTree('Note n1')).toBe(false);
  });

  it('ribbon Files after Table returns the center to the note reader', () => {
    setup();
    fireEvent.click(screen.getByTitle('Quick Index Table'));
    expect(screen.getByText('Topic / folder')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.queryByText('Topic / folder')).toBeNull();
  });

  it('collapsing marks the panel closed, inert and hidden', () => {
    setup();
    const panel = screen.getByTestId('notes-left-panel');
    expect(panel).toHaveAttribute('data-state', 'open');
    fireEvent.click(within(panel).getByRole('button', { name: 'Collapse sidebar' }));
    expect(panel).toHaveAttribute('data-state', 'closed');
    expect(panel).toHaveAttribute('aria-hidden', 'true');
    expect(panel.hasAttribute('inert')).toBe(true);
  });

  it('the footer keeps the wipe button with its two-click confirm text', () => {
    setup();
    const wipe = screen.getByTestId('header-delete-notes-btn');
    expect(wipe).toHaveTextContent('Delete (2)');
    fireEvent.click(wipe);
    expect(screen.getByTestId('header-delete-notes-btn')).toHaveTextContent('Confirm Delete (2)?');
  });
});

describe('left panel search while the deferred query lags', () => {
  it('shows Searching... instead of No results. when results are pending', () => {
    const noop = () => {};
    const props = {
      view: 'search', onCollapse: noop, tree: [], expandedFolders: {}, onToggleFolder: noop,
      selectedPath: null, onSelectFolder: noop, onSelectNote: noop, langMode: 'en',
      onExpandAll: noop, onCollapseAll: noop, onNewNote: noop, onImport: noop,
      activeTag: null, onClearTag: noop, query: 'qqqqq', onQueryChange: noop, results: [],
      onOpenResult: noop, tags: new Map(), onSelectTag: noop, deletedCount: 0, onRestoreDeleted: noop,
      wipeArmed: false, wipeCount: 0, onWipeVault: noop, onShowCards: noop, onShowTable: noop,
      onBackToSnippets: noop,
    } as unknown as React.ComponentProps<typeof NotesLeftPanel>;
    const { rerender } = render(<NotesLeftPanel {...props} resultsPending />);
    expect(screen.queryByText('No results.')).toBeNull();
    expect(screen.getByText('Searching…')).toBeInTheDocument();
    rerender(<NotesLeftPanel {...props} resultsPending={false} />);
    expect(screen.getByText('No results.')).toBeInTheDocument();
  });
});

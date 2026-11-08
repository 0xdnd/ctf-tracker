import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

const mk = (id: string, rawMarkdown: string): CptsNoteEntry =>
  ({
    id,
    title: `Note ${id}`,
    category: 'Test',
    subCategory: '',
    summary: '',
    tags: [],
    tools: [],
    commands: [],
    rawMarkdown,
  }) as unknown as CptsNoteEntry;

const scrollIntoView = vi.fn();

const highlights = new Map<string, { range: Range }>();

class HighlightStub {
  range: Range;
  constructor(range: Range) {
    this.range = range;
  }
}

const inTree = (name: string) =>
  screen.queryAllByText(name).some((el) => !el.closest('[role="tab"], h1'));

function setup() {
  render(
    <MemoryRouter initialEntries={['/field-manual']}>
      <CheatsheetView defaultMode="cpts-manual" />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  return screen.getByLabelText('Search field manual notes');
}

describe('full-text search in the field manual sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('zerobox_obsidian_expanded_folders', JSON.stringify(['Test']));
    scrollIntoView.mockClear();
    highlights.clear();
    (globalThis as unknown as { Highlight: unknown }).Highlight = HighlightStub;
    Object.defineProperty(CSS, 'highlights', { value: highlights, configurable: true });
    Element.prototype.scrollIntoView = scrollIntoView;
    resetNoteIndexCacheForTests();
    useCtfStore.setState({
      soundEnabled: false,
      customNotes: [mk('A', 'intro\nuse the zebrafish trick here'), mk('B', 'nothing relevant')],
      userNotes: [],
      deletedNoteIds: [],
    });
  });

  it('keeps a body-only match with its line and a mark, and drops other notes', () => {
    const box = setup();
    fireEvent.change(box, { target: { value: 'zebrafish' } });

    expect(inTree('Note A')).toBe(true);
    expect(inTree('Note B')).toBe(false);
    const list = screen.getByTestId('note-match-snippets');
    expect(list.textContent).toContain('use the zebrafish trick here');
    expect(list.querySelector('mark')?.textContent).toBe('zebrafish');
  });

  it('opening the note from the tree marks one hit and scrolls once', () => {
    const box = setup();
    fireEvent.change(box, { target: { value: 'zebrafish' } });
    fireEvent.click(screen.getByTitle('Open Obsidian Note: Note A'));

    expect(document.querySelector('mark[data-search-hit]')).toBeNull();
    expect(highlights.get('search-hit')!.range.toString()).toBe('zebrafish');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('a 1-character query does not match a note on body text alone', () => {
    const box = setup();
    fireEvent.change(box, { target: { value: 'z' } });

    expect(screen.queryByTitle('Open Obsidian Note: Note A')).toBeNull();
    expect(screen.queryByTestId('note-match-snippets')).toBeNull();
  });

  it('clearing the box restores all notes and removes snippet lines', () => {
    const box = setup();
    fireEvent.change(box, { target: { value: 'zebrafish' } });
    fireEvent.change(box, { target: { value: '' } });

    expect(screen.queryByTestId('note-match-snippets')).toBeNull();
    expect(screen.getByText('Type to search note text.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Files' }));
    expect(inTree('Note A')).toBe(true);
    expect(inTree('Note B')).toBe(true);
  });
});

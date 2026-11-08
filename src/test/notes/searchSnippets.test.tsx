import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

const BODY = [
  '# Heading',
  'Plain intro line.',
  'First Kerberoast step here',
  'second kerberoast mention',
  'third KERBEROAST mention',
  'fourth kerberoast mention',
].join('\n');

const scrollIntoView = vi.fn();

const highlights = new Map<string, { range: Range }>();

class HighlightStub {
  range: Range;
  constructor(range: Range) {
    this.range = range;
  }
}

function setup(search: string) {
  render(
    <MemoryRouter initialEntries={['/cheatsheets']}>
      <CheatsheetView />
    </MemoryRouter>,
  );
  if (search) {
    fireEvent.change(screen.getByLabelText('Search cheatsheets and field manual notes'), {
      target: { value: search },
    });
  }
  fireEvent.click(screen.getByRole('button', { name: /Field manual/ }));
  fireEvent.click(screen.getAllByRole('button', { name: 'Table' })[0]);
}

describe('search results with context lines', () => {
  beforeEach(() => {
    localStorage.clear();
    scrollIntoView.mockClear();
    highlights.clear();
    (globalThis as unknown as { Highlight: unknown }).Highlight = HighlightStub;
    Object.defineProperty(CSS, 'highlights', { value: highlights, configurable: true });
    Element.prototype.scrollIntoView = scrollIntoView;
    resetNoteIndexCacheForTests();
    useCtfStore.setState({
      soundEnabled: false,
      customNotes: [mk('A', BODY), mk('B', 'nothing relevant')],
      userNotes: [],
      deletedNoteIds: [],
    });
  });

  it('shows up to 3 matching lines per row with the match in <mark>', () => {
    setup('kerberoast');
    const list = screen.getByTestId('note-match-snippets');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    const marks = list.querySelectorAll('mark');
    expect(marks).toHaveLength(3);
    expect(marks[0].textContent).toBe('Kerberoast');
    expect(items[0].textContent).toContain('First Kerberoast step here');
  });

  it('shows no snippet lines for an empty query', () => {
    setup('');
    expect(screen.queryByTestId('note-match-snippets')).toBeNull();
  });

  it('opening a row highlights one match in the note and scrolls to it once', () => {
    setup('kerberoast');
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(document.querySelector('mark[data-search-hit]')).toBeNull();
    expect(highlights.has('search-hit')).toBe(true);
    expect(highlights.get('search-hit')!.range.toString().toLowerCase()).toBe('kerberoast');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});

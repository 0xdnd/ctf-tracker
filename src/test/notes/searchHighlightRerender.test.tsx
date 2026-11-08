import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ObsidianTabContent } from '../../components/cheatsheet/ObsidianTabContent';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
}

const mk = (rawMarkdown: string): CptsNoteEntry =>
  ({
    id: 'A', title: 'Note A', category: 'Test', subCategory: '', summary: '',
    tags: [], tools: [], commands: [], rawMarkdown,
  }) as unknown as CptsNoteEntry;

const highlights = new Map<string, { range: Range }>();
class HighlightStub {
  range: Range;
  constructor(range: Range) {
    this.range = range;
  }
}

const element = (note: CptsNoteEntry) => (
  <MemoryRouter>
    <ObsidianTabContent
      note={note}
      isActive
      globalVars={{} as never}
      soundEnabled={false}
      onNavigateToNote={() => {}}
      highlightQuery="zebrafish"
    />
  </MemoryRouter>
);

describe('search-hit highlight does not mutate the note DOM', () => {
  beforeEach(() => {
    highlights.clear();
    (globalThis as unknown as { Highlight: unknown }).Highlight = HighlightStub;
    Object.defineProperty(CSS, 'highlights', { value: highlights, configurable: true });
    Element.prototype.scrollIntoView = vi.fn();
    resetNoteIndexCacheForTests();
  });

  it('renders exactly the new text after the body is edited following a highlight', () => {
    const { rerender } = render(element(mk('use the zebrafish trick here')));
    expect(highlights.get('search-hit')!.range.toString()).toBe('zebrafish');
    expect(document.querySelector('mark[data-search-hit]')).toBeNull();

    rerender(element(mk('use the zebrafish trick here and more')));
    const body = document.querySelector('[data-note-body]')!;
    expect(body.textContent).toBe('use the zebrafish trick here and more');
  });

  it('clears the highlight on unmount', () => {
    const { unmount } = render(element(mk('use the zebrafish trick here')));
    expect(highlights.has('search-hit')).toBe(true);
    unmount();
    expect(highlights.has('search-hit')).toBe(false);
  });
});

describe('search-hit highlight under StrictMode', () => {
  beforeEach(() => {
    highlights.clear();
    (globalThis as unknown as { Highlight: unknown }).Highlight = HighlightStub;
    Object.defineProperty(CSS, 'highlights', { value: highlights, configurable: true });
    Element.prototype.scrollIntoView = vi.fn();
    resetNoteIndexCacheForTests();
  });

  it('keeps the highlight after the mount, cleanup, re-run cycle', () => {
    render(<StrictMode>{element(mk('use the zebrafish trick here'))}</StrictMode>);
    expect(highlights.get('search-hit')).toBeDefined();
    expect(highlights.get('search-hit')!.range.toString()).toBe('zebrafish');
  });
});

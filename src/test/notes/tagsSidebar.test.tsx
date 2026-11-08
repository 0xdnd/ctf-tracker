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
  ({ id, title: `Note ${id}`, category: 'Test', rawMarkdown }) as unknown as CptsNoteEntry;

function setup() {
  return render(
    <MemoryRouter initialEntries={['/field-manual']}>
      <CheatsheetView defaultMode="cpts-manual" />
    </MemoryRouter>,
  );
}

const inTree = (name: string) =>
  screen.queryAllByText(name).some((el) => !el.closest('[role="tab"], h1'));

describe('tag filter in the field manual sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('zerobox_obsidian_expanded_folders', JSON.stringify(['Test']));
    resetNoteIndexCacheForTests();
    useCtfStore.setState({
      soundEnabled: false,
      customNotes: [mk('X', 'about #web'), mk('Y', 'about #web/sqli'), mk('Z', 'no tags here')],
      userNotes: [],
      deletedNoteIds: [],
    });
  });

  it('filters the tree to a tag and its nested children, and the chip clears it', () => {
    setup();
    expect(inTree('Note X') && inTree('Note Y') && inTree('Note Z')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    fireEvent.click(screen.getByRole('button', { name: /^web\s*2$/ }));

    expect(inTree('Note X')).toBe(true);
    expect(inTree('Note Y')).toBe(true);
    expect(inTree('Note Z')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Clear tag filter' }));
    expect(inTree('Note Z')).toBe(true);
    expect(screen.queryByRole('button', { name: 'Clear tag filter' })).toBeNull();
  });

  it('clicking a tag in an open note filters to it', () => {
    setup();
    fireEvent.click(screen.getAllByText('Note Y').find((el) => !el.closest('[role="tab"], h1'))!);
    fireEvent.click(screen.getByRole('button', { name: '#web/sqli' }));

    const chip = screen.getByRole('button', { name: 'Clear tag filter' });
    expect(within(chip).queryByText(/#web\/sqli/)).toBeTruthy();
    expect(chip.textContent).toBe('× #web/sqli');
    expect(inTree('Note Z')).toBe(false);
    expect(inTree('Note X')).toBe(false);

    fireEvent.click(chip);
    expect(inTree('Note Z')).toBe(true);
    expect(inTree('Note X')).toBe(true);
  });
});

describe('tag clicks in the secondary split pane', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('zerobox_obsidian_expanded_folders', JSON.stringify(['Test']));
    localStorage.setItem('zerobox_obsidian_open_tabs', JSON.stringify(['X']));
    localStorage.setItem('zerobox_obsidian_active_tab', 'X');
    localStorage.setItem('zerobox_workspace_is_split_v1', 'true');
    localStorage.setItem('zerobox_workspace_secondary_tabs_v1', JSON.stringify(['Y']));
    localStorage.setItem('zerobox_workspace_secondary_active_v1', 'Y');
    resetNoteIndexCacheForTests();
    useCtfStore.setState({
      soundEnabled: false,
      customNotes: [mk('X', 'about #web'), mk('Y', 'about #web/sqli'), mk('Z', 'no tags here')],
      userNotes: [],
      deletedNoteIds: [],
    });
  });

  it('filters when an inline tag is clicked in the secondary viewer', () => {
    setup();
    expect(screen.getByTestId('dual-split-workspace')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '#web/sqli' }));
    expect(screen.getByRole('button', { name: 'Clear tag filter' }).textContent).toBe('× #web/sqli');
    expect(inTree('Note Z')).toBe(false);
  });
});

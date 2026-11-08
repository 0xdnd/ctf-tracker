import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
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

const mk = (id: string): CptsNoteEntry =>
  ({ id, title: `Note ${id}`, category: 'Test', rawMarkdown: `body ${id}` }) as unknown as CptsNoteEntry;

let nav: ReturnType<typeof useNavigate>;
let loc: ReturnType<typeof useLocation>;
function Probe() {
  nav = useNavigate();
  loc = useLocation();
  return null;
}

const active = () => localStorage.getItem('zerobox_obsidian_active_tab');

function setup(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Probe />
      <CheatsheetView defaultMode="cpts-manual" />
    </MemoryRouter>,
  );
}

describe('?note= is one-shot', () => {
  beforeEach(() => {
    localStorage.clear();
    resetNoteIndexCacheForTests();
    useCtfStore.setState({
      soundEnabled: false,
      customNotes: [mk('A'), mk('B'), mk('C')],
      userNotes: [],
      deletedNoteIds: [],
    });
  });

  it('opens the note and strips note from the URL, keeping other params', async () => {
    setup('/field-manual?note=A&tab=x');
    expect(active()).toBe('A');
    expect(loc.search).not.toContain('note=');
    expect(loc.search).toContain('tab=x');
  });

  it('re-opens A when ?note=A is navigated to again after switching to B', async () => {
    setup('/field-manual?note=A');
    await act(async () => { nav('/field-manual?note=B'); });
    expect(active()).toBe('B');
    expect(loc.search).not.toContain('note=');
    await act(async () => { nav('/field-manual?note=A'); });
    expect(active()).toBe('A');
    expect(loc.search).not.toContain('note=');
  });

  it('does not pull the user off the active tab when another note is edited', async () => {
    setup('/field-manual?note=A');
    await act(async () => { nav('/field-manual?note=B'); });
    expect(active()).toBe('B');
    await act(async () => { await useCtfStore.getState().updateNoteContent('C', 'edited'); });
    expect(active()).toBe('B');
  });
});

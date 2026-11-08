import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, act, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { CheatsheetView } from '../../components/cheatsheet/CheatsheetView';
import { useCtfStore } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
import { rememberAppRoute, getLastAppRoute } from '../../utils/lastAppRoute';
import { SECTION_GUIDES } from '../../onboarding/content';
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

const mk = (id: string, rawMarkdown = `body ${id}`): CptsNoteEntry =>
  ({ id, title: `Note ${id}`, category: 'Test', rawMarkdown }) as unknown as CptsNoteEntry;

let loc: ReturnType<typeof useLocation>;
function Probe() {
  loc = useLocation();
  return null;
}

function setup(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Probe />
      <CheatsheetView defaultMode="cpts-manual" />
    </MemoryRouter>,
  );
}

// Uses App's two real routes so the redirect remounts the view, exactly as in production.
function setupRoutes(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Probe />
      <Routes>
        <Route path="/cheatsheets" element={<CheatsheetView />} />
        <Route path="/field-manual" element={<CheatsheetView defaultMode="cpts-manual" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('field manual shell navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetNoteIndexCacheForTests();
    useNotesWorkspaceStore.setState({ isNoteSwitcherOpen: false });
    useCtfStore.setState({
      soundEnabled: false,
      customNotes: [mk('A'), mk('B')],
      userNotes: [],
      deletedNoteIds: [],
    });
  });
  afterEach(() => cleanup());

  it('back returns to the remembered route', () => {
    sessionStorage.setItem('zerobox_last_app_route', '/analytics');
    setup('/field-manual');
    fireEvent.click(screen.getByRole('button', { name: 'Back to ZeroBox' }));
    expect(loc.pathname).toBe('/analytics');
  });

  it('back falls back to /tracker', () => {
    sessionStorage.clear();
    setup('/field-manual');
    fireEvent.click(screen.getByRole('button', { name: 'Back to ZeroBox' }));
    expect(loc.pathname).toBe('/tracker');
  });

  it('rememberAppRoute ignores notes paths', () => {
    rememberAppRoute('/x');
    rememberAppRoute('/notes?note=A');
    expect(getLastAppRoute()).toBe('/x');
  });

  it('empty vault shows the empty state inside the shell with back reachable', () => {
    useCtfStore.setState({ customNotes: [], userNotes: [] });
    setup('/field-manual');
    const shell = screen.getByTestId('field-manual-shell');
    expect(within(shell).getByTestId('notes-empty-state')).toBeInTheDocument();
    expect(screen.getByTestId('notes-left-panel')).toHaveAttribute('data-state', 'closed');
    expect(screen.getByRole('button', { name: 'Back to ZeroBox' })).toBeInTheDocument();
  });

  it('/cheatsheets?note=A redirects to /field-manual with A open after the remount', async () => {
    setupRoutes('/cheatsheets?note=A');
    await waitFor(() => expect(loc.pathname).toBe('/field-manual'));
    await waitFor(() => expect(screen.getByTestId('note-tab-A')).toHaveAttribute('aria-selected', 'true'));
    expect(loc.search).not.toContain('note=');
  });

  it('/cheatsheets?manual redirects to /field-manual', async () => {
    setupRoutes('/cheatsheets?manual=1');
    await waitFor(() => expect(loc.pathname).toBe('/field-manual'));
    expect(screen.getByTestId('field-manual-shell')).toBeInTheDocument();
  });

  it('wiping the vault on /field-manual stays in the shell', async () => {
    setup('/field-manual');
    fireEvent.click(screen.getByTestId('header-delete-notes-btn'));
    await act(async () => {
      fireEvent.click(screen.getByTestId('header-delete-notes-btn'));
    });
    expect(screen.getByTestId('notes-empty-state')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to ZeroBox' })).toBeInTheDocument();
  });

  it('/field-manual?category=web still renders the shell', () => {
    setup('/field-manual?category=web');
    expect(screen.getByTestId('field-manual-shell')).toBeInTheDocument();
  });

  it('ribbon Tags opens the tags list; pressing it again closes the sidebar', () => {
    useCtfStore.setState({ customNotes: [mk('A', 'about #recon'), mk('B')] });
    setup('/field-manual');
    const left = screen.getByTestId('notes-left-panel');
    expect(left).toHaveAttribute('data-state', 'open');
    expect(within(left).queryByText('recon')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    expect(screen.getByRole('button', { name: 'Tags' })).toHaveAttribute('aria-pressed', 'true');
    expect(left).toHaveAttribute('data-state', 'open');
    expect(within(left).getByText('recon')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));
    expect(localStorage.getItem('zerobox_obsidian_sidebar_open')).toBe('false');
    expect(left).toHaveAttribute('data-state', 'closed');
    expect(left).toHaveAttribute('aria-hidden', 'true');
    expect(left).toHaveAttribute('inert');
  });

  it('ribbon Search opens a closed sidebar and focuses the search field', () => {
    localStorage.setItem('zerobox_obsidian_sidebar_open', 'false');
    setup('/field-manual');
    expect(screen.getByTestId('notes-left-panel')).toHaveAttribute('data-state', 'closed');
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByTestId('notes-left-panel')).toHaveAttribute('data-state', 'open');
    expect(screen.getByLabelText('Search field manual notes')).toHaveFocus();
  });

  it('rememberAppRoute ignores legacy links that redirect into the field manual', () => {
    rememberAppRoute('/analytics');
    rememberAppRoute('/cheatsheets?note=A');
    rememberAppRoute('/cheatsheets?manual=1');
    rememberAppRoute('/cheatsheet?cpts');
    expect(getLastAppRoute()).toBe('/analytics');
    rememberAppRoute('/cheatsheets');
    expect(getLastAppRoute()).toBe('/cheatsheets');
  });

  it.each([
    ['empty vault', false],
    ['populated vault', true],
  ])('every field-manual guide anchor exists on /field-manual (%s)', (_name, populated) => {
    if (!populated) useCtfStore.setState({ customNotes: [], userNotes: [] });
    const { container } = setup('/field-manual');
    const steps = SECTION_GUIDES['field-manual'].steps ?? [];
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      expect(container.querySelector(`[data-tour="${step.anchor}"]`), `missing ${step.anchor}`).not.toBeNull();
    }
  });

  it('empty vault offers Restore only for deleted notes it still holds', async () => {
    useCtfStore.setState({ customNotes: [mk('A'), mk('B')], userNotes: [], deletedNoteIds: ['A', 'B', 'gone'] });
    setup('/field-manual');
    const empty = screen.getByTestId('notes-empty-state');
    expect(within(empty).getByRole('button', { name: 'Restore 2 deleted notes' })).toBeInTheDocument();
  });

  it('empty vault hides Restore when no deleted note would come back', async () => {
    useCtfStore.setState({ customNotes: [], userNotes: [], deletedNoteIds: ['A', 'B'] });
    setup('/field-manual');
    const empty = screen.getByTestId('notes-empty-state');
    expect(within(empty).queryByRole('button', { name: /Restore/ })).toBeNull();
  });

  it('ribbon Switcher opens the note switcher', () => {
    setup('/field-manual');
    fireEvent.click(screen.getByRole('button', { name: 'Quick switcher' }));
    expect(useNotesWorkspaceStore.getState().isNoteSwitcherOpen).toBe(true);
  });
});

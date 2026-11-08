import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../../App';
import { useCtfStore } from '../../store/useCtfStore';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
import { isFullscreenNotesPath, getShellChrome } from '../../utils/fullscreenRoutes';
import { isFirstRunTourExcludedPath, FIRST_RUN_KEY } from '../../onboarding/useFirstRunTour';
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

describe('full-screen field manual route gating', () => {
  it.each(['/field-manual', '/field-manual/', '/notes', '/NOTES'])('%s is full-screen', (p) =>
    expect(isFullscreenNotesPath(p)).toBe(true));

  it.each(['/cheatsheets', '/field-manual/x', '/notesx', '/'])('%s is not', (p) =>
    expect(isFullscreenNotesPath(p)).toBe(false));

  it('full-screen table', () =>
    expect(getShellChrome({ pathname: '/notes', isPopout: false, focusMode: true })).toEqual({
      header: false, sidebar: false, mobileNav: false, payloadBar: false, onboarding: true,
      backupReminder: true, backupPlacement: 'notes', notesDock: false, zenBanner: false, zenEscape: false,
      mainLayout: 'fullscreen',
    }));

  it('popout wins over full-screen', () =>
    expect(getShellChrome({ pathname: '/field-manual', isPopout: true, focusMode: false }).mainLayout).toBe('bare'));

  it('cheatsheets keeps chrome', () =>
    expect(getShellChrome({ pathname: '/cheatsheets', isPopout: false, focusMode: false })).toMatchObject({
      header: true, sidebar: true, mobileNav: true, payloadBar: true, notesDock: true, mainLayout: 'default',
    }));

  it('tour excludes notes paths', () => {
    expect(isFirstRunTourExcludedPath('/field-manual')).toBe(true);
    expect(isFirstRunTourExcludedPath('/notes/')).toBe(true);
    expect(isFirstRunTourExcludedPath('/cheatsheets')).toBe(false);
  });
});

describe('App chrome on full-screen routes', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetNoteIndexCacheForTests();
  });
  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
  });

  it('App at /field-manual renders the shell without header, sidebar, mobile nav or dock', async () => {
    localStorage.setItem(FIRST_RUN_KEY, '1');
    window.history.pushState({}, '', '/field-manual');
    useCtfStore.setState({ isHydrated: true, customNotes: [mk('A', 'body')], userNotes: [], deletedNoteIds: [] });
    render(<App />);
    expect(await screen.findByTestId('field-manual-shell', {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.queryByTestId('app-header')).toBeNull();
    expect(screen.queryByTestId('app-sidebar')).toBeNull();
    expect(screen.queryByTestId('app-mobile-nav')).toBeNull();
    expect(screen.queryByLabelText('Field Notes Workspace Dock')).toBeNull();
    expect(document.querySelector('main')).toHaveClass('p-0', 'overflow-hidden');
  }, 20000);

  it('App at /cheatsheets keeps header and sidebar (regression)', async () => {
    localStorage.setItem(FIRST_RUN_KEY, '1');
    window.history.pushState({}, '', '/cheatsheets');
    useCtfStore.setState({ isHydrated: true });
    render(<App />);
    expect(await screen.findByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
  });
});

describe('Back from a legacy share link', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetNoteIndexCacheForTests();
  });
  afterEach(() => {
    cleanup();
    window.history.pushState({}, '', '/');
  });

  it('does not loop back into the redirecting URL', async () => {
    localStorage.setItem(FIRST_RUN_KEY, '1');
    window.history.pushState({}, '', '/cheatsheets?note=A');
    useCtfStore.setState({ isHydrated: true, customNotes: [mk('A', 'body')], userNotes: [], deletedNoteIds: [] });
    render(<App />);
    expect(await screen.findByTestId('field-manual-shell')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back to ZeroBox' }));
    await waitFor(() => expect(window.location.pathname).toBe('/tracker'));
    await waitFor(() => expect(screen.queryByTestId('field-manual-shell')).toBeNull());
  });
});

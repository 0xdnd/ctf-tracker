import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheatsheetView } from '../../components/cheatsheet/CheatsheetView';
import { ObsidianNoteViewer } from '../../components/cheatsheet/ObsidianNoteViewer';
import { ObsidianTabContent } from '../../components/cheatsheet/ObsidianTabContent';
import { useCtfStore } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useToastStore } from '../../store/useToastStore';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
import { clearLegacyViewerPrefs } from '../../utils/notesViewerPrefs';
import { buildShareUrl } from '../../utils/shareLink';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import type { GlobalVariables } from '../../types';

if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IntersectionObserverStub;
}

const globalVars = {
  lhost: '10.10.14.42', lport: '4444', targetIp: '10.10.11.5', domain: 'corp.local', username: 'u', password: 'p',
} as unknown as GlobalVariables;

const mk = (id: string, rawMarkdown: string, extra: Partial<CptsNoteEntry> = {}): CptsNoteEntry =>
  ({ id, title: `Note ${id}`, category: 'Test', rawMarkdown, ...extra }) as unknown as CptsNoteEntry;

const n1 = mk('note-00--pt', '# Note note-00--pt\nbody one', { commands: ['echo one'] });
const n2 = mk('note-01--ad', 'body two');
const noteC = mk('C', '# Note C\n- [ ] one\n- [ ] two');

const openMenu = () => fireEvent.click(screen.getByTestId('note-more-menu-button'));

const renderViewer = (extra: Record<string, unknown> = {}) =>
  render(
    <ObsidianNoteViewer
      note={n1}
      openNotes={[n1, n2]}
      allAvailableNotes={[n1, n2]}
      globalVars={globalVars}
      soundEnabled={false}
      onClose={vi.fn()}
      onNavigateToNote={vi.fn()}
      onToggleSidebar={vi.fn()}
      onToggleRightPanel={vi.fn()}
      {...extra}
    />,
  );

const renderShellTab = (note: CptsNoteEntry, extra: Record<string, unknown> = {}) =>
  render(
    <div data-testid="tab">
      <ObsidianTabContent
        note={note}
        isActive
        globalVars={globalVars}
        soundEnabled={false}
        onNavigateToNote={vi.fn()}
        viewMode="reading"
        variant="shell"
        {...extra}
      />
    </div>,
  );

const stubMatchMedia = (matches: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
  );
};

beforeEach(() => {
  localStorage.clear();
  resetNoteIndexCacheForTests();
  useCtfStore.setState({ soundEnabled: false });
  useToastStore.setState({ toasts: [] } as never);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('note more menu', () => {
  it('font and language rows keep the menu open', () => {
    renderViewer();
    openMenu();
    fireEvent.click(screen.getByTestId('increase-font-size-button'));
    fireEvent.click(screen.getByTestId('increase-font-size-button'));
    expect(screen.getByTestId('font-size-indicator')).toHaveTextContent('xl');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('modal-lang-he'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('language row reports the change through onLanguageChange', () => {
    const onLanguageChange = vi.fn();
    renderViewer({ onLanguageChange });
    openMenu();
    fireEvent.click(screen.getByTestId('modal-lang-he'));
    expect(onLanguageChange).toHaveBeenCalledWith('he');
    fireEvent.click(screen.getByTestId('modal-lang-en'));
    expect(onLanguageChange).toHaveBeenLastCalledWith('en');
  });

  it('plain items close the menu; Escape closes and refocuses the trigger', () => {
    renderViewer();
    const trigger = screen.getByTestId('note-more-menu-button');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    openMenu();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByTestId('note-menu-copy-md'));
    expect(screen.queryByRole('menu')).toBeNull();

    openMenu();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('arrow keys move focus between menu rows and outside click closes', () => {
    renderViewer();
    openMenu();
    const items = screen.getAllByRole('menuitem');
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    expect(items[1]).toHaveFocus();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('copy markdown reads the live note text and toasts', () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    const live = { ...n1, rawMarkdown: '# Note note-00--pt\nlive text' } as CptsNoteEntry;
    renderViewer({ allAvailableNotes: [live, n2] });
    openMenu();
    fireEvent.click(screen.getByTestId('note-menu-copy-md'));
    expect(writeText).toHaveBeenCalledWith('# Note note-00--pt\nlive text');
    expect(useToastStore.getState().toasts.some((t) => t.message === 'Copied note markdown to clipboard')).toBe(true);
  });

  it('copy commands only shows for notes that have commands', () => {
    const { unmount } = renderViewer();
    openMenu();
    expect(screen.getByTestId('note-menu-copy-commands')).toBeInTheDocument();
    unmount();
    renderViewer({ note: n2, openNotes: [n2] });
    openMenu();
    expect(screen.queryByTestId('note-menu-copy-commands')).toBeNull();
  });

  it('Escape with no menu open keeps every tab', () => {
    const onClose = vi.fn();
    const onCloseTab = vi.fn();
    renderViewer({ onClose, onCloseTab });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(onCloseTab).not.toHaveBeenCalled();
  });

  it('Escape closes the popout window and Alt+M / Alt+F do nothing', () => {
    const onClose = vi.fn();
    renderViewer({ displayMode: 'popout', onClose });
    fireEvent.keyDown(window, { key: 'm', altKey: true });
    fireEvent.keyDown(window, { key: 'f', altKey: true });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape with the menu open only closes the menu, even in a popout', () => {
    const onClose = vi.fn();
    renderViewer({ displayMode: 'popout', onClose });
    openMenu();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('pin to all pages opens the dock without closing tabs', () => {
    useNotesWorkspaceStore.setState({ isOpen: false, isPinned: false });
    const onClose = vi.fn();
    renderViewer({ onClose });
    openMenu();
    fireEvent.click(screen.getByTestId('pin-to-global-workspace'));
    expect(useNotesWorkspaceStore.getState().isOpen).toBe(true);
    expect(useNotesWorkspaceStore.getState().isPinned).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect(
      useToastStore.getState().toasts.some((t) => t.message === 'Pinned. It stays open on other pages.'),
    ).toBe(true);
  });

  it('share copies a /field-manual link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderViewer();
    openMenu();
    fireEvent.click(screen.getByTestId('note-menu-share'));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toContain('/field-manual?note=note-00--pt');
    await waitFor(() => expect(useToastStore.getState().toasts.some((t) => t.message === 'Link copied')).toBe(true));
    expect(buildShareUrl('/field-manual?note=x')).toContain('/field-manual?note=x');
  });

  it('popout drops pin, open-in-new-window and right-panel toggle but keeps the rest', () => {
    renderViewer({ displayMode: 'popout' });
    expect(screen.queryByTestId('toggle-right-panel')).toBeNull();
    openMenu();
    expect(screen.queryByTestId('pin-to-global-workspace')).toBeNull();
    expect(screen.queryByTestId('popout-window-button')).toBeNull();
    expect(screen.getByTestId('note-menu-copy-md')).toBeInTheDocument();
  });

  it('delete asks for confirmation before deleting', async () => {
    const onDeleteNote = vi.fn();
    renderViewer({ onDeleteNote });
    openMenu();
    fireEvent.click(screen.getByTestId('note-menu-delete'));
    const { useConfirmStore } = await import('../../store/useConfirmStore');
    await waitFor(() => expect(useConfirmStore.getState().pending).not.toBeNull());
    expect(onDeleteNote).not.toHaveBeenCalled();
    useConfirmStore.getState().settle(true);
    await waitFor(() => expect(onDeleteNote).toHaveBeenCalledWith('note-00--pt', 'Note note-00--pt'));
  });
});

describe('slim note header', () => {
  it('shows the breadcrumb and drops the removed controls', () => {
    renderViewer();
    expect(screen.getByTestId('note-breadcrumb')).toHaveTextContent('Test');
    expect(screen.getByTestId('note-breadcrumb')).toHaveTextContent('Note note-00--pt');
    for (const id of ['toggle-dock-mode', 'toggle-maximize-button', 'toggle-split-horizontal', 'pin-to-global-workspace']) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
    expect(screen.queryByLabelText('Close viewer')).toBeNull();
    expect(screen.queryByText('Field manual')).toBeNull();
  });

  it('Edit opens split on wide screens and raw on narrow ones, via the media query', () => {
    stubMatchMedia(false);
    const first = renderViewer();
    fireEvent.click(screen.getByTitle('Switch to Edit View'));
    expect(screen.getAllByText('LIVE PREVIEW').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTitle('Obsidian rich formatted reading mode'));
    expect(screen.queryByTestId('markdown-editor-textarea')).toBeNull();
    first.unmount();

    stubMatchMedia(true);
    renderViewer();
    fireEvent.click(screen.getByTitle('Switch to Edit View'));
    expect(screen.getAllByTestId('markdown-editor-textarea').length).toBeGreaterThan(0);
    expect(screen.queryByText('LIVE PREVIEW')).toBeNull();
  });

  it('only the active pane shows the right-panel toggle in a split view', () => {
    const { rerender } = renderViewer({ isSplitView: true, isPaneActive: true });
    expect(screen.getAllByTestId('toggle-right-panel')).toHaveLength(1);
    rerender(
      <ObsidianNoteViewer
        note={n1}
        openNotes={[n1, n2]}
        globalVars={globalVars}
        soundEnabled={false}
        onClose={vi.fn()}
        onNavigateToNote={vi.fn()}
        onToggleRightPanel={vi.fn()}
        isSplitView
        isPaneActive={false}
      />,
    );
    expect(screen.queryByTestId('toggle-right-panel')).toBeNull();
  });
});

describe('single title in the shell variant', () => {
  it('one title: hidden matching h1, single heading in the tab', () => {
    renderShellTab(noteC);
    const tab = screen.getByTestId('tab');
    expect(within(tab).getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByTestId('note-title')).toHaveTextContent('Note C');
  });

  it('has no card buttons and renders the meta line', () => {
    const onTagClick = vi.fn();
    renderShellTab(mk('M', 'body', { tags: ['Recon'], difficulty: 'Core', dateModified: '2026-01-02', tools: ['toolx'] }), { onTagClick });
    expect(screen.queryByText('Report')).toBeNull();
    expect(screen.queryByTestId('export-writeup-report-btn')).toBeNull();
    expect(screen.queryByText('Edit Note')).toBeNull();
    const meta = screen.getByTestId('note-meta');
    fireEvent.click(within(meta).getByRole('button', { name: '#Recon' }));
    expect(onTagClick).toHaveBeenCalledWith('recon');
    expect(meta).toHaveTextContent('2026');
    expect(meta.querySelector('time')).toHaveAttribute('title', '2026-01-02');
    expect(meta).toHaveTextContent('toolx');
  });

  it('checkbox toggle flips the right line when the h1 is hidden', () => {
    const spy = vi.fn();
    useCtfStore.setState({ updateNoteContent: spy });
    renderShellTab(noteC);
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(spy).toHaveBeenCalledWith('C', '# Note C\n- [ ] one\n- [x] two');
  });

  it('a non-matching first h1 still renders', () => {
    renderShellTab(mk('D', '# Different\nbody'));
    expect(within(screen.getByTestId('tab')).getAllByRole('heading', { level: 1 })).toHaveLength(2);
  });

  it('only the first matching h1 outside a fence is hidden', () => {
    renderShellTab(mk('E', '```\n# Note E\n```\n# Note E\nbody\n# Note E'));
    const h1s = within(screen.getByTestId('tab')).getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(2);
  });

  it('dock variant keeps the card actions', () => {
    render(
      <ObsidianTabContent
        note={noteC}
        isActive
        globalVars={globalVars}
        soundEnabled={false}
        onNavigateToNote={vi.fn()}
        variant="dock"
      />,
    );
    expect(screen.getByTestId('export-writeup-report-btn')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });
});

describe('CheatsheetView wiring', () => {
  const setup = (path = '/field-manual?note=C') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <CheatsheetView defaultMode="cpts-manual" />
      </MemoryRouter>,
    );

  it('legacy modal prefs still show the note in the shell', () => {
    localStorage.setItem('zerobox_note_viewer_mode', 'modal');
    localStorage.setItem('zerobox_modal_maximized', 'true');
    localStorage.setItem('zerobox_docked_maximized', 'true');
    useCtfStore.setState({ customNotes: [noteC], userNotes: [], deletedNoteIds: [] });
    setup();
    expect(
      within(screen.getByTestId('field-manual-shell')).getByTestId('obsidian-note-viewer-docked'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(localStorage.getItem('zerobox_note_viewer_mode')).toBeNull();
    expect(localStorage.getItem('zerobox_modal_maximized')).toBeNull();
    expect(localStorage.getItem('zerobox_docked_maximized')).toBeNull();
  });

  it('Escape in a popout closes the window and keeps the stored tabs', () => {
    const close = vi.spyOn(window, 'close').mockImplementation(() => {});
    useCtfStore.setState({ customNotes: [noteC], userNotes: [], deletedNoteIds: [] });
    localStorage.setItem('zerobox_obsidian_open_tabs', JSON.stringify(['C']));
    setup('/field-manual?note=C&popout=true');
    expect(screen.getByTestId('standalone-popout-window')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(close).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('zerobox_obsidian_open_tabs') ?? '[]')).toEqual(['C']);
    close.mockRestore();
  });

  it('clearLegacyViewerPrefs removes only the legacy keys', () => {
    localStorage.setItem('zerobox_note_viewer_mode', 'docked');
    localStorage.setItem('zerobox_note_font_size', 'lg');
    clearLegacyViewerPrefs();
    expect(localStorage.getItem('zerobox_note_viewer_mode')).toBeNull();
    expect(localStorage.getItem('zerobox_note_font_size')).toBe('lg');
  });

  it('the menu language row switches the tree titles', () => {
    localStorage.setItem('zerobox_obsidian_expanded_folders', JSON.stringify(['Test']));
    useCtfStore.setState({
      customNotes: [mk('L', 'body', { title: 'Fallback L', titleEn: 'English L', titleHe: 'Hebrew L' })],
      userNotes: [],
      deletedNoteIds: [],
    });
    setup('/field-manual?note=L');
    const inTree = (name: string) => within(screen.getByTestId('notes-left-panel')).queryAllByText(name).length > 0;
    expect(inTree('English L')).toBe(true);
    openMenu();
    fireEvent.click(screen.getByTestId('modal-lang-he'));
    expect(inTree('Hebrew L')).toBe(true);
    expect(inTree('English L')).toBe(false);
    fireEvent.click(screen.getByTestId('modal-lang-en'));
    expect(inTree('English L')).toBe(true);
  });
});

describe('viewer header fixes', () => {
  it('a popout with the shell variant renders exactly one title heading', () => {
    renderViewer({ displayMode: 'popout', variant: 'shell' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('the breadcrumb separator before the sub-category hides with it on narrow screens', () => {
    renderViewer({ note: mk('S', 'body', { category: 'Cat', subCategory: 'SubCat' }) });
    const nav = screen.getByTestId('note-breadcrumb');
    const sub = within(nav).getByText('SubCat');
    const sep = sub.previousElementSibling as HTMLElement;
    expect(sep.textContent).toBe('/');
    expect(sep).toHaveClass('hidden', 'md:inline');
    expect(sub).toHaveClass('hidden', 'md:inline');
  });

  it('Escape already handled by a dialog or menu does not close the popout window', () => {
    const onClose = vi.fn();
    renderViewer({ displayMode: 'popout', onClose });
    const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    const stop = (ev: Event) => ev.preventDefault();
    document.body.addEventListener('keydown', stop, { once: true });
    document.body.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
  });
});

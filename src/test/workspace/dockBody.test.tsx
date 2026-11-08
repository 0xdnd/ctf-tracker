import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useNotesWorkspaceStore, cheatTabId } from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
import { PersistentNotesWorkspace } from '../../components/workspace/PersistentNotesWorkspace';
import { INITIAL_CHEATSHEET } from '../../data/cheatsheetsData';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
import { seedImportedNotes } from '../fixtures/userNoteFixtures';

Element.prototype.scrollIntoView = (() => {}) as typeof Element.prototype.scrollIntoView;

const RECON = '01-recon-port-scanning';
const WEB = '02-web-directory-fuzzing';

const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="location">{`${loc.pathname}${loc.search}`}</div>;
};

const renderDock = () =>
  render(
    <MemoryRouter initialEntries={['/tracker']}>
      <PersistentNotesWorkspace />
      <LocationProbe />
    </MemoryRouter>
  );

/** jsdom reports 0 for every clientWidth; give the dock body a real width to exercise the overlay paths. */
const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
const setDockWidth = (px: number) => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset?.testid === 'dock-body' ? px : 0;
    },
  });
};

const body = () => screen.getByTestId('dock-body');
const leftAside = () => within(body()).getByTestId('notes-left-panel');
const rightAside = () => within(body()).getByTestId('notes-right-sidebar');
const scrim = () => within(body()).queryByTestId('notes-drawer-scrim');

beforeEach(() => {
  localStorage.clear();
  resetNoteIndexCacheForTests();
  act(() => {
    useCtfStore.setState({ customNotes: [], cheatsheets: INITIAL_CHEATSHEET, userNotesHydrated: true, soundEnabled: false });
    seedImportedNotes();
    useNotesWorkspaceStore.setState({
      openTabIds: [RECON, WEB],
      activeTabId: RECON,
      isOpen: true,
      isPinned: true,
      dockSize: 'normal',
      viewMode: 'reading',
      language: 'en',
      dockLeftView: 'files',
      dockRightOpen: false,
      isNoteSwitcherOpen: false,
    });
  });
});
afterEach(() => {
  cleanup();
  if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
  else delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
});

describe('dock body on the field manual shell', () => {
  it('renders the ribbon, tab strip, note header, the note and the status bar, keeping tour anchors', () => {
    renderDock();
    const b = body();
    expect(within(b).getByTestId('notes-ribbon')).toBeInTheDocument();
    expect(within(b).getByTestId('dock-list-toggle')).toHaveAttribute('data-tour', 'notes-list-toggle');
    expect(b.querySelector('[data-tour="notes-tabs"]')).not.toBeNull();
    expect(document.querySelector('[data-tour="notes-views"]')).not.toBeNull();
    expect(within(b).getByTestId('dock-note-header')).toHaveTextContent('01 Recon');
    expect(within(b).getByTestId(`dock-tab-content-${RECON}`)).toBeInTheDocument();
    expect(within(b).getByTestId('notes-status-bar')).toHaveTextContent(/word/);
    // The shell variant shows one title, no outline chips.
    expect(within(within(b).getByTestId(`dock-tab-content-${RECON}`)).getByTestId('note-title')).toHaveTextContent('Network Discovery');
  });

  it('header keeps title, Pinned, width, pin, close and a Reading/Edit toggle', () => {
    renderDock();
    expect(screen.getByText('PINNED')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('dock-view-edit'));
    // Unmeasured width counts as wide: Edit opens the split editor.
    expect(useNotesWorkspaceStore.getState().viewMode).toBe('split');
    fireEvent.click(screen.getByTestId('dock-view-reading'));
    expect(useNotesWorkspaceStore.getState().viewMode).toBe('reading');
    fireEvent.click(screen.getByTitle(/Expand Width/));
    expect(useNotesWorkspaceStore.getState().dockSize).toBe('expanded');
    fireEvent.click(screen.getByLabelText('Close Notes Workspace'));
    expect(useNotesWorkspaceStore.getState().isOpen).toBe(false);
  });

  it('Edit opens the plain editor in a narrow dock', () => {
    setDockWidth(560);
    renderDock();
    fireEvent.click(screen.getByTestId('dock-view-edit'));
    expect(useNotesWorkspaceStore.getState().viewMode).toBe('raw');
  });

  it('the more menu carries language, size and the dock actions', () => {
    renderDock();
    fireEvent.click(within(body()).getByTestId('note-more-menu-button'));
    const menu = screen.getByRole('menu');
    expect(within(menu).getByTestId('note-menu-copy-commands')).toHaveTextContent('Copy commands (1)');
    expect(within(menu).getByTestId('dock-menu-templatize')).toBeInTheDocument();
    expect(within(menu).getByTestId('dock-menu-open-fullscreen')).toBeInTheDocument();
    expect(within(menu).getByTestId('pin-to-global-workspace')).toHaveTextContent('Unpin from all pages');
    fireEvent.click(within(menu).getByTestId('modal-lang-he'));
    expect(useNotesWorkspaceStore.getState().language).toBe('he');
    fireEvent.click(within(menu).getByTestId('increase-font-size-button'));
    expect(useNotesWorkspaceStore.getState().fontSize).toBe('lg');
  });

  it('inline Files toggle persists dockLeftView', () => {
    renderDock();
    expect(leftAside()).toHaveAttribute('data-state', 'open');
    expect(scrim()).toBeNull();
    fireEvent.click(screen.getByTestId('dock-list-toggle'));
    expect(useNotesWorkspaceStore.getState().dockLeftView).toBeNull();
    expect(leftAside()).toHaveAttribute('data-state', 'closed');
  });

  it('a narrow dock opens Files as an overlay with a scrim, closed on open and on Escape', () => {
    setDockWidth(560);
    renderDock();
    // The persisted inline choice does not pop an overlay over the note.
    expect(leftAside()).toHaveAttribute('data-state', 'closed');
    fireEvent.click(screen.getByTestId('dock-list-toggle'));
    expect(leftAside()).toHaveAttribute('data-state', 'open');
    expect(leftAside().className).toContain('absolute');
    expect(scrim()).not.toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(leftAside()).toHaveAttribute('data-state', 'closed');
    expect(useNotesWorkspaceStore.getState().isOpen).toBe(true);
    // The persisted choice is untouched by the overlay.
    expect(useNotesWorkspaceStore.getState().dockLeftView).toBe('files');
  });

  it('the normal dock on a 1366/1440 laptop (body ~650-690px) keeps Files inline', () => {
    setDockWidth(650);
    renderDock();
    expect(leftAside()).toHaveAttribute('data-state', 'open');
    expect(leftAside().className).not.toContain('absolute');
    expect(scrim()).toBeNull();
  });

  it('opening the dock on a persisted Search view does not steal focus; picking Search does', () => {
    act(() => useNotesWorkspaceStore.setState({ dockLeftView: 'search' }));
    renderDock();
    const input = screen.getByTestId('dock-search-input');
    expect(input).not.toHaveFocus();
    const ribbon = within(body()).getByTestId('notes-ribbon');
    fireEvent.click(within(ribbon).getByLabelText('Files'));
    fireEvent.click(within(ribbon).getByLabelText('Search'));
    expect(screen.getByTestId('dock-search-input')).toHaveFocus();
  });

  it('left inline and right overlay between 600 and 1000px; outline toggle opens the right drawer', () => {
    setDockWidth(900);
    renderDock();
    expect(leftAside()).toHaveAttribute('data-state', 'open');
    expect(leftAside().className).not.toContain('absolute');
    fireEvent.click(screen.getByTestId('dock-toggle-right-panel'));
    expect(rightAside()).toHaveAttribute('data-state', 'open');
    expect(rightAside().className).toContain('absolute');
    fireEvent.click(scrim() as HTMLElement);
    expect(rightAside()).toHaveAttribute('data-state', 'closed');
    // The inline left aside stays open after the drawer closed.
    expect(leftAside()).toHaveAttribute('data-state', 'open');
  });

  it('a wide dock keeps the right panel inline and persisted', () => {
    setDockWidth(1200);
    renderDock();
    fireEvent.click(screen.getByTestId('dock-toggle-right-panel'));
    expect(useNotesWorkspaceStore.getState().dockRightOpen).toBe(true);
    expect(rightAside().className).not.toContain('absolute');
    expect(within(rightAside()).getByTestId('right-panel-outline')).toBeInTheDocument();
  });

  it('Open in full screen goes to the field manual with the note', () => {
    renderDock();
    fireEvent.click(screen.getByTestId('dock-open-fullscreen'));
    expect(screen.getByTestId('location')).toHaveTextContent(`/field-manual?note=${RECON}`);
  });

  it('a cheatsheet tab has no menu, outline toggle or status bar, and full screen is disabled', () => {
    const nmap = INITIAL_CHEATSHEET[0];
    act(() => useNotesWorkspaceStore.setState({ openTabIds: [cheatTabId(nmap.id)], activeTabId: cheatTabId(nmap.id) }));
    renderDock();
    const b = body();
    expect(within(b).getByTestId('dock-note-header')).toHaveTextContent('Cheatsheets');
    expect(within(b).queryByTestId('note-more-menu-button')).toBeNull();
    expect(within(b).queryByTestId('dock-toggle-right-panel')).toBeNull();
    expect(within(b).queryByTestId('notes-status-bar')).toBeNull();
    expect(within(b).getByTestId('dock-open-fullscreen')).toBeDisabled();
  });

  it('ribbon New note opens the new-note modal', async () => {
    renderDock();
    fireEvent.click(screen.getByTestId('dock-ribbon-new-note'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});

describe('dock search and tags', () => {
  const ribbonBtn = (label: string) => within(within(body()).getByTestId('notes-ribbon')).getByLabelText(label);

  it('Search finds note text with matching lines and cheatsheets, and opens a hit', async () => {
    renderDock();
    fireEvent.click(ribbonBtn('Search'));
    const input = await screen.findByTestId('dock-search-input');
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'ffuf' } });
    const results = await screen.findByTestId('dock-search-results');
    await within(results).findByText('Web Content Discovery');
    expect(within(results).getAllByTestId('note-match-snippets').length).toBeGreaterThan(0);
    fireEvent.change(input, { target: { value: 'nmap' } });
    await within(results).findByRole('region', { name: 'Cheatsheets' });
    fireEvent.change(input, { target: { value: 'ffuf' } });
    fireEvent.click((await within(results).findByText('Web Content Discovery')).closest('button') as HTMLElement);
    expect(useNotesWorkspaceStore.getState().activeTabId).toBe(WEB);
  });

  it('Tags filters the Files list, hides cheatsheets, and clears', () => {
    renderDock();
    fireEvent.click(ribbonBtn('Tags'));
    const panel = screen.getByTestId('dock-tags-panel');
    fireEvent.click(within(panel).getByRole('button', { name: /nmap/ }));
    const list = document.querySelector<HTMLElement>('[data-dock-notes-list]') as HTMLElement;
    expect(list).not.toBeNull();
    expect(list.querySelector('[data-dock-list-tag]')).toHaveTextContent('#nmap');
    expect(list.querySelector(`[data-dock-list-item="${RECON}"]`)).not.toBeNull();
    expect(list.querySelector(`[data-dock-list-item="${WEB}"]`)).toBeNull();
    expect(list.querySelector('[data-dock-list-cheats-toggle]')).toBeNull();
    fireEvent.click(screen.getByTestId('dock-list-clear-tag'));
    expect(list.querySelector('[data-dock-list-tag]')).toBeNull();
    expect(list.querySelector('[data-dock-list-cheats-toggle]')).not.toBeNull();
  });

  it('a tag chip in the note filters the list by that tag', () => {
    renderDock();
    const tab = screen.getByTestId(`dock-tab-content-${RECON}`);
    fireEvent.click(within(tab).getByRole('button', { name: '#recon' }));
    expect(document.querySelector('[data-dock-list-tag]')).toHaveTextContent('#recon');
  });
});

describe('outline and search requests stay with their note', () => {
  const mkNote = (id: string, title: string) =>
    ({
      id,
      title,
      titleEn: title,
      category: 'Mine',
      rawCategory: 'Mine',
      subCategory: '',
      tags: [],
      commands: [],
      relPath: `${title}.md`,
      rawMarkdown: `# ${title}

## Alpha

shared marker text

## Beta

end`,
    }) as unknown as import('../../utils/obsidianManualUtils').CptsNoteEntry;
  const A = mkNote('req-a', 'Request A');
  const B = mkNote('req-b', 'Request B');
  let scrolledIn: string[] = [];
  const origScroll = Element.prototype.scrollIntoView;

  beforeEach(() => {
    scrolledIn = [];
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolledIn.push(this.closest('[data-tab-note-id]')?.getAttribute('data-tab-note-id') ?? '?');
    } as typeof Element.prototype.scrollIntoView;
    act(() => {
      useCtfStore.setState({ customNotes: [A, B] });
      useNotesWorkspaceStore.setState({ openTabIds: [A.id, B.id], activeTabId: A.id, dockRightOpen: true });
    });
  });
  afterEach(() => {
    Element.prototype.scrollIntoView = origScroll;
  });

  const frame = () =>
    act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });

  it('an outline click in one tab does not scroll or change the view of another tab', async () => {
    renderDock();
    fireEvent.click(within(rightAside()).getByRole('button', { name: 'Alpha' }));
    await frame();
    expect(scrolledIn).toContain(A.id);
    scrolledIn = [];
    act(() => useNotesWorkspaceStore.setState({ viewMode: 'raw' }));
    act(() => useNotesWorkspaceStore.getState().setActiveTab(B.id));
    await frame();
    expect(scrolledIn).not.toContain(B.id);
    expect(useNotesWorkspaceStore.getState().viewMode).toBe('raw');
  });

  it('a search hit scrolls once, not again when returning to its tab', async () => {
    renderDock();
    fireEvent.click(within(within(body()).getByTestId('notes-ribbon')).getByLabelText('Search'));
    fireEvent.change(screen.getByTestId('dock-search-input'), { target: { value: 'shared marker' } });
    const results = screen.getByTestId('dock-search-results');
    await within(results).findAllByText('Request A');
    fireEvent.click(results.querySelector(`[data-dock-search-note="${A.id}"]`) as HTMLElement);
    await frame();
    act(() => useNotesWorkspaceStore.getState().setActiveTab(B.id));
    await frame();
    scrolledIn = [];
    act(() => useNotesWorkspaceStore.getState().setActiveTab(A.id));
    await frame();
    expect(scrolledIn).not.toContain(A.id);
  });
});

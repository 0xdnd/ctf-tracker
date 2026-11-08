import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import mermaid from 'mermaid';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
import { PersistentNotesWorkspace } from '../../components/workspace/PersistentNotesWorkspace';
import NoteSwitcherModal from '../../components/notes/NoteSwitcherModal';
import { useTacticalHotkeys } from '../../hooks/useTacticalHotkeys';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
import { resetMermaidRenderer } from '../../utils/mermaidRenderer';
import { safeCopyToClipboard } from '../../utils/helpers';
import { INITIAL_CHEATSHEET } from '../../data/cheatsheetsData';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('mermaid', () => ({ default: { initialize: vi.fn(), render: vi.fn() } }));
vi.mock('../../utils/helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/helpers')>()),
  safeCopyToClipboard: vi.fn(() => Promise.resolve(true)),
}));

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
}
Element.prototype.scrollIntoView = (() => {}) as typeof Element.prototype.scrollIntoView;

const NOTE: CptsNoteEntry = {
  id: 'dock-features',
  title: 'Dock Features',
  titleEn: 'Dock Features',
  category: 'Mine',
  rawCategory: 'Mine',
  subCategory: '',
  tags: ['demo'],
  difficulty: 'Easy',
  summary: '',
  commands: [],
  relPath: 'Dock Features.md',
  rawMarkdown:
    '# Dock Features\n\n```mermaid\ngraph TD\n  A[Start] --> B\n```\n\n```bash\nnmap -sV 10.10.11.32\ncurl http://host/login\n```',
} as CptsNoteEntry;

const Harness: React.FC = () => {
  useTacticalHotkeys();
  return (
    <>
      <PersistentNotesWorkspace />
      <NoteSwitcherModal />
    </>
  );
};

const renderDock = () =>
  render(
    <MemoryRouter initialEntries={['/tracker']}>
      <Harness />
    </MemoryRouter>
  );

const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
const setDockWidth = (px: number) => {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset?.testid === 'dock-body' ? px : 0;
    },
  });
};

const press = (init: KeyboardEventInit, target: EventTarget = window) => {
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(ev);
  });
  return ev;
};

const body = () => screen.getByTestId('dock-body');
const leftAside = () => within(body()).getByTestId('notes-left-panel');
const tab = () => screen.getByTestId(`dock-tab-content-${NOTE.id}`);

beforeEach(() => {
  localStorage.clear();
  resetNoteIndexCacheForTests();
  resetMermaidRenderer();
  vi.mocked(mermaid.render).mockReset();
  vi.mocked(mermaid.render).mockResolvedValue({
    svg: '<svg id="zb-mermaid-x" xmlns="http://www.w3.org/2000/svg"><g><text>Start</text></g></svg>',
  } as Awaited<ReturnType<typeof mermaid.render>>);
  vi.mocked(safeCopyToClipboard).mockClear();
  act(() => {
    useCtfStore.setState({
      customNotes: [NOTE],
      userNotes: [],
      cheatsheets: INITIAL_CHEATSHEET,
      userNotesHydrated: true,
      soundEnabled: false,
      commandPaletteOpen: false,
      focusMode: false,
    } as never);
    useNotesWorkspaceStore.setState({
      openTabIds: [NOTE.id],
      activeTabId: NOTE.id,
      isOpen: true,
      isPinned: true,
      viewMode: 'reading',
      dockLeftView: 'files',
      dockRightOpen: false,
      isNoteSwitcherOpen: false,
      isSwitcherOpen: false,
      recentNoteIds: [NOTE.id],
    });
  });
});
afterEach(() => {
  cleanup();
  window.getSelection()?.removeAllRanges();
  if (original) Object.defineProperty(HTMLElement.prototype, 'clientWidth', original);
  else delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
});

describe('full field manual features in a dock tab', () => {
  it('renders a Mermaid diagram', async () => {
    renderDock();
    const diagram = await within(tab()).findByTestId('mermaid-diagram');
    expect(diagram.querySelector('svg')).not.toBeNull();
    expect(diagram.textContent).toContain('Start');
  });

  it('copies just the selected text of a code block', () => {
    renderDock();
    const head = Array.from(tab().querySelectorAll('pre')).find((p) => p.textContent?.includes('nmap'))!;
    expect(head).toBeTruthy();
    const text = head.firstChild!;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 4);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    act(() => {
      document.dispatchEvent(new Event('selectionchange'));
    });
    const button = within(head.parentElement!).getByRole('button', { name: /copy selection/i });
    fireEvent.mouseDown(button);
    fireEvent.click(button);
    expect(safeCopyToClipboard).toHaveBeenCalledWith('nmap');
  });
});

describe('Escape layering in the dock', () => {
  it('one Escape closes the overlay drawer, never the dock', () => {
    setDockWidth(560);
    renderDock();
    fireEvent.click(screen.getByTestId('dock-list-toggle'));
    expect(leftAside()).toHaveAttribute('data-state', 'open');
    (document.activeElement as HTMLElement | null)?.blur?.();
    press({ key: 'Escape' });
    expect(leftAside()).toHaveAttribute('data-state', 'closed');
    expect(useNotesWorkspaceStore.getState().isOpen).toBe(true);
    press({ key: 'Escape' });
    expect(useNotesWorkspaceStore.getState().isOpen).toBe(true);
  });

  it('with the search box focused, the first Escape blurs it and the second closes the drawer', () => {
    setDockWidth(560);
    renderDock();
    fireEvent.click(within(body()).getByLabelText('Search'));
    const input = screen.getByTestId('dock-search-input');
    expect(input).toHaveFocus();
    press({ key: 'Escape' }, input);
    expect(input).not.toHaveFocus();
    expect(leftAside()).toHaveAttribute('data-state', 'open');
    press({ key: 'Escape' });
    expect(leftAside()).toHaveAttribute('data-state', 'closed');
    expect(useNotesWorkspaceStore.getState().isOpen).toBe(true);
  });

  it('drawer + Ctrl+O switcher: Escape closes the switcher, then the drawer, and the dock stays open', () => {
    setDockWidth(560);
    renderDock();
    fireEvent.click(screen.getByTestId('dock-list-toggle'));
    press({ key: 'o', ctrlKey: true });
    expect(useNotesWorkspaceStore.getState().isNoteSwitcherOpen).toBe(true);
    expect(screen.getByRole('dialog', { name: 'Open note' })).toBeInTheDocument();
    press({ key: 'Escape' }, document.activeElement ?? window);
    expect(useNotesWorkspaceStore.getState().isNoteSwitcherOpen).toBe(false);
    expect(leftAside()).toHaveAttribute('data-state', 'open');
    (document.activeElement as HTMLElement | null)?.blur?.();
    press({ key: 'Escape' });
    expect(leftAside()).toHaveAttribute('data-state', 'closed');
    expect(useNotesWorkspaceStore.getState().isOpen).toBe(true);
  });

  it('Escape with the more menu open closes only the menu', () => {
    setDockWidth(560);
    renderDock();
    fireEvent.click(screen.getByTestId('dock-list-toggle'));
    fireEvent.click(within(body()).getByTestId('note-more-menu-button'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    press({ key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(leftAside()).toHaveAttribute('data-state', 'open');
  });

  it('Ctrl+O from the dock opens the chosen note as a dock tab', () => {
    act(() => useNotesWorkspaceStore.setState({ openTabIds: [], activeTabId: null }));
    renderDock();
    press({ key: 'o', ctrlKey: true });
    fireEvent.keyDown(screen.getByPlaceholderText('Find a note…'), { key: 'Enter' });
    expect(useNotesWorkspaceStore.getState().activeTabId).toBe(NOTE.id);
    expect(screen.getByTestId(`dock-tab-content-${NOTE.id}`)).toBeInTheDocument();
  });
});

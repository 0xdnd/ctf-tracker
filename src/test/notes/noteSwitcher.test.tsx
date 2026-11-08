import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, cleanup, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { useTacticalHotkeys } from '../../hooks/useTacticalHotkeys';
import NoteSwitcherModal from '../../components/notes/NoteSwitcherModal';
import { useCtfStore } from '../../store/useCtfStore';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useOnboardingStore } from '../../onboarding/useOnboardingStore';
import { resetNoteIndexCacheForTests } from '../../hooks/useNoteIndex';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
}
Element.prototype.scrollIntoView = vi.fn();

const mk = (id: string, title: string): CptsNoteEntry =>
  ({ id, title, titleEn: title, category: 'Test', rawMarkdown: `body ${id}`, relPath: `Test/${title}.md`, tags: [], commands: [] }) as unknown as CptsNoteEntry;

let loc: ReturnType<typeof useLocation>;
const Harness: React.FC = () => {
  useTacticalHotkeys();
  loc = useLocation();
  return <NoteSwitcherModal />;
};

const mount = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Harness />
    </MemoryRouter>
  );

const press = (init: KeyboardEventInit, target: EventTarget = window) => {
  const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(ev);
  });
  return ev;
};

const open = () => useNotesWorkspaceStore.getState().isNoteSwitcherOpen;

beforeEach(() => {
  resetNoteIndexCacheForTests();
  useCtfStore.setState({
    customNotes: [mk('a', 'Alpha'), mk('b', 'Beta'), mk('c', 'Gamma')],
    userNotes: [],
    deletedNoteIds: ['c'],
    commandPaletteOpen: false,
    reconAutomationModalOpen: false,
    focusMode: false,
  } as never);
  useNotesWorkspaceStore.setState({ recentNoteIds: [], isNoteSwitcherOpen: false, isOpen: false, openTabIds: [], activeTabId: null } as never);
});

afterEach(() => {
  cleanup();
  useOnboardingStore.setState({ tourActive: false } as never);
});

describe('Ctrl+O note switcher hotkey', () => {
  it('opens on Ctrl+O and Cmd+O and prevents default', () => {
    mount();
    const ev = press({ key: 'o', ctrlKey: true });
    expect(ev.defaultPrevented).toBe(true);
    expect(open()).toBe(true);
    act(() => useNotesWorkspaceStore.getState().closeNoteSwitcher());
    const ev2 = press({ key: 'o', metaKey: true });
    expect(ev2.defaultPrevented).toBe(true);
    expect(open()).toBe(true);
  });

  it('opens even with focus in an input', () => {
    mount();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    press({ key: 'o', ctrlKey: true }, input);
    expect(open()).toBe(true);
    input.remove();
  });

  it('does nothing while onboarding blocks shortcuts or the command palette is open', () => {
    mount();
    useOnboardingStore.setState({ tourActive: true } as never);
    press({ key: 'o', ctrlKey: true });
    expect(open()).toBe(false);
    useOnboardingStore.setState({ tourActive: false } as never);
    useCtfStore.setState({ commandPaletteOpen: true } as never);
    press({ key: 'o', ctrlKey: true });
    expect(open()).toBe(false);
  });
});

describe('NoteSwitcherModal', () => {
  it('renders nothing while closed', () => {
    mount();
    expect(screen.queryByRole('dialog', { name: 'Open note' })).toBeNull();
  });

  it('lists live recents in order when the query is empty, skipping deleted/unknown ids', () => {
    useNotesWorkspaceStore.setState({ recentNoteIds: ['b', 'c', 'zzz', 'a'], isNoteSwitcherOpen: true } as never);
    mount();
    const options = screen.getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining('Beta'),
      expect.stringContaining('Alpha'),
    ]);
  });

  it('filters by ranking when typing and never lists deleted notes', () => {
    useNotesWorkspaceStore.setState({ isNoteSwitcherOpen: true } as never);
    mount();
    const input = screen.getByPlaceholderText('Find a note…');
    fireEvent.change(input, { target: { value: 'gamma' } });
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    fireEvent.change(input, { target: { value: 'alpha' } });
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain('Alpha');
  });

  it('moves selection with arrows; Enter navigates, records recent and closes', () => {
    useNotesWorkspaceStore.setState({ recentNoteIds: ['a', 'b'], isNoteSwitcherOpen: true } as never);
    mount();
    const input = screen.getByPlaceholderText('Find a note…');
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('role', 'combobox');
    expect(input).toHaveAttribute('aria-controls', screen.getByRole('listbox').id);
    expect(input).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0].id);
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1].id);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(loc.pathname + loc.search).toBe('/field-manual?note=b');
    expect(useNotesWorkspaceStore.getState().recentNoteIds[0]).toBe('b');
    expect(open()).toBe(false);
  });

  it('Escape closes without navigating', () => {
    useNotesWorkspaceStore.setState({ recentNoteIds: ['a'], isNoteSwitcherOpen: true } as never);
    mount();
    press({ key: 'Escape' });
    expect(open()).toBe(false);
    expect(loc.pathname).toBe('/');
  });

  it('typing f or 1 in the input does not trigger single-key hotkeys', () => {
    useNotesWorkspaceStore.setState({ isNoteSwitcherOpen: true } as never);
    mount();
    const input = screen.getByPlaceholderText('Find a note…');
    input.focus();
    press({ key: 'f' }, input);
    press({ key: '1' }, input);
    expect(useCtfStore.getState().focusMode).toBe(false);
    expect(loc.pathname).toBe('/');
  });
});

describe('Ctrl+O routing with the side dock', () => {
  it('opens the note in the dock when it is open, without navigating', () => {
    useNotesWorkspaceStore.setState({ recentNoteIds: ['a', 'b'], isNoteSwitcherOpen: true, isOpen: true } as never);
    mount('/tracker');
    expect(screen.getByText('Open in side panel')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByPlaceholderText('Find a note…'), { key: 'Enter' });
    expect(loc.pathname).toBe('/tracker');
    expect(useNotesWorkspaceStore.getState().activeTabId).toBe('a');
    expect(useNotesWorkspaceStore.getState().openTabIds).toContain('a');
    expect(open()).toBe(false);
  });

  it('a click opens in the dock too; Shift+click navigates', () => {
    useNotesWorkspaceStore.setState({ recentNoteIds: ['a', 'b'], isNoteSwitcherOpen: true, isOpen: true } as never);
    mount('/tracker');
    fireEvent.click(screen.getAllByRole('option')[1]);
    expect(loc.pathname).toBe('/tracker');
    expect(useNotesWorkspaceStore.getState().activeTabId).toBe('b');
    act(() => useNotesWorkspaceStore.setState({ isNoteSwitcherOpen: true } as never));
    fireEvent.click(screen.getAllByRole('option')[0], { shiftKey: true });
    expect(loc.pathname + loc.search).toMatch(/^\/field-manual\?note=/);
  });

  it('Shift+Enter always navigates to the full-screen manual', () => {
    useNotesWorkspaceStore.setState({ recentNoteIds: ['a'], isNoteSwitcherOpen: true, isOpen: true } as never);
    mount('/tracker');
    fireEvent.keyDown(screen.getByPlaceholderText('Find a note…'), { key: 'Enter', shiftKey: true });
    expect(loc.pathname + loc.search).toBe('/field-manual?note=a');
    expect(useNotesWorkspaceStore.getState().openTabIds).not.toContain('a');
  });

  it('on the full-screen route it navigates even if the dock flag is set', () => {
    useNotesWorkspaceStore.setState({ recentNoteIds: ['b'], isNoteSwitcherOpen: true, isOpen: true } as never);
    mount('/field-manual');
    fireEvent.keyDown(screen.getByPlaceholderText('Find a note…'), { key: 'Enter' });
    expect(loc.pathname + loc.search).toBe('/field-manual?note=b');
  });

  it('with the dock closed it navigates', () => {
    useNotesWorkspaceStore.setState({ recentNoteIds: ['b'], isNoteSwitcherOpen: true, isOpen: false } as never);
    mount('/tracker');
    fireEvent.keyDown(screen.getByPlaceholderText('Find a note…'), { key: 'Enter' });
    expect(loc.pathname + loc.search).toBe('/field-manual?note=b');
  });
});

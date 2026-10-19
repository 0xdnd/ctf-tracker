import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  useNotesWorkspaceStore,
  resolveTabById,
  cheatTabId,
} from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
import { NotesWorkspaceTabStrip } from '../../components/workspace/NotesWorkspaceTabStrip';
import { PersistentNotesWorkspace } from '../../components/workspace/PersistentNotesWorkspace';
import { Sidebar } from '../../components/layout/Sidebar';
import { CommandPalette } from '../../components/layout/CommandPalette';
import { INITIAL_CHEATSHEET } from '../../data/cheatsheetsData';
import { seedImportedNotes } from '../fixtures/userNoteFixtures';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
Element.prototype.scrollIntoView = vi.fn();

const NMAP = INITIAL_CHEATSHEET.find((c) => c.id === 'nmap-quick')!;
const FFUF = INITIAL_CHEATSHEET.find((c) => c.id === 'ffuf-dir')!;

const resetStores = () => {
  act(() => {
    useCtfStore.setState({ customNotes: [], cheatsheets: INITIAL_CHEATSHEET, userNotesHydrated: false });
    seedImportedNotes();
    useNotesWorkspaceStore.setState({
      openTabIds: [],
      activeTabId: null,
      isOpen: false,
      isSwitcherOpen: false,
    });
  });
};

beforeEach(resetStores);
afterEach(cleanup);

describe('cheatsheet entry ids', () => {
  it('are explicit and unique, so cheat tab ids are stable', () => {
    const ids = INITIAL_CHEATSHEET.map((c) => c.id);
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('resolveTab', () => {
  it('resolves note ids, cheat ids and returns null for anything else', () => {
    const { resolveTab } = useNotesWorkspaceStore.getState();
    const note = resolveTab('01-recon-port-scanning');
    expect(note?.kind).toBe('note');
    const cheat = resolveTab(cheatTabId(NMAP.id));
    expect(cheat).toEqual({ kind: 'cheat', entry: expect.objectContaining({ id: NMAP.id }) });
    expect(resolveTab('cheat:does-not-exist')).toBeNull();
    expect(resolveTab('note-that-is-gone')).toBeNull();
    expect(resolveTab('')).toBeNull();
  });

  it('resolves a custom cheatsheet entry from the live store', () => {
    act(() => {
      useCtfStore.setState({
        cheatsheets: [
          { id: 'custom-1', title: 'Mine', category: 'custom', description: '', commandTemplate: 'id', tags: [], isCustom: true },
          ...INITIAL_CHEATSHEET,
        ],
      });
    });
    expect(resolveTabById('cheat:custom-1')?.kind).toBe('cheat');
  });
});

describe('toggleOpen / getActiveNote with only snippet tabs', () => {
  it('does not conjure a note or rewrite openTabIds', () => {
    const tabId = cheatTabId(NMAP.id);
    act(() => {
      useNotesWorkspaceStore.setState({ openTabIds: [tabId], activeTabId: tabId, isOpen: false });
    });

    act(() => useNotesWorkspaceStore.getState().toggleOpen());
    let s = useNotesWorkspaceStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s.openTabIds).toEqual([tabId]);
    expect(s.activeTabId).toBe(tabId);

    expect(s.getActiveNote()).toBeNull();
    expect(s.getOpenNotes()).toEqual([]);
    expect(s.getActiveTab()).toEqual({ kind: 'cheat', entry: expect.objectContaining({ id: NMAP.id }) });
    expect(s.getOpenTabs()).toHaveLength(1);

    act(() => useNotesWorkspaceStore.getState().toggleOpen());
    s = useNotesWorkspaceStore.getState();
    expect(s.isOpen).toBe(false);
    expect(s.openTabIds).toEqual([tabId]);
  });

  it('still seeds the first note when nothing resolvable is open', () => {
    act(() => useNotesWorkspaceStore.getState().toggleOpen());
    const s = useNotesWorkspaceStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s.openTabIds).toHaveLength(1);
    expect(s.getActiveNote()).not.toBeNull();
  });
});

describe('hydration-safe pruning', () => {
  it('prunes unresolved snippet ids immediately but keeps note ids until the vault has hydrated', () => {
    act(() => {
      useNotesWorkspaceStore.setState({
        openTabIds: ['pending-note', cheatTabId(NMAP.id), 'cheat:gone'],
        activeTabId: 'cheat:gone',
      });
    });

    act(() => useNotesWorkspaceStore.getState().pruneUnresolvedTabs());
    let s = useNotesWorkspaceStore.getState();
    expect(s.openTabIds).toEqual(['pending-note', cheatTabId(NMAP.id)]);
    expect(s.activeTabId).toBe(cheatTabId(NMAP.id));

    act(() => useCtfStore.setState({ userNotesHydrated: true }));
    act(() => useNotesWorkspaceStore.getState().pruneUnresolvedTabs());
    s = useNotesWorkspaceStore.getState();
    expect(s.openTabIds).toEqual([cheatTabId(NMAP.id)]);
  });

  it('never prunes inside the persist merge', () => {
    const config = (useNotesWorkspaceStore as any).persist;
    const merged = config
      .getOptions()
      .merge({ openTabIds: ['pending-note', 'cheat:gone'], activeTabId: 'pending-note' }, useNotesWorkspaceStore.getState());
    expect(merged.openTabIds).toEqual(['pending-note', 'cheat:gone']);
  });

  it('flags the vault as hydrated when loadUserNotesFromDb settles', async () => {
    expect(useCtfStore.getState().userNotesHydrated).toBe(false);
    await act(async () => {
      await useCtfStore.getState().loadUserNotesFromDb();
    });
    expect(useCtfStore.getState().userNotesHydrated).toBe(true);
  });
});

describe('open-tabs badge', () => {
  const renderSidebar = () =>
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>
    );

  it('counts only tabs that resolve and says "N open"', () => {
    act(() => {
      useNotesWorkspaceStore.setState({
        openTabIds: ['01-recon-port-scanning', cheatTabId(NMAP.id), 'ghost-note', 'cheat:gone'],
      });
    });
    renderSidebar();
    expect(screen.getByText('2 open')).toBeInTheDocument();
  });

  it('is hidden when no tab resolves', () => {
    act(() => {
      useNotesWorkspaceStore.setState({ openTabIds: ['ghost-note', 'cheat:gone'] });
    });
    renderSidebar();
    expect(screen.queryByText(/ open$/)).not.toBeInTheDocument();
  });
});

describe('snippet tab in the dock', () => {
  it('renders title, category, command with substituted variables and a copy button, plus a tab icon marker', () => {
    act(() => {
      useCtfStore.setState({ globalVars: { ...useCtfStore.getState().globalVars, targetIp: '10.10.10.99' } });
      useNotesWorkspaceStore.setState({
        openTabIds: [cheatTabId(NMAP.id)],
        activeTabId: cheatTabId(NMAP.id),
        isOpen: true,
      });
    });
    render(
      <MemoryRouter>
        <PersistentNotesWorkspace />
      </MemoryRouter>
    );

    const content = screen.getByTestId(`dock-tab-content-${cheatTabId(NMAP.id)}`);
    expect(within(content).getByRole('heading', { name: NMAP.title })).toBeInTheDocument();
    expect(within(content).getByText('01. Recon & Port Scanning')).toBeInTheDocument();
    expect(content.textContent).toContain('nmap -sC -sV -Pn --min-rate 2000 -oN nmap_quick.txt 10.10.10.99');
    expect(within(content).getByRole('button', { name: /copy command/i })).toBeInTheDocument();
    expect(document.querySelector('[data-tab-kind="cheat"]')).not.toBeNull();
  });
});

describe('command palette cheat hit', () => {
  it('opens the snippet as a dock tab instead of navigating away', () => {
    act(() => useCtfStore.setState({ commandPaletteOpen: true }));
    render(
      <MemoryRouter initialEntries={['/tracker']}>
        <CommandPalette />
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText('Command palette search input'), { target: { value: 'masscan' } });
    fireEvent.click(screen.getByText('Masscan High-Rate Subnet Sweeper'));

    const s = useNotesWorkspaceStore.getState();
    expect(s.openTabIds).toContain('cheat:masscan-rapid');
    expect(s.activeTabId).toBe('cheat:masscan-rapid');
    expect(s.isOpen).toBe(true);
    expect(useCtfStore.getState().commandPaletteOpen).toBe(false);
  });
});

describe('dock quick switcher', () => {
  const mountStrip = () =>
    render(
      <MemoryRouter>
        <NotesWorkspaceTabStrip />
      </MemoryRouter>
    );

  it('opens from the + button, groups results and supports arrows, Enter and Esc', () => {
    mountStrip();
    const plus = screen.getByRole('button', { name: 'Open anything' });
    expect(plus.getAttribute('title')).toContain('Alt+K');
    fireEvent.click(plus);

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'ffuf' } });

    // Notes come before Cheatsheets
    const groups = screen.getAllByRole('group').map((g) => g.getAttribute('aria-label'));
    expect(groups).toEqual(['Notes', 'Cheatsheets']);
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(options[0].textContent).toContain('Web Content Discovery');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');

    // Wrap around upward lands on the last option, which is a cheatsheet
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    const last = screen.getAllByRole('option').at(-1)!;
    expect(last).toHaveAttribute('aria-selected', 'true');

    fireEvent.change(input, { target: { value: FFUF.title } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const s = useNotesWorkspaceStore.getState();
    expect(s.openTabIds).toContain(cheatTabId(FFUF.id));
    expect(s.activeTabId).toBe(cheatTabId(FFUF.id));
    expect(s.isSwitcherOpen).toBe(false);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('closes on Escape and matches notes by tag', () => {
    mountStrip();
    act(() => useNotesWorkspaceStore.getState().setSwitcherOpen(true));
    const input = screen.getByRole('combobox');
    // "kerberos" is only a tag on the Kerberos fixture note and in its body
    fireEvent.change(input, { target: { value: 'active-directory' } });
    expect(screen.getAllByRole('option')[0].textContent).toContain('Kerberos Attacks');

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(useNotesWorkspaceStore.getState().isSwitcherOpen).toBe(false);
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

describe('active tab highlight and switcher lifecycle', () => {
  it('highlights the resolved active tab when the stored active id does not resolve yet', () => {
    act(() => {
      useNotesWorkspaceStore.setState({
        openTabIds: ['pending-note', cheatTabId(NMAP.id)],
        activeTabId: 'pending-note',
      });
    });
    render(
      <MemoryRouter>
        <NotesWorkspaceTabStrip />
      </MemoryRouter>
    );
    const tab = document.querySelector('[data-tab-kind="cheat"]') as HTMLElement;
    expect(tab.className).toContain('text-accent');
  });

  it('resets isSwitcherOpen whenever the dock closes', () => {
    act(() => useNotesWorkspaceStore.setState({ isOpen: true, isSwitcherOpen: true }));
    act(() => useNotesWorkspaceStore.getState().setIsOpen(false));
    expect(useNotesWorkspaceStore.getState().isSwitcherOpen).toBe(false);

    act(() => useNotesWorkspaceStore.setState({ isOpen: true, isSwitcherOpen: true }));
    act(() => useNotesWorkspaceStore.getState().toggleOpen());
    expect(useNotesWorkspaceStore.getState().isOpen).toBe(false);
    expect(useNotesWorkspaceStore.getState().isSwitcherOpen).toBe(false);

    act(() =>
      useNotesWorkspaceStore.setState({ isOpen: true, isSwitcherOpen: true, openTabIds: [cheatTabId(NMAP.id)], activeTabId: cheatTabId(NMAP.id) })
    );
    act(() => useNotesWorkspaceStore.getState().closeTab(cheatTabId(NMAP.id)));
    expect(useNotesWorkspaceStore.getState().isSwitcherOpen).toBe(false);
  });
});

describe('empty dock', () => {
  it('shows the switcher, a New note action and category shortcuts', () => {
    act(() => {
      useNotesWorkspaceStore.setState({ openTabIds: [], activeTabId: null, isOpen: true });
    });
    render(
      <MemoryRouter>
        <PersistentNotesWorkspace />
      </MemoryRouter>
    );
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'New note' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Recon & Port Scanning/ }).length).toBeGreaterThan(0);
  });
});

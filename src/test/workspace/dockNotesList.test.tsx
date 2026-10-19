import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useNotesWorkspaceStore, resolveTabById } from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
import { PersistentNotesWorkspace } from '../../components/workspace/PersistentNotesWorkspace';
import { DockQuickSwitcher } from '../../components/workspace/DockQuickSwitcher';
import { INITIAL_CHEATSHEET } from '../../data/cheatsheetsData';
import { FIXTURE_IMPORTED_NOTES, seedImportedNotes } from '../fixtures/userNoteFixtures';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

Element.prototype.scrollIntoView = (() => {}) as typeof Element.prototype.scrollIntoView;

const RECON = '01-recon-port-scanning';
const KERBEROS = '07-kerberos-attacks-master';

const authoredNote: CptsNoteEntry = {
  id: 'mine-1',
  title: 'My Pivot Cheats',
  titleEn: 'My Pivot Cheats',
  category: 'Mine',
  rawCategory: 'Mine',
  subCategory: '',
  tags: ['chisel'],
  difficulty: 'Easy',
  summary: 'Authored note',
  commands: [],
  relPath: 'My Pivot Cheats.md',
  rawMarkdown: '# My Pivot Cheats',
};

const renderDock = () =>
  render(
    <MemoryRouter>
      <PersistentNotesWorkspace />
    </MemoryRouter>
  );

const list = () => document.querySelector<HTMLElement>('[data-dock-notes-list]') as HTMLElement;
const item = (id: string) => list().querySelector<HTMLElement>(`[data-dock-list-item="${id}"]`);

beforeEach(() => {
  localStorage.clear();
  act(() => {
    useCtfStore.setState({
      customNotes: [],
      cheatsheets: INITIAL_CHEATSHEET,
      userNotesHydrated: true,
      notesImportModalOpen: false,
    });
    seedImportedNotes();
    useNotesWorkspaceStore.setState({
      openTabIds: [RECON],
      activeTabId: RECON,
      isOpen: true,
      isPinned: true,
      isSwitcherOpen: false,
      notesListCollapsed: false,
    });
  });
});
afterEach(cleanup);

describe('vault connection: switcher and tab resolution', () => {
  const renderSwitcher = () =>
    render(
      <MemoryRouter>
        <DockQuickSwitcher variant="popover" />
      </MemoryRouter>
    );
  const search = (q: string) => {
    fireEvent.change(screen.getByRole('combobox'), { target: { value: q } });
  };

  it('finds imported notes by title, tag, path and body', () => {
    renderSwitcher();
    search('kerberos attacks');
    expect(screen.getByRole('option', { name: /Kerberos Attacks/ })).toBeTruthy();
    search('ffuf'); // tag + body
    expect(screen.getByRole('option', { name: /Web Content Discovery/ })).toBeTruthy();
    search('07 Active Directory'); // relPath only
    expect(screen.getByRole('option', { name: /Kerberos Attacks/ })).toBeTruthy();
    search('GetUserSPNs'); // body only
    expect(screen.getByRole('option', { name: /Kerberos Attacks/ })).toBeTruthy();
  });

  it('resolves imported note ids as tabs', () => {
    expect(resolveTabById(KERBEROS)).toEqual({ kind: 'note', note: expect.objectContaining({ id: KERBEROS }) });
  });
});

describe('dock notes list', () => {
  it('shows imported notes grouped under folders with counts, highlights the active note and marks open tabs', () => {
    renderDock();
    // The active note's folder is revealed; the others stay collapsed.
    const active = item(RECON) as HTMLElement;
    expect(active).toBeTruthy();
    expect(active.getAttribute('data-active')).toBe('true');
    expect(active.getAttribute('data-open')).toBe('true');
    expect(item(KERBEROS)).toBeNull();
    const folder = within(list()).getByText('07 Active Directory').closest('[data-dock-list-folder]') as HTMLElement;
    expect(within(folder).getByText('1')).toBeTruthy();
    fireEvent.click(folder);
    expect(item(KERBEROS)).not.toBeNull();
    expect(item(KERBEROS)?.getAttribute('data-open')).toBeNull();
  });

  it('opens a note as a dock tab on click', () => {
    renderDock();
    fireEvent.click(list().querySelector('[data-dock-list-folder$="folder-07 Active Directory"]') as HTMLElement);
    fireEvent.click(item(KERBEROS) as HTMLElement);
    const s = useNotesWorkspaceStore.getState();
    expect(s.openTabIds).toEqual([RECON, KERBEROS]);
    expect(s.activeTabId).toBe(KERBEROS);
    expect(item(KERBEROS)?.getAttribute('data-active')).toBe('true');
  });

  it('puts authored notes under "My notes"', () => {
    act(() => useCtfStore.setState({ customNotes: [authoredNote] }));
    renderDock();
    const my = list().querySelector('[data-dock-list-folder="my"]') as HTMLElement;
    expect(my).toBeTruthy();
    expect(within(my).getByText('1')).toBeTruthy();
    expect(item('mine-1')).not.toBeNull();
  });

  it('filters by title, path and tags, and clears with Escape', () => {
    renderDock();
    const input = within(list()).getByRole('combobox', { name: 'Filter notes' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'kerberos' } });
    expect(item(KERBEROS)).not.toBeNull();
    expect(item(RECON)).toBeNull();
    fireEvent.change(input, { target: { value: '02 Web' } }); // by path
    expect(item('02-web-directory-fuzzing')).not.toBeNull();
    expect(item(KERBEROS)).toBeNull();
    fireEvent.change(input, { target: { value: 'nmap' } }); // by tag
    expect(item(RECON)).not.toBeNull();
    fireEvent.change(input, { target: { value: 'zzzz-nothing' } });
    expect(within(list()).getByText('Nothing matches')).toBeTruthy();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('');
  });

  it('moves with Up/Down and opens with Enter', () => {
    renderDock();
    const input = within(list()).getByRole('combobox', { name: 'Filter notes' });
    fireEvent.change(input, { target: { value: 'attacks' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' }); // folder row -> note row
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useNotesWorkspaceStore.getState().activeTabId).toBe(KERBEROS);
  });

  it('updates when the vault hydrates or an import lands', () => {
    act(() => {
      useCtfStore.setState({ userNotes: [], userNotesHydrated: false });
      useNotesWorkspaceStore.setState({ openTabIds: ['cheat:nmap-quick'], activeTabId: 'cheat:nmap-quick' });
    });
    renderDock();
    expect(list().querySelector('[data-dock-list-empty]')).not.toBeNull();
    act(() => {
      useCtfStore.setState({ userNotes: FIXTURE_IMPORTED_NOTES.map((n) => ({ ...n })), userNotesHydrated: true });
    });
    expect(list().querySelector('[data-dock-list-empty]')).toBeNull();
    expect(list().querySelectorAll('[data-dock-list-folder]').length).toBeGreaterThanOrEqual(3);
    // A later import adds to the same list.
    act(() => {
      useCtfStore.setState((s) => ({
        userNotes: [
          ...s.userNotes,
          { ...FIXTURE_IMPORTED_NOTES[0], id: 'late', title: 'Late Import', titleEn: 'Late Import', relPath: 'Late/Late Import.md' },
        ],
      }));
    });
    expect(list().querySelector('[data-dock-list-folder$="folder-Late"]')).not.toBeNull();
  });

  it('persists the collapsed state', () => {
    renderDock();
    expect(list()).not.toBeNull();
    fireEvent.click(screen.getByTestId('dock-list-toggle'));
    expect(useNotesWorkspaceStore.getState().notesListCollapsed).toBe(true);
    expect(document.querySelector('[data-dock-notes-list]')).toBeNull();
    const saved = JSON.parse(localStorage.getItem('zerobox_notes_workspace') || '{}');
    expect(saved.state.notesListCollapsed).toBe(true);
    fireEvent.click(screen.getByTestId('dock-list-toggle'));
    expect(document.querySelector('[data-dock-notes-list]')).not.toBeNull();
  });

  it('opens the import modal from the empty state and the footer', () => {
    act(() => useCtfStore.setState({ userNotes: [] }));
    renderDock();
    fireEvent.click(screen.getByTestId('dock-list-empty-import'));
    expect(useCtfStore.getState().notesImportModalOpen).toBe(true);
    act(() => useCtfStore.setState({ notesImportModalOpen: false }));
    fireEvent.click(screen.getByTestId('dock-list-import'));
    expect(useCtfStore.getState().notesImportModalOpen).toBe(true);
  });

  it('lists cheatsheets collapsed by default and opens them as cheat tabs', () => {
    renderDock();
    expect(list().querySelector('[data-dock-list-item^="cheat:"]')).toBeNull();
    fireEvent.click(list().querySelector('[data-dock-list-cheats-toggle]') as HTMLElement);
    const cat = list().querySelector('[data-dock-list-folder^="cheats:"]') as HTMLElement;
    expect(cat).toBeTruthy();
    fireEvent.click(cat);
    const entry = list().querySelector('[data-dock-list-item^="cheat:"]') as HTMLElement;
    fireEvent.click(entry);
    expect(useNotesWorkspaceStore.getState().activeTabId).toBe(entry.getAttribute('data-dock-list-item'));
  });

  it('windows large vaults instead of rendering every row', () => {
    const many: CptsNoteEntry[] = Array.from({ length: 600 }, (_, i) => ({
      ...FIXTURE_IMPORTED_NOTES[0],
      id: `bulk-${i}`,
      title: `Bulk ${i}`,
      titleEn: `Bulk ${i}`,
      relPath: `Bulk ${i}.md`,
      filename: `Bulk ${i}`,
    }));
    act(() => useCtfStore.setState({ userNotes: many }));
    renderDock();
    const rendered = list().querySelectorAll('[data-dock-list-item]').length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(80);
  });
});

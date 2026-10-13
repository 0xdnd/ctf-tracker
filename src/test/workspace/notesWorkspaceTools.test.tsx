import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
import { PersistentNotesWorkspace } from '../../components/workspace/PersistentNotesWorkspace';
import { searchNotes } from '../../components/workspace/NotesSearchPalette';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import type { GlobalVariables, Machine } from '../../types';
import { safeCopyToClipboard } from '../../utils/helpers';

vi.mock('../../utils/helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/helpers')>()),
  safeCopyToClipboard: vi.fn(() => Promise.resolve(true)),
}));

const vars: GlobalVariables = {
  lhost: '10.10.14.7',
  lport: '9001',
  targetIp: '10.10.11.5',
  interface: 'tun0',
  customVars: {},
};

const makeNote = (id: string, title: string, rawMarkdown: string, commands: string[] = []): CptsNoteEntry => ({
  id,
  title,
  titleEn: title,
  category: 'Lab',
  rawCategory: 'Lab',
  subCategory: '',
  tags: [],
  difficulty: 'Easy',
  summary: '',
  commands,
  relPath: `Lab/${title}.md`,
  rawMarkdown,
});

const NOTES = [
  makeNote('note-alpha', 'Alpha Checklist', 'connect to {TARGET} on port 8080', ['echo {LHOST}', 'connect to {TARGET} on port 8080']),
  makeNote('note-beta', 'Beta Notes', 'remember the blue lantern trick'),
  makeNote('note-gamma', 'Gamma Lantern Guide', 'plain text'),
];

const machine = { id: 'm-1', name: 'Lab Box', ip: '10.129.0.9' } as Machine;

function renderWorkspace() {
  return render(
    <BrowserRouter>
      <PersistentNotesWorkspace />
    </BrowserRouter>
  );
}

const desktopBar = () => screen.getAllByTestId('notes-target-bar')[0];

describe('notes workspace tools', () => {
  beforeEach(() => {
    vi.mocked(safeCopyToClipboard).mockClear();
    act(() => {
      useCtfStore.setState({ customNotes: NOTES, userNotes: [], globalVars: vars, machines: [machine], activeTargetId: 'm-1' });
      useNotesWorkspaceStore.setState({
        openTabIds: ['note-alpha'],
        activeTabId: 'note-alpha',
        isOpen: true,
        viewMode: 'reading',
        searchQuery: '',
        isSearchOpen: false,
      });
    });
  });

  describe('target bar', () => {
    it('shows the engaged target name, its IP and LHOST', () => {
      renderWorkspace();
      const bar = within(desktopBar());
      expect(bar.getByText('Lab Box')).toBeInTheDocument();
      expect(bar.getByText('10.129.0.9')).toBeInTheDocument();
      expect(bar.getByText('10.10.14.7')).toBeInTheDocument();
    });

    it('edits LHOST in place through setGlobalVars', () => {
      renderWorkspace();
      const bar = within(desktopBar());
      fireEvent.click(bar.getByRole('button', { name: /LHOST: 10\.10\.14\.7/ }));
      const input = bar.getByLabelText('Edit LHOST');
      fireEvent.change(input, { target: { value: '10.10.14.99' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(useCtfStore.getState().globalVars.lhost).toBe('10.10.14.99');
    });

    it('offers the global RHOST when no target is engaged', () => {
      act(() => useCtfStore.setState({ activeTargetId: null }));
      renderWorkspace();
      const bar = within(desktopBar());
      expect(bar.getByText('No target engaged')).toBeInTheDocument();
      fireEvent.click(bar.getByRole('button', { name: /RHOST: 10\.10\.11\.5/ }));
      const input = bar.getByLabelText('Edit RHOST');
      fireEvent.change(input, { target: { value: '10.10.11.77' } });
      fireEvent.blur(input);
      expect(useCtfStore.getState().globalVars.targetIp).toBe('10.10.11.77');
    });
  });

  describe('search', () => {
    it('ranks title matches before content matches', () => {
      const hits = searchNotes(NOTES, 'lantern');
      expect(hits.map((h) => h.note.id)).toEqual(['note-gamma', 'note-beta']);
      expect(hits[1].snippet).toContain('blue lantern');
    });

    it('opens with Alt+K, navigates with arrows and opens the note in a tab on Enter', async () => {
      renderWorkspace();
      fireEvent.keyDown(window, { key: 'k', code: 'KeyK', altKey: true });
      const input = await screen.findByRole('combobox', { name: 'Search notes by title or content' });
      fireEvent.change(input, { target: { value: 'lantern' } });
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
      fireEvent.keyDown(input, { key: 'Enter' });
      const ws = useNotesWorkspaceStore.getState();
      expect(ws.openTabIds).toContain('note-beta');
      expect(ws.activeTabId).toBe('note-beta');
      expect(ws.isSearchOpen).toBe(false);
    });

    it('closes on Escape', async () => {
      renderWorkspace();
      fireEvent.click(within(desktopBar()).getByRole('button', { name: 'Search notes' }));
      const input = await screen.findByRole('combobox');
      fireEvent.keyDown(input, { key: 'Escape' });
      await waitFor(() => expect(useNotesWorkspaceStore.getState().isSearchOpen).toBe(false));
    });
  });

  describe('copy all commands', () => {
    it('copies every command of the current note with variables resolved', () => {
      renderWorkspace();
      fireEvent.click(within(desktopBar()).getByRole('button', { name: 'Copy all commands' }));
      expect(safeCopyToClipboard).toHaveBeenCalledWith('echo 10.10.14.7\nconnect to 10.129.0.9 on port 8080');
    });

    it('is disabled for a note without commands and runs from Alt+C', () => {
      renderWorkspace();
      fireEvent.keyDown(window, { key: 'c', code: 'KeyC', altKey: true });
      expect(safeCopyToClipboard).toHaveBeenCalledTimes(1);
      act(() => useNotesWorkspaceStore.setState({ openTabIds: ['note-beta'], activeTabId: 'note-beta' }));
      expect(within(desktopBar()).getByRole('button', { name: 'Copy all commands' })).toBeDisabled();
    });
  });

  describe('new note', () => {
    it('opens the new-note modal from the bar', async () => {
      renderWorkspace();
      fireEvent.click(within(desktopBar()).getByRole('button', { name: 'New note' }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('opens the new-note modal from Alt+=', async () => {
      renderWorkspace();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.keyDown(window, { key: '=', code: 'Equal', altKey: true });
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });

    it('lists the shortcuts in the help tooltip', async () => {
      renderWorkspace();
      fireEvent.focus(within(desktopBar()).getByRole('button', { name: 'Notes keyboard shortcuts' }));
      const tip = await screen.findByRole('tooltip');
      expect(tip.textContent).toContain('Alt + K');
      expect(tip.textContent).toContain('Alt + =');
      expect(tip.textContent).toContain('Alt + C');
    });
  });
});

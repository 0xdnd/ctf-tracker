import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
import { useConfirmStore } from '../../store/useConfirmStore';
import { PersistentNotesWorkspace } from '../../components/workspace/PersistentNotesWorkspace';
import { seedImportedNotes } from '../fixtures/userNoteFixtures';

const ID = '01-recon-port-scanning';

describe('dock note delete', () => {
  beforeEach(() => {
    act(() => {
      useCtfStore.setState({ customNotes: [], soundEnabled: false });
      seedImportedNotes();
      useNotesWorkspaceStore.setState({
        openTabIds: [ID],
        activeTabId: ID,
        isOpen: true,
        isPinned: true,
        dockSize: 'normal',
        viewMode: 'reading',
        language: 'en',
      });
    });
  });
  afterEach(() => {
    act(() => useConfirmStore.getState().settle(false));
    cleanup();
  });

  const openDelete = () => {
    render(
      <BrowserRouter>
        <PersistentNotesWorkspace />
      </BrowserRouter>,
    );
    fireEvent.click(screen.getAllByTestId('note-more-menu-button')[0]);
    fireEvent.click(screen.getByTestId('note-menu-delete'));
  };

  it('keeps the note when the confirmation is declined', async () => {
    openDelete();
    await waitFor(() => expect(useConfirmStore.getState().pending).not.toBeNull());
    act(() => useConfirmStore.getState().settle(false));
    expect(useCtfStore.getState().userNotes.some((n) => n.id === ID)).toBe(true);
    expect(useNotesWorkspaceStore.getState().openTabIds).toContain(ID);
  });

  it('deletes the note and closes its tab once confirmed', async () => {
    openDelete();
    await waitFor(() => expect(useConfirmStore.getState().pending).not.toBeNull());
    act(() => useConfirmStore.getState().settle(true));
    await waitFor(() => expect(useCtfStore.getState().userNotes.some((n) => n.id === ID)).toBe(false));
    expect(useNotesWorkspaceStore.getState().openTabIds).not.toContain(ID);
  });
});

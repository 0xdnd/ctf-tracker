import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { useCtfStore } from '../../store/useCtfStore';
import { PersistentNotesWorkspace } from '../../components/workspace/PersistentNotesWorkspace';
import { INITIAL_CHEATSHEET } from '../../data/cheatsheetsData';
import { FIXTURE_IMPORTED_NOTES } from '../fixtures/userNoteFixtures';

Element.prototype.scrollIntoView = (() => {}) as typeof Element.prototype.scrollIntoView;

const renderDock = () =>
  render(
    <MemoryRouter>
      <PersistentNotesWorkspace />
    </MemoryRouter>
  );

const list = () => document.querySelector<HTMLElement>('[data-dock-notes-list]') as HTMLElement;

beforeEach(() => {
  localStorage.clear();
  act(() => {
    useCtfStore.setState({
      customNotes: [],
      cheatsheets: INITIAL_CHEATSHEET,
      notesImportModalOpen: false,
    });
    useNotesWorkspaceStore.setState({
      openTabIds: [],
      activeTabId: null,
      isOpen: true,
      isPinned: true,
      isSwitcherOpen: false,
      dockLeftView: 'files',
    });
  });
});
afterEach(cleanup);

describe('DockNotesList: userNotes hydration', () => {
  it('shows a stable, non-numeric placeholder (not a count) while userNotes is still loading', () => {
    act(() => {
      useCtfStore.setState({ userNotes: [], userNotesHydrated: false });
    });
    renderDock();

    expect(list().querySelector('[data-dock-list-empty]')).toBeNull();
    const pendingFolder = within(list())
      .getByText('Imported notes')
      .closest('[data-dock-list-folder]') as HTMLElement;
    expect(pendingFolder).toBeTruthy();
    expect(within(pendingFolder).getByText('…')).toBeTruthy();
    // No per-category folder should exist yet — only the single stable placeholder.
    expect(list().querySelectorAll('[data-dock-list-folder]').length).toBe(1);
  });

  it('replaces the placeholder with the real per-category folders and counts once hydrated, without ever showing a transient wrong count', () => {
    act(() => {
      useCtfStore.setState({ userNotes: [], userNotesHydrated: false });
    });
    renderDock();
    expect(screen.getByText('Imported notes')).toBeInTheDocument();

    act(() => {
      useCtfStore.setState({
        userNotes: FIXTURE_IMPORTED_NOTES.map((n) => ({ ...n })),
        userNotesHydrated: true,
      });
    });

    expect(screen.queryByText('Imported notes')).not.toBeInTheDocument();
    const folder = within(list()).getByText('01 Recon').closest('[data-dock-list-folder]') as HTMLElement;
    expect(within(folder).getByText('1')).toBeTruthy();
  });

  it('does not show the "No notes yet" empty state just because userNotes reads empty mid-hydration', () => {
    act(() => {
      useCtfStore.setState({ userNotes: [], userNotesHydrated: false });
    });
    renderDock();
    expect(screen.queryByTestId('dock-list-empty-import')).not.toBeInTheDocument();
  });

  it('shows the real empty state once hydration finishes and there truly are no notes', () => {
    act(() => {
      useCtfStore.setState({ userNotes: [], userNotesHydrated: true });
    });
    renderDock();
    expect(screen.getByTestId('dock-list-empty-import')).toBeInTheDocument();
  });
});

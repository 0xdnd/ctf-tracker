import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { PersistentNotesWorkspace } from '../../components/workspace/PersistentNotesWorkspace';
import { NotesWorkspaceTabStrip } from '../../components/workspace/NotesWorkspaceTabStrip';
import { MobileNav } from '../../components/layout/MobileNav';
import { Sidebar } from '../../components/layout/Sidebar';

describe('Persistent Multi-Tab Notes Workspace Engine', () => {
  beforeEach(() => {
    act(() => {
      useNotesWorkspaceStore.setState({
        openTabIds: ['01-recon-port-scanning'],
        activeTabId: '01-recon-port-scanning',
        isOpen: true,
        isPinned: true,
        dockSize: 'normal',
        viewMode: 'reading',
        language: 'en',
      });
    });
  });

  it('manages open tabs, tab switching, and closing cleanly with valid catalog notes', () => {
    const store = useNotesWorkspaceStore.getState();
    expect(store.openTabIds).toContain('01-recon-port-scanning');
    expect(store.activeTabId).toBe('01-recon-port-scanning');

    // getActiveNote and getOpenNotes resolve to real catalog objects
    const activeNote = store.getActiveNote();
    expect(activeNote).not.toBeNull();
    expect(activeNote?.title).toContain('Network Discovery');

    const openNotes = store.getOpenNotes();
    expect(openNotes).toHaveLength(1);
    expect(openNotes[0].id).toBe('01-recon-port-scanning');

    // Open a second tab
    act(() => {
      store.openNote('07-kerberos-attacks-master');
    });

    const updated = useNotesWorkspaceStore.getState();
    expect(updated.openTabIds).toEqual(['01-recon-port-scanning', '07-kerberos-attacks-master']);
    expect(updated.activeTabId).toBe('07-kerberos-attacks-master');
    expect(updated.isOpen).toBe(true);

    // Close first tab
    act(() => {
      updated.closeTab('01-recon-port-scanning');
    });

    const afterClose = useNotesWorkspaceStore.getState();
    expect(afterClose.openTabIds).toEqual(['07-kerberos-attacks-master']);
    expect(afterClose.activeTabId).toBe('07-kerberos-attacks-master');
  });

  it('toggles pinning across all pages and dock size', () => {
    const store = useNotesWorkspaceStore.getState();
    expect(store.isPinned).toBe(true);
    expect(store.dockSize).toBe('normal');

    act(() => {
      store.togglePinned();
    });
    expect(useNotesWorkspaceStore.getState().isPinned).toBe(false);

    act(() => {
      store.toggleDockSize();
    });
    expect(useNotesWorkspaceStore.getState().dockSize).toBe('expanded');
  });

  it('renders tab strip and allows switching active tab on click', () => {
    act(() => {
      useNotesWorkspaceStore.setState({
        openTabIds: ['01-recon-port-scanning', '02-web-directory-fuzzing'],
        activeTabId: '01-recon-port-scanning',
      });
    });

    render(
      <BrowserRouter>
        <NotesWorkspaceTabStrip />
      </BrowserRouter>
    );

    // Both tabs should be present with real catalog titles
    expect(screen.getByText(/Network Discovery/i)).toBeInTheDocument();
    expect(screen.getByText(/Web Content Discovery/i)).toBeInTheDocument();

    // Click second tab
    fireEvent.click(screen.getByText(/Web Content Discovery/i));
    expect(useNotesWorkspaceStore.getState().activeTabId).toBe('02-web-directory-fuzzing');
  });

  it('renders PersistentNotesWorkspace with toolbar controls and active note content', () => {
    render(
      <BrowserRouter>
        <PersistentNotesWorkspace />
      </BrowserRouter>
    );

    // Title and toolbar items
    expect(screen.getAllByText(/notes workspace/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/pinned/i)).toBeInTheDocument();

    // Note content is rendered (not "no active note selected" fallback)
    expect(screen.getAllByText(/Network Discovery/i).length).toBeGreaterThan(0);

    // Sizing and language buttons
    const langBtn = screen.getAllByTitle(/toggle english \/ hebrew/i)[0];
    expect(langBtn).toBeInTheDocument();
    fireEvent.click(langBtn);
    expect(useNotesWorkspaceStore.getState().language).toBe('he');
  });

  it('renders Notes tab with active counter in MobileNav', () => {
    act(() => {
      useNotesWorkspaceStore.setState({
        openTabIds: ['01-recon-port-scanning', '07-kerberos-attacks-master'],
        isOpen: false,
      });
    });

    render(
      <BrowserRouter>
        <MobileNav />
      </BrowserRouter>
    );

    const notesBtn = screen.getByText('Notes');
    expect(notesBtn).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Badge showing 2 tabs

    // Tapping notes button toggles open
    fireEvent.click(notesBtn);
    expect(useNotesWorkspaceStore.getState().isOpen).toBe(true);
  });

  it('renders Notes Workspace button with active counter in desktop Sidebar', () => {
    act(() => {
      useNotesWorkspaceStore.setState({
        openTabIds: ['01-recon-port-scanning', '02-web-directory-fuzzing'],
        isOpen: false,
      });
    });

    render(
      <BrowserRouter>
        <Sidebar />
      </BrowserRouter>
    );

    const sidebarNotesBtn = screen.getByLabelText('Notes Workspace');
    expect(sidebarNotesBtn).toBeInTheDocument();
    expect(screen.getByText('2 active')).toBeInTheDocument();

    // Clicking sidebar button toggles notes workspace open
    fireEvent.click(sidebarNotesBtn);
    expect(useNotesWorkspaceStore.getState().isOpen).toBe(true);
  });

  it('sanitizes stale legacy tab IDs in persist merge', () => {
    const store = useNotesWorkspaceStore.getState();
    const config = (useNotesWorkspaceStore as any).persist;

    // Simulate merging stale legacy state with '00_methodology_pt'
    const legacyState = {
      openTabIds: ['00_methodology_pt'],
      activeTabId: '00_methodology_pt',
      isOpen: true,
    };

    const merged = config.getOptions().merge(legacyState, store);
    expect(merged.openTabIds).toContain('01-recon-port-scanning');
    expect(merged.openTabIds).not.toContain('00_methodology_pt');
    expect(merged.activeTabId).toBe('01-recon-port-scanning');
  });
});

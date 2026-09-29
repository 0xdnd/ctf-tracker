import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useNotesWorkspaceStore } from '../../store/useNotesWorkspaceStore';
import { PersistentNotesWorkspace } from '../../components/workspace/PersistentNotesWorkspace';
import { NotesWorkspaceTabStrip } from '../../components/workspace/NotesWorkspaceTabStrip';
import { MobileNav } from '../../components/layout/MobileNav';

describe('Persistent Multi-Tab Notes Workspace Engine', () => {
  beforeEach(() => {
    act(() => {
      useNotesWorkspaceStore.setState({
        openTabIds: ['00_methodology_pt'],
        activeTabId: '00_methodology_pt',
        isOpen: true,
        isPinned: true,
        dockSize: 'normal',
        viewMode: 'reading',
        language: 'en',
      });
    });
  });

  it('manages open tabs, tab switching, and closing cleanly', () => {
    const store = useNotesWorkspaceStore.getState();
    expect(store.openTabIds).toContain('00_methodology_pt');
    expect(store.activeTabId).toBe('00_methodology_pt');

    // Open a second tab
    act(() => {
      store.openNote('07_kerberos');
    });

    const updated = useNotesWorkspaceStore.getState();
    expect(updated.openTabIds).toEqual(['00_methodology_pt', '07_kerberos']);
    expect(updated.activeTabId).toBe('07_kerberos');
    expect(updated.isOpen).toBe(true);

    // Close first tab
    act(() => {
      updated.closeTab('00_methodology_pt');
    });

    const afterClose = useNotesWorkspaceStore.getState();
    expect(afterClose.openTabIds).toEqual(['07_kerberos']);
    expect(afterClose.activeTabId).toBe('07_kerberos');
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
        openTabIds: ['00_methodology_pt', '01_nmap_network_discovery'],
        activeTabId: '00_methodology_pt',
      });
    });

    render(
      <BrowserRouter>
        <NotesWorkspaceTabStrip />
      </BrowserRouter>
    );

    // Both tabs should be present
    expect(screen.getByText(/00 methodology pt/i)).toBeInTheDocument();
    expect(screen.getByText(/01 nmap network discovery/i)).toBeInTheDocument();

    // Click second tab
    fireEvent.click(screen.getByText(/01 nmap network discovery/i));
    expect(useNotesWorkspaceStore.getState().activeTabId).toBe('01_nmap_network_discovery');
  });

  it('renders PersistentNotesWorkspace with toolbar controls and active note', () => {
    render(
      <BrowserRouter>
        <PersistentNotesWorkspace />
      </BrowserRouter>
    );

    // Title and toolbar items
    expect(screen.getAllByText(/notes workspace/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/pinned/i)).toBeInTheDocument();

    // Sizing and language buttons
    const langBtn = screen.getAllByTitle(/toggle english \/ hebrew/i)[0];
    expect(langBtn).toBeInTheDocument();
    fireEvent.click(langBtn);
    expect(useNotesWorkspaceStore.getState().language).toBe('he');
  });

  it('renders Notes tab with active counter in MobileNav', () => {
    act(() => {
      useNotesWorkspaceStore.setState({
        openTabIds: ['00_methodology_pt', '07_kerberos'],
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
});

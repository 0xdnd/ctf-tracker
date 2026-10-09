import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CheatsheetView } from '../../components/cheatsheet/CheatsheetView';
import { useCtfStore } from '../../store/useCtfStore';

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (typeof globalThis.IntersectionObserver === 'undefined') {
  class IntersectionObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = IntersectionObserverStub;
}

describe('Obsidian Workspace Architecture in CheatsheetView', () => {
  beforeEach(() => {
    localStorage.clear();
    useCtfStore.setState({
      soundEnabled: false,
      globalVars: {
        lhost: '10.10.14.42',
        lport: '4444',
        targetIp: '10.10.11.250',
        interface: 'tun0',
        customVars: {},
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders authentic Obsidian Vault Explorer sidebar and full-width workspace when defaultMode is cpts-manual', async () => {
    render(
      <MemoryRouter initialEntries={['/field-manual']}>
        <CheatsheetView defaultMode="cpts-manual" />
      </MemoryRouter>
    );

    // Vault header in sidebar
    expect(screen.getByText('FIELD MANUAL')).toBeInTheDocument();

    // View switcher pills: Notes, Cards, Table
    expect(screen.getByTitle('Obsidian Note Reader')).toBeInTheDocument();
    expect(screen.getByTitle('Cards Gallery')).toBeInTheDocument();
    expect(screen.getByTitle('Quick Index Table')).toBeInTheDocument();

    // Language switcher pills: EN, עב
    expect(screen.getByTitle('English Playbooks')).toBeInTheDocument();
    expect(screen.getByTitle('עברית')).toBeInTheDocument();

    // Filter input is available
    expect(screen.getByPlaceholderText(/files & folders/i)).toBeInTheDocument();
  });

  it('toggles Obsidian Vault Explorer sidebar open and closed via PanelLeft button and Ctrl+B', async () => {
    render(
      <MemoryRouter initialEntries={['/field-manual']}>
        <CheatsheetView defaultMode="cpts-manual" />
      </MemoryRouter>
    );

    const collapseBtn = screen.getByTitle('Collapse explorer (Ctrl+B)');
    expect(collapseBtn).toBeInTheDocument();

    // Click collapse button
    act(() => {
      fireEvent.click(collapseBtn);
    });

    // Sidebar gets hidden class and localStorage is updated
    expect(localStorage.getItem('zerobox_obsidian_sidebar_open')).toBe('false');

    // Press Ctrl+B to expand back
    act(() => {
      fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    });

    expect(localStorage.getItem('zerobox_obsidian_sidebar_open')).toBe('true');
  });

  it('switches between Cards, Table, and Notes views seamlessly', async () => {
    render(
      <MemoryRouter initialEntries={['/field-manual']}>
        <CheatsheetView defaultMode="cpts-manual" />
      </MemoryRouter>
    );

    // Click Table view pill
    const tablePill = screen.getByTitle('Quick Index Table');
    act(() => {
      fireEvent.click(tablePill);
    });

    // Table view headers should now be in document
    expect(screen.getByText('Topic / folder')).toBeInTheDocument();
    expect(screen.getByText('Title / objective')).toBeInTheDocument();

    // Click Cards view pill
    const cardsPill = screen.getByTitle('Cards Gallery');
    act(() => {
      fireEvent.click(cardsPill);
    });

    // Cards should be shown with read buttons
    const readButtons = screen.getAllByText(/Read ›/i);
    expect(readButtons.length).toBeGreaterThan(0);

    // Clicking Read › on a card opens note in Obsidian Reader
    act(() => {
      fireEvent.click(readButtons[0]);
    });

    // Tab strip container mounts
    await waitFor(() => {
      expect(screen.getByTestId('tab-strip-scroll-container')).toBeInTheDocument();
    });
  });

  it('filters folder tree in real time when typing in tree search filter', async () => {
    render(
      <MemoryRouter initialEntries={['/field-manual']}>
        <CheatsheetView defaultMode="cpts-manual" />
      </MemoryRouter>
    );

    const filterInput = screen.getByPlaceholderText(/files & folders/i);
    act(() => {
      fireEvent.change(filterInput, { target: { value: 'Methodology' } });
    });

    expect(filterInput).toHaveValue('Methodology');
    // Clear button (✕) appears
    const clearBtn = screen.getByText('✕');
    act(() => {
      fireEvent.click(clearBtn);
    });
    expect(filterInput).toHaveValue('');
  });

  it('auto-mounts active note viewer on initial field manual load and displays empty state when all tabs close', async () => {
    render(
      <MemoryRouter initialEntries={['/field-manual']}>
        <CheatsheetView defaultMode="cpts-manual" />
      </MemoryRouter>
    );

    // Tab strip should mount immediately with active note on initial load
    const tabStrip = await screen.findByTestId('tab-strip-scroll-container');
    expect(tabStrip).toBeInTheDocument();

    // Close the open tab
    const closeTabBtn = screen.getByTestId(/^close-tab-/);
    act(() => {
      fireEvent.click(closeTabBtn);
    });

    // Tab strip unmounts and empty state workspace is displayed
    expect(screen.queryByTestId('tab-strip-scroll-container')).not.toBeInTheDocument();
    const emptyState = screen.getByTestId('empty-obsidian-workspace');
    expect(emptyState).toBeInTheDocument();
    expect(screen.getByText('No Note Open')).toBeInTheDocument();

    // Clicking "Open First Playbook" button restores the note viewer
    const openFirstBtn = screen.getByTestId('empty-state-open-first-note');
    act(() => {
      fireEvent.click(openFirstBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('tab-strip-scroll-container')).toBeInTheDocument();
    });
  });

  it('provides persistent sidebar toggle and Notes switcher in Cards and Table HUD', async () => {
    render(
      <MemoryRouter initialEntries={['/field-manual']}>
        <CheatsheetView defaultMode="cpts-manual" />
      </MemoryRouter>
    );

    // Switch to Cards view
    const cardsPill = screen.getByTitle('Cards Gallery');
    act(() => {
      fireEvent.click(cardsPill);
    });

    // HUD toggle button is present
    const hudToggleBtn = screen.getByTestId('hud-toggle-sidebar-button');
    expect(hudToggleBtn).toBeInTheDocument();

    // Toggle sidebar off from HUD
    act(() => {
      fireEvent.click(hudToggleBtn);
    });
    expect(localStorage.getItem('zerobox_obsidian_sidebar_open')).toBe('false');

    // Toggle sidebar back on from HUD
    act(() => {
      fireEvent.click(hudToggleBtn);
    });
    expect(localStorage.getItem('zerobox_obsidian_sidebar_open')).toBe('true');

    // Switch back to Notes viewer via HUD Notes button
    const hudNotesBtn = screen.getByTitle('Switch to Obsidian Note Reader');
    act(() => {
      fireEvent.click(hudNotesBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('tab-strip-scroll-container')).toBeInTheDocument();
    });
  });
});

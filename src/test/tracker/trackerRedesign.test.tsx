import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TrackerView } from '../../components/tracker/TrackerView';
import { KanbanBoard } from '../../components/tracker/KanbanBoard';
import { TableView } from '../../components/tracker/TableView';
import { MachineDetailModal } from '../../components/tracker/MachineDetailModal';
import { FilterDrawer } from '../../components/layout/FilterDrawer';
import { useCtfStore } from '../../store/useCtfStore';
import type { Machine } from '../../types';

function makeMachine(overrides: Partial<Machine> = {}): Machine {
  return {
    id: 'box-1',
    name: 'Lame',
    ip: '10.10.10.3',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'recon',
    tags: ['smb', 'samba'],
    certifications: ['OSCP', 'CPTS'],
    roomUrl: '',
    timeSpentSeconds: 90,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Machine;
}

const wrap = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Wave 2 lane B - tracker redesign', () => {
  beforeEach(() => {
    useCtfStore.getState().resetFilters();
    useCtfStore.setState({
      machines: [makeMachine(), makeMachine({ id: 'box-2', name: 'Legacy', ip: '10.10.10.4', os: 'Windows', status: 'backlog', certifications: [] })],
      selectedMachineId: null,
      filterDrawerOpen: false,
      soundEnabled: false,
      viewMode: 'kanban',
      activeTargetId: null,
    });
  });

  describe('TrackerView toolbar', () => {
    it('keeps view switcher test ids and both search inputs mounted', () => {
      wrap(<TrackerView />);
      for (const id of ['view-kanban', 'view-table', 'view-grid', 'view-graph', 'view-kanban-mobile', 'view-table-mobile', 'view-grid-mobile']) {
        expect(screen.getByTestId(id)).toBeInTheDocument();
      }
      expect(document.getElementById('tracker-search-input')).not.toBeNull();
      expect(document.getElementById('tracker-search-input-mobile')).not.toBeNull();
    });

    it('replaces the seven track chips with a single track select and drops OS/difficulty/cert selects from the toolbar', () => {
      wrap(<TrackerView />);
      expect(document.getElementById('tracker-track-select')).not.toBeNull();
      expect(document.getElementById('htb-os-select')).toBeNull();
      expect(document.getElementById('htb-difficulty-select')).toBeNull();
      expect(document.getElementById('tracker-cert-select')).toBeNull();
    });

    it('opens the filter drawer from the Filters button and applies OS / difficulty / platform filters from it', () => {
      wrap(<TrackerView />);
      fireEvent.click(screen.getAllByRole('button', { name: /^Filters/ })[1]);
      expect(useCtfStore.getState().filterDrawerOpen).toBe(true);

      const dialog = screen.getByRole('dialog', { name: /Advanced filters drawer/i });
      fireEvent.click(within(within(dialog).getByRole('group', { name: 'Operating system' })).getByRole('button', { name: 'Windows' }));
      expect(useCtfStore.getState().filters.selectedOs).toBe('Windows');

      fireEvent.click(within(within(dialog).getByRole('group', { name: 'Difficulty' })).getByRole('button', { name: 'Hard' }));
      expect(useCtfStore.getState().filters.selectedDifficulty).toBe('Hard');

      fireEvent.click(within(within(dialog).getByRole('group', { name: 'Platform' })).getByRole('button', { name: 'THM' }));
      expect(useCtfStore.getState().filters.selectedPlatform).toBe('THM');
    });

    it('shows active-filter chips with a Clear all control', () => {
      useCtfStore.getState().setFilters({ selectedOs: 'Linux' });
      wrap(<TrackerView />);
      expect(screen.getByLabelText('Remove filter OS: Linux')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Clear all/i }));
      expect(useCtfStore.getState().filters.selectedOs).toBe('ALL');
    });

    it('status segmented control writes selectedStatus', () => {
      wrap(<TrackerView />);
      const group = screen.getByRole('group', { name: 'Target status' });
      fireEvent.click(within(group).getByRole('button', { name: 'Foothold' }));
      expect(useCtfStore.getState().filters.selectedStatus).toBe('FOOTHOLD');
    });

    it('empty result state is one sentence plus a reset CTA (no bracketed title)', () => {
      useCtfStore.getState().setFilters({ searchQuery: 'zzz-no-match' });
      wrap(<TrackerView />);
      expect(screen.queryByText(/NO MATCHING TARGETS/)).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /Reset filters/i }));
      expect(useCtfStore.getState().filters.searchQuery).toBe('');
    });
  });

  describe('FilterDrawer', () => {
    it('exposes platform, OS and difficulty groups', () => {
      useCtfStore.setState({ filterDrawerOpen: true });
      render(<FilterDrawer />);
      expect(screen.getByRole('group', { name: 'Platform' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Operating system' })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Difficulty' })).toBeInTheDocument();
    });
  });

  describe('KanbanBoard', () => {
    it('renders sentence-case lane titles with plain counts, no brackets', () => {
      wrap(<KanbanBoard filteredMachines={useCtfStore.getState().machines} />);
      expect(screen.getAllByText('Active recon').length).toBeGreaterThan(0);
      expect(screen.queryByText(/\[ \d+ \]/)).toBeNull();
      expect(screen.queryByText('BACKLOG')).toBeNull();
    });

    it('cards keep secondary actions mounted but hover-revealed via opacity only', () => {
      wrap(<KanbanBoard filteredMachines={[makeMachine()]} />);
      const advance = screen.getByRole('button', { name: /Advance Lame to foothold/i });
      const revealWrap = advance.parentElement as HTMLElement;
      expect(revealWrap.className).toContain('opacity-0');
      expect(revealWrap.className).toContain('group-hover:opacity-100');
      expect(revealWrap.className).toContain('group-focus-within:opacity-100');
      expect(revealWrap.className).not.toMatch(/\bhidden\b|invisible|pointer-events-none/);
      expect(screen.getByLabelText(/User flag pending for Lame/i)).toBeInTheDocument();
    });

    it('caps inline badges at two and groups the rest behind a +N pill', () => {
      wrap(<KanbanBoard filteredMachines={[makeMachine()]} />);
      // OS + difficulty inline, two certifications overflow
      expect(screen.getByRole('button', { name: '2 more' })).toBeInTheDocument();
    });

    it('empty backlog lane offers an Add machine CTA', () => {
      wrap(<KanbanBoard filteredMachines={[makeMachine()]} />);
      fireEvent.click(screen.getByRole('button', { name: /Add machine/i }));
      expect(useCtfStore.getState().newMachineModalOpen).toBe(true);
    });
  });

  describe('TableView below sm', () => {
    const original = window.matchMedia;
    beforeEach(() => {
      window.matchMedia = ((query: string) => ({
        matches: query.includes('max-width: 639px'),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as unknown as typeof window.matchMedia;
    });
    afterEach(() => {
      window.matchMedia = original;
    });

    it('renders stacked cards instead of a table', () => {
      wrap(<TableView filteredMachines={useCtfStore.getState().machines} />);
      expect(screen.getByTestId('table-stacked-cards')).toBeInTheDocument();
      expect(screen.queryByRole('table')).toBeNull();
    });
  });

  describe('MachineDetailModal', () => {
    beforeEach(() => {
      useCtfStore.setState({ selectedMachineId: 'box-1' });
    });

    it('renders the lifecycle as a stepper and keeps status handlers wired', () => {
      wrap(<MachineDetailModal />);
      const steps = screen.getByRole('list', { name: 'Attack lifecycle status' });
      const current = within(steps).getByRole('button', { name: /Recon/ });
      expect(current).toHaveAttribute('aria-current', 'step');
      fireEvent.click(within(steps).getByRole('button', { name: /Foothold/ }));
      expect(useCtfStore.getState().machines.find((m) => m.id === 'box-1')?.status).toBe('foothold');
    });

    it('groups sections in a tablist and switches tabs', () => {
      wrap(<MachineDetailModal />);
      const tablist = screen.getByRole('tablist', { name: 'Machine detail sections' });
      const checklistTab = within(tablist).getByRole('tab', { name: /Checklist/ });
      expect(within(tablist).getByRole('tab', { name: /Overview/ })).toHaveAttribute('aria-selected', 'true');
      act(() => {
        fireEvent.click(checklistTab);
      });
      expect(checklistTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});

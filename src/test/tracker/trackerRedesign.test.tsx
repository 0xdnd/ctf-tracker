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
import { PortTriageTable } from '../../components/tracker/PortTriageTable';
import * as imageStore from '../../utils/imageStore';
import { imageBackupProvider } from '../../utils/backupImageProvider';
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

    it('has no track dropdown in the toolbar and drops OS/difficulty/cert selects too', () => {
      wrap(<TrackerView />);
      expect(document.getElementById('tracker-track-select')).toBeNull();
      expect(screen.queryByRole('combobox', { name: 'Practice track' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Practice track' })).toBeNull();
      expect(document.getElementById('htb-os-select')).toBeNull();
      expect(document.getElementById('htb-difficulty-select')).toBeNull();
      expect(document.getElementById('tracker-cert-select')).toBeNull();
    });

    it('filters targets when a track chip is tapped, and clears when it is tapped again', () => {
      wrap(<TrackerView />);
      const group = screen.getByRole('group', { name: 'Choose a practice track' });
      fireEvent.click(within(group).getByRole('button', { name: /OSCP Track/ }));

      expect(useCtfStore.getState().filters.selectedTrack).toBe('tjnull-oscp');
      expect(useCtfStore.getState().filters.selectedTracks).toEqual(['tjnull-oscp']);
      expect(screen.getByText('Track: OSCP Track')).toBeInTheDocument();

      fireEvent.click(within(group).getByRole('button', { name: /OSCP Track/ }));
      expect(useCtfStore.getState().filters.selectedTracks).toEqual([]);
    });

    it('loads several tracks from ?track= and shows the MULTI chip without opening the drawer', () => {
      render(
        <MemoryRouter initialEntries={['/tracker?track=tjnull-oscp,nope,cpts-path']}>
          <TrackerView />
        </MemoryRouter>,
      );
      expect(useCtfStore.getState().filters.selectedTracks).toEqual(['tjnull-oscp', 'cpts-path']);
      expect(useCtfStore.getState().filters.selectedTrack).toBe('MULTI');
      expect(useCtfStore.getState().filterDrawerOpen).toBe(false);

      const multi = screen.getByRole('button', { name: /MULTI \(2\)/ });
      expect(multi).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(multi);
      expect(useCtfStore.getState().filterDrawerOpen).toBe(true);
    });

    it('still accepts a single track id in ?track=', () => {
      render(
        <MemoryRouter initialEntries={['/tracker?track=cpts-path']}>
          <TrackerView />
        </MemoryRouter>,
      );
      expect(useCtfStore.getState().filters.selectedTracks).toEqual(['cpts-path']);
      expect(useCtfStore.getState().filters.selectedTrack).toBe('cpts-path');
      expect(screen.queryByRole('button', { name: /MULTI/ })).toBeNull();
    });

    it('hide completed in the track strip toggles the status filter', () => {
      useCtfStore.getState().setFilters({ selectedTrack: 'tjnull-oscp', selectedTracks: ['tjnull-oscp'] });
      wrap(<TrackerView />);
      const toggle = screen.getByRole('button', { name: 'Hide completed' });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
      fireEvent.click(toggle);
      expect(useCtfStore.getState().filters.selectedStatus).toBe('UNCOMPLETED');
      expect(screen.getByRole('button', { name: 'Hide completed' })).toHaveAttribute('aria-pressed', 'true');
      fireEvent.click(screen.getByRole('button', { name: 'Hide completed' }));
      expect(useCtfStore.getState().filters.selectedStatus).toBe('ALL');
    });

    it('synchronizes selectedTrack and selectedTracks bidirectionally in useCtfStore', () => {
      const store = useCtfStore.getState();
      
      // Setting single track syncs array
      store.setFilters({ selectedTrack: 'cpts-path' });
      expect(useCtfStore.getState().filters.selectedTrack).toBe('cpts-path');
      expect(useCtfStore.getState().filters.selectedTracks).toEqual(['cpts-path']);

      // Resetting to ALL clears array
      store.setFilters({ selectedTrack: 'ALL', selectedTracks: [] });
      expect(useCtfStore.getState().filters.selectedTrack).toBe('ALL');
      expect(useCtfStore.getState().filters.selectedTracks).toEqual([]);

      // Multiple tracks normalizes selectedTrack to MULTI
      store.setFilters({ selectedTracks: ['tjnull-oscp', 'cpts-path'] });
      expect(useCtfStore.getState().filters.selectedTrack).toBe('MULTI');
      expect(useCtfStore.getState().filters.selectedTracks).toEqual(['tjnull-oscp', 'cpts-path']);
    });

    it('opens the filter drawer from the Filters button and applies OS / difficulty / platform filters from it', async () => {
      wrap(<TrackerView />);
      fireEvent.click(screen.getAllByRole('button', { name: /^Filters/ })[1]);
      expect(useCtfStore.getState().filterDrawerOpen).toBe(true);

      const dialog = await screen.findByRole('dialog', { name: /Advanced filters drawer/i }, { timeout: 10000 });
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

    it('readiness panel is collapsed by default and toggles on demand', () => {
      wrap(<TrackerView />);
      // Not mounted by default (uncluttered view)
      expect(screen.queryByRole('region', { name: 'Readiness summary' })).toBeNull();

      // Click toolbar Readiness button to expand
      const readinessBtn = screen.getAllByRole('button', { name: 'Toggle readiness panel' })[0];
      fireEvent.click(readinessBtn);
      expect(screen.getByRole('region', { name: 'Readiness summary' })).toBeInTheDocument();

      // Click dismiss button to collapse
      fireEvent.click(screen.getByRole('button', { name: 'Close readiness overview' }));
      expect(screen.queryByRole('region', { name: 'Readiness summary' })).toBeNull();
    });

    it('opens Bulk Import modal from toolbar button', () => {
      wrap(<TrackerView />);
      const bulkImportBtn = screen.getAllByRole('button', { name: 'Bulk import scan records' })[0];
      fireEvent.click(bulkImportBtn);
      expect(screen.getByRole('dialog', { name: 'Import multiple records' })).toBeInTheDocument();
    });

    it('toggles review due filter and shows active filter chip', () => {
      useCtfStore.setState({
        machines: [
          makeMachine({ id: 'box-due', status: 'root', nextReviewAt: Date.now() - 1000 }),
        ],
      });
      wrap(<TrackerView />);
      // Open readiness panel
      fireEvent.click(screen.getAllByRole('button', { name: 'Toggle readiness panel' })[0]);

      // Click review due
      const reviewDueBtn = screen.getByRole('button', { name: /Due for review/i });
      fireEvent.click(reviewDueBtn);
      expect(useCtfStore.getState().filters.searchQuery).toContain('review:due');
      expect(screen.getByLabelText('Remove filter Due for review')).toBeInTheDocument();

      // Remove filter via chip
      fireEvent.click(screen.getByLabelText('Remove filter Due for review'));
      expect(useCtfStore.getState().filters.searchQuery).not.toContain('review:due');
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

  describe('Port triage tcp/udp independence (regression)', () => {
    it('keeps 53/tcp and 53/udp triage rows independent while legacy numeric keys stay readable', () => {
      const machine = makeMachine({
        id: 'box-triage',
        services: [
          { port: 53, protocol: 'tcp', state: 'open', service: 'dns' },
          { port: 53, protocol: 'udp', state: 'open', service: 'dns' },
        ],
        // Legacy numeric row (pre-fix data) must still render as the tcp fallback.
        portTriage: { '53': { status: 'checking', note: 'legacy tcp note' } },
      });
      useCtfStore.setState({ machines: [machine] });
      wrap(<PortTriageTable machine={machine} />);

      // Both protocol rows render, and the legacy note is visible via fallback on both
      // rows until udp gets its own composite entry.
      expect(screen.getByText('53/tcp')).toBeTruthy();
      expect(screen.getByText('53/udp')).toBeTruthy();
      expect(screen.getAllByDisplayValue('legacy tcp note')).toHaveLength(2);

      const store = useCtfStore.getState();
      store.setPortTriage('box-triage', '53/tcp', { status: 'key_vector', note: 'tcp zone transfer' });
      store.setPortTriage('box-triage', '53/udp', { status: 'dead_end', note: 'udp filtered' });

      const updated = useCtfStore.getState().machines.find((m) => m.id === 'box-triage')!;
      expect(updated.portTriage?.['53/tcp']).toMatchObject({ status: 'key_vector' });
      expect(updated.portTriage?.['53/udp']).toMatchObject({ status: 'dead_end' });
      expect(updated.portTriage?.['53/tcp']?.note).not.toBe(updated.portTriage?.['53/udp']?.note);
    });

    it('truncates triage notes to 2000 chars', () => {
      useCtfStore.setState({ machines: [makeMachine({ id: 'box-triage-2' })] });
      useCtfStore.getState().setPortTriage('box-triage-2', '80/tcp', { note: 'x'.repeat(5000) });
      const updated = useCtfStore.getState().machines.find((m) => m.id === 'box-triage-2')!;
      expect(updated.portTriage?.['80/tcp']?.note).toHaveLength(2000);
    });
  });

  describe('Backup image restore atomicity (regression)', () => {
    it('aborts with zero writes when any image payload is corrupt', async () => {
      const putSpy = vi.spyOn(imageStore, 'putImage').mockResolvedValue(undefined);
      try {
        useCtfStore.setState({ currentProfileId: 'atomic-test' } as never);
        const good = { id: 'good', mime: 'image/webp', data: btoa('hello-bytes') };
        const corrupt = { id: 'evil', mime: 'image/png', data: '!!!not-valid-base64!!!' };
        await expect(imageBackupProvider.restoreImages([good, corrupt])).rejects.toThrow();
        expect(putSpy).not.toHaveBeenCalled();
      } finally {
        putSpy.mockRestore();
      }
    });
  });
});

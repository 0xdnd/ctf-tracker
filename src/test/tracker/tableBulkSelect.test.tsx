import React from 'react';
import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TableView } from '../../components/tracker/TableView';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useCtfStore } from '../../store/useCtfStore';
import type { Machine } from '../../types';

// jsdom has no layout, so the real virtualizer renders zero rows. Render every row instead.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ index, key: index, start: index * 52, end: (index + 1) * 52, size: 52 })),
    getTotalSize: () => count * 52,
  }),
}));

function makeMachine(overrides: Partial<Machine> = {}): Machine {
  return {
    id: 'box-1',
    name: 'Alpha',
    ip: '10.10.10.1',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'backlog',
    tags: ['smb'],
    certifications: [],
    roomUrl: '',
    timeSpentSeconds: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Machine;
}

const MACHINES = [
  makeMachine({ id: 'm1', name: 'Alpha', os: 'Linux', timeSpentSeconds: 30 }),
  makeMachine({ id: 'm2', name: 'Bravo', os: 'Windows', timeSpentSeconds: 10, tags: [] }),
  makeMachine({ id: 'm3', name: 'Charlie', os: 'Linux', timeSpentSeconds: 20 }),
  makeMachine({ id: 'm4', name: 'Delta', os: 'Windows', timeSpentSeconds: 40 }),
];

const renderTable = (machines: Machine[] = MACHINES) =>
  render(
    <MemoryRouter>
      <TableView filteredMachines={machines} />
      <ConfirmDialog />
    </MemoryRouter>,
  );

const th = (name: RegExp) => screen.getByRole('button', { name }).closest('th') as HTMLElement;
const rowCheckbox = (name: string) => screen.getByRole('checkbox', { name: `Select ${name}` });
const storeStatus = (id: string) => useCtfStore.getState().machines.find((m) => m.id === id)?.status;
const bodyNames = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => within(r).queryByRole('checkbox')?.getAttribute('aria-label')?.replace('Select ', ''));

describe('TableView multi-sort and bulk select', () => {
  beforeEach(() => {
    useCtfStore.getState().resetFilters();
    useCtfStore.setState({
      machines: MACHINES.map((m) => ({ ...m, tags: [...m.tags] })),
      selectedMachineId: null,
      soundEnabled: false,
      activeTargetId: null,
    });
  });

  describe('multi-field sort', () => {
    it('plain click sets primary sort with aria-sort, click again flips it', () => {
      renderTable();
      const osHeader = th(/^Sort by OS/);
      expect(osHeader).toHaveAttribute('aria-sort', 'none');
      fireEvent.click(within(osHeader).getByRole('button'));
      expect(th(/Sort by OS, ascending/)).toHaveAttribute('aria-sort', 'ascending');
      fireEvent.click(screen.getByRole('button', { name: /Sort by OS, ascending/ }));
      expect(th(/Sort by OS, descending/)).toHaveAttribute('aria-sort', 'descending');
    });

    it('shift+click adds a secondary key, shows priority numbers, and orders rows by both keys', () => {
      renderTable();
      fireEvent.click(screen.getByRole('button', { name: /^Sort by OS/ }));
      fireEvent.click(screen.getByRole('button', { name: /^Sort by Time/ }), { shiftKey: true });
      // OS asc, then Time asc: Linux(20 Charlie, 30 Alpha), Windows(10 Bravo, 40 Delta)
      expect(bodyNames()).toEqual(['Charlie', 'Alpha', 'Bravo', 'Delta']);
      expect(screen.getByRole('button', { name: 'Sort by OS, ascending, priority 1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sort by Time, ascending, priority 2' })).toBeInTheDocument();
      // secondary only reports aria-sort none; primary reports its direction
      expect(th(/Sort by Time/)).toHaveAttribute('aria-sort', 'none');

      // shift+click again flips the secondary to desc
      fireEvent.click(screen.getByRole('button', { name: /^Sort by Time/ }), { shiftKey: true });
      expect(bodyNames()).toEqual(['Alpha', 'Charlie', 'Delta', 'Bravo']);
    });
  });

  describe('row selection', () => {
    it('select-all selects every filtered row and shows the bulk bar', () => {
      renderTable();
      expect(screen.queryByRole('toolbar')).toBeNull();
      const all = screen.getByRole('checkbox', { name: 'Select all 4 filtered targets' }) as HTMLInputElement;
      fireEvent.click(all);
      for (const m of MACHINES) expect(rowCheckbox(m.name)).toBeChecked();
      const bar = screen.getByRole('toolbar', { name: /Bulk actions/ });
      expect(within(bar).getByText('selected').parentElement).toHaveTextContent('4 selected');
      // clicking again deselects everything and hides the bar
      fireEvent.click(all);
      expect(screen.queryByRole('toolbar')).toBeNull();
    });

    it('header checkbox is indeterminate for partial selection', () => {
      renderTable();
      fireEvent.click(rowCheckbox('Alpha'));
      const all = screen.getByRole('checkbox', { name: /Select all/ }) as HTMLInputElement;
      expect(all.indeterminate).toBe(true);
      expect(all.checked).toBe(false);
    });

    it('shift-click selects a range', () => {
      renderTable();
      fireEvent.click(rowCheckbox('Alpha'));
      fireEvent.click(rowCheckbox('Charlie'), { shiftKey: true });
      expect(rowCheckbox('Alpha')).toBeChecked();
      expect(rowCheckbox('Bravo')).toBeChecked();
      expect(rowCheckbox('Charlie')).toBeChecked();
      expect(rowCheckbox('Delta')).not.toBeChecked();
    });

    it('Esc clears the selection', () => {
      renderTable();
      fireEvent.click(rowCheckbox('Alpha'));
      expect(screen.getByRole('toolbar')).toBeInTheDocument();
      act(() => {
        fireEvent.keyDown(window, { key: 'Escape' });
      });
      expect(screen.queryByRole('toolbar')).toBeNull();
      expect(rowCheckbox('Alpha')).not.toBeChecked();
    });

    it('clears the selection when the filtered row set changes', () => {
      const { rerender } = renderTable();
      fireEvent.click(rowCheckbox('Alpha'));
      expect(screen.getByRole('toolbar')).toBeInTheDocument();
      rerender(
        <MemoryRouter>
          <TableView filteredMachines={MACHINES.slice(0, 2)} />
          <ConfirmDialog />
        </MemoryRouter>,
      );
      expect(screen.queryByRole('toolbar')).toBeNull();
    });
  });

  describe('bulk actions', () => {
    it('sets status on every selected row (and only those)', () => {
      renderTable();
      fireEvent.click(rowCheckbox('Alpha'));
      fireEvent.click(rowCheckbox('Bravo'));
      const bar = screen.getByRole('toolbar');
      fireEvent.click(within(bar).getByRole('button', { name: 'Set status for selected targets' }));
      fireEvent.click(within(screen.getByRole('listbox', { name: 'Set status for selected targets' })).getByRole('option', { name: /Foothold/ }));
      expect(storeStatus('m1')).toBe('foothold');
      expect(storeStatus('m2')).toBe('foothold');
      expect(storeStatus('m3')).toBe('backlog');
      expect(storeStatus('m4')).toBe('backlog');
    });

    it('select-all then bulk status updates all filtered rows', () => {
      renderTable();
      fireEvent.click(screen.getByRole('checkbox', { name: /Select all/ }));
      const bar = screen.getByRole('toolbar');
      fireEvent.click(within(bar).getByRole('button', { name: 'Set status for selected targets' }));
      fireEvent.click(within(screen.getByRole('listbox', { name: 'Set status for selected targets' })).getByRole('option', { name: /Recon/ }));
      for (const m of MACHINES) expect(storeStatus(m.id)).toBe('recon');
    });

    it('adds a tag to selected rows without duplicating existing ones', () => {
      renderTable();
      fireEvent.click(rowCheckbox('Alpha'));
      fireEvent.click(rowCheckbox('Bravo'));
      const bar = screen.getByRole('toolbar');
      fireEvent.change(within(bar).getByLabelText('Tag to add to selected targets'), { target: { value: ' smb ' } });
      fireEvent.click(within(bar).getByRole('button', { name: 'Add tag to selected targets' }));
      const tags = (id: string) => useCtfStore.getState().machines.find((m) => m.id === id)?.tags;
      expect(tags('m1')).toEqual(['smb']); // already had it
      expect(tags('m2')).toEqual(['smb']);
      expect(tags('m3')).toEqual(['smb']); // untouched
    });

    it('removes a tag from selected rows', () => {
      renderTable();
      fireEvent.click(rowCheckbox('Alpha'));
      fireEvent.click(rowCheckbox('Charlie'));
      const bar = screen.getByRole('toolbar');
      fireEvent.click(within(bar).getByRole('button', { name: 'Remove tag from selected targets' }));
      fireEvent.click(within(screen.getByRole('listbox', { name: 'Remove tag from selected targets' })).getByRole('option', { name: /smb \(2\)/ }));
      const tags = (id: string) => useCtfStore.getState().machines.find((m) => m.id === id)?.tags;
      expect(tags('m1')).toEqual([]);
      expect(tags('m3')).toEqual([]);
      expect(tags('m4')).toEqual(['smb']); // not selected
    });

    it('delete asks for confirmation in the app dialog; cancel keeps rows, confirm removes them', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm');
      renderTable();
      fireEvent.click(rowCheckbox('Alpha'));
      fireEvent.click(rowCheckbox('Bravo'));
      fireEvent.click(screen.getByRole('button', { name: 'Delete 2 selected targets' }));

      let dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText('Delete 2 targets?')).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      expect(useCtfStore.getState().machines).toHaveLength(4);
      expect(screen.getByRole('toolbar')).toBeInTheDocument(); // selection survives a cancel

      fireEvent.click(screen.getByRole('button', { name: 'Delete 2 selected targets' }));
      dialog = await screen.findByRole('alertdialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect(useCtfStore.getState().machines.map((m) => m.id)).toEqual(['m3', 'm4']));
      expect(screen.queryByRole('toolbar')).toBeNull();
      expect(confirmSpy).not.toHaveBeenCalled();
      confirmSpy.mockRestore();
    });
  });
});

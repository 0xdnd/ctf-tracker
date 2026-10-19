import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { KanbanBoard } from '../../components/tracker/KanbanBoard';
import { TableView } from '../../components/tracker/TableView';
import { GridView } from '../../components/tracker/GridView';
import { UnifiedHeader } from '../../components/layout/UnifiedHeader';
import { MachineDetailModal } from '../../components/tracker/MachineDetailModal';
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
    name: 'Lame',
    ip: '10.10.10.3',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'recon',
    tags: [],
    certifications: [],
    roomUrl: '',
    timeSpentSeconds: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Machine;
}

const Where: React.FC = () => <div data-testid="where">{useLocation().pathname}</div>;

const views: Array<[string, (m: Machine[]) => React.ReactElement]> = [
  ['KanbanBoard', (m) => <KanbanBoard filteredMachines={m} />],
  ['TableView', (m) => <TableView filteredMachines={m} />],
  ['GridView', (m) => <GridView filteredMachines={m} />],
];

describe.each(views)('%s engage target navigation', (_name, renderView) => {
  const machines = [makeMachine()];

  beforeEach(() => {
    useCtfStore.setState({ machines, activeTargetId: null, soundEnabled: false, selectedMachineId: null });
  });

  const mount = () =>
    render(
      <MemoryRouter initialEntries={['/tracker']}>
        <Where />
        <Routes>
          <Route path="*" element={renderView(machines)} />
        </Routes>
      </MemoryRouter>
    );

  it('sets the target and opens its page', () => {
    mount();
    fireEvent.click(screen.getAllByLabelText('Engage target Lame and start timer')[0]);
    expect(useCtfStore.getState().activeTargetId).toBe('box-1');
    expect(screen.getByTestId('where').textContent).toBe('/target/box-1');
  });

  it('does not navigate when the machine is already the active target', () => {
    useCtfStore.setState({ activeTargetId: 'box-1' });
    mount();
    const btn = screen.queryAllByLabelText('Currently engaged target: Lame')[0];
    if (btn) fireEvent.click(btn);
    expect(screen.getByTestId('where').textContent).toBe('/tracker');
  });
});

describe('header target picker and detail modal engage navigation', () => {
  const machines = [makeMachine()];

  beforeEach(() => {
    useCtfStore.setState({ machines, activeTargetId: null, soundEnabled: false, selectedMachineId: null });
  });

  const mountWith = (el: React.ReactElement) =>
    render(
      <MemoryRouter initialEntries={['/tracker']}>
        <Where />
        <Routes>
          <Route path="*" element={el} />
        </Routes>
      </MemoryRouter>
    );

  it('header picker sets the target and opens its page', () => {
    mountWith(<UnifiedHeader />);
    fireEvent.click(screen.getByLabelText('Engage target'));
    fireEvent.click(screen.getByText('Lame').closest('button')!);
    expect(useCtfStore.getState().activeTargetId).toBe('box-1');
    expect(screen.getByTestId('where').textContent).toBe('/target/box-1');
  });

  it('detail modal engage sets the target, closes the modal and opens its page', () => {
    useCtfStore.setState({ selectedMachineId: 'box-1' });
    mountWith(<MachineDetailModal />);
    fireEvent.click(screen.getByText(/Set Active Target/).closest('button')!);
    expect(useCtfStore.getState().activeTargetId).toBe('box-1');
    expect(useCtfStore.getState().selectedMachineId).toBeNull();
    expect(screen.getByTestId('where').textContent).toBe('/target/box-1');
  });
});

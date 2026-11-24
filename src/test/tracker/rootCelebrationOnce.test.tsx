import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TableView } from '../../components/tracker/TableView';
import { useCtfStore } from '../../store/useCtfStore';
import { entersRootStage } from '../../utils/pipeline';
import type { Machine } from '../../types';

const celebrate = vi.hoisted(() => vi.fn());
vi.mock('../../utils/helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/helpers')>()),
  triggerRootCelebration: celebrate,
}));

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ index, key: index, start: index * 52, end: (index + 1) * 52, size: 52 })),
    getTotalSize: () => count * 52,
  }),
}));

const machine = (status: Machine['status']): Machine =>
  ({
    id: 'm1',
    name: 'Alpha',
    ip: '10.10.10.1',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status,
    tags: [],
    certifications: [],
    roomUrl: '',
    timeSpentSeconds: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }) as Machine;

const bulkSet = (label: RegExp, select = false) => {
  if (select) fireEvent.click(screen.getByRole('checkbox', { name: 'Select Alpha' }));
  const bar = screen.getByRole('toolbar');
  fireEvent.click(within(bar).getByRole('button', { name: 'Set status for selected targets' }));
  fireEvent.click(within(screen.getByRole('listbox', { name: 'Set status for selected targets' })).getByRole('option', { name: label }));
};

describe('entersRootStage', () => {
  it('is true only when a move newly reaches root or completed', () => {
    expect(entersRootStage('foothold', 'root')).toBe(true);
    expect(entersRootStage('backlog', 'completed')).toBe(true);
    expect(entersRootStage('root', 'completed')).toBe(false);
    expect(entersRootStage('completed', 'root')).toBe(false);
    expect(entersRootStage('root', 'foothold')).toBe(false);
  });
});

describe('root celebration fires once per entry into the root stage', () => {
  beforeEach(() => {
    celebrate.mockClear();
    useCtfStore.getState().resetFilters();
    useCtfStore.setState({ selectedMachineId: null, soundEnabled: false, activeTargetId: null });
  });

  it('celebrates foothold -> root but not root -> completed', () => {
    useCtfStore.setState({ machines: [machine('foothold')] });
    const m = useCtfStore.getState().machines;
    render(
      <MemoryRouter>
        <TableView filteredMachines={m} />
      </MemoryRouter>,
    );
    bulkSet(/Root pwned/, true);
    expect(celebrate).toHaveBeenCalledTimes(1);
    bulkSet(/Completed/);
    expect(celebrate).toHaveBeenCalledTimes(1);
  });
});

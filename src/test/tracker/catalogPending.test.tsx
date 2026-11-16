import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TrackerView } from '../../components/tracker/TrackerView';
import { useCtfStore } from '../../store/useCtfStore';
import type { Machine } from '../../types';

const row = (over: Partial<Machine> = {}): Machine =>
  ({
    id: 'thm-rootme',
    name: 'RootMe',
    ip: '10.10.x.x',
    os: 'Linux',
    platform: 'THM',
    difficulty: 'Easy',
    status: 'backlog',
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...over,
  }) as Machine;

const wrap = () =>
  render(
    <MemoryRouter>
      <TrackerView />
    </MemoryRouter>
  );

describe('TrackerView before the catalog has merged', () => {
  const loadCatalog = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    loadCatalog.mockClear();
    useCtfStore.getState().resetFilters();
    useCtfStore.setState({
      machines: [row()],
      isCatalogLoaded: false,
      loadCatalog,
      isDeepStorageLoaded: false,
      soundEnabled: false,
      viewMode: 'kanban',
    } as never);
  });
  afterEach(() => {
    useCtfStore.setState({ isCatalogLoaded: true } as never);
  });

  it('does not start the catalog on mount, only after the first paint has settled', async () => {
    vi.useFakeTimers();
    try {
      wrap();
      expect(loadCatalog).not.toHaveBeenCalled();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(loadCatalog).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows a loading skeleton, not "no machines", when saved filters match none of the starter rows', () => {
    useCtfStore.getState().setFilters({ selectedPlatform: 'PG' });
    wrap();
    expect(screen.getByTestId('catalog-pending')).toBeInTheDocument();
    expect(screen.queryByText(/No machines match/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Reset filters/i })).toBeNull();
  });

  it('shows no "x of y" count against the starter rows', () => {
    useCtfStore.getState().setFilters({ searchQuery: 'RootMe' });
    wrap();
    expect(screen.queryByText(/\d+ of \d+/)).toBeNull();
  });

  it('shows the empty-state copy once the catalog is in and nothing matches', () => {
    useCtfStore.getState().setFilters({ selectedPlatform: 'PG' });
    wrap();
    act(() => useCtfStore.setState({ isCatalogLoaded: true } as never));
    expect(screen.queryByTestId('catalog-pending')).toBeNull();
    expect(screen.getByText(/No machines match/)).toBeInTheDocument();
  });

  it('drops the skeleton for an error state with Retry when the catalog load fails, and Retry re-runs the load', async () => {
    vi.useFakeTimers();
    try {
      useCtfStore.getState().setFilters({ selectedPlatform: 'PG' });
      wrap();
      expect(screen.getByTestId('catalog-pending')).toBeInTheDocument();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      expect(loadCatalog).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('catalog-pending')).toBeNull();
      expect(screen.getByText('Could not load the machine list.')).toBeInTheDocument();
      expect(screen.queryByText(/No machines match/)).toBeNull();
      await act(async () => {
        screen.getByRole('button', { name: /Retry/ }).click();
      });
      expect(loadCatalog).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

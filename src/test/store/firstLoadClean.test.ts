import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SAMPLE_SOLVE_COUNT } from '../../data/demoSolvedRoster';
import type { Machine } from '../../types';

const loadStore = async () => {
  vi.resetModules();
  return import('../../store/useCtfStore');
};

const solvedCount = (machines: Machine[]) =>
  machines.filter((m) => m.status === 'completed' || m.status === 'foothold').length;

describe('first load with empty browser storage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows every catalog item as not started after the full catalog merge', async () => {
    const { useCtfStore } = await loadStore();
    expect(useCtfStore.getState().userSolvesReset).toBe(true);
    await useCtfStore.getState().loadCatalog();
    const s = useCtfStore.getState();
    expect(s.isCatalogLoaded).toBe(true);
    expect(s.machines.length).toBeGreaterThan(100);
    expect(s.machines.filter((m) => m.status === 'completed')).toHaveLength(0);
    expect(s.machines.filter((m) => m.status === 'foothold')).toHaveLength(0);
    expect(s.machines.filter((m) => m.userFlag || m.rootFlag)).toHaveLength(0);
    expect(s.userSolvesReset).toBe(true);
  });

  it('restoreDanielSolves loads the sample set and clears the reset flag', async () => {
    const { useCtfStore } = await loadStore();
    await useCtfStore.getState().loadCatalog();
    await useCtfStore.getState().restoreDanielSolves();
    const s = useCtfStore.getState();
    expect(s.userSolvesReset).toBe(false);
    expect(solvedCount(s.machines)).toBe(SAMPLE_SOLVE_COUNT);
  });

  it('keeps a saved profile that holds a completed item', async () => {
    const first = await loadStore();
    await first.useCtfStore.getState().loadCatalog();
    const target = first.useCtfStore.getState().machines[0];
    localStorage.clear();
    localStorage.setItem(
      first.getProfileStorageKey('guest'),
      JSON.stringify({ machines: [{ ...target, status: 'completed', userFlag: 'a', rootFlag: 'b' }], userSolvesReset: false })
    );
    const { useCtfStore } = await loadStore();
    expect(useCtfStore.getState().userSolvesReset).toBe(false);
    await useCtfStore.getState().loadCatalog();
    const kept = useCtfStore.getState().machines.find((m) => m.id === target.id);
    expect(kept?.status).toBe('completed');
  });
});

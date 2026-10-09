import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCtfStore } from '../../store/useCtfStore';

const STORE_KEY = 'zerobox-tactical-store';

const storeWrites = (spy: { mock: { calls: unknown[][] } }) =>
  spy.mock.calls.filter((call) => call[0] === STORE_KEY).length;

describe('persist write skipping', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not re-serialize when only non-persisted (transient) fields change', () => {
    // Prime the snapshot memo with a persisted change, then watch for further writes.
    useCtfStore.setState({ soundEnabled: !useCtfStore.getState().soundEnabled });
    const spy = vi.spyOn(Storage.prototype, 'setItem');

    useCtfStore.setState({ isCatalogLoading: true });
    useCtfStore.setState({ isCatalogLoading: false });
    useCtfStore.setState({ activeTimerSeconds: useCtfStore.getState().activeTimerSeconds + 1 });

    expect(storeWrites(spy)).toBe(0);
    spy.mockRestore();
  });

  it('writes the store exactly once per persisted change and the data round-trips', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    const before = useCtfStore.getState().machines;
    expect(before.length).toBeGreaterThan(0);
    const target = before[0];

    useCtfStore.getState().updateMachineStatus(target.id, 'recon');

    expect(storeWrites(spy)).toBe(1);
    const stored = JSON.parse(localStorage.getItem(STORE_KEY) as string);
    expect(stored.state.machines.find((m: { id: string }) => m.id === target.id).status).toBe('recon');
    spy.mockRestore();
  });
});

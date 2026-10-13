import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Machine } from '../../types';
import { SCHEMA_VERSION } from '../../utils/schemaWriteGate';

// Autosave audit regressions. Each test boots a fresh store module against a prepared localStorage.
const PROFILE_KEY = 'zerobox_operator_profile_guest';
const STORE_KEY = 'zerobox-tactical-store';

const box = (id: string, extra: Partial<Machine> = {}): Machine =>
  ({
    id,
    name: id,
    ip: '10.10.10.5',
    os: 'Linux',
    platform: 'Custom',
    difficulty: 'Easy',
    status: 'recon',
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
    isCustom: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...extra,
  }) as Machine;

type StoreModule = typeof import('../../store/useCtfStore');

const live: StoreModule[] = [];
const noopStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const retireAll = () => {
  for (const mod of live.splice(0)) {
    mod.useCtfStore.persist.setOptions({ storage: noopStorage });
    mod.useCtfStore.setState({ currentProfileId: '' });
  }
};

const boot = async (): Promise<StoreModule> => {
  retireAll();
  vi.resetModules();
  const mod = await import('../../store/useCtfStore');
  live.push(mod);
  return mod;
};

const seedStorage = (machines: Machine[], profileId = 'guest') => {
  localStorage.setItem(`zerobox_operator_profile_${profileId}`, JSON.stringify({ machines, activeTargetId: null }));
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({ state: { currentProfileId: profileId, machines, activeTargetId: null }, version: SCHEMA_VERSION })
  );
};

const storedProfile = (key = PROFILE_KEY) => JSON.parse(localStorage.getItem(key) as string);
const ids = (machines: Machine[]) => machines.map((m) => m.id);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  retireAll();
  vi.useRealTimers();
});

describe('item 1: cross-tab events from another profile', () => {
  it('ignores a persisted-store event written by a tab on a different profile', async () => {
    seedStorage([box('custom-mine')]);
    const mod = await boot();
    const s = () => mod.useCtfStore.getState();

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORE_KEY,
        newValue: JSON.stringify({
          state: { currentProfileId: 'usr_other', machines: [box('custom-theirs')], activeTargetId: null },
          version: SCHEMA_VERSION,
        }),
      })
    );

    expect(ids(s().machines)).toContain('custom-mine');
    expect(ids(s().machines)).not.toContain('custom-theirs');
    mod.flushProfileSave();
    expect(ids(storedProfile().machines)).not.toContain('custom-theirs');
  });

  it('still applies a persisted-store event from a tab on the same profile', async () => {
    seedStorage([box('custom-mine')]);
    const mod = await boot();
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORE_KEY,
        newValue: JSON.stringify({
          state: { currentProfileId: 'guest', machines: [box('custom-mine'), box('custom-new')], activeTargetId: null },
          version: SCHEMA_VERSION,
        }),
      })
    );
    expect(ids(mod.useCtfStore.getState().machines)).toContain('custom-new');
  });
});

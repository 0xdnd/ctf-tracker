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

describe('item 2: boot merge against STARTER_MACHINES', () => {
  // htb-dancing is in the full catalog but not in STARTER_MACHINES; this row has no "progress" per hasUserProgress.
  const dancing = () =>
    box('htb-dancing', {
      name: 'Dancing',
      platform: 'HTB',
      isCustom: undefined,
      status: 'backlog',
      ip: '10.129.77.7',
      tags: ['my-own-tag'],
      writeupUrl: 'https://notes.example/dancing',
    });

  it('keeps edits on a not-yet-loaded catalog machine through boot and the full catalog merge', async () => {
    seedStorage([dancing()]);
    const mod = await boot();
    const s = () => mod.useCtfStore.getState();
    // Boot (STARTER only): the row rides along unchanged, and the persisted blob keeps it too.
    expect(s().machines.find((m) => m.id === 'htb-dancing')?.ip).toBe('10.129.77.7');
    mod.useCtfStore.setState({ viewMode: 'list' }); // any persisted write
    const blob = JSON.parse(localStorage.getItem(STORE_KEY) as string);
    expect(blob.state.machines.find((m: Machine) => m.id === 'htb-dancing')?.ip).toBe('10.129.77.7');

    await s().loadCatalog();
    const merged = s().machines.find((m) => m.id === 'htb-dancing');
    expect(merged?.ip).toBe('10.129.77.7');
    expect(merged?.writeupUrl).toBe('https://notes.example/dancing');
    expect(merged?.tags).toContain('my-own-tag');
  });

  it('the full catalog merge still drops idle rows that match nothing', () => {
    return boot().then((mod) => {
      const ghost = box('htb-zz-not-a-machine', { name: 'ZZ Ghost', platform: 'HTB', isCustom: undefined, status: 'backlog' });
      expect(ids(mod.mergeMachinesWithCatalog([ghost]))).toContain(ghost.id); // partial: kept for now
      expect(ids(mod.mergeMachinesWithCatalog([ghost], false, mod.useCtfStore.getState().machines))).not.toContain(ghost.id);
    });
  });
});

describe('item 3: missing or quarantined persisted store blob', () => {
  const note = { id: 'note-1', title: 'Mine', rawMarkdown: 'body' };
  const seedProfileOnly = () =>
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ machines: [box('custom-mine')], activeTargetId: null, customNotes: [note], deletedNoteIds: ['x'] })
    );

  it('boots from the intact profile copy when the store blob is missing', async () => {
    seedProfileOnly();
    const mod = await boot();
    const s = mod.useCtfStore.getState();
    expect(ids(s.machines)).toContain('custom-mine');
    expect(s.customNotes.map((n) => n.id)).toEqual(['note-1']);
    expect(s.deletedNoteIds).toEqual(['x']);
    mod.flushProfileSave();
    expect(ids(storedProfile().machines)).toContain('custom-mine');
    expect(storedProfile().customNotes).toHaveLength(1);
  });

  it('boots from the profile copy when the store blob is corrupted (quarantined)', async () => {
    seedProfileOnly();
    localStorage.setItem(STORE_KEY, '{not json');
    const mod = await boot();
    expect(ids(mod.useCtfStore.getState().machines)).toContain('custom-mine');
    expect(mod.useCtfStore.getState().customNotes).toHaveLength(1);
  });
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

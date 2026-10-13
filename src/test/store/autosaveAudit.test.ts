import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Machine } from '../../types';
import { SCHEMA_VERSION } from '../../utils/schemaWriteGate';

const idb = vi.hoisted(() => ({ workspace: new Map<string, unknown>() }));
vi.mock('../../utils/resilientStorage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/resilientStorage')>()),
  loadWorkspaceFromIdb: vi.fn(async (key: string) => idb.workspace.get(key) ?? null),
  saveWorkspaceToIdb: vi.fn(async (key: string, data: unknown) => {
    idb.workspace.set(key, JSON.parse(JSON.stringify(data)));
    return true;
  }),
}));

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
  idb.workspace.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
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
    mod.useCtfStore.setState({ crtOverlay: true }); // any persisted write
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

describe('item 4: auth profile differs from the persisted profile', () => {
  const graphOf = (edgeId: string) =>
    JSON.stringify({
      graphNodePositions: {},
      graphEdges: [{ id: edgeId, sourceId: 'a', targetId: 'b', type: 'pivot-ssh', status: 'potential', createdAt: '2024-01-01T00:00:00.000Z' }],
    });
  const lootOf = (lootId: string) =>
    JSON.stringify({ schemaVersion: 1, credentials: [], credAttempts: [], lootItems: [{ id: lootId, title: lootId, value: 'v' }] });

  it('loads loot and the attack graph of the profile the tab ends up on', async () => {
    localStorage.setItem('rootvector_auth_session', JSON.stringify({ state: { user: { id: 'p1' } } }));
    seedStorage([box('custom-p2')], 'p2'); // the persisted blob names p2
    localStorage.setItem('zerobox_graph_state_p1', graphOf('edge-p1'));
    localStorage.setItem('zerobox_graph_state_p2', graphOf('edge-p2'));
    localStorage.setItem('zerobox_loot_v2_p1', lootOf('loot-p1'));
    localStorage.setItem('zerobox_loot_v2_p2', lootOf('loot-p2'));

    const mod = await boot();
    const s = () => mod.useCtfStore.getState();
    expect(s().currentProfileId).toBe('p2');
    expect(s().graphEdges.map((e) => e.id)).toEqual(['edge-p2']);
    expect(s().lootItems.map((l) => l.id)).toEqual(['loot-p2']);

    // A loot edit now saves p2's list under p2, and leaves p1's key alone.
    s().addLootItem({ category: 'note', title: 'new', value: 'x' });
    expect(JSON.parse(localStorage.getItem('zerobox_loot_v2_p1') as string).lootItems.map((l: { id: string }) => l.id)).toEqual(['loot-p1']);
    expect(JSON.parse(localStorage.getItem('zerobox_loot_v2_p2') as string).lootItems).toHaveLength(2);
  });
});

describe('item 5: storage quota', () => {
  const quota = () => Object.assign(new Error('quota'), { name: 'QuotaExceededError' });

  it('setItem reports failure, keeps the value in memory and getItem prefers it over the stale disk copy', async () => {
    const mod = await boot();
    localStorage.setItem('zb-test-key', 'old');
    const alerts: any[] = [];
    const onAlert = (e: Event) => alerts.push((e as CustomEvent).detail);
    window.addEventListener('zerobox:storage', onAlert);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quota();
    });
    expect(mod.safeLocalStorage.setItem('zb-test-key', 'new')).toBe(false);
    spy.mockRestore();
    window.removeEventListener('zerobox:storage', onAlert);

    expect(mod.safeLocalStorage.getItem('zb-test-key')).toBe('new');
    expect(alerts).toEqual([{ kind: 'quota', message: mod.STORAGE_FULL_MESSAGE, sticky: true }]);
    expect(mod.STORAGE_FULL_MESSAGE).toBe('Storage is full — changes are kept in memory only; export a backup.');

    expect(mod.safeLocalStorage.setItem('zb-test-key', 'newer')).toBe(true);
    expect(localStorage.getItem('zb-test-key')).toBe('newer');
  });

  it('retries the profile save without writeup bodies when the full payload does not fit', async () => {
    seedStorage([box('custom-mine')]);
    const mod = await boot();
    const s = () => mod.useCtfStore.getState();
    s().updateMachine('custom-mine', { writeupMarkdown: 'HUGE-WRITEUP-BODY' });
    const real = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (String(v).includes('HUGE-WRITEUP-BODY')) throw quota();
      return real.call(this, k, v);
    });
    mod.flushProfileSave();
    spy.mockRestore();
    const row = storedProfile().machines.find((m: Machine) => m.id === 'custom-mine');
    expect(row).toBeTruthy();
    expect(row.writeupMarkdown).toBeUndefined();
  });

  it('a profile save that fails completely is not marked saved, so the next save point retries it', async () => {
    seedStorage([box('custom-mine')]);
    const mod = await boot();
    const s = () => mod.useCtfStore.getState();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quota();
    });
    s().updateMachine('custom-mine', { ip: '10.10.99.99' });
    mod.flushProfileSave();
    spy.mockRestore();
    expect(storedProfile().machines[0].ip).toBe('10.10.10.5'); // disk still old
    s().pauseTimer(); // a save point: writes only when something is still unsaved
    expect(storedProfile().machines.find((m: Machine) => m.id === 'custom-mine').ip).toBe('10.10.99.99');
  });
});

describe('item 6: restore from the IndexedDB workspace copy', () => {
  const copy = (machines: Machine[], savedAt: string) => ({ machines, activeTargetId: null, customNotes: [], savedAt });

  it('restores when localStorage has no workspace at all', async () => {
    idb.workspace.set('zb:workspace:guest', copy([box('custom-from-idb')], '2026-10-01T00:00:00.000Z'));
    const mod = await boot();
    await vi.waitFor(() => expect(ids(mod.useCtfStore.getState().machines)).toContain('custom-from-idb'));
    expect(ids(storedProfile().machines)).toContain('custom-from-idb');
  });

  it('restores when the localStorage copy is older than the IndexedDB copy', async () => {
    seedStorage([box('custom-mine')]);
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ machines: [box('custom-mine')], savedAt: '2026-10-01T00:00:00.000Z' }));
    idb.workspace.set('zb:workspace:guest', copy([box('custom-mine', { ip: '10.10.20.20' })], '2026-10-02T00:00:00.000Z'));
    const mod = await boot();
    await vi.waitFor(() =>
      expect(mod.useCtfStore.getState().machines.find((m) => m.id === 'custom-mine')?.ip).toBe('10.10.20.20')
    );
  });

  it('keeps localStorage when it is as new or newer, or has no stamp', async () => {
    seedStorage([box('custom-mine')]);
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ machines: [box('custom-mine')], savedAt: '2026-10-03T00:00:00.000Z' }));
    idb.workspace.set('zb:workspace:guest', copy([box('custom-mine', { ip: '10.10.20.20' })], '2026-10-02T00:00:00.000Z'));
    const mod = await boot();
    await new Promise((r) => setTimeout(r, 20));
    expect(mod.useCtfStore.getState().machines.find((m) => m.id === 'custom-mine')?.ip).toBe('10.10.10.5');
  });

  it('every profile save stamps the same savedAt on both copies', async () => {
    seedStorage([box('custom-mine')]);
    const mod = await boot();
    mod.useCtfStore.getState().updateMachine('custom-mine', { ip: '10.10.30.30' });
    mod.flushProfileSave();
    const stamp = storedProfile().savedAt;
    expect(typeof stamp).toBe('string');
    expect((idb.workspace.get('zb:workspace:guest') as { savedAt: string }).savedAt).toBe(stamp);
  });
});

describe('item 7: attack graph storage is per profile', () => {
  const GLOBAL = 'zerobox-attack-graph-state';
  const graphOf = (edgeId: string) =>
    JSON.stringify({
      graphNodePositions: {},
      graphEdges: [{ id: edgeId, sourceId: 'a', targetId: 'b', type: 'pivot-ssh', status: 'potential', createdAt: '2024-01-01T00:00:00.000Z' }],
    });
  const asP1 = () => {
    localStorage.setItem('rootvector_auth_session', JSON.stringify({ state: { user: { id: 'p1' } } }));
    seedStorage([box('custom-p1')], 'p1');
  };
  const edgeIds = (mod: StoreModule) => mod.useCtfStore.getState().graphEdges.map((e) => e.id);

  it('saves only to the profile key, never the shared unscoped key', async () => {
    asP1();
    const mod = await boot();
    mod.useCtfStore.getState().addGraphEdge({ id: 'edge-new', sourceId: 'a', targetId: 'b', type: 'pivot-ssh', status: 'potential' });
    expect(localStorage.getItem('zerobox_graph_state_p1')).toContain('edge-new');
    expect(localStorage.getItem(GLOBAL)).toBeNull();
  });

  it('ignores graph storage events for another profile', async () => {
    asP1();
    localStorage.setItem('zerobox_graph_state_p1', graphOf('edge-p1'));
    const mod = await boot();
    window.dispatchEvent(new StorageEvent('storage', { key: GLOBAL, newValue: graphOf('edge-guest') }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'zerobox_graph_state_p2', newValue: graphOf('edge-p2') }));
    expect(edgeIds(mod)).toEqual(['edge-p1']);
    window.dispatchEvent(new StorageEvent('storage', { key: 'zerobox_graph_state_p1', newValue: graphOf('edge-p1b') }));
    expect(edgeIds(mod)).toEqual(['edge-p1b']);
  });

  it('an existing user without a profile graph key gets the legacy unscoped graph once, claimed into its key', async () => {
    asP1();
    localStorage.setItem(GLOBAL, graphOf('edge-legacy'));
    const mod = await boot();
    expect(edgeIds(mod)).toEqual(['edge-legacy']);
    expect(localStorage.getItem('zerobox_graph_state_p1')).toContain('edge-legacy');
  });

  it("resetAllProgress removes the profile's graph key and a reload does not bring it back", async () => {
    asP1();
    localStorage.setItem(GLOBAL, graphOf('edge-legacy'));
    localStorage.setItem('zerobox_graph_state_p1', graphOf('edge-p1'));
    const mod = await boot();
    await mod.useCtfStore.getState().resetAllProgress();
    expect(localStorage.getItem('zerobox_graph_state_p1')).toBeNull();
    const reloaded = await boot();
    expect(edgeIds(reloaded)).toEqual([]);
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

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Machine } from '../../types';
import { SCHEMA_VERSION } from '../../utils/schemaWriteGate';

const idb = vi.hoisted(() => ({
  workspace: new Map<string, unknown>(),
  deep: new Map<string, any>(),
  /** When set, replaces the deep-record read (to delay or fail it). */
  deepLoader: null as null | ((id: string) => Promise<any>),
  /** When set, replaces the IndexedDB workspace-copy read (to delay it). */
  workspaceLoader: null as null | ((key: string) => Promise<any>),
}));
vi.mock('../../utils/indexedDbDeepStorage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/indexedDbDeepStorage')>()),
  loadDeepProfileData: vi.fn(async (id: string) => (idb.deepLoader ? idb.deepLoader(id) : (idb.deep.get(id) ?? null))),
  saveDeepProfileData: vi.fn(async (id: string, data: unknown) => {
    idb.deep.set(id, JSON.parse(JSON.stringify(data)));
  }),
}));
vi.mock('../../utils/resilientStorage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/resilientStorage')>()),
  loadWorkspaceFromIdb: vi.fn(async (key: string) =>
    idb.workspaceLoader ? idb.workspaceLoader(key) : (idb.workspace.get(key) ?? null)
  ),
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
  idb.deep.clear();
  idb.deepLoader = null;
  idb.workspaceLoader = null;
});

afterEach(() => {
  vi.restoreAllMocks();
  retireAll();
  vi.useRealTimers();
});

describe('item 2: boot merge against STARTER_MACHINES', () => {
  // htb-optimum is in the full catalog but not in STARTER_MACHINES; this row has no "progress" per hasUserProgress.
  const optimum = () =>
    box('htb-optimum', {
      name: 'Optimum',
      platform: 'HTB',
      isCustom: undefined,
      status: 'backlog',
      ip: '10.129.77.7',
      tags: ['my-own-tag'],
      writeupUrl: 'https://notes.example/optimum',
    });

  it('keeps edits on a not-yet-loaded catalog machine through boot and the full catalog merge', async () => {
    seedStorage([optimum()]);
    const mod = await boot();
    const s = () => mod.useCtfStore.getState();
    // Boot (STARTER only): the row rides along unchanged, and the persisted blob keeps it too.
    expect(s().machines.find((m) => m.id === 'htb-optimum')?.ip).toBe('10.129.77.7');
    mod.useCtfStore.setState({ crtOverlay: true }); // any persisted write
    const blob = JSON.parse(localStorage.getItem(STORE_KEY) as string);
    expect(blob.state.machines.find((m: Machine) => m.id === 'htb-optimum')?.ip).toBe('10.129.77.7');

    await s().loadCatalog();
    const merged = s().machines.find((m) => m.id === 'htb-optimum');
    expect(merged?.ip).toBe('10.129.77.7');
    expect(merged?.writeupUrl).toBe('https://notes.example/optimum');
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

  it('the legacy graph is claimed once, globally, only by the profile the store blob was on', async () => {
    asP1();
    localStorage.setItem(GLOBAL, graphOf('edge-legacy'));
    localStorage.setItem('zerobox_operator_profile_p2', JSON.stringify({ machines: [box('custom-p2')] }));
    const mod = await boot();
    expect(edgeIds(mod)).toEqual(['edge-legacy']);
    mod.useCtfStore.getState().loadProfileData('p2'); // an existing profile without its own graph key
    expect(edgeIds(mod)).toEqual([]);
    expect(localStorage.getItem('zerobox_graph_state_p2')).toBeNull();

    // A later boot on p2 (blob now names p2) does not claim it either.
    localStorage.removeItem('zerobox_graph_state_p1');
    localStorage.setItem('rootvector_auth_session', JSON.stringify({ state: { user: { id: 'p2' } } }));
    seedStorage([box('custom-p2')], 'p2');
    const again = await boot();
    expect(edgeIds(again)).toEqual([]);
  });

  it('no claim once guest has saved to the unscoped key under this build', async () => {
    asP1();
    localStorage.setItem(GLOBAL, graphOf('edge-guest-new'));
    localStorage.setItem('zerobox_graph_guest_written_v2', '1');
    const mod = await boot();
    expect(edgeIds(mod)).toEqual([]);
    expect(localStorage.getItem('zerobox_graph_state_p1')).toBeNull();
  });

  it('a guest save before the claim has run marks the unscoped key as guest-owned', async () => {
    const mod = await boot(); // guest; the claim flag is set at boot...
    localStorage.removeItem('zerobox_graph_legacy_claimed'); // ...simulate a gated boot that could not set it
    mod.useCtfStore.getState().addGraphEdge({ id: 'edge-g', sourceId: 'a', targetId: 'b', type: 'pivot-ssh', status: 'potential' });
    expect(localStorage.getItem('zerobox_graph_guest_written_v2')).toBe('1');
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

describe('item 8: deleted writeups and notes stay deleted', () => {
  it('clearing the last writeup writes an empty deep record, so a reload does not refill it', async () => {
    seedStorage([box('custom-mine', { writeupMarkdown: 'old body' })]);
    idb.deep.set('guest', { writeups: { 'custom-mine': { writeupMarkdown: 'old body' } }, customNotes: [] });
    const mod = await boot();
    await vi.waitFor(() => expect(mod.useCtfStore.getState().isDeepStorageLoaded).toBe(true));
    mod.useCtfStore.getState().updateMachine('custom-mine', { writeupMarkdown: '' });
    mod.flushProfileSave();
    expect(idb.deep.get('guest').writeups).toEqual({});

    const reloaded = await boot();
    await vi.waitFor(() => expect(reloaded.useCtfStore.getState().isDeepStorageLoaded).toBe(true));
    expect(reloaded.useCtfStore.getState().machines.find((m) => m.id === 'custom-mine')?.writeupMarkdown || '').toBe('');
  });

  it('an intentionally empty notes list is not refilled from the deep record', async () => {
    seedStorage([box('custom-mine')]);
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ machines: [box('custom-mine')], customNotes: [] }));
    idb.deep.set('guest', { writeups: {}, customNotes: [{ id: 'note-deleted', title: 'gone' }] });
    const mod = await boot();
    await vi.waitFor(() => expect(mod.useCtfStore.getState().isDeepStorageLoaded).toBe(true));
    await new Promise((r) => setTimeout(r, 0));
    expect(mod.useCtfStore.getState().customNotes).toEqual([]);
  });

  it('does not write the deep record before it has loaded (would erase IndexedDB-only bodies)', async () => {
    seedStorage([box('custom-mine')]);
    const mod = await boot();
    mod.useCtfStore.setState({ isDeepStorageLoaded: false });
    mod.flushProfileSave();
    expect(idb.deep.has('guest')).toBe(false);
  });
});

describe('item 9: vault note saves surface failure', () => {
  it('updateNoteContent rejects when the vault write fails, and resolves only after it committed', async () => {
    const mod = await boot();
    const vault = await import('../../utils/indexedDbVault'); // the setup.ts mock instance of this boot
    const s = () => mod.useCtfStore.getState();
    s().setUserNotes([{ id: 'vault-note', title: 'V', rawMarkdown: 'a' } as any]);

    vi.mocked(vault.saveVaultToIndexedDb).mockRejectedValueOnce(new Error('aborted'));
    await expect(s().updateNoteContent('vault-note', 'b')).rejects.toThrow('aborted');

    let commit!: () => void;
    vi.mocked(vault.saveVaultToIndexedDb).mockImplementationOnce(() => new Promise<void>((r) => (commit = r)));
    let done = false;
    const pending = Promise.resolve(s().updateNoteContent('vault-note', 'c')).then(() => (done = true));
    await new Promise((r) => setTimeout(r, 0));
    expect(done).toBe(false);
    commit();
    await pending;
    expect(done).toBe(true);
  });

  it('the not-yet-hydrated vault path rejects on a failed write too', async () => {
    const mod = await boot();
    const vault = await import('../../utils/indexedDbVault');
    vi.mocked(vault.loadVaultFromIndexedDb).mockResolvedValueOnce({
      notes: [{ id: 'late-note', title: 'L', rawMarkdown: 'a' } as any],
      wikilinkMap: {},
      importedAt: '2026-01-01T00:00:00.000Z',
    });
    vi.mocked(vault.saveVaultToIndexedDb).mockRejectedValueOnce(new Error('aborted'));
    await expect(mod.useCtfStore.getState().updateNoteContent('late-note', 'b')).rejects.toThrow('aborted');
  });
});

describe('item 11: same profile in two tabs merges per machine', () => {
  const NEWER = '2030-01-01T00:00:00.000Z';
  const otherTabWrites = (machines: Machine[], extra: Record<string, unknown> = {}) =>
    window.dispatchEvent(
      new StorageEvent('storage', { key: PROFILE_KEY, newValue: JSON.stringify({ machines, activeTargetId: null, ...extra }) })
    );
  const byId = (mod: StoreModule, id: string) => mod.useCtfStore.getState().machines.find((m) => m.id === id);

  it("keeps this tab's unsaved newer edit and takes the other tab's edit to another machine", async () => {
    seedStorage([box('custom-a'), box('custom-b')]);
    const mod = await boot();
    mod.useCtfStore.getState().updateMachine('custom-a', { ip: '10.10.1.1' }); // pending (debounced) edit

    otherTabWrites([box('custom-a'), box('custom-b', { ip: '10.10.2.2', updatedAt: '2025-01-01T00:00:00.000Z' })]);
    expect(byId(mod, 'custom-a')?.ip).toBe('10.10.1.1');
    expect(byId(mod, 'custom-b')?.ip).toBe('10.10.2.2');

    mod.flushProfileSave();
    const stored = storedProfile().machines;
    expect(stored.find((m: Machine) => m.id === 'custom-a').ip).toBe('10.10.1.1');
    expect(stored.find((m: Machine) => m.id === 'custom-b').ip).toBe('10.10.2.2');
  });

  it('a newer row from the other tab still wins over an older unsaved row here', async () => {
    seedStorage([box('custom-a')]);
    const mod = await boot();
    mod.useCtfStore.getState().updateMachine('custom-a', { ip: '10.10.1.1' });
    otherTabWrites([box('custom-a', { ip: '10.10.9.9', updatedAt: NEWER })]);
    expect(byId(mod, 'custom-a')?.ip).toBe('10.10.9.9');
  });

  it('keeps an unsaved machine only this tab has, unless the other tab tombstoned it', async () => {
    seedStorage([box('custom-a')]);
    const mod = await boot();
    mod.useCtfStore.setState((s) => ({ machines: [box('custom-new'), ...s.machines] })); // not saved yet
    otherTabWrites([box('custom-a')]);
    expect(byId(mod, 'custom-new')).toBeTruthy();

    mod.useCtfStore.setState((s) => ({ machines: [box('custom-new2'), ...s.machines] }));
    otherTabWrites([box('custom-a')], { deletedMachineIds: [{ id: 'custom-new2', deletedAt: NEWER }] });
    expect(byId(mod, 'custom-new2')).toBeUndefined();
  });

  it('rows already saved here defer to the other tab, and applying that writes nothing back', async () => {
    seedStorage([box('custom-a'), box('custom-b')]);
    const mod = await boot();
    mod.useCtfStore.getState().updateMachine('custom-a', { ip: '10.10.1.1' });
    mod.flushProfileSave(); // saved: no longer a pending edit
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    otherTabWrites([box('custom-a'), box('custom-b')]); // e.g. a reset/revert written there after our save
    expect(byId(mod, 'custom-a')?.ip).toBe('10.10.10.5');
    await new Promise((r) => setTimeout(r, 1_400));
    expect(spy.mock.calls.filter((c) => c[0] === PROFILE_KEY)).toHaveLength(0);
  });
});

describe('pagehide flushes like visibilitychange hidden', () => {
  it('saves pending edits and the running timer on pagehide', async () => {
    seedStorage([box('custom-a')]);
    const mod = await boot();
    mod.useCtfStore.getState().setActiveTarget('custom-a');
    mod.useCtfStore.getState().updateMachine('custom-a', { ip: '10.10.4.4' }); // pending (debounced)
    mod.useCtfStore.setState({ isTimerRunning: true, activeTimerSeconds: 42 });
    window.dispatchEvent(new Event('pagehide'));
    const row = storedProfile().machines.find((m: Machine) => m.id === 'custom-a');
    expect(row.ip).toBe('10.10.4.4');
    expect(row.timeSpentSeconds).toBe(42);
  });
});

describe('advisor 1+2: deep-record hydration is profile-guarded and failure-aware', () => {
  const deferred = () => {
    let resolve!: (v: any) => void;
    let reject!: (e: unknown) => void;
    const promise = new Promise<any>((res, rej) => ((resolve = res), (reject = rej)));
    return { promise, resolve, reject };
  };

  it("a slow boot read never lands in (or marks loaded) the profile the tab switched to", async () => {
    seedStorage([box('custom-shared')]);
    localStorage.setItem('zerobox_operator_profile_p2', JSON.stringify({ machines: [box('custom-shared')] }));
    const reads: Record<string, ReturnType<typeof deferred>> = { guest: deferred(), p2: deferred() };
    idb.deepLoader = (id) => reads[id].promise;
    const mod = await boot();
    const s = () => mod.useCtfStore.getState();

    s().loadProfileData('p2');
    reads.guest.resolve({ writeups: { 'custom-shared': { writeupMarkdown: 'GUEST BODY' } }, customNotes: [] });
    await new Promise((r) => setTimeout(r, 0));
    expect(s().currentProfileId).toBe('p2');
    expect(s().machines.find((m) => m.id === 'custom-shared')?.writeupMarkdown || '').toBe('');
    expect(s().isDeepStorageLoaded).toBe(false);

    reads.p2.resolve(null);
    await vi.waitFor(() => expect(s().isDeepStorageLoaded).toBe(true));
  });

  it('a failed deep read keeps deep saves off (no empty record over IndexedDB-only bodies), then retries', async () => {
    seedStorage([box('custom-a')]);
    idb.deep.set('guest', { writeups: { 'custom-a': { writeupMarkdown: 'ONLY IN IDB' } }, customNotes: [] });
    let fail = true;
    idb.deepLoader = async (id) => {
      if (fail) throw new Error('IndexedDB blocked');
      return idb.deep.get(id) ?? null;
    };
    const mod = await boot();
    const s = () => mod.useCtfStore.getState();
    await new Promise((r) => setTimeout(r, 0));
    expect(s().isDeepStorageLoaded).toBe(false);
    s().updateMachine('custom-a', { ip: '10.10.5.5' });
    mod.flushProfileSave();
    expect(idb.deep.get('guest').writeups['custom-a'].writeupMarkdown).toBe('ONLY IN IDB');

    fail = false;
    await vi.waitFor(() => expect(s().isDeepStorageLoaded).toBe(true), { timeout: 4_000 });
    expect(s().machines.find((m) => m.id === 'custom-a')?.writeupMarkdown).toBe('ONLY IN IDB');
  });
});

describe("advisor 3: another tab's write supersedes the in-memory copy", () => {
  it("a STATE_UPDATED reload after a failed write reads the other tab's data, not this tab's stale memory copy", async () => {
    const row = (id: string) => box(id, { platform: 'HTB', isCustom: undefined });
    seedStorage([row('htb-zz-a'), row('htb-zz-old')]);
    const mod = await boot();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' });
    });
    mod.useCtfStore.getState().updateMachine('htb-zz-a', { ip: '10.10.6.6' });
    mod.flushProfileSave(); // fails: held in memory
    spy.mockRestore();
    expect(JSON.parse(mod.safeLocalStorage.getItem(PROFILE_KEY) as string).machines.some((m: Machine) => m.id === 'htb-zz-old')).toBe(true);

    // Another tab resets: it writes a profile without custom-old, then broadcasts STATE_UPDATED.
    const reset = JSON.stringify({ machines: [row('htb-zz-a')], activeTargetId: null });
    localStorage.setItem(PROFILE_KEY, reset);
    window.dispatchEvent(new StorageEvent('storage', { key: PROFILE_KEY, newValue: reset }));
    expect(mod.safeLocalStorage.getItem(PROFILE_KEY)).toBe(reset);
    expect(mod.loadInitialProfileData('guest').machines.some((m: Machine) => m.id === 'htb-zz-old')).toBe(false);
  });
});

describe('advisor 5: IndexedDB copy restore and stamps', () => {
  it('does not restore over edits the user made before the IndexedDB read finished', async () => {
    let release!: (v: unknown) => void;
    idb.workspaceLoader = () => new Promise((r) => (release = r));
    const mod = await boot(); // localStorage empty: restore would apply
    mod.useCtfStore.getState().setGlobalVars({ targetIp: '10.10.77.77' });
    release({ machines: [box('custom-from-idb')], activeTargetId: null, savedAt: '2026-10-01T00:00:00.000Z' });
    await new Promise((r) => setTimeout(r, 0));
    expect(ids(mod.useCtfStore.getState().machines)).not.toContain('custom-from-idb');
    expect(mod.useCtfStore.getState().globalVars.targetIp).toBe('10.10.77.77');
  });

  it('still restores when the only change since boot was the catalog/deep hydration', async () => {
    let release!: (v: unknown) => void;
    idb.workspaceLoader = () => new Promise((r) => (release = r));
    const mod = await boot();
    await mod.useCtfStore.getState().loadCatalog();
    release({ machines: [box('custom-from-idb')], activeTargetId: null, savedAt: '2026-10-01T00:00:00.000Z' });
    await vi.waitFor(() => expect(ids(mod.useCtfStore.getState().machines)).toContain('custom-from-idb'));
  });

  it('saveProfileData updates the IndexedDB copy with the same savedAt', async () => {
    seedStorage([box('custom-mine')]);
    const mod = await boot();
    mod.useCtfStore.getState().updateMachine('custom-mine', { ip: '10.10.8.8' });
    mod.useCtfStore.getState().saveProfileData();
    const copy = idb.workspace.get('zb:workspace:guest') as { savedAt: string; machines: Machine[] };
    expect(copy.savedAt).toBe(storedProfile().savedAt);
    expect(copy.machines.find((m) => m.id === 'custom-mine')?.ip).toBe('10.10.8.8');
  });

  it("migrateGuestData stamps the destination fresh instead of copying guest's savedAt", async () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ machines: [box('custom-g')], savedAt: '2020-01-01T00:00:00.000Z' }));
    await boot();
    const { useAuthStore } = await import('../../store/useAuthStore');
    await useAuthStore.getState().migrateGuestData('p9');
    const dest = JSON.parse(localStorage.getItem('zerobox_operator_profile_p9') as string);
    expect(dest.savedAt).not.toBe('2020-01-01T00:00:00.000Z');
    expect(Date.parse(dest.savedAt)).toBeGreaterThan(Date.parse('2026-01-01T00:00:00.000Z'));
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

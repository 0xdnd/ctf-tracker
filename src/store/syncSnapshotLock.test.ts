import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Same harness as restoreCrossTab.test.ts: two "tabs" = two module instances sharing localStorage, an
// in-memory IndexedDB that survives resetModules, and a fake BroadcastChannel bus.
const idb = vi.hoisted(() => ({ records: new Map<string, string>() }));

class FakeBroadcastChannel {
  static peers: FakeBroadcastChannel[] = [];
  listeners = new Set<(event: { data: unknown }) => void>();
  closed = false;
  constructor(readonly name: string) {
    FakeBroadcastChannel.peers.push(this);
  }
  addEventListener(_type: 'message', cb: (event: { data: unknown }) => void) {
    this.listeners.add(cb);
  }
  removeEventListener(_type: 'message', cb: (event: { data: unknown }) => void) {
    this.listeners.delete(cb);
  }
  postMessage(data: unknown) {
    for (const peer of FakeBroadcastChannel.peers) {
      if (peer === this || peer.closed || peer.name !== this.name) continue;
      setTimeout(() => peer.listeners.forEach((cb) => cb({ data: structuredClone(data) })), 0);
    }
  }
  close() {
    this.closed = true;
  }
}

/** Minimal shared Web Locks stand-in (exclusive, ifAvailable only). */
class FakeLockManager {
  held = new Set<string>();
  async request<R>(name: string, _opts: { ifAvailable: boolean }, cb: (lock: unknown) => Promise<R>): Promise<R> {
    if (this.held.has(name)) return cb(null);
    this.held.add(name);
    try {
      return await cb({ name });
    } finally {
      this.held.delete(name);
    }
  }
}

const currentGate = () => import('../utils/schemaWriteGate');
vi.mock('../utils/resilientStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/resilientStorage')>();
  return {
    ...actual,
    putResilientRecord: async (key: string, value: string) => {
      if ((await currentGate()).isSchemaWriteGated()) return false;
      idb.records.set(key, value);
      return true;
    },
    getResilientRecord: async (key: string) => idb.records.get(key) ?? null,
    listResilientRecordKeys: async (prefix: string) => [...idb.records.keys()].filter((k) => k.startsWith(prefix)),
    deleteResilientRecord: async (key: string) => {
      if ((await currentGate()).isSchemaWriteGated()) return false;
      return idb.records.delete(key);
    },
    saveWorkspaceToIdb: async () => !(await currentGate()).isSchemaWriteGated(),
  };
});

// IndexedDB deep storage stand-in (writeups pruned out of a full localStorage live here).
const deepDb = vi.hoisted(() => ({ profiles: new Map<string, unknown>() }));
vi.mock('../utils/indexedDbDeepStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/indexedDbDeepStorage')>();
  return {
    ...actual,
    loadDeepProfileData: async (pid: string) => (deepDb.profiles.get(pid) ?? null) as never,
    restoreDeepProfileData: async (pid: string, payload: unknown) => {
      deepDb.profiles.set(pid, payload);
      return true;
    },
  };
});

const LOCK_KEY = 'zerobox_restore_in_progress';

const boot = async () => {
  vi.resetModules();
  const store = await import('./useCtfStore');
  const backup = await import('./preMigrationBackup');
  const lock = await import('../utils/syncLock');
  const gate = await import('../utils/schemaWriteGate');
  const toasts = await import('./useToastStore');
  return { ...store, ...backup, ...lock, gate, toasts };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

beforeEach(() => {
  localStorage.clear();
  idb.records.clear();
  deepDb.profiles.clear();
  FakeBroadcastChannel.peers.forEach((c) => c.close());
  FakeBroadcastChannel.peers = [];
  vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (navigator as { locks?: unknown }).locks;
});

describe('pre-sync snapshot (reason)', () => {
  it('is saved with reason pre-sync, covers loot and graph keys, and is listed next to migration snapshots', async () => {
    const tab = await boot();
    localStorage.setItem('zerobox_operator_profile_guest', '{"machines":[]}');
    localStorage.setItem('zerobox_loot_v2_guest', '{"schemaVersion":1,"credentials":[]}');
    localStorage.setItem('zerobox-attack-graph-state', '{"graphEdges":[]}');
    localStorage.setItem('unrelated_key', 'x');
    expect(await tab.takePreSyncSnapshot()).toBe('saved');
    expect(await tab.takePreSyncSnapshot()).toBe('duplicate'); // identical content: deduped

    const list = await tab.listPreMigrationBackups();
    const snap = list.find((s) => s.reason === 'pre-sync')!;
    expect(snap.key.startsWith(tab.PRESYNC_PREFIX)).toBe(true);
    const rec = JSON.parse(idb.records.get(snap.key)!);
    expect(rec.reason).toBe('pre-sync');
    expect(Object.keys(rec.entries)).toEqual(
      expect.arrayContaining(['zerobox_operator_profile_guest', 'zerobox_loot_v2_guest', 'zerobox-attack-graph-state'])
    );
    expect(rec.entries.unrelated_key).toBeUndefined();
  });

  it('covers the profile IndexedDB deep record (pruned writeups) and restore writes it back', async () => {
    const tab = await boot();
    localStorage.setItem('zerobox_operator_profile_guest', '{"machines":[{"id":"htb-a"}]}');
    const before = { writeups: { 'htb-a': { writeupMarkdown: '# only in IndexedDB' } }, customNotes: [], updatedAt: 'x' };
    deepDb.profiles.set('guest', before);
    expect(await tab.takePreSyncSnapshot('guest')).toBe('saved');
    const [snap] = await tab.listPreMigrationBackups();
    expect(JSON.parse(JSON.parse(idb.records.get(snap.key)!).deep.payload)).toEqual(before);

    // the merge overwrites the deep record...
    deepDb.profiles.set('guest', { writeups: { 'htb-a': { writeupMarkdown: '# merged' } }, customNotes: [], updatedAt: 'y' });
    expect(await tab.restorePreMigrationBackup(snap.key, { reload: vi.fn(), settleMs: 0 })).toBe(true);
    expect(deepDb.profiles.get('guest')).toEqual(before); // ...and restore brings the original back
    // the safety copy taken before restoring holds the merged deep record
    const safety = [...idb.records.entries()].find(([k]) => k.startsWith('prerestore_'))!;
    expect(JSON.parse(JSON.parse(safety[1]).deep.payload).writeups['htb-a'].writeupMarkdown).toBe('# merged');
  });

  it("returns 'empty' when there is no stored data at all (nothing a merge could overwrite)", async () => {
    const tab = await boot();
    localStorage.clear();
    expect(await tab.takePreSyncSnapshot('guest')).toBe('empty');
  });

  it('is restorable: restore writes the exact pre-sync strings back, loot included', async () => {
    const tab = await boot();
    localStorage.setItem('zerobox_operator_profile_guest', '{"machines":["before"]}');
    localStorage.setItem('zerobox_loot_v2_guest', '{"before":true}');
    await tab.takePreSyncSnapshot();
    const [snap] = await tab.listPreMigrationBackups();
    localStorage.setItem('zerobox_operator_profile_guest', '{"machines":["merged"]}');
    localStorage.setItem('zerobox_loot_v2_guest', '{"merged":true}');
    const reload = vi.fn();
    expect(await tab.restorePreMigrationBackup(snap.key, { reload, settleMs: 0 })).toBe(true);
    expect(localStorage.getItem('zerobox_operator_profile_guest')).toBe('{"machines":["before"]}');
    expect(localStorage.getItem('zerobox_loot_v2_guest')).toBe('{"before":true}');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('is skipped (never written) while the tab is gated', async () => {
    const tab = await boot();
    localStorage.setItem('zerobox_operator_profile_guest', '{}');
    tab.gate.engageSchemaWriteGate('newer-schema');
    expect(await tab.takePreSyncSnapshot()).toBe('skipped');
    expect([...idb.records.keys()].some((k) => k.startsWith('presync_'))).toBe(false);
  });

  it('keeps only the newest MAX_PRESYNC_BACKUPS', async () => {
    const tab = await boot();
    for (let i = 0; i < 5; i++) {
      localStorage.setItem('zerobox_operator_profile_guest', `{"n":${i}}`);
      expect(await tab.takePreSyncSnapshot()).toBe('saved');
      await sleep(2); // distinct timestamps in the key
    }
    const kept = (await tab.listPreMigrationBackups()).filter((s) => s.reason === 'pre-sync');
    expect(kept).toHaveLength(tab.MAX_PRESYNC_BACKUPS);
    expect(JSON.parse(idb.records.get(kept[0].key)!).entries.zerobox_operator_profile_guest).toBe('{"n":4}');
  });
});

describe('sync lock (invariant 3)', () => {
  it('a second tab is refused while the first holds the Web Lock', async () => {
    const locks = new FakeLockManager();
    Object.defineProperty(navigator, 'locks', { value: locks, configurable: true });
    const a = await boot();
    const b = await boot();
    const gateOpen = deferred();
    const applyA = vi.fn(async () => {
      await gateOpen.promise;
      return 'A';
    });
    const applyB = vi.fn(async () => 'B');
    const running = a.withSyncLock(applyA, { settleMs: 0 });
    await sleep(10);
    // B is refused (A's restore lock also gates it by now) and never runs its merge.
    expect((await b.withSyncLock(applyB, { settleMs: 0 })).status).not.toBe('applied');
    expect(applyB).not.toHaveBeenCalled();
    gateOpen.resolve();
    expect(await running).toEqual({ status: 'applied', value: 'A' });

  });

  it('the Web Lock alone refuses a second tab with busy (before any restore lock exists)', async () => {
    const locks = new FakeLockManager();
    Object.defineProperty(navigator, 'locks', { value: locks, configurable: true });
    const tab = await boot();
    locks.held.add(tab.SYNC_LOCK_NAME); // another tab is inside the lock
    const apply = vi.fn(async () => 'x');
    expect(await tab.withSyncLock(apply, { settleMs: 0 })).toEqual({ status: 'busy' });
    expect(apply).not.toHaveBeenCalled();
  });

  it('without navigator.locks, a second tab is refused by the live restore lock', async () => {
    const a = await boot();
    const b = await boot();
    b.setRestoreReloadHandler(vi.fn());
    const gateOpen = deferred();
    const running = a.withSyncLock(async () => gateOpen.promise, { settleMs: 0 });
    await sleep(10);
    expect(JSON.parse(localStorage.getItem(LOCK_KEY)!).kind).toBe('sync');
    const applyB = vi.fn(async () => 'B');
    expect(await b.withSyncLock(applyB)).toEqual({ status: 'gated' });
    expect(applyB).not.toHaveBeenCalled();
    gateOpen.resolve();
    expect((await running).status).toBe('applied');
  });

  it('the same tab cannot start a second merge while one runs', async () => {
    const tab = await boot();
    const gateOpen = deferred();
    const first = tab.withSyncLock(async () => gateOpen.promise, { settleMs: 0 });
    expect(await tab.withSyncLock(async () => 'again')).toEqual({ status: 'busy' });
    gateOpen.resolve();
    await first;
  });

  it('a merge is refused under the write gate, and while another tab restores', async () => {
    const tab = await boot();
    const apply = vi.fn(async () => 'x');
    localStorage.setItem(LOCK_KEY, JSON.stringify({ ts: Date.now(), token: 'other-tab' }));
    expect(await tab.withSyncLock(apply)).toEqual({ status: 'gated' });
    localStorage.removeItem(LOCK_KEY);
    tab.gate.releaseRestoreWriteGate();
    tab.gate.engageSchemaWriteGate('newer-schema');
    expect(await tab.withSyncLock(apply)).toEqual({ status: 'gated' });
    expect(apply).not.toHaveBeenCalled();
  });

  it('other tabs are gated while the merge writes and reload afterwards; the merging tab keeps writing', async () => {
    const a = await boot();
    const b = await boot();
    const reloadB = vi.fn();
    b.setRestoreReloadHandler(reloadB);
    let bGatedDuringApply = false;
    let aGatedDuringApply = true;
    const res = await a.withSyncLock(
      async () => {
        await sleep(20);
        bGatedDuringApply = b.gate.isSchemaWriteGated();
        aGatedDuringApply = a.gate.isSchemaWriteGated();
        return 'done';
      },
      { settleMs: 20 }
    );
    expect(res).toEqual({ status: 'applied', value: 'done' });
    expect(bGatedDuringApply).toBe(true);
    expect(aGatedDuringApply).toBe(false);
    expect(b.toasts.useToastStore.getState().toasts.some((t) => t.message === b.SYNC_FOLLOWER_TOAST_MESSAGE)).toBe(true);
    await sleep(20);
    expect(localStorage.getItem(LOCK_KEY)).toBeNull();
    expect(reloadB).toHaveBeenCalledTimes(1);
  });

  it('a failing merge aborts: the other tabs are released, not reloaded', async () => {
    const a = await boot();
    const b = await boot();
    const reloadB = vi.fn();
    b.setRestoreReloadHandler(reloadB);
    await expect(
      a.withSyncLock(async () => {
        await sleep(10);
        throw new Error('snapshot failed');
      }, { settleMs: 10 })
    ).rejects.toThrow('snapshot failed');
    await sleep(20);
    expect(localStorage.getItem(LOCK_KEY)).toBeNull();
    expect(b.gate.isSchemaWriteGated()).toBe(false);
    expect(reloadB).not.toHaveBeenCalled();
    expect(a.gate.isSchemaWriteGated()).toBe(false);
  });
});

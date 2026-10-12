import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Machine } from '../types';

// Two "tabs" = two module instances (vi.resetModules between boots) sharing one localStorage, like real tabs.
// IndexedDB is an in-memory map that survives resetModules; BroadcastChannel is a fake bus (one instance per
// boot, since crossTabChannel is re-evaluated by every boot).
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
    // Like a real BroadcastChannel: async, and never delivered to the posting instance itself.
    for (const peer of FakeBroadcastChannel.peers) {
      if (peer === this || peer.closed || peer.name !== this.name) continue;
      setTimeout(() => peer.listeners.forEach((cb) => cb({ data: structuredClone(data) })), 0);
    }
  }
  close() {
    this.closed = true;
  }
}

// The gate is imported lazily so it is always the current boot's instance (a mock factory is not re-run).
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

const PERSIST_KEY = 'zerobox-tactical-store';
const LOCK_KEY = 'zerobox_restore_in_progress';

const lame = (note: string, status: Machine['status'] = 'root'): Machine =>
  ({
    id: 'htb-lame',
    name: 'Lame',
    ip: '10.10.10.3',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status,
    tags: [],
    certifications: [],
    timeSpentSeconds: 900,
    userFlag: 'HTB{lame_user}',
    quickNotes: note,
    isCustom: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }) as Machine;

/** A v2 install, so the first boot migrates and takes the pre-update snapshot we later restore. */
const seedV2 = (note: string) => {
  const machines = [lame(note)];
  const profile = JSON.stringify({ machines, userSolvesReset: false });
  const strings: Record<string, string> = {
    [PERSIST_KEY]: JSON.stringify({ state: { machines, userSolvesReset: false, currentProfileId: 'guest' }, version: 2 }),
    zerobox_operator_profile_guest: profile,
    specter_ctf_profile_guest: profile,
    zerobox_custom_machines_v1: JSON.stringify(machines),
    zerobox_custom_machines_v1_guest: JSON.stringify(machines),
  };
  for (const [k, v] of Object.entries(strings)) localStorage.setItem(k, v);
  return strings;
};

const boot = async () => {
  vi.resetModules();
  const store = await import('./useCtfStore');
  const backup = await import('./preMigrationBackup');
  const gate = await import('../utils/schemaWriteGate');
  const toasts = await import('./useToastStore');
  return { ...store, ...backup, gate, toasts };
};
type Tab = Awaited<ReturnType<typeof boot>>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const followerToast = (tab: Tab) =>
  tab.toasts.useToastStore.getState().toasts.find((t) => t.message === 'Restoring a snapshot in another tab…');

const expectBytes = (expected: Record<string, string>) => {
  for (const [k, v] of Object.entries(expected)) expect(localStorage.getItem(k)).toBe(v);
};

beforeEach(() => {
  localStorage.clear();
  idb.records.clear();
  // Disconnect tabs booted by earlier tests from the fake channel.
  FakeBroadcastChannel.peers.forEach((c) => c.close());
  FakeBroadcastChannel.peers = [];
  vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('cross-tab restore lock', () => {
  // Runs first in the file: no tab from an earlier test is listening on window, so the beforeunload dispatch
  // reaches exactly tabs A and B.
  it('tab B with unsaved edits cannot overwrite the strings tab A restored (debounced save, beforeunload)', async () => {
    const seeded = seedV2('original');
    const a = await boot();
    expect(await a.whenPreMigrationBackupSettled()).toBe('saved');
    const [snap] = await a.listPreMigrationBackups();
    a.setRestoreReloadHandler(vi.fn());

    const b = await boot(); // second tab, opened after the update (no migration)
    const reloadB = vi.fn();
    b.setRestoreReloadHandler(reloadB);
    expect(b.gate.isSchemaWriteGated()).toBe(false);

    // B has pending, unsaved state: the 1200 ms debounced save is armed but has not fired.
    b.useCtfStore.getState().updateMachineStatus('htb-lame', 'completed');
    b.useCtfStore.getState().setGlobalVars({ lhost: '10.10.14.77' } as never);

    const reloadA = vi.fn();
    const restoring = a.restorePreMigrationBackup(snap.key, { reload: reloadA });

    // The lock and RESTORING land before A writes anything.
    await sleep(50);
    expect(JSON.parse(localStorage.getItem(LOCK_KEY)!)).toEqual({ ts: expect.any(Number), token: expect.any(String) });
    expect(b.gate.getSchemaWriteGateReason()).toBe('restoring');
    expect(b.isRestoreFollower()).toBe(true);
    expect(followerToast(b)?.durationMs).toBe(0); // sticky

    expect(await restoring).toBe(true);
    expect(reloadA).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LOCK_KEY)).toBeNull();
    expectBytes(seeded);

    // B fires its debounced save, more edits, the beforeunload flush and an explicit flush: all no-ops.
    await sleep(1300);
    b.useCtfStore.getState().updateMachineStatus('htb-lame', 'recon');
    window.dispatchEvent(new Event('beforeunload'));
    b.flushProfileSave();
    b.useCtfStore.getState().saveProfileData();
    expectBytes(seeded);

    // RESTORED (and the cleared lock) reload B exactly once.
    expect(reloadB).toHaveBeenCalledTimes(1);
  });

  it('B reloads when the lock is cleared or RESTORED arrives, but not on unrelated keys', async () => {
    const tab = await boot();
    const reload = vi.fn();
    tab.setRestoreReloadHandler(reload);

    expect(tab.handleRestoreLockStorageEvent('zerobox_operator_profile_guest', '{}')).toBe(false);
    const lock = JSON.stringify({ ts: Date.now(), token: 't1' });
    expect(tab.handleRestoreLockStorageEvent(LOCK_KEY, lock)).toBe(true);
    expect(tab.gate.isSchemaWriteGated()).toBe(true);
    expect(followerToast(tab)).toBeDefined();
    expect(reload).not.toHaveBeenCalled();

    tab.handleRestoreLockStorageEvent(LOCK_KEY, null); // lock cleared by the restoring tab
    expect(reload).toHaveBeenCalledTimes(1);

    const other = await boot();
    const reloadOther = vi.fn();
    other.setRestoreReloadHandler(reloadOther);
    expect(other.handleRestoreBroadcast({ type: 'RESTORED', token: 't1' })).toBe(true);
    expect(other.gate.isSchemaWriteGated()).toBe(true); // a tab that missed RESTORING still never flushes
    expect(reloadOther).toHaveBeenCalledTimes(1);
    expect(other.handleRestoreBroadcast({ type: 'STATE_UPDATED' })).toBe(false);
  });

  it('a write racing the events is caught by the synchronous lock check', async () => {
    const tab = await boot();
    tab.setRestoreReloadHandler(vi.fn());
    const before = localStorage.getItem(PERSIST_KEY);
    localStorage.setItem(LOCK_KEY, JSON.stringify({ ts: Date.now(), token: 'race' })); // no event delivered yet
    tab.useCtfStore.getState().updateMachineStatus('htb-lame', 'completed');
    tab.flushProfileSave();
    expect(localStorage.getItem(PERSIST_KEY)).toBe(before);
    expect(localStorage.getItem('zerobox_operator_profile_guest')).toBeNull();
    expect(tab.isRestoreFollower()).toBe(true);
  });

  it('an aborted restore releases B, which then saves the state it held back', async () => {
    const tab = await boot();
    tab.setRestoreReloadHandler(vi.fn());
    tab.handleRestoreBroadcast({ type: 'RESTORING', token: 'ab' });
    localStorage.setItem(LOCK_KEY, JSON.stringify({ ts: Date.now(), token: 'ab' }));
    tab.useCtfStore.getState().updateMachineStatus('htb-lame', 'completed');
    tab.flushProfileSave();
    expect(localStorage.getItem('zerobox_operator_profile_guest')).toBeNull();

    // the channel message can beat the storage update: the token is ignored even while the lock is visible
    tab.handleRestoreBroadcast({ type: 'RESTORE_ABORTED', token: 'ab' });
    expect(tab.gate.isSchemaWriteGated()).toBe(false);
    expect(followerToast(tab)).toBeUndefined();
    const saved = JSON.parse(localStorage.getItem('zerobox_operator_profile_guest')!);
    expect(saved.machines.find((m: Machine) => m.id === 'htb-lame').status).toBe('completed');
  });

  it('a failed write rolls back, releases the lock and tells the other tabs', async () => {
    const seeded = seedV2('original');
    const a = await boot();
    await a.whenPreMigrationBackupSettled();
    const [snap] = await a.listPreMigrationBackups();
    const b = await boot();
    b.setRestoreReloadHandler(vi.fn());
    const before: Record<string, string> = {};
    for (const k of Object.keys(seeded)) before[k] = localStorage.getItem(k)!;
    const realSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === 'zerobox_custom_machines_v1_guest' && a.gate.getSchemaWriteGateReason() === 'restoring') {
        throw new DOMException('full', 'QuotaExceededError');
      }
      return realSet.call(this, k, v);
    });
    const reloadA = vi.fn();
    expect(await a.restorePreMigrationBackup(snap.key, { reload: reloadA, settleMs: 20 })).toBe(false);
    expect(reloadA).not.toHaveBeenCalled();
    expectBytes(before);
    expect(localStorage.getItem(LOCK_KEY)).toBeNull();
    expect(a.gate.isSchemaWriteGated()).toBe(false);
    await sleep(20);
    expect(b.gate.isSchemaWriteGated()).toBe(false); // RESTORE_ABORTED released B
  });

  it('a lock older than 60 s on boot is stale: cleared with a warning, and the tab is not gated', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(LOCK_KEY, JSON.stringify({ ts: Date.now() - 61_000, token: 'dead-tab' }));
    const tab = await boot();
    expect(localStorage.getItem(LOCK_KEY)).toBeNull();
    expect(tab.gate.isSchemaWriteGated()).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('stale restore lock'));
    tab.useCtfStore.getState().updateMachineStatus('htb-lame', 'completed');
    tab.flushProfileSave();
    expect(localStorage.getItem('zerobox_operator_profile_guest')).not.toBeNull(); // writes work
  });

  it('a fresh lock on boot gates the new tab until the restore finishes', async () => {
    localStorage.setItem(LOCK_KEY, JSON.stringify({ ts: Date.now() - 1000, token: 'live' }));
    const tab = await boot();
    const reload = vi.fn();
    tab.setRestoreReloadHandler(reload);
    expect(tab.gate.getSchemaWriteGateReason()).toBe('restoring');
    expect(localStorage.getItem(LOCK_KEY)).not.toBeNull();
    tab.handleRestoreLockStorageEvent(LOCK_KEY, null);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('a follower never stays gated past a stale lock, even if every event is missed', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    try {
      const tab = await boot();
      const reload = vi.fn();
      tab.setRestoreReloadHandler(reload);
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem(LOCK_KEY, JSON.stringify({ ts: Date.now(), token: 'crashed' }));
      tab.handleRestoreLockStorageEvent(LOCK_KEY, localStorage.getItem(LOCK_KEY));
      expect(tab.isRestoreFollower()).toBe(true);
      vi.advanceTimersByTime(59_000);
      expect(reload).not.toHaveBeenCalled();
      vi.advanceTimersByTime(2_000);
      expect(localStorage.getItem(LOCK_KEY)).toBeNull();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('stale restore lock'));
      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

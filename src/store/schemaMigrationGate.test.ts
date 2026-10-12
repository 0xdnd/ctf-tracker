import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Machine } from '../types';

// In-memory stand-in for the raw IndexedDB records (jsdom has no IndexedDB). Lives in vi.hoisted scope so it
// survives vi.resetModules() between simulated boots, like a real database survives reloads.
const idb = vi.hoisted(() => ({ records: new Map<string, string>() }));

vi.mock('../utils/resilientStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/resilientStorage')>();
  const gate = await import('../utils/schemaWriteGate');
  return {
    ...actual,
    putResilientRecord: async (key: string, value: string) => {
      if (gate.isSchemaWriteGated()) return false;
      idb.records.set(key, value);
      return true;
    },
    getResilientRecord: async (key: string) => idb.records.get(key) ?? null,
    listResilientRecordKeys: async (prefix: string) => [...idb.records.keys()].filter((k) => k.startsWith(prefix)),
    deleteResilientRecord: async (key: string) => {
      if (gate.isSchemaWriteGated()) return false;
      return idb.records.delete(key);
    },
  };
});

const PERSIST_KEY = 'zerobox-tactical-store';

const stampedLame = (note: string): Machine =>
  ({
    id: 'htb-lame',
    name: 'Lame',
    ip: '10.10.10.3',
    os: 'Linux',
    platform: 'HTB',
    difficulty: 'Easy',
    status: 'root',
    tags: [],
    certifications: [],
    timeSpentSeconds: 900,
    userFlag: 'HTB{lame_user}',
    quickNotes: note,
    isCustom: true,
    officialSynopsis: 'heavy stale copy',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }) as Machine;

/** Seed a realistic v2 install: persist blob, both profile keys, legacy blob, isolated custom keys, loot. */
const seedV2 = (note: string, persistVersion = 2) => {
  const machines = [stampedLame(note)];
  const profile = JSON.stringify({ machines, userSolvesReset: false });
  const strings: Record<string, string> = {
    [PERSIST_KEY]: JSON.stringify({ state: { machines, userSolvesReset: false, currentProfileId: 'guest' }, version: persistVersion }),
    zerobox_operator_profile_guest: profile,
    specter_ctf_profile_guest: profile,
    specter_ctf_store_v2: JSON.stringify({ state: { machines: [] } }),
    zerobox_custom_machines_v1: JSON.stringify(machines),
    zerobox_custom_machines_v1_guest: JSON.stringify(machines),
  };
  for (const [k, v] of Object.entries(strings)) localStorage.setItem(k, v);
  localStorage.setItem('zerobox_loot_guest', '{"unrelated":true}'); // not machine data: not captured
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

const snapshotLocalStorage = () => {
  const out: Record<string, string | null> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    out[k] = localStorage.getItem(k);
  }
  return out;
};

let clock = 1_760_000_000_000;

beforeEach(() => {
  localStorage.clear();
  idb.records.clear();
  vi.spyOn(Date, 'now').mockImplementation(() => (clock += 1000));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('(6) v2 -> v3 migration takes a pre-migration backup', () => {
  it('migrates a v2 blob and snapshots every machine-data key with its exact raw string', async () => {
    const seeded = seedV2('first');
    const app = await boot();
    expect(app.SCHEMA_VERSION).toBe(3);
    expect(await app.whenPreMigrationBackupSettled()).toBe('saved');

    const keys = [...idb.records.keys()].filter((k) => k.startsWith('premigration_'));
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^premigration_2_\d+$/);
    const rec = JSON.parse(idb.records.get(keys[0])!);
    expect(rec.entries).toEqual(seeded); // exact strings, nothing else (loot key excluded)

    // migrated + normalized in memory and on disk
    const persisted = JSON.parse(localStorage.getItem(PERSIST_KEY)!);
    expect(persisted.version).toBe(3);
    const lame = persisted.state.machines.find((m: Machine) => m.id === 'htb-lame');
    expect(lame.isCustom).toBeFalsy();
    expect(lame.userFlag).toBe('HTB{lame_user}');
    expect(lame.officialSynopsis).toBeUndefined();
    expect(localStorage.getItem('zerobox_schema_version')).toBe('3');
  });

  it('dedupes identical content and keeps at most 2 backups (oldest pinned) across three migrations', async () => {
    seedV2('same');
    await (await boot()).whenPreMigrationBackupSettled();
    localStorage.clear();
    seedV2('same');
    expect(await (await boot()).whenPreMigrationBackupSettled()).toBe('duplicate');
    expect([...idb.records.keys()].filter((k) => k.startsWith('premigration_'))).toHaveLength(1);

    for (const note of ['one', 'two', 'three']) {
      localStorage.clear();
      seedV2(note);
      expect(await (await boot()).whenPreMigrationBackupSettled()).toBe('saved');
    }
    const app = await boot(); // v3 boot: no migration, no new backup
    expect(await app.whenPreMigrationBackupSettled()).toBe('skipped');
    const list = await app.listPreMigrationBackups();
    expect(list).toHaveLength(2);
    const notes = list.map((s) => JSON.parse(JSON.parse(idb.records.get(s.key)!).entries.zerobox_operator_profile_guest).machines[0].quickNotes);
    // newest first; the original (oldest) pre-update copy is pinned, only newer ones rotate
    expect(notes).toEqual(['three', 'same']);
  });

  it('restore round-trips the exact raw strings, keeps a safety copy, and blocks the unload flush', async () => {
    const seeded = seedV2('original');
    const app = await boot();
    await app.whenPreMigrationBackupSettled();
    const [snap] = await app.listPreMigrationBackups();

    // post-migration life goes on
    app.useCtfStore.getState().updateMachineStatus('htb-lame', 'completed');
    app.flushProfileSave();
    const beforeRestore = snapshotLocalStorage();
    expect(localStorage.getItem(PERSIST_KEY)).not.toBe(seeded[PERSIST_KEY]);

    const reload = vi.fn();
    expect(await app.restorePreMigrationBackup(snap.key, { reload })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    for (const [k, v] of Object.entries(seeded)) expect(localStorage.getItem(k)).toBe(v);

    // beforeunload/visibility flushes of this tab can no longer clobber the restored strings
    app.useCtfStore.getState().updateMachineStatus('htb-lame', 'recon');
    app.flushProfileSave();
    for (const [k, v] of Object.entries(seeded)) expect(localStorage.getItem(k)).toBe(v);

    // the pre-restore state was saved first
    const safetyKey = [...idb.records.keys()].find((k) => k.startsWith('prerestore_'))!;
    const safety = JSON.parse(idb.records.get(safetyKey)!);
    expect(safety.entries[PERSIST_KEY]).toBe(beforeRestore[PERSIST_KEY]);

    // the migration simply reruns on the next boot (same content: no duplicate snapshot)
    const next = await boot();
    expect(await next.whenPreMigrationBackupSettled()).toBe('duplicate');
    expect(next.useCtfStore.getState().machines.find((m) => m.id === 'htb-lame')?.isCustom).toBeFalsy();
  });
});

describe('(7) newer schema on older code blocks every write', () => {
  const exercise = (app: Awaited<ReturnType<typeof boot>>) => {
    const s = app.useCtfStore.getState();
    s.updateMachineStatus('htb-lame', 'completed');
    s.addCustomMachine({
      name: 'Gate Probe', ip: '10.0.0.9', os: 'Linux', platform: 'Custom', difficulty: 'Easy', status: 'backlog',
      tags: [], certifications: [], timeSpentSeconds: 0,
    } as unknown as Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>);
    s.addCredential({ type: 'password', username: 'admin', secret: 'hunter2' } as never);
    s.setGlobalVars({ lhost: '10.10.14.99' } as never);
    app.flushProfileSave();
    s.saveProfileData();
    app.saveCustomMachinesToStorage(app.useCtfStore.getState().machines);
    app.saveAttackGraphState({}, []);
    app.safeLocalStorage.setItem('probe', '1');
    app.safeLocalStorage.removeItem(PERSIST_KEY);
  };

  const expectStickyToast = (app: Awaited<ReturnType<typeof boot>>) => {
    const t = app.toasts.useToastStore.getState().toasts.find((x) => x.message === 'ZeroBox was updated in another tab — reload to continue.');
    expect(t).toBeDefined();
    expect(t?.durationMs).toBe(0);
  };

  it.each([
    ['zerobox_schema_version = 4', () => { seedV2('v4 data', 3); localStorage.setItem('zerobox_schema_version', '4'); }],
    ['persisted blob at version 4', () => { seedV2('v4 data', 4); localStorage.setItem('zerobox_schema_version', '4'); }],
    ['persisted blob at version 4 without the key', () => { seedV2('v4 data', 4); }],
  ])('%s: localStorage is byte-identical after boot and edits, and a sticky toast shows', async (_label, seed) => {
    seed();
    const before = snapshotLocalStorage();
    const app = await boot();
    expect(app.gate.isSchemaWriteGated()).toBe(true);
    exercise(app);
    await new Promise((r) => setTimeout(r, 1500)); // let debounced saves fire
    expect(snapshotLocalStorage()).toEqual(before);
    expect(await app.whenPreMigrationBackupSettled()).toBe('skipped');
    expect([...idb.records.keys()]).toHaveLength(0);
    expectStickyToast(app);
  });

  it('IndexedDB writers are no-ops while gated', async () => {
    const open = vi.fn(() => ({}) as IDBOpenDBRequest);
    vi.stubGlobal('indexedDB', { open });
    try {
      localStorage.setItem('zerobox_schema_version', '4');
      await boot();
      const resilient = await vi.importActual<typeof import('../utils/resilientStorage')>('../utils/resilientStorage');
      const deep = await import('../utils/indexedDbDeepStorage');
      const callsBefore = open.mock.calls.length;
      expect(await resilient.saveWorkspaceToIdb('zb:workspace:guest', { a: 1 })).toBe(false);
      expect(await resilient.putResilientRecord('premigration_2_1', 'x')).toBe(false);
      expect(await resilient.deleteResilientRecord('premigration_2_1')).toBe(false);
      await deep.saveDeepProfileData('guest', { writeups: {} });
      await deep.clearDeepProfileData('guest');
      await deep.deleteMachineDeepData('guest', 'htb-lame');
      expect(open.mock.calls.length).toBe(callsBefore);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('an already-open tab reacts live to the storage event and stops writing', async () => {
    const app = await boot();
    expect(app.gate.isSchemaWriteGated()).toBe(false);
    window.dispatchEvent(new StorageEvent('storage', { key: 'zerobox_schema_version', newValue: '4' }));
    expect(app.gate.isSchemaWriteGated()).toBe(true);
    expectStickyToast(app);
    const before = snapshotLocalStorage();
    exercise(app);
    expect(snapshotLocalStorage()).toEqual(before);
  });

  it('a same-version storage event does not gate', async () => {
    const app = await boot();
    window.dispatchEvent(new StorageEvent('storage', { key: 'zerobox_schema_version', newValue: '3' }));
    expect(app.gate.isSchemaWriteGated()).toBe(false);
  });
});

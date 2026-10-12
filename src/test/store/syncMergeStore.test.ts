import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Machine } from '../../types';

const idb = vi.hoisted(() => ({ records: new Map<string, string>(), failPut: false }));
const loot = vi.hoisted(() => ({ throwOnSave: false }));
const snap = vi.hoisted(() => ({ force: null as null | 'empty' | 'skipped' }));

vi.mock('../../store/preMigrationBackup', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../store/preMigrationBackup')>();
  return {
    ...actual,
    takePreSyncSnapshot: (...args: Parameters<typeof actual.takePreSyncSnapshot>) =>
      snap.force ? Promise.resolve(snap.force) : actual.takePreSyncSnapshot(...args),
  };
});

// Records every cross-tab post so a test can tell RESTORED from RESTORE_ABORTED.
const bc = vi.hoisted(() => {
  const posts: { type?: string; kind?: string }[] = [];
  class RecordingChannel {
    constructor(readonly name: string) {}
    postMessage(data: { type?: string; kind?: string }) {
      posts.push(data);
    }
    addEventListener() {}
    removeEventListener() {}
    close() {}
  }
  (globalThis as Record<string, unknown>).BroadcastChannel = RecordingChannel;
  if (typeof window !== 'undefined') (window as unknown as Record<string, unknown>).BroadcastChannel = RecordingChannel;
  return { posts };
});

vi.mock('../../store/lootPersistence', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../store/lootPersistence')>();
  return {
    ...actual,
    saveLootState: (...args: Parameters<typeof actual.saveLootState>) => {
      if (loot.throwOnSave) throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      return actual.saveLootState(...args);
    },
  };
});

vi.mock('../../utils/resilientStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/resilientStorage')>();
  const gate = await import('../../utils/schemaWriteGate');
  return {
    ...actual,
    putResilientRecord: async (key: string, value: string) => {
      if (idb.failPut || gate.isSchemaWriteGated()) return false;
      idb.records.set(key, value);
      return true;
    },
    getResilientRecord: async (key: string) => idb.records.get(key) ?? null,
    listResilientRecordKeys: async (prefix: string) => [...idb.records.keys()].filter((k) => k.startsWith(prefix)),
    deleteResilientRecord: async (key: string) => idb.records.delete(key),
    saveWorkspaceToIdb: async () => true,
  };
});

import { useCtfStore } from '../../store/useCtfStore';
import { useGoalsStore } from '../../store/useGoalsStore';
import { engageSchemaWriteGate, releaseRestoreWriteGate } from '../../utils/schemaWriteGate';
import { readSyncState } from '../../utils/syncState';

const OLD = '2026-01-01T00:00:00.000Z';
const custom = (id: string, extra: Partial<Machine> = {}): Machine =>
  ({
    id,
    name: id,
    ip: '10.10.10.9',
    os: 'Linux',
    platform: 'Custom',
    difficulty: 'Easy',
    status: 'recon',
    tags: [],
    certifications: [],
    timeSpentSeconds: 0,
    isCustom: true,
    createdAt: OLD,
    updatedAt: OLD,
    ...extra,
  }) as Machine;

const get = () => useCtfStore.getState();
const machine = (id: string) => get().machines.find((m) => m.id === id);
const presyncKeys = () => [...idb.records.keys()].filter((k) => k.startsWith('presync_'));

beforeEach(async () => {
  idb.records.clear();
  idb.failPut = false;
  releaseRestoreWriteGate();
  localStorage.removeItem('zerobox_restore_in_progress');
  localStorage.removeItem('zerobox_sync_state_v1_guest');
  await get().loadCatalog();
  const catalog = get().machines.filter((m) => !m.id.startsWith('custom-'));
  useCtfStore.setState({
    machines: [
      custom('custom-1-alpha', { status: 'foothold', userFlag: 'HTB{alpha}', quickNotes: 'alpha notes' }),
      custom('custom-2-bravo'),
      ...catalog,
    ],
    deletedMachineIds: [],
    customNotes: [],
    deletedNoteIds: [],
    activitySessions: [],
    graphEdges: [],
    credentials: [{ id: 'cred-1', type: 'password', username: 'admin', secret: 'RealSecret!', createdAt: OLD }],
    credAttempts: [],
    lootItems: [],
    activeTargetId: null,
    activeTimerSeconds: 0,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  releaseRestoreWriteGate();
});

describe('mergeBackup (store)', () => {
  it('export, change, merge back: local work survives, deletions stick, and a re-merge is a no-op', async () => {
    const file = await get().exportSyncFile();
    const parsed = JSON.parse(file);
    expect(parsed.version).toBe('2.0.0');
    expect(typeof parsed.deviceId).toBe('string');
    expect(typeof parsed.syncedAt).toBe('string');

    await new Promise((r) => setTimeout(r, 5));
    get().updateMachineStatus('custom-1-alpha', 'root'); // progress after the export
    get().deleteMachine('custom-2-bravo'); // deleted after the export

    const first = await get().mergeBackup(file);
    expect(first.status).toBe('merged');
    expect(machine('custom-1-alpha')!.status).toBe('root'); // invariant 1: never downgraded
    expect(machine('custom-2-bravo')).toBeUndefined(); // tombstone is later than the file's copy
    expect(get().deletedMachineIds.map((t) => t.id)).toEqual(['custom-2-bravo']);

    const before = JSON.stringify(get().machines);
    const second = await get().mergeBackup(file);
    expect(second).toMatchObject({ status: 'merged', summary: { added: 0, updated: 0, removed: 0 } });
    expect(JSON.stringify(get().machines)).toBe(before); // invariant 4
  });

  it('a merge bringing more time for the active target reseeds the timer, so stale local seconds never overwrite it', async () => {
    useCtfStore.setState((s) => ({
      machines: s.machines.map((m) => (m.id === 'custom-2-bravo' ? { ...m, timeSpentSeconds: 3600 } : m)),
      activeTargetId: 'custom-2-bravo',
      activeTimerSeconds: 3600,
    }));
    const file = JSON.parse(await get().exportSyncFile());
    file.deviceId = 'laptop';
    file.machines = file.machines.map((m: Machine) =>
      m.id === 'custom-2-bravo' ? { ...m, timeSpentSeconds: 10800, updatedAt: '2026-10-01T00:00:00.000Z' } : m
    );
    const res = await get().mergeBackup(JSON.stringify(file));
    expect(res.status).toBe('merged');
    expect(machine('custom-2-bravo')!.timeSpentSeconds).toBe(10800);
    expect(get().activeTimerSeconds).toBe(10800);
    get().pauseTimer();
    get().setActiveTarget(null);
    expect(machine('custom-2-bravo')!.timeSpentSeconds).toBe(10800);
  });

  it('takes a pre-sync snapshot of the pre-merge data before writing, and records the peer baseline', async () => {
    const file = JSON.parse(await get().exportSyncFile());
    file.deviceId = 'other-device';
    file.machines.push(custom('custom-3-charlie', { status: 'root', updatedAt: '2026-10-01T00:00:00.000Z' }));
    get().saveProfileData();
    const res = await get().mergeBackup(JSON.stringify(file));
    expect(res).toMatchObject({ status: 'merged', snapshot: 'saved', summary: { added: 1 } });
    expect(machine('custom-3-charlie')!.status).toBe('root');

    const [key] = presyncKeys();
    const rec = JSON.parse(idb.records.get(key)!);
    expect(rec.reason).toBe('pre-sync');
    const snapProfile = JSON.parse(rec.entries.zerobox_operator_profile_guest);
    expect(snapProfile.machines.some((m: Machine) => m.id === 'custom-3-charlie')).toBe(false); // pre-merge copy
    expect(readSyncState('guest').peers['other-device']).toBe(file.syncedAt);
  });

  it('a save that throws after the commit point still completes the merge: RESTORED, warnings surfaced', async () => {
    const file = JSON.parse(await get().exportSyncFile());
    file.deviceId = 'desktop';
    file.machines.push(custom('custom-6-foxtrot', { status: 'root', updatedAt: '2026-10-01T00:00:00.000Z' }));
    bc.posts.length = 0;
    loot.throwOnSave = true;
    try {
      const res = await get().mergeBackup(JSON.stringify(file));
      expect(res.status).toBe('merged');
      if (res.status !== 'merged') return;
      expect(res.warnings).toEqual([expect.stringMatching(/^Credentials and loot could not be saved/)]);
    } finally {
      loot.throwOnSave = false;
    }
    expect(machine('custom-6-foxtrot')!.status).toBe('root'); // the merge stands in this tab
    const types = bc.posts.filter((p) => p.kind === 'sync').map((p) => p.type);
    expect(types).toEqual(['RESTORING', 'RESTORED']); // the other tabs reload onto it, never ABORTED
    expect(localStorage.getItem('zerobox_restore_in_progress')).toBeNull();
    expect(readSyncState('guest').peers.desktop).toBe(file.syncedAt); // baseline still recorded
    const profile = JSON.parse(localStorage.getItem('zerobox_operator_profile_guest')!);
    expect(profile.machines.some((m: Machine) => m.id === 'custom-6-foxtrot')).toBe(true);
  });

  it("accepts an 'empty' snapshot (no stored data yet) but refuses a skipped one", async () => {
    const file = JSON.parse(await get().exportSyncFile());
    file.machines.push(custom('custom-7-golf', { status: 'root', updatedAt: '2026-10-01T00:00:00.000Z' }));
    try {
      snap.force = 'skipped';
      expect(await get().mergeBackup(JSON.stringify(file))).toEqual({ status: 'snapshot-failed' });
      expect(machine('custom-7-golf')).toBeUndefined();
      snap.force = 'empty';
      expect(await get().mergeBackup(JSON.stringify(file))).toMatchObject({ status: 'merged', snapshot: 'empty' });
      expect(machine('custom-7-golf')).toBeDefined();
    } finally {
      snap.force = null;
    }
  });

  it('writes nothing when the snapshot cannot be saved (invariant 2)', async () => {
    const file = JSON.parse(await get().exportSyncFile());
    file.machines.push(custom('custom-4-delta', { status: 'root', updatedAt: '2026-10-01T00:00:00.000Z' }));
    get().saveProfileData();
    const profileBefore = localStorage.getItem('zerobox_operator_profile_guest');
    idb.failPut = true;
    expect(await get().mergeBackup(JSON.stringify(file))).toEqual({ status: 'snapshot-failed' });
    expect(machine('custom-4-delta')).toBeUndefined();
    expect(localStorage.getItem('zerobox_operator_profile_guest')).toBe(profileBefore);
    expect(localStorage.getItem('zerobox_restore_in_progress')).toBeNull();
  });

  it('refuses under the write gate or while another tab restores (invariant 3)', async () => {
    const file = await get().exportSyncFile();
    localStorage.setItem('zerobox_restore_in_progress', JSON.stringify({ ts: Date.now(), token: 'elsewhere' }));
    expect(await get().mergeBackup(file)).toEqual({ status: 'gated' });
    localStorage.removeItem('zerobox_restore_in_progress');
    releaseRestoreWriteGate();
    engageSchemaWriteGate('restoring');
    expect(await get().mergeBackup(file)).toEqual({ status: 'gated' });
    expect(presyncKeys()).toEqual([]);
  });

  it('never touches device-local data: globalVars, theme, goals, node positions', async () => {
    const file = JSON.parse(await get().exportSyncFile());
    file.globalVars = { lhost: '1.2.3.4', lport: '1', targetIp: '5.6.7.8', interface: 'eth9', customVars: {} };
    file.themePreset = 'htb';
    file.goals = { weeklyRootTarget: 42 };
    file.graphNodePositions = { 'custom-1-alpha': { x: 999, y: 999 } };
    useGoalsStore.getState().setWeeklyRootTarget(3);
    useCtfStore.setState({ themePreset: 'monolith', graphNodePositions: { 'custom-1-alpha': { x: 1, y: 2 } } });
    const vars = get().globalVars;
    expect((await get().mergeBackup(JSON.stringify(file))).status).toBe('merged');
    expect(get().globalVars).toBe(vars);
    expect(get().themePreset).toBe('monolith');
    expect(useGoalsStore.getState().weeklyRootTarget).toBe(3);
    expect(get().graphNodePositions).toEqual({ 'custom-1-alpha': { x: 1, y: 2 } });
  });

  it('a legacy backup (no sync fields) merges as a union without conflicts (invariant 5)', async () => {
    const legacy = JSON.parse(get().exportBackup());
    const alpha = legacy.machines.find((m: Machine) => m.id === 'custom-1-alpha');
    alpha.status = 'recon';
    alpha.quickNotes = '';
    alpha.openPorts = [8080];
    legacy.machines.push(custom('custom-5-echo', { status: 'foothold' }));
    const res = await get().mergeBackup(JSON.stringify(legacy));
    expect(res).toMatchObject({ status: 'merged', legacy: true, summary: { removed: 0, added: 1 } });
    expect(machine('custom-1-alpha')).toMatchObject({ status: 'foothold', quickNotes: 'alpha notes', openPorts: [8080] });
    expect(machine('custom-5-echo')).toBeDefined();
  });

  it('a legacy backup with different notes on the same machine asks instead of dropping the file text', async () => {
    const legacy = JSON.parse(get().exportBackup());
    const alpha = legacy.machines.find((m: Machine) => m.id === 'custom-1-alpha');
    alpha.quickNotes = 'notes only in the old backup';
    alpha.openPorts = [8080];
    const res = await get().mergeBackup(JSON.stringify(legacy));
    expect(res.status).toBe('conflicts');
    expect(machine('custom-1-alpha')!.quickNotes).toBe('alpha notes');
    expect(presyncKeys()).toEqual([]);
  });

  it('returns conflicts and writes nothing until they are resolved', async () => {
    const file = JSON.parse(await get().exportSyncFile());
    // Both sides edit alpha after the last sync: the file's copy and this device's copy diverge.
    const alpha = file.machines.find((m: Machine) => m.id === 'custom-1-alpha');
    alpha.quickNotes = 'edited on the other device';
    alpha.updatedAt = new Date(Date.now() + 1000).toISOString();
    file.deviceId = 'laptop';
    get().updateMachine('custom-1-alpha', { quickNotes: 'edited here' });
    get().saveProfileData();
    const profileBefore = localStorage.getItem('zerobox_operator_profile_guest');

    const res = await get().mergeBackup(JSON.stringify(file));
    expect(res.status).toBe('conflicts');
    if (res.status !== 'conflicts') return;
    expect(res.conflicts.map((c) => c.id)).toEqual(['custom-1-alpha']);
    expect(machine('custom-1-alpha')!.quickNotes).toBe('edited here');
    expect(localStorage.getItem('zerobox_operator_profile_guest')).toBe(profileBefore);
    expect(presyncKeys()).toEqual([]);

    const resolved = await get().mergeBackup(JSON.stringify(file), { 'custom-1-alpha': 'incoming' });
    expect(resolved).toMatchObject({ status: 'merged', summary: { conflictsResolved: 1 } });
    expect(machine('custom-1-alpha')!.quickNotes).toBe('edited on the other device');
  });

  it('a redacted file never overwrites real local loot or flags', async () => {
    const redacted = JSON.parse(get().exportBackup({ redactSecrets: true }));
    const alpha = redacted.machines.find((m: Machine) => m.id === 'custom-1-alpha');
    alpha.userFlag = '[REDACTED]';
    expect((await get().mergeBackup(JSON.stringify(redacted))).status).toBe('merged');
    expect(get().credentials).toEqual([expect.objectContaining({ id: 'cred-1', secret: 'RealSecret!' })]);
    expect(machine('custom-1-alpha')!.userFlag).toBe('HTB{alpha}');
  });

  it('repeated one-way sync from the same device: text edits arrive without conflicts (stored base)', async () => {
    const f0 = JSON.parse(await get().exportSyncFile());
    f0.deviceId = 'laptop';
    const alpha0 = f0.machines.find((m: Machine) => m.id === 'custom-1-alpha');
    alpha0.quickNotes = 'laptop v1';
    alpha0.updatedAt = '2026-10-01T00:00:00.000Z';
    // First contact: both sides have different notes and no common ancestor yet, so the user decides once.
    expect((await get().mergeBackup(JSON.stringify(f0))).status).toBe('conflicts');
    expect((await get().mergeBackup(JSON.stringify(f0), { 'custom-1-alpha': 'incoming' })).status).toBe('merged');
    expect(machine('custom-1-alpha')!.quickNotes).toBe('laptop v1');
    expect(Object.keys(JSON.parse(localStorage.getItem('zerobox_sync_state_v1_guest')!).bases.laptop)).toContain('custom-1-alpha');

    const f1 = structuredClone(f0);
    f1.syncedAt = new Date(Date.parse(f0.syncedAt) + 60_000).toISOString();
    const alpha1 = f1.machines.find((m: Machine) => m.id === 'custom-1-alpha');
    alpha1.quickNotes = 'laptop v2';
    alpha1.updatedAt = '2026-10-01T00:00:01.000Z';
    const res = await get().mergeBackup(JSON.stringify(f1));
    expect(res.status).toBe('merged');
    expect(machine('custom-1-alpha')!.quickNotes).toBe('laptop v2');
  });

  it('rejects input that is not a backup', async () => {
    expect(await get().mergeBackup('not json')).toEqual({ status: 'invalid' });
    expect(await get().mergeBackup('{"foo":1}')).toEqual({ status: 'invalid' });
  });
});

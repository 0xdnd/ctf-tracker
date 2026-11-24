import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearDeepProfileData } from '../../utils/indexedDbDeepStorage';

type Deep = { writeups: Record<string, { writeupMarkdown?: string }>; customNotes: unknown[] };

const idb = vi.hoisted(() => ({
  deep: new Map<string, unknown>(),
  /** When true, saves are dropped (a failed IndexedDB write). */
  failWrites: false,
}));

vi.mock('../../utils/indexedDbDeepStorage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/indexedDbDeepStorage')>()),
  loadDeepProfileData: vi.fn(async (id: string) => idb.deep.get(id) ?? null),
  saveDeepProfileData: vi.fn(async (id: string, data: unknown) => {
    if (!idb.failWrites) idb.deep.set(id, JSON.parse(JSON.stringify(data)));
  }),
  clearDeepProfileData: vi.fn(async (id: string) => {
    idb.deep.delete(id);
  }),
}));

// Snapshot records live in IndexedDB too; jsdom has none, so back them with a map.
const snapshotRecords = vi.hoisted(() => ({ map: new Map<string, string>(), failPut: false }));
vi.mock('../../utils/resilientStorage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/resilientStorage')>()),
  putResilientRecord: vi.fn(async (key: string, value: string) => {
    if (snapshotRecords.failPut) return false;
    snapshotRecords.map.set(key, value);
    return true;
  }),
  getResilientRecord: vi.fn(async (key: string) => snapshotRecords.map.get(key) ?? null),
  listResilientRecordKeys: vi.fn(async (prefix: string) => [...snapshotRecords.map.keys()].filter((k) => k.startsWith(prefix))),
  deleteResilientRecord: vi.fn(async (key: string) => snapshotRecords.map.delete(key)),
}));

const GUEST_PROFILE_KEY = 'zerobox_operator_profile_guest';
const GUEST_DEEP: Deep = { writeups: { m1: { writeupMarkdown: '# my writeup' } }, customNotes: [{ id: 'n1' }] };
const GUEST_LOOT = JSON.stringify({ schemaVersion: 1, credentials: [], credAttempts: [], lootItems: [] });
const GUEST_GRAPH = JSON.stringify({ nodes: [{ id: 'a' }], edges: [] });

const seedGuest = () => {
  localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify({ machines: [], savedAt: '2020-01-01T00:00:00.000Z' }));
  localStorage.setItem('zerobox_loot_v2_guest', GUEST_LOOT);
  localStorage.setItem('zerobox-attack-graph-state', GUEST_GRAPH);
  idb.deep.set('guest', JSON.parse(JSON.stringify(GUEST_DEEP)));
};

const boot = async () => {
  vi.resetModules();
  return (await import('../../store/useAuthStore')).useAuthStore;
};

describe('migrateGuestData moves IndexedDB-held and per-profile data too', () => {
  beforeEach(() => {
    localStorage.clear();
    idb.deep.clear();
    idb.failWrites = false;
    snapshotRecords.map.clear();
    snapshotRecords.failPut = false;
    vi.mocked(clearDeepProfileData).mockClear();
  });

  it('copies writeups, loot and graph to the destination and leaves the guest copy in place', async () => {
    seedGuest();
    const auth = await boot();

    const result = await auth.getState().migrateGuestData('p9');

    expect(result.success).toBe(true);
    expect(idb.deep.get('p9')).toMatchObject(GUEST_DEEP);
    expect(localStorage.getItem('zerobox_loot_v2_p9')).toBe(GUEST_LOOT);
    expect(localStorage.getItem('zerobox_graph_state_p9')).toBe(GUEST_GRAPH);
    // Non-destructive: the guest copy is still there.
    // (The guest record may be re-saved by the profile switch itself; what matters is that nothing deletes it.)
    expect(idb.deep.has('guest')).toBe(true);
    expect(clearDeepProfileData).not.toHaveBeenCalled();
    expect(localStorage.getItem('zerobox_loot_v2_guest')).toBe(GUEST_LOOT);
    expect(localStorage.getItem('zerobox-attack-graph-state')).toBe(GUEST_GRAPH);
    expect(localStorage.getItem(GUEST_PROFILE_KEY)).not.toBeNull();
  });

  it('is safe to run twice: the second run changes nothing at the destination', async () => {
    seedGuest();
    const auth = await boot();
    await auth.getState().migrateGuestData('p9');
    // Work done at the destination after the first run must not be overwritten by a re-run.
    localStorage.setItem('zerobox_loot_v2_p9', '{"schemaVersion":1,"credentials":[],"credAttempts":[],"lootItems":[{"id":"later"}]}');
    const afterFirst = {
      deep: JSON.stringify(idb.deep.get('p9')),
      loot: localStorage.getItem('zerobox_loot_v2_p9'),
      graph: localStorage.getItem('zerobox_graph_state_p9'),
      profile: localStorage.getItem('zerobox_operator_profile_p9'),
    };

    const again = await auth.getState().migrateGuestData('p9');

    expect(again).toEqual({ success: true, count: 0 });
    expect(JSON.stringify(idb.deep.get('p9'))).toBe(afterFirst.deep);
    expect(localStorage.getItem('zerobox_loot_v2_p9')).toBe(afterFirst.loot);
    expect(localStorage.getItem('zerobox_graph_state_p9')).toBe(afterFirst.graph);
    expect(localStorage.getItem('zerobox_operator_profile_p9')).toBe(afterFirst.profile);
  });

  it('leaves the guest data intact and the destination unmarked when the copy cannot be verified', async () => {
    seedGuest();
    idb.failWrites = true;
    const auth = await boot();

    const result = await auth.getState().migrateGuestData('p9');

    expect(result.success).toBe(false);
    expect(idb.deep.get('guest')).toMatchObject(GUEST_DEEP);
    expect(localStorage.getItem('zerobox_loot_v2_guest')).toBe(GUEST_LOOT);
    expect(localStorage.getItem('zerobox-attack-graph-state')).toBe(GUEST_GRAPH);
    expect(localStorage.getItem(GUEST_PROFILE_KEY)).not.toBeNull();
    expect(localStorage.getItem('zerobox_guest_migrated_to_p9')).toBeNull();
  });

  it('changes nothing when the snapshot cannot be written', async () => {
    seedGuest();
    const OLD = JSON.stringify({ machines: [{ id: 'old-box' }], savedAt: '2019-01-01T00:00:00.000Z' });
    localStorage.setItem('zerobox_operator_profile_p9', OLD);
    snapshotRecords.failPut = true;
    const auth = await boot();

    const result = await auth.getState().migrateGuestData('p9');

    expect(result).toEqual({ success: false, count: 0 });
    expect(localStorage.getItem('zerobox_operator_profile_p9')).toBe(OLD);
    expect(localStorage.getItem('zerobox_guest_migrated_to_p9')).toBeNull();
    expect(idb.deep.has('p9')).toBe(false);
  });

  it('does not overwrite the verified copy with the in-memory state when the active profile is the destination', async () => {
    seedGuest();
    const auth = await boot();
    const { useCtfStore } = await import('../../store/useCtfStore');
    // p9 is already the active profile and holds a different, unsaved in-memory state.
    useCtfStore.setState({
      currentProfileId: 'p9',
      machines: [
        {
          id: 'custom-inmem',
          name: 'In Memory',
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
        },
      ],
    });

    const result = await auth.getState().migrateGuestData('p9');

    expect(result.success).toBe(true);
    const stored = JSON.parse(localStorage.getItem('zerobox_operator_profile_p9') as string) as {
      machines: Array<{ id: string }>;
    };
    expect(stored.machines.some((m) => m.id === 'custom-inmem')).toBe(false);
    expect(useCtfStore.getState().machines.some((m) => m.id === 'custom-inmem')).toBe(false);
    expect(useCtfStore.getState().currentProfileId).toBe('p9');
  });

  it('snapshots existing destination data before overwriting it', async () => {
    seedGuest();
    const OLD = JSON.stringify({ machines: [{ id: 'old-box' }], savedAt: '2019-01-01T00:00:00.000Z' });
    localStorage.setItem('zerobox_operator_profile_p9', OLD);
    const auth = await boot();

    const result = await auth.getState().migrateGuestData('p9');

    expect(result.success).toBe(true);
    expect(localStorage.getItem('zerobox_operator_profile_p9')).not.toBe(OLD);
    const { listPreMigrationBackups } = await import('../../store/preMigrationBackup');
    const { getResilientRecord } = await import('../../utils/resilientStorage');
    const snaps = (await listPreMigrationBackups()).filter((s) => s.reason === 'pre-sync');
    expect(snaps.length).toBe(1);
    const rec = JSON.parse((await getResilientRecord(snaps[0].key)) as string) as { entries: Record<string, string> };
    expect(rec.entries['zerobox_operator_profile_p9']).toBe(OLD);
  });
});

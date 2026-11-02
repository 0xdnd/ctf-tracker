import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAuthStore, DEFAULT_DANIEL_PROFILE, PROFILE_DELETED_STORAGE_KEY } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { engageSchemaWriteGate, releaseRestoreWriteGate } from '../../utils/schemaWriteGate';
import { useCtfStore, mergeMachinesWithCatalog, flushProfileSave } from '../../store/useCtfStore';
import { DEMO_SOLVED_ROSTER } from '../../data/demoSolvedRoster';
import { installFakeIndexedDb, type FakeIndexedDb } from '../exam/fakeIndexedDb';
import { loadWorkspaceFromIdb, saveWorkspaceToIdb, deleteWorkspaceFromIdb } from '../../utils/resilientStorage';
import { loadDeepProfileData } from '../../utils/indexedDbDeepStorage';
import { deleteProfileImages } from '../../utils/imageStore';
import { Machine } from '../../types';

vi.mock('../../utils/imageStore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../utils/imageStore')>()),
  deleteProfileImages: vi.fn(async () => {}),
}));

const auth = () => useAuthStore.getState();
const ctf = () => useCtfStore.getState();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Lets every fake-IndexedDB open/transaction (each a macrotask) run to completion. */
const settle = async () => {
  for (let i = 0; i < 12; i++) await sleep(5);
};

let idb: FakeIndexedDb;

const keysFor = (id: string) => Object.keys(localStorage).filter((k) => k.includes(id));
const idbKeysFor = (id: string) => [...idb.records.keys()].filter((k) => String(k).includes(id));

/** Gives the active profile a rooted machine, a note and a credential, then writes everything out. */
function seedActive(tag: string) {
  ctf().toggleRootFlag('thm-rootme', `${tag}_FLAG`);
  ctf().addCustomNote({ title: `${tag} note`, rawMarkdown: `${tag} body` });
  ctf().addCredential({ type: 'password', username: tag, secret: `${tag}_pw` });
  flushProfileSave();
}

const rooted = () => ctf().machines.filter((m) => m.status === 'root' || m.status === 'completed').length;

describe('deleting a profile leaves none of its data behind', () => {
  beforeEach(async () => {
    idb = installFakeIndexedDb();
    localStorage.clear();
    vi.mocked(deleteProfileImages).mockClear();
    useAuthStore.setState({
      user: DEFAULT_DANIEL_PROFILE,
      profiles: [DEFAULT_DANIEL_PROFILE],
      isAuthenticated: true,
      operatorProfileModalOpen: false,
    });
    useCtfStore.setState({
      currentProfileId: 'usr_daniel',
      isDeepStorageLoaded: true,
      userSolvesReset: false,
      machines: mergeMachinesWithCatalog(DEMO_SOLVED_ROSTER as Machine[], false),
      activeTargetId: null,
      customNotes: [],
      activitySessions: [],
    });
    await settle();
  });

  afterEach(async () => {
    await settle();
    idb.uninstall();
  });

  it('deleting the active profile keeps its keys gone after the switch, even through late saves', async () => {
    await auth().loginAsOperator({ name: 'Sarah', startFresh: true });
    seedActive('SARAH');
    await settle();
    expect(keysFor('usr_sarah').length).toBeGreaterThan(0);
    expect(idbKeysFor('usr_sarah')).toContain('zb:workspace:usr_sarah');

    // Unsaved edit: a debounced save is now pending.
    ctf().addCustomNote({ title: 'late note' });

    auth().deleteProfile('usr_sarah');
    expect(auth().user?.id).toBe('usr_daniel');
    expect(ctf().currentProfileId).toBe('usr_daniel');
    expect(keysFor('usr_sarah')).toEqual([]);

    window.dispatchEvent(new Event('beforeunload'));
    window.dispatchEvent(new Event('pagehide'));
    await sleep(1500); // past the 1.2 s debounce
    await settle();

    expect(keysFor('usr_sarah')).toEqual([]);
    expect(idbKeysFor('usr_sarah')).toEqual([]);
    expect(deleteProfileImages).toHaveBeenCalledWith('usr_sarah');
    expect(deleteProfileImages).not.toHaveBeenCalledWith('usr_daniel');
  });

  it('deleting the last profile loads guest and leaves none of its keys', async () => {
    seedActive('DANIEL');
    await settle();
    expect(idbKeysFor('usr_daniel')).toContain('zb:workspace:usr_daniel');

    auth().deleteProfile('usr_daniel');
    expect(auth().user).toBeNull();
    expect(ctf().currentProfileId).toBe('guest');
    expect(rooted()).toBe(0);

    window.dispatchEvent(new Event('beforeunload'));
    await sleep(1500);
    await settle();

    expect(keysFor('usr_daniel')).toEqual([]);
    expect(idbKeysFor('usr_daniel')).toEqual([]);
  });

  it('removes zb:workspace:<id>, and a save issued earlier does not bring it back', async () => {
    await auth().loginAsOperator({ name: 'Sarah', startFresh: true });
    seedActive('SARAH');
    await settle();
    expect(idb.records.has('zb:workspace:usr_sarah')).toBe(true);

    // A save already issued but not yet committed when the profile is deleted.
    let release!: () => void;
    idb.gate = new Promise<void>((r) => (release = r));
    ctf().saveProfileData('usr_sarah');
    auth().deleteProfile('usr_sarah');
    release();
    idb.gate = null;
    await settle();

    expect(idb.records.has('zb:workspace:usr_sarah')).toBe(false);
    expect(idbKeysFor('usr_sarah')).toEqual([]);
    expect(await loadWorkspaceFromIdb('zb:workspace:usr_sarah')).toBeNull();
  });

  it('deleteWorkspaceFromIdb waits for saves already issued', async () => {
    let release!: () => void;
    idb.gate = new Promise<void>((r) => (release = r));
    const saved = saveWorkspaceToIdb('zb:workspace:p', { machines: [] });
    let deleted = false;
    const del = deleteWorkspaceFromIdb('zb:workspace:p').then((ok) => {
      deleted = true;
      return ok;
    });
    await sleep(30);
    expect(deleted).toBe(false);
    release();
    idb.gate = null;
    await saved;
    expect(await del).toBe(true);
    expect(idb.records.has('zb:workspace:p')).toBe(false);
  });

  it('a failed IndexedDB delete warns and never throws', async () => {
    idb.failWrites = true;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(deleteWorkspaceFromIdb('zb:workspace:x')).resolves.toBe(false);
    expect(() => auth().deleteProfile('usr_daniel')).not.toThrow();
    await settle();
    expect(keysFor('usr_daniel')).toEqual([]);
    warn.mockRestore();
    idb.failWrites = false;
  });

  it('recreating a deleted profile id starts empty', async () => {
    await auth().loginAsOperator({ name: 'Sarah', startFresh: true });
    seedActive('SARAH');
    await settle();
    expect(rooted()).toBe(1);

    auth().deleteProfile('usr_sarah');
    await settle();
    await auth().loginAsOperator({ name: 'Sarah', startFresh: true });
    await settle();

    expect(ctf().currentProfileId).toBe('usr_sarah');
    expect(rooted()).toBe(0);
    expect(ctf().machines.some((m) => m.rootFlag === 'SARAH_FLAG' || m.userFlag === 'SARAH_FLAG')).toBe(false);
    expect(ctf().customNotes).toEqual([]);
    expect(ctf().credentials).toEqual([]);
    expect(ctf().lootItems).toEqual([]);

    // Neither storage tier hands the old data back at the next boot.
    const copy = await loadWorkspaceFromIdb<{ customNotes?: unknown[]; machines?: Machine[] }>('zb:workspace:usr_sarah');
    expect(copy?.customNotes ?? []).toEqual([]);
    expect((copy?.machines ?? []).some((m) => m.rootFlag === 'SARAH_FLAG')).toBe(false);
    const deep = await loadDeepProfileData('usr_sarah');
    expect(deep?.customNotes ?? []).toEqual([]);
    expect(Object.keys(deep?.writeups ?? {})).toEqual([]);
    const stored = JSON.parse(localStorage.getItem('zerobox_operator_profile_usr_sarah') || '{}');
    expect(JSON.stringify(stored)).not.toContain('SARAH_FLAG');
    expect(JSON.stringify(stored)).not.toContain('SARAH note');
  });

  it('other profiles and guest data stay intact', async () => {
    localStorage.setItem('zerobox_operator_profile_guest', JSON.stringify({ machines: [], marker: 'GUEST_MARK' }));
    seedActive('DANIEL');
    await auth().loginAsOperator({ name: 'Sarah', startFresh: true });
    seedActive('SARAH');
    await settle();
    const danielLocal = localStorage.getItem('zerobox_operator_profile_usr_daniel');
    const danielLoot = localStorage.getItem('zerobox_loot_v2_usr_daniel');
    expect(danielLocal).toContain('DANIEL note');
    expect(danielLoot).toContain('DANIEL_pw');

    auth().deleteProfile('usr_sarah');
    window.dispatchEvent(new Event('beforeunload'));
    await sleep(1500);
    await settle();

    expect(keysFor('usr_sarah')).toEqual([]);
    expect(idbKeysFor('usr_sarah')).toEqual([]);
    expect(localStorage.getItem('zerobox_loot_v2_usr_daniel')).toBe(danielLoot);
    expect(JSON.parse(localStorage.getItem('zerobox_operator_profile_usr_daniel') || '{}').customNotes).toEqual(
      JSON.parse(danielLocal || '{}').customNotes
    );
    expect(localStorage.getItem('zerobox_operator_profile_guest')).toContain('GUEST_MARK');
    expect(idb.records.has('zb:workspace:usr_daniel')).toBe(true);
    expect(idb.records.has('usr_daniel')).toBe(true);
    expect(ctf().currentProfileId).toBe('usr_daniel');
    expect(ctf().customNotes.map((n) => n.title)).toContain('DANIEL note');
    expect(rooted()).toBeGreaterThan(0);
  });

  describe('another tab open on the deleted profile', () => {
    const signal = (profileId: unknown) =>
      window.dispatchEvent(
        new StorageEvent('storage', { key: PROFILE_DELETED_STORAGE_KEY, newValue: JSON.stringify({ profileId }) })
      );

    /** What the deleting tab leaves behind: the profile's keys are gone (this tab still holds it in memory). */
    const otherTabPurged = (id: string) => {
      for (const k of keysFor(id)) localStorage.removeItem(k);
    };

    it('switches away on the deletion signal and never writes the deleted profile back', async () => {
      await auth().loginAsOperator({ name: 'Sarah', startFresh: true });
      seedActive('SARAH');
      await settle();
      ctf().addCustomNote({ title: 'late note' }); // unsaved: a debounced save is pending
      otherTabPurged('usr_sarah');

      signal('usr_sarah');
      expect(auth().user?.id).toBe('usr_daniel');
      expect(auth().profiles.map((p) => p.id)).toEqual(['usr_daniel']);
      expect(ctf().currentProfileId).toBe('usr_daniel');

      window.dispatchEvent(new Event('beforeunload'));
      window.dispatchEvent(new Event('pagehide'));
      await sleep(1500);
      await settle();
      expect(keysFor('usr_sarah')).toEqual([]);
      expect(idbKeysFor('usr_sarah')).toEqual([]);

      // Recreating the name starts empty instead of reloading the old data.
      await auth().loginAsOperator({ name: 'Sarah', startFresh: true });
      await settle();
      expect(rooted()).toBe(0);
      expect(ctf().customNotes).toEqual([]);
      expect(ctf().credentials).toEqual([]);
    });

    it('discards nothing on a key removal, a storage clear, or a signal for an unknown profile', async () => {
      await auth().loginAsOperator({ name: 'Sarah', startFresh: true });
      seedActive('SARAH');
      await settle();
      const keys = keysFor('usr_sarah');
      expect(keys.length).toBeGreaterThan(0);

      for (const k of keys) {
        localStorage.removeItem(k);
        window.dispatchEvent(new StorageEvent('storage', { key: k, newValue: null, oldValue: '{}' }));
      }
      window.dispatchEvent(new StorageEvent('storage', { key: null })); // localStorage.clear() elsewhere
      signal('usr_ghost');
      signal(undefined);
      window.dispatchEvent(new StorageEvent('storage', { key: PROFILE_DELETED_STORAGE_KEY, newValue: 'not json' }));
      window.dispatchEvent(new StorageEvent('storage', { key: PROFILE_DELETED_STORAGE_KEY, newValue: null }));

      expect(auth().user?.id).toBe('usr_sarah');
      expect(auth().profiles.map((p) => p.id)).toContain('usr_sarah');
      expect(ctf().currentProfileId).toBe('usr_sarah');
      expect(rooted()).toBe(1);
      expect(ctf().customNotes.map((n) => n.title)).toContain('SARAH note');
      expect(ctf().credentials.map((c) => c.username)).toContain('SARAH');

      // Its unsaved state still reaches storage at the next save.
      ctf().addCustomNote({ title: 'after removal' });
      flushProfileSave();
      await settle();
      expect(localStorage.getItem('zerobox_operator_profile_usr_sarah')).toContain('after removal');
    });

    it('a signal for a profile that is only in the list removes it and keeps the active one', async () => {
      await auth().loginAsOperator({ name: 'Sarah', startFresh: true });
      seedActive('SARAH');
      signal('usr_daniel');
      expect(auth().profiles.map((p) => p.id)).toEqual(['usr_sarah']);
      expect(auth().user?.id).toBe('usr_sarah');
      expect(ctf().currentProfileId).toBe('usr_sarah');
      expect(rooted()).toBe(1);
    });

    it('the deleting tab sends the signal', async () => {
      await auth().loginAsOperator({ name: 'Sarah', startFresh: true });
      const spy = vi.spyOn(Storage.prototype, 'setItem');
      auth().deleteProfile('usr_sarah');
      expect(spy.mock.calls.some(([k, v]) => k === PROFILE_DELETED_STORAGE_KEY && String(v).includes('usr_sarah'))).toBe(true);
      expect(localStorage.getItem(PROFILE_DELETED_STORAGE_KEY)).toBeNull();
      spy.mockRestore();
    });
  });

  it('deleteProfile refuses while writes are gated and changes nothing', async () => {
    await auth().loginAsOperator({ name: 'Sarah', startFresh: true });
    seedActive('SARAH');
    await settle();
    const snapshot = Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]));
    const idbBefore = [...idb.records.keys()].sort();
    const profilesBefore = auth().profiles;
    useToastStore.setState({ toasts: [] });
    vi.mocked(deleteProfileImages).mockClear();

    engageSchemaWriteGate('restoring');
    try {
      auth().deleteProfile('usr_sarah');
      await settle();
      expect(auth().profiles).toBe(profilesBefore);
      expect(auth().user?.id).toBe('usr_sarah');
      expect(ctf().currentProfileId).toBe('usr_sarah');
      expect(rooted()).toBe(1);
      expect(ctf().credentials.map((c) => c.username)).toContain('SARAH');
      expect(Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)]))).toEqual(snapshot);
      expect([...idb.records.keys()].sort()).toEqual(idbBefore);
      expect(deleteProfileImages).not.toHaveBeenCalled();
      const notice = useToastStore.getState().toasts.find((t) => t.type === 'error');
      expect(notice?.title).toBe('Delete blocked');
      expect(notice?.message).toMatch(/Writes are blocked in this tab/);
    } finally {
      releaseRestoreWriteGate();
    }
  });

  it('a loot write that fell back to memory does not come back after delete and recreate', async () => {
    await auth().loginAsOperator({ name: 'Sarah', startFresh: true });
    const realSet = Storage.prototype.setItem;
    const quota = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k.startsWith('zerobox_loot_v2_')) throw new DOMException('full', 'QuotaExceededError');
      return realSet.call(this, k, v);
    });
    ctf().addCredential({ type: 'password', username: 'held', secret: 'HELD_pw' });
    quota.mockRestore();
    expect(localStorage.getItem('zerobox_loot_v2_usr_sarah')).toBeNull(); // only in memory

    auth().deleteProfile('usr_sarah');
    await settle();
    await auth().loginAsOperator({ name: 'Sarah', startFresh: true });
    await settle();

    expect(ctf().currentProfileId).toBe('usr_sarah');
    expect(ctf().credentials).toEqual([]);
    expect(ctf().lootItems).toEqual([]);
    expect(localStorage.getItem('zerobox_loot_v2_usr_sarah') ?? '').not.toContain('HELD_pw');
  });
});

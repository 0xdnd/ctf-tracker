import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installFakeIndexedDb, type FakeIndexedDb } from '../exam/fakeIndexedDb';
import { engageSchemaWriteGate, releaseRestoreWriteGate } from '../../utils/schemaWriteGate';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

// setup.ts mocks the vault module globally; these tests exercise the real one against an in-memory IndexedDB double.
vi.unmock('../../utils/indexedDbVault');

const note = (id: string) => ({ id, title: id, commands: [] }) as unknown as CptsNoteEntry;
type Rec = { notes: Array<{ id: string }> };
const vaultIds = () => (fake.records.get('vault_data') as Rec).notes.map((n) => n.id);
const payload = (...ids: string[]) => JSON.stringify({ notes: ids.map(note), wikilinkMap: { [ids[0]]: ids[0] } });

let fake: FakeIndexedDb;
beforeEach(() => {
  fake = installFakeIndexedDb();
});
afterEach(() => {
  releaseRestoreWriteGate();
  fake.uninstall();
});

const load = async () => {
  const vault = await import('../../utils/indexedDbVault');
  const { useCtfStore } = await import('../../store/useCtfStore');
  return { vault, store: useCtfStore };
};

describe('notes import snapshots', () => {
  it('takes no snapshot when the vault is empty', async () => {
    const { store } = await load();
    const res = await store.getState().importNotesFromJson(payload('a'));
    expect(res).toEqual({ success: true, count: 1 });
    expect(fake.records.has('import_snapshots')).toBe(false);
  });

  it('snapshots the existing vault before overwriting it', async () => {
    const { vault, store } = await load();
    await store.getState().importNotesFromJson(payload('a', 'b'));
    const res = await store.getState().importNotesFromJson(payload('c'));
    expect(res.success).toBe(true);
    const snap = await vault.loadLastImportSnapshot();
    expect(snap?.notes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(snap?.wikilinkMap).toEqual({ a: 'a' });
    expect(typeof snap?.takenAt).toBe('string');
    expect(vaultIds()).toEqual(['c']);
  });

  it('aborts the import and leaves the vault intact when the snapshot cannot be written', async () => {
    const { store } = await load();
    await store.getState().importNotesFromJson(payload('a'));
    fake.failWrites = true;
    const res = await store.getState().importNotesFromJson(payload('z'));
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/nothing was imported/i);
    fake.failWrites = false;
    expect(vaultIds()).toEqual(['a']);
    expect(store.getState().userNotes.map((n) => n.id)).toEqual(['a']);
  });

  it('restoreLastNotesSnapshot brings back the previous notes in IndexedDB and the store', async () => {
    const { store } = await load();
    await store.getState().importNotesFromJson(payload('a', 'b'));
    await store.getState().importNotesFromJson(payload('c'));
    const res = await store.getState().restoreLastNotesSnapshot();
    expect(res).toEqual({ success: true, count: 2 });
    expect(store.getState().userNotes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(store.getState().userWikilinkMap).toEqual({ a: 'a' });
    expect(vaultIds()).toEqual(['a', 'b']);
  });

  it('reports a clear error when there is nothing to restore', async () => {
    const { store } = await load();
    const res = await store.getState().restoreLastNotesSnapshot();
    expect(res.success).toBe(false);
  });

  it('keeps only the last 3 snapshots, newest first', async () => {
    const { vault, store } = await load();
    for (const id of ['n1', 'n2', 'n3', 'n4', 'n5']) await store.getState().importNotesFromJson(payload(id));
    const list = fake.records.get('import_snapshots') as Rec[];
    expect(list).toHaveLength(vault.MAX_IMPORT_SNAPSHOTS);
    expect(list.map((s) => s.notes[0].id)).toEqual(['n4', 'n3', 'n2']);
  });

  it('replaceUserNotes (used by the ZIP and folder paths) snapshots first and aborts when the snapshot fails', async () => {
    const { vault, store } = await load();
    await store.getState().replaceUserNotes([note('a')], {});
    await store.getState().replaceUserNotes([note('b')], {});
    expect((await vault.loadLastImportSnapshot())?.notes.map((n) => n.id)).toEqual(['a']);
    fake.failWrites = true;
    await expect(store.getState().replaceUserNotes([note('c')], {})).rejects.toThrow(/nothing was imported/i);
    fake.failWrites = false;
    expect(vaultIds()).toEqual(['b']);
    expect(store.getState().userNotes.map((n) => n.id)).toEqual(['b']);
  });

  it('a restore is undoable: it snapshots the current vault and applies the snapshot that was newest before it began', async () => {
    const { vault, store } = await load();
    await store.getState().importNotesFromJson(payload('a'));
    await store.getState().importNotesFromJson(payload('b')); // snapshots: [a]
    await store.getState().restoreLastNotesSnapshot();
    expect(vaultIds()).toEqual(['a']);
    expect((fake.records.get('import_snapshots') as Rec[]).map((s) => s.notes[0].id)).toEqual(['b']);
    await store.getState().restoreLastNotesSnapshot(); // undo
    expect(vaultIds()).toEqual(['b']);
    expect(store.getState().userNotes.map((n) => n.id)).toEqual(['b']);
    expect((await vault.loadLastImportSnapshot())?.notes.map((n) => n.id)).toEqual(['a']);
  });

  // Engages the write gate right after the snapshot list is written, i.e. between the snapshot and the vault save.
  const engageAfterSnapshotWrite = () => {
    const set = fake.records.set.bind(fake.records);
    fake.records.set = (k, v) => {
      const r = set(k, v);
      if (k === 'import_snapshots') engageSchemaWriteGate('restoring');
      return r;
    };
  };

  it('an import blocked by the write gate after the snapshot leaves the vault and store unchanged', async () => {
    const { store } = await load();
    await store.getState().importNotesFromJson(payload('a'));
    engageAfterSnapshotWrite();
    const res = await store.getState().importNotesFromJson(payload('b'));
    expect(res.success).toBe(false);
    expect(vaultIds()).toEqual(['a']);
    expect(store.getState().userNotes.map((n) => n.id)).toEqual(['a']);
    expect((fake.records.get('import_snapshots') as Rec[]).map((s) => s.notes[0].id)).toEqual(['a']);
  });

  it('a restore blocked by the write gate after the snapshot keeps the target snapshot and changes nothing else', async () => {
    const { store } = await load();
    await store.getState().importNotesFromJson(payload('a'));
    await store.getState().importNotesFromJson(payload('b')); // snapshots: [a]
    engageAfterSnapshotWrite();
    const res = await store.getState().restoreLastNotesSnapshot();
    expect(res.success).toBe(false);
    expect(vaultIds()).toEqual(['b']);
    expect(store.getState().userNotes.map((n) => n.id)).toEqual(['b']);
    const ids = (fake.records.get('import_snapshots') as Rec[]).map((s) => s.notes[0].id);
    expect(ids).toContain('a');
  });
});

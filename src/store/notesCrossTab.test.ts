import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { installFakeIndexedDb, type FakeIndexedDb } from '../test/exam/fakeIndexedDb';
import type { CptsNoteEntry } from '../utils/obsidianManualUtils';

// Two "tabs" = two module instances (vi.resetModules between boots) sharing one localStorage and one IndexedDB,
// like real tabs. The vault module is the real one (setup.ts mocks it globally), on an in-memory IndexedDB double
// whose transactions each run atomically, the way IndexedDB serializes readwrite transactions across tabs.
vi.unmock('../utils/indexedDbVault');
// Profile/workspace copies stay out of the IndexedDB double (it keeps every store in one record map).
const resilient = vi.hoisted(() => new Map<string, string>());
vi.mock('../utils/resilientStorage', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../utils/resilientStorage')>()),
  putResilientRecord: async (key: string, value: string) => (resilient.set(key, value), true),
  getResilientRecord: async (key: string) => resilient.get(key) ?? null,
  listResilientRecordKeys: async (prefix: string) => [...resilient.keys()].filter((k) => k.startsWith(prefix)),
  deleteResilientRecord: async (key: string) => resilient.delete(key),
  saveWorkspaceToIdb: async () => true,
  loadWorkspaceFromIdb: async () => null,
}));

class FakeBroadcastChannel {
  static peers: FakeBroadcastChannel[] = [];
  listeners = new Set<(event: { data: unknown }) => void>();
  posted: unknown[] = [];
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
    this.posted.push(data);
    for (const peer of FakeBroadcastChannel.peers) {
      if (peer === this || peer.closed || peer.name !== this.name) continue;
      setTimeout(() => peer.listeners.forEach((cb) => cb({ data: structuredClone(data) })), 0);
    }
  }
  close() {
    this.closed = true;
  }
}

const note = (id: string, rawMarkdown = `# ${id}`) =>
  ({ id, title: id, titleEn: id, rawMarkdown, commands: [], tags: [], dateModified: '2026-01-01T00:00:00.000Z' }) as unknown as CptsNoteEntry;
type Rec = { notes: CptsNoteEntry[]; wikilinkMap: Record<string, string> };

let fake: FakeIndexedDb;
const stored = () => fake.records.get('vault_data') as Rec;
const storedText = (id: string) => stored().notes.find((n) => n.id === id)?.rawMarkdown;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const boot = async () => {
  vi.resetModules();
  const peersBefore = FakeBroadcastChannel.peers.length;
  const store = await import('./useCtfStore');
  const gate = await import('../utils/schemaWriteGate');
  const channel = FakeBroadcastChannel.peers[peersBefore] ?? FakeBroadcastChannel.peers[FakeBroadcastChannel.peers.length - 1];
  await sleep(20); // boot hydration of the vault
  return { ...store, gate, channel };
};
type Tab = Awaited<ReturnType<typeof boot>>;
const notesUpdated = (tab: Tab) =>
  tab.channel.posted.filter((m) => (m as { type?: string }).type === 'NOTES_UPDATED');

const seedVault = (...notes: CptsNoteEntry[]) =>
  fake.records.set('vault_data', {
    notes,
    wikilinkMap: Object.fromEntries(notes.map((n) => [n.id, n.id])),
    importedAt: '2026-01-01T00:00:00.000Z',
  });

beforeEach(() => {
  localStorage.clear();
  resilient.clear();
  fake = installFakeIndexedDb({ drainQueuedRequests: true });
  FakeBroadcastChannel.peers.forEach((c) => c.close());
  FakeBroadcastChannel.peers = [];
  vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('imported notes across tabs', () => {
  it('two tabs editing different imported notes keep both edits in IndexedDB', async () => {
    seedVault(note('n1'), note('n2'));
    const a = await boot();
    const b = await boot();
    expect(a.useCtfStore.getState().userNotes).toHaveLength(2);
    expect(b.useCtfStore.getState().userNotes).toHaveLength(2);

    // Neither tab has seen the other's edit when it saves.
    await Promise.all([
      a.useCtfStore.getState().updateNoteContent('n1', 'edited in A'),
      b.useCtfStore.getState().updateNoteContent('n2', 'edited in B'),
    ]);

    expect(storedText('n1')).toBe('edited in A');
    expect(storedText('n2')).toBe('edited in B');

    // After the NOTES_UPDATED messages both tabs show both edits.
    for (const tab of [a, b]) {
      await vi.waitFor(() =>
        expect(tab.useCtfStore.getState().userNotes.map((n) => n.rawMarkdown)).toEqual(['edited in A', 'edited in B'])
      );
    }
  });

  it('batch edits in one tab do not undo another tab\'s edit', async () => {
    seedVault(note('n1'), note('n2'), note('n3'));
    const a = await boot();
    const b = await boot();
    await Promise.all([
      a.useCtfStore.getState().applyNoteContentBatch([
        { noteId: 'n1', rawMarkdown: 'batch 1' },
        { noteId: 'n3', rawMarkdown: 'batch 3' },
      ]),
      b.useCtfStore.getState().updateNoteContent('n2', 'single 2'),
    ]);
    expect(stored().notes.map((n) => n.rawMarkdown)).toEqual(['batch 1', 'single 2', 'batch 3']);
  });

  it('an imported note deleted in tab A stays deleted after tab B writes', async () => {
    seedVault(note('n1'), note('n2'));
    const a = await boot();
    const b = await boot();

    a.useCtfStore.getState().deleteNote('n1');
    // B still holds n1 in memory (the message has not arrived) and saves another note.
    await b.useCtfStore.getState().updateNoteContent('n2', 'B edit after delete');

    expect(stored().notes.map((n) => n.id)).toEqual(['n2']);
    expect(stored().wikilinkMap.n1).toBeUndefined();
    expect(storedText('n2')).toBe('B edit after delete');
    await vi.waitFor(() => expect(b.useCtfStore.getState().userNotes.map((n) => n.id)).toEqual(['n2']));
  });

  it('a NOTES_UPDATED reload does not broadcast again', async () => {
    seedVault(note('n1'));
    const a = await boot();
    const b = await boot();
    await a.useCtfStore.getState().updateNoteContent('n1', 'from A');
    expect(notesUpdated(a)).toEqual([
      expect.objectContaining({ type: 'NOTES_UPDATED', payload: { source: 'vault', noteIds: ['n1'] } }),
    ]);

    await vi.waitFor(() => expect(b.useCtfStore.getState().userNotes[0].rawMarkdown).toBe('from A'));
    await sleep(20);
    expect(notesUpdated(b)).toEqual([]);
    // And A does not hear an echo that would make it reload or write again.
    expect(notesUpdated(a)).toHaveLength(1);
  });

  it('writes nothing to the vault and broadcasts nothing while the restore lock is held', async () => {
    seedVault(note('n1'));
    const a = await boot();
    const writes = fake.writeCount;
    a.gate.engageSchemaWriteGate('restoring');

    await a.useCtfStore.getState().updateNoteContent('n1', 'edit while restoring');
    await a.useCtfStore.getState().applyNoteContentBatch([{ noteId: 'n1', rawMarkdown: 'batch while restoring' }]);
    a.useCtfStore.getState().deleteNote('n1');
    await sleep(20);

    expect(fake.writeCount).toBe(writes);
    expect(storedText('n1')).toBe('# n1');
    expect(notesUpdated(a)).toEqual([]);
  });

  it('the vault is global: a reload is applied whatever profile the receiving tab is on', async () => {
    seedVault(note('n1'));
    const a = await boot();
    const b = await boot();
    b.useCtfStore.setState({ currentProfileId: 'usr_other' });
    await a.useCtfStore.getState().updateNoteContent('n1', 'shared vault edit');
    await vi.waitFor(() => expect(b.useCtfStore.getState().userNotes[0].rawMarkdown).toBe('shared vault edit'));
  });
});

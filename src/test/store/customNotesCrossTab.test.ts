import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useCtfStore,
  flushProfileSave,
  getProfileStorageKey,
  loadInitialProfileData,
  mergeIncomingNotes,
} from '../../store/useCtfStore';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';

// Authored notes (customNotes / deletedNoteIds) travel between tabs through the profile key's storage event.
// The other tab is simulated by writing its payload to localStorage and dispatching the event by hand (jsdom
// does not fire storage events for its own writes).

const PROFILE = 'usr_notes_sync';
const initial = useCtfStore.getState();

const note = (id: string, rawMarkdown: string, dateModified: string) =>
  ({ id, title: id, titleEn: id, rawMarkdown, commands: [], tags: [], dateModified }) as unknown as CptsNoteEntry;

const T0 = '2026-01-01T00:00:00.000Z';
const T1 = '2026-01-01T00:01:00.000Z';
const T2 = '2026-01-01T00:02:00.000Z';

const profileKey = () => getProfileStorageKey(PROFILE);
const stored = () => JSON.parse(localStorage.getItem(profileKey())!);

/** What the other tab wrote: its payload lands in localStorage and the storage event reaches this tab. */
const otherTabWrites = (data: Record<string, unknown>, key = profileKey()) => {
  const newValue = JSON.stringify({ machines: [], ...data });
  localStorage.setItem(key, newValue);
  window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
};

const text = (id: string) => useCtfStore.getState().customNotes.find((n) => n.id === id)?.rawMarkdown;
const ids = () => useCtfStore.getState().customNotes.map((n) => n.id).sort();

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(new Date('2026-01-01T00:05:00.000Z'));
  useCtfStore.setState(initial, true);
  useCtfStore.setState({
    currentProfileId: PROFILE,
    machines: [],
    customNotes: [note('cA', 'A0', T0), note('cB', 'B0', T0)],
    deletedNoteIds: [],
  });
  flushProfileSave(); // both tabs start from the same saved state
});

afterEach(() => {
  flushProfileSave();
  vi.useRealTimers();
  localStorage.clear();
});

describe('authored notes across tabs (storage event merge)', () => {
  it('near-simultaneous edits of different notes in two tabs keep both', async () => {
    await useCtfStore.getState().updateNoteContent('cA', 'A edited here'); // saved by this tab
    // The other tab saved its edit of cB before it saw ours: its payload still has the old cA.
    otherTabWrites({ customNotes: [note('cA', 'A0', T0), note('cB', 'B edited there', T1)], deletedNoteIds: [] });

    expect(text('cA')).toBe('A edited here');
    expect(text('cB')).toBe('B edited there');

    // This tab writes the merged list back, so storage ends up holding both edits.
    vi.advanceTimersByTime(6000);
    const saved = stored().customNotes.map((n: CptsNoteEntry) => n.rawMarkdown).sort();
    expect(saved).toEqual(['A edited here', 'B edited there']);
  });

  it('a note created here and not yet saved survives the other tab\'s write', () => {
    useCtfStore.getState().addCustomNote({ title: 'Brand new', rawMarkdown: 'fresh' });
    const created = useCtfStore.getState().customNotes[0];
    expect(typeof created.dateModified).toBe('string');
    expect(Number.isNaN(Date.parse(created.dateModified!))).toBe(false);

    otherTabWrites({ customNotes: [note('cA', 'A0', T0), note('cB', 'B1', T1)], deletedNoteIds: [] });
    expect(ids()).toEqual([created.id, 'cA', 'cB'].sort());
    expect(text('cB')).toBe('B1');
  });

  it('the same note edited in both tabs: the newer dateModified wins', () => {
    // Other tab newer: theirs wins over our saved copy.
    useCtfStore.setState({ customNotes: [note('cA', 'mine', T1), note('cB', 'B0', T0)] });
    flushProfileSave();
    otherTabWrites({ customNotes: [note('cA', 'theirs', T2), note('cB', 'B0', T0)], deletedNoteIds: [] });
    expect(text('cA')).toBe('theirs');

    // Ours newer (and not yet saved): ours wins over their older copy.
    useCtfStore.setState({
      customNotes: useCtfStore.getState().customNotes.map((n) => (n.id === 'cA' ? note('cA', 'mine later', '2026-01-01T00:03:00.000Z') : n)),
    });
    otherTabWrites({ customNotes: [note('cA', 'theirs', T2), note('cB', 'B0', T0)], deletedNoteIds: [] });
    expect(text('cA')).toBe('mine later');
  });

  it('a note deleted in the other tab stays deleted after this tab writes', () => {
    // This tab has a pending edit of cB when the other tab's deletion of cA arrives.
    useCtfStore.setState({ customNotes: [note('cA', 'A0', T0), note('cB', 'B pending', T1)] });
    otherTabWrites({ customNotes: [note('cB', 'B0', T0)], deletedNoteIds: ['cA'] });
    expect(ids()).toEqual(['cB']);
    expect(text('cB')).toBe('B pending');
    expect(useCtfStore.getState().deletedNoteIds).toContain('cA');

    vi.advanceTimersByTime(6000);
    expect(stored().customNotes.map((n: CptsNoteEntry) => n.id)).toEqual(['cB']);
    expect(stored().deletedNoteIds).toContain('cA');
  });

  it('a note deleted here stays deleted when the other tab writes before it saw the deletion', () => {
    useCtfStore.getState().deleteNote('cA');
    flushProfileSave();
    // The other tab's payload still has cA and no tombstone for it.
    otherTabWrites({ customNotes: [note('cA', 'A0', T0), note('cB', 'B1', T1)], deletedNoteIds: [] });
    expect(ids()).toEqual(['cB']);
    expect(useCtfStore.getState().deletedNoteIds).toContain('cA');
  });

  it('the exact race: a note saved here survives a stale write from the other tab, in memory and in storage', () => {
    useCtfStore.getState().addCustomNote({ title: 'N', rawMarkdown: 'new note' });
    const created = useCtfStore.getState().customNotes[0];
    flushProfileSave(); // N is saved here before the other tab writes
    // The other tab never saw N and writes its own edit.
    otherTabWrites({ customNotes: [note('cA', 'A0', T0), note('cB', 'B edited there', T1)], deletedNoteIds: [] });
    expect(ids()).toEqual([created.id, 'cA', 'cB'].sort());
    expect(text('cB')).toBe('B edited there');

    // Storage converges: this tab writes the union back.
    vi.advanceTimersByTime(6000);
    const savedIds = stored().customNotes.map((n: CptsNoteEntry) => n.id).sort();
    expect(savedIds).toEqual([created.id, 'cA', 'cB'].sort());
    expect(stored().customNotes.find((n: CptsNoteEntry) => n.id === 'cB').rawMarkdown).toBe('B edited there');
  });

  it('a fresh tombstone for a catalog note is not resurrected by a stale write from the other tab', () => {
    useCtfStore.getState().deleteNote('catalog-note-x');
    flushProfileSave();
    otherTabWrites({ customNotes: [note('cA', 'A0', T0), note('cB', 'B0', T0)], deletedNoteIds: [] });
    expect(useCtfStore.getState().deletedNoteIds).toContain('catalog-note-x');
    vi.advanceTimersByTime(6000);
    expect(stored().deletedNoteIds).toContain('catalog-note-x');
  });

  it('clearing notes in the other tab propagates (newer epoch) and a stale write does not undo it', () => {
    const clearedAt = '2026-01-01T00:06:00.000Z';
    otherTabWrites({ customNotes: [], deletedNoteIds: [], notesEpoch: clearedAt });
    expect(useCtfStore.getState().customNotes).toEqual([]);
    expect(useCtfStore.getState().notesEpoch).toBe(clearedAt);

    // A tab that never saw the clear writes its old lists (older epoch): they stay cleared.
    otherTabWrites({ customNotes: [note('cA', 'A0', T0), note('cB', 'B0', T0)], deletedNoteIds: ['x'] });
    expect(useCtfStore.getState().customNotes).toEqual([]);
    expect(useCtfStore.getState().deletedNoteIds).toEqual([]);
    vi.advanceTimersByTime(6000);
    expect(stored().customNotes).toEqual([]);
    expect(stored().notesEpoch).toBe(clearedAt);
  });

  it('clearUserNotes here bumps the epoch, so a stale write from the other tab does not bring notes back', async () => {
    await useCtfStore.getState().clearUserNotes();
    const epoch = useCtfStore.getState().notesEpoch;
    expect(typeof epoch).toBe('string');
    flushProfileSave();
    expect(stored().notesEpoch).toBe(epoch);
    otherTabWrites({ customNotes: [note('cA', 'A0', T0), note('cB', 'B0', T0)], deletedNoteIds: [] });
    expect(useCtfStore.getState().customNotes).toEqual([]);
    vi.advanceTimersByTime(6000);
    expect(stored().customNotes).toEqual([]);
  });

  it('restoring deleted notes in the other tab clears our tombstones (newer epoch)', () => {
    useCtfStore.setState({ deletedNoteIds: ['hidden-catalog-note'] });
    flushProfileSave();
    otherTabWrites({
      customNotes: [note('cA', 'A0', T0), note('cB', 'B0', T0)],
      deletedNoteIds: [],
      notesEpoch: '2026-01-01T00:06:00.000Z',
    });
    expect(useCtfStore.getState().deletedNoteIds).toEqual([]);
    expect(ids()).toEqual(['cA', 'cB']);
  });

  it('restoreDeletedNotes bumps only the tombstones epoch, never the notes epoch', () => {
    const before = useCtfStore.getState().notesEpoch;
    useCtfStore.getState().restoreDeletedNotes();
    expect(useCtfStore.getState().notesEpoch).toBe(before);
    expect(typeof useCtfStore.getState().tombstonesEpoch).toBe('string');
  });

  it('an unsaved new note here survives the other tab restoring deleted notes, in both tabs and storage', () => {
    useCtfStore.setState({ deletedNoteIds: ['catalog-x'] });
    flushProfileSave();
    // Unsaved here, and older than the other tab's restore.
    useCtfStore.setState((s) => ({ customNotes: [note('nB', 'pending here', T1), ...s.customNotes] }));
    const restoredAt = '2026-01-01T00:06:00.000Z';
    otherTabWrites({
      customNotes: [note('cA', 'A0', T0), note('cB', 'B0', T0)],
      deletedNoteIds: [],
      tombstonesEpoch: restoredAt,
    });
    expect(ids()).toEqual(['cA', 'cB', 'nB']);
    expect(useCtfStore.getState().deletedNoteIds).toEqual([]);
    expect(useCtfStore.getState().tombstonesEpoch).toBe(restoredAt);

    vi.advanceTimersByTime(6000);
    expect(stored().customNotes.map((n: CptsNoteEntry) => n.id).sort()).toEqual(['cA', 'cB', 'nB']);
    expect(stored().deletedNoteIds).toEqual([]);
    expect(stored().tombstonesEpoch).toBe(restoredAt);
  });

  it('restored notes stay restored: a stale write still carrying the old tombstones does not re-hide them', () => {
    useCtfStore.setState({ deletedNoteIds: ['catalog-x'] });
    flushProfileSave();
    const restoredAt = '2026-01-01T00:06:00.000Z';
    otherTabWrites({ customNotes: [note('cA', 'A0', T0), note('cB', 'B0', T0)], deletedNoteIds: [], tombstonesEpoch: restoredAt });
    expect(useCtfStore.getState().deletedNoteIds).toEqual([]);

    // A third tab that never saw the restore writes its old tombstones (older tombstones epoch).
    otherTabWrites({ customNotes: [note('cA', 'A0', T0), note('cB', 'B0', T0)], deletedNoteIds: ['catalog-x'] });
    expect(useCtfStore.getState().deletedNoteIds).toEqual([]);
    vi.advanceTimersByTime(6000);
    expect(stored().deletedNoteIds).toEqual([]);
  });

  it('restoreDeletedNotes here is not undone by the other tab’s stale tombstones', () => {
    useCtfStore.setState({ deletedNoteIds: ['catalog-x'] });
    flushProfileSave();
    useCtfStore.getState().restoreDeletedNotes();
    flushProfileSave();
    otherTabWrites({ customNotes: [note('cA', 'A0', T0), note('cB', 'B0', T0)], deletedNoteIds: ['catalog-x'] });
    expect(useCtfStore.getState().deletedNoteIds).toEqual([]);
  });

  it('addCustomNote writes the profile to storage immediately', () => {
    useCtfStore.getState().addCustomNote({ title: 'Saved at once', rawMarkdown: 'x' });
    const id = useCtfStore.getState().customNotes[0].id;
    expect(stored().customNotes.map((n: CptsNoteEntry) => n.id)).toContain(id);
  });

  it('an old payload without notesEpoch still loads and merges per note', () => {
    const legacy = { machines: [], customNotes: [note('cA', 'A0', T0), note('cOld', 'legacy', T1)], deletedNoteIds: [] };
    localStorage.setItem(profileKey(), JSON.stringify(legacy));
    expect(loadInitialProfileData(PROFILE)?.customNotes?.map((n: CptsNoteEntry) => n.id)).toEqual(['cA', 'cOld']);

    otherTabWrites(legacy);
    expect(ids()).toEqual(['cA', 'cB', 'cOld']);
    expect(useCtfStore.getState().notesEpoch).toBeNull();
  });

  it('ignores the shared store blob written by a tab on another profile', () => {
    const key = 'zerobox-tactical-store';
    const newValue = JSON.stringify({
      state: { currentProfileId: 'usr_someone_else', machines: [], customNotes: [note('cX', 'other profile', T2)], deletedNoteIds: ['cA'] },
      version: 3,
    });
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
    expect(ids()).toEqual(['cA', 'cB']);
    expect(useCtfStore.getState().deletedNoteIds).toEqual([]);
  });
});

describe('mergeIncomingNotes', () => {
  const a0 = note('a', 'a0', T0);
  const b0 = note('b', 'b0', T0);
  const side = (customNotes: CptsNoteEntry[], deletedNoteIds: string[] = [], notesEpoch: string | null = null) => ({
    customNotes,
    deletedNoteIds,
    notesEpoch,
  });

  it('returns the incoming arrays themselves when the result is what the other tab stored', () => {
    const incoming = side([a0, b0]);
    const res = mergeIncomingNotes(side([a0, b0]), incoming);
    expect(res.differs).toBe(false);
    expect(res.customNotes).toBe(incoming.customNotes);
    expect(res.deletedNoteIds).toBe(incoming.deletedNoteIds);
  });

  it('keeps every local-only note and unions tombstones, dropping tombstoned ids', () => {
    const res = mergeIncomingNotes(side([b0], ['a']), side([a0, b0]));
    expect(res.customNotes.map((n) => n.id)).toEqual(['b']);
    expect(res.deletedNoteIds).toEqual(['a']);
    expect(res.differs).toBe(true);

    const mine = note('mine', 'only here', T0);
    const kept = mergeIncomingNotes(side([mine, a0]), side([a0]));
    expect(kept.customNotes.map((n) => n.id)).toEqual(['mine', 'a']);
    expect(kept.differs).toBe(true);
  });

  it('a newer epoch replaces the lists, keeping only our notes modified after it', () => {
    const after = note('late', 'typed after the clear', T2);
    const res = mergeIncomingNotes(side([a0, after], ['z']), side([], [], T1));
    expect(res.customNotes.map((n) => n.id)).toEqual(['late']);
    expect(res.deletedNoteIds).toEqual([]);
    expect(res.notesEpoch).toBe(T1);
  });

  it('an older epoch keeps our lists, taking only their notes modified after our replace', () => {
    const theirsLate = note('theirs-late', 'x', T2);
    const res = mergeIncomingNotes(side([], [], T1), side([a0, theirsLate], ['q']));
    expect(res.customNotes.map((n) => n.id)).toEqual(['theirs-late']);
    expect(res.deletedNoteIds).toEqual([]);
    expect(res.notesEpoch).toBe(T1);
    expect(res.differs).toBe(true);
  });
});

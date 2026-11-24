import { Machine, MachineTombstone } from '../types';
import type { CptsNoteEntry } from '../utils/obsidianManualUtils';

/** Workspace store: pure cross-tab merges of machines and authored notes. */

export const isoMs = (iso: unknown): number => {
  const t = typeof iso === 'string' ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : 0;
};

/**
 * Cross-tab merge of another tab's machines into ours. Only rows this tab changed since its last save
 * (`saved` holds the rows it last wrote) can win: a pending row strictly newer by updatedAt than the incoming
 * one is kept, and a pending row the other tab doesn't have is kept unless tombstoned. Everything already saved
 * defers to the newer write (so e.g. a reset there isn't undone here). Returns `incoming` itself when nothing
 * of ours is kept, which the listener treats as an echo of data already in storage.
 */
export function mergeIncomingMachines(
  local: Machine[],
  incoming: Machine[],
  saved: ReadonlySet<Machine>,
  tombstones: MachineTombstone[] = []
): Machine[] {
  const pending = new Map(local.filter((m) => !saved.has(m)).map((m) => [m.id, m] as const));
  if (pending.size === 0) return incoming;
  let keptOurs = false;
  const incomingIds = new Set<string>();
  const merged = incoming.map((m) => {
    incomingIds.add(m.id);
    const mine = pending.get(m.id);
    if (mine && isoMs(mine.updatedAt) > isoMs(m.updatedAt)) {
      keptOurs = true;
      return mine;
    }
    return m;
  });
  const dead = new Set(tombstones.map((t) => t.id));
  const localOnly = [...pending.values()].filter((m) => !incomingIds.has(m.id) && !dead.has(m.id));
  if (!keptOurs && localOnly.length === 0) return incoming;
  return [...localOnly, ...merged];
}

/** One tab's authored-notes lists as stored in its profile payload. */
export interface NotesSide {
  customNotes: CptsNoteEntry[];
  deletedNoteIds: string[];
  notesEpoch: string | null;
  tombstonesEpoch?: string | null;
}

/**
 * Cross-tab merge of another tab's authored notes (customNotes + deletedNoteIds) into ours. It never depends on
 * what this tab last saved, so a note one tab just saved survives the other tab's stale write.
 * - Same epoch (`notesEpoch`, the last whole-list replace): union by id, the newer dateModified wins (a tie goes to
 *   the other tab's copy), a note only one side has is kept unless tombstoned, tombstones are unioned and
 *   tombstoned ids are dropped.
 * - Their epoch newer (they cleared, reset, restored deleted notes or imported): their lists as-is, plus our notes
 *   modified after that replace. Their epoch is adopted.
 * - Our epoch newer (their write predates our replace): our lists, plus their notes modified after our replace.
 * `differs` is true when the result is not exactly what the other tab stored: this tab must then write it back so
 * storage (and that tab) converge. Otherwise the incoming arrays themselves are returned.
 */
export function mergeIncomingNotes(local: NotesSide, incoming: NotesSide): NotesSide & { tombstonesEpoch: string | null; differs: boolean } {
  const inEpoch = isoMs(incoming.notesEpoch);
  const ourEpoch = isoMs(local.notesEpoch);
  let mineCandidates = local.customNotes;
  let theirCandidates = incoming.customNotes;
  let deletedNoteIds: string[];
  let notesEpoch: string | null;
  if (inEpoch > ourEpoch) {
    mineCandidates = local.customNotes.filter((n) => isoMs(n.dateModified) > inEpoch);
    deletedNoteIds = incoming.deletedNoteIds;
    notesEpoch = incoming.notesEpoch;
  } else if (inEpoch < ourEpoch) {
    theirCandidates = incoming.customNotes.filter((n) => isoMs(n.dateModified) > ourEpoch);
    deletedNoteIds = local.deletedNoteIds;
    notesEpoch = local.notesEpoch;
  } else {
    notesEpoch = incoming.notesEpoch ?? local.notesEpoch ?? null;
    // Tombstones alone: a newer tombstones epoch (restore deleted notes) replaces the other list; else union.
    const inTomb = isoMs(incoming.tombstonesEpoch);
    const ourTomb = isoMs(local.tombstonesEpoch);
    if (inTomb > ourTomb) {
      deletedNoteIds = incoming.deletedNoteIds;
    } else if (inTomb < ourTomb) {
      deletedNoteIds = local.deletedNoteIds;
    } else {
      const inDead = new Set(incoming.deletedNoteIds);
      const oursOnly = [...new Set(local.deletedNoteIds.filter((id) => !inDead.has(id)))];
      deletedNoteIds = oursOnly.length > 0 ? [...incoming.deletedNoteIds, ...oursOnly] : incoming.deletedNoteIds;
    }
  }
  const tombstonesEpoch =
    isoMs(incoming.tombstonesEpoch) >= isoMs(local.tombstonesEpoch)
      ? (incoming.tombstonesEpoch ?? local.tombstonesEpoch ?? null)
      : (local.tombstonesEpoch ?? null);
  const dead = new Set(deletedNoteIds);
  const mineById = new Map(mineCandidates.map((n) => [n.id, n] as const));
  const theirIds = new Set<string>();
  const merged: CptsNoteEntry[] = [];
  for (const theirs of theirCandidates) {
    if (dead.has(theirs.id) || theirIds.has(theirs.id)) continue;
    theirIds.add(theirs.id);
    const mine = mineById.get(theirs.id);
    merged.push(mine && isoMs(mine.dateModified) > isoMs(theirs.dateModified) ? mine : theirs);
  }
  const mineOnly = mineCandidates.filter((n) => !theirIds.has(n.id) && !dead.has(n.id));
  const customNotes = [...mineOnly, ...merged];

  const sameNotes =
    customNotes.length === incoming.customNotes.length && customNotes.every((n, i) => n === incoming.customNotes[i]);
  const inDeadSet = new Set(incoming.deletedNoteIds);
  const sameTombstones = dead.size === inDeadSet.size && deletedNoteIds.every((id) => inDeadSet.has(id));
  const sameEpoch =
    (notesEpoch ?? null) === (incoming.notesEpoch ?? null) &&
    tombstonesEpoch === (incoming.tombstonesEpoch ?? null);
  if (sameNotes && sameTombstones && sameEpoch) {
    return {
      customNotes: incoming.customNotes,
      deletedNoteIds: incoming.deletedNoteIds,
      notesEpoch: incoming.notesEpoch ?? null,
      tombstonesEpoch,
      differs: false,
    };
  }
  return { customNotes, deletedNoteIds, notesEpoch, tombstonesEpoch, differs: true };
}

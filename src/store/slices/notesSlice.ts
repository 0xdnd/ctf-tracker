import type { StateCreator } from 'zustand';
import type { CptsNoteEntry } from '../../utils/obsidianManualUtils';
import { extractCommands, parseFrontmatterAndBody } from '../../utils/markdownFrontmatter';
import {
  loadVaultFromIndexedDb,
  clearVaultFromIndexedDb,
  snapshotVaultBeforeImport,
  restoreLastImportSnapshot,
  saveVaultStrict,
  type VaultMutationBase,
  type VaultMutationResult,
} from '../../utils/indexedDbVault';
import { sanitizeObjectKeys, sanitizeStringMap } from '../../utils/workspaceStorage';
import { flushProfileSave, applyVaultWrite } from '../ctfStore';
import { CtfStoreState, CtfBootData } from '../ctfStoreTypes';
import { broadcastVaultNotesUpdated, mutateVaultNotes, NOTE_GONE_MESSAGE } from '../ctfVaultNotes';

/** Workspace store slice: authored notes (custom notes, tombstones, epochs) and the imported notes vault. */

export interface NotesSliceState {
  userNotes: CptsNoteEntry[];
  /** True once loadUserNotesFromDb has settled (success or failure); gates pruning of unresolved note tabs. */
  userNotesHydrated: boolean;
  userWikilinkMap: Record<string, string>;
  setUserNotes: (notes: CptsNoteEntry[]) => void;
  setUserWikilinkMap: (map: Record<string, string>) => void;
  importNotesFromJson: (jsonStr: string) => Promise<{ success: boolean; count: number; error?: string }>;
  replaceUserNotes: (notes: CptsNoteEntry[], wikilinkMap: Record<string, string>) => Promise<void>;
  restoreLastNotesSnapshot: () => Promise<{ success: boolean; count: number; error?: string }>;
  clearUserNotes: () => Promise<void>;
  loadUserNotesFromDb: () => Promise<void>;
  // Custom Notes & Field Manual State
  customNotes: CptsNoteEntry[];
  deletedNoteIds: string[];
  /**
   * When customNotes/deletedNoteIds were last replaced as a whole (clear, reset, restore deleted, import). Cross-tab
   * merges take the other tab's lists as-is only when its epoch is newer; otherwise they union per note. Null for
   * data saved before the field existed (epoch 0).
   */
  notesEpoch: string | null;
  /**
   * When deletedNoteIds alone was last emptied on purpose (restore deleted notes). Never removes notes: a newer
   * tombstones epoch only replaces the other tab's tombstone list. Null for older data.
   */
  tombstonesEpoch: string | null;
  addCustomNote: (note: Partial<CptsNoteEntry> & { title: string }) => void;
  updateNoteContent: (noteId: string, rawMarkdown: string) => void | Promise<void>;
  /**
   * Rewrite several notes' markdown at once (IP templating apply / undo). Same semantics as
   * updateNoteContent — dateModified stamped, customNotes flushed, vault save awaited — plus
   * `commands` re-derived from the new markdown. An authored copy wins over an imported note.
   */
  applyNoteContentBatch: (
    edits: { noteId: string; rawMarkdown: string }[]
  ) => Promise<{ updated: string[]; missing: string[] }>;
  deleteNote: (noteId: string) => void;
  /** deleteNote for several notes at once: one state update and one stored-vault write. */
  deleteNotes: (noteIds: string[]) => void;
  restoreDeletedNotes: () => void;
}

export const createNotesSlice = (boot: CtfBootData): StateCreator<CtfStoreState, [['zustand/persist', unknown]], [], NotesSliceState> => (set, get) => ({
  customNotes: boot.initialProfileData?.customNotes || [],

  deletedNoteIds: boot.initialProfileData?.deletedNoteIds || [],

  notesEpoch: typeof boot.initialProfileData?.notesEpoch === 'string' ? boot.initialProfileData.notesEpoch : null,

  tombstonesEpoch: typeof boot.initialProfileData?.tombstonesEpoch === 'string' ? boot.initialProfileData.tombstonesEpoch : null,

  userNotes: [],

  userNotesHydrated: false,

  userWikilinkMap: {},

  setUserNotes: (notes) => set({ userNotes: notes }),

  setUserWikilinkMap: (map) => set({ userWikilinkMap: map }),

  importNotesFromJson: async (jsonStr) => {
    try {
      // Drops __proto__ / constructor / prototype keys a hostile file can carry (JSON.parse keeps them as own keys).
      // The wikilink map is read from the raw file instead: titles are user text, so only __proto__ is unsafe there.
      const rawJson = JSON.parse(jsonStr);
      const parsed = sanitizeObjectKeys(rawJson);
      const notes: CptsNoteEntry[] = Array.isArray(parsed)
        ? parsed
        : (Array.isArray(parsed.notes) ? parsed.notes : []);

      if (!notes.length) {
        return { success: false, count: 0, error: 'No valid notes array found in JSON payload.' };
      }

      const wikilinkMap = sanitizeStringMap(Array.isArray(rawJson) ? undefined : rawJson?.wikilinkMap);
      await get().replaceUserNotes(notes, wikilinkMap);
      return { success: true, count: notes.length };
    } catch (err) {
      return { success: false, count: 0, error: (err as Error)?.message || 'Invalid JSON format' };
    }
  },

  // Single path for every import: keep a copy of the current vault first; if that fails nothing is overwritten.
  replaceUserNotes: async (notes, wikilinkMap) => {
    try {
      await snapshotVaultBeforeImport();
    } catch (err) {
      throw new Error(
        `Could not save a copy of your current notes, so nothing was imported. ${(err as Error)?.message || ''}`.trim()
      );
    }
    await saveVaultStrict({ notes, wikilinkMap });
    set((state) => {
      // Re-imported notes show again: their old tombstones go, under a newer tombstones epoch so other tabs
      // take the shorter list instead of unioning the ids back in.
      const imported = new Set(notes.map((n) => n.id));
      const kept = state.deletedNoteIds.filter((id) => !imported.has(id));
      if (kept.length === state.deletedNoteIds.length) return { userNotes: notes, userWikilinkMap: wikilinkMap };
      return {
        userNotes: notes,
        userWikilinkMap: wikilinkMap,
        deletedNoteIds: kept,
        tombstonesEpoch: new Date().toISOString(),
      };
    });
    broadcastVaultNotesUpdated();
  },

  restoreLastNotesSnapshot: async () => {
    try {
      const snapshot = await restoreLastImportSnapshot();
      if (!snapshot) return { success: false, count: 0, error: 'There is no previous notes snapshot to restore.' };
      set({ userNotes: snapshot.notes, userWikilinkMap: snapshot.wikilinkMap });
      broadcastVaultNotesUpdated();
      return { success: true, count: snapshot.notes.length };
    } catch (err) {
      return { success: false, count: 0, error: (err as Error)?.message || 'Could not restore the previous notes.' };
    }
  },

  clearUserNotes: async () => {
    await clearVaultFromIndexedDb();
    set({ userNotes: [], userWikilinkMap: {}, deletedNoteIds: [], customNotes: [], notesEpoch: new Date().toISOString() });
    broadcastVaultNotesUpdated();
  },

  loadUserNotesFromDb: async () => {
    try {
      const vault = await loadVaultFromIndexedDb();
      if (vault && vault.notes && vault.notes.length > 0) {
        set({ 
          userNotes: vault.notes,
          userWikilinkMap: vault.wikilinkMap || {}
        });
        return;
      }
      // An empty vault stays empty: new users start with no notes (the empty state offers Import and Restore).
    } catch (err) {
      console.warn('[ZeroBox] Could not load user notes from IndexedDB', err);
    } finally {
      set({ userNotesHydrated: true });
    }
  },

  addCustomNote: (note) => {
    const id = 'custom-note-' + Date.now();
    const fullNote: CptsNoteEntry = {
      id,
      title: note.title,
      titleEn: note.titleEn || note.title,
      titleHe: note.titleHe,
      category: note.category || 'General Methodology',
      rawCategory: note.rawCategory || note.category || 'General',
      subCategory: note.subCategory || '',
      tags: note.tags || ['custom'],
      difficulty: note.difficulty || 'Custom',
      summary: note.summary || '',
      enSummary: note.enSummary || note.summary || '',
      heSummary: note.heSummary,
      commands: note.commands || [],
      relPath: note.relPath || `${note.category || 'Custom'}/${note.title}.md`,
      filename: `${note.title}.md`,
      rawMarkdown: note.rawMarkdown || note.summary || '',
      // Cross-tab merges pick the newer copy of a note by dateModified.
      dateModified: new Date().toISOString(),
    };
    set((state) => ({
      customNotes: [fullNote, ...state.customNotes],
    }));
    // Written now (like updateNoteContent), so another tab never writes over a note that is only in memory here.
    flushProfileSave();
  },

  updateNoteContent: async (noteId: string, rawMarkdown: string) => {
    const state = get();
    const now = new Date().toISOString();

    // 1. In-place update if note exists in customNotes (custom or already promoted)
    const customNote = state.customNotes.find((n) => n.id === noteId);
    if (customNote) {
      const updatedCustom = state.customNotes.map((n) =>
        n.id === noteId ? { ...n, rawMarkdown, dateModified: now } : n
      );
      set({ customNotes: updatedCustom });
      flushProfileSave();
      return;
    }

    // 2. In-place update if note exists in userNotes (imported private vault)
    const userNotes = state.userNotes || [];
    const isUserNote = userNotes.some((n) => n.id === noteId);
    const editNote = (notes: CptsNoteEntry[]) =>
      notes.map((n) => (n.id === noteId ? { ...n, rawMarkdown, dateModified: now } : n));
    // Onto the stored vault; rejects when the note is gone from it (deleted in another tab), never "saved".
    const editStored = (current: VaultMutationBase): VaultMutationResult => {
      if (!current.notes.some((n) => n.id === noteId)) throw new Error(NOTE_GONE_MESSAGE);
      return { notes: editNote(current.notes), wikilinkMap: current.wikilinkMap };
    };
    if (isUserNote) {
      const updatedUserNotes = editNote(userNotes);
      set({ userNotes: updatedUserNotes });
      // Only this note's change is applied onto the stored vault (another tab may have saved other notes).
      // Awaited, and a failure rejects: the editor then keeps the edit marked unsaved instead of "saved".
      const written = await mutateVaultNotes(
        editStored,
        () => ({ notes: updatedUserNotes, wikilinkMap: state.userWikilinkMap || {} })
      );
      applyVaultWrite(written, [noteId]);
      return;
    }

    // 3. Imported notes hydrate from IndexedDB asynchronously at startup. If the store
    //    has not caught up yet, read the vault directly so the edit is never dropped.
    //    (The app ships no bundled catalog, so there is nothing else to promote from.)
    if (userNotes.length === 0) {
      let saveEdit: (() => Promise<void>) | null = null;
      try {
        const vault = await loadVaultFromIndexedDb();
        const vaultNotes = vault?.notes || [];
        if (vaultNotes.some((n) => n.id === noteId)) {
          const latest = get().userNotes || [];
          const base = latest.length > 0 ? latest : vaultNotes;
          const wikilinkMap =
            latest.length > 0 ? get().userWikilinkMap || {} : vault?.wikilinkMap || {};
          const updatedUserNotes = editNote(base);
          set({ userNotes: updatedUserNotes, userWikilinkMap: wikilinkMap });
          saveEdit = async () => {
            const written = await mutateVaultNotes(
              editStored,
              () => ({ notes: updatedUserNotes, wikilinkMap })
            );
            applyVaultWrite(written, [noteId]);
          };
        }
      } catch (err) {
        console.warn('[ZeroBox] Could not read the notes vault before saving an edit', err);
      }
      // Outside the read guard: a failed save must reject so the editor keeps the edit unsaved.
      if (saveEdit) {
        await saveEdit();
        return;
      }
    }

    // The note is gone (deleted, here or in another tab): reject, so the editor keeps the text unsaved.
    throw new Error(NOTE_GONE_MESSAGE);
  },

  applyNoteContentBatch: async (edits) => {
    const state = get();
    const now = new Date().toISOString();
    const byId = new Map(edits.map((e) => [e.noteId, e.rawMarkdown]));
    const updated = new Set<string>();
    const rewrite = (n: CptsNoteEntry): CptsNoteEntry => {
      const rawMarkdown = byId.get(n.id);
      if (rawMarkdown === undefined) return n;
      updated.add(n.id);
      const commands = extractCommands(parseFrontmatterAndBody(rawMarkdown).body);
      return { ...n, rawMarkdown, commands, dateModified: now };
    };

    const customIds = new Set(state.customNotes.map((n) => n.id));
    const customHit = state.customNotes.some((n) => byId.has(n.id));
    const userNotes = state.userNotes || [];
    const userHit = userNotes.some((n) => byId.has(n.id) && !customIds.has(n.id));

    if (customHit) {
      set({ customNotes: state.customNotes.map(rewrite) });
      flushProfileSave();
    }
    if (userHit) {
      const updatedUserNotes = userNotes.map((n) => (customIds.has(n.id) ? n : rewrite(n)));
      set({ userNotes: updatedUserNotes });
      const vaultIds = userNotes.filter((n) => byId.has(n.id) && !customIds.has(n.id)).map((n) => n.id);
      const inBatch = new Set(vaultIds);
      // Each edited note is applied by id onto the stored vault. Awaited, and a failure rejects, like
      // updateNoteContent.
      const written = await mutateVaultNotes(
        (current) => ({
          notes: current.notes.map((n) => (inBatch.has(n.id) ? rewrite(n) : n)),
          wikilinkMap: current.wikilinkMap,
        }),
        () => ({ notes: updatedUserNotes, wikilinkMap: state.userWikilinkMap || {} })
      );
      applyVaultWrite(written, vaultIds);
    }

    return {
      updated: Array.from(updated),
      missing: edits.map((e) => e.noteId).filter((id) => !updated.has(id)),
    };
  },

  deleteNote: (noteId) => get().deleteNotes([noteId]),

  deleteNotes: (noteIds) => {
    const ids = new Set(noteIds);
    if (ids.size === 0) return;
    const userNotes = get().userNotes || [];
    const targets = userNotes.filter((n) => ids.has(n.id));
    if (targets.length > 0) {
      const dropFromMap = (map: Record<string, string>) => {
        const next = { ...map };
        for (const target of targets) {
          if (target.title) delete next[target.title.toLowerCase()];
          if (target.titleEn) delete next[target.titleEn.toLowerCase()];
          if (target.filename) delete next[target.filename.toLowerCase()];
        }
        return next;
      };
      const updatedNotes = userNotes.filter((n) => !ids.has(n.id));
      const updatedMap = dropFromMap(get().userWikilinkMap || {});
      const removedIds = targets.map((n) => n.id);
      // Removed by id from the stored vault, so another tab's edits to other notes survive.
      mutateVaultNotes(
        (current) => ({
          notes: current.notes.filter((n) => !ids.has(n.id)),
          wikilinkMap: dropFromMap(current.wikilinkMap),
        }),
        () => ({ notes: updatedNotes, wikilinkMap: updatedMap })
      )
        .then((written) => applyVaultWrite(written, removedIds))
        .catch((err) => console.warn('[ZeroBox] Could not persist note deletion to IndexedDB', err));
      set((state) => ({
        userNotes: updatedNotes,
        userWikilinkMap: updatedMap,
        deletedNoteIds: [...new Set([...state.deletedNoteIds, ...ids])],
        customNotes: state.customNotes.filter((n) => !ids.has(n.id)),
      }));
      return;
    }
    set((state) => ({
      deletedNoteIds: [...new Set([...state.deletedNoteIds, ...ids])],
      customNotes: state.customNotes.filter((n) => !ids.has(n.id)),
    }));
  },

  restoreDeletedNotes: () => {
    // Only the tombstones change: notesEpoch stays, so other tabs keep their own (unsaved or new) notes.
    set(() => ({ deletedNoteIds: [], tombstonesEpoch: new Date().toISOString() }));
  },
});

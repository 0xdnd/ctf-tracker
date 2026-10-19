import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CptsNoteEntry, getAllCptsNotes } from '../utils/obsidianManualUtils';
import { useCtfStore } from './useCtfStore';
import { INITIAL_CHEATSHEET } from '../data/cheatsheetsData';
import type { CheatsheetCommand } from '../types';

export type DockSize = 'normal' | 'expanded';
export type ObsidianViewMode = 'reading' | 'split' | 'raw';
export type ObsidianNoteLanguage = 'en' | 'he';
export type NoteFontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface OpenNoteOptions {
  background?: boolean;
  anchor?: string;
  stayClosed?: boolean;
}

/** Dock tab ids for cheatsheet snippets are `cheat:<entryId>`; every other id is a note id. */
export const CHEAT_TAB_PREFIX = 'cheat:';
export const cheatTabId = (entryId: string): string => `${CHEAT_TAB_PREFIX}${entryId}`;
export const isCheatTabId = (tabId: string): boolean => tabId.startsWith(CHEAT_TAB_PREFIX);

export type ResolvedTab =
  | { kind: 'note'; note: CptsNoteEntry }
  | { kind: 'cheat'; entry: CheatsheetCommand };

export const resolvedTabId = (tab: ResolvedTab): string =>
  tab.kind === 'note' ? tab.note.id : cheatTabId(tab.entry.id);

/**
 * Resolves a dock tab id against live data: notes come from the user's authored + imported pools,
 * snippets from the cheatsheet store (built-ins plus the user's custom commands), falling back to the
 * static catalog. Returns null when nothing matches, so callers never invent a phantom tab.
 */
export function resolveTabById(tabId: string): ResolvedTab | null {
  if (!tabId) return null;
  if (isCheatTabId(tabId)) {
    const entryId = tabId.slice(CHEAT_TAB_PREFIX.length);
    let pool: CheatsheetCommand[] = INITIAL_CHEATSHEET;
    try {
      const live = useCtfStore.getState().cheatsheets;
      if (Array.isArray(live)) pool = live;
    } catch {}
    const entry = pool.find((c) => c.id === entryId) ?? INITIAL_CHEATSHEET.find((c) => c.id === entryId);
    return entry ? { kind: 'cheat', entry } : null;
  }
  const note = getAllCptsNotes().find((n) => n.id === tabId);
  return note ? { kind: 'note', note } : null;
}

export interface NotesWorkspaceState {
  // Tabs & Navigation
  openTabIds: string[];
  activeTabId: string | null;

  // Dock Visibility & Behavior
  isOpen: boolean;
  isPinned: boolean; // When true, stays open as user navigates across routes
  dockSize: DockSize;
  /** Left "Notes" list inside the dock. Persisted; the list is also hidden automatically in a narrow dock. */
  notesListCollapsed: boolean;

  // Display Options
  viewMode: ObsidianViewMode;
  language: ObsidianNoteLanguage;
  fontSize: NoteFontSize;

  // Search & Filter inside workspace
  searchQuery: string;
  isSearchOpen: boolean;

  // "Open anything" quick switcher (transient, not persisted)
  isSwitcherOpen: boolean;

  // Actions
  openNote: (noteId: string, options?: OpenNoteOptions) => void;
  openCheat: (entryId: string, options?: OpenNoteOptions) => void;
  setSwitcherOpen: (open: boolean) => void;
  setNotesListCollapsed: (collapsed: boolean) => void;
  toggleNotesList: () => void;
  pruneUnresolvedTabs: () => void;
  closeTab: (noteId: string) => void;
  closeAllTabs: () => void;
  setActiveTab: (noteId: string) => void;
  toggleOpen: () => void;
  setIsOpen: (isOpen: boolean) => void;
  togglePinned: () => void;
  setIsPinned: (isPinned: boolean) => void;
  setDockSize: (size: DockSize) => void;
  toggleDockSize: () => void;
  setViewMode: (mode: ObsidianViewMode) => void;
  setLanguage: (lang: ObsidianNoteLanguage) => void;
  setFontSize: (size: NoteFontSize) => void;
  setSearchQuery: (query: string) => void;
  setIsSearchOpen: (isOpen: boolean) => void;

  // Helper selectors
  resolveTab: (tabId: string) => ResolvedTab | null;
  /** Open tabs that resolve to a note or snippet, in tab order. No fallback tab is invented. */
  getOpenTabs: () => ResolvedTab[];
  /** The active tab if it resolves, else the first open tab that does, else null. */
  getActiveTab: () => ResolvedTab | null;
  /** Note-only views kept for existing callers; they fall back to a seed note only when NO tab resolves. */
  getActiveNote: () => CptsNoteEntry | null;
  getOpenNotes: () => CptsNoteEntry[];
}

export const useNotesWorkspaceStore = create<NotesWorkspaceState>()(
  persist(
    (set, get) => ({
      openTabIds: [],
      activeTabId: null,
      isOpen: false,
      isPinned: true,
      dockSize: 'normal',
      notesListCollapsed: false,
      viewMode: 'reading',
      language: 'en',
      fontSize: 'base',
      searchQuery: '',
      isSearchOpen: false,
      isSwitcherOpen: false,

      resolveTab: resolveTabById,

      setSwitcherOpen: (isSwitcherOpen: boolean) => set({ isSwitcherOpen }),

      setNotesListCollapsed: (notesListCollapsed: boolean) => set({ notesListCollapsed }),

      toggleNotesList: () => set((state) => ({ notesListCollapsed: !state.notesListCollapsed })),

      openCheat: (entryId: string, options?: OpenNoteOptions) => {
        if (!entryId) return;
        get().openNote(cheatTabId(entryId), options);
      },

      pruneUnresolvedTabs: () => {
        const hydrated = useCtfStore.getState().userNotesHydrated;
        const state = get();
        // Snippet ids resolve against static data, so they are always safe to prune. Note ids only
        // once the IndexedDB vault has loaded; before that an unresolved note id may just be pending.
        const keep = (id: string) =>
          isCheatTabId(id) ? Boolean(resolveTabById(id)) : !hydrated || Boolean(resolveTabById(id));
        const nextTabs = state.openTabIds.filter(keep);
        if (nextTabs.length === state.openTabIds.length) return;
        let nextActive = state.activeTabId;
        if (!nextActive || !nextTabs.includes(nextActive)) {
          const oldIndex = nextActive ? state.openTabIds.indexOf(nextActive) : 0;
          nextActive = nextTabs.length > 0 ? nextTabs[Math.min(Math.max(oldIndex, 0), nextTabs.length - 1)] : null;
        }
        set({ openTabIds: nextTabs, activeTabId: nextActive });
      },

      openNote: (noteId: string, options?: OpenNoteOptions) => {
        if (!noteId) return;
        set((state) => {
          const alreadyOpen = state.openTabIds.includes(noteId);
          const nextTabs = alreadyOpen ? state.openTabIds : [...state.openTabIds, noteId];
          return {
            openTabIds: nextTabs,
            activeTabId: options?.background ? (state.activeTabId || noteId) : noteId,
            isOpen: options?.stayClosed ? state.isOpen : true,
          };
        });
      },

      closeTab: (noteId: string) => {
        set((state) => {
          const nextTabs = state.openTabIds.filter((id) => id !== noteId);
          let nextActive = state.activeTabId;

          if (state.activeTabId === noteId) {
            const closingIndex = state.openTabIds.indexOf(noteId);
            if (nextTabs.length > 0) {
              const newIndex = Math.min(closingIndex, nextTabs.length - 1);
              nextActive = nextTabs[newIndex];
            } else {
              nextActive = null;
            }
          }

          return {
            openTabIds: nextTabs,
            activeTabId: nextActive,
            isOpen: nextTabs.length > 0 ? state.isOpen : false,
            isSwitcherOpen: nextTabs.length > 0 ? state.isSwitcherOpen : false,
          };
        });
      },

      closeAllTabs: () => {
        set({
          openTabIds: [],
          activeTabId: null,
          isOpen: false,
          isSwitcherOpen: false,
        });
      },

      setActiveTab: (noteId: string) => {
        set((state) => {
          if (!state.openTabIds.includes(noteId)) {
            return {
              openTabIds: [...state.openTabIds, noteId],
              activeTabId: noteId,
              isOpen: true,
            };
          }
          return {
            activeTabId: noteId,
            isOpen: true,
          };
        });
      },

      toggleOpen: () => {
        set((state) => {
          // Closing never rewrites tabs.
          if (state.isOpen) return { isOpen: false, isSwitcherOpen: false };

          // Opening: keep the persisted tabs untouched (pruning is a separate, hydration-aware step).
          const valid = state.openTabIds.filter((id) => resolveTabById(id));
          if (valid.length > 0) {
            return {
              isOpen: true,
              activeTabId: state.activeTabId && valid.includes(state.activeTabId) ? state.activeTabId : valid[0],
            };
          }

          // Nothing resolvable is open: seed with the cheatsheet-active note, else the first note.
          // The app ships no notes, so with none written or imported the dock opens empty.
          const all = getAllCptsNotes();
          if (all.length === 0) return { isOpen: true };
          let seedId = all[0].id;
          try {
            const saved = localStorage.getItem('zerobox_obsidian_active_tab');
            if (saved && all.some((n) => n.id === saved)) seedId = saved;
          } catch {}
          const hydrated = useCtfStore.getState().userNotesHydrated;
          return {
            isOpen: true,
            // Before the vault has hydrated, unresolved persisted note ids may still be pending: keep them.
            openTabIds: hydrated ? [seedId] : [...state.openTabIds.filter((id) => id !== seedId), seedId],
            activeTabId: seedId,
          };
        });
      },

      // The quick switcher lives inside the dock, so it never outlives it.
      setIsOpen: (isOpen: boolean) => set(isOpen ? { isOpen } : { isOpen, isSwitcherOpen: false }),

      togglePinned: () => set((state) => ({ isPinned: !state.isPinned })),

      setIsPinned: (isPinned: boolean) => set({ isPinned }),

      setDockSize: (dockSize: DockSize) => set({ dockSize }),

      toggleDockSize: () =>
        set((state) => ({
          dockSize: state.dockSize === 'normal' ? 'expanded' : 'normal',
        })),

      setViewMode: (viewMode: ObsidianViewMode) => set({ viewMode }),

      setLanguage: (language: ObsidianNoteLanguage) => set({ language }),

      setFontSize: (fontSize: NoteFontSize) => set({ fontSize }),

      setSearchQuery: (searchQuery: string) => set({ searchQuery }),

      setIsSearchOpen: (isSearchOpen: boolean) => set({ isSearchOpen }),

      getOpenTabs: () => {
        const out: ResolvedTab[] = [];
        for (const id of get().openTabIds) {
          const tab = resolveTabById(id);
          if (tab) out.push(tab);
        }
        return out;
      },

      getActiveTab: () => {
        const state = get();
        if (state.activeTabId) {
          const active = resolveTabById(state.activeTabId);
          if (active) return active;
        }
        for (const id of state.openTabIds) {
          const tab = resolveTabById(id);
          if (tab) return tab;
        }
        return null;
      },

      getActiveNote: () => {
        const tab = get().getActiveTab();
        if (tab) return tab.kind === 'note' ? tab.note : null;

        // No tab resolves at all: fall back to the cheatsheet-active note, then the first note.
        const all = getAllCptsNotes();
        try {
          const cheatsheetActive = localStorage.getItem('zerobox_obsidian_active_tab');
          if (cheatsheetActive) {
            const match = all.find((n) => n.id === cheatsheetActive);
            if (match) return match;
          }
        } catch {}
        return all[0] || null;
      },

      getOpenNotes: () => {
        const tabs = get().getOpenTabs();
        // Snippet-only workspaces must not conjure a note.
        if (tabs.length > 0) {
          return tabs.filter((t): t is Extract<ResolvedTab, { kind: 'note' }> => t.kind === 'note').map((t) => t.note);
        }
        const note = get().getActiveNote();
        return note ? [note] : [];
      },

    }),
    {
      name: 'zerobox_notes_workspace',
      merge: (persistedState: any, currentState: NotesWorkspaceState) => {
        const validModes: ObsidianViewMode[] = ['reading', 'split', 'raw'];
        const merged = { ...currentState, ...(persistedState as Partial<NotesWorkspaceState>) };
        if (!validModes.includes(merged.viewMode)) {
          merged.viewMode = 'reading';
        }
        if (!Array.isArray(merged.openTabIds)) merged.openTabIds = [];
        if (typeof merged.notesListCollapsed !== 'boolean') merged.notesListCollapsed = false;

        // Persisted tabs are kept as-is. Imported notes hydrate from IndexedDB after this
        // runs, so pruning here would drop valid tabs; readers skip ids with no note.
        return merged;
      },
      partialize: (state) => ({
        openTabIds: state.openTabIds,
        activeTabId: state.activeTabId,
        isPinned: state.isPinned,
        dockSize: state.dockSize,
        notesListCollapsed: state.notesListCollapsed,
        viewMode: state.viewMode,
        language: state.language,
        fontSize: state.fontSize,
      }),
    }
  )
);

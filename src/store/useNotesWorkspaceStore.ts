import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CptsNoteEntry, getAllCptsNotes, getNoteById } from '../utils/obsidianManualUtils';
import { useCtfStore } from './useCtfStore';

export type DockSize = 'normal' | 'expanded';
export type ObsidianViewMode = 'reading' | 'split' | 'raw';
export type ObsidianNoteLanguage = 'en' | 'he';
export type NoteFontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface OpenNoteOptions {
  background?: boolean;
  anchor?: string;
}

export interface NotesWorkspaceState {
  // Tabs & Navigation
  openTabIds: string[];
  activeTabId: string | null;

  // Dock Visibility & Behavior
  isOpen: boolean;
  isPinned: boolean; // When true, stays open as user navigates across routes
  dockSize: DockSize;

  // Display Options
  viewMode: ObsidianViewMode;
  language: ObsidianNoteLanguage;
  fontSize: NoteFontSize;

  // Search & Filter inside workspace
  searchQuery: string;
  isSearchOpen: boolean;

  // Actions
  openNote: (noteId: string, options?: OpenNoteOptions) => void;
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

  // Helper selector
  getActiveNote: () => CptsNoteEntry | null;
  getOpenNotes: () => CptsNoteEntry[];
}

export const useNotesWorkspaceStore = create<NotesWorkspaceState>()(
  persist(
    (set, get) => ({
      openTabIds: ['01-recon-port-scanning'],
      activeTabId: '01-recon-port-scanning',
      isOpen: false,
      isPinned: true,
      dockSize: 'normal',
      viewMode: 'reading',
      language: 'en',
      fontSize: 'base',
      searchQuery: '',
      isSearchOpen: false,

      openNote: (noteId: string, options?: OpenNoteOptions) => {
        if (!noteId) return;
        set((state) => {
          const alreadyOpen = state.openTabIds.includes(noteId);
          const nextTabs = alreadyOpen ? state.openTabIds : [...state.openTabIds, noteId];
          return {
            openTabIds: nextTabs,
            activeTabId: options?.background ? (state.activeTabId || noteId) : noteId,
            isOpen: true,
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
          };
        });
      },

      closeAllTabs: () => {
        set({
          openTabIds: [],
          activeTabId: null,
          isOpen: false,
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
          const all = [...(useCtfStore.getState().customNotes || []), ...getAllCptsNotes()];
          const defaultId = all.find((n) => n.id === '01-recon-port-scanning')?.id || all[0]?.id || '01-recon-port-scanning';
          const validTabIds = state.openTabIds.filter((id) => all.some((n) => n.id === id));

          if (!state.isOpen && validTabIds.length === 0) {
            return {
              isOpen: true,
              openTabIds: [defaultId],
              activeTabId: defaultId,
            };
          }
          return {
            isOpen: !state.isOpen,
            openTabIds: validTabIds.length > 0 ? validTabIds : [defaultId],
            activeTabId: (state.activeTabId && all.some((n) => n.id === state.activeTabId))
              ? state.activeTabId
              : (validTabIds[0] || defaultId),
          };
        });
      },

      setIsOpen: (isOpen: boolean) => set({ isOpen }),

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

      getActiveNote: () => {
        const state = get();
        const customNotes = useCtfStore.getState().customNotes || [];
        const all = [...customNotes, ...getAllCptsNotes()];

        // 1. Try currently active tab
        if (state.activeTabId) {
          const match = all.find((n) => n.id === state.activeTabId);
          if (match) return match;
        }

        // 2. Try first valid open tab
        for (const tabId of state.openTabIds) {
          const match = all.find((n) => n.id === tabId);
          if (match) return match;
        }

        // 3. Fallback: default note or first available note
        return all.find((n) => n.id === '01-recon-port-scanning') || all[0] || null;
      },

      getOpenNotes: () => {
        const state = get();
        const custom = useCtfStore.getState().customNotes || [];
        const all = [...custom, ...getAllCptsNotes()];
        const map = new Map(all.map((n) => [n.id, n]));

        const matched = state.openTabIds
          .map((id) => map.get(id))
          .filter((n): n is CptsNoteEntry => Boolean(n));

        if (matched.length === 0 && all.length > 0) {
          const fallback = map.get('01-recon-port-scanning') || all[0];
          if (fallback) return [fallback];
        }

        return matched;
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

        // Auto-sanitize legacy invalid tab IDs (e.g. stale '00_methodology_pt')
        const all = [...(useCtfStore.getState().customNotes || []), ...getAllCptsNotes()];
        const validIds = new Set(all.map((n) => n.id));
        const defaultId = all.find((n) => n.id === '01-recon-port-scanning')?.id || all[0]?.id || '01-recon-port-scanning';

        const filteredTabs = (merged.openTabIds || []).filter((id) => validIds.has(id));
        merged.openTabIds = filteredTabs.length > 0 ? filteredTabs : [defaultId];

        if (!merged.activeTabId || !validIds.has(merged.activeTabId)) {
          merged.activeTabId = merged.openTabIds[0] || defaultId;
        }

        return merged;
      },
      partialize: (state) => ({
        openTabIds: state.openTabIds,
        activeTabId: state.activeTabId,
        isPinned: state.isPinned,
        dockSize: state.dockSize,
        viewMode: state.viewMode,
        language: state.language,
        fontSize: state.fontSize,
      }),
    }
  )
);

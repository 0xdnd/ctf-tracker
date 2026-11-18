import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Location } from 'react-router-dom';
import {
  CptsNoteEntry,
  getNoteById,
  getAllCptsNotes,
  getBacklinksForNote,
} from '../../../utils/obsidianManualUtils';
import { getNoteOutline } from '../../../utils/noteMeta';
import { useNotesWorkspaceStore } from '../../../store/useNotesWorkspaceStore';
import { useToastStore } from '../../../store/useToastStore';
import { hasUnsavedNoteEdits } from '../../../utils/unsavedNoteEdits';
import { SplitOrientation } from '../../../types/workspace';
import type { useNoteIndex } from '../../../hooks/useNoteIndex';

/** Primary-pane tab state (restored from the ?note= param or localStorage) and the pop-out flag. */
export function useWorkspaceTabState({ location, isManualRoute }: { location: Location; isManualRoute: boolean }) {
  const [openObsidianNotes, setOpenObsidianNotes] = useState<CptsNoteEntry[]>(() => {
    try {
      const params = new URLSearchParams(location.search);
      let noteParam = params.get('note');
      if (!noteParam && typeof window !== 'undefined' && window.location.hash.includes('?')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        noteParam = hashParams.get('note');
      }
      if (noteParam) {
        const found = getNoteById(noteParam);
        if (found) return [found];
      }
      const saved = localStorage.getItem('zerobox_obsidian_open_tabs');
      if (saved) {
        const ids: string[] = JSON.parse(saved);
        const notes = ids.map((id) => getNoteById(id)).filter((n): n is CptsNoteEntry => Boolean(n));
        if (notes.length > 0) return notes;
      }
    } catch { /* best effort */ }
    const all = getAllCptsNotes();
    if (all.length > 0 && isManualRoute) return [all[0]];
    return [];
  });
  const [activeObsidianNoteId, setActiveObsidianNoteId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(location.search);
      let noteParam = params.get('note');
      if (!noteParam && typeof window !== 'undefined' && window.location.hash.includes('?')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        noteParam = hashParams.get('note');
      }
      if (noteParam) {
        const found = getNoteById(noteParam);
        if (found) return found.id;
      }
      const saved = localStorage.getItem('zerobox_obsidian_active_tab');
      if (saved) return saved;
    } catch { /* best effort */ }
    const all = getAllCptsNotes();
    return isManualRoute && all.length > 0 ? all[0].id : null;
  });

  // Check if current view is a detached standalone pop-out window
  const isPopout = useMemo(() => {
    return new URLSearchParams(location.search).get('popout') === 'true';
  }, [location.search]);
  return { openObsidianNotes, setOpenObsidianNotes, activeObsidianNoteId, setActiveObsidianNoteId, isPopout };
}

interface UseWorkspaceTabsParams {
  openObsidianNotes: CptsNoteEntry[];
  setOpenObsidianNotes: Dispatch<SetStateAction<CptsNoteEntry[]>>;
  activeObsidianNoteId: string | null;
  setActiveObsidianNoteId: Dispatch<SetStateAction<string | null>>;
  deferredSearchQuery: string;
}

/** Primary-pane tab handlers, result highlights, and localStorage / sidecar persistence. */
export function useWorkspaceTabs({
  openObsidianNotes,
  setOpenObsidianNotes,
  activeObsidianNoteId,
  setActiveObsidianNoteId,
  deferredSearchQuery,
}: UseWorkspaceTabsParams) {
  const activeObsidianNote = useMemo(() => {
    if (!activeObsidianNoteId) return null;
    return openObsidianNotes.find((n) => n.id === activeObsidianNoteId) || openObsidianNotes[0] || null;
  }, [openObsidianNotes, activeObsidianNoteId]);

  const handleOpenObsidianNote = useCallback((note: CptsNoteEntry) => {
    setOpenObsidianNotes((prev) => {
      const exists = prev.some((n) => n.id === note.id);
      if (!exists) {
        return [...prev, note];
      }
      return prev;
    });
    setActiveObsidianNoteId(note.id);
  }, [setOpenObsidianNotes, setActiveObsidianNoteId]);

  const handleSelectObsidianTab = useCallback((noteId: string) => {
    setActiveObsidianNoteId(noteId);
  }, [setActiveObsidianNoteId]);

  const handleCloseObsidianTab = useCallback((noteId: string) => {
    setOpenObsidianNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === noteId);
      if (idx === -1) return prev;
      const nextNotes = prev.filter((n) => n.id !== noteId);
      setActiveObsidianNoteId((currentActive) => {
        if (currentActive === noteId) {
          if (nextNotes.length === 0) return null;
          const nextActive = nextNotes[Math.min(Math.max(0, idx), nextNotes.length - 1)];
          return nextActive ? nextActive.id : null;
        }
        return currentActive;
      });
      return nextNotes;
    });
  }, [setOpenObsidianNotes, setActiveObsidianNoteId]);

  const handleCloseAllObsidianTabs = useCallback(() => {
    setOpenObsidianNotes([]);
    setActiveObsidianNoteId(null);
  }, [setOpenObsidianNotes, setActiveObsidianNoteId]);

  // Search text at the moment a result row was opened, per note id. Clearing the
  // search box later leaves an existing highlight alone.
  const [highlightByNote, setHighlightByNote] = useState<Record<string, string>>({});

  const openFromResults = useCallback((note: CptsNoteEntry, query: string = deferredSearchQuery) => {
    const q = query.trim();
    setHighlightByNote((prev) => {
      if (q) return prev[note.id] === q ? prev : { ...prev, [note.id]: q };
      if (!(note.id in prev)) return prev;
      const rest = { ...prev };
      delete rest[note.id];
      return rest;
    });
    handleOpenObsidianNote(note);
  }, [deferredSearchQuery, handleOpenObsidianNote]);

  // Backward compatibility alias: sets active note or opens as tab
  const setActiveObsidianNote = useCallback((note: CptsNoteEntry | null) => {
    if (note) {
      handleOpenObsidianNote(note);
    } else {
      handleCloseAllObsidianTabs();
    }
  }, [handleOpenObsidianNote, handleCloseAllObsidianTabs]);

  // Persist open tabs and active tab to localStorage for seamless session resume
  useEffect(() => {
    try {
      localStorage.setItem('zerobox_obsidian_open_tabs', JSON.stringify(openObsidianNotes.map((n) => n.id)));
      if (activeObsidianNoteId) {
        localStorage.setItem('zerobox_obsidian_active_tab', activeObsidianNoteId);
      } else {
        localStorage.removeItem('zerobox_obsidian_active_tab');
      }
    } catch { /* best effort */ }
  }, [openObsidianNotes, activeObsidianNoteId]);

  // Synchronize active cheatsheet note to the persistent sidecar Notes workspace (staying closed unless already open)
  useEffect(() => {
    if (activeObsidianNoteId) {
      useNotesWorkspaceStore.getState().openNote(activeObsidianNoteId, { stayClosed: true });
    }
  }, [activeObsidianNoteId]);
  return {
    activeObsidianNote,
    handleOpenObsidianNote,
    handleSelectObsidianTab,
    handleCloseObsidianTab,
    handleCloseAllObsidianTabs,
    highlightByNote,
    openFromResults,
    setActiveObsidianNote,
  };
}

interface UseWorkspaceSplitPanesParams {
  noteIndex: ReturnType<typeof useNoteIndex>;
  allActiveNotes: CptsNoteEntry[];
  deletedNoteIds: string[];
  activeObsidianNote: CptsNoteEntry | null;
  openObsidianNotes: CptsNoteEntry[];
  setOpenObsidianNotes: Dispatch<SetStateAction<CptsNoteEntry[]>>;
  handleCloseObsidianTab: (noteId: string) => void;
  handleOpenObsidianNote: (note: CptsNoteEntry) => void;
}

/** Split-pane state: secondary tabs, active pane, right-panel note, and pane handlers. */
export function useWorkspaceSplitPanes({
  noteIndex,
  allActiveNotes,
  deletedNoteIds,
  activeObsidianNote,
  openObsidianNotes,
  setOpenObsidianNotes,
  handleCloseObsidianTab,
  handleOpenObsidianNote,
}: UseWorkspaceSplitPanesParams) {
  // Multi-Pane Split Workspace State
  const [isSplitView, setIsSplitView] = useState<boolean>(() => {
    try {
      return localStorage.getItem('zerobox_workspace_is_split_v1') === 'true';
    } catch {
      return false;
    }
  });

  const [splitOrientation, setSplitOrientation] = useState<SplitOrientation>(() => {
    try {
      const saved = localStorage.getItem('zerobox_workspace_split_orient_v1');
      return saved === 'vertical' ? 'vertical' : 'horizontal';
    } catch {
      return 'horizontal';
    }
  });

  const [secondaryOpenNotes, setSecondaryOpenNotes] = useState<CptsNoteEntry[]>(() => {
    try {
      const saved = localStorage.getItem('zerobox_workspace_secondary_tabs_v1');
      if (saved) {
        const ids: string[] = JSON.parse(saved);
        const resolved = ids.map((id) => getNoteById(id)).filter(Boolean) as CptsNoteEntry[];
        if (resolved.length > 0) return resolved;
      }
    } catch { /* best effort */ }
    return [];
  });

  const [secondaryActiveNoteId, setSecondaryActiveNoteId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('zerobox_workspace_secondary_active_v1') || null;
    } catch {
      return null;
    }
  });

  const [activePaneId, setActivePaneId] = useState<'pane-primary' | 'pane-secondary'>('pane-primary');

  useEffect(() => {
    try {
      localStorage.setItem('zerobox_workspace_is_split_v1', isSplitView ? 'true' : 'false');
      localStorage.setItem('zerobox_workspace_split_orient_v1', splitOrientation);
      localStorage.setItem('zerobox_workspace_secondary_tabs_v1', JSON.stringify(secondaryOpenNotes.map((n) => n.id)));
      if (secondaryActiveNoteId) {
        localStorage.setItem('zerobox_workspace_secondary_active_v1', secondaryActiveNoteId);
      } else {
        localStorage.removeItem('zerobox_workspace_secondary_active_v1');
      }
    } catch { /* best effort */ }
  }, [isSplitView, splitOrientation, secondaryOpenNotes, secondaryActiveNoteId]);

  const secondaryActiveNote = useMemo(() => {
    if (!secondaryActiveNoteId) return secondaryOpenNotes[0] || null;
    return secondaryOpenNotes.find((n) => n.id === secondaryActiveNoteId) || secondaryOpenNotes[0] || null;
  }, [secondaryOpenNotes, secondaryActiveNoteId]);

  // The right panel and status bar follow the active pane. Tab entries are snapshots taken at open
  // time, so the live copy comes from the shared index.
  const activePanelPaneId: 'pane-primary' | 'pane-secondary' =
    isSplitView && activePaneId === 'pane-secondary' && secondaryActiveNote ? 'pane-secondary' : 'pane-primary';
  const activePanelSnapshot = activePanelPaneId === 'pane-secondary' ? secondaryActiveNote : activeObsidianNote;
  const liveActiveNote = activePanelSnapshot ? (noteIndex.byId.get(activePanelSnapshot.id) ?? activePanelSnapshot) : null;
  const panelBacklinks = useMemo(
    () => (liveActiveNote ? getBacklinksForNote(liveActiveNote.id, noteIndex) : []),
    [liveActiveNote, noteIndex],
  );
  const panelOutline = useMemo(
    () => (liveActiveNote ? getNoteOutline(liveActiveNote.rawMarkdown ?? '', liveActiveNote) : []),
    [liveActiveNote],
  );

  const handleSelectSecondaryTab = useCallback((noteId: string) => {
    setSecondaryActiveNoteId(noteId);
  }, []);

  const handleOpenSecondaryNote = useCallback((note: CptsNoteEntry) => {
    setSecondaryOpenNotes((prev) => {
      if (!prev.some((n) => n.id === note.id)) {
        return [...prev, note];
      }
      return prev;
    });
    setSecondaryActiveNoteId(note.id);
  }, []);

  const handleCloseSecondaryTab = useCallback((noteId: string) => {
    setSecondaryOpenNotes((prev) => {
      const idx = prev.findIndex((n) => n.id === noteId);
      if (idx === -1) return prev;
      const nextNotes = prev.filter((n) => n.id !== noteId);
      setSecondaryActiveNoteId((current) => {
        if (current === noteId) {
          if (nextNotes.length === 0) return null;
          const nextActive = nextNotes[Math.min(Math.max(0, idx), nextNotes.length - 1)];
          return nextActive ? nextActive.id : null;
        }
        return current;
      });
      return nextNotes;
    });
  }, []);

  // A deleted note's tab closes, wherever it was deleted (this tab, bulk delete, or another tab via the storage
  // sync). A tab whose editor still holds unsaved edits stays open, with a one-time warning, so they are not lost.
  const warnedDeletedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const dead = new Set(deletedNoteIds);
    for (const id of warnedDeletedRef.current) if (!dead.has(id)) warnedDeletedRef.current.delete(id);
    if (dead.size === 0) return;
    const closeDead = (notes: CptsNoteEntry[], close: (id: string) => void) => {
      for (const n of notes) {
        if (!dead.has(n.id)) continue;
        if (!hasUnsavedNoteEdits(n.id)) {
          close(n.id);
        } else if (!warnedDeletedRef.current.has(n.id)) {
          warnedDeletedRef.current.add(n.id);
          useToastStore.getState().addToast({
            type: 'warning',
            title: 'Open note was deleted',
            message: 'Its tab stays open with your unsaved edits; copy them before closing it, they cannot be saved.',
          });
        }
      }
    };
    closeDead(openObsidianNotes, handleCloseObsidianTab);
    closeDead(secondaryOpenNotes, handleCloseSecondaryTab);
  }, [deletedNoteIds, openObsidianNotes, secondaryOpenNotes, handleCloseObsidianTab, handleCloseSecondaryTab]);

  const handleCloseSecondaryPane = useCallback(() => {
    setOpenObsidianNotes((prev) => {
      const merged = [...prev];
      for (const sn of secondaryOpenNotes) {
        if (!merged.some((pn) => pn.id === sn.id)) {
          merged.push(sn);
        }
      }
      return merged;
    });
    setSecondaryOpenNotes([]);
    setSecondaryActiveNoteId(null);
    setIsSplitView(false);
  }, [secondaryOpenNotes, setOpenObsidianNotes]);

  const handleToggleSplit = useCallback((orientation?: SplitOrientation) => {
    setIsSplitView((prev) => {
      if (prev) {
        if (!orientation || orientation === splitOrientation) {
          setOpenObsidianNotes((currentPrimary) => {
            const merged = [...currentPrimary];
            for (const sn of secondaryOpenNotes) {
              if (!merged.some((pn) => pn.id === sn.id)) {
                merged.push(sn);
              }
            }
            return merged;
          });
          setSecondaryOpenNotes([]);
          setSecondaryActiveNoteId(null);
          return false;
        }
        setSplitOrientation(orientation);
        return true;
      }

      const nextOrient = orientation || 'horizontal';
      setSplitOrientation(nextOrient);

      if (secondaryOpenNotes.length === 0) {
        if (openObsidianNotes.length > 1) {
          const tabToMove = openObsidianNotes[openObsidianNotes.length - 1];
          setSecondaryOpenNotes([tabToMove]);
          setSecondaryActiveNoteId(tabToMove.id);
          setOpenObsidianNotes((p) => p.filter((t) => t.id !== tabToMove.id));
        } else {
          const alt = allActiveNotes.find((n) => n.id !== activeObsidianNote?.id) || allActiveNotes[0];
          if (alt) {
            setSecondaryOpenNotes([alt]);
            setSecondaryActiveNoteId(alt.id);
          }
        }
      }
      return true;
    });
  }, [splitOrientation, secondaryOpenNotes, openObsidianNotes, allActiveNotes, activeObsidianNote?.id, setOpenObsidianNotes]);

  const handleMoveTabBetweenPanes = useCallback((tabId: string, fromPane: 'pane-primary' | 'pane-secondary') => {
    if (fromPane === 'pane-primary') {
      const noteToMove = openObsidianNotes.find((n) => n.id === tabId);
      if (!noteToMove || openObsidianNotes.length <= 1) return;
      handleCloseObsidianTab(tabId);
      handleOpenSecondaryNote(noteToMove);
      setActivePaneId('pane-secondary');
    } else {
      const noteToMove = secondaryOpenNotes.find((n) => n.id === tabId);
      if (!noteToMove || secondaryOpenNotes.length <= 1) return;
      handleCloseSecondaryTab(tabId);
      handleOpenObsidianNote(noteToMove);
      setActivePaneId('pane-primary');
    }
  }, [openObsidianNotes, secondaryOpenNotes, handleCloseObsidianTab, handleOpenSecondaryNote, handleCloseSecondaryTab, handleOpenObsidianNote]);
  return {
    isSplitView,
    splitOrientation,
    secondaryOpenNotes,
    secondaryActiveNote,
    activePaneId,
    setActivePaneId,
    activePanelPaneId,
    liveActiveNote,
    panelBacklinks,
    panelOutline,
    handleSelectSecondaryTab,
    handleOpenSecondaryNote,
    handleCloseSecondaryTab,
    handleCloseSecondaryPane,
    handleToggleSplit,
    handleMoveTabBetweenPanes,
  };
}

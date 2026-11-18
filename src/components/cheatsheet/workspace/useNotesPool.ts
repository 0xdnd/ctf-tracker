import { useMemo, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  CptsNoteEntry,
  CptsTreeNode,
  buildCptsFileTree,
  mergeUserNotePools,
} from '../../../utils/obsidianManualUtils';
import type { NotesRibbonPanel } from '../../notes/NotesRibbon';
import type { ObsidianNavView } from './types';
import type { useNoteIndex } from '../../../hooks/useNoteIndex';

interface UseActiveNotesPoolParams {
  deletedNoteIds: string[];
  customNotes: CptsNoteEntry[];
  userNotes: CptsNoteEntry[];
}

/** The user's own notes (authored + imported) minus tombstoned ones, and how many deleted notes can be restored. */
export function useActiveNotesPool({ deletedNoteIds, customNotes, userNotes }: UseActiveNotesPoolParams) {
  // Active Notes Pool: only the user's own notes (authored + imported), minus deleted ones
  const allActiveNotes = useMemo(() => {
    const deletedSet = new Set(deletedNoteIds);
    return mergeUserNotePools(customNotes, userNotes).filter((n) => !deletedSet.has(n.id));
  }, [deletedNoteIds, customNotes, userNotes]);
  // Restore only clears tombstones, so it can bring back only deleted notes this tab still holds.
  const restorableCount = useMemo(() => {
    if (deletedNoteIds.length === 0) return 0;
    const held = new Set([...customNotes, ...userNotes].map((n) => n.id));
    return deletedNoteIds.filter((id) => held.has(id)).length;
  }, [deletedNoteIds, customNotes, userNotes]);
  return { allActiveNotes, restorableCount };
}

interface UseNotesTreeParams {
  allActiveNotes: CptsNoteEntry[];
  activeTag: string | null;
  noteIndex: ReturnType<typeof useNoteIndex>;
  deferredTreeQuery: string;
  expandedTreeFolders: Record<string, boolean>;
  setActiveTag: Dispatch<SetStateAction<string | null>>;
  setObsidianNavView: Dispatch<SetStateAction<ObsidianNavView>>;
  setLeftView: Dispatch<SetStateAction<NotesRibbonPanel>>;
}

/** Tag filter, tree search, file tree, expanded-folder persistence, and the folder list for the new-note modal. */
export function useNotesTree({
  allActiveNotes,
  activeTag,
  noteIndex,
  deferredTreeQuery,
  expandedTreeFolders,
  setActiveTag,
  setObsidianNavView,
  setLeftView,
}: UseNotesTreeParams): {
  searchResults: CptsNoteEntry[];
  handleSelectTag: (tag: string | null) => void;
  cptsFileTree: CptsTreeNode[];
  existingDirectories: string[];
} {
  // Hierarchical Directory Tree & Categories computed from active notes
  const tagFilteredNotes = useMemo(() => {
    if (!activeTag) return allActiveNotes;
    // A tag matches its own notes plus those of any nested child (a includes a/b).
    const ids = new Set<string>();
    for (const [key, noteIds] of noteIndex.tags) {
      if (key === activeTag || key.startsWith(`${activeTag}/`)) noteIds.forEach((id) => ids.add(id));
    }
    return allActiveNotes.filter((n) => ids.has(n.id));
  }, [allActiveNotes, activeTag, noteIndex]);

  // The Search panel looks at every note, ignoring the tag filter.
  const searchResults = useMemo(() => {
    if (!deferredTreeQuery.trim()) return [];
    const q = deferredTreeQuery.toLowerCase().trim();
    // Body text is only searched from 2 characters up; titles and tags match from 1.
    const searchBody = q.length >= 2;
    return allActiveNotes.filter((n) => {
      return (
        n.title.toLowerCase().includes(q) ||
        (n.titleEn && n.titleEn.toLowerCase().includes(q)) ||
        (n.titleHe && n.titleHe.toLowerCase().includes(q)) ||
        n.category.toLowerCase().includes(q) ||
        (n.subCategory && n.subCategory.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some((t) => t.toLowerCase().includes(q))) ||
        (searchBody && n.rawMarkdown && n.rawMarkdown.toLowerCase().includes(q))
      );
    });
  }, [allActiveNotes, deferredTreeQuery]);

  const handleSelectTag = useCallback((tag: string | null) => {
    setActiveTag(tag);
    if (tag) {
      setObsidianNavView('files');
      setLeftView('files');
    }
  }, [setActiveTag, setObsidianNavView, setLeftView]);

  const cptsFileTree = useMemo(() => buildCptsFileTree(tagFilteredNotes), [tagFilteredNotes]);

  // Persist expanded tree folders
  useEffect(() => {
    try {
      localStorage.setItem('zerobox_obsidian_expanded_folders', JSON.stringify(expandedTreeFolders));
    } catch { /* best effort */ }
  }, [expandedTreeFolders]);

  // List of all existing folder paths for new note modal
  const existingDirectories = useMemo(() => {
    const set = new Set<string>();
    for (const n of allActiveNotes) {
      if (n.relPath && n.relPath.includes('/')) {
        const parts = n.relPath.split('/');
        set.add(parts.slice(0, -1).join('/'));
      }
    }
    return Array.from(set).sort();
  }, [allActiveNotes]);
  return { searchResults, handleSelectTag, cptsFileTree, existingDirectories };
}

import { useMemo } from 'react';
import { useCtfStore } from '../store/useCtfStore';
import { mergeUserNotePools } from '../utils/obsidianManualUtils';

export interface SnippetTotals {
  /** Command snippets on the Snippets tab. */
  snippets: number;
  /** Notes on the Field manual tab: authored + imported, minus deleted. */
  notes: number;
  /** Everything the Snippets page lists. */
  total: number;
}

/** One count for the sidebar badge, its title and the Snippets page, so they never disagree. */
export function useSnippetTotals(): SnippetTotals {
  const cheatsheets = useCtfStore((s) => s.cheatsheets);
  const customNotes = useCtfStore((s) => s.customNotes);
  const userNotes = useCtfStore((s) => s.userNotes);
  const deletedNoteIds = useCtfStore((s) => s.deletedNoteIds);

  return useMemo(() => {
    const deleted = new Set(deletedNoteIds ?? []);
    const notes = mergeUserNotePools(customNotes, userNotes).filter((n) => !deleted.has(n.id)).length;
    const snippets = (cheatsheets ?? []).length;
    return { snippets, notes, total: snippets + notes };
  }, [cheatsheets, customNotes, userNotes, deletedNoteIds]);
}

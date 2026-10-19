import { useMemo } from 'react';
import { useNotesWorkspaceStore, isCheatTabId, CHEAT_TAB_PREFIX } from '../store/useNotesWorkspaceStore';
import { useCtfStore } from '../store/useCtfStore';
import { INITIAL_CHEATSHEET } from '../data/cheatsheetsData';

const STATIC_CHEAT_IDS = new Set(INITIAL_CHEATSHEET.map((c) => c.id));

/** Number of dock tabs that resolve to a note or snippet (stale ids are not counted). */
export function useOpenTabCount(): number {
  const openTabIds = useNotesWorkspaceStore((s) => s.openTabIds);
  const customNotes = useCtfStore((s) => s.customNotes);
  const userNotes = useCtfStore((s) => s.userNotes);
  const cheatsheets = useCtfStore((s) => s.cheatsheets);

  return useMemo(() => {
    const noteIds = new Set<string>();
    for (const n of customNotes ?? []) noteIds.add(n.id);
    for (const n of userNotes ?? []) noteIds.add(n.id);
    const cheatIds = new Set<string>(STATIC_CHEAT_IDS);
    for (const c of cheatsheets ?? []) cheatIds.add(c.id);
    let count = 0;
    for (const id of openTabIds) {
      if (isCheatTabId(id) ? cheatIds.has(id.slice(CHEAT_TAB_PREFIX.length)) : noteIds.has(id)) count++;
    }
    return count;
  }, [openTabIds, customNotes, userNotes, cheatsheets]);
}

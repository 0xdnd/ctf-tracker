/**
 * Open editors report here whether their note has edits that are not saved yet, so the field manual can tell
 * whether closing a note's tab (e.g. after it was deleted in another tab) would throw those edits away.
 */
const probes = new Map<string, Set<() => boolean>>();

/** Registers a dirty check for a note; returns the unregister function. */
export function registerUnsavedNoteEdits(noteId: string, isDirty: () => boolean): () => void {
  let set = probes.get(noteId);
  if (!set) probes.set(noteId, (set = new Set()));
  set.add(isDirty);
  return () => {
    set!.delete(isDirty);
    if (set!.size === 0 && probes.get(noteId) === set) probes.delete(noteId);
  };
}

/** True when any open editor holds unsaved edits to this note. */
export function hasUnsavedNoteEdits(noteId: string): boolean {
  const set = probes.get(noteId);
  if (!set) return false;
  for (const isDirty of set) if (isDirty()) return true;
  return false;
}

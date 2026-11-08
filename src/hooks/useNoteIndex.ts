import { useMemo, useSyncExternalStore } from 'react';
import { useCtfStore } from '../store/useCtfStore';
import { mergeUserNotePools, type CptsNoteEntry } from '../utils/obsidianManualUtils';
import { buildNoteIndex, type NoteIndex } from '../utils/noteIndex';

const REBUILD_DEBOUNCE_MS = 300;

function liveNotes(
  customNotes: readonly CptsNoteEntry[] | undefined,
  userNotes: readonly CptsNoteEntry[] | undefined,
  deletedNoteIds: readonly string[] | undefined,
): CptsNoteEntry[] {
  const deleted = new Set(deletedNoteIds ?? []);
  return mergeUserNotePools(customNotes, userNotes).filter((n) => !deleted.has(n.id));
}

/** Merged note pool (authored + imported) minus deleted notes, live from the store. */
export function useLiveNotes(): CptsNoteEntry[] {
  const customNotes = useCtfStore((s) => s.customNotes);
  const userNotes = useCtfStore((s) => s.userNotes);
  const deletedNoteIds = useCtfStore((s) => s.deletedNoteIds);
  return useMemo(
    () => liveNotes(customNotes, userNotes, deletedNoteIds),
    [customNotes, userNotes, deletedNoteIds],
  );
}

// One index shared by every consumer. Keyed on the identity of the three store inputs.
interface Built {
  custom: unknown;
  user: unknown;
  deleted: unknown;
  index: NoteIndex;
}
let built: Built | null = null;
const listeners = new Set<() => void>();
let unsubscribeStore: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function inputsChanged(): boolean {
  const s = useCtfStore.getState();
  return !built || built.custom !== s.customNotes || built.user !== s.userNotes || built.deleted !== s.deletedNoteIds;
}

function rebuild(): void {
  const s = useCtfStore.getState();
  built = {
    custom: s.customNotes,
    user: s.userNotes,
    deleted: s.deletedNoteIds,
    index: buildNoteIndex(liveNotes(s.customNotes, s.userNotes, s.deletedNoteIds)),
  };
}

function onStoreChange(): void {
  if (!inputsChanged()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    if (!inputsChanged()) return;
    rebuild();
    listeners.forEach((l) => l());
  }, REBUILD_DEBOUNCE_MS);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!unsubscribeStore) unsubscribeStore = useCtfStore.subscribe(onStoreChange);
  // Catch a store change that landed between render and subscribe.
  onStoreChange();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      unsubscribeStore?.();
      unsubscribeStore = null;
      if (timer) clearTimeout(timer);
      timer = null;
    }
  };
}

function getSnapshot(): NoteIndex {
  // First build, or nobody is subscribed to keep it fresh: build synchronously.
  // With subscribers, a stale index is kept until the debounced rebuild lands.
  if (!built || (listeners.size === 0 && inputsChanged())) rebuild();
  return built!.index;
}

/**
 * Link/backlink/tag index over the live notes, shared by all consumers. The first
 * build is synchronous; later pool changes rebuild once, after 300 ms of quiet.
 */
export function useNoteIndex(): NoteIndex {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Test-only: drop the shared cache and any pending rebuild. */
export function resetNoteIndexCacheForTests(): void {
  built = null;
  if (timer) clearTimeout(timer);
  timer = null;
}

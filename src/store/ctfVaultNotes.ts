import type { CptsNoteEntry } from '../utils/obsidianManualUtils';
import { mutateVault, type VaultMutationBase, type VaultMutationResult } from '../utils/indexedDbVault';
import { isSchemaWriteGated } from '../utils/schemaWriteGate';
import { syncChannel } from '../utils/crossTabChannel';

/** Workspace store: cross-tab broadcast and vault note write helpers. */

export const broadcastCrossTabMessage = (
  type: 'STATE_UPDATED' | 'WRITEUPS_UPDATED' | 'MACHINE_DELETED' | 'MACHINE_ADDED' | 'NOTES_UPDATED',
  payload?: unknown
) => {
  // A gated (outdated/restoring) tab must not push its edits into other tabs, which would persist them.
  if (isSchemaWriteGated()) return;
  try {
    syncChannel?.postMessage({ type, payload, timestamp: Date.now() });
  } catch { /* channel closed or unavailable; cross-tab broadcast is best-effort */ }
};

/**
 * Imported notes (the IndexedDB vault) are one global record shared by every profile and every tab. After any
 * successful vault write, tell the other tabs to reload it. Receivers never re-broadcast.
 */
export const broadcastVaultNotesUpdated = (noteIds?: string[]) =>
  broadcastCrossTabMessage('NOTES_UPDATED', noteIds ? { source: 'vault', noteIds } : { source: 'vault' });

/**
 * The stored vault, as this tab should show it: the stored notes, except that a note this tab holds with a strictly
 * newer dateModified is kept (its own save is still in flight), so an overlapping earlier write never briefly
 * reverts the open note. Notes missing from the stored vault were deleted elsewhere and are dropped.
 */
export function adoptStoredVaultNotes(local: CptsNoteEntry[], stored: CptsNoteEntry[]): CptsNoteEntry[] {
  const localById = new Map((local || []).map((n) => [n.id, n] as const));
  return stored.map((n) => {
    const mine = localById.get(n.id);
    return mine && vaultNoteMs(mine.dateModified) > vaultNoteMs(n.dateModified) ? mine : n;
  });
}

const vaultNoteMs = (iso: unknown): number => {
  const t = typeof iso === 'string' ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? t : 0;
};

/**
 * Applies `edit` (one change, by note id) onto the CURRENT stored vault inside one IndexedDB transaction, so
 * another tab's edits are never overwritten. When no vault record exists yet, `fallback` (this tab's notes with
 * the change) is written instead. Resolves with what was written, or null while writes are gated.
 */
export const mutateVaultNotes = (
  edit: (current: VaultMutationBase) => VaultMutationResult,
  fallback: () => VaultMutationResult
) => mutateVault((current) => (current.exists ? edit(current) : fallback()));

export const NOTE_GONE_MESSAGE = 'This note was deleted, so the edit was not saved.';

/**
 * The IndexedDB behind the note-templating undo history. Kept apart from noteIpTemplating (which is only needed
 * once the notes modals open) so profile deletion can clear a profile's history without loading that code.
 */
import { deleteKeyAndClose, openStoreDb } from './idbUtils';

const DB_NAME = 'zerobox_note_templating_db';
const DB_VERSION = 1;
export const UNDO_STORE_NAME = 'undo_batches';
export const UNDO_BATCHES_KEY = 'batches';

export const openUndoDatabase = () => openStoreDb(DB_NAME, DB_VERSION, UNDO_STORE_NAME);

/** Drops one profile's whole undo history (profile deletion). Never touches another profile's key. */
export async function clearUndoBatchesForProfile(profileId: string): Promise<void> {
  await deleteKeyAndClose(await openUndoDatabase(), UNDO_STORE_NAME, `${UNDO_BATCHES_KEY}:${profileId || 'guest'}`);
}

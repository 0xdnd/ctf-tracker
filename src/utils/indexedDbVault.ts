import type { CptsNoteEntry } from './obsidianManualUtils';
import { isSchemaWriteGated } from './schemaWriteGate';

export interface VaultPayload {
  notes: CptsNoteEntry[];
  wikilinkMap: Record<string, string>;
  importedAt: string;
}

const DB_NAME = 'zerobox_vault_db';
const DB_VERSION = 1;
const STORE_NAME = 'cpts_notes';
const VAULT_KEY = 'vault_data';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Save the user's imported notes into local browser IndexedDB. Resolves only once the transaction has committed;
 * rejects when it errors or aborts (e.g. QuotaExceededError), so callers never report an unsaved edit as saved.
 */
export async function saveVaultToIndexedDb(data: {
  notes: CptsNoteEntry[];
  wikilinkMap?: Record<string, string>;
}): Promise<void> {
  if (isSchemaWriteGated()) return;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (err?: unknown) => {
      if (settled) return;
      settled = true;
      try { db.close(); } catch { /* already closed */ }
      if (err) reject(err);
      else resolve();
    };
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const payload: VaultPayload = {
        notes: data.notes || [],
        wikilinkMap: data.wikilinkMap || {},
        importedAt: new Date().toISOString(),
      };
      tx.oncomplete = () => done();
      tx.onerror = () => done(tx.error || new Error('Failed to save vault to IndexedDB'));
      tx.onabort = () => done(tx.error || new Error('Saving the vault to IndexedDB was aborted'));
      tx.objectStore(STORE_NAME).put(payload, VAULT_KEY);
    } catch (err) {
      done(err || new Error('Failed to save vault to IndexedDB'));
    }
  });
}

/**
 * Load the user's imported notes from local browser IndexedDB
 */
export async function loadVaultFromIndexedDb(): Promise<VaultPayload | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(VAULT_KEY);

        req.onsuccess = () => {
          const result = req.result as VaultPayload | undefined;
          resolve(result || null);
        };
        req.onerror = () => reject(req.error || new Error('Failed to load vault from IndexedDB'));
        tx.oncomplete = () => db.close();
      } catch (err) {
        db.close();
        reject(err);
      }
    });
  } catch (err) {
    console.warn('[ZeroBox Vault] Could not access IndexedDB:', err);
    return null;
  }
}

/** What a vault mutation starts from: the stored notes, and whether a vault record exists at all. */
export interface VaultMutationBase {
  notes: CptsNoteEntry[];
  wikilinkMap: Record<string, string>;
  /** False when nothing has been stored yet (fresh install, or the vault was cleared). */
  exists: boolean;
}

export interface VaultMutationResult {
  notes: CptsNoteEntry[];
  wikilinkMap: Record<string, string>;
}

/**
 * Read, apply and write in ONE readwrite transaction. IndexedDB runs readwrite transactions on the same store one
 * at a time, across tabs too, so `fn` always sees the latest stored vault and never overwrites a change another
 * tab committed in between (unlike saveVaultToIndexedDb, which writes the caller's whole in-memory array).
 * `fn` must be synchronous: awaiting inside it would let the transaction commit early. Resolves with what was
 * written, or null when the schema write gate is engaged (nothing is written, like saveVaultToIndexedDb). Rejects
 * when the read, `fn` or the write fails; the vault is then left as it was.
 */
export async function mutateVault(
  fn: (current: VaultMutationBase) => VaultMutationResult
): Promise<VaultMutationResult | null> {
  if (isSchemaWriteGated()) return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let settled = false;
    let result: VaultMutationResult | null = null;
    const done = (err?: unknown, value: VaultMutationResult | null = null) => {
      if (settled) return;
      settled = true;
      try { db.close(); } catch { /* already closed */ }
      if (err) reject(err);
      else resolve(value);
    };
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      let gatedAbort = false;
      let fnError: unknown = null;
      tx.oncomplete = () => done(undefined, result);
      tx.onerror = () => done(fnError || tx.error || new Error('Failed to update the vault in IndexedDB'));
      tx.onabort = () => {
        if (gatedAbort) done(undefined, null);
        else done(fnError || tx.error || new Error('Updating the vault in IndexedDB was aborted'));
      };
      const req = store.get(VAULT_KEY);
      req.onsuccess = () => {
        // Engaged while the read was in flight (e.g. another tab started a restore): write nothing.
        if (isSchemaWriteGated()) {
          gatedAbort = true;
          tx.abort();
          return;
        }
        const raw = req.result as VaultPayload | undefined;
        try {
          const next = fn({
            notes: Array.isArray(raw?.notes) ? raw.notes : [],
            wikilinkMap: raw?.wikilinkMap && typeof raw.wikilinkMap === 'object' ? raw.wikilinkMap : {},
            exists: Boolean(raw),
          });
          result = { notes: next.notes || [], wikilinkMap: next.wikilinkMap || {} };
          const payload: VaultPayload = { ...result, importedAt: new Date().toISOString() };
          store.put(payload, VAULT_KEY);
        } catch (err) {
          fnError = err || new Error('The vault update failed');
          tx.abort();
        }
      };
    } catch (err) {
      done(err || new Error('Failed to update the vault in IndexedDB'));
    }
  });
}

/** Reads the vault (null when there is none); a read error rejects, so callers never mistake it for "empty". */
export async function loadVaultStrict(): Promise<VaultPayload | null> {
  return readVaultStrict();
}

/** Reads the vault record; unlike loadVaultFromIndexedDb a read error rejects (only "no IndexedDB" reads as empty). */
async function readVaultStrict(): Promise<VaultPayload | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(VAULT_KEY);
      req.onsuccess = () => resolve((req.result as VaultPayload | undefined) || null);
      req.onerror = () => reject(req.error || new Error('Failed to read the vault from IndexedDB'));
      tx.oncomplete = () => db.close();
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

const BACKUP_GATED_MESSAGE =
  'Writes are blocked in this tab (another tab is restoring or merging, or ZeroBox was updated). Reload and try again.';

const isNoteLike = (n: unknown): n is CptsNoteEntry =>
  Boolean(n) && typeof n === 'object' && typeof (n as { id?: unknown }).id === 'string';

/** Backup v3 dump: every note in zerobox_vault_db plus its wikilink map. Rejects on a read error. */
export async function dumpVaultForBackup(): Promise<{ notes: CptsNoteEntry[]; wikilinkMap: Record<string, string> }> {
  const vault = await readVaultStrict();
  return {
    notes: Array.isArray(vault?.notes) ? vault.notes.filter(isNoteLike) : [],
    wikilinkMap: vault?.wikilinkMap && typeof vault.wikilinkMap === 'object' ? vault.wikilinkMap : {},
  };
}

/**
 * Backup v3 restore: upserts notes by id (the backup copy wins) and merges the wikilink map. Notes only in the
 * vault are kept. No-op while the schema write gate is engaged. Resolves with the number of notes upserted;
 * rejects when the current vault cannot be read (so it is never overwritten blind) or the write fails.
 */
export async function upsertVaultNotesFromBackup(
  notes: unknown[],
  wikilinkMap?: Record<string, string>
): Promise<number> {
  if (isSchemaWriteGated()) throw new Error(BACKUP_GATED_MESSAGE);
  const incoming = notes.filter(isNoteLike);
  const incomingMap = wikilinkMap && typeof wikilinkMap === 'object' ? wikilinkMap : {};
  if (incoming.length === 0 && Object.keys(incomingMap).length === 0) return 0;
  const current = await readVaultStrict();
  if (isSchemaWriteGated()) throw new Error(BACKUP_GATED_MESSAGE);
  const byId = new Map<string, CptsNoteEntry>();
  for (const n of Array.isArray(current?.notes) ? current.notes.filter(isNoteLike) : []) byId.set(n.id, n);
  for (const n of incoming) byId.set(n.id, n);
  await saveVaultToIndexedDb({
    notes: Array.from(byId.values()),
    wikilinkMap: { ...(current?.wikilinkMap || {}), ...incomingMap },
  });
  return incoming.length;
}

const SNAPSHOTS_KEY = 'import_snapshots';
export const MAX_IMPORT_SNAPSHOTS = 3;

export interface VaultImportSnapshot {
  notes: CptsNoteEntry[];
  wikilinkMap: Record<string, string>;
  takenAt: string;
}

async function readRecordStrict<T>(key: string): Promise<T | null> {
  if (typeof indexedDB === 'undefined') return null;
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) || null);
      req.onerror = () => reject(req.error || new Error('Failed to read from IndexedDB'));
      tx.oncomplete = () => db.close();
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

async function writeRecordStrict(key: string, value: unknown): Promise<void> {
  if (isSchemaWriteGated()) throw new Error(BACKUP_GATED_MESSAGE);
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (err?: unknown) => {
      if (settled) return;
      settled = true;
      try { db.close(); } catch { /* already closed */ }
      if (err) reject(err);
      else resolve();
    };
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => done();
      tx.onerror = () => done(tx.error || new Error('Failed to write to IndexedDB'));
      tx.onabort = () => done(tx.error || new Error('Writing to IndexedDB was aborted'));
      tx.objectStore(STORE_NAME).put(value, key);
    } catch (err) {
      done(err || new Error('Failed to write to IndexedDB'));
    }
  });
}

/** Like saveVaultToIndexedDb, but throws (instead of silently doing nothing) while the schema write gate is engaged. */
export async function saveVaultStrict(data: {
  notes: CptsNoteEntry[];
  wikilinkMap?: Record<string, string>;
}): Promise<void> {
  const payload: VaultPayload = {
    notes: data.notes || [],
    wikilinkMap: data.wikilinkMap || {},
    importedAt: new Date().toISOString(),
  };
  await writeRecordStrict(VAULT_KEY, payload);
}

async function readSnapshots(): Promise<VaultImportSnapshot[]> {
  const list = await readRecordStrict<VaultImportSnapshot[]>(SNAPSHOTS_KEY);
  return Array.isArray(list) ? list.filter((s) => s && Array.isArray(s.notes)) : [];
}

/**
 * Before an import replaces the vault: if the stored vault has any notes, keep a copy (newest first, at most
 * MAX_IMPORT_SNAPSHOTS). Resolves true when a snapshot was written, false when the vault was empty. Rejects when
 * the vault cannot be read or the snapshot cannot be written, so callers never overwrite without one.
 */
export async function snapshotVaultBeforeImport(): Promise<boolean> {
  if (isSchemaWriteGated()) throw new Error(BACKUP_GATED_MESSAGE);
  const current = await readVaultStrict();
  const notes = Array.isArray(current?.notes) ? current.notes : [];
  if (notes.length === 0) return false;
  const existing = await readSnapshots();
  const snapshot: VaultImportSnapshot = {
    notes,
    wikilinkMap: current?.wikilinkMap && typeof current.wikilinkMap === 'object' ? current.wikilinkMap : {},
    takenAt: new Date().toISOString(),
  };
  await writeRecordStrict(SNAPSHOTS_KEY, [snapshot, ...existing].slice(0, MAX_IMPORT_SNAPSHOTS));
  return true;
}

/** Newest import snapshot, or null when there is none (or IndexedDB is unavailable). */
export async function loadLastImportSnapshot(): Promise<VaultImportSnapshot | null> {
  try {
    return (await readSnapshots())[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Applies the newest import snapshot and returns it (null when there is none). The current vault is snapshotted
 * first (when it has notes) so the restore can be undone, and the applied snapshot is then consumed rather than
 * left in the list, so repeated restores step back and forth between two states without piling up duplicates.
 * Rejects without touching the vault when the safety snapshot cannot be written.
 */
export async function restoreLastImportSnapshot(): Promise<VaultImportSnapshot | null> {
  if (isSchemaWriteGated()) throw new Error(BACKUP_GATED_MESSAGE);
  const [target, ...rest] = await readSnapshots();
  if (!target) return null;
  const hadNotes = await snapshotVaultBeforeImport(); // list is now [current, target, ...rest]
  // Strict save first: the list below is only rewritten (dropping `target`) once the vault really holds it.
  await saveVaultStrict({ notes: target.notes, wikilinkMap: target.wikilinkMap });
  const after = await readSnapshots();
  const remaining = hadNotes ? [after[0], ...rest] : rest;
  await writeRecordStrict(SNAPSHOTS_KEY, remaining.slice(0, MAX_IMPORT_SNAPSHOTS));
  return target;
}

/**
 * Completely wipe the user's imported notes from browser IndexedDB
 */
export async function clearVaultFromIndexedDb(): Promise<void> {
  if (isSchemaWriteGated()) return;
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(VAULT_KEY);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error('Failed to clear vault from IndexedDB'));
        tx.oncomplete = () => db.close();
      } catch (err) {
        db.close();
        reject(err);
      }
    });
  } catch (err) {
    console.warn('[ZeroBox Vault] Could not clear IndexedDB:', err);
  }
}

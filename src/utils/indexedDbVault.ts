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
      try { db.close(); } catch {}
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
  if (isSchemaWriteGated()) return 0;
  const incoming = notes.filter(isNoteLike);
  const incomingMap = wikilinkMap && typeof wikilinkMap === 'object' ? wikilinkMap : {};
  if (incoming.length === 0 && Object.keys(incomingMap).length === 0) return 0;
  const current = await readVaultStrict();
  const byId = new Map<string, CptsNoteEntry>();
  for (const n of Array.isArray(current?.notes) ? current.notes.filter(isNoteLike) : []) byId.set(n.id, n);
  for (const n of incoming) byId.set(n.id, n);
  await saveVaultToIndexedDb({
    notes: Array.from(byId.values()),
    wikilinkMap: { ...(current?.wikilinkMap || {}), ...incomingMap },
  });
  return incoming.length;
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

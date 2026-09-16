import type { CptsNoteEntry } from './obsidianManualUtils';

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
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Save user's private CPTS field manual notes into local browser IndexedDB
 */
export async function saveVaultToIndexedDb(data: {
  notes: CptsNoteEntry[];
  wikilinkMap?: Record<string, string>;
}): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const payload: VaultPayload = {
        notes: data.notes || [],
        wikilinkMap: data.wikilinkMap || {},
        importedAt: new Date().toISOString(),
      };
      const req = store.put(payload, VAULT_KEY);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error || new Error('Failed to save vault to IndexedDB'));
      tx.oncomplete = () => db.close();
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

/**
 * Load user's private CPTS field manual notes from local browser IndexedDB
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

/**
 * Completely wipe local user CPTS vault notes from browser IndexedDB
 */
export async function clearVaultFromIndexedDb(): Promise<void> {
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

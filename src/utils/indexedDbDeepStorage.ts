import { Machine } from '../types';

export interface DeepWriteupEntry {
  writeupMarkdown?: string;
  quickNotes?: string;
}

export interface DeepProfilePayload {
  writeups: Record<string, DeepWriteupEntry>;
  customNotes?: any[];
  updatedAt: string;
}

const DB_NAME = 'zerobox_deep_storage_db';
const DB_VERSION = 1;
const STORE_NAME = 'deep_profiles';

function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

/**
 * Opens or upgrades the ZeroBox Deep Storage IndexedDB database.
 */
function openDeepDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (!isIndexedDbSupported()) {
      resolve(null);
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
    request.onerror = () => {
      console.warn('[ZeroBox Deep Storage] Failed to open Deep Storage IndexedDB', request.error);
      resolve(null);
    };
  });
}

/**
 * Extracts heavy text payloads (writeups & quickNotes) from machine list.
 */
export function extractDeepWriteups(machines: Machine[]): Record<string, DeepWriteupEntry> {
  const map: Record<string, DeepWriteupEntry> = {};
  machines.forEach((m) => {
    if (m.writeupMarkdown || m.quickNotes) {
      map[m.id] = {
        writeupMarkdown: m.writeupMarkdown,
        quickNotes: m.quickNotes,
      };
    }
  });
  return map;
}

/**
 * Strips heavy writeup and note bodies from machines to produce ultra-lean payloads for localStorage.
 */
export function stripDeepFieldsFromMachines(machines: Machine[]): Machine[] {
  return machines.map((m) => {
    if (!m.writeupMarkdown && !m.quickNotes) {
      return m;
    }
    const copy = { ...m };
    delete copy.writeupMarkdown;
    delete copy.quickNotes;
    return copy;
  });
}

/**
 * Merges deep writeup payloads loaded from IndexedDB back into in-memory machine records.
 * Non-destructive: preserves existing in-memory changes if they are already present.
 */
export function mergeDeepPayloadsIntoMachines(
  machines: Machine[],
  deepWriteups: Record<string, DeepWriteupEntry>
): Machine[] {
  if (!deepWriteups || Object.keys(deepWriteups).length === 0) {
    return machines;
  }

  let hasModifications = false;
  const updated = machines.map((m) => {
    const entry = deepWriteups[m.id];
    if (!entry) return m;

    let needsUpdate = false;
    let newWriteup = m.writeupMarkdown;
    let newQuickNotes = m.quickNotes;

    if (!newWriteup && entry.writeupMarkdown) {
      newWriteup = entry.writeupMarkdown;
      needsUpdate = true;
    }
    if (!newQuickNotes && entry.quickNotes) {
      newQuickNotes = entry.quickNotes;
      needsUpdate = true;
    }

    if (needsUpdate) {
      hasModifications = true;
      return {
        ...m,
        writeupMarkdown: newWriteup,
        quickNotes: newQuickNotes,
      };
    }
    return m;
  });

  return hasModifications ? updated : machines;
}

/**
 * Asynchronously saves deep profile payloads (writeups, custom notes) into IndexedDB.
 */
export async function saveDeepProfileData(
  profileId: string,
  data: {
    writeups: Record<string, DeepWriteupEntry>;
    customNotes?: any[];
  }
): Promise<void> {
  try {
    const db = await openDeepDatabase();
    if (!db) return;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const payload: DeepProfilePayload = {
          writeups: data.writeups || {},
          customNotes: data.customNotes || [],
          updatedAt: new Date().toISOString(),
        };
        const req = store.put(payload, profileId || 'guest');

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error('Failed to put deep profile in IndexedDB'));
        tx.oncomplete = () => db.close();
      } catch (err) {
        db.close();
        reject(err);
      }
    });
  } catch (err) {
    console.warn('[ZeroBox Deep Storage] Could not persist to IndexedDB:', err);
  }
}

/**
 * Asynchronously loads deep profile payloads from IndexedDB.
 */
export async function loadDeepProfileData(profileId: string): Promise<DeepProfilePayload | null> {
  try {
    const db = await openDeepDatabase();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(profileId || 'guest');

        req.onsuccess = () => {
          const result = req.result as DeepProfilePayload | undefined;
          resolve(result || null);
        };
        req.onerror = () => reject(req.error || new Error('Failed to get deep profile from IndexedDB'));
        tx.oncomplete = () => db.close();
      } catch (err) {
        db.close();
        reject(err);
      }
    });
  } catch (err) {
    console.warn('[ZeroBox Deep Storage] Could not read from IndexedDB:', err);
    return null;
  }
}

/**
 * Deletes deep profile data from IndexedDB.
 */
export async function clearDeepProfileData(profileId: string): Promise<void> {
  try {
    const db = await openDeepDatabase();
    if (!db) return;
    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(profileId || 'guest');

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error || new Error('Failed to delete deep profile in IndexedDB'));
        tx.oncomplete = () => db.close();
      } catch (err) {
        db.close();
        reject(err);
      }
    });
  } catch (err) {
    console.warn('[ZeroBox Deep Storage] Could not clear IndexedDB:', err);
  }
}

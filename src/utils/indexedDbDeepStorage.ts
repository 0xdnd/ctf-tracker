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
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onblocked = () => {
        console.warn('[ZeroBox Deep Storage] Database upgrade blocked by another open tab');
        resolve(null);
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          console.warn('[ZeroBox Deep Storage] Database version change detected, closing connection.');
          try { db.close(); } catch {}
        };
        resolve(db);
      };

      request.onerror = () => {
        console.warn('[ZeroBox Deep Storage] Failed to open Deep Storage IndexedDB', request.error);
        resolve(null);
      };
    } catch (err) {
      console.warn('[ZeroBox Deep Storage] Synchronous error opening IndexedDB:', err);
      resolve(null);
    }
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
  let db: IDBDatabase | null = null;
  try {
    const activeDb = await openDeepDatabase();
    if (!activeDb) return;
    db = activeDb;
    await new Promise<void>((resolve) => {
      let isResolved = false;
      const safeDone = () => {
        if (!isResolved) {
          isResolved = true;
          try { activeDb.close(); } catch {}
          resolve();
        }
      };

      try {
        const tx = activeDb.transaction(STORE_NAME, 'readwrite');
        tx.oncomplete = () => safeDone();
        tx.onerror = (e) => {
          console.warn('[ZeroBox Deep Storage] Transaction error in saveDeepProfileData:', tx.error || e);
          safeDone();
        };
        tx.onabort = (e) => {
          console.warn('[ZeroBox Deep Storage] Transaction aborted (e.g. QuotaExceededError):', tx.error || e);
          safeDone();
        };

        const store = tx.objectStore(STORE_NAME);
        const payload: DeepProfilePayload = {
          writeups: data.writeups || {},
          customNotes: data.customNotes || [],
          updatedAt: new Date().toISOString(),
        };
        store.put(payload, profileId || 'guest');
      } catch (err) {
        console.warn('[ZeroBox Deep Storage] Synchronous write error:', err);
        safeDone();
      }
    });
  } catch (err) {
    console.warn('[ZeroBox Deep Storage] Could not persist to IndexedDB:', err);
    try { db?.close(); } catch {}
  }
}

/**
 * Asynchronously loads deep profile payloads from IndexedDB.
 */
export async function loadDeepProfileData(profileId: string): Promise<DeepProfilePayload | null> {
  let db: IDBDatabase | null = null;
  try {
    const activeDb = await openDeepDatabase();
    if (!activeDb) return null;
    db = activeDb;
    return await new Promise<DeepProfilePayload | null>((resolve) => {
      let isResolved = false;
      const safeDone = (res: DeepProfilePayload | null) => {
        if (!isResolved) {
          isResolved = true;
          try { activeDb.close(); } catch {}
          resolve(res);
        }
      };

      try {
        const tx = activeDb.transaction(STORE_NAME, 'readonly');
        tx.onerror = () => safeDone(null);
        tx.onabort = () => safeDone(null);

        const store = tx.objectStore(STORE_NAME);
        const req = store.get(profileId || 'guest');

        req.onsuccess = () => {
          const result = req.result as DeepProfilePayload | undefined;
          safeDone(result || null);
        };
        req.onerror = () => safeDone(null);
      } catch (err) {
        console.warn('[ZeroBox Deep Storage] Synchronous read error:', err);
        safeDone(null);
      }
    });
  } catch (err) {
    console.warn('[ZeroBox Deep Storage] Could not read from IndexedDB:', err);
    try { db?.close(); } catch {}
    return null;
  }
}

/**
 * Deletes deep profile data from IndexedDB.
 */
export async function clearDeepProfileData(profileId: string): Promise<void> {
  let db: IDBDatabase | null = null;
  try {
    const activeDb = await openDeepDatabase();
    if (!activeDb) return;
    db = activeDb;
    await new Promise<void>((resolve) => {
      let isResolved = false;
      const safeDone = () => {
        if (!isResolved) {
          isResolved = true;
          try { activeDb.close(); } catch {}
          resolve();
        }
      };

      try {
        const tx = activeDb.transaction(STORE_NAME, 'readwrite');
        tx.oncomplete = () => safeDone();
        tx.onerror = () => safeDone();
        tx.onabort = () => safeDone();

        const store = tx.objectStore(STORE_NAME);
        store.delete(profileId || 'guest');
      } catch (err) {
        safeDone();
      }
    });
  } catch (err) {
    console.warn('[ZeroBox Deep Storage] Could not clear IndexedDB:', err);
    try { db?.close(); } catch {}
  }
}

/**
 * Deletes a single machine's writeup and notes entry from a deep profile in IndexedDB.
 */
export async function deleteMachineDeepData(profileId: string, machineId: string): Promise<void> {
  let db: IDBDatabase | null = null;
  try {
    const activeDb = await openDeepDatabase();
    if (!activeDb) return;
    db = activeDb;
    await new Promise<void>((resolve) => {
      let isResolved = false;
      const safeDone = () => {
        if (!isResolved) {
          isResolved = true;
          try { activeDb.close(); } catch {}
          resolve();
        }
      };

      try {
        const tx = activeDb.transaction(STORE_NAME, 'readwrite');
        tx.oncomplete = () => safeDone();
        tx.onerror = () => safeDone();
        tx.onabort = () => safeDone();

        const store = tx.objectStore(STORE_NAME);
        const req = store.get(profileId || 'guest');

        req.onsuccess = () => {
          const profile = req.result as DeepProfilePayload | undefined;
          if (profile && profile.writeups && profile.writeups[machineId]) {
            delete profile.writeups[machineId];
            profile.updatedAt = new Date().toISOString();
            store.put(profile, profileId || 'guest');
          } else {
            safeDone();
          }
        };
        req.onerror = () => safeDone();
      } catch (err) {
        safeDone();
      }
    });
  } catch (err) {
    console.warn('[ZeroBox Deep Storage] Could not delete machine deep data:', err);
    try { db?.close(); } catch {}
  }
}

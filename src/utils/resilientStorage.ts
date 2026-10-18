/**
 * resilientStorage.ts
 * Ironclad IndexedDB-first storage engine for ZeroBox / CTF-Tracker.
 * Provides quota resilience (hundreds of MBs vs localStorage 5MB),
 * automated rotating snapshots (last 3), active beforeunload dirty guard,
 * and navigator.storage.persist() verification.
 */

const DB_NAME = 'zerobox_resilient_store_v1';
const DB_VERSION = 1;
const STORE_NAME = 'workspaces';
const SNAPSHOT_STORE = 'snapshots';
const MAX_SNAPSHOTS = 3;

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openResilientDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (!isIndexedDbAvailable()) {
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
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          db.createObjectStore(SNAPSHOT_STORE);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          try { db.close(); } catch {}
        };
        resolve(db);
      };

      request.onerror = () => {
        console.warn('[ZeroBox ResilientStore] Error opening IndexedDB:', request.error);
        resolve(null);
      };

      request.onblocked = () => {
        console.warn('[ZeroBox ResilientStore] IndexedDB blocked by another open tab.');
        resolve(null);
      };
    } catch (err) {
      console.warn('[ZeroBox ResilientStore] Synchronous error opening IndexedDB:', err);
      resolve(null);
    }
  });
}

/**
 * Save workspace state to IndexedDB with automatic rolling snapshot.
 */
export async function saveWorkspaceToIdb(key: string, data: unknown): Promise<boolean> {
  const db = await openResilientDb();
  if (!db) return false;

  return new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction([STORE_NAME, SNAPSHOT_STORE], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const snapStore = tx.objectStore(SNAPSHOT_STORE);

      const serialized = typeof data === 'string' ? data : JSON.stringify(data);
      store.put(serialized, key);

      // Save rolling snapshot with ISO timestamp
      const stamp = new Date().toISOString();
      snapStore.put(serialized, stamp);

      // Prune snapshots beyond MAX_SNAPSHOTS
      const getAllKeysReq = snapStore.getAllKeys();
      getAllKeysReq.onsuccess = () => {
        const keys = (getAllKeysReq.result as string[]).sort();
        if (keys.length > MAX_SNAPSHOTS) {
          const toDelete = keys.slice(0, keys.length - MAX_SNAPSHOTS);
          for (const oldKey of toDelete) {
            snapStore.delete(oldKey);
          }
        }
      };

      tx.oncomplete = () => {
        try { db.close(); } catch {}
        resolve(true);
      };

      tx.onerror = () => {
        console.warn('[ZeroBox ResilientStore] Transaction error:', tx.error);
        try { db.close(); } catch {}
        resolve(false);
      };

      tx.onabort = () => {
        console.warn('[ZeroBox ResilientStore] Transaction aborted (e.g., QuotaExceededError)');
        try { db.close(); } catch {}
        resolve(false);
      };
    } catch (err) {
      console.warn('[ZeroBox ResilientStore] Synchronous write error:', err);
      try { db.close(); } catch {}
      resolve(false);
    }
  });
}

/**
 * Load workspace state from IndexedDB.
 */
export async function loadWorkspaceFromIdb<T = unknown>(key: string): Promise<T | null> {
  const db = await openResilientDb();
  if (!db) return null;

  return new Promise<T | null>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        try { db.close(); } catch {}
        if (!req.result) {
          resolve(null);
          return;
        }
        try {
          const parsed = typeof req.result === 'string' ? JSON.parse(req.result) : req.result;
          resolve(parsed as T);
        } catch {
          resolve(req.result as T);
        }
      };

      req.onerror = () => {
        console.warn('[ZeroBox ResilientStore] Read error:', req.error);
        try { db.close(); } catch {}
        resolve(null);
      };
    } catch (err) {
      console.warn('[ZeroBox ResilientStore] Synchronous read error:', err);
      try { db.close(); } catch {}
      resolve(null);
    }
  });
}

/**
 * Retrieve list of available rolling snapshots timestamps.
 */
export async function listSnapshots(): Promise<string[]> {
  const db = await openResilientDb();
  if (!db) return [];

  return new Promise<string[]>((resolve) => {
    try {
      const tx = db.transaction(SNAPSHOT_STORE, 'readonly');
      const store = tx.objectStore(SNAPSHOT_STORE);
      const req = store.getAllKeys();

      req.onsuccess = () => {
        try { db.close(); } catch {}
        const keys = (req.result as string[]).sort().reverse();
        resolve(keys);
      };

      req.onerror = () => {
        try { db.close(); } catch {}
        resolve([]);
      };
    } catch {
      try { db?.close(); } catch {}
      resolve([]);
    }
  });
}

/**
 * Request durable non-evictable persistent storage mode.
 */
export async function ensurePersistence(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return false;
  }
  try {
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) return true;
    return await navigator.storage.persist();
  } catch (err) {
    console.warn('[ZeroBox ResilientStore] Could not request persistence:', err);
    return false;
  }
}

export interface StorageHealth {
  persisted: boolean;
  usageMB: number;
  quotaMB: number;
  percentUsed: number;
  risk: 'ok' | 'warn' | 'critical';
}

/**
 * Audit storage health: inspects persistence, usage, and quota limits.
 */
export async function getStorageHealth(): Promise<StorageHealth> {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return { persisted: false, usageMB: 0, quotaMB: 0, percentUsed: 0, risk: 'warn' };
  }
  try {
    const persisted = (await navigator.storage.persisted?.()) ?? false;
    const { usage = 0, quota = 0 } = (await navigator.storage.estimate?.()) ?? {};
    const ratio = quota ? usage / quota : 0;
    const usageMB = +(usage / (1024 * 1024)).toFixed(1);
    const quotaMB = +(quota / (1024 * 1024)).toFixed(1);
    const percentUsed = +(ratio * 100).toFixed(1);
    const risk: 'ok' | 'warn' | 'critical' = !persisted ? 'warn' : ratio > 0.8 ? 'critical' : ratio > 0.5 ? 'warn' : 'ok';
    return { persisted, usageMB, quotaMB, percentUsed, risk };
  } catch {
    return { persisted: false, usageMB: 0, quotaMB: 0, percentUsed: 0, risk: 'warn' };
  }
}

/**
 * Binds active beforeunload guard to prevent accidental tab closure with unexported work.
 */
export function bindExportGuard(getDirtyCount: () => number): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (getDirtyCount() > 0) {
      e.preventDefault();
      e.returnValue = 'You have unexported changes in your operational workspace. Make sure to export a backup!';
      return e.returnValue;
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}

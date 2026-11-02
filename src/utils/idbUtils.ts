/** Opens a database holding one keyed object store, creating the store on first use. Rejects when unavailable. */
export function openStoreDb(name: string, version: number, store: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    try {
      const request = indexedDB.open(name, version);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Deletes one record in its own transaction and closes the connection. Resolves true once the delete committed,
 * false on a transaction error or abort (logged, never thrown), so callers can fire it and forget.
 */
export function deleteKeyAndClose(db: IDBDatabase, store: string, key: IDBValidKey): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (ok: boolean, err?: unknown) => {
      if (!ok) console.warn('[ZeroBox] IndexedDB delete failed:', err);
      try { db.close(); } catch { /* already closed */ }
      resolve(ok);
    };
    try {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => done(true);
      tx.onerror = tx.onabort = () => done(false, tx.error);
    } catch (err) {
      done(false, err);
    }
  });
}

/** Remembers a save until it settles, so a delete issued later can wait for it (see deleteKeyAndClose callers). */
export function trackPending<T>(pending: Set<Promise<unknown>>, work: Promise<T>): Promise<T> {
  pending.add(work);
  const forget = () => {
    pending.delete(work);
  };
  work.then(forget, forget);
  return work;
}

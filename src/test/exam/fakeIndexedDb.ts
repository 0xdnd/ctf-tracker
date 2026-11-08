/**
 * Minimal in-memory IndexedDB double (jsdom ships none, and fake-indexeddb is not a dependency).
 * Covers exactly what src/utils/indexedDbDeepStorage.ts uses: open (+ upgrade), one object store,
 * put / get / delete requests, transaction oncomplete / onabort. Values are stored by reference.
 */
import { vi } from 'vitest';

export interface FakeIndexedDb {
  /** Records of the single object store, keyed by the store key. */
  records: Map<string, unknown>;
  /** When true, every readwrite transaction that queued a put/delete aborts (like QuotaExceededError). */
  failWrites: boolean;
  /** Number of put() operations that actually committed. */
  writeCount: number;
  /** When set, transactions wait for this promise before committing (to prove write ordering). */
  gate: Promise<void> | null;
  uninstall: () => void;
}

interface FakeRequest {
  result: unknown;
  error: unknown;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

export interface FakeIndexedDbOptions {
  /**
   * Run requests queued from another request's onsuccess inside the same transaction, as real IndexedDB does
   * (needed for read-then-write transactions). Off by default: every store shares one record map here, so e.g.
   * resilientStorage's snapshot pruning (getAllKeys, then delete) would delete other stores' records.
   */
  drainQueuedRequests?: boolean;
}

export function installFakeIndexedDb(options: FakeIndexedDbOptions = {}): FakeIndexedDb {
  const handle: FakeIndexedDb = {
    records: new Map(),
    failWrites: false,
    writeCount: 0,
    gate: null,
    uninstall: () => vi.unstubAllGlobals(),
  };

  const newRequest = (): FakeRequest => ({ result: undefined, error: null, onsuccess: null, onerror: null });

  const makeDb = () => ({
    objectStoreNames: { contains: () => true },
    createObjectStore: () => ({}),
    onversionchange: null as (() => void) | null,
    close: () => {},
    transaction: () => {
      const ops: Array<{ write: boolean; run: () => void }> = [];
      let aborted = false;
      const tx = {
        error: null as unknown,
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onabort: null as (() => void) | null,
        abort() {
          if (aborted) return;
          aborted = true;
          ops.length = 0;
          setTimeout(() => tx.onabort?.(), 0);
        },
        objectStore: () => ({
          put(value: unknown, key: string) {
            const req = newRequest();
            ops.push({
              write: true,
              run: () => {
                handle.records.set(key, value);
                handle.writeCount++;
                req.result = key;
                req.onsuccess?.();
              },
            });
            return req;
          },
          get(key: string) {
            const req = newRequest();
            ops.push({
              write: false,
              run: () => {
                req.result = handle.records.get(key);
                req.onsuccess?.();
              },
            });
            return req;
          },
          getAllKeys() {
            const req = newRequest();
            ops.push({
              write: false,
              run: () => {
                req.result = [...handle.records.keys()];
                req.onsuccess?.();
              },
            });
            return req;
          },
          delete(key: string) {
            const req = newRequest();
            ops.push({
              write: true,
              run: () => {
                handle.records.delete(key);
                req.onsuccess?.();
              },
            });
            return req;
          },
        }),
      };

      setTimeout(async () => {
        if (handle.gate) await handle.gate;
        if (handle.failWrites && ops.some((op) => op.write)) {
          tx.error = new Error('QuotaExceededError');
          tx.onabort?.();
          return;
        }
        if (!options.drainQueuedRequests) {
          ops.slice().forEach((op) => op.run());
          tx.oncomplete?.();
          return;
        }
        // Drain, like a real transaction: requests queued from a request's onsuccess run in the same transaction.
        while (ops.length) {
          const op = ops.shift()!;
          if (aborted) return;
          if (handle.failWrites && op.write) {
            tx.error = new Error('QuotaExceededError');
            tx.onabort?.();
            return;
          }
          op.run();
        }
        if (aborted) return;
        tx.oncomplete?.();
      }, 0);

      return tx;
    },
  });

  const factory = {
    open: () => {
      const request = {
        result: null as unknown,
        error: null,
        onupgradeneeded: null as (() => void) | null,
        onblocked: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };
      setTimeout(() => {
        request.result = makeDb();
        request.onupgradeneeded?.();
        request.onsuccess?.();
      }, 0);
      return request;
    },
  };

  vi.stubGlobal('indexedDB', factory);
  return handle;
}

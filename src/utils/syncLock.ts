/**
 * syncLock.ts
 * One merge at a time, across every ZeroBox tab.
 *
 *  1. Web Locks: `navigator.locks.request('zerobox-sync', { ifAvailable: true })`. A second tab gets `null`
 *     and is refused immediately (never queued behind the first merge).
 *  2. Fallback when navigator.locks is missing: an in-tab flag. Across tabs the restore lock that
 *     runExclusiveSyncWrite takes (and that every tab checks synchronously before writing) does the job.
 *  3. Refused outright while the schema write gate is engaged or another tab holds a live restore lock.
 *  4. Inside the lock, runExclusiveSyncWrite gates the other tabs while the merge writes and tells them to
 *     reload afterwards (RESTORED on the cross-tab channel).
 */
import { isSchemaWriteGated, readActiveRestoreLock } from './schemaWriteGate';
import { runExclusiveSyncWrite } from '../store/preMigrationBackup';

export const SYNC_LOCK_NAME = 'zerobox-sync';

export type SyncLockResult<T> =
  | { status: 'applied'; value: T }
  | { status: 'busy' } // another merge holds the lock (this tab or another one)
  | { status: 'gated' }; // writes are blocked (newer schema, or a restore/merge elsewhere)

interface LockManagerLike {
  request<R>(name: string, options: { ifAvailable: boolean }, cb: (lock: unknown) => Promise<R>): Promise<R>;
}

const lockManager = (): LockManagerLike | null => {
  const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: LockManagerLike }).locks : undefined;
  return locks && typeof locks.request === 'function' ? locks : null;
};

let heldInThisTab = false;

const isBlocked = () => isSchemaWriteGated() || readActiveRestoreLock() !== null;

async function runLocked<T>(apply: () => Promise<T>, settleMs?: number): Promise<SyncLockResult<T>> {
  if (isBlocked()) return { status: 'gated' };
  const res = await runExclusiveSyncWrite(apply, { settleMs });
  return res.ok ? { status: 'applied', value: res.value } : { status: 'gated' };
}

/** Runs `apply` as the only merge in any tab. `apply` errors propagate after the other tabs are released. */
export async function withSyncLock<T>(apply: () => Promise<T>, options: { settleMs?: number } = {}): Promise<SyncLockResult<T>> {
  if (isBlocked()) return { status: 'gated' };
  if (heldInThisTab) return { status: 'busy' };
  heldInThisTab = true;
  try {
    const locks = lockManager();
    if (!locks) return await runLocked(apply, options.settleMs);
    return await locks.request(SYNC_LOCK_NAME, { ifAvailable: true }, async (lock) => {
      if (!lock) return { status: 'busy' } as const;
      return runLocked(apply, options.settleMs);
    });
  } finally {
    heldInThisTab = false;
  }
}

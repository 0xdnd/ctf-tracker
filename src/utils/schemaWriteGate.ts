/**
 * schemaWriteGate.ts
 * Process-wide storage write gate. Dependency-free so every storage writer (useCtfStore's safeLocalStorage,
 * lootPersistence, the IndexedDB helpers) can consult it without import cycles.
 *
 * - 'newer-schema': another tab (or a previous session) ran a newer ZeroBox whose data this code must not
 *   overwrite. Engaged at boot from `zerobox_schema_version`, from a newer persisted blob, or live via the
 *   `storage` event. Never released: the tab has to reload into the new code.
 * - 'restoring': a pre-migration snapshot is being written back, in this tab or another one; blocks every
 *   flush (beforeunload, debounced saves) from clobbering the restored strings before the reload. Other tabs
 *   learn about it from the `zerobox_restore_in_progress` lock (storage event, sync channel, and the
 *   synchronous lock check in isSchemaWriteGated below, which catches a write racing the events).
 */

/** Persisted data schema of this build (zustand persist `version` and `zerobox_schema_version`). */
export const SCHEMA_VERSION = 3;
export const SCHEMA_VERSION_STORAGE_KEY = 'zerobox_schema_version';

/** Cross-tab restore lock: `{ ts, token }` while a tab writes a snapshot back, `aborted: true` on rollback. */
export const RESTORE_IN_PROGRESS_KEY = 'zerobox_restore_in_progress';
/** A lock older than this was left by a tab that died mid-restore. */
export const RESTORE_LOCK_STALE_MS = 60_000;

export interface RestoreLock {
  ts: number;
  token: string;
  aborted?: boolean;
  /** 'sync': a sync-file merge holds the lock (same protocol as a snapshot restore). */
  kind?: 'sync';
}

export const parseRestoreLock = (raw: string | null | undefined): RestoreLock | null => {
  if (!raw) return null;
  try {
    const lock = JSON.parse(raw);
    if (!lock || typeof lock.ts !== 'number' || !Number.isFinite(lock.ts) || typeof lock.token !== 'string') return null;
    return {
      ts: lock.ts,
      token: lock.token,
      ...(lock.aborted === true ? { aborted: true } : {}),
      ...(lock.kind === 'sync' ? { kind: 'sync' as const } : {}),
    };
  } catch {
    return null;
  }
};

export const isStaleRestoreLock = (lock: RestoreLock, now = Date.now()): boolean => now - lock.ts > RESTORE_LOCK_STALE_MS;

// Tokens of restores reported aborted over the channel: their lock may still be visible here for a moment.
const ignoredRestoreTokens = new Set<string>();
export const ignoreRestoreLockToken = (token: string): void => {
  ignoredRestoreTokens.add(token);
};

/** The lock a restoring tab holds right now (fresh and not aborted), or null. */
export function readActiveRestoreLock(now = Date.now()): RestoreLock | null {
  if (typeof window === 'undefined') return null;
  let lock: RestoreLock | null = null;
  try {
    lock = parseRestoreLock(localStorage.getItem(RESTORE_IN_PROGRESS_KEY));
  } catch {
    return null;
  }
  if (!lock || lock.aborted || ignoredRestoreTokens.has(lock.token) || isStaleRestoreLock(lock, now)) return null;
  return lock;
}

export type SchemaWriteGateReason = 'newer-schema' | 'restoring';

let gateReason: SchemaWriteGateReason | null = null;
const listeners = new Set<(reason: SchemaWriteGateReason) => void>();

export const isSchemaWriteGated = (): boolean => {
  if (gateReason !== null) return true;
  // Another tab took the restore lock but its storage event / channel message has not reached us yet.
  if (readActiveRestoreLock()) {
    engageSchemaWriteGate('restoring');
    return true;
  }
  return false;
};
export const getSchemaWriteGateReason = (): SchemaWriteGateReason | null => gateReason;

export function onSchemaWriteGateEngaged(cb: (reason: SchemaWriteGateReason) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function engageSchemaWriteGate(reason: SchemaWriteGateReason): void {
  if (gateReason === 'newer-schema') return; // strongest reason wins and sticks
  const changed = gateReason !== reason;
  gateReason = reason;
  if (!changed) return;
  listeners.forEach((cb) => {
    try {
      cb(reason);
    } catch {}
  });
}

const releaseListeners = new Set<() => void>();

/** Called after a 'restoring' gate was released, so writers can flush what they held back while it was engaged. */
export function onSchemaWriteGateReleased(cb: () => void): () => void {
  releaseListeners.add(cb);
  return () => releaseListeners.delete(cb);
}

/** Only a restore lock can be released (e.g. after a failed restore was rolled back). */
export function releaseRestoreWriteGate(): void {
  if (gateReason !== 'restoring') return;
  gateReason = null;
  releaseListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* a failing listener must not block the others */
    }
  });
}

export const parseSchemaVersion = (raw: string | null | undefined): number | null => {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

export const isNewerSchemaVersion = (raw: string | null | undefined): boolean => {
  const n = parseSchemaVersion(raw);
  return n !== null && n > SCHEMA_VERSION;
};

/**
 * Boot check, run before the store hydrates: a stored version higher than ours engages the gate (no writes).
 * Returns the version that was stored.
 */
export function initSchemaVersionGate(): number | null {
  if (typeof window === 'undefined') return null;
  let stored: number | null = null;
  try {
    stored = parseSchemaVersion(localStorage.getItem(SCHEMA_VERSION_STORAGE_KEY));
  } catch {
    return null;
  }
  if (stored !== null && stored > SCHEMA_VERSION) engageSchemaWriteGate('newer-schema');
  return stored;
}

/** Run after hydration: record our version if the stored one is lower or missing (never while gated). */
export function recordSchemaVersion(): void {
  if (typeof window === 'undefined' || isSchemaWriteGated()) return;
  try {
    const stored = parseSchemaVersion(localStorage.getItem(SCHEMA_VERSION_STORAGE_KEY));
    if (stored === null || stored < SCHEMA_VERSION) {
      localStorage.setItem(SCHEMA_VERSION_STORAGE_KEY, String(SCHEMA_VERSION));
    } else if (stored > SCHEMA_VERSION) {
      engageSchemaWriteGate('newer-schema');
    }
  } catch {}
}

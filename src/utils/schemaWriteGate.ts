/**
 * schemaWriteGate.ts
 * Process-wide storage write gate. Dependency-free so every storage writer (useCtfStore's safeLocalStorage,
 * lootPersistence, the IndexedDB helpers) can consult it without import cycles.
 *
 * - 'newer-schema': another tab (or a previous session) ran a newer ZeroBox whose data this code must not
 *   overwrite. Engaged at boot from `zerobox_schema_version`, from a newer persisted blob, or live via the
 *   `storage` event. Never released: the tab has to reload into the new code.
 * - 'restoring': a pre-migration snapshot is being written back; blocks this tab's own flushes
 *   (beforeunload, debounced saves) from clobbering the restored strings before the reload.
 */

/** Persisted data schema of this build (zustand persist `version` and `zerobox_schema_version`). */
export const SCHEMA_VERSION = 3;
export const SCHEMA_VERSION_STORAGE_KEY = 'zerobox_schema_version';

export type SchemaWriteGateReason = 'newer-schema' | 'restoring';

let gateReason: SchemaWriteGateReason | null = null;
const listeners = new Set<(reason: SchemaWriteGateReason) => void>();

export const isSchemaWriteGated = (): boolean => gateReason !== null;
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

/** Only a restore lock can be released (e.g. after a failed restore was rolled back). */
export function releaseRestoreWriteGate(): void {
  if (gateReason === 'restoring') gateReason = null;
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

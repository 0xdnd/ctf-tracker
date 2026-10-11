/**
 * preMigrationBackup.ts
 * Automatic snapshot of the raw persisted strings taken right before a schema migration, stored in the
 * existing IndexedDB `zerobox_resilient_store_v1` database (workspaces store) under
 * `premigration_{fromVersion}_{timestamp}`. At most MAX_PREMIGRATION_BACKUPS are kept (the oldest is pinned, the
 * rest rotate), deduped by a content hash so repeated boots never pile up identical copies. Restore writes the exact strings back and reloads;
 * the migration is idempotent, so it simply reruns.
 *
 * Dependency-free with respect to useCtfStore (no import cycle): useCtfStore calls in from `migrate`.
 */
import {
  putResilientRecord,
  getResilientRecord,
  listResilientRecordKeys,
  deleteResilientRecord,
} from '../utils/resilientStorage';
import {
  SCHEMA_VERSION,
  isSchemaWriteGated,
  engageSchemaWriteGate,
  releaseRestoreWriteGate,
} from '../utils/schemaWriteGate';
import { toast } from './useToastStore';

export const PREMIGRATION_PREFIX = 'premigration_';
export const PRERESTORE_PREFIX = 'prerestore_';
export const MAX_PREMIGRATION_BACKUPS = 2;
const MAX_PRERESTORE_BACKUPS = 1;

/** Every localStorage key the tracker's machine data lives in (persist blob, profiles, isolated customs). */
export const PERSIST_STORE_KEY = 'zerobox-tactical-store';
const EXACT_KEYS = new Set([PERSIST_STORE_KEY, 'specter_ctf_store_v2', 'zerobox_custom_machines_v1']);
const KEY_PREFIXES = ['zerobox_operator_profile_', 'specter_ctf_profile_', 'zerobox_custom_machines_v1_'];

export const isBackedUpStorageKey = (key: string): boolean =>
  EXACT_KEYS.has(key) || KEY_PREFIXES.some((p) => key.startsWith(p));

export interface PreMigrationBackupRecord {
  format: 1;
  key: string;
  fromVersion: number;
  toVersion: number;
  createdAt: string;
  hash: string;
  entries: Record<string, string>;
}

export interface PreMigrationBackupSummary {
  key: string;
  fromVersion: number;
  toVersion: number;
  createdAt: string;
  keyCount: number;
  bytes: number;
}

export type BackupOutcome = 'saved' | 'duplicate' | 'empty' | 'skipped' | 'failed';

/** Synchronous capture of the raw strings (must run before anything overwrites them). */
export function captureRawStorage(): Record<string, string> {
  const entries: Record<string, string> = {};
  if (typeof window === 'undefined') return entries;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && isBackedUpStorageKey(k)) {
        const v = localStorage.getItem(k);
        if (v !== null) entries[k] = v;
      }
    }
  } catch {}
  return entries;
}

/** cyrb53 over the sorted entries: fast, synchronous, good enough for dedupe (not security). */
export function hashEntries(entries: Record<string, string>): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  const feed = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
  };
  for (const k of Object.keys(entries).sort()) {
    feed(k);
    feed('\u0000');
    feed(entries[k]);
    feed('\u0001');
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

const timestampOf = (key: string): number => {
  const n = Number(key.slice(key.lastIndexOf('_') + 1));
  return Number.isFinite(n) ? n : 0;
};

const newestFirst = (keys: string[]) => [...keys].sort((a, b) => timestampOf(b) - timestampOf(a));

function parseRecord(raw: string | null): PreMigrationBackupRecord | null {
  if (!raw) return null;
  try {
    const rec = JSON.parse(raw);
    if (!rec || rec.format !== 1 || !rec.entries || typeof rec.entries !== 'object') return null;
    for (const v of Object.values(rec.entries)) if (typeof v !== 'string') return null;
    return rec as PreMigrationBackupRecord;
  } catch {
    return null;
  }
}

/** Write a record, then prune the oldest beyond `keep`. Writing first means a failed prune never loses the newest. */
async function persistRecord(prefix: string, rec: PreMigrationBackupRecord, keep: number): Promise<BackupOutcome> {
  const existing = await listResilientRecordKeys(prefix);
  for (const k of existing) {
    const other = parseRecord(await getResilientRecord(k));
    if (other && other.hash === rec.hash) return 'duplicate';
  }
  const ok = await putResilientRecord(rec.key, JSON.stringify(rec));
  if (!ok) return 'failed';
  const all = newestFirst(Array.from(new Set([...existing, rec.key])));
  // With room for 2+, the oldest record is pinned: it is the genuine pre-update copy. Only the newer ones rotate,
  // so an old tab that keeps writing v2 blobs (re-triggering migrate) can never push the original out.
  const retained = new Set(keep >= 2 ? [...all.slice(0, keep - 1), all[all.length - 1]] : all.slice(0, keep));
  for (const old of all) if (!retained.has(old)) await deleteResilientRecord(old);
  return 'saved';
}

function buildRecord(prefix: string, fromVersion: number, entries: Record<string, string>, now: number): PreMigrationBackupRecord {
  return {
    format: 1,
    key: `${prefix}${fromVersion}_${now}`,
    fromVersion,
    toVersion: SCHEMA_VERSION,
    createdAt: new Date(now).toISOString(),
    hash: hashEntries(entries),
    entries,
  };
}

let lastBackup: Promise<BackupOutcome> = Promise.resolve('skipped');

/** Settles when the most recent takePreMigrationBackup has finished writing (tests, UI). */
export const whenPreMigrationBackupSettled = (): Promise<BackupOutcome> => lastBackup;

/**
 * Capture synchronously (call before the migrated state is written back), then persist to IndexedDB in the
 * background. A failed write is surfaced to the user, never swallowed.
 */
export function takePreMigrationBackup(fromVersion: number): Promise<BackupOutcome> {
  if (typeof window === 'undefined' || isSchemaWriteGated()) {
    lastBackup = Promise.resolve('skipped');
    return lastBackup;
  }
  const entries = captureRawStorage();
  if (Object.keys(entries).length === 0) {
    lastBackup = Promise.resolve('empty');
    return lastBackup;
  }
  const rec = buildRecord(PREMIGRATION_PREFIX, fromVersion, entries, Date.now());
  lastBackup = persistRecord(PREMIGRATION_PREFIX, rec, MAX_PREMIGRATION_BACKUPS)
    .catch(() => 'failed' as const)
    .then((outcome) => {
      if (outcome === 'failed') {
        console.warn('[ZeroBox] Pre-update snapshot could not be written to IndexedDB.');
        toast.warning(
          'ZeroBox updated its data format but could not save a pre-update snapshot. Export a backup now to be safe.',
          'Snapshot not saved'
        );
      }
      return outcome;
    });
  return lastBackup;
}

export async function listPreMigrationBackups(): Promise<PreMigrationBackupSummary[]> {
  const keys = newestFirst(await listResilientRecordKeys(PREMIGRATION_PREFIX));
  const out: PreMigrationBackupSummary[] = [];
  for (const key of keys) {
    const rec = parseRecord(await getResilientRecord(key));
    if (!rec) continue;
    out.push({
      key,
      fromVersion: rec.fromVersion,
      toVersion: rec.toVersion,
      createdAt: rec.createdAt,
      keyCount: Object.keys(rec.entries).length,
      bytes: Object.values(rec.entries).reduce((n, v) => n + v.length, 0),
    });
  }
  return out;
}

/**
 * Write a snapshot's exact raw strings back and reload. Before touching anything, the current strings are
 * saved as a `prerestore_` record (restore aborts if that safety copy cannot be written), and this tab's own
 * writes are gated so its unload flush cannot clobber the restored data. Keys created after the snapshot are
 * left in place (nothing is deleted). A failed write is rolled back.
 */
export async function restorePreMigrationBackup(
  key: string,
  options: { reload?: () => void } = {}
): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isSchemaWriteGated()) {
    toast.error('Writes are blocked in this tab. Reload ZeroBox first, then restore.', 'Restore blocked');
    return false;
  }
  const rec = key.startsWith(PREMIGRATION_PREFIX) ? parseRecord(await getResilientRecord(key)) : null;
  if (!rec) {
    toast.error('That pre-update snapshot could not be read.', 'Restore failed');
    return false;
  }

  const current = captureRawStorage();
  if (Object.keys(current).length > 0) {
    const safety = buildRecord(PRERESTORE_PREFIX, SCHEMA_VERSION, current, Date.now());
    const outcome = await persistRecord(PRERESTORE_PREFIX, safety, MAX_PRERESTORE_BACKUPS).catch(() => 'failed' as const);
    if (outcome === 'failed') {
      toast.error('Could not save a safety copy of your current data, so nothing was restored. Export a backup first.', 'Restore aborted');
      return false;
    }
  }

  engageSchemaWriteGate('restoring');
  const written: string[] = [];
  try {
    for (const [k, v] of Object.entries(rec.entries)) {
      localStorage.setItem(k, v);
      written.push(k);
    }
  } catch (err) {
    for (const k of written) {
      try {
        if (k in current) localStorage.setItem(k, current[k]);
        else localStorage.removeItem(k);
      } catch {}
    }
    releaseRestoreWriteGate();
    console.error('[ZeroBox] Pre-update snapshot restore failed and was rolled back:', err);
    toast.error('Restoring the snapshot failed (storage full?). Your current data was kept.', 'Restore failed');
    return false;
  }
  (options.reload ?? (() => window.location.reload()))();
  return true;
}

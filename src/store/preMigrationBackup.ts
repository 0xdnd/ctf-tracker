/**
 * preMigrationBackup.ts
 * Automatic snapshot of the raw persisted strings taken right before a schema migration, stored in the
 * existing IndexedDB `zerobox_resilient_store_v1` database (workspaces store) under
 * `premigration_{fromVersion}_{timestamp}`. At most MAX_PREMIGRATION_BACKUPS are kept (the oldest is pinned, the
 * rest rotate), deduped by a content hash so repeated boots never pile up identical copies. Restore writes the exact strings back and reloads;
 * the migration is idempotent, so it simply reruns.
 *
 * Cross-tab restore protocol (other tabs still hold the old machines in memory and would flush them over the
 * restored strings):
 *   1. restoring tab: safety copy -> gate itself -> set the `zerobox_restore_in_progress` lock `{ ts, token }`
 *      and post RESTORING on the sync channel -> wait RESTORE_SETTLE_MS for in-flight saves elsewhere to land
 *      -> write the raw strings -> clear the lock, post RESTORED -> reload. On a failed write it rolls back,
 *      marks the lock `aborted`, posts RESTORE_ABORTED and clears the lock.
 *   2. every other tab (storage event, channel message, boot check, or the synchronous lock check inside
 *      isSchemaWriteGated): engage the 'restoring' gate so all writes, debounced saves and the beforeunload
 *      flush are no-ops, show a sticky toast, then reload once the lock is cleared or RESTORED arrives. An
 *      abort releases the gate and re-flushes. A lock older than RESTORE_LOCK_STALE_MS is stale: cleared with a
 *      warning instead of gating forever.
 *
 * Snapshots carry a `reason`: 'migration' (above) or 'pre-sync', taken right before a sync-file merge writes
 * anything (`presync_{version}_{timestamp}`, newest MAX_PRESYNC_BACKUPS kept). A pre-sync snapshot also covers
 * the loot, attack-graph and sync-baseline keys the merge rewrites. Both kinds are listed and restored the same way.
 * A sync merge reuses the cross-tab lock protocol (`runExclusiveSyncWrite`): other tabs are gated while it
 * writes and reload on RESTORED; the merging tab ignores its own lock token so it can keep writing.
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
  RESTORE_IN_PROGRESS_KEY,
  RESTORE_LOCK_STALE_MS,
  isSchemaWriteGated,
  engageSchemaWriteGate,
  releaseRestoreWriteGate,
  onSchemaWriteGateEngaged,
  parseRestoreLock,
  isStaleRestoreLock,
  ignoreRestoreLockToken,
} from '../utils/schemaWriteGate';
import { syncChannel } from '../utils/crossTabChannel';
import { loadDeepProfileData, restoreDeepProfileData, type DeepProfilePayload } from '../utils/indexedDbDeepStorage';
import { toast, useToastStore } from './useToastStore';

export const PREMIGRATION_PREFIX = 'premigration_';
export const PRESYNC_PREFIX = 'presync_';
export const PRERESTORE_PREFIX = 'prerestore_';
export const MAX_PREMIGRATION_BACKUPS = 2;
export const MAX_PRESYNC_BACKUPS = 3;
const MAX_PRERESTORE_BACKUPS = 1;

export type SnapshotReason = 'migration' | 'pre-sync';

/** Every localStorage key the tracker's data lives in (persist blob, profiles, isolated customs, goals). */
export const PERSIST_STORE_KEY = 'zerobox-tactical-store';
const EXACT_KEYS = new Set([
  PERSIST_STORE_KEY,
  'specter_ctf_store_v2',
  'zerobox_custom_machines_v1',
  'zerobox-goals-v1', // useGoalsStore (GOALS_STORAGE_KEY)
]);
const KEY_PREFIXES = ['zerobox_operator_profile_', 'specter_ctf_profile_', 'zerobox_custom_machines_v1_'];

export const isBackedUpStorageKey = (key: string): boolean =>
  EXACT_KEYS.has(key) || KEY_PREFIXES.some((p) => key.startsWith(p));

/** A sync merge also rewrites loot, the attack graph and the sync baselines, so its snapshot covers them too. */
const SYNC_EXTRA_EXACT_KEYS = new Set(['zerobox-attack-graph-state']);
const SYNC_EXTRA_PREFIXES = ['zerobox_loot_v2_', 'zerobox_graph_state_', 'zerobox_sync_state_v1_'];

export const isPreSyncStorageKey = (key: string): boolean =>
  isBackedUpStorageKey(key) || SYNC_EXTRA_EXACT_KEYS.has(key) || SYNC_EXTRA_PREFIXES.some((p) => key.startsWith(p));

export interface PreMigrationBackupRecord {
  format: 1;
  key: string;
  fromVersion: number;
  toVersion: number;
  createdAt: string;
  hash: string;
  /** Missing on records written before reasons existed: those are 'migration'. */
  reason?: SnapshotReason;
  entries: Record<string, string>;
  /**
   * Pre-sync only: the merged profile's IndexedDB deep record (writeups / quick notes that a full
   * localStorage pruned out of the profile, plus custom notes), JSON. Restore writes it back verbatim.
   */
  deep?: { profileId: string; payload: string };
}

export interface PreMigrationBackupSummary {
  key: string;
  fromVersion: number;
  toVersion: number;
  createdAt: string;
  keyCount: number;
  bytes: number;
  reason?: SnapshotReason;
}

export type BackupOutcome = 'saved' | 'duplicate' | 'empty' | 'skipped' | 'failed';

/** Synchronous capture of the raw strings (must run before anything overwrites them). */
export function captureRawStorage(include: (key: string) => boolean = isBackedUpStorageKey): Record<string, string> {
  const entries: Record<string, string> = {};
  if (typeof window === 'undefined') return entries;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && include(k)) {
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
    if (rec.deep !== undefined && (typeof rec.deep?.profileId !== 'string' || typeof rec.deep?.payload !== 'string')) {
      delete rec.deep;
    }
    for (const v of Object.values(rec.entries)) if (typeof v !== 'string') return null;
    return rec as PreMigrationBackupRecord;
  } catch {
    return null;
  }
}

/** Write a record, then prune the oldest beyond `keep`. Writing first means a failed prune never loses the newest. */
async function persistRecord(
  prefix: string,
  rec: PreMigrationBackupRecord,
  keep: number,
  pinOldest = true
): Promise<BackupOutcome> {
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
  const retained = new Set(
    pinOldest && keep >= 2 ? [...all.slice(0, keep - 1), all[all.length - 1]] : all.slice(0, keep)
  );
  for (const old of all) if (!retained.has(old)) await deleteResilientRecord(old);
  return 'saved';
}

function buildRecord(
  prefix: string,
  fromVersion: number,
  entries: Record<string, string>,
  now: number,
  reason?: SnapshotReason,
  deep?: { profileId: string; payload: string }
): PreMigrationBackupRecord {
  return {
    format: 1,
    key: `${prefix}${fromVersion}_${now}`,
    fromVersion,
    toVersion: SCHEMA_VERSION,
    createdAt: new Date(now).toISOString(),
    hash: hashEntries(deep ? { ...entries, [`\u0000deep:${deep.profileId}`]: deep.payload } : entries),
    ...(reason ? { reason } : {}),
    entries,
    ...(deep ? { deep } : {}),
  };
}

/** The profile's deep record as a snapshot field (undefined when there is none). */
async function captureDeep(profileId: string): Promise<{ profileId: string; payload: string } | undefined> {
  try {
    const payload = await loadDeepProfileData(profileId);
    return payload ? { profileId, payload: JSON.stringify(payload) } : undefined;
  } catch {
    return undefined;
  }
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

/**
 * Snapshot (reason 'pre-sync') taken right before a sync merge writes anything. Unlike the migration snapshot
 * it is awaited: the caller must not write on 'failed' or 'skipped'. 'empty' means there is no stored data at
 * all, so there is nothing a merge could overwrite. It covers the localStorage keys a merge rewrites and the
 * merged profile's IndexedDB deep record. Vault notes (IndexedDB) are not captured: a merge only ever adds
 * to the vault, never changes or removes a note there. No toast here; the merge reports failures itself.
 */
export async function takePreSyncSnapshot(profileId?: string): Promise<BackupOutcome> {
  if (typeof window === 'undefined' || isSchemaWriteGated()) return 'skipped';
  const entries = captureRawStorage(isPreSyncStorageKey);
  const deep = profileId ? await captureDeep(profileId) : undefined;
  if (Object.keys(entries).length === 0 && !deep) return 'empty';
  const rec = buildRecord(PRESYNC_PREFIX, SCHEMA_VERSION, entries, Date.now(), 'pre-sync', deep);
  return persistRecord(PRESYNC_PREFIX, rec, MAX_PRESYNC_BACKUPS, false).catch(() => 'failed' as const);
}

const isSnapshotKey = (key: string) => key.startsWith(PREMIGRATION_PREFIX) || key.startsWith(PRESYNC_PREFIX);

/** Every restorable snapshot (pre-update and pre-sync), newest first, each labelled with its reason. */
export async function listPreMigrationBackups(): Promise<PreMigrationBackupSummary[]> {
  const keys = newestFirst([
    ...(await listResilientRecordKeys(PREMIGRATION_PREFIX)),
    ...(await listResilientRecordKeys(PRESYNC_PREFIX)),
  ]);
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
      reason: rec.reason === 'pre-sync' || key.startsWith(PRESYNC_PREFIX) ? 'pre-sync' : 'migration',
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------
// Cross-tab restore lock (protocol in the header comment)
// ---------------------------------------------------------------------------------------------------------

/** How long the restoring tab waits after announcing the lock, so saves already in flight elsewhere land first. */
export const RESTORE_SETTLE_MS = 300;
export const RESTORE_FOLLOWER_TOAST_MESSAGE = 'Restoring a snapshot in another tab…';
export const SYNC_FOLLOWER_TOAST_MESSAGE = 'Merging a sync file in another tab…';

export type RestoreBroadcastType = 'RESTORING' | 'RESTORED' | 'RESTORE_ABORTED';

let restoreInFlight = false; // this tab is the one restoring
let following = false; // another tab is restoring: this tab is gated and waits to reload
let reloadRequested = false;
let followerTimer: ReturnType<typeof setTimeout> | null = null;
const releaseListeners = new Set<() => void>();

const defaultReload = () => window.location.reload();
let reloadPage: () => void = defaultReload;

/** Test seam: replace the page reload (jsdom cannot navigate). Pass null for the default. */
export function setRestoreReloadHandler(fn: (() => void) | null): void {
  reloadPage = fn ?? defaultReload;
}

/** Runs after an aborted restore in another tab released this tab's gate (useCtfStore re-flushes). */
export function onRestoreLockReleased(cb: () => void): () => void {
  releaseListeners.add(cb);
  return () => releaseListeners.delete(cb);
}

export const isRestoreInFlight = (): boolean => restoreInFlight;
export const isRestoreFollower = (): boolean => following;

const postRestoreMessage = (type: RestoreBroadcastType, token: string, kind?: 'sync') => {
  try {
    syncChannel?.postMessage({ type, token, timestamp: Date.now(), ...(kind ? { kind } : {}) });
  } catch {}
};

const readRawLock = (): string | null => {
  try {
    return localStorage.getItem(RESTORE_IN_PROGRESS_KEY);
  } catch {
    return null;
  }
};

const clearLock = () => {
  try {
    localStorage.removeItem(RESTORE_IN_PROGRESS_KEY);
  } catch {}
};

const STALE_LOCK_WARNING = '[ZeroBox] Cleared a stale restore lock (older than 60 s) left by a tab that closed mid-restore.';

function reloadOnce() {
  if (reloadRequested) return;
  reloadRequested = true;
  if (followerTimer) {
    clearTimeout(followerTimer);
    followerTimer = null;
  }
  reloadPage();
}

/** Safety net in case the clear event and RESTORED never arrive: never stay gated past a stale lock. */
function scheduleFollowerCheck() {
  if (followerTimer) clearTimeout(followerTimer);
  const lock = parseRestoreLock(readRawLock());
  const wait = lock ? Math.max(0, lock.ts + RESTORE_LOCK_STALE_MS - Date.now()) + 500 : RESTORE_LOCK_STALE_MS;
  followerTimer = setTimeout(() => {
    followerTimer = null;
    if (!following) return;
    const current = parseRestoreLock(readRawLock());
    if (current?.aborted) {
      releaseFollower();
      return;
    }
    if (current && !isStaleRestoreLock(current)) {
      scheduleFollowerCheck();
      return;
    }
    if (current) {
      console.warn(STALE_LOCK_WARNING);
      clearLock();
    }
    reloadOnce();
  }, wait);
}

// Set by a channel message that announced a sync merge (the lock may not be readable yet).
let announcedSync = false;

function enterFollowerMode() {
  if (following || restoreInFlight) return;
  following = true;
  const isSync = announcedSync || parseRestoreLock(readRawLock())?.kind === 'sync';
  console.warn(
    isSync
      ? '[ZeroBox] Another tab is merging a sync file; this tab stops writing and reloads when it finishes.'
      : '[ZeroBox] Another tab is restoring a snapshot; this tab stops writing and reloads when it finishes.'
  );
  useToastStore.getState().addToast({
    type: 'info',
    title: isSync ? 'Sync merge in progress' : 'Restore in progress',
    message: isSync ? SYNC_FOLLOWER_TOAST_MESSAGE : RESTORE_FOLLOWER_TOAST_MESSAGE,
    durationMs: 0, // sticky until the reload
  });
  scheduleFollowerCheck();
}

function releaseFollower() {
  if (!following) return;
  following = false;
  if (followerTimer) {
    clearTimeout(followerTimer);
    followerTimer = null;
  }
  releaseRestoreWriteGate();
  const toasts = useToastStore.getState();
  announcedSync = false;
  for (const t of toasts.toasts) {
    if (t.message === RESTORE_FOLLOWER_TOAST_MESSAGE || t.message === SYNC_FOLLOWER_TOAST_MESSAGE) toasts.removeToast(t.id);
  }
  releaseListeners.forEach((cb) => {
    try {
      cb();
    } catch {}
  });
}

// Every way of learning about a foreign restore (event, message, boot check, synchronous lock check in
// isSchemaWriteGated) funnels through engageSchemaWriteGate('restoring'); the restoring tab itself is excluded.
onSchemaWriteGateEngaged((reason) => {
  if (reason === 'restoring' && !restoreInFlight) enterFollowerMode();
});

/** Boot check, before hydration: a fresh lock gates this tab; a stale, aborted or corrupt one is cleared. */
export function initRestoreLockGate(): void {
  if (typeof window === 'undefined') return;
  const raw = readRawLock();
  if (raw === null) return;
  const lock = parseRestoreLock(raw);
  if (lock && !lock.aborted && !isStaleRestoreLock(lock)) {
    engageSchemaWriteGate('restoring');
    return;
  }
  if (!lock?.aborted) console.warn(STALE_LOCK_WARNING);
  clearLock();
}

/** `storage` event hook (another tab set or cleared the lock). Returns true when the event was the lock key. */
export function handleRestoreLockStorageEvent(key: string | null, newValue: string | null): boolean {
  if (key !== RESTORE_IN_PROGRESS_KEY) return false;
  if (restoreInFlight) return true;
  if (newValue === null) {
    if (following) reloadOnce();
    return true;
  }
  const lock = parseRestoreLock(newValue);
  if (!lock) return true;
  if (lock.aborted) {
    ignoreRestoreLockToken(lock.token);
    releaseFollower();
  } else if (!isStaleRestoreLock(lock)) {
    engageSchemaWriteGate('restoring');
  }
  return true;
}

/** Sync-channel hook. Returns true when the message belonged to the restore protocol. */
export function handleRestoreBroadcast(data: unknown): boolean {
  const msg = (data && typeof data === 'object' ? data : {}) as { type?: unknown; token?: unknown };
  if (msg.type !== 'RESTORING' && msg.type !== 'RESTORED' && msg.type !== 'RESTORE_ABORTED') return false;
  if (restoreInFlight) return true;
  if (msg.type === 'RESTORING') {
    if ((msg as { kind?: unknown }).kind === 'sync') announcedSync = true;
    engageSchemaWriteGate('restoring');
  } else if (msg.type === 'RESTORED') {
    // Even a tab that missed RESTORING must not flush its stale state on the way out.
    engageSchemaWriteGate('restoring');
    reloadOnce();
  } else {
    if (typeof msg.token === 'string') ignoreRestoreLockToken(msg.token);
    releaseFollower();
  }
  return true;
}

const newRestoreToken = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Write a snapshot's exact raw strings back and reload. Before touching anything, the current strings are
 * saved as a `prerestore_` record (restore aborts if that safety copy cannot be written). Then this tab gates
 * itself and takes the cross-tab restore lock so no tab (this one included) can flush stale state over the
 * restored data, waits `settleMs` for saves already in flight elsewhere, and writes. Keys created after the
 * snapshot are left in place (nothing is deleted). A failed write is rolled back and the lock released.
 * The promise does not depend on any component: closing the UI mid-restore is harmless.
 */
export async function restorePreMigrationBackup(
  key: string,
  options: { reload?: () => void; settleMs?: number } = {}
): Promise<boolean> {
  if (typeof window === 'undefined' || restoreInFlight) return false;
  if (isSchemaWriteGated()) {
    toast.error(
      following
        ? 'Another tab is restoring a snapshot. Wait for it to finish.'
        : 'Writes are blocked in this tab. Reload ZeroBox first, then restore.',
      'Restore blocked'
    );
    return false;
  }
  restoreInFlight = true;
  let restored = false;
  try {
    restored = await runRestore(key, options);
    return restored;
  } finally {
    // After a successful restore the tab is reloading: stay the restoring tab (never become a follower).
    if (!restored) restoreInFlight = false;
  }
}

async function runRestore(key: string, options: { reload?: () => void; settleMs?: number }): Promise<boolean> {
  const rec = isSnapshotKey(key) ? parseRecord(await getResilientRecord(key)) : null;
  if (!rec) {
    toast.error('That pre-update snapshot could not be read.', 'Restore failed');
    return false;
  }

  // A pre-sync snapshot also carries loot/graph keys: the safety copy and the rollback must cover them as well.
  const include = rec.reason === 'pre-sync' || key.startsWith(PRESYNC_PREFIX) ? isPreSyncStorageKey : isBackedUpStorageKey;
  const current = captureRawStorage(include);
  const currentDeep = rec.deep ? await captureDeep(rec.deep.profileId) : undefined;
  if (Object.keys(current).length > 0 || currentDeep) {
    const safety = buildRecord(PRERESTORE_PREFIX, SCHEMA_VERSION, current, Date.now(), undefined, currentDeep);
    const outcome = await persistRecord(PRERESTORE_PREFIX, safety, MAX_PRERESTORE_BACKUPS).catch(() => 'failed' as const);
    if (outcome === 'failed') {
      toast.error('Could not save a safety copy of your current data, so nothing was restored. Export a backup first.', 'Restore aborted');
      return false;
    }
  }

  // 1. Stop every writer: this tab first, then the others (lock + channel).
  engageSchemaWriteGate('restoring');
  const token = newRestoreToken();
  try {
    localStorage.setItem(RESTORE_IN_PROGRESS_KEY, JSON.stringify({ ts: Date.now(), token }));
  } catch (err) {
    console.warn('[ZeroBox] Could not write the cross-tab restore lock; relying on the sync channel.', err);
  }
  postRestoreMessage('RESTORING', token);

  // 2. Let saves other tabs already started land before we overwrite them.
  await new Promise((resolve) => setTimeout(resolve, options.settleMs ?? RESTORE_SETTLE_MS));

  // 3. Write. The rollback copy is taken now so it includes anything that landed during the settle window.
  const rollback = captureRawStorage(include);
  const written: string[] = [];
  try {
    for (const [k, v] of Object.entries(rec.entries)) {
      localStorage.setItem(k, v);
      written.push(k);
    }
  } catch (err) {
    for (const k of written) {
      try {
        if (k in rollback) localStorage.setItem(k, rollback[k]);
        else localStorage.removeItem(k);
      } catch {}
    }
    try {
      localStorage.setItem(RESTORE_IN_PROGRESS_KEY, JSON.stringify({ ts: Date.now(), token, aborted: true }));
    } catch {}
    postRestoreMessage('RESTORE_ABORTED', token);
    clearLock();
    releaseRestoreWriteGate();
    console.error('[ZeroBox] Pre-update snapshot restore failed and was rolled back:', err);
    toast.error('Restoring the snapshot failed (storage full?). Your current data was kept.', 'Restore failed');
    return false;
  }

  // 3b. Pre-sync snapshots also carry the profile's IndexedDB deep record (writeups pruned out of a full
  // localStorage). The localStorage strings are already back, so a failure here is reported, not rolled back.
  if (rec.deep) {
    let ok = false;
    try {
      ok = await restoreDeepProfileData(rec.deep.profileId, JSON.parse(rec.deep.payload) as DeepProfilePayload);
    } catch {
      ok = false;
    }
    if (!ok) {
      console.warn('[ZeroBox] Snapshot restore: the IndexedDB writeup copy could not be written back.');
      toast.warning(
        'Your tracker data was restored, but writeups kept only in IndexedDB could not be written back. A safety copy of the previous state is kept.',
        'Writeups not restored'
      );
    }
  }

  // 4. Done: release the other tabs into a reload, then reload this one.
  clearLock();
  postRestoreMessage('RESTORED', token);
  (options.reload ?? reloadPage)();
  return true;
}

export type ExclusiveWriteResult<T> = { ok: true; value: T } | { ok: false; reason: 'gated' };

/**
 * Runs `apply` while every other tab is held off, using the restore-lock protocol: take the
 * `zerobox_restore_in_progress` lock (kind 'sync') and post RESTORING, wait `settleMs` for saves already in
 * flight elsewhere to land, run `apply`, then clear the lock and post RESTORED so the other tabs reload onto
 * the merged data. This tab ignores its own lock token, so its own writes go through. If `apply` throws, the
 * lock is marked aborted and RESTORE_ABORTED releases the other tabs (they re-flush what they held back).
 * Refuses (no lock taken, nothing run) while this tab is gated, a restore/merge runs here, or another tab
 * holds a live lock.
 */
export async function runExclusiveSyncWrite<T>(
  apply: () => Promise<T>,
  options: { settleMs?: number } = {}
): Promise<ExclusiveWriteResult<T>> {
  if (typeof window === 'undefined' || restoreInFlight || isSchemaWriteGated()) return { ok: false, reason: 'gated' };
  restoreInFlight = true;
  const token = newRestoreToken();
  ignoreRestoreLockToken(token);
  try {
    try {
      localStorage.setItem(RESTORE_IN_PROGRESS_KEY, JSON.stringify({ ts: Date.now(), token, kind: 'sync' }));
    } catch (err) {
      console.warn('[ZeroBox] Could not write the cross-tab restore lock; relying on the sync channel.', err);
    }
    postRestoreMessage('RESTORING', token, 'sync');
    await new Promise((resolve) => setTimeout(resolve, options.settleMs ?? RESTORE_SETTLE_MS));
    let value: T;
    try {
      value = await apply();
    } catch (err) {
      try {
        localStorage.setItem(RESTORE_IN_PROGRESS_KEY, JSON.stringify({ ts: Date.now(), token, aborted: true, kind: 'sync' }));
      } catch {}
      postRestoreMessage('RESTORE_ABORTED', token, 'sync');
      clearLock();
      throw err;
    }
    clearLock();
    postRestoreMessage('RESTORED', token, 'sync');
    return { ok: true, value };
  } finally {
    restoreInFlight = false;
  }
}

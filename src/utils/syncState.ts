/**
 * syncState.ts
 * Device-local sync bookkeeping (never part of a backup's merged data):
 *   zerobox_device_id                 -> this browser's id, generated once
 *   zerobox_sync_state_v1_{profileId} -> { peers: { [deviceId]: syncedAt }, bases: { [deviceId]: { [machineId]: hash } } }
 * `peers[d]` is the syncedAt (device d's clock) of the newest file from device d merged into this profile:
 * the per-peer "lastSyncedAt" baseline used by syncMerge. `bases[d]` holds the fingerprint of each machine in
 * that file: the common ancestor for the next merge with d. Writes honour the schema write gate.
 */
import { isSchemaWriteGated } from './schemaWriteGate';

export const DEVICE_ID_KEY = 'zerobox_device_id';
export const SYNC_STATE_PREFIX = 'zerobox_sync_state_v1_';

export interface SyncState {
  peers: Record<string, string>;
  /** peer deviceId -> { machineId: fingerprint hash } of that peer's last merged file (common ancestor). */
  bases: Record<string, Record<string, string>>;
}

const validIso = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));

const read = (key: string): string | null => {
  try {
    return typeof window === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string): boolean => {
  if (typeof window === 'undefined' || isSchemaWriteGated()) return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

let memoryDeviceId: string | null = null;

const newId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** This browser's sync identity. Generated once and stored; an unwritable storage keeps it for the session. */
export function getOrCreateDeviceId(): string {
  const stored = read(DEVICE_ID_KEY);
  if (stored && stored.length >= 8 && stored.length <= 128) return stored;
  if (!memoryDeviceId) memoryDeviceId = newId();
  write(DEVICE_ID_KEY, memoryDeviceId);
  return memoryDeviceId;
}

export const syncStateKey = (profileId: string) => `${SYNC_STATE_PREFIX}${profileId || 'guest'}`;

export function readSyncState(profileId: string): SyncState {
  try {
    const parsed = JSON.parse(read(syncStateKey(profileId)) || 'null');
    const peers: Record<string, string> = {};
    if (parsed && typeof parsed.peers === 'object' && parsed.peers) {
      for (const [k, v] of Object.entries(parsed.peers)) if (validIso(v)) peers[k] = v;
    }
    const bases: Record<string, Record<string, string>> = {};
    if (parsed && typeof parsed.bases === 'object' && parsed.bases) {
      for (const [peer, base] of Object.entries(parsed.bases)) {
        if (!peers[peer] || !base || typeof base !== 'object') continue;
        const clean: Record<string, string> = {};
        for (const [id, h] of Object.entries(base as Record<string, unknown>)) if (typeof h === 'string') clean[id] = h;
        bases[peer] = clean;
      }
    }
    return { peers, bases };
  } catch {
    return { peers: {}, bases: {} };
  }
}

/** After a merge: remember how far this profile has seen `peerId` (never moves backwards). */
export function recordMergedPeer(
  profileId: string,
  peerId: string | undefined,
  peerSyncedAt: string | undefined,
  machineBase?: Record<string, string>
): void {
  if (!peerId || !validIso(peerSyncedAt)) return;
  const state = readSyncState(profileId);
  const prev = state.peers[peerId];
  // An older file from the same peer never moves the baseline (or its common ancestor) backwards.
  if (prev && Date.parse(peerSyncedAt) < Date.parse(prev)) return;
  state.peers[peerId] = peerSyncedAt;
  if (machineBase) state.bases[peerId] = machineBase;
  write(syncStateKey(profileId), JSON.stringify(state));
}

/**
 * syncFile.ts
 * The sync file is the regular '2.0.0' backup envelope plus optional fields that older builds ignore
 * (so an older build still imports it as a full backup):
 *   deviceId           exporting browser (utils/syncState)
 *   syncedAt           export time, exporter's clock
 *   syncPeers          { [deviceId]: syncedAt } of files the exporter has merged (the receiver's localBase)
 *   deletedMachineIds  machine tombstones { id, deletedAt }
 * (deletedNoteIds already existed in the envelope and serves as the note tombstone list.)
 * It is always encrypted by the UI (backupCrypto) before it is written to disk.
 */
import { validateWorkspacePayload, sanitizeObjectKeys } from './workspaceStorage';
import { normalizeMachineTombstones } from './machineTombstones';
import type { SyncWorkspace } from './syncMerge';
import type { Machine } from '../types';

export interface SyncFileMeta {
  deviceId: string;
  syncedAt: string;
  syncPeers: Record<string, string>;
}

const validIso = (v: unknown): v is string => typeof v === 'string' && Number.isFinite(Date.parse(v));

/** Adds the sync fields to a plaintext backup produced by exportBackup(). */
export function buildSyncFile(
  backupJson: string,
  meta: SyncFileMeta,
  extra: { machines?: Machine[]; deletedMachineIds?: unknown }
): string {
  const data = JSON.parse(backupJson);
  return JSON.stringify(
    {
      ...data,
      ...(extra.machines ? { machines: extra.machines } : {}),
      deviceId: meta.deviceId,
      syncedAt: meta.syncedAt,
      syncPeers: meta.syncPeers,
      deletedMachineIds: normalizeMachineTombstones(extra.deletedMachineIds),
    },
    null,
    2
  );
}

/** Parses a decrypted backup or sync file for a merge. Null when it is not a usable backup. */
export function parseSyncPayload(jsonStr: string): SyncWorkspace | null {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonStr);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const root = ((raw as { data?: unknown }).data || raw) as Record<string, unknown>;
  if (!Array.isArray(root.machines) && !Array.isArray(raw)) return null;
  const validation = validateWorkspacePayload(raw);
  if (!validation.success || !validation.data) return null;
  const d = validation.data;

  const syncPeers: Record<string, string> = {};
  if (root.syncPeers && typeof root.syncPeers === 'object' && !Array.isArray(root.syncPeers)) {
    for (const [k, v] of Object.entries(sanitizeObjectKeys(root.syncPeers as Record<string, unknown>))) {
      if (validIso(v)) syncPeers[k] = v;
    }
  }
  const deviceId = typeof root.deviceId === 'string' && root.deviceId.length <= 128 ? root.deviceId : undefined;
  return {
    ...(deviceId ? { deviceId } : {}),
    ...(validIso(root.syncedAt) ? { syncedAt: root.syncedAt } : {}),
    syncPeers,
    isRedacted: root.isRedacted === true,
    machines: (d.machines || []) as Machine[],
    deletedMachineIds: normalizeMachineTombstones(root.deletedMachineIds),
    customNotes: d.customNotes,
    userNotes: d.userNotes,
    userWikilinkMap: d.userWikilinkMap,
    deletedNoteIds: d.deletedNoteIds,
    activitySessions: d.activitySessions,
    graphEdges: d.graphEdges,
    credentials: d.credentials,
    credAttempts: d.credAttempts,
    lootItems: d.lootItems,
  };
}

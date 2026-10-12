/**
 * syncActions.ts
 * Bodies of the store's exportSyncFile / mergeBackup actions. Loaded on demand (dynamic import from
 * useCtfStore), together with syncMerge / syncFile / syncState / syncLock, so none of it sits in the entry chunk.
 * The static import of useCtfStore is safe: this module is only ever imported after the store has booted.
 */
import type { Machine } from '../types';
import {
  useCtfStore,
  flushProfileSave,
  mergeMachinesWithCatalog,
  saveAttackGraphState,
  saveCustomMachinesToStorage,
  withTimeSpent,
  type MergeBackupResult,
} from './useCtfStore';
import { saveLootState } from './lootPersistence';
import { takePreSyncSnapshot } from './preMigrationBackup';
import { saveVaultToIndexedDb } from '../utils/indexedDbVault';
import { loadDeepProfileData, mergeDeepPayloadsIntoMachines } from '../utils/indexedDbDeepStorage';
import { pruneMachineTombstones } from '../utils/machineTombstones';
import { mergeWorkspaces, resolveSyncBaseline, type ConflictChoice, type SyncWorkspace } from '../utils/syncMerge';
import { buildSyncFile, parseSyncPayload } from '../utils/syncFile';
import { getOrCreateDeviceId, readSyncState, recordMergedPeer } from '../utils/syncState';
import { withSyncLock } from '../utils/syncLock';

class SyncAbort extends Error {
  constructor(readonly result: MergeBackupResult) {
    super(result.status);
  }
}

type StoreState = ReturnType<typeof useCtfStore.getState>;

/** Machines with the running timer folded in (what a save or an export would write). */
function machinesWithActiveTimer(state: Pick<StoreState, 'machines' | 'activeTargetId' | 'activeTimerSeconds'>): Machine[] {
  if (!state.activeTargetId || state.activeTimerSeconds <= 0) return state.machines;
  return state.machines.map((m) =>
    m.id === state.activeTargetId && state.activeTimerSeconds > (m.timeSpentSeconds || 0)
      ? withTimeSpent(m, state.activeTimerSeconds)
      : m
  );
}

/** Fills writeups/notes that only live in IndexedDB deep storage (quota-pruned), so a merge sees all of them. */
async function withDeepWriteups(machines: Machine[], profileId: string): Promise<Machine[]> {
  try {
    const deep = await loadDeepProfileData(profileId);
    return deep?.writeups ? mergeDeepPayloadsIntoMachines(machines, deep.writeups) : machines;
  } catch {
    return machines;
  }
}

export async function exportSyncFile(): Promise<string> {
  const get = useCtfStore.getState;
  const profileId = get().currentProfileId || 'guest';
  const machines = await withDeepWriteups(machinesWithActiveTimer(get()), profileId);
  return buildSyncFile(
    get().exportBackup(),
    { deviceId: getOrCreateDeviceId(), syncedAt: new Date().toISOString(), syncPeers: readSyncState(profileId).peers },
    { machines, deletedMachineIds: pruneMachineTombstones(get().deletedMachineIds) }
  );
}

export async function mergeBackup(jsonStr: string, resolutions?: Record<string, ConflictChoice>): Promise<MergeBackupResult> {
  const get = useCtfStore.getState;
  const set = useCtfStore.setState;
  const remote = parseSyncPayload(jsonStr);
  if (!remote) return { status: 'invalid' };
  const profileId = get().currentProfileId || 'guest';
  const deviceId = getOrCreateDeviceId();
  // Full catalog first: pristine catalog rows in the file are then recognised as such.
  await get().loadCatalog();

  const compute = async () => {
    const state = get();
    const syncState = readSyncState(profileId);
    const local: SyncWorkspace & { peerMachineBases: Record<string, Record<string, string>> } = {
      deviceId,
      syncPeers: syncState.peers,
      peerMachineBases: syncState.bases,
      machines: await withDeepWriteups(machinesWithActiveTimer(state), profileId),
      deletedMachineIds: state.deletedMachineIds,
      customNotes: state.customNotes,
      userNotes: state.userNotes,
      userWikilinkMap: state.userWikilinkMap,
      deletedNoteIds: state.deletedNoteIds,
      activitySessions: state.activitySessions,
      graphEdges: state.graphEdges,
      credentials: state.credentials,
      credAttempts: state.credAttempts,
      lootItems: state.lootItems,
    };
    const baseline = resolveSyncBaseline(local, remote);
    return { baseline, ...mergeWorkspaces(local, remote, baseline, { resolutions }) };
  };

  // Preview outside the lock: unresolved conflicts go back to the UI and nothing is written.
  const preview = await compute();
  if (preview.conflicts.length > 0) {
    return { status: 'conflicts', conflicts: preview.conflicts, summary: preview.summary };
  }

  try {
    const locked = await withSyncLock(async () => {
      // Other tabs are held off now and their in-flight saves have landed: recompute on the latest state.
      const result = await compute();
      if (result.conflicts.length > 0) {
        throw new SyncAbort({ status: 'conflicts', conflicts: result.conflicts, summary: result.summary });
      }
      flushProfileSave();
      const snapshot = await takePreSyncSnapshot(profileId);
      // 'empty': nothing stored yet, so there is nothing a merge could overwrite.
      if (snapshot !== 'saved' && snapshot !== 'duplicate' && snapshot !== 'empty') {
        throw new SyncAbort({ status: 'snapshot-failed' });
      }

      const m = result.merged;
      const state = get();
      const machines = mergeMachinesWithCatalog(m.machines, state.userSolvesReset);
      // COMMIT POINT. Anything that throws above aborts (other tabs are released, nothing was written).
      // From set() on the merged state is live in this tab, so the merge must finish: every save below is
      // isolated, failures become warnings, and RESTORED is always posted so the other tabs reload onto it
      // instead of re-flushing their pre-merge state over it.
      // Device-local data (globalVars, theme, goals, node positions, cheatsheets, active target) is untouched.
      set({
        machines,
        deletedMachineIds: m.deletedMachineIds,
        customNotes: m.customNotes,
        userNotes: m.userNotes,
        userWikilinkMap: m.userWikilinkMap,
        deletedNoteIds: m.deletedNoteIds,
        activitySessions: m.activitySessions,
        graphEdges: m.graphEdges,
        credentials: m.credentials,
        credAttempts: m.credAttempts,
        lootItems: m.lootItems,
      });
      const warnings: string[] = [];
      const attempt = async (label: string, run: () => unknown) => {
        try {
          await run();
        } catch (e) {
          console.warn(`[ZeroBox] Sync merge: ${label} failed after the merge was applied`, e);
          warnings.push(`${label} could not be saved (${e instanceof Error ? e.message : String(e)}).`);
        }
      };
      await attempt('Profile', () => {
        get().saveProfileData(profileId);
        flushProfileSave();
      });
      await attempt('Custom machines', () => saveCustomMachinesToStorage(machines, profileId));
      await attempt('Credentials and loot', () => saveLootState(profileId, m));
      await attempt('Attack graph', () => saveAttackGraphState(get().graphNodePositions, m.graphEdges, profileId));
      if (m.userNotes.length !== (state.userNotes || []).length) {
        await attempt('Vault notes', () => saveVaultToIndexedDb({ notes: m.userNotes, wikilinkMap: m.userWikilinkMap }));
      }
      await attempt('Sync baseline', () => recordMergedPeer(profileId, remote.deviceId, remote.syncedAt, result.machineBase));
      return { summary: result.summary, snapshot, legacy: result.baseline === null, warnings };
    });
    if (locked.status !== 'applied') return { status: locked.status };
    return { status: 'merged', ...locked.value };
  } catch (err) {
    if (err instanceof SyncAbort) return err.result;
    console.error('[ZeroBox] Sync merge failed:', err);
    return { status: 'failed', error: err instanceof Error ? err.message : String(err) };
  }
}

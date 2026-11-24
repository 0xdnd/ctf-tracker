/**
 * Workspace store: boot, slice assembly and the runtime wiring that needs the live store (profile autosave,
 * cross-tab sync, deep-storage hydration). The state and actions live in ./slices/*.
 *
 * Import rule: only this module imports the slice files. Slices call back into the few helpers exported here
 * (flushProfileSave, flushPendingProfileSave, cancelPendingProfileSave, nextProfileLoadGeneration, applyVaultWrite,
 * hydrateDeepProfile)
 * strictly at call time, never while their module evaluates, so the import cycle is safe. Nothing outside src/store
 * imports this file: the public entry point is ./useCtfStore.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addMachineTombstone, normalizeMachineTombstones } from '../utils/machineTombstones';
import { loadLootState, getLootStorageKey, parseLootPayload } from './lootPersistence';
import { isGenuineCustom } from './machineNormalization';
import type { CptsNoteEntry } from '../utils/obsidianManualUtils';
import { loadVaultFromIndexedDb, loadVaultStrict, type VaultMutationResult } from '../utils/indexedDbVault';
import {
  extractDeepWriteups,
  mergeDeepPayloadsIntoMachines,
  saveDeepProfileData,
  loadDeepProfileData,
} from '../utils/indexedDbDeepStorage';
import { saveWorkspaceToIdb, loadWorkspaceFromIdb } from '../utils/resilientStorage';
import {
  SCHEMA_VERSION_STORAGE_KEY,
  isSchemaWriteGated,
  isNewerSchemaVersion,
  engageSchemaWriteGate,
  onSchemaWriteGateEngaged,
  onSchemaWriteGateReleased,
  initSchemaVersionGate,
  recordSchemaVersion,
} from '../utils/schemaWriteGate';
import {
  initRestoreLockGate,
  handleRestoreLockStorageEvent,
  handleRestoreBroadcast,
  onRestoreLockReleased,
} from './preMigrationBackup';
import { syncChannel } from '../utils/crossTabChannel';
import { useToastStore } from './useToastStore';
import { toLeanMachines, mergeMachinesWithCatalog } from './ctfCatalog';
import { isoMs, mergeIncomingMachines, mergeIncomingNotes } from './ctfCrossTabMerge';
import {
  foldActiveTimer,
  deletedMachineSessionReset,
  overlayActiveTimer,
  timerSecondsFor,
} from './ctfMachineHelpers';
import { ctfPersistOptions } from './ctfPersist';
import {
  getProfileStorageKey,
  inMemoryFallbackStorage,
  safeLocalStorage,
  writeProfilePayload,
  getAttackGraphStorageKey,
  claimLegacyAttackGraphOnce,
  loadInitialAttackGraphState,
  getInitialProfileId,
  loadInitialProfileData,
} from './ctfStorage';
import { CtfStoreState, CtfBootData } from './ctfStoreTypes';
import { broadcastCrossTabMessage, broadcastVaultNotesUpdated, adoptStoredVaultNotes } from './ctfVaultNotes';
import { createGraphSlice } from './slices/graphSlice';
import { createLootSlice } from './slices/lootSlice';
import { createMachinesSlice } from './slices/machinesSlice';
import { createNotesSlice } from './slices/notesSlice';
import { createProfileSlice } from './slices/profileSlice';
import { createTimerSlice } from './slices/timerSlice';
import { createUiSlice } from './slices/uiSlice';

let profileLoadGeneration = 0;

/** Starts a new profile load and returns its generation (a slice cannot assign this module-level counter). */
export function nextProfileLoadGeneration(): number {
  return ++profileLoadGeneration;
}

// Version write gate: must be decided before the store boots (hydration writes synchronously).
export const SCHEMA_GATE_TOAST_MESSAGE = 'ZeroBox was updated in another tab — reload to continue.';
onSchemaWriteGateEngaged((reason) => {
  if (reason !== 'newer-schema') return;
  console.warn('[ZeroBox] Newer data schema detected; this tab will not write to storage until reloaded.');
  // durationMs 0 = sticky (never auto-dismissed)
  useToastStore.getState().addToast({ type: 'warning', title: 'Reload required', message: SCHEMA_GATE_TOAST_MESSAGE, durationMs: 0 });
});
initSchemaVersionGate();
// Another tab mid-restore gates this one before hydration; a stale (>60 s) lock is cleared instead.
initRestoreLockGate();

const initialProfileId = getInitialProfileId();
const initialProfileData = loadInitialProfileData(initialProfileId);
const initialAttackGraphData = loadInitialAttackGraphState(initialProfileId);
const initialLootData = loadLootState(initialProfileId);
// First load with no saved profile data starts clean (the same state "Reset to 0%" produces); the sample set stays
// opt-in. 'usr_daniel' keeps its sample roster, and any saved profile keeps its own flag.
const bootUserSolvesReset = initialProfileData
  ? Boolean(initialProfileData.userSolvesReset)
  : initialProfileId !== 'usr_daniel';
const boot: CtfBootData = {
  initialProfileId,
  initialProfileData,
  initialAttackGraphData,
  initialLootData,
  bootUserSolvesReset,
};

export const useCtfStore = create<CtfStoreState>()(
  persist(
    (...a) => ({
      ...createMachinesSlice(boot)(...a),
      ...createTimerSlice(boot)(...a),
      ...createNotesSlice(boot)(...a),
      ...createGraphSlice(boot)(...a),
      ...createLootSlice(boot)(...a),
      ...createUiSlice(...a),
      ...createProfileSlice(boot)(...a),
    }),
    ctfPersistOptions
  )
);

// Hydration is done (and any newer persisted blob has engaged the gate): record our schema version.
recordSchemaVersion();

// Loot and the attack graph were loaded for the auth session's profile, but the persisted blob can name another
// one (it wins during hydration). Reload them for the profile this tab actually ended up on, or the next loot or
// graph save would write that profile's data under another profile's key.
const bootProfileId = useCtfStore.getState().currentProfileId || 'guest';
const legacyGraphClaimedFor = claimLegacyAttackGraphOnce();
if (bootProfileId !== initialProfileId) {
  useCtfStore.setState({ ...loadInitialAttackGraphState(bootProfileId), ...loadLootState(bootProfileId) });
} else if (legacyGraphClaimedFor === bootProfileId) {
  useCtfStore.setState(loadInitialAttackGraphState(bootProfileId));
}

/**
 * The IndexedDB workspace copy (zb:workspace:<profile>) is written with every profile save. Decide now, before
 * anything writes, whether localStorage lost that data or holds an older copy (e.g. its write hit the quota):
 * 'missing' when neither the profile key nor the persisted blob exists, else the profile copy's savedAt stamp
 * (null when it has none, i.e. written by an older build, so it can't be compared and is trusted).
 */
const bootResilientCheck: 'missing' | number | null = (() => {
  if (typeof window === 'undefined') return null;
  const raw = safeLocalStorage.getItem(getProfileStorageKey(bootProfileId));
  if (!raw) return safeLocalStorage.getItem('zerobox-tactical-store') ? null : 'missing';
  try {
    const savedAt = Date.parse(JSON.parse(raw)?.savedAt);
    return Number.isFinite(savedAt) ? savedAt : null;
  } catch {
    return null;
  }
})();

/** Whether the stored workspace carries its own customNotes list (then an empty one means "all deleted"). */
const bootHasNotesList = (() => {
  if (typeof window === 'undefined') return false;
  for (const key of [getProfileStorageKey(bootProfileId), 'zerobox-tactical-store']) {
    try {
      const parsed = JSON.parse(safeLocalStorage.getItem(key) || 'null');
      if (Array.isArray((parsed?.state || parsed)?.customNotes)) return true;
    } catch { /* unreadable or corrupt blob; try the next storage key */ }
  }
  return false;
})();

const DEEP_LOAD_RETRY_DELAYS_MS = [2_000, 10_000, 30_000];

/**
 * Loads a profile's deep record (writeup/quick-note bodies, custom notes) into the store. Applied only while the
 * same profile load is still current (no later switch: generation + profile id), and isDeepStorageLoaded only
 * turns true once the read really succeeded: until then flushes skip the deep write, so a failed read can never
 * lead to an empty deep record erasing bodies that only live in IndexedDB. A failed read is retried a few times.
 */
export function hydrateDeepProfile(profileId: string, gen: number, options: { refillNotes?: boolean } = {}, attempt = 0) {
  const isCurrent = () =>
    gen === profileLoadGeneration && (useCtfStore.getState().currentProfileId || 'guest') === profileId;
  loadDeepProfileData(profileId).then(
    (deep) => {
      if (!isCurrent()) return;
      const state = useCtfStore.getState();
      const patch: Partial<CtfStoreState> = { isDeepStorageLoaded: true };
      if (deep?.writeups && Object.keys(deep.writeups).length > 0) {
        const merged = mergeDeepPayloadsIntoMachines(state.machines, deep.writeups);
        if (merged !== state.machines) patch.machines = merged;
      }
      // Only for a workspace saved without a notes list (older or quota-stripped copies); an empty list is a deletion.
      if (options.refillNotes && deep?.customNotes?.length && state.customNotes.length === 0) {
        patch.customNotes = deep.customNotes as CptsNoteEntry[];
      }
      useCtfStore.setState(patch);
    },
    (err) => {
      if (!isCurrent()) return;
      console.warn('[ZeroBox] Could not read deep storage; deep saves stay off until it loads.', err);
      const delay = DEEP_LOAD_RETRY_DELAYS_MS[attempt];
      if (delay !== undefined) setTimeout(() => hydrateDeepProfile(profileId, gen, options, attempt + 1), delay);
    }
  );
}

/** The hydrated workspace, to tell user edits from boot-time changes (catalog merge, deep hydration). */
const bootProfileSnapshot = useCtfStore.getState();

/** True once the user changed profile data after boot (machine edits stamp updatedAt; new customs are added). */
function profileEditedSinceBoot(state: CtfStoreState): boolean {
  const b = bootProfileSnapshot;
  if (
    state.activeTargetId !== b.activeTargetId ||
    state.globalVars !== b.globalVars ||
    state.cheatsheets !== b.cheatsheets ||
    state.activitySessions !== b.activitySessions ||
    state.customNotes !== b.customNotes ||
    state.deletedNoteIds !== b.deletedNoteIds ||
    state.notesEpoch !== b.notesEpoch ||
    state.tombstonesEpoch !== b.tombstonesEpoch ||
    state.deletedMachineIds !== b.deletedMachineIds ||
    state.userSolvesReset !== b.userSolvesReset
  ) {
    return true;
  }
  const atBoot = new Map(b.machines.map((m) => [m.id, m] as const));
  return state.machines.some((m) => {
    const was = atBoot.get(m.id);
    return was ? isoMs(m.updatedAt) > isoMs(was.updatedAt) : isGenuineCustom(m);
  });
}

/** The IndexedDB workspace copy: the persisted profile fields plus the save timestamp. */
type ResilientWorkspaceCopy = Partial<CtfStoreState> & { savedAt?: string };

async function restoreFromResilientCopy(profileId: string, check: 'missing' | number | null) {
  if (check === null) return;
  const copy = await loadWorkspaceFromIdb<ResilientWorkspaceCopy>(`zb:workspace:${profileId}`).catch(() => null);
  if (!copy || !Array.isArray(copy.machines)) return;
  if (check !== 'missing' && !(Date.parse(String(copy.savedAt)) > check)) return;
  // Gated (newer schema or a restore in progress) or switched profile meanwhile: leave everything alone.
  if (isSchemaWriteGated() || (useCtfStore.getState().currentProfileId || 'guest') !== profileId) return;
  // The user already worked in this tab: restoring would replace those edits. Keep them (they get saved).
  if (profileEditedSinceBoot(useCtfStore.getState())) return;
  const userSolvesReset = Boolean(copy.userSolvesReset);
  const machines = mergeMachinesWithCatalog(copy.machines, userSolvesReset);
  const activeTargetId = typeof copy.activeTargetId === 'string' ? copy.activeTargetId : null;
  useCtfStore.setState((s) => ({
    machines,
    activeTargetId,
    isTimerRunning: false,
    timerLastTick: null,
    activeTimerSeconds: timerSecondsFor(machines, activeTargetId),
    userSolvesReset,
    globalVars: copy.globalVars || s.globalVars,
    cheatsheets: Array.isArray(copy.cheatsheets) ? copy.cheatsheets : s.cheatsheets,
    activitySessions: Array.isArray(copy.activitySessions) ? copy.activitySessions : s.activitySessions,
    customNotes: Array.isArray(copy.customNotes) ? copy.customNotes : s.customNotes,
    deletedNoteIds: Array.isArray(copy.deletedNoteIds) ? copy.deletedNoteIds : s.deletedNoteIds,
    notesEpoch: typeof copy.notesEpoch === 'string' ? copy.notesEpoch : s.notesEpoch,
    tombstonesEpoch: typeof copy.tombstonesEpoch === 'string' ? copy.tombstonesEpoch : s.tombstonesEpoch,
    deletedMachineIds: normalizeMachineTombstones(copy.deletedMachineIds ?? s.deletedMachineIds),
  }));
  console.warn('[ZeroBox] Restored the workspace from the IndexedDB copy (localStorage was missing or older).');
  flushProfileSave();
}

// Timer fields are transient, so a tab that closed or crashed with the timer running always boots paused and
// never counts the downtime. Seed the display from the active machine's last saved time, or the next
// start/pause/switch would continue from 0 and overwrite that saved time.
{
  const booted = useCtfStore.getState();
  useCtfStore.setState({
    isTimerRunning: false,
    timerLastTick: null,
    activeTimerSeconds: timerSecondsFor(booted.machines, booted.activeTargetId),
  });
}

// Selective, high-performance profile auto-save
// Guards against 1Hz timer ticks, uses debouncing with maxWait cap, and flushes on tab close
let lastSavedMachines = useCtfStore.getState().machines;
let lastSavedTargetId = useCtfStore.getState().activeTargetId;
let lastSavedGlobalVars = useCtfStore.getState().globalVars;
let lastSavedCheatsheets = useCtfStore.getState().cheatsheets;
let lastSavedSessions = useCtfStore.getState().activitySessions;
let lastSavedCustomNotes = useCtfStore.getState().customNotes;
let lastSavedDeletedNoteIds = useCtfStore.getState().deletedNoteIds;
let lastSavedNotesEpoch = useCtfStore.getState().notesEpoch;
let lastSavedTombstonesEpoch = useCtfStore.getState().tombstonesEpoch;
let lastSavedDeletedMachineIds = useCtfStore.getState().deletedMachineIds;
let lastSavedUserSolvesReset = useCtfStore.getState().userSolvesReset;
let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
/** True while this tab applies profile data another tab just wrote (see the storage listener). */
let applyingExternalProfile = false;

function markProfileSaved(state: CtfStoreState) {
  lastSavedMachines = state.machines;
  lastSavedTargetId = state.activeTargetId;
  lastSavedGlobalVars = state.globalVars;
  lastSavedCheatsheets = state.cheatsheets;
  lastSavedSessions = state.activitySessions;
  lastSavedCustomNotes = state.customNotes;
  lastSavedDeletedNoteIds = state.deletedNoteIds;
  lastSavedNotesEpoch = state.notesEpoch;
  lastSavedTombstonesEpoch = state.tombstonesEpoch;
  lastSavedDeletedMachineIds = state.deletedMachineIds;
  lastSavedUserSolvesReset = state.userSolvesReset;
}

function hasUnsavedProfileChanges(state: CtfStoreState) {
  return (
    state.machines !== lastSavedMachines ||
    state.activeTargetId !== lastSavedTargetId ||
    state.globalVars !== lastSavedGlobalVars ||
    state.cheatsheets !== lastSavedCheatsheets ||
    state.activitySessions !== lastSavedSessions ||
    state.customNotes !== lastSavedCustomNotes ||
    state.deletedNoteIds !== lastSavedDeletedNoteIds ||
    state.notesEpoch !== lastSavedNotesEpoch ||
    state.tombstonesEpoch !== lastSavedTombstonesEpoch ||
    state.deletedMachineIds !== lastSavedDeletedMachineIds ||
    state.userSolvesReset !== lastSavedUserSolvesReset
  );
}

/** Drops the scheduled debounced/maxWait save without writing it. */
export function cancelPendingProfileSave() {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  if (maxWaitTimer) {
    clearTimeout(maxWaitTimer);
    maxWaitTimer = null;
  }
}

/** Save point (stop, switch, reset, checkpoint): write now, but only if something is still unsaved. */
export function flushPendingProfileSave() {
  if (hasUnsavedProfileChanges(useCtfStore.getState())) flushProfileSave();
}

export function flushProfileSave() {
  cancelPendingProfileSave();
  // Debounced, maxWait, beforeunload, visibility and Tauri-close saves all land here. While gated (newer schema,
  // or a restore in this or another tab) nothing is written and the lastSaved markers stay put, so a released
  // restore lock can re-flush the still-unsaved state.
  if (typeof window === 'undefined' || isSchemaWriteGated()) return;
  const state = useCtfStore.getState();
  if (!state.currentProfileId) return;

  const persistedMachines = overlayActiveTimer(state);

  // Optimize localStorage footprint: Strip large static catalog walkthroughs & synopses
  // from storage payload since they are deterministically rehydrated from INITIAL_MACHINES on load.
  const storageLeanMachines = toLeanMachines(persistedMachines);

  // Dual-tier: asynchronously save deep payloads (writeups & notes) to IndexedDB
  const deepWriteups = extractDeepWriteups(persistedMachines);
  // Always written, even when empty: skipping the empty case left the old record in place, and it refilled the
  // cleared writeups/notes on the next load. Not before this profile's deep data has loaded, though: until then
  // the machines may lack bodies that only live in IndexedDB (lean quota saves), and writing would erase them.
  if (state.isDeepStorageLoaded) {
    saveDeepProfileData(state.currentProfileId, {
      writeups: deepWriteups,
      customNotes: state.customNotes,
    });
  }

  const payload = {
    machines: storageLeanMachines,
    activeTargetId: state.activeTargetId,
    globalVars: state.globalVars,
    cheatsheets: state.cheatsheets,
    activitySessions: state.activitySessions,
    customNotes: state.customNotes,
    deletedNoteIds: state.deletedNoteIds,
    notesEpoch: state.notesEpoch,
    tombstonesEpoch: state.tombstonesEpoch,
    deletedMachineIds: state.deletedMachineIds,
    userSolvesReset: state.userSolvesReset,
  };
  const { saved, savedAt } = writeProfilePayload(state.currentProfileId, payload);
  // Same stamp on the IndexedDB copy as on the localStorage copy: boot compares them (restoreFromResilientCopy).
  // Written even when localStorage failed (quota), so that newer copy can be restored after a reload.
  saveWorkspaceToIdb(`zb:workspace:${state.currentProfileId}`, { ...payload, savedAt }).catch(() => {});
  // Only a write that reached disk is a save: on failure the markers stay put, so the next save point retries.
  if (saved) {
    markProfileSaved(state);
    broadcastCrossTabMessage('WRITEUPS_UPDATED', { profileId: state.currentProfileId });
  }
}

/**
 * Another tab wrote the vault: show what is stored now. A failed read changes nothing (it is not "empty"); a
 * missing record means the vault was cleared. Local notes with a newer in-flight save are kept.
 */
async function reloadVaultFromOtherTab() {
  try {
    const vault = await loadVaultStrict();
    const notes = Array.isArray(vault?.notes) ? vault.notes : [];
    useCtfStore.setState((s) => ({
      userNotes: adoptStoredVaultNotes(s.userNotes || [], notes),
      userWikilinkMap: vault?.wikilinkMap && typeof vault.wikilinkMap === 'object' ? vault.wikilinkMap : {},
    }));
  } catch (err) {
    console.warn('[ZeroBox] Could not reload notes changed in another tab', err);
  }
}

/** Profile-persisted fields: a change to any of these needs a profile save. */
const profileFieldsDiffer = (a: CtfStoreState, b: CtfStoreState) =>
  a.machines !== b.machines ||
  a.activeTargetId !== b.activeTargetId ||
  a.globalVars !== b.globalVars ||
  a.cheatsheets !== b.cheatsheets ||
  a.activitySessions !== b.activitySessions ||
  a.customNotes !== b.customNotes ||
  a.deletedNoteIds !== b.deletedNoteIds ||
  a.notesEpoch !== b.notesEpoch ||
  a.tombstonesEpoch !== b.tombstonesEpoch ||
  a.deletedMachineIds !== b.deletedMachineIds ||
  a.userSolvesReset !== b.userSolvesReset;

useCtfStore.subscribe((state, prev) => {
  if (typeof window === 'undefined' || !state.currentProfileId) return;

  // Data another tab just saved is already in storage: writing it back would only bounce between the tabs.
  if (applyingExternalProfile) return;

  // Selective Persistence Check: Only trigger if persisted data actually changed!
  // Prevents 1Hz timer ticks (activeTimerSeconds) from ever touching localStorage!
  if (!hasUnsavedProfileChanges(state)) return;

  // The timer just stopped (pause, root/completed, target cleared): that is a save point, write now.
  if (prev.isTimerRunning && !state.isTimerRunning) {
    flushProfileSave();
    return;
  }

  // A pending save is already scheduled and this update (e.g. a 1 Hz timer tick) changed nothing persisted:
  // leave the debounce alone, otherwise ticks would keep pushing it back until the maxWait cap.
  if (saveDebounceTimer && !profileFieldsDiffer(state, prev)) return;

  // Debounce with maxWait cap (5000ms max)
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  if (!maxWaitTimer) {
    maxWaitTimer = setTimeout(flushProfileSave, 5000);
  }
  saveDebounceTimer = setTimeout(flushProfileSave, 1200);
});

/** Writes the current persisted snapshot of the tactical store (no-op when unchanged or still gated). */
function flushTacticalBlob() {
  if (isSchemaWriteGated()) return;
  const { storage, partialize, name, version } = useCtfStore.persist.getOptions();
  if (!storage || !partialize || !name) return;
  void storage.setItem(name, { state: partialize(useCtfStore.getState()), version });
}

/**
 * Close/background save: fold the live timer into the active machine first, so the persisted store blob (which
 * wins at boot) carries the exact seconds too, not just the profile copy. Then write through the usual path.
 */
export function checkpointTimerAndFlush() {
  const state = useCtfStore.getState();
  const folded = foldActiveTimer(state);
  if (folded !== state.machines) useCtfStore.setState({ machines: folded });
  flushProfileSave();
}

// Flush immediately on tab close or backgrounding
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', checkpointTimerAndFlush);
  // pagehide also fires where beforeunload doesn't (mobile Safari, bfcache navigations): same save as hidden.
  window.addEventListener('pagehide', checkpointTimerAndFlush);
  // An aborted restore in another tab released our gate: save whatever was held back while it was engaged.
  onRestoreLockReleased(flushProfileSave);
  // Same for the tactical persist blob: changes made while gated were never written (see storage.setItem).
  onSchemaWriteGateReleased(flushTacticalBlob);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      checkpointTimerAndFlush();
    } else if (document.visibilityState === 'visible') {
      if (useCtfStore.getState().isTimerRunning) {
        useCtfStore.getState().tickTimer();
      }
    }
  });

  // Cross-tab auto-sync: Reconcile external storage modifications across open tabs
  window.addEventListener('storage', (event) => {
    // Another tab's write (or removal, or clear) is newer than any copy this tab holds in memory after a failed
    // write: drop that copy so reads (e.g. a STATE_UPDATED reload) see the other tab's data, not our stale one.
    // Our own unsaved state stays in the store and is retried at the next save.
    if (event.key === null) inMemoryFallbackStorage.clear();
    else inMemoryFallbackStorage.delete(event.key);
    // Restore lock set/cleared by another tab (handled before the newValue check: clearing has newValue null)
    if (handleRestoreLockStorageEvent(event.key, event.newValue)) return;
    if (!event.key || !event.newValue) return;
    if (event.key === SCHEMA_VERSION_STORAGE_KEY) {
      if (isNewerSchemaVersion(event.newValue)) engageSchemaWriteGate('newer-schema');
      return;
    }
    const currentProfileId = useCtfStore.getState().currentProfileId || 'guest';
    const profileKey = getProfileStorageKey(currentProfileId);
    if (event.key === profileKey || event.key === 'zerobox-tactical-store') {
      try {
        const parsed = JSON.parse(event.newValue);
        const data = parsed.state || parsed;
        // The persisted store blob is shared by every tab: one on another profile must not hand us its data,
        // or our next save would write it under this profile's keys.
        const fromOtherProfile =
          event.key === 'zerobox-tactical-store' && (data?.currentProfileId || 'guest') !== currentProfileId;
        if (!fromOtherProfile && data && Array.isArray(data.machines)) {
          const userSolvesReset = Boolean(data.userSolvesReset);
          const state = useCtfStore.getState();
          // Same profile in two tabs: this tab's not-yet-saved edits survive per machine when newer (else the
          // last writer replaced every machine). Returns `incoming` itself when nothing of ours is kept.
          const theirs = mergeMachinesWithCatalog(data.machines, userSolvesReset);
          const incoming = mergeIncomingMachines(
            state.machines,
            theirs,
            new Set(lastSavedMachines),
            [...normalizeMachineTombstones(data.deletedMachineIds), ...state.deletedMachineIds]
          );
          const activeTargetId = 'activeTargetId' in data ? (data.activeTargetId ?? null) : state.activeTargetId;
          const targetChanged = activeTargetId !== state.activeTargetId;
          // The other tab switched target: keep this tab's seconds on the old target (never lowering it), then
          // stop and show the new target's saved time.
          const machines = targetChanged
            ? foldActiveTimer({ machines: incoming, activeTargetId: state.activeTargetId, activeTimerSeconds: state.activeTimerSeconds })
            : incoming;
          const savedSeconds = timerSecondsFor(machines, activeTargetId);
          // Same target: a running timer never goes down (two running tabs converge on the larger value); a
          // paused one mirrors the saved time (another tab may have checkpointed or reset it).
          const timer = targetChanged
            ? { isTimerRunning: false, timerLastTick: null, activeTimerSeconds: savedSeconds }
            : { activeTimerSeconds: state.isTimerRunning ? Math.max(state.activeTimerSeconds, savedSeconds) : savedSeconds };
          // Authored notes merge per note (see mergeIncomingNotes) instead of the last writer replacing the list.
          const notes = mergeIncomingNotes(
            {
              customNotes: state.customNotes,
              deletedNoteIds: state.deletedNoteIds,
              notesEpoch: state.notesEpoch,
              tombstonesEpoch: state.tombstonesEpoch,
            },
            {
              customNotes: Array.isArray(data.customNotes) ? data.customNotes : state.customNotes,
              deletedNoteIds: Array.isArray(data.deletedNoteIds) ? data.deletedNoteIds : state.deletedNoteIds,
              // Absent in payloads written before the field existed: epoch 0.
              notesEpoch: typeof data.notesEpoch === 'string' ? data.notesEpoch : null,
              tombstonesEpoch: typeof data.tombstonesEpoch === 'string' ? data.tombstonesEpoch : null,
            }
          );
          // Nothing of ours to add and nothing pending: what we apply is already stored, so don't write it back.
          // (When the merged notes differ from what is stored they must be written back so storage converges.)
          const echoOnly = machines === theirs && !notes.differs && !saveDebounceTimer && !maxWaitTimer;
          applyingExternalProfile = echoOnly;
          try {
            useCtfStore.setState((s) => ({
              userSolvesReset,
              machines,
              activeTargetId,
              ...timer,
              globalVars: data.globalVars || s.globalVars,
              cheatsheets: data.cheatsheets || s.cheatsheets,
              activitySessions: Array.isArray(data.activitySessions) ? data.activitySessions : s.activitySessions,
              customNotes: notes.customNotes,
              deletedNoteIds: notes.deletedNoteIds,
              notesEpoch: notes.notesEpoch,
              tombstonesEpoch: notes.tombstonesEpoch,
              deletedMachineIds: Array.isArray(data.deletedMachineIds)
                ? normalizeMachineTombstones(data.deletedMachineIds)
                : s.deletedMachineIds,
            }));
          } finally {
            applyingExternalProfile = false;
          }
          if (echoOnly) markProfileSaved(useCtfStore.getState());
        }
      } catch (err) {
        console.warn('[ZeroBox] Failed to synchronize cross-tab storage event', err);
      }
    }

    if (event.key === getLootStorageKey(currentProfileId)) {
      const loot = parseLootPayload(event.newValue);
      if (loot) useCtfStore.setState(loot);
    }

    if (event.key === getAttackGraphStorageKey(currentProfileId)) {
      try {
        const parsed = JSON.parse(event.newValue);
        const positions = parsed.graphNodePositions || parsed.nodePositions || {};
        const edges = Array.isArray(parsed.graphEdges)
          ? parsed.graphEdges
          : Array.isArray(parsed.edges)
          ? parsed.edges
          : [];
        useCtfStore.setState({
          graphNodePositions: positions,
          graphEdges: edges,
        });
      } catch (err) {
        console.warn('[ZeroBox] Failed to synchronize cross-tab attack graph storage', err);
      }
    }
  });

  // Cross-tab BroadcastChannel listener for deep storage updates
  syncChannel?.addEventListener('message', async (event) => {
    if (handleRestoreBroadcast(event.data)) return;
    const { type, payload } = event.data || {};
    const currentProfileId = useCtfStore.getState().currentProfileId || 'guest';
    if (type === 'NOTES_UPDATED') {
      // The vault is one global IndexedDB record (no profile in its key, and boot loads it without one), so this
      // applies whatever profile either tab is on. Reload only: never re-broadcast, never write.
      if (payload?.source === 'vault') void reloadVaultFromOtherTab();
      return;
    }
    if (type === 'WRITEUPS_UPDATED') {
      if (!payload?.profileId || payload.profileId === currentProfileId) {
        try {
          const deep = await loadDeepProfileData(currentProfileId);
          if (deep?.writeups && Object.keys(deep.writeups).length > 0) {
            const currentMachines = useCtfStore.getState().machines;
            const merged = mergeDeepPayloadsIntoMachines(currentMachines, deep.writeups);
            useCtfStore.setState({ machines: merged });
          }
        } catch (err) {
          console.warn('[ZeroBox] Could not sync writeups from BroadcastChannel:', err);
        }
      }
    } else if (type === 'MACHINE_ADDED' && payload?.machine) {
      if (!payload?.profileId || payload.profileId === currentProfileId) {
        useCtfStore.setState((s) => {
          if (s.machines.some((m) => m.id === payload.machine.id)) return s;
          return { machines: [payload.machine, ...s.machines] };
        });
      }
    } else if (type === 'MACHINE_DELETED' && payload?.id) {
      if (!payload?.profileId || payload.profileId === currentProfileId) {
        // Record the tombstone here too, or this tab's next save would drop it.
        const deletedAt = typeof payload.deletedAt === 'string' ? Date.parse(payload.deletedAt) : NaN;
        useCtfStore.setState((s) => ({
          machines: s.machines.filter((m) => m.id !== payload.id),
          deletedMachineIds: addMachineTombstone(
            s.deletedMachineIds,
            payload.id,
            Number.isFinite(deletedAt) ? deletedAt : Date.now()
          ),
          ...deletedMachineSessionReset(s, payload.id),
        }));
      }
    } else if (type === 'STATE_UPDATED') {
      const profileData = loadInitialProfileData(currentProfileId);
      if (profileData && Array.isArray(profileData.machines)) {
        useCtfStore.setState({
          machines: mergeMachinesWithCatalog(profileData.machines, profileData.userSolvesReset),
          globalVars: profileData.globalVars || useCtfStore.getState().globalVars,
          cheatsheets: profileData.cheatsheets || useCtfStore.getState().cheatsheets,
        });
      }
    }
  });

  // Tauri v2 native close listener: flush profile immediately before process destruction
  const isTauri = Boolean((window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ || (window as unknown as Record<string, unknown>).__TAURI__);
  if (isTauri) {
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen('tauri-app-close-requested', () => {
        checkpointTimerAndFlush();
      });
    }).catch(() => {});
  }

  restoreFromResilientCopy(bootProfileId, bootResilientCheck);

  // Asynchronously hydrate the user's imported notes from IndexedDB
  loadVaultFromIndexedDb().then((vault) => {
    if (vault?.notes && vault.notes.length > 0) {
      useCtfStore.getState().setUserNotes(vault.notes);
      if (vault.wikilinkMap) {
        useCtfStore.getState().setUserWikilinkMap(vault.wikilinkMap);
      }
    }
  }).catch((err) => {
    console.warn('[ZeroBox] Could not hydrate user notes from IndexedDB', err);
  });

  // Asynchronously hydrate deep writeup payloads from IndexedDB
  hydrateDeepProfile(bootProfileId, profileLoadGeneration, { refillNotes: !bootHasNotesList });
}

/** After a vault mutation: show what was stored (other tabs' changes included) and tell the other tabs. */
export function applyVaultWrite(written: VaultMutationResult | null, noteIds: string[]) {
  if (!written) return; // gated: nothing was written
  useCtfStore.setState((s) => ({
    userNotes: adoptStoredVaultNotes(s.userNotes || [], written.notes),
    userWikilinkMap: written.wikilinkMap,
  }));
  broadcastVaultNotesUpdated(noteIds);
}

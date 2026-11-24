import type { StateCreator } from 'zustand';
import {
  Machine,
  CheatsheetCommand,
  GlobalVariables,
  ActivitySession,
  AttackNodePosition,
  AttackGraphPersistedState,
} from '../../types';
import { normalizeMachineTombstones } from '../../utils/machineTombstones';
// Sync merge code is loaded on demand (./syncActions) to keep it out of the entry chunk: types only here.
import type { ConflictChoice } from '../../utils/syncMerge';
import {
  loadLootState,
  saveLootState,
  clearLootState,
  mergeImportedLoot,
  redactLootState,
} from '../lootPersistence';
import { STARTER_MACHINES } from '../../data/starterMachines';
import { INITIAL_CHEATSHEET } from '../../data/cheatsheetsData';
import { loadMachinesCatalog } from '../../data/loadMachinesCatalog';
import { clearVaultFromIndexedDb } from '../../utils/indexedDbVault';
import {
  extractDeepWriteups,
  mergeDeepPayloadsIntoMachines,
  saveDeepProfileData,
  loadDeepProfileData,
  clearDeepProfileData,
} from '../../utils/indexedDbDeepStorage';
import {
  exportWorkspaceToJson,
  triggerWorkspaceDownload,
  validateWorkspacePayload,
} from '../../utils/workspaceStorage';
import { saveWorkspaceToIdb } from '../../utils/resilientStorage';
import { maskSecretsInText, maskNoteEntry } from '../../utils/secretMasker';
import { recordBackupSuccess } from '../../utils/backupReminder';
import { isSchemaWriteGated } from '../../utils/schemaWriteGate';
import { useGoalsStore } from '../useGoalsStore';
import { getExamBackupSnapshot, restoreExamBackupSnapshot } from '../examStore';
import { BACKUP_FORMAT_VERSION } from '../../utils/backupChecksum';
import { DEMO_SOLVED_ROSTER } from '../../data/demoSolvedRoster';
import { toLeanMachines, mergeMachinesWithCatalog } from '../ctfCatalog';
import { DEFAULT_GLOBAL_VARS } from '../ctfDefaults';
import { overlayActiveTimer, timerSecondsFor } from '../ctfMachineHelpers';
import {
  getProfileStorageKey,
  getWriteProfileStorageKey,
  safeLocalStorage,
  writeProfilePayload,
  getAttackGraphStorageKey,
  loadInitialAttackGraphState,
  saveAttackGraphState,
} from '../ctfStorage';
import { nextProfileLoadGeneration, hydrateDeepProfile, cancelPendingProfileSave } from '../ctfStore';
import { MergeBackupResult, CtfStoreState, CtfBootData } from '../ctfStoreTypes';
import { normalizeThemePreset, applyThemePreset } from '../ctfTheme';
import { broadcastCrossTabMessage, broadcastVaultNotesUpdated } from '../ctfVaultNotes';

/** Workspace store slice: profile data, global variables, cheatsheets, backups, workspace import/export and reset. */

export interface ProfileSliceState {
  globalVars: GlobalVariables;
  cheatsheets: CheatsheetCommand[];
  activitySessions: ActivitySession[];
  unexportedChangesCount: number;
  resetUnexportedChangesCount: () => void;
  exportWorkspace: () => void | Promise<void>;
  importWorkspace: (jsonStr: string) => { success: boolean; count?: number; error?: string };
  // Variables & Cheatsheet Actions
  setGlobalVars: (vars: Partial<GlobalVariables>) => void;
  addCustomCommand: (cmd: Omit<CheatsheetCommand, 'id' | 'isCustom'>) => void;
  deleteCustomCommand: (id: string) => void;
  toggleStarCommand: (id: string) => void;
  isDeepStorageLoaded: boolean;
  // Data Import & Export & Profile Data Isolation
  isHydrated: boolean;
  setIsHydrated: (val: boolean) => void;
  currentProfileId: string;
  isEphemeralStorage: boolean;
  setIsEphemeralStorage: (val: boolean) => void;
  loadProfileData: (
    profileId: string,
    options?: { startFresh?: boolean; cloneFromCurrent?: boolean; skipSaveOutgoing?: boolean }
  ) => void;
  saveProfileData: (profileId?: string) => void;
  exportBackup: (options?: { redactSecrets?: boolean }) => string;
  /**
   * Applies a backup synchronously. A 3.0.0 file that carries a checksum is refused unless `verifiedChecksum`
   * (computed by store/backupFile.importBackupFile, WebCrypto being async) equals it.
   */
  importBackup: (jsonStr: string, options?: { verifiedChecksum?: string }) => boolean;
  /** Plaintext sync file (full backup + deviceId, syncedAt, syncPeers, tombstones). The UI encrypts it. */
  exportSyncFile: () => Promise<string>;
  /** Merges a decrypted backup or sync file into this workspace (see utils/syncMerge). Never replaces. */
  mergeBackup: (jsonStr: string, resolutions?: Record<string, ConflictChoice>) => Promise<MergeBackupResult>;
  resetAllProgress: () => void;
}

export const createProfileSlice = (boot: CtfBootData): StateCreator<CtfStoreState, [['zustand/persist', unknown]], [], ProfileSliceState> => (set, get) => ({
  globalVars: boot.initialProfileData?.globalVars || DEFAULT_GLOBAL_VARS,

  cheatsheets: boot.initialProfileData?.cheatsheets || INITIAL_CHEATSHEET,

  activitySessions: boot.initialProfileData?.activitySessions || [],

  currentProfileId: boot.initialProfileId,

  isHydrated: true,

  setIsHydrated: (val) => set({ isHydrated: val }),

  unexportedChangesCount: 0,

  isEphemeralStorage: safeLocalStorage.isEphemeral(),

  setIsEphemeralStorage: (val) => set({ isEphemeralStorage: val }),

  isDeepStorageLoaded: false,

  resetUnexportedChangesCount: () => set({ unexportedChangesCount: 0 }),

  exportWorkspace: async () => {
    const state = get();
    let machinesToExport = state.machines;
    try {
      const profileId = state.currentProfileId || 'guest';
      const deep = await loadDeepProfileData(profileId);
      if (deep?.writeups && Object.keys(deep.writeups).length > 0) {
        machinesToExport = mergeDeepPayloadsIntoMachines(machinesToExport, deep.writeups);
      }
    } catch (e) {
      console.warn('[ZeroBox] Could not preload deep writeups for workspace export:', e);
    }

    const json = exportWorkspaceToJson({
      machines: machinesToExport,
      globalVars: state.globalVars,
      cheatsheets: state.cheatsheets,
      activitySessions: state.activitySessions,
      customNotes: state.customNotes,
      userNotes: state.userNotes,
      userWikilinkMap: state.userWikilinkMap,
      deletedNoteIds: state.deletedNoteIds,
      userSolvesReset: state.userSolvesReset,
    });
    triggerWorkspaceDownload(json, 'zerobox-workspace');
    recordBackupSuccess();
    set({ unexportedChangesCount: 0 });
  },

  importWorkspace: (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      const validated = validateWorkspacePayload(parsed);
      if (!validated.success || !validated.data) {
        return { success: false, error: validated.error || 'Invalid workspace backup format.' };
      }
      const data = validated.data;
      set((state) => ({
        machines: data.machines ? mergeMachinesWithCatalog(data.machines, data.userSolvesReset) : state.machines,
        globalVars: data.globalVars ? { ...state.globalVars, ...data.globalVars } : state.globalVars,
        cheatsheets: data.cheatsheets ? [...data.cheatsheets] : state.cheatsheets,
        activitySessions: data.activitySessions ? [...data.activitySessions] : state.activitySessions,
        customNotes: data.customNotes ? [...data.customNotes] : state.customNotes,
        userNotes: data.userNotes ? [...data.userNotes] : state.userNotes,
        userWikilinkMap: data.userWikilinkMap ? { ...data.userWikilinkMap } : state.userWikilinkMap,
        deletedNoteIds: data.deletedNoteIds ? [...data.deletedNoteIds] : state.deletedNoteIds,
        notesEpoch: data.customNotes || data.deletedNoteIds ? new Date().toISOString() : state.notesEpoch,
        userSolvesReset: data.userSolvesReset !== undefined ? data.userSolvesReset : state.userSolvesReset,
        unexportedChangesCount: 0,
      }));
      get().saveProfileData();
      return { success: true, count: validated.restoredCount };
    } catch (err: unknown) {
      return { success: false, error: (err as { message?: string } | null | undefined)?.message || 'Failed to parse JSON file' };
    }
  },

  setGlobalVars: (vars) => {
    set((state) => {
      const newVars = {
        ...state.globalVars,
        ...vars,
        customVars: {
          ...state.globalVars.customVars,
          ...(vars.customVars || {}),
        },
      };

      // Synchronize targetIp to active target machine in real-time!
      let updatedMachines = state.machines;
      if (vars.targetIp && state.activeTargetId) {
        updatedMachines = state.machines.map((m) =>
          m.id === state.activeTargetId && !m.isActive
            ? { ...m, ip: vars.targetIp!, updatedAt: new Date().toISOString() }
            : m
        );
      }

      return {
        globalVars: newVars,
        machines: updatedMachines,
      };
    });
  },

  addCustomCommand: (cmd) => {
    const id = 'cmd-' + Date.now();
    const newCmd: CheatsheetCommand = {
      ...cmd,
      id,
      isCustom: true,
      isStarred: false,
    };
    set((state) => ({
      cheatsheets: [newCmd, ...state.cheatsheets],
    }));
  },

  deleteCustomCommand: (id) => {
    set((state) => ({
      cheatsheets: state.cheatsheets.filter((c) => c.id !== id),
    }));
  },

  toggleStarCommand: (id) => {
    set((state) => ({
      cheatsheets: state.cheatsheets.map((c) =>
        c.id === id ? { ...c, isStarred: !c.isStarred } : c
      ),
    }));
  },

  exportBackup: (options?: { redactSecrets?: boolean }) => {
    const state = get();
    let exportMachines = overlayActiveTimer(state);

    let exportGlobalVars = state.globalVars;
    if (options?.redactSecrets) {
      const redactedCustom: Record<string, string> = {};
      if (state.globalVars.customVars) {
        for (const [key, val] of Object.entries(state.globalVars.customVars)) {
          const lower = key.toLowerCase();
          if (
            lower.includes('pass') ||
            lower.includes('secret') ||
            lower.includes('token') ||
            lower.includes('key') ||
            lower.includes('auth') ||
            lower.includes('cred')
          ) {
            redactedCustom[key] = '[REDACTED]';
          } else {
            redactedCustom[key] = val;
          }
        }
      }
      exportGlobalVars = {
        ...state.globalVars,
        lhost: '10.10.14.X',
        targetIp: '10.10.10.X',
        ...(state.globalVars.cred ? { cred: '[REDACTED]' } : {}),
        customVars: redactedCustom,
      };
      // Sanitize any machine flag proofs containing credentials
      // The free-text fields keep their text; only substrings that look like secrets are masked.
      const maskField = (v?: string) => (v ? maskSecretsInText(v) : v);
      exportMachines = exportMachines.map((m) => {
        const out: Machine = {
          ...m,
          userFlag: m.userFlag?.toLowerCase().includes('pass') ? '[REDACTED]' : m.userFlag,
          rootFlag: m.rootFlag?.toLowerCase().includes('pass') ? '[REDACTED]' : m.rootFlag,
        };
        if (m.quickNotes !== undefined) out.quickNotes = maskField(m.quickNotes);
        if (m.writeupMarkdown !== undefined) out.writeupMarkdown = maskField(m.writeupMarkdown);
        if (m.rawScanOutput !== undefined) out.rawScanOutput = maskField(m.rawScanOutput);
        if (m.scanSummary !== undefined) out.scanSummary = maskField(m.scanSummary);
        if (m.findings) {
          out.findings = m.findings.map((f) => ({
            ...f,
            title: maskSecretsInText(f.title),
            ...(f.repro !== undefined ? { repro: maskField(f.repro) } : {}),
            ...(f.remediation !== undefined ? { remediation: maskField(f.remediation) } : {}),
            ...(f.affectedService !== undefined ? { affectedService: maskField(f.affectedService) } : {}),
          }));
        }
        if (m.checklist?.itemsState) {
          const itemsState: typeof m.checklist.itemsState = {};
          for (const [id, item] of Object.entries(m.checklist.itemsState)) {
            itemsState[id] = item.notes !== undefined ? { ...item, notes: maskField(item.notes) } : item;
          }
          out.checklist = { ...m.checklist, itemsState };
        }
        if (m.portTriage) {
          const portTriage: typeof m.portTriage = {};
          for (const [port, entry] of Object.entries(m.portTriage)) {
            portTriage[port] = entry.note !== undefined ? { ...entry, note: maskField(entry.note) } : entry;
          }
          out.portTriage = portTriage;
        }
        return out;
      });
    }

    let exportGraphEdges = state.graphEdges;
    if (options?.redactSecrets) {
      const scrub = (v?: string) => (v && v.toLowerCase().includes('pass') ? '[REDACTED]' : v);
      exportGraphEdges = exportGraphEdges.map((e) => ({ ...e, label: scrub(e.label), notes: scrub(e.notes) }));
    }

    const exportLoot = options?.redactSecrets
      ? redactLootState(state)
      : { credentials: state.credentials, credAttempts: state.credAttempts, lootItems: state.lootItems };

    const exportData = {
      // 3.0.0 adds examState here; store/backupFile adds indexedDb and the checksum to the downloadable file.
      version: BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      isRedacted: Boolean(options?.redactSecrets),
      machines: exportMachines,
      globalVars: exportGlobalVars,
      cheatsheets: state.cheatsheets,
      activitySessions: state.activitySessions,
      customNotes: options?.redactSecrets ? state.customNotes.map(maskNoteEntry) : state.customNotes,
      userNotes: options?.redactSecrets ? (state.userNotes || []).map(maskNoteEntry) : state.userNotes || [],
      userWikilinkMap: state.userWikilinkMap || {},
      deletedNoteIds: state.deletedNoteIds,
      userSolvesReset: state.userSolvesReset,
      themePreset: state.themePreset,
      graphEdges: exportGraphEdges,
      graphNodePositions: state.graphNodePositions,
      ...exportLoot,
      // Optional block: older builds ignore unknown fields, older backups simply lack it.
      goals: { weeklyRootTarget: useGoalsStore.getState().weeklyRootTarget },
      examState: getExamBackupSnapshot(),
    };
    return JSON.stringify(exportData, null, 2);
  },

  importBackup: (jsonStr, options) => {
    if (isSchemaWriteGated()) return false;
    try {
      const raw = JSON.parse(jsonStr);
      if (!raw || typeof raw !== 'object') return false;

      const validation = validateWorkspacePayload(raw);
      if (!validation.success || !validation.data) return false;

      const data = validation.data;
      const isV3 = data.version === BACKUP_FORMAT_VERSION;
      // An unverified checksum means an unchecked file: change nothing (importBackupFile verifies first).
      if (isV3 && data.checksum !== undefined && data.checksum !== options?.verifiedChecksum) return false;
      const rawMachines = Array.isArray(data.machines) ? data.machines : null;
      if (rawMachines) {
        const userSolvesReset = Boolean(data.userSolvesReset);
        const normalizedMachines = mergeMachinesWithCatalog(
          rawMachines.map((m) => ({
            ...m,
            tags: Array.isArray(m?.tags) ? m.tags : [],
            openPorts: Array.isArray(m?.openPorts) ? m.openPorts : [],
            checklist: (m?.checklist && typeof m.checklist === 'object' ? m.checklist : {}) as Machine['checklist'],
          })),
          userSolvesReset
        );
        const rawPreset = data.themePreset;
        const nextThemePreset = rawPreset ? normalizeThemePreset(rawPreset) : undefined;
        if (nextThemePreset) {
          applyThemePreset(nextThemePreset);
        }
        const isNum = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
        const importedGraph: Partial<AttackGraphPersistedState> | undefined = (() => {
          const out: Partial<AttackGraphPersistedState> = {};
          if (Array.isArray(data.graphEdges)) {
            out.graphEdges = data.graphEdges.filter(
              (e) => e && typeof e.id === 'string' && typeof e.sourceId === 'string' && typeof e.targetId === 'string'
            );
          }
          if (data.graphNodePositions && typeof data.graphNodePositions === 'object') {
            const pos: Record<string, AttackNodePosition> = {};
            for (const [k, v] of Object.entries(data.graphNodePositions)) {
              if (v && isNum(v.x) && isNum(v.y)) pos[k] = { x: v.x, y: v.y };
            }
            out.graphNodePositions = pos;
          }
          return out.graphEdges || out.graphNodePositions ? out : undefined;
        })();
        // Loot is merged (not replaced) so a backup, redacted or stale, can never wipe real secrets.
        const importedLoot = mergeImportedLoot(get(), data);
        set((state) => ({
          machines: normalizedMachines,
          // The backup may hold more time for the active target than this tab shows; never show (and later
          // fold back) less than either side.
          activeTimerSeconds: Math.max(
            state.activeTimerSeconds,
            timerSecondsFor(normalizedMachines, state.activeTargetId)
          ),
          ...(nextThemePreset ? { themePreset: nextThemePreset } : {}),
          globalVars: (data.globalVars as GlobalVariables) || state.globalVars,
          cheatsheets: Array.isArray(data.cheatsheets) ? data.cheatsheets : state.cheatsheets,
          activitySessions: Array.isArray(data.activitySessions) ? data.activitySessions : state.activitySessions,
          customNotes: Array.isArray(data.customNotes) ? data.customNotes : state.customNotes,
          userNotes: Array.isArray(data.userNotes) ? data.userNotes : state.userNotes,
          userWikilinkMap: (data.userWikilinkMap && typeof data.userWikilinkMap === 'object') ? data.userWikilinkMap : state.userWikilinkMap,
          deletedNoteIds: Array.isArray(data.deletedNoteIds) ? data.deletedNoteIds : state.deletedNoteIds,
          notesEpoch:
            Array.isArray(data.customNotes) || Array.isArray(data.deletedNoteIds)
              ? new Date().toISOString()
              : state.notesEpoch,
          userSolvesReset,
          ...importedGraph,
          ...importedLoot,
        }));
        if (importedLoot) {
          saveLootState(get().currentProfileId || 'guest', importedLoot);
        }
        // Validated in validateWorkspacePayload; missing or invalid leaves the current goals untouched.
        if (data.goals) {
          useGoalsStore.getState().setWeeklyRootTarget(data.goals.weeklyRootTarget);
        }
        if (importedGraph) {
          saveAttackGraphState(
            importedGraph.graphNodePositions ?? get().graphNodePositions,
            importedGraph.graphEdges ?? get().graphEdges,
            get().currentProfileId || 'guest'
          );
        }
        // Skipped (state kept) while the schema write gate is engaged; vault notes are upserted by importBackupFile.
        if (isV3 && data.examState) {
          const ok = restoreExamBackupSnapshot(data.examState);
          if (!ok) console.warn('[ZeroBox] Exam restore skipped: writes blocked.');
        }
        return true;
      }
      return false;
    } catch (e) {
      console.error('Failed to parse backup JSON:', e);
      return false;
    }
  },

  // Both bodies live in syncActions.ts, loaded on demand with the sync modules (kept out of the entry chunk).
  exportSyncFile: async () => (await import('../syncActions')).exportSyncFile(),

  mergeBackup: async (jsonStr, resolutions) => (await import('../syncActions')).mergeBackup(jsonStr, resolutions),

  loadProfileData: (
    profileId: string,
    options?: { startFresh?: boolean; cloneFromCurrent?: boolean; skipSaveOutgoing?: boolean }
  ) => {
    const gen = nextProfileLoadGeneration();
    const currentId = get().currentProfileId || 'guest';
    // skipSaveOutgoing: the outgoing profile was just deleted, so saving it would write it straight back. Drop
    // its pending debounced save too (the switch below re-arms one for the new profile).
    if (options?.skipSaveOutgoing) cancelPendingProfileSave();
    else get().saveProfileData(currentId);

    const targetKey = getProfileStorageKey(profileId);
    const raw = safeLocalStorage.getItem(targetKey);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        const userSolvesReset = Boolean(data.userSolvesReset);
        const graphState = loadInitialAttackGraphState(profileId);
        const loadedMachines = mergeMachinesWithCatalog(data.machines, userSolvesReset);
        const loadedTargetId = data.activeTargetId || null;
        set({
          currentProfileId: profileId,
          isDeepStorageLoaded: false,
          userSolvesReset,
          machines: loadedMachines,
          activeTargetId: loadedTargetId,
          // The previous profile's timer was saved above; never carry its seconds onto this profile's target.
          isTimerRunning: false,
          timerLastTick: null,
          activeTimerSeconds: timerSecondsFor(loadedMachines, loadedTargetId),
          globalVars: data.globalVars || DEFAULT_GLOBAL_VARS,
          cheatsheets: data.cheatsheets || INITIAL_CHEATSHEET,
          activitySessions: Array.isArray(data.activitySessions) ? data.activitySessions : [],
          customNotes: Array.isArray(data.customNotes) ? data.customNotes : [],
          deletedNoteIds: Array.isArray(data.deletedNoteIds) ? data.deletedNoteIds : [],
          notesEpoch: typeof data.notesEpoch === 'string' ? data.notesEpoch : null,
          tombstonesEpoch: typeof data.tombstonesEpoch === 'string' ? data.tombstonesEpoch : null,
          deletedMachineIds: normalizeMachineTombstones(data.deletedMachineIds),
          graphNodePositions: graphState.graphNodePositions,
          graphEdges: graphState.graphEdges,
          ...loadLootState(profileId),
        });

        // Asynchronously enrich with deep writeups from IndexedDB (guarded against later switches)
        hydrateDeepProfile(profileId, gen);

        return;
      } catch (e) {
        console.error('Failed to parse target profile data:', e);
      }
    }

    // New profile not yet saved in storage:
    if (options?.cloneFromCurrent) {
      const payload = {
        machines: get().machines,
        activeTargetId: get().activeTargetId,
        globalVars: get().globalVars,
        cheatsheets: get().cheatsheets,
        activitySessions: get().activitySessions,
        customNotes: get().customNotes,
        deletedNoteIds: get().deletedNoteIds,
        notesEpoch: get().notesEpoch,
        tombstonesEpoch: get().tombstonesEpoch,
        deletedMachineIds: get().deletedMachineIds,
        userSolvesReset: get().userSolvesReset,
      };
      const writeKey = getWriteProfileStorageKey(profileId);
      safeLocalStorage.setItem(writeKey, JSON.stringify(payload));
      saveAttackGraphState(get().graphNodePositions, get().graphEdges, profileId);
      saveLootState(profileId, get());
      set({ currentProfileId: profileId, isDeepStorageLoaded: true });
      return;
    }

    const isDaniel = profileId === 'usr_daniel';
    const startFresh = options?.startFresh ?? (!isDaniel);

    if (!startFresh && isDaniel) {
      const graphState = loadInitialAttackGraphState(profileId);
      set({
        currentProfileId: profileId,
        isDeepStorageLoaded: true,
        machines: mergeMachinesWithCatalog(DEMO_SOLVED_ROSTER as Machine[], false),
        activeTargetId: null,
        isTimerRunning: false,
        timerLastTick: null,
        activeTimerSeconds: 0,
        globalVars: DEFAULT_GLOBAL_VARS,
        cheatsheets: INITIAL_CHEATSHEET,
        activitySessions: [],
        customNotes: [],
        deletedNoteIds: [],
        notesEpoch: null,
        tombstonesEpoch: null,
        deletedMachineIds: [],
        userSolvesReset: false,
        graphNodePositions: graphState.graphNodePositions,
        graphEdges: graphState.graphEdges,
        ...loadLootState(profileId),
      });
      get().saveProfileData(profileId);
      return;
    }

    // Fresh slate for new operator: every catalog target ready to be pwned with 0 solves (zero custom machine leak)
    const freshMachines = mergeMachinesWithCatalog([], true);
    const graphState = loadInitialAttackGraphState(profileId);

    set({
      currentProfileId: profileId,
      isDeepStorageLoaded: true,
      machines: freshMachines,
      activeTargetId: null,
      isTimerRunning: false,
      timerLastTick: null,
      activeTimerSeconds: 0,
      globalVars: DEFAULT_GLOBAL_VARS,
      cheatsheets: INITIAL_CHEATSHEET,
      activitySessions: [],
      customNotes: [],
      deletedNoteIds: [],
      notesEpoch: null,
      tombstonesEpoch: null,
      deletedMachineIds: [],
      userSolvesReset: true,
      graphNodePositions: graphState.graphNodePositions,
      graphEdges: graphState.graphEdges,
      ...loadLootState(profileId),
    });
    get().saveProfileData(profileId);
  },

  saveProfileData: (profileId?: string) => {
    const state = get();
    const targetId = profileId || state.currentProfileId || 'guest';
    const persistedMachines = overlayActiveTimer(state);

    // Dual-tier: asynchronously save deep payloads (writeups & notes) to IndexedDB
    const deepWriteups = extractDeepWriteups(persistedMachines);
    // Always written, even empty, so clearing every writeup or note sticks (see flushProfileSave).
    if (state.isDeepStorageLoaded) {
      saveDeepProfileData(targetId, {
        writeups: deepWriteups,
        customNotes: state.customNotes,
      });
    }

    const payload = {
      machines: toLeanMachines(persistedMachines),
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
    // Keep the IndexedDB copy in step (same savedAt), or boot would see it as older/newer than it is.
    const { savedAt } = writeProfilePayload(targetId, payload);
    saveWorkspaceToIdb(`zb:workspace:${targetId}`, { ...payload, savedAt }).catch(() => {});
  },

  resetAllProgress: async () => {
    let catalog: Machine[];
    try {
      catalog = await loadMachinesCatalog();
    } catch {
      catalog = STARTER_MACHINES;
    }
    const targetId = get().currentProfileId || 'guest';
    // Explicitly clear IndexedDB deep storage and vault notes to prevent orphaned data accumulation
    await clearDeepProfileData(targetId);
    await clearVaultFromIndexedDb();
    safeLocalStorage.removeItem(getAttackGraphStorageKey(targetId));
    clearLootState(targetId);
    set(() => ({
      machines: mergeMachinesWithCatalog([], true, catalog),
      activeTargetId: null,
      isTimerRunning: false,
      activitySessions: [],
      customNotes: [],
      userNotes: [],
      userWikilinkMap: {},
      deletedNoteIds: [],
      notesEpoch: new Date().toISOString(),
      userSolvesReset: true,
      isCatalogLoaded: true,
      unexportedChangesCount: 0,
      graphNodePositions: {},
      graphEdges: [],
      credentials: [],
      credAttempts: [],
      lootItems: [],
    }));
    get().saveProfileData(targetId);
    broadcastCrossTabMessage('STATE_UPDATED', { profileId: targetId });
    // The vault is global, not per profile: every tab drops its imported notes too.
    broadcastVaultNotesUpdated();
  },
});

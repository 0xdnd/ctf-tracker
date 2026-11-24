import type { StorageValue, PersistOptions } from 'zustand/middleware';
import { Machine } from '../types';
import { normalizeMachineTombstones } from '../utils/machineTombstones';
import { SCHEMA_VERSION, isSchemaWriteGated, engageSchemaWriteGate } from '../utils/schemaWriteGate';
import { takePreMigrationBackup } from './preMigrationBackup';
import { toLeanMachines, mergeMachinesWithCatalog } from './ctfCatalog';
import { safeLocalStorage, loadCustomMachinesFromStorage } from './ctfStorage';
import { CtfStoreState } from './ctfStoreTypes';
import { ThemePreset, normalizeThemePreset, UiScale, applyThemePreset } from './ctfTheme';

/** Workspace store: persist options (storage adapter, migrate, merge, partialize) for the tactical store blob. */

// Persist snapshot memo (see partialize / storage.setItem in the store config below)
let lastPartialize: { inputs: unknown[]; snapshot: Record<string, unknown> } | null = null;

let lastPersistedSnapshot: unknown;

let lastPersistedVersion: number | undefined;

let lastFailedSnapshot: unknown;

/** The slice of the store that partialize() persists under 'zerobox-tactical-store' (a plain JSON snapshot). */
export type PersistedSlice = Record<string, unknown>;

/** A persisted blob as migrate() sees it: any older shape, so every field is optional and may carry retired keys. */
type MigratablePersisted = Record<string, unknown> & {
  currentProfileId?: string;
  appBrand?: string;
  uiScale?: string;
  themePreset?: string;
  userSolvesReset?: unknown;
  machines?: unknown;
  customNotes?: unknown;
  deletedNoteIds?: unknown;
  notesEpoch?: unknown;
  tombstonesEpoch?: unknown;
  deletedMachineIds?: unknown;
};

export const ctfPersistOptions: PersistOptions<CtfStoreState, PersistedSlice> = {
  name: 'zerobox-tactical-store',
  version: SCHEMA_VERSION,
  // Object-level storage (not createJSONStorage): lets us skip the JSON.stringify + localStorage write
  // whenever partialize() hands back the exact same snapshot object (transient-only set() calls such as
  // timer ticks, modal flags and isCatalogLoading), and parses the stored blob only once at boot.
  storage: {
    getItem: (name: string): StorageValue<PersistedSlice> | null => {
      if (typeof window === 'undefined') return null;
      try {
        const raw = safeLocalStorage.getItem(name);
        if (!raw) return null;
        // Throws on corrupted JSON; handled below without surfacing an uncaught SyntaxError at boot
        return JSON.parse(raw) as StorageValue<PersistedSlice>;
      } catch (err) {
        console.warn(
          `[ZeroBox Storage] Corrupted JSON detected in '${name}'. Quarantining and falling back to clean default state:`,
          err
        );
        try {
          const corrupted = safeLocalStorage.getItem(name);
          if (corrupted) {
            safeLocalStorage.setItem(`${name}_corrupted_backup_${Date.now()}`, corrupted);
          }
          safeLocalStorage.removeItem(name);
        } catch { /* quarantine is best-effort; the corrupted entry is dropped either way */ }
        return null;
      }
    },
    setItem: (name: string, value: StorageValue<PersistedSlice>): void => {
      if (value.state === lastPersistedSnapshot && value.version === lastPersistedVersion) return;
      // Gated (newer schema / restore): nothing is written and nothing is recorded, neither as persisted nor
      // as failed, so the release listener below re-flushes this snapshot once the gate lifts.
      if (isSchemaWriteGated()) return;
      // A failed write (quota) is retried on the next real change, not on every transient set() (timer ticks).
      if (value.state === lastFailedSnapshot) return;
      if (safeLocalStorage.setItem(name, JSON.stringify(value))) {
        lastPersistedSnapshot = value.state;
        lastPersistedVersion = value.version;
        lastFailedSnapshot = undefined;
      } else {
        lastFailedSnapshot = value.state;
      }
    },
    removeItem: (name: string): void => {
      lastPersistedSnapshot = undefined;
      safeLocalStorage.removeItem(name);
    },
  },
  migrate: (persistedState: unknown, fromVersion: number) => {
    if (fromVersion > SCHEMA_VERSION) {
      // Written by a newer build: never down-convert or write it back. Read-only until reload.
      engageSchemaWriteGate('newer-schema');
      return persistedState as PersistedSlice;
    }
    // v3 (isCustom normalization) needs no state transform here: mergeMachinesWithCatalog normalizes every
    // entry point. Snapshot the raw strings first (synchronous capture, async IndexedDB write).
    takePreMigrationBackup(fromVersion);
    const persisted = (persistedState || {}) as MigratablePersisted;
    if (!persisted.appBrand || persisted.appBrand === 'rootvector' || persisted.appBrand === 'specter') {
      persisted.appBrand = 'zerobox';
    }
    if (!persisted.uiScale || persisted.uiScale === 'auto') {
      persisted.uiScale = 'normal';
    }
    const userSolvesReset = Boolean(persisted.userSolvesReset);
    const rawPreset = (persisted.themePreset as string) || 'obsidian';
    const themePreset: ThemePreset = normalizeThemePreset(rawPreset);
    applyThemePreset(themePreset);

    // Fail-safe: Ensure isolated custom machines are never lost during version migration
    const storedMachines: Machine[] = Array.isArray(persisted.machines) ? persisted.machines : [];
    const isolatedCustom = loadCustomMachinesFromStorage(persisted.currentProfileId || 'guest');
    const existingIds = new Set(storedMachines.map((m) => m.id));
    const missingCustom = isolatedCustom.filter((c) => !existingIds.has(c.id));
    const combinedMachines = [...missingCustom, ...storedMachines];

    return {
      ...persisted,
      appBrand: 'zerobox',
      themePreset,
      uiScale: (!persisted.uiScale || persisted.uiScale === 'auto') ? 'normal' : persisted.uiScale,
      userSolvesReset,
      customNotes: persisted.customNotes || [],
      deletedNoteIds: persisted.deletedNoteIds || [],
      notesEpoch: typeof persisted.notesEpoch === 'string' ? persisted.notesEpoch : null,
      tombstonesEpoch: typeof persisted.tombstonesEpoch === 'string' ? persisted.tombstonesEpoch : null,
      deletedMachineIds: normalizeMachineTombstones(persisted.deletedMachineIds),
      machines: mergeMachinesWithCatalog(combinedMachines, userSolvesReset),
    };
  },
  merge: (persistedState: unknown, currentState: CtfStoreState) => {
    // No blob (first run, or a corrupted one was quarantined): the initial state already holds the profile
    // copy. Merging an empty blob would replace its machines with the bare catalog and clear its notes.
    if (persistedState === null || persistedState === undefined) {
      applyThemePreset(currentState.themePreset);
      return currentState;
    }
    const persisted = (persistedState as Partial<CtfStoreState>) || {};
    const userSolvesReset = Boolean(persisted.userSolvesReset);
    const rawPreset = (persisted.themePreset as string) || 'obsidian';
    const themePreset: ThemePreset = normalizeThemePreset(rawPreset);
    applyThemePreset(themePreset);
    const resolvedUiScale: UiScale = (!persisted.uiScale || persisted.uiScale === 'auto') ? 'normal' : (persisted.uiScale as UiScale);

    // Fail-safe: Ensure isolated custom machines are never lost during store rehydration
    const storedMachines: Machine[] = Array.isArray(persisted.machines) ? persisted.machines : [];
    const isolatedCustom = loadCustomMachinesFromStorage(persisted.currentProfileId || 'guest');
    const existingIds = new Set(storedMachines.map((m) => m.id));
    const missingCustom = isolatedCustom.filter((c) => !existingIds.has(c.id));
    const combinedMachines = [...missingCustom, ...storedMachines];

    return {
      ...currentState,
      ...persisted,
      appBrand: 'zerobox',
      themePreset,
      uiScale: resolvedUiScale,
      userSolvesReset,
      customNotes: persisted.customNotes || [],
      deletedNoteIds: persisted.deletedNoteIds || [],
      notesEpoch: typeof persisted.notesEpoch === 'string' ? persisted.notesEpoch : null,
      tombstonesEpoch: typeof persisted.tombstonesEpoch === 'string' ? persisted.tombstonesEpoch : null,
      // Persisted blob first; an older blob without the field falls back to the profile copy.
      deletedMachineIds: normalizeMachineTombstones(persisted.deletedMachineIds ?? currentState.deletedMachineIds),
      machines: mergeMachinesWithCatalog(combinedMachines, userSolvesReset),
    };
  },
  onRehydrateStorage: () => (state) => {
    if (state) {
      if (!state.uiScale || state.uiScale === 'auto') {
        state.uiScale = 'normal';
      }
    }
  },
  partialize: (state) => {
    const inputs = [
      state.currentProfileId,
      state.appBrand,
      state.themePreset,
      state.userSolvesReset,
      state.customNotes,
      state.deletedNoteIds,
      state.notesEpoch,
      state.tombstonesEpoch,
      state.deletedMachineIds,
      state.machines,
      state.activeTargetId,
      state.globalVars,
      state.cheatsheets,
      state.activitySessions,
      state.viewMode,
      state.crtOverlay,
      state.soundEnabled,
      state.uiScale,
    ];
    // Same persisted inputs => return the identical snapshot so the storage adapter can skip serializing.
    if (lastPartialize && lastPartialize.inputs.every((v, i) => Object.is(v, inputs[i]))) {
      return lastPartialize.snapshot;
    }
    const snapshot = {
      currentProfileId: state.currentProfileId,
      appBrand: state.appBrand,
      themePreset: state.themePreset,
      userSolvesReset: state.userSolvesReset,
      customNotes: state.customNotes,
      deletedNoteIds: state.deletedNoteIds,
      notesEpoch: state.notesEpoch,
      tombstonesEpoch: state.tombstonesEpoch,
      deletedMachineIds: state.deletedMachineIds,
      machines: toLeanMachines(state.machines),
      activeTargetId: state.activeTargetId,
      globalVars: state.globalVars,
      cheatsheets: state.cheatsheets,
      activitySessions: state.activitySessions,
      viewMode: state.viewMode,
      crtOverlay: state.crtOverlay,
      soundEnabled: state.soundEnabled,
      uiScale: state.uiScale,
    };
    lastPartialize = { inputs, snapshot };
    return snapshot;
  },
};

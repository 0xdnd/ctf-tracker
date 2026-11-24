/**
 * Public entry point of the workspace store. The store itself (state, actions, persistence and the cross-tab runtime)
 * lives in ctfStore.ts and src/store/slices/; this file only re-exports the names the rest of the app imports.
 */
export { SYNC_CHANNEL_NAME, syncChannel } from '../utils/crossTabChannel';
export { SCHEMA_VERSION, SCHEMA_VERSION_STORAGE_KEY } from '../utils/schemaWriteGate';
export {
  CATALOG_MACHINE_ALIASES,
  KNOWN_ACTIVE_SEASONAL_NAMES,
  mergeMachinesWithCatalog,
  toLeanMachines,
} from './ctfCatalog';
export { mergeIncomingMachines, mergeIncomingNotes } from './ctfCrossTabMerge';
export type { NotesSide } from './ctfCrossTabMerge';
export { selectTacticalVarsUnset } from './ctfDefaults';
export {
  TIMER_CHECKPOINT_SECONDS,
  appendTimeline,
  sanitizeActiveMachine,
  timerSecondsFor,
  withTimeSpent,
} from './ctfMachineHelpers';
export {
  ATTACK_GRAPH_STORAGE_KEY,
  CUSTOM_MACHINES_STORAGE_KEY,
  GRAPH_GUEST_WRITTEN_KEY,
  GRAPH_LEGACY_CLAIMED_KEY,
  STORAGE_FULL_MESSAGE,
  getAttackGraphStorageKey,
  getCustomMachinesStorageKey,
  getInitialProfileId,
  getProfileStorageKey,
  getWriteProfileStorageKey,
  loadCustomMachinesFromStorage,
  loadInitialAttackGraphState,
  loadInitialProfileData,
  pruneMisstampedCustomMachines,
  safeLocalStorage,
  saveAttackGraphState,
  saveCustomMachinesToStorage,
} from './ctfStorage';
export {
  SCHEMA_GATE_TOAST_MESSAGE,
  checkpointTimerAndFlush,
  flushProfileSave,
  useCtfStore,
} from './ctfStore';
export type {
  ActiveTab,
  AvailabilityFilter,
  BoxVectorCategory,
  FilterState,
  FlexCardMode,
  HtbTargetStatus,
  MergeBackupResult,
  SortDirection,
  SortOption,
} from './ctfStoreTypes';
export { BRAND_THEMES, ZEROBOX_BRAND, applyThemePreset, normalizeThemePreset } from './ctfTheme';
export type { BrandTheme, CoreThemePreset, LegacyThemePreset, ThemePreset, UiScale } from './ctfTheme';
export { adoptStoredVaultNotes, broadcastCrossTabMessage, broadcastVaultNotesUpdated } from './ctfVaultNotes';
export { normalizeMachineSlug } from './machineNormalization';
export { listPreMigrationBackups, restorePreMigrationBackup } from './preMigrationBackup';

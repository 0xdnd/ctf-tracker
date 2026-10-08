import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
  Machine, 
  PipelineStatus, 
  CheatsheetCommand, 
  GlobalVariables, 
  ActivitySession, 
  ViewMode, 
  Platform, 
  Difficulty, 
  OperatingSystem,
  AttackGraphEdge,
  AttackNodePosition,
  AttackGraphPersistedState,
  Credential,
  CredAttempt,
  LootItem,
  NewCredentialInput,
  CredentialPatch,
  NewCredAttemptInput,
  NewLootItemInput,
  LootItemPatch
} from '../types';
import {
  loadLootState,
  saveLootState,
  clearLootState,
  getLootStorageKey,
  parseLootPayload,
  buildCredential,
  findDuplicateCredential,
  patchCredential,
  upsertAttemptInList,
  buildLootItem,
  patchLootItem,
  mergeImportedLoot,
  redactLootState
} from './lootPersistence';
import { STARTER_MACHINES } from '../data/starterMachines';
import { INITIAL_CHEATSHEET } from '../data/cheatsheetsData';

import { loadMachinesCatalog, getLoadedMachinesCatalog } from '../data/loadMachinesCatalog';
import { CPTS_NOTES, getAllCptsNotes, type CptsNoteEntry } from '../utils/obsidianManualUtils';
import { saveVaultToIndexedDb, loadVaultFromIndexedDb, clearVaultFromIndexedDb } from '../utils/indexedDbVault';
import { 
  extractDeepWriteups, 
  stripDeepFieldsFromMachines, 
  mergeDeepPayloadsIntoMachines, 
  saveDeepProfileData, 
  loadDeepProfileData,
  deleteMachineDeepData,
  clearDeepProfileData
} from '../utils/indexedDbDeepStorage';
import { 
  exportWorkspaceToJson, 
  triggerWorkspaceDownload, 
  validateWorkspacePayload 
} from '../utils/workspaceStorage';
import { saveWorkspaceToIdb } from '../utils/resilientStorage';
import { toLocalDateKey } from '../utils/analyticsHeatmap';
import { DEMO_SOLVED_ROSTER } from '../data/demoSolvedRoster';

export type BoxVectorCategory = 'ALL' | 'Web' | 'Linux PrivEsc' | 'Windows PrivEsc' | 'Active Directory' | 'Binary / Pwn' | 'Network / SMB';
export type SortOption = 'default' | 'difficulty' | 'name' | 'ip' | 'recent';
export type SortDirection = 'asc' | 'desc';
export type HtbTargetStatus = 'ALL' | 'UNCOMPLETED' | 'FOOTHOLD' | 'COMPLETED';

export interface FilterState {
  searchQuery: string;
  selectedPlatform: Platform | 'ALL';
  selectedDifficulty: Difficulty | 'ALL';
  selectedCert: 'OSCP' | 'CPTS' | 'CRTO' | 'ALL';
  selectedOs: 'ALL' | OperatingSystem;
  selectedCategory: BoxVectorCategory;
  selectedVulnCategory?: string | 'ALL';
  excludeActiveDirectory?: boolean;
  selectedTrack: string | 'ALL';
  selectedTracks: string[];
  selectedStatus: HtbTargetStatus;
  selectedLanguage?: string | 'ALL';
  selectedAreaOfInterest?: string | 'ALL';
  selectedTechnique?: string | 'ALL';
  selectedTags: string[];
  sortBy: SortOption;
  sortDirection: SortDirection;
  hideEmptyLanes: boolean;
}

export interface BrandTheme {
  id: string;
  namePrefix: string;
  nameSuffix: string;
  suffixColor: string;
  tagline: string;
  badge: string;
}

export const ZEROBOX_BRAND: BrandTheme = {
  id: 'zerobox',
  namePrefix: 'ZERO',
  nameSuffix: 'BOX',
  suffixColor: 'cyber-box-glow',
  tagline: 'Tactical Cyber Operations Suite',
  badge: 'v2.0',
};

export const BRAND_THEMES: BrandTheme[] = [ZEROBOX_BRAND];

export type CoreThemePreset = 'obsidian' | 'monolith' | 'htb';
export type LegacyThemePreset = 'industrial' | 'neon' | 'zerobox' | 'oled' | 'light';
export type ThemePreset = 'obsidian' | 'monolith' | 'htb';


export function normalizeThemePreset(preset: string | null | undefined): ThemePreset {
  if (!preset) return 'obsidian';
  const p = String(preset).toLowerCase().trim();
  if (p === 'monolith' || p === 'light' || p === 'clean-monolith' || p === 'clean monolith') return 'monolith';
  if (p === 'htb' || p === 'hackthebox' || p === 'hack-the-box' || p === 'htb-oled' || p === 'hack the box') return 'htb';
  // Legacy aliases ('oled', 'industrial', 'zerobox', 'neon', 'midnight-blue', 'slate', etc.) map to 'obsidian'
  return 'obsidian';
}

export type UiScale = 'auto' | 'tiny' | 'compact' | 'normal' | 'large' | 'huge';

export function applyThemePreset(preset: ThemePreset | string) {
  const normalizedPreset: ThemePreset = normalizeThemePreset(preset);
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', normalizedPreset);

    // Synchronize browser tab favicon with active theme preset
    try {
      const faviconMap: Record<string, string> = {
        obsidian: `${import.meta.env.BASE_URL}favicon-zerobox.png`,
        monolith: `${import.meta.env.BASE_URL}favicon-zerobox.png`,
        htb: `${import.meta.env.BASE_URL}favicon-htb.png`,
      };
      const iconPath = faviconMap[normalizedPreset] || `${import.meta.env.BASE_URL}favicon-zerobox.png`;
      const favicons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
      favicons.forEach(el => {
        el.href = iconPath;
      });
    } catch {
      // Ignore in non-browser or mock environments
    }
  }
}

export type ActiveTab = 'tracker' | 'cheatsheet' | 'field-manual' | 'writeup' | 'analytics' | 'methodology' | 'exam' | 'theme' | 'vault';

interface CtfStoreState {
  machines: Machine[];
  activeTargetId: string | null;
  globalVars: GlobalVariables;
  cheatsheets: CheatsheetCommand[];
  activitySessions: ActivitySession[];
  
  // UI States
  appBrand: string;
  activeTab: ActiveTab;
  viewMode: ViewMode;
  selectedMachineId: string | null;
  writeupMachineId: string | null;
  reportMachineId: string | null;
  commandPaletteOpen: boolean;
  newMachineModalOpen: boolean;
  backupModalOpen: boolean;
  reconAutomationModalOpen: boolean;
  operatorModalOpen: boolean;
  mobileMenuOpen: boolean;
  crtOverlay: boolean;
  soundEnabled: boolean;
  themePreset: ThemePreset | string;
  uiScale: UiScale;
  focusMode: boolean;
  snippetsDrawerOpen: boolean;
  revShellModalOpen: boolean;
  filterDrawerOpen: boolean;
  unexportedChangesCount: number;
  
  // Timer State
  isTimerRunning: boolean;
  activeTimerSeconds: number;
  timerLastTick: number | null;
  
  // Filters
  filters: FilterState;

  // Actions
  setFocusMode: (open: boolean) => void;
  toggleFocusMode: () => void;
  setSnippetsDrawerOpen: (open: boolean) => void;
  setRevShellModalOpen: (open: boolean) => void;
  setFilterDrawerOpen: (open: boolean) => void;
  resetUnexportedChangesCount: () => void;
  exportWorkspace: () => void | Promise<void>;
  importWorkspace: (jsonStr: string) => { success: boolean; count?: number; error?: string };
  setAppBrand: (brandId: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedMachineId: (id: string | null) => void;
  setWriteupMachineId: (id: string | null) => void;
  setReportMachineId: (id: string | null) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setNewMachineModalOpen: (open: boolean) => void;
  setBackupModalOpen: (open: boolean) => void;
  setReconAutomationModalOpen: (open: boolean) => void;
  setOperatorModalOpen: (open: boolean) => void;
  licenseModalOpen: boolean;
  setLicenseModalOpen: (open: boolean) => void;
  flexCardModalOpen: boolean;
  setFlexCardModalOpen: (open: boolean) => void;
  shortcutsModalOpen: boolean;
  setShortcutsModalOpen: (open: boolean) => void;
  settingsModalOpen: boolean;
  setSettingsModalOpen: (open: boolean) => void;
  showcaseModalOpen: boolean;
  setShowcaseModalOpen: (open: boolean) => void;
  notesImportModalOpen: boolean;
  setNotesImportModalOpen: (open: boolean) => void;
  userNotes: CptsNoteEntry[];
  userWikilinkMap: Record<string, string>;
  setUserNotes: (notes: CptsNoteEntry[]) => void;
  setUserWikilinkMap: (map: Record<string, string>) => void;
  importNotesFromJson: (jsonStr: string) => Promise<{ success: boolean; count: number; error?: string }>;
  clearUserNotes: () => Promise<void>;
  loadUserNotesFromDb: () => Promise<void>;
  setMobileMenuOpen: (open: boolean) => void;
  assignIpMachineId: string | null;
  setAssignIpMachineId: (id: string | null) => void;
  toggleCrtOverlay: () => void;
  toggleSound: () => void;
  setThemePreset: (preset: ThemePreset | string) => void;
  setUiScale: (scale: UiScale) => void;
  cycleUiScale: () => void;
  zoomIn: () => void;
  zoomOut: () => void;

  // Machine Actions
  updateMachineStatus: (id: string, status: PipelineStatus) => void;
  batchUpdateMachineStatus: (updates: { machineId: string; status: PipelineStatus }[]) => void;
  updateMachine: (id: string, updates: Partial<Machine>) => void;
  addCustomMachine: (machine: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteMachine: (id: string) => void;
  toggleUserFlag: (id: string, flagValue?: string) => void;
  toggleRootFlag: (id: string, flagValue?: string) => void;

  // Attack Methodology Checklist Actions
  setMachineOpenPorts: (machineId: string, ports: number[]) => void;
  setChecklistItemStatus: (machineId: string, itemId: string, status: import('../types').ChecklistItemStatus) => void;
  setChecklistItemNotes: (machineId: string, itemId: string, notes: string) => void;
  setActiveChecklistItem: (machineId: string, itemId: string | null) => void;
  resetMachineChecklist: (machineId: string) => void;

  // Active Target & Timer Actions
  setActiveTarget: (id: string | null) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: (machineId?: string) => void;
  tickTimer: () => void;

  // Variables & Cheatsheet Actions
  setGlobalVars: (vars: Partial<GlobalVariables>) => void;
  addCustomCommand: (cmd: Omit<CheatsheetCommand, 'id' | 'isCustom'>) => void;
  deleteCustomCommand: (id: string) => void;
  toggleStarCommand: (id: string) => void;

  // Filters Actions
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  // Custom Notes & Field Manual State
  customNotes: CptsNoteEntry[];
  deletedNoteIds: string[];
  userSolvesReset: boolean;
  addCustomNote: (note: Partial<CptsNoteEntry> & { title: string }) => void;
  updateNoteContent: (noteId: string, rawMarkdown: string) => void;
  deleteNote: (noteId: string) => void;
  restoreDeletedNotes: () => void;
  resetSolvesToZero: () => void;
  restoreDanielSolves: () => void;

  // Asynchronous Catalog Hydration
  isCatalogLoaded: boolean;
  isCatalogLoading: boolean;
  loadCatalog: () => Promise<void>;
  isDeepStorageLoaded: boolean;

  // Data Import & Export & Profile Data Isolation
  isHydrated: boolean;
  setIsHydrated: (val: boolean) => void;
  currentProfileId: string;
  isEphemeralStorage: boolean;
  setIsEphemeralStorage: (val: boolean) => void;
  loadProfileData: (profileId: string, options?: { startFresh?: boolean; cloneFromCurrent?: boolean }) => void;
  saveProfileData: (profileId?: string) => void;
  exportBackup: (options?: { redactSecrets?: boolean }) => string;
  importBackup: (jsonStr: string) => boolean;
  resetAllProgress: () => void;

  // Attack Graph & Pivot Topology State & Actions
  graphNodePositions: Record<string, AttackNodePosition>;
  graphEdges: AttackGraphEdge[];
  setGraphNodePosition: (id: string, pos: AttackNodePosition) => void;
  batchSetGraphNodePositions: (positions: Record<string, AttackNodePosition>) => void;
  resetGraphLayout: () => void;
  addGraphEdge: (edge: Omit<AttackGraphEdge, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => AttackGraphEdge;
  updateGraphEdge: (id: string, updates: Partial<AttackGraphEdge>) => void;
  deleteGraphEdge: (id: string) => void;
  clearGraphEdges: () => void;

  // Credentials & Loot (per profile; persisted by lootPersistence, not by zustand persist)
  credentials: Credential[];
  credAttempts: CredAttempt[];
  lootItems: LootItem[];
  /** Returns the new credential's id, or the id of the existing one when the credKey already exists. */
  addCredential: (input: NewCredentialInput) => string;
  /** Returns false when the id is unknown or the edit would duplicate another real credential. */
  updateCredential: (id: string, patch: CredentialPatch) => boolean;
  deleteCredential: (id: string) => void;
  upsertCredAttempt: (attempt: NewCredAttemptInput) => string;
  deleteCredAttempt: (id: string) => void;
  addLootItem: (input: NewLootItemInput) => string;
  updateLootItem: (id: string, patch: LootItemPatch) => void;
  deleteLootItem: (id: string) => void;
}

const DEFAULT_GLOBAL_VARS: GlobalVariables = {
  lhost: '10.10.14.X',
  lport: '4444',
  targetIp: '10.10.10.X',
  interface: 'tun0',
  customVars: {
    DOMAIN: 'corp.local',
    USER: 'administrator',
    PASSWORD: 'Password123!',
  }
};

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  selectedPlatform: 'ALL',
  selectedDifficulty: 'ALL',
  selectedCert: 'ALL',
  selectedOs: 'ALL',
  selectedCategory: 'ALL',
  selectedVulnCategory: 'ALL',
  excludeActiveDirectory: false,
  selectedTrack: 'ALL',
  selectedTracks: [],
  selectedStatus: 'ALL',
  selectedLanguage: 'ALL',
  selectedAreaOfInterest: 'ALL',
  selectedTechnique: 'ALL',
  selectedTags: [],
  sortBy: 'default',
  sortDirection: 'asc',
  hideEmptyLanes: false,
};

export const getProfileStorageKey = (profileId: string) => {
  const id = profileId || 'guest';
  const modernKey = `zerobox_operator_profile_${id}`;
  if (typeof window !== 'undefined') {
    const modernExists = safeLocalStorage.getItem(modernKey);
    if (modernExists) return modernKey;
    const legacyKey = `specter_ctf_profile_${id}`;
    const legacyExists = safeLocalStorage.getItem(legacyKey);
    if (legacyExists) return legacyKey;
  }
  return modernKey;
};

export const getWriteProfileStorageKey = (profileId: string) => `zerobox_operator_profile_${profileId || 'guest'}`;

export const SYNC_CHANNEL_NAME = 'zerobox_cross_tab_sync';
export const syncChannel: BroadcastChannel | null =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel(SYNC_CHANNEL_NAME)
    : null;

export const broadcastCrossTabMessage = (
  type: 'STATE_UPDATED' | 'WRITEUPS_UPDATED' | 'MACHINE_DELETED' | 'MACHINE_ADDED',
  payload?: any
) => {
  try {
    syncChannel?.postMessage({ type, payload, timestamp: Date.now() });
  } catch {}
};

const inMemoryFallbackStorage = new Map<string, string>();
let isStorageEphemeral = false;
let profileLoadGeneration = 0;

export const safeLocalStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const val = localStorage.getItem(name);
      return val !== null ? val : (inMemoryFallbackStorage.get(name) || null);
    } catch {
      isStorageEphemeral = true;
      return inMemoryFallbackStorage.get(name) || null;
    }
  },
  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(name, value);
    } catch (e: any) {
      isStorageEphemeral = true;
      inMemoryFallbackStorage.set(name, value);
      const isQuota = e?.name === 'QuotaExceededError' || e?.code === 22 || e?.number === -2147024882;
      try {
        window.dispatchEvent(
          new CustomEvent('zerobox:storage', {
            detail: isQuota
              ? { kind: 'quota', message: 'Storage full — writeups moved to deep storage. Export a backup now.' }
              : { kind: 'error', message: String(e?.message || e) },
          })
        );
      } catch {}
    }
  },
  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(name);
    } catch {
      isStorageEphemeral = true;
      inMemoryFallbackStorage.delete(name);
    }
  },
  isEphemeral: (): boolean => {
    if (isStorageEphemeral) return true;
    if (typeof window === 'undefined') return false;
    try {
      const test = '__zb_storage_test__';
      localStorage.setItem(test, '1');
      localStorage.removeItem(test);
      return false;
    } catch {
      isStorageEphemeral = true;
      return true;
    }
  }
};

export const ATTACK_GRAPH_STORAGE_KEY = 'zerobox-attack-graph-state';

export const getAttackGraphStorageKey = (profileId: string = 'guest'): string => {
  const id = profileId || 'guest';
  if (id === 'guest') {
    return ATTACK_GRAPH_STORAGE_KEY;
  }
  const specificKey = `zerobox_graph_state_${id}`;
  if (typeof window !== 'undefined') {
    const modernExists = safeLocalStorage.getItem(specificKey);
    if (modernExists) return specificKey;
    const legacyExists = safeLocalStorage.getItem(ATTACK_GRAPH_STORAGE_KEY);
    if (legacyExists) return ATTACK_GRAPH_STORAGE_KEY;
  }
  return specificKey;
};

export function loadInitialAttackGraphState(profileId: string = 'guest'): AttackGraphPersistedState {
  if (typeof window === 'undefined') {
    return { graphNodePositions: {}, graphEdges: [] };
  }
  try {
    const key = getAttackGraphStorageKey(profileId);
    const raw = safeLocalStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      const positions = parsed.graphNodePositions !== undefined ? parsed.graphNodePositions : (parsed.nodePositions || {});
      const edges = Array.isArray(parsed.graphEdges)
        ? parsed.graphEdges
        : Array.isArray(parsed.edges)
        ? parsed.edges
        : [];
      return {
        graphNodePositions: positions,
        graphEdges: edges,
      };
    }
  } catch (err) {
    console.warn('[ZeroBox] Failed to parse attack graph state from storage:', err);
  }
  return { graphNodePositions: {}, graphEdges: [] };
}

export function saveAttackGraphState(
  positions: Record<string, AttackNodePosition>,
  edges: AttackGraphEdge[],
  profileId: string = 'guest'
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = {
      graphNodePositions: positions,
      graphEdges: edges,
      nodePositions: positions,
      edges,
    };
    const serialized = JSON.stringify(payload);
    const id = profileId || 'guest';
    if (id !== 'guest') {
      safeLocalStorage.setItem(`zerobox_graph_state_${id}`, serialized);
    }
    safeLocalStorage.setItem(ATTACK_GRAPH_STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('[ZeroBox] Failed to save attack graph state to storage:', err);
  }
}

export const getInitialProfileId = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const auth = safeLocalStorage.getItem('rootvector_auth_session');
      if (auth) {
        const parsed = JSON.parse(auth);
        if (parsed.state?.user?.id) {
          return parsed.state.user.id;
        }
      }
    } catch {}
  }
  return 'guest';
};

export const CUSTOM_MACHINES_STORAGE_KEY = 'zerobox_custom_machines_v1';

export const getCustomMachinesStorageKey = (profileId: string = 'guest'): string => {
  return `${CUSTOM_MACHINES_STORAGE_KEY}_${profileId}`;
};

export const loadCustomMachinesFromStorage = (profileId: string = 'guest'): Machine[] => {
  if (typeof window === 'undefined') return [];
  try {
    const specificKey = getCustomMachinesStorageKey(profileId);
    const rawSpecific = safeLocalStorage.getItem(specificKey);
    if (rawSpecific) {
      const parsed = JSON.parse(rawSpecific);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // Global fallback
    const rawGlobal = safeLocalStorage.getItem(CUSTOM_MACHINES_STORAGE_KEY);
    if (rawGlobal) {
      const parsed = JSON.parse(rawGlobal);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('[ZeroBox] Failed to load custom machines from storage:', err);
  }
  return [];
};

export const saveCustomMachinesToStorage = (machines: Machine[], profileId: string = 'guest'): void => {
  if (typeof window === 'undefined') return;
  try {
    const customOnly = machines.filter(
      (m) => m.isCustom || m.platform === 'Custom' || (m.id && m.id.startsWith('custom-'))
    );
    const serialized = JSON.stringify(customOnly);
    safeLocalStorage.setItem(getCustomMachinesStorageKey(profileId), serialized);
    safeLocalStorage.setItem(CUSTOM_MACHINES_STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('[ZeroBox] Failed to save custom machines to storage:', err);
  }
};

export const loadInitialProfileData = (profileId: string) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = safeLocalStorage.getItem(getProfileStorageKey(profileId));
      let state = raw ? JSON.parse(raw) : null;
      if (!state) {
        const legacy = safeLocalStorage.getItem('specter_ctf_store_v2');
        if (legacy) {
          const parsed = JSON.parse(legacy);
          state = parsed.state || parsed;
        }
      }

      if (!state && profileId === 'usr_daniel') {
        state = { machines: DEMO_SOLVED_ROSTER, userSolvesReset: false };
      }

      // Re-integrate any isolated custom machines in case of partial reset or fresh profile
      const storedCustom = loadCustomMachinesFromStorage(profileId);
      if (Array.isArray(storedCustom) && storedCustom.length > 0) {
        const validCustom = storedCustom.filter((m): m is Machine => m !== null && typeof m === 'object' && typeof m.id === 'string');
        if (!state) {
          state = { machines: validCustom };
        } else {
          const rawExisting = Array.isArray(state.machines) ? state.machines : [];
          const validExisting = rawExisting.filter((m: Machine) => m !== null && typeof m === 'object' && typeof m.id === 'string');
          const existingIds = new Set(validExisting.map((m: Machine) => m.id));
          const missingCustom = validCustom.filter((m) => !existingIds.has(m.id));
          state.machines = [...missingCustom, ...validExisting];
        }
      }

      return state;
    } catch {}
  }
  return null;
};

export const KNOWN_ACTIVE_SEASONAL_NAMES = new Set([
  'scaffold', 'blocksynergy', 'danglingtree', 'cohort', 'darkzeroreturns', 
  'bedside', 'paperwork', 'makesense', 'enigma', 'nimbus', 'checkpoint', 
  'connected', 'devhub', 'reactor', 'smarthire', 'pingpong', 'silentium', 
  'garfield', 'eloquia', 'hercules'
]);

export const normalizeMachineSlug = (str?: string): string => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
};

export const CATALOG_MACHINE_ALIASES: Record<string, string> = {
  // Legacy or alternate IDs mapped to canonical catalog machine IDs
  'devel-box': 'htb-devel',
  'devel': 'htb-devel',
  'lame-box': 'htb-lame',
  'lame': 'htb-lame',
  'blue-box': 'htb-blue',
  'legacy-box': 'htb-legacy',
  'legacy': 'htb-legacy',
  'netmon-box': 'htb-netmon',
  'optimum-box': 'htb-optimum',
  'bashed-box': 'htb-bashed',
  'nibbles-box': 'htb-nibbles',
  'jerry-box': 'htb-jerry',
  'shocker-box': 'htb-shocker',
  'sau-box': 'htb-sau',
};

export const toLeanMachines = (machines: Machine[]): Machine[] => {
  if (!Array.isArray(machines)) return [];
  return machines
    .filter((m): m is Machine => m !== null && typeof m === 'object' && typeof m.id === 'string')
    .map((m) => {
      // Preserve custom user-added machines completely (including user-entered hints, walkthroughs, etc.)
      if (m.isCustom || m.platform === 'Custom' || (m.id && m.id.startsWith('custom-'))) {
        return { ...m, isCustom: true };
      }
      // For static catalog machines, strip heavy static content that is deterministically rehydrated by mergeMachinesWithCatalog
      const { officialWalkthrough, officialSynopsis, officialPdf, ...userFields } = m;
      return userFields as Machine;
    });
};

export const mergeMachinesWithCatalog = (
  storedMachines?: Machine[],
  userSolvesReset: boolean = false,
  catalogSource?: Machine[]
): Machine[] => {
  const catalog = catalogSource || getLoadedMachinesCatalog() || STARTER_MACHINES;
  const map = new Map<string, Machine>();
  const nameMap = new Map<string, Machine>();
  const platformNameMap = new Map<string, Machine>();
  const platformSlugMap = new Map<string, Machine>();
  const slugMap = new Map<string, Machine>();
  const idSlugMap = new Map<string, Machine>();

  catalog.forEach((m) => {
    const entry = userSolvesReset
      ? {
          ...m,
          status: 'backlog' as const,
          userFlag: undefined,
          rootFlag: undefined,
          userPwnedAt: undefined,
          rootPwnedAt: undefined,
          timeSpentSeconds: 0,
          timeToUserSeconds: undefined,
          timeToRootSeconds: undefined,
        }
      : m;

    map.set(m.id, entry);
    const normName = m.name.toLowerCase().trim();
    const nameSlug = normalizeMachineSlug(m.name);
    const idSlug = normalizeMachineSlug(m.id);

    if (m.platform) {
      platformNameMap.set(`${m.platform}:${normName}`, entry);
      if (nameSlug) platformSlugMap.set(`${m.platform}:${nameSlug}`, entry);
    }
    nameMap.set(normName, entry);
    if (nameSlug && !slugMap.has(nameSlug)) {
      slugMap.set(nameSlug, entry);
    }
    if (idSlug && !idSlugMap.has(idSlug)) {
      idSlugMap.set(idSlug, entry);
    }
  });

  if (Array.isArray(storedMachines) && storedMachines.length > 0) {
    storedMachines
      .filter((m): m is Machine => m !== null && typeof m === 'object' && typeof m.id === 'string')
      .forEach((m) => {
        const normName = typeof m.name === 'string' ? m.name.toLowerCase().trim() : '';
        const nameSlug = normalizeMachineSlug(m.name);
        const idSlug = normalizeMachineSlug(m.id);

      // Multi-tier lookup to safeguard against catalog ID, name, or platform drift
      let catalogMachine = map.get(m.id);

      if (!catalogMachine) {
        const aliasTarget =
          (m.id && CATALOG_MACHINE_ALIASES[m.id]) ||
          (idSlug && CATALOG_MACHINE_ALIASES[idSlug]) ||
          (normName && CATALOG_MACHINE_ALIASES[normName]);
        if (aliasTarget) {
          catalogMachine = map.get(aliasTarget) || nameMap.get(aliasTarget.toLowerCase().trim());
        }
      }

      if (!catalogMachine && m.platform) {
        if (normName) catalogMachine = platformNameMap.get(`${m.platform}:${normName}`);
        if (!catalogMachine && nameSlug) catalogMachine = platformSlugMap.get(`${m.platform}:${nameSlug}`);
      }

      if (!catalogMachine && normName) {
        catalogMachine = nameMap.get(normName);
      }

      if (!catalogMachine && nameSlug) {
        catalogMachine = slugMap.get(nameSlug);
      }

      if (!catalogMachine && idSlug) {
        catalogMachine = idSlugMap.get(idSlug);
      }
      if (catalogMachine) {
        if (userSolvesReset) {
          // User started fresh: respect their current status (unsolved/foothold/completed) and progress without forcing catalog completed status
          const mStatus = m.status || 'backlog';
          const hasUserFlag = Boolean(m.userFlag?.trim());
          const hasRootFlag = Boolean(m.rootFlag?.trim());
          const isFootholdOrAbove = mStatus === 'foothold' || mStatus === 'root' || mStatus === 'completed';
          const isRootOrAbove = mStatus === 'root' || mStatus === 'completed';
          map.set(catalogMachine.id, {
            ...catalogMachine,
            ...m,
            status: m.status || 'unsolved',
            userFlag: m.userFlag,
            rootFlag: m.rootFlag,
            userPwnedAt: isFootholdOrAbove || hasUserFlag ? m.userPwnedAt : undefined,
            rootPwnedAt: isRootOrAbove || hasRootFlag ? m.rootPwnedAt : undefined,
            timeSpentSeconds: m.timeSpentSeconds || 0,
            timeToUserSeconds: isFootholdOrAbove ? m.timeToUserSeconds : undefined,
            timeToRootSeconds: isRootOrAbove ? m.timeToRootSeconds : undefined,
            checklist: m.checklist || catalogMachine.checklist || { openPorts: [], activeItemId: null, itemsState: {} },
            openPorts: m.openPorts || catalogMachine.openPorts || [],
            quickNotes: m.quickNotes || catalogMachine.quickNotes,
            writeupMarkdown: m.writeupMarkdown || catalogMachine.writeupMarkdown,
            hint: catalogMachine.hint || m.hint,
            skillsLearned: catalogMachine.skillsLearned || m.skillsLearned,
            officialPdf: catalogMachine.officialPdf || m.officialPdf,
            officialSynopsis: catalogMachine.officialSynopsis || m.officialSynopsis,
            officialWalkthrough: undefined,
            tags: Array.from(new Set([...(catalogMachine.tags || []), ...(m.tags || [])])),
            certifications: Array.from(new Set([...(catalogMachine.certifications || []), ...(m.certifications || [])])) as any,
          });
        } else {
          // Clean slate baseline: Catalog metadata is decoupled from candidate solve history.
          // Candidate solve state is derived strictly from operator progress.
          const mStatus: PipelineStatus = m.status || 'backlog';
          const hasUserFlag = Boolean(m.userFlag?.trim());
          const hasRootFlag = Boolean(m.rootFlag?.trim());
          const isFootholdOrAbove = mStatus === 'foothold' || mStatus === 'root' || mStatus === 'completed';
          const isRootOrAbove = mStatus === 'root' || mStatus === 'completed';
          const userHasProgress = mStatus !== 'backlog' || hasUserFlag || hasRootFlag || (m.timeSpentSeconds > 0) || Boolean(m.quickNotes) || Boolean(m.writeupMarkdown);

          map.set(catalogMachine.id, {
            ...catalogMachine,
            ...m,
            status: userHasProgress ? mStatus : 'backlog',
            userFlag: m.userFlag || '',
            rootFlag: m.rootFlag || '',
            userPwnedAt: isFootholdOrAbove || hasUserFlag ? m.userPwnedAt : undefined,
            rootPwnedAt: isRootOrAbove || hasRootFlag ? m.rootPwnedAt : undefined,
            timeSpentSeconds: m.timeSpentSeconds || 0,
            timeToUserSeconds: isFootholdOrAbove ? m.timeToUserSeconds : undefined,
            timeToRootSeconds: isRootOrAbove ? m.timeToRootSeconds : undefined,
            checklist: m.checklist || catalogMachine.checklist || { openPorts: [], activeItemId: null, itemsState: {} },
            openPorts: m.openPorts || catalogMachine.openPorts || [],
            quickNotes: m.quickNotes || catalogMachine.quickNotes,
            writeupMarkdown: m.writeupMarkdown || catalogMachine.writeupMarkdown,
            hint: catalogMachine.hint || m.hint,
            skillsLearned: catalogMachine.skillsLearned || m.skillsLearned,
            officialPdf: catalogMachine.officialPdf || m.officialPdf,
            officialSynopsis: catalogMachine.officialSynopsis || m.officialSynopsis,
            officialWalkthrough: undefined,
            tags: Array.from(new Set([...(catalogMachine.tags || []), ...(m.tags || [])])),
            certifications: Array.from(new Set([...(catalogMachine.certifications || []), ...(m.certifications || [])])) as any,
          });
        }
      } else if (
        m.isCustom ||
        m.platform === 'Custom' ||
        (m.id && m.id.startsWith('custom-')) ||
        Boolean(m.userFlag?.trim()) ||
        Boolean(m.rootFlag?.trim()) ||
        m.status === 'completed' ||
        m.status === 'foothold' ||
        (m.timeSpentSeconds && m.timeSpentSeconds > 0) ||
        Boolean(m.quickNotes?.trim()) ||
        Boolean(m.writeupMarkdown?.trim())
      ) {
        // Genuine custom user-added machine OR legacy catalog machine with verified user progress
        map.set(m.id, {
          ...m,
          isCustom: true, // Safeguard: mark as custom so user progress and notes are never pruned
        });
      }
    });
  }

  // Enforce Hack The Box Terms of Service compliance: Active machines MUST NEVER have writeupUrl or hint
  map.forEach((machine) => {
    const norm = machine.name.toLowerCase().trim();
    if (KNOWN_ACTIVE_SEASONAL_NAMES.has(norm)) {
      machine.isActive = true;
    }
    if (machine.isActive) {
      machine.writeupUrl = '';
      machine.hint = '';
      machine.officialWalkthrough = '';
      machine.officialSynopsis = '';
      machine.officialPdf = '';
    }
  });

  // Priority ordering: User-added custom machines are anchored at the very TOP (index 0) of the collection
  const customEntries: Machine[] = [];
  const catalogEntries: Machine[] = [];

  for (const m of map.values()) {
    if (m.isCustom || m.platform === 'Custom' || (m.id && m.id.startsWith('custom-'))) {
      customEntries.push(m);
    } else {
      catalogEntries.push(m);
    }
  }

  return [...customEntries, ...catalogEntries];
};

const initialProfileId = getInitialProfileId();
const initialProfileData = loadInitialProfileData(initialProfileId);
const initialAttackGraphData = loadInitialAttackGraphState(initialProfileId);
const initialLootData = loadLootState(initialProfileId);

export const useCtfStore = create<CtfStoreState>()(
  persist(
    (set, get): CtfStoreState => ({
      machines: mergeMachinesWithCatalog(initialProfileData?.machines, Boolean(initialProfileData?.userSolvesReset)),
      activeTargetId: initialProfileData?.activeTargetId || null,
      globalVars: initialProfileData?.globalVars || DEFAULT_GLOBAL_VARS,
      cheatsheets: initialProfileData?.cheatsheets || INITIAL_CHEATSHEET,
      activitySessions: initialProfileData?.activitySessions || [],
      currentProfileId: initialProfileId,
      customNotes: initialProfileData?.customNotes || [],
      deletedNoteIds: initialProfileData?.deletedNoteIds || [],
      userSolvesReset: Boolean(initialProfileData?.userSolvesReset),
      isHydrated: true,
      setIsHydrated: (val) => set({ isHydrated: val }),

      // Attack Graph & Pivot Topology State
      graphNodePositions: initialAttackGraphData.graphNodePositions,
      graphEdges: initialAttackGraphData.graphEdges,

      // Credentials & Loot (per-profile, loaded lazily with legacy migration)
      credentials: initialLootData.credentials,
      credAttempts: initialLootData.credAttempts,
      lootItems: initialLootData.lootItems,

      appBrand: 'zerobox',
      activeTab: 'tracker',
      viewMode: 'kanban',
      selectedMachineId: null,
      writeupMachineId: null,
      reportMachineId: null,
      commandPaletteOpen: false,
      newMachineModalOpen: false,
      backupModalOpen: false,
      reconAutomationModalOpen: false,
      operatorModalOpen: false,
      licenseModalOpen: false,
      flexCardModalOpen: false,
      shortcutsModalOpen: false,
      settingsModalOpen: false,
      showcaseModalOpen: false,
      notesImportModalOpen: false,
      userNotes: [],
      userWikilinkMap: {},
      mobileMenuOpen: false,
      assignIpMachineId: null,
      crtOverlay: false,
      soundEnabled: true,
      themePreset: 'obsidian' as ThemePreset,
      uiScale: 'auto',
      focusMode: false,
      snippetsDrawerOpen: false,
      revShellModalOpen: false,
      filterDrawerOpen: false,
      unexportedChangesCount: 0,
      isEphemeralStorage: safeLocalStorage.isEphemeral(),
      setIsEphemeralStorage: (val) => set({ isEphemeralStorage: val }),
      isTimerRunning: false,
      activeTimerSeconds: 0,
      timerLastTick: null,
      filters: DEFAULT_FILTERS,
      isCatalogLoaded: false,
      isCatalogLoading: false,
      isDeepStorageLoaded: false,

      setFocusMode: (open) => set({ focusMode: open }),
      toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
      setSnippetsDrawerOpen: (open) => set({ snippetsDrawerOpen: open }),
      setRevShellModalOpen: (open) => set({ revShellModalOpen: open }),
      setFilterDrawerOpen: (open) => set({ filterDrawerOpen: open }),
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
            userSolvesReset: data.userSolvesReset !== undefined ? data.userSolvesReset : state.userSolvesReset,
            unexportedChangesCount: 0,
          }));
          get().saveProfileData();
          return { success: true, count: validated.restoredCount };
        } catch (err: any) {
          return { success: false, error: err?.message || 'Failed to parse JSON file' };
        }
      },

      loadCatalog: async () => {
        if (get().isCatalogLoaded || get().isCatalogLoading) return;
        set({ isCatalogLoading: true });
        try {
          const INITIAL_MACHINES = await loadMachinesCatalog();
          const state = get();
          const merged = mergeMachinesWithCatalog(state.machines, state.userSolvesReset, INITIAL_MACHINES);
          set({
            machines: merged,
            isCatalogLoaded: true,
            isCatalogLoading: false,
          });
        } catch (err) {
          console.error('Failed to lazy load machinesCatalog:', err);
          set({ isCatalogLoading: false });
        }
      },

      setAppBrand: (brandId) => set({ appBrand: brandId }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setViewMode: (mode) => set({ viewMode: mode }),
      setSelectedMachineId: (id) => set({ selectedMachineId: id }),
      setWriteupMachineId: (id) => set({ writeupMachineId: id }),
      setReportMachineId: (id) => set({ reportMachineId: id }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setNewMachineModalOpen: (open) => set({ newMachineModalOpen: open }),
      setBackupModalOpen: (open) => set({ backupModalOpen: open }),
      setReconAutomationModalOpen: (open) => set({ reconAutomationModalOpen: open }),
      setOperatorModalOpen: (open) => set({ operatorModalOpen: open }),
      setLicenseModalOpen: (open) => set({ licenseModalOpen: open }),
      setFlexCardModalOpen: (open) => set({ flexCardModalOpen: open }),
      setShortcutsModalOpen: (open) => set({ shortcutsModalOpen: open }),
      setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),
      setShowcaseModalOpen: (open) => set({ showcaseModalOpen: open }),
      setNotesImportModalOpen: (open) => set({ notesImportModalOpen: open }),
      setUserNotes: (notes) => set({ userNotes: notes }),
      setUserWikilinkMap: (map) => set({ userWikilinkMap: map }),
      importNotesFromJson: async (jsonStr) => {
        try {
          const parsed = JSON.parse(jsonStr);
          const notes: CptsNoteEntry[] = Array.isArray(parsed)
            ? parsed
            : (Array.isArray(parsed.notes) ? parsed.notes : []);

          if (!notes.length) {
            return { success: false, count: 0, error: 'No valid notes array found in JSON payload.' };
          }

          const wikilinkMap: Record<string, string> = parsed.wikilinkMap || {};
          await saveVaultToIndexedDb({ notes, wikilinkMap });
          set({ userNotes: notes, userWikilinkMap: wikilinkMap });
          return { success: true, count: notes.length };
        } catch (err: any) {
          return { success: false, count: 0, error: err?.message || 'Invalid JSON format' };
        }
      },
      clearUserNotes: async () => {
        await clearVaultFromIndexedDb();
        set({ userNotes: [], userWikilinkMap: {}, deletedNoteIds: [], customNotes: [] });
      },
      loadUserNotesFromDb: async () => {
        try {
          const vault = await loadVaultFromIndexedDb();
          if (vault && vault.notes && vault.notes.length > 0) {
            set({ 
              userNotes: vault.notes,
              userWikilinkMap: vault.wikilinkMap || {}
            });
          }
        } catch (err) {
          console.warn('[ZeroBox] Could not load user notes from IndexedDB', err);
        }
      },
      setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
      setAssignIpMachineId: (id) => set({ assignIpMachineId: id }),
      toggleCrtOverlay: () => set((s) => ({ crtOverlay: !s.crtOverlay })),
      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      setThemePreset: (preset: ThemePreset | string) => {
        const normalized = normalizeThemePreset(preset);
        applyThemePreset(normalized);
        set({ themePreset: normalized });
      },
      setUiScale: (scale) => set({ uiScale: scale }),
      zoomIn: () => set((s) => {
        const steps: UiScale[] = ['tiny', 'compact', 'normal', 'large', 'huge'];
        if (s.uiScale === 'auto') {
          return { uiScale: 'large' };
        }
        const currentIdx = steps.indexOf(s.uiScale);
        const nextIdx = Math.min(steps.length - 1, (currentIdx === -1 ? 2 : currentIdx) + 1);
        return { uiScale: steps[nextIdx] };
      }),
      zoomOut: () => set((s) => {
        const steps: UiScale[] = ['tiny', 'compact', 'normal', 'large', 'huge'];
        if (s.uiScale === 'auto') {
          return { uiScale: 'compact' };
        }
        const currentIdx = steps.indexOf(s.uiScale);
        const nextIdx = Math.max(0, (currentIdx === -1 ? 2 : currentIdx) - 1);
        return { uiScale: steps[nextIdx] };
      }),
      cycleUiScale: () => set((s) => {
        const order: UiScale[] = ['auto', 'tiny', 'compact', 'normal', 'large', 'huge'];
        const currentIdx = order.indexOf(s.uiScale || 'auto');
        const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % order.length;
        return { uiScale: order[nextIdx] };
      }),

      updateMachineStatus: (id, status) => {
        set((state) => {
          const now = new Date().toISOString();
          const today = toLocalDateKey(new Date());
          const isNowRoot = status === 'root' || status === 'completed';
          const isNowFoothold = status === 'foothold' || isNowRoot;
          
          // Automatically stop the stopwatch timer when machine is rooted or completed
          const shouldStopTimer = isNowRoot && (state.activeTargetId === id || state.isTimerRunning);

          const updated = state.machines.map((m) => {
            if (m.id !== id) return m;

            const elapsed = state.activeTargetId === id ? state.activeTimerSeconds : 0;
            const finalTime = m.timeSpentSeconds > 0 ? m.timeSpentSeconds : elapsed;

            const hasUserFlag = Boolean(m.userFlag?.trim());
            const hasRootFlag = Boolean(m.rootFlag?.trim());

            return {
              ...m,
              status,
              timeSpentSeconds: finalTime > 0 ? finalTime : m.timeSpentSeconds,
              userPwnedAt: isNowFoothold ? (m.userPwnedAt || now) : (hasUserFlag ? m.userPwnedAt : undefined),
              rootPwnedAt: isNowRoot ? (m.rootPwnedAt || now) : (hasRootFlag ? m.rootPwnedAt : undefined),
              timeToUserSeconds: isNowFoothold ? (m.timeToUserSeconds || finalTime) : undefined,
              timeToRootSeconds: isNowRoot ? (m.timeToRootSeconds || finalTime) : undefined,
              updatedAt: now,
            };
          });

          // Log activity session if root or completed
          let sessions = state.activitySessions;
          if (isNowRoot) {
            const m = state.machines.find(x => x.id === id);
            const duration = (state.activeTargetId === id && state.activeTimerSeconds > 0)
              ? state.activeTimerSeconds
              : (m?.timeSpentSeconds || 0);

            sessions = [
              ...sessions,
              {
                id: 'sess-' + Date.now(),
                machineId: id,
                machineName: m?.name || 'Unknown',
                date: today,
                durationSeconds: duration,
                type: 'root',
              }
            ];
          }

          // Auto-sync active target and RHOST (targetIp) when entering Active Recon or Foothold Obtained
          let activeId = state.activeTargetId;
          let newGlobalVars = state.globalVars;
          let assignIpId = state.assignIpMachineId;
          let shouldStartTimer = state.isTimerRunning;

          if (status === 'recon' || status === 'foothold') {
            activeId = id;
            const targetM = state.machines.find((x) => x.id === id);
            if (targetM) {
              const isPlaceholder = !targetM.ip || targetM.ip.toLowerCase().includes('x') || targetM.ip === '10.10.10.X';
              if (isPlaceholder) {
                assignIpId = id;
              } else {
                newGlobalVars = {
                  ...state.globalVars,
                  targetIp: targetM.ip,
                };
              }
            }
          }

          return { 
            machines: updated, 
            activitySessions: sessions,
            isTimerRunning: shouldStopTimer ? false : shouldStartTimer,
            activeTargetId: activeId,
            globalVars: newGlobalVars,
            assignIpMachineId: assignIpId,
            unexportedChangesCount: (state.unexportedChangesCount || 0) + 1,
          };
        });
      },

      batchUpdateMachineStatus: (updates) => {
        if (!updates || updates.length === 0) return;
        const updateMap = new Map(updates.map(u => [u.machineId, u.status]));
        const now = new Date().toISOString();
        set((state) => {
          const updated = state.machines.map((m) => {
            const targetStatus = updateMap.get(m.id);
            if (!targetStatus) return m;

            // Invariant: Never downgrade Daniel Dayan's existing completed machines unless user started fresh
            if (!state.userSolvesReset && m.status === 'completed' && targetStatus !== 'completed') return m;

            const isPwned = targetStatus === 'root' || targetStatus === 'completed';
            const isFoothold = targetStatus === 'foothold' || isPwned;
            const hasUserFlag = Boolean(m.userFlag?.trim());
            const hasRootFlag = Boolean(m.rootFlag?.trim());

            return {
              ...m,
              status: targetStatus,
              rootPwnedAt: isPwned ? (m.rootPwnedAt || now) : (hasRootFlag ? m.rootPwnedAt : undefined),
              userPwnedAt: isFoothold ? (m.userPwnedAt || now) : (hasUserFlag ? m.userPwnedAt : undefined),
              timeToUserSeconds: isFoothold ? m.timeToUserSeconds : undefined,
              timeToRootSeconds: isPwned ? m.timeToRootSeconds : undefined,
              updatedAt: now,
            };
          });
          return { machines: updated };
        });
      },

      updateMachine: (id, updates) => {
        set((state) => {
          const isNowCompleted = updates.status === 'root' || updates.status === 'completed';
          const shouldStopTimer = isNowCompleted && (state.activeTargetId === id || state.isTimerRunning);
          const syncTargetIp = Boolean(state.activeTargetId === id && updates.ip);

          return {
            machines: state.machines.map((m) => {
              if (m.id !== id) return m;
              const merged = { ...m, ...updates, updatedAt: new Date().toISOString() };
              const norm = merged.name.toLowerCase().trim();
              if (KNOWN_ACTIVE_SEASONAL_NAMES.has(norm)) {
                merged.isActive = true;
              }
              if (merged.isActive) {
                merged.writeupUrl = '';
                merged.hint = '';
                merged.officialWalkthrough = '';
                merged.officialSynopsis = '';
                merged.officialPdf = '';
              }
              return merged;
            }),
            globalVars: syncTargetIp
              ? { ...state.globalVars, targetIp: updates.ip! }
              : state.globalVars,
            isTimerRunning: shouldStopTimer ? false : state.isTimerRunning,
            unexportedChangesCount: (state.unexportedChangesCount || 0) + 1,
          };
        });
        const profileId = get().currentProfileId || 'guest';
        get().saveProfileData(profileId);
        saveCustomMachinesToStorage(get().machines, profileId);
      },

      addCustomMachine: (data) => {
        const id = 'custom-' + Date.now() + '-' + data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const now = new Date().toISOString();
        const norm = data.name.toLowerCase().trim();
        const isKnownActive = KNOWN_ACTIVE_SEASONAL_NAMES.has(norm);
        const isActive = Boolean(data.isActive || isKnownActive);

        const newMachine: Machine = {
          ...data,
          id,
          isCustom: true,
          isActive,
          // If active seasonal lab, enforce HTB ToS sanitation strictly at intake
          writeupUrl: isActive ? '' : (data.writeupUrl || ''),
          hint: isActive ? '' : (data.hint || ''),
          officialWalkthrough: '',
          officialSynopsis: '',
          officialPdf: '',
          timeSpentSeconds: 0,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          machines: [newMachine, ...state.machines],
          unexportedChangesCount: (state.unexportedChangesCount || 0) + 1,
        }));
        const profileId = get().currentProfileId || 'guest';
        get().saveProfileData(profileId);
        saveCustomMachinesToStorage(get().machines, profileId);
        broadcastCrossTabMessage('MACHINE_ADDED', { machine: newMachine, profileId });
      },

      deleteMachine: (id) => {
        const profileId = get().currentProfileId || 'guest';
        deleteMachineDeepData(profileId, id).catch(() => {});
        broadcastCrossTabMessage('MACHINE_DELETED', { id, profileId });
        set((state) => ({
          machines: state.machines.filter((m) => m.id !== id),
          activeTargetId: state.activeTargetId === id ? null : state.activeTargetId,
          selectedMachineId: state.selectedMachineId === id ? null : state.selectedMachineId,
          unexportedChangesCount: (state.unexportedChangesCount || 0) + 1,
        }));
        get().saveProfileData(profileId);
        saveCustomMachinesToStorage(get().machines, profileId);
      },

      toggleUserFlag: (id, flagValue) => {
        set((state) => {
          const now = new Date().toISOString();
          const currentElapsed = id === state.activeTargetId ? state.activeTimerSeconds : undefined;
          const updated = state.machines.map((m) => {
            if (m.id !== id) return m;
            const hadUser = Boolean(m.userPwnedAt);
            const userPwnedAt = hadUser ? undefined : now;
            let status = m.status;
            if (!hadUser && (status === 'backlog' || status === 'recon')) status = 'foothold';
            const totalSeconds = currentElapsed !== undefined ? Math.max(m.timeSpentSeconds, currentElapsed) : m.timeSpentSeconds;
            return {
              ...m,
              userFlag: flagValue !== undefined ? flagValue : m.userFlag,
              userPwnedAt,
              status,
              timeSpentSeconds: totalSeconds,
              timeToUserSeconds: !hadUser ? totalSeconds : m.timeToUserSeconds,
              updatedAt: now,
            };
          });
          return { machines: updated };
        });
      },

      toggleRootFlag: (id, flagValue) => {
        set((state) => {
          const now = new Date().toISOString();
          const currentElapsed = id === state.activeTargetId ? state.activeTimerSeconds : undefined;
          const updated = state.machines.map((m) => {
            if (m.id !== id) return m;
            const hadRoot = Boolean(m.rootPwnedAt);
            const rootPwnedAt = hadRoot ? undefined : now;
            let status = m.status;
            if (!hadRoot) status = 'root';
            const totalSeconds = currentElapsed !== undefined ? Math.max(m.timeSpentSeconds, currentElapsed) : m.timeSpentSeconds;
            return {
              ...m,
              rootFlag: flagValue !== undefined ? flagValue : m.rootFlag,
              rootPwnedAt,
              status,
              timeSpentSeconds: totalSeconds,
              timeToRootSeconds: !hadRoot ? totalSeconds : m.timeToRootSeconds,
              updatedAt: now,
            };
          });
          return { machines: updated };
        });
      },

      setMachineOpenPorts: (machineId, ports) => {
        set((state) => ({
          machines: state.machines.map((m) =>
            m.id === machineId
              ? {
                  ...m,
                  openPorts: ports,
                  checklist: {
                    openPorts: ports,
                    activeItemId: m.checklist?.activeItemId || null,
                    itemsState: m.checklist?.itemsState || {},
                  },
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));
      },

      setChecklistItemStatus: (machineId, itemId, status) => {
        set((state) => {
          const now = new Date().toISOString();
          return {
            machines: state.machines.map((m) => {
              if (m.id !== machineId) return m;

              const existingChecklist = m.checklist || {
                openPorts: m.openPorts || [],
                activeItemId: null,
                itemsState: {},
              };

              const currentItem = existingChecklist.itemsState[itemId] || { status: 'todo' };
              const startedAt = status === 'in_progress' ? (currentItem.startedAt || now) : currentItem.startedAt;
              const completedAt = status === 'done' ? now : (status === 'todo' ? undefined : currentItem.completedAt);
              const activeItemId = status === 'in_progress' ? itemId : (existingChecklist.activeItemId === itemId ? null : existingChecklist.activeItemId);

              return {
                ...m,
                checklist: {
                  ...existingChecklist,
                  activeItemId,
                  itemsState: {
                    ...existingChecklist.itemsState,
                    [itemId]: {
                      ...currentItem,
                      status,
                      startedAt,
                      completedAt,
                    },
                  },
                },
                updatedAt: now,
              };
            }),
          };
        });
      },

      setChecklistItemNotes: (machineId, itemId, notes) => {
        set((state) => ({
          machines: state.machines.map((m) => {
            if (m.id !== machineId) return m;
            const existingChecklist = m.checklist || {
              openPorts: m.openPorts || [],
              activeItemId: null,
              itemsState: {},
            };
            const currentItem = existingChecklist.itemsState[itemId] || { status: 'todo' };

            return {
              ...m,
              checklist: {
                ...existingChecklist,
                itemsState: {
                  ...existingChecklist.itemsState,
                  [itemId]: {
                    ...currentItem,
                    notes,
                  },
                },
              },
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      setActiveChecklistItem: (machineId, itemId) => {
        set((state) => ({
          machines: state.machines.map((m) =>
            m.id === machineId
              ? {
                  ...m,
                  checklist: {
                    openPorts: m.openPorts || [],
                    activeItemId: itemId,
                    itemsState: m.checklist?.itemsState || {},
                  },
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));
      },

      resetMachineChecklist: (machineId) => {
        set((state) => ({
          machines: state.machines.map((m) =>
            m.id === machineId
              ? {
                  ...m,
                  checklist: {
                    openPorts: m.openPorts || [],
                    activeItemId: null,
                    itemsState: {},
                  },
                  updatedAt: new Date().toISOString(),
                }
              : m
          ),
        }));
      },

      setActiveTarget: (id) => {
        set((state) => {
          // Flush current timer to active target before switching
          let updatedMachines = state.machines;
          if (state.activeTargetId) {
            updatedMachines = updatedMachines.map((m) =>
              m.id === state.activeTargetId
                ? { ...m, timeSpentSeconds: state.activeTimerSeconds }
                : m
            );
          }

          if (!id) {
            return {
              machines: updatedMachines,
              activeTargetId: null,
              isTimerRunning: false,
              activeTimerSeconds: 0,
            };
          }

          const m = updatedMachines.find((x) => x.id === id);
          const isPlaceholderIp = Boolean(m && (!m.ip || m.ip.toLowerCase().includes('x') || m.ip === '10.10.10.X'));
          return {
            machines: updatedMachines,
            activeTargetId: id,
            activeTimerSeconds: m?.timeSpentSeconds || 0,
            assignIpMachineId: isPlaceholderIp ? id : null,
            globalVars: {
              ...state.globalVars,
              targetIp: m?.ip && !m.ip.toLowerCase().includes('x') && m.ip !== '10.10.10.X' ? m.ip : state.globalVars.targetIp,
            },
            unexportedChangesCount: (state.unexportedChangesCount || 0) + 1,
          };
        });
      },

      startTimer: () => set({ isTimerRunning: true, timerLastTick: Date.now() }),

      pauseTimer: () => {
        set((state) => {
          if (!state.activeTargetId) return { isTimerRunning: false, timerLastTick: null };
          const now = Date.now();
          const extra = state.timerLastTick ? Math.round((now - state.timerLastTick) / 1000) : 0;
          const finalSeconds = state.activeTimerSeconds + (extra > 0 ? extra : 0);
          const updated = state.machines.map((m) =>
            m.id === state.activeTargetId
              ? { ...m, timeSpentSeconds: finalSeconds }
              : m
          );
          return { machines: updated, activeTimerSeconds: finalSeconds, isTimerRunning: false, timerLastTick: null };
        });
      },

      resetTimer: (machineId) => {
        set((state) => {
          const targetId = machineId || state.activeTargetId;
          if (!targetId) return { isTimerRunning: false, activeTimerSeconds: 0, timerLastTick: null };
          const updated = state.machines.map((m) =>
            m.id === targetId ? { ...m, timeSpentSeconds: 0 } : m
          );
          return {
            machines: updated,
            activeTimerSeconds: targetId === state.activeTargetId ? 0 : state.activeTimerSeconds,
            isTimerRunning: false,
            timerLastTick: null,
          };
        });
      },

      tickTimer: () => {
        set((state) => {
          if (!state.isTimerRunning || !state.activeTargetId) return {};
          const now = Date.now();
          const last = state.timerLastTick || now;
          const deltaSeconds = Math.max(1, Math.round((now - last) / 1000));
          return {
            activeTimerSeconds: state.activeTimerSeconds + deltaSeconds,
            timerLastTick: now,
          };
        });
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
              m.id === state.activeTargetId
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

      setFilters: (f) => set((s) => {
        const nextFilters = { ...s.filters, ...f };
        if (f.selectedTracks !== undefined) {
          nextFilters.selectedTrack = f.selectedTracks.length > 0 ? f.selectedTracks[0] : 'ALL';
        } else if (f.selectedTrack !== undefined) {
          nextFilters.selectedTracks = f.selectedTrack === 'ALL' ? [] : [f.selectedTrack];
        }
        return { filters: nextFilters };
      }),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      // Attack Graph & Pivot Topology Actions
      setGraphNodePosition: (id: string, pos: AttackNodePosition) => {
        set((state) => {
          const nextPositions = {
            ...state.graphNodePositions,
            [id]: pos,
          };
          saveAttackGraphState(nextPositions, state.graphEdges, state.currentProfileId);
          return { graphNodePositions: nextPositions };
        });
      },

      batchSetGraphNodePositions: (positions: Record<string, AttackNodePosition>) => {
        set((state) => {
          const nextPositions = {
            ...state.graphNodePositions,
            ...positions,
          };
          saveAttackGraphState(nextPositions, state.graphEdges, state.currentProfileId);
          return { graphNodePositions: nextPositions };
        });
      },

      resetGraphLayout: () => {
        set((state) => {
          const nextPositions: Record<string, AttackNodePosition> = {};
          saveAttackGraphState(nextPositions, state.graphEdges, state.currentProfileId);
          return { graphNodePositions: nextPositions };
        });
      },

      addGraphEdge: (edge: Omit<AttackGraphEdge, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => {
        const newEdge: AttackGraphEdge = {
          id: edge.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `edge_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`),
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          type: edge.type,
          status: edge.status || 'potential',
          label: edge.label,
          port: edge.port,
          protocol: edge.protocol,
          notes: edge.notes,
          createdAt: edge.createdAt || new Date().toISOString(),
        };
        set((state) => {
          const nextEdges = [...state.graphEdges, newEdge];
          saveAttackGraphState(state.graphNodePositions, nextEdges, state.currentProfileId);
          return { graphEdges: nextEdges };
        });
        return newEdge;
      },

      updateGraphEdge: (id: string, updates: Partial<AttackGraphEdge>) => {
        set((state) => {
          const nextEdges = state.graphEdges.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          );
          saveAttackGraphState(state.graphNodePositions, nextEdges, state.currentProfileId);
          return { graphEdges: nextEdges };
        });
      },

      deleteGraphEdge: (id: string) => {
        set((state) => {
          const nextEdges = state.graphEdges.filter((e) => e.id !== id);
          saveAttackGraphState(state.graphNodePositions, nextEdges, state.currentProfileId);
          return { graphEdges: nextEdges };
        });
      },

      clearGraphEdges: () => {
        set((state) => {
          const nextEdges: AttackGraphEdge[] = [];
          saveAttackGraphState(state.graphNodePositions, nextEdges, state.currentProfileId);
          return { graphEdges: nextEdges };
        });
      },

      // Credentials & Loot Actions: every mutation persists the active profile's loot immediately
      addCredential: (input) => {
        const cred = buildCredential(input);
        const existing = findDuplicateCredential(get().credentials, cred);
        if (existing) return existing.id;
        set((state) => {
          const credentials = [...state.credentials, cred];
          saveLootState(state.currentProfileId, { ...state, credentials });
          return { credentials };
        });
        return cred.id;
      },

      updateCredential: (id, patch) => {
        const credentials = patchCredential(get().credentials, id, patch);
        if (!credentials) return false;
        set((state) => {
          saveLootState(state.currentProfileId, { ...state, credentials });
          return { credentials };
        });
        return true;
      },

      deleteCredential: (id) => {
        set((state) => {
          const credentials = state.credentials.filter((c) => c.id !== id);
          const credAttempts = state.credAttempts.filter((a) => a.credId !== id);
          saveLootState(state.currentProfileId, { ...state, credentials, credAttempts });
          return { credentials, credAttempts };
        });
      },

      upsertCredAttempt: (input) => {
        const { list, attempt } = upsertAttemptInList(get().credAttempts, input);
        set((state) => {
          saveLootState(state.currentProfileId, { ...state, credAttempts: list });
          return { credAttempts: list };
        });
        return attempt.id;
      },

      deleteCredAttempt: (id) => {
        set((state) => {
          const credAttempts = state.credAttempts.filter((a) => a.id !== id);
          saveLootState(state.currentProfileId, { ...state, credAttempts });
          return { credAttempts };
        });
      },

      addLootItem: (input) => {
        const item = buildLootItem(input);
        set((state) => {
          const lootItems = [...state.lootItems, item];
          saveLootState(state.currentProfileId, { ...state, lootItems });
          return { lootItems };
        });
        return item.id;
      },

      updateLootItem: (id, patch) => {
        const lootItems = patchLootItem(get().lootItems, id, patch);
        if (!lootItems) return;
        set((state) => {
          saveLootState(state.currentProfileId, { ...state, lootItems });
          return { lootItems };
        });
      },

      deleteLootItem: (id) => {
        set((state) => {
          const lootItems = state.lootItems.filter((l) => l.id !== id);
          saveLootState(state.currentProfileId, { ...state, lootItems });
          return { lootItems };
        });
      },

      addCustomNote: (note) => {
        const id = 'custom-note-' + Date.now();
        const fullNote: CptsNoteEntry = {
          id,
          title: note.title,
          titleEn: note.titleEn || note.title,
          titleHe: note.titleHe,
          category: note.category || 'General Methodology',
          rawCategory: note.rawCategory || note.category || 'General',
          subCategory: note.subCategory || '',
          tags: note.tags || ['custom'],
          difficulty: note.difficulty || 'Custom',
          summary: note.summary || '',
          enSummary: note.enSummary || note.summary || '',
          heSummary: note.heSummary,
          commands: note.commands || [],
          relPath: note.relPath || `${note.category || 'Custom'}/${note.title}.md`,
          filename: `${note.title}.md`,
          rawMarkdown: note.rawMarkdown || note.summary || '',
        };
        set((state) => ({
          customNotes: [fullNote, ...state.customNotes],
        }));
      },

      updateNoteContent: (noteId: string, rawMarkdown: string) => {
        const state = get();
        const now = new Date().toISOString();

        // 1. In-place update if note exists in customNotes (custom or already promoted)
        const customNote = state.customNotes.find((n) => n.id === noteId);
        if (customNote) {
          const updatedCustom = state.customNotes.map((n) =>
            n.id === noteId ? { ...n, rawMarkdown, dateModified: now } : n
          );
          set({ customNotes: updatedCustom });
          flushProfileSave();
          return;
        }

        // 2. In-place update if note exists in userNotes (imported private vault)
        const userNotes = state.userNotes || [];
        const isUserNote = userNotes.some((n) => n.id === noteId);
        if (isUserNote) {
          const updatedUserNotes = userNotes.map((n) =>
            n.id === noteId ? { ...n, rawMarkdown, dateModified: now } : n
          );
          set({ userNotes: updatedUserNotes });
          saveVaultToIndexedDb({
            notes: updatedUserNotes,
            wikilinkMap: state.userWikilinkMap || {},
          }).catch((err) =>
            console.warn('[ZeroBox] Could not persist note update to IndexedDB', err)
          );
          return;
        }

        // 3. Promote catalog note from CPTS_NOTES into customNotes
        const catalogNote = CPTS_NOTES.find((n) => n.id === noteId);
        if (catalogNote) {
          const promotedNote: CptsNoteEntry = {
            ...catalogNote,
            rawMarkdown,
            dateModified: now,
          };
          set((s) => ({
            customNotes: [promotedNote, ...s.customNotes.filter((n) => n.id !== noteId)],
          }));
          flushProfileSave();
          return;
        }

        // 4. Fallback lookup via getAllCptsNotes() in case note was hydrated dynamically
        const fallbackNote = getAllCptsNotes().find((n) => n.id === noteId);
        if (fallbackNote) {
          const promotedNote: CptsNoteEntry = {
            ...fallbackNote,
            rawMarkdown,
            dateModified: now,
          };
          set((s) => ({
            customNotes: [promotedNote, ...s.customNotes.filter((n) => n.id !== noteId)],
          }));
          flushProfileSave();
          return;
        }

        console.warn(`[ZeroBox] Note with id "${noteId}" not found for update.`);
      },

      deleteNote: (noteId) => {
        const userNotes = get().userNotes || [];
        const isUserNote = userNotes.some((n) => n.id === noteId);
        if (isUserNote) {
          const updatedNotes = userNotes.filter((n) => n.id !== noteId);
          const updatedMap = { ...(get().userWikilinkMap || {}) };
          const target = userNotes.find((n) => n.id === noteId);
          if (target) {
            if (target.title) delete updatedMap[target.title.toLowerCase()];
            if (target.titleEn) delete updatedMap[target.titleEn.toLowerCase()];
            if (target.filename) delete updatedMap[target.filename.toLowerCase()];
          }
          saveVaultToIndexedDb({ notes: updatedNotes, wikilinkMap: updatedMap }).catch((err) =>
            console.warn('[ZeroBox] Could not persist note deletion to IndexedDB', err)
          );
          set((state) => ({
            userNotes: updatedNotes,
            userWikilinkMap: updatedMap,
            deletedNoteIds: [...new Set([...state.deletedNoteIds, noteId])],
            customNotes: state.customNotes.filter((n) => n.id !== noteId),
          }));
        } else {
          set((state) => ({
            deletedNoteIds: [...new Set([...state.deletedNoteIds, noteId])],
            customNotes: state.customNotes.filter((n) => n.id !== noteId),
          }));
        }
      },

      restoreDeletedNotes: () => {
        set(() => ({ deletedNoteIds: [] }));
      },

      resetSolvesToZero: () => {
        const targetId = get().currentProfileId || 'guest';
        set((state) => {
          const fresh: Machine[] = state.machines.map((m) => ({
            ...m,
            status: 'backlog' as PipelineStatus,
            userFlag: undefined,
            rootFlag: undefined,
            userPwnedAt: undefined,
            rootPwnedAt: undefined,
            timeSpentSeconds: 0,
            timeToUserSeconds: undefined,
            timeToRootSeconds: undefined,
          }));
          return {
            machines: fresh,
            activeTargetId: null,
            isTimerRunning: false,
            activeTimerSeconds: 0,
            activitySessions: [],
            userSolvesReset: true,
          };
        });
        get().saveProfileData(targetId);
      },

      restoreDanielSolves: async () => {
        let catalog: Machine[];
        try {
          catalog = await loadMachinesCatalog();
        } catch {
          catalog = STARTER_MACHINES;
        }
        const targetId = get().currentProfileId || 'guest';
        const customMachines = get().machines.filter(
          (m) => m.isCustom || m.platform === 'Custom' || (m.id && m.id.startsWith('custom-'))
        );
        const combined = [...customMachines, ...DEMO_SOLVED_ROSTER];
        const merged = mergeMachinesWithCatalog(combined as Machine[], false, catalog);
        set(() => ({
          machines: merged,
          userSolvesReset: false,
          isCatalogLoaded: true,
        }));
        get().saveProfileData(targetId);
        saveCustomMachinesToStorage(customMachines, targetId);
      },

      exportBackup: (options?: { redactSecrets?: boolean }) => {
        const state = get();
        let exportMachines = state.machines;
        if (state.activeTargetId && state.activeTimerSeconds > 0) {
          exportMachines = state.machines.map((m) =>
            m.id === state.activeTargetId ? { ...m, timeSpentSeconds: state.activeTimerSeconds } : m
          );
        }

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
            customVars: redactedCustom,
          };
          // Sanitize any machine flag proofs containing credentials
          exportMachines = exportMachines.map((m) => ({
            ...m,
            userFlag: m.userFlag?.toLowerCase().includes('pass') ? '[REDACTED]' : m.userFlag,
            rootFlag: m.rootFlag?.toLowerCase().includes('pass') ? '[REDACTED]' : m.rootFlag,
          }));
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
          version: '2.0.0',
          exportedAt: new Date().toISOString(),
          isRedacted: Boolean(options?.redactSecrets),
          machines: exportMachines,
          globalVars: exportGlobalVars,
          cheatsheets: state.cheatsheets,
          activitySessions: state.activitySessions,
          customNotes: state.customNotes,
          userNotes: state.userNotes || [],
          userWikilinkMap: state.userWikilinkMap || {},
          deletedNoteIds: state.deletedNoteIds,
          userSolvesReset: state.userSolvesReset,
          themePreset: state.themePreset,
          graphEdges: exportGraphEdges,
          graphNodePositions: state.graphNodePositions,
          ...exportLoot,
        };
        return JSON.stringify(exportData, null, 2);
      },

      importBackup: (jsonStr) => {
        try {
          const raw = JSON.parse(jsonStr);
          if (!raw || typeof raw !== 'object') return false;

          const validation = validateWorkspacePayload(raw);
          if (!validation.success || !validation.data) return false;

          const data = validation.data;
          const rawMachines = Array.isArray(data.machines) ? data.machines : null;
          if (rawMachines) {
            const userSolvesReset = Boolean(data.userSolvesReset);
            const normalizedMachines = mergeMachinesWithCatalog(
              rawMachines.map((m: any) => ({
                ...m,
                tags: Array.isArray(m?.tags) ? m.tags : [],
                openPorts: Array.isArray(m?.openPorts) ? m.openPorts : [],
                checklist: m?.checklist && typeof m.checklist === 'object' ? m.checklist : {},
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
                  (e: any) => e && typeof e.id === 'string' && typeof e.sourceId === 'string' && typeof e.targetId === 'string'
                );
              }
              if (data.graphNodePositions && typeof data.graphNodePositions === 'object') {
                const pos: Record<string, AttackNodePosition> = {};
                for (const [k, v] of Object.entries(data.graphNodePositions)) {
                  if (v && isNum((v as any).x) && isNum((v as any).y)) pos[k] = { x: (v as any).x, y: (v as any).y };
                }
                out.graphNodePositions = pos;
              }
              return out.graphEdges || out.graphNodePositions ? out : undefined;
            })();
            // Loot is merged (not replaced) so a backup, redacted or stale, can never wipe real secrets.
            const importedLoot = mergeImportedLoot(get(), data);
            set((state) => ({
              machines: normalizedMachines,
              ...(nextThemePreset ? { themePreset: nextThemePreset } : {}),
              globalVars: (data.globalVars as GlobalVariables) || state.globalVars,
              cheatsheets: Array.isArray(data.cheatsheets) ? data.cheatsheets : state.cheatsheets,
              activitySessions: Array.isArray(data.activitySessions) ? data.activitySessions : state.activitySessions,
              customNotes: Array.isArray(data.customNotes) ? data.customNotes : state.customNotes,
              userNotes: Array.isArray(data.userNotes) ? data.userNotes : state.userNotes,
              userWikilinkMap: (data.userWikilinkMap && typeof data.userWikilinkMap === 'object') ? data.userWikilinkMap : state.userWikilinkMap,
              deletedNoteIds: Array.isArray(data.deletedNoteIds) ? data.deletedNoteIds : state.deletedNoteIds,
              userSolvesReset,
              ...importedGraph,
              ...importedLoot,
            }));
            if (importedLoot) {
              saveLootState(get().currentProfileId || 'guest', importedLoot);
            }
            if (importedGraph) {
              saveAttackGraphState(
                importedGraph.graphNodePositions ?? get().graphNodePositions,
                importedGraph.graphEdges ?? get().graphEdges,
                get().currentProfileId || 'guest'
              );
            }
            return true;
          }
          return false;
        } catch (e) {
          console.error('Failed to parse backup JSON:', e);
          return false;
        }
      },

      loadProfileData: (profileId: string, options?: { startFresh?: boolean; cloneFromCurrent?: boolean }) => {
        const gen = ++profileLoadGeneration;
        const currentId = get().currentProfileId || 'guest';
        get().saveProfileData(currentId);

        const targetKey = getProfileStorageKey(profileId);
        const raw = safeLocalStorage.getItem(targetKey);
        if (raw) {
          try {
            const data = JSON.parse(raw);
            const userSolvesReset = Boolean(data.userSolvesReset);
            const graphState = loadInitialAttackGraphState(profileId);
            set({
              currentProfileId: profileId,
              isDeepStorageLoaded: false,
              userSolvesReset,
              machines: mergeMachinesWithCatalog(data.machines, userSolvesReset),
              activeTargetId: data.activeTargetId || null,
              globalVars: data.globalVars || DEFAULT_GLOBAL_VARS,
              cheatsheets: data.cheatsheets || INITIAL_CHEATSHEET,
              activitySessions: Array.isArray(data.activitySessions) ? data.activitySessions : [],
              customNotes: Array.isArray(data.customNotes) ? data.customNotes : [],
              deletedNoteIds: Array.isArray(data.deletedNoteIds) ? data.deletedNoteIds : [],
              graphNodePositions: graphState.graphNodePositions,
              graphEdges: graphState.graphEdges,
              ...loadLootState(profileId),
            });

            // Asynchronously enrich with deep writeups from IndexedDB
            loadDeepProfileData(profileId).then((deep) => {
              if (gen !== profileLoadGeneration || get().currentProfileId !== profileId) {
                return; // Discard stale load from previous rapid profile switch
              }
              if (deep?.writeups && Object.keys(deep.writeups).length > 0) {
                const currentMachines = get().machines;
                const merged = mergeDeepPayloadsIntoMachines(currentMachines, deep.writeups);
                set({ machines: merged, isDeepStorageLoaded: true });
              } else {
                set({ isDeepStorageLoaded: true });
              }
            }).catch(() => {
              if (gen === profileLoadGeneration && get().currentProfileId === profileId) {
                set({ isDeepStorageLoaded: true });
              }
            });

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
            globalVars: DEFAULT_GLOBAL_VARS,
            cheatsheets: INITIAL_CHEATSHEET,
            activitySessions: [],
            customNotes: [],
            deletedNoteIds: [],
            userSolvesReset: false,
            graphNodePositions: graphState.graphNodePositions,
            graphEdges: graphState.graphEdges,
            ...loadLootState(profileId),
          });
          get().saveProfileData(profileId);
          return;
        }

        // Fresh slate for new operator: all 929 catalog targets ready to be pwned with 0 solves (zero custom machine leak)
        const freshMachines = mergeMachinesWithCatalog([], true);
        const graphState = loadInitialAttackGraphState(profileId);

        set({
          currentProfileId: profileId,
          isDeepStorageLoaded: true,
          machines: freshMachines,
          activeTargetId: null,
          globalVars: DEFAULT_GLOBAL_VARS,
          cheatsheets: INITIAL_CHEATSHEET,
          activitySessions: [],
          customNotes: [],
          deletedNoteIds: [],
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
        const targetKey = getWriteProfileStorageKey(targetId);
        let persistedMachines = state.machines;
        if (state.activeTargetId && state.activeTimerSeconds > 0) {
          persistedMachines = state.machines.map((m) =>
            m.id === state.activeTargetId ? { ...m, timeSpentSeconds: state.activeTimerSeconds } : m
          );
        }

        // Dual-tier: asynchronously save deep payloads (writeups & notes) to IndexedDB
        const deepWriteups = extractDeepWriteups(persistedMachines);
        if (Object.keys(deepWriteups).length > 0 || (state.customNotes && state.customNotes.length > 0)) {
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
          userSolvesReset: state.userSolvesReset,
        };
        try {
          const serialized = JSON.stringify(payload);
          safeLocalStorage.setItem(targetKey, serialized);
          safeLocalStorage.setItem(`specter_ctf_profile_${targetId}`, serialized);
        } catch (e: any) {
          // Quota guard: prune writeups from localStorage if quota exceeded (safely stored in IndexedDB)
          if (e?.name === 'QuotaExceededError' || e?.code === 22 || (typeof e?.message === 'string' && e.message.toLowerCase().includes('quota'))) {
            console.warn('[ZeroBox] LocalStorage quota reached. Pruning writeup bodies from localStorage (safely stored in IndexedDB).');
            try {
              const leanPayload = {
                ...payload,
                machines: stripDeepFieldsFromMachines(payload.machines),
              };
              const serializedLean = JSON.stringify(leanPayload);
              safeLocalStorage.setItem(targetKey, serializedLean);
              safeLocalStorage.setItem(`specter_ctf_profile_${targetId}`, serializedLean);
            } catch (innerErr) {
              console.error('Failed to save even stripped profile data:', innerErr);
            }
          } else {
            console.error('Failed to save profile data:', e);
          }
        }
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
        safeLocalStorage.removeItem(ATTACK_GRAPH_STORAGE_KEY);
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
      }
    }),
    {
      name: 'zerobox-tactical-store',
      version: 2,
      storage: createJSONStorage(() => ({
        getItem: (name: string): string | null => {
          if (typeof window === 'undefined') return null;
          try {
            const raw = safeLocalStorage.getItem(name);
            if (!raw) return null;
            // Validate JSON syntax without throwing uncaught SyntaxError at boot
            JSON.parse(raw);
            return raw;
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
            } catch {}
            return null;
          }
        },
        setItem: (name: string, value: string): void => {
          safeLocalStorage.setItem(name, value);
        },
        removeItem: (name: string): void => {
          safeLocalStorage.removeItem(name);
        },
      })),
      migrate: (persistedState: any) => {
        const persisted = persistedState || {};
        if (!persisted.appBrand || persisted.appBrand === 'rootvector' || persisted.appBrand === 'specter') {
          persisted.appBrand = 'zerobox';
        }
        if (!persisted.uiScale || persisted.uiScale === 'normal') {
          persisted.uiScale = 'auto';
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
          uiScale: (!persisted.uiScale || persisted.uiScale === 'normal') ? 'auto' : persisted.uiScale,
          userSolvesReset,
          customNotes: persisted.customNotes || [],
          deletedNoteIds: persisted.deletedNoteIds || [],
          machines: mergeMachinesWithCatalog(combinedMachines, userSolvesReset),
        };
      },
      merge: (persistedState: any, currentState: CtfStoreState) => {
        const persisted = (persistedState as Partial<CtfStoreState>) || {};
        const userSolvesReset = Boolean(persisted.userSolvesReset);
        const rawPreset = (persisted.themePreset as string) || 'obsidian';
        const themePreset: ThemePreset = normalizeThemePreset(rawPreset);
        applyThemePreset(themePreset);
        const resolvedUiScale: UiScale = (!persisted.uiScale || persisted.uiScale === 'normal') ? 'auto' : (persisted.uiScale as UiScale);

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
          machines: mergeMachinesWithCatalog(combinedMachines, userSolvesReset),
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (!state.uiScale || state.uiScale === 'normal') {
            state.uiScale = 'auto';
          }
        }
      },
      partialize: (state) => ({
        currentProfileId: state.currentProfileId,
        appBrand: state.appBrand,
        themePreset: state.themePreset,
        userSolvesReset: state.userSolvesReset,
        customNotes: state.customNotes,
        deletedNoteIds: state.deletedNoteIds,
        machines: toLeanMachines(state.machines),
        activeTargetId: state.activeTargetId,
        globalVars: state.globalVars,
        cheatsheets: state.cheatsheets,
        activitySessions: state.activitySessions,
        viewMode: state.viewMode,
        crtOverlay: state.crtOverlay,
        soundEnabled: state.soundEnabled,
        uiScale: state.uiScale,
      }),
    }
  )
);

// Selective, high-performance profile auto-save
// Guards against 1Hz timer ticks, uses debouncing with maxWait cap, and flushes on tab close
let lastSavedMachines = useCtfStore.getState().machines;
let lastSavedTargetId = useCtfStore.getState().activeTargetId;
let lastSavedGlobalVars = useCtfStore.getState().globalVars;
let lastSavedCheatsheets = useCtfStore.getState().cheatsheets;
let lastSavedSessions = useCtfStore.getState().activitySessions;
let lastSavedCustomNotes = useCtfStore.getState().customNotes;
let lastSavedDeletedNoteIds = useCtfStore.getState().deletedNoteIds;
let lastSavedUserSolvesReset = useCtfStore.getState().userSolvesReset;
let saveDebounceTimer: any = null;
let maxWaitTimer: any = null;

export function flushProfileSave() {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }
  if (maxWaitTimer) {
    clearTimeout(maxWaitTimer);
    maxWaitTimer = null;
  }
  if (typeof window === 'undefined') return;
  const state = useCtfStore.getState();
  if (!state.currentProfileId) return;

  const targetKey = getWriteProfileStorageKey(state.currentProfileId);
  let persistedMachines = state.machines;
  if (state.activeTargetId && state.activeTimerSeconds > 0) {
    persistedMachines = state.machines.map((m) =>
      m.id === state.activeTargetId ? { ...m, timeSpentSeconds: state.activeTimerSeconds } : m
    );
  }

  // Optimize localStorage footprint: Strip large static catalog walkthroughs & synopses
  // from storage payload since they are deterministically rehydrated from INITIAL_MACHINES on load.
  const storageLeanMachines = toLeanMachines(persistedMachines);

  // Dual-tier: asynchronously save deep payloads (writeups & notes) to IndexedDB
  const deepWriteups = extractDeepWriteups(persistedMachines);
  if (Object.keys(deepWriteups).length > 0 || (state.customNotes && state.customNotes.length > 0)) {
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
    userSolvesReset: state.userSolvesReset,
  };
  try {
    const serialized = JSON.stringify(payload);
    saveWorkspaceToIdb(`zb:workspace:${state.currentProfileId}`, payload).catch(() => {});
    safeLocalStorage.setItem(targetKey, serialized);
    safeLocalStorage.setItem(`specter_ctf_profile_${state.currentProfileId}`, serialized);
    lastSavedMachines = state.machines;
    lastSavedTargetId = state.activeTargetId;
    lastSavedGlobalVars = state.globalVars;
    lastSavedCheatsheets = state.cheatsheets;
    lastSavedSessions = state.activitySessions;
    lastSavedCustomNotes = state.customNotes;
    lastSavedDeletedNoteIds = state.deletedNoteIds;
    lastSavedUserSolvesReset = state.userSolvesReset;
    broadcastCrossTabMessage('WRITEUPS_UPDATED', { profileId: state.currentProfileId });
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22 || (typeof err?.message === 'string' && err.message.toLowerCase().includes('quota'))) {
      console.warn('[ZeroBox] LocalStorage quota reached in flushProfileSave. Pruning writeup bodies from localStorage.');
      try {
        const leanPayload = {
          ...payload,
          machines: stripDeepFieldsFromMachines(payload.machines),
        };
        safeLocalStorage.setItem(targetKey, JSON.stringify(leanPayload));
        lastSavedMachines = state.machines;
      } catch {}
    }
  }
}

useCtfStore.subscribe((state) => {
  if (typeof window === 'undefined' || !state.currentProfileId) return;

  // Selective Persistence Check: Only trigger if persisted data actually changed!
  // Prevents 1Hz timer ticks (activeTimerSeconds) from ever touching localStorage!
  const hasChanged = 
    state.machines !== lastSavedMachines ||
    state.activeTargetId !== lastSavedTargetId ||
    state.globalVars !== lastSavedGlobalVars ||
    state.cheatsheets !== lastSavedCheatsheets ||
    state.activitySessions !== lastSavedSessions ||
    state.customNotes !== lastSavedCustomNotes ||
    state.deletedNoteIds !== lastSavedDeletedNoteIds ||
    state.userSolvesReset !== lastSavedUserSolvesReset;

  if (!hasChanged) return;

  // Debounce with maxWait cap (5000ms max)
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  if (!maxWaitTimer) {
    maxWaitTimer = setTimeout(flushProfileSave, 5000);
  }
  saveDebounceTimer = setTimeout(flushProfileSave, 1200);
});

// Flush immediately on tab close or backgrounding
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushProfileSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushProfileSave();
    } else if (document.visibilityState === 'visible') {
      if (useCtfStore.getState().isTimerRunning) {
        useCtfStore.getState().tickTimer();
      }
    }
  });

  // Cross-tab auto-sync: Reconcile external storage modifications across open tabs
  window.addEventListener('storage', (event) => {
    if (!event.key || !event.newValue) return;
    const currentProfileId = useCtfStore.getState().currentProfileId || 'guest';
    const profileKey = getProfileStorageKey(currentProfileId);
    if (event.key === profileKey || event.key === 'zerobox-tactical-store') {
      try {
        const parsed = JSON.parse(event.newValue);
        const data = parsed.state || parsed;
        if (data && Array.isArray(data.machines)) {
          const userSolvesReset = Boolean(data.userSolvesReset);
          useCtfStore.setState((state) => ({
            userSolvesReset,
            machines: mergeMachinesWithCatalog(data.machines, userSolvesReset),
            activeTargetId: 'activeTargetId' in data ? (data.activeTargetId ?? null) : state.activeTargetId,
            globalVars: data.globalVars || state.globalVars,
            cheatsheets: data.cheatsheets || state.cheatsheets,
            activitySessions: Array.isArray(data.activitySessions) ? data.activitySessions : state.activitySessions,
            customNotes: Array.isArray(data.customNotes) ? data.customNotes : state.customNotes,
            deletedNoteIds: Array.isArray(data.deletedNoteIds) ? data.deletedNoteIds : state.deletedNoteIds,
          }));
        }
      } catch (err) {
        console.warn('[ZeroBox] Failed to synchronize cross-tab storage event', err);
      }
    }

    if (event.key === getLootStorageKey(currentProfileId)) {
      const loot = parseLootPayload(event.newValue);
      if (loot) useCtfStore.setState(loot);
    }

    if (event.key === ATTACK_GRAPH_STORAGE_KEY) {
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
    const { type, payload } = event.data || {};
    const currentProfileId = useCtfStore.getState().currentProfileId || 'guest';
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
        useCtfStore.setState((s) => ({
          machines: s.machines.filter((m) => m.id !== payload.id),
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
  const isTauri = Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
  if (isTauri) {
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen('tauri-app-close-requested', () => {
        flushProfileSave();
      });
    }).catch(() => {});
  }

  // Asynchronously hydrate user's private CPTS field manual notes from IndexedDB
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
  const initialProfile = getInitialProfileId();
  loadDeepProfileData(initialProfile).then((deep) => {
    if (deep?.writeups && Object.keys(deep.writeups).length > 0) {
      const currentMachines = useCtfStore.getState().machines;
      const merged = mergeDeepPayloadsIntoMachines(currentMachines, deep.writeups);
      useCtfStore.setState({ machines: merged, isDeepStorageLoaded: true });
    } else {
      useCtfStore.setState({ isDeepStorageLoaded: true });
    }
    if (deep?.customNotes && deep.customNotes.length > 0 && useCtfStore.getState().customNotes.length === 0) {
      useCtfStore.setState({ customNotes: deep.customNotes });
    }
  }).catch((err) => {
    console.warn('[ZeroBox] Could not hydrate deep payloads from IndexedDB', err);
    useCtfStore.setState({ isDeepStorageLoaded: true });
  });
}



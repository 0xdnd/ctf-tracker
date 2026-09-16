import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Machine, PipelineStatus, CheatsheetCommand, GlobalVariables, ActivitySession, ViewMode, Platform, Difficulty, OperatingSystem } from '../types';
import { STARTER_MACHINES } from '../data/starterMachines';
import { INITIAL_CHEATSHEET } from '../data/cheatsheetsData';

let cachedCatalog: Machine[] | null = null;
import type { CptsNoteEntry } from '../utils/obsidianManualUtils';
import { saveVaultToIndexedDb, loadVaultFromIndexedDb, clearVaultFromIndexedDb } from '../utils/indexedDbVault';
import { 
  extractDeepWriteups, 
  stripDeepFieldsFromMachines, 
  mergeDeepPayloadsIntoMachines, 
  saveDeepProfileData, 
  loadDeepProfileData 
} from '../utils/indexedDbDeepStorage';

export type BoxVectorCategory = 'ALL' | 'Web' | 'Linux PrivEsc' | 'Windows PrivEsc' | 'Active Directory' | 'Binary / Pwn' | 'Network / SMB';
export type SortOption = 'default' | 'difficulty' | 'name' | 'ip' | 'recent';
export type SortDirection = 'asc' | 'desc';

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
  suffixColor: 'text-cyber-cyan',
  tagline: 'Tactical Cyber Operations Suite',
  badge: 'v2.0',
};

export const BRAND_THEMES: BrandTheme[] = [ZEROBOX_BRAND];

interface CtfStoreState {
  machines: Machine[];
  activeTargetId: string | null;
  globalVars: GlobalVariables;
  cheatsheets: CheatsheetCommand[];
  activitySessions: ActivitySession[];
  
  // UI States
  appBrand: string;
  activeTab: 'tracker' | 'cheatsheet' | 'field-manual' | 'writeup' | 'analytics' | 'methodology' | 'exam';
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
  uiScale: 'tiny' | 'compact' | 'normal' | 'large' | 'huge';
  
  // Timer State
  isTimerRunning: boolean;
  activeTimerSeconds: number;
  
  // Filters
  filters: FilterState;

  // Actions
  setAppBrand: (brandId: string) => void;
  setActiveTab: (tab: 'tracker' | 'cheatsheet' | 'field-manual' | 'writeup' | 'analytics' | 'methodology' | 'exam') => void;
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
  setUiScale: (scale: 'tiny' | 'compact' | 'normal' | 'large' | 'huge') => void;
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
  deleteNote: (noteId: string) => void;
  restoreDeletedNotes: () => void;
  resetSolvesToZero: () => void;
  restoreDanielSolves: () => void;

  // Asynchronous Catalog Hydration
  isCatalogLoaded: boolean;
  isCatalogLoading: boolean;
  loadCatalog: () => Promise<void>;

  // Data Import & Export & Profile Data Isolation
  currentProfileId: string;
  loadProfileData: (profileId: string) => void;
  saveProfileData: (profileId?: string) => void;
  exportBackup: (options?: { redactSecrets?: boolean }) => string;
  importBackup: (jsonStr: string) => boolean;
  resetAllProgress: () => void;
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
  selectedTags: [],
  sortBy: 'default',
  sortDirection: 'asc',
  hideEmptyLanes: false,
};

export const getProfileStorageKey = (profileId: string) => `specter_ctf_profile_${profileId || 'guest'}`;

export const getInitialProfileId = (): string => {
  if (typeof window !== 'undefined') {
    try {
      const auth = localStorage.getItem('rootvector_auth_session');
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

export const loadInitialProfileData = (profileId: string) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(getProfileStorageKey(profileId));
      if (raw) {
        return JSON.parse(raw);
      }
      const legacy = localStorage.getItem('specter_ctf_store_v2');
      if (legacy) {
        const parsed = JSON.parse(legacy);
        const state = parsed.state || parsed;
        if (state.machines) {
          return state;
        }
      }
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
  return machines.map((m) => {
    // Preserve custom user-added machines completely (including user-entered hints, walkthroughs, etc.)
    if (m.isCustom || (m.id && m.id.startsWith('custom-'))) {
      return m;
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
  const catalog = catalogSource || cachedCatalog || STARTER_MACHINES;
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
    storedMachines.forEach((m) => {
      const normName = m.name ? m.name.toLowerCase().trim() : '';
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
            officialWalkthrough: catalogMachine.officialWalkthrough || m.officialWalkthrough,
            tags: Array.from(new Set([...(catalogMachine.tags || []), ...(m.tags || [])])),
            certifications: Array.from(new Set([...(catalogMachine.certifications || []), ...(m.certifications || [])])) as any,
          });
        } else {
          // Default baseline: Sync Daniel Dayan's verified solve history
          if (catalogMachine.status === 'completed') {
            map.set(catalogMachine.id, {
              ...m,
              ...catalogMachine,
              status: 'completed',
              userPwnedAt: m.userPwnedAt || catalogMachine.userPwnedAt || '2026-08-20T10:00:00.000Z',
              rootPwnedAt: m.rootPwnedAt || catalogMachine.rootPwnedAt || '2026-08-20T11:30:00.000Z',
              userFlag: m.userFlag || catalogMachine.userFlag || (catalogMachine.platform === 'THM' ? 'THM{flag_captured_daniel_dayan}' : 'HTB{user_pwn_verified}'),
              rootFlag: m.rootFlag || catalogMachine.rootFlag || (catalogMachine.platform === 'THM' ? 'THM{system_pwned_daniel_dayan}' : 'HTB{root_pwn_verified}'),
              timeSpentSeconds: m.timeSpentSeconds > 0 ? m.timeSpentSeconds : (catalogMachine.timeSpentSeconds || 3600),
              timeToUserSeconds: m.timeToUserSeconds || catalogMachine.timeToUserSeconds || 1500,
              timeToRootSeconds: m.timeToRootSeconds || catalogMachine.timeToRootSeconds || 3600,
              quickNotes: m.quickNotes || catalogMachine.quickNotes,
              writeupMarkdown: m.writeupMarkdown || catalogMachine.writeupMarkdown,
              hint: catalogMachine.hint || m.hint,
              skillsLearned: catalogMachine.skillsLearned || m.skillsLearned,
              officialPdf: catalogMachine.officialPdf || m.officialPdf,
              officialSynopsis: catalogMachine.officialSynopsis || m.officialSynopsis,
              officialWalkthrough: catalogMachine.officialWalkthrough || m.officialWalkthrough,
              tags: Array.from(new Set([...(catalogMachine.tags || []), ...(m.tags || [])])),
              certifications: Array.from(new Set([...(catalogMachine.certifications || []), ...(m.certifications || [])])) as any,
            });
          } else if (catalogMachine.status === 'foothold') {
            map.set(catalogMachine.id, {
              ...m,
              ...catalogMachine,
              status: 'foothold',
              userPwnedAt: m.userPwnedAt || catalogMachine.userPwnedAt || '2026-08-20T10:00:00.000Z',
              userFlag: m.userFlag || catalogMachine.userFlag || 'HTB{user_foothold_captured}',
              timeSpentSeconds: m.timeSpentSeconds > 0 ? m.timeSpentSeconds : 1800,
              timeToUserSeconds: m.timeToUserSeconds || 1500,
              quickNotes: m.quickNotes || catalogMachine.quickNotes,
              writeupMarkdown: m.writeupMarkdown || catalogMachine.writeupMarkdown,
              hint: catalogMachine.hint || m.hint,
              skillsLearned: catalogMachine.skillsLearned || m.skillsLearned,
              officialPdf: catalogMachine.officialPdf || m.officialPdf,
              officialSynopsis: catalogMachine.officialSynopsis || m.officialSynopsis,
              officialWalkthrough: catalogMachine.officialWalkthrough || m.officialWalkthrough,
              tags: Array.from(new Set([...(catalogMachine.tags || []), ...(m.tags || [])])),
              certifications: Array.from(new Set([...(catalogMachine.certifications || []), ...(m.certifications || [])])) as any,
            });
          } else {
            const mStatus = m.status || 'backlog';
            const hasUserFlag = Boolean(m.userFlag?.trim());
            const hasRootFlag = Boolean(m.rootFlag?.trim());
            const isFootholdOrAbove = mStatus === 'foothold' || mStatus === 'root' || mStatus === 'completed';
            const isRootOrAbove = mStatus === 'root' || mStatus === 'completed';
            const userHasProgress = mStatus !== 'backlog' || hasUserFlag || hasRootFlag || (m.timeSpentSeconds > 0) || Boolean(m.quickNotes) || Boolean(m.writeupMarkdown);

            map.set(catalogMachine.id, {
              ...catalogMachine,
              ...(userHasProgress ? {
                status: mStatus,
                userFlag: m.userFlag,
                rootFlag: m.rootFlag,
                userPwnedAt: isFootholdOrAbove || hasUserFlag ? m.userPwnedAt : undefined,
                rootPwnedAt: isRootOrAbove || hasRootFlag ? m.rootPwnedAt : undefined,
                timeSpentSeconds: m.timeSpentSeconds,
                timeToUserSeconds: isFootholdOrAbove ? m.timeToUserSeconds : undefined,
                timeToRootSeconds: isRootOrAbove ? m.timeToRootSeconds : undefined,
                perceivedDifficulty: m.perceivedDifficulty,
                rating: m.rating,
                quickNotes: m.quickNotes,
                writeupMarkdown: m.writeupMarkdown,
                checklist: m.checklist,
                ip: m.ip && !m.ip.includes('x') ? m.ip : catalogMachine.ip,
              } : {}),
              hint: catalogMachine.hint || m.hint,
              skillsLearned: catalogMachine.skillsLearned || m.skillsLearned,
              officialPdf: catalogMachine.officialPdf || m.officialPdf,
              officialSynopsis: catalogMachine.officialSynopsis || m.officialSynopsis,
              officialWalkthrough: catalogMachine.officialWalkthrough || m.officialWalkthrough,
              tags: Array.from(new Set([...(catalogMachine.tags || []), ...(m.tags || [])])),
              certifications: Array.from(new Set([...(catalogMachine.certifications || []), ...(m.certifications || [])])) as any,
            });
          }
        }
      } else if (
        m.isCustom ||
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

  return Array.from(map.values());
};

const initialProfileId = getInitialProfileId();
const initialProfileData = loadInitialProfileData(initialProfileId);

export const useCtfStore = create<CtfStoreState>()(
  persist(
    (set, get) => ({
      machines: mergeMachinesWithCatalog(initialProfileData?.machines, Boolean(initialProfileData?.userSolvesReset)),
      activeTargetId: initialProfileData?.activeTargetId || null,
      globalVars: initialProfileData?.globalVars || DEFAULT_GLOBAL_VARS,
      cheatsheets: initialProfileData?.cheatsheets || INITIAL_CHEATSHEET,
      activitySessions: initialProfileData?.activitySessions || [],
      currentProfileId: initialProfileId,
      customNotes: initialProfileData?.customNotes || [],
      deletedNoteIds: initialProfileData?.deletedNoteIds || [],
      userSolvesReset: Boolean(initialProfileData?.userSolvesReset),

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
      notesImportModalOpen: false,
      userNotes: [],
      userWikilinkMap: {},
      mobileMenuOpen: false,
      assignIpMachineId: null,
      crtOverlay: false,
      soundEnabled: true,
      uiScale: 'normal',
      isTimerRunning: false,
      activeTimerSeconds: 0,
      filters: DEFAULT_FILTERS,
      isCatalogLoaded: false,
      isCatalogLoading: false,

      loadCatalog: async () => {
        if (get().isCatalogLoaded || get().isCatalogLoading) return;
        set({ isCatalogLoading: true });
        try {
          const { INITIAL_MACHINES } = await import('../data/machinesCatalog');
          cachedCatalog = INITIAL_MACHINES;
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
      setUiScale: (scale) => set({ uiScale: scale }),
      zoomIn: () => set((s) => {
        const order: Array<'tiny' | 'compact' | 'normal' | 'large' | 'huge'> = ['tiny', 'compact', 'normal', 'large', 'huge'];
        const currentIdx = order.indexOf(s.uiScale || 'normal');
        const nextIdx = Math.min(order.length - 1, currentIdx + 1);
        return { uiScale: order[nextIdx] };
      }),
      zoomOut: () => set((s) => {
        const order: Array<'tiny' | 'compact' | 'normal' | 'large' | 'huge'> = ['tiny', 'compact', 'normal', 'large', 'huge'];
        const currentIdx = order.indexOf(s.uiScale || 'normal');
        const nextIdx = Math.max(0, currentIdx - 1);
        return { uiScale: order[nextIdx] };
      }),
      cycleUiScale: () => set((s) => {
        const order: Array<'tiny' | 'compact' | 'normal' | 'large' | 'huge'> = ['tiny', 'compact', 'normal', 'large', 'huge'];
        const currentIdx = order.indexOf(s.uiScale || 'normal');
        const nextIdx = (currentIdx + 1) % order.length;
        return { uiScale: order[nextIdx] };
      }),

      updateMachineStatus: (id, status) => {
        set((state) => {
          const now = new Date().toISOString();
          const today = now.slice(0, 10);
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

          return { 
            machines: updated, 
            activitySessions: sessions,
            isTimerRunning: shouldStopTimer ? false : state.isTimerRunning,
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
          };
        });
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
        }));
      },

      deleteMachine: (id) => {
        set((state) => ({
          machines: state.machines.filter((m) => m.id !== id),
          activeTargetId: state.activeTargetId === id ? null : state.activeTargetId,
          selectedMachineId: state.selectedMachineId === id ? null : state.selectedMachineId,
        }));
      },

      toggleUserFlag: (id, flagValue) => {
        set((state) => {
          const now = new Date().toISOString();
          const updated = state.machines.map((m) => {
            if (m.id !== id) return m;
            const hadUser = Boolean(m.userPwnedAt);
            const userPwnedAt = hadUser ? undefined : now;
            let status = m.status;
            if (!hadUser && status === 'backlog') status = 'foothold';
            return {
              ...m,
              userFlag: flagValue !== undefined ? flagValue : m.userFlag,
              userPwnedAt,
              status,
              timeToUserSeconds: !hadUser ? m.timeSpentSeconds : m.timeToUserSeconds,
              updatedAt: now,
            };
          });
          return { machines: updated };
        });
      },

      toggleRootFlag: (id, flagValue) => {
        set((state) => {
          const now = new Date().toISOString();
          const updated = state.machines.map((m) => {
            if (m.id !== id) return m;
            const hadRoot = Boolean(m.rootPwnedAt);
            const rootPwnedAt = hadRoot ? undefined : now;
            let status = m.status;
            if (!hadRoot) status = 'root';
            return {
              ...m,
              rootFlag: flagValue !== undefined ? flagValue : m.rootFlag,
              rootPwnedAt,
              status,
              timeToRootSeconds: !hadRoot ? m.timeSpentSeconds : m.timeToRootSeconds,
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
          const isPlaceholderIp = Boolean(m && (!m.ip || m.ip.includes('x')));
          return {
            machines: updatedMachines,
            activeTargetId: id,
            activeTimerSeconds: m?.timeSpentSeconds || 0,
            assignIpMachineId: isPlaceholderIp ? id : null,
            globalVars: {
              ...state.globalVars,
              targetIp: m?.ip && !m.ip.includes('x') ? m.ip : state.globalVars.targetIp,
            },
          };
        });
      },

      startTimer: () => set({ isTimerRunning: true }),

      pauseTimer: () => {
        set((state) => {
          if (!state.activeTargetId) return { isTimerRunning: false };
          const updated = state.machines.map((m) =>
            m.id === state.activeTargetId
              ? { ...m, timeSpentSeconds: state.activeTimerSeconds }
              : m
          );
          return { machines: updated, isTimerRunning: false };
        });
      },

      resetTimer: (machineId) => {
        set((state) => {
          const targetId = machineId || state.activeTargetId;
          if (!targetId) return { isTimerRunning: false, activeTimerSeconds: 0 };
          const updated = state.machines.map((m) =>
            m.id === targetId ? { ...m, timeSpentSeconds: 0 } : m
          );
          return {
            machines: updated,
            activeTimerSeconds: targetId === state.activeTargetId ? 0 : state.activeTimerSeconds,
            isTimerRunning: false,
          };
        });
      },

      tickTimer: () => {
        set((state) => {
          if (!state.isTimerRunning || !state.activeTargetId) return {};
          return { activeTimerSeconds: state.activeTimerSeconds + 1 };
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

      setFilters: (f) => set((s) => ({ filters: { ...s.filters, ...f } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

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
        let catalog = cachedCatalog;
        if (!catalog) {
          try {
            const mod = await import('../data/machinesCatalog');
            cachedCatalog = mod.INITIAL_MACHINES;
            catalog = mod.INITIAL_MACHINES;
          } catch {
            catalog = STARTER_MACHINES;
          }
        }
        const targetId = get().currentProfileId || 'guest';
        set(() => ({
          machines: catalog,
          userSolvesReset: false,
          isCatalogLoaded: true,
        }));
        get().saveProfileData(targetId);
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

        const exportData = {
          version: '2.0.0',
          exportedAt: new Date().toISOString(),
          isRedacted: Boolean(options?.redactSecrets),
          machines: exportMachines,
          globalVars: exportGlobalVars,
          cheatsheets: state.cheatsheets,
          activitySessions: state.activitySessions,
          customNotes: state.customNotes,
          deletedNoteIds: state.deletedNoteIds,
          userSolvesReset: state.userSolvesReset,
        };
        return JSON.stringify(exportData, null, 2);
      },

      importBackup: (jsonStr) => {
        try {
          const data = JSON.parse(jsonStr);
          if (!data || typeof data !== 'object') return false;

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
            set((state) => ({
              machines: normalizedMachines,
              globalVars: data.globalVars || state.globalVars,
              cheatsheets: Array.isArray(data.cheatsheets) ? data.cheatsheets : state.cheatsheets,
              activitySessions: Array.isArray(data.activitySessions) ? data.activitySessions : state.activitySessions,
              customNotes: Array.isArray(data.customNotes) ? data.customNotes : state.customNotes,
              deletedNoteIds: Array.isArray(data.deletedNoteIds) ? data.deletedNoteIds : state.deletedNoteIds,
              userSolvesReset,
            }));
            return true;
          }
          return false;
        } catch (e) {
          console.error('Failed to parse backup JSON:', e);
          return false;
        }
      },

      loadProfileData: (profileId: string) => {
        const currentId = get().currentProfileId || 'guest';
        get().saveProfileData(currentId);

        const targetKey = getProfileStorageKey(profileId);
        const raw = localStorage.getItem(targetKey);
        if (raw) {
          try {
            const data = JSON.parse(raw);
            const userSolvesReset = Boolean(data.userSolvesReset);
            set({
              currentProfileId: profileId,
              userSolvesReset,
              machines: mergeMachinesWithCatalog(data.machines, userSolvesReset),
              activeTargetId: data.activeTargetId || null,
              globalVars: data.globalVars || DEFAULT_GLOBAL_VARS,
              cheatsheets: data.cheatsheets || INITIAL_CHEATSHEET,
              activitySessions: Array.isArray(data.activitySessions) ? data.activitySessions : [],
              customNotes: Array.isArray(data.customNotes) ? data.customNotes : [],
              deletedNoteIds: Array.isArray(data.deletedNoteIds) ? data.deletedNoteIds : [],
            });

            // Asynchronously enrich with deep writeups from IndexedDB
            loadDeepProfileData(profileId).then((deep) => {
              if (deep?.writeups && Object.keys(deep.writeups).length > 0) {
                const currentMachines = get().machines;
                const merged = mergeDeepPayloadsIntoMachines(currentMachines, deep.writeups);
                set({ machines: merged });
              }
            }).catch(() => {});

            return;
          } catch (e) {
            console.error('Failed to parse target profile data:', e);
          }
        }

        if (currentId === 'guest' && profileId !== 'guest') {
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
          localStorage.setItem(targetKey, JSON.stringify(payload));
          set({ currentProfileId: profileId });
          return;
        }

        set({
          currentProfileId: profileId,
          machines: cachedCatalog || STARTER_MACHINES,
          activeTargetId: null,
          globalVars: DEFAULT_GLOBAL_VARS,
          cheatsheets: INITIAL_CHEATSHEET,
          activitySessions: [],
          customNotes: [],
          deletedNoteIds: [],
          userSolvesReset: false,
        });
        get().saveProfileData(profileId);
      },

      saveProfileData: (profileId?: string) => {
        const state = get();
        const targetId = profileId || state.currentProfileId || 'guest';
        const targetKey = getProfileStorageKey(targetId);
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
          localStorage.setItem(targetKey, JSON.stringify(payload));
        } catch (e: any) {
          // Quota guard: prune writeups from localStorage if quota exceeded (safely stored in IndexedDB)
          if (e?.name === 'QuotaExceededError' || e?.code === 22 || (typeof e?.message === 'string' && e.message.toLowerCase().includes('quota'))) {
            console.warn('[ZeroBox] LocalStorage quota reached. Pruning writeup bodies from localStorage (safely stored in IndexedDB).');
            try {
              const leanPayload = {
                ...payload,
                machines: stripDeepFieldsFromMachines(payload.machines),
              };
              localStorage.setItem(targetKey, JSON.stringify(leanPayload));
            } catch (innerErr) {
              console.error('Failed to save even stripped profile data:', innerErr);
            }
          } else {
            console.error('Failed to save profile data:', e);
          }
        }
      },

      resetAllProgress: async () => {
        let catalog = cachedCatalog;
        if (!catalog) {
          try {
            const mod = await import('../data/machinesCatalog');
            cachedCatalog = mod.INITIAL_MACHINES;
            catalog = mod.INITIAL_MACHINES;
          } catch {
            catalog = STARTER_MACHINES;
          }
        }
        const targetId = get().currentProfileId || 'guest';
        set(() => ({
          machines: catalog,
          activeTargetId: null,
          isTimerRunning: false,
          activitySessions: [],
          customNotes: [],
          deletedNoteIds: [],
          userSolvesReset: true,
          isCatalogLoaded: true,
        }));
        get().saveProfileData(targetId);
      }
    }),
    {
      name: 'zerobox-tactical-store',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any) => {
        const currentState = useCtfStore?.getState() || {};
        const persisted = persistedState || {};
        if (!persisted.appBrand || persisted.appBrand === 'rootvector' || persisted.appBrand === 'specter') {
          persisted.appBrand = 'zerobox';
        }
        const userSolvesReset = Boolean(persisted.userSolvesReset);
        return {
          ...persisted,
          appBrand: 'zerobox',
          userSolvesReset,
          customNotes: persisted.customNotes || [],
          deletedNoteIds: persisted.deletedNoteIds || [],
          machines: mergeMachinesWithCatalog(persisted.machines, userSolvesReset),
        };
      },
      merge: (persistedState: any, currentState: CtfStoreState) => {
        const persisted = (persistedState as Partial<CtfStoreState>) || {};
        const userSolvesReset = Boolean(persisted.userSolvesReset);
        return {
          ...currentState,
          ...persisted,
          appBrand: 'zerobox',
          userSolvesReset,
          customNotes: persisted.customNotes || [],
          deletedNoteIds: persisted.deletedNoteIds || [],
          machines: mergeMachinesWithCatalog(persisted.machines, userSolvesReset),
        };
      },
      partialize: (state) => ({
        currentProfileId: state.currentProfileId,
        appBrand: state.appBrand,
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

const flushProfileSave = () => {
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

  const targetKey = getProfileStorageKey(state.currentProfileId);
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
    localStorage.setItem(targetKey, JSON.stringify(payload));
    lastSavedMachines = state.machines;
    lastSavedTargetId = state.activeTargetId;
    lastSavedGlobalVars = state.globalVars;
    lastSavedCheatsheets = state.cheatsheets;
    lastSavedSessions = state.activitySessions;
    lastSavedCustomNotes = state.customNotes;
    lastSavedDeletedNoteIds = state.deletedNoteIds;
    lastSavedUserSolvesReset = state.userSolvesReset;
  } catch (err: any) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22 || (typeof err?.message === 'string' && err.message.toLowerCase().includes('quota'))) {
      console.warn('[ZeroBox] LocalStorage quota reached in flushProfileSave. Pruning writeup bodies from localStorage.');
      try {
        const leanPayload = {
          ...payload,
          machines: stripDeepFieldsFromMachines(payload.machines),
        };
        localStorage.setItem(targetKey, JSON.stringify(leanPayload));
        lastSavedMachines = state.machines;
      } catch {}
    }
  }
};

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
    }
  });

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
      useCtfStore.setState({ machines: merged });
    }
    if (deep?.customNotes && deep.customNotes.length > 0 && useCtfStore.getState().customNotes.length === 0) {
      useCtfStore.setState({ customNotes: deep.customNotes });
    }
  }).catch((err) => {
    console.warn('[ZeroBox] Could not hydrate deep payloads from IndexedDB', err);
  });
}



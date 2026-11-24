import { Platform, Difficulty, OperatingSystem, AttackGraphPersistedState } from '../types';
// Sync merge code is loaded on demand (./syncActions) to keep it out of the entry chunk: types only here.
import type { SyncConflict, SyncMergeSummary } from '../utils/syncMerge';
import { loadLootState } from './lootPersistence';
import type { VulnDomainId } from '../utils/categoryUtils';
import { loadInitialProfileData } from './ctfStorage';
import { GraphSliceState } from './slices/graphSlice';
import { LootSliceState } from './slices/lootSlice';
import { MachinesSliceState } from './slices/machinesSlice';
import { NotesSliceState } from './slices/notesSlice';
import { ProfileSliceState } from './slices/profileSlice';
import { TimerSliceState } from './slices/timerSlice';
import { UiSliceState } from './slices/uiSlice';

/** Workspace store: state shape and the filter / tab / sort types. */

export type MergeBackupResult =
  | {
      status: 'merged';
      summary: SyncMergeSummary;
      /** 'empty': there was no stored data at all, so no snapshot was needed. */
      snapshot: 'saved' | 'duplicate' | 'empty';
      legacy: boolean;
      /** Saves that failed after the merge was applied (the merge itself stands; the next save retries). */
      warnings: string[];
    }
  | { status: 'conflicts'; conflicts: SyncConflict[]; summary: SyncMergeSummary }
  | { status: 'invalid' }
  | { status: 'busy' }
  | { status: 'gated' }
  | { status: 'snapshot-failed' }
  | { status: 'failed'; error: string };

export type BoxVectorCategory = 'ALL' | 'Web' | 'Linux PrivEsc' | 'Windows PrivEsc' | 'Active Directory' | 'Binary / Pwn' | 'Network / SMB';

export type SortOption = 'default' | 'recommended' | 'difficulty' | 'name' | 'ip' | 'recent';

export type SortDirection = 'asc' | 'desc';

export type HtbTargetStatus = 'ALL' | 'UNCOMPLETED' | 'FOOTHOLD' | 'COMPLETED';

export type AvailabilityFilter = 'ALL' | 'ACTIVE' | 'RETIRED';

export type FlexCardMode = 'achievement' | 'passed';

export interface FilterState {
  searchQuery: string;
  selectedPlatform: Platform | 'ALL';
  selectedDifficulty: Difficulty | 'ALL';
  selectedCert: 'OSCP' | 'CPTS' | 'CRTO' | 'ALL';
  selectedOs: 'ALL' | OperatingSystem;
  /** Missing (older state) is treated as 'ALL'. Unset isActive counts as retired. */
  selectedAvailability?: AvailabilityFilter;
  selectedCategory: BoxVectorCategory;
  selectedVulnCategory?: string | 'ALL';
  /** Domain tab of the vulnerability filter, shared by the filter drawer and the target list. Missing (older state) is 'all'. */
  selectedDomain?: VulnDomainId;
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

export type ActiveTab = 'tracker' | 'cheatsheet' | 'revshell' | 'field-manual' | 'writeup' | 'analytics' | 'methodology' | 'exam' | 'theme' | 'vault';

/** The whole store: every slice's state (and actions) in one flat object. */
export type CtfStoreState = MachinesSliceState &
  TimerSliceState &
  NotesSliceState &
  GraphSliceState &
  LootSliceState &
  UiSliceState &
  ProfileSliceState;

/** What the store reads from storage before it boots; handed to the slice creators that seed state from it. */
export interface CtfBootData {
  initialProfileId: string;
  initialProfileData: ReturnType<typeof loadInitialProfileData>;
  initialAttackGraphData: AttackGraphPersistedState;
  initialLootData: ReturnType<typeof loadLootState>;
  bootUserSolvesReset: boolean;
}

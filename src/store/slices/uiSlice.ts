import type { StateCreator } from 'zustand';
import { ViewMode } from '../../types';
import { DEFAULT_FILTERS } from '../ctfDefaults';
import { FlexCardMode, FilterState, ActiveTab, CtfStoreState } from '../ctfStoreTypes';
import { ThemePreset, normalizeThemePreset, UiScale, applyThemePreset } from '../ctfTheme';

/** Workspace store slice: UI state (tabs, modals, theme, scale, view mode) and the tracker filters. */

export interface UiSliceState {
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
  // Filters
  filters: FilterState;
  // Actions
  setFocusMode: (open: boolean) => void;
  toggleFocusMode: () => void;
  setSnippetsDrawerOpen: (open: boolean) => void;
  setRevShellModalOpen: (open: boolean) => void;
  setFilterDrawerOpen: (open: boolean) => void;
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
  /** Which card the flex card modal shows. Transient: not persisted. */
  flexCardMode: FlexCardMode;
  /** Opening without a mode shows the achievement card. */
  setFlexCardModalOpen: (open: boolean, mode?: FlexCardMode) => void;
  shortcutsModalOpen: boolean;
  setShortcutsModalOpen: (open: boolean) => void;
  settingsModalOpen: boolean;
  setSettingsModalOpen: (open: boolean) => void;
  notesImportModalOpen: boolean;
  setNotesImportModalOpen: (open: boolean) => void;
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
  // Filters Actions
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
}

export const createUiSlice: StateCreator<CtfStoreState, [['zustand/persist', unknown]], [], UiSliceState> = (set) => ({
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

  flexCardMode: 'achievement',

  shortcutsModalOpen: false,

  settingsModalOpen: false,

  notesImportModalOpen: false,

  mobileMenuOpen: false,

  assignIpMachineId: null,

  crtOverlay: false,

  soundEnabled: true,

  themePreset: 'obsidian' as ThemePreset,

  uiScale: 'normal',

  focusMode: false,

  snippetsDrawerOpen: false,

  revShellModalOpen: false,

  filterDrawerOpen: false,

  filters: DEFAULT_FILTERS,

  setFocusMode: (open) => set({ focusMode: open }),

  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),

  setSnippetsDrawerOpen: (open) => set({ snippetsDrawerOpen: open }),

  setRevShellModalOpen: (open) => set({ revShellModalOpen: open }),

  setFilterDrawerOpen: (open) => set({ filterDrawerOpen: open }),

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

  setFlexCardModalOpen: (open, mode = 'achievement') =>
    set(open ? { flexCardModalOpen: true, flexCardMode: mode } : { flexCardModalOpen: false }),

  setShortcutsModalOpen: (open) => set({ shortcutsModalOpen: open }),

  setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),

  setNotesImportModalOpen: (open) => set({ notesImportModalOpen: open }),

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
    const order: UiScale[] = ['normal', 'compact', 'tiny', 'large', 'huge'];
    const normalized = !s.uiScale || s.uiScale === 'auto' ? 'normal' : s.uiScale;
    const currentIdx = order.indexOf(normalized);
    const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % order.length;
    return { uiScale: order[nextIdx] };
  }),

  setFilters: (f) => set((s) => {
    const nextFilters = { ...s.filters, ...f };
    if (f.selectedTracks !== undefined && f.selectedTrack !== undefined) {
      if (f.selectedTrack !== 'ALL' && (!f.selectedTracks || f.selectedTracks.length === 0)) {
        nextFilters.selectedTracks = [f.selectedTrack];
      } else if (f.selectedTrack === 'ALL' && (!f.selectedTracks || f.selectedTracks.length === 0)) {
        nextFilters.selectedTrack = 'ALL';
        nextFilters.selectedTracks = [];
      } else if (f.selectedTracks.length > 1 && (!f.selectedTrack || f.selectedTrack === 'ALL')) {
        nextFilters.selectedTrack = 'MULTI';
      } else if (f.selectedTracks.length === 1 && (!f.selectedTrack || f.selectedTrack === 'ALL')) {
        nextFilters.selectedTrack = f.selectedTracks[0];
      }
    } else if (f.selectedTracks !== undefined) {
      nextFilters.selectedTrack = f.selectedTracks.length > 1 ? 'MULTI' : (f.selectedTracks.length === 1 ? f.selectedTracks[0] : 'ALL');
    } else if (f.selectedTrack !== undefined) {
      nextFilters.selectedTracks = f.selectedTrack === 'ALL' ? [] : [f.selectedTrack];
    }
    return { filters: nextFilters };
  }),

  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
});

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, 
  RotateCcw, 
  Kanban, 
  Table, 
  LayoutGrid, 
  Zap,
  ArrowUpDown,
  ChevronDown,
  SlidersHorizontal,
  Radio,
  X,
  Upload,
  ClipboardPaste,
  AlertCircle
} from 'lucide-react';
import { useCtfStore, FilterState, HtbTargetStatus, type SortOption } from '../../store/useCtfStore';
import { useOnboardingStore } from '../../onboarding/useOnboardingStore';
import { toast } from '../../store/useToastStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../../utils/helpers';
import { afterFirstPaint } from '../../utils/afterFirstPaint';
import { Platform, Difficulty, OperatingSystem } from '../../types';
import { createMachineFilter, getActiveTrackIds } from '../../utils/machineFilter';
import { createTrackProgressLookup } from '../../utils/trackProgress';
import { getOrderedActiveTrack, resolveSortMode, sortMachines } from '../../utils/trackerSort';
import { AVAILABILITY_LABELS } from '../../utils/availabilityFilter';
import { KanbanBoard } from './KanbanBoard';
import { TrackPicker } from './TrackPicker';
import { parseTrackParam } from '../../utils/trackUrl';
const TableView = React.lazy(() => import('./TableView').then((m) => ({ default: m.TableView })));
const GridView = React.lazy(() => import('./GridView').then((m) => ({ default: m.GridView })));
const GraphView = React.lazy(() => import('./GraphView').then((m) => ({ default: m.GraphView })));
const MultiRecordImportModal = React.lazy(() => import('./MultiRecordImportModal').then((m) => ({ default: m.MultiRecordImportModal })));
const ImportPanels = React.lazy(() => import('../import/ImportPanels').then((m) => ({ default: m.ImportPanels })));
const loadFilterDrawer = () => import('../layout/FilterDrawer');
const FilterDrawer = React.lazy(() => loadFilterDrawer().then((m) => ({ default: m.FilterDrawer })));
// Filters button: pressed while the drawer is open, and the icon spins until its chunk has arrived.
const FILTER_BTN_PRESSED = 'aria-expanded:bg-surface-hover aria-expanded:text-primary';
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';
import { OverflowMenu, type OverflowItem } from '../common/OverflowMenu';
import { CanvasSkeleton, ViewSkeleton } from '../common/Skeleton';
import { EmptyState } from '../common/EmptyState';
import { PRACTICE_TRACKS, TRACK_BY_ID } from '../../data/tracksData';
import { getCategoryDef } from '../../utils/categoryUtils';

const SORT_OPTIONS: CyberSelectOption[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'default', label: 'Randomized' },
  { value: 'difficulty', label: 'Difficulty (Easy → Hard)' },
  { value: 'name', label: 'Target Name (A-Z)' },
  { value: 'ip', label: 'IP Address' },
  { value: 'recent', label: 'Recently Solved' },
];

const TOOLBAR_BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-subtle bg-surface-card text-xs font-medium text-secondary hover:bg-surface-hover hover:text-primary transition-colors active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent whitespace-nowrap';
const SEGMENT_WRAP = 'inline-flex items-center gap-0.5 rounded-lg border border-subtle bg-surface-sunken p-0.5 flex-shrink-0';
const VIEW_BTN =
  'inline-flex items-center justify-center rounded-md transition-colors cursor-pointer active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
const VIEW_BTN_ON = 'bg-surface-card text-accent shadow-xs';
const VIEW_BTN_OFF = 'text-tertiary hover:text-primary';

const MOBILE_VIEWS = [
  { mode: 'kanban', label: 'Kanban', Icon: Kanban },
  { mode: 'table', label: 'Table', Icon: Table },
  { mode: 'grid', label: 'Grid', Icon: LayoutGrid },
  { mode: 'graph', label: 'Graph', Icon: Radio },
] as const;

const STATUS_PILL_OPTIONS: { value: HtbTargetStatus; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'UNCOMPLETED', label: 'Unsolved' },
  { value: 'FOOTHOLD', label: 'Foothold' },
  { value: 'COMPLETED', label: 'Pwned' },
];

// Rough height of the import card per breakpoint (measured), used only while it is not on screen yet.
const IMPORT_SLOT = 'mb-4 min-h-[557px] sm:min-h-[290px] xl:min-h-[326px]';
// A first visit starts on the one-row banner; the tall slot is for a card that opens expanded.
const IMPORT_SLOT_BANNER = 'mb-4 min-h-[82px] sm:min-h-[58px]';

export const IMPORT_PANEL_HINT_ID = 'tracker-import-panel';

export const TrackerView: React.FC = () => {
  const {
    machines: liveMachines,
    filters,
    setFilters,
    resetFilters,
    viewMode: storeViewMode,
    setViewMode,
    setReconAutomationModalOpen,
    setSelectedMachineId,
    soundEnabled,
    loadCatalog,
    isCatalogLoaded,
    setFilterDrawerOpen,
    addCustomMachine,
    updateMachine,
    focusMode,
  } = useCtfStore(
    useShallow((s) => ({
      machines: s.machines,
      filters: s.filters,
      setFilters: s.setFilters,
      resetFilters: s.resetFilters,
      viewMode: s.viewMode,
      setViewMode: s.setViewMode,
      setReconAutomationModalOpen: s.setReconAutomationModalOpen,
      setSelectedMachineId: s.setSelectedMachineId,
      soundEnabled: s.soundEnabled,
      loadCatalog: s.loadCatalog,
      isCatalogLoaded: s.isCatalogLoaded,
      setFilterDrawerOpen: s.setFilterDrawerOpen,
      addCustomMachine: s.addCustomMachine,
      updateMachine: s.updateMachine,
      focusMode: s.focusMode,
    }))
  );

  const location = useLocation();
  const navigate = useNavigate();

  // Nothing solved yet (or the welcome card asked for it): offer the paste importer above the board.
  const storageReady = useCtfStore((s) => s.isDeepStorageLoaded);
  const hasSolved = useCtfStore((s) => s.machines.some((m) => m.status === 'root' || m.status === 'completed'));
  const [importDismissed, setImportDismissed] = useState(false);
  const importParams = new URLSearchParams(location.search);
  const importRequested = importParams.get('import') === '1';
  const csvRequested = importRequested && importParams.get('csv') === '1';
  const importSkipped = useOnboardingStore((s) => s.dismissedHints.includes(IMPORT_PANEL_HINT_ID));
  // Bumped by the Import menu so an already-open card remounts and takes focus again.
  const [importNonce, setImportNonce] = useState(0);
  // Skip folds the card away (a short height transition) before it unmounts, so the board does not jump up.
  const [importClosing, setImportClosing] = useState(false);
  useEffect(() => {
    if (!importClosing) return;
    const t = setTimeout(() => {
      setImportDismissed(true);
      setImportClosing(false);
    }, 220);
    return () => clearTimeout(t);
  }, [importClosing]);
  const wantsImportPanel = importClosing || (!importDismissed && (importRequested || (!hasSolved && !importSkipped)));
  const showImportPanel = storageReady && wantsImportPanel;
  const slotClass = importRequested || importNonce > 0 ? IMPORT_SLOT : IMPORT_SLOT_BANNER;
  // Storage can stay unavailable (private browsing): give the placeholder a bounded wait, then drop it.
  const [slotExpired, setSlotExpired] = useState(false);
  const holdingSlot = wantsImportPanel && !storageReady;
  useEffect(() => {
    if (!holdingSlot) return;
    const t = setTimeout(() => setSlotExpired(true), 3000);
    return () => clearTimeout(t);
  }, [holdingSlot]);

  // The filter drawer chunk is fetched the first time it is opened, then kept mounted for its exit animation.
  const filterDrawerOpen = useCtfStore((s) => s.filterDrawerOpen);
  const [filterDrawerSeen, setFilterDrawerSeen] = useState(filterDrawerOpen);
  if (filterDrawerOpen && !filterDrawerSeen) setFilterDrawerSeen(true);
  const [filterDrawerLoading, setFilterDrawerLoading] = useState(false);
  const openFilters = () => {
    setFilterDrawerOpen(true);
    if (!filterDrawerSeen) {
      setFilterDrawerLoading(true);
      void loadFilterDrawer().finally(() => setFilterDrawerLoading(false));
    }
    if (soundEnabled) playCyberSound('click');
  };

  // The catalog swap (starter rows -> the full catalog of 1000+ machines) re-derives every list below. Rendering from a deferred
  // copy lets React keep the UI responsive and interrupt that re-render. (startTransition around a zustand
  // set() would not, since the store is read through useSyncExternalStore.)
  const machines = React.useDeferredValue(liveMachines);

  const sessionSeed = React.useMemo(() => Math.floor(Math.random() * 1000000), []);

  // Progress per track (track menu, strip and track counts), each track worked out when first read.
  const trackProgress = React.useMemo(
    // Track totals only mean something against the full catalog: until it merges, no counts are shown.
    () => createTrackProgressLookup(isCatalogLoaded ? PRACTICE_TRACKS : [], machines),
    [machines, isCatalogLoaded],
  );

  // Load the master machine catalog once the first paint has settled, so its chunks never race the largest
  // contentful paint. Until then the page shows the starter rows (see catalogPending below). Opening the
  // scan importer asks for it at once.
  // A load that fails (offline, a stale deploy) drops the skeleton and shows an error state with a Retry button.
  const [catalogFailed, setCatalogFailed] = useState(false);
  const retryCatalog = useCallback(() => {
    setCatalogFailed(false);
    void loadCatalog().then(() => {
      const s = useCtfStore.getState();
      if (!s.isCatalogLoaded && !s.isCatalogLoading) setCatalogFailed(true);
    });
  }, [loadCatalog]);
  React.useEffect(() => {
    let live = true;
    void afterFirstPaint()
      .then(() => (live ? loadCatalog() : undefined))
      .then(() => {
        const s = useCtfStore.getState();
        if (live && !s.isCatalogLoaded && !s.isCatalogLoading) setCatalogFailed(true);
      });
    return () => {
      live = false;
    };
  }, [loadCatalog]);


  // On mobile viewports (< 768px), default to cards view on initial mount if not explicitly set. The pick is
  // made before the first render (the store still says kanban then), so the board never renders kanban and swaps.
  const [mobileGridDefault, setMobileGridDefault] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.innerWidth < 768 &&
      !localStorage.getItem('ctf_tracker_view_mode_set')
  );
  React.useEffect(() => {
    if (!mobileGridDefault) return;
    setViewMode('grid');
    localStorage.setItem('ctf_tracker_view_mode_set', 'true');
    setMobileGridDefault(false);
  }, [mobileGridDefault, setViewMode]);
  const viewMode = mobileGridDefault ? 'grid' : storeViewMode;

  // URL-synchronized filters & deep-linking for target sharing (#/tracker?target=RootMe or ?search=...)
  React.useEffect(() => {
    if (!location.search) return;
    const params = new URLSearchParams(location.search);
    const updates: Partial<FilterState> = {};

    // Deep link directly to a specific target machine modal
    const targetParam = params.get('target') || params.get('machine');
    if (targetParam) {
      if (!isCatalogLoaded) void loadCatalog();
      if (machines.length > 0) {
        const q = targetParam.toLowerCase().trim();
        const match = machines.find((m) => m.id.toLowerCase() === q || m.name.toLowerCase() === q);
        if (match) {
          setSelectedMachineId(match.id);
        }
      }
    }

    // Opt-in "Add to my tracker" action from static guides (creates a Custom target once catalog is ready)
    const addCustomParam = params.get('addCustom');
    if (addCustomParam) {
      if (!isCatalogLoaded) {
        void loadCatalog();
      } else {
        const rawName = addCustomParam.trim().slice(0, 64);
        if (rawName) {
          const existing = liveMachines.find((m) => m.name.toLowerCase() === rawName.toLowerCase());
          if (existing) {
            setSelectedMachineId(existing.id);
            toast.info(`Opened "${existing.name}" in your tracker.`);
          } else {
            const osRaw = params.get('os') || 'Linux';
            const validOs: OperatingSystem = ['Linux', 'Windows', 'Android', 'BSD', 'macOS', 'Other'].includes(osRaw)
              ? (osRaw as OperatingSystem)
              : 'Linux';
            const certRaw = params.get('cert');
            addCustomMachine({
              name: rawName,
              ip: '',
              os: validOs,
              platform: 'Custom',
              difficulty: 'Medium',
              status: 'backlog',
              tags: ['TJ Null'],
              certifications: certRaw && ['OSCP', 'CPTS', 'CRTO', 'OSEP', 'OSWE', 'CWEE'].includes(certRaw) ? [certRaw as 'OSCP'] : [],
              timeSpentSeconds: 0,
            });
            const created = useCtfStore.getState().machines.find((m) => m.name.toLowerCase() === rawName.toLowerCase());
            if (created) setSelectedMachineId(created.id);
            toast.success(`Added "${rawName}" as a Custom target.`);
          }
        }
        const cleaned = new URLSearchParams(location.search);
        cleaned.delete('addCustom');
        cleaned.delete('os');
        cleaned.delete('cert');
        const nextSearch = cleaned.toString();
        navigate({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' }, { replace: true });
        return;
      }
    }

    const search = params.get('search') || params.get('q');
    if (search !== null) updates.searchQuery = search;

    const platform = params.get('platform');
    if (platform && ['HTB', 'THM', 'PG', 'VulnHub', 'Custom', 'ALL'].includes(platform)) {
      updates.selectedPlatform = platform as Platform | 'ALL';
    }

    const difficulty = params.get('difficulty') || params.get('diff');
    if (difficulty && ['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane', 'ALL'].includes(difficulty)) {
      updates.selectedDifficulty = difficulty as Difficulty | 'ALL';
    }

    const os = params.get('os');
    if (os && ['Linux', 'Windows', 'Android', 'BSD', 'macOS', 'Other', 'ALL'].includes(os)) {
      updates.selectedOs = os as OperatingSystem | 'ALL';
    }

    const availability = params.get('availability')?.toUpperCase();
    if (availability && ['ALL', 'ACTIVE', 'RETIRED'].includes(availability)) {
      updates.selectedAvailability = availability as 'ALL' | 'ACTIVE' | 'RETIRED';
    }

    const cert = params.get('cert');
    if (cert && ['OSCP', 'CPTS', 'CRTO', 'ALL'].includes(cert)) {
      updates.selectedCert = cert as 'OSCP' | 'CPTS' | 'CRTO' | 'ALL';
    }

    const trackIds = parseTrackParam(params.get('track'), (id) => TRACK_BY_ID.has(id));
    if (trackIds.length > 0) {
      updates.selectedTracks = trackIds;
      updates.selectedTrack = trackIds.length === 1 ? trackIds[0] : 'MULTI';
    }

    if (Object.keys(updates).length > 0) {
      setFilters(updates);
    }
  }, [location.pathname, location.search, machines, liveMachines, isCatalogLoaded, loadCatalog, addCustomMachine, navigate, setFilters, setSelectedMachineId]);

  // Global search keyboard shortcut ('/') — Ctrl+K / Cmd+K belongs exclusively to CommandPalette
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          activeEl.isContentEditable)
      ) {
        return;
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        const searchInput = (document.getElementById('tracker-search-input') || document.getElementById('tracker-search-input-mobile')) as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Synchronize domain tab when a specific category is selected
  React.useEffect(() => {
    if (filters.selectedVulnCategory && filters.selectedVulnCategory !== 'ALL') {
      const def = getCategoryDef(filters.selectedVulnCategory);
      if (def && def.domain !== (filters.selectedDomain ?? 'all')) {
        setFilters({ selectedDomain: def.domain });
      }
    }
  }, [filters.selectedVulnCategory, filters.selectedDomain, setFilters]);

  // Deferred filter state for 120 FPS typing responsiveness
  const deferredFilters = React.useDeferredValue(filters);

  // The sort the filters resolve to: with the default sort and one ordered track active, the track's order.
  const sortMode = resolveSortMode(deferredFilters);
  const orderedTrack = getOrderedActiveTrack(deferredFilters);

  // The default entry is labelled for what it does right now: following the track, or shuffling.
  const followsTrack = resolveSortMode(filters) === 'track';
  const sortOptions = React.useMemo(
    () =>
      SORT_OPTIONS.filter((o) => !(followsTrack && o.value === 'default' && (filters.sortBy || 'default') !== 'default')).map((o) =>
        (o.value === 'default' || o.value === 'recommended') && followsTrack ? { ...o, label: 'Track order' } : o,
      ),
    [followsTrack, filters.sortBy],
  );

  // Filter and sort machines based on active filter state
  const filteredMachines = useMemo(() => {
    const list = machines.filter(createMachineFilter(deferredFilters));
    return sortMachines(list, {
      mode: sortMode,
      direction: deferredFilters.sortDirection,
      seed: sessionSeed,
      catalog: machines,
      track: orderedTrack,
    });
  }, [machines, deferredFilters, sessionSeed, sortMode, orderedTrack]);



  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.selectedPlatform !== 'ALL') count++;
    if (filters.selectedDifficulty !== 'ALL') count++;
    if (filters.selectedOs && filters.selectedOs !== 'ALL') count++;
    if (filters.selectedAvailability && filters.selectedAvailability !== 'ALL') count++;
    if (filters.selectedCert !== 'ALL') count++;
    // Tracks are counted on their own button, not here.
    if (filters.selectedStatus && filters.selectedStatus !== 'ALL') count++;
    if (filters.selectedLanguage && filters.selectedLanguage !== 'ALL') count++;
    if (filters.selectedAreaOfInterest && filters.selectedAreaOfInterest !== 'ALL') count++;
    if (filters.selectedTechnique && filters.selectedTechnique !== 'ALL') count++;
    if (filters.selectedVulnCategory && filters.selectedVulnCategory !== 'ALL') count++;
    if (filters.excludeActiveDirectory) count++;
    if (filters.selectedTags.length > 0) count += filters.selectedTags.length;
    return count;
  }, [filters]);

  const dueFilterOn = /(^|\s)review:due(\s|$)/i.test(filters.searchQuery);
  const toggleDueFilter = useCallback(() => {
    const rest = filters.searchQuery.replace(/(^|\s)review:due(?=\s|$)/gi, ' ').replace(/\s+/g, ' ').trim();
    setFilters({ searchQuery: dueFilterOn ? rest : `${rest} review:due`.trim() });
    if (soundEnabled) playCyberSound('click');
  }, [filters.searchQuery, dueFilterOn, setFilters, soundEnabled]);

  const activeFilterPills = useMemo(() => {
    const pills: { id: string; label: string; onRemove: () => void }[] = [];
    if (filters.searchQuery) {
      pills.push({
        id: 'search',
        label: `Search: "${filters.searchQuery}"`,
        onRemove: () => setFilters({ searchQuery: '' }),
      });
    }
    if (filters.selectedPlatform !== 'ALL') {
      pills.push({
        id: 'platform',
        label: `Platform: ${filters.selectedPlatform}`,
        onRemove: () => setFilters({ selectedPlatform: 'ALL' }),
      });
    }
    if (filters.selectedDifficulty !== 'ALL') {
      pills.push({
        id: 'diff',
        label: `Diff: ${filters.selectedDifficulty}`,
        onRemove: () => setFilters({ selectedDifficulty: 'ALL' }),
      });
    }
    if (filters.selectedOs && filters.selectedOs !== 'ALL') {
      pills.push({
        id: 'os',
        label: `OS: ${filters.selectedOs}`,
        onRemove: () => setFilters({ selectedOs: 'ALL' }),
      });
    }
    if (filters.selectedAvailability && filters.selectedAvailability !== 'ALL') {
      pills.push({
        id: 'availability',
        label: `Availability: ${AVAILABILITY_LABELS[filters.selectedAvailability]}`,
        onRemove: () => setFilters({ selectedAvailability: 'ALL' }),
      });
    }
    if (filters.selectedCert !== 'ALL') {
      pills.push({
        id: 'cert',
        label: `Cert: ${filters.selectedCert}`,
        onRemove: () => setFilters({ selectedCert: 'ALL' }),
      });
    }
    if (filters.selectedStatus && filters.selectedStatus !== 'ALL') {
      const statusLabels: Record<string, string> = {
        UNCOMPLETED: 'Unsolved',
        FOOTHOLD: 'Foothold',
        COMPLETED: 'Pwned',
      };
      pills.push({
        id: 'status',
        label: `Status: ${statusLabels[filters.selectedStatus] || filters.selectedStatus}`,
        onRemove: () => setFilters({ selectedStatus: 'ALL' }),
      });
    }
    if (filters.selectedLanguage && filters.selectedLanguage !== 'ALL') {
      pills.push({
        id: 'lang',
        label: `Lang: ${filters.selectedLanguage}`,
        onRemove: () => setFilters({ selectedLanguage: 'ALL' }),
      });
    }
    if (filters.selectedAreaOfInterest && filters.selectedAreaOfInterest !== 'ALL') {
      pills.push({
        id: 'area',
        label: `Area: ${filters.selectedAreaOfInterest}`,
        onRemove: () => setFilters({ selectedAreaOfInterest: 'ALL' }),
      });
    }
    if (filters.selectedTechnique && filters.selectedTechnique !== 'ALL') {
      pills.push({
        id: 'tech',
        label: `Tech: ${filters.selectedTechnique}`,
        onRemove: () => setFilters({ selectedTechnique: 'ALL' }),
      });
    }
    if (filters.selectedVulnCategory && filters.selectedVulnCategory !== 'ALL') {
      pills.push({
        id: 'vuln',
        label: `Category: ${filters.selectedVulnCategory}`,
        onRemove: () => setFilters({ selectedVulnCategory: 'ALL', selectedCategory: 'ALL' }),
      });
    }
    if (filters.excludeActiveDirectory) {
      pills.push({
        id: 'ad',
        label: 'No AD Labs',
        onRemove: () => setFilters({ excludeActiveDirectory: false }),
      });
    }
    filters.selectedTags.forEach((t) => {
      pills.push({
        id: `tag-${t}`,
        label: `#${t}`,
        onRemove: () => setFilters({ selectedTags: filters.selectedTags.filter((x) => x !== t) }),
      });
    });
    if (dueFilterOn) {
      pills.push({
        id: 'due-filter',
        label: 'Due for review',
        onRemove: toggleDueFilter,
      });
    }
    return pills;
  }, [filters, setFilters, dueFilterOn, toggleDueFilter]);

  const [multiImportOpen, setMultiImportOpen] = useState(false);
  React.useEffect(() => {
    if (multiImportOpen) void loadCatalog();
  }, [multiImportOpen, loadCatalog]);

  const activeTrackIds = getActiveTrackIds(filters);
  const activeTrack = activeTrackIds.length === 1 ? TRACK_BY_ID.get(activeTrackIds[0]) : undefined;
  const activeTrackProgress = activeTrack ? trackProgress.get(activeTrack.id) : undefined;
  const selectTrack = (trackId: string | null) => {
    setFilters(trackId ? { selectedTrack: trackId, selectedTracks: [trackId] } : { selectedTrack: 'ALL', selectedTracks: [] });
    if (soundEnabled) playCyberSound('toggle');
  };
  const openTrackDrawer = () => {
    setFilterDrawerOpen(true);
    if (soundEnabled) playCyberSound('click');
  };

  // The count only shows while filters hide part of the catalog.
  const hiddenByFilters = isCatalogLoaded && filteredMachines.length !== machines.length;
  const countLabel = (
    <span className="font-mono tabular-nums text-xs text-muted whitespace-nowrap px-1" aria-live="polite">
      {hiddenByFilters ? `${filteredMachines.length} of ${machines.length}` : ''}
    </span>
  );

  const importItems: OverflowItem[] = [
    {
      id: 'solved',
      label: 'Import solved boxes',
      icon: <ClipboardPaste className="w-3.5 h-3.5" />,
      onSelect: () => {
        setImportDismissed(false);
        setImportNonce((n) => n + 1);
        navigate('/tracker?import=1');
      },
    },
    {
      id: 'csv',
      label: 'Import machines from CSV',
      icon: <Upload className="w-3.5 h-3.5" />,
      onSelect: () => {
        setImportDismissed(false);
        setImportNonce((n) => n + 1);
        navigate('/tracker?import=1&csv=1');
      },
    },
    {
      id: 'scan',
      label: 'Import scan output',
      icon: <Zap className="w-3.5 h-3.5" />,
      onSelect: () => setReconAutomationModalOpen(true),
    },
    {
      id: 'bulk',
      label: 'Bulk import scan records',
      icon: <Upload className="w-3.5 h-3.5" />,
      onSelect: () => {
        setMultiImportOpen(true);
        if (soundEnabled) playCyberSound('click');
      },
    },
  ];

  const nextMachine = activeTrack ? activeTrackProgress?.next ?? null : null;
  const hasOtherFilters = activeFilterPills.length > 0;
  return (
    <div className="space-y-3 w-full">
      <h1 className="sr-only">CTF tracker</h1>
      {multiImportOpen && (
        <React.Suspense fallback={null}>
        <MultiRecordImportModal
          open={multiImportOpen}
          onClose={() => setMultiImportOpen(false)}
          machines={liveMachines}
          catalogReady={isCatalogLoaded}
          soundEnabled={soundEnabled}
          addCustomMachine={addCustomMachine}
          updateMachine={updateMachine}
        />
        </React.Suspense>
      )}
      {/* Toolbar: one calm row on desktop, search + Filters on mobile */}
      <div className="relative z-30 space-y-2">
        {/* MOBILE (< md): search + Filters, then view switcher + count */}
        <div className="md:hidden space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[7.5rem] group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary group-focus-within:text-accent transition-colors pointer-events-none" />
              <input
                type="text"
                id="tracker-search-input-mobile"
                name="tracker-search-input-mobile"
                aria-label="Search machines"
                value={filters.searchQuery}
                onChange={(e) => setFilters({ searchQuery: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setFilters({ searchQuery: '' });
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                placeholder="Search targets or IP"
                className="w-full h-11 pl-9 pr-9 bg-surface-card border border-subtle rounded-lg text-sm font-sans text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  onClick={() => setFilters({ searchQuery: '' })}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-md text-tertiary hover:text-primary cursor-pointer transition-colors"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={openFilters}
              aria-haspopup="dialog"
              aria-expanded={filterDrawerOpen}
              aria-busy={filterDrawerLoading}
              className={`${TOOLBAR_BTN} ${FILTER_BTN_PRESSED} h-11 px-3.5 ${
                activeFilterCount > 0 ? 'border-accent text-accent' : ''
              }`}
              title="Open filters"
              aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : 'Filters'}
            >
              <SlidersHorizontal className={`w-4 h-4 ${filterDrawerLoading ? 'animate-pulse' : ''}`} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="font-mono text-xs tabular-nums">{activeFilterCount}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setMultiImportOpen(true);
                if (soundEnabled) playCyberSound('click');
              }}
              className={`${TOOLBAR_BTN} h-11 px-2.5`}
              title="Bulk import scan records"
              aria-label="Bulk import scan records"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <TrackPicker
              tracks={PRACTICE_TRACKS}
              progress={trackProgress}
              selectedTrackIds={activeTrackIds}
              onSelect={selectTrack}
              onOpenMulti={openTrackDrawer}
              buttonClassName={`${TOOLBAR_BTN} h-11 px-3 w-full justify-start`}
              className="flex-1 min-w-0"
            />
            <div role="group" aria-label="View mode" data-tour="tracker-views" className={SEGMENT_WRAP}>
              {MOBILE_VIEWS.map(({ mode, label, Icon }) => {
                const on = viewMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    data-testid={`view-${mode}-mobile`}
                    aria-label={`${label} View`}
                    aria-pressed={on}
                    onClick={() => setViewMode(mode)}
                    className={`${VIEW_BTN} h-11 gap-1.5 text-xs font-medium ${on ? 'px-2.5' : 'w-11'} ${on ? VIEW_BTN_ON : VIEW_BTN_OFF}`}
                    title={`${label} View`}
                  >
                    <Icon className="w-4 h-4" />
                    {on && <span>{label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          {hiddenByFilters && countLabel}
        </div>

        {/* DESKTOP (>= md): search, status, then filters / sort / count / view */}
        <div className="hidden md:flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative h-8 w-44 2xl:w-60 flex-shrink-0 group">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-tertiary group-focus-within:text-accent transition-colors pointer-events-none" />
            <input
              type="text"
              id="tracker-search-input"
              name="tracker-search-input"
              aria-label="Search machines"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setFilters({ searchQuery: '' });
                  (e.target as HTMLInputElement).blur();
                }
              }}
              placeholder="Search targets, IP, CVE"
              className="w-full h-8 pl-8 pr-9 bg-surface-card border border-subtle rounded-lg text-xs font-sans text-primary placeholder:text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
            />
            {filters.searchQuery ? (
              <button
                type="button"
                onClick={() => setFilters({ searchQuery: '' })}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-tertiary hover:text-primary cursor-pointer transition-colors"
                title="Clear search (Esc)"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none px-1.5 h-5 inline-flex items-center text-xs font-mono text-tertiary bg-surface-sunken border border-subtle rounded">
                /
              </kbd>
            )}
          </div>

          {/* Status segmented control */}
          <div role="group" aria-label="Target status" className={SEGMENT_WRAP}>
            {STATUS_PILL_OPTIONS.map((st) => {
              const active = (filters.selectedStatus || 'ALL') === st.value;
              return (
                <button
                  key={st.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setFilters({ selectedStatus: st.value });
                    if (soundEnabled) playCyberSound('toggle');
                  }}
                  className={`h-7 px-2.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer active:scale-[0.97] ${
                    active ? 'bg-surface-card text-primary shadow-xs' : 'text-muted hover:text-primary'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>

          {/* display: contents so every control wraps in this one row. A nested wrapping flex container
              under-measures its height in some engines and lets the next block overlap it. */}
          <div className="contents">
            {/* Tracks: compact picker with progress, replaces the old chip row */}
            <TrackPicker
              tracks={PRACTICE_TRACKS}
              progress={trackProgress}
              selectedTrackIds={activeTrackIds}
              onSelect={selectTrack}
              onOpenMulti={openTrackDrawer}
              buttonClassName={`${TOOLBAR_BTN} h-8 px-2.5 max-w-[16rem]`}
              className="ml-auto"
            />

            {/* Filters (OS, difficulty, platform, certs and more live in the drawer) */}
            <button
              type="button"
              onClick={openFilters}
              aria-haspopup="dialog"
              aria-expanded={filterDrawerOpen}
              aria-busy={filterDrawerLoading}
              className={`${TOOLBAR_BTN} ${FILTER_BTN_PRESSED} h-8 px-2.5 ${
                activeFilterCount > 0 ? 'border-accent text-accent' : ''
              }`}
              title="Open filters"
              aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : 'Filters'}
            >
              <SlidersHorizontal className={`w-3.5 h-3.5 ${filterDrawerLoading ? 'animate-pulse' : ''}`} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="font-mono text-xs tabular-nums">{activeFilterCount}</span>
              )}
            </button>

            {/* Sort */}
            <div className="h-8 flex items-center gap-1 pl-2 rounded-lg border border-subtle bg-surface-card text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-tertiary flex-shrink-0" />
              <CyberSelect
                id="tracker-sort-select"
                name="tracker-sort-select"
                aria-label={`Sort targets - ${sortOptions.find(o => o.value === (filters.sortBy || 'default'))?.label || 'Default Order'}`}
                value={filters.sortBy || 'default'}
                onChange={(val) => setFilters({ sortBy: val as SortOption })}
                options={sortOptions}
                variant="transparent"
                size="xs"
                triggerClassName="h-7 py-0 px-1.5 border-none bg-transparent hover:bg-transparent text-secondary text-xs font-medium"
                soundEnabled={soundEnabled}
              />
            </div>

            {/* Result count: only while filters hide machines */}
            {hiddenByFilters && countLabel}

            {/* Import: scan output and bulk records */}
            <OverflowMenu
              label="Import"
              items={importItems}
              align="right"
              triggerClassName={`${TOOLBAR_BTN} h-8 px-2.5`}
              triggerContent={
                <>
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span className="hidden 2xl:inline">Import</span>
                  <ChevronDown className="w-3 h-3 text-tertiary" aria-hidden="true" />
                </>
              }
            />

            {/* The sidebar owns the desktop view switch; focus mode hides the sidebar, so the toolbar carries one then. */}
            {focusMode && (
              <div role="group" aria-label="View mode" className={SEGMENT_WRAP}>
                {MOBILE_VIEWS.map(({ mode, label, Icon }) => (
                  <button
                    key={mode}
                    type="button"
                    data-testid={`view-${mode}`}
                    aria-label={`${label} View`}
                    aria-pressed={viewMode === mode}
                    onClick={() => setViewMode(mode as typeof viewMode)}
                    className={`${VIEW_BTN} w-7 h-7 ${viewMode === mode ? VIEW_BTN_ON : VIEW_BTN_OFF}`}
                    title={`${label} View`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Active filters: chips, only when something is applied */}
        {(hasOtherFilters || nextMachine) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeFilterPills.map((pill) => (
              <span
                key={pill.id}
                className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-md text-xs font-medium bg-surface-sunken border border-subtle text-secondary"
              >
                <span className="truncate max-w-[200px]">{pill.label}</span>
                <button
                  type="button"
                  onClick={() => {
                    pill.onRemove();
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="inline-flex items-center justify-center w-6 h-6 -m-1 rounded text-tertiary hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer [@media(pointer:coarse)]:w-8 [@media(pointer:coarse)]:h-8 [@media(pointer:coarse)]:m-0"
                  title={`Remove ${pill.label}`}
                  aria-label={`Remove filter ${pill.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {hasOtherFilters && (
              <button
                type="button"
                onClick={() => {
                  resetFilters();
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-xs font-medium text-muted hover:text-primary hover:bg-surface-hover transition-colors active:scale-[0.97] cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear all</span>
              </button>
            )}
            {nextMachine && (
              <button
                type="button"
                onClick={() => setSelectedMachineId(nextMachine.id)}
                className="inline-flex items-center gap-1 min-h-6 px-1 rounded-md text-xs text-muted hover:text-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:min-h-11"
              >
                <span className="truncate max-w-[16rem]">Next: {nextMachine.name}</span>
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Slide-over Filter Drawer */}
      {filterDrawerSeen && (
        <React.Suspense fallback={null}>
          <FilterDrawer />
        </React.Suspense>
      )}

      {/* The card's space is held from the first render (storage not ready, chunk still loading), so the board below stays put. */}
      {wantsImportPanel && !showImportPanel && !slotExpired && <div aria-hidden="true" data-testid="import-slot" className={slotClass} />}
      {showImportPanel && (
        <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${importClosing ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]'}`}>
          <div className={`min-h-0 ${importClosing ? 'overflow-hidden' : ''}`}>
            <React.Suspense fallback={<div aria-hidden="true" data-testid="import-slot" className={slotClass} />}>
              <ImportPanels
                key={importNonce}
                csvRequested={csvRequested}
                focusOnMount={importRequested || importNonce > 0}
                onApplied={() => {
                  // One batched update with the store write: the tour moves to its last card before the panel goes,
                  // so it never shows the import step without its target.
                  useOnboardingStore.getState().advanceTourFrom('import');
                  setImportDismissed(true);
                }}
                onSkip={() => {
                  useOnboardingStore.getState().advanceTourFrom('import');
                  useOnboardingStore.getState().dismissHint(IMPORT_PANEL_HINT_ID);
                  setImportClosing(true);
                  // A ?import=1 link must not bring the card back on reload.
                  if (importRequested) navigate(location.pathname, { replace: true });
                }}
                className="mb-4"
              />
            </React.Suspense>
          </div>
        </div>
      )}

      {/* Main View Renderer */}
      {filteredMachines.length === 0 && !isCatalogLoaded && !catalogFailed ? (
        // The full catalog is still loading: the starter rows alone say nothing about what the filters match.
        <div data-testid="catalog-pending">
          <ViewSkeleton label="Loading machines…" />
        </div>
      ) : filteredMachines.length === 0 && catalogFailed && !isCatalogLoaded ? (
        <div data-testid="catalog-error" role="alert">
          <EmptyState
            icon={AlertCircle}
            title="Could not load the machine list."
            description="Check your connection, then try again."
            action={{ label: 'Retry', onClick: retryCatalog, icon: RotateCcw }}
          />
        </div>
      ) : filteredMachines.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 text-center rounded-2xl border border-dashed border-strong">
          <p className="text-sm text-secondary font-sans max-w-md">
            {filters.searchQuery
              ? `No machines match "${filters.searchQuery}" with the current filters.`
              : 'No machines match the current filters.'}
          </p>
          <button
            type="button"
            onClick={() => {
              resetFilters();
              if (soundEnabled) playCyberSound('toggle');
            }}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm font-medium text-on-accent bg-accent hover:bg-accent-hover transition-colors active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:h-11"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset filters</span>
          </button>
        </div>
      ) : (
        <div data-tour="tracker-board">
          {viewMode === 'kanban' && <KanbanBoard filteredMachines={filteredMachines} />}
          {viewMode === 'table' && (
            <React.Suspense fallback={<ViewSkeleton />}>
              <TableView filteredMachines={filteredMachines} />
            </React.Suspense>
          )}
          {viewMode === 'grid' && (
            <React.Suspense fallback={<ViewSkeleton />}>
              <GridView filteredMachines={filteredMachines} />
            </React.Suspense>
          )}
          {viewMode === 'graph' && (
            <React.Suspense fallback={<CanvasSkeleton label="Loading attack graph…" />}>
              <GraphView filteredMachines={filteredMachines} />
            </React.Suspense>
          )}
        </div>
      )}
    </div>
  );
};

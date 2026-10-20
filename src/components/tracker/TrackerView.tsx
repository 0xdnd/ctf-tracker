import React, { useMemo, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, 
  RotateCcw, 
  Kanban, 
  Table, 
  LayoutGrid, 
  Target,
  Zap,
  ArrowUpDown,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Share2,
  X,
  Upload
} from 'lucide-react';
import { useCtfStore, FilterState, HtbTargetStatus } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../../utils/helpers';
import { Platform, Difficulty, OperatingSystem } from '../../types';
import { createMachineFilter, getActiveTrackIds } from '../../utils/machineFilter';
import { getTrackProgress, type TrackProgress } from '../../utils/trackProgress';
import { getOrderedActiveTrack, resolveSortMode, sortMachines } from '../../utils/trackerSort';
import { AVAILABILITY_LABELS } from '../../utils/availabilityFilter';
import { computeReadiness } from '../../utils/readiness';
import { MultiRecordImportModal } from './MultiRecordImportModal';
import { KanbanBoard } from './KanbanBoard';
import { TrackChipRow } from './TrackChipRow';
import { parseTrackParam } from '../../utils/trackUrl';
const TableView = React.lazy(() => import('./TableView').then((m) => ({ default: m.TableView })));
const GridView = React.lazy(() => import('./GridView').then((m) => ({ default: m.GridView })));
const GraphView = React.lazy(() => import('./GraphView').then((m) => ({ default: m.GraphView })));
const FilterDrawer = React.lazy(() => import('../layout/FilterDrawer').then((m) => ({ default: m.FilterDrawer })));
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';
import { CanvasSkeleton, ViewSkeleton } from '../common/Skeleton';
import { PRACTICE_TRACKS, TRACK_BY_ID } from '../../data/tracksData';
import { 
  VULN_CATEGORIES, 
  VulnDomainId, 
  classifyMachine, 
  getCategoryDef 
} from '../../utils/categoryUtils';

const SORT_OPTIONS: CyberSelectOption[] = [
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

const STATUS_PILL_OPTIONS: { value: HtbTargetStatus; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'UNCOMPLETED', label: 'Unsolved' },
  { value: 'FOOTHOLD', label: 'Foothold' },
  { value: 'COMPLETED', label: 'Pwned' },
];

export const TrackerView: React.FC = () => {
  const {
    machines: liveMachines,
    filters,
    setFilters,
    resetFilters,
    viewMode,
    setViewMode,
    setReconAutomationModalOpen,
    setSelectedMachineId,
    soundEnabled,
    loadCatalog,
    setFilterDrawerOpen,
    addCustomMachine,
    updateMachine,
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
      setFilterDrawerOpen: s.setFilterDrawerOpen,
      addCustomMachine: s.addCustomMachine,
      updateMachine: s.updateMachine,
    }))
  );

  const location = useLocation();

  // The filter drawer chunk is fetched the first time it is opened, then kept mounted for its exit animation.
  const filterDrawerOpen = useCtfStore((s) => s.filterDrawerOpen);
  const [filterDrawerSeen, setFilterDrawerSeen] = useState(filterDrawerOpen);
  if (filterDrawerOpen && !filterDrawerSeen) setFilterDrawerSeen(true);

  // The catalog swap (starter rows -> the full catalog of 1000+ machines) re-derives every list below. Rendering from a deferred
  // copy lets React keep the UI responsive and interrupt that re-render. (startTransition around a zustand
  // set() would not, since the store is read through useSyncExternalStore.)
  const machines = React.useDeferredValue(liveMachines);

  const sessionSeed = React.useMemo(() => Math.floor(Math.random() * 1000000), []);

  // Progress per track (chip row, strip and track counts all read this one pass over the catalog)
  const trackProgress = React.useMemo(() => {
    const byTrack = new Map<string, TrackProgress>();
    PRACTICE_TRACKS.forEach((t) => byTrack.set(t.id, getTrackProgress(t, machines)));
    return byTrack;
  }, [machines]);

  // Lazy-load master machine catalog when TrackerView mounts
  React.useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // On mobile viewports (< 768px), default to cards view on initial mount if not explicitly set
  React.useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      const hasStoredView = localStorage.getItem('ctf_tracker_view_mode_set');
      if (!hasStoredView) {
        setViewMode('grid');
        localStorage.setItem('ctf_tracker_view_mode_set', 'true');
      }
    }
  }, [setViewMode]);

  // URL-synchronized filters & deep-linking for target sharing (#/tracker?target=RootMe or ?search=...)
  React.useEffect(() => {
    if (!location.search) return;
    const params = new URLSearchParams(location.search);
    const updates: Partial<FilterState> = {};

    // Deep link directly to a specific target machine modal
    const targetParam = params.get('target') || params.get('machine');
    if (targetParam && machines.length > 0) {
      const q = targetParam.toLowerCase().trim();
      const match = machines.find((m) => m.id.toLowerCase() === q || m.name.toLowerCase() === q);
      if (match) {
        setSelectedMachineId(match.id);
      }
    }

    const search = params.get('search') || params.get('q');
    if (search !== null) updates.searchQuery = search;

    const platform = params.get('platform');
    if (platform && ['HTB', 'THM', 'Custom', 'ALL'].includes(platform)) {
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
  }, [location.search, machines, setFilters, setSelectedMachineId]);

  // Global search keyboard shortcut ('/' or 'Ctrl+K' / 'Cmd+K' like GitHub / Linear)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable)
      ) {
        return;
      }
      if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
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

  // Extract all unique tags across machines

  // Track statistics (pwned count & total for each track)

  // Memoized live category and domain counts across all catalog targets
  useMemo(() => {
        const catCounts: Record<string, number> = { ALL: machines.length };
        const domCounts: Record<VulnDomainId, number> = {
            all: machines.length,
            web: 0,
            ad: 0,
            system: 0,
            advanced: 0,
        };
        VULN_CATEGORIES.forEach((c) => {
            catCounts[c.id] = 0;
        });
        let adCount = 0;
        let nonAdCount = 0;
        machines.forEach((m) => {
            const res = classifyMachine(m);
            if (res.isAD) adCount++;
            else nonAdCount++;
            res.domains.forEach((d) => {
                domCounts[d] = (domCounts[d] || 0) + 1;
            });
            res.categories.forEach((catId) => {
                if (catCounts[catId] !== undefined) {
                    catCounts[catId]++;
                }
            });
        });
        catCounts['AD_TOTAL'] = adCount;
        catCounts['NON_AD_TOTAL'] = nonAdCount;
        return { categoryCounts: catCounts, domainCounts: domCounts };
    }, [machines]);

  // Deferred filter state for 120 FPS typing responsiveness
  const deferredFilters = React.useDeferredValue(filters);

  // The sort the filters resolve to: with the default sort and one ordered track active, the track's order.
  const sortMode = resolveSortMode(deferredFilters);
  const orderedTrack = getOrderedActiveTrack(deferredFilters);

  // The default entry is labelled for what it does right now: following the track, or shuffling.
  const followsTrack = resolveSortMode(filters) === 'track';
  const sortOptions = React.useMemo(
    () => SORT_OPTIONS.map((o) => (o.value === 'default' && followsTrack ? { ...o, label: 'Track order' } : o)),
    [followsTrack],
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
    if (filters.selectedTracks && filters.selectedTracks.length > 0) {
      count += filters.selectedTracks.length;
    } else if (filters.selectedTrack && filters.selectedTrack !== 'ALL') {
      count++;
    }
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
    if (filters.selectedTracks && filters.selectedTracks.length > 0) {
      filters.selectedTracks.forEach((trackId) => {
        const tr = TRACK_BY_ID.get(trackId);
        pills.push({
          id: `track-${trackId}`,
          label: `Track: ${tr?.shortName || trackId}`,
          onRemove: () => {
            const next = filters.selectedTracks.filter((x) => x !== trackId);
            setFilters({
              selectedTracks: next,
              selectedTrack: next.length === 1 ? next[0] : (next.length > 1 ? 'MULTI' : 'ALL'),
            });
          },
        });
      });
    } else if (filters.selectedTrack && filters.selectedTrack !== 'ALL') {
      const tr = TRACK_BY_ID.get(filters.selectedTrack);
      pills.push({
        id: 'track',
        label: `Track: ${tr?.shortName || filters.selectedTrack}`,
        onRemove: () => setFilters({ selectedTrack: 'ALL', selectedTracks: [] }),
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
  const [readinessOpen, setReadinessOpen] = useState(false);
  const readiness = useMemo(() => computeReadiness(machines, Date.now()), [machines]);

  return (
    <div className="space-y-3 w-full">
      <MultiRecordImportModal
        open={multiImportOpen}
        onClose={() => setMultiImportOpen(false)}
        machines={liveMachines}
        soundEnabled={soundEnabled}
        addCustomMachine={addCustomMachine}
        updateMachine={updateMachine}
      />
      {/* Toolbar: one calm row on desktop, search + Filters on mobile */}
      <div className="relative z-30 space-y-2">
        {/* MOBILE (< md): search + Filters, then view switcher + count */}
        <div className="md:hidden space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 group">
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
              onClick={() => { setFilterDrawerOpen(true); if (soundEnabled) playCyberSound('click'); }}
              className={`${TOOLBAR_BTN} h-11 px-3.5 ${
                activeFilterCount > 0 ? 'border-accent text-accent' : ''
              }`}
              title="Open filters"
              aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : 'Filters'}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="font-mono text-xs tabular-nums">{activeFilterCount}</span>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div role="group" aria-label="View mode" className={SEGMENT_WRAP}>
              <button
                type="button"
                data-testid="view-kanban-mobile"
                aria-label="Kanban View"
                aria-pressed={viewMode === 'kanban'}
                onClick={() => setViewMode('kanban')}
                className={`${VIEW_BTN} w-11 h-11 ${viewMode === 'kanban' ? VIEW_BTN_ON : VIEW_BTN_OFF}`}
                title="Kanban View"
              >
                <Kanban className="w-4 h-4" />
              </button>
              <button
                type="button"
                data-testid="view-table-mobile"
                aria-label="Table View"
                aria-pressed={viewMode === 'table'}
                onClick={() => setViewMode('table')}
                className={`${VIEW_BTN} w-11 h-11 ${viewMode === 'table' ? VIEW_BTN_ON : VIEW_BTN_OFF}`}
                title="Table View"
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                type="button"
                data-testid="view-grid-mobile"
                aria-label="Grid View"
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                className={`${VIEW_BTN} w-11 h-11 ${viewMode === 'grid' ? VIEW_BTN_ON : VIEW_BTN_OFF}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setReadinessOpen((prev) => !prev);
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`${TOOLBAR_BTN} h-11 px-2.5 text-xs flex items-center gap-1 ${readinessOpen ? 'border-accent text-accent' : ''}`}
                title="Toggle readiness summary"
                aria-label="Toggle readiness panel"
              >
                <Target className="w-4 h-4 text-accent" />
                <span className="font-mono">{readiness.score}%</span>
                {readiness.dueItems.length > 0 && (
                  <span className="px-1 rounded-full bg-warning/20 text-warning text-[10px] font-mono font-bold">
                    {readiness.dueItems.length}
                  </span>
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
              <div className="font-mono tabular-nums text-xs text-muted pl-1" aria-live="polite">
                <span className="text-primary">{filteredMachines.length}</span> / {machines.length}
              </div>
            </div>
          </div>
        </div>

        {/* DESKTOP (>= md): search, status, then filters / sort / count / view */}
        <div className="hidden md:flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative h-8 w-52 lg:w-60 flex-shrink-0 group">
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

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Filters (OS, difficulty, platform, certs and more live in the drawer) */}
            <button
              type="button"
              onClick={() => { setFilterDrawerOpen(true); if (soundEnabled) playCyberSound('click'); }}
              className={`${TOOLBAR_BTN} h-8 px-2.5 ${
                activeFilterCount > 0 ? 'border-accent text-accent' : ''
              }`}
              title="Open filters"
              aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : 'Filters'}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
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
                onChange={(val) => setFilters({ sortBy: val as any })}
                options={sortOptions}
                variant="transparent"
                size="xs"
                triggerClassName="h-7 py-0 px-1.5 border-none bg-transparent hover:bg-transparent text-secondary text-xs font-medium"
                soundEnabled={soundEnabled}
              />
            </div>

            {/* Result count (telemetry) */}
            <div className="font-mono tabular-nums text-xs text-muted whitespace-nowrap px-1" aria-live="polite">
              <span className="text-primary">{filteredMachines.length}</span> / {machines.length}
            </div>

            {/* Scan importer */}
            <button
              type="button"
              onClick={() => setReconAutomationModalOpen(true)}
              className={`${TOOLBAR_BTN} h-8 px-2.5`}
              title="Import scan output"
              aria-label="Import scan output"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Import</span>
            </button>

            {/* Bulk Scan Importer */}
            <button
              type="button"
              onClick={() => { setMultiImportOpen(true); if (soundEnabled) playCyberSound('click'); }}
              className={`${TOOLBAR_BTN} h-8 px-2.5`}
              title="Bulk import targets from Nmap / NetExec multi-host scan"
              aria-label="Bulk import scan records"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Bulk Import</span>
            </button>

            {/* Exam Readiness & Review Queue Toggle */}
            <button
              type="button"
              onClick={() => {
                setReadinessOpen((prev) => !prev);
                if (soundEnabled) playCyberSound('click');
              }}
              aria-expanded={readinessOpen}
              className={`${TOOLBAR_BTN} h-8 px-2.5 ${readinessOpen ? 'border-accent text-accent' : ''}`}
              title="Exam readiness score and spaced repetition review queue"
              aria-label="Toggle readiness panel"
            >
              <Target className="w-3.5 h-3.5 text-accent" />
              <span className="hidden xl:inline">Readiness</span>
              <span className="font-mono tabular-nums font-semibold">{readiness.score}%</span>
              {readiness.dueItems.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-warning/20 text-warning text-[10px] font-mono font-bold">
                  {readiness.dueItems.length}
                </span>
              )}
            </button>

            {/* View switcher */}
            <div role="group" aria-label="View mode" className={SEGMENT_WRAP}>
              <button
                type="button"
                data-testid="view-kanban"
                aria-label="Kanban View"
                aria-pressed={viewMode === 'kanban'}
                onClick={() => setViewMode('kanban')}
                className={`${VIEW_BTN} w-7 h-7 ${viewMode === 'kanban' ? VIEW_BTN_ON : VIEW_BTN_OFF}`}
                title="Kanban View"
              >
                <Kanban className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                data-testid="view-table"
                aria-label="Table View"
                aria-pressed={viewMode === 'table'}
                onClick={() => setViewMode('table')}
                className={`${VIEW_BTN} w-7 h-7 ${viewMode === 'table' ? VIEW_BTN_ON : VIEW_BTN_OFF}`}
                title="Table View"
              >
                <Table className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                data-testid="view-grid"
                aria-label="Grid View"
                aria-pressed={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                className={`${VIEW_BTN} w-7 h-7 ${viewMode === 'grid' ? VIEW_BTN_ON : VIEW_BTN_OFF}`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                data-testid="view-graph"
                aria-label="Attack Graph View"
                aria-pressed={viewMode === 'graph'}
                onClick={() => setViewMode('graph')}
                className={`${VIEW_BTN} w-7 h-7 ${viewMode === 'graph' ? VIEW_BTN_ON : VIEW_BTN_OFF}`}
                title="Attack Graph View"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              {viewMode === 'kanban' && (
                <>
                  <div className="w-px h-4 bg-surface-hover mx-0.5" aria-hidden="true" />
                  <button
                    type="button"
                    aria-pressed={Boolean(filters.hideEmptyLanes)}
                    onClick={() => { setFilters({ hideEmptyLanes: !filters.hideEmptyLanes }); if (soundEnabled) playCyberSound('toggle'); }}
                    className={`${VIEW_BTN} w-7 h-7 ${filters.hideEmptyLanes ? VIEW_BTN_ON : VIEW_BTN_OFF}`}
                    title={filters.hideEmptyLanes ? 'Show Empty Lanes' : 'Hide Empty Lanes'}
                    aria-label={filters.hideEmptyLanes ? 'Show Empty Lanes' : 'Hide Empty Lanes'}
                  >
                    {filters.hideEmptyLanes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Active filters: chips, only when something is applied */}
        {activeFilterPills.length > 0 && (
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
          </div>
        )}
      </div>

      {/* Collapsible Readiness & Spaced Repetition Panel */}
      {readinessOpen && (
        <div
          role="region"
          aria-label="Readiness summary"
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-subtle bg-surface-card p-3 text-xs shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 min-w-0">
            <span className="text-secondary flex items-center gap-1.5">
              <Target className="w-4 h-4 text-accent flex-shrink-0" />
              <span>Readiness: <strong className="font-mono tabular-nums text-primary">{readiness.score}%</strong></span>
              <span className="text-muted">({readiness.solved}/{readiness.attempted} solved)</span>
            </span>

            {readiness.weakestTags.length > 0 && (
              <span className="text-secondary hidden sm:inline">
                Weakest:{' '}
                <span className="text-primary font-mono">
                  {readiness.weakestTags.map((t) => `${t.tag} (${t.solved}/${t.attempted})`).join(', ')}
                </span>
              </span>
            )}

            {readiness.nextSuggested.length > 0 && (
              <span className="text-secondary min-w-0 truncate">
                Next:{' '}
                {readiness.nextSuggested.map((m, i) => (
                  <React.Fragment key={m.id}>
                    {i > 0 && ', '}
                    <button
                      type="button"
                      onClick={() => setSelectedMachineId(m.id)}
                      className="text-accent hover:underline cursor-pointer font-medium"
                    >
                      {m.name}
                    </button>
                  </React.Fragment>
                ))}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={toggleDueFilter}
              disabled={readiness.dueItems.length === 0 && !dueFilterOn}
              aria-pressed={dueFilterOn}
              className={`${TOOLBAR_BTN} h-7 px-2.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                dueFilterOn ? 'border-accent text-accent' : ''
              }`}
              title="Show only items due for review"
            >
              <span>Due for review</span>
              <span className="font-mono tabular-nums font-semibold">{readiness.dueItems.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setReadinessOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded text-tertiary hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
              title="Close readiness overview"
              aria-label="Close readiness overview"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Filter Drawer */}
      {filterDrawerSeen && (
        <React.Suspense fallback={null}>
          <FilterDrawer />
        </React.Suspense>
      )}

      <TrackChipRow
        tracks={PRACTICE_TRACKS}
        progress={trackProgress}
        activeTrackId={getActiveTrackIds(filters).length === 1 ? getActiveTrackIds(filters)[0] : null}
        selectedTrackIds={getActiveTrackIds(filters)}
        onSelect={(trackId) => {
          setFilters(trackId ? { selectedTrack: trackId, selectedTracks: [trackId] } : { selectedTrack: 'ALL', selectedTracks: [] });
          if (soundEnabled) playCyberSound('toggle');
        }}
        onOpenMachine={setSelectedMachineId}
        onOpenMulti={() => {
          setFilterDrawerOpen(true);
          if (soundEnabled) playCyberSound('click');
        }}
        hideCompleted={filters.selectedStatus === 'UNCOMPLETED'}
        onToggleHideCompleted={() => {
          setFilters({ selectedStatus: filters.selectedStatus === 'UNCOMPLETED' ? 'ALL' : 'UNCOMPLETED' });
          if (soundEnabled) playCyberSound('toggle');
        }}
      />

      {/* Main View Renderer */}
      {filteredMachines.length === 0 ? (
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
        <>
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
        </>
      )}
    </div>
  );
};

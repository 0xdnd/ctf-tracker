import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  RotateCcw, 
  Kanban, 
  Table, 
  LayoutGrid, 
  Globe,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Shield,
  Key,
  FolderGit2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Target,
  Trophy,
  Zap,
  ArrowUpDown,
  Eye,
  EyeOff,
  Ban,
  Filter,
  Share2
} from 'lucide-react';
import { useCtfStore, BoxVectorCategory, FilterState } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound, triggerRootCelebration } from '../../utils/helpers';
import { Platform, Difficulty, OperatingSystem } from '../../types';
import { KanbanBoard } from './KanbanBoard';
import { TableView } from './TableView';
import { GridView } from './GridView';
import { GraphView } from './GraphView';
import { PlatformBadge, PlatformIcon } from '../common/PlatformBadge';
import { OsIcon } from '../common/OsBadge';
import { CyberSelect, CyberMultiSelect, CyberSelectOption } from '../common/CyberSelect';
import { PRACTICE_TRACKS, PracticeTrack } from '../../data/tracksData';
import { 
  VULN_CATEGORIES, 
  VULN_DOMAINS, 
  VulnDomainId, 
  classifyMachine, 
  matchesCategory, 
  matchesDomain, 
  isActiveDirectory,
  getCategoryDef 
} from '../../utils/categoryUtils';

const SORT_OPTIONS: CyberSelectOption[] = [
  { value: 'default', label: 'Default Order' },
  { value: 'difficulty', label: 'Difficulty (Easy → Hard)' },
  { value: 'name', label: 'Target Name (A-Z)' },
  { value: 'ip', label: 'IP Address' },
  { value: 'recent', label: 'Recently Solved' },
];

const DIFFICULTY_FILTER_OPTIONS: CyberSelectOption<Difficulty | 'ALL'>[] = [
  { value: 'ALL', label: 'ALL Difficulties' },
  { value: 'Very Easy', label: 'Very Easy', color: '#10B981' },
  { value: 'Easy', label: 'Easy', color: '#22C55E' },
  { value: 'Medium', label: 'Medium', color: '#F59E0B' },
  { value: 'Hard', label: 'Hard', color: '#EF4444' },
  { value: 'Insane', label: 'Insane', color: '#A855F7' },
];

export const TrackerView: React.FC = () => {
  const {
    machines,
    filters,
    setFilters,
    resetFilters,
    viewMode,
    setViewMode,
    setReconAutomationModalOpen,
    soundEnabled,
    loadCatalog,
  } = useCtfStore(
    useShallow((s) => ({
      machines: s.machines,
      filters: s.filters,
      setFilters: s.setFilters,
      resetFilters: s.resetFilters,
      viewMode: s.viewMode,
      setViewMode: s.setViewMode,
      setReconAutomationModalOpen: s.setReconAutomationModalOpen,
      soundEnabled: s.soundEnabled,
      loadCatalog: s.loadCatalog,
    }))
  );

  const location = useLocation();

  // Lazy-load master machine catalog when TrackerView mounts
  React.useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // URL-synchronized filters for curated list sharing (#/tracker?search=...&platform=...)
  React.useEffect(() => {
    if (!location.search) return;
    const params = new URLSearchParams(location.search);
    const updates: Partial<FilterState> = {};

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
    if (os && ['Linux', 'Windows', 'Android', 'BSD', 'Other', 'ALL'].includes(os)) {
      updates.selectedOs = os as OperatingSystem | 'ALL';
    }

    const cert = params.get('cert');
    if (cert && ['OSCP', 'CPTS', 'CRTO', 'ALL'].includes(cert)) {
      updates.selectedCert = cert as 'OSCP' | 'CPTS' | 'CRTO' | 'ALL';
    }

    const track = params.get('track');
    if (track) {
      updates.selectedTrack = track;
    }

    if (Object.keys(updates).length > 0) {
      setFilters(updates);
    }
  }, [location.search, setFilters]);

  const [tracksCollapsed, setTracksCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('specter-tracks-collapsed');
      if (saved !== null) return saved === 'true';
      return typeof window !== 'undefined' && window.innerWidth < 1280;
    } catch {
      return false;
    }
  });

  const toggleTracksCollapsed = () => {
    setTracksCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('specter-tracks-collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const [selectedDomain, setSelectedDomain] = useState<VulnDomainId>('all');

  // Synchronize domain tab when a specific category is selected
  React.useEffect(() => {
    if (filters.selectedVulnCategory && filters.selectedVulnCategory !== 'ALL') {
      const def = getCategoryDef(filters.selectedVulnCategory);
      if (def) {
        setSelectedDomain(def.domain);
      }
    }
  }, [filters.selectedVulnCategory]);

  // Extract all unique tags across machines
  const allTags = useMemo(() => {
    const set = new Set<string>();
    machines.forEach((m) => {
      m.tags.forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [machines]);

  // Track statistics (pwned count & total for each track)
  const trackStats = useMemo(() => {
    const stats: Record<string, { total: number; rooted: number; percent: number }> = {};
    
    PRACTICE_TRACKS.forEach((track) => {
      const matching = machines.filter(track.filterFn);
      const total = matching.length;
      const rooted = matching.filter(m => m.status === 'root' || m.status === 'completed').length;
      const percent = total > 0 ? Math.round((rooted / total) * 100) : 0;
      stats[track.id] = { total, rooted, percent };
    });

    return stats;
  }, [machines]);

  // Memoized live category and domain counts across all catalog targets
  const { categoryCounts, domainCounts } = useMemo(() => {
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

  // Filter and sort machines based on active filter state
  const filteredMachines = useMemo(() => {
    const q = deferredFilters.searchQuery ? deferredFilters.searchQuery.trim().toLowerCase() : '';
    const platformFilter = deferredFilters.selectedPlatform;
    const diffFilter = deferredFilters.selectedDifficulty;
    const osFilter = deferredFilters.selectedOs;
    const trackFilter = deferredFilters.selectedTrack;
    const catFilter = deferredFilters.selectedCategory;
    const vulnCatFilter = deferredFilters.selectedVulnCategory;
    const excludeAD = Boolean(deferredFilters.excludeActiveDirectory);
    const certFilter = deferredFilters.selectedCert;
    const hasTags = deferredFilters.selectedTags.length > 0;
    const selectedTrack = (trackFilter && trackFilter !== 'ALL') ? PRACTICE_TRACKS.find(t => t.id === trackFilter) : null;

    const list = machines.filter((m) => {
      // 1. Fast primitive checks first (0 allocations, rejects immediately)
      if (platformFilter !== 'ALL' && m.platform !== platformFilter) return false;
      if (diffFilter !== 'ALL' && m.difficulty !== diffFilter) return false;
      if (osFilter && osFilter !== 'ALL' && m.os !== osFilter) return false;
      if (certFilter !== 'ALL' && !m.certifications.includes(certFilter)) return false;

      // 2. Active Directory Exclusion Check
      if (excludeAD && isActiveDirectory(m)) return false;

      // 3. Vulnerability Domain filter (active when domain selected without specific category override)
      if (selectedDomain !== 'all' && (!vulnCatFilter || vulnCatFilter === 'ALL')) {
        if (!matchesDomain(m, selectedDomain)) return false;
      }

      // 4. Vulnerability Category filter
      if (vulnCatFilter && vulnCatFilter !== 'ALL') {
        if (!matchesCategory(m, vulnCatFilter)) return false;
      }

      // 4. Curated Track filter
      if (selectedTrack && !selectedTrack.filterFn(m)) return false;

      // 5. Search query (only evaluated on candidates that passed platform/diff)
      if (q) {
        const matchName = m.name.toLowerCase().includes(q);
        const matchIp = m.ip.includes(q);
        const matchOs = m.os.toLowerCase().includes(q);
        const matchTag = m.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchIp && !matchOs && !matchTag) return false;
      }

      // 6. Legacy Exploit Vector filter compatibility
      if (catFilter && catFilter !== 'ALL') {
        const legacyTarget = catFilter === 'Binary / Pwn' ? 'Binary / BOF' : catFilter;
        if (!matchesCategory(m, legacyTarget)) return false;
      }

      // 7. Selected Tags
      if (hasTags) {
        const hasAllTags = deferredFilters.selectedTags.every((t) => m.tags.includes(t));
        if (!hasAllTags) return false;
      }

      return true;
    });

    // Apply Sorting
    if (deferredFilters.sortBy && deferredFilters.sortBy !== 'default') {
      const difficultyWeights: Record<string, number> = {
        'Very Easy': 1,
        'Easy': 2,
        'Medium': 3,
        'Hard': 4,
        'Insane': 5,
      };

      list.sort((a, b) => {
        let cmp = 0;
        if (deferredFilters.sortBy === 'difficulty') {
          const wa = difficultyWeights[a.difficulty] || 0;
          const wb = difficultyWeights[b.difficulty] || 0;
          cmp = wa - wb;
        } else if (deferredFilters.sortBy === 'name') {
          cmp = a.name.localeCompare(b.name);
        } else if (deferredFilters.sortBy === 'ip') {
          cmp = a.ip.localeCompare(b.ip, undefined, { numeric: true });
        } else if (deferredFilters.sortBy === 'recent') {
          const dateA = a.rootPwnedAt || a.userPwnedAt || a.updatedAt || a.createdAt || '';
          const dateB = b.rootPwnedAt || b.userPwnedAt || b.updatedAt || b.createdAt || '';
          cmp = dateB.localeCompare(dateA);
        }

        return deferredFilters.sortDirection === 'desc' ? -cmp : cmp;
      });
    }

    return list;
  }, [machines, deferredFilters]);

  const platformList: (Platform | 'ALL')[] = ['ALL', 'HTB', 'THM', 'Custom'];
  const difficultyList: (Difficulty | 'ALL')[] = ['ALL', 'Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'];
  const osList: ('ALL' | OperatingSystem)[] = ['ALL', 'Linux', 'Windows'];
  const vectorCategoryList: BoxVectorCategory[] = [
    'ALL', 
    'Web', 
    'Linux PrivEsc', 
    'Windows PrivEsc', 
    'Active Directory', 
    'Network / SMB', 
    'Binary / Pwn'
  ];

  const vulnCategoryOptions: CyberSelectOption[] = useMemo(() => {
    const allOption: CyberSelectOption = {
      value: 'ALL',
      label: `All Attack Categories (${machines.length})`,
    };
    const sorted = [...VULN_CATEGORIES].sort((a, b) => {
      const countA = categoryCounts[a.id] || 0;
      const countB = categoryCounts[b.id] || 0;
      return countB - countA;
    });
    const options: CyberSelectOption[] = sorted.map((cat) => ({
      value: cat.id,
      label: `${cat.label} (${categoryCounts[cat.id] || 0})`,
    }));
    return [allOption, ...options];
  }, [machines.length, categoryCounts]);

  const displayedCategories = useMemo(() => {
    if (selectedDomain === 'all') {
      return [...VULN_CATEGORIES]
        .sort((a, b) => (categoryCounts[b.id] || 0) - (categoryCounts[a.id] || 0))
        .slice(0, 10);
    }
    return VULN_CATEGORIES.filter((c) => c.domain === selectedDomain);
  }, [selectedDomain, categoryCounts]);

  const isFiltered =
    Boolean(filters.searchQuery) ||
    filters.selectedPlatform !== 'ALL' ||
    filters.selectedDifficulty !== 'ALL' ||
    (filters.selectedOs && filters.selectedOs !== 'ALL') ||
    (filters.selectedCategory && filters.selectedCategory !== 'ALL') ||
    (filters.selectedVulnCategory && filters.selectedVulnCategory !== 'ALL') ||
    selectedDomain !== 'all' ||
    Boolean(filters.excludeActiveDirectory) ||
    (filters.selectedTrack && filters.selectedTrack !== 'ALL') ||
    filters.selectedCert !== 'ALL' ||
    filters.selectedTags.length > 0;

  return (
    <div className="space-y-4 w-full">
      {/* 1. Curated Practice Tracks Carousel / Pathways */}
      <div className="p-2.5 sm:p-3 rounded-xl border border-cyber-border bg-cyber-card/90 shadow-md font-mono space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-cyber-cyan flex-shrink-0" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              CURATED TACTICAL PATHWAYS & TRACKS
            </span>
          </div>
          <div className="flex items-center gap-2">
            {filters.selectedTrack !== 'ALL' && (
              <button
                onClick={() => setFilters({ selectedTrack: 'ALL' })}
                className="text-[10px] text-cyber-cyan hover:underline flex items-center gap-1"
              >
                <span>Clear Track</span>
                <span>✕</span>
              </button>
            )}
            <button
              onClick={toggleTracksCollapsed}
              className="p-1 px-2 rounded-md bg-cyber-bg hover:bg-cyber-card border border-cyber-border text-cyber-muted hover:text-white transition-all flex items-center gap-1 text-[10px]"
              title={tracksCollapsed ? 'Expand Pathways' : 'Collapse Pathways to save vertical space'}
            >
              {tracksCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              <span>{tracksCollapsed ? 'Expand' : 'Collapse'}</span>
            </button>
          </div>
        </div>

        {/* Tracks Horizontal Scroll or Compact View */}
        {!tracksCollapsed ? (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {PRACTICE_TRACKS.map((track) => {
              const isSelected = filters.selectedTrack === track.id;
              const stats = trackStats[track.id] || { total: 0, rooted: 0, percent: 0 };

              return (
                <motion.button
                  key={track.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() =>
                    setFilters({
                      selectedTrack: isSelected ? 'ALL' : track.id,
                    })
                  }
                  className={`p-2.5 rounded-lg border text-left flex-shrink-0 min-w-[210px] transition-all relative group overflow-hidden ${
                    isSelected
                      ? 'border-cyber-cyan bg-cyber-card shadow-glow-cyan/20 ring-1 ring-cyber-cyan/40'
                      : 'border-cyber-border bg-cyber-bg hover:border-cyber-borderGlow'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-cyber-cyan' : 'text-slate-900 dark:text-white'}`}>
                      {track.shortName}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-cyber-card border border-cyber-border text-cyber-muted">
                      {stats.rooted}/{stats.total}
                    </span>
                  </div>

                  {/* Progress Mini Bar */}
                  <div className="w-full bg-cyber-card h-1.5 rounded-full overflow-hidden border border-cyber-border/80">
                    <motion.div
                      className="h-full bg-gradient-to-r from-cyber-emerald to-cyber-cyan"
                      initial={{ width: 0 }}
                      animate={{ width: `${stats.percent}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-cyber-muted mt-1.5">
                    <span className="truncate max-w-[130px]">{track.category.toUpperCase()}</span>
                    <span className="font-mono text-cyber-emerald font-bold">{stats.percent}% PWN</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 text-xs">
            {PRACTICE_TRACKS.map((track) => {
              const isSelected = filters.selectedTrack === track.id;
              const stats = trackStats[track.id] || { total: 0, rooted: 0, percent: 0 };
              return (
                <button
                  key={track.id}
                  onClick={() => setFilters({ selectedTrack: isSelected ? 'ALL' : track.id })}
                  className={`px-2.5 py-1 rounded-lg border text-left flex-shrink-0 transition-all flex items-center gap-2 text-[11px] ${
                    isSelected
                      ? 'border-cyber-cyan bg-cyber-bg text-cyber-cyan font-bold shadow-sm'
                      : 'border-cyber-border/70 bg-cyber-bg/60 text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-cyber-border'
                  }`}
                >
                  <span>{track.shortName}</span>
                  <span className="text-[10px] text-cyber-emerald font-bold font-mono">
                    {stats.rooted}/{stats.total}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Primary Filter, Search, and View Controls */}
      <div className="p-3.5 rounded-xl border border-cyber-border bg-cyber-card/90 shadow-md font-mono space-y-3">
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-cyber-muted" />
            <input
              type="text"
              id="tracker-search-input"
              name="tracker-search-input"
              aria-label="Search targets by name, IP, OS, or CVE"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ searchQuery: e.target.value })}
              placeholder="Search by target name, IP (10.10.x), OS, exploit vector, or CVE..."
              className="w-full pl-9 pr-4 py-2 bg-cyber-bg border border-cyber-border rounded-lg text-xs text-slate-900 dark:text-white placeholder-cyber-muted focus:outline-none focus:border-cyber-emerald"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters({ searchQuery: '' })}
                className="absolute right-3 top-2.5 text-xs text-cyber-muted hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Attractive Platform Selector with Genuine Glowing Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {platformList.map((p) => {
              const active = filters.selectedPlatform === p;
              return (
                <motion.button
                  key={p}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilters({ selectedPlatform: p })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                    active
                      ? p === 'HTB'
                        ? 'bg-emerald-100 dark:bg-cyber-emerald/20 border-emerald-400 dark:border-cyber-emerald text-emerald-900 dark:text-cyber-emerald shadow-glow-emerald/30 font-bold'
                        : p === 'THM'
                        ? 'bg-red-100 dark:bg-cyber-crimson/20 border-red-400 dark:border-cyber-crimson text-red-900 dark:text-cyber-crimson shadow-glow-crimson/30 font-bold'
                        : 'bg-cyan-100 dark:bg-cyber-cyan/20 border-cyan-400 dark:border-cyber-cyan text-cyan-900 dark:text-cyber-cyan shadow-glow-cyan/30 font-bold'
                      : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-cyber-borderGlow'
                  }`}
                >
                  {p !== 'ALL' && <PlatformIcon platform={p as Platform} className="w-3.5 h-3.5" />}
                  <span>{p === 'ALL' ? 'All Platforms' : p}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Sorting Controls */}
          <div className="flex items-center gap-1.5 bg-cyber-bg px-2.5 py-1 rounded-lg border border-cyber-border text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-cyber-cyan flex-shrink-0" />
            <span className="text-[10px] uppercase font-bold text-cyber-muted">Sort:</span>
            <CyberSelect
              id="tracker-sort-select"
              name="tracker-sort-select"
              aria-label="Sort targets"
              value={filters.sortBy || 'default'}
              onChange={(val) => setFilters({ sortBy: val as any })}
              options={SORT_OPTIONS}
              variant="transparent"
              size="xs"
              triggerClassName="py-0 px-1 border-none bg-transparent hover:bg-transparent"
              soundEnabled={soundEnabled}
            />
            {filters.sortBy && filters.sortBy !== 'default' && (
              <button
                onClick={() => setFilters({ sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc' })}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyber-card hover:bg-cyber-card/80 text-cyber-cyan border border-cyber-cyan/30"
                title={`Sort ${filters.sortDirection === 'asc' ? 'Ascending' : 'Descending'} (Click to toggle)`}
              >
                {filters.sortDirection === 'asc' ? 'ASC ↑' : 'DESC ↓'}
              </button>
            )}
          </div>

          {/* Kanban Hide Empty Lanes Toggle */}
          {viewMode === 'kanban' && (
            <button
              onClick={() => setFilters({ hideEmptyLanes: !filters.hideEmptyLanes })}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all whitespace-nowrap ${
                filters.hideEmptyLanes
                  ? 'bg-amber-100 dark:bg-cyber-amber/15 text-amber-900 dark:text-cyber-amber border-amber-400 dark:border-cyber-amber/50 shadow-glow-amber/20'
                  : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Toggle collapsing empty Kanban columns"
            >
              {filters.hideEmptyLanes ? <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-cyber-amber" /> : <Eye className="w-3.5 h-3.5 text-cyber-muted" />}
              <span>{filters.hideEmptyLanes ? 'Empty Lanes Hidden' : 'Hide Empty Lanes'}</span>
            </button>
          )}

          {/* Tactical Recon Automation Launcher */}
          <button
            onClick={() => setReconAutomationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-100 dark:bg-cyber-cyan/10 text-cyan-900 dark:text-cyber-cyan border border-cyan-400 dark:border-cyber-cyan/40 hover:bg-cyan-500 hover:text-black font-semibold text-xs transition-all shadow-glow-cyan/20 whitespace-nowrap"
            title="Launch Tactical Scan Importer & Payload Crafter"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Scan & Payloads</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1 bg-cyber-bg p-1 rounded-lg border border-cyber-border">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'kanban'
                  ? 'bg-cyber-card text-emerald-700 dark:text-cyber-emerald border border-emerald-400 dark:border-cyber-emerald/40'
                  : 'text-cyber-muted hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Kanban Board View"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'table'
                  ? 'bg-cyber-card text-emerald-700 dark:text-cyber-emerald border border-emerald-400 dark:border-cyber-emerald/40'
                  : 'text-cyber-muted hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Data Table View"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'grid'
                  ? 'bg-cyber-card text-emerald-700 dark:text-cyber-emerald border border-emerald-400 dark:border-cyber-emerald/40'
                  : 'text-cyber-muted hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('graph')}
              className={`p-1.5 rounded transition-all ${
                viewMode === 'graph'
                  ? 'bg-cyber-card text-emerald-700 dark:text-cyber-emerald border border-emerald-400 dark:border-cyber-emerald/40'
                  : 'text-cyber-muted hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Attack Topology Network Graph"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3. Quick OS & Box Archetype Vector Filter Bars */}
        <div className="pt-2.5 border-t border-cyber-border/70 space-y-2.5">
          {/* OS Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-cyber-muted text-[10px] uppercase font-bold tracking-wider">TARGET OS:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {osList.map((os) => {
                const isActive = (filters.selectedOs || 'ALL') === os;
                return (
                  <button
                    key={os}
                    onClick={() => setFilters({ selectedOs: os })}
                    className={`px-2.5 py-1 rounded text-[11px] border font-semibold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-cyber-card text-slate-900 dark:text-white border-cyber-emerald shadow-glow-emerald/20 font-bold'
                        : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-cyber-borderGlow'
                    }`}
                  >
                    {os === 'ALL' ? (
                      <Globe className="w-3.5 h-3.5 text-cyber-cyan" />
                    ) : (
                      <OsIcon os={os} className="w-3.5 h-3.5" />
                    )}
                    <span>{os === 'ALL' ? 'All OS' : os}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tactical 1-Click Presets Strip: ONLY WEB | ONLY AD | NO ACTIVE DIRECTORY (EXCLUSION) */}
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-cyber-border/40">
            <span className="text-cyber-muted text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
              <span>TACTICAL PRESETS:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Preset: ONLY WEB */}
              <button
                type="button"
                onClick={() => {
                  const isOnlyWeb = filters.selectedVulnCategory === 'Web' && !filters.excludeActiveDirectory;
                  if (isOnlyWeb) {
                    setFilters({ selectedVulnCategory: 'ALL', selectedCategory: 'ALL' });
                  } else {
                    setFilters({ selectedVulnCategory: 'Web', selectedCategory: 'ALL', excludeActiveDirectory: false });
                  }
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`px-2.5 py-1 rounded text-[11px] border font-mono font-bold transition-all flex items-center gap-1.5 ${
                  filters.selectedVulnCategory === 'Web' && !filters.excludeActiveDirectory
                    ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-300 border-cyan-400 shadow-glow-cyan/20 ring-1 ring-cyan-500/40 font-extrabold'
                    : 'bg-cyber-bg border-cyan-500/30 text-cyan-800 dark:text-cyan-400/80 hover:text-cyan-950 dark:hover:text-cyan-300 hover:border-cyan-400'
                }`}
                title="Filter only Web application targets (SQLi, XSS, SSRF, LFI, RCE, etc.)"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-500" />
                <span>🌐 ONLY WEB</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-200/70 text-cyan-950 dark:bg-cyan-500/20 dark:text-cyan-300 ml-0.5">
                  {categoryCounts['Web'] || 0}
                </span>
              </button>

              {/* Preset: ONLY ACTIVE DIRECTORY */}
              <button
                type="button"
                onClick={() => {
                  const isOnlyAd = filters.selectedVulnCategory === 'Active Directory' && !filters.excludeActiveDirectory;
                  if (isOnlyAd) {
                    setFilters({ selectedVulnCategory: 'ALL', selectedCategory: 'ALL' });
                  } else {
                    setFilters({ selectedVulnCategory: 'Active Directory', selectedCategory: 'ALL', excludeActiveDirectory: false });
                  }
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`px-2.5 py-1 rounded text-[11px] border font-mono font-bold transition-all flex items-center gap-1.5 ${
                  filters.selectedVulnCategory === 'Active Directory' && !filters.excludeActiveDirectory
                    ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-900 dark:text-purple-300 border-purple-400 shadow-glow-purple/20 ring-1 ring-purple-500/40 font-extrabold'
                    : 'bg-cyber-bg border-purple-500/30 text-purple-800 dark:text-purple-400/80 hover:text-purple-950 dark:hover:text-purple-300 hover:border-purple-400'
                }`}
                title="Filter only Active Directory domain environments (Kerberos, DCSync, BloodHound, etc.)"
              >
                <Cpu className="w-3.5 h-3.5 text-purple-500" />
                <span>🛡️ ONLY AD</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-200/70 text-purple-950 dark:bg-purple-500/20 dark:text-purple-300 ml-0.5">
                  {categoryCounts['AD_TOTAL'] || 0}
                </span>
              </button>

              {/* Preset: TJ NULL (OSCP 2024) */}
              <button
                type="button"
                onClick={() => {
                  const isTjNull = filters.selectedTrack === 'tjnull-oscp';
                  if (isTjNull) {
                    setFilters({ selectedTrack: 'ALL' });
                  } else {
                    setFilters({ selectedTrack: 'tjnull-oscp', selectedVulnCategory: 'ALL', selectedCategory: 'ALL', excludeActiveDirectory: false });
                  }
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`px-2.5 py-1 rounded text-[11px] border font-mono font-bold transition-all flex items-center gap-1.5 ${
                  filters.selectedTrack === 'tjnull-oscp'
                    ? 'bg-emerald-100 dark:bg-emerald-500/25 text-emerald-900 dark:text-emerald-300 border-emerald-400 shadow-glow-emerald/30 ring-1 ring-emerald-500/50 font-extrabold'
                    : 'bg-cyber-bg border-emerald-500/30 text-emerald-800 dark:text-emerald-400/80 hover:text-emerald-950 dark:hover:text-emerald-300 hover:border-emerald-400'
                }`}
                title="Filter machines on TJ_Null's legendary OSCP 2024 syllabus"
              >
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                <span>🎯 TJ NULL (OSCP)</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-200/70 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-300 ml-0.5">
                  {trackStats['tjnull-oscp']?.total || 0}
                </span>
              </button>

              {/* Preset: CPTS TROPHY ROOM */}
              <button
                type="button"
                onClick={() => {
                  const isCpts = filters.selectedTrack === 'cpts-path';
                  if (isCpts) {
                    setFilters({ selectedTrack: 'ALL' });
                  } else {
                    setFilters({ selectedTrack: 'cpts-path', selectedVulnCategory: 'ALL', selectedCategory: 'ALL', excludeActiveDirectory: false });
                  }
                  if (soundEnabled) playCyberSound('click');
                }}
                className={`px-2.5 py-1 rounded text-[11px] border font-mono font-bold transition-all flex items-center gap-1.5 ${
                  filters.selectedTrack === 'cpts-path'
                    ? 'bg-cyan-100 dark:bg-cyan-500/25 text-cyan-900 dark:text-cyan-300 border-cyan-400 shadow-glow-cyan/30 ring-1 ring-cyan-500/50 font-extrabold'
                    : 'bg-cyber-bg border-cyan-500/30 text-cyan-800 dark:text-cyan-400/80 hover:text-cyan-950 dark:hover:text-cyan-300 hover:border-cyan-400'
                }`}
                title="Filter machines on Penetration Testing Track Trophy Room"
              >
                <Trophy className="w-3.5 h-3.5 text-cyan-500" />
                <span>🏆 PEN-TEST PATH</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-200/70 text-cyan-950 dark:bg-cyan-500/20 dark:text-cyan-300 ml-0.5">
                  {trackStats['cpts-path']?.total || 0}
                </span>
              </button>

              {/* Exclusion Toggle: NO ACTIVE DIRECTORY (EXCLUDE AD) */}
              <button
                type="button"
                onClick={() => {
                  const nextExclude = !filters.excludeActiveDirectory;
                  const updates: Partial<FilterState> = { excludeActiveDirectory: nextExclude };
                  if (nextExclude && (filters.selectedVulnCategory === 'Active Directory' || filters.selectedCategory === 'Active Directory')) {
                    updates.selectedVulnCategory = 'ALL';
                    updates.selectedCategory = 'ALL';
                  }
                  setFilters(updates);
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className={`px-2.5 py-1 rounded text-[11px] border font-mono font-bold transition-all flex items-center gap-1.5 ${
                  filters.excludeActiveDirectory
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-300 border-rose-500 shadow-glow-crimson/20 ring-1 ring-rose-500/50 font-extrabold'
                    : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-rose-700 dark:hover:text-rose-400 hover:border-rose-500/40'
                }`}
                title="Exclude all 55 Active Directory machines from results (show pure standalone Linux/Windows/Web boxes)"
              >
                <Ban className={`w-3.5 h-3.5 ${filters.excludeActiveDirectory ? 'text-rose-500' : 'text-cyber-muted'}`} />
                <span>{filters.excludeActiveDirectory ? '🚫 EXCLUDING DOMAIN LABS' : '🚫 EXCLUDE DOMAIN LABS'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-200/70 text-rose-950 dark:bg-rose-500/20 dark:text-rose-300 ml-0.5">
                  {filters.excludeActiveDirectory ? `${categoryCounts['NON_AD_TOTAL'] || 0} left` : `-${categoryCounts['AD_TOTAL'] || 0}`}
                </span>
              </button>
            </div>
          </div>

          {/* Vulnerability Archetype Category Filter Section */}
          <div className="pt-2 border-t border-cyber-border/40 space-y-2">
            {/* Domain Tabs + Searchable Specific Category Selector */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
              {/* Tactical Domain Selector Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
                <span className="text-cyber-muted text-[10px] uppercase font-bold tracking-wider mr-1 whitespace-nowrap flex items-center gap-1">
                  <Filter className="w-3 h-3 text-cyber-cyan" />
                  <span>DOMAIN:</span>
                </span>
                {VULN_DOMAINS.map((dom) => {
                  const isActiveDomain = selectedDomain === dom.id;
                  const count = domainCounts[dom.id] || 0;
                  return (
                    <button
                      key={dom.id}
                      type="button"
                      onClick={() => {
                        if (isActiveDomain && dom.id !== 'all') {
                          setSelectedDomain('all');
                        } else {
                          setSelectedDomain(dom.id);
                          if (filters.selectedVulnCategory && filters.selectedVulnCategory !== 'ALL') {
                            const def = getCategoryDef(filters.selectedVulnCategory);
                            if (def && def.domain !== dom.id && dom.id !== 'all') {
                              setFilters({ selectedVulnCategory: 'ALL', selectedCategory: 'ALL' });
                            }
                          }
                        }
                        if (soundEnabled) playCyberSound('click');
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border ${
                        isActiveDomain
                          ? 'bg-cyber-card text-slate-900 dark:text-white border-cyber-cyan shadow-glow-cyan/20 ring-1 ring-cyber-cyan/40'
                          : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-cyber-borderGlow'
                      }`}
                    >
                      <span>{dom.shortLabel}</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded ${isActiveDomain ? 'bg-cyan-200 text-cyan-950 dark:bg-cyber-cyan/20 dark:text-cyber-cyan font-bold' : 'bg-cyber-card text-cyber-muted'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Searchable Specific Category Combobox */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-cyber-muted text-[10px] uppercase font-bold tracking-wider hidden sm:inline">VULN CATEGORY:</span>
                <div className="w-full sm:w-64">
                  <CyberSelect
                    id="tracker-vuln-category-select"
                    name="tracker-vuln-category"
                    aria-label="Filter specific vulnerability category"
                    value={filters.selectedVulnCategory || 'ALL'}
                    onChange={(val) => {
                      const catId = val as string;
                      if (catId === 'ALL') {
                        setFilters({ selectedVulnCategory: 'ALL', selectedCategory: 'ALL' });
                      } else {
                        const def = getCategoryDef(catId);
                        if (def) setSelectedDomain(def.domain);
                        setFilters({ selectedVulnCategory: catId, selectedCategory: 'ALL' });
                      }
                    }}
                    options={vulnCategoryOptions}
                    variant="cyan"
                    size="xs"
                    soundEnabled={soundEnabled}
                  />
                </div>
              </div>
            </div>

            {/* Category Pills Strip (Tailored to active Domain) */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {/* Active Category Indicator Chip (if set) */}
              {filters.selectedVulnCategory && filters.selectedVulnCategory !== 'ALL' && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-cyan-100 dark:bg-cyber-cyan/20 border border-cyan-400 dark:border-cyber-cyan text-cyan-950 dark:text-cyber-cyan font-mono text-[11px] font-bold shadow-glow-cyan/20 mr-1">
                  <span>ACTIVE: {filters.selectedVulnCategory}</span>
                  <button
                    type="button"
                    onClick={() => setFilters({ selectedVulnCategory: 'ALL', selectedCategory: 'ALL' })}
                    className="hover:text-red-500 font-extrabold text-xs ml-0.5"
                    title="Clear specific category filter"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* All in current domain option (if not on 'all') */}
              {selectedDomain !== 'all' && (
                <button
                  type="button"
                  onClick={() => setFilters({ selectedVulnCategory: 'ALL', selectedCategory: 'ALL' })}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all flex items-center gap-1 font-semibold ${
                    !filters.selectedVulnCategory || filters.selectedVulnCategory === 'ALL'
                      ? 'bg-cyber-card text-slate-900 dark:text-white border-cyber-cyan shadow-glow-cyan/20 font-bold'
                      : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-cyber-borderGlow'
                  }`}
                >
                  <span>All in Domain</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyber-bg border border-cyber-border text-cyber-muted">
                    {domainCounts[selectedDomain]}
                  </span>
                </button>
              )}

              {/* Visible Category Pills */}
              {displayedCategories.map((cat) => {
                const isActive = (filters.selectedVulnCategory === cat.id) || (filters.selectedCategory === cat.id);
                const count = categoryCounts[cat.id] || 0;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      if (isActive) {
                        setFilters({ selectedVulnCategory: 'ALL', selectedCategory: 'ALL' });
                      } else {
                        const updates: Partial<FilterState> = {
                          selectedVulnCategory: cat.id,
                          selectedCategory: 'ALL',
                        };
                        if (cat.id === 'Active Directory' && filters.excludeActiveDirectory) {
                          updates.excludeActiveDirectory = false;
                        }
                        setFilters(updates);
                        setSelectedDomain(cat.domain);
                      }
                      if (soundEnabled) playCyberSound('click');
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] border font-mono transition-all flex items-center gap-1 ${
                      isActive
                        ? `${cat.badgeColor} ${cat.borderColor} shadow-sm font-bold ring-1`
                        : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-cyber-borderGlow'
                    }`}
                    title={`Filter by ${cat.label}`}
                  >
                    <span>{cat.shortLabel}</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded ${isActive ? 'bg-black/30 text-white' : 'bg-cyber-card text-cyber-muted'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. Secondary Filters Bar (Difficulty, Cert, Attack Tag, Reset) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-cyber-border/70 text-xs">
          
          <div className="flex flex-wrap items-center gap-3">
            {/* Difficulty Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-cyber-muted text-[10px] uppercase font-bold">Difficulty:</span>
              <CyberSelect<Difficulty | 'ALL'>
                id="tracker-difficulty-select"
                name="tracker-difficulty-select"
                aria-label="Filter difficulty"
                value={filters.selectedDifficulty}
                onChange={(val) => setFilters({ selectedDifficulty: val })}
                options={DIFFICULTY_FILTER_OPTIONS}
                size="xs"
                variant="default"
                soundEnabled={soundEnabled}
              />
            </div>

            {/* Attack Tag Select */}
            <div className="flex items-center gap-1.5">
              <span className="text-cyber-muted text-[10px] uppercase font-bold">Attack Tag:</span>
              <CyberMultiSelect
                id="tracker-attack-tag-select"
                name="tracker-attack-tag-select"
                aria-label="Filter attack tag"
                selectedValues={filters.selectedTags}
                onChange={(tags) => setFilters({ selectedTags: tags })}
                options={allTags.map((t) => ({ value: t, label: t }))}
                placeholder="Filter by vector tag..."
                searchPlaceholder="Search vector tags..."
                size="xs"
                variant="cyan"
                soundEnabled={soundEnabled}
              />
            </div>

            {/* Selected Tag Pills */}
            {filters.selectedTags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyber-bg border border-cyber-cyan/40 text-cyber-cyan text-[11px]"
              >
                <span>{t}</span>
                <button
                  onClick={() =>
                    setFilters({
                      selectedTags: filters.selectedTags.filter((x) => x !== t),
                    })
                  }
                  className="hover:text-cyber-crimson"
                >
                  ✕
                </button>
              </span>
            ))}
            {/* Active Category & Exclusion Filter Chips */}
            {((filters.selectedVulnCategory && filters.selectedVulnCategory !== 'ALL') || (filters.selectedCategory && filters.selectedCategory !== 'ALL')) && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyber-cyan/10 border border-cyber-cyan/40 text-cyber-cyan text-[11px] font-mono">
                <span>Category: <strong>{filters.selectedVulnCategory && filters.selectedVulnCategory !== 'ALL' ? filters.selectedVulnCategory : filters.selectedCategory}</strong></span>
                <button
                  type="button"
                  onClick={() => setFilters({ selectedVulnCategory: 'ALL', selectedCategory: 'ALL' })}
                  className="hover:text-cyber-crimson ml-0.5 font-bold"
                  title="Clear category filter"
                >
                  ✕
                </button>
              </span>
            )}

            {filters.excludeActiveDirectory && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/40 border border-rose-500/50 text-rose-300 text-[11px] font-mono font-bold">
                <span>🚫 Excluded: Active Directory</span>
                <button
                  type="button"
                  onClick={() => setFilters({ excludeActiveDirectory: false })}
                  className="hover:text-cyber-crimson ml-0.5 font-bold"
                  title="Remove AD exclusion"
                >
                  ✕
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-cyber-muted text-xs">
              Showing <strong className="text-slate-900 dark:text-white">{filteredMachines.length}</strong> / {machines.length} targets
            </span>

            {isFiltered && (
              <button
                onClick={() => {
                  resetFilters();
                  setSelectedDomain('all');
                }}
                className="flex items-center gap-1 text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:underline text-xs"
              >
                <RotateCcw className="w-3 h-3" /> Reset All Filters
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Main View Renderer */}
      {viewMode === 'kanban' && <KanbanBoard filteredMachines={filteredMachines} />}
      {viewMode === 'table' && <TableView filteredMachines={filteredMachines} />}
      {viewMode === 'grid' && <GridView filteredMachines={filteredMachines} />}
      {viewMode === 'graph' && <GraphView filteredMachines={filteredMachines} />}
    </div>
  );
};

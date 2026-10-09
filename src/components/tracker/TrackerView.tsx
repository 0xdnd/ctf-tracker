import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, 
  RotateCcw, 
  Kanban, 
  Table, 
  LayoutGrid, 
  Globe,
  Terminal,
  Sparkles,
  Target,
  Trophy,
  Zap,
  ArrowUpDown,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Share2,
  X,
  GraduationCap,
  Crosshair,
  Tv,
  Network,
  Flame,
  ShieldAlert
} from 'lucide-react';
import { useCtfStore, FilterState, HtbTargetStatus } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound } from '../../utils/helpers';
import { Platform, Difficulty, OperatingSystem } from '../../types';
import { KanbanBoard } from './KanbanBoard';
import { TableView } from './TableView';
import { GridView } from './GridView';
const GraphView = React.lazy(() => import('./GraphView').then((m) => ({ default: m.GraphView })));
import { FilterDrawer } from '../layout/FilterDrawer';
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';
import { CanvasSkeleton } from '../common/Skeleton';
import { PRACTICE_TRACKS, PracticeTrack } from '../../data/tracksData';
import { 
  VULN_CATEGORIES, 
  VulnDomainId, 
  classifyMachine, 
  matchesCategory, 
  matchesDomain, 
  isActiveDirectory, 
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

interface PrimaryTrackPill {
  id: string;
  label: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

const PRIMARY_TRACK_PILLS: PrimaryTrackPill[] = [
  { id: 'ALL', label: 'All targets', title: 'All Target Machines', icon: Target, iconColor: 'text-accent' },
  { id: 'tjnull-oscp', label: 'OSCP', title: "TJ_Null's OSCP NetSec Preparation", icon: GraduationCap, iconColor: 'text-callout-warn-fg' },
  { id: 'cpts-path', label: 'CPTS', title: 'Certified Penetration Testing Specialist', icon: Crosshair, iconColor: 'text-callout-success-fg' },
  { id: 'ippsec-vault', label: 'IppSec', title: 'IppSec Video Walkthroughs', icon: Tv, iconColor: 'text-callout-info-fg' },
  { id: 'crto-ad', label: 'Active Directory', title: 'Enterprise AD & Red Team Warfare', icon: Network, iconColor: 'text-callout-tip-fg' },
  { id: 'popular-classics', label: 'Hall of fame', title: 'Community Classics & Popular Boxes', icon: Trophy, iconColor: 'text-callout-warn-fg' },
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
    }))
  );

  const location = useLocation();

  // The catalog swap (a few hundred -> ~930 machines) re-derives every list below. Rendering from a deferred
  // copy lets React keep the UI responsive and interrupt that re-render. (startTransition around a zustand
  // set() would not, since the store is read through useSyncExternalStore.)
  const machines = React.useDeferredValue(liveMachines);

  const sessionSeed = React.useMemo(() => Math.floor(Math.random() * 1000000), []);

  // Memoized machine counts per track for badge telemetry
  const trackCounts = React.useMemo(() => {
    const counts: Record<string, number> = { ALL: machines.length };
    PRACTICE_TRACKS.forEach((t) => {
      counts[t.id] = machines.filter(t.filterFn).length;
    });
    return counts;
  }, [machines]);

  const dynamicOtherTrackOptions = React.useMemo<CyberSelectOption<string>[]>(() => [
    { value: 'ALL', label: 'All targets' },
    { value: 'cwee-web', label: 'CWEE Web Exploits', icon: <Globe className="w-3.5 h-3.5 text-callout-info-fg" />, badge: `${trackCounts['cwee-web'] ?? 0}` },
    { value: 'web-master', label: 'Web Master Pathway', icon: <Zap className="w-3.5 h-3.5 text-callout-warn-fg" />, badge: `${trackCounts['web-master'] ?? 0}` },
    { value: 'linux-privesc', label: 'Linux PrivEsc', icon: <Terminal className="w-3.5 h-3.5 text-callout-warn-fg" />, badge: `${trackCounts['linux-privesc'] ?? 0}` },
    { value: 'windows-privesc', label: 'Windows PrivEsc', icon: <ShieldAlert className="w-3.5 h-3.5 text-callout-info-fg" />, badge: `${trackCounts['windows-privesc'] ?? 0}` },
    { value: 'beginner-essentials', label: 'Beginner Essentials', icon: <Sparkles className="w-3.5 h-3.5 text-callout-success-fg" />, badge: `${trackCounts['beginner-essentials'] ?? 0}` },
    { value: 'insane-hardcore', label: 'Hardcore / Insane', icon: <Flame className="w-3.5 h-3.5 text-callout-danger-fg" />, badge: `${trackCounts['insane-hardcore'] ?? 0}` },
  ], [trackCounts]);

  // Single track selector: primary tracks + specialised tracks, with live counts
  const trackSelectOptions = React.useMemo<CyberSelectOption<string>[]>(() => {
    const primary: CyberSelectOption<string>[] = PRIMARY_TRACK_PILLS.map((trk) => ({
      value: trk.id,
      label: trk.label,
      badge: <span className="font-mono tabular-nums text-xs text-muted">{trackCounts[trk.id] ?? 0}</span>,
    }));
    const extra = dynamicOtherTrackOptions.filter((o) => o.value !== 'ALL');
    const multiCount = filters.selectedTracks ? filters.selectedTracks.length : 0;
    return multiCount > 1
      ? [...primary, ...extra, { value: 'MULTI', label: `${multiCount} tracks` }]
      : [...primary, ...extra];
  }, [trackCounts, dynamicOtherTrackOptions, filters.selectedTracks]);

  const trackSelectValue = (filters.selectedTracks && filters.selectedTracks.length > 1)
    ? 'MULTI'
    : (filters.selectedTracks && filters.selectedTracks.length === 1)
      ? filters.selectedTracks[0]
      : (filters.selectedTrack && trackSelectOptions.some((o) => o.value === filters.selectedTrack) ? filters.selectedTrack : 'ALL');

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

    // Multi-track active IDs (Union matching across all selected tracks)
    const activeTrackIds: string[] = (deferredFilters.selectedTracks && deferredFilters.selectedTracks.length > 0)
      ? deferredFilters.selectedTracks
      : (trackFilter && trackFilter !== 'ALL')
        ? [trackFilter]
        : [];
    const activeTracks = activeTrackIds.map((id) => PRACTICE_TRACKS.find((t) => t.id === id)).filter(Boolean) as PracticeTrack[];

    const statusFilter = deferredFilters.selectedStatus || 'ALL';
    const langFilter = deferredFilters.selectedLanguage;
    const areaFilter = deferredFilters.selectedAreaOfInterest;
    const techFilter = deferredFilters.selectedTechnique;

    const list = machines.filter((m) => {
      // 1. Fast primitive checks first (0 allocations, rejects immediately)
      if (platformFilter !== 'ALL' && m.platform !== platformFilter) return false;
      if (diffFilter !== 'ALL' && m.difficulty !== diffFilter) return false;
      if (osFilter && osFilter !== 'ALL' && m.os !== osFilter) return false;
      if (certFilter !== 'ALL' && !m.certifications.includes(certFilter)) return false;

      // 2. HTB Target Status filter
      if (statusFilter !== 'ALL') {
        const isCompleted = m.status === 'root' || m.status === 'completed';
        const isFoothold = m.status === 'foothold';
        if (statusFilter === 'UNCOMPLETED' && isCompleted) return false;
        if (statusFilter === 'FOOTHOLD' && !isFoothold) return false;
        if (statusFilter === 'COMPLETED' && !isCompleted) return false;
      }

      // 3. Active Directory Exclusion Check
      if (excludeAD && isActiveDirectory(m)) return false;

      // 4. Vulnerability Domain filter (active when domain selected without specific category override)
      if (selectedDomain !== 'all' && (!vulnCatFilter || vulnCatFilter === 'ALL')) {
        if (!matchesDomain(m, selectedDomain)) return false;
      }

      // 5. Vulnerability Category filter
      if (vulnCatFilter && vulnCatFilter !== 'ALL') {
        if (!matchesCategory(m, vulnCatFilter)) return false;
      }

      // 6. Curated Track filter (Multi-Track Union matching: matches if ANY active track matches)
      if (activeTracks.length > 0 && !activeTracks.some((t) => t.filterFn(m))) {
        return false;
      }

      // 7. Search query (only evaluated on candidates that passed platform/diff)
      if (q) {
        const matchName = m.name.toLowerCase().includes(q);
        const matchIp = m.ip.includes(q);
        const matchOs = m.os.toLowerCase().includes(q);
        const matchTag = m.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchIp && !matchOs && !matchTag) return false;
      }

      // 8. Legacy Exploit Vector filter compatibility
      if (catFilter && catFilter !== 'ALL') {
        const legacyTarget = catFilter === 'Binary / Pwn' ? 'Binary / BOF' : catFilter;
        if (!matchesCategory(m, legacyTarget)) return false;
      }

      // 9. Selected Tags
      if (hasTags) {
        const hasAllTags = deferredFilters.selectedTags.every((t) => m.tags.includes(t));
        if (!hasAllTags) return false;
      }

      // 10. Language filter
      if (langFilter && langFilter !== 'ALL') {
        const l = langFilter.toLowerCase();
        const textToSearch = `${m.tags.join(' ')} ${m.name} ${m.officialSynopsis || ''} ${(m.skillsLearned || []).join(' ')} ${m.hint || ''}`.toLowerCase();
        let matchesLang = false;
        if (l === 'python') matchesLang = /python|flask|django|\bpy\b/i.test(textToSearch);
        else if (l === 'php') matchesLang = /php|laravel|wordpress/i.test(textToSearch);
        else if (l === 'nodejs' || l === 'javascript') matchesLang = /node|javascript|\bjs\b|express/i.test(textToSearch);
        else if (l === 'java') matchesLang = /java|spring|tomcat|log4j/i.test(textToSearch);
        else if (l === 'c#' || l === '.net') matchesLang = /c#|\.net|csharp|asp\.net|iis/i.test(textToSearch);
        else if (l === 'c/c++') matchesLang = /\bc\b|c\+\+|bof|buffer overflow|binary/i.test(textToSearch);
        else if (l === 'go') matchesLang = /\bgo\b|golang/i.test(textToSearch);
        else if (l === 'ruby') matchesLang = /ruby|rails/i.test(textToSearch);
        else if (l === 'bash') matchesLang = /bash|shell|\bsh\b/i.test(textToSearch);
        else if (l === 'powershell') matchesLang = /powershell|\bps1\b/i.test(textToSearch);
        else matchesLang = textToSearch.includes(l);
        if (!matchesLang) return false;
      }

      // 11. Area of Interest filter
      if (areaFilter && areaFilter !== 'ALL') {
        const a = areaFilter.toLowerCase();
        const textToSearch = `${m.tags.join(' ')} ${m.name} ${m.officialSynopsis || ''} ${(m.skillsLearned || []).join(' ')} ${m.hint || ''}`.toLowerCase();
        let matchesArea = false;
        if (a.includes('web')) matchesArea = classifyMachine(m).domains.includes('web') || /web|http|api|injection|xss|sqli|lfi/i.test(textToSearch);
        else if (a.includes('active directory') || a.includes('ad')) matchesArea = isActiveDirectory(m) || /active directory|kerberos|domain controller|ldap|smb/i.test(textToSearch);
        else if (a.includes('cloud')) matchesArea = /cloud|aws|azure|gcp|s3|iam|docker|k8s|kubernetes/i.test(textToSearch);
        else if (a.includes('binary') || a.includes('pwn')) matchesArea = /bof|buffer overflow|pwn|rop|heap|stack|shellcode|binary/i.test(textToSearch);
        else if (a.includes('crypto')) matchesArea = /crypto|cipher|rsa|aes|padding|hash|jwt|encoding/i.test(textToSearch);
        else if (a.includes('revers')) matchesArea = /reversing|reverse engineering|decompile|ghidra|ida|radare|crack/i.test(textToSearch);
        else if (a.includes('forensic')) matchesArea = /forensics|wireshark|pcap|volatility|memory|stego/i.test(textToSearch);
        else if (a.includes('network')) matchesArea = /network|snmp|smb|ldap|pivoting|tunnel|port knocking|firewall/i.test(textToSearch);
        else matchesArea = textToSearch.includes(a);
        if (!matchesArea) return false;
      }

      // 12. Technique filter (OS-Adaptive)
      if (techFilter && techFilter !== 'ALL') {
        const t = techFilter.toLowerCase();
        const textToSearch = `${m.tags.join(' ')} ${m.name} ${m.officialSynopsis || ''} ${(m.skillsLearned || []).join(' ')} ${m.hint || ''}`.toLowerCase();
        let matchesTech = false;
        if (t.includes('suid') || t.includes('sgid')) matchesTech = /suid|sgid|gtfobins/i.test(textToSearch);
        else if (t.includes('sudo')) matchesTech = /sudo|sudo -l|ld_preload|sudoers/i.test(textToSearch);
        else if (t.includes('cron')) matchesTech = /cron|wildcard|tar\b|rsync/i.test(textToSearch);
        else if (t.includes('kernel')) matchesTech = /kernel|dirty cow|cve-20/i.test(textToSearch);
        else if (t.includes('capabilit')) matchesTech = /cap_setuid|capabilities|getcap|setcap/i.test(textToSearch);
        else if (t.includes('nfs')) matchesTech = /nfs|no_root_squash|exports/i.test(textToSearch);
        else if (t.includes('ssh')) matchesTech = /ssh|id_rsa|authorized_keys/i.test(textToSearch);
        else if (t.includes('docker')) matchesTech = /docker|container breakout|docker\.sock/i.test(textToSearch);
        else if (t.includes('log poison')) matchesTech = /log poison|auth\.log|access\.log/i.test(textToSearch);
        else if (t.includes('systemd')) matchesTech = /systemd|service misconfig|\.service/i.test(textToSearch);
        else if (t.includes('passwd') || t.includes('shadow')) matchesTech = /passwd|shadow|writable/i.test(textToSearch);
        else if (t.includes('kerberoast')) matchesTech = /kerberoast|spn|tgs/i.test(textToSearch);
        else if (t.includes('as-rep')) matchesTech = /as-rep|asrep|dontreqpreauth/i.test(textToSearch);
        else if (t.includes('dcsync')) matchesTech = /dcsync|ntds|secretsdump|krbtgt/i.test(textToSearch);
        else if (t.includes('seimpersonate') || t.includes('potato') || t.includes('printspoofer')) matchesTech = /seimpersonate|juicypotato|printspoofer|godpotato|rottenpotato/i.test(textToSearch);
        else if (t.includes('unquoted')) matchesTech = /unquoted|service path/i.test(textToSearch);
        else if (t.includes('alwaysinstall')) matchesTech = /alwaysinstallelevated|msi/i.test(textToSearch);
        else if (t.includes('dll')) matchesTech = /dll hijack|dll search/i.test(textToSearch);
        else if (t.includes('sam') || t.includes('lsass')) matchesTech = /sam|system hive|lsass|mimikatz/i.test(textToSearch);
        else if (t.includes('token') || t.includes('incognito')) matchesTech = /token|incognito|impersonate/i.test(textToSearch);
        else if (t.includes('bloodhound')) matchesTech = /bloodhound|sharphound|shortest path/i.test(textToSearch);
        else if (t.includes('gpo')) matchesTech = /gpo|group policy/i.test(textToSearch);
        else if (t.includes('laps')) matchesTech = /laps/i.test(textToSearch);
        else matchesTech = textToSearch.includes(t);
        if (!matchesTech) return false;
      }

      return true;
    });

    // Apply Sorting
    if (deferredFilters.sortBy) {
      const difficultyWeights: Record<string, number> = {
        'Very Easy': 1,
        'Easy': 2,
        'Medium': 3,
        'Hard': 4,
        'Insane': 5,
      };

      const hashString = (str: string) => {
        let hash = sessionSeed;
        for (let i = 0; i < str.length; i++) {
          hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
        }
        return hash;
      };

      list.sort((a, b) => {
        let cmp = 0;
        if (deferredFilters.sortBy === 'default') {
          cmp = hashString(a.id) - hashString(b.id);
        } else if (deferredFilters.sortBy === 'difficulty') {
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
  }, [machines, deferredFilters, sessionSeed]);



  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.selectedPlatform !== 'ALL') count++;
    if (filters.selectedDifficulty !== 'ALL') count++;
    if (filters.selectedOs && filters.selectedOs !== 'ALL') count++;
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
        const tr = PRACTICE_TRACKS.find((t) => t.id === trackId);
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
      const tr = PRACTICE_TRACKS.find((t) => t.id === filters.selectedTrack);
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
    return pills;
  }, [filters, setFilters]);

  return (
    <div className="space-y-3 w-full">
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
            <div className="font-mono tabular-nums text-xs text-muted" aria-live="polite">
              <span className="text-primary">{filteredMachines.length}</span> / {machines.length}
            </div>
          </div>
        </div>

        {/* DESKTOP (>= md): search, track, status, then filters / sort / count / view */}
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

          {/* Track selector (replaces the seven track chips) */}
          <CyberSelect<string>
            id="tracker-track-select"
            name="tracker-track-select"
            aria-label="Practice track"
            value={trackSelectValue}
            onChange={(val) => {
              if (val === 'ALL') {
                setFilters({ selectedTrack: 'ALL', selectedTracks: [] });
              } else if (val !== 'MULTI') {
                setFilters({ selectedTrack: val, selectedTracks: [] });
              }
              if (soundEnabled) playCyberSound('toggle');
            }}
            options={trackSelectOptions}
            size="xs"
            variant="hardware"
            triggerClassName="h-8 py-0 px-2.5 text-xs rounded-lg border-subtle min-w-[10.5rem]"
            soundEnabled={soundEnabled}
          />

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
                aria-label={`Sort targets - ${SORT_OPTIONS.find(o => o.value === (filters.sortBy || 'default'))?.label || 'Default Order'}`}
                value={filters.sortBy || 'default'}
                onChange={(val) => setFilters({ sortBy: val as any })}
                options={SORT_OPTIONS}
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
      {/* Slide-over Filter Drawer */}
      <FilterDrawer />

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
          {viewMode === 'table' && <TableView filteredMachines={filteredMachines} />}
          {viewMode === 'grid' && <GridView filteredMachines={filteredMachines} />}
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

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
  Share2,
  X,
  Compass,
  GraduationCap,
  Crosshair,
  Tv,
  Network,
  Flame,
  ShieldAlert
} from 'lucide-react';
import { useCtfStore, BoxVectorCategory, FilterState, HtbTargetStatus } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound, triggerRootCelebration } from '../../utils/helpers';
import { Platform, Difficulty, OperatingSystem } from '../../types';
import { KanbanBoard } from './KanbanBoard';
import { TableView } from './TableView';
import { GridView } from './GridView';
const GraphView = React.lazy(() => import('./GraphView').then((m) => ({ default: m.GraphView })));
import { CuratedPathways } from './CuratedPathways';
import { FilterDrawer } from '../layout/FilterDrawer';
import { PlatformBadge, PlatformIcon } from '../common/PlatformBadge';
import { OsIcon } from '../common/OsBadge';
import { CyberSelect, CyberMultiSelect, CyberSelectOption } from '../common/CyberSelect';
import { CanvasSkeleton } from '../common/Skeleton';
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
  { value: 'default', label: 'Randomized' },
  { value: 'difficulty', label: 'Difficulty (Easy → Hard)' },
  { value: 'name', label: 'Target Name (A-Z)' },
  { value: 'ip', label: 'IP Address' },
  { value: 'recent', label: 'Recently Solved' },
];

const DIFFICULTY_FILTER_OPTIONS: CyberSelectOption<Difficulty | 'ALL'>[] = [
  { value: 'ALL', label: 'Difficulties' },
  { value: 'Very Easy', label: 'Very Easy', color: '#06B6D4' },
  { value: 'Easy', label: 'Easy', color: '#10B981' },
  { value: 'Medium', label: 'Medium', color: '#F59E0B' },
  { value: 'Hard', label: 'Hard', color: '#F43F5E' },
  { value: 'Insane', label: 'Insane', color: '#A855F7' },
];

const STATUS_FILTER_OPTIONS: CyberSelectOption<HtbTargetStatus>[] = [
  { value: 'ALL', label: 'Status - Both', color: '#9FEF00' },
  { value: 'UNCOMPLETED', label: 'Status - Uncompleted' },
  { value: 'FOOTHOLD', label: 'Status - Foothold', color: '#F59E0B' },
  { value: 'COMPLETED', label: 'Status - Completed', color: '#10B981' },
];

const LANGUAGE_OPTIONS: CyberSelectOption<string>[] = [
  { value: 'ALL', label: 'Language' },
  { value: 'Python', label: 'Python' },
  { value: 'PHP', label: 'PHP' },
  { value: 'NodeJS', label: 'Node.js / JS' },
  { value: 'Java', label: 'Java' },
  { value: 'C#', label: 'C# / .NET' },
  { value: 'C/C++', label: 'C / C++' },
  { value: 'Go', label: 'Go (Golang)' },
  { value: 'Ruby', label: 'Ruby' },
  { value: 'Bash', label: 'Bash / Shell' },
  { value: 'PowerShell', label: 'PowerShell' },
];

const AREA_OF_INTEREST_OPTIONS: CyberSelectOption<string>[] = [
  { value: 'ALL', label: 'Area of Interest' },
  { value: 'Web Application', label: 'Web Application' },
  { value: 'Active Directory', label: 'Active Directory' },
  { value: 'Cloud Security', label: 'Cloud Security' },
  { value: 'Binary Exploitation', label: 'Binary Exploitation (Pwn)' },
  { value: 'Cryptography', label: 'Cryptography' },
  { value: 'Reverse Engineering', label: 'Reverse Engineering' },
  { value: 'Forensics', label: 'Forensics' },
  { value: 'Network Security', label: 'Network Security' },
];

const VULNERABILITY_OPTIONS: CyberSelectOption<string>[] = [
  { value: 'ALL', label: 'Vulnerability' },
  { value: 'SQL Injection', label: 'SQL Injection (SQLi)' },
  { value: 'RCE / Command Injection', label: 'Remote Code Execution (RCE)' },
  { value: 'LFI / Path Traversal', label: 'LFI / Path Traversal' },
  { value: 'SSRF', label: 'SSRF' },
  { value: 'Insecure Deserialization', label: 'Deserialization' },
  { value: 'Authentication Bypass', label: 'Authentication Bypass' },
  { value: 'Privilege Escalation', label: 'Privilege Escalation' },
  { value: 'Buffer Overflow', label: 'Buffer Overflow' },
  { value: 'File Upload Bypass', label: 'File Upload Bypass' },
  { value: 'IDOR', label: 'IDOR / Broken Access' },
  { value: 'XXE', label: 'XXE Injection' },
  { value: 'CSRF', label: 'CSRF' },
  { value: 'Misconfiguration', label: 'Misconfiguration' },
];

const HTB_OS_OPTIONS: CyberSelectOption<'ALL' | OperatingSystem>[] = [
  { value: 'ALL', label: 'OS' },
  { value: 'Linux', label: 'Linux', icon: <OsIcon os="Linux" className="w-3.5 h-3.5" /> },
  { value: 'Windows', label: 'Windows', icon: <OsIcon os="Windows" className="w-3.5 h-3.5" /> },
  { value: 'BSD', label: 'BSD', icon: <OsIcon os="BSD" className="w-3.5 h-3.5" /> },
  { value: 'Android', label: 'Android', icon: <OsIcon os="Android" className="w-3.5 h-3.5" /> },
  { value: 'macOS', label: 'macOS', icon: <OsIcon os="macOS" className="w-3.5 h-3.5" /> },
  { value: 'Other', label: 'Other', icon: <OsIcon os="Other" className="w-3.5 h-3.5" /> },
];

const STATUS_PILL_OPTIONS: { value: HtbTargetStatus; label: string }[] = [
  { value: 'ALL', label: 'All Status' },
  { value: 'UNCOMPLETED', label: 'Unsolved' },
  { value: 'FOOTHOLD', label: 'Foothold' },
  { value: 'COMPLETED', label: 'Pwned' },
];

const CERT_FILTER_OPTIONS: CyberSelectOption<'ALL' | 'OSCP' | 'CPTS' | 'CRTO'>[] = [
  { value: 'ALL', label: 'All Certs' },
  { value: 'OSCP', label: 'OSCP' },
  { value: 'CPTS', label: 'CPTS' },
  { value: 'CRTO', label: 'CRTO' },
];

interface PrimaryTrackPill {
  id: string;
  label: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

const PRIMARY_TRACK_PILLS: PrimaryTrackPill[] = [
  { id: 'ALL', label: 'ALL TARGETS', title: 'All Target Machines', icon: Target, iconColor: 'text-[#0ea5e9]' },
  { id: 'tjnull-oscp', label: 'OSCP', title: "TJ_Null's OSCP NetSec Preparation", icon: GraduationCap, iconColor: 'text-callout-warn-fg' },
  { id: 'cpts-path', label: 'CPTS', title: 'Certified Penetration Testing Specialist', icon: Crosshair, iconColor: 'text-callout-success-fg' },
  { id: 'ippsec-vault', label: 'IPPSEC', title: 'IppSec Video Walkthroughs', icon: Tv, iconColor: 'text-callout-info-fg' },
  { id: 'crto-ad', label: 'ACTIVE DIRECTORY', title: 'Enterprise AD & Red Team Warfare', icon: Network, iconColor: 'text-callout-tip-fg' },
  { id: 'popular-classics', label: 'HALL OF FAME', title: 'Community Classics & Popular Boxes', icon: Trophy, iconColor: 'text-callout-warn-fg' },
];

const OTHER_TRACK_OPTIONS: CyberSelectOption<string>[] = [
  { value: 'ALL', label: 'More Tracks...' },
  { value: 'cwee-web', label: 'CWEE Web Exploits', icon: <Globe className="w-3.5 h-3.5 text-callout-info-fg" /> },
  { value: 'web-master', label: 'Web Master Pathway', icon: <Zap className="w-3.5 h-3.5 text-callout-warn-fg" /> },
  { value: 'linux-privesc', label: 'Linux PrivEsc', icon: <Terminal className="w-3.5 h-3.5 text-callout-warn-fg" /> },
  { value: 'windows-privesc', label: 'Windows PrivEsc', icon: <ShieldAlert className="w-3.5 h-3.5 text-callout-info-fg" /> },
  { value: 'beginner-essentials', label: 'Beginner Essentials', icon: <Sparkles className="w-3.5 h-3.5 text-callout-success-fg" /> },
  { value: 'insane-hardcore', label: 'Hardcore / Insane', icon: <Flame className="w-3.5 h-3.5 text-callout-danger-fg" /> },
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
    { value: 'ALL', label: 'More Tracks...' },
    { value: 'cwee-web', label: 'CWEE Web Exploits', icon: <Globe className="w-3.5 h-3.5 text-callout-info-fg" />, badge: `${trackCounts['cwee-web'] ?? 0}` },
    { value: 'web-master', label: 'Web Master Pathway', icon: <Zap className="w-3.5 h-3.5 text-callout-warn-fg" />, badge: `${trackCounts['web-master'] ?? 0}` },
    { value: 'linux-privesc', label: 'Linux PrivEsc', icon: <Terminal className="w-3.5 h-3.5 text-callout-warn-fg" />, badge: `${trackCounts['linux-privesc'] ?? 0}` },
    { value: 'windows-privesc', label: 'Windows PrivEsc', icon: <ShieldAlert className="w-3.5 h-3.5 text-callout-info-fg" />, badge: `${trackCounts['windows-privesc'] ?? 0}` },
    { value: 'beginner-essentials', label: 'Beginner Essentials', icon: <Sparkles className="w-3.5 h-3.5 text-callout-success-fg" />, badge: `${trackCounts['beginner-essentials'] ?? 0}` },
    { value: 'insane-hardcore', label: 'Hardcore / Insane', icon: <Flame className="w-3.5 h-3.5 text-callout-danger-fg" />, badge: `${trackCounts['insane-hardcore'] ?? 0}` },
  ], [trackCounts]);

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
  const [htbSecondaryRowOpen, setHtbSecondaryRowOpen] = useState(true);

  // Dynamic OS-Adaptive Technique options matching authentic Hack The Box experience
  const techniqueOptions = useMemo(() => {
    const os = filters.selectedOs;
    if (os === 'Linux') {
      return [
        { value: 'ALL', label: 'Technique' },
        { value: 'SUID / SGID Exploitation', label: 'SUID / SGID Exploitation' },
        { value: 'Sudo Rights (sudo -l)', label: 'Sudo Rights (sudo -l)' },
        { value: 'Cron Jobs / Wildcard Injection', label: 'Cron Jobs / Wildcards' },
        { value: 'Kernel Exploits / Dirty COW', label: 'Kernel Exploits' },
        { value: 'Linux Capabilities', label: 'Linux Capabilities' },
        { value: 'NFS No_Root_Squash', label: 'NFS No_Root_Squash' },
        { value: 'SSH Key Hijacking', label: 'SSH Key Hijacking' },
        { value: 'Docker Breakout / Socket', label: 'Docker Breakout' },
        { value: 'Log Poisoning / LFI to RCE', label: 'Log Poisoning (LFI to RCE)' },
        { value: 'Systemd Service Misconfig', label: 'Systemd Service Misconfig' },
        { value: 'Writable /etc/passwd or shadow', label: 'Writable /etc/passwd' },
      ];
    } else if (os === 'Windows') {
      return [
        { value: 'ALL', label: 'Technique' },
        { value: 'Kerberoasting (TGS Request)', label: 'Kerberoasting (TGS)' },
        { value: 'AS-REP Roasting', label: 'AS-REP Roasting' },
        { value: 'DCSync / NTDS.dit', label: 'DCSync / NTDS.dit' },
        { value: 'SeImpersonate (JuicyPotato / PrintSpoofer)', label: 'SeImpersonate / Potato' },
        { value: 'Unquoted Service Paths', label: 'Unquoted Service Paths' },
        { value: 'AlwaysInstallElevated', label: 'AlwaysInstallElevated' },
        { value: 'DLL Hijacking', label: 'DLL Hijacking' },
        { value: 'SAM & SYSTEM Dumping', label: 'SAM & LSASS Dumping' },
        { value: 'Token Manipulation', label: 'Token Impersonation' },
        { value: 'BloodHound Attack Paths', label: 'BloodHound Attack Paths' },
        { value: 'GPO Abuse', label: 'GPO Abuse' },
        { value: 'LAPS Password', label: 'LAPS Password Extraction' },
      ];
    }
    return [
      { value: 'ALL', label: 'Technique' },
      { value: 'SUID / SGID Exploitation', label: 'Linux: SUID / SGID' },
      { value: 'Sudo Rights (sudo -l)', label: 'Linux: Sudo Rights' },
      { value: 'Cron Jobs / Wildcard Injection', label: 'Linux: Cron Jobs' },
      { value: 'Kernel Exploits / Dirty COW', label: 'Linux: Kernel Exploits' },
      { value: 'Docker Breakout / Socket', label: 'Linux: Docker Breakout' },
      { value: 'Kerberoasting (TGS Request)', label: 'Win: Kerberoasting' },
      { value: 'AS-REP Roasting', label: 'Win: AS-REP Roasting' },
      { value: 'DCSync / NTDS.dit', label: 'Win: DCSync / NTDS' },
      { value: 'SeImpersonate (JuicyPotato / PrintSpoofer)', label: 'Win: SeImpersonate / Potato' },
      { value: 'Unquoted Service Paths', label: 'Win: Unquoted Service Paths' },
      { value: 'DLL Hijacking', label: 'Win: DLL Hijacking' },
      { value: 'BloodHound Attack Paths', label: 'Win: BloodHound Paths' },
    ];
  }, [filters.selectedOs]);

  const handleClearSecondaryFilters = () => {
    setFilters({
      selectedLanguage: 'ALL',
      selectedAreaOfInterest: 'ALL',
      selectedTechnique: 'ALL',
      selectedStatus: 'ALL',
    });
    if (soundEnabled) playCyberSound('click');
  };

  // Synchronize domain tab when a specific category is selected
  React.useEffect(() => {
    if (filters.selectedVulnCategory && filters.selectedVulnCategory !== 'ALL') {
      const def = getCategoryDef(filters.selectedVulnCategory);
      if (def) {
        setSelectedDomain(def.domain);
      }
    }
  }, [filters.selectedVulnCategory]);

  // Dynamic OS distribution counts directly from the active machines catalog
  const dynamicOsOptions = useMemo((): CyberSelectOption<'ALL' | OperatingSystem>[] => {
    const counts: Record<string, number> = {
      Linux: 0,
      Windows: 0,
      BSD: 0,
      Android: 0,
      macOS: 0,
      Other: 0,
    };

    machines.forEach((m) => {
      if (counts[m.os] !== undefined) {
        counts[m.os]++;
      } else {
        counts.Other = (counts.Other || 0) + 1;
      }
    });

    return [
      {
        value: 'ALL',
        label: 'OS',
        badge: <span className="text-[10px] text-tertiary font-mono">({machines.length})</span>,
      },
      {
        value: 'Linux',
        label: 'Linux',
        icon: <OsIcon os="Linux" className="w-3.5 h-3.5" />,
        badge: <span className="text-[10px] text-callout-warn-fg font-mono font-bold">({counts.Linux})</span>,
      },
      {
        value: 'Windows',
        label: 'Windows',
        icon: <OsIcon os="Windows" className="w-3.5 h-3.5" />,
        badge: <span className="text-[10px] text-callout-info-fg font-mono font-bold">({counts.Windows})</span>,
      },
      {
        value: 'BSD',
        label: 'BSD',
        icon: <OsIcon os="BSD" className="w-3.5 h-3.5" />,
        badge: <span className="text-[10px] text-callout-danger-fg font-mono font-bold">({counts.BSD})</span>,
      },
      {
        value: 'Android',
        label: 'Android',
        icon: <OsIcon os="Android" className="w-3.5 h-3.5" />,
        badge: <span className="text-[10px] text-callout-success-fg font-mono font-bold">({counts.Android})</span>,
      },
      {
        value: 'macOS',
        label: 'macOS',
        icon: <OsIcon os="macOS" className="w-3.5 h-3.5" />,
        badge: <span className="text-[10px] text-callout-tip-fg font-mono font-bold">({counts.macOS})</span>,
      },
      {
        value: 'Other',
        label: 'Other',
        icon: <OsIcon os="Other" className="w-3.5 h-3.5" />,
        badge: <span className="text-[10px] text-tertiary font-mono">({counts.Other})</span>,
      },
    ];
  }, [machines]);

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

  const displayedCategories = useMemo(() => {
    if (selectedDomain === 'all') {
      return [...VULN_CATEGORIES]
        .sort((a, b) => (categoryCounts[b.id] || 0) - (categoryCounts[a.id] || 0))
        .slice(0, 10);
    }
    return VULN_CATEGORIES.filter((c) => c.domain === selectedDomain);
  }, [selectedDomain, categoryCounts]);

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
      {/* High-End Tactical Toolbar */}
      <div className="relative z-30 font-mono text-xs antialiased text-zinc-700 dark:text-zinc-300 space-y-0 shadow-none p-2 sm:p-2.5 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/90 machined-edge">
        
        {/* A. MOBILE ADAPTIVE COMMAND BAR (< md) */}
        <div className="md:hidden space-y-2">
          {/* Mobile Row 1: Search + Filter Drawer Trigger + View Modes */}
          <div className="flex items-center gap-1.5">
            {/* Search */}
            <div className="relative h-8 flex-1 group">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-tertiary group-focus-within:text-[#0ea5e9] transition-colors pointer-events-none" />
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
                placeholder="Search targets, IP... (/)"
                className="w-full h-8 pl-8 pr-7 bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-[3px] text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/30 transition-all shadow-none"
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  onClick={() => setFilters({ searchQuery: '' })}
                  className="absolute right-2 top-2 w-4 h-4 flex items-center justify-center text-xs text-tertiary hover:text-zinc-700 dark:hover:text-primary cursor-pointer transition-colors"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Drawer Trigger */}
            <button
              type="button"
              onClick={() => { setFilterDrawerOpen(true); if (soundEnabled) playCyberSound('click'); }}
              className={`h-8 flex items-center gap-1.5 px-2.5 rounded-[3px] border text-[11px] font-mono font-bold uppercase tracking-wider transition-all shadow-none cursor-pointer active:scale-[0.97] ${
                activeFilterCount > 0
                  ? 'bg-zinc-900 dark:bg-zinc-950 border-[#0ea5e9] text-[#0ea5e9]'
                  : 'bg-zinc-100 dark:bg-zinc-900/90 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-primary'
              }`}
              title="Open Advanced Filters Drawer"
            >
              <Filter className="w-3.5 h-3.5 text-[#0ea5e9]" />
              {activeFilterCount > 0 && (
                <span className="font-mono text-[10px] font-bold tabular-nums">
                  [ {activeFilterCount} ]
                </span>
              )}
            </button>

            {/* View Mode Switcher */}
            <div className="h-8 flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-[3px] border border-zinc-200 dark:border-zinc-800 flex-shrink-0 font-mono">
              <button
                type="button"
                data-testid="view-kanban-mobile"
                aria-label="Kanban View"
                onClick={() => setViewMode('kanban')}
                className={`w-7 h-7 flex items-center justify-center rounded-[2px] transition-colors cursor-pointer active:scale-[0.97] ${
                  viewMode === 'kanban' 
                    ? 'bg-zinc-900 text-[#0ea5e9] border border-[#0ea5e9]/50 dark:bg-zinc-950 dark:text-[#0ea5e9] shadow-none' 
                    : 'text-tertiary hover:text-zinc-900 dark:hover:text-primary'
                }`}
                title="Kanban View"
              >
                <Kanban className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                data-testid="view-table-mobile"
                aria-label="Table View"
                onClick={() => setViewMode('table')}
                className={`w-7 h-7 flex items-center justify-center rounded-[2px] transition-colors cursor-pointer active:scale-[0.97] ${
                  viewMode === 'table' 
                    ? 'bg-zinc-900 text-[#0ea5e9] border border-[#0ea5e9]/50 dark:bg-zinc-950 dark:text-[#0ea5e9] shadow-none' 
                    : 'text-tertiary hover:text-zinc-900 dark:hover:text-primary'
                }`}
                title="Table View"
              >
                <Table className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                data-testid="view-grid-mobile"
                aria-label="Grid View"
                onClick={() => setViewMode('grid')}
                className={`w-7 h-7 flex items-center justify-center rounded-[2px] transition-colors cursor-pointer active:scale-[0.97] ${
                  viewMode === 'grid' 
                    ? 'bg-zinc-900 text-[#0ea5e9] border border-[#0ea5e9]/50 dark:bg-zinc-950 dark:text-[#0ea5e9] shadow-none' 
                    : 'text-tertiary hover:text-zinc-900 dark:hover:text-primary'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mobile Row 2: Horizontal Swipe Carousel for Tracks & Progress */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1 font-mono">
            {PRIMARY_TRACK_PILLS.map((trk) => {
              const active = (trk.id === 'ALL' && (!filters.selectedTrack || filters.selectedTrack === 'ALL') && (!filters.selectedTracks || filters.selectedTracks.length === 0)) ||
                filters.selectedTrack === trk.id ||
                (filters.selectedTracks && filters.selectedTracks.includes(trk.id));
              const Icon = trk.icon;
              const count = trackCounts[trk.id] ?? 0;
              return (
                <button
                  key={trk.id}
                  type="button"
                  title={trk.title}
                  onClick={() => {
                    if (trk.id === 'ALL') {
                      setFilters({ selectedTrack: 'ALL', selectedTracks: [] });
                    } else {
                      setFilters({ selectedTrack: trk.id, selectedTracks: [] });
                    }
                    if (soundEnabled) playCyberSound('toggle');
                  }}
                  className={`h-7 px-2 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 active:scale-[0.96] ${
                    active
                      ? 'bg-zinc-900 text-[#0ea5e9] border border-[#0ea5e9]/50 dark:bg-zinc-950 dark:text-[#0ea5e9] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                      : 'bg-zinc-100 dark:bg-zinc-900/80 text-tertiary border border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <Icon className={`w-3 h-3 ${active ? 'text-[#0ea5e9]' : trk.iconColor}`} />
                  <span>{trk.label}</span>
                  <span className={`px-1 py-0.5 rounded-[2px] text-[9px] font-mono tabular-nums leading-none ${
                    active 
                      ? 'bg-[#0ea5e9]/20 text-[#0ea5e9] border border-[#0ea5e9]/40' 
                      : 'bg-zinc-200/80 dark:bg-zinc-800/80 text-tertiary border border-zinc-300/40 dark:border-zinc-700/40'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
            <div className="text-[10px] font-mono text-tertiary px-1.5 flex-shrink-0 tabular-nums">
              [ {filteredMachines.length} / {machines.length} ]
            </div>
          </div>
        </div>

        {/* B. DESKTOP HIGH-COMMAND HUD (>= md) */}
        <div className="hidden md:block space-y-2">
          {/* Row 1: Track Selector & Tactical Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
            {/* Left: Interactive Practice Tracks Selector */}
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
              <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-[3px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] text-tertiary font-bold font-mono uppercase tracking-wider flex-shrink-0">
                <Compass className="w-3.5 h-3.5 text-[#0ea5e9]" />
                <span>TRACK:</span>
              </div>

              {/* Curated Track Segment Pills */}
              <div className="h-8 flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-[3px] border border-zinc-200 dark:border-zinc-800 overflow-x-auto max-w-full no-scrollbar scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-shrink-0 font-mono">
                {PRIMARY_TRACK_PILLS.map((trk) => {
                  const active = (trk.id === 'ALL' && (!filters.selectedTrack || filters.selectedTrack === 'ALL') && (!filters.selectedTracks || filters.selectedTracks.length === 0)) ||
                    filters.selectedTrack === trk.id ||
                    (filters.selectedTracks && filters.selectedTracks.includes(trk.id));
                  const Icon = trk.icon;
                  const count = trackCounts[trk.id] ?? 0;
                  return (
                    <button
                      key={trk.id}
                      type="button"
                      title={trk.title}
                      onClick={() => {
                        if (trk.id === 'ALL') {
                          setFilters({ selectedTrack: 'ALL', selectedTracks: [] });
                        } else {
                          setFilters({ selectedTrack: trk.id, selectedTracks: [] });
                        }
                        if (soundEnabled) playCyberSound('toggle');
                      }}
                      className={`h-7 px-2 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 active:scale-[0.96] ${
                        active
                          ? 'bg-zinc-900 text-[#0ea5e9] border border-[#0ea5e9]/50 dark:bg-zinc-950 dark:text-[#0ea5e9] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                          : 'text-tertiary hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 border border-transparent'
                      }`}
                    >
                      <Icon className={`w-3 h-3 ${active ? 'text-[#0ea5e9]' : trk.iconColor}`} />
                      <span>{trk.label}</span>
                      <span className={`px-1 py-0.5 rounded-[2px] text-[9px] font-mono tabular-nums leading-none ${
                        active 
                          ? 'bg-[#0ea5e9]/20 text-[#0ea5e9] border border-[#0ea5e9]/40' 
                          : 'bg-zinc-200/80 dark:bg-zinc-800/80 text-tertiary border border-zinc-300/40 dark:border-zinc-700/40'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Other Specialized Tracks Dropdown */}
              <CyberSelect<string>
                id="tracker-more-tracks-select"
                name="tracker-more-tracks-select"
                aria-label="More Practice Tracks"
                value={
                  dynamicOtherTrackOptions.some((o) => o.value === filters.selectedTrack)
                    ? filters.selectedTrack
                    : 'ALL'
                }
                onChange={(val) => {
                  if (val === 'ALL') {
                    setFilters({ selectedTrack: 'ALL', selectedTracks: [] });
                  } else {
                    setFilters({ selectedTrack: val, selectedTracks: [] });
                  }
                }}
                options={dynamicOtherTrackOptions}
                size="xs"
                variant="hardware"
                triggerClassName="h-8 py-0 px-2.5 text-[10px] font-mono rounded-[3px] border-zinc-200 dark:border-zinc-800"
                soundEnabled={soundEnabled}
              />

              {/* Inline micro progress bar (when any track selected) */}
              {((filters.selectedTracks && filters.selectedTracks.length > 0) || (filters.selectedTrack && filters.selectedTrack !== 'ALL')) && (() => {
                const activeIds = (filters.selectedTracks && filters.selectedTracks.length > 0)
                  ? filters.selectedTracks
                  : [filters.selectedTrack!];
                const tracks = activeIds.map(id => PRACTICE_TRACKS.find(t => t.id === id)).filter(Boolean);
                const totalSet = new Set<string>();
                const rootedSet = new Set<string>();
                tracks.forEach(track => {
                  if (!track) return;
                  machines.filter(track.filterFn).forEach(m => {
                    totalSet.add(m.id || m.name);
                    if (m.status === 'root' || m.status === 'completed') rootedSet.add(m.id || m.name);
                  });
                });
                const total = totalSet.size;
                const rooted = rootedSet.size;
                const pct = total > 0 ? Math.round((rooted / total) * 100) : 0;
                return (
                  <div className="h-8 flex items-center gap-2 px-2.5 rounded-[3px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex-shrink-0 font-mono">
                    <div className="w-14 h-1.5 rounded-[1px] bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                      <div 
                        className="h-full rounded-[1px] bg-[#0ea5e9] transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold whitespace-nowrap tabular-nums">[ {rooted}/{total} · {pct}% ]</span>
                  </div>
                );
              })()}
            </div>
            
            {/* Right: Action Controls */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Scan Importer */}
              <button
                type="button"
                onClick={() => setReconAutomationModalOpen(true)}
                className="h-8 px-2.5 flex items-center gap-1.5 rounded-[3px] bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-primary text-[10px] font-mono font-bold uppercase tracking-wider transition-colors active:scale-[0.97] cursor-pointer shadow-none"
                title="Launch Tactical Scan Importer"
              >
                <Zap className="w-3.5 h-3.5 text-[#0ea5e9]" />
                <span className="hidden sm:inline">Import</span>
              </button>

              {/* View Mode Switcher */}
              <div className="h-8 flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-[3px] border border-zinc-200 dark:border-zinc-800 font-mono">
                <button
                  type="button"
                  data-testid="view-kanban"
                  aria-label="Kanban View"
                  onClick={() => setViewMode('kanban')}
                  className={`w-7 h-7 flex items-center justify-center rounded-[2px] transition-colors cursor-pointer active:scale-[0.97] ${
                    viewMode === 'kanban' 
                      ? 'bg-zinc-900 text-[#0ea5e9] border border-[#0ea5e9]/50 dark:bg-zinc-950 dark:text-[#0ea5e9] shadow-none' 
                      : 'text-tertiary hover:text-zinc-900 dark:hover:text-primary'
                  }`}
                  title="Kanban View"
                >
                  <Kanban className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  data-testid="view-table"
                  aria-label="Table View"
                  onClick={() => setViewMode('table')}
                  className={`w-7 h-7 flex items-center justify-center rounded-[2px] transition-colors cursor-pointer active:scale-[0.97] ${
                    viewMode === 'table' 
                      ? 'bg-zinc-900 text-[#0ea5e9] border border-[#0ea5e9]/50 dark:bg-zinc-950 dark:text-[#0ea5e9] shadow-none' 
                      : 'text-tertiary hover:text-zinc-900 dark:hover:text-primary'
                  }`}
                  title="Table View"
                >
                  <Table className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  data-testid="view-grid"
                  aria-label="Grid View"
                  onClick={() => setViewMode('grid')}
                  className={`w-7 h-7 flex items-center justify-center rounded-[2px] transition-colors cursor-pointer active:scale-[0.97] ${
                    viewMode === 'grid' 
                      ? 'bg-zinc-900 text-[#0ea5e9] border border-[#0ea5e9]/50 dark:bg-zinc-950 dark:text-[#0ea5e9] shadow-none' 
                      : 'text-tertiary hover:text-zinc-900 dark:hover:text-primary'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  data-testid="view-graph"
                  aria-label="Attack Graph View"
                  onClick={() => setViewMode('graph')}
                  className={`w-7 h-7 flex items-center justify-center rounded-[2px] transition-colors cursor-pointer active:scale-[0.97] ${
                    viewMode === 'graph' 
                      ? 'bg-zinc-900 text-[#0ea5e9] border border-[#0ea5e9]/50 dark:bg-zinc-950 dark:text-[#0ea5e9] shadow-none' 
                      : 'text-tertiary hover:text-zinc-900 dark:hover:text-primary'
                  }`}
                  title="Attack Graph View"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                {/* Embedded Hide Empty Lanes (kanban only) */}
                {viewMode === 'kanban' && (
                  <>
                    <div className="w-px h-4 bg-zinc-300 dark:border-zinc-800 mx-0.5" />
                    <button
                      type="button"
                      onClick={() => { setFilters({ hideEmptyLanes: !filters.hideEmptyLanes }); if (soundEnabled) playCyberSound('toggle'); }}
                      className={`w-7 h-7 flex items-center justify-center rounded-[2px] transition-colors cursor-pointer active:scale-[0.97] ${
                        filters.hideEmptyLanes 
                          ? 'bg-zinc-900 text-[#0ea5e9] border border-[#0ea5e9]/50 dark:bg-zinc-950 dark:text-[#0ea5e9]' 
                          : 'text-tertiary hover:text-zinc-900 dark:hover:text-primary'
                      }`}
                      title={filters.hideEmptyLanes ? 'Show Empty Lanes' : 'Hide Empty Lanes'}
                    >
                      {filters.hideEmptyLanes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Operational Search & Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            {/* Left: Search + Platform + Status + OS + Difficulty + Cert */}
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {/* Search */}
              <div className="relative h-8 w-48 lg:w-60 flex-shrink-0 group font-mono">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-tertiary group-focus-within:text-[#0ea5e9] transition-colors pointer-events-none" />
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
                  placeholder="Search targets, IP, CVE... (/)"
                  className="w-full h-8 pl-8 pr-10 bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-[3px] text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9]/30 transition-all shadow-none"
                />
                {filters.searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setFilters({ searchQuery: '' })}
                    className="absolute right-2 top-2 w-4 h-4 flex items-center justify-center text-xs text-tertiary hover:text-zinc-700 dark:hover:text-primary cursor-pointer transition-colors"
                    title="Clear search (Esc)"
                  >
                    ✕
                  </button>
                ) : (
                  <div className="absolute right-2 top-1.5 flex items-center gap-1 pointer-events-none">
                    <kbd className="px-1.5 py-0.5 text-[9px] font-mono font-bold text-tertiary bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-[2px] shadow-none">
                      /
                    </kbd>
                  </div>
                )}
              </div>

              {/* Platform Segment Pills */}
              <div className="h-8 flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-[3px] border border-zinc-200 dark:border-zinc-800 flex-shrink-0 font-mono">
                <div className="px-1.5 text-tertiary">
                  <Globe className="w-3 h-3 text-[#0ea5e9]" />
                </div>
                {platformList.map((p) => {
                  const active = filters.selectedPlatform === p;
                  const getPlatformStyles = () => {
                    if (p === 'HTB') {
                      return active
                        ? 'bg-emerald-500/20 text-callout-success-fg border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : 'text-callout-success-fg hover:text-callout-success-fg hover:bg-emerald-500/10 border-transparent';
                    }
                    if (p === 'THM') {
                      return active
                        ? 'bg-rose-500/20 text-callout-danger-fg border-rose-500/60 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                        : 'text-callout-danger-fg hover:text-callout-danger-fg hover:bg-rose-500/10 border-transparent';
                    }
                    if (p === 'Custom') {
                      return active
                        ? 'bg-sky-500/20 text-callout-info-fg border-sky-500/60 shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                        : 'text-callout-info-fg hover:text-callout-info-fg hover:bg-sky-500/10 border-transparent';
                    }
                    return active
                      ? 'bg-zinc-900 text-[#0ea5e9] border border-[#0ea5e9]/50 dark:bg-zinc-950 dark:text-[#0ea5e9]'
                      : 'text-tertiary hover:text-zinc-900 dark:hover:text-primary border-transparent';
                  };

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => { setFilters({ selectedPlatform: p }); if (soundEnabled) playCyberSound('toggle'); }}
                      className={`h-7 px-2 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer border active:scale-[0.97] ${getPlatformStyles()}`}
                    >
                      {p !== 'ALL' && <PlatformIcon platform={p as Platform} className="w-3 h-3" />}
                      <span>{p === 'ALL' ? 'All' : p}</span>
                    </button>
                  );
                })}
              </div>

              {/* Target Status Segment Pills */}
              <div className="h-8 flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-[3px] border border-zinc-200 dark:border-zinc-800 flex-shrink-0 font-mono">
                <div className="px-1.5 text-tertiary">
                  <Target className="w-3 h-3 text-[#0ea5e9]" />
                </div>
                {STATUS_PILL_OPTIONS.map((st) => {
                  const active = (filters.selectedStatus || 'ALL') === st.value;
                  return (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => {
                        setFilters({ selectedStatus: st.value });
                        if (soundEnabled) playCyberSound('toggle');
                      }}
                      className={`h-7 px-2 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-colors cursor-pointer active:scale-[0.97] ${
                        active
                          ? 'bg-zinc-900 text-[#0ea5e9] border border-[#0ea5e9]/50 dark:bg-zinc-950 dark:text-[#0ea5e9] shadow-none'
                          : 'text-tertiary hover:text-zinc-900 dark:hover:text-primary'
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </div>

              {/* OS Dropdown */}
              <CyberSelect<'ALL' | OperatingSystem>
                id="htb-os-select"
                name="htb-os-select"
                aria-label="Filter OS"
                value={filters.selectedOs || 'ALL'}
                onChange={(val) => setFilters({ selectedOs: val })}
                options={dynamicOsOptions}
                size="xs"
                variant="hardware"
                triggerClassName={`h-8 py-0 px-2.5 text-[10px] font-mono rounded-[3px] border ${
                  filters.selectedOs === 'Linux'
                    ? 'border-amber-500/60 text-callout-warn-fg bg-amber-500/10 dark:bg-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                    : filters.selectedOs === 'Windows'
                    ? 'border-sky-500/60 text-callout-info-fg bg-sky-500/10 dark:bg-sky-500/20 shadow-[0_0_8px_rgba(14,165,233,0.2)]'
                    : filters.selectedOs === 'Android'
                    ? 'border-emerald-500/60 text-callout-success-fg bg-emerald-500/10 dark:bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                    : filters.selectedOs === 'macOS'
                    ? 'border-purple-500/60 text-callout-tip-fg bg-purple-500/10 dark:bg-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                    : filters.selectedOs === 'BSD'
                    ? 'border-rose-500/60 text-callout-danger-fg bg-rose-500/10 dark:bg-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
                soundEnabled={soundEnabled}
              />

              {/* Difficulty Dropdown */}
              <CyberSelect<Difficulty | 'ALL'>
                id="htb-difficulty-select"
                name="htb-difficulty-select"
                aria-label="Filter Difficulties"
                value={filters.selectedDifficulty}
                onChange={(val) => setFilters({ selectedDifficulty: val })}
                options={DIFFICULTY_FILTER_OPTIONS}
                size="xs"
                variant="hardware"
                triggerClassName="h-8 py-0 px-2.5 text-[10px] font-mono rounded-[3px] border-zinc-200 dark:border-zinc-800"
                soundEnabled={soundEnabled}
              />

              {/* Cert Dropdown */}
              <CyberSelect<'ALL' | 'OSCP' | 'CPTS' | 'CRTO'>
                id="tracker-cert-select"
                name="tracker-cert-select"
                aria-label="Filter Certification"
                value={filters.selectedCert || 'ALL'}
                onChange={(val) => setFilters({ selectedCert: val })}
                options={CERT_FILTER_OPTIONS}
                size="xs"
                variant="hardware"
                triggerClassName="h-8 py-0 px-2.5 text-[10px] font-mono rounded-[3px] border-zinc-200 dark:border-zinc-800"
                soundEnabled={soundEnabled}
              />
            </div>

            {/* Right: Drawer Trigger + Sort + Counter */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Advanced Filters Drawer Trigger */}
              <button
                type="button"
                onClick={() => { setFilterDrawerOpen(true); if (soundEnabled) playCyberSound('click'); }}
                className={`h-8 flex items-center gap-1.5 px-3 rounded-[3px] border text-[10px] font-mono font-bold uppercase tracking-wider transition-all shadow-none cursor-pointer active:scale-[0.97] ${
                  activeFilterCount > 0
                    ? 'bg-zinc-900 dark:bg-zinc-950 border-[#0ea5e9] text-[#0ea5e9]'
                    : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-primary'
                }`}
                title="Open Advanced Filters Drawer"
              >
                <Filter className="w-3.5 h-3.5 text-[#0ea5e9]" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="font-mono text-[10px] font-bold tabular-nums">
                    [ {activeFilterCount} ]
                  </span>
                )}
              </button>

              {/* Sort Dropdown */}
              <div className="h-8 flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 px-2 rounded-[3px] border border-zinc-200 dark:border-zinc-800 font-mono text-[10px]">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#0ea5e9] flex-shrink-0" />
                <CyberSelect
                  id="tracker-sort-select"
                  name="tracker-sort-select"
                  aria-label={`Sort targets - ${SORT_OPTIONS.find(o => o.value === (filters.sortBy || 'default'))?.label || 'Default Order'}`}
                  value={filters.sortBy || 'default'}
                  onChange={(val) => setFilters({ sortBy: val as any })}
                  options={SORT_OPTIONS}
                  variant="transparent"
                  size="xs"
                  triggerClassName="h-7 py-0 px-1 border-none bg-transparent hover:bg-transparent text-zinc-800 dark:text-zinc-200 font-mono text-[10px] uppercase font-bold"
                  soundEnabled={soundEnabled}
                />
              </div>

              {/* Result Counter */}
              <div className="h-8 px-2.5 flex items-center rounded-[3px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-tertiary text-[10px] whitespace-nowrap font-mono tabular-nums">
                [ <strong className="text-zinc-900 dark:text-white font-bold">{filteredMachines.length}</strong> / {machines.length} ]
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Active Filters HUD Ribbon */}
        {activeFilterPills.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-950/60 -mx-2 sm:-mx-2.5 -mb-2 sm:-mb-2.5 p-2 sm:p-2.5 rounded-b-[4px] font-mono text-[10px]">
            <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-tertiary tracking-wider flex items-center gap-1 mr-1 font-mono flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-[#0ea5e9]" />
                [ ACTIVE : {activeFilterPills.length} ]
              </span>
              {activeFilterPills.map((pill) => (
                <span
                  key={pill.id}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-200 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 shadow-none"
                >
                  <span className="truncate max-w-[200px]">{pill.label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      pill.onRemove();
                      if (soundEnabled) playCyberSound('click');
                    }}
                    className="p-0.5 rounded-[2px] hover:bg-zinc-300 dark:hover:bg-zinc-800 text-tertiary hover:text-zinc-900 dark:hover:text-primary transition-colors cursor-pointer"
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
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] text-[10px] font-mono font-bold uppercase tracking-wider text-callout-danger-fg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors ml-1 active:scale-[0.97] cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear All</span>
              </button>
            </div>

            {/* Live Filter Match Percentage */}
            <div className="text-[10px] font-mono text-tertiary bg-white/60 dark:bg-zinc-900 px-2 py-0.5 rounded-[3px] border border-zinc-200 dark:border-zinc-800 flex-shrink-0 tabular-nums">
              [ <span className="font-bold text-zinc-900 dark:text-white">{filteredMachines.length}</span> / {machines.length} · {Math.round((filteredMachines.length / (machines.length || 1)) * 100)}% ]
            </div>
          </div>
        )}
      </div>
      {/* Slide-over Filter Drawer */}
      <FilterDrawer />

      {/* Main View Renderer */}
      {filteredMachines.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-[4px] border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 my-4 machined-edge font-mono">
          <div className="w-10 h-10 rounded-[3px] bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center mb-2.5">
            <Search className="w-5 h-5 text-tertiary" />
          </div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">[ NO MATCHING TARGETS FOUND ]</h3>
          <p className="text-xs text-tertiary max-w-md mb-3 font-mono">
            {filters.searchQuery 
              ? `Zero machines matched "${filters.searchQuery}" with the current filter parameters.`
              : 'Zero machines matched the selected filter configuration.'}
          </p>
          <button
            type="button"
            onClick={() => {
              resetFilters();
              if (soundEnabled) playCyberSound('toggle');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[3px] text-xs font-bold text-slate-900 dark:text-black bg-[#0ea5e9] hover:brightness-110 transition-all active:scale-[0.97] cursor-pointer shadow-none uppercase font-mono tracking-wider"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
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

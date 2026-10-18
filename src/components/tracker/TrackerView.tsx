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
import { useCtfStore, BoxVectorCategory, FilterState, HtbTargetStatus } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { playCyberSound, triggerRootCelebration } from '../../utils/helpers';
import { Platform, Difficulty, OperatingSystem } from '../../types';
import { KanbanBoard } from './KanbanBoard';
import { TableView } from './TableView';
import { GridView } from './GridView';
import { GraphView } from './GraphView';
import { CuratedPathways } from './CuratedPathways';
import { FilterDrawer } from '../layout/FilterDrawer';
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
  { value: 'Linux', label: 'Linux' },
  { value: 'Windows', label: 'Windows' },
  { value: 'Android', label: 'Android' },
  { value: 'BSD', label: 'BSD' },
  { value: 'Other', label: 'Other' },
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
    setFilterDrawerOpen,
    focusMode,
    setFocusMode,
    toggleFocusMode,
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
      setFilterDrawerOpen: s.setFilterDrawerOpen,
      focusMode: s.focusMode,
      setFocusMode: s.setFocusMode,
      toggleFocusMode: s.toggleFocusMode,
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
      pills.push({
        id: 'status',
        label: `Status: ${filters.selectedStatus}`,
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
      {/* 2-Row Compact Toolbar */}
      {!focusMode && (
      <div className="font-sans text-xs antialiased text-slate-700 dark:text-cyber-text space-y-0 shadow-sm p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card/90">
        
        {/* Row 1: Track & Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
          {/* Left: Track Info with Progress */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 dark:text-cyber-muted uppercase font-bold tracking-wider">TRACK:</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              {(filters.selectedTracks && filters.selectedTracks.length > 0)
                ? `${filters.selectedTracks.length} Tracks Selected`
                : (filters.selectedTrack && filters.selectedTrack !== 'ALL')
                  ? (PRACTICE_TRACKS.find(t => t.id === filters.selectedTrack)?.shortName || filters.selectedTrack)
                  : 'All Targets'
              }
            </span>
            {/* Inline micro progress bar (when tracks selected) */}
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
                <div className="flex items-center gap-1.5">
                  <div className="w-20 h-1.5 rounded-full bg-slate-200 dark:bg-cyber-bg overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-emerald-500 dark:bg-emerald-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-cyber-muted">{rooted}/{total} ({pct}%)</span>
                </div>
              );
            })()}
          </div>
          
          {/* Right: Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Scan Importer */}
            <button
              onClick={() => setReconAutomationModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-cyber-bg/80 hover:bg-slate-100 dark:hover:bg-cyber-cardHover border border-slate-200 dark:border-cyber-border hover:border-slate-300 dark:hover:border-cyber-borderGlow text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white text-xs transition-all"
              title="Launch Tactical Scan Importer"
            >
              <Zap className="w-3.5 h-3.5 text-cyber-cyan" />
              <span className="hidden sm:inline">Import</span>
            </button>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-cyber-bg/80 p-0.5 rounded-lg border border-slate-200 dark:border-cyber-border">
              <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded transition-all ${viewMode === 'kanban' ? 'bg-white dark:bg-cyber-card text-cyan-600 dark:text-cyber-cyan border border-cyan-500/40 shadow-sm' : 'text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'}`} title="Kanban">
                <Kanban className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('table')} className={`p-1.5 rounded transition-all ${viewMode === 'table' ? 'bg-white dark:bg-cyber-card text-cyan-600 dark:text-cyber-cyan border border-cyan-500/40 shadow-sm' : 'text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'}`} title="Table">
                <Table className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-cyber-card text-cyan-600 dark:text-cyber-cyan border border-cyan-500/40 shadow-sm' : 'text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'}`} title="Grid">
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode('graph')} className={`p-1.5 rounded transition-all ${viewMode === 'graph' ? 'bg-white dark:bg-cyber-card text-cyan-600 dark:text-cyber-cyan border border-cyan-500/40 shadow-sm' : 'text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'}`} title="Graph">
                <Share2 className="w-3.5 h-3.5" />
              </button>
              {/* Embedded Hide Empty (kanban only) */}
              {viewMode === 'kanban' && (
                <>
                  <div className="w-px h-4 bg-slate-300 dark:bg-cyber-border mx-0.5" />
                  <button
                    onClick={() => { setFilters({ hideEmptyLanes: !filters.hideEmptyLanes }); if (soundEnabled) playCyberSound('toggle'); }}
                    className={`p-1.5 rounded transition-all ${filters.hideEmptyLanes ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300' : 'text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'}`}
                    title={filters.hideEmptyLanes ? 'Show Empty Lanes' : 'Hide Empty Lanes'}
                  >
                    {filters.hideEmptyLanes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </>
              )}
            </div>

            {/* Zen Mode */}
            <button
              onClick={toggleFocusMode}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${focusMode ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/60 shadow-[0_0_8px_rgba(6,182,212,0.3)] animate-pulse' : 'bg-slate-50 dark:bg-cyber-bg/80 border-slate-200 dark:border-cyber-border text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-cyber-borderGlow'}`}
              title={focusMode ? 'Exit Zen (Esc)' : 'Zen Mode'}
            >
              <Eye className={`w-3.5 h-3.5 ${focusMode ? 'text-cyan-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* Row 2: Search & Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-cyber-border/60">
          {/* Left: Search + Platform + OS + Difficulty */}
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px] max-w-[280px]">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400 dark:text-cyber-muted" />
              <input
                type="text"
                id="tracker-search-input"
                name="tracker-search-input"
                aria-label="Search machines"
                value={filters.searchQuery}
                onChange={(e) => setFilters({ searchQuery: e.target.value })}
                placeholder="Search..."
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-cyber-bg/80 border border-slate-200 dark:border-cyber-border rounded-lg text-xs text-slate-900 dark:text-cyber-text placeholder-slate-400 dark:placeholder-cyber-muted focus:outline-none focus:border-cyan-500 dark:focus:border-cyber-cyan font-sans"
              />
              {filters.searchQuery && (
                <button type="button" onClick={() => setFilters({ searchQuery: '' })} className="absolute right-2 top-2 text-xs text-slate-400 dark:text-cyber-muted hover:text-slate-700 dark:hover:text-white cursor-pointer">✕</button>
              )}
            </div>

            {/* Platform Segment Pills */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-cyber-bg/80 p-0.5 rounded-lg border border-slate-200 dark:border-cyber-border">
              {platformList.map((p) => {
                const active = filters.selectedPlatform === p;
                return (
                  <button
                    key={p}
                    onClick={() => { setFilters({ selectedPlatform: p }); if (soundEnabled) playCyberSound('toggle'); }}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${active ? 'bg-white dark:bg-cyber-card text-slate-900 dark:text-white border border-slate-300 dark:border-cyber-borderGlow font-bold shadow-sm' : 'text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'}`}
                  >
                    {p !== 'ALL' && <PlatformIcon platform={p as Platform} className="w-3 h-3" />}
                    <span>{p === 'ALL' ? 'All' : p}</span>
                  </button>
                );
              })}
            </div>

            {/* OS Dropdown (single canonical instance) */}
            <CyberSelect<'ALL' | OperatingSystem>
              id="htb-os-select"
              name="htb-os-select"
              aria-label="Filter OS"
              value={filters.selectedOs || 'ALL'}
              onChange={(val) => setFilters({ selectedOs: val })}
              options={HTB_OS_OPTIONS}
              size="xs"
              variant="default"
              soundEnabled={soundEnabled}
            />

            {/* Difficulty Dropdown (single canonical instance) */}
            <CyberSelect<Difficulty | 'ALL'>
              id="htb-difficulty-select"
              name="htb-difficulty-select"
              aria-label="Filter difficulty"
              value={filters.selectedDifficulty}
              onChange={(val) => setFilters({ selectedDifficulty: val })}
              options={DIFFICULTY_FILTER_OPTIONS}
              size="xs"
              variant="default"
              soundEnabled={soundEnabled}
            />
          </div>

          {/* Right: Filters Button + Sort + Counter */}
          <div className="flex items-center gap-2">
            {/* Advanced Filters Drawer Trigger */}
            <button
              onClick={() => { setFilterDrawerOpen(true); if (soundEnabled) playCyberSound('click'); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm cursor-pointer ${
                activeFilterCount > 0
                  ? 'bg-cyber-cyan/15 border-cyber-cyan text-slate-900 dark:text-white font-bold'
                  : 'bg-slate-50 dark:bg-cyber-bg/80 border-slate-200 dark:border-cyber-border text-slate-700 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-cyber-borderGlow'
              }`}
              title="Open Advanced Filters"
            >
              <Filter className="w-3.5 h-3.5 text-cyber-cyan" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-cyber-cyan text-slate-900 dark:text-black leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-cyber-bg/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-cyber-border">
              <ArrowUpDown className="w-3 h-3 text-cyber-cyan flex-shrink-0" />
              <CyberSelect
                id="tracker-sort-select"
                name="tracker-sort-select"
                aria-label="Sort targets"
                value={filters.sortBy || 'default'}
                onChange={(val) => setFilters({ sortBy: val as any })}
                options={SORT_OPTIONS}
                variant="transparent"
                size="xs"
                triggerClassName="py-0 px-1 border-none bg-transparent hover:bg-transparent text-slate-800 dark:text-cyber-text font-sans"
                soundEnabled={soundEnabled}
              />
            </div>

            {/* Result Counter */}
            <span className="text-slate-500 dark:text-cyber-muted text-[11px] whitespace-nowrap font-mono">
              <strong className="text-slate-900 dark:text-white">{filteredMachines.length}</strong>
              <span className="mx-0.5">/</span>
              {machines.length}
            </span>
          </div>
        </div>
      </div>

      )}
      {/* Slide-over Filter Drawer */}
      <FilterDrawer />

      {/* Main View Renderer */}
      {viewMode === 'kanban' && <KanbanBoard filteredMachines={filteredMachines} />}
      {viewMode === 'table' && <TableView filteredMachines={filteredMachines} />}
      {viewMode === 'grid' && <GridView filteredMachines={filteredMachines} />}
      {viewMode === 'graph' && <GraphView filteredMachines={filteredMachines} />}
    </div>
  );
};

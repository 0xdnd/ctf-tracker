import { createPortal } from 'react-dom';
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { 
  X, 
  RotateCcw, 
  Check, 
  SlidersHorizontal, 
  ShieldAlert, 
  Layers, 
  Tag, 
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Globe,
  Target,
  Shield,
  Key,
  Terminal,
  Filter,
  Sparkles,
  Zap,
  Award,
  GraduationCap
} from 'lucide-react';
import { useCtfStore, HtbTargetStatus } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { PRACTICE_TRACKS, PracticeTrack } from '../../data/tracksData';
import { Platform, Difficulty, OperatingSystem } from '../../types';
import { VULN_CATEGORIES, VULN_DOMAINS, VulnDomainId, classifyMachine, matchesCategory, matchesDomain, isActiveDirectory } from '../../utils/categoryUtils';
import { playCyberSound } from '../../utils/helpers';
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';

const STATUS_OPTIONS: { value: HtbTargetStatus; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'UNCOMPLETED', label: 'Uncompleted' },
  { value: 'FOOTHOLD', label: 'Foothold' },
  { value: 'COMPLETED', label: 'Completed' },
];

const CERT_OPTIONS: ('ALL' | 'OSCP' | 'CPTS' | 'CRTO')[] = ['ALL', 'OSCP', 'CPTS', 'CRTO'];

const LANGUAGE_OPTIONS: CyberSelectOption<string>[] = [
  { value: 'ALL', label: 'All Languages' },
  { value: 'Python', label: 'Python (Django, Flask)' },
  { value: 'PHP', label: 'PHP (Laravel, WordPress)' },
  { value: 'NodeJS', label: 'Node.js / JavaScript' },
  { value: 'Java', label: 'Java (Spring, Tomcat)' },
  { value: 'C#', label: 'C# / .NET / IIS' },
  { value: 'C/C++', label: 'C / C++ (Binaries / BOF)' },
  { value: 'Go', label: 'Go (Golang)' },
  { value: 'Ruby', label: 'Ruby on Rails' },
  { value: 'Bash', label: 'Bash / Shell Scripting' },
  { value: 'PowerShell', label: 'PowerShell (.ps1)' },
];

const AREA_OF_INTEREST_OPTIONS: CyberSelectOption<string>[] = [
  { value: 'ALL', label: 'All Areas of Interest' },
  { value: 'Web Application', label: 'Web Application Exploitation' },
  { value: 'Active Directory', label: 'Active Directory & Domain Trusts' },
  { value: 'Cloud Security', label: 'Cloud Security (AWS / Azure)' },
  { value: 'Binary Exploitation', label: 'Binary Exploitation (Pwn / ROP)' },
  { value: 'Cryptography', label: 'Cryptography & Ciphers' },
  { value: 'Reverse Engineering', label: 'Reverse Engineering (Ghidra)' },
  { value: 'Forensics', label: 'Digital Forensics & PCAP' },
  { value: 'Network Security', label: 'Network & Protocol Security' },
];

const VULNERABILITY_OPTIONS: CyberSelectOption<string>[] = [
  { value: 'ALL', label: 'All Vulnerabilities' },
  { value: 'SQL Injection', label: 'SQL Injection (SQLi)' },
  { value: 'RCE / Command Injection', label: 'Remote Code Execution (RCE)' },
  { value: 'LFI / Path Traversal', label: 'LFI / Path Traversal' },
  { value: 'SSRF', label: 'Server-Side Request Forgery (SSRF)' },
  { value: 'Insecure Deserialization', label: 'Insecure Deserialization' },
  { value: 'Authentication Bypass', label: 'Authentication Bypass' },
  { value: 'Privilege Escalation', label: 'Privilege Escalation' },
  { value: 'Buffer Overflow', label: 'Buffer Overflow (BOF)' },
  { value: 'File Upload Bypass', label: 'Arbitrary File Upload Bypass' },
  { value: 'IDOR', label: 'IDOR / Broken Object Level Auth' },
  { value: 'XXE', label: 'XML External Entity (XXE)' },
  { value: 'CSRF', label: 'Cross-Site Request Forgery (CSRF)' },
  { value: 'Misconfiguration', label: 'Security Misconfiguration' },
];

const PLATFORM_FILTER_OPTIONS: { value: Platform | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'HTB', label: 'HTB' },
  { value: 'THM', label: 'THM' },
  { value: 'Custom', label: 'Custom' },
];

const OS_FILTER_OPTIONS: { value: 'ALL' | OperatingSystem; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'Linux', label: 'Linux' },
  { value: 'Windows', label: 'Windows' },
  { value: 'BSD', label: 'BSD' },
  { value: 'Android', label: 'Android' },
  { value: 'macOS', label: 'macOS' },
  { value: 'Other', label: 'Other' },
];

const DIFFICULTY_FILTER_OPTIONS: { value: Difficulty | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'Very Easy', label: 'Very Easy' },
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
  { value: 'Insane', label: 'Insane' },
];

const FilterChip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`h-7 px-2.5 rounded-lg text-xs font-medium border transition-colors active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:h-11 ${
      active
        ? 'border-accent bg-accent-muted text-accent'
        : 'border-subtle bg-surface-card text-secondary hover:bg-surface-hover hover:text-primary'
    }`}
  >
    {children}
  </button>
);

const AccordionSection: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  sectionKey: string;
  isOpen: boolean;
  onToggle: (key: string) => void;
  badgeCount?: number;
  badgeContent?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, sectionKey, isOpen, onToggle, badgeCount, badgeContent, children }) => (
  <div className="border-t border-subtle pt-3">
    <button
      type="button"
      onClick={() => onToggle(sectionKey)}
      aria-expanded={isOpen}
      className="w-full flex items-center justify-between gap-2 py-1.5 text-left group rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer [@media(pointer:coarse)]:min-h-11"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary font-sans">{title}</span>
          {badgeCount !== undefined && badgeCount > 0 && (
            <span className="text-xs px-1.5 h-5 inline-flex items-center rounded bg-accent-muted text-accent font-medium tabular-nums border border-accent/30">
              {badgeCount}
            </span>
          )}
          {badgeContent}
        </div>
        {subtitle && (
          <div className="text-xs text-tertiary truncate font-sans mt-0.5">{subtitle}</div>
        )}
      </div>
      <div className="text-tertiary group-hover:text-primary transition-colors">
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </div>
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0, transition: { duration: 0.12, ease: 'easeOut' } }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className="pt-3 pb-1 space-y-3.5 font-sans text-xs">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export const FilterDrawer: React.FC = () => {
  const {
    filterDrawerOpen,
    setFilterDrawerOpen,
    filters,
    setFilters,
    resetFilters,
    machines: liveMachines,
    soundEnabled,
  } = useCtfStore(
    useShallow((s) => ({
      filterDrawerOpen: s.filterDrawerOpen,
      setFilterDrawerOpen: s.setFilterDrawerOpen,
      filters: s.filters,
      setFilters: s.setFilters,
      resetFilters: s.resetFilters,
      machines: s.machines,
      soundEnabled: s.soundEnabled,
    }))
  );

  // Always mounted: derive its counts from a deferred copy so the catalog swap re-render stays interruptible.
  const machines = React.useDeferredValue(liveMachines);

  const trapRef = useFocusTrap<HTMLDivElement>({
    isActive: filterDrawerOpen,
    onClose: () => setFilterDrawerOpen(false),
  });

  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [trackSearchTerm, setTrackSearchTerm] = useState('');
  const [drawerDomain, setDrawerDomain] = useState<VulnDomainId>('all');
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    target: true,
    status: true,
    tracks: false,
    domains: false,
    specialized: false,
    tags: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    if (soundEnabled) playCyberSound('click');
  };

  const activeTrackIds: string[] = useMemo(() => {
    return filters.selectedTracks && filters.selectedTracks.length > 0
      ? filters.selectedTracks
      : (filters.selectedTrack && filters.selectedTrack !== 'ALL' ? [filters.selectedTrack] : []);
  }, [filters.selectedTracks, filters.selectedTrack]);

  const { categoryCounts } = useMemo(() => {
    const catCounts: Record<string, number> = { ALL: machines.length };
    VULN_CATEGORIES.forEach(c => { catCounts[c.id] = 0; });
    machines.forEach(m => {
      const res = classifyMachine(m);
      res.categories.forEach(catId => { if (catCounts[catId] !== undefined) catCounts[catId]++; });
    });
    return { categoryCounts: catCounts };
  }, [machines]);

  const displayedCategories = useMemo(() => {
    if (drawerDomain === 'all') {
      return [...VULN_CATEGORIES].sort((a, b) => (categoryCounts[b.id] || 0) - (categoryCounts[a.id] || 0)).slice(0, 12);
    }
    return VULN_CATEGORIES.filter(c => c.domain === drawerDomain);
  }, [drawerDomain, categoryCounts]);

  const techniqueOptions = useMemo((): CyberSelectOption<string>[] => {
    const os = filters.selectedOs;
    if (os === 'Linux') {
      return [
        { value: 'ALL', label: 'All Techniques' },
        { value: 'SUID / SGID Exploitation', label: 'SUID / SGID Exploitation' },
        { value: 'Sudo Rights (sudo -l)', label: 'Sudo Rights (sudo -l)' },
        { value: 'Cron Jobs / Wildcard Injection', label: 'Cron Jobs / Wildcards' },
        { value: 'Kernel Exploits / Dirty COW', label: 'Kernel Exploits (Dirty COW)' },
        { value: 'Docker Breakout / Socket', label: 'Docker Breakout / Socket' },
      ];
    } else if (os === 'Windows') {
      return [
        { value: 'ALL', label: 'All Techniques' },
        { value: 'Kerberoasting (TGS Request)', label: 'Kerberoasting (TGS Request)' },
        { value: 'AS-REP Roasting', label: 'AS-REP Roasting' },
        { value: 'DCSync / NTDS.dit', label: 'DCSync / NTDS.dit Extraction' },
        { value: 'SeImpersonate (JuicyPotato / PrintSpoofer)', label: 'SeImpersonate (Juicy / Print)' },
        { value: 'BloodHound Attack Paths', label: 'BloodHound Attack Paths' },
      ];
    }
    return [
      { value: 'ALL', label: 'All Techniques' },
      { value: 'SUID / SGID Exploitation', label: 'Linux: SUID / SGID' },
      { value: 'Sudo Rights (sudo -l)', label: 'Linux: Sudo Rights' },
      { value: 'Kerberoasting (TGS Request)', label: 'Win: Kerberoasting' },
      { value: 'SeImpersonate (JuicyPotato / PrintSpoofer)', label: 'Win: SeImpersonate' },
      { value: 'BloodHound Attack Paths', label: 'Win: BloodHound Paths' },
    ];
  }, [filters.selectedOs]);

  const { allTags, tagCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    machines.forEach((m) => {
      m.tags.forEach((t) => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    const tags = Object.keys(counts).sort();
    return { allTags: tags, tagCounts: counts };
  }, [machines]);

  const displayedTags = useMemo(() => {
    if (!tagSearchTerm.trim()) return allTags;
    const q = tagSearchTerm.toLowerCase();
    return allTags.filter((t) => t.toLowerCase().includes(q));
  }, [allTags, tagSearchTerm]);

  const trackCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    PRACTICE_TRACKS.forEach((track) => {
      counts[track.id] = machines.filter(track.filterFn).length;
    });
    return counts;
  }, [machines]);

  const displayedTracks = useMemo(() => {
    if (!trackSearchTerm.trim()) return PRACTICE_TRACKS;
    const q = trackSearchTerm.toLowerCase();
    return PRACTICE_TRACKS.filter((t) => 
      t.name.toLowerCase().includes(q) || 
      t.description.toLowerCase().includes(q) ||
      t.shortName.toLowerCase().includes(q)
    );
  }, [trackSearchTerm]);

  const handleToggleTrack = (trackId: string) => {
    const next = activeTrackIds.includes(trackId)
      ? activeTrackIds.filter((id) => id !== trackId)
      : [...activeTrackIds, trackId];
    setFilters({
      selectedTracks: next,
      selectedTrack: next.length === 1 ? next[0] : (next.length > 1 ? 'MULTI' : 'ALL'),
    });
    if (soundEnabled) playCyberSound('toggle');
  };

  const handleSelectAllTracks = () => {
    const allIds = PRACTICE_TRACKS.map((t) => t.id);
    setFilters({ selectedTracks: allIds, selectedTrack: 'MULTI' });
    if (soundEnabled) playCyberSound('click');
  };

  const handleClearTracks = () => {
    setFilters({ selectedTracks: [], selectedTrack: 'ALL' });
    if (soundEnabled) playCyberSound('click');
  };

  const handleTagToggle = (tag: string) => {
    if (filters.selectedTags.includes(tag)) {
      setFilters({ selectedTags: filters.selectedTags.filter((t) => t !== tag) });
    } else {
      setFilters({ selectedTags: [...filters.selectedTags, tag] });
    }
    if (soundEnabled) playCyberSound('toggle');
  };

  // Live matching target count computation
  const matchingMachinesCount = useMemo(() => {
    const q = filters.searchQuery ? filters.searchQuery.trim().toLowerCase() : '';
    const statusFilter = filters.selectedStatus || 'ALL';
    const certFilter = filters.selectedCert;
    const excludeAD = Boolean(filters.excludeActiveDirectory);
    const vulnCatFilter = filters.selectedVulnCategory;
    const langFilter = filters.selectedLanguage;
    const areaFilter = filters.selectedAreaOfInterest;
    const techFilter = filters.selectedTechnique;

    const activeTracks = activeTrackIds
      .map((id) => PRACTICE_TRACKS.find((t) => t.id === id))
      .filter(Boolean) as PracticeTrack[];

    return machines.filter((m) => {
      if (filters.selectedPlatform !== 'ALL' && m.platform !== filters.selectedPlatform) return false;
      if (filters.selectedDifficulty !== 'ALL' && m.difficulty !== filters.selectedDifficulty) return false;
      if (filters.selectedOs && filters.selectedOs !== 'ALL' && m.os !== filters.selectedOs) return false;
      if (certFilter !== 'ALL' && !m.certifications.includes(certFilter)) return false;

      if (statusFilter !== 'ALL') {
        const isCompleted = m.status === 'root' || m.status === 'completed';
        const isFoothold = m.status === 'foothold';
        if (statusFilter === 'UNCOMPLETED' && isCompleted) return false;
        if (statusFilter === 'FOOTHOLD' && !isFoothold) return false;
        if (statusFilter === 'COMPLETED' && !isCompleted) return false;
      }

      if (excludeAD && isActiveDirectory(m)) return false;

      if (drawerDomain !== 'all' && (!vulnCatFilter || vulnCatFilter === 'ALL')) {
        if (!matchesDomain(m, drawerDomain)) return false;
      }

      if (vulnCatFilter && vulnCatFilter !== 'ALL') {
        if (!matchesCategory(m, vulnCatFilter)) return false;
      }

      if (activeTracks.length > 0 && !activeTracks.some((t) => t.filterFn(m))) {
        return false;
      }

      if (q) {
        const matchName = m.name.toLowerCase().includes(q);
        const matchIp = m.ip.includes(q);
        const matchOs = m.os.toLowerCase().includes(q);
        const matchTag = m.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchIp && !matchOs && !matchTag) return false;
      }

      if (filters.selectedTags.length > 0) {
        if (!filters.selectedTags.every((t) => m.tags.includes(t))) return false;
      }

      if (langFilter && langFilter !== 'ALL') {
        const l = langFilter.toLowerCase();
        const textToSearch = `${m.tags.join(' ')} ${m.name} ${m.officialSynopsis || ''} ${(m.skillsLearned || []).join(' ')} ${m.hint || ''}`.toLowerCase();
        let matchesLang = false;
        if (l === 'python') matchesLang = /python|flask|django|\bpy\b/i.test(textToSearch);
        else if (l === 'php') matchesLang = /php|laravel|wordpress/i.test(textToSearch);
        else if (l === 'nodejs' || l === 'javascript') matchesLang = /node|javascript|\bjs\b|express/i.test(textToSearch);
        else if (l === 'java') matchesLang = /java|spring|tomcat/i.test(textToSearch);
        else if (l === 'c#') matchesLang = /c#|\.net|asp\.net|iis/i.test(textToSearch);
        else if (l === 'c/c++') matchesLang = /\bc\b|\bc\+\+|bof|buffer overflow|binary/i.test(textToSearch);
        else if (l === 'go') matchesLang = /\bgo\b|golang/i.test(textToSearch);
        else if (l === 'ruby') matchesLang = /ruby|rails/i.test(textToSearch);
        else if (l === 'bash') matchesLang = /bash|shell|sh\b/i.test(textToSearch);
        else if (l === 'powershell') matchesLang = /powershell|ps1/i.test(textToSearch);
        if (!matchesLang) return false;
      }

      if (areaFilter && areaFilter !== 'ALL') {
        const a = areaFilter.toLowerCase();
        const textToSearch = `${m.tags.join(' ')} ${m.name} ${m.officialSynopsis || ''} ${(m.skillsLearned || []).join(' ')}`.toLowerCase();
        if (a.includes('web') && !textToSearch.includes('web') && !m.tags.some(t => /web|http|api|injection/i.test(t))) return false;
        if (a.includes('active directory') && !isActiveDirectory(m)) return false;
        if (a.includes('cloud') && !textToSearch.includes('cloud') && !m.tags.some(t => /cloud|aws|azure/i.test(t))) return false;
        if (a.includes('binary') && !m.tags.some(t => /pwn|bof|binary|buffer/i.test(t))) return false;
        if (a.includes('crypto') && !m.tags.some(t => /crypto|cipher|rsa/i.test(t))) return false;
        if (a.includes('reverse') && !m.tags.some(t => /reverse|ghidra|reversing/i.test(t))) return false;
        if (a.includes('forensics') && !m.tags.some(t => /forensics|wireshark|pcap|memory/i.test(t))) return false;
      }

      if (techFilter && techFilter !== 'ALL') {
        const textToSearch = `${m.tags.join(' ')} ${m.name} ${m.officialSynopsis || ''} ${(m.skillsLearned || []).join(' ')}`.toLowerCase();
        const t = techFilter.toLowerCase();
        if (t.includes('suid') && !textToSearch.includes('suid')) return false;
        if (t.includes('sudo') && !textToSearch.includes('sudo')) return false;
        if (t.includes('cron') && !textToSearch.includes('cron')) return false;
        if (t.includes('kerberoast') && !textToSearch.includes('kerberoast') && !textToSearch.includes('tgs')) return false;
        if (t.includes('as-rep') && !textToSearch.includes('as-rep') && !textToSearch.includes('asrep')) return false;
        if (t.includes('dcsync') && !textToSearch.includes('dcsync') && !textToSearch.includes('ntds')) return false;
        if (t.includes('seimpersonate') && !textToSearch.includes('seimpersonate') && !textToSearch.includes('potato')) return false;
        if (t.includes('bloodhound') && !textToSearch.includes('bloodhound')) return false;
      }

      return true;
    }).length;
  }, [machines, filters, activeTrackIds, drawerDomain]);

  // Construct active filter chips list
  const activeFilterList = useMemo(() => {
    const list: { label: string; onRemove: () => void }[] = [];

    if (filters.selectedPlatform && filters.selectedPlatform !== 'ALL') {
      list.push({
        label: `Platform: ${filters.selectedPlatform}`,
        onRemove: () => setFilters({ selectedPlatform: 'ALL' }),
      });
    }

    if (filters.selectedDifficulty && filters.selectedDifficulty !== 'ALL') {
      list.push({
        label: `Diff: ${filters.selectedDifficulty}`,
        onRemove: () => setFilters({ selectedDifficulty: 'ALL' }),
      });
    }

    if (filters.selectedOs && filters.selectedOs !== 'ALL') {
      list.push({
        label: `OS: ${filters.selectedOs}`,
        onRemove: () => setFilters({ selectedOs: 'ALL' }),
      });
    }

    if (filters.selectedStatus && filters.selectedStatus !== 'ALL') {
      const opt = STATUS_OPTIONS.find(s => s.value === filters.selectedStatus);
      list.push({
        label: `Status: ${opt?.label || filters.selectedStatus}`,
        onRemove: () => setFilters({ selectedStatus: 'ALL' })
      });
    }

    if (filters.selectedCert && filters.selectedCert !== 'ALL') {
      list.push({
        label: `Cert: ${filters.selectedCert}`,
        onRemove: () => setFilters({ selectedCert: 'ALL' })
      });
    }

    if (filters.excludeActiveDirectory) {
      list.push({
        label: 'Exclude AD',
        onRemove: () => setFilters({ excludeActiveDirectory: false })
      });
    }

    activeTrackIds.forEach((tId) => {
      const track = PRACTICE_TRACKS.find(t => t.id === tId);
      list.push({
        label: `Track: ${track ? track.shortName : tId}`,
        onRemove: () => handleToggleTrack(tId)
      });
    });

    if (drawerDomain !== 'all') {
      const d = VULN_DOMAINS.find(dm => dm.id === drawerDomain);
      list.push({
        label: `Domain: ${d ? d.shortLabel : drawerDomain}`,
        onRemove: () => setDrawerDomain('all')
      });
    }

    if (filters.selectedVulnCategory && filters.selectedVulnCategory !== 'ALL') {
      list.push({
        label: `Vuln: ${filters.selectedVulnCategory}`,
        onRemove: () => setFilters({ selectedVulnCategory: 'ALL' })
      });
    }

    if (filters.selectedLanguage && filters.selectedLanguage !== 'ALL') {
      list.push({
        label: `Lang: ${filters.selectedLanguage}`,
        onRemove: () => setFilters({ selectedLanguage: 'ALL' })
      });
    }

    if (filters.selectedAreaOfInterest && filters.selectedAreaOfInterest !== 'ALL') {
      list.push({
        label: `Area: ${filters.selectedAreaOfInterest}`,
        onRemove: () => setFilters({ selectedAreaOfInterest: 'ALL' })
      });
    }

    if (filters.selectedTechnique && filters.selectedTechnique !== 'ALL') {
      list.push({
        label: `Tech: ${filters.selectedTechnique}`,
        onRemove: () => setFilters({ selectedTechnique: 'ALL' })
      });
    }

    filters.selectedTags.forEach((tag) => {
      list.push({
        label: `#${tag}`,
        onRemove: () => handleTagToggle(tag)
      });
    });

    return list;
  }, [filters, activeTrackIds, drawerDomain]);

  // Subtitle previews for headers
  const targetSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (filters.selectedPlatform && filters.selectedPlatform !== 'ALL') parts.push(filters.selectedPlatform);
    if (filters.selectedOs && filters.selectedOs !== 'ALL') parts.push(filters.selectedOs);
    if (filters.selectedDifficulty && filters.selectedDifficulty !== 'ALL') parts.push(filters.selectedDifficulty);
    return parts.length > 0 ? parts.join(' · ') : 'All platforms, systems and difficulties';
  }, [filters.selectedPlatform, filters.selectedOs, filters.selectedDifficulty]);

  const statusSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (filters.selectedStatus && filters.selectedStatus !== 'ALL') {
      const opt = STATUS_OPTIONS.find(s => s.value === filters.selectedStatus);
      parts.push(opt?.label || filters.selectedStatus);
    }
    if (filters.selectedCert && filters.selectedCert !== 'ALL') {
      parts.push(`Cert: ${filters.selectedCert}`);
    }
    if (filters.excludeActiveDirectory) {
      parts.push('No AD');
    }
    return parts.length > 0 ? parts.join(' · ') : 'All Statuses & Certifications';
  }, [filters.selectedStatus, filters.selectedCert, filters.excludeActiveDirectory]);

  const tracksSubtitle = useMemo(() => {
    if (activeTrackIds.length === 0) return 'No tracks selected';
    if (activeTrackIds.length === 1) {
      const tr = PRACTICE_TRACKS.find(t => t.id === activeTrackIds[0]);
      return tr ? tr.name : '1 Track selected';
    }
    return `${activeTrackIds.length} Tracks selected`;
  }, [activeTrackIds]);

  const domainsSubtitle = useMemo(() => {
    const d = VULN_DOMAINS.find(dm => dm.id === drawerDomain)?.shortLabel || 'All Vectors';
    if (filters.selectedVulnCategory && filters.selectedVulnCategory !== 'ALL') {
      return `${d} · ${filters.selectedVulnCategory}`;
    }
    return d;
  }, [drawerDomain, filters.selectedVulnCategory]);

  const specializedSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (filters.selectedLanguage && filters.selectedLanguage !== 'ALL') parts.push(filters.selectedLanguage);
    if (filters.selectedAreaOfInterest && filters.selectedAreaOfInterest !== 'ALL') parts.push(filters.selectedAreaOfInterest);
    if (filters.selectedTechnique && filters.selectedTechnique !== 'ALL') parts.push(filters.selectedTechnique);
    return parts.length > 0 ? parts.join(' · ') : 'Language, Area & Techniques';
  }, [filters.selectedLanguage, filters.selectedAreaOfInterest, filters.selectedTechnique]);

  const tagsSubtitle = useMemo(() => {
    if (filters.selectedTags.length === 0) return 'No tags selected';
    return `${filters.selectedTags.length} tag${filters.selectedTags.length > 1 ? 's' : ''} applied`;
  }, [filters.selectedTags]);

  if (!filterDrawerOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-surface-inverse/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => setFilterDrawerOpen(false)}
      />
      
      {/* Slide-out Drawer */}
      <div 
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Advanced filters drawer"
        className="absolute inset-y-0 right-0 w-full max-w-[420px] sm:max-w-[460px] bg-surface-card border-l border-subtle shadow-2xl flex flex-col will-change-transform animate-in slide-in-from-right duration-200"
        style={{ transform: 'translate3d(0, 0, 0)', contain: 'layout paint' }}
      >
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-subtle bg-surface-card">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base text-primary font-sans tracking-tight">
                Advanced Filters
              </h2>
              {activeFilterList.length > 0 && (
                <span className="px-1.5 h-5 inline-flex items-center rounded text-xs font-medium tabular-nums bg-accent-muted text-accent border border-accent/30">
                  {activeFilterList.length} active
                </span>
              )}
            </div>
            <div className="text-xs text-tertiary font-sans">
              Narrow targets by platform, OS, difficulty and more
            </div>
          </div>
          <div className="flex items-center gap-1">
            {activeFilterList.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  resetFilters();
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className="text-xs text-muted hover:text-primary font-medium px-2 h-8 rounded-lg hover:bg-surface-hover flex items-center gap-1 transition-colors active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:h-11"
                title="Reset all active filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
            <button
              onClick={() => setFilterDrawerOpen(false)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-tertiary hover:text-primary hover:bg-surface-hover transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer active:scale-[0.97] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11"
              title="Close Drawer (Esc)"
              aria-label="Close filter drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 custom-scrollbar">

          {/* Match count */}
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-sm text-secondary font-sans">
              <span className="font-mono tabular-nums font-semibold text-primary">{matchingMachinesCount}</span>
              <span className="text-muted"> of </span>
              <span className="font-mono tabular-nums">{machines.length}</span>
              <span className="text-muted"> targets match</span>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar" aria-label="Active filters">
              {activeFilterList.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-md text-xs font-medium bg-surface-sunken text-secondary border border-subtle"
                >
                  <span className="truncate max-w-[180px]">{item.label}</span>
                  <button
                    aria-label="Remove filter"
                    type="button"
                    onClick={item.onRemove}
                    className="inline-flex items-center justify-center w-4 h-4 rounded text-tertiary hover:text-primary hover:bg-surface-hover transition-colors cursor-pointer"
                    title="Remove filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Quick presets */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted font-sans">Quick presets</div>
            <div className="flex flex-wrap gap-1.5">
              {([
                {
                  label: 'OSCP Sprint',
                  title: 'Filter for unsolved OSCP machines',
                  active: filters.selectedCert === 'OSCP' && filters.selectedStatus === 'UNCOMPLETED',
                  apply: () => setFilters({ selectedCert: 'OSCP', selectedStatus: 'UNCOMPLETED' }),
                },
                {
                  label: 'Active Directory',
                  title: 'Filter for Active Directory lab environments',
                  active: filters.selectedVulnCategory === 'Active Directory' && !filters.excludeActiveDirectory,
                  apply: () => setFilters({ selectedVulnCategory: 'Active Directory', excludeActiveDirectory: false }),
                },
                {
                  label: 'Web Exploits',
                  title: 'Filter for Web Application exploits',
                  active: filters.selectedAreaOfInterest === 'Web Application',
                  apply: () => setFilters({ selectedAreaOfInterest: 'Web Application', selectedVulnCategory: 'ALL' }),
                },
                {
                  label: 'Easy Unsolved',
                  title: 'Filter for Easy uncompleted machines',
                  active: filters.selectedDifficulty === 'Easy' && filters.selectedStatus === 'UNCOMPLETED',
                  apply: () => setFilters({ selectedDifficulty: 'Easy', selectedStatus: 'UNCOMPLETED' }),
                },
                {
                  label: 'Completed Solves',
                  title: 'Filter for Completed and Pwned solves',
                  active: filters.selectedStatus === 'COMPLETED',
                  apply: () => setFilters({ selectedStatus: 'COMPLETED' }),
                },
                {
                  label: 'CPTS Win',
                  title: 'Filter for CPTS Windows track',
                  active: activeTrackIds.includes('cpts-windows'),
                  apply: () => setFilters({ selectedTracks: ['cpts-windows'], selectedTrack: 'cpts-windows' }),
                },
              ]).map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    preset.apply();
                    if (soundEnabled) playCyberSound('toggle');
                  }}
                  aria-pressed={preset.active}
                  className={`h-7 px-2.5 rounded-lg text-xs font-medium border transition-colors active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:h-11 ${
                    preset.active
                      ? 'border-accent bg-accent-muted text-accent'
                      : 'border-subtle bg-surface-card text-secondary hover:bg-surface-hover hover:text-primary'
                  }`}
                  title={preset.title}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 0: Platform, OS & difficulty (moved here from the toolbar) */}
          <AccordionSection
            title="Platform, OS & Difficulty"
            subtitle={targetSubtitle}
            icon={<Layers className="w-4 h-4" />}
            sectionKey="target"
            isOpen={openSections.target}
            onToggle={toggleSection}
            badgeCount={(filters.selectedPlatform !== 'ALL' ? 1 : 0) + (filters.selectedOs && filters.selectedOs !== 'ALL' ? 1 : 0) + (filters.selectedDifficulty !== 'ALL' ? 1 : 0)}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-secondary">Platform</div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Platform">
                  {PLATFORM_FILTER_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      active={filters.selectedPlatform === opt.value}
                      onClick={() => {
                        setFilters({ selectedPlatform: opt.value });
                        if (soundEnabled) playCyberSound('toggle');
                      }}
                    >
                      {opt.label}
                    </FilterChip>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-secondary">Operating system</div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Operating system">
                  {OS_FILTER_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      active={(filters.selectedOs || 'ALL') === opt.value}
                      onClick={() => {
                        setFilters({ selectedOs: opt.value });
                        if (soundEnabled) playCyberSound('toggle');
                      }}
                    >
                      {opt.label}
                    </FilterChip>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-secondary">Difficulty</div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Difficulty">
                  {DIFFICULTY_FILTER_OPTIONS.map((opt) => (
                    <FilterChip
                      key={opt.value}
                      active={filters.selectedDifficulty === opt.value}
                      onClick={() => {
                        setFilters({ selectedDifficulty: opt.value });
                        if (soundEnabled) playCyberSound('toggle');
                      }}
                    >
                      {opt.label}
                    </FilterChip>
                  ))}
                </div>
              </div>
            </div>
          </AccordionSection>

          {/* Section 1: Status & Completion */}
          <AccordionSection
            title="Status & Certification Scopes"
            subtitle={statusSubtitle}
            icon={<CheckCircle2 className="w-4 h-4 text-accent" />}
            sectionKey="status"
            isOpen={openSections.status}
            onToggle={toggleSection}
            badgeCount={(filters.selectedStatus && filters.selectedStatus !== 'ALL' ? 1 : 0) + (filters.selectedCert !== 'ALL' ? 1 : 0) + (filters.excludeActiveDirectory ? 1 : 0)}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-secondary font-semibold block">Target Completion Status</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {STATUS_OPTIONS.map((st) => {
                    const isSelected = (filters.selectedStatus || 'ALL') === st.value;
                    return (
                      <button
                        key={st.value}
                        type="button"
                        onClick={() => {
                          setFilters({ selectedStatus: st.value });
                          if (soundEnabled) playCyberSound('toggle');
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'border-accent bg-accent-muted text-accent shadow-sm'
                            : 'border-subtle text-muted hover:text-primary hover:border-strong'
                        }`}
                      >
                        <span>{st.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-subtle">
                <label className="text-xs text-secondary font-semibold block">Certification Scopes</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {CERT_OPTIONS.map((cert) => {
                    const isSelected = filters.selectedCert === cert;
                    return (
                      <button
                        key={cert}
                        type="button"
                        onClick={() => {
                          setFilters({ selectedCert: cert });
                          if (soundEnabled) playCyberSound('toggle');
                        }}
                        className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors text-center ${
                          isSelected
                            ? 'border-accent bg-accent-muted text-accent shadow-sm'
                            : 'border-subtle text-muted hover:text-primary hover:border-strong'
                        }`}
                      >
                        {cert}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-subtle">
                <label className="flex items-center justify-between cursor-pointer group py-1">
                  <div>
                    <span className="text-xs font-semibold text-secondary group-hover:text-accent transition-colors">
                      Exclude Active Directory
                    </span>
                    <span className="block text-xs text-tertiary">
                      Hide domains, Kerberos, and forest lab boxes
                    </span>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${filters.excludeActiveDirectory ? 'bg-accent' : 'bg-surface-hover'}`}>
                    <div className={`w-4 h-4 rounded-full bg-surface-card transition-transform ${filters.excludeActiveDirectory ? 'translate-x-4' : 'translate-x-0 bg-surface-hover'}`} />
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={Boolean(filters.excludeActiveDirectory)}
                    onChange={(e) => {
                      setFilters({ excludeActiveDirectory: e.target.checked });
                      if (soundEnabled) playCyberSound('toggle');
                    }}
                  />
                </label>
              </div>
            </div>
          </AccordionSection>

          {/* Section 2: Practice Tracks */}
          <AccordionSection
            title="Curated Practice Tracks"
            subtitle={tracksSubtitle}
            icon={<Target className="w-4 h-4 text-callout-danger-fg" />}
            sectionKey="tracks"
            isOpen={openSections.tracks}
            onToggle={toggleSection}
            badgeCount={activeTrackIds.length}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllTracks}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-subtle text-xs font-semibold text-muted hover:text-primary hover:border-strong transition-colors text-center"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearTracks}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-subtle text-xs font-semibold text-muted hover:text-primary hover:border-strong transition-colors text-center"
                >
                  Clear Tracks
                </button>
              </div>

              {/* Track Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-tertiary" />
                <input
                  type="text"
                  placeholder="Search curated tracks..."
                  value={trackSearchTerm}
                  onChange={(e) => setTrackSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-surface-sunken border border-subtle rounded-lg text-xs text-secondary focus:outline-none focus:border-accent"
                />
                {trackSearchTerm && (
                  <button aria-label="Clear track search" onClick={() => setTrackSearchTerm('')} className="absolute right-2 top-2">
                    <X className="w-3.5 h-3.5 text-tertiary hover:text-muted" />
                  </button>
                )}
              </div>

              {/* Track List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 border border-subtle rounded-xl p-1.5 bg-surface-sunken/50 custom-scrollbar">
                {displayedTracks.map((track) => {
                  const isSelected = activeTrackIds.includes(track.id);
                  const count = trackCounts[track.id] || 0;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => handleToggleTrack(track.id)}
                      className={`w-full px-3 py-2 rounded-lg border text-left flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'border-accent/50 bg-accent-muted text-accent font-semibold shadow-sm'
                          : 'border-transparent hover:bg-surface-sunken text-muted hover:text-primary'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate text-xs">{track.name}</div>
                        <div className="text-xs text-tertiary truncate font-normal">{track.description}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs px-1.5 py-0.5 rounded font-mono font-normal bg-surface-hover/60 text-muted">
                          {count}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </AccordionSection>

          {/* Section 3: Knowledge Domains */}
          <AccordionSection
            title="Vulnerability Domains"
            subtitle={domainsSubtitle}
            icon={<ShieldAlert className="w-4 h-4 text-accent" />}
            sectionKey="domains"
            isOpen={openSections.domains}
            onToggle={toggleSection}
            badgeCount={filters.selectedVulnCategory && filters.selectedVulnCategory !== 'ALL' ? 1 : 0}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {VULN_DOMAINS.map(domain => {
                  const isActive = drawerDomain === domain.id;
                  const Icon = domain.id === 'web' ? Globe : domain.id === 'ad' ? Key : domain.id === 'system' ? Terminal : domain.id === 'advanced' ? Shield : Filter;
                  return (
                    <button
                      key={domain.id}
                      type="button"
                      onClick={() => setDrawerDomain(domain.id as VulnDomainId)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                        isActive 
                          ? 'bg-accent-muted border-accent text-accent shadow-sm' 
                          : 'bg-surface-sunken border-subtle text-muted hover:border-strong'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {domain.label}
                    </button>
                  );
                })}
              </div>
              
              <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setFilters({ selectedVulnCategory: 'ALL' })}
                  className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors text-left flex items-center justify-between ${
                    !filters.selectedVulnCategory || filters.selectedVulnCategory === 'ALL'
                      ? 'bg-accent-muted border-accent text-accent font-semibold'
                      : 'border-subtle text-muted hover:text-primary'
                  }`}
                >
                  <span>All Categories</span>
                  {(!filters.selectedVulnCategory || filters.selectedVulnCategory === 'ALL') && <Check className="w-3 h-3 text-accent" />}
                </button>
                {displayedCategories.map(cat => {
                  const isActive = filters.selectedVulnCategory === cat.id;
                  const count = categoryCounts[cat.id] || 0;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFilters({ selectedVulnCategory: cat.id })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors text-left flex items-center justify-between ${
                        isActive
                          ? 'bg-accent-muted border-accent text-accent font-semibold shadow-sm'
                          : 'border-subtle text-muted hover:text-primary'
                      }`}
                    >
                      <span className="truncate pr-1">{cat.label}</span>
                      <span className="text-xs font-mono opacity-70 shrink-0">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </AccordionSection>

          {/* Section 4: Specialized Filters */}
          <AccordionSection
            title="Specialized & Tactical Filters"
            subtitle={specializedSubtitle}
            icon={<Layers className="w-4 h-4 text-accent" />}
            sectionKey="specialized"
            isOpen={openSections.specialized}
            onToggle={toggleSection}
            badgeCount={(filters.selectedLanguage && filters.selectedLanguage !== 'ALL' ? 1 : 0) + (filters.selectedAreaOfInterest && filters.selectedAreaOfInterest !== 'ALL' ? 1 : 0) + (filters.selectedTechnique && filters.selectedTechnique !== 'ALL' ? 1 : 0)}
          >
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Target Language / Stack</label>
                <CyberSelect
                  value={filters.selectedLanguage || 'ALL'}
                  onChange={(val) => {
                    setFilters({ selectedLanguage: val });
                    if (soundEnabled) playCyberSound('toggle');
                  }}
                  options={LANGUAGE_OPTIONS}
                  placeholder="Select Language..."
                  variant="card"
                  size="sm"
                  soundEnabled={soundEnabled}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Area of Security Focus</label>
                <CyberSelect
                  value={filters.selectedAreaOfInterest || 'ALL'}
                  onChange={(val) => {
                    setFilters({ selectedAreaOfInterest: val });
                    if (soundEnabled) playCyberSound('toggle');
                  }}
                  options={AREA_OF_INTEREST_OPTIONS}
                  placeholder="Select Area of Focus..."
                  variant="card"
                  size="sm"
                  soundEnabled={soundEnabled}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">Specific Vulnerability Vector</label>
                <CyberSelect
                  value={filters.selectedVulnCategory || 'ALL'}
                  onChange={(val) => {
                    setFilters({ selectedVulnCategory: val });
                    if (soundEnabled) playCyberSound('toggle');
                  }}
                  options={VULNERABILITY_OPTIONS}
                  placeholder="Select Vulnerability..."
                  variant="card"
                  size="sm"
                  soundEnabled={soundEnabled}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-secondary block mb-1">OS-Specific Technique</label>
                <CyberSelect
                  value={filters.selectedTechnique || 'ALL'}
                  onChange={(val) => {
                    setFilters({ selectedTechnique: val });
                    if (soundEnabled) playCyberSound('toggle');
                  }}
                  options={techniqueOptions}
                  placeholder="Select Technique..."
                  variant="card"
                  size="sm"
                  soundEnabled={soundEnabled}
                />
              </div>
            </div>
          </AccordionSection>

          {/* Section 5: Tags */}
          <AccordionSection
            title="Tags & Keywords"
            subtitle={tagsSubtitle}
            icon={<Tag className="w-4 h-4 text-accent" />}
            sectionKey="tags"
            isOpen={openSections.tags}
            onToggle={toggleSection}
            badgeCount={filters.selectedTags.length}
          >
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-tertiary" />
                <input
                  type="text"
                  placeholder="Search tags (sqli, cve, privesc)..."
                  value={tagSearchTerm}
                  onChange={(e) => setTagSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-surface-sunken border border-subtle rounded-lg text-xs text-secondary focus:outline-none focus:border-accent"
                />
                {tagSearchTerm && (
                  <button aria-label="Clear tag search" onClick={() => setTagSearchTerm('')} className="absolute right-2 top-2">
                    <X className="w-3.5 h-3.5 text-tertiary hover:text-muted" />
                  </button>
                )}
              </div>

              {/* Pinned Selected Tags */}
              {filters.selectedTags.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-tertiary">Selected Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {filters.selectedTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className="px-2 py-0.5 rounded-md text-xs font-medium bg-accent-muted text-accent border border-accent/40 flex items-center gap-1 transition-colors hover:bg-callout-danger-bg hover:text-callout-danger-fg hover:border-callout-danger-border group"
                        title="Click to remove tag"
                      >
                        <span>#{tag}</span>
                        <X className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {displayedTags.length === 0 ? (
                  <div className="text-xs text-tertiary py-4 text-center w-full">No matching tags found</div>
                ) : (
                  displayedTags.map((t) => {
                    const isSelected = filters.selectedTags.includes(t);
                    const count = tagCounts[t] || 0;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTagToggle(t)}
                        className={`px-2 py-0.5 rounded-md text-xs transition-colors border flex items-center gap-1 ${
                          isSelected
                            ? 'bg-accent-muted border-accent/60 text-accent font-semibold shadow-sm'
                            : 'bg-surface-sunken border-subtle text-muted hover:border-strong hover:text-primary'
                        }`}
                      >
                        <span>#{t}</span>
                        <span className="text-xs opacity-60 font-mono">({count})</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </AccordionSection>
          
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-subtle bg-surface-card flex items-center justify-between gap-3 mt-auto shrink-0 z-10">
          <button
            type="button"
            onClick={() => {
              resetFilters();
              if (soundEnabled) playCyberSound('click');
            }}
            disabled={activeFilterList.length === 0}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
              activeFilterList.length > 0
                ? 'border-callout-danger-border bg-callout-danger-bg text-callout-danger-fg hover:bg-callout-danger-bg shadow-sm cursor-pointer'
                : 'border-transparent text-tertiary opacity-40 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setFilterDrawerOpen(false);
              if (soundEnabled) playCyberSound('click');
            }}
            className="flex-1 flex justify-center items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-accent hover:bg-accent-hover text-on-accent transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Show {matchingMachinesCount} Targets</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

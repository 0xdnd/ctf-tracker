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

const AccordionSection: React.FC<{
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  sectionKey: string;
  isOpen: boolean;
  onToggle: (key: string) => void;
  badgeCount?: number;
  badgeContent?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, icon, sectionKey, isOpen, onToggle, badgeCount, badgeContent, children }) => (
  <div className="border border-slate-200/80 dark:border-cyber-border/70 rounded-xl overflow-hidden bg-white/80 dark:bg-cyber-card/60 backdrop-blur-sm shadow-sm transition-[box-shadow,background-color,border-color,color] hover:border-slate-300 dark:hover:border-cyber-borderGlow">
    <button
      type="button"
      onClick={() => onToggle(sectionKey)}
      aria-expanded={isOpen}
      className="w-full flex items-center justify-between p-3 bg-slate-50/70 dark:bg-cyber-cardHover/40 hover:bg-slate-100/80 dark:hover:bg-cyber-cardHover/80 transition-colors text-left group"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="shrink-0 p-1.5 rounded-lg bg-slate-100 dark:bg-cyber-bg border border-slate-200/60 dark:border-cyber-border/60 group-hover:border-cyan-500/40 transition-colors">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-wide font-sans">{title}</span>
            {badgeCount !== undefined && badgeCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-callout-info-fg dark:text-cyber-cyan font-bold border border-cyan-500/40 font-mono leading-none">
                {badgeCount}
              </span>
            )}
            {badgeContent}
          </div>
          {subtitle && (
            <div className="text-[11px] text-tertiary dark:text-cyber-muted truncate font-sans mt-0.5">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      <div className="p-1 rounded text-tertiary dark:text-cyber-muted group-hover:text-slate-700 dark:group-hover:text-primary transition-transform duration-200">
        {isOpen ? <ChevronDown className="w-4 h-4 text-callout-info-fg dark:text-cyber-cyan" /> : <ChevronRight className="w-4 h-4" />}
      </div>
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="p-3.5 space-y-3.5 border-t border-slate-200/70 dark:border-cyber-border/50 bg-white/50 dark:bg-cyber-bg/40 font-sans text-xs">
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
    machines,
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

  const trapRef = useFocusTrap<HTMLDivElement>({
    isActive: filterDrawerOpen,
    onClose: () => setFilterDrawerOpen(false),
  });

  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [trackSearchTerm, setTrackSearchTerm] = useState('');
  const [drawerDomain, setDrawerDomain] = useState<VulnDomainId>('all');
  
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => setFilterDrawerOpen(false)}
      />
      
      {/* Slide-out Drawer */}
      <div 
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Advanced filters drawer"
        className="absolute inset-y-0 right-0 w-full max-w-[420px] sm:max-w-[460px] bg-slate-50/95 dark:bg-[#080d19]/95 backdrop-blur-xl border-l border-slate-200 dark:border-cyber-border shadow-2xl flex flex-col transform transition-transform will-change-transform animate-in slide-in-from-right duration-200"
        style={{ transform: 'translate3d(0, 0, 0)', contain: 'layout paint' }}
      >
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card/90 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 dark:bg-cyber-cyan/10 border border-cyan-500/30 flex items-center justify-center text-callout-info-fg dark:text-cyber-cyan shadow-sm">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm tracking-wide text-slate-900 dark:text-white font-sans">
                  Advanced Filters
                </h2>
                {activeFilterList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-cyan-500/20 text-callout-info-fg dark:text-cyber-cyan border border-cyan-500/40 font-mono">
                    {activeFilterList.length} Active
                  </span>
                )}
              </div>
              <div className="text-[11px] text-tertiary dark:text-cyber-muted font-sans">
                Fine-tune targets, certifications & vectors
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {activeFilterList.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  resetFilters();
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className="text-[11px] text-callout-danger-fg hover:text-callout-danger-fg font-bold px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                title="Reset all active filters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
            <button
              onClick={() => setFilterDrawerOpen(false)}
              className="p-1.5 rounded-lg text-tertiary dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary hover:bg-slate-100 dark:hover:bg-cyber-bg transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyber-cyan cursor-pointer"
              title="Close Drawer (Esc)"
              aria-label="Close filter drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 pb-20 custom-scrollbar">
          
          {/* Target Match Counter HUD Banner */}
          <div className="p-3 rounded-xl bg-slate-900/90 dark:bg-cyber-card border border-slate-700 dark:border-cyber-border shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 dark:bg-cyber-cyan/15 border border-cyan-500/40 dark:border-cyber-cyan/30 flex items-center justify-center text-cyan-400 dark:text-cyber-cyan shrink-0">
                <Target className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <span className="text-cyber-cyan text-sm">{matchingMachinesCount}</span>
                  <span className="text-slate-400 font-normal">/</span>
                  <span>{machines.length} TARGETS</span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans">
                  {matchingMachinesCount === machines.length
                    ? 'All targets currently visible'
                    : `${Math.round((matchingMachinesCount / (machines.length || 1)) * 100)}% pass criteria`}
                </div>
              </div>
            </div>
            {activeFilterList.length > 0 && (
              <button
                onClick={() => {
                  resetFilters();
                  if (soundEnabled) playCyberSound('click');
                }}
                className="text-[10px] text-rose-400 hover:text-rose-300 font-bold px-2 py-1 rounded bg-rose-500/10 border border-rose-500/30 flex items-center gap-1 transition-colors hover:bg-rose-500/20 cursor-pointer"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            )}
          </div>

          {/* Active Filter Chips Ribbon */}
          {activeFilterList.length > 0 && (
            <div className="p-3 rounded-xl bg-cyan-950/20 dark:bg-cyber-card border border-cyan-500/30 dark:border-cyber-border space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-callout-info-fg dark:text-cyber-cyan flex items-center gap-1.5 font-sans">
                  <Sparkles className="w-3.5 h-3.5 text-cyber-cyan" />
                  Active Filters ({activeFilterList.length})
                </span>
                <span className="text-[10px] text-tertiary font-sans">Click to remove</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                {activeFilterList.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-500/10 dark:bg-cyber-cyan/15 text-callout-info-fg dark:text-cyber-cyan border border-cyan-500/30 dark:border-cyber-cyan/30 transition-colors"
                  >
                    <span className="truncate max-w-[180px]">{item.label}</span>
                    <button aria-label="Remove filter"
                      type="button"
                      onClick={item.onRemove}
                      className="hover:text-primary p-0.5 rounded transition-colors cursor-pointer"
                      title="Remove filter"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Presets Bar */}
          <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-cyber-card/40 border border-slate-200/80 dark:border-cyber-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-tertiary dark:text-cyber-muted flex items-center gap-1.5 font-mono">
                <Zap className="w-3 h-3 text-callout-warn-fg" />
                1-Click Tactical Presets
              </div>
              <span className="text-[10px] text-tertiary dark:text-cyber-muted font-sans">Quick Focus</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setFilters({ selectedCert: 'OSCP', selectedStatus: 'UNCOMPLETED' });
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
                  filters.selectedCert === 'OSCP' && filters.selectedStatus === 'UNCOMPLETED'
                    ? 'bg-amber-500/20 text-callout-warn-fg border-amber-500/50 shadow-sm'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-callout-warn-fg border-amber-500/30'
                }`}
                title="Filter for unsolved OSCP machines"
              >
                <GraduationCap className="w-3 h-3" />
                <span>OSCP Sprint</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters({ selectedVulnCategory: 'Active Directory', excludeActiveDirectory: false });
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
                  filters.selectedVulnCategory === 'Active Directory' && !filters.excludeActiveDirectory
                    ? 'bg-blue-500/20 text-callout-info-fg border-blue-500/50 shadow-sm'
                    : 'bg-blue-500/10 hover:bg-blue-500/20 text-callout-info-fg border-blue-500/30'
                }`}
                title="Filter for Active Directory lab environments"
              >
                <Key className="w-3 h-3" />
                <span>Active Directory</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters({ selectedAreaOfInterest: 'Web Application', selectedVulnCategory: 'ALL' });
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
                  filters.selectedAreaOfInterest === 'Web Application'
                    ? 'bg-cyan-500/20 dark:bg-cyber-cyan/20 text-callout-info-fg dark:text-cyber-cyan border-cyan-500/50 dark:border-cyber-cyan shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-cyber-card dark:hover:bg-cyber-cardHover text-slate-700 dark:text-cyber-muted border-slate-200 dark:border-cyber-border'
                }`}
                title="Filter for Web Application exploits"
              >
                <Globe className="w-3 h-3" />
                <span>Web Exploits</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters({ selectedDifficulty: 'Easy', selectedStatus: 'UNCOMPLETED' });
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
                  filters.selectedDifficulty === 'Easy' && filters.selectedStatus === 'UNCOMPLETED'
                    ? 'bg-emerald-500/20 text-callout-success-fg border-emerald-500/50 shadow-sm'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-callout-success-fg border-emerald-500/30'
                }`}
                title="Filter for Easy uncompleted machines"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Easy Unsolved</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters({ selectedStatus: 'COMPLETED' });
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
                  filters.selectedStatus === 'COMPLETED'
                    ? 'bg-purple-500/20 text-callout-tip-fg border-purple-500/50 shadow-sm'
                    : 'bg-purple-500/10 hover:bg-purple-500/20 text-callout-tip-fg border-purple-500/30'
                }`}
                title="Filter for Completed and Pwned solves"
              >
                <Award className="w-3 h-3" />
                <span>Completed Solves</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters({ selectedTracks: ['cpts-windows'], selectedTrack: 'cpts-windows' });
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1 cursor-pointer ${
                  activeTrackIds.includes('cpts-windows')
                    ? 'bg-indigo-500/20 text-callout-tip-fg border-indigo-500/50 shadow-sm'
                    : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-callout-tip-fg border-indigo-500/30'
                }`}
                title="Filter for CPTS Windows track"
              >
                <span>CPTS Win</span>
              </button>
            </div>
          </div>

          {/* Section 1: Status & Completion */}
          <AccordionSection
            title="Status & Certification Scopes"
            subtitle={statusSubtitle}
            icon={<CheckCircle2 className="w-4 h-4 text-callout-success-fg" />}
            sectionKey="status"
            isOpen={openSections.status}
            onToggle={toggleSection}
            badgeCount={(filters.selectedStatus && filters.selectedStatus !== 'ALL' ? 1 : 0) + (filters.selectedCert !== 'ALL' ? 1 : 0) + (filters.excludeActiveDirectory ? 1 : 0)}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-700 dark:text-slate-300 font-bold block">Target Completion Status</label>
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
                            ? 'border-emerald-500/60 bg-emerald-500/15 text-callout-success-fg shadow-sm'
                            : 'border-slate-200 dark:border-cyber-border/70 text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary hover:border-slate-300 dark:hover:border-cyber-border'
                        }`}
                      >
                        <span>{st.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-callout-success-fg" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-cyber-border/60">
                <label className="text-[11px] text-slate-700 dark:text-slate-300 font-bold block">Certification Scopes</label>
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
                        className={`py-1.5 rounded-lg text-xs font-bold border transition-colors text-center ${
                          isSelected
                            ? 'border-purple-500/60 bg-purple-500/15 text-callout-tip-fg shadow-sm'
                            : 'border-slate-200 dark:border-cyber-border/70 text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary hover:border-slate-300 dark:hover:border-cyber-border'
                        }`}
                      >
                        {cert}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-cyber-border/60">
                <label className="flex items-center justify-between cursor-pointer group py-1">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-callout-info-fg dark:group-hover:text-cyber-cyan transition-colors">
                      Exclude Active Directory
                    </span>
                    <span className="block text-[10px] text-tertiary dark:text-cyber-muted">
                      Hide domains, Kerberos, and forest lab boxes
                    </span>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${filters.excludeActiveDirectory ? 'bg-cyan-500 dark:bg-cyber-cyan' : 'bg-slate-200 dark:bg-cyber-bg'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${filters.excludeActiveDirectory ? 'translate-x-4' : 'translate-x-0 bg-slate-400 dark:bg-slate-600'}`} />
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
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-cyber-border/70 text-[11px] font-bold text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary hover:border-slate-300 dark:hover:border-cyber-border transition-colors text-center"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearTracks}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-cyber-border/70 text-[11px] font-bold text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary hover:border-slate-300 dark:hover:border-cyber-border transition-colors text-center"
                >
                  Clear Tracks
                </button>
              </div>

              {/* Track Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-tertiary dark:text-cyber-muted" />
                <input
                  type="text"
                  placeholder="Search curated tracks..."
                  value={trackSearchTerm}
                  onChange={(e) => setTrackSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border rounded-lg text-xs text-slate-700 dark:text-cyber-text focus:outline-none focus:border-cyan-500 dark:focus:border-cyber-cyan"
                />
                {trackSearchTerm && (
                  <button aria-label="Clear track search" onClick={() => setTrackSearchTerm('')} className="absolute right-2 top-2">
                    <X className="w-3.5 h-3.5 text-tertiary hover:text-slate-600 dark:hover:text-primary" />
                  </button>
                )}
              </div>

              {/* Track List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 border border-slate-200 dark:border-cyber-border rounded-xl p-1.5 bg-slate-50/50 dark:bg-cyber-bg/50 custom-scrollbar">
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
                          ? 'border-cyan-500/50 dark:border-cyber-cyan/50 bg-cyan-50/80 dark:bg-cyber-cyan/15 text-callout-info-fg dark:text-cyber-cyan font-bold shadow-sm'
                          : 'border-transparent hover:bg-slate-100 dark:hover:bg-cyber-cardHover text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="truncate text-xs">{track.name}</div>
                        <div className="text-[10px] text-tertiary dark:text-cyber-muted truncate font-normal">{track.description}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-normal bg-slate-200/60 dark:bg-cyber-bg text-slate-600 dark:text-cyber-muted">
                          {count}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-callout-info-fg dark:text-cyber-cyan" />}
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
            icon={<ShieldAlert className="w-4 h-4 text-callout-tip-fg" />}
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
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-colors ${
                        isActive 
                          ? 'bg-purple-500/15 border-purple-500/50 text-callout-tip-fg shadow-sm' 
                          : 'bg-slate-50 dark:bg-cyber-bg border-slate-200 dark:border-cyber-border text-slate-600 dark:text-cyber-muted hover:border-slate-300 dark:hover:border-cyber-borderGlow'
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
                      ? 'bg-purple-500/15 border-purple-500/50 text-callout-tip-fg font-bold'
                      : 'border-slate-200 dark:border-cyber-border/70 text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary'
                  }`}
                >
                  <span>All Categories</span>
                  {(!filters.selectedVulnCategory || filters.selectedVulnCategory === 'ALL') && <Check className="w-3 h-3 text-callout-tip-fg" />}
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
                          ? 'bg-purple-500/15 border-purple-500/50 text-callout-tip-fg font-bold shadow-sm'
                          : 'border-slate-200 dark:border-cyber-border/70 text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary'
                      }`}
                    >
                      <span className="truncate pr-1">{cat.label}</span>
                      <span className="text-[10px] font-mono opacity-70 shrink-0">({count})</span>
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
            icon={<Layers className="w-4 h-4 text-callout-warn-fg" />}
            sectionKey="specialized"
            isOpen={openSections.specialized}
            onToggle={toggleSection}
            badgeCount={(filters.selectedLanguage && filters.selectedLanguage !== 'ALL' ? 1 : 0) + (filters.selectedAreaOfInterest && filters.selectedAreaOfInterest !== 'ALL' ? 1 : 0) + (filters.selectedTechnique && filters.selectedTechnique !== 'ALL' ? 1 : 0)}
          >
            <div className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Target Language / Stack</label>
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
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Area of Security Focus</label>
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
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">Specific Vulnerability Vector</label>
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
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">OS-Specific Technique</label>
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
            icon={<Tag className="w-4 h-4 text-callout-info-fg" />}
            sectionKey="tags"
            isOpen={openSections.tags}
            onToggle={toggleSection}
            badgeCount={filters.selectedTags.length}
          >
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-tertiary dark:text-cyber-muted" />
                <input
                  type="text"
                  placeholder="Search tags (sqli, cve, privesc)..."
                  value={tagSearchTerm}
                  onChange={(e) => setTagSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border rounded-lg text-xs text-slate-700 dark:text-cyber-text focus:outline-none focus:border-cyan-500 dark:focus:border-cyber-cyan"
                />
                {tagSearchTerm && (
                  <button aria-label="Clear tag search" onClick={() => setTagSearchTerm('')} className="absolute right-2 top-2">
                    <X className="w-3.5 h-3.5 text-tertiary hover:text-slate-600 dark:hover:text-primary" />
                  </button>
                )}
              </div>

              {/* Pinned Selected Tags */}
              {filters.selectedTags.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary dark:text-cyber-muted">Selected Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {filters.selectedTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-500/20 text-callout-info-fg border border-cyan-500/40 flex items-center gap-1 transition-colors hover:bg-rose-500/20 hover:text-callout-danger-fg hover:border-rose-500/40 group"
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
                  <div className="text-[11px] text-tertiary dark:text-cyber-muted py-4 text-center w-full">No matching tags found</div>
                ) : (
                  displayedTags.map((t) => {
                    const isSelected = filters.selectedTags.includes(t);
                    const count = tagCounts[t] || 0;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleTagToggle(t)}
                        className={`px-2 py-0.5 rounded-md text-[11px] transition-colors border flex items-center gap-1 ${
                          isSelected
                            ? 'bg-cyan-500/25 border-cyan-500/60 text-callout-info-fg font-bold shadow-sm'
                            : 'bg-slate-50 dark:bg-cyber-bg border-slate-200 dark:border-cyber-border/70 text-slate-600 dark:text-cyber-muted hover:border-slate-300 dark:hover:border-cyber-border hover:text-slate-900 dark:hover:text-primary'
                        }`}
                      >
                        <span>#{t}</span>
                        <span className="text-[9px] opacity-60 font-mono">({count})</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </AccordionSection>
          
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card/95 flex items-center justify-between gap-3 mt-auto shrink-0 z-10 shadow-[0_-4px_15px_rgba(0,0,0,0.12)] backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              resetFilters();
              if (soundEnabled) playCyberSound('click');
            }}
            disabled={activeFilterList.length === 0}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors border ${
              activeFilterList.length > 0
                ? 'border-rose-500/40 bg-rose-500/10 text-callout-danger-fg hover:bg-rose-500/20 shadow-sm cursor-pointer'
                : 'border-transparent text-tertiary dark:text-slate-600 opacity-40 cursor-not-allowed'
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
            className="flex-1 flex justify-center items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-cyber-cyan hover:opacity-90 text-black transition-[transform,background-color,border-color,color] active:scale-[0.98] cursor-pointer"
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

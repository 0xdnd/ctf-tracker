import { createPortal } from 'react-dom';
import React, { useMemo, useState } from 'react';
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
  Filter
} from 'lucide-react';
import { useCtfStore, HtbTargetStatus } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { PRACTICE_TRACKS } from '../../data/tracksData';
import { VULN_CATEGORIES, VULN_DOMAINS, VulnDomainId, classifyMachine } from '../../utils/categoryUtils';
import { playCyberSound } from '../../utils/helpers';
import { CyberSelectOption } from '../common/CyberSelect';

const STATUS_OPTIONS: { value: HtbTargetStatus; label: string }[] = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'UNCOMPLETED', label: 'Uncompleted' },
  { value: 'FOOTHOLD', label: 'Foothold' },
  { value: 'COMPLETED', label: 'Completed' },
];

const CERT_OPTIONS: ('ALL' | 'OSCP' | 'CPTS' | 'CRTO')[] = ['ALL', 'OSCP', 'CPTS', 'CRTO'];

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

const AccordionSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  sectionKey: string;
  isOpen: boolean;
  onToggle: (key: string) => void;
  badgeCount?: number;
  children: React.ReactNode;
}> = ({ title, icon, sectionKey, isOpen, onToggle, badgeCount, children }) => (
  <div className="border border-slate-200 dark:border-cyber-border rounded-lg overflow-hidden bg-white dark:bg-cyber-card">
    <button
      type="button"
      onClick={() => onToggle(sectionKey)}
      className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 dark:bg-cyber-cardHover hover:bg-slate-100 dark:hover:bg-cyber-bg transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] uppercase tracking-wider text-slate-700 dark:text-cyber-text font-bold">{title}</span>
        {badgeCount !== undefined && badgeCount > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyber-cyan font-bold border border-cyan-500/40 leading-none">
            {badgeCount}
          </span>
        )}
      </div>
      {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-cyber-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-cyber-muted" />}
    </button>
    {isOpen && (
      <div className="px-3 py-3 space-y-3 border-t border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card">
        {children}
      </div>
    )}
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

  const techniqueOptions = useMemo(() => {
    const os = filters.selectedOs;
    if (os === 'Linux') {
      return [
        { value: 'ALL', label: 'Technique' },
        { value: 'SUID / SGID Exploitation', label: 'SUID / SGID' },
        { value: 'Sudo Rights (sudo -l)', label: 'Sudo Rights' },
        { value: 'Cron Jobs / Wildcard Injection', label: 'Cron Jobs' },
        { value: 'Kernel Exploits / Dirty COW', label: 'Kernel Exploits' },
        { value: 'Docker Breakout / Socket', label: 'Docker Breakout' },
      ];
    } else if (os === 'Windows') {
      return [
        { value: 'ALL', label: 'Technique' },
        { value: 'Kerberoasting (TGS Request)', label: 'Kerberoasting' },
        { value: 'AS-REP Roasting', label: 'AS-REP Roasting' },
        { value: 'DCSync / NTDS.dit', label: 'DCSync / NTDS' },
        { value: 'SeImpersonate (JuicyPotato / PrintSpoofer)', label: 'SeImpersonate' },
        { value: 'BloodHound Attack Paths', label: 'BloodHound Paths' },
      ];
    }
    return [
      { value: 'ALL', label: 'Technique' },
      { value: 'SUID / SGID Exploitation', label: 'Linux: SUID / SGID' },
      { value: 'Sudo Rights (sudo -l)', label: 'Linux: Sudo Rights' },
      { value: 'Kerberoasting (TGS Request)', label: 'Win: Kerberoasting' },
      { value: 'SeImpersonate (JuicyPotato / PrintSpoofer)', label: 'Win: SeImpersonate' },
      { value: 'BloodHound Attack Paths', label: 'Win: BloodHound' },
    ];
  }, [filters.selectedOs]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    machines.forEach((m) => {
      m.tags.forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [machines]);

  const displayedTags = useMemo(() => {
    if (!tagSearchTerm.trim()) return allTags;
    const q = tagSearchTerm.toLowerCase();
    return allTags.filter((t) => t.toLowerCase().includes(q));
  }, [allTags, tagSearchTerm]);

  const activeTrackIds: string[] = filters.selectedTracks && filters.selectedTracks.length > 0
    ? filters.selectedTracks
    : (filters.selectedTrack && filters.selectedTrack !== 'ALL' ? [filters.selectedTrack] : []);

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

  if (!filterDrawerOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] font-mono">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => setFilterDrawerOpen(false)}
      />
      
      <div 
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-label="Advanced filters drawer"
        className="absolute inset-y-0 right-0 w-80 sm:w-96 bg-slate-50 dark:bg-[#070b14] border-l border-slate-200 dark:border-cyber-border shadow-2xl flex flex-col transform transition-transform will-change-transform animate-in slide-in-from-right duration-200"
        style={{ transform: 'translate3d(0, 0, 0)', contain: 'layout paint' }}
      >
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <SlidersHorizontal className="w-5 h-5 text-cyan-600 dark:text-cyber-cyan" />
            <h2 className="font-bold text-sm tracking-wider">ADVANCED FILTERS</h2>
          </div>
          <button
            onClick={() => setFilterDrawerOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 dark:text-cyber-muted hover:bg-slate-100 dark:hover:bg-cyber-bg hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 custom-scrollbar">
          
          {/* Status & Completion */}
          <AccordionSection
            title="Status & Completion"
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
            sectionKey="status"
            isOpen={openSections.status}
            onToggle={toggleSection}
            badgeCount={(filters.selectedStatus && filters.selectedStatus !== 'ALL' ? 1 : 0) + (filters.selectedCert !== 'ALL' ? 1 : 0) + (filters.excludeActiveDirectory ? 1 : 0)}
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 dark:text-cyber-muted font-bold">Target Status (HTB Matrix)</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {STATUS_OPTIONS.map((st) => {
                    const isSelected = (filters.selectedStatus || 'ALL') === st.value;
                    return (
                      <button
                        key={st.value}
                        onClick={() => {
                          setFilters({ selectedStatus: st.value });
                          if (soundEnabled) playCyberSound('toggle');
                        }}
                        className={`px-2.5 py-1.5 rounded text-[11px] font-bold border flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : 'border-slate-200 dark:border-cyber-border/70 text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-cyber-border'
                        }`}
                      >
                        <span>{st.label}</span>
                        {isSelected && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-cyber-border/60">
                <label className="text-[10px] text-slate-500 dark:text-cyber-muted font-bold">Certification Scopes</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {CERT_OPTIONS.map((cert) => {
                    const isSelected = filters.selectedCert === cert;
                    return (
                      <button
                        key={cert}
                        onClick={() => {
                          setFilters({ selectedCert: cert });
                          if (soundEnabled) playCyberSound('toggle');
                        }}
                        className={`px-1 py-1 rounded text-[10px] font-bold border transition-colors ${
                          isSelected
                            ? 'border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400'
                            : 'border-slate-200 dark:border-cyber-border/70 text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-cyber-border'
                        }`}
                      >
                        {cert}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-cyber-border/60 space-y-2">
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-xs font-bold text-slate-700 dark:text-cyber-text group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Exclude Active Directory</span>
                  <div className={`w-8 h-4 rounded-full transition-colors flex items-center px-0.5 ${filters.excludeActiveDirectory ? 'bg-cyan-500/30' : 'bg-slate-200 dark:bg-cyber-bg'}`}>
                    <div className={`w-3 h-3 rounded-full bg-cyan-600 dark:bg-cyber-cyan transition-transform ${filters.excludeActiveDirectory ? 'translate-x-4' : 'bg-slate-400 dark:bg-slate-600'}`} />
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={filters.excludeActiveDirectory}
                    onChange={(e) => {
                      setFilters({ excludeActiveDirectory: e.target.checked });
                      if (soundEnabled) playCyberSound('toggle');
                    }}
                  />
                </label>
              </div>
            </div>
          </AccordionSection>

          {/* Practice Tracks */}
          <AccordionSection
            title="Practice Tracks"
            icon={<Target className="w-3.5 h-3.5 text-rose-500" />}
            sectionKey="tracks"
            isOpen={openSections.tracks}
            onToggle={toggleSection}
            badgeCount={activeTrackIds.length}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={handleSelectAllTracks}
                  className="flex-1 px-2 py-1 rounded border border-slate-200 dark:border-cyber-border/70 text-[10px] font-bold text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-cyber-border transition-all"
                >
                  Select All
                </button>
                <button
                  onClick={handleClearTracks}
                  className="flex-1 px-2 py-1 rounded border border-slate-200 dark:border-cyber-border/70 text-[10px] font-bold text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-cyber-border transition-all"
                >
                  Clear Tracks
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-500 dark:text-cyber-muted font-bold">Quick Select</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'cpts-windows', label: 'CPTS Win' },
                    { id: 'cwee-web', label: 'CWES' },
                    { id: 'ippsec-favorites', label: 'IppSec' },
                    { id: 'ad-mastery', label: 'AD' },
                  ].map((quick) => {
                    const isActive = activeTrackIds.includes(quick.id);
                    return (
                      <button
                        key={quick.id}
                        onClick={() => handleToggleTrack(quick.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                          isActive
                            ? 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                            : 'border-slate-200 dark:border-cyber-border bg-slate-50 dark:bg-cyber-bg text-slate-500 dark:text-cyber-muted'
                        }`}
                      >
                        {quick.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto pr-1 border border-slate-200 dark:border-cyber-border rounded-lg p-1 bg-slate-50 dark:bg-cyber-bg custom-scrollbar">
                {PRACTICE_TRACKS.map((track) => {
                  const isSelected = activeTrackIds.includes(track.id);
                  return (
                    <button
                      key={track.id}
                      onClick={() => handleToggleTrack(track.id)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between transition-all text-xs ${
                        isSelected
                          ? 'border-cyan-500/40 bg-cyan-50 dark:bg-cyber-cyan/10 text-cyan-700 dark:text-cyber-cyan font-bold shadow-sm'
                          : 'border-transparent hover:bg-slate-100 dark:hover:bg-cyber-cardHover text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="truncate pr-2">{track.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-cyan-600 dark:text-cyber-cyan shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </AccordionSection>

          {/* Knowledge Domains */}
          <AccordionSection
            title="Knowledge Domains"
            icon={<ShieldAlert className="w-3.5 h-3.5 text-purple-500" />}
            sectionKey="domains"
            isOpen={openSections.domains}
            onToggle={toggleSection}
            badgeCount={filters.selectedVulnCategory && filters.selectedVulnCategory !== 'ALL' ? 1 : 0}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {VULN_DOMAINS.map(domain => {
                  const isActive = drawerDomain === domain.id;
                  const Icon = domain.id === 'web' ? Globe : domain.id === 'ad' ? Key : domain.id === 'system' ? Terminal : domain.id === 'advanced' ? Shield : Filter;
                  return (
                    <button
                      key={domain.id}
                      onClick={() => setDrawerDomain(domain.id as VulnDomainId)}
                      className={`px-2 py-1 rounded-md text-[10px] font-medium border flex items-center gap-1.5 transition-colors ${
                        isActive 
                          ? 'bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-400' 
                          : 'bg-slate-50 dark:bg-cyber-bg border-slate-200 dark:border-cyber-border text-slate-600 dark:text-cyber-muted hover:border-slate-300 dark:hover:border-cyber-borderGlow'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {domain.label}
                    </button>
                  );
                })}
              </div>
              
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setFilters({ selectedVulnCategory: 'ALL' })}
                  className={`px-2 py-1 rounded-md text-[10px] border transition-colors ${
                    !filters.selectedVulnCategory || filters.selectedVulnCategory === 'ALL'
                      ? 'bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-400 font-bold'
                      : 'border-slate-200 dark:border-cyber-border/70 text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All Categories
                </button>
                {displayedCategories.map(cat => {
                  const isActive = filters.selectedVulnCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setFilters({ selectedVulnCategory: cat.id })}
                      className={`px-2 py-1 rounded-md text-[10px] border transition-colors ${
                        isActive
                          ? 'bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-400 font-bold'
                          : 'border-slate-200 dark:border-cyber-border/70 text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="truncate block w-full text-left">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </AccordionSection>

          {/* Specialized Filters */}
          <AccordionSection
            title="Specialized Filters"
            icon={<Layers className="w-3.5 h-3.5 text-amber-500" />}
            sectionKey="specialized"
            isOpen={openSections.specialized}
            onToggle={toggleSection}
            badgeCount={(filters.selectedLanguage && filters.selectedLanguage !== 'ALL' ? 1 : 0) + (filters.selectedAreaOfInterest && filters.selectedAreaOfInterest !== 'ALL' ? 1 : 0) + (filters.selectedTechnique && filters.selectedTechnique !== 'ALL' ? 1 : 0)}
          >
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 dark:text-cyber-muted font-bold ml-1">Language</label>
                <select
                  value={filters.selectedLanguage || 'ALL'}
                  onChange={(e) => setFilters({ selectedLanguage: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border rounded px-2 py-1 text-xs text-slate-700 dark:text-cyber-text"
                >
                  {LANGUAGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 dark:text-cyber-muted font-bold ml-1">Area of Interest</label>
                <select
                  value={filters.selectedAreaOfInterest || 'ALL'}
                  onChange={(e) => setFilters({ selectedAreaOfInterest: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border rounded px-2 py-1 text-xs text-slate-700 dark:text-cyber-text"
                >
                  {AREA_OF_INTEREST_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 dark:text-cyber-muted font-bold ml-1">Specific Vulnerability</label>
                <select
                  value={filters.selectedVulnCategory || 'ALL'}
                  onChange={(e) => setFilters({ selectedVulnCategory: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border rounded px-2 py-1 text-xs text-slate-700 dark:text-cyber-text"
                >
                  {VULNERABILITY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 dark:text-cyber-muted font-bold ml-1">Technique (OS Aware)</label>
                <select
                  value={filters.selectedTechnique || 'ALL'}
                  onChange={(e) => setFilters({ selectedTechnique: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border rounded px-2 py-1 text-xs text-slate-700 dark:text-cyber-text"
                >
                  {techniqueOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
          </AccordionSection>

          {/* Tags */}
          <AccordionSection
            title="Tags"
            icon={<Tag className="w-3.5 h-3.5 text-cyan-500" />}
            sectionKey="tags"
            isOpen={openSections.tags}
            onToggle={toggleSection}
            badgeCount={filters.selectedTags.length}
          >
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-slate-400 dark:text-cyber-muted" />
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={tagSearchTerm}
                  onChange={(e) => setTagSearchTerm(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border rounded text-xs text-slate-700 dark:text-cyber-text focus:outline-none focus:border-cyan-500 dark:focus:border-cyber-cyan"
                />
                {tagSearchTerm && (
                  <button onClick={() => setTagSearchTerm('')} className="absolute right-2 top-1.5">
                    <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-white" />
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {displayedTags.length === 0 ? (
                  <div className="text-[11px] text-slate-500 dark:text-cyber-muted py-3 text-center w-full">No matching tags found</div>
                ) : (
                  displayedTags.map((t) => {
                    const isSelected = filters.selectedTags.includes(t);
                    return (
                      <button
                        key={t}
                        onClick={() => handleTagToggle(t)}
                        className={`px-2 py-0.5 rounded text-[10px] transition-all border ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-700 dark:text-cyan-400 font-bold'
                            : 'bg-slate-50 dark:bg-cyber-bg border-slate-200 dark:border-cyber-border/70 text-slate-600 dark:text-cyber-muted hover:border-slate-300 dark:hover:border-cyber-border'
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </AccordionSection>
          
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card flex items-center justify-between gap-3 mt-auto shrink-0 z-10 shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
          <button
            onClick={() => {
              resetFilters();
              if (soundEnabled) playCyberSound('click');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All
          </button>
          
          <button
            onClick={() => setFilterDrawerOpen(false)}
            className="flex-1 flex justify-center items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 dark:bg-cyber-cyan text-white dark:text-black hover:bg-cyan-700 dark:hover:bg-cyan-400 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Filters
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

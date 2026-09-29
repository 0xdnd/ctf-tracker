import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Compass, 
  Search, 
  Copy, 
  Check, 
  Terminal, 
  ShieldAlert, 
  ChevronDown, 
  ChevronRight, 
  Download, 
  Sparkles, 
  Crosshair, 
  Layers, 
  Globe, 
  FolderLock, 
  Key, 
  Database, 
  Network, 
  Cpu, 
  Flame, 
  ExternalLink,
  BookOpen,
  CheckCircle2,
  ListChecks,
  Plus
} from 'lucide-react';
import { useCtfStore } from '../store/useCtfStore';
import { 
  MASTER_METHODOLOGY_FRAMEWORK, 
  SERVICE_BRANCHES, 
  generateApplicablePhases 
} from '../data/methodologyFramework';
import { ServiceBranchType, MethodologyPhase, ChecklistItem } from '../types/checklist';
import { interpolateCommand, playCyberSound } from '../utils/helpers';
import { PlatformIcon } from '../components/common/PlatformBadge';
import { CyberSelect, CyberSelectOption } from '../components/common/CyberSelect';
import { ChecklistWorkspace } from '../components/checklist/ChecklistWorkspace';
import { useShallow } from 'zustand/react/shallow';

export const MethodologyPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    machines, 
    activeTargetId, 
    globalVars, 
    soundEnabled,
    setActiveTarget,
    startTimer,
    setNewMachineModalOpen
  } = useCtfStore(
    useShallow((s) => ({
      machines: s.machines,
      activeTargetId: s.activeTargetId,
      globalVars: s.globalVars,
      soundEnabled: s.soundEnabled,
      setActiveTarget: s.setActiveTarget,
      startTimer: s.startTimer,
      setNewMachineModalOpen: s.setNewMachineModalOpen,
    }))
  );

  const [viewMode, setViewMode] = useState<'playbook' | 'checklist'>('playbook');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhaseNumber, setSelectedPhaseNumber] = useState<number | 'all'>('all');
  const [selectedBranch, setSelectedBranch] = useState<ServiceBranchType | 'all'>('all');
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({
    'phase-01-surface-mapping': true,
    'phase-02-service-enumeration': true,
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAllMd, setCopiedAllMd] = useState(false);
  const [targetContextId, setTargetContextId] = useState<string | 'universal'>('universal');

  // Selected Target for context-aware highlighting
  const contextMachine = useMemo(() => {
    if (targetContextId === 'universal') return null;
    return machines.find(m => m.id === targetContextId) || null;
  }, [targetContextId, machines]);

  // Active target resolution for live checklist execution
  const activeTargetMachine = useMemo(() => {
    if (contextMachine) return contextMachine;
    if (activeTargetId) return machines.find(m => m.id === activeTargetId) || null;
    if (machines.length > 0) return machines[0];
    return null;
  }, [contextMachine, activeTargetId, machines]);

  // Compute phases based on context machine (or full universal framework)
  const displayPhases = useMemo(() => {
    if (contextMachine) {
      return generateApplicablePhases(contextMachine, contextMachine.openPorts || []);
    }
    return MASTER_METHODOLOGY_FRAMEWORK;
  }, [contextMachine]);

  // Toggle Phase Expansion
  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseId]: !prev[phaseId]
    }));
    if (soundEnabled) playCyberSound('toggle');
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    displayPhases.forEach(p => { all[p.id] = true; });
    setExpandedPhases(all);
  };

  const collapseAll = () => {
    setExpandedPhases({});
  };

  // Filter items based on search and selected filters
  const filteredPhases = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return displayPhases
      .filter(phase => {
        if (selectedPhaseNumber !== 'all' && phase.phaseNumber !== selectedPhaseNumber) {
          return false;
        }
        return true;
      })
      .map(phase => {
        const matchingSubcats = phase.subcategories
          .filter(subcat => {
            if (selectedBranch !== 'all' && subcat.serviceBranch !== selectedBranch && subcat.serviceBranch !== 'universal') {
              return false;
            }
            return true;
          })
          .map(subcat => {
            const matchingItems = subcat.items.filter(item => {
              if (!q) return true;
              return (
                item.title.toLowerCase().includes(q) ||
                Boolean(item.description && item.description.toLowerCase().includes(q)) ||
                Boolean(item.commandSnippet && item.commandSnippet.toLowerCase().includes(q))
              );
            });

            return {
              ...subcat,
              items: matchingItems,
            };
          })
          .filter(subcat => subcat.items.length > 0);

        return {
          ...phase,
          subcategories: matchingSubcats,
        };
      })
      .filter(phase => phase.subcategories.length > 0);
  }, [displayPhases, selectedPhaseNumber, selectedBranch, searchQuery]);

  // Command Copy Handler
  const handleCopy = (commandSnippet: string, id: string) => {
    const finalCmd = interpolateCommand(commandSnippet, globalVars);
    navigator.clipboard.writeText(finalCmd);
    setCopiedId(id);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export Full Methodology as Obsidian/GitBook Markdown
  const handleExportFullMarkdown = () => {
    let md = `# ZEROBOX // UNIVERSAL 8-PHASE PENETRATION TESTING PLAYBOOK\n\n`;
    md += `*Standardized Offensive Methodology & Service Branch Execution Framework*\n\n`;
    md += `**Target IP:** \`${globalVars.targetIp || '10.10.10.X'}\` | **Attacker Host:** \`${globalVars.lhost || '10.10.14.X'}\` | **LPORT:** \`${globalVars.lport || '4444'}\`\n\n`;
    md += `---\n\n`;

    MASTER_METHODOLOGY_FRAMEWORK.forEach(phase => {
      md += `## Phase 0${phase.phaseNumber}: ${phase.title}\n`;
      md += `*${phase.subtitle}*\n\n`;
      md += `${phase.description}\n\n`;

      phase.subcategories.forEach(subcat => {
        md += `### ${subcat.title}\n`;
        if (subcat.serviceBranch) {
          md += `*Branch: \`${subcat.serviceBranch}\`*\n\n`;
        }

        subcat.items.forEach(item => {
          md += `- [ ] **${item.title}**\n`;
          md += `  - *Description:* ${item.description}\n`;
          if (item.commandSnippet) {
            const interpolated = interpolateCommand(item.commandSnippet, globalVars);
            md += `  - *Execution:* \`${interpolated}\`\n`;
          }
          md += `\n`;
        });
      });
      md += `---\n\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedAllMd(true);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedAllMd(false), 2500);
  };

  // Branch icons map
  const getBranchIcon = (branch: ServiceBranchType) => {
    switch (branch) {
      case 'web': return <Globe className="w-3.5 h-3.5 text-cyber-cyan" />;
      case 'file_sharing': return <FolderLock className="w-3.5 h-3.5 text-cyber-emerald" />;
      case 'remote_access': return <Key className="w-3.5 h-3.5 text-cyber-amber" />;
      case 'database': return <Database className="w-3.5 h-3.5 text-cyber-purple" />;
      case 'network_mgmt': return <Network className="w-3.5 h-3.5 text-cyber-cyan" />;
      case 'linux_privesc': return <Cpu className="w-3.5 h-3.5 text-cyber-crimson" />;
      case 'windows_privesc': return <Layers className="w-3.5 h-3.5 text-blue-400" />;
      default: return <Compass className="w-3.5 h-3.5 text-cyber-muted" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-7xl mx-auto space-y-6 font-mono text-xs pb-20"
    >
      {/* 1. Header Banner */}
      <div className="p-5 rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] shadow-xs relative overflow-hidden">
        
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono font-bold tracking-widest uppercase">
                METHODOLOGY DIRECTORY // KNOWLEDGE BASE
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white tracking-wide flex items-center gap-2.5">
              <Compass className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <span>THE ATTACK LIFECYCLE & TACTICAL METHODOLOGY PLAYBOOK</span>
            </h1>
            <p className="text-xs text-slate-600 dark:text-cyber-muted mt-1 max-w-3xl">
              Universally standardized 8-Phase penetration testing methodology framework coupled with dynamic Service Branches (A-G).
              Commands dynamically interpolate your active attacker IP, target host, and listening ports.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportFullMarkdown}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-50 hover:bg-cyan-50 dark:bg-[#09090b] border border-cyan-500/50 text-cyan-800 dark:text-cyan-400 hover:text-slate-950 dark:hover:text-slate-950 hover:bg-cyan-400 dark:hover:bg-cyan-400 font-mono font-bold text-xs active:scale-[0.98] transition-[transform,box-shadow,background-color,border-color,color] shadow-xs"
              title="Copy entire 8-Phase Playbook to Obsidian / GitBook Markdown"
            >
              {copiedAllMd ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-700 dark:text-emerald-400">Copied Full Playbook!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Playbook (.md)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* View Mode Selector: 8-Phase Reference Playbook vs Live Target Checklist */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-[#27272a] flex flex-wrap items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-100 dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a]">
            <button
              onClick={() => {
                setViewMode('playbook');
                if (soundEnabled) playCyberSound('click');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-mono font-semibold active:scale-[0.98] transition-[transform,background-color,border-color,color] ${
                viewMode === 'playbook'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>8-Phase Playbook Reference</span>
            </button>

            <button
              onClick={() => {
                setViewMode('checklist');
                if (soundEnabled) playCyberSound('click');
              }}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-mono font-semibold active:scale-[0.98] transition-[transform,background-color,border-color,color] ${
                viewMode === 'checklist'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Live Target Checklist</span>
              {activeTargetMachine && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition-colors ${
                  viewMode === 'checklist'
                    ? 'bg-emerald-950/30 text-emerald-950'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                }`}>
                  {activeTargetMachine.name}
                </span>
              )}
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-600 dark:text-cyber-muted flex items-center gap-2">
            {viewMode === 'playbook' ? (
              <span>Standard 8-Phase Reference Playbook with copyable command templates</span>
            ) : (
              <span>Interactive micro-tasks & port-aware phase checklists bound to active target</span>
            )}
          </div>
        </div>
      </div>

      {viewMode === 'checklist' ? (
        activeTargetMachine ? (
          <div className="space-y-4">
            {/* Checklist Target Selector & Header Bar */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white uppercase">Checklist Target:</span>
                </div>

                <CyberSelect
                  value={activeTargetMachine.id}
                  onChange={(val) => {
                    setTargetContextId(val);
                  }}
                  options={machines.map((m) => ({
                    value: m.id,
                    label: `${m.name} (${m.platform})`,
                    icon: <PlatformIcon platform={m.platform} className="w-3.5 h-3.5" />,
                    description: `${m.os} · ${m.difficulty}`,
                  }))}
                  searchable
                  searchPlaceholder="Switch target..."
                  variant="card"
                  size="sm"
                  soundEnabled={soundEnabled}
                />

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-400 text-[11px] font-mono font-bold">
                    OS: {activeTargetMachine.os}
                  </span>
                  {activeTargetId !== activeTargetMachine.id ? (
                    <button
                      onClick={() => {
                        setActiveTarget(activeTargetMachine.id);
                        startTimer();
                        if (soundEnabled) playCyberSound('engage');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 border border-cyan-500/40 text-cyan-400 hover:text-slate-950 text-[11px] font-mono font-bold active:scale-[0.98] transition-[transform,background-color,border-color,color]"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Engage as Active</span>
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 text-cyan-900 dark:text-cyan-400 text-[11px] font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      ACTIVE TARGET
                    </span>
                  )}
                  <button
                    onClick={() => navigate(`/target/${activeTargetMachine.id}`)}
                    className="flex items-center gap-1 text-cyan-700 hover:text-cyan-900 dark:text-cyan-400 dark:hover:underline text-[11px] ml-1 font-mono"
                  >
                    <span>Target Dossier</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setNewMachineModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/40 text-emerald-400 hover:text-slate-950 text-xs font-mono font-bold active:scale-[0.98] transition-[transform,box-shadow,background-color,border-color,color] shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Target Box</span>
                </button>
              </div>
            </div>

            {/* Live Interactive Checklist Workspace */}
            <ChecklistWorkspace
              machine={activeTargetMachine}
              onOpenInWriteup={() => navigate(`/writeup/${activeTargetMachine.id}`)}
            />
          </div>
        ) : (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-[#27272a] bg-white dark:bg-[#18181b] space-y-4">
            <ListChecks className="w-12 h-12 text-slate-400 dark:text-zinc-500 mx-auto" />
            <h3 className="text-lg font-bold font-mono text-slate-900 dark:text-white">NO TARGET SELECTED</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
              Deploy or select a target box to track real-time micro-tasks, Nmap scan parsing, and offensive methodology progress.
            </p>
            <button
              onClick={() => setNewMachineModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold text-xs shadow-xs active:scale-[0.98] transition-[transform,box-shadow,background-color,border-color,color]"
            >
              <Plus className="w-4 h-4" />
              <span>Deploy Target Machine</span>
            </button>
          </div>
        )
      ) : (
        <>
          {/* 2. Target Context Switcher & Variable Injection Bar */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-[#27272a] bg-slate-50 dark:bg-[#18181b] shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Context Machine Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white uppercase">Target Context:</span>
          </div>

          <CyberSelect
            value={targetContextId}
            onChange={setTargetContextId}
            options={[
              { value: 'universal', label: 'Universal Reference (All Branches & Phases)', icon: <Globe className="w-3.5 h-3.5 text-cyber-cyan" /> },
              ...machines.map((m) => ({
                value: m.id,
                label: `${m.name} (${m.platform})`,
                icon: <PlatformIcon platform={m.platform} className="w-3.5 h-3.5" />,
                description: `${m.os} · ${m.difficulty}`,
              })),
            ]}
            searchable
            searchPlaceholder="Search target box..."
            variant="card"
            size="sm"
            soundEnabled={soundEnabled}
          />

          {contextMachine && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-400 text-[11px] font-mono font-bold">
                OS: {contextMachine.os}
              </span>
              <button
                onClick={() => navigate(`/target/${contextMachine.id}`)}
                className="flex items-center gap-1 text-cyan-700 hover:text-cyan-900 dark:text-cyan-400 dark:hover:underline text-[11px] font-mono"
              >
                <span>Open Target Page</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Global Live Variables Indicator */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-slate-600 dark:text-zinc-400">Variables:</span>
          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] text-slate-800 dark:text-zinc-200">
            TARGET: <strong className="text-emerald-700 dark:text-emerald-400">{globalVars.targetIp || '10.10.10.X'}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] text-slate-800 dark:text-zinc-200">
            LHOST: <strong className="text-cyan-700 dark:text-cyan-400">{globalVars.lhost || '10.10.14.X'}</strong>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-white dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] text-slate-800 dark:text-zinc-200">
            LPORT: <strong className="text-amber-700 dark:text-amber-400">{globalVars.lport || '4444'}</strong>
          </span>
        </div>
      </div>

      {/* 3. Search & Interactive Phase Stepper / Branch Filter */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 dark:text-zinc-400 absolute left-3.5 top-2.5" />
          <input
            id="methodology-search-input"
            name="methodology-search"
            aria-label="Search methodology commands and techniques"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search commands, techniques, tools (e.g. ffuf, linpeas, bloodhound, kerberoast, suid)..."
            className="w-full bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] rounded-lg pl-10 pr-4 py-2 font-mono text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-cyan-500 shadow-xs transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-2 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* 8-Phase Step Pills */}
        <div className="flex items-center gap-1.5 flex-wrap py-1">
          <button
            onClick={() => setSelectedPhaseNumber('all')}
            className={`shrink-0 px-3 py-1.5 rounded-md border text-xs font-mono font-semibold whitespace-nowrap active:scale-[0.98] transition-[transform,background-color,border-color,color] ${
              selectedPhaseNumber === 'all'
                ? 'bg-cyan-500 text-slate-950 border-cyan-500 font-bold shadow-xs'
                : 'bg-white dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All 8 Phases
          </button>

          {MASTER_METHODOLOGY_FRAMEWORK.map((phase) => {
            const isSelected = selectedPhaseNumber === phase.phaseNumber;
            return (
              <button
                key={phase.id}
                onClick={() => setSelectedPhaseNumber(phase.phaseNumber)}
                className={`shrink-0 px-3 py-1.5 rounded-md border text-xs font-mono whitespace-nowrap active:scale-[0.98] transition-[transform,background-color,border-color,color] flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 border-cyan-500 font-bold shadow-xs'
                    : 'bg-white dark:bg-[#18181b] border-slate-200 dark:border-[#27272a] text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className={`font-mono text-[10px] ${isSelected ? 'text-slate-950 font-bold' : 'text-cyan-700 dark:text-cyan-400'}`}>
                  0{phase.phaseNumber}
                </span>
                <span>{phase.subtitle}</span>
              </button>
            );
          })}
        </div>

        {/* Service Branches Pills (A-G) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scroll-smooth">
            <span className="shrink-0 text-[10px] text-slate-600 dark:text-zinc-400 uppercase font-mono font-bold mr-1">Branches:</span>
            <button
              onClick={() => setSelectedBranch('all')}
              className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-mono border active:scale-[0.98] transition-[transform,background-color,border-color,color] ${
                selectedBranch === 'all'
                  ? 'bg-emerald-100 dark:bg-[#18181b] text-emerald-950 dark:text-white border-emerald-400 dark:border-emerald-500 font-bold'
                  : 'bg-white dark:bg-transparent border-slate-200 dark:border-[#27272a] text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Branches
            </button>

            {SERVICE_BRANCHES.map((b) => {
              const isSelected = selectedBranch === b.type;
              return (
                <button
                  key={b.type}
                  onClick={() => setSelectedBranch(b.type)}
                  className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-mono border active:scale-[0.98] transition-[transform,background-color,border-color,color] flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-100 dark:bg-[#18181b] text-emerald-950 dark:text-white border-emerald-400 dark:border-emerald-500 shadow-xs font-bold'
                      : 'bg-white dark:bg-transparent border-slate-200 dark:border-[#27272a] text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-[#3f3f46]'
                  }`}
                >
                  {getBranchIcon(b.type)}
                  <span>{b.name.split(':')[0]}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-[10px] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white underline font-mono"
            >
              Expand All
            </button>
            <span className="text-slate-300 dark:text-[#27272a]">|</span>
            <button
              onClick={collapseAll}
              className="text-[10px] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white underline font-mono"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* 4. Methodology Phases & Task Playbooks */}
      <div className="space-y-4">
        {filteredPhases.length === 0 ? (
          <div className="p-8 rounded-2xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] text-center space-y-2">
            <Compass className="w-10 h-10 text-slate-400 dark:text-zinc-500 mx-auto animate-spin-slow" />
            <div className="text-slate-900 dark:text-white font-bold font-mono">No matching methodology tasks found</div>
            <p className="text-xs text-slate-600 dark:text-zinc-400 max-w-sm mx-auto font-mono">
              Try adjusting your query or resetting the Phase and Service Branch filters above.
            </p>
          </div>
        ) : (
          filteredPhases.map((phase) => {
            const isExpanded = Boolean(expandedPhases[phase.id]);
            const taskCount = phase.subcategories.reduce((acc, s) => acc + s.items.length, 0);

            return (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.08 }}
                transition={{ duration: 0.28 }}
                className="rounded-xl border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#18181b] overflow-hidden shadow-xs transition-[box-shadow,background-color,border-color,color]"
              >
                {/* Phase Header Accordion */}
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="w-full p-4 flex items-center justify-between gap-4 bg-slate-50 hover:bg-slate-100 dark:bg-[#09090b]/80 dark:hover:bg-[#09090b] transition-colors text-left border-b border-slate-200 dark:border-[#27272a]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#18181b] border border-cyan-500/40 flex items-center justify-center font-bold font-mono text-cyan-700 dark:text-cyan-400 text-xs">
                      0{phase.phaseNumber}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold font-mono text-slate-900 dark:text-white">{phase.title}</h2>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 text-cyan-900 dark:text-cyan-400 font-mono font-semibold">
                          {phase.subtitle}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">{phase.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-[#18181b] border border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-zinc-400 font-mono">
                      {taskCount} micro-tasks
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                    )}
                  </div>
                </button>

                {/* Subcategories & Commands List */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="p-4 space-y-6 bg-slate-50/50 dark:bg-[#18181b]/50"
                    >
                      {phase.subcategories.map((subcat) => (
                        <div key={subcat.id} className="space-y-2.5">
                          {/* Subcategory Banner */}
                          <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#27272a] pb-1.5">
                            <div className="flex items-center gap-2">
                              {subcat.serviceBranch && getBranchIcon(subcat.serviceBranch)}
                              <h3 className="font-bold text-cyan-800 dark:text-cyan-400 text-xs tracking-wider uppercase font-mono">
                                {subcat.title}
                              </h3>
                            </div>

                            {subcat.serviceBranch && subcat.serviceBranch !== 'universal' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-[#09090b] border border-slate-200 dark:border-[#27272a] text-slate-600 dark:text-zinc-400 font-mono">
                                {subcat.serviceBranch.toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Items Grid */}
                          <div className="grid grid-cols-1 gap-2.5">
                            {subcat.items.map((item) => {
                              const isCopied = copiedId === item.id;

                              return (
                                <div
                                  key={item.id}
                                  className="p-3 rounded-lg border border-slate-200 dark:border-[#27272a] bg-white dark:bg-[#09090b] hover:border-slate-300 dark:hover:border-[#3f3f46] transition-[box-shadow,background-color,border-color,color] space-y-2 group shadow-xs"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2 font-mono">
                                        <span>{item.title}</span>
                                      </div>
                                      <div className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                                        {item.description}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Command Snippet Preview - Permanent Dark Terminal for crisp execution syntax */}
                                  {item.commandSnippet && (
                                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950 border border-[#27272a] text-[11px] font-mono group-hover:border-cyan-500/40 transition-colors">
                                      <div className="truncate text-cyan-300 select-all">
                                        {interpolateCommand(item.commandSnippet, globalVars)}
                                      </div>

                                      <button
                                        onClick={() => handleCopy(item.commandSnippet!, item.id)}
                                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-[#27272a] text-slate-300 hover:text-white flex-shrink-0 active:scale-[0.98] transition-[transform,background-color,border-color,color] font-semibold font-mono"
                                        title="Copy command to clipboard"
                                      >
                                        {isCopied ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                            <span className="text-emerald-400">Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Copy</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
        </>
      )}
    </motion.div>
  );
};

export default MethodologyPage;

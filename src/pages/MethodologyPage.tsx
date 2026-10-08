import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Compass, 
  Search, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  Download, 
  Sparkles, 
  Layers, 
  Globe, 
  FolderLock, 
  Key, 
  Database, 
  Network, 
  Cpu, 
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
import { ServiceBranchType } from '../types/checklist';
import { interpolateCommand, playCyberSound } from '../utils/helpers';
import { toast } from '../store/useToastStore';
import { PlatformIcon } from '../components/common/PlatformBadge';
import { CyberSelect } from '../components/common/CyberSelect';
import { PageHeader } from '../components/common/PageHeader';
import { CyberButton } from '../components/common/CyberButton';
import { ChecklistWorkspace } from '../components/checklist/ChecklistWorkspace';
import { useShallow } from 'zustand/react/shallow';
import { TACTICAL_SPRING } from '../utils/motionTokens';
import { SyntaxHighlightedCommand } from '../components/common/SyntaxHighlightedCommand';

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
    navigator.clipboard?.writeText(finalCmd);
    toast.success('Command copied to clipboard');
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

    navigator.clipboard?.writeText(md);
    toast.success('Playbook markdown copied');
    setCopiedAllMd(true);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedAllMd(false), 2500);
  };

  // Branch icons map
  const getBranchIcon = (branch: ServiceBranchType) => {
    switch (branch) {
      case 'web': return <Globe className="w-3.5 h-3.5 text-callout-info-fg" />;
      case 'file_sharing': return <FolderLock className="w-3.5 h-3.5 text-callout-success-fg" />;
      case 'remote_access': return <Key className="w-3.5 h-3.5 text-callout-warn-fg" />;
      case 'database': return <Database className="w-3.5 h-3.5 text-callout-tip-fg" />;
      case 'network_mgmt': return <Network className="w-3.5 h-3.5 text-callout-info-fg" />;
      case 'linux_privesc': return <Cpu className="w-3.5 h-3.5 text-callout-danger-fg" />;
      case 'windows_privesc': return <Layers className="w-3.5 h-3.5 text-callout-info-fg" />;
      default: return <Compass className="w-3.5 h-3.5 text-muted" />;
    }
  };

  const chipBase =
    'inline-flex min-h-11 flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-[13px] font-medium transition-[transform,background-color,border-color,color] active:scale-[0.97] sm:min-h-8 cursor-pointer';
  const chipOn = 'border-accent bg-accent-muted text-primary';
  const chipOff = 'border-subtle bg-surface-card text-secondary hover:border-strong hover:text-primary';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TACTICAL_SPRING}
      className="mx-auto max-w-6xl space-y-6 pb-20 text-sm"
    >
      <PageHeader
        title="Attack lifecycle"
        description="Eight-phase playbook with copyable commands that fill in your target and attacker values."
        primaryAction={
          <CyberButton
            variant="secondary"
            size="md"
            title="Copy entire 8-Phase Playbook to Obsidian / GitBook Markdown"
            onClick={handleExportFullMarkdown}
            iconLeft={copiedAllMd ? <Check className="h-3.5 w-3.5 text-callout-success-fg" /> : <Download className="h-3.5 w-3.5" />}
            className="[@media(pointer:coarse)]:h-11"
          >
            {copiedAllMd ? 'Copied playbook' : 'Export playbook (.md)'}
          </CyberButton>
        }
      >
        {/* View mode: reference playbook vs live target checklist */}
        <div className="-mx-4 overflow-x-auto no-scrollbar border-b border-subtle px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max items-center gap-1">
            {([
              { id: 'playbook', label: 'Playbook', icon: <BookOpen className="h-3.5 w-3.5" /> },
              { id: 'checklist', label: 'Live checklist', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
            ] as const).map((tab) => {
              const selected = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setViewMode(tab.id);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  aria-pressed={selected}
                  className={`-mb-px inline-flex min-h-11 flex-shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[13px] font-medium transition-colors sm:min-h-9 cursor-pointer ${
                    selected ? 'border-accent text-primary' : 'border-transparent text-muted hover:text-primary'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.id === 'checklist' && activeTargetMachine && (
                    <span className="rounded bg-surface-sunken px-1.5 text-xs font-medium text-secondary">
                      {activeTargetMachine.name}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </PageHeader>

      {viewMode === 'checklist' ? (
        activeTargetMachine ? (
          <div className="space-y-4">
            {/* Checklist target selector */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium text-secondary">Checklist target</span>

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

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted">{activeTargetMachine.os}</span>
                  {activeTargetId !== activeTargetMachine.id ? (
                    <CyberButton
                      variant="secondary"
                      size="sm"
                      iconLeft={<Sparkles className="h-3 w-3" />}
                      onClick={() => {
                        setActiveTarget(activeTargetMachine.id);
                        startTimer();
                        if (soundEnabled) playCyberSound('engage');
                      }}
                    >
                      Engage as Active
                    </CyberButton>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-secondary">
                      <span className="h-1.5 w-1.5 rounded-full bg-callout-success-fg" aria-hidden="true" />
                      Active target
                    </span>
                  )}
                  <button
                    onClick={() => navigate(`/target/${activeTargetMachine.id}`)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-callout-info-fg hover:underline cursor-pointer"
                  >
                    <span>Target Dossier</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <CyberButton
                variant="ghost"
                size="sm"
                iconLeft={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setNewMachineModalOpen(true)}
              >
                New Target Box
              </CyberButton>
            </div>

            {/* Live interactive checklist workspace */}
            <ChecklistWorkspace
              machine={activeTargetMachine}
              onOpenInWriteup={() => navigate(`/writeup/${activeTargetMachine.id}`)}
            />
          </div>
        ) : (
          <div className="mx-auto max-w-md space-y-3 py-12 text-center">
            <ListChecks className="mx-auto h-10 w-10 text-muted" aria-hidden="true" />
            <h3 className="text-lg font-semibold tracking-[-0.015em] text-primary">No target selected</h3>
            <p className="text-sm text-muted">
              Select or create a target to track micro-tasks and methodology progress.
            </p>
            <CyberButton
              variant="primary"
              size="md"
              iconLeft={<Plus className="h-4 w-4" />}
              onClick={() => setNewMachineModalOpen(true)}
            >
              Deploy Target Machine
            </CyberButton>
          </div>
        )
      ) : (
        <>
          {/* Target context and injected variables */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-secondary">Target context</span>

              <CyberSelect
                value={targetContextId}
                onChange={setTargetContextId}
                options={[
                  { value: 'universal', label: 'Universal reference', icon: <Globe className="w-3.5 h-3.5 text-muted" /> },
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
                  <span className="text-xs text-muted">{contextMachine.os}</span>
                  <button
                    onClick={() => navigate(`/target/${contextMachine.id}`)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-callout-info-fg hover:underline cursor-pointer"
                  >
                    <span>Open Target Page</span>
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>

            <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono tabular-nums text-xs">
              <div className="flex items-center gap-1.5">
                <dt className="text-muted">TARGET</dt>
                <dd className="text-primary">{globalVars.targetIp || '10.10.10.X'}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-muted">LHOST</dt>
                <dd className="text-primary">{globalVars.lhost || '10.10.14.X'}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="text-muted">LPORT</dt>
                <dd className="text-primary">{globalVars.lport || '4444'}</dd>
              </div>
            </dl>
          </div>

          {/* Search and filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                id="methodology-search-input"
                name="methodology-search"
                aria-label="Search methodology commands and techniques"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search commands, techniques, tools (ffuf, linpeas, kerberoast…)"
                className="h-11 w-full rounded-lg border border-subtle bg-surface-card pl-10 pr-10 text-sm text-primary transition-colors placeholder:text-muted focus:border-accent focus:outline-none sm:h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:text-primary cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Phase chips: single line, scrollable */}
            <div className="-mx-4 overflow-x-auto no-scrollbar px-4 sm:mx-0 sm:px-0">
              <div className="flex min-w-max items-center gap-1.5 py-0.5">
                <button
                  onClick={() => setSelectedPhaseNumber('all')}
                  className={`${chipBase} ${selectedPhaseNumber === 'all' ? chipOn : chipOff}`}
                >
                  All 8 Phases
                </button>

                {MASTER_METHODOLOGY_FRAMEWORK.map((phase) => {
                  const isSelected = selectedPhaseNumber === phase.phaseNumber;
                  return (
                    <button
                      key={phase.id}
                      onClick={() => setSelectedPhaseNumber(phase.phaseNumber)}
                      className={`${chipBase} ${isSelected ? chipOn : chipOff}`}
                    >
                      <span className="font-mono text-[11px] tabular-nums text-muted">0{phase.phaseNumber}</span>
                      <span>{phase.subtitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Service branch chips */}
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="-mx-4 min-w-0 flex-1 overflow-x-auto no-scrollbar px-4 max-sm:basis-full sm:mx-0 sm:px-0">
                <div className="flex min-w-max items-center gap-1.5 py-0.5">
                  <span className="mr-1 flex-shrink-0 text-xs text-muted">Branches</span>
                  <button
                    onClick={() => setSelectedBranch('all')}
                    className={`${chipBase} ${selectedBranch === 'all' ? chipOn : chipOff}`}
                  >
                    All Branches
                  </button>

                  {SERVICE_BRANCHES.map((b) => {
                    const isSelected = selectedBranch === b.type;
                    return (
                      <button
                        key={b.type}
                        onClick={() => setSelectedBranch(b.type)}
                        className={`${chipBase} ${isSelected ? chipOn : chipOff}`}
                      >
                        {getBranchIcon(b.type)}
                        <span>{b.name.split(':')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center gap-2 text-xs">
                <button
                  onClick={expandAll}
                  className="inline-flex min-h-8 items-center text-muted underline-offset-2 hover:text-primary hover:underline cursor-pointer [@media(pointer:coarse)]:min-h-11"
                >
                  Expand All
                </button>
                <span className="text-muted" aria-hidden="true">|</span>
                <button
                  onClick={collapseAll}
                  className="inline-flex min-h-8 items-center text-muted underline-offset-2 hover:text-primary hover:underline cursor-pointer [@media(pointer:coarse)]:min-h-11"
                >
                  Collapse All
                </button>
              </div>
            </div>
          </div>

          {/* Phases: plain sections, not cards */}
          <div>
            {filteredPhases.length === 0 ? (
              <div className="mx-auto max-w-sm space-y-2 py-12 text-center">
                <Compass className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                <div className="font-semibold text-primary">No matching methodology tasks found</div>
                <p className="text-sm text-muted">
                  Try a different query, or reset the phase and branch filters.
                </p>
              </div>
            ) : (
              filteredPhases.map((phase) => {
                const isExpanded = Boolean(expandedPhases[phase.id]);
                const taskCount = phase.subcategories.reduce((acc, s) => acc + s.items.length, 0);

                return (
                  <motion.section
                    key={phase.id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.08 }}
                    transition={TACTICAL_SPRING}
                    className="border-b border-subtle"
                  >
                    <button
                      onClick={() => togglePhase(phase.id)}
                      aria-expanded={isExpanded}
                      className="flex min-h-11 w-full items-center justify-between gap-4 py-3 text-left transition-colors hover:bg-surface-hover cursor-pointer"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 w-6 flex-shrink-0 font-mono text-xs font-medium tabular-nums text-muted">
                          0{phase.phaseNumber}
                        </span>
                        <div className="min-w-0">
                          <h2 className="text-sm font-semibold text-primary">{phase.title}</h2>
                          <p className="mt-0.5 text-xs text-muted">{phase.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-3">
                        <span className="text-xs tabular-nums text-muted">
                          {taskCount} micro-tasks
                        </span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
                        )}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0, transition: { duration: 0.12 } }}
                          transition={TACTICAL_SPRING}
                          className="space-y-6 overflow-hidden pb-5 pl-0 sm:pl-9"
                        >
                          {phase.subcategories.map((subcat) => (
                            <div key={subcat.id} className="space-y-1">
                              <div className="flex items-center justify-between pb-1">
                                <div className="flex items-center gap-2">
                                  {subcat.serviceBranch && getBranchIcon(subcat.serviceBranch)}
                                  <h3 className="text-xs font-semibold text-secondary">
                                    {subcat.title}
                                  </h3>
                                </div>

                                {subcat.serviceBranch && subcat.serviceBranch !== 'universal' && (
                                  <span className="text-xs text-muted">
                                    {subcat.serviceBranch}
                                  </span>
                                )}
                              </div>

                              <div className="divide-y divide-cyber-border">
                                {subcat.items.map((item) => {
                                  const isCopied = copiedId === item.id;

                                  return (
                                    <div key={item.id} className="space-y-2 py-3">
                                      <div>
                                        <div className="text-sm font-medium text-primary">{item.title}</div>
                                        <div className="mt-0.5 text-xs text-muted">
                                          {item.description}
                                        </div>
                                      </div>

                                      {item.commandSnippet && (
                                        <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-inverse p-2 text-[12px]">
                                          <div
                                            tabIndex={0}
                                            role="region"
                                            aria-label={`Command for ${item.title}`}
                                            className="min-w-0 flex-1 select-all overflow-x-auto no-scrollbar whitespace-nowrap rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                          >
                                            <SyntaxHighlightedCommand
                                              command={interpolateCommand(item.commandSnippet, globalVars)}
                                              className="text-[12px]"
                                            />
                                          </div>

                                          <button
                                            onClick={() => handleCopy(item.commandSnippet!, item.id)}
                                            className="inline-flex min-h-8 flex-shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium text-on-inverse-muted transition-[transform,background-color,color] hover:bg-surface-inverse-elevated hover:text-on-inverse active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:min-h-11"
                                            title="Copy command to clipboard"
                                          >
                                            {isCopied ? (
                                              <>
                                                <Check className="h-3.5 w-3.5 text-syntax-string" />
                                                <span className="text-syntax-string">Copied</span>
                                              </>
                                            ) : (
                                              <>
                                                <Copy className="h-3.5 w-3.5" />
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
                  </motion.section>
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

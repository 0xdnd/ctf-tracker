import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  MinusCircle, 
  AlertTriangle, 
  Compass, 
  RotateCcw, 
  Download, 
  Copy, 
  Check, 
  Plus, 
  FileCode, 
  Terminal, 
  ChevronDown, 
  ChevronRight,
  ExternalLink,
  Zap,
  Tag,
  FolderGit2,
  Filter
} from 'lucide-react';
import { Machine } from '../../types';
import { ChecklistItemStatus, ChecklistItem, MethodologyPhase } from '../../types/checklist';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { generateApplicablePhases, SERVICE_BRANCHES } from '../../data/methodologyFramework';
import { parseNmapScanOutput } from '../../utils/nmapParser';
import { exportChecklistToMarkdown } from '../../utils/checklistMarkdownExporter';
import { evaluateRabbitHoleStatus } from '../../utils/rabbitHoleDetector';
import { interpolateCommand, playCyberSound, triggerRootCelebration } from '../../utils/helpers';

interface ChecklistWorkspaceProps {
  machine: Machine;
  onOpenInWriteup?: () => void;
}

export const ChecklistWorkspace: React.FC<ChecklistWorkspaceProps> = ({
  machine,
  onOpenInWriteup,
}) => {
  const {
    setMachineOpenPorts,
    setChecklistItemStatus,
    setChecklistItemNotes,
    resetMachineChecklist,
    globalVars,
    soundEnabled,
  } = useCtfStore(
    useShallow((s) => ({
      setMachineOpenPorts: s.setMachineOpenPorts,
      setChecklistItemStatus: s.setChecklistItemStatus,
      setChecklistItemNotes: s.setChecklistItemNotes,
      resetMachineChecklist: s.resetMachineChecklist,
      globalVars: s.globalVars,
      soundEnabled: s.soundEnabled,
    }))
  );

  const [expandedPhaseId, setExpandedPhaseId] = useState<string>('phase-01-surface-mapping');
  const [nmapModalOpen, setNmapModalOpen] = useState(false);
  const [nmapInputText, setNmapInputText] = useState('');
  const [customPortInput, setCustomPortInput] = useState('');
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [notesOpenMap, setNotesOpenMap] = useState<Record<string, boolean>>({});
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  const openPorts = machine.openPorts || [];
  const checklist = machine.checklist;
  const itemsState = checklist?.itemsState || {};
  const activeItemId = checklist?.activeItemId;

  // Generate applicable methodology phases based on OS and detected ports
  const applicablePhases = useMemo(() => {
    return generateApplicablePhases(machine, openPorts);
  }, [machine, openPorts]);

  // Rabbit hole status evaluation
  const rabbitHoleEval = useMemo(() => {
    return evaluateRabbitHoleStatus(machine, 30);
  }, [machine]);

  // Compute overall statistics
  const stats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let na = 0;

    applicablePhases.forEach((phase) => {
      phase.subcategories.forEach((subcat) => {
        subcat.items.forEach((item) => {
          const status = itemsState[item.id]?.status || 'todo';
          if (status === 'done') completed++;
          else if (status === 'in_progress') inProgress++;
          else if (status === 'na') na++;
          total++;
        });
      });
    });

    const activeTotal = total - na;
    const percentage = activeTotal > 0 ? Math.round((completed / activeTotal) * 100) : 0;

    return { total, completed, inProgress, na, activeTotal, percentage };
  }, [applicablePhases, itemsState]);

  // Determine current active objective breadcrumb
  const currentBreadcrumb = useMemo(() => {
    if (!activeItemId) return null;
    for (const phase of applicablePhases) {
      for (const subcat of phase.subcategories) {
        const item = subcat.items.find((i) => i.id === activeItemId);
        if (item) {
          return {
            phaseTitle: `Phase 0${phase.phaseNumber}`,
            subcatTitle: subcat.title.replace(/^Branch [A-Z]:\s*/, ''),
            itemTitle: item.title,
          };
        }
      }
    }
    return null;
  }, [activeItemId, applicablePhases]);

  // Port management handlers
  const handleTogglePort = (port: number) => {
    let nextPorts: number[];
    if (openPorts.includes(port)) {
      nextPorts = openPorts.filter((p) => p !== port);
    } else {
      nextPorts = [...openPorts, port].sort((a, b) => a - b);
    }
    setMachineOpenPorts(machine.id, nextPorts);
    if (soundEnabled) playCyberSound('toggle');
  };

  const handleAddCustomPort = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(customPortInput.trim(), 10);
    if (!isNaN(p) && p >= 1 && p <= 65535 && !openPorts.includes(p)) {
      const nextPorts = [...openPorts, p].sort((a, b) => a - b);
      setMachineOpenPorts(machine.id, nextPorts);
      setCustomPortInput('');
      if (soundEnabled) playCyberSound('click');
    }
  };

  const handleApplyNmapScan = () => {
    if (!nmapInputText.trim()) return;
    const { ports } = parseNmapScanOutput(nmapInputText);
    if (ports.length > 0) {
      const merged = Array.from(new Set([...openPorts, ...ports])).sort((a, b) => a - b);
      setMachineOpenPorts(machine.id, merged);
      setNmapModalOpen(false);
      setNmapInputText('');
      if (soundEnabled) playCyberSound('root');
    }
  };

  const handleStatusClick = (itemId: string, nextStatus: ChecklistItemStatus) => {
    setChecklistItemStatus(machine.id, itemId, nextStatus);
    if (nextStatus === 'done') {
      if (soundEnabled) playCyberSound('toggle');
      // If reached 100% celebration
      if (stats.completed + 1 >= stats.activeTotal && stats.activeTotal > 0) {
        triggerRootCelebration();
        if (soundEnabled) playCyberSound('root');
      }
    } else {
      if (soundEnabled) playCyberSound('click');
    }
  };

  const handleCopySnippet = (rawSnippet: string, itemId: string) => {
    const interpolated = interpolateCommand(rawSnippet, globalVars);
    navigator.clipboard.writeText(interpolated);
    setCopiedItemId(itemId);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedItemId(null), 2000);
  };

  const handleExportMarkdown = () => {
    const md = exportChecklistToMarkdown(machine);
    navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedMarkdown(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    const md = exportChecklistToMarkdown(machine);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${machine.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-attack-checklist.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (soundEnabled) playCyberSound('root');
  };

  const commonPortPresets = [
    { label: 'Web (80, 443)', ports: [80, 443] },
    { label: 'SMB (445)', ports: [445] },
    { label: 'SSH (22)', ports: [22] },
    { label: 'WinRM / RDP', ports: [5985, 3389] },
    { label: 'SQL (1433, 3306)', ports: [1433, 3306] },
    { label: 'AD / LDAP (88, 389)', ports: [88, 389] },
    { label: 'DNS / SNMP', ports: [53, 161] },
  ];

  return (
    <div className="space-y-4 font-mono text-xs text-cyber-text">
      
      {/* SECTION 1: TOP TACTICAL BREADCRUMB & PROGRESS HUD */}
      <div className="p-3.5 rounded-xl border border-cyber-border bg-cyber-bg/90 shadow-md space-y-3">
        
        {/* Breadcrumb Pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyber-border/70 pb-2.5">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyber-cyan animate-spin-slow" />
            <span className="text-[10px] text-cyber-muted uppercase font-bold tracking-wider">
              TACTICAL OBJECTIVE:
            </span>
            {currentBreadcrumb ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className="text-cyber-cyan">{currentBreadcrumb.phaseTitle}</span>
                <span className="text-cyber-muted">➔</span>
                <span className="text-cyber-amber">{currentBreadcrumb.subcatTitle}</span>
                <span className="text-cyber-muted">➔</span>
                <span className="text-white font-bold">{currentBreadcrumb.itemTitle}</span>
              </div>
            ) : (
              <span className="text-xs text-cyber-muted italic">
                Standby — select a micro-task to set active engagement focus.
              </span>
            )}
          </div>

          {/* Quick Export / Reset Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportMarkdown}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyber-card border border-cyber-border hover:border-cyber-cyan text-white text-[11px] transition-all"
              title="Copy Obsidian / GitBook formatted Markdown checklist"
            >
              {copiedMarkdown ? (
                <>
                  <Check className="w-3 h-3 text-cyber-emerald" />
                  <span className="text-cyber-emerald font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-cyber-cyan" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="p-1 rounded bg-cyber-card border border-cyber-border hover:border-cyber-emerald text-cyber-muted hover:text-white transition-colors"
              title="Download .md checklist file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                if (confirm(`Reset all checklist task progress for ${machine.name}?`)) {
                  resetMachineChecklist(machine.id);
                  if (soundEnabled) playCyberSound('root');
                }
              }}
              className="p-1 rounded bg-cyber-card border border-cyber-border text-cyber-muted hover:text-cyber-crimson transition-colors"
              title="Reset Checklist Progress"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyber-emerald" /> METHODOLOGY COMPLETION
            </span>
            <span className="text-cyber-emerald font-mono">
              {stats.completed} / {stats.activeTotal} Tasks ({stats.percentage}%)
            </span>
          </div>

          <div className="w-full bg-cyber-card h-2.5 rounded-full border border-cyber-border overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-cyber-emerald via-cyber-cyan to-cyber-purple shadow-glow-emerald"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-cyber-muted font-mono pt-0.5">
            <span>Completed: <strong className="text-cyber-emerald">{stats.completed}</strong></span>
            <span>In Progress: <strong className="text-cyber-cyan">{stats.inProgress}</strong></span>
            <span>Pending: <strong className="text-cyber-amber">{stats.activeTotal - stats.completed - stats.inProgress}</strong></span>
            <span>N/A: <strong className="text-gray-400">{stats.na}</strong></span>
          </div>
        </div>

      </div>

      {/* SECTION 2: HEURISTIC RABBIT-HOLE WARNING & DEAD-END FALLBACK BANNER */}
      {rabbitHoleEval.isRabbitHole && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl border border-cyber-amber/50 bg-cyber-amber/10 shadow-lg shadow-glow-amber/20 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 max-w-xl">
            <AlertTriangle className="w-5 h-5 text-cyber-amber flex-shrink-0 mt-0.5 animate-bounce" />
            <div>
              <span className="font-bold text-white text-xs block">
                HEURISTIC ALERT: POTENTIAL RABBIT HOLE DETECTED ({rabbitHoleEval.elapsedMinutes}m elapsed)
              </span>
              <p className="text-[11px] text-cyber-text leading-relaxed mt-0.5">
                {rabbitHoleEval.message}
              </p>
            </div>
          </div>

          {rabbitHoleEval.recommendedFallback && (
            <button
              onClick={() => {
                if (rabbitHoleEval.recommendedFallback) {
                  setChecklistItemStatus(machine.id, rabbitHoleEval.recommendedFallback.id, 'in_progress');
                  if (soundEnabled) playCyberSound('root');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-amber text-black font-bold text-xs hover:bg-cyber-amber/90 transition-all shadow-glow-amber"
            >
              <span>Dead-End Fallback:</span>
              <span className="underline truncate max-w-[180px]">
                {rabbitHoleEval.recommendedFallback.title}
              </span>
            </button>
          )}
        </motion.div>
      )}

      {/* SECTION 3: OPEN PORTS PROFILER & SERVICE BRANCH INJECTOR */}
      <div className="p-3.5 rounded-xl border border-cyber-border bg-cyber-card space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyber-cyan" />
            <span className="font-bold text-white text-xs uppercase tracking-wider">
              DYNAMIC SERVICE BRANCHING & OPEN PORTS
            </span>
            <span className="text-[10px] text-cyber-muted font-mono">
              ({openPorts.length} detected ports)
            </span>
          </div>

          {/* Import Nmap Scan Button */}
          <button
            onClick={() => setNmapModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyber-bg border border-cyber-cyan/40 text-cyber-cyan hover:bg-cyber-cyan hover:text-black text-xs font-semibold transition-all shadow-glow-cyan/20"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Import Nmap Scan</span>
          </button>
        </div>

        {/* Quick Port Presets Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-cyber-muted uppercase font-semibold mr-1">
            Quick Toggle:
          </span>
          {commonPortPresets.map((preset) => {
            const hasAny = preset.ports.some((p) => openPorts.includes(p));
            return (
              <button
                key={preset.label}
                onClick={() => {
                  if (hasAny) {
                    // Remove
                    const updated = openPorts.filter((p) => !preset.ports.includes(p));
                    setMachineOpenPorts(machine.id, updated);
                  } else {
                    // Add
                    const updated = Array.from(new Set([...openPorts, ...preset.ports])).sort((a, b) => a - b);
                    setMachineOpenPorts(machine.id, updated);
                  }
                  if (soundEnabled) playCyberSound('toggle');
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                  hasAny
                    ? 'bg-cyber-cyan/15 text-cyber-cyan border-cyber-cyan shadow-glow-cyan/20'
                    : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Active Open Ports Badges & Custom Add */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {openPorts.length === 0 ? (
            <span className="text-[11px] text-cyber-muted italic">
              No open ports assigned yet. Click a quick toggle above or paste your Nmap output to inject service-specific tasks.
            </span>
          ) : (
            openPorts.map((p) => (
              <span
                key={p}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyber-bg border border-cyber-border text-cyber-emerald font-bold text-xs group"
              >
                <span>Port {p}</span>
                <button
                  onClick={() => handleTogglePort(p)}
                  className="text-cyber-muted hover:text-cyber-crimson ml-0.5"
                  title="Remove port"
                >
                  ✕
                </button>
              </span>
            ))
          )}

          {/* Add Port Field */}
          <form onSubmit={handleAddCustomPort} className="flex items-center gap-1 ml-auto">
            <input
              id="custom-port-input"
              name="custom-port"
              aria-label="Custom Port Number"
              type="number"
              min="1"
              max="65535"
              value={customPortInput}
              onChange={(e) => setCustomPortInput(e.target.value)}
              placeholder="Custom Port..."
              className="w-24 bg-cyber-bg px-2 py-0.5 rounded border border-cyber-border text-white text-xs focus:outline-none focus:border-cyber-cyan"
            />
            <button
              type="submit"
              className="p-1 rounded bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-white"
              title="Add Port"
            >
              <Plus className="w-3 h-3" />
            </button>
          </form>
        </div>
      </div>

      {/* SECTION 4: THE 8-PHASE METHODOLOGY ACCORDION WORKSPACE */}
      <div className="space-y-3">
        {applicablePhases.map((phase) => {
          const isExpanded = expandedPhaseId === phase.id;

          // Phase statistics
          let phaseItemsCount = 0;
          let phaseDoneCount = 0;
          phase.subcategories.forEach((sub) => {
            sub.items.forEach((it) => {
              const s = itemsState[it.id]?.status || 'todo';
              if (s !== 'na') phaseItemsCount++;
              if (s === 'done') phaseDoneCount++;
            });
          });

          const phasePct = phaseItemsCount > 0 ? Math.round((phaseDoneCount / phaseItemsCount) * 100) : 0;

          return (
            <div
              key={phase.id}
              className="rounded-xl border border-cyber-border bg-cyber-card overflow-hidden shadow-sm transition-all"
            >
              {/* Phase Header Accordion Trigger */}
              <button
                onClick={() => setExpandedPhaseId(isExpanded ? '' : phase.id)}
                className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                  isExpanded ? 'bg-cyber-bg/80 border-b border-cyber-border' : 'hover:bg-cyber-cardHover'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyber-bg border border-cyber-border text-cyber-cyan font-bold text-xs">
                    0{phase.phaseNumber}
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs sm:text-sm tracking-wide flex items-center gap-2">
                      <span>{phase.title}</span>
                      {phasePct === 100 && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyber-emerald/10 border border-cyber-emerald/40 text-cyber-emerald font-bold">
                          COMPLETED
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-cyber-muted mt-0.5">{phase.subtitle}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Mini Phase Progress Bar */}
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="w-24 bg-cyber-bg h-1.5 rounded-full border border-cyber-border overflow-hidden">
                      <div
                        className="h-full bg-cyber-emerald transition-all duration-300"
                        style={{ width: `${phasePct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-cyber-emerald font-bold w-9 text-right">
                      {phasePct}%
                    </span>
                  </div>

                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-cyber-muted" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-cyber-muted" />
                  )}
                </div>
              </button>

              {/* Phase Subcategories & Micro-Tasks */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-3.5 space-y-4 bg-cyber-bg/40"
                  >
                    {phase.subcategories.map((subcat) => (
                      <div key={subcat.id} className="space-y-2">
                        {/* Subcategory Header */}
                        <div className="flex items-center justify-between border-b border-cyber-border/70 pb-1 text-[11px] font-bold text-cyber-cyan uppercase tracking-wider">
                          <span>{subcat.title}</span>
                          {subcat.serviceBranch && subcat.serviceBranch !== 'universal' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyber-cyan/10 border border-cyber-cyan/30 text-cyber-cyan">
                              {subcat.serviceBranch.toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Subcategory Items */}
                        <div className="space-y-1.5">
                          {subcat.items.map((item) => {
                            const itemRecord = itemsState[item.id];
                            const status: ChecklistItemStatus = itemRecord?.status || 'todo';
                            const isCurrentActive = activeItemId === item.id;
                            const isNotesOpen = Boolean(notesOpenMap[item.id]);

                            return (
                              <div
                                key={item.id}
                                className={`p-2.5 rounded-lg border transition-all ${
                                  isCurrentActive
                                    ? 'bg-cyber-card border-cyber-cyan/60 shadow-glow-cyan/20 ring-1 ring-cyber-cyan/40'
                                    : status === 'done'
                                    ? 'bg-cyber-card/60 border-cyber-emerald/30'
                                    : status === 'na'
                                    ? 'bg-cyber-bg/50 border-cyber-border/50 opacity-60'
                                    : 'bg-cyber-card border-cyber-border hover:border-cyber-borderGlow'
                                }`}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  {/* Left: 4-State Cycle Button & Title */}
                                  <div className="flex items-start gap-2.5 flex-1 min-w-[240px]">
                                    <button
                                      onClick={() => {
                                        // Cycle through states: todo -> in_progress -> done -> na -> todo
                                        const next: ChecklistItemStatus =
                                          status === 'todo'
                                            ? 'in_progress'
                                            : status === 'in_progress'
                                            ? 'done'
                                            : status === 'done'
                                            ? 'na'
                                            : 'todo';
                                        handleStatusClick(item.id, next);
                                      }}
                                      className="mt-0.5 p-0.5 rounded hover:bg-cyber-bg transition-colors"
                                      title={`Current: ${status.toUpperCase()} (Click to toggle)`}
                                    >
                                      {status === 'done' ? (
                                        <CheckCircle2 className="w-4 h-4 text-cyber-emerald shadow-glow-emerald" />
                                      ) : status === 'in_progress' ? (
                                        <Clock className="w-4 h-4 text-cyber-cyan animate-spin-slow" />
                                      ) : status === 'na' ? (
                                        <MinusCircle className="w-4 h-4 text-gray-500" />
                                      ) : (
                                        <Circle className="w-4 h-4 text-cyber-muted hover:text-white" />
                                      )}
                                    </button>

                                    <div>
                                      <div
                                        className={`font-semibold text-xs transition-colors ${
                                          status === 'done'
                                            ? 'text-cyber-emerald line-through opacity-85'
                                            : status === 'in_progress'
                                            ? 'text-white font-bold'
                                            : status === 'na'
                                            ? 'text-gray-500 line-through'
                                            : 'text-white'
                                        }`}
                                      >
                                        {item.title}
                                      </div>
                                      {item.description && (
                                        <div className="text-[10px] text-cyber-muted mt-0.5">
                                          {item.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: State Selector Pills & Action Buttons */}
                                  <div className="flex items-center gap-1.5 text-[10px]">
                                    {/* State Switcher Buttons */}
                                    <div className="flex items-center gap-1 bg-cyber-bg p-0.5 rounded border border-cyber-border">
                                      <motion.button
                                        whileHover={{ scale: 1.06 }}
                                        whileTap={{ scale: 0.92 }}
                                        onClick={() => handleStatusClick(item.id, 'todo')}
                                        className={`px-1.5 py-0.5 rounded transition-colors ${
                                          status === 'todo'
                                            ? 'bg-cyber-card text-white font-bold border border-cyber-border shadow-sm'
                                            : 'text-cyber-muted hover:text-white'
                                        }`}
                                      >
                                        Todo
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.06 }}
                                        whileTap={{ scale: 0.92 }}
                                        onClick={() => handleStatusClick(item.id, 'in_progress')}
                                        className={`px-1.5 py-0.5 rounded transition-colors ${
                                          status === 'in_progress'
                                            ? 'bg-cyber-cyan/20 text-cyber-cyan font-bold border border-cyber-cyan/40 shadow-glow-cyan'
                                            : 'text-cyber-muted hover:text-white'
                                        }`}
                                      >
                                        In-Progress
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.06 }}
                                        whileTap={{ scale: 0.92 }}
                                        onClick={() => handleStatusClick(item.id, 'done')}
                                        className={`px-1.5 py-0.5 rounded transition-colors ${
                                          status === 'done'
                                            ? 'bg-cyber-emerald/20 text-cyber-emerald font-bold border border-cyber-emerald/40 shadow-glow-emerald'
                                            : 'text-cyber-muted hover:text-white'
                                        }`}
                                      >
                                        Done
                                      </motion.button>
                                      <motion.button
                                        whileHover={{ scale: 1.06 }}
                                        whileTap={{ scale: 0.92 }}
                                        onClick={() => handleStatusClick(item.id, 'na')}
                                        className={`px-1.5 py-0.5 rounded transition-colors ${
                                          status === 'na'
                                            ? 'bg-gray-800 text-gray-400 font-bold'
                                            : 'text-cyber-muted hover:text-white'
                                        }`}
                                      >
                                        N/A
                                      </motion.button>
                                    </div>

                                    {/* Toggle Notes Drawer Button */}
                                    <button
                                      onClick={() =>
                                        setNotesOpenMap((prev) => ({
                                          ...prev,
                                          [item.id]: !prev[item.id],
                                        }))
                                      }
                                      className={`px-2 py-0.5 rounded border transition-colors ${
                                        itemRecord?.notes
                                          ? 'bg-cyber-amber/10 border-cyber-amber/40 text-cyber-amber font-bold'
                                          : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-white'
                                      }`}
                                    >
                                      {itemRecord?.notes ? '📝 Note' : '+ Note'}
                                    </button>
                                  </div>
                                </div>

                                {/* Command Snippet Preview */}
                                {item.commandSnippet && (
                                  <div className="mt-2 flex items-center justify-between gap-2 p-1.5 rounded bg-cyber-code border border-cyber-border/70 text-[11px] font-mono">
                                    <span className="truncate text-cyber-cyan select-all">
                                      {interpolateCommand(item.commandSnippet, globalVars)}
                                    </span>
                                    <button
                                      onClick={() => handleCopySnippet(item.commandSnippet!, item.id)}
                                      className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-cyber-bg hover:bg-cyber-card border border-cyber-border text-cyber-muted hover:text-white flex-shrink-0 transition-colors"
                                      title="Copy interpolated command"
                                    >
                                      {copiedItemId === item.id ? (
                                        <>
                                          <Check className="w-3 h-3 text-cyber-emerald" />
                                          <span className="text-cyber-emerald font-bold">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                )}

                                {/* Inline Field Notes Drawer */}
                                {isNotesOpen && (
                                  <div className="mt-2 pt-2 border-t border-cyber-border/60">
                                    <textarea
                                      id={`checklist-notes-${machine.id}-${item.id}`}
                                      name={`checklist-notes-${item.id}`}
                                      aria-label="Record task notes, credentials, or parameters"
                                      rows={2}
                                      value={itemRecord?.notes || ''}
                                      onChange={(e) =>
                                        setChecklistItemNotes(machine.id, item.id, e.target.value)
                                      }
                                      placeholder="Record discovered credentials, parameters, or scan snippets for this task..."
                                      className="w-full bg-cyber-bg p-2 rounded border border-cyber-border text-white text-[11px] font-mono focus:outline-none focus:border-cyber-cyan resize-none"
                                    />
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
            </div>
          );
        })}
      </div>

      {/* MODAL: IMPORT NMAP SCAN RESULTS */}
      {nmapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-xl border border-cyber-border bg-cyber-card shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-cyber-border pb-2.5">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyber-cyan" />
                <h3 className="font-bold text-white text-sm">IMPORT NMAP SCAN OUTPUT</h3>
              </div>
              <button
                onClick={() => setNmapModalOpen(false)}
                className="text-cyber-muted hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-cyber-muted">
              Paste the stdout of your Nmap scan (e.g. <code className="text-white">nmap -sC -sV</code>). The parser will extract all open TCP/UDP ports and dynamically inject the corresponding methodology branches!
            </p>

            <textarea
              id="nmap-import-textarea"
              name="nmap-import-text"
              aria-label="Paste Nmap scan stdout"
              rows={8}
              value={nmapInputText}
              onChange={(e) => setNmapInputText(e.target.value)}
              placeholder={`22/tcp   open  ssh     OpenSSH 8.2p1\n80/tcp   open  http    Apache httpd 2.4.41\n445/tcp  open  microsoft-ds\n1433/tcp open  ms-sql-s`}
              className="w-full bg-cyber-bg p-3 rounded-lg border border-cyber-border text-white text-xs font-mono focus:outline-none focus:border-cyber-cyan resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-cyber-border">
              <button
                onClick={() => setNmapModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyNmapScan}
                disabled={!nmapInputText.trim()}
                className="px-4 py-2 rounded-lg bg-cyber-cyan text-black font-bold text-xs hover:bg-cyber-cyan/90 transition-all shadow-glow-cyan disabled:opacity-50"
              >
                Extract Ports & Update Checklist
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

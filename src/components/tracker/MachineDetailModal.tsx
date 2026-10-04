import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { 
  X, 
  Flag, 
  ExternalLink, 
  Play, 
  Pause, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Star, 
  FileText, 
  Tag, 
  Crosshair, 
  AlertCircle,
  Clock,
  Trash2,
  ListChecks,
  Maximize2,
  Zap,
  Printer,
  ShieldAlert,
  AlertOctagon,
  CheckCircle2,
  BookOpen,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Lock,
  Upload,
  Radio,
  FileCode
} from 'lucide-react';
import { useCtfStore, BRAND_THEMES } from '../../store/useCtfStore';
import { applyScanTextToMachine } from '../../utils/scanCardHelper';
import { useShallow } from 'zustand/react/shallow';
import { PipelineStatus, Difficulty, Machine } from '../../types';
import { formatSeconds, playCyberSound, triggerRootCelebration, safeCopyToClipboard, sanitizeExternalUrl, interpolateCommand } from '../../utils/helpers';
import { ChecklistWorkspace } from '../checklist/ChecklistWorkspace';
import { PlatformBadge } from '../common/PlatformBadge';
import { OsBadge } from '../common/OsBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { DifficultyBadge } from '../common/DifficultyBadge';
import { ShareLinkButton } from '../common/ShareLinkButton';
import { classifyMachine, VULN_CATEGORIES } from '../../utils/categoryUtils';
import { getRecommendedNotesForMachine } from '../../utils/obsidianManualUtils';
import { QuickCommandsTab } from './QuickCommandsTab';
import { DRAWER_SLIDE_TRANSITION } from '../../utils/motionTokens';
import { confirmAction } from '../../store/useConfirmStore';

const ModalSessionTimerDisplay: React.FC<{ machineId: string; fallbackSeconds: number; isActiveTarget: boolean }> = React.memo(({ machineId, fallbackSeconds, isActiveTarget }) => {
  const activeTimerSeconds = useCtfStore((s) =>
    s.activeTargetId === machineId ? s.activeTimerSeconds : 0
  );
  return (
    <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
      {formatSeconds(isActiveTarget ? activeTimerSeconds : fallbackSeconds)}
    </div>
  );
});

export const MachineDetailModal: React.FC = () => {
  const {
    selectedMachineId,
    setSelectedMachineId,
    setFilters,
    machines,
    updateMachine,
    updateMachineStatus,
    activeTargetId,
    setActiveTarget,
    isTimerRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    soundEnabled,
    appBrand,
    setActiveTab,
    setWriteupMachineId,
    setReportMachineId,
    deleteMachine,
    setReconAutomationModalOpen,
    setAssignIpMachineId,
    globalVars,
    userNotes = [],
  } = useCtfStore(
    useShallow((s) => ({
      selectedMachineId: s.selectedMachineId,
      setSelectedMachineId: s.setSelectedMachineId,
      machines: s.machines,
      updateMachine: s.updateMachine,
      updateMachineStatus: s.updateMachineStatus,
      activeTargetId: s.activeTargetId,
      setActiveTarget: s.setActiveTarget,
      isTimerRunning: s.isTimerRunning,
      startTimer: s.startTimer,
      pauseTimer: s.pauseTimer,
      resetTimer: s.resetTimer,
      soundEnabled: s.soundEnabled,
      appBrand: s.appBrand,
      setActiveTab: s.setActiveTab,
      setWriteupMachineId: s.setWriteupMachineId,
      setReportMachineId: s.setReportMachineId,
      deleteMachine: s.deleteMachine,
      setReconAutomationModalOpen: s.setReconAutomationModalOpen,
      setAssignIpMachineId: s.setAssignIpMachineId,
      setFilters: s.setFilters,
      globalVars: s.globalVars,
      userNotes: s.userNotes,
    }))
  );

  const navigate = useNavigate();

  const [showUserFlag, setShowUserFlag] = useState(false);
  const [showRootFlag, setShowRootFlag] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedRoot, setCopiedRoot] = useState(false);
  const [copiedReportMd, setCopiedReportMd] = useState(false);
  const [copiedWalkthrough, setCopiedWalkthrough] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'checklist' | 'commands' | 'report' | 'walkthrough'>('overview');
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
  const [isModalDragOver, setIsModalDragOver] = useState(false);
  const [modalScanToast, setModalScanToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const currentMachine = machines.find((m) => m.id === selectedMachineId);
  const lastMachineRef = useRef<Machine | undefined>(currentMachine);
  if (currentMachine) {
    lastMachineRef.current = currentMachine;
  }
  const machine = currentMachine || lastMachineRef.current;
  const isActiveTarget = Boolean(machine && activeTargetId === machine.id);

  const handleModalFileDrop = (files: FileList | null) => {
    if (!files || files.length === 0 || !machine) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setModalScanToast({ message: 'Scan file was empty', isError: true });
        setTimeout(() => setModalScanToast(null), 2500);
        return;
      }
      const res = applyScanTextToMachine(machine, content);
      if (res) {
        updateMachine(machine.id, res.updatedMachine);
        if (soundEnabled) playCyberSound('engage');
        setModalScanToast({ message: `Successfully ingested ${res.parsedCount} open ports [${res.format.toUpperCase()}]` });
      } else {
        setModalScanToast({ message: 'No open ports detected in scan output', isError: true });
      }
      setTimeout(() => setModalScanToast(null), 3000);
    };
    reader.readAsText(file);
  };

  const isUserPwned = Boolean(
    machine && (
      Boolean(machine.userFlag?.trim()) ||
      ((machine.status === 'foothold' || machine.status === 'root' || machine.status === 'completed') && Boolean(machine.userPwnedAt))
    )
  );

  const isRootPwned = Boolean(
    machine && (
      Boolean(machine.rootFlag?.trim()) ||
      ((machine.status === 'root' || machine.status === 'completed') && Boolean(machine.rootPwnedAt))
    )
  );

  const checklistCompletedCount = useMemo(() => {
    if (!machine?.checklist?.itemsState) return 0;
    return Object.values(machine.checklist.itemsState).filter((s: any) => s.status === 'done').length;
  }, [machine?.checklist?.itemsState]);

  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const recommendedNotes = useMemo(() => (machine ? getRecommendedNotesForMachine(machine, 4) : []), [machine]);

  const modalRef = useFocusTrap<HTMLDivElement>({
    isActive: Boolean(selectedMachineId),
    onClose: () => setSelectedMachineId(null),
  });

  // Prevent background body scroll when modal is open
  useEffect(() => {
    if (selectedMachineId) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [selectedMachineId]);

  if (!machine) return null;

  const handleCopy = async (text: string, type: 'user' | 'root') => {
    if (!text) return;
    await safeCopyToClipboard(text);
    if (type === 'user') {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } else {
      setCopiedRoot(true);
      setTimeout(() => setCopiedRoot(false), 2000);
    }
    if (soundEnabled) playCyberSound('copy');
  };

  const handleStatusChange = (newStatus: PipelineStatus) => {
    updateMachineStatus(machine.id, newStatus);
    if (newStatus === 'root' || newStatus === 'completed') {
      triggerRootCelebration();
      if (soundEnabled) playCyberSound('root');
    } else {
      if (soundEnabled) playCyberSound('toggle');
    }
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const clean = newTagInput.trim();
    if (!machine.tags.includes(clean)) {
      updateMachine(machine.id, { tags: [...machine.tags, clean] });
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateMachine(machine.id, {
      tags: machine.tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleOpenInWriteup = () => {
    setWriteupMachineId(machine.id);
    setSelectedMachineId(null);
    setActiveTab('writeup');
    navigate(`/writeup/${machine.id}`);
  };

  const activeBrand = BRAND_THEMES.find((b) => b.id === appBrand) || BRAND_THEMES[0];

  const handleCopyReportMd = () => {
    const md = `# EXECUTIVE PENETRATION TESTING REPORT
**Classification:** STRICTLY CONFIDENTIAL // PROPRIETARY
**Target:** ${machine.name} (${machine.ip})
**Platform / OS:** ${machine.platform} // ${machine.os}
**Difficulty:** ${machine.difficulty}
**Assessment Date:** ${new Date().toLocaleDateString()}
**Assessor:** ${activeBrand.namePrefix}${activeBrand.nameSuffix} Offensive Operations

## 1. Executive Summary
During the security assessment of target host ${machine.name} (${machine.ip}), security vulnerabilities were identified allowing adversaries to establish unauthorized footholds and escalate to administrative root privileges.

## 2. Threat Findings Matrix
- **Initial Foothold:** ${machine.tags.slice(0, 3).join(', ') || 'Remote Service Exploitation'} (CVSS 8.8 - HIGH)
- **Privilege Escalation:** ${machine.tags.slice(3, 6).join(', ') || 'Local Misconfiguration'} (CVSS 9.4 - CRITICAL)

## 3. Proof of Concept & Compromise Flags
- **User Flag:** ${machine.userFlag || (machine.userPwnedAt ? 'CAPTURED' : 'PENDING')}
- **Root Flag:** ${machine.rootFlag || (machine.rootPwnedAt ? 'CAPTURED' : 'PENDING')}
- **Notes:** ${machine.quickNotes || machine.writeupMarkdown || 'No detailed transcript logged.'}

## 4. Remediation Plan
1. Immediate: Patch vulnerable exposed services and restrict listening ports.
2. Short-Term: Enforce strict least-privilege policies.
3. Long-Term: Deploy centralized audit logging and EDR telemetry.
`;
    navigator.clipboard.writeText(md);
    setCopiedReportMd(true);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedReportMd(false), 2000);
  };

  const pipelineStages: { id: PipelineStatus; label: string; color: string }[] = [
    { id: 'backlog', label: 'Backlog', color: 'border-cyber-muted text-cyber-muted' },
    { id: 'recon', label: 'Recon In-Progress', color: 'border-cyber-cyan text-callout-info-fg' },
    { id: 'foothold', label: 'Foothold Obtained', color: 'border-cyber-amber text-cyber-amber' },
    { id: 'root', label: 'Root / System Pwned', color: 'border-cyber-crimson text-callout-danger-fg' },
    { id: 'completed', label: 'Completed & Logged', color: 'border-cyber-emerald text-cyber-emerald' },
  ];

  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm font-mono overflow-hidden"
      onClick={() => setSelectedMachineId(null)}
    >
      <motion.div 
        ref={modalRef}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={DRAWER_SLIDE_TRANSITION.enter}
        role="dialog"
        aria-modal="true"
        aria-label={`Machine details for ${machine.name}`}
        className="fixed inset-y-0 right-0 w-full sm:max-w-3xl md:max-w-4xl h-full flex flex-col sm:rounded-l-[24px] border-l border-subtle shadow-2xl bg-surface-base surface-elevated-depth machined-edge overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Pinned at Top) */}
        <div className="flex-shrink-0 flex items-start justify-between border-b border-subtle p-4 sm:p-5 bg-surface-card/95 backdrop-blur-sm sm:rounded-tl-[24px] machined-edge">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <PlatformBadge platform={machine.platform} size="md" variant="hardware" />
              <h2 className="text-xl font-bold text-primary tracking-tight font-sans">{machine.name}</h2>
              <OsBadge os={machine.os} size="sm" variant="hardware" />
              <CategoryBadge machine={machine} size="sm" variant="hardware" />
              <DifficultyBadge difficulty={machine.difficulty} size="sm" variant="hardware" />
              {machine.isActive && (
                <span className="text-[11px] px-2 py-0.5 rounded-[3px] font-mono font-bold bg-amber-100 dark:bg-amber-500/20 text-callout-warn-fg border border-amber-300 dark:border-amber-500/40 flex items-center gap-1 machined-edge">
                  <Lock className="w-3 h-3 text-callout-warn-fg" />
                  <span>ACTIVE LAB</span>
                </span>
              )}
            </div>
            <div className="text-xs text-tertiary dark:text-cyber-muted mt-1 flex flex-wrap items-center gap-3">
              <EditableIpBadge machineId={machine.id} initialIp={machine.ip} size="sm" variant="hardware" showLabel />
              {Boolean(machine.ip && machine.ip.includes('x')) && (
                <button
                  type="button"
                  onClick={() => setAssignIpMachineId(machine.id)}
                  className="px-2.5 py-1 rounded-[3px] bg-amber-100 dark:bg-cyber-amber/15 border border-amber-300 dark:border-cyber-amber/40 text-callout-warn-fg hover:bg-amber-200 dark:hover:bg-cyber-amber hover:text-black font-bold text-[10px] transition-[transform,box-shadow,background-color,border-color,color] flex items-center gap-1 shadow-xs active:scale-[0.97]"
                  title="Target has placeholder IP. Click to assign live spawned IP"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>Assign Spawned IP</span>
                </button>
              )}
              {Boolean(sanitizeExternalUrl(machine.roomUrl)) && (
                <a
                  href={sanitizeExternalUrl(machine.roomUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-callout-info-fg hover:underline font-medium"
                >
                  Official Room <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {machine.isActive ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/40 text-callout-warn-fg border border-amber-300 dark:border-amber-500/40 machined-edge">
                  <Lock className="w-3 h-3 text-callout-warn-fg" />
                  <span>ACTIVE LAB · WRITEUPS PROHIBITED (HTB ToS)</span>
                </span>
              ) : Boolean(sanitizeExternalUrl(machine.writeupUrl)) ? (
                <a
                  href={sanitizeExternalUrl(machine.writeupUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-callout-tip-fg hover:underline font-medium"
                >
                  Writeup <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {machine.isCustom && (
              <button
                onClick={async () => {
                  const ok = await confirmAction({
                    title: `Delete custom machine ${machine.name}?`,
                    body: 'This custom machine and its notes will be permanently removed.',
                    confirmLabel: 'Delete machine',
                    tone: 'danger',
                  });
                  if (ok) {
                    deleteMachine(machine.id);
                  }
                }}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-cyber-bg text-slate-600 dark:text-cyber-muted hover:text-callout-danger-fg dark:hover:text-cyber-crimson border border-slate-200 dark:border-cyber-border transition-colors active:scale-[0.97]"
                title="Delete Custom Machine"
                aria-label="Delete custom machine"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Direct Pentest Pre-Report Button */}
            <button
              onClick={() => setReportMachineId(machine.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/40 text-callout-tip-fg border border-purple-300 dark:border-purple-800/60 hover:bg-purple-200 dark:hover:bg-purple-900/60 hover:text-callout-tip-fg dark:hover:text-primary font-semibold text-xs transition-[transform,box-shadow,background-color,border-color,color] shadow-xs active:scale-[0.97]"
              title="Open Executive Pentest Pre-Report"
            >
              <FileText className="w-3.5 h-3.5 text-callout-tip-fg" />
              <span className="hidden sm:inline">Pre-Report</span>
            </button>

            <button
              onClick={() => {
                setSelectedMachineId(machine.id);
                setReconAutomationModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-100 dark:bg-cyber-cyan/15 text-callout-info-fg border border-cyan-300 dark:border-cyber-cyan/40 hover:bg-accent hover:text-on-accent font-semibold text-xs transition-[transform,box-shadow,background-color,border-color,color] shadow-xs active:scale-[0.97]"
              title="Open Multi-Format Scan Importer & Payload Crafter for this target"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import Scan & Payloads</span>
            </button>
            <ShareLinkButton
              path={`/target/${machine.id}`}
              title={machine.name}
              className="px-2 py-1.5"
            />
            <button aria-label="Open full page mission workspace"
              onClick={() => {
                navigate(`/target/${machine.id}`);
                setSelectedMachineId(null);
              }}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-cyber-bg text-slate-600 dark:text-cyber-muted hover:text-callout-info-fg dark:hover:text-cyber-cyan border border-slate-200 dark:border-cyber-border hover:border-cyan-500 dark:hover:border-cyber-cyan transition-colors active:scale-[0.97]"
              title="Open Dedicated Full Page Mission Workspace"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button aria-label="Close machine details"
              onClick={() => setSelectedMachineId(null)}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-cyber-bg text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary border border-slate-200 dark:border-cyber-border transition-colors active:scale-[0.97]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs (Pinned below Header) */}
        <div className="flex-shrink-0 flex items-center border-b border-subtle bg-surface-card/80 px-4 overflow-x-auto">
          <button
            onClick={() => setActiveModalTab('overview')}
            className={`flex items-center gap-1.5 py-2.5 px-4 font-sans font-semibold text-xs border-b-2 whitespace-nowrap transition-colors ${
              activeModalTab === 'overview'
                ? 'border-accent text-accent bg-accent/[0.04]'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>OVERVIEW & FLAGS</span>
          </button>
          <button
            onClick={() => setActiveModalTab('commands')}
            className={`flex items-center gap-1.5 py-2.5 px-4 font-sans font-semibold text-xs border-b-2 whitespace-nowrap transition-colors ${
              activeModalTab === 'commands'
                ? 'border-amber-500 text-callout-warn-fg bg-amber-500/[0.04]'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-callout-warn-fg" />
            <span>⚡ ATTACK ARSENAL</span>
          </button>
          <button
            onClick={() => setActiveModalTab('checklist')}
            className={`flex items-center gap-1.5 py-2.5 px-4 font-sans font-semibold text-xs border-b-2 whitespace-nowrap transition-colors ${
              activeModalTab === 'checklist'
                ? 'border-cyan-500 text-callout-info-fg bg-cyan-500/[0.04]'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>ATTACK CHECKLIST & METHODOLOGY</span>
            {checklistCompletedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/10 text-callout-info-fg font-bold tabular-nums">
                {checklistCompletedCount} done
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveModalTab('report')}
            className={`flex items-center gap-1.5 py-2.5 px-4 font-sans font-semibold text-xs border-b-2 whitespace-nowrap transition-colors ${
              activeModalTab === 'report'
                ? 'border-purple-500 text-callout-tip-fg bg-purple-500/[0.04]'
                : 'border-transparent text-muted hover:text-primary'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-callout-tip-fg" />
            <span>📄 PENTEST REPORT</span>
          </button>
          {!machine.isActive && Boolean(machine.officialSynopsis || machine.officialWalkthrough || (machine.skillsLearned && machine.skillsLearned.length > 0) || machine.officialPdf) && (
            <button
              onClick={() => setActiveModalTab('walkthrough')}
              className={`flex items-center gap-1.5 py-2.5 px-4 font-sans font-semibold text-xs border-b-2 whitespace-nowrap transition-colors ${
                activeModalTab === 'walkthrough'
                  ? 'border-emerald-500 text-callout-success-fg bg-emerald-500/[0.04]'
                  : 'border-transparent text-muted hover:text-primary'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-callout-success-fg" />
              <span>OFFICIAL HTB INTEL</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-callout-success-fg font-bold border border-emerald-500/30 uppercase">
                HTB
              </span>
            </button>
          )}
        </div>

        {/* Modal Body (Scrollable Center Workspace) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs scrollbar-thin">
          {activeModalTab === 'commands' ? (
            <QuickCommandsTab machine={machine} />
          ) : activeModalTab === 'checklist' ? (
            <ChecklistWorkspace machine={machine} onOpenInWriteup={handleOpenInWriteup} />
          ) : activeModalTab === 'report' ? (
            <div className="space-y-6">
              {/* Report Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-cyber-bg/80 border border-slate-200 dark:border-cyber-border machined-edge">
                <div>
                  <div className="text-[10px] text-callout-tip-fg font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> EXECUTIVE SECURITY ASSESSMENT PRE-REPORT
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{machine.name}</span>
                    <span className="text-tertiary dark:text-cyber-muted font-normal text-xs font-mono tabular-nums">({machine.ip})</span>
                  </h3>
                  <div className="text-xs text-slate-600 dark:text-cyber-muted mt-1">
                    Classification: <span className="text-callout-warn-fg font-semibold">CONFIDENTIAL // CLIENT PENETRATION AUDIT</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyReportMd}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border hover:border-cyan-500 text-slate-700 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary text-xs transition-colors active:scale-[0.97] cursor-pointer"
                  >
                    {copiedReportMd ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReportMd ? 'Copied' : 'Copy MD'}</span>
                  </button>

                  <button
                    onClick={() => setReportMachineId(machine.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-800 text-callout-tip-fg hover:bg-purple-200 dark:hover:bg-purple-900/60 font-bold text-xs transition-colors shadow-sm active:scale-[0.97] cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / PDF</span>
                  </button>
                </div>
              </div>

              {/* Threat Level & Severity Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border machined-edge">
                  <div className="text-[10px] text-tertiary dark:text-cyber-muted uppercase font-bold mb-1">COMPROMISE STATUS</div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    {machine.status === 'completed' || machine.status === 'root' ? (
                      <span className="text-callout-success-fg flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> 100% ROOT PWNED
                      </span>
                    ) : machine.status === 'foothold' ? (
                      <span className="text-callout-warn-fg flex items-center gap-1">
                        <AlertOctagon className="w-4 h-4" /> FOOTHOLD OBTAINED
                      </span>
                    ) : (
                      <span className="text-callout-info-fg flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> RECON IN-PROGRESS
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border machined-edge">
                  <div className="text-[10px] text-tertiary dark:text-cyber-muted uppercase font-bold mb-1">RISK SEVERITY</div>
                  <div className="text-sm font-bold text-callout-danger-fg flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="tabular-nums">CVSS 9.4 CRITICAL</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border machined-edge">
                  <div className="text-[10px] text-tertiary dark:text-cyber-muted uppercase font-bold mb-1">TOTAL TIME LOGGED</div>
                  <div className="text-sm font-bold text-callout-info-fg flex items-center gap-1.5 font-mono tabular-nums">
                    <Clock className="w-4 h-4" />
                    <span>{formatSeconds(machine.timeSpentSeconds)}</span>
                  </div>
                </div>
              </div>

              {/* Executive Summary Narrative */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-cyber-bg/60 border border-slate-200 dark:border-cyber-border space-y-2 machined-edge">
                <div className="text-[10px] uppercase font-bold text-callout-info-fg tracking-wider">
                  1. EXECUTIVE SUMMARY
                </div>
                <p className="text-slate-600 dark:text-cyber-muted leading-relaxed">
                  During security validation on target host <strong className="text-slate-900 dark:text-white">{machine.name}</strong> (<span className="tabular-nums">{machine.ip}</span>), high-impact vulnerabilities were verified. Remote access vectors allowed adversaries to breach network perimeters and subsequently escalate privileges to root / system administrator.
                </p>
              </div>

              {/* Attack Path & Flag Proof of Compromise */}
              <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-cyber-bg/60 border border-slate-200 dark:border-cyber-border space-y-3 machined-edge">
                <div className="text-[10px] uppercase font-bold text-callout-success-fg tracking-wider">
                  2. ATTACK CHAIN & PROOF OF COMPROMISE
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                  <div className="p-3 rounded-lg bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border machined-edge">
                    <div className="text-[10px] text-callout-info-fg font-bold mb-1 flex items-center justify-between">
                      <span>USER ACCESS FLAG</span>
                      <span>{machine.userPwnedAt ? '✓ PWNED' : 'PENDING'}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-100 dark:bg-cyber-bg text-slate-700 dark:text-cyber-muted text-[11px] truncate tabular-nums">
                      {machine.userFlag || (machine.userPwnedAt ? 'HTB{user_flag_verified}' : 'Not Captured')}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border machined-edge">
                    <div className="text-[10px] text-callout-success-fg font-bold mb-1 flex items-center justify-between">
                      <span>ROOT / SYSTEM FLAG</span>
                      <span>{machine.rootPwnedAt ? '✓ ROOTED' : 'PENDING'}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-100 dark:bg-cyber-bg text-slate-700 dark:text-cyber-muted text-[11px] truncate tabular-nums">
                      {machine.rootFlag || (machine.rootPwnedAt ? 'HTB{root_flag_verified}' : 'Not Captured')}
                    </div>
                  </div>
                </div>

                {machine.quickNotes && (
                  <div className="p-3 rounded-lg bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border space-y-1 machined-edge">
                    <div className="text-[10px] text-tertiary dark:text-cyber-muted font-bold uppercase">Assessor Field Notes:</div>
                    <div className="text-slate-800 dark:text-white whitespace-pre-wrap">{machine.quickNotes}</div>
                  </div>
                )}
              </div>

              {/* Remediation Action Plan */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-cyber-bg/60 border border-slate-200 dark:border-cyber-border space-y-2">
                <div className="text-[10px] uppercase font-bold text-callout-warn-fg tracking-wider">
                  3. STRATEGIC REMEDIATION ROADMAP
                </div>
                <ul className="space-y-1.5 text-slate-600 dark:text-cyber-muted list-disc list-inside">
                  <li><strong className="text-slate-900 dark:text-white">Immediate:</strong> Terminate vulnerable listening services and patch software packages to stable releases.</li>
                  <li><strong className="text-slate-900 dark:text-white">Defensive:</strong> Harden local sudoers configurations and eliminate unauthorized SUID binaries.</li>
                  <li><strong className="text-slate-900 dark:text-white">Monitoring:</strong> Deploy SIEM ingestion for authentication failure telemetry and privilege escalation alerting.</li>
                </ul>
              </div>
            </div>
          ) : activeModalTab === 'walkthrough' ? (
            machine.isActive ? (
              <div className="p-8 rounded-xl border border-amber-500/40 bg-amber-950/20 text-center space-y-3 font-mono">
                <Lock className="w-8 h-8 text-callout-warn-fg mx-auto" />
                <h3 className="text-sm font-bold text-callout-warn-fg uppercase tracking-wider">
                  Active Lab · Walkthroughs Strictly Prohibited
                </h3>
                <p className="text-xs text-cyber-muted max-w-md mx-auto">
                  Hack The Box Acceptable Use Policy (§8.2) strictly prohibits walkthroughs, writeups, and solutions for active seasonal content.
                </p>
              </div>
            ) : (
            <div className="space-y-6">
              {/* Header banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border">
                <div>
                  <div className="text-[10px] text-callout-success-fg font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-callout-success-fg" /> OFFICIAL HACK THE BOX INTELLIGENCE BRIEFING
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{machine.name}</span>
                    <span className="text-tertiary dark:text-cyber-muted font-normal text-xs font-mono">({machine.ip})</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-cyber-emerald/20 text-callout-success-fg font-bold border border-emerald-300 dark:border-cyber-emerald/40 font-mono">
                      OFFICIAL HTB
                    </span>
                  </h3>
                  {machine.officialPdf && (
                    <div className="text-xs text-tertiary dark:text-cyber-muted mt-1 flex items-center gap-1.5">
                      <span>Source Archive:</span>
                      <span className="text-callout-info-fg font-mono text-[11px] bg-white dark:bg-cyber-card px-1.5 py-0.5 rounded border border-slate-200 dark:border-cyber-border">
                        {machine.officialPdf}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {machine.officialWalkthrough && (
                    <button
                      onClick={async () => {
                        if (machine.officialWalkthrough) {
                          await safeCopyToClipboard(machine.officialWalkthrough);
                          setCopiedWalkthrough(true);
                          if (soundEnabled) playCyberSound('copy');
                          setTimeout(() => setCopiedWalkthrough(false), 2000);
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border hover:border-emerald-500 text-slate-700 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary text-xs transition-colors"
                    >
                      {copiedWalkthrough ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWalkthrough ? 'Copied' : 'Copy Walkthrough'}</span>
                    </button>
                  )}
                  <button
                    onClick={handleOpenInWriteup}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-cyber-emerald/20 border border-emerald-300 dark:border-cyber-emerald/50 text-callout-success-fg hover:bg-emerald-500 hover:text-white dark:hover:bg-cyber-emerald dark:hover:text-black font-bold text-xs transition-[box-shadow,background-color,border-color,color] shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Writeup Studio</span>
                  </button>
                </div>
              </div>

              {/* Section 1: Official Synopsis */}
              {machine.officialSynopsis && (
                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-cyber-bg/70 border border-slate-200 dark:border-cyber-border space-y-2">
                  <div className="text-[10px] uppercase font-bold text-callout-info-fg tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-callout-info-fg" /> OFFICIAL SYNOPSIS & THREAT OVERVIEW
                  </div>
                  <p className="text-slate-800 dark:text-white text-xs sm:text-sm leading-relaxed font-sans font-normal">
                    {machine.officialSynopsis}
                  </p>
                </div>
              )}

              {/* Section 2: Core Skills Learned */}
              {machine.skillsLearned && machine.skillsLearned.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-cyber-bg/70 border border-slate-200 dark:border-cyber-border space-y-2.5">
                  <div className="text-[10px] uppercase font-bold text-callout-success-fg tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-callout-success-fg" /> TARGET SKILLS REQUIRED & LEARNED
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {machine.skillsLearned.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-cyber-emerald/10 border border-emerald-300 dark:border-cyber-emerald/30 text-callout-success-fg text-xs font-medium flex items-center gap-1.5"
                      >
                        <Check className="w-3 h-3 text-callout-success-fg stroke-[2.5]" />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Full Structured Walkthrough */}
              {machine.officialWalkthrough && (
                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-cyber-bg/70 border border-slate-200 dark:border-cyber-border space-y-3">
                  <div className="text-[10px] uppercase font-bold text-callout-tip-fg tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-callout-tip-fg" /> TACTICAL EXPLOITATION WALKTHROUGH
                  </div>
                  <div className="prose prose-invert max-w-none text-xs leading-relaxed text-slate-700 dark:text-cyber-muted space-y-4 font-sans">
                    {machine.officialWalkthrough.split('\n\n').map((paragraph, pIdx) => {
                      if (paragraph.startsWith('### ')) {
                        const title = paragraph.replace('### ', '');
                        return (
                          <div key={pIdx} className="pt-2 border-b border-slate-200 dark:border-cyber-border/60 pb-1 text-sm font-bold text-slate-900 dark:text-white font-mono flex items-center gap-2">
                            <span>{title}</span>
                          </div>
                        );
                      }
                      if (paragraph.startsWith('- ')) {
                        const items = paragraph.split('\n');
                        return (
                          <ul key={pIdx} className="list-disc list-inside space-y-1 text-slate-700 dark:text-cyber-muted">
                            {items.map((it, itIdx) => (
                              <li key={itIdx} className="text-slate-900 dark:text-white">
                                {it.replace(/^- \*\*(.*?)\*\*$/, '$1').replace(/^- /, '')}
                              </li>
                            ))}
                          </ul>
                        );
                      }
                      return (
                        <p key={pIdx} className="text-slate-800 dark:text-cyber-muted font-mono leading-relaxed bg-white dark:bg-cyber-card/60 p-3 rounded-lg border border-slate-200 dark:border-cyber-border/40 text-xs">
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            )
          ) : (
            <div className="space-y-6">
              {/* Section 0: Open Ports & Scan Intake HUD */}
              <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsModalDragOver(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsModalDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsModalDragOver(false);
              handleModalFileDrop(e.dataTransfer.files);
            }}
            className={`p-3.5 rounded-xl border transition-colors relative overflow-hidden ${
              isModalDragOver
                ? 'border-2 border-dashed border-cyber-cyan bg-cyan-950/30'
                : 'border-slate-200 dark:border-cyber-border bg-slate-50/70 dark:bg-cyber-bg/60'
            }`}
          >
            {/* Header / Port list */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-callout-info-fg flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" /> RECON INTAKE & OPEN PORTS ({machine.openPorts?.length || 0})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-2.5 py-1 rounded bg-white dark:bg-cyber-card border border-slate-300 dark:border-cyber-border hover:border-cyber-cyan text-slate-800 dark:text-cyber-cyan text-[11px] font-semibold flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3 h-3" /> Drop / Upload Scan
                  <input
                    type="file"
                    accept=".nmap,.gnmap,.xml,.txt"
                    className="hidden"
                    onChange={(e) => handleModalFileDrop(e.target.files)}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setReconAutomationModalOpen(true)}
                  className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-[11px] font-medium transition-colors"
                  title="Open full Recon & Payload Crafter"
                >
                  Advanced Recon
                </button>
              </div>
            </div>

            {/* Notification Toast */}
            {modalScanToast && (
              <div
                className={`mb-2.5 p-2 rounded text-[11px] font-mono font-bold flex items-center gap-2 ${
                  modalScanToast.isError
                    ? 'bg-rose-950/60 border border-rose-500 text-callout-danger-fg'
                    : 'bg-emerald-950/60 border border-cyber-emerald text-cyber-emerald'
                }`}
              >
                {modalScanToast.isError ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{modalScanToast.message}</span>
              </div>
            )}

            {/* Open Ports Badges */}
            {machine.openPorts && machine.openPorts.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 items-center">
                {machine.openPorts.map((port) => (
                  <span
                    key={port}
                    className="px-2 py-0.5 rounded bg-white dark:bg-cyber-card border border-slate-300 dark:border-cyber-cyan/40 text-slate-900 dark:text-cyber-cyan font-mono text-[11px] font-bold shadow-xs flex items-center gap-1"
                  >
                    <span>{port}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-600 dark:text-cyber-muted font-mono flex items-center gap-1.5 py-1">
                <span>No open ports recorded yet. Drag & drop a <code>.nmap</code> or <code>.gnmap</code> file directly onto this card to ingest.</span>
              </div>
            )}
          </div>

          {/* Section 1: Attack Lifecycle Pipeline */}
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-cyber-muted mb-2 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-cyber-emerald" /> ATTACK LIFECYCLE STATUS
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {pipelineStages.map((stage) => {
                const isSelected = machine.status === stage.id;
                return (
                  <button
                    key={stage.id}
                    onClick={() => handleStatusChange(stage.id)}
                    className={`p-2 rounded-lg border text-center font-semibold transition-colors ${
                      isSelected
                        ? `bg-white dark:bg-cyber-bg border-2 ${stage.color} shadow-md`
                        : 'bg-slate-50 dark:bg-cyber-bg/40 border-slate-200 dark:border-cyber-border/80 text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary hover:border-slate-300 dark:hover:border-cyber-border'
                    }`}
                  >
                    {stage.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Engagement Stopwatch & Time Metrics */}
          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div>
              <div className="text-[10px] uppercase font-semibold text-tertiary dark:text-cyber-muted flex items-center gap-1">
                <Clock className="w-3 h-3 text-callout-info-fg" /> SESSION TIMER
              </div>
              <ModalSessionTimerDisplay machineId={machine.id} fallbackSeconds={machine.timeSpentSeconds} isActiveTarget={isActiveTarget} />
              <div className="text-[10px] text-tertiary dark:text-cyber-muted">
                {isActiveTarget ? 'Active Engagement' : 'Standby'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isActiveTarget ? (
                <button
                  onClick={() => {
                    setActiveTarget(machine.id);
                    startTimer();
                    if (soundEnabled) playCyberSound('timer');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-100 dark:bg-cyber-emerald/10 border border-emerald-300 dark:border-cyber-emerald/40 text-callout-success-fg hover:bg-emerald-500 hover:text-white dark:hover:bg-cyber-emerald dark:hover:text-black font-semibold transition-colors"
                >
                  <Crosshair className="w-3.5 h-3.5" /> Set Active Target
                </button>
              ) : (
                <>
                  {isTimerRunning ? (
                    <button
                      onClick={pauseTimer}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-100 dark:bg-cyber-amber/10 border border-amber-300 dark:border-cyber-amber/40 text-callout-warn-fg hover:bg-amber-500 hover:text-white dark:hover:bg-cyber-amber dark:hover:text-black font-semibold transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  ) : (
                    <button
                      onClick={startTimer}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-100 dark:bg-cyber-emerald/10 border border-emerald-300 dark:border-cyber-emerald/40 text-callout-success-fg hover:bg-emerald-500 hover:text-white dark:hover:bg-cyber-emerald dark:hover:text-black font-semibold transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" /> Resume
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      const ok = await confirmAction({
                        title: 'Reset session timer?',
                        body: 'The elapsed session time for this machine will be cleared.',
                        confirmLabel: 'Reset timer',
                        tone: 'danger',
                      });
                      if (ok) {
                        resetTimer();
                        if (soundEnabled) playCyberSound('click');
                      }
                    }}
                    className="p-1.5 rounded-md bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary"
                    title="Reset Timer"
                    aria-label="Reset session timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            {/* Time to User & Root Milestones */}
            <div className="grid grid-cols-2 gap-2 text-[10px] w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-cyber-border pt-2 sm:pt-0 sm:pl-4">
              <div>
                <span className="text-tertiary dark:text-cyber-muted block">Time to User:</span>
                <span className="font-bold text-callout-info-fg font-mono">
                  {machine.timeToUserSeconds ? formatSeconds(machine.timeToUserSeconds) : '--:--:--'}
                </span>
              </div>
              <div>
                <span className="text-tertiary dark:text-cyber-muted block">Time to Root:</span>
                <span className="font-bold text-callout-danger-fg font-mono">
                  {machine.timeToRootSeconds ? formatSeconds(machine.timeToRootSeconds) : '--:--:--'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Flags Vault (Concentric R_inner = 8px) */}
          <div className="rounded-lg p-4 bg-surface-card border border-subtle surface-card-depth machined-edge space-y-3">
            <div className="text-[11px] uppercase font-sans font-semibold tracking-wider text-secondary flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-callout-warn-fg" /> FLAGS VAULT (OBFUSCATED & COPYABLE)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* User Flag */}
              <div className="p-3 rounded-md border border-subtle bg-surface-sunken/50 space-y-2 machined-edge">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-accent font-semibold flex items-center gap-1 font-sans">
                    <Flag className="w-3 h-3" /> USER FLAG
                  </span>
                  {isUserPwned && (
                    <span className="text-[9px] text-callout-success-fg flex items-center gap-0.5 font-bold font-mono">
                      <Check className="w-3 h-3" /> PWNED
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id={`machine-user-flag-${machine.id}`}
                    name="machine-user-flag"
                    aria-label="Enter user flag"
                    type={showUserFlag ? 'text' : 'password'}
                    maxLength={256}
                    value={machine.userFlag || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateMachine(machine.id, { 
                        userFlag: val,
                        ...(val.trim() && !machine.userPwnedAt ? { userPwnedAt: new Date().toISOString() } : {}),
                        ...(!val.trim() && machine.status !== 'foothold' && machine.status !== 'root' && machine.status !== 'completed' ? { userPwnedAt: undefined } : {})
                      });
                    }}
                    placeholder="Enter user flag (e.g. 7a3f...)"
                    className="w-full bg-surface-card px-3 py-2 rounded-lg border border-subtle text-primary placeholder-muted text-xs focus:outline-none focus:border-accent pr-16 font-mono shadow-xs"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowUserFlag(!showUserFlag)}
                      className="p-1 rounded-md text-muted hover:text-primary active:scale-[0.97] transition-transform cursor-pointer"
                      title={showUserFlag ? 'Hide Flag' : 'Show Flag'}
                    >
                      {showUserFlag ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(machine.userFlag || '', 'user')}
                      className={`p-1 rounded-md transition-all active:scale-[0.97] flex items-center gap-1 cursor-pointer ${
                        copiedUser
                          ? 'bg-cyber-emerald text-black font-extrabold px-1.5'
                          : 'text-muted hover:text-primary'
                      }`}
                      title="Copy User Flag"
                    >
                      {copiedUser ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span className="text-[9px] uppercase font-bold text-black font-mono">COPIED!</span>
                        </>
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Root Flag */}
              <div className="p-3 rounded-md border border-subtle bg-surface-sunken/50 space-y-2 machined-edge">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-callout-success-fg font-semibold flex items-center gap-1 font-sans">
                    <Flag className="w-3 h-3" /> ROOT / SYSTEM FLAG
                  </span>
                  {isRootPwned && (
                    <span className="text-[9px] text-callout-success-fg flex items-center gap-0.5 font-bold font-mono">
                      <Check className="w-3 h-3" /> ROOTED
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id={`machine-root-flag-${machine.id}`}
                    name="machine-root-flag"
                    aria-label="Enter root flag"
                    type={showRootFlag ? 'text' : 'password'}
                    maxLength={256}
                    value={machine.rootFlag || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateMachine(machine.id, { 
                        rootFlag: val,
                        ...(val.trim() && !machine.rootPwnedAt ? { rootPwnedAt: new Date().toISOString() } : {}),
                        ...(!val.trim() && machine.status !== 'root' && machine.status !== 'completed' ? { rootPwnedAt: undefined } : {})
                      });
                    }}
                    placeholder="Enter root flag (e.g. 9b1c...)"
                    className="w-full bg-surface-card px-3 py-2 rounded-lg border border-subtle text-primary placeholder-muted text-xs focus:outline-none focus:border-emerald-500 pr-16 font-mono shadow-xs"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowRootFlag(!showRootFlag)}
                      className="p-1 rounded-md text-muted hover:text-primary active:scale-[0.97] transition-transform cursor-pointer"
                      title={showRootFlag ? 'Hide Flag' : 'Show Flag'}
                    >
                      {showRootFlag ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(machine.rootFlag || '', 'root')}
                      className={`p-1 rounded-md transition-all active:scale-[0.97] flex items-center gap-1 cursor-pointer ${
                        copiedRoot
                          ? 'bg-cyber-emerald text-black font-extrabold px-1.5'
                          : 'text-muted hover:text-primary'
                      }`}
                      title="Copy Root Flag"
                    >
                      {copiedRoot ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span className="text-[9px] uppercase font-bold text-black font-mono">COPIED!</span>
                        </>
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3.5: Target Field Notes & Loot (Concentric R_inner = 8px) */}
          <div className="rounded-lg p-4 bg-surface-card border border-subtle surface-card-depth machined-edge space-y-3">
            <div className="flex items-center justify-between text-[11px] uppercase font-sans font-semibold tracking-wider text-secondary">
              <span className="flex items-center gap-1.5 text-callout-tip-fg">
                <FileCode className="w-3.5 h-3.5" /> TARGET FIELD NOTES & LOOT
              </span>
              <span className="text-[10px] text-muted font-normal font-sans">
                Auto-saved to target dossier
              </span>
            </div>
            <textarea
              id={`machine-field-notes-${machine.id}`}
              name="machine-field-notes"
              aria-label="Target Field Notes"
              value={machine.quickNotes || ''}
              onChange={(e) => updateMachine(machine.id, { quickNotes: e.target.value })}
              placeholder="Jot down credentials, hashes, local discovery findings, and exploit notes here..."
              rows={4}
              className="w-full p-3 rounded-md border border-subtle bg-surface-sunken text-primary placeholder-muted text-xs font-sans leading-relaxed focus:outline-none focus:border-accent selection:bg-accent/20 resize-y shadow-xs"
            />
          </div>

          {/* Official HTB Intel Briefing Card */}
          {machine.officialSynopsis && (
            <div className="p-3.5 rounded-lg border border-emerald-300 dark:border-cyber-emerald/40 bg-emerald-50 dark:bg-cyber-emerald/5 space-y-2 machined-edge">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-callout-success-fg uppercase font-bold flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-callout-success-fg" /> OFFICIAL HTB SYNOPSIS & INTEL
                </span>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('walkthrough')}
                  className="text-[10px] text-callout-success-fg hover:underline flex items-center gap-1 font-bold"
                >
                  <span>Open Full Walkthrough</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-slate-800 dark:text-white/90 leading-relaxed font-sans font-normal">
                {machine.officialSynopsis}
              </p>
              {machine.skillsLearned && machine.skillsLearned.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {machine.skillsLearned.slice(0, 4).map((sk, skIdx) => (
                    <span
                      key={skIdx}
                      className="px-2 py-0.5 rounded bg-white dark:bg-cyber-card border border-emerald-300 dark:border-cyber-emerald/30 text-callout-success-fg text-[10px] font-medium shadow-xs"
                    >
                      {sk}
                    </span>
                  ))}
                  {machine.skillsLearned.length > 4 && (
                    <span className="text-[10px] text-tertiary dark:text-cyber-muted self-center">
                      +{machine.skillsLearned.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Spoiler-Masked Hint / Active ToS Guard */}
          {machine.isActive ? (
            <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 text-callout-warn-fg flex items-center gap-2">
              <Lock className="w-4 h-4 text-callout-warn-fg flex-shrink-0" />
              <span className="text-[11px] font-mono">
                Active Lab: Intel hints and spoilers are strictly prohibited by Hack The Box Terms of Service (AUP §8.2).
              </span>
            </div>
          ) : machine.hint ? (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50 dark:bg-cyber-bg/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-callout-warn-fg uppercase font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-callout-warn-fg" /> INTEL HINT (SPOILER MASKED)
                </span>
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="text-[10px] text-tertiary dark:text-cyber-muted hover:text-slate-900 dark:hover:text-primary flex items-center gap-1"
                >
                  {showHint ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showHint ? 'Mask Hint' : 'Reveal Hint'}</span>
                </button>
              </div>
              <div
                onClick={() => setShowHint(!showHint)}
                className={`p-2 rounded border border-slate-200 dark:border-cyber-border text-xs cursor-pointer select-none transition-colors ${
                  showHint ? 'bg-white dark:bg-cyber-card text-slate-900 dark:text-white' : 'blur-sm text-transparent bg-slate-200/60 dark:bg-cyber-card/60'
                }`}
                title="Click to toggle hint spoiler"
              >
                {machine.hint}
              </div>
            </div>
          ) : null}

          {/* Section 5: Perceived Difficulty & Enjoyment Rating */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50 dark:bg-cyber-bg/50">
              <div className="text-[10px] uppercase font-bold tracking-wider text-tertiary dark:text-cyber-muted mb-2">
                PERCEIVED DIFFICULTY VS OFFICIAL
              </div>
              <div className="flex items-center gap-1.5">
                {(['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'] as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => updateMachine(machine.id, { perceivedDifficulty: diff })}
                    className={`px-2 py-1 rounded text-[10px] border transition-colors ${
                      machine.perceivedDifficulty === diff
                        ? 'bg-emerald-600 text-white dark:bg-cyber-emerald dark:text-black font-bold border-emerald-600 dark:border-cyber-emerald shadow-xs'
                        : 'bg-white dark:bg-cyber-card text-slate-700 dark:text-cyber-muted border-slate-200 dark:border-cyber-border hover:text-slate-900 dark:hover:text-primary'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50 dark:bg-cyber-bg/50">
              <div className="text-[10px] uppercase font-bold tracking-wider text-tertiary dark:text-cyber-muted mb-2">
                MATRIX OF SATISFACTION (ENJOYMENT)
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => updateMachine(machine.id, { rating: star })}
                    className="p-1 text-tertiary dark:text-cyber-muted hover:text-callout-warn-fg dark:hover:text-cyber-amber transition-colors"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        (machine.rating || 0) >= star ? 'text-callout-warn-fg fill-amber-500 dark:text-cyber-amber dark:fill-cyber-amber' : ''
                      }`}
                    />
                  </button>
                ))}
                <span className="text-[10px] text-slate-600 dark:text-cyber-muted ml-2">
                  {machine.rating ? `${machine.rating} / 5 Stars` : 'Unrated'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 6: Identified Vulnerability Archetypes & Tags */}
          <div className="space-y-4">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-tertiary dark:text-cyber-muted mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-callout-tip-fg" />
                  <span>IDENTIFIED VULNERABILITY ARCHETYPES ({classifyMachine(machine).categories.length})</span>
                </div>
                <span className="text-[10px] text-tertiary dark:text-cyber-muted italic">Click to filter targets</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {classifyMachine(machine).categories.length > 0 ? (
                  classifyMachine(machine).categories.map((catId) => {
                    const catDef = VULN_CATEGORIES.find((c) => c.id === catId);
                    return (
                      <button
                        key={catId}
                        type="button"
                        onClick={() => {
                          setFilters({ selectedVulnCategory: catId, selectedCategory: 'ALL' });
                          setSelectedMachineId(null);
                          if (soundEnabled) playCyberSound('click');
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-xs ${catDef?.badgeColor || 'bg-white dark:bg-cyber-card border-slate-200 dark:border-cyber-border text-slate-900 dark:text-white'}`}
                        title={`Click to filter CTF Tracker targets with ${catDef?.label || catId}`}
                      >
                        <span>{catDef?.label || catId}</span>
                        <span className="text-[10px] opacity-60">↗</span>
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-tertiary dark:text-cyber-muted italic">Standard Host Operations</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-tertiary dark:text-cyber-muted mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-callout-info-fg" /> ATTACK VECTORS & TAGS
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {machine.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-md bg-cyan-100 dark:bg-cyber-cyan/10 border border-cyan-300 dark:border-cyber-cyan/30 text-callout-info-fg text-[11px] flex items-center gap-1"
                  >
                  {t}
                  <button
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-callout-danger-fg dark:hover:text-cyber-crimson ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                id="machine-new-tag-input"
                name="machine-new-tag"
                aria-label="Add new attack vector tag"
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tag (e.g. SSRF, Kerberoast)..."
                className="flex-1 bg-white dark:bg-cyber-bg px-3 py-1.5 rounded-lg border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-white text-xs focus:outline-none focus:border-cyan-600 dark:focus:border-cyber-cyan placeholder-slate-400 dark:placeholder-cyber-muted shadow-xs"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-cyber-card dark:hover:bg-cyber-card/80 border border-slate-300 dark:border-cyber-border hover:border-cyan-600 dark:hover:border-cyber-cyan text-slate-900 dark:text-white text-xs font-medium active:scale-[0.98] transition-[transform,box-shadow,background-color,border-color,color] shadow-xs"
              >
                Add
              </button>
            </div>
          </div>
        </div>

          {/* Section 7: Tactical Intel (Obsidian Notes Vault) */}
          {recommendedNotes.length > 0 && (
            <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-cyber-bg/80 border border-purple-200 dark:border-purple-500/40 space-y-3 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] text-callout-tip-fg uppercase font-bold flex items-center gap-1.5 tracking-wider">
                  <BookOpen className="w-3.5 h-3.5 text-callout-tip-fg" />
                  TACTICAL INTEL // OBSIDIAN VAULT ({recommendedNotes.length} MATCHING NOTES)
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-purple-100 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800/60 text-callout-tip-fg font-bold">
                  {userNotes.length > 0 ? `Private Vault (${userNotes.length} Notes)` : 'Field Manual Vault'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {recommendedNotes.map((note) => {
                  const isExpanded = Boolean(expandedNotes[note.id]);
                  const targetVars = { ...globalVars, targetIp: machine.ip || globalVars.targetIp };
                  const extraCommandsCount = note.commands ? note.commands.length - 1 : 0;

                  return (
                    <div
                      key={note.id}
                      className="p-2.5 rounded-lg bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border hover:border-purple-400 dark:hover:border-purple-500/50 transition-[box-shadow,background-color,border-color,color] space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[210px]" title={note.title}>
                          {note.title}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-500/15 text-callout-tip-fg border border-purple-300 dark:border-purple-500/30 font-mono font-bold">
                            {note.difficulty}
                          </span>
                          {note.commands && note.commands.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setExpandedNotes(prev => ({ ...prev, [note.id]: !prev[note.id] }))}
                              className="text-[9px] text-callout-info-fg hover:underline flex items-center gap-0.5 font-semibold"
                              title="Toggle all commands"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              <span>{note.commands.length} cmds</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-[10px] text-slate-600 dark:text-cyber-muted line-clamp-2 font-sans">
                        {note.summary || note.subCategory}
                      </div>

                      {note.commands && note.commands.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {/* First command (always visible) - permanent dark terminal */}
                          {(() => {
                            const interpolated0 = interpolateCommand(note.commands[0], targetVars);
                            return (
                              <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-slate-950 border border-slate-800 font-mono text-[10px]">
                                <code className="text-callout-info-fg truncate flex-1 select-all" title={interpolated0}>
                                  {interpolated0}
                                </code>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await safeCopyToClipboard(interpolated0);
                                    setCopiedCommand(interpolated0);
                                    setTimeout(() => setCopiedCommand(null), 2000);
                                    if (soundEnabled) playCyberSound('copy');
                                  }}
                                  className="px-1.5 py-0.5 rounded text-[9px] bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex-shrink-0 font-bold"
                                  title="Copy command"
                                >
                                  {copiedCommand === interpolated0 ? '✓ COPIED' : 'COPY'}
                                </button>
                              </div>
                            );
                          })()}

                          {/* Remaining commands when expanded - permanent dark terminal */}
                          {isExpanded && note.commands.slice(1).map((cmd, cIdx) => {
                            const interpolated = interpolateCommand(cmd, targetVars);
                            return (
                              <div key={cIdx} className="flex items-center justify-between gap-2 p-1.5 rounded bg-slate-950 border border-purple-900/60 font-mono text-[10px]">
                                <code className="text-callout-tip-fg truncate flex-1 select-all" title={interpolated}>
                                  {interpolated}
                                </code>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await safeCopyToClipboard(interpolated);
                                    setCopiedCommand(interpolated);
                                    setTimeout(() => setCopiedCommand(null), 2000);
                                    if (soundEnabled) playCyberSound('copy');
                                  }}
                                  className="px-1.5 py-0.5 rounded text-[9px] bg-slate-900 hover:bg-slate-800 text-purple-300 hover:text-white transition-colors flex-shrink-0 font-bold"
                                  title="Copy command"
                                >
                                  {copiedCommand === interpolated ? '✓ COPIED' : 'COPY'}
                                </button>
                              </div>
                            );
                          })}

                          {extraCommandsCount > 0 && !isExpanded && (
                            <button
                              type="button"
                              onClick={() => setExpandedNotes(prev => ({ ...prev, [note.id]: true }))}
                              className="text-[9px] text-slate-600 dark:text-cyber-muted hover:text-callout-tip-fg dark:hover:text-callout-tip-fg transition-colors flex items-center gap-1 font-mono"
                            >
                              <span>+ {extraCommandsCount} more commands from this note...</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>

        {/* Modal Footer (Pinned at Bottom) */}
        <div className="flex-shrink-0 border-t border-slate-200 dark:border-cyber-border p-3 sm:p-3.5 bg-slate-50/95 dark:bg-cyber-bg/95 backdrop-blur-sm flex items-center justify-between">
          <div className="text-[10px] text-tertiary dark:text-cyber-muted">
            Created: {new Date(machine.createdAt).toLocaleDateString()}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportMachineId(machine.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 border border-purple-300 dark:border-purple-800 text-callout-tip-fg hover:text-callout-tip-fg dark:hover:text-primary font-bold text-xs transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.97] shadow-xs"
              title="Open Printable Pentest Report PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Pre-Report PDF</span>
            </button>
            <button
              onClick={handleOpenInWriteup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-100 dark:bg-cyber-cyan/10 border border-cyan-300 dark:border-cyber-cyan/40 text-callout-info-fg hover:bg-accent hover:text-on-accent font-semibold transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.97] shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" /> Writeup Studio
            </button>
            <button
              onClick={() => setSelectedMachineId(null)}
              className="px-4 py-1.5 rounded-lg bg-white dark:bg-cyber-card border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-white hover:border-emerald-500 transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.97] font-medium shadow-xs"
            >
              Done
            </button>
          </div>
        </div>

        </motion.div>
      </motion.div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

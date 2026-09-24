import React, { useState, useEffect, useMemo } from 'react';
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
import { PipelineStatus, Difficulty } from '../../types';
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

  const machine = machines.find((m) => m.id === selectedMachineId);
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
    return Object.values(machine.checklist.itemsState).filter((s) => s.status === 'done').length;
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

  if (!selectedMachineId || !machine) return null;

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
    { id: 'recon', label: 'Recon In-Progress', color: 'border-cyber-cyan text-cyber-cyan' },
    { id: 'foothold', label: 'Foothold Obtained', color: 'border-cyber-amber text-cyber-amber' },
    { id: 'root', label: 'Root / System Pwned', color: 'border-cyber-crimson text-cyber-crimson' },
    { id: 'completed', label: 'Completed & Logged', color: 'border-cyber-emerald text-cyber-emerald' },
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md font-mono overflow-y-auto"
      onClick={() => setSelectedMachineId(null)}
    >
      <motion.div 
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.15 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Machine details for ${machine.name}`}
        className="w-full sm:max-w-4xl max-h-[92vh] flex flex-col rounded-xl sm:rounded-2xl border border-slate-200 dark:border-cyber-border bg-white dark:bg-cyber-card shadow-2xl overflow-hidden relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Pinned at Top) */}
        <div className="flex-shrink-0 flex items-start justify-between border-b border-slate-200 dark:border-cyber-border p-3.5 sm:p-4 bg-slate-50/95 dark:bg-cyber-bg/95 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <PlatformBadge platform={machine.platform} size="md" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide">{machine.name}</h2>
              <OsBadge os={machine.os} size="sm" />
              <CategoryBadge machine={machine} size="sm" />
              <DifficultyBadge difficulty={machine.difficulty} size="sm" />
              {machine.isActive && (
                <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>ACTIVE LAB</span>
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-cyber-muted mt-1 flex flex-wrap items-center gap-3">
              <EditableIpBadge machineId={machine.id} initialIp={machine.ip} size="sm" showLabel />
              {Boolean(machine.ip && machine.ip.includes('x')) && (
                <button
                  type="button"
                  onClick={() => setAssignIpMachineId(machine.id)}
                  className="px-2 py-0.5 rounded bg-amber-100 dark:bg-cyber-amber/15 border border-amber-300 dark:border-cyber-amber/40 text-amber-900 dark:text-cyber-amber hover:bg-amber-200 dark:hover:bg-cyber-amber hover:text-black font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm"
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
                  className="flex items-center gap-1 text-cyan-700 dark:text-cyber-cyan hover:underline font-medium"
                >
                  Official Room <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {machine.isActive ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                  <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span>ACTIVE LAB · WRITEUPS PROHIBITED (HTB ToS)</span>
                </span>
              ) : Boolean(sanitizeExternalUrl(machine.writeupUrl)) ? (
                <a
                  href={sanitizeExternalUrl(machine.writeupUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-purple-700 dark:text-cyber-purple hover:underline font-medium"
                >
                  Writeup <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {machine.isCustom && (
              <button
                onClick={() => {
                  if (confirm(`Delete custom machine ${machine.name}?`)) {
                    deleteMachine(machine.id);
                  }
                }}
                className="p-1.5 rounded bg-slate-100 dark:bg-cyber-bg text-slate-600 dark:text-cyber-muted hover:text-red-600 dark:hover:text-cyber-crimson border border-slate-200 dark:border-cyber-border transition-colors"
                title="Delete Custom Machine"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Direct Pentest Pre-Report Button */}
            <button
              onClick={() => setReportMachineId(machine.id)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-purple-100 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-800/60 hover:bg-purple-200 dark:hover:bg-purple-900/60 hover:text-purple-950 dark:hover:text-white font-semibold text-xs transition-all shadow-sm group"
              title="Open Executive Pentest Pre-Report"
            >
              <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Pre-Report</span>
            </button>

            <button
              onClick={() => {
                setSelectedMachineId(machine.id);
                setReconAutomationModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-cyan-100 dark:bg-cyber-cyan/15 text-cyan-900 dark:text-cyber-cyan border border-cyan-300 dark:border-cyber-cyan/40 hover:bg-cyan-400 hover:text-black dark:hover:bg-cyber-cyan dark:hover:text-black font-semibold text-xs transition-all shadow-glow-cyan/20"
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
            <button
              onClick={() => {
                navigate(`/target/${machine.id}`);
                setSelectedMachineId(null);
              }}
              className="p-1.5 rounded bg-slate-100 dark:bg-cyber-bg text-slate-600 dark:text-cyber-muted hover:text-cyan-700 dark:hover:text-cyber-cyan border border-slate-200 dark:border-cyber-border hover:border-cyan-500 dark:hover:border-cyber-cyan transition-colors"
              title="Open Dedicated Full Page Mission Workspace"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedMachineId(null)}
              className="p-1.5 rounded bg-slate-100 dark:bg-cyber-bg text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-cyber-border transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs (Pinned below Header) */}
        <div className="flex-shrink-0 flex items-center border-b border-slate-200 dark:border-cyber-border bg-slate-100/90 dark:bg-cyber-bg/70 px-4 overflow-x-auto">
          <button
            onClick={() => setActiveModalTab('overview')}
            className={`flex items-center gap-1.5 py-2.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all ${
              activeModalTab === 'overview'
                ? 'border-emerald-600 dark:border-cyber-emerald text-emerald-900 dark:text-cyber-emerald bg-emerald-50 dark:bg-cyber-emerald/5'
                : 'border-transparent text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>OVERVIEW & FLAGS</span>
          </button>
          <button
            onClick={() => setActiveModalTab('commands')}
            className={`flex items-center gap-1.5 py-2.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all ${
              activeModalTab === 'commands'
                ? 'border-amber-600 dark:border-cyber-amber text-amber-900 dark:text-cyber-amber bg-amber-50 dark:bg-cyber-amber/10'
                : 'border-transparent text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-cyber-amber" />
            <span>⚡ ATTACK ARSENAL</span>
          </button>
          <button
            onClick={() => setActiveModalTab('checklist')}
            className={`flex items-center gap-1.5 py-2.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all ${
              activeModalTab === 'checklist'
                ? 'border-cyan-600 dark:border-cyber-cyan text-cyan-900 dark:text-cyber-cyan bg-cyan-50 dark:bg-cyber-cyan/5'
                : 'border-transparent text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>ATTACK CHECKLIST & METHODOLOGY</span>
            {checklistCompletedCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-100 dark:bg-cyber-cyan/20 text-cyan-900 dark:text-cyber-cyan font-bold">
                {checklistCompletedCount} done
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveModalTab('report')}
            className={`flex items-center gap-1.5 py-2.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all ${
              activeModalTab === 'report'
                ? 'border-purple-600 dark:border-purple-400 text-purple-900 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/20'
                : 'border-transparent text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>📄 PENTEST REPORT</span>
          </button>
          {!machine.isActive && Boolean(machine.officialSynopsis || machine.officialWalkthrough || (machine.skillsLearned && machine.skillsLearned.length > 0) || machine.officialPdf) && (
            <button
              onClick={() => setActiveModalTab('walkthrough')}
              className={`flex items-center gap-1.5 py-2.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition-all ${
                activeModalTab === 'walkthrough'
                  ? 'border-emerald-600 dark:border-cyber-emerald text-emerald-900 dark:text-cyber-emerald bg-emerald-50 dark:bg-cyber-emerald/10'
                  : 'border-transparent text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-cyber-emerald" />
              <span>OFFICIAL HTB INTEL</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-cyber-emerald/20 text-emerald-900 dark:text-cyber-emerald font-bold border border-emerald-300 dark:border-cyber-emerald/40 uppercase">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-cyber-bg/80 border border-slate-200 dark:border-cyber-border">
                <div>
                  <div className="text-[10px] text-purple-700 dark:text-purple-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> EXECUTIVE SECURITY ASSESSMENT PRE-REPORT
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{machine.name}</span>
                    <span className="text-slate-500 dark:text-cyber-muted font-normal text-xs font-mono">({machine.ip})</span>
                  </h3>
                  <div className="text-xs text-slate-600 dark:text-cyber-muted mt-1">
                    Classification: <span className="text-amber-700 dark:text-cyber-amber font-semibold">CONFIDENTIAL // CLIENT PENETRATION AUDIT</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyReportMd}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border hover:border-cyan-500 text-slate-700 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white text-xs transition-colors"
                  >
                    {copiedReportMd ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-cyber-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReportMd ? 'Copied' : 'Copy MD'}</span>
                  </button>

                  <button
                    onClick={() => setReportMachineId(machine.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/50 border border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60 font-bold text-xs transition-colors shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / PDF</span>
                  </button>
                </div>
              </div>

              {/* Threat Level & Severity Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border">
                  <div className="text-[10px] text-slate-500 dark:text-cyber-muted uppercase font-bold mb-1">COMPROMISE STATUS</div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    {machine.status === 'completed' || machine.status === 'root' ? (
                      <span className="text-emerald-700 dark:text-cyber-emerald flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> 100% ROOT PWNED
                      </span>
                    ) : machine.status === 'foothold' ? (
                      <span className="text-amber-700 dark:text-cyber-amber flex items-center gap-1">
                        <AlertOctagon className="w-4 h-4" /> FOOTHOLD OBTAINED
                      </span>
                    ) : (
                      <span className="text-cyan-700 dark:text-cyber-cyan flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> RECON IN-PROGRESS
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border">
                  <div className="text-[10px] text-slate-500 dark:text-cyber-muted uppercase font-bold mb-1">RISK SEVERITY</div>
                  <div className="text-sm font-bold text-rose-700 dark:text-cyber-crimson flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>CVSS 9.4 CRITICAL</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border">
                  <div className="text-[10px] text-slate-500 dark:text-cyber-muted uppercase font-bold mb-1">TOTAL TIME LOGGED</div>
                  <div className="text-sm font-bold text-cyan-700 dark:text-cyber-cyan flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>{formatSeconds(machine.timeSpentSeconds)}</span>
                  </div>
                </div>
              </div>

              {/* Executive Summary Narrative */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-cyber-bg/60 border border-slate-200 dark:border-cyber-border space-y-2">
                <div className="text-[10px] uppercase font-bold text-cyan-800 dark:text-cyber-cyan tracking-wider">
                  1. EXECUTIVE SUMMARY
                </div>
                <p className="text-slate-600 dark:text-cyber-muted leading-relaxed">
                  During security validation on target host <strong className="text-slate-900 dark:text-white">{machine.name}</strong> ({machine.ip}), high-impact vulnerabilities were verified. Remote access vectors allowed adversaries to breach network perimeters and subsequently escalate privileges to root / system administrator.
                </p>
              </div>

              {/* Attack Path & Flag Proof of Compromise */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-cyber-bg/60 border border-slate-200 dark:border-cyber-border space-y-3">
                <div className="text-[10px] uppercase font-bold text-emerald-800 dark:text-cyber-emerald tracking-wider">
                  2. ATTACK CHAIN & PROOF OF COMPROMISE
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                  <div className="p-3 rounded-lg bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border">
                    <div className="text-[10px] text-cyan-800 dark:text-cyber-cyan font-bold mb-1 flex items-center justify-between">
                      <span>USER ACCESS FLAG</span>
                      <span>{machine.userPwnedAt ? '✓ PWNED' : 'PENDING'}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-100 dark:bg-cyber-bg text-slate-700 dark:text-cyber-muted text-[11px] truncate">
                      {machine.userFlag || (machine.userPwnedAt ? 'HTB{user_flag_verified}' : 'Not Captured')}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border">
                    <div className="text-[10px] text-emerald-800 dark:text-cyber-emerald font-bold mb-1 flex items-center justify-between">
                      <span>ROOT / SYSTEM FLAG</span>
                      <span>{machine.rootPwnedAt ? '✓ ROOTED' : 'PENDING'}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-100 dark:bg-cyber-bg text-slate-700 dark:text-cyber-muted text-[11px] truncate">
                      {machine.rootFlag || (machine.rootPwnedAt ? 'HTB{root_flag_verified}' : 'Not Captured')}
                    </div>
                  </div>
                </div>

                {machine.quickNotes && (
                  <div className="p-3 rounded-lg bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border space-y-1">
                    <div className="text-[10px] text-slate-500 dark:text-cyber-muted font-bold uppercase">Assessor Field Notes:</div>
                    <div className="text-slate-800 dark:text-white whitespace-pre-wrap">{machine.quickNotes}</div>
                  </div>
                )}
              </div>

              {/* Remediation Action Plan */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-cyber-bg/60 border border-slate-200 dark:border-cyber-border space-y-2">
                <div className="text-[10px] uppercase font-bold text-amber-800 dark:text-cyber-amber tracking-wider">
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
                <Lock className="w-8 h-8 text-amber-400 mx-auto" />
                <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                  Active Lab · Walkthroughs Strictly Prohibited
                </h3>
                <p className="text-xs text-cyber-muted max-w-md mx-auto">
                  Hack The Box Acceptable Use Policy (§8.2) strictly prohibits walkthroughs, writeups, and solutions for active seasonal content.
                </p>
              </div>
            ) : (
            <div className="space-y-6">
              {/* Header banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50/90 dark:bg-cyber-bg/90 border border-emerald-400/50 dark:border-cyber-emerald/40 shadow-glow-emerald/10">
                <div>
                  <div className="text-[10px] text-emerald-800 dark:text-cyber-emerald font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-cyber-emerald" /> OFFICIAL HACK THE BOX INTELLIGENCE BRIEFING
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{machine.name}</span>
                    <span className="text-slate-500 dark:text-cyber-muted font-normal text-xs font-mono">({machine.ip})</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-cyber-emerald/20 text-emerald-900 dark:text-cyber-emerald font-bold border border-emerald-300 dark:border-cyber-emerald/40">
                      OFFICIAL HTB
                    </span>
                  </h3>
                  {machine.officialPdf && (
                    <div className="text-xs text-slate-500 dark:text-cyber-muted mt-1 flex items-center gap-1.5">
                      <span>Source Archive:</span>
                      <span className="text-cyan-800 dark:text-cyber-cyan font-mono text-[11px] bg-white dark:bg-cyber-card px-1.5 py-0.5 rounded border border-slate-200 dark:border-cyber-border">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border hover:border-emerald-500 text-slate-700 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white text-xs transition-colors"
                    >
                      {copiedWalkthrough ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-cyber-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWalkthrough ? 'Copied' : 'Copy Walkthrough'}</span>
                    </button>
                  )}
                  <button
                    onClick={handleOpenInWriteup}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-cyber-emerald/20 border border-emerald-300 dark:border-cyber-emerald/50 text-emerald-900 dark:text-cyber-emerald hover:bg-emerald-500 hover:text-white dark:hover:bg-cyber-emerald dark:hover:text-black font-bold text-xs transition-all shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Writeup Studio</span>
                  </button>
                </div>
              </div>

              {/* Section 1: Official Synopsis */}
              {machine.officialSynopsis && (
                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-cyber-bg/70 border border-slate-200 dark:border-cyber-border space-y-2">
                  <div className="text-[10px] uppercase font-bold text-cyan-800 dark:text-cyber-cyan tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-600 dark:text-cyber-cyan" /> OFFICIAL SYNOPSIS & THREAT OVERVIEW
                  </div>
                  <p className="text-slate-800 dark:text-white text-xs sm:text-sm leading-relaxed font-sans font-normal">
                    {machine.officialSynopsis}
                  </p>
                </div>
              )}

              {/* Section 2: Core Skills Learned */}
              {machine.skillsLearned && machine.skillsLearned.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-cyber-bg/70 border border-slate-200 dark:border-cyber-border space-y-2.5">
                  <div className="text-[10px] uppercase font-bold text-emerald-800 dark:text-cyber-emerald tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-cyber-emerald" /> TARGET SKILLS REQUIRED & LEARNED
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {machine.skillsLearned.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-cyber-emerald/10 border border-emerald-300 dark:border-cyber-emerald/30 text-emerald-900 dark:text-cyber-emerald text-xs font-medium flex items-center gap-1.5"
                      >
                        <Check className="w-3 h-3 text-emerald-600 dark:text-cyber-emerald stroke-[2.5]" />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Full Structured Walkthrough */}
              {machine.officialWalkthrough && (
                <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-cyber-bg/70 border border-slate-200 dark:border-cyber-border space-y-3">
                  <div className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400 tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> TACTICAL EXPLOITATION WALKTHROUGH
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
            className={`p-3.5 rounded-xl border transition-all relative overflow-hidden ${
              isModalDragOver
                ? 'border-2 border-dashed border-cyber-cyan bg-cyan-950/30'
                : 'border-slate-200 dark:border-cyber-border bg-slate-50/70 dark:bg-cyber-bg/60'
            }`}
          >
            {/* Header / Port list */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-800 dark:text-cyber-cyan flex items-center gap-1.5">
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
                    ? 'bg-rose-950/60 border border-rose-500 text-rose-300'
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
                    className={`p-2 rounded-lg border text-center font-semibold transition-all ${
                      isSelected
                        ? `bg-white dark:bg-cyber-bg border-2 ${stage.color} shadow-md`
                        : 'bg-slate-50 dark:bg-cyber-bg/40 border-slate-200 dark:border-cyber-border/80 text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-cyber-border'
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
              <div className="text-[10px] uppercase font-semibold text-slate-500 dark:text-cyber-muted flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-600 dark:text-cyber-cyan" /> SESSION TIMER
              </div>
              <ModalSessionTimerDisplay machineId={machine.id} fallbackSeconds={machine.timeSpentSeconds} isActiveTarget={isActiveTarget} />
              <div className="text-[10px] text-slate-500 dark:text-cyber-muted">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-100 dark:bg-cyber-emerald/10 border border-emerald-300 dark:border-cyber-emerald/40 text-emerald-900 dark:text-cyber-emerald hover:bg-emerald-500 hover:text-white dark:hover:bg-cyber-emerald dark:hover:text-black font-semibold transition-all"
                >
                  <Crosshair className="w-3.5 h-3.5" /> Set Active Target
                </button>
              ) : (
                <>
                  {isTimerRunning ? (
                    <button
                      onClick={pauseTimer}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-100 dark:bg-cyber-amber/10 border border-amber-300 dark:border-cyber-amber/40 text-amber-900 dark:text-cyber-amber hover:bg-amber-500 hover:text-white dark:hover:bg-cyber-amber dark:hover:text-black font-semibold transition-all"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  ) : (
                    <button
                      onClick={startTimer}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-100 dark:bg-cyber-emerald/10 border border-emerald-300 dark:border-cyber-emerald/40 text-emerald-900 dark:text-cyber-emerald hover:bg-emerald-500 hover:text-white dark:hover:bg-cyber-emerald dark:hover:text-black font-semibold transition-all"
                    >
                      <Play className="w-3.5 h-3.5" /> Resume
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Reset session timer?')) {
                        resetTimer();
                        if (soundEnabled) playCyberSound('click');
                      }
                    }}
                    className="p-1.5 rounded-md bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            {/* Time to User & Root Milestones */}
            <div className="grid grid-cols-2 gap-2 text-[10px] w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-cyber-border pt-2 sm:pt-0 sm:pl-4">
              <div>
                <span className="text-slate-500 dark:text-cyber-muted block">Time to User:</span>
                <span className="font-bold text-cyan-700 dark:text-cyber-cyan font-mono">
                  {machine.timeToUserSeconds ? formatSeconds(machine.timeToUserSeconds) : '--:--:--'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-cyber-muted block">Time to Root:</span>
                <span className="font-bold text-rose-700 dark:text-cyber-crimson font-mono">
                  {machine.timeToRootSeconds ? formatSeconds(machine.timeToRootSeconds) : '--:--:--'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Flags Vault */}
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 dark:text-cyber-muted mb-2 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-amber-600 dark:text-cyber-amber" /> FLAGS VAULT (OBFUSCATED & COPYABLE)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* User Flag */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50/50 dark:bg-cyber-bg/50 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-cyan-800 dark:text-cyber-cyan font-semibold flex items-center gap-1">
                    <Flag className="w-3 h-3" /> USER FLAG
                  </span>
                  {isUserPwned && (
                    <span className="text-[9px] text-emerald-700 dark:text-cyber-emerald flex items-center gap-0.5 font-bold">
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
                    className="w-full bg-white dark:bg-cyber-card px-2.5 py-1.5 rounded border border-slate-200 dark:border-cyber-border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-cyber-muted text-xs focus:outline-none focus:border-cyan-500 dark:focus:border-cyber-cyan pr-16 font-mono shadow-sm"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowUserFlag(!showUserFlag)}
                      className="p-1 rounded text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"
                      title={showUserFlag ? 'Hide Flag' : 'Show Flag'}
                    >
                      {showUserFlag ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(machine.userFlag || '', 'user')}
                      className={`p-1 rounded transition-all flex items-center gap-1 ${
                        copiedUser
                          ? 'bg-cyber-emerald text-black font-extrabold shadow-glow-emerald px-1.5'
                          : 'text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Copy User Flag"
                    >
                      {copiedUser ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span className="text-[9px] uppercase font-bold text-black">COPIED!</span>
                        </>
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Root Flag */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50/50 dark:bg-cyber-bg/50 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-800 dark:text-cyber-emerald font-semibold flex items-center gap-1">
                    <Flag className="w-3 h-3" /> ROOT / SYSTEM FLAG
                  </span>
                  {isRootPwned && (
                    <span className="text-[9px] text-emerald-700 dark:text-cyber-emerald flex items-center gap-0.5 font-bold">
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
                    className="w-full bg-white dark:bg-cyber-card px-2.5 py-1.5 rounded border border-slate-200 dark:border-cyber-border text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-cyber-muted text-xs focus:outline-none focus:border-emerald-500 dark:focus:border-cyber-emerald pr-16 font-mono shadow-sm"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowRootFlag(!showRootFlag)}
                      className="p-1 rounded text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white"
                      title={showRootFlag ? 'Hide Flag' : 'Show Flag'}
                    >
                      {showRootFlag ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(machine.rootFlag || '', 'root')}
                      className={`p-1 rounded transition-all flex items-center gap-1 ${
                        copiedRoot
                          ? 'bg-cyber-emerald text-black font-extrabold shadow-glow-emerald px-1.5'
                          : 'text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white'
                      }`}
                      title="Copy Root Flag"
                    >
                      {copiedRoot ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span className="text-[9px] uppercase font-bold text-black">COPIED!</span>
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

          {/* Official HTB Intel Briefing Card */}
          {machine.officialSynopsis && (
            <div className="p-3.5 rounded-lg border border-emerald-300 dark:border-cyber-emerald/40 bg-emerald-50 dark:bg-cyber-emerald/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-emerald-800 dark:text-cyber-emerald uppercase font-bold flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700 dark:text-cyber-emerald" /> OFFICIAL HTB SYNOPSIS & INTEL
                </span>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('walkthrough')}
                  className="text-[10px] text-emerald-700 dark:text-cyber-emerald hover:underline flex items-center gap-1 font-bold"
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
                      className="px-2 py-0.5 rounded bg-white dark:bg-cyber-card border border-emerald-300 dark:border-cyber-emerald/30 text-emerald-900 dark:text-cyber-emerald text-[10px] font-medium shadow-xs"
                    >
                      {sk}
                    </span>
                  ))}
                  {machine.skillsLearned.length > 4 && (
                    <span className="text-[10px] text-slate-500 dark:text-cyber-muted self-center">
                      +{machine.skillsLearned.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Spoiler-Masked Hint / Active ToS Guard */}
          {machine.isActive ? (
            <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="text-[11px] font-mono">
                Active Lab: Intel hints and spoilers are strictly prohibited by Hack The Box Terms of Service (AUP §8.2).
              </span>
            </div>
          ) : machine.hint ? (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50 dark:bg-cyber-bg/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-amber-800 dark:text-cyber-amber uppercase font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600 dark:text-cyber-amber" /> INTEL HINT (SPOILER MASKED)
                </span>
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="text-[10px] text-slate-500 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
                >
                  {showHint ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showHint ? 'Mask Hint' : 'Reveal Hint'}</span>
                </button>
              </div>
              <div
                onClick={() => setShowHint(!showHint)}
                className={`p-2 rounded border border-slate-200 dark:border-cyber-border text-xs cursor-pointer select-none transition-all ${
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
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-cyber-muted mb-2">
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
                        : 'bg-white dark:bg-cyber-card text-slate-700 dark:text-cyber-muted border-slate-200 dark:border-cyber-border hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 dark:border-cyber-border bg-slate-50 dark:bg-cyber-bg/50">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-cyber-muted mb-2">
                MATRIX OF SATISFACTION (ENJOYMENT)
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => updateMachine(machine.id, { rating: star })}
                    className="p-1 text-slate-400 dark:text-cyber-muted hover:text-amber-500 dark:hover:text-cyber-amber transition-colors"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        (machine.rating || 0) >= star ? 'text-amber-500 fill-amber-500 dark:text-cyber-amber dark:fill-cyber-amber' : ''
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
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-cyber-muted mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-cyber-purple" />
                  <span>IDENTIFIED VULNERABILITY ARCHETYPES ({classifyMachine(machine).categories.length})</span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-cyber-muted italic">Click to filter targets</span>
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
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-xs ${catDef?.badgeColor || 'bg-white dark:bg-cyber-card border-slate-200 dark:border-cyber-border text-slate-900 dark:text-white'}`}
                        title={`Click to filter CTF Tracker targets with ${catDef?.label || catId}`}
                      >
                        <span>{catDef?.label || catId}</span>
                        <span className="text-[10px] opacity-60">↗</span>
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-500 dark:text-cyber-muted italic">Standard Host Operations</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-cyber-muted mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-cyan-700 dark:text-cyber-cyan" /> ATTACK VECTORS & TAGS
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {machine.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyber-cyan/10 border border-cyan-300 dark:border-cyber-cyan/30 text-cyan-900 dark:text-cyber-cyan text-[11px] flex items-center gap-1"
                  >
                  {t}
                  <button
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-red-600 dark:hover:text-cyber-crimson ml-0.5"
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
                className="flex-1 bg-white dark:bg-cyber-bg px-2.5 py-1.5 rounded border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-white text-xs focus:outline-none focus:border-cyan-600 dark:focus:border-cyber-cyan placeholder-slate-400 dark:placeholder-cyber-muted"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-cyber-card dark:hover:bg-cyber-card/80 border border-slate-300 dark:border-cyber-border hover:border-cyan-600 dark:hover:border-cyber-cyan text-slate-900 dark:text-white text-xs font-medium"
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
                <span className="text-[10px] text-purple-800 dark:text-purple-400 uppercase font-bold flex items-center gap-1.5 tracking-wider">
                  <BookOpen className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                  TACTICAL INTEL // OBSIDIAN VAULT ({recommendedNotes.length} MATCHING NOTES)
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded font-mono bg-purple-100 dark:bg-purple-950/40 border border-purple-300 dark:border-purple-800/60 text-purple-900 dark:text-purple-300 font-bold">
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
                      className="p-2.5 rounded-lg bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border hover:border-purple-400 dark:hover:border-purple-500/50 transition-all space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[210px]" title={note.title}>
                          {note.title}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-500/15 text-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-500/30 font-mono font-bold">
                            {note.difficulty}
                          </span>
                          {note.commands && note.commands.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setExpandedNotes(prev => ({ ...prev, [note.id]: !prev[note.id] }))}
                              className="text-[9px] text-cyan-700 dark:text-cyber-cyan hover:underline flex items-center gap-0.5 font-semibold"
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
                                <code className="text-cyan-300 truncate flex-1 select-all" title={interpolated0}>
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
                                <code className="text-purple-300 truncate flex-1 select-all" title={interpolated}>
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
                              className="text-[9px] text-slate-600 dark:text-cyber-muted hover:text-purple-700 dark:hover:text-purple-300 transition-colors flex items-center gap-1 font-mono"
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
          <div className="text-[10px] text-slate-500 dark:text-cyber-muted">
            Created: {new Date(machine.createdAt).toLocaleDateString()}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportMachineId(machine.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/40 hover:bg-purple-200 dark:hover:bg-purple-900/60 border border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-300 hover:text-purple-950 dark:hover:text-white font-bold text-xs transition-colors shadow-xs"
              title="Open Printable Pentest Report PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Pre-Report PDF</span>
            </button>
            <button
              onClick={handleOpenInWriteup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-100 dark:bg-cyber-cyan/10 border border-cyan-300 dark:border-cyber-cyan/40 text-cyan-900 dark:text-cyber-cyan hover:bg-cyan-500 hover:text-white dark:hover:bg-cyber-cyan dark:hover:text-black font-semibold transition-all shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" /> Writeup Studio
            </button>
            <button
              onClick={() => setSelectedMachineId(null)}
              className="px-4 py-1.5 rounded-lg bg-white dark:bg-cyber-card border border-slate-300 dark:border-cyber-border text-slate-900 dark:text-white hover:border-emerald-500 transition-colors font-medium shadow-xs"
            >
              Done
            </button>
          </div>
        </div>

        </motion.div>
      </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

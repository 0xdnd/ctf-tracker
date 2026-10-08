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
import { BadgeOverflow } from '../common/BadgeOverflow';
import { classifyMachine, VULN_CATEGORIES } from '../../utils/categoryUtils';
import { getRecommendedNotesForMachine } from '../../utils/obsidianManualUtils';
import { QuickCommandsTab } from './QuickCommandsTab';
import { DRAWER_SLIDE_TRANSITION } from '../../utils/motionTokens';
import { confirmAction } from '../../store/useConfirmStore';
import { AiScanIntelTab } from '../automation/AiScanIntelTab';
import { detectAndParseScan } from '../../utils/scanParserUtils';

const HEADER_ICON_BTN =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-primary hover:bg-surface-hover transition-colors active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11';

const ModalSessionTimerDisplay: React.FC<{ machineId: string; fallbackSeconds: number; isActiveTarget: boolean }> = React.memo(({ machineId, fallbackSeconds, isActiveTarget }) => {
  const activeTimerSeconds = useCtfStore((s) =>
    s.activeTargetId === machineId ? s.activeTimerSeconds : 0
  );
  return (
    <div className="text-xl font-semibold text-primary mt-0.5 font-mono">
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
  const [showHint, setShowHint] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [activeModalTab, setActiveModalTab] = useState<'overview' | 'checklist' | 'commands' | 'report' | 'walkthrough' | 'ai'>('overview');
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
  const isMachineFrozen = machine?.status === 'completed';
  const aiScanResults = useMemo(
    () => (machine?.rawScanOutput ? detectAndParseScan(machine.rawScanOutput) : null),
    [machine?.rawScanOutput]
  );

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

  const pipelineStages: { id: PipelineStatus; label: string; title: string }[] = [
    { id: 'backlog', label: 'Backlog', title: 'Backlog' },
    { id: 'recon', label: 'Recon', title: 'Recon in progress' },
    { id: 'foothold', label: 'Foothold', title: 'Foothold obtained' },
    { id: 'root', label: 'Root', title: 'Root / system pwned' },
    { id: 'completed', label: 'Completed', title: 'Completed and logged' },
  ];

  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.12 } }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] bg-surface-inverse/80 backdrop-blur-sm font-sans overflow-hidden"
      onClick={() => setSelectedMachineId(null)}
    >
      <motion.div 
        ref={modalRef}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%', transition: DRAWER_SLIDE_TRANSITION.exit }}
        transition={DRAWER_SLIDE_TRANSITION.enter}
        role="dialog"
        aria-modal="true"
        aria-label={`Machine details for ${machine.name}`}
        className="fixed inset-y-0 right-0 w-full sm:max-w-3xl md:max-w-4xl h-full flex flex-col sm:rounded-l-2xl border-l border-subtle shadow-2xl bg-surface-base surface-elevated-depth machined-edge overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header (Pinned at Top) */}
        <div className="flex-shrink-0 flex items-start justify-between gap-3 border-b border-subtle p-4 sm:p-5 bg-surface-card sm:rounded-tl-2xl">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-semibold text-primary tracking-tight font-sans">{machine.name}</h2>
              <BadgeOverflow
                max={2}
                badges={[
                  <OsBadge key="os" os={machine.os} size="sm" />,
                  <DifficultyBadge key="diff" difficulty={machine.difficulty} size="sm" />,
                  <PlatformBadge key="plat" platform={machine.platform} size="sm" />,
                  <CategoryBadge key="cat" machine={machine} size="sm" />,
                ]}
              />
            </div>
            <div className="text-xs text-tertiary mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <EditableIpBadge machineId={machine.id} initialIp={machine.ip} size="sm" showLabel className="font-mono tabular-nums" />
              {Boolean(machine.ip && machine.ip.includes('x')) && (
                <button
                  type="button"
                  onClick={() => setAssignIpMachineId(machine.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary underline-offset-2 hover:underline transition-colors active:scale-[0.97] cursor-pointer"
                  title="Target has placeholder IP. Click to assign live spawned IP"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>Assign spawned IP</span>
                </button>
              )}
              {Boolean(sanitizeExternalUrl(machine.roomUrl)) && (
                <a
                  href={sanitizeExternalUrl(machine.roomUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary underline-offset-2 hover:underline transition-colors"
                >
                  Official room <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {machine.isActive ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-callout-warn-fg">
                  <Lock className="w-3 h-3" />
                  <span>Active lab · writeups prohibited (HTB ToS)</span>
                </span>
              ) : Boolean(sanitizeExternalUrl(machine.writeupUrl)) ? (
                <a
                  href={sanitizeExternalUrl(machine.writeupUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:text-primary underline-offset-2 hover:underline transition-colors"
                >
                  Writeup <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* One primary action */}
            <button
              onClick={() => {
                setSelectedMachineId(machine.id);
                setReconAutomationModalOpen(true);
              }}
              className="flex items-center gap-1.5 h-8 px-3 mr-1 rounded-lg bg-accent text-on-accent hover:bg-accent-hover font-medium text-xs transition-colors active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:h-11"
              title="Open Multi-Format Scan Importer & Payload Crafter for this target"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import scan &amp; payloads</span>
            </button>

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
                className={`${HEADER_ICON_BTN} hover:text-callout-danger-fg`}
                title="Delete Custom Machine"
                aria-label="Delete custom machine"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => setReportMachineId(machine.id)}
              className={HEADER_ICON_BTN}
              title="Open Executive Pentest Pre-Report"
              aria-label="Open pre-report"
            >
              <FileText className="w-4 h-4" />
            </button>
            <ShareLinkButton
              path={`/target/${machine.id}`}
              title={machine.name}
              iconOnly
              className={HEADER_ICON_BTN}
            />
            <button aria-label="Open full page mission workspace"
              onClick={() => {
                navigate(`/target/${machine.id}`);
                setSelectedMachineId(null);
              }}
              className={HEADER_ICON_BTN}
              title="Open Dedicated Full Page Mission Workspace"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button aria-label="Close machine details"
              onClick={() => setSelectedMachineId(null)}
              className={HEADER_ICON_BTN}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs (pinned below header, single-line, scrollable) */}
        <div
          role="tablist"
          aria-label="Machine detail sections"
          className="flex-shrink-0 flex items-center border-b border-subtle bg-surface-card px-2 sm:px-4 overflow-x-auto no-scrollbar"
        >
          {([
            { id: 'overview', label: 'Overview', icon: <Crosshair className="w-3.5 h-3.5" /> },
            { id: 'commands', label: 'Arsenal', icon: <Zap className="w-3.5 h-3.5" /> },
            {
              id: 'checklist',
              label: 'Checklist',
              icon: <ListChecks className="w-3.5 h-3.5" />,
              extra: checklistCompletedCount > 0 ? (
                <span className="text-xs px-1.5 h-5 inline-flex items-center rounded bg-accent-muted text-accent font-medium tabular-nums">
                  {checklistCompletedCount} done
                </span>
              ) : null,
            },
            { id: 'report', label: 'Report', icon: <FileText className="w-3.5 h-3.5" /> },
            { id: 'ai', label: 'AI (optional, BYOK)', icon: <Sparkles className="w-3.5 h-3.5" /> },
            ...(!machine.isActive && Boolean(machine.officialSynopsis || (machine.skillsLearned && machine.skillsLearned.length > 0) || machine.officialPdf)
              ? [{ id: 'walkthrough', label: 'Official intel', icon: <BookOpen className="w-3.5 h-3.5" /> }]
              : []),
          ] as { id: typeof activeModalTab; label: string; icon: React.ReactNode; extra?: React.ReactNode }[]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeModalTab === tab.id}
              onClick={() => setActiveModalTab(tab.id)}
              className={`flex items-center gap-1.5 py-2.5 px-3 sm:px-4 min-h-[44px] sm:min-h-0 font-sans font-medium text-sm border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeModalTab === tab.id
                  ? 'border-accent text-primary'
                  : 'border-transparent text-muted hover:text-primary'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.extra}
            </button>
          ))}
        </div>

        {/* Modal Body (Scrollable Center Workspace) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-xs scrollbar-thin">
          {activeModalTab === 'commands' ? (
            <QuickCommandsTab machine={machine} />
          ) : activeModalTab === 'ai' ? (
            <AiScanIntelTab
              targetMachine={machine}
              parsedResults={aiScanResults}
              isTargetFrozen={isMachineFrozen}
              onApplyToTargetNotes={(markdownContent) =>
                updateMachine(machine.id, { quickNotes: `${machine.quickNotes || ''}${markdownContent}` })
              }
            />
          ) : activeModalTab === 'checklist' ? (
            <ChecklistWorkspace machine={machine} onOpenInWriteup={handleOpenInWriteup} />
          ) : activeModalTab === 'report' ? (
            <div className="space-y-6">
              {/* Report Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface-sunken border border-subtle machined-edge">
                <div>
                  <div className="text-xs text-callout-tip-fg font-semibold mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Executive security assessment pre-report
                  </div>
                  <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
                    <span>{machine.name}</span>
                    <span className="text-tertiary font-normal text-xs font-mono tabular-nums">({machine.ip})</span>
                  </h3>
                  <div className="text-xs text-muted mt-1">
                    Classification: <span className="text-callout-warn-fg font-semibold">Confidential · client penetration audit</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyReportMd}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-card border border-subtle hover:border-accent text-secondary hover:text-primary text-xs transition-colors active:scale-[0.97] cursor-pointer"
                  >
                    {copiedReportMd ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedReportMd ? 'Copied' : 'Copy MD'}</span>
                  </button>

                  <button
                    onClick={() => setReportMachineId(machine.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-callout-tip-bg border border-callout-tip-border text-callout-tip-fg hover:bg-callout-tip-bg font-semibold text-xs transition-colors shadow-sm active:scale-[0.97] cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / PDF</span>
                  </button>
                </div>
              </div>

              {/* Threat Level & Severity Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-surface-sunken border border-subtle machined-edge">
                  <div className="text-xs text-tertiary font-semibold mb-1">Compromise status</div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    {machine.status === 'completed' || machine.status === 'root' ? (
                      <span className="text-callout-success-fg flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> 100% root pwned
                      </span>
                    ) : machine.status === 'foothold' ? (
                      <span className="text-callout-warn-fg flex items-center gap-1">
                        <AlertOctagon className="w-4 h-4" /> Foothold obtained
                      </span>
                    ) : (
                      <span className="text-callout-info-fg flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" /> Recon in progress
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-sunken border border-subtle machined-edge">
                  <div className="text-xs text-tertiary font-semibold mb-1">Risk severity</div>
                  <div className="text-sm font-semibold text-callout-danger-fg flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="tabular-nums">CVSS 9.4 CRITICAL</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-sunken border border-subtle machined-edge">
                  <div className="text-xs text-tertiary font-semibold mb-1">Total time logged</div>
                  <div className="text-sm font-semibold text-callout-info-fg flex items-center gap-1.5 font-mono tabular-nums">
                    <Clock className="w-4 h-4" />
                    <span>{formatSeconds(machine.timeSpentSeconds)}</span>
                  </div>
                </div>
              </div>

              {/* Executive Summary Narrative */}
              <div className="p-4 rounded-2xl bg-surface-sunken/80 border border-subtle space-y-2 machined-edge">
                <div className="text-xs font-semibold text-callout-info-fg">
                  1. Executive summary
                </div>
                <p className="text-muted leading-relaxed">
                  During security validation on target host <strong className="text-primary">{machine.name}</strong> (<span className="tabular-nums">{machine.ip}</span>), high-impact vulnerabilities were verified. Remote access vectors allowed adversaries to breach network perimeters and subsequently escalate privileges to root / system administrator.
                </p>
              </div>

              {/* Attack Path & Flag Proof of Compromise */}
              <div className="p-4 rounded-2xl bg-surface-sunken/80 border border-subtle space-y-3 machined-edge">
                <div className="text-xs font-semibold text-callout-success-fg">
                  2. Attack chain &amp; proof of compromise
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-surface-card border border-subtle machined-edge">
                    <div className="text-xs text-callout-info-fg font-semibold mb-1 flex items-center justify-between">
                      <span>User access flag</span>
                      <span>{machine.userPwnedAt ? 'Pwned' : 'Pending'}</span>
                    </div>
                    <div className="p-2 rounded bg-surface-sunken text-secondary text-xs font-mono truncate tabular-nums">
                      {machine.userFlag || (machine.userPwnedAt ? 'HTB{user_flag_verified}' : 'Not Captured')}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-card border border-subtle machined-edge">
                    <div className="text-xs text-callout-success-fg font-semibold mb-1 flex items-center justify-between">
                      <span>Root / system flag</span>
                      <span>{machine.rootPwnedAt ? 'Rooted' : 'Pending'}</span>
                    </div>
                    <div className="p-2 rounded bg-surface-sunken text-secondary text-xs font-mono truncate tabular-nums">
                      {machine.rootFlag || (machine.rootPwnedAt ? 'HTB{root_flag_verified}' : 'Not Captured')}
                    </div>
                  </div>
                </div>

                {machine.quickNotes && (
                  <div className="p-3 rounded-lg bg-surface-card border border-subtle space-y-1 machined-edge">
                    <div className="text-xs text-tertiary font-semibold">Assessor Field Notes:</div>
                    <div className="text-secondary whitespace-pre-wrap">{machine.quickNotes}</div>
                  </div>
                )}
              </div>

              {/* Remediation Action Plan */}
              <div className="p-4 rounded-xl bg-surface-sunken/80 border border-subtle space-y-2">
                <div className="text-xs font-semibold text-callout-warn-fg">
                  3. Strategic remediation roadmap
                </div>
                <ul className="space-y-1.5 text-muted list-disc list-inside">
                  <li><strong className="text-primary">Immediate:</strong> Terminate vulnerable listening services and patch software packages to stable releases.</li>
                  <li><strong className="text-primary">Defensive:</strong> Harden local sudoers configurations and eliminate unauthorized SUID binaries.</li>
                  <li><strong className="text-primary">Monitoring:</strong> Deploy SIEM ingestion for authentication failure telemetry and privilege escalation alerting.</li>
                </ul>
              </div>
            </div>
          ) : activeModalTab === 'walkthrough' ? (
            machine.isActive ? (
              <div className="p-8 rounded-xl border border-callout-warn-border bg-callout-warn-bg text-center space-y-3">
                <Lock className="w-8 h-8 text-callout-warn-fg mx-auto" />
                <h3 className="text-sm font-semibold text-callout-warn-fg ">
                  Active Lab · Walkthroughs Strictly Prohibited
                </h3>
                <p className="text-xs text-muted max-w-md mx-auto">
                  Hack The Box Acceptable Use Policy (§8.2) strictly prohibits walkthroughs, writeups, and solutions for active seasonal content.
                </p>
              </div>
            ) : (
            <div className="space-y-6">
              {/* Header banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-surface-sunken border border-subtle">
                <div>
                  <div className="text-xs text-callout-success-fg font-semibold mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-callout-success-fg" /> Official Hack The Box intelligence briefing
                  </div>
                  <h3 className="text-base font-semibold text-primary flex items-center gap-2">
                    <span>{machine.name}</span>
                    <span className="text-tertiary font-normal text-xs font-mono">({machine.ip})</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-md bg-callout-success-bg text-callout-success-fg font-semibold border border-callout-success-border">
                      Official HTB
                    </span>
                  </h3>
                  {machine.officialPdf && (
                    <div className="text-xs text-tertiary mt-1 flex items-center gap-1.5">
                      <span>Source Archive:</span>
                      <span className="text-callout-info-fg font-mono text-xs bg-surface-card px-1.5 py-0.5 rounded border border-subtle">
                        {machine.officialPdf}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenInWriteup}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-callout-success-bg border border-callout-success-border text-callout-success-fg hover:bg-callout-success-fg hover:text-primary font-semibold text-xs transition-[box-shadow,background-color,border-color,color] shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Writeup Studio</span>
                  </button>
                </div>
              </div>

              {/* Section 1: Official Synopsis */}
              {machine.officialSynopsis && (
                <div className="p-4 rounded-xl bg-surface-sunken/80 border border-subtle space-y-2">
                  <div className="text-xs font-semibold text-callout-info-fg flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-callout-info-fg" /> Official synopsis &amp; threat overview
                  </div>
                  <p className="text-secondary text-xs sm:text-sm leading-relaxed font-sans font-normal">
                    {machine.officialSynopsis}
                  </p>
                </div>
              )}

              {/* Section 2: Core Skills Learned */}
              {machine.skillsLearned && machine.skillsLearned.length > 0 && (
                <div className="p-4 rounded-xl bg-surface-sunken/80 border border-subtle space-y-2.5">
                  <div className="text-xs font-semibold text-callout-success-fg flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-callout-success-fg" /> Skills required &amp; learned
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {machine.skillsLearned.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-1 rounded-lg bg-callout-success-bg border border-callout-success-border text-callout-success-fg text-xs font-medium flex items-center gap-1.5"
                      >
                        <Check className="w-3 h-3 text-callout-success-fg stroke-[2.5]" />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: link to the machine's platform page */}
              {(() => {
                const safeHref = machine.roomUrl ? sanitizeExternalUrl(machine.roomUrl) : undefined;
                if (!safeHref) return null;
                const platformName = machine.platform === 'HTB' ? 'Hack The Box' : machine.platform === 'THM' ? 'TryHackMe' : machine.platform;
                return (
                  <div className="p-4 rounded-xl bg-surface-sunken/80 border border-subtle">
                    <a
                      href={safeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-callout-tip-fg hover:underline"
                    >
                      <FileText className="w-3.5 h-3.5" /> View on {platformName} ↗
                    </a>
                  </div>
                );
              })()}
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
                ? 'border-2 border-dashed border-accent bg-accent-muted'
                : 'border-subtle bg-surface-sunken/70'
            }`}
          >
            {/* Header / Port list */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-callout-info-fg flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5" /> Recon intake &amp; open ports ({machine.openPorts?.length || 0})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-2.5 py-1 rounded bg-surface-card border border-strong hover:border-accent text-secondary text-xs font-semibold flex items-center gap-1.5 transition-colors">
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
                  className="px-2 py-1 rounded bg-surface-hover hover:bg-surface-hover text-secondary text-xs font-medium transition-colors"
                  title="Open full Recon & Payload Crafter"
                >
                  Advanced Recon
                </button>
              </div>
            </div>

            {/* Notification Toast */}
            {modalScanToast && (
              <div
                className={`mb-2.5 p-2 rounded text-xs font-semibold flex items-center gap-2 ${
                  modalScanToast.isError
                    ? 'bg-callout-danger-bg border border-callout-danger-border text-callout-danger-fg'
                    : 'bg-callout-success-bg border border-callout-success-border text-callout-success-fg'
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
                    className="px-2 py-0.5 rounded bg-surface-card border border-strong text-primary font-mono text-xs font-semibold shadow-xs flex items-center gap-1"
                  >
                    <span>{port}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted flex items-center gap-1.5 py-1">
                <span>No open ports recorded yet. Drag & drop a <code>.nmap</code> or <code>.gnmap</code> file directly onto this card to ingest.</span>
              </div>
            )}
          </div>

          {/* Section 1: Attack lifecycle (progress stepper) */}
          <div>
            <div className="text-sm font-semibold text-secondary mb-3 flex items-center gap-1.5 font-sans">
              Attack lifecycle
            </div>
            <ol className="flex items-start" aria-label="Attack lifecycle status">
              {pipelineStages.map((stage, idx) => {
                const isSelected = machine.status === stage.id;
                const currentIdx = pipelineStages.findIndex((s) => s.id === machine.status);
                const isReached = currentIdx >= idx;
                const isLast = idx === pipelineStages.length - 1;
                return (
                  <li key={stage.id} className="flex flex-1 items-start min-w-0">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(stage.id)}
                      aria-current={isSelected ? 'step' : undefined}
                      title={stage.title}
                      className="group flex w-full min-w-0 flex-col items-center gap-1.5 rounded-lg px-1 py-1 text-center cursor-pointer transition-colors active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:min-h-11"
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium tabular-nums transition-colors ${
                          isSelected
                            ? 'border-accent bg-accent text-on-accent ring-2 ring-accent/30'
                            : isReached
                              ? 'border-accent bg-accent-muted text-accent'
                              : 'border-strong bg-surface-sunken text-muted group-hover:text-primary'
                        }`}
                      >
                        {isReached && !isSelected ? <Check className="h-3 w-3 stroke-[3]" /> : idx + 1}
                      </span>
                      <span
                        className={`w-full truncate text-xs font-medium ${
                          isSelected ? 'text-primary' : isReached ? 'text-secondary' : 'text-muted group-hover:text-primary'
                        }`}
                      >
                        {stage.label}
                      </span>
                    </button>
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className={`mt-3 h-px w-3 shrink-0 sm:w-6 ${currentIdx > idx ? 'bg-accent' : 'bg-surface-hover'}`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Section 2: Engagement Stopwatch & Time Metrics */}
          <div className="p-3.5 rounded-lg bg-surface-sunken border border-subtle grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <div>
              <div className="text-xs font-semibold text-tertiary flex items-center gap-1">
                <Clock className="w-3 h-3 text-callout-info-fg" /> Session timer
              </div>
              <ModalSessionTimerDisplay machineId={machine.id} fallbackSeconds={machine.timeSpentSeconds} isActiveTarget={isActiveTarget} />
              <div className="text-xs text-tertiary">
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-callout-success-bg border border-callout-success-border text-callout-success-fg hover:bg-callout-success-fg hover:text-primary font-semibold transition-colors"
                >
                  <Crosshair className="w-3.5 h-3.5" /> Set Active Target
                </button>
              ) : (
                <>
                  {isTimerRunning ? (
                    <button
                      onClick={pauseTimer}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-callout-warn-bg border border-callout-warn-border text-callout-warn-fg hover:bg-callout-warn-fg hover:text-primary font-semibold transition-colors"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  ) : (
                    <button
                      onClick={startTimer}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-callout-success-bg border border-callout-success-border text-callout-success-fg hover:bg-callout-success-fg hover:text-primary font-semibold transition-colors"
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
                    className="p-1.5 rounded-md bg-surface-card border border-subtle text-muted hover:text-primary"
                    title="Reset Timer"
                    aria-label="Reset session timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            {/* Time to User & Root Milestones */}
            <div className="grid grid-cols-2 gap-2 text-xs w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-subtle pt-2 sm:pt-0 sm:pl-4">
              <div>
                <span className="text-tertiary block">Time to User:</span>
                <span className="font-semibold text-callout-info-fg font-mono">
                  {machine.timeToUserSeconds ? formatSeconds(machine.timeToUserSeconds) : '--:--:--'}
                </span>
              </div>
              <div>
                <span className="text-tertiary block">Time to Root:</span>
                <span className="font-semibold text-callout-danger-fg font-mono">
                  {machine.timeToRootSeconds ? formatSeconds(machine.timeToRootSeconds) : '--:--:--'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Flags Vault (Concentric R_inner = 8px) */}
          <div className="rounded-lg p-4 bg-surface-card border border-subtle surface-card-depth machined-edge space-y-3">
            <div className="text-xs font-sans font-semibold text-secondary flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-callout-warn-fg" /> Flags vault (masked &amp; copyable)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* User Flag */}
              <div className="p-3 rounded-md border border-subtle bg-surface-sunken/50 space-y-2 machined-edge">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-accent font-semibold flex items-center gap-1 font-sans">
                    <Flag className="w-3 h-3" /> User flag
                  </span>
                  {isUserPwned && (
                    <span className="text-xs text-callout-success-fg flex items-center gap-0.5 font-semibold">
                      <Check className="w-3 h-3" /> Pwned
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
                    className="w-full bg-surface-card px-3 py-2 rounded-lg border border-subtle text-primary placeholder:text-tertiary text-xs focus:outline-none focus:border-accent pr-16 font-mono shadow-xs"
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
                      className={`p-1 rounded-md transition-interactive active:scale-[0.97] flex items-center gap-1 cursor-pointer ${
                        copiedUser
                          ? 'bg-callout-success-fg text-surface-base font-semibold px-1.5'
                          : 'text-muted hover:text-primary'
                      }`}
                      title="Copy User Flag"
                    >
                      {copiedUser ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span className="text-xs font-semibold text-primary">Copied</span>
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
                <div className="flex items-center justify-between text-xs">
                  <span className="text-callout-success-fg font-semibold flex items-center gap-1 font-sans">
                    <Flag className="w-3 h-3" /> Root / system flag
                  </span>
                  {isRootPwned && (
                    <span className="text-xs text-callout-success-fg flex items-center gap-0.5 font-semibold">
                      <Check className="w-3 h-3" /> Rooted
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
                    className="w-full bg-surface-card px-3 py-2 rounded-lg border border-subtle text-primary placeholder:text-tertiary text-xs focus:outline-none focus:border-callout-success-border pr-16 font-mono shadow-xs"
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
                      className={`p-1 rounded-md transition-interactive active:scale-[0.97] flex items-center gap-1 cursor-pointer ${
                        copiedRoot
                          ? 'bg-callout-success-fg text-surface-base font-semibold px-1.5'
                          : 'text-muted hover:text-primary'
                      }`}
                      title="Copy Root Flag"
                    >
                      {copiedRoot ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span className="text-xs font-semibold text-primary">Copied</span>
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
            <div className="flex items-center justify-between text-xs font-sans font-semibold text-secondary">
              <span className="flex items-center gap-1.5 text-callout-tip-fg">
                <FileCode className="w-3.5 h-3.5" /> Target field notes &amp; loot
              </span>
              <span className="text-xs text-muted font-normal font-sans">
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
              className="w-full p-3 rounded-md border border-subtle bg-surface-sunken text-primary placeholder:text-tertiary text-xs font-sans leading-relaxed focus:outline-none focus:border-accent selection:bg-accent/20 resize-y shadow-xs"
            />
          </div>

          {/* Official HTB Intel Briefing Card */}
          {machine.officialSynopsis && (
            <div className="p-3.5 rounded-lg border border-callout-success-border bg-callout-success-bg space-y-2 machined-edge">
              <div className="flex items-center justify-between">
                <span className="text-xs text-callout-success-fg font-semibold flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-callout-success-fg" /> Official HTB synopsis &amp; intel
                </span>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('walkthrough')}
                  className="text-xs text-callout-success-fg hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Open full walkthrough</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-secondary leading-relaxed font-sans font-normal">
                {machine.officialSynopsis}
              </p>
              {machine.skillsLearned && machine.skillsLearned.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {machine.skillsLearned.slice(0, 4).map((sk, skIdx) => (
                    <span
                      key={skIdx}
                      className="px-2 py-0.5 rounded bg-surface-card border border-callout-success-border text-callout-success-fg text-xs font-medium shadow-xs"
                    >
                      {sk}
                    </span>
                  ))}
                  {machine.skillsLearned.length > 4 && (
                    <span className="text-xs text-tertiary self-center">
                      +{machine.skillsLearned.length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Section 4: Spoiler-Masked Hint / Active ToS Guard */}
          {machine.isActive ? (
            <div className="p-3 rounded-lg border border-callout-warn-border bg-callout-warn-bg text-callout-warn-fg flex items-center gap-2">
              <Lock className="w-4 h-4 text-callout-warn-fg flex-shrink-0" />
              <span className="text-xs">
                Active Lab: Intel hints and spoilers are strictly prohibited by Hack The Box Terms of Service (AUP §8.2).
              </span>
            </div>
          ) : machine.hint ? (
            <div className="p-3 rounded-lg border border-subtle bg-surface-sunken">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-callout-warn-fg font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-callout-warn-fg" /> Intel hint (spoiler masked)
                </span>
                <button
                  type="button"
                  onClick={() => setShowHint(!showHint)}
                  className="text-xs text-tertiary hover:text-primary flex items-center gap-1"
                >
                  {showHint ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showHint ? 'Mask Hint' : 'Reveal Hint'}</span>
                </button>
              </div>
              <div
                onClick={() => setShowHint(!showHint)}
                className={`p-2 rounded border border-subtle text-xs cursor-pointer select-none transition-colors ${
                  showHint ? 'bg-surface-card text-primary' : 'blur-sm text-transparent bg-surface-hover/60'
                }`}
                title="Click to toggle hint spoiler"
              >
                {machine.hint}
              </div>
            </div>
          ) : null}

          {/* Section 5: Perceived Difficulty & Enjoyment Rating */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border border-subtle bg-surface-sunken">
              <div className="text-xs font-semibold text-tertiary mb-2">
                Perceived difficulty vs official
              </div>
              <div className="flex items-center gap-1.5">
                {(['Very Easy', 'Easy', 'Medium', 'Hard', 'Insane'] as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => updateMachine(machine.id, { perceivedDifficulty: diff })}
                    className={`px-2 py-1 rounded text-xs border transition-colors ${
                      machine.perceivedDifficulty === diff
                        ? 'bg-callout-success-fg text-surface-base font-semibold border-callout-success-border shadow-xs'
                        : 'bg-surface-card text-secondary border-subtle hover:text-primary'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-subtle bg-surface-sunken">
              <div className="text-xs font-semibold text-tertiary mb-2">
                Enjoyment rating
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => updateMachine(machine.id, { rating: star })}
                    className="p-1 text-tertiary hover:text-callout-warn-fg transition-colors"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        (machine.rating || 0) >= star ? 'text-callout-warn-fg fill-callout-warn-fg' : ''
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs text-muted ml-2">
                  {machine.rating ? `${machine.rating} / 5 Stars` : 'Unrated'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 6: Identified Vulnerability Archetypes & Tags */}
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-tertiary mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-callout-tip-fg" />
                  <span>Identified vulnerability archetypes ({classifyMachine(machine).categories.length})</span>
                </div>
                <span className="text-xs text-tertiary">Click to filter targets</span>
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
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.98] cursor-pointer flex items-center gap-1.5 shadow-xs ${catDef?.badgeColor || 'bg-surface-card border-subtle text-primary'}`}
                        title={`Click to filter CTF Tracker targets with ${catDef?.label || catId}`}
                      >
                        <span>{catDef?.label || catId}</span>
                        <span className="text-xs opacity-60">↗</span>
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-tertiary">Standard Host Operations</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-tertiary mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-callout-info-fg" /> Attack vectors &amp; tags
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {machine.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-md bg-accent-muted border border-accent text-callout-info-fg text-xs flex items-center gap-1"
                  >
                  {t}
                  <button
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-callout-danger-fg ml-0.5"
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
                className="flex-1 bg-surface-card px-3 py-1.5 rounded-lg border border-strong text-primary text-xs focus:outline-none focus:border-accent placeholder:text-tertiary shadow-xs"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3.5 py-1.5 rounded-lg bg-surface-sunken hover:bg-surface-hover border border-strong hover:border-accent text-primary text-xs font-medium active:scale-[0.98] transition-[transform,box-shadow,background-color,border-color,color] shadow-xs"
              >
                Add
              </button>
            </div>
          </div>
        </div>

          {/* Section 7: Tactical Intel (Obsidian Notes Vault) */}
          {recommendedNotes.length > 0 && (
            <div className="p-3.5 rounded-xl bg-callout-tip-bg border border-callout-tip-border space-y-3 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-callout-tip-fg font-semibold flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-callout-tip-fg" />
                  Related notes from your vault ({recommendedNotes.length} matching)
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-callout-tip-bg border border-callout-tip-border text-callout-tip-fg font-semibold">
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
                      className="p-2.5 rounded-lg bg-surface-card border border-subtle hover:border-callout-tip-border transition-[box-shadow,background-color,border-color,color] space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-primary truncate max-w-[210px]" title={note.title}>
                          {note.title}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-xs px-1.5 py-0.5 rounded bg-callout-tip-bg text-callout-tip-fg border border-callout-tip-border font-semibold">
                            {note.difficulty}
                          </span>
                          {note.commands && note.commands.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setExpandedNotes(prev => ({ ...prev, [note.id]: !prev[note.id] }))}
                              className="text-xs text-callout-info-fg hover:underline flex items-center gap-0.5 font-semibold"
                              title="Toggle all commands"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              <span>{note.commands.length} cmds</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-muted line-clamp-2 font-sans">
                        {note.summary || note.subCategory}
                      </div>

                      {note.commands && note.commands.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {/* First command (always visible) - permanent dark terminal */}
                          {(() => {
                            const interpolated0 = interpolateCommand(note.commands[0], targetVars);
                            return (
                              <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-surface-sunken border border-subtle font-mono text-xs">
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
                                  className="px-1.5 py-0.5 rounded text-xs bg-surface-card hover:bg-surface-elevated text-secondary hover:text-primary transition-colors flex-shrink-0 font-semibold"
                                  title="Copy command"
                                >
                                  {copiedCommand === interpolated0 ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                            );
                          })()}

                          {/* Remaining commands when expanded - permanent dark terminal */}
                          {isExpanded && note.commands.slice(1).map((cmd, cIdx) => {
                            const interpolated = interpolateCommand(cmd, targetVars);
                            return (
                              <div key={cIdx} className="flex items-center justify-between gap-2 p-1.5 rounded bg-surface-sunken border border-callout-tip-border font-mono text-xs">
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
                                  className="px-1.5 py-0.5 rounded text-xs bg-surface-card hover:bg-surface-elevated text-callout-tip-fg hover:text-primary transition-colors flex-shrink-0 font-semibold"
                                  title="Copy command"
                                >
                                  {copiedCommand === interpolated ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                            );
                          })}

                          {extraCommandsCount > 0 && !isExpanded && (
                            <button
                              type="button"
                              onClick={() => setExpandedNotes(prev => ({ ...prev, [note.id]: true }))}
                              className="text-xs text-muted hover:text-callout-tip-fg transition-colors flex items-center gap-1"
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
        <div className="flex-shrink-0 border-t border-subtle p-3 sm:p-3.5 bg-surface-sunken/95 backdrop-blur-sm flex items-center justify-between">
          <div className="text-xs text-tertiary">
            Created: {new Date(machine.createdAt).toLocaleDateString()}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setReportMachineId(machine.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-callout-tip-bg hover:bg-callout-tip-bg border border-callout-tip-border text-callout-tip-fg hover:text-callout-tip-fg font-semibold text-xs transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.97] shadow-xs"
              title="Open Printable Pentest Report PDF"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Pre-Report PDF</span>
            </button>
            <button
              onClick={handleOpenInWriteup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-muted border border-accent text-callout-info-fg hover:bg-accent hover:text-on-accent font-semibold transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.97] shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" /> Writeup Studio
            </button>
            <button
              onClick={() => setSelectedMachineId(null)}
              className="px-4 py-1.5 rounded-lg bg-surface-card border border-strong text-primary hover:border-callout-success-border transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.97] font-medium shadow-xs"
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

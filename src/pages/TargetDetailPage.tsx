import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Crosshair,
  ExternalLink,
  Clock,
  Play,
  Pause,
  FileText,
  Check,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  Lock,
} from 'lucide-react';
import { useCtfStore } from '../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { Difficulty, PipelineStatus } from '../types';
import { ChecklistWorkspace } from '../components/checklist/ChecklistWorkspace';
import { formatSeconds, playCyberSound, triggerRootCelebration, sanitizeExternalUrl } from '../utils/helpers';
import { PlatformBadge } from '../components/common/PlatformBadge';
import { OsBadge } from '../components/common/OsBadge';
import { DifficultyBadge } from '../components/common/DifficultyBadge';
import { EditableIpBadge } from '../components/common/EditableIpBadge';
import { QuickCommandsTab } from '../components/tracker/QuickCommandsTab';
import { TargetReconDropzone } from '../components/tracker/TargetReconDropzone';
import { PageHeader } from '../components/common/PageHeader';
import { BadgeOverflow } from '../components/common/BadgeOverflow';
import { CyberButton } from '../components/common/CyberButton';

const TargetDetailTimerDisplay: React.FC<{ machineId: string; fallbackSeconds: number; isActiveTarget: boolean }> = React.memo(({ machineId, fallbackSeconds, isActiveTarget }) => {
  const activeTimerSeconds = useCtfStore((s) => (s.activeTargetId === machineId ? s.activeTimerSeconds : 0));
  return (
    <span className="font-mono tabular-nums text-sm font-semibold text-primary" data-testid="target-timer">
      {formatSeconds(isActiveTarget ? activeTimerSeconds : fallbackSeconds)}
    </span>
  );
});

export const TargetDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isFocusMode = location.pathname.endsWith('/focus');

  const {
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
    setWriteupMachineId,
    isCatalogLoaded,
    loadCatalog,
  } = useCtfStore(
    useShallow((s) => ({
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
      setWriteupMachineId: s.setWriteupMachineId,
      isCatalogLoaded: s.isCatalogLoaded,
      loadCatalog: s.loadCatalog,
    }))
  );

  useEffect(() => {
    if (!isCatalogLoaded) {
      loadCatalog();
    }
  }, [isCatalogLoaded, loadCatalog]);

  const normalizedId = id?.toLowerCase().trim();
  const machine = machines.find((m) => {
    if (!normalizedId) return false;
    const mid = m.id.toLowerCase();
    const mname = m.name.toLowerCase();
    return (
      mid === normalizedId ||
      mid === `htb-${normalizedId}` ||
      mid === `thm-${normalizedId}` ||
      mname === normalizedId ||
      mname.replace(/[^a-z0-9]/g, '') === normalizedId.replace(/[^a-z0-9]/g, '')
    );
  });

  const [activeTab, setActiveTab] = useState<'checklist' | 'overview' | 'commands' | 'recon'>('checklist');
  const [showUserFlag, setShowUserFlag] = useState(false);
  const [showRootFlag, setShowRootFlag] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedRoot, setCopiedRoot] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  if (!isCatalogLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 space-y-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted">Loading target catalog…</p>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 space-y-4">
        <AlertCircle className="w-10 h-10 text-callout-danger-fg" aria-hidden="true" />
        <h2 className="text-xl font-semibold tracking-[-0.015em] text-primary">Target not found</h2>
        <p className="text-sm text-muted max-w-md">
          The requested target ID <code className="font-mono tabular-nums text-primary">{id}</code> could not be located in the local catalog.
        </p>
        <Link
          to="/tracker"
          className="inline-flex h-8 items-center rounded-md border border-subtle bg-surface-card px-3 text-[13px] font-medium text-primary transition-colors hover:bg-surface-hover active:scale-[0.97]"
        >
          Return to Tracker
        </Link>
      </div>
    );
  }

  const isActiveTarget = activeTargetId === machine.id;

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

  const handleCopy = (text: string, type: 'user' | 'root') => {
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
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

  const openWriteup = () => {
    setWriteupMachineId(machine.id);
    navigate('/writeup');
  };

  const engage = () => {
    setActiveTarget(machine.id);
    startTimer();
  };

  const pipelineStages: { id: PipelineStatus; label: string; dot: string }[] = [
    { id: 'backlog', label: 'Backlog', dot: 'bg-cyber-muted' },
    { id: 'recon', label: 'Recon in progress', dot: 'bg-callout-info-fg' },
    { id: 'foothold', label: 'Foothold obtained', dot: 'bg-callout-warn-fg' },
    { id: 'root', label: 'Root / system pwned', dot: 'bg-callout-danger-fg' },
    { id: 'completed', label: 'Completed & logged', dot: 'bg-callout-success-fg' },
  ];

  const tabs: { id: typeof activeTab; testId: string; label: string; count?: number }[] = [
    { id: 'checklist', testId: 'tab-checklist', label: 'Checklist' },
    { id: 'overview', testId: 'tab-flags', label: 'Flags & intel' },
    { id: 'recon', testId: 'tab-recon', label: 'Recon', count: machine.services?.length || undefined },
    { id: 'commands', testId: 'tab-commands', label: 'Commands' },
  ];

  const badges: React.ReactNode[] = [
    <PlatformBadge key="platform" platform={machine.platform} size="sm" />,
    <OsBadge key="os" os={machine.os} size="sm" />,
    <DifficultyBadge key="difficulty" difficulty={machine.difficulty} size="sm" />,
  ];

  const roomUrl = sanitizeExternalUrl(machine.roomUrl);
  const writeupUrl = sanitizeExternalUrl(machine.writeupUrl);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mx-auto max-w-6xl space-y-5 pb-12 text-sm"
    >
      <div className="space-y-2">
        <button
          aria-label="Back to target list"
          onClick={() => navigate('/tracker')}
          title="Back to Target List"
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-1.5 text-[13px] font-medium text-secondary transition-colors hover:bg-surface-hover hover:text-primary active:scale-[0.97] [@media(pointer:coarse)]:h-11"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Targets</span>
        </button>

        <PageHeader
          title={machine.name}
          primaryAction={
            isActiveTarget ? (
              <CyberButton
                variant="secondary"
                size="md"
                iconLeft={isTimerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                aria-label={isTimerRunning ? 'Pause timer' : 'Resume timer'}
                title={isTimerRunning ? 'Pause' : 'Resume'}
                onClick={isTimerRunning ? pauseTimer : startTimer}
                className="[@media(pointer:coarse)]:h-11"
              >
                {isTimerRunning ? 'Pause' : 'Resume'}
              </CyberButton>
            ) : (
              <CyberButton
                variant="primary"
                size="md"
                onClick={engage}
                className="[@media(pointer:coarse)]:h-11"
              >
                Engage
              </CyberButton>
            )
          }
          actions={
            <>
              {isActiveTarget && (
                <button
                  onClick={() => {
                    setActiveTarget(null);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-secondary transition-colors hover:bg-surface-hover hover:text-callout-danger-fg active:scale-[0.97]"
                  title="Disengage Active Target"
                  aria-label="Disengage active target"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              <CyberButton
                variant="ghost"
                size="md"
                iconLeft={<FileText className="h-3.5 w-3.5" />}
                onClick={openWriteup}
              >
                Writeup Studio
              </CyberButton>
              {isFocusMode ? (
                <CyberButton
                  variant="ghost"
                  size="md"
                  iconLeft={<Eye className="h-3.5 w-3.5" />}
                  title="Exit Focus Mode"
                  onClick={() => navigate(`/target/${machine.id}`)}
                >
                  Exit focus
                </CyberButton>
              ) : (
                <button
                  aria-label="Enter focus mode"
                  onClick={() => navigate(`/target/${machine.id}/focus`)}
                  title="Enter Focus Mode"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-secondary transition-colors hover:bg-surface-hover hover:text-primary active:scale-[0.97]"
                >
                  <Crosshair className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </>
          }
          overflow={[
            { id: 'writeup', label: 'Writeup Studio', icon: <FileText className="h-4 w-4" />, onSelect: openWriteup },
            isFocusMode
              ? { id: 'focus', label: 'Exit focus mode', icon: <Eye className="h-4 w-4" />, onSelect: () => navigate(`/target/${machine.id}`) }
              : { id: 'focus', label: 'Focus mode', icon: <Crosshair className="h-4 w-4" />, onSelect: () => navigate(`/target/${machine.id}/focus`) },
            ...(isActiveTarget
              ? [{ id: 'disengage', label: 'Disengage target', icon: <X className="h-4 w-4" />, danger: true, onSelect: () => setActiveTarget(null) }]
              : []),
          ]}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <BadgeOverflow badges={badges} max={2} />
            <EditableIpBadge machineId={machine.id} initialIp={machine.ip} size="sm" showLabel />
            <span className="inline-flex items-center gap-1.5 text-secondary">
              <Clock className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              <TargetDetailTimerDisplay machineId={machine.id} fallbackSeconds={machine.timeSpentSeconds} isActiveTarget={isActiveTarget} />
            </span>
            {machine.isActive && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-callout-warn-fg">
                <Lock className="h-3 w-3" aria-hidden="true" />
                <span>Active lab · writeups prohibited (HTB ToS)</span>
              </span>
            )}
            {roomUrl && (
              <a
                href={roomUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-callout-info-fg hover:underline"
              >
                Official room <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
            {!machine.isActive && writeupUrl && (
              <a
                href={writeupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-callout-info-fg hover:underline"
              >
                Writeup <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        </PageHeader>
      </div>

      {/* Navigation tabs: single line, horizontally scrollable */}
      <div className="-mx-4 overflow-x-auto no-scrollbar border-b border-subtle px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max items-center gap-1">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-testid={tab.testId}
                className={`-mb-px inline-flex min-h-11 flex-shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[13px] font-medium transition-colors sm:min-h-9 ${
                  selected
                    ? 'border-accent text-primary'
                    : 'border-transparent text-muted hover:text-primary'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="rounded px-1.5 text-xs font-medium tabular-nums bg-surface-sunken text-secondary">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main tab stage */}
      {activeTab === 'checklist' ? (
        <ChecklistWorkspace
          machine={machine}
          onOpenInWriteup={openWriteup}
        />
      ) : activeTab === 'commands' ? (
        <div>
          <QuickCommandsTab machine={machine} />
        </div>
      ) : activeTab === 'recon' ? (
        <div>
          <TargetReconDropzone
            machine={machine}
            onUpdateMachine={updateMachine}
            soundEnabled={soundEnabled}
          />
        </div>
      ) : (
        <div className="space-y-8">

          {/* Lifecycle */}
          <section aria-labelledby="target-lifecycle-heading">
            <h2 id="target-lifecycle-heading" className="mb-2 text-sm font-semibold text-primary">Attack lifecycle</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {pipelineStages.map((stage) => {
                const isSelected = machine.status === stage.id;
                return (
                  <button
                    key={stage.id}
                    onClick={() => handleStatusChange(stage.id)}
                    aria-pressed={isSelected}
                    className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-2.5 py-2 text-center text-[13px] font-medium transition-[transform,background-color,border-color,color] active:scale-[0.97] sm:min-h-9 ${
                      isSelected
                        ? 'border-accent bg-accent-muted text-primary'
                        : 'border-subtle bg-surface-card text-muted hover:border-strong hover:text-primary'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${stage.dot}`} aria-hidden="true" />
                    <span>{stage.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Flags */}
          <section aria-labelledby="target-flags-heading">
            <h2 id="target-flags-heading" className="mb-2 text-sm font-semibold text-primary">Flags</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* User flag */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-secondary">User flag</span>
                  {isUserPwned && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-callout-success-fg">
                      <Check className="h-3 w-3" aria-hidden="true" /> Pwned
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id={`target-user-flag-${machine.id}`}
                    name="target-user-flag"
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
                    placeholder="Enter user flag..."
                    className="h-9 min-w-0 flex-1 rounded-lg border border-subtle bg-surface-sunken px-3 font-mono tabular-nums text-xs text-primary transition-colors placeholder:text-muted focus:border-accent focus:outline-none sm:h-8"
                  />
                  <button aria-label={showUserFlag ? 'Hide user flag' : 'Reveal user flag'}
                    onClick={() => setShowUserFlag(!showUserFlag)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-subtle bg-surface-card text-muted transition-[transform,background-color,color] hover:text-primary active:scale-[0.97] sm:h-8 sm:w-8 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
                  >
                    {showUserFlag ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button aria-label="Copy user flag"
                    onClick={() => handleCopy(machine.userFlag || '', 'user')}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-subtle bg-surface-card text-muted transition-[transform,background-color,color] hover:text-primary active:scale-[0.97] sm:h-8 sm:w-8 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
                  >
                    {copiedUser ? <Check className="h-3.5 w-3.5 text-callout-success-fg" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Root flag */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-secondary">Root / system flag</span>
                  {isRootPwned && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-callout-success-fg">
                      <Check className="h-3 w-3" aria-hidden="true" /> Rooted
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id={`target-root-flag-${machine.id}`}
                    name="target-root-flag"
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
                    placeholder="Enter root flag..."
                    className="h-9 min-w-0 flex-1 rounded-lg border border-subtle bg-surface-sunken px-3 font-mono tabular-nums text-xs text-primary transition-colors placeholder:text-muted focus:border-accent focus:outline-none sm:h-8"
                  />
                  <button aria-label={showRootFlag ? 'Hide root flag' : 'Reveal root flag'}
                    onClick={() => setShowRootFlag(!showRootFlag)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-subtle bg-surface-card text-muted transition-[transform,background-color,color] hover:text-primary active:scale-[0.97] sm:h-8 sm:w-8 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
                  >
                    {showRootFlag ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button aria-label="Copy root flag"
                    onClick={() => handleCopy(machine.rootFlag || '', 'root')}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-subtle bg-surface-card text-muted transition-[transform,background-color,color] hover:text-primary active:scale-[0.97] sm:h-8 sm:w-8 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11"
                  >
                    {copiedRoot ? <Check className="h-3.5 w-3.5 text-callout-success-fg" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Discovered attack surface */}
          {machine.services && machine.services.length > 0 && (
            <section aria-labelledby="target-surface-heading">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 id="target-surface-heading" className="text-sm font-semibold text-primary">
                  Attack surface ({machine.services.length} ports)
                </h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('recon')}
                  className="text-xs font-medium text-callout-info-fg hover:underline"
                >
                  View full recon matrix &rarr;
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {machine.services.map((svc) => (
                  <span
                    key={`${svc.port}-${svc.protocol}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-subtle bg-surface-card px-2 py-1 text-xs"
                  >
                    <span className="font-mono tabular-nums font-medium text-primary">{svc.port}/{svc.protocol}</span>
                    <span className="text-secondary">{svc.service}</span>
                    {svc.version && <span className="text-[11px] text-muted">({svc.version})</span>}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Spoiler hint */}
          <section aria-labelledby="target-hint-heading">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 id="target-hint-heading" className="text-sm font-semibold text-primary">Hint</h2>
              <button
                onClick={() => setShowHint(!showHint)}
                className="text-xs font-medium text-callout-info-fg hover:underline"
              >
                {showHint ? 'Hide Hint' : 'Reveal Hint'}
              </button>
            </div>
            <div className={`rounded-lg border px-3 py-2.5 text-sm ${
              showHint ? 'border-callout-warn-border bg-callout-warn-bg text-primary' : 'select-none border-subtle text-transparent blur-[4px] filter'
            }`}>
              {machine.hint || 'No specific hints recorded for this target.'}
            </div>
          </section>

          {/* Tags */}
          <section aria-labelledby="target-tags-heading" className="space-y-2">
            <h2 id="target-tags-heading" className="text-sm font-semibold text-primary">Attack vectors & tags</h2>
            {machine.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {machine.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 rounded border border-subtle bg-surface-sunken px-2 py-0.5 text-xs text-secondary">
                    <span>{t}</span>
                    <button aria-label={`Remove tag ${t}`} onClick={() => handleRemoveTag(t)} className="text-muted transition-colors hover:text-callout-danger-fg">✕</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex max-w-sm items-center gap-2">
              <input
                id="target-detail-new-tag-input"
                name="target-detail-new-tag"
                aria-label="Add vector tag"
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add vector tag..."
                className="h-9 min-w-0 flex-1 rounded-lg border border-subtle bg-surface-sunken px-3 text-sm text-primary transition-colors placeholder:text-muted focus:border-accent focus:outline-none sm:h-8 sm:text-xs"
              />
              <CyberButton variant="secondary" size="md" onClick={handleAddTag} className="[@media(pointer:coarse)]:h-11">
                Add
              </CyberButton>
            </div>
          </section>

          {/* Field notes */}
          <section className="space-y-2" aria-labelledby="target-notes-heading">
            <h2 id="target-notes-heading" className="text-sm font-semibold text-primary">Field notes</h2>
            <textarea
              id="target-detail-field-notes"
              name="target-detail-field-notes"
              aria-label="Tactical field notes"
              rows={4}
              value={machine.quickNotes || ''}
              onChange={(e) => updateMachine(machine.id, { quickNotes: e.target.value })}
              placeholder="Record notes, credentials, and pivot paths..."
              className="w-full resize-none rounded-xl border border-subtle bg-surface-sunken p-3 text-sm text-primary transition-colors placeholder:text-muted focus:border-accent focus:outline-none"
            />
          </section>

        </div>
      )}
    </motion.div>
  );
};

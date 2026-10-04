import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Crosshair, 
  Flag, 
  ExternalLink, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  FileText, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  Star, 
  Tag, 
  ListChecks, 
  AlertCircle,
  Zap,
  X,
  Lock,
  Network
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

const TargetDetailTimerDisplay: React.FC<{ machineId: string; fallbackSeconds: number; isActiveTarget: boolean }> = React.memo(({ machineId, fallbackSeconds, isActiveTarget }) => {
  const activeTimerSeconds = useCtfStore((s) => (s.activeTargetId === machineId ? s.activeTimerSeconds : 0));
  return (
    <span className="text-sm font-bold text-slate-900 dark:text-white">
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
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 font-mono space-y-4">
        <div className="w-8 h-8 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-cyber-muted tracking-wider">HYDRATING TARGET CATALOG...</p>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 font-mono space-y-4">
        <AlertCircle className="w-12 h-12 text-callout-danger-fg animate-pulse" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">TARGET NOT FOUND</h2>
        <p className="text-xs text-cyber-muted max-w-md">
          The requested target ID <code className="text-callout-info-fg">{id}</code> could not be located in the local catalog.
        </p>
        <Link
          to="/tracker"
          className="px-4 py-2 rounded-lg bg-cyber-card border border-cyber-cyan text-callout-info-fg hover:bg-cyber-cyan hover:text-black font-bold text-xs transition-colors"
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

  const pipelineStages: { id: PipelineStatus; label: string; color: string }[] = [
    { id: 'backlog', label: 'Backlog', color: 'border-cyber-muted text-cyber-muted' },
    { id: 'recon', label: 'Recon In-Progress', color: 'border-cyber-cyan text-callout-info-fg' },
    { id: 'foothold', label: 'Foothold Obtained', color: 'border-cyber-amber text-cyber-amber' },
    { id: 'root', label: 'Root / System Pwned', color: 'border-cyber-crimson text-callout-danger-fg' },
    { id: 'completed', label: 'Completed & Logged', color: 'border-cyber-emerald text-cyber-emerald' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="max-w-6xl mx-auto space-y-4 font-mono text-xs pb-12"
    >
      {/* Page Header Bar */}
      <div className="p-3 rounded-[4px] border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 shadow-xs flex flex-wrap items-center justify-between gap-3 machined-edge">
        <div className="flex items-center gap-3">
          <button aria-label="Back to target list"
            onClick={() => navigate('/tracker')}
            className="p-1.5 rounded-[3px] bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-tertiary hover:text-zinc-900 dark:hover:text-primary hover:border-[#0ea5e9] active:scale-[0.97] transition-colors"
            title="Back to Target List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          {isFocusMode ? (
            <button
              onClick={() => navigate(`/target/${machine.id}`)}
              className="px-3 py-1.5 rounded-[3px] bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-500/40 text-callout-danger-fg hover:bg-rose-600 hover:text-white font-bold active:scale-[0.97] transition-colors flex items-center gap-2 shadow-xs"
              title="Exit Focus Mode"
            >
              <Eye className="w-4 h-4" />
              <span>EXIT FOCUS</span>
            </button>
          ) : (
            <button aria-label="Enter focus mode"
              onClick={() => navigate(`/target/${machine.id}/focus`)}
              className="p-2 rounded-[3px] bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-tertiary hover:text-accent hover:border-[#0ea5e9] active:scale-[0.97] transition-colors"
              title="Enter Focus Mode"
            >
              <Crosshair className="w-4 h-4" />
            </button>
          )}


          <div>
            <div className="flex items-center gap-2.5">
              <PlatformBadge platform={machine.platform} size="md" variant="hardware" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide font-mono">{machine.name}</h1>
              <OsBadge os={machine.os} size="sm" variant="hardware" />
              <DifficultyBadge difficulty={machine.difficulty} size="sm" variant="hardware" />
              {machine.isActive && (
                <span className="text-[11px] px-2 py-0.5 rounded-[3px] font-mono font-bold bg-amber-500/20 text-callout-warn-fg border border-amber-500/40 flex items-center gap-1 machined-edge">
                  <Lock className="w-3 h-3 text-callout-warn-fg" />
                  <span>ACTIVE LAB</span>
                </span>
              )}
            </div>
            <div className="text-xs text-cyber-muted mt-1 flex flex-wrap items-center gap-4">
              <EditableIpBadge machineId={machine.id} initialIp={machine.ip} size="sm" variant="hardware" showLabel />
              {Boolean(sanitizeExternalUrl(machine.roomUrl)) && (
                <a
                  href={sanitizeExternalUrl(machine.roomUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-callout-info-fg hover:underline"
                >
                  Official Room <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {machine.isActive ? (
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] text-[10px] font-mono font-bold bg-amber-950/40 text-callout-warn-fg border border-amber-500/40 machined-edge">
                  <Lock className="w-3 h-3 text-callout-warn-fg" />
                  <span>ACTIVE LAB · WRITEUPS PROHIBITED (HTB ToS)</span>
                </span>
              ) : Boolean(sanitizeExternalUrl(machine.writeupUrl)) ? (
                <a
                  href={sanitizeExternalUrl(machine.writeupUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-callout-tip-fg hover:underline"
                >
                  Writeup <ExternalLink className="w-3 h-3" />
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {/* Stopwatch & Action Buttons */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-cyber-card border border-slate-200 dark:border-cyber-border px-3 py-1.5 rounded-lg">
            <Clock className="w-4 h-4 text-callout-info-fg" />
            <TargetDetailTimerDisplay machineId={machine.id} fallbackSeconds={machine.timeSpentSeconds} isActiveTarget={isActiveTarget} />
            {isActiveTarget ? (
              <div className="flex items-center gap-1">
                {isTimerRunning ? (
                  <button aria-label="Pause timer" onClick={pauseTimer} className="p-1 text-callout-warn-fg hover:text-slate-900 dark:hover:text-primary active:scale-[0.98] transition-[transform,background-color,border-color,color]" title="Pause">
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button aria-label="Resume timer" onClick={startTimer} className="p-1 text-callout-success-fg hover:text-slate-900 dark:hover:text-primary active:scale-[0.98] transition-[transform,background-color,border-color,color]" title="Resume">
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setActiveTarget(null);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="p-1 text-tertiary hover:text-callout-danger-fg active:scale-[0.98] transition-[transform,background-color,border-color,color]"
                  title="Disengage Active Target"
                  aria-label="Disengage active target"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setActiveTarget(machine.id);
                  startTimer();
                }}
                className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-[10px] font-bold active:scale-[0.98] transition-[transform,background-color,border-color,color]"
              >
                Engage
              </button>
            )}
          </div>

          <button
            onClick={() => {
              setWriteupMachineId(machine.id);
              navigate('/writeup');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-cyber-card border border-cyber-cyan/40 text-callout-info-fg hover:bg-cyber-cyan hover:text-black font-semibold active:scale-[0.98] transition-[transform,background-color,border-color,color]"
          >
            <FileText className="w-4 h-4" /> Writeup Studio
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-cyber-border bg-cyber-bg px-3 rounded-t-xl">
        <button
          onClick={() => setActiveTab('checklist')}
          data-testid="tab-checklist"
          className={`flex items-center gap-1.5 py-2 px-3.5 font-bold text-xs border-b-2 transition-colors ${
            activeTab === 'checklist'
              ? 'border-cyber-cyan text-callout-info-fg bg-cyber-cyan/10'
              : 'border-transparent text-cyber-muted hover:text-cyber-text'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span>ATTACK METHODOLOGY & DYNAMIC CHECKLIST</span>
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          data-testid="tab-flags"
          className={`flex items-center gap-1.5 py-2 px-3.5 font-bold text-xs border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-cyber-emerald text-cyber-emerald bg-cyber-emerald/10'
              : 'border-transparent text-cyber-muted hover:text-cyber-text'
          }`}
        >
          <Crosshair className="w-4 h-4" />
          <span>FLAGS VAULT & INTEL OVERVIEW</span>
        </button>
        <button
          onClick={() => setActiveTab('recon')}
          data-testid="tab-recon"
          className={`flex items-center gap-1.5 py-2 px-3.5 font-bold text-xs border-b-2 transition-colors ${
            activeTab === 'recon'
              ? 'border-cyber-purple text-cyber-purple bg-cyber-purple/10'
              : 'border-transparent text-cyber-muted hover:text-cyber-text'
          }`}
        >
          <Network className="w-4 h-4 text-cyber-purple" />
          <span>RECON & ATTACK SURFACE</span>
          {machine.services && machine.services.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-purple-500/20 text-callout-tip-fg border border-purple-500/40">
              {machine.services.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('commands')}
          data-testid="tab-commands"
          className={`flex items-center gap-1.5 py-2 px-3.5 font-bold text-xs border-b-2 transition-colors ${
            activeTab === 'commands'
              ? 'border-cyber-amber text-cyber-amber bg-cyber-amber/10'
              : 'border-transparent text-cyber-muted hover:text-cyber-text'
          }`}
        >
          <Zap className="w-4 h-4 text-cyber-amber" />
          <span>⚡ ATTACK ARSENAL</span>
        </button>
      </div>

      {/* Main Tab Stage */}
      {activeTab === 'checklist' ? (
        <ChecklistWorkspace 
          machine={machine} 
          onOpenInWriteup={() => {
            setWriteupMachineId(machine.id);
            navigate('/writeup');
          }} 
        />
      ) : activeTab === 'commands' ? (
        <div className="p-3.5 sm:p-4 rounded-b-xl border border-t-0 border-cyber-border bg-cyber-card shadow-xs">
          <QuickCommandsTab machine={machine} />
        </div>
      ) : activeTab === 'recon' ? (
        <div className="p-3.5 sm:p-4 rounded-b-xl border border-t-0 border-cyber-border bg-cyber-card shadow-xs">
          <TargetReconDropzone
            machine={machine}
            onUpdateMachine={updateMachine}
            soundEnabled={soundEnabled}
          />
        </div>
      ) : (
        <div className="p-3.5 sm:p-4 rounded-b-xl border border-t-0 border-cyber-border bg-cyber-card shadow-xs space-y-4">
          
          {/* Section 1: Pipeline Stage Selector */}
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-cyber-muted mb-2 flex items-center gap-1.5 font-mono">
              <Crosshair className="w-3.5 h-3.5 text-cyber-emerald" /> ATTACK LIFECYCLE PIPELINE
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {pipelineStages.map((stage) => {
                const isSelected = machine.status === stage.id;
                return (
                  <button
                    key={stage.id}
                    onClick={() => handleStatusChange(stage.id)}
                    className={`p-2.5 rounded-lg border text-center font-mono text-xs font-semibold active:scale-[0.98] transition-[transform,background-color,border-color,color] ${
                      isSelected
                        ? `bg-slate-100 dark:bg-cyber-card border-2 ${stage.color} shadow-xs`
                        : 'bg-slate-50 dark:bg-cyber-bg/60 border-slate-200 dark:border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-primary hover:border-slate-300 dark:hover:border-cyber-borderGlow'
                    }`}
                  >
                    {stage.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Flags Vault */}
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-cyber-muted mb-2 flex items-center gap-1.5 font-mono">
              <Flag className="w-3.5 h-3.5 text-callout-danger-fg" /> FLAGS VAULT
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* User Flag */}
              <div className="p-2.5 rounded-xl bg-cyber-bg border border-cyber-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-callout-info-fg font-mono text-xs flex items-center gap-1">
                    <Flag className="w-3 h-3" /> USER FLAG
                  </span>
                  {isUserPwned && (
                    <span className="text-[10px] font-mono text-cyber-emerald flex items-center gap-1">
                      <Check className="w-3 h-3" /> PWNED
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
                    className="flex-1 bg-cyber-card px-3 py-1.5 rounded-lg border border-cyber-border text-cyber-text text-xs font-mono focus:outline-none focus:border-cyber-cyan transition-colors"
                  />
                  <button aria-label={showUserFlag ? 'Hide user flag' : 'Reveal user flag'}
                    onClick={() => setShowUserFlag(!showUserFlag)}
                    className="p-1.5 rounded-md bg-cyber-card border border-cyber-border text-cyber-muted hover:text-cyber-text active:scale-[0.98] transition-[transform,background-color,border-color,color]"
                  >
                    {showUserFlag ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button aria-label="Copy user flag"
                    onClick={() => handleCopy(machine.userFlag || '', 'user')}
                    className="p-1.5 rounded-md bg-cyber-card border border-cyber-border text-cyber-muted hover:text-callout-info-fg active:scale-[0.98] transition-[transform,background-color,border-color,color]"
                  >
                    {copiedUser ? <Check className="w-3.5 h-3.5 text-cyber-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Root Flag */}
              <div className="p-2.5 rounded-xl bg-cyber-bg border border-cyber-border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyber-emerald font-mono text-xs flex items-center gap-1">
                    <Flag className="w-3 h-3" /> ROOT / SYSTEM FLAG
                  </span>
                  {isRootPwned && (
                    <span className="text-[10px] font-mono text-cyber-emerald flex items-center gap-1">
                      <Check className="w-3 h-3" /> ROOTED
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
                    className="flex-1 bg-cyber-card px-3 py-1.5 rounded-lg border border-cyber-border text-cyber-text text-xs font-mono focus:outline-none focus:border-cyber-emerald transition-colors"
                  />
                  <button aria-label={showRootFlag ? 'Hide root flag' : 'Reveal root flag'}
                    onClick={() => setShowRootFlag(!showRootFlag)}
                    className="p-1.5 rounded-md bg-cyber-card border border-cyber-border text-cyber-muted hover:text-cyber-text active:scale-[0.98] transition-[transform,background-color,border-color,color]"
                  >
                    {showRootFlag ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button aria-label="Copy root flag"
                    onClick={() => handleCopy(machine.rootFlag || '', 'root')}
                    className="p-1.5 rounded-md bg-cyber-card border border-cyber-border text-cyber-muted hover:text-cyber-emerald active:scale-[0.98] transition-[transform,background-color,border-color,color]"
                  >
                    {copiedRoot ? <Check className="w-3.5 h-3.5 text-cyber-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2.5: Discovered Open Ports & Attack Surface Summary */}
          {machine.services && machine.services.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-cyber-card border border-slate-200 dark:border-cyber-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-cyber-muted flex items-center gap-1.5 font-mono">
                  <Network className="w-3.5 h-3.5 text-callout-tip-fg" /> DISCOVERED ATTACK SURFACE ({machine.services.length} PORTS)
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('recon')}
                  className="text-[11px] text-callout-tip-fg hover:underline flex items-center gap-1 font-mono font-semibold"
                >
                  View Full Recon Matrix &rarr;
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {machine.services.map((svc) => (
                  <span
                    key={`${svc.port}-${svc.protocol}`}
                    className="px-2 py-1 rounded-md bg-white dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border text-[11px] font-mono flex items-center gap-1.5"
                  >
                    <span className="text-callout-info-fg font-bold">{svc.port}/{svc.protocol}</span>
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">{svc.service}</span>
                    {svc.version && <span className="text-cyber-muted text-[10px]">({svc.version})</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Spoiler Hint */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-cyber-card border border-slate-200 dark:border-cyber-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-cyber-muted flex items-center gap-1 font-mono">
                <AlertCircle className="w-3 h-3 text-callout-warn-fg" /> INTEL HINT
              </span>
              <button
                onClick={() => setShowHint(!showHint)}
                className="text-[10px] font-mono text-callout-warn-fg hover:underline"
              >
                {showHint ? 'Hide Hint' : 'Reveal Hint'}
              </button>
            </div>
            <div className={`p-2.5 rounded-lg border text-xs font-mono ${
              showHint ? 'bg-amber-500/10 border-amber-500/30 text-slate-900 dark:text-white' : 'filter blur-[4px] select-none text-transparent border-slate-200 dark:border-cyber-border'
            }`}>
              {machine.hint || 'No specific hints recorded for this target.'}
            </div>
          </div>

          {/* Section 4: Tags & Tactical Field Notes */}
          <div className="space-y-3">
            <div className="text-[10px] uppercase font-bold text-cyber-muted flex items-center gap-1.5 font-mono">
              <Tag className="w-3.5 h-3.5 text-callout-tip-fg" /> ATTACK VECTORS & TAGS
            </div>
            <div className="flex flex-wrap gap-1.5">
              {machine.tags.map((t) => (
                <span key={t} className="px-2 py-1 rounded-md bg-slate-50 dark:bg-cyber-bg border border-slate-200 dark:border-cyber-border text-callout-info-fg text-xs font-mono flex items-center gap-1">
                  <span>{t}</span>
                  <button aria-label={`Remove tag ${t}`} onClick={() => handleRemoveTag(t)} className="text-cyber-muted hover:text-callout-danger-fg">✕</button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 max-w-sm">
              <input
                id="target-detail-new-tag-input"
                name="target-detail-new-tag"
                aria-label="Add vector tag"
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Add vector tag..."
                className="flex-1 bg-white dark:bg-cyber-bg px-3 py-1.5 rounded-lg border border-slate-200 dark:border-cyber-border text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                onClick={handleAddTag}
                className="px-3.5 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/50 text-callout-tip-fg hover:bg-purple-500 hover:text-slate-950 font-mono text-xs font-semibold active:scale-[0.98] transition-[transform,background-color,border-color,color]"
              >
                Add
              </button>
            </div>
          </div>

          {/* Section 5: Field Notes */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-cyber-muted font-mono">
              TACTICAL FIELD NOTES
            </div>
            <textarea
              id="target-detail-field-notes"
              name="target-detail-field-notes"
              aria-label="Tactical field notes"
              rows={4}
              value={machine.quickNotes || ''}
              onChange={(e) => updateMachine(machine.id, { quickNotes: e.target.value })}
              placeholder="Record notes, credentials, and pivot paths..."
              className="w-full bg-slate-50 dark:bg-cyber-bg p-3 rounded-xl border border-slate-200 dark:border-cyber-border text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-cyber-emerald resize-none shadow-xs transition-colors"
            />
          </div>

        </div>
      )}
    </motion.div>
  );
};

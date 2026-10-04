import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, 
  Flag, 
  Clock, 
  Eye, 
  EyeOff, 
  FileText, 
  ExternalLink,
  ListChecks,
  Maximize2,
  Lock,
  Upload,
  Zap,
  AlertTriangle,
  Radio
} from 'lucide-react';
import { Machine } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { applyScanTextToMachine } from '../../utils/scanCardHelper';
import { useShallow } from 'zustand/react/shallow';
import { formatDurationHuman, playCyberSound, triggerRootCelebration, sanitizeExternalUrl } from '../../utils/helpers';
import { TACTICAL_SPRING, CASCADE_STAGGER_DELAY } from '../../utils/motionTokens';
import { PlatformBadge } from '../common/PlatformBadge';
import { OsBadge } from '../common/OsBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { DifficultyBadge } from '../common/DifficultyBadge';
import { StatusBadge } from '../common/StatusBadge';
import { ShareLinkButton } from '../common/ShareLinkButton';

interface GridCardProps {
  machine: Machine;
  isActiveTarget: boolean;
  isHintRevealed: boolean;
  onToggleHint: (e: React.MouseEvent, machineId: string) => void;
  onSelectMachine: (id: string) => void;
  onToggleUserFlag: (id: string) => void;
  onToggleRootFlag: (id: string, hasRoot: boolean) => void;
  onEngageTarget: (id: string) => void;
  onOpenReport: (id: string) => void;
  onOpenWriteup: (id: string) => void;
  onOpenDetail: (id: string) => void;
}

const GridCard = React.memo<GridCardProps>(({
  machine: m,
  isActiveTarget,
  isHintRevealed,
  onToggleHint,
  onSelectMachine,
  onToggleUserFlag,
  onToggleRootFlag,
  onEngageTarget,
  onOpenReport,
  onOpenWriteup,
  onOpenDetail,
}) => {
  const hasUser = Boolean(m.userPwnedAt || m.userFlag);
  const hasRoot = Boolean(m.rootPwnedAt || m.rootFlag);
  const updateMachine = useCtfStore((s) => s.updateMachine);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const [isDragOver, setIsDragOver] = useState(false);
  const [scanToast, setScanToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) {
        setScanToast({ message: 'Scan file was empty', isError: true });
        setTimeout(() => setScanToast(null), 2500);
        return;
      }
      const res = applyScanTextToMachine(m, content);
      if (res) {
        updateMachine(m.id, res.updatedMachine);
        if (soundEnabled) playCyberSound('engage');
        setScanToast({ message: `Ingested ${res.parsedCount} ports [${res.format.toUpperCase()}]` });
      } else {
        setScanToast({ message: 'No open ports detected in scan', isError: true });
      }
      setTimeout(() => setScanToast(null), 3000);
    };
    reader.readAsText(file);
  };

  return (
    <div
      onClick={() => onSelectMachine(m.id)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group cyber-card-contain rounded-xl border p-3.5 bg-surface-card hover:bg-surface-hover cursor-pointer flex flex-col justify-between relative overflow-hidden transition-all duration-150 surface-card-depth machined-edge active:scale-[0.97] ${
        isActiveTarget
          ? 'border-accent ring-1 ring-accent/40 shadow-xs bg-accent/[0.03]'
          : 'border-subtle hover:border-strong'
      }`}
    >
      {/* Drag Over Visual HUD Overlay (Concentric Rounded-xl) */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 bg-surface-base/95 border-2 border-dashed border-accent rounded-xl flex flex-col items-center justify-center p-4 text-center font-mono animate-pulse pointer-events-none">
          <Upload className="w-8 h-8 text-accent mb-2 animate-bounce" />
          <span className="text-xs font-bold text-accent uppercase tracking-wider font-mono">
            DROP SCAN FILE TO INGEST
          </span>
          <span className="text-[10px] text-muted font-mono mt-0.5">
            .nmap, .gnmap, XML, or raw output
          </span>
        </div>
      )}

      {/* Scan Intake Confirmation Toast */}
      <AnimatePresence>
        {scanToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`absolute top-2 inset-x-2 z-20 px-2.5 py-1.5 rounded-[3px] text-[11px] font-mono font-bold flex items-center justify-between shadow-md ${
              scanToast.isError
                ? 'bg-rose-950/95 border border-rose-500 text-rose-300'
                : 'bg-zinc-900 border border-emerald-500 text-emerald-400'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              {scanToast.isError ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> : <Zap className="w-3.5 h-3.5 shrink-0" />}
              {scanToast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        {/* De-Cluttered Header: Max 2 Primary Badges (Difficulty + OS) */}
        <div className="flex items-center justify-between gap-1.5 mb-2.5">
          <div className="flex items-center gap-1.5">
            <OsBadge os={m.os} size="xs" variant="hardware" />
          </div>
          <DifficultyBadge difficulty={m.difficulty} size="xs" variant="hardware" />
        </div>

        {/* Machine Name & IP */}
        <div className="mb-3">
          <div className="text-base font-semibold font-sans text-primary group-hover:text-accent transition-colors flex items-center justify-between">
            <span className="tracking-tight flex items-center gap-1.5 truncate">
              <span className="truncate">{m.name}</span>
              {m.isActive && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-[2px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                  ACTIVE
                </span>
              )}
            </span>
            {isActiveTarget && (
              <span className="text-[10px] text-accent font-mono flex items-center gap-1 font-semibold flex-shrink-0">
                <Crosshair className="w-3 h-3 animate-spin-slow text-accent" /> [ ENGAGED ]
              </span>
            )}
          </div>
          <EditableIpBadge machineId={m.id} initialIp={m.ip} size="xs" variant="hardware" className="mt-0.5 tabular-nums font-mono text-[11px]" />
        </div>

        {/* Calm Status Indicator (Subtle LED Dot + Label) & Tabular Time */}
        <div className="flex items-center justify-between gap-2 p-2 px-2.5 rounded-md bg-surface-sunken/60 border border-subtle text-xs mb-2.5 machined-edge">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                m.status === 'root' || m.status === 'completed'
                  ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                  : m.status === 'foothold'
                  ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                  : m.status === 'recon'
                  ? 'bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.4)]'
                  : 'bg-zinc-400 dark:bg-zinc-600'
              }`}
            />
            <span className="text-[10px] font-sans font-medium uppercase tracking-wider text-secondary">
              {m.status === 'root' ? 'ROOT PWNED' : m.status.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-1 text-muted text-xs font-mono tabular-nums">
            <Clock className="w-3 h-3 text-muted shrink-0" />
            <span>{formatDurationHuman(m.timeSpentSeconds)}</span>
          </div>
        </div>

        {/* Hint Spoiler Peek / Active ToS Guard */}
        {m.isActive ? (
          <div className="mb-3 px-2.5 py-1.5 rounded-[2px] border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-mono flex items-center gap-1.5 machined-edge">
            <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span>Active Lab · Writeups Prohibited (HTB ToS)</span>
          </div>
        ) : m.hint ? (
          <div className="mb-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted uppercase font-semibold font-mono">Intel Hint</span>
              <button
                type="button"
                onClick={(e) => onToggleHint(e, m.id)}
                className="text-[10px] font-mono text-muted hover:text-primary flex items-center gap-1 transition-colors cursor-pointer active:scale-[0.97]"
                title={isHintRevealed ? 'Hide Intel Hint' : 'Peek Intel Hint'}
                aria-label={isHintRevealed ? `Hide intel hint for ${m.name}` : `Peek intel hint for ${m.name}`}
              >
                {isHintRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {isHintRevealed ? 'Hide' : 'Peek'}
              </button>
            </div>
            <AnimatePresence initial={false}>
              <motion.div 
                layout
                className={`rounded-[2px] border text-[11px] font-mono leading-relaxed transition-colors duration-200 machined-edge ${
                  isHintRevealed
                    ? 'p-2.5 bg-surface-sunken border-subtle text-primary max-h-48 overflow-y-auto'
                    : 'p-2 px-2.5 bg-surface-sunken/60 border-subtle text-muted select-none flex items-center justify-center cursor-pointer hover:border-strong hover:text-primary'
                }`}
                onClick={(e) => {
                  if (!isHintRevealed) onToggleHint(e, m.id);
                }}
              >
                {isHintRevealed ? (
                  m.hint
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] font-mono tracking-wide">
                    <Eye className="w-3 h-3 text-muted" />
                    <span>Click to reveal tactical hint spoiler</span>
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : null}

        {/* Open Ports Strip with Concentric Radii (rounded-[2px]) and Tabular Numerals */}
        {m.openPorts && m.openPorts.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-2.5">
            <span className="text-[9px] font-mono text-muted flex items-center gap-1">
              <Radio className="w-2.5 h-2.5 text-accent" /> Ports:
            </span>
            {m.openPorts.slice(0, 4).map((port) => (
              <span
                key={port}
                className="text-[9px] px-1.5 py-0.5 rounded-[2px] font-mono font-bold tabular-nums bg-surface-sunken border border-subtle text-secondary"
              >
                {port}
              </span>
            ))}
            {m.openPorts.length > 4 && (
              <span className="text-[9px] text-muted font-mono tabular-nums">+{m.openPorts.length - 4}</span>
            )}
          </div>
        )}

        {/* Streamlined Tags (monochromatic presentation) */}
        {m.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {m.tags.slice(0, 2).map((t) => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-[2px] bg-surface-sunken border border-subtle text-secondary font-mono uppercase tracking-wider font-medium">
                {t}
              </span>
            ))}
            {m.tags.length > 2 && (
              <span className="text-[9px] text-muted self-center tabular-nums">+{m.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer Actions with active:scale-[0.97] */}
      <div className="pt-2.5 border-t border-subtle flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleUserFlag(m.id)}
            className={`px-2 py-0.5 rounded-xs text-[10px] border font-mono font-bold flex items-center gap-1 transition-colors duration-150 active:scale-[0.97] cursor-pointer tabular-nums ${
              hasUser
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-600 dark:text-amber-400 shadow-xs'
                : 'bg-surface-sunken border-subtle text-muted hover:text-primary'
            }`}
            title="Toggle User Flag"
            aria-label={hasUser ? `Toggle user flag for ${m.name} (currently captured)` : `Toggle user flag for ${m.name} (currently pending)`}
          >
            <Flag className="w-2.5 h-2.5" /> U
          </button>
          <button
            type="button"
            onClick={() => onToggleRootFlag(m.id, hasRoot)}
            className={`px-2 py-0.5 rounded-xs text-[10px] border font-mono font-bold flex items-center gap-1 transition-colors duration-150 active:scale-[0.97] cursor-pointer tabular-nums ${
              hasRoot
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'bg-surface-sunken border-subtle text-muted hover:text-primary'
            }`}
            title="Toggle Root Flag"
            aria-label={hasRoot ? `Toggle root flag for ${m.name} (currently captured)` : `Toggle root flag for ${m.name} (currently pending)`}
          >
            <Flag className="w-2.5 h-2.5" /> R
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEngageTarget(m.id)}
            className={`p-1.5 rounded-xs border transition-colors duration-150 active:scale-[0.97] cursor-pointer ${
              isActiveTarget
                ? 'bg-accent/10 text-accent border-accent/50 shadow-xs'
                : 'bg-surface-card border-subtle text-muted hover:text-primary hover:border-accent'
            }`}
            title="Engage Active Target"
            aria-label={isActiveTarget ? `Currently engaged target: ${m.name}` : `Engage target ${m.name} and start timer`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onSelectMachine(m.id)}
            className="p-1.5 rounded-xs bg-surface-card border border-subtle text-muted hover:text-primary hover:border-accent transition-colors duration-150 active:scale-[0.97] cursor-pointer"
            title="Attack Methodology Checklist"
            aria-label={`Open attack methodology checklist for ${m.name}`}
          >
            <ListChecks className="w-3.5 h-3.5" />
          </button>

          <ShareLinkButton
            path={`/target/${m.id}`}
            title={m.name}
            iconOnly
            className="p-1.5 rounded-xs bg-surface-card border border-subtle text-muted hover:text-accent transition-colors active:scale-[0.97] cursor-pointer"
          />

          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenDetail(m.id);
            }}
            className="p-1.5 rounded-xs bg-surface-card border border-subtle text-muted hover:text-primary hover:border-accent transition-colors duration-150 active:scale-[0.97] cursor-pointer"
            title="Open Dedicated Full-Page Mission"
            aria-label={`Open dedicated mission dossier for ${m.name}`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenReport(m.id);
            }}
            className="p-1.5 rounded-xs bg-surface-card border border-subtle text-muted hover:text-accent hover:border-accent transition-colors duration-150 active:scale-[0.97] cursor-pointer"
            title="Open Executive Pentest Pre-Report"
            aria-label={`Open executive pentest pre-report for ${m.name}`}
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenWriteup(m.id);
            }}
            className="p-1.5 rounded-xs bg-surface-card border border-subtle text-muted hover:text-accent hover:border-accent transition-colors duration-150 active:scale-[0.97] cursor-pointer"
            title="Open Writeup"
            aria-label={`Open writeup studio for ${m.name}`}
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {Boolean(sanitizeExternalUrl(m.roomUrl)) && (
            <a
              href={sanitizeExternalUrl(m.roomUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-xs bg-surface-card border border-subtle text-muted hover:text-primary transition-colors duration-150 active:scale-[0.97] cursor-pointer"
              title="Open Room Link"
              aria-label={`Open external room link for ${m.name}`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
});

interface GridViewProps {
  filteredMachines: Machine[];
}

export const GridView: React.FC<GridViewProps> = ({ filteredMachines }) => {
  const navigate = useNavigate();
  const {
    setSelectedMachineId,
    activeTargetId,
    setActiveTarget,
    startTimer,
    setWriteupMachineId,
    setActiveTab,
    soundEnabled,
    toggleUserFlag,
    toggleRootFlag,
    setReportMachineId,
  } = useCtfStore(
    useShallow((s) => ({
      setSelectedMachineId: s.setSelectedMachineId,
      activeTargetId: s.activeTargetId,
      setActiveTarget: s.setActiveTarget,
      startTimer: s.startTimer,
      setWriteupMachineId: s.setWriteupMachineId,
      setActiveTab: s.setActiveTab,
      soundEnabled: s.soundEnabled,
      toggleUserFlag: s.toggleUserFlag,
      toggleRootFlag: s.toggleRootFlag,
      setReportMachineId: s.setReportMachineId,
    }))
  );

  const [revealedHints, setRevealedHints] = useState<Record<string, boolean>>({});
  const [visibleCount, setVisibleCount] = useState(32);

  // Reset or adjust visibleCount when filters change
  React.useEffect(() => {
    setVisibleCount(32);
  }, [filteredMachines.length]);

  const visibleMachines = React.useMemo(() => {
    return filteredMachines.slice(0, visibleCount);
  }, [filteredMachines, visibleCount]);

  const toggleHint = useCallback((e: React.MouseEvent, machineId: string) => {
    e.stopPropagation();
    setRevealedHints((prev) => ({ ...prev, [machineId]: !prev[machineId] }));
    if (soundEnabled) playCyberSound('click');
  }, [soundEnabled]);

  const handleToggleRootFlag = useCallback((id: string, hasRoot: boolean) => {
    toggleRootFlag(id);
    if (!hasRoot) triggerRootCelebration();
  }, [toggleRootFlag]);

  const handleEngageTarget = useCallback((id: string) => {
    setActiveTarget(id);
    startTimer();
    if (soundEnabled) playCyberSound('timer');
  }, [setActiveTarget, startTimer, soundEnabled]);

  const handleOpenReport = useCallback((id: string) => {
    setReportMachineId(id);
  }, [setReportMachineId]);

  const handleOpenWriteup = useCallback((id: string) => {
    setWriteupMachineId(id);
    setActiveTab('writeup');
    navigate(`/writeup/${id}`);
  }, [setWriteupMachineId, setActiveTab, navigate]);

  const handleOpenDetail = useCallback((id: string) => {
    navigate(`/target/${id}`);
  }, [navigate]);

  return (
    <div className="space-y-6 font-sans pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleMachines.map((m, idx) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              ...TACTICAL_SPRING,
              delay: CASCADE_STAGGER_DELAY(idx),
            }}
          >
            <GridCard
              machine={m}
              isActiveTarget={activeTargetId === m.id}
              isHintRevealed={Boolean(revealedHints[m.id])}
              onToggleHint={toggleHint}
              onSelectMachine={setSelectedMachineId}
              onToggleUserFlag={toggleUserFlag}
              onToggleRootFlag={handleToggleRootFlag}
              onEngageTarget={handleEngageTarget}
              onOpenReport={handleOpenReport}
              onOpenWriteup={handleOpenWriteup}
              onOpenDetail={handleOpenDetail}
            />
          </motion.div>
        ))}
      </div>

      {filteredMachines.length > visibleCount && (
        <div className="flex flex-col items-center justify-center pt-4 pb-8">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 32)}
            className="px-6 py-2.5 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle text-secondary hover:text-primary font-bold text-xs uppercase tracking-wider transition-colors active:scale-[0.97] surface-card-depth machined-edge shadow-none font-mono cursor-pointer"
          >
            [ LOAD MORE TARGETS (+32) — {visibleCount} OF {filteredMachines.length} ]
          </button>
        </div>
      )}
    </div>
  );
};

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
import { PlatformBadge } from '../common/PlatformBadge';
import { OsBadge } from '../common/OsBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { DifficultyBadge } from '../common/DifficultyBadge';
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
      className={`group cyber-card-contain rounded-xl border p-4 bg-cyber-card hover:bg-cyber-cardHover cursor-pointer shadow-md flex flex-col justify-between relative overflow-hidden transition-[transform,box-shadow,border-color,background-color] duration-150 ease-out hover:-translate-y-1 hover:shadow-lg active:scale-[0.99] hover:will-change-transform ${
        isActiveTarget
          ? 'border-cyber-emerald shadow-glow-emerald/30 ring-1 ring-cyber-emerald/40'
          : 'border-cyber-border hover:border-cyber-cyan/50 hover:shadow-glow-cyan/20'
      }`}
    >
      {/* Drag Over Visual HUD Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-30 bg-slate-950/90 border-2 border-dashed border-cyber-cyan rounded-xl flex flex-col items-center justify-center p-4 text-center backdrop-blur-sm animate-pulse pointer-events-none">
          <Upload className="w-8 h-8 text-cyber-cyan mb-2 animate-bounce" />
          <span className="text-xs font-bold text-cyber-cyan uppercase tracking-wider font-mono">
            DROP SCAN FILE TO INGEST
          </span>
          <span className="text-[10px] text-cyber-muted font-mono mt-0.5">
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
            className={`absolute top-2 inset-x-2 z-20 px-2.5 py-1.5 rounded text-[11px] font-mono font-bold flex items-center justify-between shadow-lg ${
              scanToast.isError
                ? 'bg-rose-950/95 border border-rose-500 text-rose-300'
                : 'bg-cyber-card/95 border border-cyber-emerald text-cyber-emerald'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              {scanToast.isError ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> : <Zap className="w-3.5 h-3.5 shrink-0" />}
              {scanToast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient edge glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyber-cyan/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div>
        {/* Header: Platform, OS, Difficulty */}
        <div className="flex items-center justify-between gap-1.5 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <PlatformBadge platform={m.platform} size="sm" />
            <OsBadge os={m.os} size="xs" />
            <CategoryBadge machine={m} size="xs" />
          </div>

          <DifficultyBadge difficulty={m.difficulty} size="sm" />
        </div>

        {/* Machine Name & IP */}
        <div className="mb-3">
          <div className="text-base font-bold text-slate-900 dark:text-white group-hover:text-cyber-cyan transition-colors flex items-center justify-between">
            <span className="tracking-wide flex items-center gap-1.5">
              <span>{m.name}</span>
              {m.isActive && (
                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40">
                  ACTIVE
                </span>
              )}
            </span>
            {isActiveTarget && (
              <span className="text-[10px] text-cyber-emerald flex items-center gap-1 font-semibold">
                <Crosshair className="w-3 h-3 animate-spin-slow" /> ENGAGED
              </span>
            )}
          </div>
          <EditableIpBadge machineId={m.id} initialIp={m.ip} size="xs" className="mt-0.5" />
        </div>

        {/* Certifications */}
        {m.certifications.length > 0 && (
          <div className="flex items-center gap-1 mb-2.5">
            {m.certifications.map((c) => (
              <span
                key={c}
                className="text-[9px] px-1.5 py-0.2 rounded bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-purple font-bold"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Status and Time Pill */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-cyber-bg border border-cyber-border/70 text-xs mb-3">
          <div>
            <span className="text-[10px] text-cyber-muted uppercase block">Status</span>
            <span className={`font-bold uppercase text-[11px] ${
              m.status === 'root' || m.status === 'completed' ? 'text-cyber-emerald' :
              m.status === 'foothold' ? 'text-cyber-amber' :
              m.status === 'recon' ? 'text-cyber-cyan' : 'text-cyber-muted'
            }`}>
              {m.status}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-cyber-muted uppercase block">Tracked</span>
            <span className="text-slate-900 dark:text-white font-mono flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyber-muted" />
              {formatDurationHuman(m.timeSpentSeconds)}
            </span>
          </div>
        </div>

        {/* Hint Spoiler Peek / Active ToS Guard */}
        {m.isActive ? (
          <div className="mb-3 px-2.5 py-1.5 rounded border border-amber-500/30 bg-amber-950/20 text-amber-300 text-[10px] font-mono flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span>Active Lab · Writeups Prohibited (HTB ToS)</span>
          </div>
        ) : m.hint ? (
          <div className="mb-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-amber-700 dark:text-cyber-amber uppercase font-semibold">Intel Hint</span>
              <button
                type="button"
                onClick={(e) => onToggleHint(e, m.id)}
                className="text-[10px] text-slate-600 dark:text-cyber-muted hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors"
              >
                {isHintRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {isHintRevealed ? 'Hide' : 'Peek'}
              </button>
            </div>
            <AnimatePresence initial={false}>
              <motion.div 
                layout
                className={`rounded border text-[11px] font-mono leading-relaxed transition-all duration-200 ${
                  isHintRevealed
                    ? 'p-2 bg-amber-50 border-amber-200 text-slate-800 dark:bg-cyber-amber/10 dark:border-cyber-amber/40 dark:text-cyber-text max-h-48 overflow-y-auto'
                    : 'p-1.5 px-2 bg-cyber-bg/60 border-cyber-border/60 text-slate-600 dark:text-cyber-muted/60 select-none flex items-center justify-center cursor-pointer hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-cyber-amber'
                }`}
                onClick={(e) => {
                  if (!isHintRevealed) onToggleHint(e, m.id);
                }}
              >
                {isHintRevealed ? (
                  m.hint
                ) : (
                  <span className="flex items-center gap-1.5 text-[10px] font-sans font-medium tracking-wide">
                    <Eye className="w-3 h-3 text-amber-600 dark:text-cyber-amber/70" />
                    <span>Click to reveal tactical hint spoiler</span>
                  </span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : null}

        {/* Open Ports Strip */}
        {m.openPorts && m.openPorts.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-2.5">
            <span className="text-[9px] font-mono text-cyber-muted flex items-center gap-0.5">
              <Radio className="w-2.5 h-2.5 text-cyber-cyan" /> Ports:
            </span>
            {m.openPorts.slice(0, 5).map((port) => (
              <span
                key={port}
                className="text-[9px] px-1 py-0.2 rounded font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-cyber-cyan/30 text-slate-800 dark:text-cyber-cyan"
              >
                {port}
              </span>
            ))}
            {m.openPorts.length > 5 && (
              <span className="text-[9px] text-cyber-muted font-mono">+{m.openPorts.length - 5}</span>
            )}
          </div>
        )}

        {/* Tags snippet */}
        {m.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {m.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-50 border border-cyan-200 text-cyan-900 dark:bg-cyber-bg dark:border-cyber-border dark:text-cyber-cyan font-mono">
                {t}
              </span>
            ))}
            {m.tags.length > 3 && (
              <span className="text-[9px] text-cyber-muted self-center">+{m.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Card Footer Actions */}
      <div className="pt-2.5 border-t border-cyber-border/70 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleUserFlag(m.id)}
            className={`px-2 py-1 rounded text-xs border font-bold flex items-center gap-1 transition-[transform,colors] duration-150 hover:scale-105 active:scale-95 ${
              hasUser
                ? 'bg-cyan-100 border-cyan-400 text-cyan-900 dark:bg-cyber-cyan/10 dark:border-cyber-cyan/50 dark:text-cyber-cyan dark:shadow-glow-cyan/20'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-950 dark:bg-cyber-bg dark:border-cyber-border dark:text-cyber-muted dark:hover:text-white'
            }`}
            title="Toggle User Flag"
          >
            <Flag className="w-3 h-3" /> User
          </button>
          <button
            type="button"
            onClick={() => onToggleRootFlag(m.id, hasRoot)}
            className={`px-2 py-1 rounded text-xs border font-bold flex items-center gap-1 transition-[transform,colors] duration-150 hover:scale-105 active:scale-95 ${
              hasRoot
                ? 'bg-emerald-100 border-emerald-400 text-emerald-900 dark:bg-cyber-emerald/10 dark:border-cyber-emerald/50 dark:text-cyber-emerald dark:shadow-glow-emerald/20'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-950 dark:bg-cyber-bg dark:border-cyber-border dark:text-cyber-muted dark:hover:text-white'
            }`}
            title="Toggle Root Flag"
          >
            <Flag className="w-3 h-3" /> Root
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEngageTarget(m.id)}
            className={`p-1.5 rounded border transition-[transform,colors,box-shadow] duration-150 hover:scale-110 active:scale-95 ${
              isActiveTarget
                ? 'bg-emerald-100 text-emerald-900 border-emerald-400 dark:bg-cyber-emerald/20 dark:text-cyber-emerald dark:border-cyber-emerald shadow-glow-emerald/30'
                : 'bg-cyber-bg border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white hover:border-cyber-emerald'
            }`}
            title="Engage Active Target"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onSelectMachine(m.id)}
            className="p-1.5 rounded bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-cyan-700 dark:hover:text-cyber-cyan hover:border-cyber-cyan transition-[transform,colors] duration-150 hover:scale-110 active:scale-95"
            title="Attack Methodology Checklist"
          >
            <ListChecks className="w-3.5 h-3.5" />
          </button>

          <ShareLinkButton
            path={`/target/${m.id}`}
            title={m.name}
            iconOnly
            className="p-1.5"
          />

          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenDetail(m.id);
            }}
            className="p-1.5 rounded bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-cyan-700 dark:hover:text-cyber-cyan hover:border-cyber-cyan transition-[transform,colors] duration-150 hover:scale-110 active:scale-95"
            title="Open Dedicated Full-Page Mission"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenReport(m.id);
            }}
            className="p-1.5 rounded bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-purple-800 dark:hover:text-purple-300 hover:border-purple-600 transition-[transform,colors] duration-150 hover:scale-110 active:scale-95"
            title="Open Executive Pentest Pre-Report"
          >
            <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </button>

          <button
            type="button"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onOpenWriteup(m.id);
            }}
            className="p-1.5 rounded bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-cyan-700 dark:hover:text-cyber-cyan hover:border-cyber-cyan transition-[transform,colors] duration-150 hover:scale-110 active:scale-95"
            title="Open Writeup"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {Boolean(sanitizeExternalUrl(m.roomUrl)) && (
            <a
              href={sanitizeExternalUrl(m.roomUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded bg-cyber-bg border border-cyber-border text-cyber-muted hover:text-slate-900 dark:hover:text-white transition-[transform,colors] duration-150 hover:scale-110 active:scale-95"
              title="Open Room Link"
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
    <div className="space-y-6 font-mono pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleMachines.map((m) => (
          <GridCard
            key={m.id}
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
        ))}
      </div>

      {filteredMachines.length > visibleCount && (
        <div className="flex flex-col items-center justify-center pt-4 pb-8">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 32)}
            className="px-6 py-2.5 rounded-lg bg-cyber-card border border-cyber-cyan/40 text-cyber-cyan hover:bg-cyber-cyan hover:text-black font-bold text-xs transition-[transform,colors,box-shadow] duration-150 hover:scale-105 active:scale-95 shadow-glow-cyan/20"
          >
            LOAD MORE TARGETS (+32) — Showing {visibleCount} of {filteredMachines.length}
          </button>
          <span className="text-[10px] text-cyber-muted mt-2">
            120 FPS hardware-accelerated grid enabled
          </span>
        </div>
      )}
    </div>
  );
};

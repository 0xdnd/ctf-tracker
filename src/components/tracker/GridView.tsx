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
import { OsBadge } from '../common/OsBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { BadgeOverflow } from '../common/BadgeOverflow';
import { DifficultyBadge } from '../common/DifficultyBadge';
import { ShareLinkButton } from '../common/ShareLinkButton';

/** Hover/focus reveal for secondary actions; always visible on touch. Opacity only, so keyboard focus still works. */
const REVEAL =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150';

const ICON_BTN =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-primary transition-colors duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11';

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
    if (m.isActive) return;

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

  const statusDot =
    m.status === 'root' || m.status === 'completed'
      ? 'bg-callout-success-fg'
      : m.status === 'foothold'
      ? 'bg-callout-warn-fg'
      : m.status === 'recon'
      ? 'bg-accent'
      : 'bg-surface-hover border border-strong';

  const statusLabel = m.status === 'root' ? 'Root pwned' : m.status.charAt(0).toUpperCase() + m.status.slice(1);

  const flagBtn = (captured: boolean, tone: 'warn' | 'success') =>
    `inline-flex h-6 items-center gap-1 rounded-md border px-2 font-mono text-xs font-medium tabular-nums transition-colors duration-150 active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:h-11 ${
      captured
        ? tone === 'warn'
          ? 'bg-callout-warn-bg border-callout-warn-border text-callout-warn-fg'
          : 'bg-callout-success-bg border-callout-success-border text-callout-success-fg'
        : 'bg-surface-sunken border-subtle text-muted hover:text-primary'
    }`;

  const metaBadges: React.ReactNode[] = [
    <OsBadge key="os" os={m.os} size="xs" />,
    <DifficultyBadge key="diff" difficulty={m.difficulty} size="xs" />,
    ...m.tags.map((t) => (
      <span
        key={`tag-${t}`}
        className="inline-flex h-5 items-center rounded border border-subtle bg-surface-sunken px-1.5 text-xs font-medium text-secondary"
      >
        {t}
      </span>
    )),
  ];

  return (
    <div
      onClick={() => onSelectMachine(m.id)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group cyber-card-contain relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border bg-surface-card p-4 transition-interactive duration-150 surface-card-depth machined-edge hover:bg-surface-hover active:scale-[0.97] ${
        isActiveTarget
          ? 'border-accent ring-1 ring-accent/40'
          : 'border-subtle hover:border-strong'
      }`}
    >
      {/* Drag-over overlay */}
      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-accent bg-surface-base/95 p-4 text-center">
          <Upload className="mb-2 h-8 w-8 text-accent" />
          <span className="text-sm font-semibold text-accent">Drop scan file to ingest</span>
          <span className="mt-0.5 text-xs text-muted">.nmap, .gnmap, XML, or raw output</span>
        </div>
      )}

      {/* Scan intake confirmation */}
      <AnimatePresence>
        {scanToast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
            className={`absolute inset-x-2 top-2 z-20 flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs font-medium shadow-md ${
              scanToast.isError
                ? 'bg-callout-danger-bg border-callout-danger-border text-callout-danger-fg'
                : 'bg-surface-card border-callout-success-border text-callout-success-fg'
            }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              {scanToast.isError ? <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> : <Zap className="h-3.5 w-3.5 shrink-0" />}
              {scanToast.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        {/* Name + status dot */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 font-sans text-base font-semibold text-primary">
            <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${statusDot}`} />
            <span className="truncate">{m.name}</span>
            {m.isActive && (
              <span className="inline-flex h-5 shrink-0 items-center rounded border border-callout-warn-border bg-callout-warn-bg px-1.5 text-xs font-medium text-callout-warn-fg">
                Active
              </span>
            )}
          </div>
          {isActiveTarget && (
            <span className="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-accent">
              <Crosshair className="h-3 w-3 text-accent" /> Engaged
            </span>
          )}
        </div>

        {/* IP (telemetry) + status label + time */}
        {m.isActive ? (
          <div className="mt-3 pl-4 space-y-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-callout-warn-border bg-callout-warn-bg px-2.5 py-1.5 text-xs text-callout-warn-fg">
              <Lock className="h-3.5 w-3.5 flex-shrink-0 text-callout-warn-fg" />
              <span>HTB ToS Protected · Name Only</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs tabular-nums text-muted">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{formatDurationHuman(m.timeSpentSeconds)}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-1 flex items-center justify-between gap-2 pl-4">
              <EditableIpBadge machineId={m.id} initialIp={m.ip} size="xs" className="font-mono text-xs tabular-nums" />
              <div className="flex items-center gap-1 font-mono text-xs tabular-nums text-muted">
                <Clock className="h-3 w-3 shrink-0" />
                <span>{formatDurationHuman(m.timeSpentSeconds)}</span>
              </div>
            </div>
            <div className="mt-0.5 pl-4 text-xs text-muted font-sans">{statusLabel}</div>

            {/* Max two badges, rest behind +N */}
            <div className="mt-3 pl-4">
              <BadgeOverflow badges={metaBadges} max={2} />
            </div>

            {/* Hint spoiler */}
            {m.hint ? (
              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">Intel hint</span>
                  <button
                    type="button"
                    onClick={(e) => onToggleHint(e, m.id)}
                    className="flex cursor-pointer items-center gap-1 text-xs text-muted transition-colors hover:text-primary active:scale-[0.97]"
                    title={isHintRevealed ? 'Hide Intel Hint' : 'Peek Intel Hint'}
                    aria-label={isHintRevealed ? `Hide intel hint for ${m.name}` : `Peek intel hint for ${m.name}`}
                  >
                    {isHintRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {isHintRevealed ? 'Hide' : 'Peek'}
                  </button>
                </div>
                <AnimatePresence initial={false}>
                  <motion.div
                    layout
                    className={`rounded-lg border text-xs leading-relaxed transition-colors duration-200 ${
                      isHintRevealed
                        ? 'max-h-48 overflow-y-auto border-subtle bg-surface-sunken p-2.5 text-primary'
                        : 'flex cursor-pointer select-none items-center justify-center border-subtle bg-surface-sunken/60 p-2 px-2.5 text-muted hover:border-strong hover:text-primary'
                    }`}
                    onClick={(e) => {
                      if (!isHintRevealed) onToggleHint(e, m.id);
                    }}
                  >
                    {isHintRevealed ? (
                      m.hint
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs">
                        <Eye className="h-3 w-3 text-muted" />
                        <span>Click to reveal hint</span>
                      </span>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            ) : null}

            {/* Open ports (telemetry) */}
            {m.openPorts && m.openPorts.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1">
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Radio className="h-3 w-3 text-muted" /> Ports
                </span>
                {m.openPorts.slice(0, 4).map((port) => (
                  <span
                    key={port}
                    className="rounded border border-subtle bg-surface-sunken px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums text-secondary"
                  >
                    {port}
                  </span>
                ))}
                {m.openPorts.length > 4 && (
                  <span className="font-mono text-xs tabular-nums text-muted">+{m.openPorts.length - 4}</span>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer: flags + engage stay visible, utility actions reveal on hover/focus */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-subtle pt-3" onClick={(e) => e.stopPropagation()}>
        {m.isActive ? (
          <div className="flex items-center gap-1.5 text-[11px] text-muted font-mono">
            <Lock className="h-3 w-3 text-callout-warn-fg" />
            <span>Protected</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onToggleUserFlag(m.id)}
              className={flagBtn(hasUser, 'warn')}
              title="Toggle User Flag"
              aria-label={hasUser ? `Toggle user flag for ${m.name} (currently captured)` : `Toggle user flag for ${m.name} (currently pending)`}
            >
              <Flag className="h-2.5 w-2.5" /> U
            </button>
            <button
              type="button"
              onClick={() => onToggleRootFlag(m.id, hasRoot)}
              className={flagBtn(hasRoot, 'success')}
              title="Toggle Root Flag"
              aria-label={hasRoot ? `Toggle root flag for ${m.name} (currently captured)` : `Toggle root flag for ${m.name} (currently pending)`}
            >
              <Flag className="h-2.5 w-2.5" /> R
            </button>
          </div>
        )}

        <div className="flex items-center gap-0.5">
          <div className={`flex items-center gap-0.5 ${REVEAL}`}>
            {!m.isActive && (
              <button
                type="button"
                onClick={() => onSelectMachine(m.id)}
                className={ICON_BTN}
                title="Attack Methodology Checklist"
                aria-label={`Open attack methodology checklist for ${m.name}`}
              >
                <ListChecks className="h-3.5 w-3.5" />
              </button>
            )}

            <ShareLinkButton
              path={`/target/${m.id}`}
              title={m.name}
              iconOnly
              className={`${ICON_BTN} hover:text-accent`}
            />

            <button
              type="button"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onOpenDetail(m.id);
              }}
              className={ICON_BTN}
              title="Open Dedicated Full-Page Mission"
              aria-label={`Open dedicated mission dossier for ${m.name}`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>

            {!m.isActive && (
              <>
                <button
                  type="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onOpenReport(m.id);
                  }}
                  className={`${ICON_BTN} hover:text-accent`}
                  title="Open Executive Pentest Pre-Report"
                  aria-label={`Open executive pentest pre-report for ${m.name}`}
                >
                  <FileText className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onOpenWriteup(m.id);
                  }}
                  className={`${ICON_BTN} hover:text-accent`}
                  title="Open Writeup"
                  aria-label={`Open writeup studio for ${m.name}`}
                >
                  <FileText className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {Boolean(sanitizeExternalUrl(m.roomUrl)) && (
              <a
                href={sanitizeExternalUrl(m.roomUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className={ICON_BTN}
                title="Open Room Link"
                aria-label={`Open external room link for ${m.name}`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={() => onEngageTarget(m.id)}
            className={`${ICON_BTN} ${isActiveTarget ? 'bg-accent-muted text-accent' : 'hover:text-accent'}`}
            title="Engage Active Target"
            aria-label={isActiveTarget ? `Currently engaged target: ${m.name}` : `Engage target ${m.name} and start timer`}
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>
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
            className="px-6 py-2.5 min-h-[44px] rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle text-secondary hover:text-primary font-medium text-sm transition-colors active:scale-[0.97] cursor-pointer"
          >
            Load more targets <span className="font-mono tabular-nums text-muted">({visibleCount} of {filteredMachines.length})</span>
          </button>
        </div>
      )}
    </div>
  );
};

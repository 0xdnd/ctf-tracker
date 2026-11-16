import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEngageTarget } from '../../hooks/useEngageTarget';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, 
  Flag, 
  Clock, 
  Eye, 
  EyeOff, 
  FileText, 
  ClipboardCheck,
  ExternalLink,
  ListChecks,
  Maximize2,
  MoreHorizontal,
  Share2,
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
import { STARTING_POINT_HUB_LABEL, isStartingPointHubUrl } from '../../utils/roomLink';
import { OsBadge } from '../common/OsBadge';
import { PlatformBadge } from '../common/PlatformBadge';
import { CardIpBadge } from './CardIpBadge';
import { BadgeOverflow } from '../common/BadgeOverflow';
import { DifficultyBadge } from '../common/DifficultyBadge';
import { OverflowMenu, type OverflowItem } from '../common/OverflowMenu';
import { copyShareLink } from '../../utils/shareLink';
import { TargetTypeBadge } from '../common/TargetTypeBadge';
import { isTargetTypeTag } from '../../utils/targetType';

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
    `inline-flex h-6 items-center gap-1 rounded-md border px-2 font-mono text-xs font-medium tabular-nums transition-colors duration-150 active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:justify-center ${
      captured
        ? tone === 'warn'
          ? 'bg-callout-warn-bg border-callout-warn-border text-callout-warn-fg'
          : 'bg-callout-success-bg border-callout-success-border text-callout-success-fg'
        : 'bg-surface-sunken border-subtle text-muted hover:text-primary'
    }`;

  const roomHref = sanitizeExternalUrl(m.roomUrl);
  const moreItems: OverflowItem[] = [
    {
      id: 'share',
      label: 'Share link',
      ariaLabel: `Share direct link to ${m.name}`,
      icon: <Share2 className="h-3.5 w-3.5" />,
      onSelect: () => {
        void copyShareLink(`/target/${m.id}`).then((ok) => {
          if (ok && soundEnabled) playCyberSound('copy');
          setScanToast(ok ? { message: 'Link copied' } : { message: 'Could not copy link', isError: true });
          setTimeout(() => setScanToast(null), 2000);
        });
      },
    },
    {
      id: 'dossier',
      label: 'Mission dossier',
      ariaLabel: `Open dedicated mission dossier for ${m.name}`,
      icon: <Maximize2 className="h-3.5 w-3.5" />,
      onSelect: () => onOpenDetail(m.id),
    },
    ...(m.isActive
      ? []
      : [
          {
            id: 'report',
            label: 'Pre-report',
            ariaLabel: `Open executive pentest pre-report for ${m.name}`,
            icon: <ClipboardCheck className="h-3.5 w-3.5" />,
            onSelect: () => onOpenReport(m.id),
          },
          {
            id: 'writeup',
            label: 'Writeup studio',
            ariaLabel: `Open writeup studio for ${m.name}`,
            icon: <FileText className="h-3.5 w-3.5" />,
            onSelect: () => onOpenWriteup(m.id),
          },
        ]),
    ...(roomHref
      ? [
          {
            id: 'room',
            label: isStartingPointHubUrl(m.roomUrl) ? STARTING_POINT_HUB_LABEL : 'Room link',
            ariaLabel: isStartingPointHubUrl(m.roomUrl) ? STARTING_POINT_HUB_LABEL : `Open external room link for ${m.name}`,
            icon: <ExternalLink className="h-3.5 w-3.5" />,
            onSelect: () => {
              window.open(roomHref, '_blank', 'noopener,noreferrer');
            },
          },
        ]
      : []),
  ];

  const metaBadges: React.ReactNode[] = [
    ...(m.platform ? [<PlatformBadge key="plat" platform={m.platform} size="sm" />] : []),
    <OsBadge key="os" os={m.os} size="xs" />,
    <DifficultyBadge key="diff" difficulty={m.difficulty} size="xs" />,
    ...m.tags.filter((t) => !isTargetTypeTag(m, t)).map((t) => (
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
      role="presentation"
      onClick={() => onSelectMachine(m.id)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group cyber-card-contain relative flex cursor-pointer flex-col h-full justify-between overflow-hidden rounded-2xl border bg-surface-card px-3.5 py-3 transition-interactive duration-150 surface-card-depth machined-edge hover:bg-surface-hover active:scale-[0.97] ${
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
          <div className="flex min-w-0 items-center gap-2 font-sans text-base font-semibold leading-5 text-primary">
            <span aria-hidden="true" title={statusLabel} className={`h-2 w-2 shrink-0 rounded-full ${statusDot}`} />
            <span className="sr-only">{statusLabel}:</span>
            <span className="truncate">{m.name}</span>
            {m.isActive && (
              <span className="inline-flex h-5 shrink-0 items-center rounded border border-callout-warn-border bg-callout-warn-bg px-1.5 text-xs font-medium text-callout-warn-fg">
                Active
              </span>
            )}
            <TargetTypeBadge machine={m} size="sm" />
          </div>
          {isActiveTarget && (
            <span className="flex flex-shrink-0 items-center gap-1 text-xs font-medium text-accent">
              <Crosshair className="h-3 w-3 text-accent" /> Engaged
            </span>
          )}
        </div>

        {/* IP (telemetry) + status label + time */}
        {m.isActive ? (
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-1.5 rounded-lg border border-callout-warn-border bg-callout-warn-bg px-2.5 py-1.5 text-[13px] text-callout-warn-fg">
              <Lock className="h-3.5 w-3.5 flex-shrink-0 text-callout-warn-fg" />
              <span>HTB ToS Protected · Name Only</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[13px] tabular-nums text-muted">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{formatDurationHuman(m.timeSpentSeconds)}</span>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2">
              <CardIpBadge machineId={m.id} initialIp={m.ip} size="xs" backlog={m.status === 'backlog'} className="font-mono !text-[13px] tabular-nums" />
              <div className="flex items-center gap-1.5 text-[13px] tabular-nums text-muted">
                {m.status !== 'backlog' && <span className="font-sans">{statusLabel}</span>}
                {m.timeSpentSeconds > 0 && (
                  <>
                    <Clock className="h-3 w-3 shrink-0" />
                    <span className="font-mono">{formatDurationHuman(m.timeSpentSeconds)}</span>
                  </>
                )}
                {m.hint ? (
                  <button
                    type="button"
                    onClick={(e) => onToggleHint(e, m.id)}
                    aria-expanded={isHintRevealed}
                    className="inline-flex h-6 cursor-pointer items-center gap-1 rounded border border-subtle bg-surface-sunken px-1.5 font-sans text-xs font-medium text-muted transition-colors hover:border-strong hover:text-primary active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11"
                    title={isHintRevealed ? 'Hide Intel Hint' : 'Peek Intel Hint'}
                    aria-label={isHintRevealed ? `Hide intel hint for ${m.name}` : `Peek intel hint for ${m.name}`}
                  >
                    {isHintRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    Hint
                  </button>
                ) : null}
              </div>
            </div>

            {/* Platform, OS and difficulty inline, rest behind +N */}
            <div className="mt-1">
              <BadgeOverflow badges={metaBadges} max={3} inline />
            </div>

            {/* Hint spoiler: stays out of the card until asked for */}
            {m.hint && isHintRevealed ? (
              <div
                role="presentation"
                onClick={(e) => e.stopPropagation()}
                className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-subtle bg-surface-sunken p-2 text-[13px] leading-relaxed text-primary"
              >
                {m.hint}
              </div>
            ) : null}

            {/* Open ports (telemetry) */}
            {m.openPorts && m.openPorts.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1">
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

      {/* Footer: flags on the left; open and engage always visible, the rest in the more menu */}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-subtle pt-1.5" role="presentation" onClick={(e) => e.stopPropagation()}>
        {m.isActive ? (
          <div className="flex items-center gap-1.5 text-xs text-muted font-mono">
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
              <Flag className="h-3 w-3" /> User
            </button>
            <button
              type="button"
              onClick={() => onToggleRootFlag(m.id, hasRoot)}
              className={flagBtn(hasRoot, 'success')}
              title="Toggle Root Flag"
              aria-label={hasRoot ? `Toggle root flag for ${m.name} (currently captured)` : `Toggle root flag for ${m.name} (currently pending)`}
            >
              <Flag className="h-3 w-3" /> Root
            </button>
          </div>
        )}

        <div className="flex items-center justify-end gap-0.5 [@media(pointer:coarse)]:gap-2">
          <button
            type="button"
            onClick={() => onSelectMachine(m.id)}
            className={ICON_BTN}
            title={m.isActive ? 'Open compliance details' : 'Open attack methodology checklist'}
            aria-label={m.isActive ? `Open active target compliance details for ${m.name}` : `Open attack methodology checklist for ${m.name}`}
          >
            <ListChecks className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onEngageTarget(m.id)}
            className={`${ICON_BTN} ${isActiveTarget ? 'bg-accent-muted text-accent' : 'hover:text-accent'}`}
            title="Engage Active Target"
            aria-label={isActiveTarget ? `Currently engaged target: ${m.name}` : `Engage target ${m.name} and start timer`}
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>

          <OverflowMenu
            portal
            items={moreItems}
            label={`More actions for ${m.name}`}
            triggerContent={<MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />}
            triggerClassName={`${ICON_BTN} aria-expanded:bg-surface-hover aria-expanded:text-primary`}
          />
        </div>
      </div>
    </div>
  );
});

interface GridViewProps {
  filteredMachines: Machine[];
}

/** Cards mounted in the first pass, and the batch size that follows. */
const FIRST_REVEAL = 6;
const REVEAL_STEP = 4;

export const GridView: React.FC<GridViewProps> = ({ filteredMachines }) => {
  const navigate = useNavigate();
  const {
    setSelectedMachineId,
    activeTargetId,
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
  // Cards are mounted a few at a time: the first screenful at once, the rest one small batch per task, so a list swap
  // (the catalog arriving, a filter change) never builds every card inside one long task.
  const [revealed, setRevealed] = useState(FIRST_REVEAL);

  // Adjusted during render, so no frame shows the old window.
  const [listLength, setListLength] = useState(filteredMachines.length);
  if (listLength !== filteredMachines.length) {
    // Only a large change (catalog arrival, filter switch) restarts the batched reveal; a small one (a delete, a status
    // toggle under a filter) keeps the mounted cards so they do not unmount and replay their enter animation.
    if (listLength === 0 || Math.abs(filteredMachines.length - listLength) > REVEAL_STEP) {
      setVisibleCount(32);
      setRevealed(FIRST_REVEAL);
    }
    setListLength(filteredMachines.length);
  }

  const mountedCount = Math.min(visibleCount, revealed, filteredMachines.length);
  const settled = mountedCount >= Math.min(visibleCount, filteredMachines.length);
  React.useEffect(() => {
    if (settled) return;
    const t = setTimeout(() => setRevealed((r) => r + REVEAL_STEP), 0);
    return () => clearTimeout(t);
  }, [settled, revealed]);

  const visibleMachines = React.useMemo(() => {
    return filteredMachines.slice(0, mountedCount);
  }, [filteredMachines, mountedCount]);

  const toggleHint = useCallback((e: React.MouseEvent, machineId: string) => {
    e.stopPropagation();
    setRevealedHints((prev) => ({ ...prev, [machineId]: !prev[machineId] }));
    if (soundEnabled) playCyberSound('click');
  }, [soundEnabled]);

  const handleToggleRootFlag = useCallback((id: string, hasRoot: boolean) => {
    toggleRootFlag(id);
    if (!hasRoot) triggerRootCelebration();
  }, [toggleRootFlag]);

  const engage = useEngageTarget();
  const handleEngageTarget = useCallback((id: string) => engage(id), [engage]);

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
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4">
        {visibleMachines.map((m, idx) => (
          <div
            key={m.id}
            className="card-enter h-full"
            style={{ animationDelay: `${Math.min(idx * 20, 300)}ms` }}
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
          </div>
        ))}
      </div>

      {settled && filteredMachines.length > visibleCount && (
        <div className="flex flex-col items-center justify-center pt-4 pb-8">
          <button
            type="button"
            onClick={() => {
              // A page the user asked for mounts at once (as before), so this button stays mounted and keeps focus.
              setVisibleCount((prev) => prev + 32);
              setRevealed((prev) => prev + 32);
            }}
            className="px-6 py-2.5 min-h-[44px] rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle text-secondary hover:text-primary font-medium text-sm transition-colors active:scale-[0.97] cursor-pointer"
          >
            Load more targets <span className="font-mono tabular-nums text-muted">({visibleCount} of {filteredMachines.length})</span>
          </button>
        </div>
      )}
    </div>
  );
};

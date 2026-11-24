import React, { useState } from 'react';
import { Crosshair, MoreHorizontal } from 'lucide-react';
import { Machine, PipelineStatus } from '../../types';
import { formatDurationHuman } from '../../utils/helpers';
import { BadgeOverflow } from '../common/BadgeOverflow';
import { OverflowMenu } from '../common/OverflowMenu';
import { isTargetTypeTag } from '../../utils/targetType';
import { buildTargetMenuItems } from './targetMenuItems';
import { machineChips } from './machineChips';
import { FlagPill } from './FlagPill';
import { CompactIp } from './CompactIp';

export interface GridCardCompactProps {
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
  /** Read once in GridView and passed down, so no card subscribes to the store itself. */
  soundEnabled: boolean;
  onSetAssignIp: (id: string | null) => void;
  /** When set, the overflow menu offers moving the target to the next or previous stage. */
  onStatusChange?: (id: string, status: PipelineStatus) => void;
}

/**
 * Compact tracker card for phones (about 64px tall). Row 1: status dot, name, a User / Root status pill and the
 * overflow menu (stage moves, flags, hint, checklist, engage and the rest). Row 2: IP, platform and difficulty chips,
 * and a "+N more" pill for the rest.
 */
export const GridCardCompact = React.memo<GridCardCompactProps>(({
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
  soundEnabled,
  onSetAssignIp,
  onStatusChange,
}) => {
  const [note, setNote] = useState<string | null>(null);
  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(null), 2000);
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

  const items = buildTargetMenuItems(
    m,
    {
      onToggleHint,
      onSelectMachine,
      onEngageTarget,
      onSetIp: onSetAssignIp,
      onOpenDetail,
      onOpenReport,
      onOpenWriteup,
      onStatusChange,
      onToggleUserFlag,
      onToggleRootFlag,
      onShareResult: (ok) => flash(ok ? 'Link copied' : 'Could not copy link'),
    },
    { isHintRevealed, soundEnabled, phone: { isActiveTarget } },
  );

  const { badges: chips, labels: chipLabels } = machineChips(m, {
    order: ['platform', 'difficulty', 'os'],
    extras: m.tags.filter((t) => !isTargetTypeTag(m, t)),
  });

  return (
    <div
      role="presentation"
      onClick={() => onSelectMachine(m.id)}
      className={`cyber-card-contain ![contain-intrinsic-size:1px_64px] relative flex h-full cursor-pointer flex-col gap-0.5 overflow-hidden rounded-xl border bg-surface-card px-3 py-1 transition-interactive duration-150 active:scale-[0.97] ${
        isActiveTarget ? 'border-accent ring-1 ring-accent/40' : 'border-subtle'
      }`}
    >
      {/* Row 1: status dot, name, time, User / Root pill, overflow menu */}
      <div className="flex items-center gap-2">
        <span aria-hidden="true" title={statusLabel} className={`h-2 w-2 shrink-0 rounded-full ${statusDot}`} />
        <span className="sr-only">{statusLabel}:</span>
        <span className="min-w-0 flex-1 truncate font-sans text-[15px] font-semibold leading-5 text-primary">{m.name}</span>
        {isActiveTarget && <Crosshair aria-label="Engaged" className="h-3.5 w-3.5 shrink-0 text-accent" />}
        {m.timeSpentSeconds > 0 && (
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted">{formatDurationHuman(m.timeSpentSeconds)}</span>
        )}
        <div className="flex shrink-0 items-center gap-2" role="presentation" onClick={(e) => e.stopPropagation()}>
          {!m.isActive && <FlagPill machine={m} onToggleUserFlag={onToggleUserFlag} onToggleRootFlag={onToggleRootFlag} />}
          <OverflowMenu
            portal
            items={items}
            label={`More actions for ${m.name}`}
            triggerContent={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
            triggerClassName="tap-target-sm inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-primary active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-expanded:bg-surface-hover aria-expanded:text-primary"
          />
        </div>
      </div>

      {/* Row 2: IP and chips */}
      <div className="flex min-w-0 items-center gap-2" role="presentation" onClick={(e) => e.stopPropagation()}>
        <CompactIp machine={m} soundEnabled={soundEnabled} onSetAssignIp={onSetAssignIp} onNote={flash} />
        {!m.isActive && (
          <div className="min-w-0 flex-1">
            <BadgeOverflow badges={chips} labels={chipLabels} max={2} inline dense moreWord="more" />
          </div>
        )}
      </div>

      {m.hint && isHintRevealed && !m.isActive ? (
        <div
          role="presentation"
          onClick={(e) => e.stopPropagation()}
          className="mb-1 max-h-32 overflow-y-auto rounded-lg border border-subtle bg-surface-sunken p-2 text-[13px] leading-relaxed text-primary"
        >
          {m.hint}
        </div>
      ) : null}

      {note && (
        <div role="status" className="pointer-events-none absolute inset-x-2 top-1.5 z-20 rounded-lg border border-subtle bg-surface-card px-2.5 py-1 text-xs font-medium text-primary shadow-md">
          {note}
        </div>
      )}
    </div>
  );
});
GridCardCompact.displayName = 'GridCardCompact';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowUpDown,
  Flag,
  Crosshair,
  FileText,
  ExternalLink,
  ListChecks,
  Maximize2,
  Lock
} from 'lucide-react';
import { Machine, PipelineStatus } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { formatSeconds, playCyberSound, triggerRootCelebration, sanitizeExternalUrl } from '../../utils/helpers';
import { TACTICAL_SPRING } from '../../utils/motionTokens';
import { PlatformBadge, PlatformIcon } from '../common/PlatformBadge';
import { OsBadge } from '../common/OsBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { DifficultyBadge } from '../common/DifficultyBadge';
import { BadgeOverflow } from '../common/BadgeOverflow';
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';

interface TableViewProps {
  filteredMachines: Machine[];
}

type SortField = 'name' | 'platform' | 'os' | 'difficulty' | 'status' | 'timeSpentSeconds';

const STATUS_OPTIONS: CyberSelectOption<PipelineStatus>[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'recon', label: 'Recon' },
  { value: 'foothold', label: 'Foothold' },
  { value: 'root', label: 'Root pwned' },
  { value: 'completed', label: 'Completed' },
];

/** Hover/focus reveal for secondary actions; always visible on touch. Opacity only, so keyboard focus still works. */
const REVEAL =
  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150';

const ICON_BTN =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-primary transition-colors duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11';

const STATUS_DOT: Record<string, string> = {
  backlog: 'bg-surface-hover border border-strong',
  recon: 'bg-accent',
  foothold: 'bg-callout-warn-fg',
  root: 'bg-callout-success-fg',
  completed: 'bg-callout-tip-fg',
};

const flagBtnClass = (captured: boolean, tone: 'warn' | 'success') =>
  `inline-flex h-6 items-center gap-1 rounded-md border px-2 font-mono text-xs font-medium tabular-nums transition-colors duration-150 active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:h-11 ${
    captured
      ? tone === 'warn'
        ? 'bg-callout-warn-bg border-callout-warn-border text-callout-warn-fg'
        : 'bg-callout-success-bg border-callout-success-border text-callout-success-fg'
      : 'bg-surface-sunken border-subtle text-muted hover:text-primary'
  }`;

/** True below the `sm` breakpoint (640px). Falls back to false where matchMedia is unavailable. */
function useIsBelowSm(): boolean {
  const query = '(max-width: 639px)';
  const get = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);
  const [below, setBelow] = useState<boolean>(get);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    const onChange = () => setBelow(mql.matches);
    onChange();
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
  }, []);
  return below;
}

interface TableRowProps {
  machine: Machine;
  isActiveTarget: boolean;
  soundEnabled: boolean;
  onSelect: (id: string) => void;
  onStatusChange: (status: PipelineStatus, id: string) => void;
  onToggleUserFlag: (id: string) => void;
  onToggleRootFlag: (id: string, hasRoot: boolean) => void;
  onEngageTarget: (id: string) => void;
  onOpenTarget: (id: string) => void;
  onOpenReport: (id: string) => void;
  onOpenWriteup: (id: string) => void;
}

const RowActions: React.FC<Pick<TableRowProps, 'machine' | 'isActiveTarget' | 'onSelect' | 'onEngageTarget' | 'onOpenTarget' | 'onOpenReport' | 'onOpenWriteup'>> = ({
  machine: m,
  isActiveTarget,
  onSelect,
  onEngageTarget,
  onOpenTarget,
  onOpenReport,
  onOpenWriteup,
}) => (
  <div className="flex flex-wrap items-center justify-end gap-0.5">
    <div className={`flex items-center gap-0.5 ${REVEAL}`}>
      <button
        type="button"
        onClick={() => onSelect(m.id)}
        className={ICON_BTN}
        title="Attack Methodology Checklist"
        aria-label={`Open attack methodology checklist for ${m.name}`}
      >
        <ListChecks className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => onOpenTarget(m.id)}
        className={ICON_BTN}
        title="Open Dedicated Full-Page Mission"
        aria-label={`Open dedicated mission dossier for ${m.name}`}
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>

      {!m.isActive && (
        <>
          <button
            type="button"
            onClick={() => onOpenReport(m.id)}
            className={`${ICON_BTN} hover:text-accent`}
            title="Open Executive Pentest Pre-Report"
            aria-label={`Open executive pentest pre-report for ${m.name}`}
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onOpenWriteup(m.id)}
            className={`${ICON_BTN} hover:text-accent`}
            title="Open Writeup"
            aria-label={`Open writeup studio for ${m.name}`}
          >
            <FileText className="w-3.5 h-3.5" />
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
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>

    <button
      type="button"
      onClick={() => onEngageTarget(m.id)}
      className={`${ICON_BTN} ${isActiveTarget ? 'bg-accent-muted text-accent' : 'hover:text-accent'}`}
      title={isActiveTarget ? 'Currently Engaged Target' : 'Engage Target & Start Timer'}
      aria-label={isActiveTarget ? `Currently engaged target: ${m.name}` : `Engage target ${m.name} and start timer`}
    >
      <Crosshair className="w-3.5 h-3.5" />
    </button>
  </div>
);

const FlagButtons: React.FC<Pick<TableRowProps, 'machine' | 'onToggleUserFlag' | 'onToggleRootFlag'>> = ({
  machine: m,
  onToggleUserFlag,
  onToggleRootFlag,
}) => {
  const hasUser = Boolean(m.userPwnedAt || m.userFlag);
  const hasRoot = Boolean(m.rootPwnedAt || m.rootFlag);
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onToggleUserFlag(m.id)}
        className={flagBtnClass(hasUser, 'warn')}
        title="Toggle User Flag"
        aria-label={hasUser ? `Toggle user flag for ${m.name} (currently captured)` : `Toggle user flag for ${m.name} (currently pending)`}
      >
        <Flag className="w-2.5 h-2.5" /> U
      </button>
      <button
        type="button"
        onClick={() => onToggleRootFlag(m.id, hasRoot)}
        className={flagBtnClass(hasRoot, 'success')}
        title="Toggle Root Flag"
        aria-label={hasRoot ? `Toggle root flag for ${m.name} (currently captured)` : `Toggle root flag for ${m.name} (currently pending)`}
      >
        <Flag className="w-2.5 h-2.5" /> R
      </button>
    </div>
  );
};

const TableRow = React.memo<TableRowProps>(({
  machine: m,
  isActiveTarget,
  soundEnabled,
  onSelect,
  onStatusChange,
  onToggleUserFlag,
  onToggleRootFlag,
  onEngageTarget,
  onOpenTarget,
  onOpenReport,
  onOpenWriteup,
}) => {
  return (
    <tr
      className={`interactive-surface hover:bg-surface-hover transition-colors group cursor-pointer border-b border-subtle ${
        isActiveTarget ? 'bg-accent-muted border-l-2 border-l-accent' : ''
      }`}
      onClick={() => onSelect(m.id)}
    >
      {/* Target name & IP */}
      <td className="py-2.5 px-4">
        <div className="flex items-center gap-2.5">
          <PlatformIcon platform={m.platform} className="w-4 h-4 flex-shrink-0" />
          <div>
            <div className="font-semibold text-primary flex items-center gap-1.5 font-sans text-sm">
              <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[m.status] ?? STATUS_DOT.backlog}`} />
              <span>{m.name}</span>
              {m.isActive && (
                <span className="inline-flex h-5 items-center rounded border border-callout-warn-border bg-callout-warn-bg px-1.5 text-xs font-medium text-callout-warn-fg">
                  Active
                </span>
              )}
            </div>
            {m.isActive ? (
              <div className="mt-0.5 text-[11px] font-mono text-muted">HTB ToS Protected</div>
            ) : (
              <EditableIpBadge machineId={m.id} initialIp={m.ip} size="xs" className="mt-0.5 tabular-nums font-mono text-xs" />
            )}
          </div>
        </div>
      </td>

      {/* Platform */}
      <td className="py-2.5 px-3">
        <PlatformBadge platform={m.platform} size="sm" />
      </td>

      {/* OS & category */}
      <td className="py-2.5 px-3">
        {m.isActive ? (
          <span className="text-muted font-mono text-xs">—</span>
        ) : (
          <BadgeOverflow
            badges={[
              <OsBadge key="os" os={m.os} size="xs" />,
              <CategoryBadge key="cat" machine={m} size="xs" />,
            ]}
            max={2}
          />
        )}
      </td>

      {/* Difficulty */}
      <td className="py-2.5 px-3">
        <DifficultyBadge difficulty={m.difficulty} size="sm" />
      </td>

      {/* Status pipeline dropdown */}
      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
        <CyberSelect<PipelineStatus>
          value={m.status}
          onChange={(newStatus) => onStatusChange(newStatus, m.id)}
          options={STATUS_OPTIONS}
          size="xs"
          variant="hardware"
          soundEnabled={soundEnabled}
        />
      </td>

      {/* Flags */}
      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
        {m.isActive ? (
          <span className="text-xs text-muted flex items-center gap-1 font-mono">
            <Lock className="w-3 h-3 text-callout-warn-fg" /> Protected
          </span>
        ) : (
          <FlagButtons machine={m} onToggleUserFlag={onToggleUserFlag} onToggleRootFlag={onToggleRootFlag} />
        )}
      </td>

      {/* Time */}
      <td className="py-2.5 px-3">
        <span className="text-secondary font-mono tabular-nums text-xs">{formatSeconds(m.timeSpentSeconds)}</span>
      </td>

      {/* Tracks */}
      <td className="py-2.5 px-3">
        {m.isActive ? (
          <span className="text-muted font-mono text-xs">—</span>
        ) : (
          <BadgeOverflow
            badges={m.certifications.map((c) => (
              <span
                key={c}
                className="inline-flex h-5 items-center rounded border border-subtle bg-surface-sunken px-1.5 text-xs font-medium text-secondary"
              >
                {c}
              </span>
            ))}
            max={2}
          />
        )}
      </td>

      {/* Actions */}
      <td className="py-2.5 px-4 text-right pr-6 whitespace-nowrap min-w-[200px]" onClick={(e) => e.stopPropagation()}>
        <RowActions
          machine={m}
          isActiveTarget={isActiveTarget}
          onSelect={onSelect}
          onEngageTarget={onEngageTarget}
          onOpenTarget={onOpenTarget}
          onOpenReport={onOpenReport}
          onOpenWriteup={onOpenWriteup}
        />
      </td>
    </tr>
  );
});

/** Stacked card used below `sm` instead of a table row. */
const StackedCard = React.memo<TableRowProps>(({
  machine: m,
  isActiveTarget,
  soundEnabled,
  onSelect,
  onStatusChange,
  onToggleUserFlag,
  onToggleRootFlag,
  onEngageTarget,
  onOpenTarget,
  onOpenReport,
  onOpenWriteup,
}) => (
  <div
    onClick={() => onSelect(m.id)}
    className={`group cursor-pointer rounded-2xl border bg-surface-card p-3.5 transition-colors active:scale-[0.97] ${
      isActiveTarget ? 'border-accent ring-1 ring-accent/40' : 'border-subtle'
    }`}
  >
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[m.status] ?? STATUS_DOT.backlog}`} />
      <span className="min-w-0 flex-1 truncate font-sans text-base font-semibold text-primary">{m.name}</span>
      {m.isActive && (
        <span className="inline-flex h-5 shrink-0 items-center rounded border border-callout-warn-border bg-callout-warn-bg px-1.5 text-xs font-medium text-callout-warn-fg">
          Active
        </span>
      )}
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted">{formatSeconds(m.timeSpentSeconds)}</span>
    </div>
    <div className="mt-1 pl-4">
      {m.isActive ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-callout-warn-fg">
          <Lock className="w-3 h-3" />
          <span>HTB ToS Protected</span>
        </span>
      ) : (
        <EditableIpBadge machineId={m.id} initialIp={m.ip} size="xs" className="font-mono text-xs tabular-nums" />
      )}
    </div>
    <div className="mt-2.5 flex items-center justify-between gap-2 pl-4">
      {m.isActive ? (
        <span className="text-[11px] text-muted font-mono">Protected Target</span>
      ) : (
        <BadgeOverflow
          badges={[
            <OsBadge key="os" os={m.os} size="xs" />,
            <DifficultyBadge key="diff" difficulty={m.difficulty} size="xs" />,
            <PlatformBadge key="plat" platform={m.platform} size="sm" />,
            ...(m.certifications || []).map((c) => (
              <span
                key={c}
                className="inline-flex h-5 items-center rounded border border-subtle bg-surface-sunken px-1.5 text-xs font-medium text-secondary"
              >
                {c}
              </span>
            )),
          ]}
          max={2}
        />
      )}
    </div>
    <div className="mt-3 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
      <FlagButtons machine={m} onToggleUserFlag={onToggleUserFlag} onToggleRootFlag={onToggleRootFlag} />
      <CyberSelect<PipelineStatus>
        value={m.status}
        onChange={(newStatus) => onStatusChange(newStatus, m.id)}
        options={STATUS_OPTIONS}
        size="sm"
        variant="hardware"
        soundEnabled={soundEnabled}
      />
    </div>
    <div className="mt-2 border-t border-subtle pt-2" onClick={(e) => e.stopPropagation()}>
      <RowActions
        machine={m}
        isActiveTarget={isActiveTarget}
        onSelect={onSelect}
        onEngageTarget={onEngageTarget}
        onOpenTarget={onOpenTarget}
        onOpenReport={onOpenReport}
        onOpenWriteup={onOpenWriteup}
      />
    </div>
  </div>
));

const HEADERS: { label: string; field?: SortField; className: string }[] = [
  { label: 'Target', field: 'name', className: 'py-3 px-4' },
  { label: 'Platform', field: 'platform', className: 'py-3 px-3' },
  { label: 'OS', field: 'os', className: 'py-3 px-3' },
  { label: 'Difficulty', field: 'difficulty', className: 'py-3 px-3' },
  { label: 'Status', field: 'status', className: 'py-3 px-3' },
  { label: 'Flags', className: 'py-3 px-3' },
  { label: 'Time', field: 'timeSpentSeconds', className: 'py-3 px-3' },
  { label: 'Tracks', className: 'py-3 px-3' },
  { label: 'Actions', className: 'py-3 px-4 text-right pr-6 whitespace-nowrap min-w-[200px]' },
];

export const TableView: React.FC<TableViewProps> = ({ filteredMachines }) => {
  const navigate = useNavigate();
  const {
    setSelectedMachineId,
    updateMachineStatus,
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
      updateMachineStatus: s.updateMachineStatus,
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

  const isBelowSm = useIsBelowSm();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [customColumnSorted, setCustomColumnSorted] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(30);

  const handleSort = useCallback((field: SortField) => {
    setCustomColumnSorted(true);
    setSortField((prevField) => {
      if (prevField === field) {
        setSortAsc((prevAsc) => !prevAsc);
        return field;
      } else {
        setSortAsc(true);
        return field;
      }
    });
  }, []);

  const sortedMachines = useMemo(() => {
    if (!customColumnSorted) {
      return filteredMachines;
    }
    const list = [...filteredMachines];
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return 0;
    });
    return list;
  }, [filteredMachines, sortField, sortAsc, customColumnSorted]);

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: sortedMachines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  const handleStatusChange = useCallback((newStatus: PipelineStatus, machineId: string) => {
    updateMachineStatus(machineId, newStatus);
    if (newStatus === 'root' || newStatus === 'completed') {
      triggerRootCelebration();
      if (soundEnabled) playCyberSound('root');
    }
  }, [updateMachineStatus, soundEnabled]);

  const handleToggleRootFlag = useCallback((id: string, hasRoot: boolean) => {
    toggleRootFlag(id);
    if (!hasRoot) triggerRootCelebration();
  }, [toggleRootFlag]);

  const handleEngageTarget = useCallback((id: string) => {
    setActiveTarget(id);
    startTimer();
    if (soundEnabled) playCyberSound('timer');
  }, [setActiveTarget, startTimer, soundEnabled]);

  const handleOpenTarget = useCallback((id: string) => {
    navigate(`/target/${id}`);
  }, [navigate]);

  const handleOpenReport = useCallback((id: string) => {
    setReportMachineId(id);
  }, [setReportMachineId]);

  const handleOpenWriteup = useCallback((id: string) => {
    setWriteupMachineId(id);
    setActiveTab('writeup');
    navigate(`/writeup/${id}`);
  }, [setWriteupMachineId, setActiveTab, navigate]);

  const rowProps = (m: Machine): TableRowProps => ({
    machine: m,
    isActiveTarget: activeTargetId === m.id,
    soundEnabled,
    onSelect: setSelectedMachineId,
    onStatusChange: handleStatusChange,
    onToggleUserFlag: toggleUserFlag,
    onToggleRootFlag: handleToggleRootFlag,
    onEngageTarget: handleEngageTarget,
    onOpenTarget: handleOpenTarget,
    onOpenReport: handleOpenReport,
    onOpenWriteup: handleOpenWriteup,
  });

  if (isBelowSm) {
    const visible = sortedMachines.slice(0, mobileVisible);
    return (
      <div className="space-y-3 pb-8" data-testid="table-stacked-cards">
        {visible.map((m) => (
          <StackedCard key={m.id} {...rowProps(m)} />
        ))}
        {sortedMachines.length > mobileVisible && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setMobileVisible((n) => n + 30)}
              className="px-6 min-h-[44px] rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle text-secondary text-sm font-medium transition-colors active:scale-[0.97] cursor-pointer"
            >
              Load more <span className="font-mono tabular-nums text-muted">({visible.length} of {sortedMachines.length})</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TACTICAL_SPRING}
      className="rounded-2xl border border-subtle bg-surface-card overflow-hidden text-xs pb-4 surface-card-depth machined-edge"
    >
      <div ref={parentRef} className="overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto">
        <table className="w-full text-left border-collapse min-w-[1080px]">
          <thead className="sticky top-0 z-10 bg-surface-base/95 backdrop-blur-sm border-b border-subtle text-xs text-muted font-sans font-semibold machined-edge">
            <tr>
              {HEADERS.map((h) =>
                h.field ? (
                  <th
                    key={h.label}
                    className={`${h.className} cursor-pointer hover:text-primary transition-colors group`}
                    onClick={() => handleSort(h.field as SortField)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{h.label}</span>
                      <ArrowUpDown className="w-3 h-3 text-muted/70 group-hover:text-primary transition-colors" />
                    </div>
                  </th>
                ) : (
                  <th key={h.label} className={h.className}>{h.label}</th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} colSpan={9} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const m = sortedMachines[virtualRow.index];
              if (!m) return null;
              return <TableRow key={m.id} {...rowProps(m)} />;
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} colSpan={9} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 pt-3 text-xs text-muted border-t border-subtle font-sans">
        <div>
          <span className="font-mono tabular-nums font-medium text-primary">{sortedMachines.length}</span> targets
        </div>
        <div className="text-xs text-muted hidden sm:block">
          <span className="font-mono">j/k</span> navigate · <span className="font-mono">space</span> inspect
        </div>
      </div>
    </motion.div>
  );
};

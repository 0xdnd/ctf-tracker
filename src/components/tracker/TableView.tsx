import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEngageTarget } from '../../hooks/useEngageTarget';
import { m } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
  Trash2,
  Plus,
  Flag,
  Crosshair,
  FileText,
  ClipboardCheck,
  ExternalLink,
  ListChecks,
  Maximize2,
  Lock,
  Download,
  Check,
  MoreHorizontal
} from 'lucide-react';
import { downloadMachinesCsv } from '../../utils/machineCsvExport';
import { Machine, PipelineStatus } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { entersRootStage } from '../../utils/pipeline';
import { useShallow } from 'zustand/react/shallow';
import { formatSeconds, playCyberSound, triggerRootCelebration, sanitizeExternalUrl } from '../../utils/helpers';
import { STARTING_POINT_HUB_LABEL, isStartingPointHubUrl } from '../../utils/roomLink';
import { TACTICAL_SPRING } from '../../utils/motionTokens';
import { PlatformBadge, PlatformIcon } from '../common/PlatformBadge';
import { OsBadge } from '../common/OsBadge';
import { CardIpBadge } from './CardIpBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { DifficultyBadge } from '../common/DifficultyBadge';
import { BadgeOverflow } from '../common/BadgeOverflow';
import { OverflowMenu, type OverflowItem } from '../common/OverflowMenu';
// Phones render a dense list instead of the table, so the desktop table never loads it.
const PhoneTargetTable = React.lazy(() => import('./PhoneTargetTable').then((m) => ({ default: m.PhoneTargetTable })));
import { PHONE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery';
import { ViewSkeleton } from '../common/Skeleton';
import { CyberSelect, CyberSelectOption } from '../common/CyberSelect';
import { CyberButton } from '../common/CyberButton';
import { confirmAction, useConfirmStore } from '../../store/useConfirmStore';
import { SortKey, nextSortKeys, sortByKeys, applySelectionClick } from '../../utils/tableSort';
import { CHECKBOX_BOX, CHECKBOX_CLASS, CHECK_CELL, STATUS_DOT, type SortField } from './tableShared';

interface TableViewProps {
  filteredMachines: Machine[];
}

const STATUS_OPTIONS: CyberSelectOption<PipelineStatus>[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'recon', label: 'Recon' },
  { value: 'foothold', label: 'Foothold' },
  { value: 'root', label: 'Root pwned' },
  { value: 'completed', label: 'Completed' },
];

const ICON_BTN =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-hover hover:text-primary transition-colors duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:h-8 [@media(pointer:coarse)]:w-8 tap-target-sm';

const flagBtnClass = (captured: boolean, tone: 'warn' | 'success') =>
  `inline-flex h-6 items-center gap-1 rounded-md border px-2 font-mono text-xs font-medium tabular-nums transition-colors duration-150 active:scale-[0.97] cursor-pointer [@media(pointer:coarse)]:h-11 ${
    captured
      ? tone === 'warn'
        ? 'bg-callout-warn-bg border-callout-warn-border text-callout-warn-fg'
        : 'bg-callout-success-bg border-callout-success-border text-callout-success-fg'
      : 'bg-surface-sunken border-subtle text-muted hover:text-primary'
  }`;

interface TableRowProps {
  machine: Machine;
  isActiveTarget: boolean;
  soundEnabled: boolean;
  /** Bulk-selection state; only the desktop table renders the checkbox. */
  isChecked?: boolean;
  onToggleCheck?: (id: string, shift: boolean) => void;
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
}) => {
  // Built once per row data, not on every render of the row (the menu stays closed almost always).
  const items = React.useMemo((): OverflowItem[] => {
    const roomHref = sanitizeExternalUrl(m.roomUrl);
    return [
      {
        id: 'checklist',
        label: 'Checklist',
        ariaLabel: m.isActive ? `Open active target compliance details for ${m.name}` : `Open attack methodology checklist for ${m.name}`,
        icon: <ListChecks className="h-3.5 w-3.5" />,
        onSelect: () => onSelect(m.id),
      },
      {
        id: 'dossier',
        label: 'Open full page',
        ariaLabel: `Open dedicated mission dossier for ${m.name}`,
        icon: <Maximize2 className="h-3.5 w-3.5" />,
        onSelect: () => onOpenTarget(m.id),
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
        ? [{
            id: 'room',
            label: isStartingPointHubUrl(m.roomUrl) ? STARTING_POINT_HUB_LABEL : 'Room link',
            ariaLabel: isStartingPointHubUrl(m.roomUrl) ? STARTING_POINT_HUB_LABEL : `Open external room link for ${m.name}`,
            icon: <ExternalLink className="h-3.5 w-3.5" />,
            onSelect: () => {
              window.open(roomHref, '_blank', 'noopener,noreferrer');
            },
          }]
        : []),
    ];
  }, [m, onSelect, onOpenTarget, onOpenReport, onOpenWriteup]);

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => onEngageTarget(m.id)}
        className={`inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          isActiveTarget ? 'border-accent bg-accent-muted text-accent' : 'border-subtle bg-surface-sunken text-secondary hover:border-strong hover:text-primary'
        }`}
        title={isActiveTarget ? 'Currently engaged target' : 'Engage target and start timer'}
        aria-label={isActiveTarget ? `Currently engaged target: ${m.name}` : `Engage target ${m.name} and start timer`}
      >
        <Crosshair className="h-3 w-3" aria-hidden="true" />
        {isActiveTarget ? 'Engaged' : 'Engage'}
      </button>
      <OverflowMenu
        portal
        items={items}
        label={`More actions for ${m.name}`}
        triggerContent={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
        triggerClassName={`${ICON_BTN} aria-expanded:bg-surface-hover aria-expanded:text-primary`}
      />
    </div>
  );
};

const FlagButtons: React.FC<Pick<TableRowProps, 'machine' | 'onToggleUserFlag' | 'onToggleRootFlag'> & { full?: boolean }> = ({
  full = false,
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
        title="User flag"
        aria-label={hasUser ? `Toggle user flag for ${m.name} (currently captured)` : `Toggle user flag for ${m.name} (currently pending)`}
      >
        <Flag className="w-2.5 h-2.5" /> <span>{full ? 'User' : <>U<span className="hidden xl:inline">ser</span></>}</span>
      </button>
      <button
        type="button"
        onClick={() => onToggleRootFlag(m.id, hasRoot)}
        className={flagBtnClass(hasRoot, 'success')}
        title="Root flag"
        aria-label={hasRoot ? `Toggle root flag for ${m.name} (currently captured)` : `Toggle root flag for ${m.name} (currently pending)`}
      >
        <Flag className="w-2.5 h-2.5" /> <span>{full ? 'Root' : <>R<span className="hidden xl:inline">oot</span></>}</span>
      </button>
    </div>
  );
};

const TableRow = React.memo<TableRowProps>(({
  machine: m,
  isActiveTarget,
  soundEnabled,
  isChecked = false,
  onToggleCheck,
  onSelect,
  onStatusChange,
  onToggleUserFlag,
  onToggleRootFlag,
  onEngageTarget,
  onOpenTarget,
  onOpenReport,
  onOpenWriteup,
}) => {
  const stickyCellBg = isActiveTarget
    ? 'bg-[color-mix(in_srgb,rgb(var(--border-accent))_15%,rgb(var(--surface-card)))] group-hover:bg-surface-hover'
    : isChecked
      ? 'bg-surface-sunken group-hover:bg-surface-hover'
      : 'bg-surface-card group-hover:bg-surface-hover';

  return (
    <tr
      className={`interactive-surface hover:bg-surface-hover transition-colors group cursor-pointer border-b border-subtle ${
        isActiveTarget ? 'bg-accent-muted border-l-2 border-l-accent' : isChecked ? 'bg-surface-sunken' : 'bg-surface-card'
      }`}
      onClick={() => onSelect(m.id)}
    >
      {/* Bulk select */}
      <td className={`sticky left-0 z-[1] ${stickyCellBg} py-2.5 pl-4 pr-0 w-10`} onClick={(e) => e.stopPropagation()}>
        <label className={CHECK_CELL}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            onClick={(e) => onToggleCheck?.(m.id, e.shiftKey)}
            className={CHECKBOX_CLASS}
            aria-label={`Select ${m.name}`}
          />
          <span aria-hidden="true" className={CHECKBOX_BOX}><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
        </label>
      </td>

      {/* Target name & IP */}
      <td className={`sticky left-10 z-[1] ${stickyCellBg} border-r border-subtle/60 py-2.5 px-3`}>
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
              <div className="mt-0.5 text-xs font-mono text-muted">HTB ToS Protected</div>
            ) : (
              <CardIpBadge machineId={m.id} initialIp={m.ip} size="xs" plain className="mt-0.5 tabular-nums font-mono text-xs" />
            )}
          </div>
        </div>
      </td>

      {/* Platform */}
      <td className="py-2.5 px-2 max-[1535px]:hidden">
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
              <span key="cat" className="max-[1535px]:hidden"><CategoryBadge machine={m} size="xs" /></span>,
            ]}
            max={2}
          />
        )}
      </td>

      {/* Difficulty */}
      <td className="py-2.5 px-2 min-w-[112px] whitespace-nowrap">
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
      <td className="py-2.5 px-2" onClick={(e) => e.stopPropagation()}>
        {m.isActive ? (
          <span className="text-xs text-muted flex items-center gap-1 font-mono">
            <Lock className="w-3 h-3 text-callout-warn-fg" /> Protected
          </span>
        ) : (
          <FlagButtons machine={m} onToggleUserFlag={onToggleUserFlag} onToggleRootFlag={onToggleRootFlag} />
        )}
      </td>

      {/* Time */}
      <td className="py-2.5 px-2 min-w-[88px] whitespace-nowrap max-[1099px]:hidden">
        <span className="text-secondary font-mono tabular-nums text-xs">{formatSeconds(m.timeSpentSeconds)}</span>
      </td>

      {/* Tracks */}
      <td className="py-2.5 px-2 max-[1535px]:hidden">
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
      <td className={`sticky right-0 z-[1] ${stickyCellBg} border-l border-subtle/60 py-2.5 px-4 text-right pr-4 whitespace-nowrap min-w-[136px]`} onClick={(e) => e.stopPropagation()}>
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

const HEADERS: { label: string; field?: SortField; className: string }[] = [
  { label: 'Target', field: 'name', className: 'sticky left-10 z-20 bg-surface-base py-3 px-3' },
  { label: 'Platform', field: 'platform', className: 'py-3 px-2 min-w-[96px] whitespace-nowrap max-[1535px]:hidden' },
  { label: 'OS', field: 'os', className: 'py-3 px-2 min-w-[110px] whitespace-nowrap' },
  { label: 'Difficulty', field: 'difficulty', className: 'py-3 px-2 min-w-[112px] whitespace-nowrap' },
  { label: 'Status', field: 'status', className: 'py-3 px-2 min-w-[112px] whitespace-nowrap' },
  { label: 'Flags', className: 'py-3 px-2' },
  { label: 'Time', field: 'timeSpentSeconds', className: 'py-3 px-2 min-w-[88px] whitespace-nowrap max-[1099px]:hidden' },
  { label: 'Tracks', className: 'py-3 px-2 max-[1535px]:hidden' },
  { label: 'Actions', className: 'sticky right-0 z-20 bg-surface-base border-l border-subtle/60 py-3 px-4 text-right pr-4 whitespace-nowrap min-w-[136px]' },
];

export const TableView: React.FC<TableViewProps> = ({ filteredMachines }) => {
  const navigate = useNavigate();
  const {
    setSelectedMachineId,
    updateMachineStatus,
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
      updateMachineStatus: s.updateMachineStatus,
      activeTargetId: s.activeTargetId,
      setWriteupMachineId: s.setWriteupMachineId,
      setActiveTab: s.setActiveTab,
      soundEnabled: s.soundEnabled,
      toggleUserFlag: s.toggleUserFlag,
      toggleRootFlag: s.toggleRootFlag,
      setReportMachineId: s.setReportMachineId,
    }))
  );

  const isBelowSm = useMediaQuery(PHONE_QUERY);
  const [sortKeys, setSortKeys] = useState<SortKey<SortField>[]>([]);

  /** Plain click = primary sort only; shift+click = add / flip / remove a secondary key. */
  const handleSort = useCallback((field: SortField, additive: boolean) => {
    setSortKeys((prev) => nextSortKeys(prev, field, additive));
  }, []);

  // Comparator is rebuilt only when the keys change, never per render or per row.
  const sortedMachines = useMemo(
    () => (sortKeys.length === 0 ? filteredMachines : sortByKeys<Machine, SortField>(filteredMachines, sortKeys)),
    [filteredMachines, sortKeys],
  );

  // ---- Bulk selection -------------------------------------------------------
  const { updateMachine, deleteMachine } = useCtfStore(
    useShallow((s) => ({ updateMachine: s.updateMachine, deleteMachine: s.deleteMachine }))
  );
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [announcement, setAnnouncement] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const anchorRef = useRef<string | null>(null);
  const orderedIdsRef = useRef<string[]>([]);
  orderedIdsRef.current = useMemo(() => sortedMachines.map((m) => m.id), [sortedMachines]);

  const clearSelection = useCallback(() => {
    anchorRef.current = null;
    setSelectedIds((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  // Selection belongs to the current filter result: when the set of visible rows changes, drop it.
  const visibleSignature = useMemo(() => filteredMachines.map((m) => m.id).join('|'), [filteredMachines]);
  useEffect(() => {
    clearSelection();
  }, [visibleSignature, clearSelection]);

  const handleToggleCheck = useCallback((id: string, shift: boolean) => {
    setSelectedIds((prev) => {
      const r = applySelectionClick(prev, orderedIdsRef.current, anchorRef.current, id, shift);
      anchorRef.current = r.anchor;
      return r.selected;
    });
  }, []);

  const allSelected = sortedMachines.length > 0 && selectedIds.size === sortedMachines.length;
  const someSelected = selectedIds.size > 0 && !allSelected;
  const handleToggleAll = useCallback(() => {
    anchorRef.current = null;
    setSelectedIds((prev) => (prev.size === orderedIdsRef.current.length ? new Set() : new Set(orderedIdsRef.current)));
  }, []);
  const selectAllRef = useCallback(
    (el: HTMLInputElement | null) => {
      if (el) el.indeterminate = someSelected;
    },
    [someSelected],
  );

  // Esc clears the selection unless something else (dialog, open listbox, text field, detail modal) owns it.
  const hasSelection = selectedIds.size > 0;
  useEffect(() => {
    if (!hasSelection) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (useConfirmStore.getState().pending || useCtfStore.getState().selectedMachineId) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('input[type="text"], textarea, [aria-expanded="true"], [role="listbox"]')) return;
      clearSelection();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasSelection, clearSelection]);

  const selectedMachines = useMemo(
    () => (selectedIds.size === 0 ? [] : sortedMachines.filter((m) => selectedIds.has(m.id))),
    [sortedMachines, selectedIds],
  );
  const removableTagOptions = useMemo<CyberSelectOption<string>[]>(() => {
    const counts = new Map<string, number>();
    for (const m of selectedMachines) for (const t of m.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tag, n]) => ({ value: tag, label: `${tag} (${n})` }));
  }, [selectedMachines]);

  const handleBulkStatus = useCallback(
    (status: PipelineStatus) => {
      const ids = [...selectedIds];
      if (ids.length === 0) return;
      const known = useCtfStore.getState().machines;
      const anyNewRoot = ids.some((id) => entersRootStage(known.find((m) => m.id === id)?.status, status));
      ids.forEach((id) => updateMachineStatus(id, status));
      if (status === 'root' || status === 'completed') {
        if (anyNewRoot) triggerRootCelebration();
        if (soundEnabled) playCyberSound('root');
      }
      const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
      setAnnouncement(`${ids.length} ${ids.length === 1 ? 'target' : 'targets'} set to ${label}`);
    },
    [selectedIds, updateMachineStatus, soundEnabled],
  );

  const handleBulkAddTag = useCallback(() => {
    const tag = tagDraft.trim();
    if (!tag || selectedIds.size === 0) return;
    const byId = new Map(useCtfStore.getState().machines.map((m) => [m.id, m]));
    let touched = 0;
    selectedIds.forEach((id) => {
      const m = byId.get(id);
      if (m && !m.tags.includes(tag)) {
        updateMachine(id, { tags: [...m.tags, tag] });
        touched++;
      }
    });
    setTagDraft('');
    setAnnouncement(`Tag ${tag} added to ${touched} ${touched === 1 ? 'target' : 'targets'}`);
  }, [tagDraft, selectedIds, updateMachine]);

  const handleBulkRemoveTag = useCallback(
    (tag: string) => {
      const byId = new Map(useCtfStore.getState().machines.map((m) => [m.id, m]));
      let touched = 0;
      selectedIds.forEach((id) => {
        const m = byId.get(id);
        if (m && m.tags.includes(tag)) {
          updateMachine(id, { tags: m.tags.filter((t) => t !== tag) });
          touched++;
        }
      });
      setAnnouncement(`Tag ${tag} removed from ${touched} ${touched === 1 ? 'target' : 'targets'}`);
    },
    [selectedIds, updateMachine],
  );

  const handleBulkDelete = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const ok = await confirmAction({
      title: `Delete ${ids.length} ${ids.length === 1 ? 'target' : 'targets'}?`,
      body: 'This permanently removes the selected targets and their saved data. This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    ids.forEach((id) => deleteMachine(id));
    clearSelection();
    setAnnouncement(`${ids.length} ${ids.length === 1 ? 'target' : 'targets'} deleted`);
  }, [selectedIds, deleteMachine, clearSelection]);

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
    const prevStatus = useCtfStore.getState().machines.find((m) => m.id === machineId)?.status;
    updateMachineStatus(machineId, newStatus);
    if (newStatus === 'root' || newStatus === 'completed') {
      if (entersRootStage(prevStatus, newStatus)) triggerRootCelebration();
      if (soundEnabled) playCyberSound('root');
    }
  }, [updateMachineStatus, soundEnabled]);

  const handleToggleRootFlag = useCallback((id: string, hasRoot: boolean) => {
    toggleRootFlag(id);
    if (!hasRoot) triggerRootCelebration();
  }, [toggleRootFlag]);

  const engage = useEngageTarget();
  const handleEngageTarget = useCallback((id: string) => engage(id), [engage]);

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
    isChecked: selectedIds.has(m.id),
    onToggleCheck: handleToggleCheck,
    onSelect: setSelectedMachineId,
    onStatusChange: handleStatusChange,
    onToggleUserFlag: toggleUserFlag,
    onToggleRootFlag: handleToggleRootFlag,
    onEngageTarget: handleEngageTarget,
    onOpenTarget: handleOpenTarget,
    onOpenReport: handleOpenReport,
    onOpenWriteup: handleOpenWriteup,
  });

  const bulkToolbar = hasSelection ? (

      <div
        role="toolbar"
        aria-label="Bulk actions for selected targets"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-subtle bg-surface-card px-4 py-2.5 text-xs font-sans surface-card-depth"
      >
        <span className="font-medium text-primary">
          <span className="font-mono tabular-nums">{selectedIds.size}</span> selected
        </span>

        <CyberSelect<string>
          value=""
          onChange={(v) => handleBulkStatus(v as PipelineStatus)}
          options={STATUS_OPTIONS}
          placeholder="Set status"
          ariaLabel="Set status for selected targets"
          size="xs"
          variant="hardware"
          soundEnabled={soundEnabled}
        />

        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            handleBulkAddTag();
          }}
        >
          <input
            type="text"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            maxLength={40}
            placeholder="New tag"
            aria-label="Tag to add to selected targets"
            className="h-6 w-28 rounded-sm border border-subtle bg-surface-sunken px-2 text-xs text-primary placeholder:text-muted focus:border-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40 [@media(pointer:coarse)]:h-11"
          />
          <CyberButton type="submit" size="xs" variant="secondary" iconLeft={<Plus className="h-3 w-3" />} disabled={!tagDraft.trim()} aria-label="Add tag to selected targets">
            Add tag
          </CyberButton>
        </form>

        <CyberSelect<string>
          value=""
          onChange={handleBulkRemoveTag}
          options={removableTagOptions}
          placeholder="Remove tag"
          ariaLabel="Remove tag from selected targets"
          size="xs"
          variant="hardware"
          disabled={removableTagOptions.length === 0}
          soundEnabled={soundEnabled}
        />

        <div className="ml-auto flex items-center gap-2">
          <CyberButton
            size="xs"
            variant="secondary"
            iconLeft={<Download className="h-3 w-3" />}
            onClick={() => {
              const picked = sortedMachines.filter((m) => selectedIds.has(m.id));
              downloadMachinesCsv(picked);
              if (soundEnabled) playCyberSound('export');
            }}
            aria-label={`Export ${selectedIds.size} selected targets to CSV`}
          >
            Export CSV
          </CyberButton>
          <CyberButton size="xs" variant="danger" iconLeft={<Trash2 className="h-3 w-3" />} onClick={handleBulkDelete} aria-label={`Delete ${selectedIds.size} selected targets`}>
            Delete
          </CyberButton>
          <CyberButton size="xs" variant="ghost" iconLeft={<X className="h-3 w-3" />} onClick={clearSelection} title="Clear selection (Esc)" aria-label="Clear selection">
            Clear
          </CyberButton>
        </div>
      </div>
  ) : null;

  const setAssignIpMachineId = useCtfStore((s) => s.setAssignIpMachineId);

  if (isBelowSm) {
    // Phones: a dense list (Target, Status, Flags, row menu) with the same sorting, selection and bulk actions.
    return (
      <div className="space-y-3">
        <div role="status" aria-live="polite" className="sr-only">{announcement}</div>
        {bulkToolbar}
        <React.Suspense fallback={<ViewSkeleton />}>
          <PhoneTargetTable
            machines={sortedMachines}
            activeTargetId={activeTargetId}
            soundEnabled={soundEnabled}
            sortKeys={sortKeys}
            onSort={handleSort}
            selectedIds={selectedIds}
            onToggleCheck={handleToggleCheck}
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleAll={handleToggleAll}
            onSelect={setSelectedMachineId}
            onStatusChange={handleStatusChange}
            onToggleUserFlag={toggleUserFlag}
            onToggleRootFlag={handleToggleRootFlag}
            onEngageTarget={handleEngageTarget}
            onOpenTarget={handleOpenTarget}
            onOpenReport={handleOpenReport}
            onOpenWriteup={handleOpenWriteup}
            onSetAssignIp={setAssignIpMachineId}
            onAnnounce={setAnnouncement}
          />
        </React.Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-3">
    <div role="status" aria-live="polite" className="sr-only">{announcement}</div>
    {bulkToolbar}
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={TACTICAL_SPRING}
      className="rounded-2xl border border-subtle bg-surface-card overflow-hidden text-xs pb-4 mb-20 surface-card-depth machined-edge"
    >
      <div
        ref={parentRef}
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll container must take focus so the keyboard can scroll it
        tabIndex={0}
        role="region"
        aria-label="Targets table, scrolls horizontally"
        className="overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <table className="w-full min-w-[900px] min-[1536px]:min-w-[1120px] text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-surface-base/95 backdrop-blur-sm border-b border-subtle text-xs text-muted font-sans font-semibold machined-edge">
            <tr>
              <th className="sticky left-0 z-20 bg-surface-base py-3 pl-4 pr-0 w-10">
                <label className={CHECK_CELL}>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleToggleAll}
                    disabled={sortedMachines.length === 0}
                    className={CHECKBOX_CLASS}
                    aria-label={`Select all ${sortedMachines.length} filtered targets`}
                  />
                  <span aria-hidden="true" className={CHECKBOX_BOX}><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
                </label>
              </th>
              {HEADERS.map((h) => {
                if (!h.field) return <th key={h.label} className={h.className}>{h.label}</th>;
                const field = h.field;
                const idx = sortKeys.findIndex((k) => k.field === field);
                const key = idx >= 0 ? sortKeys[idx] : null;
                const ariaSort = idx === 0 && key ? (key.dir === 'asc' ? 'ascending' : 'descending') : 'none';
                const state = key
                  ? `, ${key.dir === 'asc' ? 'ascending' : 'descending'}${sortKeys.length > 1 ? `, priority ${idx + 1}` : ''}`
                  : '';
                const Icon = key ? (key.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th key={h.label} className={`${h.className} transition-colors`} aria-sort={ariaSort}>
                    <button
                      type="button"
                      onClick={(e) => handleSort(field, e.shiftKey)}
                      title="Click to sort. Shift+click to add or change a secondary sort."
                      aria-label={`Sort by ${h.label}${state}`}
                      className={`group flex min-h-6 cursor-pointer items-center gap-1.5 rounded-sm font-semibold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${key ? 'text-primary' : ''}`}
                    >
                      <span>{h.label}</span>
                      <Icon className={`w-3 h-3 transition-colors group-hover:text-primary ${key ? 'text-accent' : 'text-tertiary'}`} aria-hidden="true" />
                      {key && sortKeys.length > 1 && (
                        <span aria-hidden="true" className="font-mono text-xs tabular-nums text-accent">{idx + 1}</span>
                      )}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} colSpan={10} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const m = sortedMachines[virtualRow.index];
              if (!m) return null;
              return <TableRow key={m.id} {...rowProps(m)} />;
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} colSpan={10} />
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
          <span className="font-mono">j</span>/<span className="font-mono">k</span> move between rows · <span className="font-mono">Space</span> open details · <span className="font-mono">Shift</span>+click a header to add a second sort, or a checkbox to select a range
        </div>
      </div>
    </m.div>
    </div>
  );
};

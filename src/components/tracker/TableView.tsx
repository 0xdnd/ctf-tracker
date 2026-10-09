import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { CyberButton } from '../common/CyberButton';
import { confirmAction, useConfirmStore } from '../../store/useConfirmStore';
import { SortKey, nextSortKeys, sortByKeys, applySelectionClick } from '../../utils/tableSort';

interface TableViewProps {
  filteredMachines: Machine[];
}

type SortField = 'name' | 'platform' | 'os' | 'difficulty' | 'status' | 'timeSpentSeconds';

const CHECKBOX_CLASS =
  'h-3.5 w-3.5 rounded border-strong text-accent bg-surface-card cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

const CHECK_CELL =
  'flex h-8 w-8 cursor-pointer items-center justify-center [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11';

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
  return (
    <tr
      className={`interactive-surface hover:bg-surface-hover transition-colors group cursor-pointer border-b border-subtle ${
        isActiveTarget ? 'bg-accent-muted border-l-2 border-l-accent' : isChecked ? 'bg-surface-sunken' : ''
      }`}
      onClick={() => onSelect(m.id)}
    >
      {/* Bulk select */}
      <td className="py-2.5 pl-4 pr-0 w-10" onClick={(e) => e.stopPropagation()}>
        <label className={CHECK_CELL}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            onClick={(e) => onToggleCheck?.(m.id, e.shiftKey)}
            className={CHECKBOX_CLASS}
            aria-label={`Select ${m.name}`}
          />
        </label>
      </td>

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
  const [sortKeys, setSortKeys] = useState<SortKey<SortField>[]>([]);
  const [mobileVisible, setMobileVisible] = useState(30);

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
      ids.forEach((id) => updateMachineStatus(id, status));
      if (status === 'root' || status === 'completed') {
        triggerRootCelebration();
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
    <div className="space-y-3">
    <div role="status" aria-live="polite" className="sr-only">{announcement}</div>
    {hasSelection && (
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
          <CyberButton size="xs" variant="danger" iconLeft={<Trash2 className="h-3 w-3" />} onClick={handleBulkDelete} aria-label={`Delete ${selectedIds.size} selected targets`}>
            Delete
          </CyberButton>
          <CyberButton size="xs" variant="ghost" iconLeft={<X className="h-3 w-3" />} onClick={clearSelection} title="Clear selection (Esc)" aria-label="Clear selection">
            Clear
          </CyberButton>
        </div>
      </div>
    )}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TACTICAL_SPRING}
      className="rounded-2xl border border-subtle bg-surface-card overflow-hidden text-xs pb-4 surface-card-depth machined-edge"
    >
      <div ref={parentRef} className="overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto">
        <table className="w-full text-left border-collapse min-w-[1120px]">
          <thead className="sticky top-0 z-10 bg-surface-base/95 backdrop-blur-sm border-b border-subtle text-xs text-muted font-sans font-semibold machined-edge">
            <tr>
              <th className="py-3 pl-4 pr-0 w-10">
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
                      className={`group flex cursor-pointer items-center gap-1.5 rounded-sm font-semibold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${key ? 'text-primary' : ''}`}
                    >
                      <span>{h.label}</span>
                      <Icon className={`w-3 h-3 transition-colors group-hover:text-primary ${key ? 'text-accent' : 'text-muted/70'}`} aria-hidden="true" />
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
          <span className="font-mono">j/k</span> navigate · <span className="font-mono">space</span> inspect · <span className="font-mono">shift+click</span> header multi-sort or checkbox range
        </div>
      </div>
    </motion.div>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, MoreHorizontal } from 'lucide-react';
import type { Machine, PipelineStatus } from '../../types';
import type { SortKey } from '../../utils/tableSort';
import { STAGE_SHORT_LABEL } from '../../utils/pipeline';
import { OverflowMenu } from '../common/OverflowMenu';
import { buildTargetMenuItems } from './targetMenuItems';
import { FlagPill } from './FlagPill';
import { CompactIp } from './CompactIp';
import { CHECKBOX_BOX, CHECKBOX_CLASS, CHECK_CELL, STATUS_DOT, type SortField } from './tableShared';

/** Rows mounted at first, and the size of each "show more" step. */
const PAGE = 40;

export interface PhoneTargetTableProps {
  machines: Machine[];
  activeTargetId: string | null;
  soundEnabled: boolean;
  sortKeys: SortKey<SortField>[];
  onSort: (field: SortField, additive: boolean) => void;
  selectedIds: ReadonlySet<string>;
  onToggleCheck: (id: string, shift: boolean) => void;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  onSelect: (id: string) => void;
  onStatusChange: (status: PipelineStatus, id: string) => void;
  onToggleUserFlag: (id: string) => void;
  onToggleRootFlag: (id: string, hasRoot: boolean) => void;
  onEngageTarget: (id: string) => void;
  onOpenTarget: (id: string) => void;
  onOpenReport: (id: string) => void;
  onOpenWriteup: (id: string) => void;
  onSetAssignIp: (id: string | null) => void;
  /** Spoken (polite) after a menu action that has no visible result, such as copying a link. */
  onAnnounce: (msg: string) => void;
}

interface RowProps extends Omit<PhoneTargetTableProps, 'machines' | 'sortKeys' | 'onSort' | 'selectedIds' | 'allSelected' | 'someSelected' | 'onToggleAll' | 'activeTargetId'> {
  machine: Machine;
  isActiveTarget: boolean;
  isChecked: boolean;
}

const noopHint = () => undefined;

const PhoneRow = React.memo<RowProps>(({
  machine: m,
  isActiveTarget,
  isChecked,
  soundEnabled,
  onToggleCheck,
  onSelect,
  onStatusChange,
  onToggleUserFlag,
  onToggleRootFlag,
  onEngageTarget,
  onOpenTarget,
  onOpenReport,
  onOpenWriteup,
  onSetAssignIp,
  onAnnounce,
}) => {
  const items = buildTargetMenuItems(
    m,
    {
      onToggleHint: noopHint,
      onSelectMachine: onSelect,
      onEngageTarget,
      onSetIp: onSetAssignIp,
      onOpenDetail: onOpenTarget,
      onOpenReport,
      onOpenWriteup,
      onStatusChange: (id, status) => onStatusChange(status, id),
      onToggleUserFlag,
      onToggleRootFlag,
      onShareResult: (ok) => onAnnounce(ok ? 'Link copied' : 'Could not copy link'),
    },
    { isHintRevealed: false, soundEnabled, phone: { isActiveTarget }, showHint: false },
  );
  const rowBg = isActiveTarget ? 'bg-accent-muted' : isChecked ? 'bg-surface-sunken' : 'bg-surface-card';
  return (
    <tr
      onClick={() => onSelect(m.id)}
      className={`cursor-pointer border-b border-subtle last:border-b-0 ${rowBg} ${isActiveTarget ? 'shadow-[inset_2px_0_0_rgb(var(--border-accent))]' : ''}`}
    >
      <td className="w-9 py-1 pl-2 pr-0" onClick={(e) => e.stopPropagation()}>
        <label className={CHECK_CELL}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            onClick={(e) => onToggleCheck(m.id, e.shiftKey)}
            className={CHECKBOX_CLASS}
            aria-label={`Select ${m.name}`}
          />
          <span aria-hidden="true" className={CHECKBOX_BOX}><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
        </label>
      </td>
      <td className="min-w-0 py-1.5 pl-1 pr-2">
        <div className="truncate font-sans text-sm font-semibold leading-5 text-primary">{m.name}</div>
        <div role="presentation" onClick={(e) => e.stopPropagation()} className="leading-4">
          <CompactIp machine={m} soundEnabled={soundEnabled} onSetAssignIp={onSetAssignIp} onNote={onAnnounce} />
        </div>
      </td>
      <td className="whitespace-nowrap px-1 py-1.5 font-sans text-xs text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[m.status] ?? STATUS_DOT.backlog}`} />
          {STAGE_SHORT_LABEL[m.status] ?? m.status}
        </span>
      </td>
      <td className="px-1 py-1" onClick={(e) => e.stopPropagation()}>
        {m.isActive ? (
          <span className="font-mono text-xs text-muted">-</span>
        ) : (
          <FlagPill machine={m} onToggleUserFlag={onToggleUserFlag} onToggleRootFlag={onToggleRootFlag} />
        )}
      </td>
      <td className="w-9 py-1 pl-0 pr-1.5 text-right" onClick={(e) => e.stopPropagation()}>
        <OverflowMenu
          portal
          items={items}
          label={`More actions for ${m.name}`}
          triggerContent={<MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
          triggerClassName="tap-target-sm inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-primary active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent aria-expanded:bg-surface-hover aria-expanded:text-primary"
        />
      </td>
    </tr>
  );
});
PhoneRow.displayName = 'PhoneRow';

/**
 * Phone table: a dense list with Target (name over a mono IP), Status, Flags and a row menu. The header sticks while
 * the page scrolls and sorts by Target or Status; the checkbox column feeds the same bulk actions as the desktop table.
 * It fits 375px without sideways scrolling.
 */
export const PhoneTargetTable: React.FC<PhoneTargetTableProps> = ({
  machines,
  activeTargetId,
  sortKeys,
  onSort,
  selectedIds,
  allSelected,
  someSelected,
  onToggleAll,
  ...rowHandlers
}) => {
  const [visible, setVisible] = useState(PAGE);
  const shown = useMemo(() => machines.slice(0, visible), [machines, visible]);
  const selectAllRef = (el: HTMLInputElement | null) => {
    if (el) el.indeterminate = someSelected;
  };

  const sortHead = (field: SortField, label: string) => {
    const idx = sortKeys.findIndex((k) => k.field === field);
    const key = idx >= 0 ? sortKeys[idx] : null;
    const state = key ? `, ${key.dir === 'asc' ? 'ascending' : 'descending'}${sortKeys.length > 1 ? `, priority ${idx + 1}` : ''}` : '';
    const Icon = key ? (key.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <button
        type="button"
        onClick={(e) => onSort(field, e.shiftKey)}
        aria-label={`Sort by ${label}${state}`}
        className={`tap-target-sm group flex min-h-6 cursor-pointer items-center gap-1 rounded-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${key ? 'text-primary' : ''}`}
      >
        <span>{label}</span>
        <Icon className={`h-3 w-3 ${key ? 'text-accent' : 'text-tertiary'}`} aria-hidden="true" />
      </button>
    );
  };
  const sortState = (field: SortField): React.AriaAttributes['aria-sort'] => {
    const idx = sortKeys.findIndex((k) => k.field === field);
    const key = idx === 0 ? sortKeys[0] : null;
    return key ? (key.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  };

  return (
    <div data-testid="table-compact" className="mb-24 rounded-xl border border-subtle bg-surface-card font-sans surface-card-depth">
      <table className="w-full table-fixed border-collapse text-left">
        <colgroup>
          <col className="w-9" />
          <col />
          <col className="w-[5.25rem]" />
          <col className="w-[4.5rem]" />
          <col className="w-9" />
        </colgroup>
        <thead className="sticky top-0 z-10 border-b border-subtle bg-surface-base text-xs font-semibold text-muted">
          <tr>
            <th className="rounded-tl-xl py-1.5 pl-2 pr-0">
              <label className={CHECK_CELL}>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  disabled={machines.length === 0}
                  className={CHECKBOX_CLASS}
                  aria-label={`Select all ${machines.length} filtered targets`}
                />
                <span aria-hidden="true" className={CHECKBOX_BOX}><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
              </label>
            </th>
            <th className="py-1.5 pl-1 pr-2 font-semibold" aria-sort={sortState('name')}>{sortHead('name', 'Target')}</th>
            <th className="px-1 py-1.5 font-semibold" aria-sort={sortState('status')}>{sortHead('status', 'Status')}</th>
            <th className="px-1 py-1.5 font-semibold">Flags</th>
            <th className="rounded-tr-xl py-1.5 pl-0 pr-1.5 text-right font-semibold"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {shown.map((m) => (
            <PhoneRow
              key={m.id}
              machine={m}
              isActiveTarget={activeTargetId === m.id}
              isChecked={selectedIds.has(m.id)}
              {...rowHandlers}
            />
          ))}
        </tbody>
      </table>
      <div className="flex items-center justify-between gap-2 border-t border-subtle px-3 py-2 text-xs text-muted">
        <span>
          <span className="font-mono font-medium tabular-nums text-primary">{Math.min(visible, machines.length)}</span> of{' '}
          <span className="font-mono tabular-nums">{machines.length}</span> targets
        </span>
        {machines.length > visible && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE)}
            className="min-h-11 cursor-pointer rounded-lg border border-subtle bg-surface-sunken px-3 text-xs font-medium text-secondary transition-colors hover:text-primary active:scale-[0.97]"
          >
            Show {Math.min(PAGE, machines.length - visible)} more
          </button>
        )}
      </div>
    </div>
  );
};

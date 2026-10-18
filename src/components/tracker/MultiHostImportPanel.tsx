import React, { useMemo, useState } from 'react';
import { Layers, Plus, X } from 'lucide-react';
import { Machine } from '../../types';
import { ParsedHost } from '../../utils/scanParserUtils';
import { hostAddress, normalizeAddress } from '../../utils/scanCardHelper';
import { CyberButton } from '../common/CyberButton';

interface MultiHostImportPanelProps {
  hosts: ParsedHost[];
  existingMachines: Pick<Machine, 'name' | 'ip'>[];
  soundEnabled?: boolean;
  onCreate: (selectedHosts: ParsedHost[]) => void;
  onApplyFirstHost: () => void;
  onCancel: () => void;
}

/**
 * Lets the operator pick which hosts of a multi-host scan become new targets.
 * Hosts whose IP is already tracked (or repeated within the scan) are flagged and not selectable.
 */
export const MultiHostImportPanel: React.FC<MultiHostImportPanelProps> = ({
  hosts,
  existingMachines,
  soundEnabled,
  onCreate,
  onApplyFirstHost,
  onCancel,
}) => {
  // Per host: reason it cannot be created, or null when it is a new host.
  const flags = useMemo(() => {
    const existingByIp = new Map(existingMachines.map((m) => [normalizeAddress(m.ip), m.name]));
    const seen = new Set<string>();
    return hosts.map((h) => {
      const key = normalizeAddress(hostAddress(h));
      if (key && existingByIp.has(key)) return `Already tracked as ${existingByIp.get(key)}`;
      if (key && seen.has(key)) return 'Duplicate in scan';
      if (key) seen.add(key);
      return null;
    });
  }, [hosts, existingMachines]);

  const selectableIdx = useMemo(
    () => hosts.map((_, i) => i).filter((i) => flags[i] === null),
    [hosts, flags]
  );
  const [selected, setSelected] = useState<Set<number>>(() => new Set(selectableIdx));

  const allSelected = selectableIdx.length > 0 && selectableIdx.every((i) => selected.has(i));
  const someSelected = selectableIdx.some((i) => selected.has(i));

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectableIdx));

  const selectedCount = selectableIdx.filter((i) => selected.has(i)).length;

  return (
    <section
      aria-labelledby="multi-host-heading"
      className="p-3 sm:p-4 rounded-xl border border-callout-info-border bg-surface-card space-y-3"
    >
      <div className="flex items-start gap-2.5">
        <Layers className="w-4 h-4 mt-0.5 text-callout-info-fg shrink-0" />
        <div>
          <h4 id="multi-host-heading" className="text-sm font-semibold text-primary">
            {hosts.length} hosts found in this scan
          </h4>
          <p className="text-xs text-muted">
            Choose which hosts to add as new targets, or apply only the first host to the current target.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-secondary cursor-pointer select-none">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected && !allSelected;
          }}
          disabled={selectableIdx.length === 0}
          onChange={toggleAll}
          className="w-3.5 h-3.5 rounded border-strong text-accent focus-visible:ring-2 focus-visible:ring-accent/50 bg-surface-card cursor-pointer"
        />
        <span>Select all new hosts ({selectableIdx.length})</span>
      </label>

      <ul className="divide-y divide-subtle/40 rounded-lg border border-subtle max-h-72 overflow-y-auto">
        {hosts.map((host, i) => {
          const flag = flags[i];
          const inputId = `multi-host-${i}`;
          return (
            <li key={`${hostAddress(host)}-${i}`}>
              <label
                htmlFor={inputId}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs ${
                  flag ? 'opacity-70' : 'cursor-pointer hover:bg-surface-sunken/50'
                }`}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={flag === null && selected.has(i)}
                  disabled={flag !== null}
                  onChange={() => toggle(i)}
                  className="w-3.5 h-3.5 rounded border-strong text-accent focus-visible:ring-2 focus-visible:ring-accent/50 bg-surface-card cursor-pointer"
                />
                <span className="font-mono tabular-nums font-semibold text-callout-info-fg">
                  {host.ip || 'no-ip'}
                </span>
                <span className="text-secondary">{host.hostname || 'no hostname'}</span>
                <span className="text-muted">
                  {host.ports.length} open {host.ports.length === 1 ? 'port' : 'ports'}
                </span>
                <span className="text-muted">OS: {host.os || 'unknown'}</span>
                {flag && (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-callout-warn-bg text-callout-warn-fg border border-callout-warn-border">
                    {flag}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap justify-end gap-2">
        <CyberButton variant="ghost" size="sm" iconLeft={<X />} onClick={onCancel} soundEnabled={soundEnabled}>
          Cancel
        </CyberButton>
        <CyberButton variant="secondary" size="sm" onClick={onApplyFirstHost} soundEnabled={soundEnabled}>
          Apply first host to this target
        </CyberButton>
        <CyberButton
          variant="primary"
          size="sm"
          iconLeft={<Plus />}
          disabled={selectedCount === 0}
          soundType="root"
          soundEnabled={soundEnabled}
          onClick={() => onCreate(selectableIdx.filter((i) => selected.has(i)).map((i) => hosts[i]))}
        >
          Create {selectedCount} {selectedCount === 1 ? 'target' : 'targets'}
        </CyberButton>
      </div>
    </section>
  );
};

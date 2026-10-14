import React, { useMemo, useRef, useState } from 'react';
import { FileUp, Plus, RefreshCw } from 'lucide-react';
import { Modal } from '../common/Modal';
import { CyberButton } from '../common/CyberButton';
import { Machine, TargetServicePort } from '../../types';
import { ParsedMultiHost, parseMultiHostScan } from '../../utils/scanParserUtils';
import {
  buildMachineDraftFromHost,
  deriveServiceTags,
  normalizeAddress,
  toTargetServices,
} from '../../utils/scanCardHelper';

export interface ImportPlanRow {
  record: ParsedMultiHost;
  action: 'create' | 'update';
  /** Existing machine this record merges into, for 'update'. */
  existing?: Pick<Machine, 'id' | 'name' | 'ip'>;
}

/** Decides per record whether it creates a target or updates the one already tracked at that IP. */
export function planMultiRecordImport(
  records: ParsedMultiHost[],
  machines: Pick<Machine, 'id' | 'name' | 'ip'>[],
): ImportPlanRow[] {
  const byIp = new Map<string, Pick<Machine, 'id' | 'name' | 'ip'>>();
  for (const m of machines) {
    const key = normalizeAddress(m.ip);
    if (key && !byIp.has(key)) byIp.set(key, m);
  }
  return records.map((record) => {
    const existing = byIp.get(normalizeAddress(record.ip));
    return existing ? { record, action: 'update', existing } : { record, action: 'create' };
  });
}

/** Ports of a record as a compact list, e.g. "22/tcp ssh, 80/tcp http". */
export const formatPortList = (record: ParsedMultiHost): string =>
  record.ports.map((p) => `${p.port}/${p.protocol}${p.service ? ` ${p.service}` : ''}`).join(', ');

/** Merges scanned services into the existing ones, keyed by port + protocol (scan wins). */
export function mergeServices(existing: TargetServicePort[] | undefined, incoming: TargetServicePort[]): TargetServicePort[] {
  const map = new Map<string, TargetServicePort>();
  for (const s of existing ?? []) map.set(`${s.port}/${s.protocol}`, s);
  for (const s of incoming) map.set(`${s.port}/${s.protocol}`, s);
  return [...map.values()].sort((a, b) => a.port - b.port);
}

interface PreviewTableProps {
  rows: ImportPlanRow[];
}

export const MultiRecordPreviewTable: React.FC<PreviewTableProps> = ({ rows }) => (
  <div className="rounded-lg border border-subtle overflow-auto max-h-72">
    <table className="w-full text-xs text-left">
      <caption className="sr-only">Records found in the pasted scan</caption>
      <thead className="bg-surface-sunken text-tertiary">
        <tr>
          <th scope="col" className="px-3 py-2 font-semibold">IP</th>
          <th scope="col" className="px-3 py-2 font-semibold">Hostname</th>
          <th scope="col" className="px-3 py-2 font-semibold">Ports</th>
          <th scope="col" className="px-3 py-2 font-semibold">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-subtle/40">
        {rows.map((row, i) => (
          <tr key={`${row.record.ip}-${i}`}>
            <td className="px-3 py-2 font-mono tabular-nums text-callout-info-fg">{row.record.ip || 'no-ip'}</td>
            <td className="px-3 py-2 text-secondary">{row.record.hostnames.join(', ') || 'none'}</td>
            <td className="px-3 py-2 font-mono text-muted">
              {row.record.ports.length === 0 ? 'none' : formatPortList(row.record)}
            </td>
            <td className="px-3 py-2 text-secondary">
              {row.action === 'update' ? `Update ${row.existing?.name ?? ''}` : 'Create'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

interface ModalProps {
  open: boolean;
  onClose: () => void;
  machines: Machine[];
  soundEnabled?: boolean;
  addCustomMachine: (m: Omit<Machine, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMachine: (id: string, updates: Partial<Machine>) => void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Paste or load a multi-host scan, preview every record with its ports, then create new targets
 * and merge ports into targets already tracked at the same IP. Targets are the graph's nodes, so
 * created records show up in the attack graph automatically.
 */
export const MultiRecordImportModal: React.FC<ModalProps> = ({
  open,
  onClose,
  machines,
  soundEnabled,
  addCustomMachine,
  updateMachine,
}) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(
    () => (text.trim() ? planMultiRecordImport(parseMultiHostScan(text), machines) : []),
    [text, machines],
  );

  const close = () => {
    setText('');
    setError(null);
    onClose();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError('File is larger than 5 MB.');
      return;
    }
    setError(null);
    setText(await file.text());
  };

  const confirm = () => {
    const usedNames = new Set(machines.map((m) => m.name.toLowerCase()));
    for (const row of rows) {
      const { record } = row;
      const host = { ip: record.ip, hostname: record.hostnames[0], os: record.os, ports: record.ports };
      if (row.action === 'update' && row.existing) {
        const current = machines.find((m) => m.id === row.existing!.id);
        const services = mergeServices(current?.services, toTargetServices(record.ports));
        updateMachine(row.existing.id, {
          services,
          openPorts: services.map((s) => s.port),
          tags: deriveServiceTags(current?.tags ?? [], services),
        });
      } else {
        addCustomMachine(buildMachineDraftFromHost(host, 'multi-host', usedNames));
      }
    }
    close();
  };

  const createCount = rows.filter((r) => r.action === 'create').length;
  const updateCount = rows.length - createCount;

  return (
    <Modal open={open} onClose={close} ariaLabel="Import multiple records" size="xl">
      <div className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-primary">Import multiple records</h2>
        <p className="text-xs text-muted">
          Paste Nmap, Rustscan or similar output covering several hosts, or load a file. New hosts become targets
          (and graph nodes); hosts already tracked at the same IP get their ports merged.
        </p>
        <textarea
          aria-label="Scan output"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="Paste scan output here"
          className="w-full p-2 rounded-lg bg-surface-card border border-subtle text-primary text-xs font-mono focus:outline-none focus:border-accent resize-y"
        />
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            aria-label="Scan file"
            accept=".txt,.xml,.nmap,.gnmap,.log"
            className="sr-only"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <CyberButton variant="secondary" size="sm" iconLeft={<FileUp />} onClick={() => fileRef.current?.click()} soundEnabled={soundEnabled}>
            Choose file
          </CyberButton>
          {error && <span role="alert" className="text-xs text-callout-danger-fg">{error}</span>}
        </div>

        {text.trim() && rows.length === 0 && (
          <p role="status" className="text-xs text-callout-warn-fg">No hosts found in this text.</p>
        )}
        {rows.length > 0 && (
          <>
            <p role="status" className="text-xs text-secondary">
              {rows.length} {rows.length === 1 ? 'record' : 'records'}: {createCount} to create, {updateCount} to update
            </p>
            <MultiRecordPreviewTable rows={rows} />
          </>
        )}

        <div className="flex justify-end gap-2">
          <CyberButton variant="ghost" size="sm" onClick={close} soundEnabled={soundEnabled}>Cancel</CyberButton>
          <CyberButton
            variant="primary"
            size="sm"
            iconLeft={updateCount > 0 && createCount === 0 ? <RefreshCw /> : <Plus />}
            disabled={rows.length === 0}
            soundType="root"
            soundEnabled={soundEnabled}
            onClick={confirm}
          >
            Import {rows.length} {rows.length === 1 ? 'record' : 'records'}
          </CyberButton>
        </div>
      </div>
    </Modal>
  );
};

import React from 'react';
import { ShieldAlert, AlertCircle, Crosshair, Ban, HelpCircle } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { Machine, PortTriageStatus } from '../../types';

interface PortTriageTableProps {
  machine: Machine;
  className?: string;
}

const TRIAGE_OPTIONS: { value: PortTriageStatus; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { value: 'untested', label: 'Untested', icon: HelpCircle, color: 'text-muted' },
  { value: 'checking', label: 'Checking', icon: AlertCircle, color: 'text-callout-info-fg' },
  { value: 'key_vector', label: 'Foothold / Key Vector', icon: Crosshair, color: 'text-callout-warn-fg' },
  { value: 'dead_end', label: 'Dead End', icon: Ban, color: 'text-callout-danger-fg' },
];

export const PortTriageTable: React.FC<PortTriageTableProps> = ({ machine, className = '' }) => {
  const setPortTriage = useCtfStore((s) => s.setPortTriage);

  // Compile ports list from services or openPorts (deduplicated by port/proto)
  const portsList = React.useMemo(() => {
    const seen = new Set<string>();
    const list: { port: number; protocol: string; service: string; version?: string }[] = [];
    if (machine.services && machine.services.length > 0) {
      for (const s of machine.services) {
        const proto = (s.protocol || 'tcp').toLowerCase();
        const key = `${s.port}/${proto}`;
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({
          port: s.port,
          protocol: proto,
          service: s.service || 'unknown',
          version: s.version,
        });
      }
    } else if (machine.openPorts && machine.openPorts.length > 0) {
      for (const p of machine.openPorts) {
        const key = `${p}/tcp`;
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({
          port: p,
          protocol: 'tcp',
          service: 'open',
        });
      }
    }
    return list.sort((a, b) => a.port - b.port || a.protocol.localeCompare(b.protocol));
  }, [machine.services, machine.openPorts]);

  if (portsList.length === 0) {
    return (
      <div className={`p-4 rounded-xl border border-subtle bg-surface-card text-center text-xs text-muted ${className}`}>
        No open ports recorded yet. Upload a scan or add ports to triage.
      </div>
    );
  }

  const triageMap = machine.portTriage || {};

  return (
    <div className={`rounded-xl border border-subtle bg-surface-card overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-subtle bg-surface-sunken/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-callout-info-fg" />
          <span className="text-xs font-semibold text-primary">Port Triage &amp; Attack Surface Analysis</span>
        </div>
        <span className="text-[11px] text-muted">{portsList.length} ports discovered</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-surface-sunken/40 text-muted border-b border-subtle">
            <tr>
              <th className="py-2.5 px-3.5 font-medium w-24">Port</th>
              <th className="py-2.5 px-3 font-medium w-36">Service / Version</th>
              <th className="py-2.5 px-3 font-medium w-44">Triage Status</th>
              <th className="py-2.5 px-3 font-medium">Triage Notes / Findings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle/40">
            {portsList.map((item) => {
              // Protocol-aware key: tcp/udp on the same port are independent triage rows.
              // The legacy numeric key is kept as a read fallback so old data stays visible.
              const key = `${item.port}/${(item.protocol || 'tcp').toLowerCase()}`;
              const triage = triageMap[key] || triageMap[String(item.port)] || { status: 'untested' };
              const currentStatus = triage.status || 'untested';
              const currentNote = triage.note || '';

              return (
                <tr key={`${item.port}-${item.protocol}`} className="hover:bg-surface-sunken/50 transition-colors">
                  <td className="py-2.5 px-3.5 font-mono tabular-nums font-semibold text-primary whitespace-nowrap">
                    {item.port}/{item.protocol}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-secondary">{item.service}</div>
                    {item.version && <div className="text-[11px] text-muted truncate max-w-[180px]">{item.version}</div>}
                  </td>
                  <td className="py-2.5 px-3">
                    <select
                      aria-label={`Triage status for port ${item.port}`}
                      value={currentStatus}
                      onChange={(e) =>
                        setPortTriage(machine.id, key, { status: e.target.value as PortTriageStatus })
                      }
                      className="h-7 px-2 rounded-lg border border-subtle bg-surface-sunken text-xs font-medium text-primary focus:border-accent focus:outline-none cursor-pointer"
                    >
                      {TRIAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 px-3">
                    <input
                      type="text"
                      aria-label={`Triage note for port ${item.port}`}
                      value={currentNote}
                      maxLength={500}
                      onChange={(e) => setPortTriage(machine.id, key, { note: e.target.value })}
                      placeholder="Add note (e.g. vulnerable vsftpd 2.3.4, sqli on login form)"
                      className="w-full h-7 px-2.5 rounded-lg border border-subtle bg-surface-sunken text-xs text-primary placeholder:text-muted/60 focus:border-accent focus:outline-none"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Check, 
  Terminal, 
  Sparkles, 
  HelpCircle, 
  XCircle, 
  UserCheck, 
  Crown,
  Key
} from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { Credential, Machine, LootVerificationStatus } from '../../types';
import { buildBatchLootVerificationCommand } from '../../utils/lootBatchUtils';
import { identifyHash } from '../../utils/hashIdentifier';
import { safeCopyToClipboard, playCyberSound } from '../../utils/helpers';
import { toast } from '../../store/useToastStore';

interface LootVerificationMatrixProps {
  credentials: Credential[];
  machines: Machine[];
  className?: string;
}

const STATUS_CYCLE: LootVerificationStatus[] = ['untested', 'failed', 'user', 'admin'];

const STATUS_CONFIG: Record<
  LootVerificationStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  untested: {
    label: 'Untested',
    bg: 'bg-surface-sunken',
    text: 'text-muted',
    border: 'border-subtle',
    icon: HelpCircle,
  },
  user: {
    label: 'User Auth',
    bg: 'bg-callout-success-bg',
    text: 'text-callout-success-fg',
    border: 'border-callout-success-border',
    icon: UserCheck,
  },
  admin: {
    label: 'Pwn3d! (Admin)',
    bg: 'bg-accent-muted',
    text: 'text-accent',
    border: 'border-accent/40',
    icon: Crown,
  },
  failed: {
    label: 'Failed',
    bg: 'bg-callout-danger-bg',
    text: 'text-callout-danger-fg',
    border: 'border-callout-danger-border',
    icon: XCircle,
  },
};

export const LootVerificationMatrix: React.FC<LootVerificationMatrixProps> = ({
  credentials,
  machines,
  className = '',
}) => {
  const setLootVerification = useCtfStore((s) => s.setLootVerification);
  const setGlobalVars = useCtfStore((s) => s.setGlobalVars);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Targets to display as columns (prefer active and in-progress/non-backlog labs, or at least machines with valid IPs)
  const targetLabs = React.useMemo(() => {
    const list = machines.filter((m) => m.ip && m.ip !== '0.0.0.0' && !m.ip.includes('x') && !m.ip.includes('X'));
    return list.slice(0, 12); // Keep table readable
  }, [machines]);

  const handleCycleStatus = (credId: string, machineId: string, currentStatus?: LootVerificationStatus) => {
    const curr = currentStatus || 'untested';
    const currIdx = STATUS_CYCLE.indexOf(curr);
    const nextStatus = STATUS_CYCLE[(currIdx + 1) % STATUS_CYCLE.length];

    setLootVerification(credId, machineId, { status: nextStatus, protocol: 'smb' });
    if (soundEnabled) playCyberSound('toggle');
  };

  const handleCopyBatchCommand = async (cred: Credential) => {
    // Untested host IPs for this credential
    const verifications = cred.verifications || {};
    const untestedIps = targetLabs
      .filter((m) => {
        const status = verifications[m.id]?.status || 'untested';
        return status === 'untested' || status === 'failed';
      })
      .map((m) => m.ip);

    const cmd = buildBatchLootVerificationCommand(
      cred.username,
      cred.secret,
      untestedIps.length > 0 ? untestedIps : targetLabs.map((m) => m.ip),
      { domain: cred.domain, protocol: 'smb' }
    );

    await safeCopyToClipboard(cmd);
    setCopiedKey(`batch-${cred.id}`);
    toast.success('Batch NetExec command copied');
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleUseInCheatsheet = (cred: Credential) => {
    setGlobalVars({
      user: cred.username,
      cred: cred.secret,
      domain: cred.domain || undefined,
    });
    toast.success(`HUD updated: USER=${cred.username}, CRED=${cred.secret.slice(0, 8)}...`);
    if (soundEnabled) playCyberSound('engage');
  };

  if (credentials.length === 0) {
    return (
      <div className={`p-8 text-center rounded-xl border border-subtle bg-surface-card text-muted text-xs ${className}`}>
        No credentials logged yet. Add passwords or hashes in the Vault to build the cross-host verification matrix.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span>Cross-Host Loot Verification Matrix</span>
          </h3>
          <p className="text-xs text-muted">
            Track credential reuse across active labs. Click any cell to cycle verification status (Untested &rarr; User &rarr; Admin/Pwn3d &rarr; Failed).
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-subtle bg-surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-sunken/60 text-muted border-b border-subtle">
              <tr>
                <th className="py-3 px-4 font-semibold w-64 min-w-[240px]">Principal / Secret</th>
                <th className="py-3 px-3 font-semibold w-36">Format &amp; Actions</th>
                {targetLabs.map((lab) => (
                  <th key={lab.id} className="py-3 px-3 font-semibold text-center min-w-[110px]">
                    <div className="font-semibold text-primary truncate max-w-[120px]">{lab.name}</div>
                    <div className="font-mono text-[10px] text-muted">{lab.ip}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/40">
              {credentials.map((cred) => {
                const hashCandidates = identifyHash(cred.secret);
                const topHash = hashCandidates[0];
                const isCopiedBatch = copiedKey === `batch-${cred.id}`;

                return (
                  <tr key={cred.id} className="hover:bg-surface-sunken/30 transition-colors">
                    {/* Principal / Secret */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-primary flex items-center gap-1.5 flex-wrap">
                        <span>{cred.domain ? `${cred.domain}\\${cred.username}` : cred.username}</span>
                        {cred.type === 'hash' && (
                          <span className="px-1.5 py-0.2 rounded bg-surface-sunken border border-subtle text-[10px] font-mono text-accent">
                            HASH
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[11px] text-muted truncate max-w-[220px] mt-0.5" title={cred.secret}>
                        {cred.secret}
                      </div>
                    </td>

                    {/* Format & Actions */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5">
                        {topHash && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-sunken border border-subtle text-[10px] font-mono text-secondary w-fit">
                            <Sparkles className="w-3 h-3 text-callout-warn-fg" />
                            <span>{topHash.name.split(' ')[0]}</span>
                            {topHash.hashcatMode !== null && (
                              <span className="text-muted">(-m {topHash.hashcatMode})</span>
                            )}
                          </span>
                        )}

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyBatchCommand(cred)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-sunken hover:bg-surface-hover border border-subtle text-[11px] text-secondary hover:text-primary transition-colors cursor-pointer"
                            title="Copy NetExec batch scan command across all target hosts"
                          >
                            {isCopiedBatch ? <Check className="w-3 h-3 text-callout-success-fg" /> : <Terminal className="w-3 h-3" />}
                            <span>{isCopiedBatch ? 'Copied' : 'Batch NXC'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUseInCheatsheet(cred)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-sunken hover:bg-surface-hover border border-subtle text-[11px] text-secondary hover:text-accent transition-colors cursor-pointer"
                            title="Load credentials into active HUD variables (USER, CRED, DOMAIN)"
                          >
                            <Key className="w-3 h-3" />
                            <span>Use in HUD</span>
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Machine Cells */}
                    {targetLabs.map((lab) => {
                      const verification = cred.verifications?.[lab.id];
                      const status = verification?.status || 'untested';
                      const config = STATUS_CONFIG[status];
                      const Icon = config.icon;

                      return (
                        <td key={lab.id} className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleCycleStatus(cred.id, lab.id, status)}
                            className={`w-full py-1 px-1.5 rounded-lg border text-[11px] font-medium transition-colors inline-flex items-center justify-center gap-1 cursor-pointer active:scale-[0.96] ${config.bg} ${config.text} ${config.border}`}
                            title={`Click to cycle status for ${lab.name} (Current: ${config.label})`}
                          >
                            <Icon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{config.label}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

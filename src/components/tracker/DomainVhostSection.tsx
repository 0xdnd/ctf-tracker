import React, { useState } from 'react';
import { Globe, Copy, Check, Plus, X } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { formatHostsLine } from '../../utils/hostsLine';
import { shellQuote } from '../../utils/shellEncoders';
import { safeCopyToClipboard, playCyberSound } from '../../utils/helpers';
import { Machine } from '../../types';

interface DomainVhostSectionProps {
  machine: Machine;
  className?: string;
}

export const DomainVhostSection: React.FC<DomainVhostSectionProps> = ({ machine, className = '' }) => {
  const setMachineDomain = useCtfStore((s) => s.setMachineDomain);
  const addMachineVhost = useCtfStore((s) => s.addMachineVhost);
  const removeMachineVhost = useCtfStore((s) => s.removeMachineVhost);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);

  const [newVhost, setNewVhost] = useState('');
  const [copiedHosts, setCopiedHosts] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const hostsLine = formatHostsLine(machine.ip, machine.domain, machine.vhosts);
  const hostsCmd = hostsLine ? `printf '%s\n' ${shellQuote(hostsLine)} | sudo tee -a /etc/hosts` : '';

  const handleCopyHostsLine = async () => {
    if (!hostsLine) return;
    await safeCopyToClipboard(hostsLine);
    setCopiedHosts(true);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedHosts(false), 2000);
  };

  const handleCopyHostsCmd = async () => {
    if (!hostsCmd) return;
    await safeCopyToClipboard(hostsCmd);
    setCopiedCmd(true);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const handleAddVhost = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newVhost.trim().toLowerCase();
    if (!clean) return;
    if (!(machine.vhosts || []).includes(clean)) {
      addMachineVhost(machine.id, clean);
      if (soundEnabled) playCyberSound('click');
    }
    setNewVhost('');
  };

  return (
    <div className={`p-4 rounded-xl border border-subtle bg-surface-card space-y-3.5 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-callout-info-fg" />
          <span className="text-xs font-semibold text-primary">Domain &amp; Virtual Hosts (VHosts)</span>
        </div>

        {hostsLine ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={handleCopyHostsCmd}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-sunken hover:bg-surface-hover border border-subtle text-xs font-medium text-secondary hover:text-accent transition-colors cursor-pointer active:scale-[0.97]"
              title="Copy sudo tee command to append to /etc/hosts"
            >
              {copiedCmd ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="font-mono text-[11px]">{copiedCmd ? 'Copied tee cmd' : 'Copy tee cmd'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyHostsLine}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-sunken hover:bg-surface-hover border border-subtle text-xs font-medium text-secondary hover:text-primary transition-colors cursor-pointer active:scale-[0.97]"
              title="Copy raw /etc/hosts line to clipboard"
            >
              {copiedHosts ? <Check className="w-3.5 h-3.5 text-callout-success-fg" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="font-mono text-[11px]">{copiedHosts ? 'Copied line' : 'Copy /etc/hosts line'}</span>
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Domain input */}
        <div className="space-y-1.5">
          <label htmlFor={`target-domain-${machine.id}`} className="text-xs font-medium text-secondary block">
            Target Domain FQDN
          </label>
          <input
            id={`target-domain-${machine.id}`}
            type="text"
            value={machine.domain || ''}
            onChange={(e) => setMachineDomain(machine.id, e.target.value)}
            placeholder="e.g. inlanefreight.htb or corp.local"
            className="w-full h-8 px-3 rounded-lg border border-subtle bg-surface-sunken text-xs font-mono text-primary placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>

        {/* Generated /etc/hosts preview snippet */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-secondary block">/etc/hosts snippet</span>
          <div className="h-8 px-3 rounded-lg border border-subtle bg-surface-sunken flex items-center font-mono text-xs text-muted truncate">
            {hostsLine || (
              <span className="text-muted/60 italic">Enter IP and domain to generate entry</span>
            )}
          </div>
        </div>
      </div>

      {/* VHosts tags */}
      <div className="space-y-2 pt-1 border-t border-subtle/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-secondary">Discovered Subdomains &amp; VHosts</span>
          <span className="text-[11px] text-muted">{(machine.vhosts || []).length} registered</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(machine.vhosts || []).map((vhost) => (
            <span
              key={vhost}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-sunken border border-subtle text-xs font-mono text-secondary"
            >
              <span>{vhost}</span>
              <button
                type="button"
                onClick={() => removeMachineVhost(machine.id, vhost)}
                className="text-muted hover:text-callout-danger-fg transition-colors p-0.5 cursor-pointer"
                title={`Remove ${vhost}`}
                aria-label={`Remove vhost ${vhost}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          <form onSubmit={handleAddVhost} className="inline-flex items-center gap-1">
            <input
              type="text"
              value={newVhost}
              onChange={(e) => setNewVhost(e.target.value)}
              placeholder="Add vhost (e.g. dev.target.htb)"
              className="h-7 px-2.5 rounded-md border border-subtle bg-surface-sunken text-xs font-mono text-primary placeholder:text-muted focus:border-accent focus:outline-none w-48"
            />
            <button
              type="submit"
              disabled={!newVhost.trim()}
              className="h-7 px-2 rounded-md bg-surface-card hover:bg-surface-hover border border-subtle text-xs font-medium text-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              title="Add virtual host"
            >
              <Plus className="w-3 h-3" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

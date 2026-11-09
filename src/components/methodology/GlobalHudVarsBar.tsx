import React, { useState } from 'react';
import { Terminal, Key, ChevronDown, ChevronUp, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { useShallow } from 'zustand/react/shallow';
import { isNtHash } from '../../utils/shellEncoders';
import { playCyberSound } from '../../utils/helpers';
import { toast } from '../../store/useToastStore';
import { useTargetIpField } from '../../hooks/useTargetIpField';

export interface GlobalHudVarsBarProps {
  className?: string;
}

const VARS_EXPANDED_STORAGE_KEY = 'zb.methodology.varsExpanded';

const readStoredExpanded = (): boolean => {
  try {
    return localStorage.getItem(VARS_EXPANDED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const writeStoredExpanded = (value: boolean): void => {
  try {
    localStorage.setItem(VARS_EXPANDED_STORAGE_KEY, value ? '1' : '0');
  } catch {
    // Storage may be unavailable (private mode, test env); collapse state just won't persist.
  }
};

export const GlobalHudVarsBar: React.FC<GlobalHudVarsBarProps> = ({ className = '' }) => {
  const { globalVars, setGlobalVars, soundEnabled } = useCtfStore(
    useShallow((s) => ({
      globalVars: s.globalVars,
      setGlobalVars: s.setGlobalVars,
      soundEnabled: s.soundEnabled,
    }))
  );

  const [expanded, setExpanded] = useState<boolean>(readStoredExpanded);
  const { displayIp: displayTargetIp, commit: commitTargetIp } = useTargetIpField();
  // Draft while typing; committed on blur or Enter so each keystroke does not write the engaged machine.
  const [targetIpDraft, setTargetIpDraft] = useState<string | null>(null);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      writeStoredExpanded(next);
      return next;
    });
    if (soundEnabled) playCyberSound('toggle');
  };

  const summaryFields: Array<{ key: 'lhost' | 'lport' | 'targetIp'; label: string }> = [
    { key: 'lhost', label: 'LHOST' },
    { key: 'lport', label: 'LPORT' },
    { key: 'targetIp', label: 'TARGET_IP' },
  ];
  const summaryText = summaryFields
    .map((f) => `${f.label} ${(f.key === 'targetIp' ? displayTargetIp : globalVars[f.key]) || '—'}`)
    .join(' · ');

  const handleUpdate = (field: keyof typeof globalVars, value: string) => {
    setGlobalVars({ [field]: value.trim() ? value : undefined });
  };

  const credIsHash = Boolean(globalVars.cred && isNtHash(globalVars.cred));

  const handleClearAdVars = () => {
    setGlobalVars({
      domain: undefined,
      dcIp: undefined,
      user: undefined,
      cred: undefined,
      wordlist: undefined,
    });
    toast.info('Active AD / HUD variables cleared');
    if (soundEnabled) playCyberSound('toggle');
  };

  return (
    <div className={`rounded-xl border border-subtle bg-surface-card p-3 shadow-xs space-y-3 ${className}`}>
      {/* Top summary row: Always visible */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Terminal className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold text-primary whitespace-nowrap">Offensive HUD Variables</span>
          {credIsHash && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-callout-warn-bg text-callout-warn-fg border border-callout-warn-border text-[10px] font-mono">
              <ShieldAlert className="w-3 h-3" />
              PTH Active (NTLM)
            </span>
          )}
          {globalVars.user && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-sunken text-secondary border border-subtle text-[10px] font-mono">
              <Key className="w-2.5 h-2.5" />
              {globalVars.domain ? `${globalVars.domain}\\` : ''}{globalVars.user}
            </span>
          )}
          {!expanded && (
            <span className="hidden sm:block min-w-0 flex-1 font-mono text-[11px] text-muted truncate">{summaryText}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={toggleExpanded}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-secondary hover:text-primary hover:bg-surface-hover cursor-pointer"
            aria-expanded={expanded}
          >
            <span>{expanded ? 'Hide variables' : 'Edit variables'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Core variables quick-pills (collapsed by default; toggled via "Edit variables") */}
      {expanded && (
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-xs">
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-muted block">LHOST</label>
          <input
            type="text"
            value={globalVars.lhost || ''}
            onChange={(e) => handleUpdate('lhost', e.target.value)}
            placeholder="10.10.14.X"
            className="w-full px-2 py-1 h-7 rounded bg-surface-sunken border border-subtle text-primary font-mono text-xs focus:border-accent focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-muted block">LPORT</label>
          <input
            type="text"
            value={globalVars.lport || ''}
            onChange={(e) => handleUpdate('lport', e.target.value)}
            placeholder="4444"
            className="w-full px-2 py-1 h-7 rounded bg-surface-sunken border border-subtle text-primary font-mono text-xs focus:border-accent focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-muted block">TARGET_IP</label>
          <input
            type="text"
            value={targetIpDraft ?? displayTargetIp}
            onChange={(e) => setTargetIpDraft(e.target.value)}
            onBlur={() => {
              if (targetIpDraft === null) return;
              commitTargetIp(targetIpDraft);
              setTargetIpDraft(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            placeholder="10.10.10.X"
            className="w-full px-2 py-1 h-7 rounded bg-surface-sunken border border-subtle text-primary font-mono text-xs focus:border-accent focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-muted block">DOMAIN</label>
          <input
            type="text"
            value={globalVars.domain || ''}
            onChange={(e) => handleUpdate('domain', e.target.value)}
            placeholder="CORP.LOCAL"
            className="w-full px-2 py-1 h-7 rounded bg-surface-sunken border border-subtle text-primary font-mono text-xs focus:border-accent focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-muted block">DC_IP</label>
          <input
            type="text"
            value={globalVars.dcIp || ''}
            onChange={(e) => handleUpdate('dcIp', e.target.value)}
            placeholder="10.10.10.1"
            className="w-full px-2 py-1 h-7 rounded bg-surface-sunken border border-subtle text-primary font-mono text-xs focus:border-accent focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-muted block">USER</label>
          <input
            type="text"
            value={globalVars.user || ''}
            onChange={(e) => handleUpdate('user', e.target.value)}
            placeholder="administrator"
            className="w-full px-2 py-1 h-7 rounded bg-surface-sunken border border-subtle text-primary font-mono text-xs focus:border-accent focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-muted flex items-center justify-between">
            <span>CRED</span>
            {credIsHash && <span className="text-callout-warn-fg text-[9px]">NTLM</span>}
          </label>
          <input
            type="text"
            value={globalVars.cred || ''}
            onChange={(e) => handleUpdate('cred', e.target.value)}
            placeholder="Pass or 32-hex hash"
            className={`w-full px-2 py-1 h-7 rounded bg-surface-sunken border font-mono text-xs focus:outline-none ${
              credIsHash ? 'border-callout-warn-border text-callout-warn-fg' : 'border-subtle text-primary focus:border-accent'
            }`}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-mono uppercase text-muted block">WORDLIST</label>
          <input
            type="text"
            value={globalVars.wordlist || ''}
            onChange={(e) => handleUpdate('wordlist', e.target.value)}
            placeholder="/usr/share/wordlists/..."
            className="w-full px-2 py-1 h-7 rounded bg-surface-sunken border border-subtle text-primary font-mono text-xs focus:border-accent focus:outline-none"
          />
        </div>
      </div>
      )}

      {/* Expanded details & tips */}
      {expanded && (
        <div className="pt-2 border-t border-subtle/50 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>These variables automatically replace placeholders (`&#123;LHOST&#125;`, `&#123;DOMAIN&#125;`, `&#123;USER&#125;`, `&#123;CRED&#125;`, etc.) across all playbook commands and scripts.</span>
          </div>
          <button
            type="button"
            onClick={handleClearAdVars}
            className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-callout-danger-fg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset AD variables</span>
          </button>
        </div>
      )}
    </div>
  );
};

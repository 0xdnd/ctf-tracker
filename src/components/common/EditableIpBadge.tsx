import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X, Copy, CheckCheck } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { playCyberSound } from '../../utils/helpers';

export interface EditableIpBadgeProps {
  machineId: string;
  initialIp: string;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
  onSaved?: (newIp: string) => void;
}

export const EditableIpBadge: React.FC<EditableIpBadgeProps> = React.memo(({
  machineId,
  initialIp,
  size = 'xs',
  showLabel = false,
  className = '',
  onSaved,
}) => {
  const updateMachine = useCtfStore((s) => s.updateMachine);
  const setAssignIpMachineId = useCtfStore((s) => s.setAssignIpMachineId);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const [isEditing, setIsEditing] = useState(false);
  const [ipValue, setIpValue] = useState(initialIp);
  const [copied, setCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPlaceholder = !initialIp || initialIp.includes('x');

  useEffect(() => {
    setIpValue(initialIp);
  }, [initialIp]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setIpValue(initialIp);
  };

  const handleOpenQuickModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAssignIpMachineId(machineId);
  };

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEditing(false);
    setIpValue(initialIp);
  };

  const handleSave = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    // Sanitize input: strip accidental http://, https://, or trailing slashes/ports
    const cleanIp = ipValue
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .trim();
    if (!cleanIp) {
      handleCancel();
      return;
    }

    updateMachine(machineId, { ip: cleanIp });
    setIsEditing(false);
    setJustSaved(true);
    if (soundEnabled) playCyberSound('click');
    if (onSaved) onSaved(cleanIp);

    setTimeout(() => {
      setJustSaved(false);
    }, 1800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!initialIp) return;
    navigator.clipboard.writeText(initialIp);
    setCopied(true);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopied(false), 1800);
  };

  const sizeClasses = {
    xs: {
      text: 'text-[11px]',
      input: 'text-[11px] py-0.5 px-1.5 w-28',
      icon: 'w-3 h-3',
      button: 'p-1',
    },
    sm: {
      text: 'text-xs',
      input: 'text-xs py-1 px-2 w-32',
      icon: 'w-3.5 h-3.5',
      button: 'p-1',
    },
    md: {
      text: 'text-sm',
      input: 'text-sm py-1 px-2.5 w-36',
      icon: 'w-4 h-4',
      button: 'p-1.5',
    },
  }[size];

  if (isEditing) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1 bg-cyber-bg border border-cyber-cyan/70 rounded-md p-0.5 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-mono ${className}`}
      >
        {showLabel && <span className="text-[10px] text-cyber-muted px-1">IP:</span>}
        <input
          ref={inputRef}
          id={`edit-ip-${machineId}`}
          name={`edit-ip-${machineId}`}
          aria-label="Edit machine IP address"
          type="text"
          value={ipValue}
          onChange={(e) => setIpValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className={`bg-white dark:bg-transparent text-slate-900 dark:text-white border border-cyan-500/40 dark:border-transparent rounded px-1 font-mono font-bold focus:outline-none ${sizeClasses.input}`}
          placeholder="10.10.x.x"
        />
        <button
          type="button"
          onClick={handleSave}
          className={`${sizeClasses.button} rounded bg-cyber-emerald/20 text-cyber-emerald hover:bg-cyber-emerald hover:text-black transition-all`}
          title="Save IP (Enter)"
        >
          <Check className={sizeClasses.icon} />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className={`${sizeClasses.button} rounded bg-cyber-crimson/20 text-cyber-crimson hover:bg-cyber-crimson hover:text-white transition-all`}
          title="Cancel (Esc)"
        >
          <X className={sizeClasses.icon} />
        </button>
      </div>
    );
  }

  if (isPlaceholder) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`group/ip inline-flex items-center gap-1 font-mono ${sizeClasses.text} ${className}`}
      >
        {showLabel && <span className="text-slate-600 dark:text-cyber-muted text-[10px]">IP:</span>}
        <div className="inline-flex items-center rounded border border-amber-300 dark:border-amber-500/50 bg-amber-100 dark:bg-amber-500/10 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={handleOpenQuickModal}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-amber-900 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/25 hover:text-amber-950 dark:hover:text-white transition-all font-bold tracking-wide"
            title="Dynamic spawned IP needed! Click to quickly assign spawned instance IP"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
            <span>SET IP {initialIp ? `(${initialIp})` : ''}</span>
          </button>
          <button
            type="button"
            onClick={handleStartEdit}
            className="px-1.5 py-0.5 text-amber-800 dark:text-amber-400/70 hover:text-amber-950 dark:hover:text-white hover:bg-amber-200 dark:hover:bg-amber-500/30 border-l border-amber-300 dark:border-amber-500/30 transition-colors"
            title="Edit inline"
          >
            <Pencil className={sizeClasses.icon} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`group/ip inline-flex items-center gap-1.5 font-mono ${sizeClasses.text} ${className}`}
    >
      {showLabel && <span className="text-slate-600 dark:text-cyber-muted text-[10px]">IP:</span>}

      <div
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border transition-all ${
          justSaved
            ? 'bg-cyber-emerald/15 border-cyber-emerald text-cyber-emerald shadow-[0_0_10px_rgba(16,185,129,0.3)]'
            : copied
            ? 'bg-cyber-cyan/15 border-cyber-cyan text-cyber-cyan shadow-[0_0_10px_rgba(6,182,212,0.3)]'
            : 'bg-slate-100 dark:bg-cyber-bg/70 border-slate-300 dark:border-cyber-border hover:border-slate-400 dark:hover:border-cyber-borderGlow text-slate-800 dark:text-cyber-muted hover:text-slate-950 dark:hover:text-white'
        }`}
      >
        <span
          onClick={handleCopy}
          onDoubleClick={handleStartEdit}
          className="cursor-pointer font-bold select-all tracking-wide"
          title="Click to copy IP • Double-click to edit"
        >
          {initialIp}
        </span>

        {/* Copy confirmation or icon */}
        {copied ? (
          <CheckCheck className={`${sizeClasses.icon} text-cyber-cyan stroke-[2.5]`} />
        ) : justSaved ? (
          <Check className={`${sizeClasses.icon} text-cyber-emerald stroke-[2.5]`} />
        ) : (
          <button
            type="button"
            onClick={handleCopy}
            className="text-cyber-muted hover:text-cyber-cyan transition-colors"
            title="Copy IP"
          >
            <Copy className={sizeClasses.icon} />
          </button>
        )}

        {/* Edit Button */}
        <button
          type="button"
          onClick={handleStartEdit}
          className="text-cyber-muted hover:text-cyber-amber transition-all hover:scale-110 ml-0.5 opacity-70 group-hover/ip:opacity-100"
          title="Change / Update Target IP"
        >
          <Pencil className={sizeClasses.icon} />
        </button>
      </div>

      {justSaved && (
        <span className="text-[9px] text-cyber-emerald font-bold animate-pulse uppercase">
          IP SAVED ✓
        </span>
      )}
    </div>
  );
});

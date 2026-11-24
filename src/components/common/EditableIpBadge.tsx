import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Check, X, Copy, CheckCheck } from 'lucide-react';
import { useCtfStore } from '../../store/useCtfStore';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { sanitizeIpInput } from '../../utils/ipInput';

export interface EditableIpBadgeProps {
  machineId: string;
  initialIp: string;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
  variant?: 'default' | 'hardware';
  /** Quiet mode: plain mono text with no box; the controls stay reachable (hover, focus, touch). */
  plain?: boolean;
  onSaved?: (newIp: string) => void;
}

/** Quiet mode: the small controls take no room until the row is hovered, focused or on a touch screen. */
const COLLAPSED = 'w-0 overflow-hidden group-hover/ip:w-6 group-focus-within/ip:w-6 touch:w-6 [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:min-h-11';
/** Plain mode keeps every control at 44px under a coarse pointer. */
const COARSE_TEXT = '[@media(pointer:coarse)]:min-h-11';

export const EditableIpBadge: React.FC<EditableIpBadgeProps> = React.memo(({
  machineId,
  initialIp,
  size = 'xs',
  showLabel = false,
  className = '',
  variant = 'default',
  plain = false,
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
  // Set once Save / Cancel ended this edit, so the blur fired as the input goes away cannot save again.
  const editDoneRef = useRef(false);

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
    editDoneRef.current = false;
    setIsEditing(true);
    setIpValue(initialIp);
  };

  const handleOpenQuickModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAssignIpMachineId(machineId);
  };

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    editDoneRef.current = true;
    setIsEditing(false);
    setIpValue(initialIp);
  };

  const handleSave = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    // Sanitize input: strip accidental http://, https://, or trailing slashes/ports
    const cleanIp = sanitizeIpInput(ipValue);
    // An empty value clears the IP on purpose (Escape / the X button cancel instead).
    editDoneRef.current = true;
    setIsEditing(false);

    updateMachine(machineId, { ip: cleanIp });
    setJustSaved(true);
    if (soundEnabled) playCyberSound('click');
    if (onSaved) onSaved(cleanIp);

    setTimeout(() => {
      setJustSaved(false);
    }, 1800);
  };

  // Leaving the field saves, unless focus moved to the editor's own Save / Cancel buttons (they decide).
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const next = e.relatedTarget as Node | null;
    if (editDoneRef.current || (next && e.currentTarget.parentElement?.contains(next))) return;
    if (ipValue.trim() === (initialIp || '').trim()) {
      handleCancel();
      return;
    }
    handleSave();
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
    void safeCopyToClipboard(initialIp);
    setCopied(true);
    if (soundEnabled) playCyberSound('copy');
    setTimeout(() => setCopied(false), 1800);
  };

  const sizeClasses = {
    xs: {
      text: 'text-xs',
      input: 'text-xs py-0.5 px-1.5 w-28',
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
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1 bg-surface-card border ${variant === 'hardware' ? 'border-accent' : 'border-accent/70'} rounded-[3px] p-0.5 font-mono tabular-nums ${className}`}
      >
        {showLabel && <span className="text-xs text-muted px-1">IP:</span>}
        <input
          ref={inputRef}
          id={`edit-ip-${machineId}`}
          name={`edit-ip-${machineId}`}
          aria-label="Edit machine IP address"
          type="text"
          value={ipValue}
          onChange={(e) => setIpValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          className={`bg-surface-card text-primary border ${variant === 'hardware' ? 'border-strong focus:border-accent' : 'border-accent/40'} rounded-[3px] px-1 font-mono font-bold focus:outline-none tabular-nums ${sizeClasses.input}`}
          placeholder="10.10.x.x"
        />
        <button
          type="button"
          onClick={handleSave}
          className={`${sizeClasses.button} rounded-[3px] bg-callout-success-bg text-callout-success-fg hover:bg-callout-success-fg/20 transition-interactive active:scale-[0.97]`}
          title="Save IP (Enter)"
        >
          <Check className={sizeClasses.icon} />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className={`${sizeClasses.button} rounded-[3px] bg-callout-danger-bg text-callout-danger-fg hover:bg-callout-danger-fg/20 transition-interactive active:scale-[0.97]`}
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
        role="presentation"
        onClick={(e) => e.stopPropagation()}
        className={`group/ip inline-flex items-center gap-1 font-mono tabular-nums ${sizeClasses.text} ${className}`}
      >
        {/* The button already reads "IP not set", so no separate IP label here. */}
        {/* Always quiet: an unset IP is plain muted text; the edit pencil appears on hover, focus or touch. */}
        <div className="inline-flex items-center rounded-[3px] border border-transparent overflow-hidden tabular-nums">
          <button
            type="button"
            onClick={handleOpenQuickModal}
            aria-label={`IP not set (${initialIp || 'dynamic'}), set IP`}
            className={`min-h-[24px] inline-flex items-center gap-1 px-0 py-0.5 ${COARSE_TEXT} text-muted hover:text-primary hover:bg-surface-hover transition-interactive active:scale-[0.97] font-medium tabular-nums`}
            title="Click to set the IP"
          >
            <span className="whitespace-nowrap tabular-nums">IP not set</span>
          </button>
          <button
            type="button"
            onClick={handleStartEdit}
            aria-label="Edit IP inline"
            className={`${COLLAPSED} min-h-[24px] inline-flex items-center justify-center text-muted hover:text-primary hover:bg-surface-hover transition-interactive active:scale-[0.97] opacity-0 group-hover/ip:opacity-100 group-focus-within/ip:opacity-100 focus-visible:opacity-100 touch:opacity-100`}
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
      role="presentation"
      onClick={(e) => e.stopPropagation()}
      className={`group/ip inline-flex items-center gap-1.5 font-mono tabular-nums ${sizeClasses.text} ${className}`}
    >
      {showLabel && <span className="text-secondary text-xs">IP</span>}

      <div
        className={`inline-flex items-center gap-1 rounded-[3px] border transition-colors tabular-nums ${
          plain
            ? `border-transparent ${justSaved ? 'text-callout-success-fg' : copied ? 'text-accent' : 'text-muted hover:text-primary'}`
            : `px-1.5 py-0.5 ${
                justSaved
                  ? 'bg-callout-success-bg border-callout-success-border text-callout-success-fg'
                  : copied
                  ? 'bg-accent/10 border-accent text-accent'
                  : variant === 'hardware'
                  ? 'bg-surface-sunken border-subtle text-secondary hover:border-strong'
                  : 'bg-surface-sunken border-subtle hover:border-strong text-primary'
              }`
        }`}
      >
        <button
          type="button"
          onClick={handleCopy}
          onDoubleClick={handleStartEdit}
          className={`cursor-pointer font-bold select-text tabular-nums min-h-6 inline-flex items-center ${plain ? COARSE_TEXT : ''}`}
          title="Click to copy IP • Double-click to edit"
        >
          {initialIp}
        </button>

        {/* Copy confirmation or icon */}
        {copied ? (
          <CheckCheck className={`${sizeClasses.icon} text-callout-success-fg stroke-[2.5]`} />
        ) : justSaved ? (
          <Check className={`${sizeClasses.icon} text-callout-success-fg stroke-[2.5]`} />
        ) : (
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy IP"
            className={`${plain ? COLLAPSED : 'min-w-[24px]'} min-h-[24px] inline-flex items-center justify-center text-muted hover:text-primary transition-[opacity,color,transform] active:scale-[0.97] opacity-0 group-hover/ip:opacity-100 group-focus-within/ip:opacity-100 focus-visible:opacity-100 touch:opacity-100 cursor-pointer`}
            title="Copy IP"
          >
            <Copy className={sizeClasses.icon} />
          </button>
        )}

        {/* Edit Button */}
        <button
          type="button"
          onClick={handleStartEdit}
          aria-label="Change target IP"
          className={`${plain ? COLLAPSED : 'min-w-[24px] ml-0.5'} min-h-[24px] inline-flex items-center justify-center text-muted hover:text-primary transition-[opacity,color,transform] active:scale-[0.97] opacity-0 group-hover/ip:opacity-100 group-focus-within/ip:opacity-100 focus-visible:opacity-100 touch:opacity-100 cursor-pointer`}
          title="Change / Update Target IP"
        >
          <Pencil className={sizeClasses.icon} />
        </button>
      </div>

      {justSaved && (
        <span className="text-xs text-callout-success-fg font-medium tabular-nums">
          IP saved
        </span>
      )}
    </div>
  );
});

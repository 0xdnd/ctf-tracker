import React from 'react';
import { Lock } from 'lucide-react';
import type { Machine } from '../../types';
import { playCyberSound, safeCopyToClipboard } from '../../utils/helpers';
import { isPlaceholderIp } from '../../utils/ipInput';

export interface CompactIpProps {
  machine: Pick<Machine, 'id' | 'name' | 'ip' | 'isActive'>;
  soundEnabled: boolean;
  onSetAssignIp: (id: string | null) => void;
  /** Called with a short note ("IP copied") after a tap on the address. */
  onNote?: (msg: string) => void;
  className?: string;
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';

/** The IP line of a phone card or row: tap the address to copy it, tap "IP not set" to set one, or "Protected" for an active box. */
export const CompactIp: React.FC<CompactIpProps> = ({ machine: m, soundEnabled, onSetAssignIp, onNote, className = '' }) => {
  if (m.isActive) {
    return (
      <span className={`inline-flex shrink-0 items-center gap-1 font-mono text-xs text-callout-warn-fg ${className}`}>
        <Lock className="h-3 w-3" aria-hidden="true" /> Protected
      </span>
    );
  }
  if (m.ip && !isPlaceholderIp(m.ip)) {
    return (
      <button
        type="button"
        onClick={() => {
          void safeCopyToClipboard(m.ip);
          if (soundEnabled) playCyberSound('copy');
          onNote?.('IP copied');
        }}
        title="Copy IP"
        aria-label={`Copy IP ${m.ip}`}
        className={`inline-flex min-h-6 max-w-[11rem] shrink-0 cursor-pointer items-center truncate rounded font-mono text-[13px] font-medium tabular-nums text-secondary ${FOCUS} ${className}`}
      >
        {m.ip}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onSetAssignIp(m.id)}
      aria-label={`IP not set for ${m.name}, set IP`}
      className={`inline-flex min-h-6 shrink-0 cursor-pointer items-center rounded font-mono text-[13px] text-muted ${FOCUS} ${className}`}
    >
      IP not set
    </button>
  );
};

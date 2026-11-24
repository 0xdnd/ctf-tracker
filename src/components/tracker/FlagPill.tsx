import React from 'react';
import { Check } from 'lucide-react';
import type { Machine } from '../../types';

export interface FlagPillProps {
  machine: Pick<Machine, 'id' | 'name' | 'userFlag' | 'userPwnedAt' | 'rootFlag' | 'rootPwnedAt'>;
  onToggleUserFlag: (id: string) => void;
  onToggleRootFlag: (id: string, hasRoot: boolean) => void;
}

const SEGMENT =
  'tap-target-sm relative inline-flex h-6 w-8 cursor-pointer items-center justify-center gap-0.5 font-mono text-xs tabular-nums transition-colors duration-150 active:scale-[0.97] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent [@media(pointer:coarse)]:after:!w-full';

const TONE = {
  warn: { on: 'bg-callout-warn-bg font-semibold text-callout-warn-fg', off: 'bg-transparent text-muted' },
  success: { on: 'bg-callout-success-bg font-semibold text-callout-success-fg', off: 'bg-transparent text-muted' },
} as const;

/**
 * Compact two-segment User / Root status pill for phone rows and cards. A captured flag fills its segment and
 * adds a check, so the state never rests on colour alone. Each segment still toggles its flag (the overflow menu
 * offers the same toggles); the 44px touch area grows vertically only, so the two never overlap.
 */
export const FlagPill: React.FC<FlagPillProps> = ({ machine: m, onToggleUserFlag, onToggleRootFlag }) => {
  const hasUser = Boolean(m.userPwnedAt || m.userFlag);
  const hasRoot = Boolean(m.rootPwnedAt || m.rootFlag);
  const segment = (kind: 'user' | 'root', captured: boolean, onClick: () => void) => {
    const tone = kind === 'user' ? TONE.warn : TONE.success;
    return (
      <button
        type="button"
        onClick={onClick}
        title={`${kind === 'user' ? 'User' : 'Root'} flag: ${captured ? 'captured' : 'not yet'}`}
        aria-label={`Toggle ${kind} flag for ${m.name} (currently ${captured ? 'captured' : 'pending'})`}
        className={`${SEGMENT} ${kind === 'user' ? 'rounded-l-[5px]' : 'rounded-r-[5px] border-l border-subtle'} ${captured ? tone.on : tone.off}`}
      >
        {kind === 'user' ? 'U' : 'R'}
        {captured && <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />}
      </button>
    );
  };
  return (
    <div role="group" aria-label="Flags" className="inline-flex shrink-0 items-stretch rounded-md border border-subtle">
      {segment('user', hasUser, () => onToggleUserFlag(m.id))}
      {segment('root', hasRoot, () => onToggleRootFlag(m.id, hasRoot))}
    </div>
  );
};

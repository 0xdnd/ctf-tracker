import React from 'react';
import { useCtfStore } from '../../store/useCtfStore';

const inputBase =
  'h-11 w-full min-w-0 rounded-lg border border-subtle bg-surface-sunken px-2.5 font-mono text-xs tabular-nums text-primary transition-colors placeholder:text-muted focus:border-accent focus:outline-none sm:h-8';

interface YourDetailsCardProps {
  /** data-tour value for the card (first-visit guides). */
  tourAnchor: string;
}

/**
 * LHOST / LPORT / TARGET fields backed by the global variables, shared by the Snippets page and the
 * Reverse shells page so a value typed on one shows on the other.
 */
export const YourDetailsCard: React.FC<YourDetailsCardProps> = ({ tourAnchor }) => {
  const globalVars = useCtfStore((s) => s.globalVars);
  const setGlobalVars = useCtfStore((s) => s.setGlobalVars);

  return (
    <div data-tour={tourAnchor} className="rounded-xl border border-subtle bg-surface-card p-4">
      <h3 className="text-sm font-semibold text-primary">Your details</h3>
      <p className="mb-3 mt-0.5 text-xs text-secondary">
        LHOST is your own machine&apos;s IP address, LPORT is the port you listen on, and target is the machine you attack.
        Every command and payload uses them.
      </p>
      <div className="grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] items-end gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
        <label className="flex flex-col gap-1 text-xs text-muted sm:flex-row sm:items-center sm:gap-2" htmlFor="cheatsheet-lhost-input">
          <span>LHOST</span>
          <input
            type="text"
            id="cheatsheet-lhost-input"
            name="cheatsheet-lhost"
            aria-label="Attacker Host LHOST"
            value={globalVars.lhost}
            onChange={(e) => setGlobalVars({ lhost: e.target.value })}
            className={`${inputBase} sm:w-32`}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted sm:flex-row sm:items-center sm:gap-2" htmlFor="cheatsheet-lport-input">
          <span>LPORT</span>
          <input
            type="text"
            id="cheatsheet-lport-input"
            name="cheatsheet-lport"
            aria-label="Attacker Port LPORT"
            value={globalVars.lport}
            onChange={(e) => setGlobalVars({ lport: e.target.value })}
            className={`${inputBase} sm:w-20`}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-muted sm:flex-row sm:items-center sm:gap-2" htmlFor="cheatsheet-target-input">
          <span>TARGET</span>
          <input
            type="text"
            id="cheatsheet-target-input"
            name="cheatsheet-target"
            aria-label="Target IP Address"
            value={globalVars.targetIp}
            onChange={(e) => setGlobalVars({ targetIp: e.target.value })}
            className={`${inputBase} sm:w-32`}
          />
        </label>
      </div>
    </div>
  );
};

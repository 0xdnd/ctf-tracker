import { useCtfStore } from '../store/useCtfStore';
import { isPlaceholderIp, sanitizeIpInput } from '../utils/ipInput';

/**
 * Shared RHOST field logic (header "R" input, methodology HUD TARGET_IP).
 * Display: the engaged machine's IP, unless it is empty / a placeholder / a live box; else the global RHOST.
 * Commit: always updates the global value; also writes the engaged machine's IP when that machine is
 * not a live box (`isActive` machines keep `ip: ''`) and the IP actually changed.
 */
export function useTargetIpField(): { displayIp: string; commit: (raw: string) => void } {
  const globalTargetIp = useCtfStore((s) => s.globalVars.targetIp);
  const engaged = useCtfStore((s) =>
    s.activeTargetId ? s.machines.find((m) => m.id === s.activeTargetId) : undefined
  );
  const updateMachine = useCtfStore((s) => s.updateMachine);
  const setGlobalVars = useCtfStore((s) => s.setGlobalVars);

  const machineIp = engaged && !engaged.isActive && !isPlaceholderIp(engaged.ip) ? engaged.ip : '';
  const displayIp = machineIp || globalTargetIp || '';

  const commit = (raw: string) => {
    const clean = sanitizeIpInput(raw);
    const writesMachine = Boolean(engaged && !engaged.isActive && (engaged.ip || '') !== clean);
    if (!writesMachine && clean === (globalTargetIp || '')) return;
    if (engaged && writesMachine) updateMachine(engaged.id, { ip: clean });
    setGlobalVars({ targetIp: clean });
  };

  return { displayIp, commit };
}

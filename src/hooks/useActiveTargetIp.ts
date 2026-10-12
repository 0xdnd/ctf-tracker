import { useMemo } from 'react';
import { useCtfStore } from '../store/useCtfStore';
import type { GlobalVariables, Machine } from '../types';

/**
 * Single source of truth for the target-IP precedence rule:
 * the engaged machine's IP wins over the global RHOST (`globalVars.targetIp`).
 * Every view that substitutes variables must derive the engaged IP through
 * this helper so they all resolve `{TARGET_IP}` / legacy `{ip}` identically.
 */
export function selectActiveTargetIp(state: {
  activeTargetId: string | null;
  machines: Machine[];
}): string | undefined {
  if (!state.activeTargetId) return undefined;
  return state.machines.find((m) => m.id === state.activeTargetId)?.ip || undefined;
}

/** Reactive engaged-machine IP (undefined when nothing is engaged or it has no IP). */
export function useActiveTargetIp(): string | undefined {
  return useCtfStore(selectActiveTargetIp);
}

/** Pure overlay: returns `vars` with `targetIp` replaced by the engaged IP, if any. */
export function withActiveTargetIp(vars: GlobalVariables, activeTargetIp?: string): GlobalVariables {
  return activeTargetIp && activeTargetIp !== vars.targetIp ? { ...vars, targetIp: activeTargetIp } : vars;
}

/** `globalVars` with the engaged target's IP applied (`activeTargetIp || globalVars.targetIp`). */
export function useEffectiveGlobalVars(vars: GlobalVariables): GlobalVariables {
  const activeTargetIp = useActiveTargetIp();
  return useMemo(() => withActiveTargetIp(vars, activeTargetIp), [vars, activeTargetIp]);
}

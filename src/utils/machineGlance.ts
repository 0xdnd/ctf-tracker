import type { Machine } from '../types';
import type { TargetType } from './targetType';

export function isUserFlagDone(machine: Machine): boolean {
  return Boolean(
    Boolean(machine.userFlag?.trim()) ||
      ((machine.status === 'foothold' || machine.status === 'root' || machine.status === 'completed') &&
        Boolean(machine.userPwnedAt)),
  );
}

export function isRootFlagDone(machine: Machine): boolean {
  return Boolean(
    Boolean(machine.rootFlag?.trim()) ||
      ((machine.status === 'root' || machine.status === 'completed') && Boolean(machine.rootPwnedAt)),
  );
}

export function getPortCount(machine: Machine): number {
  if (machine.services && machine.services.length > 0) return machine.services.length;
  return machine.openPorts?.length ?? 0;
}

export type HostAccessLevel = 'none' | 'user' | 'root';
export interface HostAccess {
  level: HostAccessLevel;
  source: 'flags' | 'credential' | null;
}

export function getHostAccess(machine: Machine, bestCredLevel: 'none' | 'user' | 'admin'): HostAccess {
  const flagTier = isRootFlagDone(machine) ? 2 : isUserFlagDone(machine) ? 1 : 0;
  const credTier = bestCredLevel === 'admin' ? 2 : bestCredLevel === 'user' ? 1 : 0;
  const tier = Math.max(flagTier, credTier);
  if (tier === 0) return { level: 'none', source: null };
  return { level: tier === 2 ? 'root' : 'user', source: flagTier >= credTier ? 'flags' : 'credential' };
}

export type StillNeededKey = 'userFlag' | 'rootFlag' | 'ports' | 'checklistInProgress';
export interface StillNeededItem {
  key: StillNeededKey;
  count?: number;
}

export function getStillNeeded(
  machine: Machine,
  opts: { targetType: TargetType; portCount: number; checklistInProgress: number },
): StillNeededItem[] {
  if (machine.status === 'root' || machine.status === 'completed') return [];
  const items: StillNeededItem[] = [];
  if (opts.targetType === 'machine') {
    if (!isUserFlagDone(machine)) items.push({ key: 'userFlag' });
    if (!isRootFlagDone(machine)) items.push({ key: 'rootFlag' });
  }
  if (opts.portCount === 0) items.push({ key: 'ports' });
  if (opts.checklistInProgress > 0) items.push({ key: 'checklistInProgress', count: opts.checklistInProgress });
  return items;
}

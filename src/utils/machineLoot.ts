import type { Credential, CredAttempt, CredService, LootItem, LootState } from '../types/loot';

export type HostCredGroup = 'works' | 'failed' | 'triedNoResult' | 'tryHere';
export type HostCredLevel = 'admin' | 'user' | 'unknown';

export interface HostCredEntry {
  credential: Credential;
  group: HostCredGroup;
  /** Only set for group 'works'. */
  level?: HostCredLevel;
  /** Unique services from this credential's attempts on this machine (any result), in first-seen order. */
  services: CredService[];
  /** verifications[machineId].protocol when present. */
  protocol?: string;
}

export interface MachineLoot {
  foundHere: Credential[];
  works: HostCredEntry[];
  failed: HostCredEntry[];
  triedNoResult: HostCredEntry[];
  tryHere: HostCredEntry[];
  items: LootItem[];
  /** Highest of the works levels; 'unknown' does not count. */
  bestCredLevel: 'none' | 'user' | 'admin';
}

export function getMachineLoot(
  loot: Pick<LootState, 'credentials' | 'credAttempts' | 'lootItems'>,
  machineId: string,
): MachineLoot {
  const attemptsByCred = new Map<string, CredAttempt[]>();
  for (const a of loot.credAttempts) {
    if (a.machineId !== machineId) continue;
    const list = attemptsByCred.get(a.credId);
    if (list) list.push(a);
    else attemptsByCred.set(a.credId, [a]);
  }

  const result: MachineLoot = {
    foundHere: [],
    works: [],
    failed: [],
    triedNoResult: [],
    tryHere: [],
    items: loot.lootItems.filter((i) => i.machineId === machineId),
    bestCredLevel: 'none',
  };

  for (const credential of loot.credentials) {
    if (credential.sourceMachineId === machineId) result.foundHere.push(credential);

    const v = credential.verifications?.[machineId];
    const attempts = attemptsByCred.get(credential.id) ?? [];
    const services: CredService[] = [];
    for (const a of attempts) {
      if (!services.includes(a.service)) services.push(a.service);
    }
    const base = { credential, services, ...(v?.protocol ? { protocol: v.protocol } : {}) };

    if (v?.status === 'admin' || v?.status === 'user' || attempts.some((a) => a.result === 'valid')) {
      const level: HostCredLevel = v?.status === 'admin' ? 'admin' : v?.status === 'user' ? 'user' : 'unknown';
      result.works.push({ ...base, group: 'works', level });
      if (level === 'admin') result.bestCredLevel = 'admin';
      else if (level === 'user' && result.bestCredLevel === 'none') result.bestCredLevel = 'user';
    } else if (v?.status === 'failed' || attempts.some((a) => a.result === 'invalid')) {
      result.failed.push({ ...base, group: 'failed' });
    } else if (attempts.some((a) => a.result === 'tried')) {
      result.triedNoResult.push({ ...base, group: 'triedNoResult' });
    } else if (!credential.redacted) {
      result.tryHere.push({ ...base, group: 'tryHere' });
    }
  }

  return result;
}

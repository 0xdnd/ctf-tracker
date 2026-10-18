import type { MachineTombstone } from '../types';

/** Tombstones older than this are dropped: a device that has not synced for half a year merges as a union. */
export const TOMBSTONE_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;

const toMs = (iso: unknown): number => (typeof iso === 'string' ? Date.parse(iso) : NaN);

/** Validates untrusted input (persisted blob or an imported file). Keeps the latest deletedAt per id. */
export function normalizeMachineTombstones(raw: unknown): MachineTombstone[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map<string, MachineTombstone>();
  for (const t of raw) {
    if (!t || typeof t !== 'object') continue;
    const { id, deletedAt } = t as { id?: unknown; deletedAt?: unknown };
    if (typeof id !== 'string' || !id || !Number.isFinite(toMs(deletedAt))) continue;
    const prev = byId.get(id);
    if (!prev || toMs(deletedAt) > toMs(prev.deletedAt)) byId.set(id, { id, deletedAt: deletedAt as string });
  }
  return [...byId.values()];
}

export function pruneMachineTombstones(list: MachineTombstone[], now = Date.now()): MachineTombstone[] {
  const kept = list.filter((t) => now - toMs(t.deletedAt) <= TOMBSTONE_RETENTION_MS);
  return kept.length === list.length ? list : kept;
}

/** Adds (or refreshes) the tombstone for `id` and prunes expired ones. */
export function addMachineTombstone(list: MachineTombstone[], id: string, now = Date.now()): MachineTombstone[] {
  const deletedAt = new Date(now).toISOString();
  return pruneMachineTombstones([...list.filter((t) => t.id !== id), { id, deletedAt }], now);
}

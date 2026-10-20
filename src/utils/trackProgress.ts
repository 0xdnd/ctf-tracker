import type { Machine } from '../types';
import { trackOrderKey, type PracticeTrack } from '../data/tracksData';
import { isCompleted } from './machineFilter';

export interface TrackProgress {
  /** Completed machines of the track. */
  done: number;
  /** Machines of the track that exist in the catalog the caller passed. List entries with no matching machine are not counted. */
  total: number;
  /** Whole percent, 0 when the track is empty. */
  percent: number;
  /** First machine not yet completed, in the track's order. Null when nothing is left. */
  next: Machine | null;
}

interface CachedIndex {
  machines: readonly Machine[];
  index: Map<string, number>;
}
const indexCache = new Map<string, CachedIndex>();

/** Sorts after every real position. */
const LAST = Number.MAX_SAFE_INTEGER;

/**
 * Position of each machine in the track's order, keyed by machine id. Machines that are not on the list
 * (or tracks without a list) are absent. Built once per track and machine list, then reused.
 */
export const buildTrackOrderIndex = (
  track: Pick<PracticeTrack, 'id' | 'order'>,
  machines: readonly Machine[],
): Map<string, number> => {
  const hit = indexCache.get(track.id);
  if (hit && hit.machines === machines) return hit.index;

  const index = new Map<string, number>();
  if (track.order && track.order.length > 0) {
    const position = new Map<string, number>();
    track.order.forEach((key, i) => {
      if (!position.has(key)) position.set(key, i);
    });
    for (const m of machines) {
      const at = position.get(trackOrderKey(m));
      if (at !== undefined) index.set(m.id, at);
    }
  }
  indexCache.set(track.id, { machines, index });
  return index;
};

/** Stable sort by track position; machines without one go last. */
export const sortByTrackOrder = (list: Machine[], index: ReadonlyMap<string, number>): Machine[] =>
  list.sort((a, b) => (index.get(a.id) ?? LAST) - (index.get(b.id) ?? LAST));

/** Progress through a track: the machines the track matches, how many are done, and the next one to do. */
export const getTrackProgress = (
  track: Pick<PracticeTrack, 'id' | 'order' | 'filterFn'>,
  allMachines: readonly Machine[],
): TrackProgress => {
  const members = allMachines.filter(track.filterFn);
  const index = buildTrackOrderIndex(track, allMachines);
  if (index.size > 0) sortByTrackOrder(members, index);

  let done = 0;
  let next: Machine | null = null;
  for (const m of members) {
    if (isCompleted(m)) done++;
    else if (next === null) next = m;
  }
  const total = members.length;
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0, next };
};

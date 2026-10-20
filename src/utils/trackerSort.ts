import type { Machine } from '../types';
import type { SortDirection, SortOption } from '../store/useCtfStore';
import { TRACK_BY_ID, type PracticeTrack } from '../data/tracksData';
import { getActiveTrackIds, type MachineFilters } from './machineFilter';
import { buildTrackOrderIndex } from './trackProgress';

/** The sort in effect. 'track' is derived from the filters and is never stored. */
export type EffectiveSort = SortOption | 'track';

const DIFFICULTY_WEIGHTS: Record<string, number> = {
  'Very Easy': 1,
  Easy: 2,
  Medium: 3,
  Hard: 4,
  Insane: 5,
};

/** The one active track that has a curated order, or null (no track, several tracks, or a track without an order). */
export const getOrderedActiveTrack = (
  filters: Pick<MachineFilters, 'selectedTrack' | 'selectedTracks'>,
): PracticeTrack | null => {
  const ids = getActiveTrackIds(filters);
  if (ids.length !== 1) return null;
  const track = TRACK_BY_ID.get(ids[0]);
  return track?.order && track.order.length > 0 ? track : null;
};

/** With the default sort and exactly one ordered track active, the grid follows that track's order. */
export const resolveSortMode = (
  filters: Pick<MachineFilters, 'selectedTrack' | 'selectedTracks'> & { sortBy?: SortOption },
): EffectiveSort => {
  const sortBy = filters.sortBy || 'default';
  return sortBy === 'default' && getOrderedActiveTrack(filters) ? 'track' : sortBy;
};

export interface SortContext {
  mode: EffectiveSort;
  direction: SortDirection;
  /** Seed for the shuffled default order. */
  seed: number;
  /** Machines the track order index is built from. Only read in 'track' mode. */
  catalog: readonly Machine[];
  track: PracticeTrack | null;
}

/** Sorts `list` in place and returns it. */
export const sortMachines = (list: Machine[], ctx: SortContext): Machine[] => {
  const { mode, direction, seed } = ctx;
  const sign = direction === 'desc' ? -1 : 1;

  if (mode === 'track' && ctx.track) {
    // Machines outside the track's list go last and keep their relative order (Array#sort is stable).
    const index = buildTrackOrderIndex(ctx.track, ctx.catalog);
    const last = Number.MAX_SAFE_INTEGER;
    return list.sort((a, b) => sign * ((index.get(a.id) ?? last) - (index.get(b.id) ?? last)));
  }

  const hashString = (str: string) => {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return hash;
  };

  return list.sort((a, b) => {
    let cmp = 0;
    if (mode === 'difficulty') {
      cmp = (DIFFICULTY_WEIGHTS[a.difficulty] || 0) - (DIFFICULTY_WEIGHTS[b.difficulty] || 0);
    } else if (mode === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else if (mode === 'ip') {
      cmp = a.ip.localeCompare(b.ip, undefined, { numeric: true });
    } else if (mode === 'recent') {
      const dateA = a.rootPwnedAt || a.userPwnedAt || a.updatedAt || a.createdAt || '';
      const dateB = b.rootPwnedAt || b.userPwnedAt || b.updatedAt || b.createdAt || '';
      cmp = dateB.localeCompare(dateA);
    } else {
      cmp = hashString(a.id) - hashString(b.id);
    }
    return sign * cmp;
  });
};

/**
 * Scoped (default) graph view: which machines are drawn.
 *
 * Only the first SCOPED_CLUSTER_CAP machines are laid out in subnet clusters. Machines beyond that
 * are NOT drawn in the scoped view (they used to pile into a grid on top of the cluster ring);
 * a "+N more · Show all" control switches to the packed show-all view instead. A machine beyond the
 * cap that has a saved (user-placed) position stays drawn at that position, and saved positions are
 * never removed from the store.
 */

export const SCOPED_CLUSTER_CAP = 48;

export interface ScopedVisibility {
  /** Machines laid out in clusters (min of total and the cap) */
  clusteredCount: number;
  /** Machines beyond the cap that stay drawn because the user placed them */
  pinnedOverflowCount: number;
  /** Machines beyond the cap that are not drawn */
  hiddenCount: number;
  /** Whether to render the "+N more · Show all" control */
  showMoreControl: boolean;
}

export function splitScopedOverflow<T extends { id: string }>(
  overflow: readonly T[],
  savedPositions: Readonly<Record<string, unknown>>
): { shown: T[]; hidden: T[] } {
  const shown: T[] = [];
  const hidden: T[] = [];
  for (const item of overflow) {
    (savedPositions[item.id] ? shown : hidden).push(item);
  }
  return { shown, hidden };
}

export function decideScopedVisibility(totalMachines: number, pinnedOverflowCount = 0): ScopedVisibility {
  const clusteredCount = Math.min(totalMachines, SCOPED_CLUSTER_CAP);
  const overflow = Math.max(0, totalMachines - SCOPED_CLUSTER_CAP);
  const pinned = Math.min(pinnedOverflowCount, overflow);
  const hiddenCount = overflow - pinned;
  return {
    clusteredCount,
    pinnedOverflowCount: pinned,
    hiddenCount,
    showMoreControl: hiddenCount > 0,
  };
}

export function formatShowMoreLabel(hiddenCount: number, filtered = false): string {
  return `+${hiddenCount.toLocaleString('en-US')} more${filtered ? ' matches' : ''} · Show all`;
}

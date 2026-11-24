import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseHubExpansionArgs {
  /** Collapsible mode (scoped view with more machines than COLLAPSE_MIN_MACHINES). */
  enabled: boolean;
  /** Cluster ids that currently own machines. */
  clusterIds: string[];
  /** Cluster id -> number of machines matching the active search/filter (only when filtering). */
  matchCounts: Map<string, number>;
  filterActive: boolean;
}

/**
 * One hub is expanded at a time. A user choice (expand, or collapse everything) always wins; with no
 * choice, an active filter whose matches all sit in exactly one hub expands that hub. The choice is
 * dropped whenever the filter's match distribution changes, so the next search starts fresh.
 */
export function useHubExpansion({ enabled, clusterIds, matchCounts, filterActive }: UseHubExpansionArgs) {
  // undefined = no choice yet, null = user collapsed everything, string = user expanded that hub
  const [choice, setChoice] = useState<string | null | undefined>(undefined);

  const matchKey = useMemo(() => {
    if (!filterActive) return '';
    return [...matchCounts.entries()]
      .filter(([, n]) => n > 0)
      .map(([id, n]) => `${id}:${n}`)
      .sort()
      .join('|');
  }, [filterActive, matchCounts]);

  useEffect(() => {
    setChoice(undefined);
  }, [matchKey]);

  const autoId = useMemo(() => {
    if (!enabled || !filterActive) return null;
    const hubs = [...matchCounts.entries()].filter(([, n]) => n > 0).map(([id]) => id);
    return hubs.length === 1 ? hubs[0] : null;
  }, [enabled, filterActive, matchCounts]);

  const validChoice = choice && clusterIds.includes(choice) ? choice : choice === null ? null : undefined;
  const expandedId: string | null = !enabled ? null : validChoice !== undefined ? validChoice : autoId;

  const expand = useCallback((id: string) => setChoice(id), []);
  const collapse = useCallback(() => setChoice(null), []);
  // A toggle on the auto-expanded hub collapses it: resolve against the effective id, not the raw choice
  const toggle = useCallback(
    (id: string) => (expandedId === id ? collapse() : expand(id)),
    [expandedId, collapse, expand]
  );

  return useMemo(() => ({ expandedId, expand, collapse, toggle }), [expandedId, expand, collapse, toggle]);
}

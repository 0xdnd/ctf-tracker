import { useCallback, useMemo } from 'react';
import type { ClusterDef, GraphNode } from './types';
import { useHubExpansion } from './useHubExpansion';

interface UseHubViewArgs {
  collapsible: boolean;
  clusters: ClusterDef[];
  /** Machines laid out in hubs (pinned overflow machines are not hub-owned). */
  clusteredNodes: GraphNode[];
  /** Nodes that pass the active search / filter. */
  visibleNodes: GraphNode[];
  visibleMachineIds: Set<string>;
  filterActive: boolean;
}

/**
 * Which machines each collapsible hub owns, which hub is open, and therefore which cards are drawn.
 * Machines of folded hubs are simply not rendered; their saved positions stay untouched in the store.
 */
export function useHubView({ collapsible, clusters, clusteredNodes, visibleNodes, visibleMachineIds, filterActive }: UseHubViewArgs) {
  const nodesByCluster = useMemo(() => {
    const map = new Map<string, GraphNode[]>();
    if (!collapsible) return map;
    clusteredNodes.forEach((n) => {
      const list = map.get(n.cluster);
      if (list) list.push(n);
      else map.set(n.cluster, [n]);
    });
    return map;
  }, [collapsible, clusteredNodes]);

  const matchCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!collapsible || !filterActive) return counts;
    nodesByCluster.forEach((list, id) => counts.set(id, list.filter((n) => visibleMachineIds.has(n.id)).length));
    return counts;
  }, [collapsible, filterActive, nodesByCluster, visibleMachineIds]);

  const clusterIds = useMemo(() => clusters.map((c) => c.id), [clusters]);
  const expansion = useHubExpansion({ enabled: collapsible, clusterIds, matchCounts, filterActive });
  const expandedHubId = expansion.expandedId;

  const ownerOf = useMemo(
    () => (collapsible ? new Map(clusteredNodes.map((n) => [n.id, n.cluster])) : null),
    [collapsible, clusteredNodes]
  );

  // Cards actually drawn
  const renderNodes = useMemo(() => {
    if (!ownerOf) return visibleNodes;
    return visibleNodes.filter((n) => !ownerOf.has(n.id) || ownerOf.get(n.id) === expandedHubId);
  }, [ownerOf, visibleNodes, expandedHubId]);

  /** Hub a machine is folded into right now (null when its card is drawn or it is not hub-owned). */
  const collapsedHubOf = useCallback(
    (id: string): string | null => {
      const owner = ownerOf?.get(id);
      return owner !== undefined && owner !== expandedHubId ? owner : null;
    },
    [ownerOf, expandedHubId]
  );

  return useMemo(
    () => ({ nodesByCluster, matchCounts, expansion, expandedHubId, renderNodes, collapsedHubOf }),
    [nodesByCluster, matchCounts, expansion, expandedHubId, renderNodes, collapsedHubOf]
  );
}

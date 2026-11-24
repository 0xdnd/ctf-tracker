import { useMemo } from 'react';
import { Machine } from '../../../types';
import type { AttackNodePosition } from '../../../types/graph';
import { classifyMachine } from '../../../utils/categoryUtils';
import { SCOPED_CLUSTER_CAP, splitScopedOverflow } from '../graphScopedVisibility';
import type { GraphNode, ClusterDef, ClusterTemplate, WorldBounds } from './types';
import { SCOPED_BOUNDS, computeShowAllLayout, getClusterHub } from './layout';
import {
  hubRingRadius,
  WIDE_COLS,
  computeHubBlock,
  computePortraitBlock,
  portraitHubPosition,
  rigFootprint,
  hubFootprint,
  unionBounds,
} from './hubLayout';

interface UseGraphLayoutArgs {
  universeMachines: Machine[];
  scopedPool: Machine[];
  showAllNodes: boolean;
  storedNodePositions: Record<string, AttackNodePosition>;
  /** Scoped view only: hubs are collapsible, so machines get non-overlapping per-hub grid blocks. */
  collapsible?: boolean;
  /** Phone portrait canvas: hubs become rows in one column and an open hub's cards a single column. */
  portrait?: boolean;
  /** Collapsed-hub text multiplier (hubTextScale); the hub footprint, and so the block offset, follows it. */
  hubText?: number;
}

/**
 * The text scale the block offset is laid out for: rounded up to the next 0.5, so a window-resize drag (which moves
 * hubText in 0.1 steps) re-runs the whole layout a few times instead of at every step. Rounding up only pushes a
 * block slightly farther from its hub, never into it.
 */
const quantizeHubText = (k: number): number => Math.ceil(k * 2) / 2;

export function useGraphLayout({ universeMachines, scopedPool, showAllNodes, storedNodePositions, collapsible = false, portrait = false, hubText = 1 }: UseGraphLayoutArgs) {
  const layoutHubText = quantizeHubText(hubText);
  const { clusters, defaultNodePositions, clusteredNodes, overflowNodes, layoutBounds, realSubnetCount, hubBlocks } = useMemo(() => {
    const sample = showAllNodes ? universeMachines : scopedPool.slice(0, SCOPED_CLUSTER_CAP);
    if (sample.length === 0)
      return { clusters: [], defaultNodePositions: {}, clusteredNodes: [] as GraphNode[], overflowNodes: [] as GraphNode[], layoutBounds: SCOPED_BOUNDS, realSubnetCount: 0, hubBlocks: {} as Record<string, WorldBounds> };

    // Subnet Templates
    const hasOnlyWeb = sample.every(m => classifyMachine(m).primary.startsWith('Web'));
    const hasOnlyAd = sample.every(m => classifyMachine(m).isAD);
    const thmCount = sample.filter(m => m.platform === 'THM').length;
    const isMajorityThm = thmCount >= sample.length * 0.55;
    const htbCount = sample.filter(m => m.platform === 'HTB').length;
    const isMajorityHtb = htbCount >= sample.length * 0.55;

    type RawCluster = ClusterTemplate;
    let clusterTemplates: RawCluster[] = [];

    if (hasOnlyWeb) {
      clusterTemplates = [
        { id: 'web-sqli', name: 'DMZ [SQLi & Databases]', color: '#38BDF8', matcher: (m) => classifyMachine(m).categories.includes('SQLi') },
        { id: 'web-rce', name: 'DMZ [Command Exec / RCE]', color: '#EF4444', matcher: (m) => classifyMachine(m).categories.includes('RCE') },
        { id: 'web-lfi', name: 'DMZ [LFI & File Inclusion]', color: '#F59E0B', matcher: (m) => classifyMachine(m).categories.includes('LFI') || classifyMachine(m).categories.includes('SSRF') },
        { id: 'web-auth', name: 'DMZ [Auth Bypass & XSS]', color: '#EAB308', matcher: (m) => classifyMachine(m).categories.includes('XSS') || (m.tags || []).some(t => /auth|jwt|bypass/i.test(t)) },
        { id: 'web-modern', name: '10.10.11.x [Modern Web Apps]', color: '#06B6D4', matcher: (m) => m.ip.startsWith('10.10.11.') || m.platform === 'HTB' },
        { id: 'web-labs', name: '10.10.x.x [Web Exploitation Labs]', color: '#A855F7', matcher: () => true },
      ];
    } else if (hasOnlyAd) {
      clusterTemplates = [
        { id: 'ad-dc', name: 'DC01.CORP [Domain Controllers]', color: '#A855F7', matcher: (m) => /dc/i.test(m.name) || m.difficulty === 'Hard' || m.difficulty === 'Insane' },
        { id: 'ad-kerberos', name: 'AUTH [Kerberoast & AS-REP]', color: '#EF4444', matcher: (m) => (m.tags || []).some(t => /roast|kerberos/i.test(t)) },
        { id: 'ad-pivots', name: '172.16.x.x [Internal Forests]', color: '#F59E0B', matcher: (m) => m.ip.startsWith('172.') || (m.tags || []).some(t => /pivot/i.test(t)) },
        { id: 'ad-htb', name: '10.10.x.x [HTB AD Domains]', color: '#06B6D4', matcher: (m) => m.platform === 'HTB' },
        { id: 'ad-thm', name: '10.10.x.x [THM AD Labs]', color: '#10B981', matcher: (m) => m.platform === 'THM' },
        { id: 'ad-general', name: 'CORP.LOCAL [Active Directory]', color: '#38BDF8', matcher: () => true },
      ];
    } else if (isMajorityThm) {
      clusterTemplates = [
        { id: 'thm-sqli', name: '10.10.x.x [THM Web Surface & DB]', color: '#38BDF8', matcher: (m) => classifyMachine(m).categories.includes('SQLi') || (m.tags || []).some(t => /web|sqli/i.test(t)) },
        { id: 'thm-rce', name: '10.10.x.x [THM Code Exec & RCE]', color: '#EF4444', matcher: (m) => classifyMachine(m).categories.includes('RCE') || (m.tags || []).some(t => /command|upload|rce/i.test(t)) },
        { id: 'thm-lfi', name: '10.10.x.x [THM File & Auth Vectors]', color: '#F59E0B', matcher: (m) => classifyMachine(m).categories.includes('LFI') || (m.tags || []).some(t => /lfi|bypass/i.test(t)) },
        { id: 'thm-privesc', name: '10.10.x.x [THM Linux PrivEsc]', color: '#10B981', matcher: (m) => classifyMachine(m).categories.includes('Linux PrivEsc') || (m.tags || []).some(t => /privesc|suid/i.test(t)) },
        { id: 'thm-windows', name: '10.10.x.x [THM Windows & AD Labs]', color: '#A855F7', matcher: (m) => m.os === 'Windows' || classifyMachine(m).isAD },
        { id: 'thm-network', name: '10.10.x.x [THM Network Services]', color: '#06B6D4', matcher: () => true },
      ];
    } else if (isMajorityHtb) {
      clusterTemplates = [
        { id: 'htb-early', name: '10.10.10.x [HTB Legacy]', color: '#10B981', matcher: (m) => m.ip.startsWith('10.10.10.') || m.difficulty === 'Easy' },
        { id: 'htb-modern', name: '10.10.11.x [HTB Seasons]', color: '#06B6D4', matcher: (m) => m.ip.startsWith('10.10.11.') || m.difficulty === 'Medium' },
        { id: 'htb-hard', name: '10.129.x.x [HTB Enterprise & Hard]', color: '#EF4444', matcher: (m) => m.difficulty === 'Hard' || m.difficulty === 'Insane' },
        { id: 'web-perimeter', name: 'DMZ [Web Surface]', color: '#38BDF8', matcher: (m) => classifyMachine(m).primary.startsWith('Web') },
        { id: 'ad-forest', name: 'CORP.LOCAL [Active Directory]', color: '#A855F7', matcher: (m) => classifyMachine(m).isAD },
        { id: 'internal-lab', name: '192.168.x.x [Internal Pivots]', color: '#F59E0B', matcher: () => true },
      ];
    } else {
      clusterTemplates = [
        { id: 'web-perimeter', name: 'DMZ [Web Surface]', color: '#38BDF8', matcher: (m) => classifyMachine(m).primary.startsWith('Web') },
        { id: 'htb-early', name: '10.10.10.x [HTB Legacy]', color: '#10B981', matcher: (m) => m.platform === 'HTB' && (m.ip.startsWith('10.10.10.') || m.difficulty === 'Easy') },
        { id: 'htb-modern', name: '10.10.11.x [HTB Seasons]', color: '#06B6D4', matcher: (m) => m.platform === 'HTB' },
        { id: 'thm-network', name: '10.10.x.x [THM Labs]', color: '#EF4444', matcher: (m) => m.platform === 'THM' },
        { id: 'ad-forest', name: 'CORP.LOCAL [Active Directory]', color: '#A855F7', matcher: (m) => classifyMachine(m).isAD },
        { id: 'internal-lab', name: '192.168.x.x [Internal Pivots]', color: '#F59E0B', matcher: () => true },
      ];
    }

    // SHOW ALL: dedicated packed layout (the scoped layout below is untouched)
    if (showAllNodes) {
      const layout = computeShowAllLayout(sample, clusterTemplates);
      const showAllNodesList: GraphNode[] = sample.map((m) => ({
        id: m.id,
        name: m.name,
        ip: m.ip,
        os: m.os,
        platform: m.platform,
        difficulty: m.difficulty,
        status: m.status,
        cluster: layout.clusterOf[m.id],
        x: layout.positions[m.id].x,
        y: layout.positions[m.id].y,
        machine: m,
      }));
      return {
        clusters: layout.clusters,
        defaultNodePositions: layout.positions,
        clusteredNodes: showAllNodesList,
        overflowNodes: [] as GraphNode[],
        layoutBounds: layout.bounds,
        realSubnetCount: layout.clusters.length,
        hubBlocks: {} as Record<string, WorldBounds>,
      };
    }

    const MAX_CAPACITY = 8;
    const bucketMap: Record<string, Machine[]> = {};
    clusterTemplates.forEach(ct => { bucketMap[ct.id] = []; });
    const unassigned: Machine[] = [];

    sample.forEach(m => {
      let placed = false;
      for (const ct of clusterTemplates) {
        if (ct.matcher(m) && bucketMap[ct.id].length < MAX_CAPACITY) {
          bucketMap[ct.id].push(m);
          placed = true;
          break;
        }
      }
      if (!placed) unassigned.push(m);
    });

    unassigned.forEach(m => {
      const eligible = clusterTemplates.filter(ct => bucketMap[ct.id].length < MAX_CAPACITY);
      if (eligible.length > 0) {
        eligible.sort((a, b) => bucketMap[a.id].length - bucketMap[b.id].length);
        bucketMap[eligible[0].id].push(m);
      } else {
        const smallest = clusterTemplates.reduce((prev, curr) => 
          bucketMap[curr.id].length < bucketMap[prev.id].length ? curr : prev
        );
        bucketMap[smallest.id].push(m);
      }
    });

    const activeTemplates = clusterTemplates.filter(ct => (bucketMap[ct.id] || []).length > 0);
    const activeCount = Math.max(1, activeTemplates.length);

    const activeClusters: ClusterDef[] = activeTemplates.map((ct, idx) => {
      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / activeCount;
      if (collapsible && portrait) {
        // Phone portrait: hubs are rows in one column under the rig
        return { id: ct.id, name: ct.name, angle: Math.PI / 2, radius: 0, color: ct.color, ...portraitHubPosition(idx) };
      }
      return {
        id: ct.id,
        name: ct.name,
        angle,
        radius: collapsible ? hubRingRadius(layoutHubText) : 360,
        color: ct.color,
      };
    });

    const initialNodes: GraphNode[] = [];
    const positions: Record<string, AttackNodePosition> = {};
    const blocks: Record<string, WorldBounds> = {};
    let contentBounds: WorldBounds = rigFootprint();

    activeClusters.forEach(cluster => {
      const machinesInCluster = bucketMap[cluster.id] || [];
      if (machinesInCluster.length === 0) return;
      // Use non-overlapping per-hub grid blocks for BOTH collapsible and non-collapsible views
      // so 180x84 machine cards never collide even on small (<=12) or exam graphs.
      const maxCols = collapsible ? WIDE_COLS : 3;
      const blockTextScale = collapsible ? layoutHubText : 1;
      const hub = getClusterHub(cluster);
      const block = collapsible && portrait
        ? computePortraitBlock(hub, machinesInCluster.length)
        : computeHubBlock(hub, cluster.angle, machinesInCluster.length, maxCols, blockTextScale);
      blocks[cluster.id] = block.box;
      contentBounds = unionBounds(contentBounds, hubFootprint(hub, blockTextScale));
      if (!collapsible) {
        contentBounds = unionBounds(contentBounds, block.box);
      }
      machinesInCluster.forEach((m, idx) => {
        const x = Math.round(block.positions[idx].x);
        const y = Math.round(block.positions[idx].y);
        initialNodes.push({
          id: m.id,
          name: m.name,
          ip: m.ip,
          os: m.os,
          platform: m.platform,
          difficulty: m.difficulty,
          status: m.status,
          cluster: cluster.id,
          x,
          y,
          machine: m,
        });
        positions[m.id] = { x, y };
      });
    });

    // Machines beyond the cluster cap are not drawn in the scoped view (see graphScopedVisibility).
    // They are kept as overflow nodes so ones the user already placed (saved position) still show.
    // Their grid coordinates sit below the scoped world, never on top of the cluster ring.
    const overflowNodes: GraphNode[] = universeMachines
      .filter(m => !positions[m.id])
      .map((m, idx) => ({
        id: m.id,
        name: m.name,
        ip: m.ip,
        os: m.os,
        platform: m.platform,
        difficulty: m.difficulty,
        status: m.status,
        cluster: activeClusters[0]?.id || 'default',
        x: 120 + (idx % 6) * 240,
        y: SCOPED_BOUNDS.maxY + 140 + Math.floor(idx / 6) * 110,
        machine: m,
      }));

    // Real subnets: groups some machine belongs to by its own match (same first-match rule SHOW ALL
    // uses). Groups that only exist because capacity overflow dumped machines into an empty bucket
    // are filler and are not counted.
    const matchedTemplateIds = new Set<string>();
    sample.forEach(m => {
      const t = clusterTemplates.find(c => c.matcher(m)) ?? clusterTemplates[clusterTemplates.length - 1];
      matchedTemplateIds.add(t.id);
    });
    const realSubnetCount = activeTemplates.filter(ct => matchedTemplateIds.has(ct.id)).length;

    const computedBounds: WorldBounds = {
      minX: Math.min(SCOPED_BOUNDS.minX, contentBounds.minX - 60),
      minY: Math.min(SCOPED_BOUNDS.minY, contentBounds.minY - 60),
      maxX: Math.max(SCOPED_BOUNDS.maxX, contentBounds.maxX + 60),
      maxY: Math.max(SCOPED_BOUNDS.maxY, contentBounds.maxY + 60),
    };

    return {
      clusters: activeClusters,
      defaultNodePositions: positions,
      clusteredNodes: initialNodes,
      overflowNodes,
      layoutBounds: computedBounds,
      realSubnetCount,
      hubBlocks: blocks,
    };
  }, [universeMachines, scopedPool, showAllNodes, collapsible, portrait, layoutHubText]);

  // Drawn nodes: the clustered ones, plus overflow machines the user already placed (saved position).
  // Saved positions are never touched; overflow without one stays out of the scoped view.
  const { allNodes, hiddenOverflowNodes } = useMemo(() => {
    if (showAllNodes || overflowNodes.length === 0) {
      return { allNodes: clusteredNodes, hiddenOverflowNodes: [] as GraphNode[] };
    }
    const { shown, hidden } = splitScopedOverflow(overflowNodes, storedNodePositions);
    return { allNodes: shown.length > 0 ? [...clusteredNodes, ...shown] : clusteredNodes, hiddenOverflowNodes: hidden };
  }, [showAllNodes, clusteredNodes, overflowNodes, storedNodePositions]);

  return { clusters, defaultNodePositions, clusteredNodes, overflowNodes, layoutBounds, realSubnetCount, allNodes, hiddenOverflowNodes, hubBlocks };
}

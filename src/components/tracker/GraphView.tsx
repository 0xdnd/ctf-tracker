import React, { useState, useRef, useMemo, useEffect, useLayoutEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { 
  Crosshair, 
  X,
  Maximize2,
  Network,
  Trash2,
} from 'lucide-react';
import { Machine } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { useAuthStore } from '../../store/useAuthStore';
import { PlatformIcon } from '../common/PlatformBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { playCyberSound } from '../../utils/helpers';
import { AttackGraphEdge, AttackNodePosition, ATTACK_EDGE_META, ATTACK_EDGE_TYPES } from '../../types/graph';
import { GraphEdgeInspectorDrawer } from './GraphEdgeInspectorDrawer';
import { exportToObsidianCanvas, exportToSvg, ExportGraphNode } from '../../utils/graphExportUtils';
import { computeAutoLayout } from '../../utils/graphAutoLayout';
import { useGraphHistory, type GraphHistoryBackend } from '../../hooks/useGraphHistory';
import { NodeCredentialsList, type GraphNodeCred } from './graph/NodeCredentialsList';
import { hasActiveFocusTrap } from '../../hooks/useFocusTrap';
import { NARROW_QUERY, matchesQuery } from '../../hooks/useMediaQuery';
import { getPrefersReducedMotion, useTheme } from '../../hooks/useTheme';
import {
  SCOPED_CLUSTER_CAP,
  decideScopedVisibility,
} from './graphScopedVisibility';
import type {
  GraphNode,
  ClusterDef,
  ClusterTemplate,
  WorldBounds,
  CanvasThemeTokens,
  ShowAllLayout,
  AttackNodeCardProps,
} from './graph/types';
import { getCanvasThemeTokens } from './graph/themeTokens';
import { getDifficultyColors, extractMachinePorts } from './graph/colors';
import {
  SCOPED_BOUNDS,
  getClusterHub,
  computeShowAllLayout,
  SHOW_ALL_CELL_W,
  SHOW_ALL_CELL_H,
  SHOW_ALL_BOUNDS_PADDING,
} from './graph/layout';
import {
  LOD_SCALE_THRESHOLD,
  LARGE_GRAPH_NODE_COUNT,
  LOD_DOT_SCALE_THRESHOLD,
  isNodeCulled,
  nodeVisibility,
  computeCanvasDelta,
} from './graph/culling';

export type { GraphNode, ClusterDef, ClusterTemplate, WorldBounds, CanvasThemeTokens, ShowAllLayout, AttackNodeCardProps };
import { AttackNodeCard } from './graph/AttackNodeCard';
import { MinimapPanel } from './graph/Minimap';
import { GraphToolbar } from './graph/GraphToolbar';
import { useGraphLayout } from './graph/useGraphLayout';
import { centerX, centerY } from './graph/constants';
import { HubCluster } from './graph/HubCluster';
import { useHubView } from './graph/useHubView';
import { GraphHudStats } from './graph/GraphHudStats';
import { measureSafeInsets, fitBoundsToSafeArea } from './graph/safeArea';
import {
  COLLAPSE_MIN_MACHINES,
  NARROW_CANVAS_PX,
  PORTRAIT_MAX_SCALE,
  PORTRAIT_MIN_PX_PER_UNIT,
  PORTRAIT_OVERVIEW_MIN_PX_PER_UNIT,
  computeCollapsibleBounds,
  hubTextScale,
  resolveCardPosition,
  unionBounds,
} from './graph/hubLayout';

// Anything the canvas must not treat as bare background (pan start, touch hint)
const INTERACTIVE_SELECTOR = '[data-node-interactive],[data-edge-interactive],[data-hub-interactive],button,input,select';

export { getCanvasThemeTokens };
export { AttackNodeCard };
export { getDifficultyColors, extractMachinePorts };
export { getClusterHub, computeShowAllLayout, SHOW_ALL_CELL_W, SHOW_ALL_CELL_H };
export { LOD_SCALE_THRESHOLD, LARGE_GRAPH_NODE_COUNT, LOD_DOT_SCALE_THRESHOLD, isNodeCulled, nodeVisibility, computeCanvasDelta };

export type { GraphNodeCred, GraphHistoryBackend };

export interface GraphViewAdapter {
  title?: string;
  positions: Record<string, AttackNodePosition>;
  edges: AttackGraphEdge[];
  historyBackend: GraphHistoryBackend;
  disableHubCollapse?: boolean;
  onActivateNode?: (machine: Machine) => void;
  activateNodeLabel?: string;
  onOpenNodeDetails?: (machine: Machine) => void;
  onDeleteNode?: (machine: Machine) => void;
  getNodeCreds?: (machineId: string) => GraphNodeCred[];
  hudActions?: React.ReactNode;
}

export interface GraphViewProps {
  filteredMachines: Machine[];
  adapter?: GraphViewAdapter;
}

// SHOW ALL spans a much larger world, so it may zoom out further than the scoped view (0.2).
const MIN_SCALE_SCOPED = 0.2;

// Touch gestures: one finger scrolls the page, two fingers pan/zoom the graph, and a card drags only
// after a short press. Mouse and pen keep the direct drag-to-pan path.
const TOUCH_LONG_PRESS_MS = 350;
const TOUCH_MOVE_SLOP = 8;
const TOUCH_HINT_MS = 1500;
const TOUCH_HINT_FADE_MS = 300;
const MIN_SCALE_SHOW_ALL = 0.05;
/** Highest zoom outside phone portrait (portrait uses PORTRAIT_MAX_SCALE). */
const MAX_SCALE_DEFAULT = 3.0;
const HUB_TWEEN_MS = 260;
const EMPTY_NODES: GraphNode[] = [];

// Fields that own the Escape key (cancel an edit, clear a search) while they have focus
function isEditableElement(el: EventTarget | Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}
// Edge docking radius around a collapsed hub (just outside its status-dot ring)
const HUB_DOCK_R = 56;
const HUB_DOCK_R_PORTRAIT = 34;

// ---------------------------------------------------------------------------
// Primary Attack Graph Component (<GraphView>)
// ---------------------------------------------------------------------------
const GRAPH_STATUS_LABELS: Record<string, string> = {
  backlog: 'Target Backlog',
  recon: 'Active Recon',
  todo: 'Target Backlog',
  'in-progress': 'Active Recon',
  foothold: 'Foothold',
  root: 'Root Pwned',
  completed: 'Completed',
};

export const GraphView: React.FC<GraphViewProps> = ({ filteredMachines = [], adapter }) => {
  const activeTargetId = useCtfStore((s) => s.activeTargetId);
  const setActiveTarget = useCtfStore((s) => s.setActiveTarget);
  const setSelectedMachineId = useCtfStore((s) => s.setSelectedMachineId);
  const credentials = useCtfStore((s) => s.credentials);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const globalLhost = useCtfStore((s) => s.globalVars.lhost);
  const operatorCallsign = useAuthStore((s) => s.user?.callsign || s.user?.name || '');
  const rigHeaderLabel = operatorCallsign.trim()
    ? `${operatorCallsign.trim().slice(0, 14).toUpperCase()}'S MACHINE`
    : 'YOUR MACHINE';
  const rigLhostLabel =
    globalLhost && globalLhost.trim() && !/x/i.test(globalLhost) && globalLhost.trim() !== '10.10.14.5'
      ? globalLhost.trim()
      : '10.10.14.x';
  
  // Zustand Store Slice (or optional Exam/Personal adapter) for M1/M2 coordinate persistence & M3 edges
  const allMachines = useCtfStore((s) => s.machines);
  const ctfNodePositions = useCtfStore((s) => s.graphNodePositions);
  const themePreset = useCtfStore((s) => s.themePreset || 'obsidian');
  const ctfGraphEdges = useCtfStore((s) => s.graphEdges);
  const storedNodePositions = adapter ? adapter.positions : ctfNodePositions;
  const graphEdges = adapter ? adapter.edges : ctfGraphEdges;
  const [personalOnly, setPersonalOnly] = useState(false);

  // Undo/redo: recorded replacements for the store's (or adapter's) edge + node-position mutators
  const {
    addGraphEdge, updateGraphEdge, deleteGraphEdge, setGraphNodePosition, applyNodePositions,
    undo, redo, canUndo, canRedo, undoLabel, redoLabel,
  } = useGraphHistory(
    adapter
      ? { backend: adapter.historyBackend, edges: adapter.edges, positions: adapter.positions }
      : undefined,
  );

  // M3 Vector Inspector & Pivot Connection Mode State
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isConnectingMode, setIsConnectingMode] = useState<boolean>(false);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

  // Reactive theme synchronization via ThemeContext so live Dark <-> Light toggles repaint the canvas immediately
  const { isDark } = useTheme();
  const tokens = useMemo(() => getCanvasThemeTokens(themePreset, isDark), [themePreset, isDark]);

  // DOM Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Viewport Engine State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isCanvasDragging, setIsCanvasDragging] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Touch screens and narrow (below md) viewports start with the minimap closed: it owns one-finger drags
  // (touch-none) and covers a large share of a phone-width graph. Wide mouse layouts keep it open; the toggle stays.
  const [isMinimapOpen, setIsMinimapOpen] = useState(() => !matchesQuery('(pointer: coarse)') && !matchesQuery(NARROW_QUERY));
  const [showAllNodes, setShowAllNodes] = useState(false);
  // SHOW ALL has its own world: it ignores the persisted (scoped) positions and keeps drags local,
  // so neither view can leak coordinates into the other. Cleared when SHOW ALL is turned off.
  const [showAllDragPositions, setShowAllDragPositions] = useState<Record<string, AttackNodePosition>>({});
  const showAllRef = useRef(false);
  showAllRef.current = showAllNodes;
  // Single mode-aware source of user-moved positions for every position read below
  const graphNodePositions = showAllNodes ? showAllDragPositions : storedNodePositions;

  // Transient local node dragging position buffer (120 FPS performance)
  const [transientNodePos, setTransientNodePos] = useState<{ id: string; x: number; y: number } | null>(null);

  // Live viewport engine: during pan/wheel gestures the view lives in viewRef and is written
  // straight to the DOM; pan/scale state is committed at gesture end (see commitLiveView).
  const viewRef = useRef({ x: 0, y: 0, scale: 1 });
  const viewportGRef = useRef<SVGGElement>(null);
  const minimapRectRef = useRef<SVGRectElement>(null);
  const viewDirtyRef = useRef(false);
  // In-flight animated view change (hub expand / collapse); any gesture cancels it
  const tweenRafRef = useRef<number | null>(null);
  const cancelTween = useCallback(() => {
    if (tweenRafRef.current !== null) {
      cancelAnimationFrame(tweenRafRef.current);
      tweenRafRef.current = null;
    }
  }, []);
  const panRafRef = useRef<number | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCullAtRef = useRef(0);
  // True while the graph is large: gestures then refresh the throttled live view (LOD tier + culling)
  const liveViewEnabledRef = useRef(false);
  // View + SVG size the last render's LOD tier / culling were computed from
  const appliedViewRef = useRef({ x: 0, y: 0, scale: 1 });
  const viewSizeRef = useRef<{ w: number; h: number } | null>(null);
  const minScaleRef = useRef(MIN_SCALE_SCOPED);
  const maxScaleRef = useRef(MAX_SCALE_DEFAULT);
  const layoutBoundsRef = useRef<WorldBounds>(SCOPED_BOUNDS);
  // Scoped view saved when SHOW ALL is entered, restored when leaving it
  const scopedViewRef = useRef<{ x: number; y: number; scale: number } | null>(null);
  // Throttled view used only for culling while a gesture is in flight (null when idle)
  const [liveCullView, setLiveCullView] = useState<{ x: number; y: number; scale: number } | null>(null);
  // Measured SVG size; null when unmeasurable (jsdom), which keeps culling off
  const [viewSize, setViewSize] = useState<{ w: number; h: number } | null>(null);

  // Canvas Panning Ref
  const canvasPanRef = useRef<{
    isPanning: boolean;
    startClientX: number;
    startClientY: number;
    initialPan: { x: number; y: number };
  }>({
    isPanning: false,
    startClientX: 0,
    startClientY: 0,
    initialPan: { x: 0, y: 0 },
  });

  // Node Dragging Ref
  const nodeDragRef = useRef<{
    isDown: boolean;
    isDragging: boolean;
    nodeId: string | null;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    initialPos: { x: number; y: number };
    currentPos: { x: number; y: number };
  }>({
    isDown: false,
    isDragging: false,
    nodeId: null,
    pointerId: -1,
    startClientX: 0,
    startClientY: 0,
    initialPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
  });

  // Active touch pointers (by pointerId). Two of them = a graph pan/zoom gesture.
  const touchPointersRef = useRef(
    new Map<number, { x: number; y: number; startX: number; startY: number; onBg: boolean; hinted: boolean }>()
  );
  // Touch card drag arms after a long press; until then one finger scrolls the page.
  const nodeTouchArmedRef = useRef(false);
  const nodeLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearNodeTouchPress = useCallback(() => {
    nodeTouchArmedRef.current = false;
    if (nodeLongPressTimerRef.current !== null) {
      clearTimeout(nodeLongPressTimerRef.current);
      nodeLongPressTimerRef.current = null;
    }
  }, []);
  // "Use two fingers to move the graph" hint
  const [touchHint, setTouchHint] = useState<'off' | 'on' | 'fading'>('off');
  const touchHintTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const showTouchHint = useCallback(() => {
    touchHintTimersRef.current.forEach(clearTimeout);
    touchHintTimersRef.current = [];
    setTouchHint('on');
    const reduce = getPrefersReducedMotion();
    if (reduce) {
      touchHintTimersRef.current.push(setTimeout(() => setTouchHint('off'), TOUCH_HINT_MS));
    } else {
      touchHintTimersRef.current.push(setTimeout(() => setTouchHint('fading'), TOUCH_HINT_MS));
      touchHintTimersRef.current.push(setTimeout(() => setTouchHint('off'), TOUCH_HINT_MS + TOUCH_HINT_FADE_MS));
    }
  }, []);
  useEffect(() => () => {
    touchHintTimersRef.current.forEach(clearTimeout);
    clearNodeTouchPress();
  }, [clearNodeTouchPress]);

  // Touch tracking refs
  const touchStartDistRef = useRef<number>(0);
  const touchStartScaleRef = useRef<number>(1);

  // Minimap dragging ref
  const isMinimapDraggingRef = useRef(false);

  // ---------------------------------------------------------------------------
  // 1. Stable Default Layout Engine (Computed against universe of machines)
  // ---------------------------------------------------------------------------
  const linkedEdgeNodeIds = useMemo(() => {
    const ids = new Set<string>();
    graphEdges.forEach((e) => {
      ids.add(e.sourceId);
      ids.add(e.targetId);
    });
    return ids;
  }, [graphEdges]);

  const personalMachines = useMemo(() => {
    if (adapter) return filteredMachines;
    return filteredMachines.filter(
      (m) =>
        Boolean(m.isCustom) ||
        m.platform === 'Custom' ||
        m.id === activeTargetId ||
        m.status !== 'backlog' ||
        Boolean(m.userPwnedAt) ||
        Boolean(m.rootPwnedAt) ||
        linkedEdgeNodeIds.has(m.id),
    );
  }, [adapter, filteredMachines, activeTargetId, linkedEdgeNodeIds]);

  const effectiveFilteredMachines = useMemo(() => {
    if (adapter) return filteredMachines;
    return personalOnly ? personalMachines : filteredMachines;
  }, [adapter, personalOnly, personalMachines, filteredMachines]);

  // We compute the default topology layout against allMachines (or filteredMachines as fallback)
  // so active filters DO NOT scramble coordinates when typing search or toggling tags!
  // In adapter or Personal-only mode, the scoped subset IS the universe so the 2k+ catalog steps aside.
  const universeMachines = useMemo(() => {
    if (adapter || personalOnly) return effectiveFilteredMachines;
    return allMachines.length > 0 ? allMachines : effectiveFilteredMachines;
  }, [adapter, personalOnly, allMachines, effectiveFilteredMachines]);

  // Scoped view: the active search/filter picks which machines fill the cluster slots, so matches
  // are always drawn first. Without a filter this is the whole universe (stable layout).
  const filterActive = effectiveFilteredMachines.length < universeMachines.length;
  // When every match already sits in the first cap machines the universe layout is kept, so
  // coordinates stay put while typing; the layout only repacks when a match would be left out.
  const { scopedPool, matchCount } = useMemo(() => {
    if (!filterActive) return { scopedPool: universeMachines, matchCount: universeMachines.length };
    const ids = new Set(effectiveFilteredMachines.map((m) => m.id));
    const matches = universeMachines.filter((m) => ids.has(m.id));
    const allInFirstCap = universeMachines.slice(0, SCOPED_CLUSTER_CAP).length >= matches.length
      && matches.every((m) => universeMachines.indexOf(m) < SCOPED_CLUSTER_CAP);
    return { scopedPool: allInFirstCap ? universeMachines : matches, matchCount: matches.length };
  }, [filterActive, universeMachines, effectiveFilteredMachines]);

  // Collapsible subnet hubs: scoped view only, and only once there are enough machines to clutter it.
  // Decided on the universe (not the filtered set) so the layout never jumps while typing a search.
  const collapsible = adapter?.disableHubCollapse
    ? false
    : !showAllNodes && universeMachines.length > COLLAPSE_MIN_MACHINES;
  // Phone portrait: hubs stack as rows and an open hub shows its cards in one column
  const portrait = collapsible && viewSize !== null && viewSize.w < NARROW_CANVAS_PX;
  // Everything that differs between phone portrait and the wide layout, computed together.
  const { hubText, rigCaptionFont, rigCaptionW, maxScale } = useMemo(() => {
    const k = portrait ? 1 : hubTextScale(viewSize);
    // The rig caption stays at least 11px on screen; on a phone it is narrower so it fits beside the left-hand column.
    const captionFont = portrait ? 14 : Math.round(14 * Math.max(k, 1.3));
    return {
      hubText: k,
      rigCaptionFont: captionFont,
      rigCaptionW: portrait ? 210 : Math.ceil(captionFont * 0.62 * 20) + 24,
      maxScale: portrait ? PORTRAIT_MAX_SCALE : MAX_SCALE_DEFAULT,
    };
  }, [portrait, viewSize]);
  const {
    clusters,
    defaultNodePositions,
    clusteredNodes,
    overflowNodes,
    layoutBounds,
    realSubnetCount,
    allNodes,
    hiddenOverflowNodes,
    hubBlocks,
  } = useGraphLayout({ universeMachines, scopedPool, showAllNodes, storedNodePositions, collapsible, portrait, hubText });
  const hiddenOverflowIds = useMemo(() => new Set(hiddenOverflowNodes.map((n) => n.id)), [hiddenOverflowNodes]);
  // Set of machine IDs currently matching active search/tag filters
  const visibleMachineIds = useMemo(() => {
    return new Set((effectiveFilteredMachines || []).map((m) => m.id));
  }, [effectiveFilteredMachines]);

  // Count only matching machines that were left out (pinned overflow that matches stays drawn)
  const pinnedMatchingOverflow = showAllNodes
    ? 0
    : overflowNodes.filter((n) => !hiddenOverflowIds.has(n.id) && (!filterActive || visibleMachineIds.has(n.id))).length;
  const scopedVisibility = decideScopedVisibility(showAllNodes ? 0 : matchCount, pinnedMatchingOverflow);

  // Filtered active nodes to render on the canvas
  const visibleNodes = useMemo(() => {
    return allNodes.filter((n) => visibleMachineIds.has(n.id));
  }, [allNodes, visibleMachineIds]);

  // Collapsible hubs: which machines each hub owns, which hub is open, and so which cards are drawn
  const { nodesByCluster, expansion: hubExpansion, expandedHubId, renderNodes, collapsedHubOf } = useHubView({
    collapsible,
    clusters,
    clusteredNodes,
    visibleNodes,
    visibleMachineIds,
    filterActive,
  });

  // Cluster hub lookup (id -> cluster + hub coordinates), replaces per-node clusters.find()
  const clusterHubs = useMemo(() => {
    const map = new Map<string, { cluster: ClusterDef; x: number; y: number }>();
    clusters.forEach((c) => {
      const hub = getClusterHub(c);
      map.set(c.id, { cluster: c, x: hub.x, y: hub.y });
    });
    return { map, first: clusters.length > 0 ? map.get(clusters[0].id) : undefined };
  }, [clusters]);

  // Cluster of the hovered node (drives hub highlight without a per-cluster scan)
  const hoveredClusterId = hoveredNodeId
    ? visibleNodes.find((n) => n.id === hoveredNodeId)?.cluster
    : undefined;

  // Scoped world: the fixed 1600x1200 basis, grown to hold the expanded hub's card block
  const expandedBlock = expandedHubId ? hubBlocks[expandedHubId] : undefined;
  const scopedBounds = useMemo<WorldBounds>(
    () =>
      expandedBlock
        ? unionBounds(SCOPED_BOUNDS, {
            minX: expandedBlock.minX - 130,
            minY: expandedBlock.minY - 90,
            maxX: expandedBlock.maxX + 130,
            maxY: expandedBlock.maxY + 90,
          })
        : SCOPED_BOUNDS,
    [expandedBlock]
  );

  // Large-graph performance modes
  const isLargeGraph = visibleNodes.length > LARGE_GRAPH_NODE_COUNT;
  // LOD tier follows the throttled live view during gestures, the committed scale otherwise
  const tierScale = liveCullView?.scale ?? scale;
  const lodTier: 'full' | 'compact' | 'dot' = !isLargeGraph
    ? 'full'
    : tierScale < LOD_DOT_SCALE_THRESHOLD
    ? 'dot'
    : tierScale < LOD_SCALE_THRESHOLD
    ? 'compact'
    : 'full';
  const animatePulses = !isLargeGraph;
  liveViewEnabledRef.current = isLargeGraph;
  appliedViewRef.current = liveCullView ?? { x: pan.x, y: pan.y, scale };
  viewSizeRef.current = viewSize;
  const minScale = showAllNodes ? MIN_SCALE_SHOW_ALL : MIN_SCALE_SCOPED;
  minScaleRef.current = minScale;
  maxScaleRef.current = maxScale;
  layoutBoundsRef.current = showAllNodes ? layoutBounds : scopedBounds;

  // World bounds: layout bounds extended by persisted (user-moved) positions. Scoped stays 1600x1200.
  const worldBounds = useMemo<WorldBounds>(() => {
    if (!showAllNodes) return scopedBounds;
    let { minX, minY, maxX, maxY } = layoutBounds;
    allNodes.forEach((n) => {
      const p = graphNodePositions[n.id];
      if (!p) return;
      minX = Math.min(minX, p.x - 90 - SHOW_ALL_BOUNDS_PADDING);
      maxX = Math.max(maxX, p.x + 90 + SHOW_ALL_BOUNDS_PADDING);
      minY = Math.min(minY, p.y - 42 - SHOW_ALL_BOUNDS_PADDING);
      maxY = Math.max(maxY, p.y + 42 + SHOW_ALL_BOUNDS_PADDING);
    });
    return { minX, minY, maxX, maxY };
  }, [showAllNodes, scopedBounds, layoutBounds, allNodes, graphNodePositions]);

  // Minimap shows the whole world, expanded to the 4:3 basis so it never letterboxes
  const minimapBounds = useMemo(() => {
    let x = worldBounds.minX;
    let y = worldBounds.minY;
    let w = worldBounds.maxX - worldBounds.minX;
    let h = worldBounds.maxY - worldBounds.minY;
    if (w * 3 > h * 4) {
      const newH = (w * 3) / 4;
      y -= (newH - h) / 2;
      h = newH;
    } else {
      const newW = (h * 4) / 3;
      x -= (newW - w) / 2;
      w = newW;
    }
    return { x, y, w, h, unit: w / 1600 };
  }, [worldBounds]);

  // World-space rect (visible area + one viewport margin per side) used to cull off-screen cards
  const cullRect = useMemo(() => {
    if (!isLargeGraph || !viewSize) return null;
    const v = liveCullView ?? { x: pan.x, y: pan.y, scale };
    // SVG viewBox 1600x1200 with default xMidYMid meet
    const aspect = Math.min(viewSize.w / 1600, viewSize.h / 1200) || 1;
    const ox = (viewSize.w - 1600 * aspect) / 2;
    const oy = (viewSize.h - 1200 * aspect) / 2;
    const minX = (-ox / aspect - v.x) / v.scale;
    const maxX = ((viewSize.w - ox) / aspect - v.x) / v.scale;
    const minY = (-oy / aspect - v.y) / v.scale;
    const maxY = ((viewSize.h - oy) / aspect - v.y) / v.scale;
    const mw = maxX - minX;
    const mh = maxY - minY;
    return {
      outer: { minX: minX - mw, maxX: maxX + mw, minY: minY - mh, maxY: maxY + mh },
      inner: { minX, maxX, minY, maxY },
    };
  }, [isLargeGraph, viewSize, liveCullView, pan, scale]);

  // ---------------------------------------------------------------------------
  // 2. Coordinate Delta Translation Engine
  // ---------------------------------------------------------------------------
  const getCanvasDelta = useCallback((screenDx: number, screenDy: number) => {
    if (svgRef.current && typeof svgRef.current.getScreenCTM === 'function') {
      const ctm = svgRef.current.getScreenCTM();
      if (ctm) {
        try {
          const inv = ctm.inverse();
          const dxSvg = screenDx * inv.a + screenDy * inv.c;
          const dySvg = screenDx * inv.b + screenDy * inv.d;
          return {
            dx: dxSvg / viewRef.current.scale,
            dy: dySvg / viewRef.current.scale,
          };
        } catch { /* best effort; fall through */ }
      }
    }
    const rect = containerRef.current?.getBoundingClientRect();
    return computeCanvasDelta(screenDx, screenDy, viewRef.current.scale, rect);
  }, []);

  // Keeps dragged cards inside the layout's world (scoped: 90..1510 x 50..1150)
  const clampNodePos = useCallback((x: number, y: number) => {
    const b = layoutBoundsRef.current;
    return {
      x: Math.round(Math.max(b.minX + 90, Math.min(b.maxX - 90, x))),
      y: Math.round(Math.max(b.minY + 50, Math.min(b.maxY - 50, y))),
    };
  }, []);

  // Pushes the live view to the viewport <g> (and the minimap frame) without a React render
  const applyViewToDom = useCallback(() => {
    const v = viewRef.current;
    viewportGRef.current?.setAttribute('transform', `translate(${v.x}, ${v.y}) scale(${v.scale})`);
    const r = minimapRectRef.current;
    if (r) {
      r.setAttribute('x', String(-v.x / v.scale));
      r.setAttribute('y', String(-v.y / v.scale));
      r.setAttribute('width', String(1600 / v.scale));
      r.setAttribute('height', String(1200 / v.scale));
    }
  }, []);

  // Commit the live view into React state (gesture end / wheel idle)
  const commitLiveView = useCallback(() => {
    if (wheelTimerRef.current !== null) {
      clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = null;
    }
    if (panRafRef.current !== null) {
      cancelAnimationFrame(panRafRef.current);
      panRafRef.current = null;
    }
    const v = viewRef.current;
    viewDirtyRef.current = false;
    applyViewToDom();
    setScale(v.scale);
    setPan({ x: v.x, y: v.y });
    setLiveCullView(null);
  }, [applyViewToDom]);

  // Throttled (~200ms) culling-rect refresh while a gesture is in flight
  const refreshLiveCull = useCallback(() => {
    if (!liveViewEnabledRef.current) return;
    // Skip re-renders that could not change anything: same LOD tier, same zoom neighbourhood,
    // and still well inside the one-viewport culling margin
    const a = appliedViewRef.current;
    const cur = viewRef.current;
    const tierOf = (sc: number) => (sc < LOD_DOT_SCALE_THRESHOLD ? 2 : sc < LOD_SCALE_THRESHOLD ? 1 : 0);
    const size = viewSizeRef.current;
    const ratio = cur.scale / a.scale;
    // At full-card zoom the margin ring is rendered compact, so panning must keep upgrading cards
    // entering the view: only the compact / dot tiers may skip refreshes
    if (tierOf(cur.scale) !== 0 && tierOf(a.scale) === tierOf(cur.scale) && ratio < 1.5 && ratio > 1 / 1.5) {
      const aspect = size ? Math.min(size.w / 1600, size.h / 1200) || 1 : 1;
      const visibleW = (size ? size.w / aspect : 1600) / cur.scale;
      const visibleH = (size ? size.h / aspect : 1200) / cur.scale;
      const movedX = Math.abs(cur.x / cur.scale - a.x / a.scale);
      const movedY = Math.abs(cur.y / cur.scale - a.y / a.scale);
      if (movedX < visibleW * 0.5 && movedY < visibleH * 0.5) return;
    }
    const now = performance.now();
    if (now - lastCullAtRef.current < 200) return;
    lastCullAtRef.current = now;
    const v = viewRef.current;
    setLiveCullView({ x: v.x, y: v.y, scale: v.scale });
  }, []);

  // Keep the ref + DOM transform in lockstep with committed state (programmatic changes, commits)
  useLayoutEffect(() => {
    viewRef.current = { x: pan.x, y: pan.y, scale };
    viewDirtyRef.current = false;
    if (wheelTimerRef.current !== null) {
      clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = null;
    }
    applyViewToDom();
    setLiveCullView(null);
  }, [pan, scale, applyViewToDom]);

  useEffect(() => () => {
    if (wheelTimerRef.current !== null) clearTimeout(wheelTimerRef.current);
    if (panRafRef.current !== null) cancelAnimationFrame(panRafRef.current);
    if (tweenRafRef.current !== null) cancelAnimationFrame(tweenRafRef.current);
  }, []);

  // Track the rendered SVG size for viewport culling
  useLayoutEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w > 0 && h > 0) {
        setViewSize((prev) => (prev && prev.w === w && prev.h === h ? prev : { w, h }));
      } else {
        setViewSize(null);
      }
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Base view for programmatic zoom: the live view if a gesture is still uncommitted
  const getBaseView = () => (viewDirtyRef.current ? viewRef.current : { x: pan.x, y: pan.y, scale });

  // ---------------------------------------------------------------------------
  // 3. Canvas Background Panning Handlers
  // ---------------------------------------------------------------------------
  const touchCentroid = () => {
    let sx = 0;
    let sy = 0;
    touchPointersRef.current.forEach((p) => {
      sx += p.x;
      sy += p.y;
    });
    const n = touchPointersRef.current.size || 1;
    return { x: sx / n, y: sy / n };
  };

  const resetNodeDrag = () => {
    clearNodeTouchPress();
    nodeDragRef.current = {
      isDown: false,
      isDragging: false,
      nodeId: null,
      pointerId: -1,
      startClientX: 0,
      startClientY: 0,
      initialPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 },
    };
    setTransientNodePos(null);
  };

  // Capture phase: runs even when a card or edge stops the bubbling pointerdown, so a second finger
  // that lands on a card still counts toward the two-finger graph gesture.
  const handleCanvasPointerDownCapture = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    const target = e.target as HTMLElement | SVGElement;
    if (target.closest('[data-testid="graph-minimap-svg"]')) return;
    const onBg = !target.closest(INTERACTIVE_SELECTOR);
    const pointers = touchPointersRef.current;
    pointers.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      onBg,
      hinted: false,
    });
    if (pointers.size === 2) {
      // Second finger: this is a graph gesture, so drop any pending card press and start the pan
      if (nodeDragRef.current.isDown) resetNodeDrag();
      const c = touchCentroid();
      canvasPanRef.current = {
        isPanning: true,
        startClientX: c.x,
        startClientY: c.y,
        initialPan: { x: viewRef.current.x, y: viewRef.current.y },
      };
      setIsCanvasDragging(true);
    }
  };

  const panToClient = (clientX: number, clientY: number) => {
    const screenDx = clientX - canvasPanRef.current.startClientX;
    const screenDy = clientY - canvasPanRef.current.startClientY;

    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect && rect.width > 0 ? rect.width : 1600;
    const h = rect && rect.height > 0 ? rect.height : 1200;
    const aspect = Math.min(w / 1600, h / 1200) || 1;

    viewRef.current = {
      x: canvasPanRef.current.initialPan.x + screenDx / aspect,
      y: canvasPanRef.current.initialPan.y + screenDy / aspect,
      scale: viewRef.current.scale,
    };
    viewDirtyRef.current = true;
    if (panRafRef.current === null) {
      panRafRef.current = requestAnimationFrame(() => {
        panRafRef.current = null;
        applyViewToDom();
      });
    }
    refreshLiveCull();
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement | SVGElement;
    if (target.closest(INTERACTIVE_SELECTOR)) {
      return;
    }
    cancelTween();
    if (e.button !== 0) return;
    // Touch: one finger never pans (the page scrolls); the two-finger pan starts in the capture handler
    if (e.pointerType === 'touch') return;

    canvasPanRef.current = {
      isPanning: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialPan: { x: viewRef.current.x, y: viewRef.current.y },
    };
    setIsCanvasDragging(true);
    if (typeof containerRef.current?.setPointerCapture === 'function') {
      try {
        containerRef.current.setPointerCapture(e.pointerId);
      } catch { /* pointer capture unsupported */ }
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    const isTouch = e.pointerType === 'touch';
    if (isTouch) {
      const t = touchPointersRef.current.get(e.pointerId);
      if (t) {
        t.x = e.clientX;
        t.y = e.clientY;
      }
      if (touchPointersRef.current.size >= 2) {
        if (canvasPanRef.current.isPanning) {
          const c = touchCentroid();
          panToClient(c.x, c.y);
        }
        return;
      }
      // One finger on empty canvas: the page scrolls; tell the user how to move the graph
      if (t && t.onBg && !t.hinted && Math.hypot(e.clientX - t.startX, e.clientY - t.startY) >= TOUCH_MOVE_SLOP / 2) {
        t.hinted = true;
        showTouchHint();
      }
    }

    // Canvas pan motion (mouse / pen)
    if (!isTouch && canvasPanRef.current.isPanning) {
      panToClient(e.clientX, e.clientY);
    }

    // Node drag motion fallback if captured on canvas (touch only once the long press armed it)
    if (nodeDragRef.current.isDown && nodeDragRef.current.nodeId && (!isTouch || nodeTouchArmedRef.current)) {
      const screenDx = e.clientX - nodeDragRef.current.startClientX;
      const screenDy = e.clientY - nodeDragRef.current.startClientY;
      const dist = Math.hypot(screenDx, screenDy);

      if (dist >= 4) {
        nodeDragRef.current.isDragging = true;
      }

      if (nodeDragRef.current.isDragging) {
        const { dx, dy } = getCanvasDelta(screenDx, screenDy);
        const newX = clampNodePos(nodeDragRef.current.initialPos.x + dx, nodeDragRef.current.initialPos.y + dy).x;
        const newY = clampNodePos(nodeDragRef.current.initialPos.x + dx, nodeDragRef.current.initialPos.y + dy).y;

        nodeDragRef.current.currentPos = { x: newX, y: newY };

        setTransientNodePos({
          id: nodeDragRef.current.nodeId,
          x: newX,
          y: newY,
        });
      }
    }
  };

  // Interrupted gesture (pointercancel / lost capture): commit the live view, drop any node drag
  const handleCanvasPointerCancel = (e: React.PointerEvent) => {
    const isTouch = e.pointerType === 'touch';
    if (isTouch) {
      const t = touchPointersRef.current.get(e.pointerId);
      touchPointersRef.current.delete(e.pointerId);
      // The browser took a single finger on empty canvas for page scroll: say how to move the graph
      if (e.type === 'pointercancel' && t && t.onBg && !t.hinted && !canvasPanRef.current.isPanning) {
        showTouchHint();
      }
    }
    if (canvasPanRef.current.isPanning && (!isTouch || touchPointersRef.current.size < 2)) {
      canvasPanRef.current.isPanning = false;
      setIsCanvasDragging(false);
      if (viewDirtyRef.current) commitLiveView();
      setLiveCullView(null);
    }
    if (nodeDragRef.current.isDown && (!isTouch || nodeDragRef.current.pointerId === e.pointerId)) {
      resetNodeDrag();
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    const isTouch = e.pointerType === 'touch';
    if (isTouch) touchPointersRef.current.delete(e.pointerId);
    if (canvasPanRef.current.isPanning && (!isTouch || touchPointersRef.current.size < 2)) {
      canvasPanRef.current.isPanning = false;
      setIsCanvasDragging(false);
      if (viewDirtyRef.current) commitLiveView();
      if (typeof containerRef.current?.releasePointerCapture === 'function') {
        try {
          containerRef.current.releasePointerCapture(e.pointerId);
        } catch { /* pointer already released */ }
      }
    }

    // Node drag release fallback
    if (
      nodeDragRef.current.isDown &&
      nodeDragRef.current.nodeId &&
      (!isTouch || nodeDragRef.current.pointerId === e.pointerId)
    ) {
      const nodeId = nodeDragRef.current.nodeId;
      if (nodeDragRef.current.isDragging) {
        commitNodePosition(nodeId, nodeDragRef.current.currentPos);
      }
      resetNodeDrag();
    }
  };

  // M3: Node selection & interactive vector connection logic
  const handleNodeSelect = useCallback((node: GraphNode) => {
    if (isConnectingMode) {
      if (!connectingSourceId) {
        setConnectingSourceId(node.id);
        if (soundEnabled) playCyberSound('click');
      } else {
        if (connectingSourceId !== node.id) {
          const newEdge = addGraphEdge({
            sourceId: connectingSourceId,
            targetId: node.id,
            type: 'pivot-ssh',
            status: 'potential',
          });
          setSelectedEdgeId(newEdge.id);
          setConnectingSourceId(null);
          setIsConnectingMode(false);
          if (soundEnabled) playCyberSound('root');
        } else {
          // Deselect
          setConnectingSourceId(null);
          if (soundEnabled) playCyberSound('toggle');
        }
      }
    } else {
      setSelectedNode(node);
      setSelectedEdgeId(null);
    }
  }, [isConnectingMode, connectingSourceId, addGraphEdge, soundEnabled]);

  // ---------------------------------------------------------------------------
  // 4. Freeform Node Dragging Handlers
  // ---------------------------------------------------------------------------
  // Latest-value refs keep the node callbacks identity-stable so AttackNodeCard's memo holds
  const selectRef = useRef(handleNodeSelect);
  const positionsRef = useRef({ graphNodePositions, defaultNodePositions });
  const setGraphNodePositionRef = useRef(setGraphNodePosition);
  useLayoutEffect(() => {
    selectRef.current = handleNodeSelect;
    positionsRef.current = { graphNodePositions, defaultNodePositions };
    setGraphNodePositionRef.current = setGraphNodePosition;
  });

  // Scoped: persisted + undoable. SHOW ALL: component-local only (never touches the store/history).
  const commitNodePosition = useCallback((id: string, pos: AttackNodePosition) => {
    if (showAllRef.current) {
      setShowAllDragPositions((prev) => ({ ...prev, [id]: pos }));
    } else {
      setGraphNodePositionRef.current(id, pos);
    }
  }, []);

  // Suppresses the synthetic trailing browser `click` that fires immediately after a node drag ends.
  const suppressClickNodeIdRef = useRef<string | null>(null);
  const handleNodeSelectStable = useCallback((node: GraphNode) => {
    if (suppressClickNodeIdRef.current === node.id) {
      suppressClickNodeIdRef.current = null;
      return;
    }
    selectRef.current(node);
  }, []);
  // Keyboard focus follows a hub fold / unfold: cards unmount, and focus must not drop to <body>
  const pendingHubFocusRef = useRef<string | null>(null);
  const expandedHubIdRef = useRef<string | null>(null);
  expandedHubIdRef.current = expandedHubId;
  useEffect(() => {
    const id = pendingHubFocusRef.current;
    if (id === null) return;
    pendingHubFocusRef.current = null;
    containerRef.current
      ?.querySelector<SVGGElement>(`[data-testid="graph-hub-${id}"]`)
      ?.focus({ preventScroll: true });
  }, [expandedHubId]);

  const hubToggle = hubExpansion.toggle;
  const hubCollapse = hubExpansion.collapse;
  const handleHubToggle = useCallback(
    (clusterId: string) => {
      pendingHubFocusRef.current = clusterId;
      setSelectedNode(null); // the flyout must not point at a card that is about to unmount
      hubToggle(clusterId);
      if (soundEnabled) playCyberSound('click');
    },
    [hubToggle, soundEnabled]
  );
  // Escape and the HUD Collapse chip: fold the open hub and put focus back on it
  const foldHub = useCallback(() => {
    pendingHubFocusRef.current = expandedHubIdRef.current;
    setSelectedNode(null);
    hubCollapse();
  }, [hubCollapse]);
  // Any other route that folds the selected machine away (a filter change) also closes its flyout
  const selectedFoldedInto = selectedNode ? collapsedHubOf(selectedNode.id) : null;
  useEffect(() => {
    if (selectedFoldedInto) setSelectedNode(null);
  }, [selectedFoldedInto]);

  const handleNodePointerDown = useCallback((e: React.PointerEvent<SVGGElement>, node: GraphNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    suppressClickNodeIdRef.current = null;
    const isTouch = e.pointerType === 'touch';
    // A second finger makes this a graph gesture (started in the capture handler), not a card press
    if (isTouch && touchPointersRef.current.size >= 2) return;

    if (typeof e.currentTarget.setPointerCapture === 'function') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch { /* pointer capture unsupported */ }
    }

    const { graphNodePositions: storedPositions, defaultNodePositions: basePositions } = positionsRef.current;
    const currentX = storedPositions[node.id]?.x ?? basePositions[node.id]?.x ?? node.x;
    const currentY = storedPositions[node.id]?.y ?? basePositions[node.id]?.y ?? node.y;

    nodeDragRef.current = {
      isDown: true,
      isDragging: false,
      nodeId: node.id,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      initialPos: { x: currentX, y: currentY },
      currentPos: { x: currentX, y: currentY },
    };

    // Touch: a single finger scrolls the page; the card only becomes draggable after a long press
    clearNodeTouchPress();
    if (isTouch) {
      const pid = e.pointerId;
      nodeLongPressTimerRef.current = setTimeout(() => {
        nodeLongPressTimerRef.current = null;
        if (nodeDragRef.current.isDown && nodeDragRef.current.pointerId === pid) {
          nodeTouchArmedRef.current = true;
        }
      }, TOUCH_LONG_PRESS_MS);
    }
  }, [clearNodeTouchPress]);

  const handleNodePointerMove = useCallback((e: React.PointerEvent<SVGGElement>, node: GraphNode) => {
    if (!nodeDragRef.current.isDown || nodeDragRef.current.nodeId !== node.id) return;

    const screenDx = e.clientX - nodeDragRef.current.startClientX;
    const screenDy = e.clientY - nodeDragRef.current.startClientY;
    const dist = Math.hypot(screenDx, screenDy);

    if (e.pointerType === 'touch' && !nodeTouchArmedRef.current) {
      // Moved before the long press armed: this is a page scroll, not a card drag
      if (dist >= TOUCH_MOVE_SLOP) {
        clearNodeTouchPress();
        nodeDragRef.current = {
          isDown: false,
          isDragging: false,
          nodeId: null,
          pointerId: -1,
          startClientX: 0,
          startClientY: 0,
          initialPos: { x: 0, y: 0 },
          currentPos: { x: 0, y: 0 },
        };
      }
      return;
    }

    if (dist >= 4) {
      nodeDragRef.current.isDragging = true;
    }

    if (nodeDragRef.current.isDragging) {
      const { dx, dy } = getCanvasDelta(screenDx, screenDy);
      const newX = clampNodePos(nodeDragRef.current.initialPos.x + dx, nodeDragRef.current.initialPos.y + dy).x;
      const newY = clampNodePos(nodeDragRef.current.initialPos.x + dx, nodeDragRef.current.initialPos.y + dy).y;

      nodeDragRef.current.currentPos = { x: newX, y: newY };

      setTransientNodePos({
        id: node.id,
        x: newX,
        y: newY,
      });
    }
  }, [getCanvasDelta, clampNodePos, clearNodeTouchPress]);

  const handleNodePointerUp = useCallback((e: React.PointerEvent<SVGGElement>, node: GraphNode) => {
    if (!nodeDragRef.current.isDown || nodeDragRef.current.nodeId !== node.id) return;
    e.stopPropagation();

    if (typeof e.currentTarget.releasePointerCapture === 'function') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch { /* pointer already released */ }
    }

    if (nodeDragRef.current.isDragging) {
      commitNodePosition(node.id, nodeDragRef.current.currentPos);
    } else {
      // Clean click without movement threshold: select node or connect vector
      selectRef.current(node);
    }
    // Swallow the trailing synthetic browser `click` for BOTH drag and clean pointerup so:
    //  - clean clicks never double-fire (breaking Toolbar "Add link" / closing GraphEdgeInspectorDrawer)
    //  - drags never erroneously pop open the node flyout or select a link source.
    suppressClickNodeIdRef.current = node.id;
    const upNodeId = node.id;
    setTimeout(() => {
      if (suppressClickNodeIdRef.current === upNodeId) suppressClickNodeIdRef.current = null;
    }, 0);

    clearNodeTouchPress();
    nodeDragRef.current = {
      isDown: false,
      isDragging: false,
      nodeId: null,
      pointerId: -1,
      startClientX: 0,
      startClientY: 0,
      initialPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 },
    };
    setTransientNodePos(null);
  }, [commitNodePosition, clearNodeTouchPress]);

  // ---------------------------------------------------------------------------
  // 5. Wheel Zoom-To-Cursor Handler
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelTween();
      const view = viewRef.current;
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newScale = Math.min(Math.max(view.scale * zoomFactor, minScaleRef.current), maxScaleRef.current);
      if (newScale === view.scale) return;

      // Compute cursor in SVG root coordinate space:
      let cursorX = 800;
      let cursorY = 600;

      if (svgRef.current && typeof svgRef.current.getScreenCTM === 'function') {
        const ctm = svgRef.current.getScreenCTM();
        if (ctm) {
          try {
            const inv = ctm.inverse();
            cursorX = e.clientX * inv.a + e.clientY * inv.c + inv.e;
            cursorY = e.clientX * inv.b + e.clientY * inv.d + inv.f;
          } catch { /* non-invertible matrix; keep previous cursor */ }
        }
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const w = rect.width || 1600;
        const h = rect.height || 1200;
        const aspect = Math.min(w / 1600, h / 1200) || 1;
        const ox = (w - 1600 * aspect) / 2;
        const oy = (h - 1200 * aspect) / 2;
        cursorX = (e.clientX - rect.left - ox) / aspect;
        cursorY = (e.clientY - rect.top - oy) / aspect;
      }

      // Exact zoom-to-cursor formula:
      // newPan = cursor - (cursor - pan) * (newScale / oldScale)
      const newPanX = cursorX - (cursorX - view.x) * (newScale / view.scale);
      const newPanY = cursorY - (cursorY - view.y) * (newScale / view.scale);

      // Live update: DOM only; React state is committed once the wheel goes idle
      viewRef.current = { x: newPanX, y: newPanY, scale: newScale };
      viewDirtyRef.current = true;
      applyViewToDom();
      refreshLiveCull();
      if (wheelTimerRef.current !== null) clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = setTimeout(commitLiveView, 150);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyViewToDom, commitLiveView, refreshLiveCull, cancelTween]);

  // Two fingers (or an armed card drag) own the gesture: stop the browser from scrolling/zooming the
  // page. React's touchmove listener is passive, so this needs a native non-passive one.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (!e.cancelable) return;
      if (touchPointersRef.current.size >= 2 || nodeTouchArmedRef.current) e.preventDefault();
    };
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  // Touch Pinch Zoom Handler
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchStartDistRef.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      // Fold any uncommitted pan/zoom into state, then pinch relative to the live view
      if (viewDirtyRef.current) commitLiveView();
      touchStartScaleRef.current = viewRef.current.scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current > 0) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / touchStartDistRef.current;
      const newScale = Math.min(Math.max(touchStartScaleRef.current * factor, minScaleRef.current), maxScaleRef.current);
      if (newScale === viewRef.current.scale) return;
      // Live update (DOM only); committed in handleTouchEnd
      viewRef.current = { ...viewRef.current, scale: newScale };
      viewDirtyRef.current = true;
      applyViewToDom();
      refreshLiveCull();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      touchStartDistRef.current = 0;
      if (viewDirtyRef.current && !canvasPanRef.current.isPanning) commitLiveView();
    }
  };

  // ---------------------------------------------------------------------------
  // 6. Navigation Controls Toolbar Actions
  // ---------------------------------------------------------------------------
  const handleZoomIn = () => {
    cancelTween();
    const base = getBaseView();
    // Phone portrait opens fitted (small text); the first zoom-in jumps to the readable size
    const readable = portrait ? PORTRAIT_MIN_PX_PER_UNIT / fitAspect : 0;
    const newScale = Math.min(Math.max(base.scale * 1.2, readable), maxScaleRef.current);
    const cursorX = 800;
    const cursorY = 600;
    const newPanX = cursorX - (cursorX - base.x) * (newScale / base.scale);
    const newPanY = cursorY - (cursorY - base.y) * (newScale / base.scale);
    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomOut = () => {
    cancelTween();
    const base = getBaseView();
    const newScale = Math.max(base.scale / 1.2, minScale);
    const cursorX = 800;
    const cursorY = 600;
    const newPanX = cursorX - (cursorX - base.x) * (newScale / base.scale);
    const newPanY = cursorY - (cursorY - base.y) * (newScale / base.scale);
    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  // Animated (or instant) move to a committed view; hub expand / collapse uses the animated path
  const goToView = (t: { x: number; y: number; scale: number }, animate: boolean) => {
    cancelTween();
    const reduce = getPrefersReducedMotion();
    if (!animate || reduce || !viewSizeRef.current || typeof requestAnimationFrame === 'undefined') {
      setScale(t.scale);
      setPan({ x: t.x, y: t.y });
      return;
    }
    const from = { ...getBaseView() };
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / HUB_TWEEN_MS);
      const e = 1 - Math.pow(1 - p, 3);
      viewRef.current = {
        x: from.x + (t.x - from.x) * e,
        y: from.y + (t.y - from.y) * e,
        scale: from.scale + (t.scale - from.scale) * e,
      };
      viewDirtyRef.current = true;
      applyViewToDom();
      refreshLiveCull();
      if (p < 1) {
        tweenRafRef.current = requestAnimationFrame(step);
      } else {
        tweenRafRef.current = null;
        commitLiveView();
      }
    };
    tweenRafRef.current = requestAnimationFrame(step);
  };

  // Frames a world rect inside the canvas area the floating chrome leaves free (HUD, rail, legend, minimap)
  // SVG px per world unit at scale 1 (the 1600x1200 basis fitted into the canvas)
  const fitAspect = (viewSize ? Math.min(viewSize.w / 1600, viewSize.h / 1200) : 1) || 1;
  const solveFit = (b: WorldBounds, pad: number, maxScale = 1.8, readable = true) => {
    const size = viewSize ?? { w: 1600, h: 1200 };
    const insets = viewSize ? measureSafeInsets(containerRef.current) : { top: 0, right: 0, bottom: 0, left: 0 };
    // Phone portrait: the overview fits the whole hub column (down to a low floor, a taller column keeps its top in
    // view and pans); opening a hub zooms to the readable size instead.
    const readableFloor = portrait ? (readable ? PORTRAIT_MIN_PX_PER_UNIT : PORTRAIT_OVERVIEW_MIN_PX_PER_UNIT) / fitAspect : 0;
    return fitBoundsToSafeArea(
      { minX: b.minX - pad, minY: b.minY - pad, maxX: b.maxX + pad, maxY: b.maxY + pad },
      size,
      insets,
      { minScale: Math.max(minScale, readableFloor), maxScale: Math.max(maxScale, readableFloor), anchorTop: portrait }
    );
  };

  const currentPosOf = useCallback(
    (n: GraphNode) =>
      transientNodePos?.id === n.id ? { x: transientNodePos.x, y: transientNodePos.y } : resolveCardPosition(n.id, graphNodePositions, defaultNodePositions, n),
    [transientNodePos, graphNodePositions, defaultNodePositions]
  );

  const hubPoints = useMemo(() => clusters.map((c) => ({ id: c.id, ...getClusterHub(c) })), [clusters]);

  // Collapsible hubs: the open hub and its cards, or the rig + every hub + every drawn card
  const collapsibleBounds = useCallback(
    (hubId: string | null): WorldBounds =>
      computeCollapsibleBounds({
        hubId,
        hubs: hubPoints,
        focusCards: hubId ? (nodesByCluster.get(hubId) ?? []).map(currentPosOf) : [],
        drawnCards: renderNodes.map(currentPosOf),
        textScale: hubText,
        portrait,
      }),
    [hubPoints, nodesByCluster, currentPosOf, renderNodes, hubText, portrait]
  );

  const fitCollapsible = (hubId: string | null, animate: boolean) => {
    const r = solveFit(collapsibleBounds(hubId), portrait ? 4 : 28, portrait ? PORTRAIT_MAX_SCALE : hubId ? MAX_SCALE_DEFAULT : 1.4, hubId !== null);
    goToView({ x: r.x, y: r.y, scale: r.scale }, animate);
  };

  const handleResetView = () => {
    setSelectedNode(null);
    if (collapsible && viewSize) {
      fitCollapsible(null, true);
      return;
    }
    if (!collapsible && !showAllNodes && viewSize && visibleNodes.length > 0) {
      handleFitToScreen();
      return;
    }
    cancelTween();
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const handleFitToScreen = () => {
    if (collapsible) {
      fitCollapsible(null, true);
      return;
    }
    if (visibleNodes.length === 0) {
      handleResetView();
      return;
    }

    let minX = 800 - 60;
    let maxX = 800 + 60;
    let minY = 600 - 60;
    let maxY = 600 + 60;

    visibleNodes.forEach((n) => {
      const { x, y } = currentPosOf(n);
      minX = Math.min(minX, x - 95);
      maxX = Math.max(maxX, x + 95);
      minY = Math.min(minY, y - 47);
      maxY = Math.max(maxY, y + 47);
    });
    // Uncollapsed views (SHOW ALL or small <=12-machine graphs): hubs (with their label pills) are part of the framed world
    if (showAllNodes || !collapsible) {
      clusters.forEach((c) => {
        const hub = getClusterHub(c);
        minX = Math.min(minX, hub.x - 95);
        maxX = Math.max(maxX, hub.x + 95);
        minY = Math.min(minY, hub.y - 55);
        maxY = Math.max(maxY, hub.y + 55);
      });
    }

    const r = solveFit({ minX, minY, maxX, maxY }, 80);
    goToView({ x: r.x, y: r.y, scale: r.scale }, false);
  };

  // Toggling SHOW ALL: fit the whole world on entry; on exit restore the scoped view the user had
  // (the previous behaviour left the view untouched, so restoring it is the closest match)
  const fitRef = useRef(handleFitToScreen);
  const prevShowAllRef = useRef(showAllNodes);
  useLayoutEffect(() => {
    fitRef.current = handleFitToScreen;
  });
  useLayoutEffect(() => {
    if (prevShowAllRef.current === showAllNodes) return;
    prevShowAllRef.current = showAllNodes;
    if (showAllNodes) {
      fitRef.current();
    } else {
      setShowAllDragPositions({});
      const v = scopedViewRef.current ?? { x: 0, y: 0, scale: 1 };
      setScale(v.scale);
      setPan({ x: v.x, y: v.y });
    }
  }, [showAllNodes]);

  // Collapsible hubs: frame everything inside the safe area on first measure, then follow expand / collapse
  const fitCollapsibleRef = useRef(fitCollapsible);
  const didInitialFitRef = useRef(false);
  const lastFitHubRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    fitCollapsibleRef.current = fitCollapsible;
  });
  useLayoutEffect(() => {
    if (!viewSize) return;
    if (!didInitialFitRef.current) {
      didInitialFitRef.current = true;
      lastFitHubRef.current = expandedHubId;
      if (collapsible) {
        fitCollapsibleRef.current(expandedHubId, false);
      } else if (!showAllNodes && visibleNodes.length > 0) {
        fitRef.current();
      }
      return;
    }
    if (!collapsible) return;
    if (lastFitHubRef.current === expandedHubId) return;
    lastFitHubRef.current = expandedHubId;
    fitCollapsibleRef.current(expandedHubId, true);
  }, [collapsible, showAllNodes, visibleNodes.length, viewSize, expandedHubId]);

  const showAllMachines = () => {
    if (showAllNodes) return;
    scopedViewRef.current = { ...getBaseView() };
    setShowAllNodes(true);
    if (soundEnabled) playCyberSound('toggle');
  };

  const handleCenterSelection = () => {
    let targetX = 800;
    let targetY = 600;

    if (selectedNode) {
      targetX = transientNodePos?.id === selectedNode.id
        ? transientNodePos.x
        : (graphNodePositions[selectedNode.id]?.x ?? defaultNodePositions[selectedNode.id]?.x ?? selectedNode.x);
      targetY = transientNodePos?.id === selectedNode.id
        ? transientNodePos.y
        : (graphNodePositions[selectedNode.id]?.y ?? defaultNodePositions[selectedNode.id]?.y ?? selectedNode.y);
    }

    const targetScale = Math.max(getBaseView().scale, 1.0);
    setScale(targetScale);
    setPan({
      x: 800 - targetX * targetScale,
      y: 600 - targetY * targetScale,
    });
    if (soundEnabled) playCyberSound('click');
  };

  // M3: Selected Edge & Machine Resolution
  const selectedEdge = useMemo(() => {
    return graphEdges.find((e) => e.id === selectedEdgeId) || null;
  }, [graphEdges, selectedEdgeId]);

  const edgeSourceMachine = useMemo(() => {
    return selectedEdge ? universeMachines.find((m) => m.id === selectedEdge.sourceId) : undefined;
  }, [selectedEdge, universeMachines]);

  const edgeTargetMachine = useMemo(() => {
    return selectedEdge ? universeMachines.find((m) => m.id === selectedEdge.targetId) : undefined;
  }, [selectedEdge, universeMachines]);

  const selectedNodeCreds = useMemo<GraphNodeCred[]>(() => {
    if (!selectedNode) return [];
    const fromVault: GraphNodeCred[] = credentials
      .filter((c) => c.sourceMachineId === selectedNode.id || Boolean(c.verifications?.[selectedNode.id]))
      .map((c) => ({
        id: c.id,
        domain: c.domain,
        username: c.username,
        secret: c.secret,
        type: c.type,
      }));
    const fromAdapter = adapter?.getNodeCreds ? adapter.getNodeCreds(selectedNode.id) : [];
    const seen = new Set<string>();
    return [...fromAdapter, ...fromVault].filter((item) => {
      const key = `${item.domain || ''}|${item.username}|${item.secret}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [selectedNode, credentials, adapter]);


  // M4: 1-Click Topology Exporters
  const handleExportObsidian = useCallback(() => {
    const nodesForExport: ExportGraphNode[] = [...allNodes, ...hiddenOverflowNodes].map((n) => {
      const curX = graphNodePositions[n.id]?.x ?? defaultNodePositions[n.id]?.x ?? n.x;
      const curY = graphNodePositions[n.id]?.y ?? defaultNodePositions[n.id]?.y ?? n.y;
      return {
        id: n.id,
        name: n.name,
        ip: n.ip,
        os: String(n.os),
        difficulty: String(n.difficulty),
        status: n.status,
        x: curX,
        y: curY,
        machine: n.machine,
      };
    });
    exportToObsidianCanvas(nodesForExport, graphEdges);
    if (soundEnabled) playCyberSound('flag');
  }, [allNodes, hiddenOverflowNodes, graphNodePositions, defaultNodePositions, graphEdges, soundEnabled]);

  const handleExportSvg = useCallback(() => {
    exportToSvg('zerobox-attack-graph-svg');
    if (soundEnabled) playCyberSound('click');
  }, [soundEnabled]);

  // Auto layout: layered left-to-right by edge direction, applied as one undoable entry
  const handleAutoLayout = useCallback(() => {
    // The auto-layout box (1510x1150) cannot hold the SHOW ALL world; it is a scoped-view tool
    if (showAllNodes) return;
    if (collapsible) {
      // Collapsible hubs: lay out the open hub's machines inside its own block; nothing to do when all are folded
      const block = expandedHubId ? hubBlocks[expandedHubId] : undefined;
      const ids = expandedHubId ? (nodesByCluster.get(expandedHubId) ?? []).map((n) => n.id) : [];
      if (!block || ids.length === 0) return;
      const positions = computeAutoLayout(ids, graphEdges, {
        originX: block.minX + 90,
        originY: block.minY + 55,
        maxX: block.maxX - 90,
        maxY: block.maxY - 55,
      });
      applyNodePositions(positions, 'Auto layout');
      if (soundEnabled) playCyberSound('click');
      return;
    }
    const positions = computeAutoLayout(allNodes.map((n) => n.id), graphEdges, { maxX: 1510, maxY: 1150 });
    applyNodePositions(positions, 'Auto layout');
    if (soundEnabled) playCyberSound('click');
  }, [allNodes, graphEdges, applyNodePositions, soundEnabled, showAllNodes, collapsible, expandedHubId, hubBlocks, nodesByCluster]);

  // Keyboard shortcut listener. Escape peels one layer per press, in this order: the flyout / edge inspector / link
  // mode, then an expanded hub, then fullscreen. The latest state lives in a ref so the listener registers once.
  const escapeStateRef = useRef({ layers: false, hub: false, fullscreen: false, collapseHub: foldHub });
  escapeStateRef.current = {
    layers: Boolean(selectedNode || selectedEdgeId || isConnectingMode || connectingSourceId),
    hub: expandedHubId !== null,
    fullscreen: isFullscreen,
    collapseHub: foldHub,
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const st = escapeStateRef.current;
      if (st.layers) {
        setSelectedNode(null);
        setSelectedEdgeId(null);
        setIsConnectingMode(false);
        setConnectingSourceId(null);
        return;
      }
      // Folding a hub and leaving fullscreen are the weaker Escape actions: leave the key to anything else that
      // wants it (an open modal or trap, a handler that already consumed it)
      const claimed = e.defaultPrevented || hasActiveFocusTrap() || Boolean(document.querySelector('[data-escape-open]'));
      if (st.hub) {
        // ...and a field being edited keeps its own Escape (cancel an edit, clear a search)
        if (claimed || isEditableElement(e.target) || isEditableElement(document.activeElement)) return;
        st.collapseHub();
        return;
      }
      if (st.fullscreen && !claimed) setIsFullscreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Minimap Navigation Pointer Interaction
  const handleMinimapPointerEvent = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const targetWorldX = minimapBounds.x + (clickX / rect.width) * minimapBounds.w;
    const targetWorldY = minimapBounds.y + (clickY / rect.height) * minimapBounds.h;

    const liveScale = getBaseView().scale;
    setScale(liveScale);
    setPan({
      x: 800 - targetWorldX * liveScale,
      y: 600 - targetWorldY * liveScale,
    });
  };

  const graphShell = (
    <div 
      ref={containerRef}
      className={`relative w-full border border-subtle bg-surface-card overflow-hidden font-sans shadow-2xl select-none touch-pan-x touch-pan-y transition-[box-shadow,background-color,border-color,color] duration-300 machined-edge ${
        isFullscreen ? 'fixed inset-0 z-modal rounded-none h-dvh' : 'rounded-2xl h-[clamp(440px,calc(100dvh-15rem),720px)] lg:h-[clamp(480px,calc(100dvh-10rem),720px)]'
      }`}
      onPointerDownCapture={handleCanvasPointerDownCapture}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerCancel}
      onLostPointerCapture={handleCanvasPointerCancel}
      onContextMenu={(e) => {
        // A long press on a card must not open the browser's context menu
        if (touchPointersRef.current.size > 0) e.preventDefault();
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {touchHint !== 'off' && (
        <div
          role="status"
          data-testid="graph-touch-hint"
          className={`pointer-events-none absolute inset-x-0 top-1/2 z-30 flex -translate-y-1/2 justify-center px-4 transition-opacity duration-300 motion-reduce:transition-none ${
            touchHint === 'fading' ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span className="rounded-xl border border-subtle bg-surface-elevated/95 px-4 py-2 text-sm font-semibold text-primary shadow-xs backdrop-blur-sm">
            Use two fingers to move the graph
          </span>
        </div>
      )}
      {/* Top HUD: a column. Stats pill on the left, canvas toolbar as a vertical rail on the right
          edge directly below it, so it never wraps into the middle of the graph. On phones the stats
          collapse into a one-line summary pill; the chips open on tap. */}
      <div className="absolute inset-x-4 top-4 z-20 flex flex-col items-start gap-2 pointer-events-none">
      <GraphHudStats
        title={adapter?.title}
        visibleCount={visibleNodes.length}
        universeCount={universeMachines.length}
        subnetCount={realSubnetCount}
        linkCount={graphEdges.length}
        showAllNodes={showAllNodes}
        filterActive={filterActive}
        showMoreControl={scopedVisibility.showMoreControl}
        hiddenCount={scopedVisibility.hiddenCount}
        expandedHubName={expandedHubId ? (clusters.find((c) => c.id === expandedHubId)?.name ?? '') : undefined}
        personalOnly={!adapter ? personalOnly : undefined}
        personalCount={!adapter ? personalMachines.length : undefined}
        onTogglePersonalOnly={
          !adapter
            ? () => {
                setPersonalOnly((prev) => !prev);
                setSelectedNode(null);
                if (soundEnabled) playCyberSound('toggle');
              }
            : undefined
        }
        extraActions={adapter?.hudActions}
        onToggleShowAll={() => {
          if (!showAllNodes) scopedViewRef.current = { ...getBaseView() };
          setShowAllNodes(!showAllNodes);
          if (soundEnabled) playCyberSound('toggle');
        }}
        onShowAll={showAllMachines}
        onCollapseHub={foldHub}
      />

      {/* Canvas Navigation Toolbar */}
      <GraphToolbar
        // Phone portrait reads the zoom as on-screen size (100% = 1 px per world unit), not as a multiple of the shrunken basis
        scale={portrait ? scale * fitAspect : scale}
        isConnectingMode={isConnectingMode}
        onToggleConnecting={() => {
          setIsConnectingMode(!isConnectingMode);
          setConnectingSourceId(null);
          if (soundEnabled) playCyberSound('toggle');
        }}
        handleExportObsidian={handleExportObsidian}
        handleExportSvg={handleExportSvg}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        undoLabel={undoLabel}
        redoLabel={redoLabel}
        handleAutoLayout={handleAutoLayout}
        autoLayoutDisabled={allNodes.length === 0 || showAllNodes || (collapsible && !expandedHubId)}
        autoLayoutNeedsSubnet={collapsible && !expandedHubId}
        showAllNodes={showAllNodes}
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleResetView={handleResetView}
        handleFitToScreen={handleFitToScreen}
        handleCenterSelection={handleCenterSelection}
        isFullscreen={isFullscreen}
        setIsFullscreen={setIsFullscreen}
      />
      </div>

      {/* Interactive Vector Connection Mode Banner */}
      {isConnectingMode && (
        <div 
          data-testid="connect-vector-banner"
          className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-lg bg-accent text-on-accent font-semibold text-xs shadow-lg flex items-center gap-2 animate-in fade-in pointer-events-auto font-mono"
        >
          <Network className="w-3.5 h-3.5" />
          <span>
            {connectingSourceId
              ? 'Click the machine to link to'
              : 'Click the machine to link from'}
          </span>
          <button
            onClick={() => {
              setIsConnectingMode(false);
              setConnectingSourceId(null);
            }}
            className="p-0.5 rounded-md hover:bg-surface-inverse/20 ml-1 font-semibold active:scale-[0.98] transition-transform"
            title="Cancel linking"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tactical Minimap HUD in Canvas Corner */}
      <div data-graph-corner="true" className="absolute bottom-4 left-4 z-20 flex flex-col items-start gap-2 pointer-events-auto select-none">
          {/* Legend: hide while a hub is expanded or canvas is narrow so it never stamps over hub badges */}
          {!expandedHubId && !portrait && (
          <div className="hidden lg:flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3 py-1.5 rounded-xl bg-surface-elevated/95 border border-subtle backdrop-blur-sm shadow-xs text-xs font-sans machined-edge">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-callout-success-fg" />
              <span className="text-secondary">Root (Compromised)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-callout-warn-fg" />
              <span className="text-secondary">Foothold (User)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-secondary">Backlog or recon</span>
            </span>
          </div>
          )}
        <MinimapPanel
          tokens={tokens}
          clusters={clusters}
          graphEdges={graphEdges}
          allNodes={allNodes}
          visibleNodes={renderNodes}
          graphNodePositions={graphNodePositions}
          defaultNodePositions={defaultNodePositions}
          transientNodePos={transientNodePos}
          selectedNodeId={selectedNode?.id ?? null}
          minimapBounds={minimapBounds}
          isMinimapOpen={isMinimapOpen && !portrait}
          setIsMinimapOpen={setIsMinimapOpen}
          isMinimapDraggingRef={isMinimapDraggingRef}
          handleMinimapPointerEvent={handleMinimapPointerEvent}
          minimapRectRef={minimapRectRef}
          pan={pan}
          scale={scale}
        />
      </div>

      {/* Interactive SVG Canvas */}
      <div
        id="graph-canvas"
        className={`w-full h-full overflow-hidden ${isCanvasDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        <svg
          ref={svgRef}
          id="zerobox-attack-graph-svg"
          data-testid="graph-viewport-svg"
          className="w-full h-full pointer-events-auto"
          viewBox="0 0 1600 1200"
        >
          <defs>
            {/* Dynamic Grid Pattern conforming to active theme */}
            <pattern id="graph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={tokens.gridColor} strokeWidth="0.5" opacity="0.08" />
            </pattern>

            {/* Glowing Kali Core */}
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </radialGradient>

            {/* Subnet Cluster Hub Glow */}
            <radialGradient id="clusterGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={tokens.accent} stopOpacity="0.3" />
              <stop offset="100%" stopColor={tokens.accent} stopOpacity="0" />
            </radialGradient>

            {/* Directional Vector Arrowhead Markers */}
            {ATTACK_EDGE_TYPES.map((t) => {
              const m = ATTACK_EDGE_META[t];
              return (
                <marker
                  key={`arrow-${t}`}
                  id={`arrow-${t}`}
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={m.color} />
                </marker>
              );
            })}
          </defs>

          {/* Canvas Background Grid */}
          {/* Oversized so the letterbox area around the 1600x1200 basis (tall phones, wide windows) is painted too */}
          <rect x="-3000" y="-3000" width="7600" height="7200" fill={tokens.canvasBg} className="pointer-events-none" />
          <rect x="-3000" y="-3000" width="7600" height="7200" fill="url(#graph-grid)" className="pointer-events-none" />

          {/* INNER VIEWPORT TRANSFORM GROUP */}
          <g
            ref={viewportGRef}
            id="canvas-viewport"
            data-testid="canvas-viewport"
            transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}
            style={{ transformOrigin: '0 0' }}
          >
            {/* Subnet Cluster Hubs & Radiating Background Paths */}
            {clusters.map((cluster) => {
              const hub = getClusterHub(cluster);
              return (
                <HubCluster
                  key={cluster.id}
                  cluster={cluster}
                  x={hub.x}
                  y={hub.y}
                  tokens={tokens}
                  isHovered={hoveredClusterId === cluster.id}
                  collapsible={collapsible}
                  expanded={expandedHubId === cluster.id}
                  // zoomed in on one hub the plain size already reads well
                  textScale={expandedHubId ? 1 : hubText}
                  portrait={portrait}
                  hidden={portrait && expandedHubId !== null && expandedHubId !== cluster.id}
                  nodes={nodesByCluster.get(cluster.id) ?? EMPTY_NODES}
                  matchedIds={filterActive ? visibleMachineIds : null}
                  onToggle={handleHubToggle}
                />
              );
            })}

            {/* Tactical Edges from Subnet Hubs to Target Nodes */}
            {renderNodes.map((node) => {
              const hub = clusterHubs.map.get(node.cluster) ?? clusterHubs.first;
              const clusterX = hub ? hub.x : centerX;
              const clusterY = hub ? hub.y : centerY;

              const currentX = transientNodePos?.id === node.id 
                ? transientNodePos.x 
                : (graphNodePositions[node.id]?.x ?? defaultNodePositions[node.id]?.x ?? node.x);
              const currentY = transientNodePos?.id === node.id 
                ? transientNodePos.y 
                : (graphNodePositions[node.id]?.y ?? defaultNodePositions[node.id]?.y ?? node.y);

              // Connect to nearest cardinal docking anchor on node card
              const anchors = [
                { x: currentX, y: currentY - 42 },
                { x: currentX, y: currentY + 42 },
                { x: currentX - 90, y: currentY },
                { x: currentX + 90, y: currentY },
              ];
              const targetAnchor = anchors.reduce((best, curr) => 
                Math.hypot(curr.x - clusterX, curr.y - clusterY) < Math.hypot(best.x - clusterX, best.y - clusterY) ? curr : best
              );

              const isRooted = node.status === 'root' || node.status === 'completed';
              const isFoothold = node.status === 'foothold';
              const isSelected = selectedNode?.id === node.id;
              const isHovered = hoveredNodeId === node.id;

              return (
                <line
                  key={`edge-${node.id}`}
                  x1={clusterX}
                  y1={clusterY}
                  x2={targetAnchor.x}
                  y2={targetAnchor.y}
                  stroke={isSelected ? tokens.accent : isRooted ? tokens.statusRoot : isFoothold ? tokens.statusFoothold : tokens.accent}
                  strokeWidth={isSelected ? 2.5 : isHovered ? 2 : isRooted ? 1.8 : 1}
                  strokeDasharray={isSelected || isRooted ? 'none' : '3 3'}
                  opacity={isSelected ? 1 : isHovered ? 0.9 : isRooted ? 0.75 : 0.35}
                />
              );
            })}

            {/* Custom Attack Vectors & Pivot Tunnel Edges (Milestone 3) */}
            {graphEdges.map((edge) => {
              // Links to machines that are not drawn in the scoped view stay stored but are not drawn
              if (hiddenOverflowIds.has(edge.sourceId) || hiddenOverflowIds.has(edge.targetId)) return null;
              const meta = ATTACK_EDGE_META[edge.type] || ATTACK_EDGE_META['pivot-ssh'];
              const isSelectedEdge = selectedEdgeId === edge.id;

              const srcX = transientNodePos?.id === edge.sourceId 
                ? transientNodePos.x 
                : (graphNodePositions[edge.sourceId]?.x ?? defaultNodePositions[edge.sourceId]?.x ?? (allNodes.find(n => n.id === edge.sourceId)?.x ?? centerX));
              const srcY = transientNodePos?.id === edge.sourceId 
                ? transientNodePos.y 
                : (graphNodePositions[edge.sourceId]?.y ?? defaultNodePositions[edge.sourceId]?.y ?? (allNodes.find(n => n.id === edge.sourceId)?.y ?? centerY));

              const tgtX = transientNodePos?.id === edge.targetId 
                ? transientNodePos.x 
                : (graphNodePositions[edge.targetId]?.x ?? defaultNodePositions[edge.targetId]?.x ?? (allNodes.find(n => n.id === edge.targetId)?.x ?? centerX));
              const tgtY = transientNodePos?.id === edge.targetId 
                ? transientNodePos.y 
                : (graphNodePositions[edge.targetId]?.y ?? defaultNodePositions[edge.targetId]?.y ?? (allNodes.find(n => n.id === edge.targetId)?.y ?? centerY));

              // A machine folded into a collapsed hub is reached through the hub: dock on its dot ring
              const srcHub = collapsedHubOf(edge.sourceId);
              const tgtHub = collapsedHubOf(edge.targetId);
              if (srcHub && srcHub === tgtHub) return null; // both ends in the same folded hub
              // Phone portrait with one hub open: the other hubs are not drawn, so an edge docking on one would run into empty space
              if (portrait && expandedHubId !== null && ((srcHub && srcHub !== expandedHubId) || (tgtHub && tgtHub !== expandedHubId))) return null;
              const srcHubPos = srcHub ? clusterHubs.map.get(srcHub) : undefined;
              const tgtHubPos = tgtHub ? clusterHubs.map.get(tgtHub) : undefined;
              const dock = portrait ? HUB_DOCK_R_PORTRAIT : HUB_DOCK_R;
              const hubAnchors = (hx: number, hy: number) => [
                { x: hx, y: hy - dock },
                { x: hx, y: hy + dock },
                { x: hx - dock, y: hy },
                { x: hx + dock, y: hy },
              ];

              // Compute shortest cardinal docking anchors
              const srcAnchors = srcHubPos
                ? hubAnchors(srcHubPos.x, srcHubPos.y)
                : [
                    { x: srcX, y: srcY - 42 },
                    { x: srcX, y: srcY + 42 },
                    { x: srcX - 90, y: srcY },
                    { x: srcX + 90, y: srcY },
                  ];
              const tgtAnchors = tgtHubPos
                ? hubAnchors(tgtHubPos.x, tgtHubPos.y)
                : [
                    { x: tgtX, y: tgtY - 42 },
                    { x: tgtX, y: tgtY + 42 },
                    { x: tgtX - 90, y: tgtY },
                    { x: tgtX + 90, y: tgtY },
                  ];

              let bestDist = Infinity;
              let bestSrc = srcAnchors[3];
              let bestTgt = tgtAnchors[2];

              for (const s of srcAnchors) {
                for (const t of tgtAnchors) {
                  const d = Math.hypot(t.x - s.x, t.y - s.y);
                  if (d < bestDist) {
                    bestDist = d;
                    bestSrc = s;
                    bestTgt = t;
                  }
                }
              }

              const midX = (bestSrc.x + bestTgt.x) / 2;
              const midY = (bestSrc.y + bestTgt.y) / 2;
              const edgeLabel = edge.label || meta.label;
              const shortLabel = edgeLabel.length > 14 ? `${edgeLabel.slice(0, 13)}…` : edgeLabel;
              // Capsule hugs the 11px mono label (~6.7px per glyph) instead of a fixed 76px
              const capsuleW = Math.max(76, Math.ceil(`${shortLabel} ${edge.port ? `:${edge.port}` : ''}`.length * 6.7) + 14);

              return (
                <g 
                  key={`attack-edge-${edge.id}`} 
                  id={`attack-edge-${edge.id}`}
                  data-testid={`attack-edge-${edge.id}`}
                  data-edge-interactive="true"
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeId(edge.id);
                    setSelectedNode(null);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeId(edge.id);
                    setSelectedNode(null);
                    if (soundEnabled) playCyberSound('click');
                  }}
                >
                  {/* Invisible broad hitbox for easy clicking */}
                  <line
                    x1={bestSrc.x}
                    y1={bestSrc.y}
                    x2={bestTgt.x}
                    y2={bestTgt.y}
                    stroke="transparent"
                    strokeWidth="16"
                  />

                  {/* Outer Glow Halo for Selected / Compromised Vector */}
                  {(isSelectedEdge || edge.status === 'compromised') && (
                    <line
                      x1={bestSrc.x}
                      y1={bestSrc.y}
                      x2={bestTgt.x}
                      y2={bestTgt.y}
                      stroke={meta.color}
                      strokeWidth={isSelectedEdge ? '6' : '4'}
                      opacity={isSelectedEdge ? '0.6' : '0.25'}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Primary Vector Line */}
                  <line
                    x1={bestSrc.x}
                    y1={bestSrc.y}
                    x2={bestTgt.x}
                    y2={bestTgt.y}
                    stroke={meta.color}
                    strokeWidth={isSelectedEdge ? '3' : '2'}
                    strokeDasharray={edge.status === 'compromised' ? 'none' : '6 4'}
                    markerEnd={`url(#arrow-${edge.type})`}
                    className="transition-colors"
                  />

                  {/* Midpoint Protocol & Port Badge Capsule */}
                  <g className="pointer-events-none select-none">
                    <rect
                      x={midX - capsuleW / 2}
                      y={midY - 11}
                      width={capsuleW}
                      height="22"
                      rx="4"
                      fill={tokens.cardBg}
                      stroke={meta.color}
                      strokeWidth={isSelectedEdge ? '1.8' : '1'}
                      fillOpacity="0.95"
                    />
                    <text
                      x={midX}
                      y={midY + 4}
                      fill={meta.color}
                      fontSize="11"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {shortLabel} {edge.port ? `:${edge.port}` : ''}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Pure SVG Machine Node Cards (<AttackNodeCard>) */}
            <g
              key={collapsible ? `cards-${expandedHubId ?? 'none'}` : 'cards'}
              className={collapsible ? 'animate-in fade-in duration-200 motion-reduce:animate-none' : undefined}
            >
            {renderNodes.map((node) => {
              const currentX = transientNodePos?.id === node.id 
                ? transientNodePos.x 
                : (graphNodePositions[node.id]?.x ?? defaultNodePositions[node.id]?.x ?? node.x);
              const currentY = transientNodePos?.id === node.id 
                ? transientNodePos.y 
                : (graphNodePositions[node.id]?.y ?? defaultNodePositions[node.id]?.y ?? node.y);

              const isSelected = selectedNode?.id === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isConnectingSource = connectingSourceId === node.id;

              // Viewport culling: skip cards fully outside the margin-expanded visible rect
              const visibility = nodeVisibility(
                cullRect?.outer ?? null,
                cullRect?.inner ?? null,
                currentX,
                currentY,
                isSelected || isHovered || isConnectingSource || focusedNodeId === node.id || transientNodePos?.id === node.id
              );
              if (visibility === 'culled') return null;
              // Margin-ring cards are never on screen yet: render them at most compact
              const cardLod = visibility === 'ring' && lodTier === 'full' ? 'compact' : lodTier;

              return (
                <AttackNodeCard
                  key={node.id}
                  node={node}
                  x={currentX}
                  y={currentY}
                  animate={animatePulses}
                  lod={cardLod}
                  isFocused={focusedNodeId === node.id}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  isConnectingSource={isConnectingSource}
                  isDark={isDark}
                  tokens={tokens}
                  onSelect={handleNodeSelectStable}
                  onHover={setHoveredNodeId}
                  onFocusChange={setFocusedNodeId}
                  onPointerDown={handleNodePointerDown}
                  onPointerMove={handleNodePointerMove}
                  onPointerUp={handleNodePointerUp}
                />
              );
            })}
            </g>

            {/* Central Operator Node (Kali Attack Rig) */}
            <g
              data-graph-rig="true"
              className="pointer-events-none select-none"
              // phone portrait: an open hub shows alone, so the rig above it would only sit under the HUD
              style={portrait && expandedHubId ? { display: 'none' } : undefined}
            >
              <circle cx={centerX} cy={centerY} r="70" fill="url(#centerGlow)" />
              <circle
                cx={centerX}
                cy={centerY}
                r="34"
                fill={tokens.cardBg}
                stroke={tokens.statusRoot}
                strokeWidth="2.4"
              />
              <circle cx={centerX} cy={centerY} r="12" fill={tokens.statusRoot} />
              <rect
                x={centerX - rigCaptionW / 2}
                y={centerY + 36}
                width={rigCaptionW}
                height={rigCaptionFont * 3.6}
                rx="6"
                fill={tokens.cardBg}
                fillOpacity="0.95"
                stroke={tokens.statusRoot}
                strokeWidth="1.2"
              />
              <text
                x={centerX}
                y={centerY + 36 + rigCaptionFont * 1.5}
                fill={tokens.statusRoot}
                fontSize={rigCaptionFont}
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {rigHeaderLabel}
              </text>
              <text
                x={centerX}
                y={centerY + 36 + rigCaptionFont * 2.9}
                fill={tokens.accent}
                fontSize={rigCaptionFont}
                fontFamily="monospace"
                textAnchor="middle"
              >
                {`${rigLhostLabel} (your IP)`}
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* Selected Node Tactical Detail Flyout Card */}
      <AnimatePresence>
        {selectedNode && (
          <m.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            className={`absolute right-4 z-30 w-80 max-w-[calc(100%-2rem)] p-3.5 rounded-xl bg-surface-elevated/95 backdrop-blur-sm border border-subtle hover:border-accent shadow-xl space-y-2.5 pointer-events-auto font-sans machined-edge ${
              isFullscreen ? 'bottom-6' : 'bottom-16'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <PlatformIcon platform={selectedNode.platform} className="w-4 h-4" />
                  <span className="text-sm font-semibold text-primary">{selectedNode.name}</span>
                  <CategoryBadge machine={selectedNode.machine} size="xs" />
                </div>
                <div>
                  {adapter ? (
                    <span className="inline-flex items-center rounded-md border border-subtle bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] font-semibold text-secondary">
                      {selectedNode.ip || 'IP not set'}
                    </span>
                  ) : (
                    <EditableIpBadge machineId={selectedNode.id} initialIp={selectedNode.ip} size="xs" showLabel />
                  )}
                </div>
              </div>

              <button
                data-testid="flyout-close-btn"
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-md text-muted hover:text-primary flex-shrink-0 active:scale-[0.97] transition-transform cursor-pointer"
                title="Close details"
                aria-label="Close details"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-surface-sunken p-2 rounded-lg border border-subtle">
                <span className="text-muted font-semibold">OS / System:</span>
                <div className="font-semibold text-primary mt-0.5 truncate">{selectedNode.os}</div>
              </div>
              <div className="bg-surface-sunken p-2 rounded-lg border border-subtle">
                <span className="text-muted font-semibold">Status:</span>
                <div className={`font-semibold mt-0.5 ${
                  selectedNode.status === 'root' || selectedNode.status === 'completed'
                    ? 'text-callout-success-fg'
                    : selectedNode.status === 'foothold'
                    ? 'text-callout-warn-fg'
                    : 'text-accent'
                }`}>
                  {GRAPH_STATUS_LABELS[selectedNode.status] || selectedNode.status}
                </div>
              </div>
            </div>

            {selectedNode.machine.quickNotes && adapter && (
              <p className="rounded-lg border border-subtle bg-surface-sunken px-2.5 py-1.5 text-[11px] text-secondary leading-relaxed">
                {selectedNode.machine.quickNotes}
              </p>
            )}

            <NodeCredentialsList
              creds={selectedNodeCreds}
              nodeIp={selectedNode.ip}
              nodeDomain={selectedNode.machine.domain}
            />

            <div className="flex items-center gap-2 pt-2 border-t border-subtle">
              <button
                title={adapter ? (adapter.activateNodeLabel || 'Focus this target') : 'Make this the machine you are working on'}
                onClick={() => {
                  if (adapter?.onActivateNode) {
                    adapter.onActivateNode(selectedNode.machine);
                  } else {
                    setActiveTarget(selectedNode.id);
                  }
                  if (soundEnabled) playCyberSound('engage');
                }}
                className="flex-1 py-1.5 px-3 rounded-lg bg-callout-success-bg border border-callout-success-border text-callout-success-fg hover:bg-callout-success-fg hover:text-surface-base font-semibold text-xs transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.97] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>{adapter?.activateNodeLabel || 'Set as active machine'}</span>
              </button>

              <button
                data-testid="flyout-connect-btn"
                onClick={() => {
                  setIsConnectingMode(true);
                  setConnectingSourceId(selectedNode.id);
                  setSelectedNode(null);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="py-1.5 px-2.5 rounded-lg bg-accent/15 border border-accent/40 text-accent hover:bg-accent hover:text-on-accent text-xs font-semibold transition-colors flex items-center gap-1 active:scale-[0.97] cursor-pointer"
                title="Draw a link from this machine to another one"
              >
                <Network className="w-3.5 h-3.5" />
                <span>Link from here</span>
              </button>

              {adapter?.onDeleteNode && selectedNode.machine.isCustom ? (
                <button
                  type="button"
                  onClick={() => {
                    adapter.onDeleteNode?.(selectedNode.machine);
                    setSelectedNode(null);
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="py-1.5 px-2.5 rounded-lg bg-surface-sunken border border-subtle hover:border-callout-danger-border text-muted hover:text-callout-danger-fg text-xs transition-colors active:scale-[0.97] cursor-pointer"
                  title="Remove internal host"
                  aria-label="Remove internal host"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              ) : (!adapter || adapter.onOpenNodeDetails) ? (
                <button
                  onClick={() => {
                    if (adapter?.onOpenNodeDetails) {
                      adapter.onOpenNodeDetails(selectedNode.machine);
                    } else {
                      setSelectedMachineId(selectedNode.id);
                    }
                    if (soundEnabled) playCyberSound('click');
                  }}
                  className="py-1.5 px-2.5 rounded-lg bg-surface-sunken border border-subtle hover:border-accent text-muted hover:text-primary text-xs transition-colors active:scale-[0.97] cursor-pointer"
                  title="Open full machine details"
                  aria-label="Open full machine details"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </m.div>
        )}
      </AnimatePresence>

      {/* Milestone 3: Slide-Over Attack Vector & Pivot Inspector Drawer */}
      <GraphEdgeInspectorDrawer
        isOpen={Boolean(selectedEdge)}
        edge={selectedEdge}
        sourceMachine={edgeSourceMachine}
        targetMachine={edgeTargetMachine}
        onClose={() => setSelectedEdgeId(null)}
        onUpdateEdge={updateGraphEdge}
        onDeleteEdge={deleteGraphEdge}
      />
    </div>
  );

  return graphShell;
};

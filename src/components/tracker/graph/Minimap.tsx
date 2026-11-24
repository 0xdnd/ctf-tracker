import React, { useMemo } from 'react';
import { Radio, X } from 'lucide-react';
import { AttackNodePosition, AttackGraphEdge, ATTACK_EDGE_META } from '../../../types/graph';
import type { GraphNode, ClusterDef, CanvasThemeTokens } from './types';
import { getClusterHub } from './layout';

// ---------------------------------------------------------------------------
// Minimap static layers (memoized: unaffected by pan/zoom commits)
// ---------------------------------------------------------------------------
interface MinimapStaticLayersProps {
  tokens: CanvasThemeTokens;
  clusters: ClusterDef[];
  graphEdges: AttackGraphEdge[];
  allNodes: GraphNode[];
  visibleNodes: GraphNode[];
  graphNodePositions: Record<string, AttackNodePosition>;
  defaultNodePositions: Record<string, AttackNodePosition>;
  transientNodePos: { id: string; x: number; y: number } | null;
  selectedNodeId: string | null;
  /** World rect shown by the minimap (4:3) and the size multiplier of its fixed-size glyphs. */
  bounds: { x: number; y: number; w: number; h: number };
  unit: number;
}

const MinimapStaticLayers = React.memo(({
  tokens,
  clusters,
  graphEdges,
  allNodes,
  visibleNodes,
  graphNodePositions,
  defaultNodePositions,
  transientNodePos,
  selectedNodeId,
  bounds,
  unit,
}: MinimapStaticLayersProps) => {
  const nodeById = useMemo(() => new Map(allNodes.map((n) => [n.id, n])), [allNodes]);

  return (
    <>
      {/* Radar grid rings */}
      <circle cx="800" cy="600" r={300 * unit} fill="none" stroke={tokens.gridColor} strokeWidth={unit} opacity="0.12" />
      <circle cx="800" cy="600" r={520 * unit} fill="none" stroke={tokens.gridColor} strokeWidth={unit} opacity="0.12" />
      <line x1="800" y1={bounds.y} x2="800" y2={bounds.y + bounds.h} stroke={tokens.gridColor} strokeWidth={unit} opacity="0.12" />
      <line x1={bounds.x} y1="600" x2={bounds.x + bounds.w} y2="600" stroke={tokens.gridColor} strokeWidth={unit} opacity="0.12" />

      {/* Subnet cluster hubs on radar */}
      {clusters.map((c) => {
        const hub = getClusterHub(c);
        return (
          <circle key={`mini-cluster-${c.id}`} cx={hub.x} cy={hub.y} r={28 * unit} fill={c.color} opacity="0.4" />
        );
      })}

      {/* Operator Rig on radar */}
      <circle cx="800" cy="600" r={28 * unit} fill="#10B981" opacity="0.8" />

      {/* Attack Vectors on radar */}
      {graphEdges.map((e) => {
        const s = nodeById.get(e.sourceId);
        const t = nodeById.get(e.targetId);
        if (!s || !t) return null;
        const sx = graphNodePositions[s.id]?.x ?? defaultNodePositions[s.id]?.x ?? s.x;
        const sy = graphNodePositions[s.id]?.y ?? defaultNodePositions[s.id]?.y ?? s.y;
        const tx = graphNodePositions[t.id]?.x ?? defaultNodePositions[t.id]?.x ?? t.x;
        const ty = graphNodePositions[t.id]?.y ?? defaultNodePositions[t.id]?.y ?? t.y;
        const m = ATTACK_EDGE_META[e.type];
        return (
          <line
            key={`mini-edge-${e.id}`}
            x1={sx}
            y1={sy}
            x2={tx}
            y2={ty}
            stroke={m?.color || '#00F0FF'}
            strokeWidth={8 * unit}
            opacity="0.7"
          />
        );
      })}

      {/* Machine nodes on radar */}
      {visibleNodes.map((n) => {
        const nx = transientNodePos?.id === n.id
          ? transientNodePos.x
          : (graphNodePositions[n.id]?.x ?? defaultNodePositions[n.id]?.x ?? n.x);
        const ny = transientNodePos?.id === n.id
          ? transientNodePos.y
          : (graphNodePositions[n.id]?.y ?? defaultNodePositions[n.id]?.y ?? n.y);

        const isRoot = n.status === 'root' || n.status === 'completed';
        const isFoot = n.status === 'foothold';
        const dotColor = isRoot ? tokens.statusRoot : isFoot ? tokens.statusFoothold : tokens.statusUnsolved;
        const isSel = selectedNodeId === n.id;

        return (
          <circle
            key={`mini-node-${n.id}`}
            cx={nx}
            cy={ny}
            r={(isSel ? 28 : 18) * unit}
            fill={dotColor}
            opacity={isSel ? '1' : '0.85'}
            stroke={isSel ? '#FFFFFF' : 'none'}
            strokeWidth={4 * unit}
          />
        );
      })}
    </>
  );
});
MinimapStaticLayers.displayName = 'MinimapStaticLayers';

interface MinimapPanelProps {
  tokens: CanvasThemeTokens;
  clusters: ClusterDef[];
  graphEdges: AttackGraphEdge[];
  allNodes: GraphNode[];
  visibleNodes: GraphNode[];
  graphNodePositions: Record<string, AttackNodePosition>;
  defaultNodePositions: Record<string, AttackNodePosition>;
  transientNodePos: { id: string; x: number; y: number } | null;
  selectedNodeId: string | null;
  minimapBounds: { x: number; y: number; w: number; h: number; unit: number };
  isMinimapOpen: boolean;
  setIsMinimapOpen: (open: boolean) => void;
  isMinimapDraggingRef: React.MutableRefObject<boolean>;
  handleMinimapPointerEvent: (e: React.PointerEvent<SVGSVGElement>) => void;
  minimapRectRef: React.RefObject<SVGRectElement>;
  pan: { x: number; y: number };
  scale: number;
}

export const MinimapPanel: React.FC<MinimapPanelProps> = ({
  tokens,
  clusters,
  graphEdges,
  allNodes,
  visibleNodes,
  graphNodePositions,
  defaultNodePositions,
  transientNodePos,
  selectedNodeId,
  minimapBounds,
  isMinimapOpen,
  setIsMinimapOpen,
  isMinimapDraggingRef,
  handleMinimapPointerEvent,
  minimapRectRef,
  pan,
  scale,
}) => {
  return (
    <>
  {isMinimapOpen ? (
    <div 
      data-testid="graph-minimap-container"
      className="w-36 p-1.5 rounded-xl bg-surface-elevated/95 backdrop-blur-sm border border-subtle shadow-lg space-y-1 font-sans machined-edge"
    >
      <div className="flex items-center justify-between text-xs font-semibold text-muted px-1">
        <span className="flex items-center gap-1 text-primary">
          <Radio className="w-3 h-3 text-accent" />
          Minimap
        </span>
        <button
          data-testid="graph-minimap-toggle"
          onClick={() => setIsMinimapOpen(false)}
          className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-surface-hover text-muted hover:text-primary active:scale-[0.97] cursor-pointer"
          title="Hide minimap"
          aria-label="Hide minimap"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="w-full aspect-[4/3] rounded-lg bg-surface-sunken border border-subtle overflow-hidden relative">
        <svg
          data-testid="graph-minimap-svg"
          viewBox={`${minimapBounds.x} ${minimapBounds.y} ${minimapBounds.w} ${minimapBounds.h}`}
          className="w-full h-full cursor-crosshair touch-none"
          onPointerDown={(e) => {
            e.stopPropagation();
            isMinimapDraggingRef.current = true;
            handleMinimapPointerEvent(e);
          }}
          onPointerMove={(e) => {
            if (isMinimapDraggingRef.current) {
              handleMinimapPointerEvent(e);
            }
          }}
          onPointerUp={() => {
            isMinimapDraggingRef.current = false;
          }}
        >
          <MinimapStaticLayers
            tokens={tokens}
            clusters={clusters}
            graphEdges={graphEdges}
            allNodes={allNodes}
            visibleNodes={visibleNodes}
            graphNodePositions={graphNodePositions}
            defaultNodePositions={defaultNodePositions}
            transientNodePos={transientNodePos}
            selectedNodeId={selectedNodeId}
            bounds={minimapBounds}
            unit={minimapBounds.unit}
          />

          {/* Dynamic Viewport Framing Rectangle */}
          <rect
            ref={minimapRectRef}
            data-testid="minimap-viewport-rect"
            x={-pan.x / scale}
            y={-pan.y / scale}
            width={1600 / scale}
            height={1200 / scale}
            fill="rgba(6, 182, 212, 0.16)"
            stroke="#06B6D4"
            strokeWidth={10 * minimapBounds.unit}
            strokeDasharray={`${24 * minimapBounds.unit} ${12 * minimapBounds.unit}`}
            rx={12 * minimapBounds.unit}
            className="cursor-move"
          />
        </svg>
      </div>
    </div>
  ) : (
    <button
      data-testid="graph-minimap-toggle"
      onClick={() => setIsMinimapOpen(true)}
      className="p-1.5 px-2.5 rounded-lg bg-surface-sunken border border-subtle hover:border-accent text-muted hover:text-primary shadow-xs flex items-center gap-1.5 text-xs font-semibold font-mono active:scale-[0.98] transition-[transform,box-shadow,background-color,border-color,color]"
      title="Show minimap"
      aria-label="Show minimap"
    >
      <Radio className="w-3.5 h-3.5 text-callout-info-fg" />
      <span className="hidden sm:inline">Minimap</span>
    </button>
  )}
    </>
  );
};

import type React from 'react';
import { Machine, Platform, OperatingSystem, Difficulty } from '../../../types';
import type { AttackNodePosition } from '../../../types/graph';

export interface GraphNode {
  id: string;
  name: string;
  ip: string;
  os: OperatingSystem | string;
  platform: Platform;
  difficulty: Difficulty | string;
  status: string;
  cluster: string;
  x: number;
  y: number;
  machine: Machine;
}

export interface ClusterDef {
  id: string;
  name: string;
  angle: number;
  radius: number;
  color: string;
  /** Explicit hub position (SHOW ALL layout); the scoped layout derives it from angle/radius. */
  x?: number;
  y?: number;
}

export interface ClusterTemplate {
  id: string;
  name: string;
  color: string;
  matcher: (m: Machine) => boolean;
}

export interface WorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface CanvasThemeTokens {
  canvasBg: string;
  cardBg: string;
  cardBorder: string;
  cardHoverBorder: string;
  textPrimary: string;
  textMuted: string;
  codeBg: string;
  codeBorder: string;
  accent: string;
  accentGlow: string;
  gridColor: string;
  statusRoot: string;
  statusFoothold: string;
  statusUnsolved: string;
}

export interface ShowAllLayout {
  positions: Record<string, AttackNodePosition>;
  clusters: ClusterDef[];
  clusterOf: Record<string, string>;
  bounds: WorldBounds;
}

export interface AttackNodeCardProps {
  node: GraphNode;
  /** Live world position; falls back to node.x / node.y so node identity can stay stable across drags. */
  x?: number;
  y?: number;
  /** Render SMIL pulse animations (disabled on large graphs). */
  animate?: boolean;
  /** Level-of-detail tier; selected / hovered / focused / connecting-source cards always render full. */
  lod?: 'full' | 'compact' | 'dot';
  isFocused?: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isConnectingSource?: boolean;
  tokens: CanvasThemeTokens;
  onSelect: (node: GraphNode) => void;
  onHover: (nodeId: string | null) => void;
  /** Keyboard focus tracking so the focused card is never culled out from under the user. */
  onFocusChange?: (nodeId: string | null) => void;
  onPointerDown: (e: React.PointerEvent<SVGGElement>, node: GraphNode) => void;
  onPointerMove?: (e: React.PointerEvent<SVGGElement>, node: GraphNode) => void;
  onPointerUp?: (e: React.PointerEvent<SVGGElement>, node: GraphNode) => void;
}

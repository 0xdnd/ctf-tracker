// ---------------------------------------------------------------------------
// Large-graph performance thresholds
// ---------------------------------------------------------------------------
// Below this committed zoom (and above LARGE_GRAPH_NODE_COUNT nodes) distant cards render compact.
export const LOD_SCALE_THRESHOLD = 0.6;
// Above this many visible nodes: pulse animations stop and off-screen cards are culled.
export const LARGE_GRAPH_NODE_COUNT = 60;
// Below this zoom (large graphs only) cards collapse to a bare status-coloured rect.
export const LOD_DOT_SCALE_THRESHOLD = 0.3;

// ---------------------------------------------------------------------------
// Viewport culling predicate: true when the 180x84 card at (x, y) lies fully outside rect.
// Exempt cards (selected, hovered, focused, connecting source, being dragged) are never culled.
// ---------------------------------------------------------------------------
export function isNodeCulled(
  rect: { minX: number; maxX: number; minY: number; maxY: number } | null,
  x: number,
  y: number,
  exempt: boolean
): boolean {
  if (!rect || exempt) return false;
  return x + 90 < rect.minX || x - 90 > rect.maxX || y + 42 < rect.minY || y - 42 > rect.maxY;
}

// Three-way culling: 'culled' (outside the margin-expanded rect), 'ring' (inside the margin
// but outside the real visible rect, rendered cheap) or 'visible'. Exempt cards are always visible.
export function nodeVisibility(
  rect: { minX: number; maxX: number; minY: number; maxY: number } | null,
  innerRect: { minX: number; maxX: number; minY: number; maxY: number } | null,
  x: number,
  y: number,
  exempt: boolean
): 'culled' | 'ring' | 'visible' {
  if (!rect || exempt) return 'visible';
  if (isNodeCulled(rect, x, y, false)) return 'culled';
  if (!innerRect || !isNodeCulled(innerRect, x, y, false)) return 'visible';
  return 'ring';
}

// ---------------------------------------------------------------------------
// Analytical Coordinate Delta Fallback Helper
// ---------------------------------------------------------------------------
export function computeCanvasDelta(
  screenDeltaX: number,
  screenDeltaY: number,
  scale: number,
  containerRect?: { width: number; height: number }
): { dx: number; dy: number } {
  const width = containerRect && containerRect.width > 0 ? containerRect.width : 1600;
  const height = containerRect && containerRect.height > 0 ? containerRect.height : 1200;
  const aspectScale = Math.min(width / 1600, height / 1200) || 1;
  const effectiveScale = scale * aspectScale;

  return {
    dx: screenDeltaX / effectiveScale,
    dy: screenDeltaY / effectiveScale,
  };
}

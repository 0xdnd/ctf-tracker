import type { WorldBounds } from './types';

// ---------------------------------------------------------------------------
// Safe-area fit: frames a world rect inside the part of the canvas that the floating chrome (top
// HUD, toolbar rail, legend + minimap corner) does not cover. The SVG basis is 1600x1200 fitted with
// xMidYMid meet, so pixel insets are converted to basis units before the scale and pan are solved.
// ---------------------------------------------------------------------------

export interface SafeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
  /**
   * The legend + minimap block in the bottom-left corner (px from the container's left / bottom edge).
   * It can be cleared by a bottom band or by a left band; the fit picks whichever leaves more room.
   */
  corner?: { width: number; height: number };
}

const EDGE_GAP = 12;

/** Reads the floating chrome's rects (px) so the fit can keep content clear of them. */
export function measureSafeInsets(container: HTMLElement | null): SafeInsets {
  const base: SafeInsets = { top: 16, right: 16, bottom: 16, left: 16 };
  if (!container) return base;
  const c = container.getBoundingClientRect();
  if (c.width <= 0 || c.height <= 0) return base;
  const stats = container.querySelector<HTMLElement>('[data-graph-hud="stats"]');
  if (stats) {
    const r = stats.getBoundingClientRect();
    if (r.height > 0) base.top = Math.max(base.top, r.bottom - c.top + EDGE_GAP);
  }
  const rail = container.querySelector<HTMLElement>('[data-testid="canvas-nav-toolbar"]');
  if (rail) {
    const r = rail.getBoundingClientRect();
    if (r.width > 0) base.right = Math.max(base.right, c.right - r.left + EDGE_GAP);
  }
  const corner = container.querySelector<HTMLElement>('[data-graph-corner]');
  if (corner) {
    const r = corner.getBoundingClientRect();
    if (r.height > 0) base.corner = { width: r.right - c.left + EDGE_GAP, height: c.bottom - r.top + EDGE_GAP };
  }
  return base;
}

export interface FitResult {
  scale: number;
  x: number;
  y: number;
}

function solveWithInsets(
  bounds: WorldBounds,
  size: { w: number; h: number },
  insets: { top: number; right: number; bottom: number; left: number },
  opts: { minScale: number; maxScale: number; anchorTop?: boolean }
): FitResult {
  const a = Math.min(size.w / 1600, size.h / 1200) || 1;
  const ox = (size.w - 1600 * a) / 2;
  const oy = (size.h - 1200 * a) / 2;
  // Keep the insets from eating the whole canvas on very small containers
  const left = Math.min(insets.left, size.w * 0.45);
  const right = Math.min(insets.right, size.w * 0.3);
  const top = Math.min(insets.top, size.h * 0.4);
  const bottom = Math.min(insets.bottom, size.h * 0.45);
  const bx0 = (left - ox) / a;
  const bx1 = (size.w - right - ox) / a;
  const by0 = (top - oy) / a;
  const by1 = (size.h - bottom - oy) / a;
  const bw = Math.max(1, bounds.maxX - bounds.minX);
  const bh = Math.max(1, bounds.maxY - bounds.minY);
  const raw = Math.min((bx1 - bx0) / bw, (by1 - by0) / bh);
  const scale = Math.min(Math.max(raw, opts.minScale), opts.maxScale);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  // Content taller than the area at the minimum scale: keep its top in view (the rest pans) instead of centring
  const tooTall = opts.anchorTop === true && raw < scale;
  return { scale, x: (bx0 + bx1) / 2 - cx * scale, y: tooTall ? by0 - bounds.minY * scale : (by0 + by1) / 2 - cy * scale };
}

export function fitBoundsToSafeArea(
  bounds: WorldBounds,
  size: { w: number; h: number },
  insets: SafeInsets,
  opts: { minScale: number; maxScale: number; anchorTop?: boolean }
): FitResult {
  const { corner, ...edges } = insets;
  if (!corner) return solveWithInsets(bounds, size, edges, opts);
  const asBottom = solveWithInsets(bounds, size, { ...edges, bottom: Math.max(edges.bottom, corner.height) }, opts);
  const asLeft = solveWithInsets(bounds, size, { ...edges, left: Math.max(edges.left, corner.width) }, opts);
  // Prefer the centred (bottom band) fit unless clearing the corner on the left buys a clearly bigger view
  return asLeft.scale > asBottom.scale * 1.15 ? asLeft : asBottom;
}

import type { AttackNodePosition } from '../../../types/graph';
import type { WorldBounds } from './types';
import { centerX, centerY } from './constants';

// ---------------------------------------------------------------------------
// Collapsible subnet hubs (scoped view only)
//
// Above COLLAPSE_MIN_MACHINES drawn machines every hub starts collapsed (hub node, count badge and a
// ring of status dots). Expanding one hub fans its machines out in a grid block on the side of the hub
// that faces away from the operator rig, so a block never touches the rig or another hub's footprint.
// Positions here are defaults only: persisted user positions always win and are never rewritten.
// ---------------------------------------------------------------------------

/**
 * Graphs with this many machines or fewer keep every card on screen: a handful of machines spread over
 * a few subnets reads fine at a glance, so hubs that must be opened one by one would only add clicks.
 * Above it the cards crowd each other and fold into hubs.
 */
export const COLLAPSE_MIN_MACHINES = 12;
/** Base hub ring radius around the rig in the collapsible layout (the legacy fan layout uses 360). */
const HUB_RING_RADIUS = 300;

const HUB_CARD_W = 180;
const HUB_CARD_H = 84;
const CELL_W = 210; // card + 30px gap
const CELL_H = 110; // card + 26px gap
const BLOCK_MARGIN = 24; // clear air between a block and the hub footprint it fans out from
/** Columns per block on wide canvases. */
export const WIDE_COLS = 4;
/** Canvas widths (px) below this use the portrait stacked layout (phones & docked side-by-side panels). */
export const NARROW_CANVAS_PX = 640;

/** Footprint of a collapsed hub (node, dot ring, name pill and count badge) around its centre. */
const HUB_FOOTPRINT = { left: 150, right: 150, top: 66, bottom: 114 } as const;

/**
 * Ring radius around the rig for collapsed hubs.
 * At unscaled text (k <= 1) the base 300-unit ring already keeps rendered labels clear horizontally
 * and preserves the recorded scoped layout snapshot. When hubTextScale enlarges labels on smaller
 * viewports (k > 1), expand the ring so adjacent hubs on a 6-hub ring (Δy = 0.5 * R) stay disjoint.
 */
export function hubRingRadius(textScale = 1): number {
  if (textScale <= 1) return HUB_RING_RADIUS;
  const minVerticalSpan = HUB_FOOTPRINT.top + 58 + (HUB_FOOTPRINT.bottom - 58) * textScale + 16;
  return Math.max(HUB_RING_RADIUS, Math.ceil(minVerticalSpan * 2));
}
/** Collapsed-hub text stays about this many CSS px tall at the overview zoom (see hubTextScale). */
const HUB_TEXT_TARGET_PX = 11.5;
const HUB_TEXT_BASE = 14;
const HUB_TEXT_MAX = 2.4;

/**
 * World-unit multiplier for collapsed-hub text. The overview is fitted into a 1600x1200 basis, so on a
 * small canvas 14 world units are only a few CSS px; the text is enlarged to stay readable.
 */
export function hubTextScale(canvas: { w: number; h: number } | null): number {
  if (!canvas) return 1;
  const px = (Math.min(canvas.w / 1600, canvas.h / 1200) || 1) * 0.7; // the overview fits to ~0.7 of the canvas basis (measured)
  const k = HUB_TEXT_TARGET_PX / (px * HUB_TEXT_BASE);
  return Math.round(Math.min(Math.max(k, 1), HUB_TEXT_MAX) * 10) / 10;
}

export interface HubBlock {
  positions: Array<{ x: number; y: number }>;
  /** Outer box of the card grid, including the cell gaps. */
  box: WorldBounds;
}

export function computeHubBlock(
  hub: { x: number; y: number },
  angle: number,
  count: number,
  maxCols = WIDE_COLS,
  textScale = 1
): HubBlock {
  const n = Math.max(1, count);
  const cols = Math.min(n, maxCols);
  const rows = Math.ceil(n / cols);
  const w = cols * CELL_W;
  const h = rows * CELL_H;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  // Push the block out until it clears the hub's own footprint (ring, name pill, badge) on that side
  const fp = hubFootprint({ x: 0, y: 0 }, textScale);
  const fx = (fp.maxX - fp.minX) / 2;
  const fy = dy < 0 ? -fp.minY : fp.maxY;
  const reach = Math.abs(dx) * (w / 2 + fx) + Math.abs(dy) * (h / 2 + fy) + BLOCK_MARGIN;
  const left = Math.round(hub.x + dx * reach - w / 2);
  const top = Math.round(hub.y + dy * reach - h / 2);
  const positions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    positions.push({
      x: left + CELL_W / 2 + (i % cols) * CELL_W,
      y: top + CELL_H / 2 + Math.floor(i / cols) * CELL_H,
    });
  }
  return { positions, box: { minX: left, minY: top, maxX: left + w, maxY: top + h } };
}

export function hubFootprint(hub: { x: number; y: number }, textScale = 1): WorldBounds {
  const k = Math.max(1, textScale);
  return {
    minX: hub.x - HUB_FOOTPRINT.left * Math.max(1, k * 1.05),
    maxX: hub.x + HUB_FOOTPRINT.right * Math.max(1, k * 1.05),
    minY: hub.y - HUB_FOOTPRINT.top,
    maxY: hub.y + 58 + (HUB_FOOTPRINT.bottom - 58) * k,
  };
}

/** Footprint of the operator rig node plus its label pill. */
export function rigFootprint(): WorldBounds {
  return { minX: centerX - 130, maxX: centerX + 130, minY: centerY - 100, maxY: centerY + 100 };
}

export function unionBounds(a: WorldBounds, b: WorldBounds): WorldBounds {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/** Bounding box of cards centred at the given points. */
function cardsBounds(points: Array<{ x: number; y: number }>): WorldBounds | null {
  if (points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x - HUB_CARD_W / 2);
    maxX = Math.max(maxX, p.x + HUB_CARD_W / 2);
    minY = Math.min(minY, p.y - HUB_CARD_H / 2);
    maxY = Math.max(maxY, p.y + HUB_CARD_H / 2);
  }
  return { minX, minY, maxX, maxY };
}

/** Where a persisted (user) position wins over a default one. */
export function resolveCardPosition(
  id: string,
  stored: Record<string, AttackNodePosition>,
  defaults: Record<string, AttackNodePosition>,
  fallback: { x: number; y: number }
): { x: number; y: number } {
  return { x: stored[id]?.x ?? defaults[id]?.x ?? fallback.x, y: stored[id]?.y ?? defaults[id]?.y ?? fallback.y };
}

/**
 * World rect to frame for the collapsible-hub view. With a hub id: that hub plus its cards (zoom to the
 * open subnet). Without: the rig, every hub and every drawn card (the overview).
 */
export function computeCollapsibleBounds(args: {
  hubId: string | null;
  hubs: Array<{ id: string; x: number; y: number }>;
  /** Centres of the focused hub's cards. */
  focusCards: Array<{ x: number; y: number }>;
  /** Centres of every drawn card. */
  drawnCards: Array<{ x: number; y: number }>;
  textScale: number;
  /** Phone portrait layout: hubs are rows, not ring nodes. */
  portrait?: boolean;
}): WorldBounds {
  const { hubId, hubs, focusCards, drawnCards, textScale, portrait = false } = args;
  const footprint = (h: { x: number; y: number }, k?: number) => (portrait ? portraitRowBounds(h) : hubFootprint(h, k));
  const rig = portrait ? { minX: centerX - 90, maxX: centerX + 90, minY: centerY - 60, maxY: centerY + 82 } : rigFootprint();
  if (hubId) {
    const hub = hubs.find((h) => h.id === hubId);
    const base = hub ? footprint(hub) : rig;
    const cards = cardsBounds(focusCards);
    return cards ? unionBounds(base, cards) : base;
  }
  let b = rig;
  hubs.forEach((h) => {
    b = unionBounds(b, footprint(h, textScale));
  });
  const cards = cardsBounds(drawnCards);
  return cards ? unionBounds(b, cards) : b;
}

// ---------------------------------------------------------------------------
// Phone portrait layout (canvas narrower than NARROW_CANVAS_PX)
//
// The 1600x1200 basis is fitted into a tall, narrow canvas, so a ring of hubs gets a tiny px-per-unit
// ratio. Phones instead stack the hubs as rows in one column under the rig (circle and count on the
// left, name, dots and count badge to its right). An open hub shows alone, with its cards in one column
// below its row, so card and label text can be drawn at a readable zoom.
// ---------------------------------------------------------------------------
export const PORTRAIT_ROW_STEP = 88;
const PORTRAIT_FIRST_ROW_Y = centerY + 124;
const PORTRAIT_CARD_STEP = 96; // 84px card + 12px gap
const PORTRAIT_CARD_OFFSET_X = 64; // card centre vs the hub circle: card and circle left edges line up
const PORTRAIT_CARD_FIRST_DY = 96; // first card centre below the hub row
/** Width allowance for the name, dots and badge to the right of the hub circle. */
export const PORTRAIT_LABEL_W = 200;
/** Narrow canvases may zoom further in than the usual 3x so the tall column reaches a readable size. */
export const PORTRAIT_MAX_SCALE = 5;
/** Readable floor for the portrait fit, in CSS px per world unit (14-unit card names then draw ~11px). */
export const PORTRAIT_MIN_PX_PER_UNIT = 0.8;
/** The overview (every hub in view) may fit smaller than the readable floor; opening a hub or zooming in restores the floor. */
export const PORTRAIT_OVERVIEW_MIN_PX_PER_UNIT = 0.5;

export function portraitHubPosition(index: number): { x: number; y: number } {
  return { x: centerX, y: PORTRAIT_FIRST_ROW_Y + index * PORTRAIT_ROW_STEP };
}

/** Footprint of one hub row: circle, name, dots and count badge. */
export function portraitRowBounds(hub: { x: number; y: number }): WorldBounds {
  return { minX: hub.x - 34, maxX: hub.x + 44 + PORTRAIT_LABEL_W, minY: hub.y - 34, maxY: hub.y + 44 };
}

export function computePortraitBlock(hub: { x: number; y: number }, count: number): HubBlock {
  const positions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < count; i++) {
    positions.push({ x: hub.x + PORTRAIT_CARD_OFFSET_X, y: hub.y + PORTRAIT_CARD_FIRST_DY + i * PORTRAIT_CARD_STEP });
  }
  const left = hub.x + PORTRAIT_CARD_OFFSET_X - HUB_CARD_W / 2;
  const top = hub.y + PORTRAIT_CARD_FIRST_DY - HUB_CARD_H / 2;
  return {
    positions,
    box: { minX: left, minY: top, maxX: left + HUB_CARD_W, maxY: top + Math.max(1, count) * PORTRAIT_CARD_STEP },
  };
}

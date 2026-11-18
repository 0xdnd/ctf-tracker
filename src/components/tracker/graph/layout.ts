import { Machine } from '../../../types';
import type { AttackNodePosition } from '../../../types/graph';
import type { ClusterDef, ClusterTemplate, WorldBounds, ShowAllLayout } from './types';

// Scoped layout lives entirely inside the 1600x1200 SVG basis
export const SCOPED_BOUNDS: WorldBounds = { minX: 0, minY: 0, maxX: 1600, maxY: 1200 };

// Hub position of a cluster in world coordinates (rig is at 800, 600)
export function getClusterHub(c: ClusterDef): { x: number; y: number } {
  return {
    x: c.x ?? 800 + Math.cos(c.angle) * c.radius,
    y: c.y ?? 600 + Math.sin(c.angle) * c.radius,
  };
}

// ---------------------------------------------------------------------------
// SHOW ALL layout: every machine in its matching cluster (no capacity cap), packed in a
// grid of cells around the cluster hub. Deterministic; positions never overlap.
// ---------------------------------------------------------------------------
export const SHOW_ALL_CELL_W = 200;
export const SHOW_ALL_CELL_H = 104;
const SHOW_ALL_HUB_GAP = 110;
export const SHOW_ALL_BOUNDS_PADDING = 80;

export function computeShowAllLayout(machines: Machine[], templates: ClusterTemplate[]): ShowAllLayout {
  const positions: Record<string, AttackNodePosition> = {};
  const clusterOf: Record<string, string> = {};
  if (machines.length === 0 || templates.length === 0) {
    return { positions, clusters: [], clusterOf, bounds: SCOPED_BOUNDS };
  }

  const buckets = new Map<string, Machine[]>();
  templates.forEach((t) => buckets.set(t.id, []));
  const fallback = templates[templates.length - 1];
  machines.forEach((m) => {
    const t = templates.find((c) => c.matcher(m)) ?? fallback;
    buckets.get(t.id)!.push(m);
    clusterOf[m.id] = t.id;
  });

  const active = templates.filter((t) => buckets.get(t.id)!.length > 0);
  const count = active.length;
  const blocks = active.map((t, idx) => {
    const list = buckets.get(t.id)!;
    const cols = Math.ceil(Math.sqrt(list.length));
    const rows = Math.ceil(list.length / cols);
    return {
      t,
      list,
      cols,
      w: cols * SHOW_ALL_CELL_W,
      h: rows * SHOW_ALL_CELL_H,
      angle: -Math.PI / 2 + (idx * 2 * Math.PI) / count,
    };
  });

  type Box = { l: number; t: number; r: number; b: number };
  const overlaps = (a: Box, b: Box, margin: number) =>
    a.l < b.r + margin && b.l < a.r + margin && a.t < b.b + margin && b.t < a.b + margin;
  const rigBox: Box = { l: 800 - 130, t: 600 - 100, r: 800 + 130, b: 600 + 100 };

  // Hubs sit on a ring; each block extends outward from its hub (clear of the hub label)
  const place = (ringRadius: number) =>
    blocks.map((b) => {
      const dx = Math.cos(b.angle);
      const dy = Math.sin(b.angle);
      const hubX = Math.round(800 + dx * ringRadius);
      const hubY = Math.round(600 + dy * ringRadius);
      const reach = Math.abs(dx) * (b.w / 2) + Math.abs(dy) * (b.h / 2) + SHOW_ALL_HUB_GAP;
      const left = Math.round(hubX + dx * reach - b.w / 2);
      const top = Math.round(hubY + dy * reach - b.h / 2);
      const block: Box = { l: left, t: top, r: left + b.w, b: top + b.h };
      const hubBox: Box = { l: hubX - 90, t: hubY - 50, r: hubX + 90, b: hubY + 50 };
      const foot: Box = {
        l: Math.min(block.l, hubBox.l),
        t: Math.min(block.t, hubBox.t),
        r: Math.max(block.r, hubBox.r),
        b: Math.max(block.b, hubBox.b),
      };
      return { hubX, hubY, block, foot };
    });

  // Smallest ring (50-unit steps) where no two cluster footprints touch each other or the rig
  let ringRadius = 300;
  let placed = place(ringRadius);
  const isClear = (p: typeof placed) => {
    for (let i = 0; i < p.length; i++) {
      if (overlaps(p[i].foot, rigBox, 40)) return false;
      for (let j = i + 1; j < p.length; j++) {
        if (overlaps(p[i].foot, p[j].foot, 60)) return false;
      }
    }
    return true;
  };
  while (!isClear(placed) && ringRadius < 200000) {
    ringRadius += 50;
    placed = place(ringRadius);
  }

  const clusters: ClusterDef[] = [];
  let minX = rigBox.l;
  let minY = rigBox.t;
  let maxX = rigBox.r;
  let maxY = rigBox.b;
  blocks.forEach((b, i) => {
    const p = placed[i];
    clusters.push({
      id: b.t.id,
      name: b.t.name,
      angle: b.angle,
      radius: ringRadius,
      color: b.t.color,
      x: p.hubX,
      y: p.hubY,
    });
    b.list.forEach((m, idx) => {
      const col = idx % b.cols;
      const row = Math.floor(idx / b.cols);
      positions[m.id] = {
        x: p.block.l + SHOW_ALL_CELL_W / 2 + col * SHOW_ALL_CELL_W,
        y: p.block.t + SHOW_ALL_CELL_H / 2 + row * SHOW_ALL_CELL_H,
      };
    });
    minX = Math.min(minX, p.foot.l);
    minY = Math.min(minY, p.foot.t);
    maxX = Math.max(maxX, p.foot.r);
    maxY = Math.max(maxY, p.foot.b);
  });

  return {
    positions,
    clusters,
    clusterOf,
    bounds: {
      minX: minX - SHOW_ALL_BOUNDS_PADDING,
      minY: minY - SHOW_ALL_BOUNDS_PADDING,
      maxX: maxX + SHOW_ALL_BOUNDS_PADDING,
      maxY: maxY + SHOW_ALL_BOUNDS_PADDING,
    },
  };
}

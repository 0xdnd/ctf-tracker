/**
 * Auto layout for the attack graph ("Sugiyama-lite").
 *
 * Positions nodes left -> right by edge direction:
 *   1. cycles are broken by reversing DFS back-edges,
 *   2. longest-path layering (sources with no incoming edge sit in layer 0),
 *   3. barycenter ordering inside each layer (a few down/up sweeps),
 *   4. nodes without any usable edge are placed in a grid below the layers.
 *
 * Pure and deterministic: the same inputs always produce the same output, and
 * the output coordinates are node CENTERS (the coordinate system GraphView and
 * `graphNodePositions` use).
 */

export interface AutoLayoutEdge {
  sourceId: string;
  targetId: string;
}

export interface AutoLayoutOptions {
  /** Node card width. Default 180 (GraphView card is 180 wide). */
  nodeWidth?: number;
  /** Node card height. Default 84 (GraphView card is 84 tall). */
  nodeHeight?: number;
  /** Horizontal gap between layers. Default 90. */
  gapX?: number;
  /** Vertical gap between rows. Default 40. */
  gapY?: number;
  /** Center X of the first layer / first grid column. Default 130. */
  originX?: number;
  /** Center Y of the first row. Default 90. */
  originY?: number;
  /**
   * Optional soft limit for the largest node-center X. When the natural layout
   * is wider, the layer pitch shrinks (never below card width + 16px).
   */
  maxX?: number;
  /**
   * Optional soft limit for the largest node-center Y. When the natural layout
   * is taller, the row pitch shrinks (never below card height + 8px).
   */
  maxY?: number;
}

export const AUTO_LAYOUT_DEFAULTS = {
  nodeWidth: 180,
  nodeHeight: 84,
  gapX: 90,
  gapY: 40,
  originX: 130,
  originY: 90,
} as const;

const MIN_COLUMN_CLEARANCE = 16;
const MIN_ROW_CLEARANCE = 8;
const DEFAULT_GRID_COLUMNS = 6;
const ORDERING_SWEEPS = 4;
/** Extra rows (in row pitches) separating the layered area from the grid. */
const GRID_SEPARATION_ROWS = 1.5;

type Point = { x: number; y: number };

export function computeAutoLayout(
  nodeIds: string[],
  edges: AutoLayoutEdge[],
  opts: AutoLayoutOptions = {}
): Record<string, Point> {
  const nodeWidth = opts.nodeWidth ?? AUTO_LAYOUT_DEFAULTS.nodeWidth;
  const nodeHeight = opts.nodeHeight ?? AUTO_LAYOUT_DEFAULTS.nodeHeight;
  const gapX = opts.gapX ?? AUTO_LAYOUT_DEFAULTS.gapX;
  const gapY = opts.gapY ?? AUTO_LAYOUT_DEFAULTS.gapY;
  const originX = opts.originX ?? AUTO_LAYOUT_DEFAULTS.originX;
  const originY = opts.originY ?? AUTO_LAYOUT_DEFAULTS.originY;

  // Unique ids, input order preserved.
  const ids: string[] = [];
  const indexOf = new Map<string, number>();
  for (const id of nodeIds) {
    if (!indexOf.has(id)) {
      indexOf.set(id, ids.length);
      ids.push(id);
    }
  }
  const n = ids.length;
  const result: Record<string, Point> = {};
  if (n === 0) return result;

  // 1. Normalize edges: known endpoints, no self loops, no duplicate directed pairs.
  const out: number[][] = ids.map(() => []);
  const inDegree: number[] = new Array(n).fill(0);
  const degree: number[] = new Array(n).fill(0);
  const seenPairs = new Set<number>();
  for (const e of edges) {
    const s = indexOf.get(e.sourceId);
    const t = indexOf.get(e.targetId);
    if (s === undefined || t === undefined || s === t) continue;
    const key = s * n + t;
    if (seenPairs.has(key)) continue;
    seenPairs.add(key);
    out[s].push(t);
    inDegree[t] += 1;
    degree[s] += 1;
    degree[t] += 1;
  }

  // 2. Cycle breaking: iterative DFS, back-edges (to a node still on the stack) are reversed.
  //    Roots are true sources first so that the "natural" entry point stays in layer 0.
  const roots: number[] = [];
  for (let i = 0; i < n; i++) if (degree[i] > 0 && inDegree[i] === 0) roots.push(i);
  for (let i = 0; i < n; i++) if (degree[i] > 0 && inDegree[i] > 0) roots.push(i);

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color: number[] = new Array(n).fill(WHITE);
  const discovery: number[] = new Array(n).fill(0);
  let discoveryCounter = 0;
  const dagSeen = new Set<number>();
  const dagOut: number[][] = ids.map(() => []);
  const dagIn: number[][] = ids.map(() => []);
  const addDagEdge = (u: number, v: number) => {
    const key = u * n + v;
    if (dagSeen.has(key)) return;
    dagSeen.add(key);
    dagOut[u].push(v);
    dagIn[v].push(u);
  };

  for (const root of roots) {
    if (color[root] !== WHITE) continue;
    color[root] = GRAY;
    discovery[root] = discoveryCounter++;
    const stack: Array<[number, number]> = [[root, 0]];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const u = frame[0];
      if (frame[1] < out[u].length) {
        const v = out[u][frame[1]++];
        if (color[v] === WHITE) {
          color[v] = GRAY;
          discovery[v] = discoveryCounter++;
          addDagEdge(u, v);
          stack.push([v, 0]);
        } else if (color[v] === GRAY) {
          addDagEdge(v, u); // back edge -> reverse it
        } else {
          addDagEdge(u, v);
        }
      } else {
        color[u] = BLACK;
        stack.pop();
      }
    }
  }

  // 3. Longest-path layering over the DAG (Kahn order).
  const layerOf: number[] = new Array(n).fill(0);
  const pending: number[] = dagIn.map((preds) => preds.length);
  const queue: number[] = [];
  for (let i = 0; i < n; i++) if (degree[i] > 0 && pending[i] === 0) queue.push(i);
  for (let head = 0; head < queue.length; head++) {
    const u = queue[head];
    for (const v of dagOut[u]) {
      if (layerOf[v] < layerOf[u] + 1) layerOf[v] = layerOf[u] + 1;
      pending[v] -= 1;
      if (pending[v] === 0) queue.push(v);
    }
  }

  const connected: number[] = [];
  const isolated: number[] = [];
  for (let i = 0; i < n; i++) (degree[i] > 0 ? connected : isolated).push(i);

  const layerCount = connected.length > 0 ? connected.reduce((m, i) => Math.max(m, layerOf[i]), 0) + 1 : 0;
  const layers: number[][] = Array.from({ length: layerCount }, () => []);
  for (const i of connected) layers[layerOf[i]].push(i);
  for (const layer of layers) layer.sort((a, b) => discovery[a] - discovery[b]);

  // 4. Barycenter ordering. A node's "row" is its centered row coordinate, which makes
  //    positions comparable between layers of different sizes.
  const maxRows = layers.reduce((m, l) => Math.max(m, l.length), 0);
  const row: number[] = new Array(n).fill(0);
  const refreshRows = (layer: number[]) => {
    const offset = (maxRows - layer.length) / 2;
    layer.forEach((node, idx) => {
      row[node] = offset + idx;
    });
  };
  layers.forEach(refreshRows);

  const reorder = (layer: number[], neighbours: number[][]) => {
    const keyed = layer.map((node, idx) => {
      const adj = neighbours[node];
      let bary = row[node];
      if (adj.length > 0) {
        let sum = 0;
        for (const m of adj) sum += row[m];
        bary = sum / adj.length;
      }
      return { node, idx, bary };
    });
    keyed.sort((a, b) => a.bary - b.bary || a.idx - b.idx);
    keyed.forEach((k, idx) => {
      layer[idx] = k.node;
    });
    refreshRows(layer);
  };

  for (let sweep = 0; sweep < ORDERING_SWEEPS; sweep++) {
    for (let k = 1; k < layerCount; k++) reorder(layers[k], dagIn);
    for (let k = layerCount - 2; k >= 0; k--) reorder(layers[k], dagOut);
  }

  // 5. Coordinates.
  let pitchX = nodeWidth + gapX;
  let pitchY = nodeHeight + gapY;
  if (opts.maxX !== undefined && layerCount > 1) {
    const fit = (opts.maxX - originX) / (layerCount - 1);
    pitchX = Math.min(pitchX, Math.max(nodeWidth + MIN_COLUMN_CLEARANCE, fit));
  }

  const columnsFit =
    opts.maxX !== undefined ? Math.max(1, Math.floor((opts.maxX - originX) / pitchX) + 1) : Infinity;
  const gridColumns = Math.max(
    1,
    Math.min(Math.max(layerCount, DEFAULT_GRID_COLUMNS), columnsFit, Math.max(isolated.length, 1))
  );
  const gridRows = Math.ceil(isolated.length / gridColumns);
  const gridStartUnit = layerCount > 0 ? maxRows - 1 + GRID_SEPARATION_ROWS : 0;
  const spanUnits = isolated.length > 0 ? gridStartUnit + gridRows - 1 : Math.max(maxRows - 1, 0);
  if (opts.maxY !== undefined && spanUnits > 0) {
    const fit = (opts.maxY - originY) / spanUnits;
    pitchY = Math.min(pitchY, Math.max(nodeHeight + MIN_ROW_CLEARANCE, fit));
  }

  layers.forEach((layer, k) => {
    const offset = (maxRows - layer.length) / 2;
    layer.forEach((node, idx) => {
      result[ids[node]] = {
        x: Math.round(originX + k * pitchX),
        y: Math.round(originY + (offset + idx) * pitchY),
      };
    });
  });

  isolated.forEach((node, idx) => {
    const col = idx % gridColumns;
    const r = Math.floor(idx / gridColumns);
    result[ids[node]] = {
      x: Math.round(originX + col * pitchX),
      y: Math.round(originY + (gridStartUnit + r) * pitchY),
    };
  });

  return result;
}

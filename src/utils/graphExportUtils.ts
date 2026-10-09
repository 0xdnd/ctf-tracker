import { AttackGraphEdge, ATTACK_EDGE_META } from '../types/graph';
import { Machine } from '../types';

export interface ExportGraphNode {
  id: string;
  name: string;
  ip: string;
  os: string;
  difficulty: string;
  status: string;
  x: number;
  y: number;
  machine?: Machine;
}

export interface ObsidianCanvasNode {
  id: string;
  type: 'text' | 'file' | 'link' | 'group';
  text?: string;
  file?: string;
  url?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export interface ObsidianCanvasEdge {
  id: string;
  fromNode: string;
  fromSide?: 'top' | 'right' | 'bottom' | 'left';
  toNode: string;
  toSide?: 'top' | 'right' | 'bottom' | 'left';
  label?: string;
  color?: string;
}

export interface ObsidianCanvasData {
  nodes: ObsidianCanvasNode[];
  edges: ObsidianCanvasEdge[];
}

/**
 * Maps status to Obsidian Canvas color codes:
 * 1: red, 2: orange, 3: yellow, 4: green, 5: cyan, 6: purple
 */
function getObsidianColorForStatus(status: string): string {
  if (status === 'root' || status === 'completed') return '4'; // green
  if (status === 'foothold') return '3'; // yellow
  return '5'; // cyan
}

/**
 * Maps edge type to Obsidian Canvas color codes
 */
function getObsidianColorForEdgeType(type: string): string {
  switch (type) {
    case 'pivot-ssh':
      return '4'; // green
    case 'pivot-chisel':
      return '5'; // cyan
    case 'pivot-ligolo':
      return '5'; // blue/cyan
    case 'pivot-socks5':
      return '6'; // purple
    case 'ad-trust-bidirectional':
    case 'ad-trust-parent-child':
      return '2'; // orange
    case 'domain-admin-path':
      return '1'; // red
    default:
      return '6'; // purple
  }
}

/**
 * Exports current attack topology to native Obsidian .canvas JSON file.
 * Compatible with JSON Canvas v1.0 specification.
 */
export function exportToObsidianCanvas(
  nodes: ExportGraphNode[],
  edges: AttackGraphEdge[],
  filenamePrefix: string = 'zerobox-attack-topology'
): { success: boolean; data: ObsidianCanvasData; filename: string } {
  const canvasNodes: ObsidianCanvasNode[] = nodes.map((node) => {
    const isRooted = node.status === 'root' || node.status === 'completed';
    const isFoothold = node.status === 'foothold';
    const statusLabel = isRooted ? 'ROOT / PWNED' : isFoothold ? 'FOOTHOLD' : 'UNSOLVED';

    const markdownText = [
      `### ${node.name}`,
      `- **IP**: \`${node.ip || 'Pending'}\``,
      `- **OS**: ${node.os}`,
      `- **Difficulty**: ${node.difficulty}`,
      `- **Status**: **${statusLabel}**`,
    ].join('\n');

    return {
      id: node.id,
      type: 'text',
      text: markdownText,
      x: Math.round(node.x - 100),
      y: Math.round(node.y - 60),
      width: 200,
      height: 120,
      color: getObsidianColorForStatus(node.status),
    };
  });

  const canvasEdges: ObsidianCanvasEdge[] = edges.map((edge) => {
    const meta = ATTACK_EDGE_META[edge.type];
    const label = edge.label || meta?.label || edge.type;
    return {
      id: edge.id,
      fromNode: edge.sourceId,
      fromSide: 'right',
      toNode: edge.targetId,
      toSide: 'left',
      label: edge.port ? `${label} (:${edge.port})` : label,
      color: getObsidianColorForEdgeType(edge.type),
    };
  });

  const canvasData: ObsidianCanvasData = {
    nodes: canvasNodes,
    edges: canvasEdges,
  };

  const filename = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.canvas`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const jsonStr = JSON.stringify(canvasData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[ZeroBox] Failed to trigger Obsidian Canvas download:', err);
    }
  }

  return { success: true, data: canvasData, filename };
}

/**
 * Exports SVG attack canvas to standalone Scalable Vector Graphic file (.svg)
 * with embedded dark background and styling fidelity.
 */
export function exportToSvg(
  svgElementId: string = 'zerobox-attack-graph-svg',
  filenamePrefix: string = 'zerobox-attack-topology'
): { success: boolean; filename: string } {
  const filename = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.svg`;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { success: false, filename };
  }

  const svg = document.getElementById(svgElementId) as SVGSVGElement | null;
  if (!svg) {
    console.warn(`[ZeroBox] SVG element with ID "${svgElementId}" not found for export.`);
    return { success: false, filename };
  }

  try {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clone);

    // Ensure XML declaration
    if (!svgString.startsWith('<?xml')) {
      svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;
    }

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (err) {
    console.error('[ZeroBox] Failed to export SVG:', err);
    return { success: false, filename };
  }
}

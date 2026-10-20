import React, { useState, useRef, useMemo, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Crosshair, 
  X,
  Maximize2,
  Minimize2,
  Share2,
  Radio,
  Focus,
  Network,
  Download,
  Undo2,
  Redo2,
  Workflow
} from 'lucide-react';
import { Machine, Platform, OperatingSystem, Difficulty } from '../../types';
import { useCtfStore } from '../../store/useCtfStore';
import { PlatformIcon, platformFullName } from '../common/PlatformBadge';
import { CategoryBadge } from '../common/CategoryBadge';
import { EditableIpBadge } from '../common/EditableIpBadge';
import { LINUX_TUX_PATH } from '../common/OsBadge';
import { classifyMachine } from '../../utils/categoryUtils';
import { playCyberSound } from '../../utils/helpers';
import { AttackNodePosition, AttackGraphEdge, ATTACK_EDGE_META, ATTACK_EDGE_TYPES } from '../../types/graph';
import { GraphEdgeInspectorDrawer } from './GraphEdgeInspectorDrawer';
import { exportToObsidianCanvas, exportToSvg, ExportGraphNode } from '../../utils/graphExportUtils';
import { computeAutoLayout } from '../../utils/graphAutoLayout';
import { useGraphHistory } from '../../hooks/useGraphHistory';

export interface GraphViewProps {
  filteredMachines: Machine[];
}

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

// Scoped layout lives entirely inside the 1600x1200 SVG basis
const SCOPED_BOUNDS: WorldBounds = { minX: 0, minY: 0, maxX: 1600, maxY: 1200 };

// Hub position of a cluster in world coordinates (rig is at 800, 600)
export function getClusterHub(c: ClusterDef): { x: number; y: number } {
  return {
    x: c.x ?? 800 + Math.cos(c.angle) * c.radius,
    y: c.y ?? 600 + Math.sin(c.angle) * c.radius,
  };
}

// ---------------------------------------------------------------------------
// Multi-Theme Tokens Engine
// ---------------------------------------------------------------------------
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

export function getCanvasThemeTokens(themePreset: string = 'obsidian', isDark: boolean = true): CanvasThemeTokens {
  const p = String(themePreset || 'obsidian').toLowerCase().trim();
  if (!isDark || p === 'light') {
    if (p === 'monolith' || p === 'clean-monolith' || p === 'clean monolith') {
      return {
        canvasBg: '#FAFAFA',
        cardBg: '#FFFFFF',
        cardBorder: '#E4E4E7',
        cardHoverBorder: '#0284C7',
        textPrimary: '#09090B',
        textMuted: '#52525B',
        codeBg: '#F4F4F5',
        codeBorder: '#E4E4E7',
        accent: '#0284C7',
        accentGlow: 'none',
        gridColor: '#CBD5E1',
        statusRoot: '#10B981',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#0284C7',
      };
    }
    if (p === 'htb' || p === 'hackthebox' || p === 'hack-the-box' || p === 'hack the box') {
      return {
        canvasBg: '#F1F5F9',
        cardBg: '#FFFFFF',
        cardBorder: '#CBD5E1',
        cardHoverBorder: '#15803D',
        textPrimary: '#0F172A',
        textMuted: '#475569',
        codeBg: '#E2E8F0',
        codeBorder: '#CBD5E1',
        accent: '#15803D',
        accentGlow: 'none',
        gridColor: '#CBD5E1',
        statusRoot: '#15803D',
        statusFoothold: '#D97706',
        statusUnsolved: '#475569',
      };
    }
    if (p === 'light') {
      return {
        canvasBg: '#F8FAFC',
        cardBg: '#FFFFFF',
        cardBorder: '#E2E8F0',
        cardHoverBorder: '#008B99',
        textPrimary: '#0F172A',
        textMuted: '#64748B',
        codeBg: '#F1F5F9',
        codeBorder: '#CBD5E1',
        accent: '#008B99',
        accentGlow: 'none',
        gridColor: '#E2E8F0',
        statusRoot: '#059669',
        statusFoothold: '#D97706',
        statusUnsolved: '#008B99',
      };
    }
    if (p === 'obsidian' || p === 'obsidian-dark' || p === 'obsidian dark') {
      return {
        canvasBg: '#F4F4F5',
        cardBg: '#FFFFFF',
        cardBorder: '#E4E4E7',
        cardHoverBorder: '#0284C7',
        textPrimary: '#09090B',
        textMuted: '#52525B',
        codeBg: '#E4E4E7',
        codeBorder: '#D4D4D8',
        accent: '#0284C7',
        accentGlow: 'none',
        gridColor: '#E4E4E7',
        statusRoot: '#10B981',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#0284C7',
      };
    }
    return {
      canvasBg: '#F8FAFC',
      cardBg: '#FFFFFF',
      cardBorder: '#CBD5E1',
      cardHoverBorder: '#008B99',
      textPrimary: '#0F172A',
      textMuted: '#64748B',
      codeBg: '#F1F5F9',
      codeBorder: '#CBD5E1',
      accent: '#008B99',
      accentGlow: 'none',
      gridColor: '#008B99',
      statusRoot: '#059669',
      statusFoothold: '#D97706',
      statusUnsolved: '#0284C7',
    };
  }

  switch (p) {
    case 'monolith':
    case 'clean-monolith':
    case 'clean monolith':
      return {
        canvasBg: '#18181B',
        cardBg: '#27272A',
        cardBorder: '#3F3F46',
        cardHoverBorder: '#38BDF8',
        textPrimary: '#F4F4F5',
        textMuted: '#A1A1AA',
        codeBg: '#09090B',
        codeBorder: '#3F3F46',
        accent: '#38BDF8',
        accentGlow: 'none',
        gridColor: '#3F3F46',
        statusRoot: '#10B981',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#38BDF8',
      };
    case 'industrial':
      return {
        canvasBg: '#000000',
        cardBg: '#0A0A0A',
        cardBorder: '#323232',
        cardHoverBorder: '#00FF66',
        textPrimary: '#FFFFFF',
        textMuted: '#AAAAAA',
        codeBg: '#050505',
        codeBorder: '#323232',
        accent: '#00FF66',
        accentGlow: 'none',
        gridColor: '#323232',
        statusRoot: '#00FF66',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#00FF66',
      };
    case 'oled':
      return {
        canvasBg: '#000000',
        cardBg: '#0A0A0A',
        cardBorder: '#262626',
        cardHoverBorder: '#38BDF8',
        textPrimary: '#F1F5F9',
        textMuted: '#737373',
        codeBg: '#050505',
        codeBorder: '#1F1F1F',
        accent: '#38BDF8',
        accentGlow: 'none',
        gridColor: '#38BDF8',
        statusRoot: '#10B981',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#38BDF8',
      };
    case 'htb':
    case 'hackthebox':
    case 'hack-the-box':
    case 'hack the box':
      return {
        canvasBg: '#000000',
        cardBg: '#0B1015',
        cardBorder: '#1C2633',
        cardHoverBorder: '#9FEF00',
        textPrimary: '#FFFFFF',
        textMuted: '#94A3B8',
        codeBg: '#05070A',
        codeBorder: '#1C2633',
        accent: '#9FEF00',
        accentGlow: 'none',
        gridColor: '#1C2633',
        statusRoot: '#9FEF00',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#64748B',
      };
    case 'zerobox':
      return {
        canvasBg: '#070B14',
        cardBg: '#0D1527',
        cardBorder: '#1E2D4A',
        cardHoverBorder: '#00F0FF',
        textPrimary: '#E2E8F0',
        textMuted: '#94A3B8',
        codeBg: '#060A12',
        codeBorder: '#162238',
        accent: '#00F0FF',
        accentGlow: 'none',
        gridColor: '#1E2D4A',
        statusRoot: '#10B981',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#06B6D4',
      };
    case 'obsidian':
    case 'obsidian-dark':
    case 'obsidian dark':
    case 'neon':
    default:
      return {
        canvasBg: '#09090B',
        cardBg: '#121215',
        cardBorder: '#27272A',
        cardHoverBorder: '#0EA5E9',
        textPrimary: '#F4F4F5',
        textMuted: '#A1A1AA',
        codeBg: '#0C0C0F',
        codeBorder: '#27272A',
        accent: '#0EA5E9',
        accentGlow: 'none',
        gridColor: '#27272A',
        statusRoot: '#10B981',
        statusFoothold: '#F59E0B',
        statusUnsolved: '#0EA5E9',
      };
  }
}

// ---------------------------------------------------------------------------
// Telemetry Extraction & Badge Helpers
// ---------------------------------------------------------------------------
export function extractMachinePorts(machine: Machine): number[] {
  if (Array.isArray(machine.openPorts) && machine.openPorts.length > 0) {
    return machine.openPorts;
  }
  if (Array.isArray(machine.services) && machine.services.length > 0) {
    return machine.services
      .map((s) => s.port)
      .filter((p) => typeof p === 'number' && p > 0);
  }
  return [];
}

export function getDifficultyColors(
  diff: Difficulty | string,
  isDark?: boolean
): { fill: string; stroke: string; text: string } {
  const dark = isDark !== undefined 
    ? isDark 
    : (typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true);

  if (!dark) {
    switch (diff) {
      case 'Very Easy':
        return { fill: 'rgba(14, 116, 144, 0.15)', stroke: 'rgba(14, 116, 144, 0.6)', text: '#0E7490' };
      case 'Easy':
        return { fill: 'rgba(4, 120, 87, 0.15)', stroke: 'rgba(4, 120, 87, 0.6)', text: '#047857' };
      case 'Medium':
        return { fill: 'rgba(180, 83, 9, 0.15)', stroke: 'rgba(180, 83, 9, 0.6)', text: '#B45309' };
      case 'Hard':
        return { fill: 'rgba(190, 18, 60, 0.15)', stroke: 'rgba(190, 18, 60, 0.6)', text: '#BE123C' };
      case 'Insane':
        return { fill: 'rgba(126, 34, 206, 0.15)', stroke: 'rgba(126, 34, 206, 0.6)', text: '#7E22CE' };
      default:
        return { fill: 'rgba(71, 85, 105, 0.15)', stroke: 'rgba(71, 85, 105, 0.6)', text: '#475569' };
    }
  }

  switch (diff) {
    case 'Very Easy':
      return { fill: 'rgba(6, 182, 212, 0.15)', stroke: 'rgba(6, 182, 212, 0.6)', text: '#06B6D4' };
    case 'Easy':
      return { fill: 'rgba(16, 185, 129, 0.15)', stroke: 'rgba(16, 185, 129, 0.6)', text: '#10B981' };
    case 'Medium':
      return { fill: 'rgba(245, 158, 11, 0.15)', stroke: 'rgba(245, 158, 11, 0.6)', text: '#F59E0B' };
    case 'Hard':
      return { fill: 'rgba(244, 63, 94, 0.15)', stroke: 'rgba(244, 63, 94, 0.6)', text: '#F43F5E' };
    case 'Insane':
      return { fill: 'rgba(168, 85, 247, 0.15)', stroke: 'rgba(168, 85, 247, 0.6)', text: '#A855F7' };
    default:
      return { fill: 'rgba(148, 163, 184, 0.15)', stroke: 'rgba(148, 163, 184, 0.6)', text: '#94A3B8' };
  }
}

function getPortColor(port: number, isDark?: boolean): { text: string; stroke: string; bg: string } {
  const dark = isDark !== undefined 
    ? isDark 
    : (typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true);

  if (!dark) {
    if (port === 22 || port === 2222) {
      return { text: '#047857', stroke: 'rgba(4, 120, 87, 0.5)', bg: 'rgba(4, 120, 87, 0.12)' };
    }
    if (port === 80 || port === 443 || port === 8080 || port === 8443) {
      return { text: '#0E7490', stroke: 'rgba(14, 116, 144, 0.5)', bg: 'rgba(14, 116, 144, 0.12)' };
    }
    if (port === 445 || port === 139 || port === 135) {
      return { text: '#B45309', stroke: 'rgba(180, 83, 9, 0.5)', bg: 'rgba(180, 83, 9, 0.12)' };
    }
    if (port === 88 || port === 389 || port === 636) {
      return { text: '#BE123C', stroke: 'rgba(190, 18, 60, 0.5)', bg: 'rgba(190, 18, 60, 0.12)' };
    }
    if (port === 3389 || port === 5900) {
      return { text: '#0369A1', stroke: 'rgba(3, 105, 161, 0.5)', bg: 'rgba(3, 105, 161, 0.12)' };
    }
    return { text: '#475569', stroke: 'rgba(71, 85, 105, 0.4)', bg: 'rgba(71, 85, 105, 0.08)' };
  }

  if (port === 22 || port === 2222) {
    return { text: '#10B981', stroke: 'rgba(16, 185, 129, 0.5)', bg: 'rgba(16, 185, 129, 0.12)' };
  }
  if (port === 80 || port === 443 || port === 8080 || port === 8443) {
    return { text: '#06B6D4', stroke: 'rgba(6, 182, 212, 0.5)', bg: 'rgba(6, 182, 212, 0.12)' };
  }
  if (port === 445 || port === 139 || port === 135) {
    return { text: '#F59E0B', stroke: 'rgba(245, 158, 11, 0.5)', bg: 'rgba(245, 158, 11, 0.12)' };
  }
  if (port === 88 || port === 389 || port === 636) {
    return { text: '#EC4899', stroke: 'rgba(236, 72, 153, 0.5)', bg: 'rgba(236, 72, 153, 0.12)' };
  }
  if (port === 3389 || port === 5900) {
    return { text: '#38BDF8', stroke: 'rgba(56, 189, 248, 0.5)', bg: 'rgba(56, 189, 248, 0.12)' };
  }
  return { text: '#94A3B8', stroke: 'rgba(148, 163, 184, 0.4)', bg: 'rgba(148, 163, 184, 0.08)' };
}

// OS Vector Paths
const WINDOWS_PATH = "M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.901-1.801";
const MACOS_PATH = "M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.96c.64-.78 1.08-1.86.96-2.96-1 .04-2.12.67-2.78 1.45-.58.67-1.1 1.77-.96 2.84 1.12.09 2.19-.58 2.78-1.33z";
const ANDROID_PATH = "M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4116 13.8533 8.082 12 8.082s-3.5902.3296-5.1368.8677L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396";
const BSD_PATH = "M12 2C6.477 2 2 6.477 2 12c0 5.524 4.477 10 10 10s10-4.476 10-10c0-5.523-4.477-10-10-10zm-2.2 4.5c.5 0 .9.2 1.2.5.3.3.4.7.4 1.1 0 .6-.3 1.2-.7 1.6-.4.4-1 .6-1.6.6-.7 0-1.3-.2-1.7-.7-.4-.5-.6-1.1-.6-1.8 0-.4.1-.7.4-.9.3-.2.7-.4 1-.4zm6.4 0c.4 0 .8.2 1.1.4.3.2.4.5.4.9 0 .7-.2 1.3-.6 1.8-.4.5-1 .7-1.7.7-.6 0-1.2-.2-1.6-.6-.4-.4-.7-1-.7-1.6 0-.4.1-.8.4-1.1.3-.3.7-.5 1.3-.5zM12 18.2c-3.1 0-5.5-2-5.7-4.7h11.4c-.2 2.7-2.6 4.7-5.7 4.7z";

// ---------------------------------------------------------------------------
// Large-graph performance thresholds
// ---------------------------------------------------------------------------
// Below this committed zoom (and above LARGE_GRAPH_NODE_COUNT nodes) distant cards render compact.
export const LOD_SCALE_THRESHOLD = 0.6;
// Above this many visible nodes: pulse animations stop and off-screen cards are culled.
export const LARGE_GRAPH_NODE_COUNT = 60;
// Below this zoom (large graphs only) cards collapse to a bare status-coloured rect.
export const LOD_DOT_SCALE_THRESHOLD = 0.3;
// SHOW ALL spans a much larger world, so it may zoom out further than the scoped view (0.2).
const MIN_SCALE_SCOPED = 0.2;
const MIN_SCALE_SHOW_ALL = 0.05;

// ---------------------------------------------------------------------------
// SHOW ALL layout: every machine in its matching cluster (no capacity cap), packed in a
// grid of cells around the cluster hub. Deterministic; positions never overlap.
// ---------------------------------------------------------------------------
export const SHOW_ALL_CELL_W = 200;
export const SHOW_ALL_CELL_H = 104;
const SHOW_ALL_HUB_GAP = 110;
const SHOW_ALL_BOUNDS_PADDING = 80;

export interface ShowAllLayout {
  positions: Record<string, AttackNodePosition>;
  clusters: ClusterDef[];
  clusterOf: Record<string, string>;
  bounds: WorldBounds;
}

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

// ---------------------------------------------------------------------------
// Pure SVG Machine Node Card (<AttackNodeCard>)
// ---------------------------------------------------------------------------
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

export const AttackNodeCard: React.FC<AttackNodeCardProps> = React.memo(({
  node,
  x: xProp,
  y: yProp,
  animate = true,
  lod = 'full',
  isFocused = false,
  isSelected,
  isHovered,
  isConnectingSource,
  tokens,
  onSelect,
  onHover,
  onFocusChange,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) => {
  const isRooted = node.status === 'root' || node.status === 'completed';
  const isFoothold = node.status === 'foothold';

  const statusColor = isRooted 
    ? tokens.statusRoot 
    : isFoothold 
    ? tokens.statusFoothold 
    : tokens.statusUnsolved;

  const displayName = node.name.length > 12 ? `${node.name.slice(0, 11)}…` : node.name;
  const isDark = typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : true;
  const diffColors = getDifficultyColors(node.difficulty, isDark);
  const ports = extractMachinePorts(node.machine);

  // Card geometry: 180w x 84h centered at (x, y)
  const x = xProp ?? node.x;
  const y = yProp ?? node.y;
  const cardX = x - 90;
  const cardY = y - 42;
  // Compact name: 10 glyphs max at 16px (<= ~160px even for wide letters) so it stays inside the 180px rect
  const compactName = node.name.length > 10 ? `${node.name.slice(0, 9)}…` : node.name;
  const tier = isSelected || isHovered || isConnectingSource || isFocused ? 'full' : lod;

  return (
    <g
      id={`attack-node-${node.id}`}
      data-testid={`attack-node-${node.id}`}
      data-node-interactive="true"
      data-node-id={node.id}
      tabIndex={0}
      role="button"
      aria-label={`Target machine ${node.name}`}
      className="cursor-grab active:cursor-grabbing select-none"
      onPointerDown={(e) => onPointerDown(e, node)}
      onPointerMove={(e) => onPointerMove?.(e, node)}
      onPointerUp={(e) => onPointerUp?.(e, node)}
      onFocus={() => onFocusChange?.(node.id)}
      onBlur={() => onFocusChange?.(null)}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onSelect(node);
        }
      }}
    >
      {tier === 'dot' ? (
        /* LOD (far zoom): same footprint, bare status-colored rect, no text */
        <rect
          x={cardX}
          y={cardY}
          width="180"
          height="84"
          rx="8"
          fill={statusColor}
          fillOpacity="0.85"
          stroke={statusColor}
          strokeWidth="1.5"
        />
      ) : tier === 'compact' ? (
        <>
          {/* LOD: same 180x84 footprint, status-colored outline, name only */}
          <rect
            x={cardX}
            y={cardY}
            width="180"
            height="84"
            rx="8"
            fill={tokens.cardBg}
            stroke={statusColor}
            strokeWidth="1.5"
          />
          <text
            x={x}
            y={y + 6}
            fill={tokens.textPrimary}
            fontSize="16"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
            fontWeight="600"
            textAnchor="middle"
            className="pointer-events-none select-none"
          >
            {compactName}
          </text>
        </>
      ) : (
      <>
      {/* Connecting Source Pulse Ring */}
      {isConnectingSource && (
        <rect
          x={cardX - 5}
          y={cardY - 5}
          width="190"
          height="94"
          rx="12"
          fill="none"
          stroke="#00F0FF"
          strokeWidth="2.5"
          strokeDasharray="8 4"
          className="pointer-events-none"
        >
          <animate attributeName="stroke-dashoffset" values="0;24" dur="1.2s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Selection Tactical Targeting Reticles (4 corners) */}
      {isSelected && (
        <g className="pointer-events-none">
          {/* Top-Left Corner */}
          <path
            d={`M ${cardX - 4} ${cardY + 12} L ${cardX - 4} ${cardY - 4} L ${cardX + 12} ${cardY - 4}`}
            stroke={tokens.accent}
            strokeWidth="2"
            fill="none"
          />
          {/* Top-Right Corner */}
          <path
            d={`M ${cardX + 168} ${cardY - 4} L ${cardX + 184} ${cardY - 4} L ${cardX + 184} ${cardY + 12}`}
            stroke={tokens.accent}
            strokeWidth="2"
            fill="none"
          />
          {/* Bottom-Left Corner */}
          <path
            d={`M ${cardX - 4} ${cardY + 72} L ${cardX - 4} ${cardY + 88} L ${cardX + 12} ${cardY + 88}`}
            stroke={tokens.accent}
            strokeWidth="2"
            fill="none"
          />
          {/* Bottom-Right Corner */}
          <path
            d={`M ${cardX + 168} ${cardY + 88} L ${cardX + 184} ${cardY + 88} L ${cardX + 184} ${cardY + 72}`}
            stroke={tokens.accent}
            strokeWidth="2"
            fill="none"
          />
        </g>
      )}

      {/* Primary Card Background & Boundary */}
      <rect
        x={cardX}
        y={cardY}
        width="180"
        height="84"
        rx="8"
        fill={tokens.cardBg}
        stroke={isSelected ? tokens.accent : isHovered ? tokens.cardHoverBorder : tokens.cardBorder}
        strokeWidth={isSelected ? '2' : isHovered ? '1.5' : '1.2'}
        style={{
          filter: tokens.accentGlow && tokens.accentGlow !== 'none'
            ? (isSelected 
                ? `drop-shadow(0 0 10px ${tokens.accentGlow})` 
                : isHovered 
                ? `drop-shadow(0 0 6px ${tokens.accentGlow})` 
                : undefined)
            : undefined,
        }}
      />

      {/* Subtle 1px machined top-edge highlight inside card */}
      <line
        x1={cardX + 4}
        y1={cardY + 1}
        x2={cardX + 176}
        y2={cardY + 1}
        stroke="rgba(255, 255, 255, 0.07)"
        strokeWidth="1"
        className="pointer-events-none"
      />

      {/* Row 1: Header (OS Icon, Machine Name, Status Beacon) */}
      {/* OS Vector Icon */}
      {node.platform && (
        <g className="pointer-events-none" aria-label={`Platform: ${platformFullName(node.platform)}`}>
          <title>{`Platform: ${platformFullName(node.platform)}`}</title>
          <rect x={cardX + 8} y={cardY + 9} width="26" height="14" rx="3" fill={tokens.codeBg} stroke={tokens.codeBorder} strokeWidth="0.8" />
          <text
            x={cardX + 21}
            y={cardY + 19}
            fill={tokens.accent}
            fontSize="8"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="700"
            textAnchor="middle"
            className="select-none"
          >
            {node.platform}
          </text>
        </g>
      )}
      <g transform={`translate(${cardX + (node.platform ? 38 : 10)}, ${cardY + 8})`}>
        {node.os?.toLowerCase() === 'linux' ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#F97316">
            <path d={LINUX_TUX_PATH} />
          </svg>
        ) : node.os?.toLowerCase() === 'windows' ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#00A4EF">
            <path d={WINDOWS_PATH} />
          </svg>
        ) : node.os?.toLowerCase() === 'macos' ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill={tokens.textPrimary}>
            <path d={MACOS_PATH} />
          </svg>
        ) : node.os?.toLowerCase() === 'android' ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#3DDC84">
            <path d={ANDROID_PATH} />
          </svg>
        ) : node.os?.toLowerCase() === 'bsd' ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="#E11D48">
            <path d={BSD_PATH} />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#64748B" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M7 15h10M7 8l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </g>

      {/* Target Hostname */}
      <text
        x={cardX + (node.platform ? 60 : 32)}
        y={cardY + 20}
        fill={isSelected ? tokens.accent : tokens.textPrimary}
        fontSize="12"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="600"
        letterSpacing="-0.01em"
        textAnchor="start"
        className="pointer-events-none select-none"
      >
        {displayName}
      </text>

      {/* Status Beacon (Hardware-grade concentric LED beacon with subtle pulse) */}
      <g transform={`translate(${cardX + 164}, ${cardY + 16})`} className="pointer-events-none">
        {isRooted && animate && (
          <circle
            cx="0"
            cy="0"
            r="4.5"
            fill="none"
            stroke={statusColor}
            strokeWidth="1.2"
            opacity="0.4"
          >
            <animate attributeName="r" values="4.5;7.5;4.5" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.4;0.08;0.4" dur="2.4s" repeatCount="indefinite" />
          </circle>
        )}
        {isFoothold && (
          <circle
            cx="0"
            cy="0"
            r="5.5"
            fill="none"
            stroke={statusColor}
            strokeWidth="0.8"
            opacity="0.25"
          />
        )}
        <circle cx="0" cy="0" r="3.5" fill={statusColor} />
      </g>

      {/* Subtle Row Divider */}
      <line
        x1={cardX + 8}
        y1={cardY + 30}
        x2={cardX + 172}
        y2={cardY + 30}
        stroke={tokens.cardBorder}
        strokeWidth="0.6"
        opacity="0.4"
      />

      {/* Row 2: IP Address Pill & Difficulty Badge */}
      {/* IP Badge */}
      <rect
        x={cardX + 8}
        y={cardY + 35}
        width="86"
        height="18"
        rx="4"
        fill={tokens.codeBg}
        stroke={tokens.codeBorder}
        strokeWidth="0.8"
      />
      <text
        x={cardX + 51}
        y={cardY + 47.5}
        fill={tokens.accent}
        fontSize="9.5"
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="600"
        style={{ fontVariantNumeric: 'tabular-nums' }}
        textAnchor="middle"
        className="pointer-events-none select-none"
      >
        {node.ip}
      </text>

      {/* Difficulty Pill */}
      <rect
        x={cardX + 100}
        y={cardY + 35}
        width="72"
        height="18"
        rx="4"
        fill={diffColors.fill}
        stroke={diffColors.stroke}
        strokeWidth="0.8"
      />
      <text
        x={cardX + 136}
        y={cardY + 47.5}
        fill={diffColors.text}
        fontSize="8"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        letterSpacing="0.04em"
        textAnchor="middle"
        className="pointer-events-none select-none"
      >
        {String(node.difficulty || 'Easy').toUpperCase()}
      </text>

      {/* Row 3: Active Open Ports Preview */}
      {ports.length === 0 ? (
        <text
          x={x}
          y={cardY + 70}
          fill={tokens.textMuted}
          fontSize="7.5"
          fontFamily="monospace"
          textAnchor="middle"
          opacity="0.6"
          className="pointer-events-none select-none"
        >
          NO OPEN PORTS
        </text>
      ) : (
        <g transform={`translate(${cardX + 8}, ${cardY + 59})`}>
          {(() => {
            // Render up to 4 port badges, or 3 + overflow badge
            const maxBadges = 4;
            const needsOverflow = ports.length > maxBadges;
            const displayPorts = needsOverflow ? ports.slice(0, 3) : ports.slice(0, 4);
            const badgeW = 36;
            const badgeH = 16;
            const gap = 5;

            return (
              <>
                {displayPorts.map((p, idx) => {
                  const pColors = getPortColor(p, isDark);
                  return (
                    <g key={p} transform={`translate(${idx * (badgeW + gap)}, 0)`}>
                      <rect
                        width={badgeW}
                        height={badgeH}
                        rx="3"
                        fill={pColors.bg}
                        stroke={pColors.stroke}
                        strokeWidth="0.7"
                      />
                      <text
                        x={badgeW / 2}
                        y="11"
                        fill={pColors.text}
                        fontSize="7.5"
                        fontFamily="'JetBrains Mono', monospace"
                        fontWeight="600"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                      >
                        :{p}
                      </text>
                    </g>
                  );
                })}
                {needsOverflow && (
                  <g transform={`translate(${3 * (badgeW + gap)}, 0)`}>
                    <rect
                      width={badgeW}
                      height={badgeH}
                      rx="3"
                      fill={tokens.codeBg}
                      stroke={tokens.codeBorder}
                      strokeWidth="0.7"
                    />
                    <text
                      x={badgeW / 2}
                      y="11"
                      fill={tokens.textMuted}
                      fontSize="7.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                    >
                      +{ports.length - 3}
                    </text>
                  </g>
                )}
              </>
            );
          })()}
        </g>
      )}

      {/* Cardinal Docking Anchors (Top, Right, Bottom, Left) - Ready for Milestone 3 Edges */}
      <circle cx={x} cy={cardY} r="2.5" fill={tokens.cardBorder} opacity="0.6" className="pointer-events-none" />
      <circle cx={cardX + 180} cy={y} r="2.5" fill={tokens.cardBorder} opacity="0.6" className="pointer-events-none" />
      <circle cx={x} cy={cardY + 84} r="2.5" fill={tokens.cardBorder} opacity="0.6" className="pointer-events-none" />
      <circle cx={cardX} cy={y} r="2.5" fill={tokens.cardBorder} opacity="0.6" className="pointer-events-none" />

      {/* Native Browser Tooltip */}
      <title>{`${node.name} (${node.ip}) · ${node.os} · ${node.difficulty} · ${node.status}`}</title>
      </>
      )}
    </g>
  );
});

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

// ---------------------------------------------------------------------------
// Primary Attack Graph Component (<GraphView>)
// ---------------------------------------------------------------------------
export const GraphView: React.FC<GraphViewProps> = ({ filteredMachines = [] }) => {
  const setActiveTarget = useCtfStore((s) => s.setActiveTarget);
  const setSelectedMachineId = useCtfStore((s) => s.setSelectedMachineId);
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  
  // Zustand Store Slice for M1/M2 coordinate persistence & M3 edges
  const allMachines = useCtfStore((s) => s.machines);
  const storedNodePositions = useCtfStore((s) => s.graphNodePositions);
  const themePreset = useCtfStore((s) => s.themePreset || 'obsidian');
  const graphEdges = useCtfStore((s) => s.graphEdges);
  // Undo/redo: recorded replacements for the store's edge + node-position mutators
  const {
    addGraphEdge, updateGraphEdge, deleteGraphEdge, setGraphNodePosition, applyNodePositions,
    undo, redo, canUndo, canRedo, undoLabel, redoLabel,
  } = useGraphHistory();

  // M3 Vector Inspector & Pivot Connection Mode State
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isConnectingMode, setIsConnectingMode] = useState<boolean>(false);
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);

  // Theme synchronization (independent of window.matchMedia for 100% test & SSR stability)
  const isDark = typeof document !== 'undefined' 
    ? !document.documentElement.classList.contains('light')
    : true;
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
  const [isMinimapOpen, setIsMinimapOpen] = useState(true);
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
  const panRafRef = useRef<number | null>(null);
  const wheelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCullAtRef = useRef(0);
  // True while the graph is large: gestures then refresh the throttled live view (LOD tier + culling)
  const liveViewEnabledRef = useRef(false);
  // View + SVG size the last render's LOD tier / culling were computed from
  const appliedViewRef = useRef({ x: 0, y: 0, scale: 1 });
  const viewSizeRef = useRef<{ w: number; h: number } | null>(null);
  const minScaleRef = useRef(MIN_SCALE_SCOPED);
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

  // Touch tracking refs
  const touchStartDistRef = useRef<number>(0);
  const touchStartScaleRef = useRef<number>(1);

  // Minimap dragging ref
  const isMinimapDraggingRef = useRef(false);

  // Canvas Center World Coordinates
  const centerX = 800;
  const centerY = 600;

  // ---------------------------------------------------------------------------
  // 1. Stable Default Layout Engine (Computed against universe of machines)
  // ---------------------------------------------------------------------------
  // We compute the default topology layout against allMachines (or filteredMachines as fallback)
  // so active filters DO NOT scramble coordinates when typing search or toggling tags!
  const universeMachines = useMemo(() => {
    return allMachines.length > 0 ? allMachines : filteredMachines;
  }, [allMachines, filteredMachines]);

  const { clusters, defaultNodePositions, allNodes, layoutBounds } = useMemo(() => {
    const sample = showAllNodes ? universeMachines : universeMachines.slice(0, 48);
    if (sample.length === 0) return { clusters: [], defaultNodePositions: {}, allNodes: [], layoutBounds: SCOPED_BOUNDS };

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
        allNodes: showAllNodesList,
        layoutBounds: layout.bounds,
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

    let activeTemplates = clusterTemplates.filter(ct => (bucketMap[ct.id] || []).length > 0);
    const activeCount = Math.max(1, activeTemplates.length);

    const activeClusters: ClusterDef[] = activeTemplates.map((ct, idx) => {
      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / activeCount;
      return {
        id: ct.id,
        name: ct.name,
        angle,
        radius: 360,
        color: ct.color,
      };
    });

    const initialNodes: GraphNode[] = [];
    const positions: Record<string, AttackNodePosition> = {};

    activeClusters.forEach(cluster => {
      const machinesInCluster = bucketMap[cluster.id] || [];
      const clusterBaseX = centerX + Math.cos(cluster.angle) * cluster.radius;
      const clusterBaseY = centerY + Math.sin(cluster.angle) * cluster.radius;
      const count = machinesInCluster.length;
      if (count === 0) return;

      let nTier1 = Math.min(count, 3);
      if (count === 4) nTier1 = 2;
      else if (count === 5) nTier1 = 2;
      const nTier2 = count - nTier1;

      let tier1Offsets = [0];
      if (nTier1 === 2) tier1Offsets = [-0.32, 0.32];
      else if (nTier1 === 3) tier1Offsets = [-0.42, 0, 0.42];

      let tier2Offsets: number[] = [];
      if (nTier2 === 1) tier2Offsets = [0.46];
      else if (nTier2 === 2) tier2Offsets = [-0.48, 0.48];
      else if (nTier2 === 3) tier2Offsets = [-0.52, 0, 0.52];
      else if (nTier2 >= 4) tier2Offsets = [-0.56, -0.20, 0.20, 0.56];

      // Tier 1 nodes (dist 130)
      machinesInCluster.slice(0, nTier1).forEach((m, idx) => {
        const offset = tier1Offsets[idx] ?? 0;
        const fanAngle = cluster.angle + offset;
        const dist = 130;
        const x = Math.round(clusterBaseX + Math.cos(fanAngle) * dist);
        const y = Math.round(clusterBaseY + Math.sin(fanAngle) * dist);

        const nodeObj: GraphNode = {
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
        };
        initialNodes.push(nodeObj);
        positions[m.id] = { x, y };
      });

      // Tier 2 nodes (dist 230)
      machinesInCluster.slice(nTier1).forEach((m, idx) => {
        const offset = tier2Offsets[idx] ?? 0;
        const fanAngle = cluster.angle + offset;
        const dist = 230;
        const x = Math.round(clusterBaseX + Math.cos(fanAngle) * dist);
        const y = Math.round(clusterBaseY + Math.sin(fanAngle) * dist);

        const nodeObj: GraphNode = {
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
        };
        initialNodes.push(nodeObj);
        positions[m.id] = { x, y };
      });
    });

    // Handle any extra machines beyond 48 sample in deterministic non-overlapping grid slots
    const unplaced = universeMachines.filter(m => !positions[m.id]);
    unplaced.forEach((m, idx) => {
      const col = idx % 6;
      const row = Math.floor(idx / 6);
      const x = 120 + col * 240;
      const y = 140 + row * 110;
      const nodeObj: GraphNode = {
        id: m.id,
        name: m.name,
        ip: m.ip,
        os: m.os,
        platform: m.platform,
        difficulty: m.difficulty,
        status: m.status,
        cluster: activeClusters[0]?.id || 'default',
        x,
        y,
        machine: m,
      };
      initialNodes.push(nodeObj);
      positions[m.id] = { x, y };
    });

    return { clusters: activeClusters, defaultNodePositions: positions, allNodes: initialNodes, layoutBounds: SCOPED_BOUNDS };
  }, [universeMachines, showAllNodes]);

  // Set of machine IDs currently matching active search/tag filters
  const visibleMachineIds = useMemo(() => {
    return new Set((filteredMachines || []).map((m) => m.id));
  }, [filteredMachines]);

  // Filtered active nodes to render on the canvas
  const visibleNodes = useMemo(() => {
    return allNodes.filter((n) => visibleMachineIds.has(n.id));
  }, [allNodes, visibleMachineIds]);

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
  layoutBoundsRef.current = layoutBounds;

  // World bounds: layout bounds extended by persisted (user-moved) positions. Scoped stays 1600x1200.
  const worldBounds = useMemo<WorldBounds>(() => {
    if (!showAllNodes) return SCOPED_BOUNDS;
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
  }, [showAllNodes, layoutBounds, allNodes, graphNodePositions]);

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
        } catch {}
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
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement | SVGElement;
    if (
      target.closest('[data-node-interactive]') || 
      target.closest('[data-edge-interactive]') || 
      target.closest('button') || 
      target.closest('input') ||
      target.closest('select')
    ) {
      return;
    }
    if (e.button !== 0) return;

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
      } catch {}
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    // Canvas pan motion
    if (canvasPanRef.current.isPanning) {
      const screenDx = e.clientX - canvasPanRef.current.startClientX;
      const screenDy = e.clientY - canvasPanRef.current.startClientY;

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
    }

    // Node drag motion fallback if captured on canvas
    if (nodeDragRef.current.isDown && nodeDragRef.current.nodeId) {
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
  const handleCanvasPointerCancel = () => {
    if (canvasPanRef.current.isPanning) {
      canvasPanRef.current.isPanning = false;
      setIsCanvasDragging(false);
      if (viewDirtyRef.current) commitLiveView();
      setLiveCullView(null);
    }
    if (nodeDragRef.current.isDown) {
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
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    if (canvasPanRef.current.isPanning) {
      canvasPanRef.current.isPanning = false;
      setIsCanvasDragging(false);
      if (viewDirtyRef.current) commitLiveView();
      if (typeof containerRef.current?.releasePointerCapture === 'function') {
        try {
          containerRef.current.releasePointerCapture(e.pointerId);
        } catch {}
      }
    }

    // Node drag release fallback
    if (nodeDragRef.current.isDown && nodeDragRef.current.nodeId) {
      const nodeId = nodeDragRef.current.nodeId;
      if (nodeDragRef.current.isDragging) {
        commitNodePosition(nodeId, nodeDragRef.current.currentPos);
      }
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

  const handleNodeSelectStable = useCallback((node: GraphNode) => selectRef.current(node), []);

  const handleNodePointerDown = useCallback((e: React.PointerEvent<SVGGElement>, node: GraphNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    if (typeof e.currentTarget.setPointerCapture === 'function') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
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
  }, []);

  const handleNodePointerMove = useCallback((e: React.PointerEvent<SVGGElement>, node: GraphNode) => {
    if (!nodeDragRef.current.isDown || nodeDragRef.current.nodeId !== node.id) return;

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
        id: node.id,
        x: newX,
        y: newY,
      });
    }
  }, [getCanvasDelta, clampNodePos]);

  const handleNodePointerUp = useCallback((e: React.PointerEvent<SVGGElement>, node: GraphNode) => {
    if (!nodeDragRef.current.isDown || nodeDragRef.current.nodeId !== node.id) return;
    e.stopPropagation();

    if (typeof e.currentTarget.releasePointerCapture === 'function') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }

    if (nodeDragRef.current.isDragging) {
      commitNodePosition(node.id, nodeDragRef.current.currentPos);
    } else if (!nodeDragRef.current.isDragging) {
      // Clean click without movement threshold: select node or connect vector
      selectRef.current(node);
    }

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
  }, [commitNodePosition]);

  // ---------------------------------------------------------------------------
  // 5. Wheel Zoom-To-Cursor Handler
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const view = viewRef.current;
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      const newScale = Math.min(Math.max(view.scale * zoomFactor, minScaleRef.current), 3.0);
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
          } catch {}
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
  }, [applyViewToDom, commitLiveView, refreshLiveCull]);

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
      const newScale = Math.min(Math.max(touchStartScaleRef.current * factor, minScaleRef.current), 3.0);
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
    const base = getBaseView();
    const newScale = Math.min(base.scale * 1.2, 3.0);
    const cursorX = 800;
    const cursorY = 600;
    const newPanX = cursorX - (cursorX - base.x) * (newScale / base.scale);
    const newPanY = cursorY - (cursorY - base.y) * (newScale / base.scale);
    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleZoomOut = () => {
    const base = getBaseView();
    const newScale = Math.max(base.scale / 1.2, minScale);
    const cursorX = 800;
    const cursorY = 600;
    const newPanX = cursorX - (cursorX - base.x) * (newScale / base.scale);
    const newPanY = cursorY - (cursorY - base.y) * (newScale / base.scale);
    setScale(newScale);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleResetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  const handleFitToScreen = () => {
    if (visibleNodes.length === 0) {
      handleResetView();
      return;
    }

    let minX = 800 - 60;
    let maxX = 800 + 60;
    let minY = 600 - 60;
    let maxY = 600 + 60;

    visibleNodes.forEach((n) => {
      const x = transientNodePos?.id === n.id 
        ? transientNodePos.x 
        : (graphNodePositions[n.id]?.x ?? defaultNodePositions[n.id]?.x ?? n.x);
      const y = transientNodePos?.id === n.id 
        ? transientNodePos.y 
        : (graphNodePositions[n.id]?.y ?? defaultNodePositions[n.id]?.y ?? n.y);
      minX = Math.min(minX, x - 95);
      maxX = Math.max(maxX, x + 95);
      minY = Math.min(minY, y - 47);
      maxY = Math.max(maxY, y + 47);
    });
    // SHOW ALL: hubs (with their label pills) are part of the world being framed
    if (showAllNodes) {
      clusters.forEach((c) => {
        const hub = getClusterHub(c);
        minX = Math.min(minX, hub.x - 95);
        maxX = Math.max(maxX, hub.x + 95);
        minY = Math.min(minY, hub.y - 55);
        maxY = Math.max(maxY, hub.y + 55);
      });
    }

    const padding = 80;
    const bboxW = (maxX - minX) + padding * 2;
    const bboxH = (maxY - minY) + padding * 2;
    const targetScale = Math.min(Math.max(Math.min(1600 / bboxW, 1200 / bboxH), minScale), 1.8);
    const bboxCenterX = (minX + maxX) / 2;
    const bboxCenterY = (minY + maxY) / 2;

    setScale(targetScale);
    setPan({
      x: 800 - bboxCenterX * targetScale,
      y: 600 - bboxCenterY * targetScale,
    });
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
    return selectedEdge ? allMachines.find((m) => m.id === selectedEdge.sourceId) : undefined;
  }, [selectedEdge, allMachines]);

  const edgeTargetMachine = useMemo(() => {
    return selectedEdge ? allMachines.find((m) => m.id === selectedEdge.targetId) : undefined;
  }, [selectedEdge, allMachines]);


  // M4: 1-Click Topology Exporters
  const handleExportObsidian = useCallback(() => {
    const nodesForExport: ExportGraphNode[] = allNodes.map((n) => {
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
  }, [allNodes, graphNodePositions, defaultNodePositions, graphEdges, soundEnabled]);

  const handleExportSvg = useCallback(() => {
    exportToSvg('zerobox-attack-graph-svg');
    if (soundEnabled) playCyberSound('click');
  }, [soundEnabled]);

  // Auto layout: layered left-to-right by edge direction, applied as one undoable entry
  const handleAutoLayout = useCallback(() => {
    // The auto-layout box (1510x1150) cannot hold the SHOW ALL world; it is a scoped-view tool
    if (showAllNodes) return;
    const positions = computeAutoLayout(allNodes.map((n) => n.id), graphEdges, { maxX: 1510, maxY: 1150 });
    applyNodePositions(positions, 'Auto layout');
    if (soundEnabled) playCyberSound('click');
  }, [allNodes, graphEdges, applyNodePositions, soundEnabled, showAllNodes]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setSelectedEdgeId(null);
        setIsConnectingMode(false);
        setConnectingSourceId(null);
      }
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

  return (
    <div 
      ref={containerRef}
      className={`relative w-full rounded-2xl border border-subtle bg-surface-card overflow-hidden font-sans shadow-2xl select-none touch-none transition-[box-shadow,background-color,border-color,color] duration-300 machined-edge ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[720px]'
      }`}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      onPointerCancel={handleCanvasPointerCancel}
      onLostPointerCapture={handleCanvasPointerCancel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Top HUD Legend & Telemetry Capsule */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="px-3 py-1.5 rounded-xl bg-surface-elevated/95 border border-subtle backdrop-blur-sm shadow-xs flex items-center gap-2 machined-edge">
          <Share2 className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-semibold text-primary font-sans">
            BLOODHOUND // CANVAS
          </span>
          <span 
            className="text-xs text-accent font-semibold font-mono tabular-nums px-2 py-0.5 rounded-md bg-surface-sunken border border-subtle"
            title={showAllNodes ? 'Showing all catalog machines in attack topology' : 'Showing initial scoped sample targets (48 nodes)'}
          >
            {visibleNodes.length} / {universeMachines.length} NODES
          </span>
          {universeMachines.length > 48 && (
            <button
              type="button"
              onClick={() => {
                if (!showAllNodes) scopedViewRef.current = { ...getBaseView() };
                setShowAllNodes(!showAllNodes);
                if (soundEnabled) playCyberSound('toggle');
              }}
              className={`text-xs font-semibold font-mono px-2 py-0.5 rounded-md border transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer ${
                showAllNodes
                  ? 'bg-accent text-on-accent border-accent shadow-xs'
                  : 'bg-surface-sunken text-accent border-subtle hover:border-accent/40'
              }`}
              title={showAllNodes ? 'Switch to scoped 48 targets' : 'Render all targets in topology graph'}
              aria-label={showAllNodes ? 'Switch to scoped 48 targets' : 'Show all targets in topology graph'}
            >
              {showAllNodes ? 'SHOW SCOPED (48)' : 'SHOW ALL'}
            </button>
          )}
          <span className="text-xs text-callout-tip-fg font-semibold font-mono tabular-nums px-2 py-0.5 rounded-md bg-surface-sunken border border-subtle">
            {clusters.length} SUBNETS
          </span>
          <span className="text-xs text-callout-success-fg font-semibold font-mono tabular-nums px-2 py-0.5 rounded-md bg-surface-sunken border border-subtle">
            {graphEdges.length} VECTORS
          </span>
        </div>

        {/* Legend */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-surface-elevated/95 border border-subtle backdrop-blur-sm shadow-xs text-xs font-sans machined-edge">
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
            <span className="text-secondary">Scoped</span>
          </span>
        </div>
      </div>

      {/* Floating Canvas Navigation Toolbar */}
      <div 
        data-testid="canvas-nav-toolbar"
        className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-surface-elevated/95 backdrop-blur-sm border border-subtle p-1.5 rounded-xl shadow-md pointer-events-auto machined-edge"
      >
        <span className="text-xs font-semibold text-muted px-2 select-none font-mono tabular-nums">
          {Math.round(scale * 100)}%
        </span>

        {/* Interactive Pivot Vector Connection Mode Button */}
        <button
          data-testid="graph-connect-vector"
          onClick={() => {
            setIsConnectingMode(!isConnectingMode);
            setConnectingSourceId(null);
            if (soundEnabled) playCyberSound('toggle');
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold font-mono transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center gap-1.5 cursor-pointer ${
            isConnectingMode
              ? 'bg-accent text-on-accent font-semibold shadow-xs'
              : 'hover:bg-surface-hover text-accent border border-transparent hover:border-subtle'
          }`}
          title={isConnectingMode ? 'Cancel Pivot Link Connection' : 'Add Pivot / Attack Vector Edge (Alt+C)'}
        >
          <Network className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">
            {isConnectingMode ? 'LINKING...' : 'PIVOT LINK'}
          </span>
        </button>

        {/* Export Obsidian Canvas */}
        <button
          data-testid="graph-export-canvas"
          onClick={handleExportObsidian}
          className="p-1.5 rounded-md hover:bg-surface-hover text-callout-tip-fg hover:text-callout-tip-fg transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center gap-1 cursor-pointer"
          title="Export as Native Obsidian Canvas (.canvas)"
        >
          <Download className="w-4 h-4" />
          <span className="text-xs font-semibold hidden xl:inline">.CANVAS</span>
        </button>

        {/* Export SVG */}
        <button
          data-testid="graph-export-svg"
          onClick={handleExportSvg}
          className="p-1.5 rounded-md hover:bg-surface-hover text-accent hover:text-callout-info-fg transition-[transform,background-color,border-color,color] active:scale-[0.97] flex items-center gap-1 cursor-pointer"
          title="Export High-Resolution Vector Image (.svg)"
        >
          <Share2 className="w-4 h-4" />
          <span className="text-xs font-semibold hidden xl:inline">SVG</span>
        </button>

        <div className="w-px h-4 bg-border-subtle mx-0.5" />

        <button
          type="button"
          data-testid="graph-undo"
          onClick={() => { undo(); }}
          disabled={!canUndo}
          aria-label="Undo"
          className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted disabled:active:scale-100"
          title={undoLabel ? `Undo ${undoLabel} (Ctrl/Cmd+Z)` : 'Undo (Ctrl/Cmd+Z)'}
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="graph-redo"
          onClick={() => { redo(); }}
          disabled={!canRedo}
          aria-label="Redo"
          className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted disabled:active:scale-100"
          title={redoLabel ? `Redo ${redoLabel} (Ctrl/Cmd+Shift+Z)` : 'Redo (Ctrl/Cmd+Shift+Z)'}
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="graph-auto-layout"
          onClick={handleAutoLayout}
          disabled={allNodes.length === 0 || showAllNodes}
          aria-disabled={allNodes.length === 0 || showAllNodes ? true : undefined}
          aria-label="Auto layout"
          className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted disabled:active:scale-100"
          title={showAllNodes ? 'Auto layout is available in scoped view' : 'Auto layout: arrange nodes by attack path (undoable)'}
        >
          <Workflow className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-border-subtle mx-0.5" />

        <button
          type="button"
          data-testid="graph-zoom-in"
          onClick={handleZoomIn}
          aria-label="Zoom In"
          className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="graph-zoom-out"
          onClick={handleZoomOut}
          aria-label="Zoom Out"
          className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="graph-reset-view"
          onClick={handleResetView}
          aria-label="Reset View"
          className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
          title="Reset View (1:1)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="graph-fit-screen"
          onClick={handleFitToScreen}
          aria-label="Fit to Screen"
          className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
          title="Fit to Screen (Framing)"
        >
          <Focus className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="graph-center-selection"
          onClick={handleCenterSelection}
          aria-label="Center Selection"
          className="p-1.5 rounded-md hover:bg-surface-hover text-muted hover:text-primary transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer"
          title="Center Selection / Rig"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          type="button"
          data-testid="graph-fullscreen-toggle"
          onClick={() => setIsFullscreen(!isFullscreen)}
          aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Attack Topology'}
          className={`p-1.5 rounded-md transition-[transform,background-color,border-color,color] active:scale-[0.97] cursor-pointer ${
            isFullscreen ? 'bg-accent text-on-accent font-semibold' : 'hover:bg-surface-hover text-muted hover:text-primary'
          }`}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Attack Topology'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
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
              ? 'Click destination target machine to connect vector'
              : 'Click pivot host to select origin machine'}
          </span>
          <button
            onClick={() => {
              setIsConnectingMode(false);
              setConnectingSourceId(null);
            }}
            className="p-0.5 rounded-md hover:bg-surface-inverse/20 ml-1 font-semibold active:scale-[0.98] transition-transform"
            title="Cancel Link Connection"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tactical Minimap HUD in Canvas Corner */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto select-none">
        {isMinimapOpen ? (
          <div 
            data-testid="graph-minimap-container"
            className="w-48 p-2 rounded-xl bg-surface-elevated/95 backdrop-blur-sm border border-subtle shadow-lg space-y-1.5 font-sans machined-edge"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-muted px-1">
              <span className="flex items-center gap-1 text-primary">
                <Radio className="w-3 h-3 text-accent" />
                TACTICAL RADAR
              </span>
              <button
                data-testid="graph-minimap-toggle"
                onClick={() => setIsMinimapOpen(false)}
                className="p-0.5 rounded hover:bg-surface-hover text-muted hover:text-primary active:scale-[0.97] cursor-pointer"
                title="Collapse Minimap"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            <div className="w-full aspect-[4/3] rounded-lg bg-surface-sunken border border-subtle overflow-hidden relative">
              <svg
                data-testid="graph-minimap-svg"
                viewBox={`${minimapBounds.x} ${minimapBounds.y} ${minimapBounds.w} ${minimapBounds.h}`}
                className="w-full h-full cursor-crosshair"
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
                  selectedNodeId={selectedNode?.id ?? null}
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
            title="Expand Tactical Radar Minimap"
          >
            <Radio className="w-3.5 h-3.5 text-callout-info-fg" />
            <span className="hidden sm:inline">MINIMAP</span>
          </button>
        )}
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
          <rect width="1600" height="1200" fill={tokens.canvasBg} className="pointer-events-none" />
          <rect width="1600" height="1200" fill="url(#graph-grid)" className="pointer-events-none" />

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
              const { x: clusterX, y: clusterY } = getClusterHub(cluster);
              const isSubnetHovered = hoveredClusterId === cluster.id;

              return (
                <g key={cluster.id} className="transition-opacity">
                  {/* Attack Path line from Operator Rig to Subnet Hub */}
                  <line
                    x1={centerX}
                    y1={centerY}
                    x2={clusterX}
                    y2={clusterY}
                    stroke={cluster.color}
                    strokeWidth={isSubnetHovered ? '2.5' : '1.5'}
                    strokeDasharray="5 5"
                    opacity={isSubnetHovered ? '0.9' : '0.45'}
                  />

                  {/* Subnet Hub Outer Glow */}
                  <circle cx={clusterX} cy={clusterY} r="42" fill="url(#clusterGlow)" opacity="0.6" className="pointer-events-none" />

                  {/* Subnet Hub Node */}
                  <circle
                    cx={clusterX}
                    cy={clusterY}
                    r="24"
                    fill={tokens.cardBg}
                    stroke={cluster.color}
                    strokeWidth="2.2"
                    style={{ filter: tokens.accentGlow && tokens.accentGlow !== 'none' ? `drop-shadow(0 0 10px ${tokens.accentGlow})` : undefined }}
                  />
                  <circle cx={clusterX} cy={clusterY} r="9" fill={cluster.color} opacity="0.8" className="pointer-events-none" />

                  {/* Subnet Label Pill */}
                  <rect
                    x={clusterX - 90}
                    y={clusterY + 28}
                    width="180"
                    height="22"
                    rx="4"
                    fill={tokens.cardBg}
                    fillOpacity="0.94"
                    stroke={cluster.color}
                    strokeWidth="1.2"
                    className="pointer-events-none"
                  />
                  <text
                    x={clusterX}
                    y={clusterY + 43}
                    fill={cluster.color}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                    className="pointer-events-none select-none"
                  >
                    {cluster.name}
                  </text>
                </g>
              );
            })}

            {/* Tactical Edges from Subnet Hubs to Target Nodes */}
            {visibleNodes.map((node) => {
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

              // Compute shortest cardinal docking anchors
              const srcAnchors = [
                { x: srcX, y: srcY - 42 },
                { x: srcX, y: srcY + 42 },
                { x: srcX - 90, y: srcY },
                { x: srcX + 90, y: srcY },
              ];
              const tgtAnchors = [
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
                      x={midX - 38}
                      y={midY - 10}
                      width="76"
                      height="20"
                      rx="4"
                      fill={tokens.cardBg}
                      stroke={meta.color}
                      strokeWidth={isSelectedEdge ? '1.8' : '1'}
                      fillOpacity="0.95"
                    />
                    <text
                      x={midX}
                      y={midY + 3.5}
                      fill={meta.color}
                      fontSize="8.5"
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
            {visibleNodes.map((node) => {
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

            {/* Central Operator Node (Kali Attack Rig) */}
            <g className="pointer-events-none select-none">
              <circle cx={centerX} cy={centerY} r="70" fill="url(#centerGlow)" />
              <circle
                cx={centerX}
                cy={centerY}
                r="34"
                fill={tokens.cardBg}
                stroke="#10B981"
                strokeWidth="2.8"
                style={{ filter: 'drop-shadow(0 0 16px #10B981)' }}
              />
              <circle cx={centerX} cy={centerY} r="12" fill="#10B981" />
              <rect
                x={centerX - 85}
                y={centerY + 36}
                width="170"
                height="30"
                rx="6"
                fill={tokens.cardBg}
                fillOpacity="0.95"
                stroke="#10B981"
                strokeWidth="1.2"
              />
              <text
                x={centerX}
                y={centerY + 49}
                fill="#10B981"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                OPERATOR // KALI
              </text>
              <text
                x={centerX}
                y={centerY + 60}
                fill={tokens.accent}
                fontSize="8.5"
                fontFamily="monospace"
                textAnchor="middle"
              >
                10.10.14.x [ATTACK RIG]
              </text>
            </g>
          </g>
        </svg>
      </div>

      {/* Selected Node Tactical Detail Flyout Card */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.16 }}
            className="absolute bottom-4 right-4 z-30 w-80 p-3.5 rounded-xl bg-surface-elevated/95 backdrop-blur-sm border border-subtle hover:border-accent shadow-xl space-y-2.5 pointer-events-auto font-sans machined-edge"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <PlatformIcon platform={selectedNode.platform} className="w-4 h-4" />
                  <span className="text-sm font-semibold text-primary">{selectedNode.name}</span>
                  <CategoryBadge machine={selectedNode.machine} size="xs" />
                </div>
                <div>
                  <EditableIpBadge machineId={selectedNode.id} initialIp={selectedNode.ip} size="xs" showLabel />
                </div>
              </div>

              <button
                data-testid="flyout-close-btn"
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-md text-muted hover:text-primary flex-shrink-0 active:scale-[0.97] transition-transform cursor-pointer"
                title="Dismiss Details"
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
                  {selectedNode.status}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-subtle">
              <button
                onClick={() => {
                  setActiveTarget(selectedNode.id);
                  if (soundEnabled) playCyberSound('engage');
                }}
                className="flex-1 py-1.5 px-3 rounded-lg bg-callout-success-bg border border-callout-success-border text-callout-success-fg hover:bg-callout-success-fg hover:text-surface-base font-semibold text-xs transition-[transform,box-shadow,background-color,border-color,color] active:scale-[0.97] flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Engage Target</span>
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
                title="Create pivot / attack vector originating from this machine"
              >
                <Network className="w-3.5 h-3.5" />
                <span>Pivot</span>
              </button>

              <button
                onClick={() => {
                  setSelectedMachineId(selectedNode.id);
                  if (soundEnabled) playCyberSound('click');
                }}
                className="py-1.5 px-2.5 rounded-lg bg-surface-sunken border border-subtle hover:border-accent text-muted hover:text-primary text-xs transition-colors active:scale-[0.97] cursor-pointer"
                title="Open Inspection Modal"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
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
};

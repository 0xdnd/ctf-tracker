import React from 'react';
import type { CanvasThemeTokens, ClusterDef, GraphNode } from './types';
import { centerX, centerY } from './constants';
import { PORTRAIT_LABEL_W, PORTRAIT_ROW_STEP } from './hubLayout';

function statusDotColor(status: string, tokens: CanvasThemeTokens): string {
  if (status === 'root' || status === 'completed') return tokens.statusRoot;
  if (status === 'foothold') return tokens.statusFoothold;
  return tokens.statusUnsolved;
}

interface HubClusterProps {
  cluster: ClusterDef;
  x: number;
  y: number;
  tokens: CanvasThemeTokens;
  isHovered: boolean;
  /** True when hubs can collapse (scoped view, more machines than the collapse threshold). */
  collapsible: boolean;
  expanded: boolean;
  /** World-unit text multiplier (hubTextScale) so the labels stay readable at the overview zoom. */
  textScale?: number;
  /** Phone portrait layout: the hub draws as a row (name without its address prefix, dots, badge). */
  portrait?: boolean;
  /** Portrait only: another hub is open, so this row is not drawn. */
  hidden?: boolean;
  /** Every machine this hub owns (drives the count and the status dots). */
  nodes: GraphNode[];
  /** Ids matching the active search/filter; null when nothing is filtered. */
  matchedIds: Set<string> | null;
  onToggle: (clusterId: string) => void;
}

const LABEL_CHAR_W = 8.6;
const DOT_RING_RADIUS = 48;
const DOT_RADIUS = 6;
const MONO = "ui-monospace, 'JetBrains Mono', monospace";
/** The count inside the r=28 circle grows with the zoom-compensating text scale only up to here, so "120" still fits. */
const MAX_COUNT_SCALE = 1.4;

/**
 * Accessible name of a collapsible hub. It repeats the visible text in reading order (count, name, badge) so
 * it always contains it; the SVG text nodes are aria-hidden and this name carries the meaning.
 */
export function hubAccessibleName({ total, label, badge, expanded }: { total: number; label: string; badge: string; expanded: boolean }): string {
  return `${total} ${label} ${badge}${expanded ? '' : '. Expand'}`;
}

function trimLabel(name: string, max: number): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export const HubCluster: React.FC<HubClusterProps> = React.memo(
  ({ cluster, x, y, tokens, isHovered, collapsible, expanded, textScale = 1, portrait = false, hidden = false, nodes, matchedIds, onToggle }) => {
    const glow = tokens.accentGlow && tokens.accentGlow !== 'none' ? `drop-shadow(0 0 10px ${tokens.accentGlow})` : undefined;
    const link = (
      <line
        x1={centerX}
        y1={centerY}
        x2={x}
        y2={y}
        stroke={cluster.color}
        strokeWidth={isHovered ? '2.5' : '1.5'}
        strokeDasharray="5 5"
        opacity={isHovered ? '0.9' : '0.45'}
      />
    );

    if (!collapsible) {
      return (
        <g className="transition-opacity">
          {link}
          <circle cx={x} cy={y} r="42" fill="url(#clusterGlow)" opacity="0.6" className="pointer-events-none" />
          <circle cx={x} cy={y} r="24" fill={tokens.cardBg} stroke={cluster.color} strokeWidth="2.2" style={{ filter: glow }} />
          <circle cx={x} cy={y} r="9" fill={cluster.color} opacity="0.8" className="pointer-events-none" />
          <rect
            x={x - 90}
            y={y + 28}
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
            x={x}
            y={y + 43}
            fill={cluster.color}
            fontSize="11"
            fontFamily="monospace"
            fontWeight="bold"
            textAnchor="middle"
            className="pointer-events-none select-none"
          >
            {cluster.name}
          </text>
        </g>
      );
    }

    const total = nodes.length;
    const matched = matchedIds ? nodes.filter((n) => matchedIds.has(n.id)).length : total;
    const filtered = matchedIds !== null;
    const dimmed = filtered && matched === 0;
    const k = textScale;
    // "10.10.x.x [THM Web Surface & DB]" becomes "THM Web Surface & DB" so the larger text still fits (full name in the tooltip)
    const shortName = cluster.name.replace(/^[^[]*\[/, '').replace(/\]$/, '');
    const label = trimLabel(shortName, portrait ? 24 : 26);
    const labelFont = 14 * k;
    const labelH = 24 * k;
    const labelW = Math.max(180, Math.ceil(label.length * LABEL_CHAR_W * k) + 24 * k);
    const badgeFont = 14 * k;
    const badgeH = 22 * k;
    const labelY = y + 58;
    const badgeY = labelY + labelH + 6;
    const badge = expanded
      ? 'Collapse'
      : filtered
      ? `${matched} of ${total} match`
      : `${total} ${total === 1 ? 'machine' : 'machines'}`;
    const badgeW = Math.ceil(badge.length * 8.4 * k) + 28 * k;
    const aria = hubAccessibleName({ total, label, badge, expanded });

    const handleToggle = () => onToggle(cluster.id);

    if (portrait) {
      // Phone portrait: one row per hub (circle + count, then name, dots and badge to its right)
      if (hidden) return null;
      const textX = x + 42;
      const rowBadgeW = Math.ceil(badge.length * 8.4) + 24;
      return (
        <g data-hub-id={cluster.id} className="transition-opacity" opacity={dimmed ? 0.4 : 1}>
          {/* Spine: from the rig (or the circle above) down to this circle; an open hub shows alone, without it */}
          {!expanded && (
            <line x1={x} y1={Math.max(centerY, y - PORTRAIT_ROW_STEP + 26)} x2={x} y2={y - 26} stroke={cluster.color} strokeWidth="1.5" strokeDasharray="5 5" opacity="0.45" />
          )}
          <g
            data-hub-interactive="true"
            data-testid={`graph-hub-${cluster.id}`}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            aria-label={aria}
            className="group cursor-pointer outline-none"
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                handleToggle();
              }
            }}
          >
            <rect
              x={x - 34}
              y={y - 36}
              width={PORTRAIT_LABEL_W + 78}
              height="84"
              rx="12"
              fill="transparent"
              stroke={tokens.accent}
              strokeWidth="2"
              strokeDasharray="6 4"
              className="opacity-0 group-focus-visible:opacity-100"
            />
            <circle cx={x} cy={y} r="26" fill={tokens.cardBg} stroke={cluster.color} strokeWidth={expanded ? 3 : 2.2} style={{ filter: glow }} />
            {!expanded &&
              nodes.map((n, i) => {
                const isMatch = !filtered || matchedIds!.has(n.id);
                return (
                  <circle
                    key={n.id}
                    data-hub-dot={n.id}
                    cx={textX + 6 + i * 16}
                    cy={y + 2}
                    r={isMatch && filtered ? 6.5 : 5.5}
                    fill={statusDotColor(n.status, tokens)}
                    stroke={tokens.cardBg}
                    strokeWidth="1.5"
                    opacity={isMatch ? 1 : 0.25}
                    className="pointer-events-none"
                  />
                );
              })}
            <rect
              x={textX - 2}
              y={y + 16}
              width={rowBadgeW}
              height="24"
              rx="12"
              fill={filtered && matched > 0 && !expanded ? cluster.color : tokens.codeBg}
              fillOpacity={filtered && matched > 0 && !expanded ? 0.22 : 0.95}
              stroke={cluster.color}
              strokeWidth="1"
              className="pointer-events-none"
            />
            <title>{aria}</title>
          </g>
          {/* Visible text sits outside the button (matching desktop) so label-in-name never compares against joined SVG text. */}
          <g aria-hidden="true" className="pointer-events-none select-none">
            <text
              x={x}
              y={y + 6}
              fill={cluster.color}
              fontSize="17"
              fontFamily={MONO}
              fontWeight="bold"
              textAnchor="middle"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {total}
            </text>
            <text x={textX} y={y - 16} fill={cluster.color} fontSize="14" fontFamily={MONO} fontWeight="bold">
              {label}
            </text>
            <text
              x={textX - 2 + rowBadgeW / 2}
              y={y + 33}
              fill={tokens.textPrimary}
              fontSize="14"
              fontFamily={MONO}
              fontWeight="600"
              textAnchor="middle"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {badge}
            </text>
          </g>
        </g>
      );
    }

    return (
      <g data-hub-id={cluster.id} className="transition-opacity" opacity={dimmed ? 0.4 : 1}>
        {link}
        <g
          data-hub-interactive="true"
          data-testid={`graph-hub-${cluster.id}`}
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={aria}
          className="group cursor-pointer outline-none"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleToggle();
            }
          }}
        >
          {/* Keyboard focus ring */}
          <circle
            cx={x}
            cy={y}
            r={DOT_RING_RADIUS + 16}
            fill="none"
            stroke={tokens.accent}
            strokeWidth="2"
            strokeDasharray="6 4"
            className="pointer-events-none opacity-0 group-focus-visible:opacity-100"
          />
          {/* Generous hit area so the hub is easy to hit on touch */}
          <circle cx={x} cy={y} r={DOT_RING_RADIUS + 10} fill="transparent" />
          <circle cx={x} cy={y} r="46" fill="url(#clusterGlow)" opacity="0.6" className="pointer-events-none" />
          <circle cx={x} cy={y} r="28" fill={tokens.cardBg} stroke={cluster.color} strokeWidth={expanded || isHovered ? 3 : 2.2} style={{ filter: glow }} />

          {/* One status dot per machine, evenly spaced on a ring around the hub */}
          {!expanded &&
            nodes.map((n, i) => {
              const a = -Math.PI / 2 + (i * 2 * Math.PI) / Math.max(1, total);
              const isMatch = !filtered || matchedIds!.has(n.id);
              return (
                <circle
                  key={n.id}
                  data-hub-dot={n.id}
                  cx={x + Math.cos(a) * DOT_RING_RADIUS}
                  cy={y + Math.sin(a) * DOT_RING_RADIUS}
                  r={(isMatch && filtered ? DOT_RADIUS + 1.5 : DOT_RADIUS) * Math.min(k, 1.3)}
                  fill={statusDotColor(n.status, tokens)}
                  stroke={tokens.cardBg}
                  strokeWidth="1.5"
                  opacity={isMatch ? 1 : 0.25}
                  className="pointer-events-none"
                />
              );
            })}

          {/* Subnet name */}
          <rect
            x={x - labelW / 2}
            y={labelY}
            width={labelW}
            height={labelH}
            rx="5"
            fill={tokens.cardBg}
            fillOpacity="0.95"
            stroke={cluster.color}
            strokeWidth="1.2"
            className="pointer-events-none"
          />

          {/* Count badge / collapse control */}
          <rect
            x={x - badgeW / 2}
            y={badgeY}
            width={badgeW}
            height={badgeH}
            rx={badgeH / 2}
            fill={filtered && matched > 0 && !expanded ? cluster.color : tokens.codeBg}
            fillOpacity={filtered && matched > 0 && !expanded ? 0.22 : 0.95}
            stroke={cluster.color}
            strokeWidth="1"
            className="pointer-events-none"
          />
          <title>{aria}</title>
        </g>
        {/* Visible text sits outside the button: its name comes from aria-label alone, so the
            label-in-name check never compares it against SVG text joined without spaces. */}
        <g aria-hidden="true" className="pointer-events-none select-none">
          <text
            x={x}
            y={y + 6}
            fill={cluster.color}
            fontSize={17 * Math.min(k, MAX_COUNT_SCALE)}
            fontFamily={MONO}
            fontWeight="bold"
            textAnchor="middle"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {total}
          </text>
          <text x={x} y={labelY + labelH * 0.71} fill={cluster.color} fontSize={labelFont} fontFamily={MONO} fontWeight="bold" textAnchor="middle">
            {label}
          </text>
          <text
            x={x}
            y={badgeY + badgeH * 0.7}
            fill={tokens.textPrimary}
            fontSize={badgeFont}
            fontFamily={MONO}
            fontWeight="600"
            textAnchor="middle"
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {badge}
          </text>
        </g>
      </g>
    );
  }
);
HubCluster.displayName = 'HubCluster';

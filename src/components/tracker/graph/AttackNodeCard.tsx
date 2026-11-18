import React from 'react';
import { platformFullName } from '../../common/PlatformBadge';
import { LINUX_TUX_PATH } from '../../common/OsBadge';
import { getDifficultyColors, getPortColor, extractMachinePorts, WINDOWS_PATH, MACOS_PATH, ANDROID_PATH, BSD_PATH } from './colors';
import type { AttackNodeCardProps } from './types';

// ---------------------------------------------------------------------------
// Pure SVG Machine Node Card (<AttackNodeCard>)
// ---------------------------------------------------------------------------
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

  // Header row: [platform chip][OS icon][name][status beacon] inside the 164px inner width.
  // The chip grows with the platform text ("VulnHub"), so the name budget shrinks with it (~8.6px per glyph at 14px).
  const platformChipW = node.platform ? Math.max(34, Math.round(node.platform.length * 6.8 + 8)) : 0;
  const nameOffset = node.platform ? 8 + platformChipW + 4 + 16 + 4 : 32;
  const nameMaxChars = Math.max(6, Math.floor((160 - nameOffset) / 8.6));
  const displayName = node.name.length > nameMaxChars ? `${node.name.slice(0, nameMaxChars - 1)}…` : node.name;
  const displayIp = node.ip && node.ip.length > 15 ? `${node.ip.slice(0, 14)}…` : node.ip;
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
          <rect x={cardX + 8} y={cardY + 7} width={platformChipW} height="18" rx="3" fill={tokens.codeBg} stroke={tokens.codeBorder} strokeWidth="0.8" />
          <text
            x={cardX + 8 + platformChipW / 2}
            y={cardY + 19.5}
            fill={tokens.accent}
            fontSize="11"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="700"
            textAnchor="middle"
            className="select-none"
          >
            {node.platform}
          </text>
        </g>
      )}
      <g transform={`translate(${cardX + (node.platform ? 8 + platformChipW + 4 : 10)}, ${cardY + 8})`}>
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
        x={cardX + nameOffset}
        y={cardY + 20}
        fill={isSelected ? tokens.accent : tokens.textPrimary}
        fontSize="14"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="600"
        letterSpacing="-0.01em"
        textAnchor="start"
        className="pointer-events-none select-none"
      >
        {displayName}
      </text>

      {/* Status Beacon (Hardware-grade concentric LED beacon with subtle pulse) */}
      <g transform={`translate(${cardX + 168}, ${cardY + 16})`} className="pointer-events-none">
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
        width="100"
        height="18"
        rx="4"
        fill={tokens.codeBg}
        stroke={tokens.codeBorder}
        strokeWidth="0.8"
      />
      <text
        x={cardX + 58}
        y={cardY + 48.5}
        fill={tokens.accent}
        fontSize="11"
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="600"
        style={{ fontVariantNumeric: 'tabular-nums' }}
        textAnchor="middle"
        className="pointer-events-none select-none"
      >
        {displayIp}
      </text>

      {/* Difficulty Pill */}
      <rect
        x={cardX + 112}
        y={cardY + 35}
        width="60"
        height="18"
        rx="4"
        fill={diffColors.fill}
        stroke={diffColors.stroke}
        strokeWidth="0.8"
      />
      <text
        x={cardX + 142}
        y={cardY + 48.5}
        fill={diffColors.text}
        fontSize="11"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        letterSpacing="0.02em"
        textAnchor="middle"
        className="pointer-events-none select-none"
      >
        {String(node.difficulty || 'Easy').toUpperCase()}
      </text>

      {/* Row 3: Active Open Ports Preview */}
      {ports.length === 0 ? (
        <text
          x={x}
          y={cardY + 72}
          fill={tokens.textMuted}
          fontSize="11"
          fontFamily="monospace"
          textAnchor="middle"
          opacity="0.6"
          className="pointer-events-none select-none"
        >
          No open ports
        </text>
      ) : (
        <g transform={`translate(${cardX + 8}, ${cardY + 58})`}>
          {(() => {
            // Render up to 4 port badges, or 3 + overflow badge
            const maxBadges = 4;
            const needsOverflow = ports.length > maxBadges;
            const displayPorts = needsOverflow ? ports.slice(0, 3) : ports.slice(0, 4);
            const badgeW = 38;
            const badgeH = 18;
            const gap = 4;

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
                        y="13"
                        fill={pColors.text}
                        fontSize="11"
                        fontFamily="'JetBrains Mono', monospace"
                        fontWeight="600"
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                      >
                        {p > 9999 ? p : `:${p}`}
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
                      y="13"
                      fill={tokens.textMuted}
                      fontSize="11"
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

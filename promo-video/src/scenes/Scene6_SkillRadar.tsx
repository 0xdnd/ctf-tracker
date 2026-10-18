import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Activity, Award, Target, Flame } from "lucide-react";
import { theme } from "../styles/theme";
import { TacticalHUD } from "../components/TacticalHUD";
import { CyberBadge } from "../components/CyberBadge";

export const Scene6_SkillRadar: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Radar expansion spring
  const radarSpring = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14, stiffness: 80 },
  });

  // Radar axes definitions (6 domains)
  const skills = [
    { label: "Web Exploitation", value: 0.95, color: theme.colors.emeraldBright },
    { label: "Active Directory", value: 0.88, color: theme.colors.purpleBright },
    { label: "Linux PrivEsc", value: 0.92, color: theme.colors.cyanBright },
    { label: "Windows PrivEsc", value: 0.85, color: theme.colors.amberBright },
    { label: "Network Pivoting", value: 0.90, color: theme.colors.emeraldBright },
    { label: "Binary & Reverse", value: 0.72, color: theme.colors.crimsonBright },
  ];

  const cx = 250;
  const cy = 250;
  const maxRadius = 180;

  // Calculate coordinates for a given angle index (6-axis hexagon)
  const getCoordinates = (index: number, ratio: number) => {
    const angle = (Math.PI / 3) * index - Math.PI / 2;
    const x = cx + maxRadius * ratio * Math.cos(angle);
    const y = cy + maxRadius * ratio * Math.sin(angle);
    return { x, y };
  };

  // Concentric hexagonal grid rings at 20%, 40%, 60%, 80%, 100%
  const gridRings = [0.2, 0.4, 0.6, 0.8, 1.0].map((ringRatio) => {
    return skills
      .map((_, i) => {
        const { x, y } = getCoordinates(i, ringRatio);
        return `${x},${y}`;
      })
      .join(" ");
  });

  // Current radar polygon points scaled by radarSpring
  const radarPoints = skills
    .map((s, i) => {
      const { x, y } = getCoordinates(i, s.value * radarSpring);
      return `${x},${y}`;
    })
    .join(" ");

  // Radar Rotating Sweep Beam angle
  const sweepAngle = (frame * 3.5) % 360;
  const sweepRad = (sweepAngle * Math.PI) / 180;
  const sweepX = cx + maxRadius * Math.cos(sweepRad);
  const sweepY = cy + maxRadius * Math.sin(sweepRad);

  // Scene exit fade
  const sceneOpacity = interpolate(frame, [145, 160], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bgDark,
        opacity: sceneOpacity,
        overflow: "hidden",
      }}
    >
      <TacticalHUD sceneTitle="STAGE 06 // OPERATIONAL ANALYTICS & SKILL RADAR" />

      {/* Cyber Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.04) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "80px 100px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          zIndex: 10,
        }}
      >
        {/* Header */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <CyberBadge label="METRICS & OPERATIONAL READINESS" variant="emerald" />
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 13,
                color: theme.colors.textMuted,
              }}
            >
              // MULTI-VECTOR PROFICIENCY RADAR
            </span>
          </div>
          <h2
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: 44,
              fontWeight: 800,
              color: theme.colors.textWhite,
              margin: 0,
              letterSpacing: -1,
            }}
          >
            Operational Analytics & Skill Radar
          </h2>
        </div>

        {/* Content Area: Radar on Left, Heatmap & Metrics on Right */}
        <div style={{ display: "grid", gridTemplateColumns: "520px 1fr", gap: 40, alignItems: "center" }}>
          {/* Left: 6-Axis Radar Graphic */}
          <div
            style={{
              position: "relative",
              width: 500,
              height: 500,
              backgroundColor: "rgba(11, 15, 25, 0.8)",
              borderRadius: 20,
              border: `1px solid rgba(16, 185, 129, 0.3)`,
              boxShadow: theme.shadows.glowEmerald,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <svg width={500} height={500} style={{ overflow: "visible" }}>
              {/* Concentric Grid Rings */}
              {gridRings.map((points, idx) => (
                <polygon
                  key={idx}
                  points={points}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.08)"
                  strokeWidth="1.5"
                  strokeDasharray={idx === 4 ? "none" : "3 3"}
                />
              ))}

              {/* 6 Spokes */}
              {skills.map((_, i) => {
                const { x, y } = getCoordinates(i, 1.0);
                return (
                  <line
                    key={i}
                    x1={cx}
                    y1={cy}
                    x2={x}
                    y2={y}
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="1.5"
                  />
                );
              })}

              {/* Radar Rotating Sweep Beam */}
              <line
                x1={cx}
                y1={cy}
                x2={sweepX}
                y2={sweepY}
                stroke={theme.colors.emeraldBright}
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="drop-shadow(0 0 8px #10B981)"
                opacity={0.85}
              />
              <circle
                cx={cx}
                cy={cy}
                r={maxRadius}
                fill="none"
                stroke="rgba(16, 185, 129, 0.2)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Filled Animated Radar Polygon */}
              <polygon
                points={radarPoints}
                fill="rgba(16, 185, 129, 0.25)"
                stroke={theme.colors.emeraldBright}
                strokeWidth="3"
                filter="drop-shadow(0px 0px 8px rgba(16, 185, 129, 0.8))"
              />

              {/* Vertex Nodes and Percentage Labels */}
              {skills.map((s, i) => {
                const { x, y } = getCoordinates(i, s.value * radarSpring);
                const labelCoord = getCoordinates(i, 1.22);
                return (
                  <g key={i}>
                    {/* Glowing Vertex Point */}
                    <circle
                      cx={x}
                      cy={y}
                      r="6"
                      fill={theme.colors.emeraldBright}
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />

                    {/* Outer Axis Label */}
                    <text
                      x={labelCoord.x}
                      y={labelCoord.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={s.color}
                      fontFamily={theme.fonts.mono}
                      fontSize="12"
                      fontWeight="700"
                    >
                      {s.label} ({Math.round(s.value * 100)}%)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right: Heatmap & Combat Telemetry */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Heatmap Card */}
            <div
              style={{
                backgroundColor: "rgba(19, 28, 46, 0.85)",
                borderRadius: 14,
                padding: "20px 24px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Activity size={18} color={theme.colors.emeraldBright} />
                  <span
                    style={{
                      fontFamily: theme.fonts.mono,
                      fontSize: 14,
                      fontWeight: 700,
                      color: theme.colors.textWhite,
                    }}
                  >
                    90-Day Engagement Heatmap
                  </span>
                </div>
                <CyberBadge label="100% CONSISTENT" variant="emerald" fontSize={11} />
              </div>

              {/* Heatmap Grid: 7 rows x 18 cols = 126 squares */}
              <div
                style={{
                  display: "grid",
                  gridTemplateRows: "repeat(7, 1fr)",
                  gridAutoFlow: "column",
                  gap: 6,
                }}
              >
                {Array.from({ length: 126 }).map((_, idx) => {
                  // Staggered light up
                  const isLit = frame >= 20 + (idx % 40);
                  const intensity = (idx * 17) % 4; // 0 to 3
                  const color = !isLit
                    ? "rgba(255, 255, 255, 0.05)"
                    : intensity === 3
                    ? theme.colors.emeraldBright
                    : intensity === 2
                    ? "#059669"
                    : intensity === 1
                    ? "#047857"
                    : "rgba(16, 185, 129, 0.2)";

                  return (
                    <div
                      key={idx}
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3,
                        backgroundColor: color,
                        boxShadow: isLit && intensity === 3 ? "0 0 6px rgba(16, 185, 129, 0.6)" : "none",
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* 3 Metric Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: 12,
                  backgroundColor: "rgba(17, 24, 39, 0.8)",
                  border: `1px solid rgba(245, 158, 11, 0.3)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Flame size={16} color={theme.colors.amberBright} />
                  <span style={{ fontFamily: theme.fonts.mono, fontSize: 11, color: theme.colors.textMuted }}>
                    CURRENT STREAK
                  </span>
                </div>
                <div style={{ fontFamily: theme.fonts.mono, fontSize: 28, fontWeight: 800, color: theme.colors.amberBright }}>
                  42 Days
                </div>
              </div>

              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: 12,
                  backgroundColor: "rgba(17, 24, 39, 0.8)",
                  border: `1px solid rgba(6, 182, 212, 0.3)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Target size={16} color={theme.colors.cyanBright} />
                  <span style={{ fontFamily: theme.fonts.mono, fontSize: 11, color: theme.colors.textMuted }}>
                    AVG PWN TIME
                  </span>
                </div>
                <div style={{ fontFamily: theme.fonts.mono, fontSize: 28, fontWeight: 800, color: theme.colors.cyanBright }}>
                  38 Mins
                </div>
              </div>

              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: 12,
                  backgroundColor: "rgba(17, 24, 39, 0.8)",
                  border: `1px solid rgba(16, 185, 129, 0.3)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Award size={16} color={theme.colors.emeraldBright} />
                  <span style={{ fontFamily: theme.fonts.mono, fontSize: 11, color: theme.colors.textMuted }}>
                    GLOBAL RANKING
                  </span>
                </div>
                <div style={{ fontFamily: theme.fonts.mono, fontSize: 28, fontWeight: 800, color: theme.colors.emeraldBright }}>
                  Top 1%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

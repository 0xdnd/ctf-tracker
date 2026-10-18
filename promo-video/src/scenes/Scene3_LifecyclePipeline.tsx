import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
} from "remotion";
import {
  Clock,
  CheckCircle,
  Terminal,
  Skull,
  Radio,
  FileCheck,
  Flame,
} from "lucide-react";
import { theme } from "../styles/theme";
import { TacticalHUD } from "../components/TacticalHUD";
import { CyberBadge } from "../components/CyberBadge";

export const Scene3_LifecyclePipeline: React.FC = () => {
  const frame = useCurrentFrame();

  // 5 Stages definitions
  const stages = [
    { id: 0, title: "Target Backlog", color: theme.colors.textMuted, icon: <Radio size={16} /> },
    { id: 1, title: "Active Recon", color: theme.colors.cyanBright, icon: <Radio size={16} /> },
    { id: 2, title: "Foothold", color: theme.colors.amberBright, icon: <Flame size={16} /> },
    { id: 3, title: "Root Pwned", color: theme.colors.emeraldBright, icon: <Skull size={16} /> },
    { id: 4, title: "Documented", color: theme.colors.purpleBright, icon: <FileCheck size={16} /> },
  ];

  const staticColumnTargets = [
    [
      { name: "Sau", ip: "10.10.11.224", os: "Linux", diff: "Easy", tag: "QUEUED", color: theme.colors.textMuted },
      { name: "Pilgrimage", ip: "10.10.11.219", os: "Linux", diff: "Easy", tag: "QUEUED", color: theme.colors.textMuted },
    ],
    [
      { name: "MonitorsTwo", ip: "10.10.11.211", os: "Linux", diff: "Easy", tag: "NMAP SCAN [80, 22]", color: theme.colors.cyanBright },
    ],
    [
      { name: "Keeper", ip: "10.10.11.227", os: "Linux", diff: "Easy", tag: "FOOTHOLD: www-data", color: theme.colors.amberBright },
    ],
    [
      { name: "Bashed", ip: "10.10.10.68", os: "Linux", diff: "Easy", tag: "ROOT PWNED [OK]", color: theme.colors.emeraldBright },
    ],
    [
      { name: "Blue", ip: "10.10.10.40", os: "Windows", diff: "Easy", tag: "WRITEUP SYNCED", color: theme.colors.purpleBright },
    ],
  ];

  // Calculate which stage the card is currently in:
  // 0-35: Stage 0 (Backlog)
  // 35-70: Stage 1 (Recon)
  // 70-105: Stage 2 (Foothold)
  // 105-145: Stage 3 (Root Pwned)
  // 145-180: Stage 4 (Documented)
  const activeStageIdx =
    frame < 35 ? 0 : frame < 70 ? 1 : frame < 105 ? 2 : frame < 145 ? 3 : 4;

  // Horizontal position of the card moving across columns (column width ~320px + gap 20px)
  const cardColX = interpolate(
    frame,
    [30, 45, 65, 80, 100, 115, 140, 155],
    [0, 1, 1, 2, 2, 3, 3, 4],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Root pwned flash effect around frame 110-145
  const isRootPwned = frame >= 110;
  const rootFlash = interpolate(frame, [110, 115, 130], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scene exit fade
  const sceneOpacity = interpolate(frame, [165, 180], [1, 0], {
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
      <TacticalHUD sceneTitle="STAGE 03 // 5-STAGE ATTACK PIPELINE" />

      {/* Cyber Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.05) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Root Pwn Flash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: theme.colors.emeraldBright,
          opacity: rootFlash * 0.25,
          pointerEvents: "none",
          zIndex: 5,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: "80px 80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          zIndex: 10,
        }}
      >
        {/* Header and Stopwatch HUD */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <CyberBadge label="ATTACK LIFECYCLE MANAGEMENT" variant="emerald" />
              <span
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 13,
                  color: theme.colors.textMuted,
                }}
              >
                // FULL METHODOLOGY PROGRESSION
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
              5-Stage Attack Lifecycle Pipeline
            </h2>
          </div>

          {/* Stopwatch Telemetry Box */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              padding: "12px 24px",
              borderRadius: 12,
              backgroundColor: "rgba(19, 28, 46, 0.8)",
              border: `1px solid ${theme.colors.borderHighlight}`,
              fontFamily: theme.fonts.mono,
            }}
          >
            <Clock size={22} color={theme.colors.cyanBright} />
            <div>
              <div style={{ fontSize: 11, color: theme.colors.textMuted }}>
                TIME-TO-USER
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: frame >= 70 ? theme.colors.amberBright : theme.colors.textDim,
                }}
              >
                {frame >= 70 ? "18m 42s [OK]" : "--:--:--"}
              </div>
            </div>

            <div
              style={{
                width: 1,
                height: 30,
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              }}
            />

            <div>
              <div style={{ fontSize: 11, color: theme.colors.textMuted }}>
                TIME-TO-ROOT
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: isRootPwned ? theme.colors.emeraldBright : theme.colors.textDim,
                }}
              >
                {isRootPwned ? "41m 09s [ROOT]" : "--:--:--"}
              </div>
            </div>
          </div>
        </div>

        {/* 5 Kanban Columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 16,
            height: 480,
            marginTop: 20,
            position: "relative",
          }}
        >
          {stages.map((stg) => {
            const isTargetCol = activeStageIdx === stg.id;
            return (
              <div
                key={stg.id}
                style={{
                  backgroundColor: isTargetCol
                    ? "rgba(19, 28, 46, 0.9)"
                    : "rgba(11, 15, 25, 0.7)",
                  borderRadius: 12,
                  border: isTargetCol
                    ? `1px solid ${stg.color}`
                    : `1px solid rgba(255, 255, 255, 0.08)`,
                  boxShadow: isTargetCol
                    ? `0 0 20px rgba(0,0,0,0.5), inset 0 0 15px rgba(16, 185, 129, 0.05)`
                    : "none",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Column Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingBottom: 12,
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: stg.color }}>{stg.icon}</span>
                    <span
                      style={{
                        fontFamily: theme.fonts.mono,
                        fontSize: 14,
                        fontWeight: 700,
                        color: theme.colors.textWhite,
                      }}
                    >
                      {stg.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: theme.fonts.mono,
                      fontSize: 12,
                      color: isTargetCol ? stg.color : theme.colors.textDim,
                    }}
                  >
                    {isTargetCol ? "1" : "0"}
                  </span>
                </div>

                {/* Static target cards inside this column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                  {staticColumnTargets[stg.id]?.map((tgt, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: "rgba(11, 15, 25, 0.8)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: 8,
                        padding: 10,
                        opacity: isTargetCol && idx === 0 ? 0.35 : 0.85,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: theme.fonts.mono,
                            fontSize: 13,
                            fontWeight: 700,
                            color: theme.colors.textWhite,
                          }}
                        >
                          {tgt.name}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            backgroundColor: "rgba(255,255,255,0.08)",
                            color: theme.colors.textMuted,
                          }}
                        >
                          {tgt.diff}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: theme.fonts.mono,
                          fontSize: 11,
                          color: theme.colors.textDim,
                          marginBottom: 4,
                        }}
                      >
                        IP: {tgt.ip} ({tgt.os})
                      </div>
                      <div
                        style={{
                          fontFamily: theme.fonts.mono,
                          fontSize: 10,
                          color: tgt.color,
                          fontWeight: 600,
                        }}
                      >
                        ● {tgt.tag}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Animated Gliding Target Card positioned horizontally */}
          <div
            style={{
              position: "absolute",
              top: 70,
              left: `calc(${cardColX} * (100% / 5) + 12px)`,
              width: `calc(100% / 5 - 24px)`,
              backgroundColor: "rgba(17, 24, 39, 0.95)",
              borderRadius: 10,
              border: isRootPwned
                ? `2px solid ${theme.colors.emeraldBright}`
                : `1px solid ${theme.colors.borderHighlight}`,
              boxShadow: isRootPwned
                ? theme.shadows.glowEmerald
                : theme.shadows.card,
              padding: 16,
              zIndex: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Terminal size={16} color={theme.colors.emeraldBright} />
                <span
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 15,
                    fontWeight: 700,
                    color: theme.colors.textWhite,
                  }}
                >
                  Lame
                </span>
              </div>
              <CyberBadge label="Easy" variant="emerald" fontSize={11} />
            </div>

            <div
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 12,
                color: theme.colors.textMuted,
                marginBottom: 10,
              }}
            >
              IP: 10.10.10.3 (Linux)
            </div>

            <div
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 11,
                color: theme.colors.cyanBright,
                backgroundColor: "rgba(6, 182, 212, 0.1)",
                padding: "4px 8px",
                borderRadius: 4,
                marginBottom: 12,
              }}
            >
              {activeStageIdx === 0 && "Pending Nmap scan"}
              {activeStageIdx === 1 && "Port 139/445 Samba open"}
              {activeStageIdx === 2 && "CVE-2007-2447 payload executed"}
              {activeStageIdx >= 3 && "Root Shell Acquired: UID 0"}
            </div>

            {/* Stage-dependent telemetry */}
            {isRootPwned ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: theme.colors.emeraldBright,
                  fontFamily: theme.fonts.mono,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <CheckCircle size={14} />
                <span>ROOT COMPROMISED [OK]</span>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: theme.colors.amberBright,
                  fontFamily: theme.fonts.mono,
                  fontSize: 11,
                }}
              >
                <span>Stage: {stages[activeStageIdx].title}</span>
              </div>
            )}
          </div>
        </div>

        {/* Big Root Compromised Banner / Burst (Triggered at frame 110) */}
        {isRootPwned && (
          <div
            style={{
              padding: "16px 28px",
              borderRadius: 12,
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: `2px solid ${theme.colors.emeraldBright}`,
              boxShadow: theme.shadows.glowEmerald,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Skull size={28} color={theme.colors.emeraldBright} />
              <div>
                <div
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 16,
                    fontWeight: 800,
                    color: theme.colors.emeraldBright,
                    letterSpacing: 1,
                  }}
                >
                  SYSTEM PWNED // ROOT SHELL CONFIRMED
                </div>
                <div
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 12,
                    color: theme.colors.textMuted,
                  }}
                >
                  # whoami -&gt; root (uid=0, gid=0) // Evidence artifact logged
                </div>
              </div>
            </div>

            <CyberBadge
              label="TIME-TO-ROOT: 41m 09s"
              variant="emerald"
              glow
              fontSize={13}
            />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

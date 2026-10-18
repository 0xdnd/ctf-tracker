import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Server, Search, CheckCircle2, Box, Terminal } from "lucide-react";
import { theme } from "../styles/theme";
import { TacticalHUD } from "../components/TacticalHUD";
import { Counter } from "../components/Counter";
import { CyberBadge } from "../components/CyberBadge";

export const Scene2_MachineMatrix: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header slide in
  const headerY = interpolate(frame, [0, 20], [-40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const headerOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 3 Cards spring entrances
  const card1Spring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, stiffness: 90 },
  });
  const card2Spring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 14, stiffness: 90 },
  });
  const card3Spring = spring({
    frame: frame - 30,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  // Simulated search query typing
  const fullSearch = "os:linux difficulty:easy service:smb";
  const searchCharCount = Math.floor(
    interpolate(frame, [25, 75], [0, fullSearch.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const displayedSearch = fullSearch.slice(0, searchCharCount);

  // Machine cards staggered reveal
  const machines = [
    {
      name: "Lame",
      ip: "10.10.10.3",
      os: "Linux",
      diff: "Easy",
      platform: "Hack The Box",
      vuln: "CVE-2007-2447 (Samba usermap)",
      variant: "emerald" as const,
    },
    {
      name: "Active",
      ip: "10.10.10.100",
      os: "Windows AD",
      diff: "Medium",
      platform: "Hack The Box",
      vuln: "Kerberoasting & GPP Password",
      variant: "purple" as const,
    },
    {
      name: "Kenobi",
      ip: "10.10.20.15",
      os: "Linux",
      diff: "Easy",
      platform: "TryHackMe",
      vuln: "ProFTPD 1.3.5 & SUID Path Hijack",
      variant: "crimson" as const,
    },
    {
      name: "Blue",
      ip: "10.10.10.40",
      os: "Windows",
      diff: "Easy",
      platform: "Hack The Box",
      vuln: "MS17-010 EternalBlue RCE",
      variant: "cyan" as const,
    },
  ];

  // Scene exit fade
  const sceneOpacity = interpolate(frame, [135, 150], [1, 0], {
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
      <TacticalHUD sceneTitle="STAGE 02 // 1005+ MACHINE MATRIX" />

      {/* Cyber Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
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
        {/* Top Section: Header & Quick Stats */}
        <div
          style={{
            transform: `translateY(${headerY}px)`,
            opacity: headerOpacity,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <CyberBadge label="UNIFIED TARGET CATALOG" variant="emerald" />
              <span
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 13,
                  color: theme.colors.textMuted,
                }}
              >
                // 1005 PENETRATION TESTING LABS INDEXED
              </span>
            </div>
            <h2
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: 46,
                fontWeight: 800,
                color: theme.colors.textWhite,
                margin: 0,
                letterSpacing: -1,
              }}
            >
              The 1005+ Machine Matrix
            </h2>
          </div>

          {/* Big Total Counter Box */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              padding: "10px 24px",
              borderRadius: 12,
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              border: `1px solid ${theme.colors.borderHighlight}`,
            }}
          >
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 14,
                color: theme.colors.textMuted,
                letterSpacing: 1,
              }}
            >
              TOTAL LABS:
            </span>
            <Counter
              from={0}
              to={1005}
              startFrame={5}
              endFrame={50}
              suffix="+"
              fontSize={44}
              color={theme.colors.emeraldBright}
            />
          </div>
        </div>

        {/* Middle Section: 3 Platform Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
          {/* Card 1: Hack The Box */}
          <div
            style={{
              transform: `scale(${card1Spring})`,
              backgroundColor: "rgba(19, 28, 46, 0.8)",
              borderRadius: 16,
              padding: "24px 28px",
              border: `1px solid rgba(16, 185, 129, 0.3)`,
              boxShadow: theme.shadows.glowEmerald,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Box size={22} color={theme.colors.emeraldBright} />
                  <span
                    style={{
                      fontFamily: theme.fonts.mono,
                      fontSize: 16,
                      fontWeight: 700,
                      color: theme.colors.textWhite,
                    }}
                  >
                    Hack The Box
                  </span>
                </div>
                <CyberBadge label="RETIRED LABS" variant="emerald" fontSize={11} />
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <Counter
                  from={0}
                  to={543}
                  startFrame={12}
                  endFrame={55}
                  fontSize={56}
                  color={theme.colors.emeraldBright}
                />
                <span
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 16,
                    color: theme.colors.textMuted,
                  }}
                >
                  Machines
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 18,
                fontFamily: theme.fonts.mono,
                fontSize: 12,
              }}
            >
              <span style={{ color: "#34D399" }}>Easy 142</span>
              <span style={{ color: theme.colors.textDim }}>•</span>
              <span style={{ color: "#FBBF24" }}>Med 168</span>
              <span style={{ color: theme.colors.textDim }}>•</span>
              <span style={{ color: "#F87171" }}>Hard 75</span>
              <span style={{ color: theme.colors.textDim }}>•</span>
              <span style={{ color: "#A855F7" }}>Insane 30</span>
            </div>
          </div>

          {/* Card 2: TryHackMe */}
          <div
            style={{
              transform: `scale(${card2Spring})`,
              backgroundColor: "rgba(19, 28, 46, 0.8)",
              borderRadius: 16,
              padding: "24px 28px",
              border: `1px solid rgba(239, 68, 68, 0.3)`,
              boxShadow: theme.shadows.glowCrimson,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Server size={22} color={theme.colors.crimsonBright} />
                  <span
                    style={{
                      fontFamily: theme.fonts.mono,
                      fontSize: 16,
                      fontWeight: 700,
                      color: theme.colors.textWhite,
                    }}
                  >
                    TryHackMe
                  </span>
                </div>
                <CyberBadge label="ROOMS & LABS" variant="crimson" fontSize={11} />
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <Counter
                  from={0}
                  to={462}
                  startFrame={22}
                  endFrame={65}
                  fontSize={56}
                  color={theme.colors.crimsonBright}
                />
                <span
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 16,
                    color: theme.colors.textMuted,
                  }}
                >
                  Rooms
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 18,
                fontFamily: theme.fonts.mono,
                fontSize: 12,
                color: theme.colors.textMuted,
              }}
            >
              <span>PrivEsc</span>
              <span style={{ color: theme.colors.textDim }}>•</span>
              <span>Web Defense</span>
              <span style={{ color: theme.colors.textDim }}>•</span>
              <span>Active Directory</span>
            </div>
          </div>

          {/* Card 3: Daniel Dayan Solves */}
          <div
            style={{
              transform: `scale(${card3Spring})`,
              backgroundColor: "rgba(19, 28, 46, 0.8)",
              borderRadius: 16,
              padding: "24px 28px",
              border: `1px solid rgba(245, 158, 11, 0.35)`,
              boxShadow: theme.shadows.glowAmber,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle2 size={22} color={theme.colors.amberBright} />
                  <span
                    style={{
                      fontFamily: theme.fonts.mono,
                      fontSize: 16,
                      fontWeight: 700,
                      color: theme.colors.textWhite,
                    }}
                  >
                    @0xdnd Solves
                  </span>
                </div>
                <CyberBadge label="VERIFIED ROOT" variant="amber" fontSize={11} />
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <Counter
                  from={0}
                  to={55}
                  startFrame={30}
                  endFrame={70}
                  fontSize={56}
                  color={theme.colors.amberBright}
                />
                <span
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 16,
                    color: theme.colors.textMuted,
                  }}
                >
                  Walkthroughs
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 18,
                fontFamily: theme.fonts.mono,
                fontSize: 12,
                color: theme.colors.amberBright,
              }}
            >
              <span>100% Exploit Logs & Writeups</span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Search & Live Sample Rows */}
        <div
          style={{
            backgroundColor: "rgba(11, 15, 25, 0.95)",
            borderRadius: 14,
            padding: "16px 20px",
            border: `1px solid rgba(255, 255, 255, 0.1)`,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Mock Search Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 16px",
              borderRadius: 8,
              backgroundColor: "rgba(19, 28, 46, 0.8)",
              border: `1px solid rgba(6, 182, 212, 0.3)`,
            }}
          >
            <Search size={18} color={theme.colors.cyanBright} />
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 14,
                color: theme.colors.textWhite,
              }}
            >
              {displayedSearch}
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 16,
                  backgroundColor: theme.colors.cyanBright,
                  marginLeft: 4,
                  verticalAlign: "middle",
                }}
              />
            </span>
          </div>

          {/* Machine Rows */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {machines.map((m, idx) => {
              const rowSpring = spring({
                frame: frame - (45 + idx * 8),
                fps,
                config: { damping: 14, stiffness: 90 },
              });
              return (
                <div
                  key={idx}
                  style={{
                    transform: `scale(${rowSpring})`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 16px",
                    borderRadius: 8,
                    backgroundColor: "rgba(17, 24, 39, 0.6)",
                    border: `1px solid rgba(255, 255, 255, 0.05)`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Terminal size={14} color={theme.colors.emeraldBright} />
                    <span
                      style={{
                        fontFamily: theme.fonts.mono,
                        fontSize: 14,
                        fontWeight: 700,
                        color: theme.colors.textWhite,
                      }}
                    >
                      {m.name}
                    </span>
                    <span
                      style={{
                        fontFamily: theme.fonts.mono,
                        fontSize: 12,
                        color: theme.colors.textDim,
                      }}
                    >
                      {m.ip}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontFamily: theme.fonts.mono,
                        fontSize: 11,
                        color: theme.colors.textMuted,
                      }}
                    >
                      {m.vuln}
                    </span>
                    <CyberBadge label={m.diff} variant={m.variant} fontSize={11} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Search, Server, CheckCircle2 } from "lucide-react";
import { RadiantBackground } from "../components-saas/RadiantBackground";
import { MacOSWindow } from "../components-saas/MacOSWindow";

export const Scene2_TargetMatrix: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Search input typing animation
  const query = "os:linux difficulty:easy service:smb";
  const charCount = Math.floor(
    interpolate(frame, [15, 65], [0, query.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const currentQuery = query.slice(0, charCount);

  // Card slide springs
  const card1 = spring({ frame: frame - 15, fps, config: { damping: 14, stiffness: 90 } });
  const card2 = spring({ frame: frame - 25, fps, config: { damping: 14, stiffness: 90 } });
  const card3 = spring({ frame: frame - 35, fps, config: { damping: 14, stiffness: 90 } });

  // Scene fade
  const sceneOpacity = interpolate(frame, [135, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const machines = [
    { name: "Lame", ip: "10.10.10.3", os: "Linux", diff: "Easy", platform: "Hack The Box", vuln: "CVE-2007-2447 (Samba usermap)", tag: "COMPLETED", color: "#10B981" },
    { name: "Kenobi", ip: "10.10.20.15", os: "Linux", diff: "Easy", platform: "TryHackMe", vuln: "ProFTPD 1.3.5 & SUID Path Hijack", tag: "COMPLETED", color: "#EF4444" },
    { name: "Active", ip: "10.10.10.100", os: "Windows AD", diff: "Medium", platform: "Hack The Box", vuln: "Kerberoasting & GPP Password", tag: "SOLVED", color: "#8B5CF6" },
  ];

  return (
    <RadiantBackground>
      <AbsoluteFill
        style={{
          opacity: sceneOpacity,
          padding: "50px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#6366F1",
                fontFamily: "Inter, sans-serif",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              MODULE 01 // TARGET INTELLIGENCE
            </div>
            <h2
              style={{
                fontSize: 42,
                fontWeight: 800,
                fontFamily: "Inter, -apple-system, sans-serif",
                color: "#F8FAFC",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              1005+ Pre-Loaded Targets
            </h2>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div
              style={{
                padding: "8px 18px",
                borderRadius: 20,
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                color: "#34D399",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
              }}
            >
              543 Hack The Box
            </div>
            <div
              style={{
                padding: "8px 18px",
                borderRadius: 20,
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                color: "#F87171",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "Inter, sans-serif",
              }}
            >
              462 TryHackMe
            </div>
          </div>
        </div>

        {/* Browser Mockup */}
        <MacOSWindow style={{ flex: 1, padding: "28px 36px" }}>
          {/* Modern Search Bar */}
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: 14,
              padding: "14px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <Search size={18} color="#94A3B8" />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 15,
                color: "#F8FAFC",
              }}
            >
              {currentQuery}
              {frame % 16 < 8 && <span style={{ color: "#6366F1", fontWeight: 700 }}>|</span>}
            </span>
          </div>

          {/* Target Cards Grid */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {machines.map((m, idx) => {
              const cardSpring = idx === 0 ? card1 : idx === 1 ? card2 : card3;
              const y = interpolate(cardSpring, [0, 1], [30, 0]);
              return (
                <div
                  key={m.name}
                  style={{
                    transform: `translateY(${y}px)`,
                    opacity: cardSpring,
                    backgroundColor: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: 14,
                    padding: "16px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontFamily: "Inter, sans-serif",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        backgroundColor: `${m.color}20`,
                        border: `1px solid ${m.color}40`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Server size={20} color={m.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#F8FAFC" }}>
                        {m.name} <span style={{ color: "#64748B", fontWeight: 400, fontSize: 14 }}>({m.ip})</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 2 }}>{m.vuln}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: 20,
                        backgroundColor: "rgba(255, 255, 255, 0.06)",
                        fontSize: 12,
                        color: "#94A3B8",
                      }}
                    >
                      {m.diff}
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 14px",
                        borderRadius: 20,
                        backgroundColor: "rgba(16, 185, 129, 0.15)",
                        color: "#34D399",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={13} /> {m.tag}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </MacOSWindow>
      </AbsoluteFill>
    </RadiantBackground>
  );
};

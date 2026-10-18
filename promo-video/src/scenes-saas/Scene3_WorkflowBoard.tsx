import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { Clock } from "lucide-react";
import { RadiantBackground } from "../components-saas/RadiantBackground";
import { MacOSWindow } from "../components-saas/MacOSWindow";

export const Scene3_WorkflowBoard: React.FC = () => {
  const frame = useCurrentFrame();

  // Kanban card glide across 5 columns (0: Backlog, 1: Recon, 2: Foothold, 3: Root Pwned, 4: Documented)
  const cardCol = interpolate(
    frame,
    [15, 35, 55, 75, 95, 115, 130],
    [0, 1, 1, 2, 2, 3, 4],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const sceneOpacity = interpolate(frame, [135, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const columns = [
    { title: "Target Backlog", count: 12, color: "#94A3B8" },
    { title: "Active Recon", count: 1, color: "#38BDF8" },
    { title: "Foothold", count: 1, color: "#F59E0B" },
    { title: "Root Pwned", count: 34, color: "#10B981" },
    { title: "Documented", count: 55, color: "#8B5CF6" },
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
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#10B981",
                fontFamily: "Inter, sans-serif",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              MODULE 02 // LIFECYCLE MANAGEMENT
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
              5-Stage Attack Pipeline
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 18px",
              borderRadius: 20,
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontFamily: "Inter, sans-serif",
              fontSize: 13,
              color: "#F8FAFC",
            }}
          >
            <Clock size={14} color="#38BDF8" />
            <span>Live Stopwatch: 01:42:18</span>
          </div>
        </div>

        {/* Browser Mockup Kanban */}
        <MacOSWindow style={{ flex: 1, padding: "28px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 16,
              height: "100%",
            }}
          >
            {columns.map((col, idx) => {
              const isCardHere = Math.round(cardCol) === idx;
              return (
                <div
                  key={col.title}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    borderRadius: 14,
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  {/* Column Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: col.color, fontFamily: "Inter, sans-serif" }}>
                      {col.title}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 10,
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                        color: "#94A3B8",
                        fontWeight: 600,
                      }}
                    >
                      {col.count}
                    </span>
                  </div>

                  {/* Dynamic Active Card Glide */}
                  {isCardHere && (
                    <div
                      style={{
                        backgroundColor: "#161E2E",
                        border: `1px solid ${col.color}`,
                        boxShadow: `0 10px 25px -5px ${col.color}30`,
                        borderRadius: 12,
                        padding: "14px",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#F8FAFC" }}>Sau</span>
                        <span style={{ fontSize: 11, color: "#64748B" }}>Linux</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>10.10.11.224</div>
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 11,
                          fontWeight: 600,
                          color: col.color,
                          backgroundColor: `${col.color}15`,
                          padding: "3px 8px",
                          borderRadius: 8,
                          display: "inline-block",
                        }}
                      >
                        {idx === 0 ? "QUEUED" : idx === 1 ? "NMAP SCAN [80, 22]" : idx === 2 ? "USER: maltrail" : idx === 3 ? "ROOT PWNED" : "DOCUMENTED"}
                      </div>
                    </div>
                  )}

                  {/* Static Placeholder Cards */}
                  {!isCardHere && idx === 3 && (
                    <div
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: 12,
                        padding: "12px",
                        fontFamily: "Inter, sans-serif",
                        opacity: 0.7,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#F8FAFC" }}>Bashed</div>
                      <div style={{ fontSize: 11, color: "#10B981", marginTop: 4 }}>ROOT // 10.10.10.68</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </MacOSWindow>
      </AbsoluteFill>
    </RadiantBackground>
  );
};

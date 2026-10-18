import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { Clock, Download, CheckCircle } from "lucide-react";
import { RadiantBackground } from "../components-saas/RadiantBackground";
import { MacOSWindow } from "../components-saas/MacOSWindow";

export const Scene5_ExamStudio: React.FC = () => {
  const frame = useCurrentFrame();

  const sceneOpacity = interpolate(frame, [135, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
                color: "#A855F7",
                fontFamily: "Inter, sans-serif",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              MODULE 04 // EXAM SIMULATION & DOCS
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
              CPTS & OSCP Exam Studio
            </h2>
          </div>

          {/* Exam Timer & Export Button */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                padding: "8px 16px",
                borderRadius: 20,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: "#F87171",
                fontWeight: 600,
              }}
            >
              <Clock size={14} />
              <span>23:41:18 REMAINING</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(168, 85, 247, 0.15)",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                padding: "8px 18px",
                borderRadius: 20,
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                color: "#C084FC",
                fontWeight: 600,
              }}
            >
              <Download size={14} />
              <span>Export PDF</span>
            </div>
          </div>
        </div>

        {/* Browser Mockup Split View */}
        <MacOSWindow style={{ flex: 1, padding: "0" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%" }}>
            {/* Left: Markdown Editor */}
            <div
              style={{
                padding: "24px 30px",
                borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                lineHeight: 1.7,
                color: "#94A3B8",
              }}
            >
              <div style={{ color: "#38BDF8", fontWeight: 700, marginBottom: 8 }}># CPTS Final Report — Machine: Sau</div>
              <div style={{ color: "#64748B", marginBottom: 12 }}>Date: October 2026 // Author: Daniel Dayan (@0xdnd)</div>
              <div><span style={{ color: "#F59E0B" }}>## 1. Executive Summary</span></div>
              <div style={{ color: "#CBD5E1" }}>Full compromise achieved via SSRF (CVE-2023-27159) leading to authenticated sudo privilege escalation.</div>
              <br />
              <div><span style={{ color: "#10B981" }}>```bash</span></div>
              <div style={{ color: "#E2E8F0" }}>$ sudo /usr/bin/systemctl status trail.service</div>
              <div style={{ color: "#E2E8F0" }}>!sh ➔ whoami # root</div>
              <div><span style={{ color: "#10B981" }}>```</span></div>
            </div>

            {/* Right: Rendered Preview */}
            <div
              style={{
                padding: "24px 30px",
                backgroundColor: "rgba(255, 255, 255, 0.015)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, color: "#F8FAFC", marginBottom: 12 }}>
                Report Preview
              </div>
              <div
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  borderRadius: 12,
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <CheckCircle size={20} color="#10B981" />
                <span style={{ fontSize: 13, color: "#34D399", fontWeight: 500 }}>
                  Evidence proof verified: Flag integrity 100% passed
                </span>
              </div>

              <div style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6 }}>
                Automated screenshot embeds, formatted Markdown tables, and verified CPTS scoring criteria are compiled locally with zero cloud leakage.
              </div>
            </div>
          </div>
        </MacOSWindow>
      </AbsoluteFill>
    </RadiantBackground>
  );
};

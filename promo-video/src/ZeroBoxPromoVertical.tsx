import React from "react";
import {
  AbsoluteFill,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Img,
} from "remotion";
import {
  Terminal,
  Activity,
  ArrowRight,
  Wifi,
  Battery,
  Lock,
} from "lucide-react";
import { ZeroBox60fpsShowcase } from "./ZeroBox60fpsShowcase";
import { THEME_PRESETS } from "./styles/theme";

export const ZeroBoxPromoVertical: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  const tokens = THEME_PRESETS.oled;

  // Determine current active act label
  let actNumber = "01";
  let actTitle = "ZERO-EGRESS KERNEL";
  let actSubtitle = "Offensive Security Architecture & Identity";
  if (time >= 4.0 && time < 9.5) {
    actNumber = "02";
    actTitle = "1005-TARGET MATRIX & SEARCH";
    actSubtitle = "Full OSCP, CPTS & Active Directory Catalog";
  } else if (time >= 9.5 && time < 15.5) {
    actNumber = "03";
    actTitle = "TACTICAL KANBAN BOARD";
    actSubtitle = "Choreographed Drag-and-Drop Root Pwned";
  } else if (time >= 15.5 && time < 21.5) {
    actNumber = "04";
    actTitle = "DYNAMIC REVSHELL & AI RECON";
    actSubtitle = "Local-First Payloads & MITRE ATT&CK Triage";
  } else if (time >= 21.5 && time < 29.0) {
    actNumber = "05";
    actTitle = "24H EXAM SIMULATOR & AD TOPOLOGY";
    actSubtitle = "Sugiyama Graph with Chisel & Ligolo Pivoting";
  } else if (time >= 29.0) {
    actNumber = "06";
    actTitle = "PRODUCTION ECOSYSTEM FINALE";
    actSubtitle = "Apple Keynote 3D Multi-Device Showcase";
  }

  // CTA pulsing animation (deterministic with respect to fps)
  const ctaPulse = interpolate(
    Math.sin(((frame / fps) * 1.5) * Math.PI * 2),
    [-1, 1],
    [0.98, 1.02]
  );
  const ctaGlow = interpolate(
    Math.sin(((frame / fps) * 1.5) * Math.PI * 2),
    [-1, 1],
    [20, 38]
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: tokens.surfaceBase, // True OLED Black #000000
        overflow: "hidden",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* 1. Volumetric Cyber Background & Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            radial-gradient(circle at 50% 25%, rgba(56, 189, 248, 0.12) 0%, transparent 65%),
            radial-gradient(circle at 50% 80%, rgba(56, 189, 248, 0.08) 0%, transparent 60%),
            linear-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "100% 100%, 100% 100%, 48px 48px, 48px 48px",
        }}
      />

      {/* 2. Top Status Bar (Phone Bezel Emulation) */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 48,
          right: 48,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 14,
          fontFamily: "monospace",
          color: tokens.textMuted,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#EF4444",
              boxShadow: "0 0 10px #EF4444",
            }}
          />
          <span style={{ color: "#EF4444", fontWeight: 700 }}>REC</span>
          <span style={{ color: tokens.textTertiary }}>|</span>
          <span style={{ color: tokens.cyberAccent }}>1080x1920 @ {fps} FPS</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Lock size={12} color={tokens.cyberAccent} />
            <span style={{ color: tokens.textSecondary }}>AES-256</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Wifi size={13} color={tokens.cyberAccent} />
            <span style={{ color: tokens.textSecondary }}>100% OFFLINE</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Battery size={15} color={tokens.cyberAccent} />
            <span>100%</span>
          </span>
        </div>
      </div>

      {/* 3. Master Brand Header (y: 80 to 360) */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 48,
          right: 48,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          zIndex: 90,
        }}
      >
        {/* 3D Glowing Open Blue Box Logo */}
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            backgroundColor: "rgba(56, 189, 248, 0.08)",
            border: `2px solid ${tokens.cyberAccent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 40px ${tokens.cyberAccentGlow}`,
            marginBottom: 16,
          }}
        >
          <Img
            src={staticFile("brand/logo-oled.webp")}
            style={{
              width: 72,
              height: 72,
              objectFit: "contain",
              filter: "drop-shadow(0 0 16px rgba(56, 189, 248, 0.95))",
            }}
          />
        </div>

        {/* Title & Cyber Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: tokens.textPrimary,
              letterSpacing: "-0.03em",
              margin: 0,
            }}
          >
            ZEROBOX
          </h1>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              fontFamily: "monospace",
              color: tokens.cyberAccent,
              backgroundColor: tokens.cyberAccentBg,
              border: `1px solid ${tokens.cyberAccent}55`,
              padding: "4px 10px",
              borderRadius: 6,
              boxShadow: `0 0 12px ${tokens.cyberAccentGlow}`,
            }}
          >
            v2.0 STABLE
          </span>
        </div>

        <p
          style={{
            fontSize: 15,
            color: tokens.textSecondary,
            margin: "8px 0 16px 0",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          Tactical CTF & Offensive Cyber Operations Platform
        </p>

        {/* Tactical Feature Strip */}
        <div style={{ display: "flex", gap: 10 }}>
          {[
            { label: "1005 Machines", icon: "🎯" },
            { label: "OSCP & CPTS", icon: "🎓" },
            { label: "Dynamic RevShells", icon: "⚡" },
            { label: "Zero-Egress AI", icon: "🧠" },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                backgroundColor: tokens.surfaceCard,
                border: `1px solid ${tokens.borderSubtle}`,
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 12,
                color: tokens.textPrimary,
                fontWeight: 600,
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Center Video Frame: 16:9 Showcase Scaled into Phone Display (y: 350 to 995) */}
      <div
        style={{
          position: "absolute",
          top: 350,
          left: 36,
          right: 36,
          height: 645, // Exact fit: 42px header + 567px video + 36px footer (eliminates 75px dead space)
          borderRadius: 22,
          border: `2px solid ${tokens.borderAccent}`,
          boxShadow: `0 0 60px ${tokens.cyberAccentGlow}, inset 0 0 25px rgba(0, 0, 0, 0.9)`,
          backgroundColor: "#000000",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          zIndex: 80,
        }}
      >
        {/* Frame Top Header Strip */}
        <div
          style={{
            height: 42,
            backgroundColor: "#070a10",
            borderBottom: `1px solid ${tokens.borderSubtle}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 18px",
            fontSize: 12,
            fontFamily: "monospace",
            color: tokens.cyberAccent,
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                backgroundColor: tokens.cyberAccentBg,
                padding: "3px 10px",
                borderRadius: 5,
                border: `1px solid ${tokens.cyberAccent}55`,
                fontWeight: 800,
              }}
            >
              ACT {actNumber} / 06
            </span>
            <span style={{ color: tokens.textPrimary, fontWeight: 800, fontSize: 13 }}>
              {actTitle}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, color: tokens.textMuted }}>
            <Activity size={13} color={tokens.cyberAccent} />
            <span style={{ fontWeight: 600 }}>LIVE {fps} FPS HUD</span>
          </div>
        </div>

        {/* The 1920x1080 Core Video Scaled to 1008px width */}
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            backgroundColor: "#000000",
          }}
        >
          <div
            style={{
              width: 1920,
              height: 1080,
              transformOrigin: "top left",
              // Width available: 1080 - 72 = 1008px. Scale factor = 1008 / 1920 = 0.525
              transform: "scale(0.525)",
            }}
          >
            <ZeroBox60fpsShowcase />
          </div>
        </div>

        {/* Frame Bottom Act Subtitle Strip */}
        <div
          style={{
            height: 36,
            backgroundColor: "#05070c",
            borderTop: `1px solid ${tokens.borderSubtle}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 18px",
            fontSize: 12,
            color: tokens.textSecondary,
            fontFamily: "monospace",
          }}
        >
          <span style={{ color: tokens.textMuted }}>Telemetry: {actSubtitle}</span>
          <span style={{ color: tokens.cyberAccent, fontWeight: 700 }}>
            {time.toFixed(1)}s / 35.0s
          </span>
        </div>
      </div>

      {/* 5. Bottom Mobile Tactical HUD (y: 1015 to 1870) */}
      <div
        style={{
          position: "absolute",
          top: 1015,
          left: 44,
          right: 44,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          zIndex: 90,
        }}
      >
        {/* Dynamic Equalizer / Soundwave Visualizer */}
        <div
          style={{
            padding: "14px 20px",
            borderRadius: 16,
            backgroundColor: tokens.surfaceCard,
            border: `1px solid ${tokens.borderSubtle}`,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12,
              fontFamily: "monospace",
              color: tokens.textMuted,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Terminal size={14} color={tokens.cyberAccent} />
              <span style={{ color: tokens.textPrimary, fontWeight: 700 }}>
                CALIBRATED AUDIO & TELEMETRY STREAM
              </span>
            </div>
            <span style={{ color: tokens.cyberAccent }}>60 Hz · 48 kHz</span>
          </div>

          {/* 32 Animated Equalizer Frequency Bars */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              height: 36,
              gap: 3,
              padding: "0 4px",
            }}
          >
            {Array.from({ length: 32 }).map((_, i) => {
              const freqHeight = interpolate(
                Math.sin(frame * 0.15 + i * 0.45) * Math.cos(frame * 0.08 + i * 0.2),
                [-1, 1],
                [6, 34]
              );
              const isPeak = freqHeight > 26;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: freqHeight,
                    borderRadius: 2,
                    backgroundColor: isPeak ? "#ffffff" : tokens.cyberAccent,
                    boxShadow: isPeak
                      ? `0 0 10px #ffffff`
                      : `0 0 8px ${tokens.cyberAccentGlow}`,
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* 3 High-Impact Metrics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { value: "1005", label: "Machines Indexed", sub: "HTB / OSCP / CPTS" },
            { value: "100%", label: "Offline-First", sub: "IndexedDB + AES-256" },
            { value: "0ms", label: "Network Egress", sub: "Zero-Telemetry Core" },
          ].map((stat, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: tokens.surfaceCard,
                border: `1px solid ${tokens.borderSubtle}`,
                borderRadius: 14,
                padding: "14px 10px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 900,
                  color: tokens.cyberAccent,
                  fontFamily: "monospace",
                }}
              >
                {stat.value}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: tokens.textPrimary }}>
                {stat.label}
              </span>
              <span style={{ fontSize: 10, color: tokens.textMuted }}>
                {stat.sub}
              </span>
            </div>
          ))}
        </div>

        {/* 4 Feature Capability Callouts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { title: "⚡ Dynamic RevShell Studio", desc: "12+ languages with instant copy" },
            { title: "🎯 OSCP & CPTS Pathways", desc: "Curated syllabi with active tracking" },
            { title: "🧠 Zero-Egress AI Recon", desc: "100% offline Nmap CVE triaging" },
            { title: "🗺️ Active Directory Graph", desc: "Sugiyama layout with pivot tunneling" },
          ].map((item, idx) => (
            <div
              key={idx}
              style={{
                backgroundColor: "rgba(10, 10, 13, 0.65)",
                border: `1px solid ${tokens.borderSubtle}`,
                borderRadius: 12,
                padding: "10px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: tokens.textPrimary }}>
                {item.title}
              </span>
              <span style={{ fontSize: 10, color: tokens.textMuted }}>
                {item.desc}
              </span>
            </div>
          ))}
        </div>

        {/* Big Touch-Optimized Launch CTA Button */}
        <div
          id="mobile-launch-cta"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 28px",
            borderRadius: 16,
            backgroundColor: tokens.cyberAccent,
            color: tokens.accentFg,
            boxShadow: `0 0 ${ctaGlow}px ${tokens.cyberAccentGlow}`,
            transform: `scale(${ctaPulse})`,
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 19, fontWeight: 900, letterSpacing: "-0.01em" }}>
              Launch Free CTF Workspace
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                opacity: 0.85,
                fontFamily: "monospace",
              }}
            >
              0xdnd.github.io/ctf-tracker
            </span>
          </div>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              backgroundColor: tokens.accentFg,
              color: tokens.cyberAccent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowRight size={20} strokeWidth={2.5} />
          </div>
        </div>

        {/* Author / GitHub Credits Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: tokens.textMuted,
            padding: "2px 6px",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>⭐ Star on GitHub:</span>
            <span style={{ color: tokens.textPrimary, fontWeight: 600 }}>0xdnd/ctf-tracker</span>
          </span>
          <span
            style={{
              color: tokens.cyberAccent,
              fontWeight: 600,
              backgroundColor: tokens.cyberAccentBg,
              padding: "4px 10px",
              borderRadius: 12,
              border: `1px solid ${tokens.cyberAccent}33`,
            }}
          >
            Daniel Dayan (@0xdnd)
          </span>
        </div>

        {/* Mobile Home Indicator Bar (iOS style) */}
        <div
          style={{
            width: 135,
            height: 4,
            borderRadius: 2,
            backgroundColor: "rgba(255, 255, 255, 0.25)",
            margin: "0 auto",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

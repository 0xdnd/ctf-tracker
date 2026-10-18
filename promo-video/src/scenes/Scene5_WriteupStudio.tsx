import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import {
  FileText,
  Clock,
  Download,
  CheckCircle2,
  Lock,
  Camera,
  Share2,
} from "lucide-react";
import { theme } from "../styles/theme";
import { TacticalHUD } from "../components/TacticalHUD";
import { CyberBadge } from "../components/CyberBadge";

export const Scene5_WriteupStudio: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Simulated countdown clock (23:41:18 ticking down)
  const remainingSeconds = 23 * 3600 + 41 * 60 + 18 - Math.floor(frame / 3);
  const hrs = Math.floor(remainingSeconds / 3600);
  const mins = Math.floor((remainingSeconds % 3600) / 60);
  const secs = remainingSeconds % 60;
  const timeString = `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  // Pane reveal springs
  const leftPaneSpring = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, stiffness: 90 },
  });
  const rightPaneSpring = spring({
    frame: frame - 20,
    fps,
    config: { damping: 14, stiffness: 90 },
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
      <TacticalHUD sceneTitle="STAGE 05 // WRITEUP STUDIO & EXAM HUD" />

      {/* Cyber Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.04) 1px, transparent 1px)`,
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
        {/* Header & Exam Mode HUD */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <CyberBadge label="EXAM MODE & DOCUMENTATION ENGINE" variant="purple" />
              <span
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 13,
                  color: theme.colors.textMuted,
                }}
              >
                // CPTS & OSCP VERIFIED WORKFLOW
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
              Embedded Writeup Studio & Exam Mode
            </h2>
          </div>

          {/* 24-Hour Exam Timer HUD */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 24px",
              borderRadius: 12,
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              border: `1px solid ${theme.colors.crimson}`,
              boxShadow: theme.shadows.glowCrimson,
            }}
          >
            <Clock size={24} color={theme.colors.crimsonBright} />
            <div>
              <div
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 11,
                  fontWeight: 700,
                  color: theme.colors.crimsonBright,
                  letterSpacing: 1,
                }}
              >
                CPTS EXAM COUNTDOWN
              </div>
              <div
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 24,
                  fontWeight: 800,
                  color: theme.colors.textWhite,
                  letterSpacing: 2,
                }}
              >
                {timeString}
              </div>
            </div>

            <div
              style={{
                padding: "4px 10px",
                borderRadius: 6,
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                fontFamily: theme.fonts.mono,
                fontSize: 11,
                color: theme.colors.amberBright,
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              PAUSE: ACTIVE
            </div>
          </div>
        </div>

        {/* Dual-Pane Editor & Preview */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, height: 480 }}>
          {/* Left Pane: Markdown Editor */}
          <div
            style={{
              transform: `scale(${leftPaneSpring})`,
              backgroundColor: "rgba(11, 15, 25, 0.95)",
              borderRadius: 14,
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Tab header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                backgroundColor: "rgba(17, 24, 39, 0.9)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileText size={16} color={theme.colors.cyanBright} />
                <span
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 13,
                    fontWeight: 600,
                    color: theme.colors.textWhite,
                  }}
                >
                  writeup-htb-lame.md
                </span>
              </div>
              <CyberBadge label="MARKDOWN SOURCE" variant="cyan" fontSize={11} />
            </div>

            {/* Code content with line numbers */}
            <div
              style={{
                padding: 18,
                fontFamily: theme.fonts.mono,
                fontSize: 13,
                lineHeight: 1.7,
                color: theme.colors.textWhite,
                flex: 1,
              }}
            >
              <div>
                <span style={{ color: theme.colors.textDim }}>01 </span>
                <span style={{ color: theme.colors.amberBright }}>---</span>
              </div>
              <div>
                <span style={{ color: theme.colors.textDim }}>02 </span>
                <span style={{ color: theme.colors.cyanBright }}>target: </span>
                <span>HTB-Lame</span>
              </div>
              <div>
                <span style={{ color: theme.colors.textDim }}>03 </span>
                <span style={{ color: theme.colors.cyanBright }}>author: </span>
                <span>Daniel Dayan (@0xdnd)</span>
              </div>
              <div>
                <span style={{ color: theme.colors.textDim }}>04 </span>
                <span style={{ color: theme.colors.cyanBright }}>cve: </span>
                <span>CVE-2007-2447 (Samba usermap script)</span>
              </div>
              <div>
                <span style={{ color: theme.colors.textDim }}>05 </span>
                <span style={{ color: theme.colors.cyanBright }}>flag_user: </span>
                <span style={{ color: theme.colors.emeraldBright }}>6b89e71029c... [OK]</span>
              </div>
              <div>
                <span style={{ color: theme.colors.textDim }}>06 </span>
                <span style={{ color: theme.colors.cyanBright }}>flag_root: </span>
                <span style={{ color: theme.colors.emeraldBright }}>9d17c49f82a... [ROOT PWNED]</span>
              </div>
              <div>
                <span style={{ color: theme.colors.textDim }}>07 </span>
                <span style={{ color: theme.colors.amberBright }}>---</span>
              </div>
              <div>
                <span style={{ color: theme.colors.textDim }}>08 </span>
                <span style={{ color: theme.colors.purpleBright, fontWeight: 700 }}>
                  ## 1. Initial Reconnaissance
                </span>
              </div>
              <div>
                <span style={{ color: theme.colors.textDim }}>09 </span>
                <span style={{ color: theme.colors.textMuted }}>$ nmap -sC -sV -p- 10.10.10.3</span>
              </div>
              <div>
                <span style={{ color: theme.colors.textDim }}>10 </span>
                <span style={{ color: theme.colors.textDim }}># Open ports: 21 (vsftpd), 22 (ssh), 139/445 (samba)</span>
              </div>
              <div>
                <span style={{ color: theme.colors.textDim }}>11 </span>
                <span style={{ color: theme.colors.purpleBright, fontWeight: 700 }}>
                  ## 2. Exploitation via Logon Script
                </span>
              </div>
            </div>
          </div>

          {/* Right Pane: Live Rendered Preview */}
          <div
            style={{
              transform: `scale(${rightPaneSpring})`,
              backgroundColor: "rgba(19, 28, 46, 0.85)",
              borderRadius: 14,
              border: `1px solid ${theme.colors.borderHighlight}`,
              boxShadow: theme.shadows.glowEmerald,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header with Export Pills */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                backgroundColor: "rgba(17, 24, 39, 0.9)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} color={theme.colors.emeraldBright} />
                <span
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: 13,
                    fontWeight: 700,
                    color: theme.colors.textWhite,
                  }}
                >
                  Live Rendered Report Preview
                </span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <CyberBadge label="Obsidian (.md)" variant="purple" fontSize={11} />
                <CyberBadge label="GitBook" variant="cyan" fontSize={11} />
              </div>
            </div>

            {/* Formatted Report View */}
            <div style={{ padding: 22, flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3
                  style={{
                    fontFamily: theme.fonts.sans,
                    fontSize: 22,
                    fontWeight: 800,
                    color: theme.colors.textWhite,
                    margin: 0,
                  }}
                >
                  HTB: Lame Walkthrough
                </h3>
                <CyberBadge label="STATUS: 100% SOLVED" variant="emerald" glow fontSize={11} />
              </div>

              {/* Loot Vault Box */}
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 8,
                  backgroundColor: "rgba(11, 15, 25, 0.8)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Lock size={14} color={theme.colors.emeraldBright} />
                  <span style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: theme.colors.emeraldBright }}>
                    User Flag Captured
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Lock size={14} color={theme.colors.emeraldBright} />
                  <span style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: theme.colors.emeraldBright }}>
                    Root Flag Captured
                  </span>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  <Camera size={14} color={theme.colors.cyanBright} />
                  <span style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: theme.colors.textMuted }}>
                    14 Screenshots Logged
                  </span>
                </div>
              </div>

              {/* Code Snippet */}
              <div
                style={{
                  backgroundColor: "rgba(11, 15, 25, 0.9)",
                  borderRadius: 8,
                  padding: 14,
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  fontFamily: theme.fonts.mono,
                  fontSize: 12,
                  color: theme.colors.textMuted,
                }}
              >
                <div style={{ color: theme.colors.emeraldBright, marginBottom: 4 }}>
                  # Exploitation Output:
                </div>
                <div>[*] Started reverse TCP handler on 10.10.14.33:4444</div>
                <div>[*] Command shell session 1 opened</div>
                <div style={{ color: theme.colors.amberBright, fontWeight: 700 }}>
                  [+] Target machine compromised: root@lame:/#
                </div>
              </div>

              {/* Bottom Quick Action Bar */}
              <div style={{ marginTop: "auto", display: "flex", gap: 12 }}>
                <button
                  style={{
                    flex: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px",
                    borderRadius: 8,
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    border: `1px solid ${theme.colors.emerald}`,
                    color: theme.colors.emeraldBright,
                    fontFamily: theme.fonts.mono,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <Download size={14} /> EXPORT PDF REPORT
                </button>
                <button
                  style={{
                    flex: 1,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px",
                    borderRadius: 8,
                    backgroundColor: "rgba(139, 92, 246, 0.15)",
                    border: `1px solid ${theme.colors.purple}`,
                    color: theme.colors.purpleBright,
                    fontFamily: theme.fonts.mono,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <Share2 size={14} /> SYNC TO OBSIDIAN VAULT
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 16px",
            fontFamily: theme.fonts.mono,
            fontSize: 12,
            color: theme.colors.textDim,
          }}
        >
          <span>AUTO-SAVE: EVERY 2 SECONDS TO LOCALSTORAGE</span>
          <span>100% CLIENT-SIDE ENCRYPTION (NO CLOUD LEAKS)</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

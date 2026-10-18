import { Network, Shield, CheckCircle2, FileText, Zap } from "lucide-react";
import { interpolate } from "remotion";
import { THEME_PRESETS, ThemePreset } from "../styles/theme";

export interface AttackGraphTopologyProps {
  progress: number; // 0 to 1 progress within Act 5
  themePreset?: ThemePreset;
  height?: string | number;
}

export const AttackGraphTopology: React.FC<AttackGraphTopologyProps> = ({
  progress,
  themePreset = "oled",
  height = "100%",
}) => {
  const tokens = THEME_PRESETS[themePreset];

  // Dynamic progressive step thresholds across Act 5:
  // Step 1: 0.00 -> 0.25: Operator enumerates WEB01 (Initial Foothold RCE)
  // Step 2: 0.25 -> 0.50: Ligolo-ng pivoting tunnel established to CLIENT01
  // Step 3: 0.50 -> 0.75: Lateral movement to MS01 via GPP PrivEsc
  // Step 4: 0.75 -> 1.00: DCSync attack on DC01 -> Domain Admin Root PWNED!
  const edge1Progress = interpolate(progress, [0.05, 0.25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const edge2Progress = interpolate(progress, [0.25, 0.48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const edge3Progress = interpolate(progress, [0.48, 0.72], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const edge4Progress = interpolate(progress, [0.72, 0.92], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isWeb01Pwned = progress >= 0.20;
  const isClient01Pivoted = progress >= 0.45;
  const isMs01Compromised = progress >= 0.70;
  const isDc01Pwned = progress >= 0.88;

  // Particle positions along the edges:
  const p1X = 120 + (230 - 120) * edge1Progress;
  const p1Y = 140 + (60 - 140) * edge1Progress;

  const p2X = 230 + (350 - 230) * edge2Progress;
  const p2Y = 60 + (160 - 60) * edge2Progress;

  const p3X = 350 + (480 - 350) * edge3Progress;
  const p3Y = 160 + (60 - 160) * edge3Progress;

  const p4X = 480 + (550 - 480) * edge4Progress;
  const p4Y = 60 + (170 - 60) * edge4Progress;

  return (
    <div
      style={{
        backgroundColor: tokens.surfaceCard,
        borderRadius: 14,
        border: `1.5px solid ${tokens.cyberAccent}66`,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        height,
        boxSizing: "border-box",
        boxShadow: `0 16px 40px rgba(0, 0, 0, 0.7), 0 0 25px ${tokens.cyberAccentGlow}`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Topology Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: tokens.cyberAccent }}>
          <Network size={16} />
          <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.06em", color: "#FFFFFF" }}>
            LIVE AD PIVOTING TOPOLOGY GRAPH
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 9,
              fontFamily: "monospace",
              fontWeight: 800,
              backgroundColor: isDc01Pwned ? "rgba(239, 68, 68, 0.25)" : tokens.cyberAccentBg,
              color: isDc01Pwned ? "#F87171" : tokens.cyberAccent,
              border: `1px solid ${isDc01Pwned ? "#EF4444" : tokens.cyberAccent}66`,
              padding: "2px 8px",
              borderRadius: 6,
            }}
          >
            {isDc01Pwned ? "DOMAIN COMPROMISED // 100 PTS" : "4 ACTIVE PIVOT TUNNELS"}
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              color: tokens.textMuted,
              border: `1px solid ${tokens.borderSubtle}`,
              padding: "2px 7px",
              borderRadius: 6,
            }}
          >
            SUGIYAMA-LITE
          </span>
        </div>
      </div>

      {/* SVG Canvas (Unified 700 x 240) */}
      <div style={{ position: "relative", flex: 1, minHeight: 200, overflow: "hidden" }}>
        <svg width="100%" height="100%" viewBox="0 0 700 240" style={{ position: "absolute", inset: 0 }}>
          {/* Subtle Grid Lines in SVG */}
          <defs>
            <pattern id="svgGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="rgba(56, 189, 248, 0.12)" />
            </pattern>
            <linearGradient id="edgeGrad1" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="edgeGradAmber" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="edgeGradRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#svgGrid)" />

          {/* Connection Edges with Dynamic Draw */}
          {/* Edge 1: Operator -> WEB01 */}
          <line
            x1="120"
            y1="140"
            x2="230"
            y2="60"
            stroke="url(#edgeGrad1)"
            strokeWidth="3"
            strokeDasharray="6,4"
            opacity={0.3 + edge1Progress * 0.7}
          />
          {/* Edge 2: WEB01 -> CLIENT01 (Ligolo Tunnel) */}
          <line
            x1="230"
            y1="60"
            x2="350"
            y2="160"
            stroke={tokens.cyberAccent}
            strokeWidth="3"
            strokeDasharray="6,4"
            opacity={0.25 + edge2Progress * 0.75}
          />
          {/* Edge 3: CLIENT01 -> MS01 (GPP PrivEsc) */}
          <line
            x1="350"
            y1="160"
            x2="480"
            y2="60"
            stroke="url(#edgeGradAmber)"
            strokeWidth="3"
            strokeDasharray="6,4"
            opacity={0.2 + edge3Progress * 0.8}
          />
          {/* Edge 4: MS01 -> DC01 (DCSync Drsuapi) */}
          <line
            x1="480"
            y1="60"
            x2="550"
            y2="170"
            stroke="url(#edgeGradRed)"
            strokeWidth="3.5"
            opacity={0.2 + edge4Progress * 0.8}
          />

          {/* Active Flowing Tracers */}
          {edge1Progress > 0 && (
            <circle cx={p1X} cy={p1Y} r="5" fill="#38BDF8" filter="drop-shadow(0 0 8px #38BDF8)" />
          )}
          {edge2Progress > 0 && (
            <circle cx={p2X} cy={p2Y} r="5" fill="#38BDF8" filter="drop-shadow(0 0 8px #38BDF8)" />
          )}
          {edge3Progress > 0 && (
            <circle cx={p3X} cy={p3Y} r="5" fill="#F59E0B" filter="drop-shadow(0 0 8px #F59E0B)" />
          )}
          {edge4Progress > 0 && (
            <circle cx={p4X} cy={p4Y} r="6" fill="#EF4444" filter="drop-shadow(0 0 10px #EF4444)" />
          )}

          {/* Node 1: OPERATOR / KALI */}
          <foreignObject x="20" y="105" width="145" height="75">
            <div
              style={{
                backgroundColor: tokens.surfaceElevated,
                border: `1.5px solid ${tokens.cyberAccent}`,
                borderRadius: 9,
                padding: "8px 10px",
                fontSize: 10,
                boxShadow: `0 0 16px ${tokens.cyberAccentGlow}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Zap size={11} color={tokens.cyberAccent} />
                <span style={{ fontWeight: 800, color: tokens.cyberAccent }}>OPERATOR</span>
              </div>
              <div style={{ color: "#E2E8F0", fontFamily: "monospace", fontSize: 9, marginTop: 2 }}>
                10.10.14.88
              </div>
              <div style={{ fontSize: 8, color: tokens.textMuted, marginTop: 2 }}>Kali Linux // Attacker</div>
            </div>
          </foreignObject>

          {/* Node 2: WEB01 (Foothold RCE) */}
          <foreignObject x="160" y="25" width="160" height="75">
            <div
              style={{
                backgroundColor: isWeb01Pwned ? "rgba(14, 165, 233, 0.15)" : tokens.surfaceElevated,
                border: isWeb01Pwned ? `2px solid ${tokens.cyberAccent}` : `1px solid ${tokens.borderSubtle}`,
                borderRadius: 9,
                padding: "8px 10px",
                fontSize: 10,
                boxShadow: isWeb01Pwned ? `0 0 20px ${tokens.cyberAccentGlow}` : "none",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: isWeb01Pwned ? tokens.cyberAccent : tokens.textPrimary }}>
                  WEB01 {isWeb01Pwned ? "[PWNED ✓]" : ""}
                </span>
                <span
                  style={{
                    fontSize: 8,
                    backgroundColor: isWeb01Pwned ? tokens.cyberAccent : "rgba(255,255,255,0.1)",
                    color: isWeb01Pwned ? "#000000" : "#FFFFFF",
                    fontWeight: 800,
                    padding: "1px 4px",
                    borderRadius: 3,
                  }}
                >
                  RCE
                </span>
              </div>
              <div style={{ color: "#CBD5E1", fontFamily: "monospace", fontSize: 9, marginTop: 2 }}>
                192.168.10.15 · Linux
              </div>
              <div style={{ fontSize: 8, color: isWeb01Pwned ? tokens.cyberAccent : tokens.textMuted, marginTop: 2 }}>
                CVE-2023-27163 Foothold
              </div>
            </div>
          </foreignObject>

          {/* Node 3: CLIENT01 (Pivot) */}
          <foreignObject x="280" y="125" width="155" height="75">
            <div
              style={{
                backgroundColor: isClient01Pivoted ? "rgba(56, 189, 248, 0.12)" : tokens.surfaceElevated,
                border: isClient01Pivoted ? `1.5px solid ${tokens.cyberAccent}` : `1px solid ${tokens.borderSubtle}`,
                borderRadius: 9,
                padding: "8px 10px",
                fontSize: 10,
                boxShadow: isClient01Pivoted ? `0 0 16px ${tokens.cyberAccentGlow}` : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: tokens.textPrimary }}>CLIENT01</span>
                <span style={{ fontSize: 8, color: tokens.cyberAccent, fontWeight: 700 }}>PIVOT</span>
              </div>
              <div style={{ color: tokens.cyberAccent, fontFamily: "monospace", fontSize: 9, marginTop: 2 }}>
                Ligolo-ng :11601
              </div>
              <div style={{ fontSize: 8, color: tokens.textMuted, marginTop: 2 }}>Internal Subnet Route</div>
            </div>
          </foreignObject>

          {/* Node 4: MS01 (Member Server GPP PrivEsc) */}
          <foreignObject x="410" y="25" width="165" height="75">
            <div
              style={{
                backgroundColor: isMs01Compromised ? "rgba(245, 158, 11, 0.18)" : tokens.surfaceElevated,
                border: isMs01Compromised ? "1.5px solid #F59E0B" : `1px solid ${tokens.borderSubtle}`,
                borderRadius: 9,
                padding: "8px 10px",
                fontSize: 10,
                boxShadow: isMs01Compromised ? "0 0 18px rgba(245, 158, 11, 0.35)" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 800, color: isMs01Compromised ? "#FBBF24" : tokens.textPrimary }}>
                  MS01 {isMs01Compromised ? "[GPP ✓]" : ""}
                </span>
                <span
                  style={{
                    fontSize: 8,
                    backgroundColor: isMs01Compromised ? "#F59E0B" : "rgba(255,255,255,0.1)",
                    color: "#000000",
                    fontWeight: 800,
                    padding: "1px 4px",
                    borderRadius: 3,
                  }}
                >
                  20 PTS
                </span>
              </div>
              <div style={{ color: isMs01Compromised ? "#FDE68A" : tokens.textMuted, fontFamily: "monospace", fontSize: 9, marginTop: 2 }}>
                192.168.10.12 · WinSrv
              </div>
              <div style={{ fontSize: 8, color: "#FBBF24", marginTop: 2 }}>cpassword Decrypted</div>
            </div>
          </foreignObject>

          {/* Node 5: DC01 (Domain Controller DOMAIN ROOT) */}
          <foreignObject x="470" y="130" width="215" height="90">
            <div
              style={{
                backgroundColor: isDc01Pwned ? "rgba(239, 68, 68, 0.22)" : tokens.surfaceElevated,
                border: isDc01Pwned ? "2px solid #EF4444" : `1px solid ${tokens.borderSubtle}`,
                borderRadius: 9,
                padding: "8px 12px",
                fontSize: 10,
                boxShadow: isDc01Pwned ? "0 0 30px rgba(239, 68, 68, 0.6)" : "none",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 900, color: isDc01Pwned ? "#FCA5A5" : tokens.textPrimary }}>
                  DC01 (DOMAIN ROOT)
                </span>
                <span
                  style={{
                    fontSize: 9,
                    backgroundColor: isDc01Pwned ? "#EF4444" : "rgba(239,68,68,0.2)",
                    color: "#FFFFFF",
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontWeight: 800,
                  }}
                >
                  40 PTS
                </span>
              </div>
              <div style={{ color: "#FECACA", fontFamily: "monospace", fontSize: 9, marginTop: 3 }}>
                192.168.10.10 · DA Privileged
              </div>
              <div style={{ fontSize: 8, color: "#F87171", marginTop: 4, fontWeight: 700 }}>
                {isDc01Pwned
                  ? "PWNED: DCSync (drsuapi) -> krbtgt Dumped!"
                  : "TARGET: DCSync -> Domain Compromise"}
              </div>
            </div>
          </foreignObject>
        </svg>
      </div>

      {/* Bottom Pivot Telemetry Strip */}
      <div
        style={{
          height: 32,
          backgroundColor: tokens.surfaceSunken,
          borderTop: `1px solid ${tokens.borderSubtle}`,
          padding: "0 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 9,
          fontFamily: "monospace",
          color: tokens.textMuted,
          borderRadius: 8,
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ color: "#38bdf8", fontWeight: 700 }}>SSH :22</span>
          <span>•</span>
          <span style={{ color: "#38bdf8", fontWeight: 700 }}>chisel :8000</span>
          <span>•</span>
          <span style={{ color: "#38bdf8", fontWeight: 700 }}>ligolo-ng :11601</span>
        </div>
        <span style={{ color: tokens.cyberAccent, fontWeight: 800 }}>
          {isDc01Pwned ? "AD EXAM REQUIREMENT: 100/100 PTS ACHIEVED" : "Tunnel Latency: 12ms · Zero Jitter"}
        </span>
      </div>
    </div>
  );
};

export interface AttackGraphShowcaseProps {
  progress: number;
  themePreset?: ThemePreset;
  variant?: "full" | "topologyOnly";
}

export const AttackGraphShowcase: React.FC<AttackGraphShowcaseProps> = ({
  progress,
  themePreset = "oled",
  variant = "full",
}) => {
  const tokens = THEME_PRESETS[themePreset];

  if (variant === "topologyOnly") {
    return <AttackGraphTopology progress={progress} themePreset={themePreset} />;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        gap: 16,
        height: "100%",
      }}
    >
      {/* Left: Dynamic Interactive Network Topology Attack Graph */}
      <AttackGraphTopology progress={progress} themePreset={themePreset} />

      {/* Right: Encrypted Evidence Vault & Report Checklist */}
      <div
        style={{
          backgroundColor: tokens.surfaceCard,
          borderRadius: 14,
          border: "1.5px solid rgba(236, 72, 153, 0.35)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(236, 72, 153, 0.15)",
        }}
      >
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#EC4899" }}>
              <Shield size={16} />
              <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.06em", color: "#FFFFFF" }}>
                ENCRYPTED EVIDENCE VAULT
              </span>
            </div>
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                backgroundColor: "rgba(236, 72, 153, 0.15)",
                color: "#F472B6",
                border: "1px solid rgba(236, 72, 153, 0.35)",
                padding: "2px 8px",
                borderRadius: 6,
                fontFamily: "monospace",
              }}
            >
              AES-GCM-256 LOCAL
            </span>
          </div>

          {/* Finding Card */}
          <div
            style={{
              backgroundColor: tokens.surfaceElevated,
              border: `1px solid ${tokens.borderSubtle}`,
              borderRadius: 9,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: tokens.textPrimary }}>
                Unconstrained Delegation to DC
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 900,
                  backgroundColor: "rgba(239, 68, 68, 0.25)",
                  color: "#EF4444",
                  padding: "2px 7px",
                  borderRadius: 4,
                }}
              >
                CRITICAL 9.8
              </span>
            </div>

            <div style={{ fontSize: 9, fontFamily: "monospace", color: tokens.textMuted }}>
              CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:C/C:H/I:H/A:H
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: tokens.surfaceSunken,
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 9,
                color: tokens.cyberAccent,
                fontFamily: "monospace",
              }}
            >
              <FileText size={12} />
              <span>proof-dc01-flag.txt (Encrypted Hash verified)</span>
            </div>
          </div>
        </div>

        {/* Exam Compliance Status */}
        <div
          style={{
            backgroundColor: tokens.cyberAccentBg,
            border: `1px solid ${tokens.cyberAccent}55`,
            borderRadius: 9,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: tokens.cyberAccent, fontWeight: 800 }}>
            <CheckCircle2 size={14} color={tokens.cyberAccent} />
            <span>OffSec / CPTS Report Checklist</span>
          </div>
          <span style={{ fontSize: 9, color: tokens.textPrimary, fontFamily: "monospace", fontWeight: 800 }}>
            100% READY
          </span>
        </div>
      </div>
    </div>
  );
};

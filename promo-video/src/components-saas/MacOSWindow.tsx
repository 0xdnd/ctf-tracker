import React from "react";
import { Lock, Shield } from "lucide-react";

interface MacOSWindowProps {
  title?: string;
  url?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const MacOSWindow: React.FC<MacOSWindowProps> = ({
  title = "ZeroBox — Offensive Security & CTF Tracker",
  url = "0xdnd.github.io/ctf-tracker",
  children,
  style,
}) => {
  return (
    <div
      title={title}
      style={{
        backgroundColor: "#0D111A",
        borderRadius: 20,
        border: "1px solid rgba(255, 255, 255, 0.12)",
        boxShadow: "0 35px 80px -15px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.05)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {/* Title Bar */}
      <div
        style={{
          height: 48,
          backgroundColor: "#131824",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          userSelect: "none",
        }}
      >
        {/* macOS Traffic Lights */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#FF5F56" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#FFBD2E" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: "#27C93F" }} />
        </div>

        {/* Minimalist URL Pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            backgroundColor: "rgba(255, 255, 255, 0.06)",
            padding: "5px 18px",
            borderRadius: 20,
            border: "1px solid rgba(255, 255, 255, 0.08)",
            fontFamily: "Inter, -apple-system, sans-serif",
            fontSize: 12,
            color: "#94A3B8",
          }}
        >
          <Lock size={12} color="#10B981" />
          <span style={{ color: "#F8FAFC", fontWeight: 500 }}>{url}</span>
        </div>

        {/* Status / App Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              fontFamily: "Inter, -apple-system, sans-serif",
              color: "#34D399",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              padding: "3px 10px",
              borderRadius: 12,
              fontWeight: 600,
            }}
          >
            <Shield size={11} /> v2.0
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
};

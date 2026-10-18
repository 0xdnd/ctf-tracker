import React from "react";
import { theme } from "../styles/theme";

interface TerminalWindowProps {
  title?: string;
  statusBadge?: string;
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  borderColor?: string;
  glowColor?: string;
  style?: React.CSSProperties;
}

export const TerminalWindow: React.FC<TerminalWindowProps> = ({
  title = "root@zerobox: ~",
  statusBadge,
  children,
  width = "100%",
  height,
  borderColor = theme.colors.borderHighlight,
  glowColor,
  style,
}) => {
  return (
    <div
      style={{
        width,
        height,
        backgroundColor: "rgba(11, 15, 25, 0.94)",
        borderRadius: 12,
        border: `1px solid ${borderColor}`,
        boxShadow: glowColor
          ? `0 0 35px ${glowColor}, 0 20px 40px rgba(0,0,0,0.85)`
          : theme.shadows.card,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        backdropFilter: "blur(12px)",
        ...style,
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          backgroundColor: "rgba(17, 24, 39, 0.9)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              backgroundColor: theme.colors.crimson,
            }}
          />
          <div
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              backgroundColor: theme.colors.amber,
            }}
          />
          <div
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              backgroundColor: theme.colors.emerald,
            }}
          />
          <span
            style={{
              marginLeft: 14,
              fontFamily: theme.fonts.mono,
              fontSize: 13,
              fontWeight: 600,
              color: theme.colors.textMuted,
              letterSpacing: 1,
            }}
          >
            {title}
          </span>
        </div>

        {statusBadge && (
          <div
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 6,
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              color: theme.colors.emeraldBright,
              border: `1px solid ${theme.colors.borderHighlight}`,
              letterSpacing: 1,
            }}
          >
            {statusBadge}
          </div>
        )}
      </div>

      {/* Terminal Content */}
      <div
        style={{
          padding: 24,
          flex: 1,
          fontFamily: theme.fonts.mono,
          color: theme.colors.textWhite,
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
};

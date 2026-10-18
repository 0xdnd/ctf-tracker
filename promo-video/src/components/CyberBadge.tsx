import React from "react";
import { theme } from "../styles/theme";

interface CyberBadgeProps {
  label: string;
  variant?: "emerald" | "crimson" | "cyan" | "purple" | "amber" | "slate";
  icon?: React.ReactNode;
  fontSize?: number;
  glow?: boolean;
}

export const CyberBadge: React.FC<CyberBadgeProps> = ({
  label,
  variant = "emerald",
  icon,
  fontSize = 13,
  glow = false,
}) => {
  const colorMap = {
    emerald: {
      color: theme.colors.emeraldBright,
      bg: "rgba(16, 185, 129, 0.12)",
      border: "rgba(16, 185, 129, 0.4)",
      glow: theme.shadows.glowEmerald,
    },
    crimson: {
      color: theme.colors.crimsonBright,
      bg: "rgba(239, 68, 68, 0.12)",
      border: "rgba(239, 68, 68, 0.4)",
      glow: theme.shadows.glowCrimson,
    },
    cyan: {
      color: theme.colors.cyanBright,
      bg: "rgba(6, 182, 212, 0.12)",
      border: "rgba(6, 182, 212, 0.4)",
      glow: theme.shadows.glowCyan,
    },
    purple: {
      color: theme.colors.purpleBright,
      bg: "rgba(139, 92, 246, 0.12)",
      border: "rgba(139, 92, 246, 0.4)",
      glow: theme.shadows.glowPurple,
    },
    amber: {
      color: theme.colors.amberBright,
      bg: "rgba(245, 158, 11, 0.12)",
      border: "rgba(245, 158, 11, 0.4)",
      glow: theme.shadows.glowAmber,
    },
    slate: {
      color: theme.colors.textMuted,
      bg: "rgba(100, 116, 139, 0.12)",
      border: "rgba(100, 116, 139, 0.3)",
      glow: "none",
    },
  };

  const current = colorMap[variant];

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 6,
        backgroundColor: current.bg,
        border: `1px solid ${current.border}`,
        boxShadow: glow ? current.glow : "none",
        fontFamily: theme.fonts.mono,
        fontSize,
        fontWeight: 600,
        color: current.color,
        letterSpacing: 0.5,
        userSelect: "none",
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
};

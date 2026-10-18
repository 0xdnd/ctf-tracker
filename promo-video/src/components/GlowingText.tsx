import React from "react";
import { theme } from "../styles/theme";

interface GlowingTextProps {
  children: React.ReactNode;
  color?: string;
  glowColor?: string;
  fontSize?: number;
  fontWeight?: number | string;
  fontFamily?: string;
  letterSpacing?: number;
  gradient?: string;
  style?: React.CSSProperties;
}

export const GlowingText: React.FC<GlowingTextProps> = ({
  children,
  color = theme.colors.emeraldBright,
  glowColor = "rgba(16, 185, 129, 0.6)",
  fontSize = 32,
  fontWeight = 700,
  fontFamily = theme.fonts.sans,
  letterSpacing = 0,
  gradient,
  style,
}) => {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize,
        fontWeight,
        fontFamily,
        letterSpacing,
        color: gradient ? "transparent" : color,
        backgroundImage: gradient,
        WebkitBackgroundClip: gradient ? "text" : undefined,
        backgroundClip: gradient ? "text" : undefined,
        textShadow: glowColor ? `0 0 20px ${glowColor}, 0 0 40px ${glowColor}` : undefined,
        ...style,
      }}
    >
      {children}
    </span>
  );
};

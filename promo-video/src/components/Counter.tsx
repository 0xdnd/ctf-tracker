import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { theme } from "../styles/theme";

interface CounterProps {
  from?: number;
  to: number;
  startFrame?: number;
  endFrame?: number;
  prefix?: string;
  suffix?: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
}

export const Counter: React.FC<CounterProps> = ({
  from = 0,
  to,
  startFrame = 0,
  endFrame = 60,
  prefix = "",
  suffix = "",
  fontSize = 64,
  color = theme.colors.emeraldBright,
  fontFamily = theme.fonts.mono,
}) => {
  const frame = useCurrentFrame();

  const rawValue = interpolate(frame, [startFrame, endFrame], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const value = Math.round(rawValue);

  return (
    <span
      style={{
        fontFamily,
        fontSize,
        fontWeight: 800,
        color,
        letterSpacing: -1,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
};

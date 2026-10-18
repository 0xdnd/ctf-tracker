import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";

export const RadiantBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();

  // Floating gradient orb 1
  const orb1X = interpolate(Math.sin((frame / 60) * Math.PI), [-1, 1], [15, 35]);
  const orb1Y = interpolate(Math.cos((frame / 75) * Math.PI), [-1, 1], [10, 30]);

  // Floating gradient orb 2
  const orb2X = interpolate(Math.cos((frame / 65) * Math.PI), [-1, 1], [65, 85]);
  const orb2Y = interpolate(Math.sin((frame / 80) * Math.PI), [-1, 1], [55, 75]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#070A12",
        overflow: "hidden",
      }}
    >
      {/* Orb 1: Indigo / Violet Glow */}
      <div
        style={{
          position: "absolute",
          left: `${orb1X}%`,
          top: `${orb1Y}%`,
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 70%)",
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      {/* Orb 2: Cyan / Emerald Glow */}
      <div
        style={{
          position: "absolute",
          left: `${orb2X}%`,
          top: `${orb2Y}%`,
          width: 750,
          height: 750,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, rgba(16, 185, 129, 0.04) 50%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      {/* Subtle modern dot matrix pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.45,
          pointerEvents: "none",
        }}
      />

      {children}
    </AbsoluteFill>
  );
};

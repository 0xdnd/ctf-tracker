import React from "react";
import { Shield, Crosshair } from "lucide-react";
import { interpolate, spring, useVideoConfig, Img, staticFile } from "remotion";

interface CinematicColdOpenProps {
  frame: number;
}

export const CinematicColdOpen: React.FC<CinematicColdOpenProps> = ({ frame }) => {
  const { fps } = useVideoConfig();

  // Normalize frame to 30fps standard timing so it runs identically at 60fps
  const normalizedFrame = (frame * 30) / fps;

  // Active during frames 0 to 82 @ 30fps (0.0s to 2.73s)
  if (normalizedFrame > 82) return null;

  // Entrance spring (frames 0 to 45)
  const enterSpring = spring({
    frame: normalizedFrame,
    fps: 30,
    config: { damping: 13, stiffness: 65, mass: 1 },
  });

  // Scale: starts at 0.82, smoothly rises to 1.05
  const badgeScale = interpolate(enterSpring, [0, 1], [0.82, 1.05]);

  // Warp Exit transition into the desktop (frames 60 to 82)
  const exitProgress = interpolate(normalizedFrame, [60, 82], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const warpScale = interpolate(exitProgress, [0, 1], [1, 2.5]);
  const warpOpacity = interpolate(exitProgress, [0, 1], [1, 0]);
  const warpBlur = interpolate(exitProgress, [0, 1], [0, 14]);

  // Shimmer streak across the logo
  const shimmerX = interpolate(normalizedFrame, [15, 55], [-180, 260], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Horizon beam expansion
  const beamWidth = interpolate(normalizedFrame, [0, 40], [200, 1400], {
    extrapolateRight: "clamp",
  });
  const beamOpacity = interpolate(normalizedFrame, [0, 20, 60, 80], [0, 0.85, 0.85, 0]);

  // Staggered text entrances
  const titleOpacity = interpolate(normalizedFrame, [8, 24], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(normalizedFrame, [20, 36], [0, 1], { extrapolateRight: "clamp" });
  const pillsOpacity = interpolate(normalizedFrame, [30, 46], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        opacity: warpOpacity,
        transform: `scale(${warpScale})`,
        filter: `blur(${warpBlur}px)`,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Background Cinematic Flare Orbs (OLED Black & Electric Sky Blue) */}
      <div
        style={{
          position: "absolute",
          width: 850,
          height: 850,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 65%)",
          filter: "blur(90px)",
          transform: `scale(${interpolate(normalizedFrame, [0, 75], [0.85, 1.35])})`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 650,
          height: 650,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(14, 165, 233, 0.22) 0%, transparent 65%)",
          filter: "blur(95px)",
          transform: "translate(180px, -60px)",
        }}
      />

      {/* Anamorphic Laser Horizon Beam */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: beamWidth,
          height: 2,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.4) 20%, #38BDF8 50%, rgba(56, 189, 248, 0.4) 80%, transparent 100%)",
          boxShadow: "0 0 25px #38BDF8, 0 0 50px rgba(56, 189, 248, 0.6)",
          opacity: beamOpacity,
        }}
      />

      {/* Cyber Grid Lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(to right, rgba(56, 189, 248, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.05) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          opacity: 0.6,
        }}
      />

      {/* Center Hero Emblem & Typography */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
          transform: `scale(${badgeScale})`,
          textAlign: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Glowing 3D Glass Emblem with Real 3D Open Blue Box */}
        <div
          style={{
            position: "relative",
            width: 130,
            height: 130,
            borderRadius: 36,
            background:
              "linear-gradient(135deg, rgba(56, 189, 248, 0.20) 0%, rgba(14, 165, 233, 0.08) 100%)",
            border: "1.5px solid rgba(56, 189, 248, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow:
              "0 25px 60px rgba(56, 189, 248, 0.35), inset 0 0 25px rgba(56, 189, 248, 0.2)",
            overflow: "hidden",
          }}
        >
          {/* Shimmer flare line */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: 50,
              background:
                "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent)",
              transform: `translateX(${shimmerX}px) skewX(-25deg)`,
            }}
          />

          <Img
            src={staticFile("brand/logo-oled.webp")}
            style={{
              width: 90,
              height: 90,
              objectFit: "contain",
              filter: "drop-shadow(0 0 16px rgba(56, 189, 248, 0.85))",
            }}
          />
        </div>

        {/* Brand Name */}
        <div style={{ opacity: titleOpacity }}>
          <div
            style={{
              fontSize: 78,
              fontWeight: 900,
              letterSpacing: "0.06em",
              color: "#FFFFFF",
              fontFamily: "Inter, -apple-system, sans-serif",
              textShadow: "0 0 40px rgba(56, 189, 248, 0.6)",
              lineHeight: 1,
            }}
          >
            ZEROBOX
          </div>
        </div>

        {/* Punchy Subtitle Hook */}
        <div style={{ opacity: subtitleOpacity }}>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              background: "linear-gradient(90deg, #FFFFFF 0%, #38BDF8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontFamily: "Inter, -apple-system, sans-serif",
            }}
          >
            Tactical CTF & Offensive Security Hub
          </div>
        </div>

        {/* 3 Telemetry Pillars */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 10,
            opacity: pillsOpacity,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: 24,
              padding: "7px 18px",
              fontSize: 13,
              fontWeight: 700,
              color: "#FFFFFF",
              fontFamily: "monospace",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
            }}
          >
            <Crosshair size={15} color="#38BDF8" />
            <span>1005 LABS</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: 24,
              padding: "7px 18px",
              fontSize: 13,
              fontWeight: 700,
              color: "#FFFFFF",
              fontFamily: "monospace",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
            }}
          >
            <Shield size={15} color="#38BDF8" />
            <span>OSCP & CPTS</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(56, 189, 248, 0.4)",
              borderRadius: 24,
              padding: "7px 18px",
              fontSize: 13,
              fontWeight: 700,
              color: "#FFFFFF",
              fontFamily: "monospace",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.4)",
            }}
          >
            <span style={{ color: "#38BDF8" }}>⚡</span>
            <span>OFFLINE-FIRST</span>
          </div>
        </div>
      </div>
    </div>
  );
};

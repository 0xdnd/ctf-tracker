import React from "react";
import { ArrowRight, Shield, Target, Terminal, Sparkles, Star } from "lucide-react";
import { Img, staticFile, interpolate, spring, useVideoConfig } from "remotion";
import { THEME_PRESETS, ThemePreset } from "../styles/theme";

interface GrandFinaleShowcaseProps {
  progress: number; // 0 to 1 progress within Act 6 (29.0s to 35.0s)
  isCtaClicked?: boolean;
  themePreset?: ThemePreset;
}

export const GrandFinaleShowcase: React.FC<GrandFinaleShowcaseProps> = ({
  progress,
  isCtaClicked = false,
  themePreset = "oled",
}) => {
  const { fps } = useVideoConfig();
  const tokens = THEME_PRESETS[themePreset];

  // Master Content Fade
  const contentOpacity = interpolate(progress, [0, 0.12], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Staggered Apple-Grade Spring Entrances
  // 1. Center Hero Device (Dashboard) drops first with authority
  const heroSpring = spring({
    frame: progress * 60,
    fps,
    config: { damping: 14, stiffness: 65, mass: 1 },
  });
  const heroScale = interpolate(heroSpring, [0, 1], [0.88, 1.0]);
  const heroTranslateY = interpolate(heroSpring, [0, 1], [40, 0]);

  // 2. Left Tilted Device (Vault) swings in smoothly
  const leftSpring = spring({
    frame: Math.max(0, (progress - 0.04) * 60),
    fps,
    config: { damping: 15, stiffness: 60, mass: 1 },
  });
  const leftScale = interpolate(leftSpring, [0, 1], [0.85, 1.0]);
  const leftTranslateX = interpolate(leftSpring, [0, 1], [-50, 0]);

  // 3. Right Tilted Device (Exam HUD) swings in smoothly
  const rightSpring = spring({
    frame: Math.max(0, (progress - 0.08) * 60),
    fps,
    config: { damping: 15, stiffness: 60, mass: 1 },
  });
  const rightScale = interpolate(rightSpring, [0, 1], [0.85, 1.0]);
  const rightTranslateX = interpolate(rightSpring, [0, 1], [50, 0]);

  // Subtle floating motion for device cards
  const floatOffset = Math.sin(progress * Math.PI * 2) * 5;

  // CTA button scale based on click
  const ctaScale = isCtaClicked ? 0.96 : 1.0;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width: 1920,
        height: 1080,
        backgroundColor: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "36px 60px",
        overflow: "hidden",
        zIndex: 500,
        opacity: contentOpacity,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* Ambient Volumetric Blue Glows & Vector Floor Grid    */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: "absolute",
          top: -120,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1300,
          height: 650,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(56, 189, 248, 0.25) 0%, transparent 70%)",
          filter: "blur(110px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -150,
          left: "50%",
          transform: "translateX(-50%)",
          width: 1400,
          height: 520,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(14, 165, 233, 0.18) 0%, transparent 70%)",
          filter: "blur(110px)",
          pointerEvents: "none",
        }}
      />

      {/* Cyber Grid Pattern Floor */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(56, 189, 248, 0.14) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          opacity: 0.65,
          pointerEvents: "none",
        }}
      />

      {/* ---------------------------------------------------- */}
      {/* 1. Header: 3D Blue Box Emblem + Keynote Headline     */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 10,
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* 3D Glowing Blue Box Icon */}
        <div
          style={{
            position: "relative",
            width: 96,
            height: 96,
            borderRadius: 26,
            backgroundColor: "rgba(56, 189, 248, 0.12)",
            border: `2px solid ${tokens.cyberAccent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 50px ${tokens.cyberAccentGlow}, inset 0 0 20px rgba(56, 189, 248, 0.3)`,
          }}
        >
          <Img
            src={staticFile("brand/logo-oled.webp")}
            style={{
              width: 78,
              height: 78,
              objectFit: "contain",
              filter: "drop-shadow(0 0 18px rgba(56, 189, 248, 0.95))",
            }}
          />
        </div>

        {/* Master Headline */}
        <div>
          <h1
            style={{
              fontSize: 46,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "#FFFFFF",
              margin: 0,
              textShadow: "0 0 45px rgba(56, 189, 248, 0.55)",
            }}
          >
            Elevate Your Tactical Cyber Operations
          </h1>
          <p
            style={{
              fontSize: 17,
              color: "#94A3B8",
              maxWidth: 820,
              margin: "6px auto 0 auto",
              lineHeight: 1.4,
              fontWeight: 500,
            }}
          >
            1005 Machines Indexed · OSCP & CPTS Pathways · Dynamic RevShell Studio · 100% Offline-First PWA
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. Center: Apple-Grade 3D Multi-Device Hardware Stage */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          perspective: 1400,
          position: "relative",
          zIndex: 10,
          margin: "6px 0",
        }}
      >
        {/* LEFT TILTED HARDWARE: Encrypted Evidence Vault */}
        <div
          style={{
            width: 440,
            transform: `translateX(${leftTranslateX}px) scale(${leftScale}) rotateY(15deg) rotateX(4deg) translateY(${-floatOffset}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Anodized Studio Display Chassis */}
          <div
            style={{
              width: "100%",
              height: 295,
              borderRadius: 20,
              padding: 9,
              background: "linear-gradient(145deg, #1e2633 0%, #0d1218 50%, #161e2a 100%)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Display Glass Bezel */}
            <div
              style={{
                flex: 1,
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: "#05070a",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {/* Window Header */}
              <div
                style={{
                  height: 26,
                  backgroundColor: "#090d14",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 10px",
                  fontSize: 10,
                  fontWeight: 800,
                  color: tokens.cyberAccent,
                }}
              >
                <span>ENCRYPTED EVIDENCE VAULT (AES-256)</span>
                <Shield size={12} color={tokens.cyberAccent} />
              </div>
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <Img
                  src={staticFile("images/landing/vault-1350.webp")}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {/* Diagonal Specular Sheen */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 60%)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CENTER HERO HARDWARE: MacBook Pro Cockpit */}
        <div
          style={{
            width: 730,
            transform: `translateY(${heroTranslateY + floatOffset}px) scale(${heroScale})`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 20,
          }}
        >
          {/* MacBook Pro Display Enclosure */}
          <div
            style={{
              width: "100%",
              height: 385,
              borderRadius: 22,
              padding: 10,
              background: "linear-gradient(145deg, #222c3d 0%, #0d1218 50%, #1a2230 100%)",
              boxShadow: `0 35px 90px rgba(0, 0, 0, 0.95), 0 0 50px ${tokens.cyberAccentGlow}, inset 0 1px 1px rgba(255, 255, 255, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)`,
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            {/* Top Bezel Notch / Camera Pill */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: "50%",
                transform: "translateX(-50%)",
                width: 70,
                height: 9,
                backgroundColor: "#080b10",
                borderRadius: "0 0 6px 6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 30,
                boxShadow: "0 1px 3px rgba(0,0,0,0.8)",
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: "#030406",
                  border: "1px solid #1e293b",
                  boxShadow: `0 0 5px ${tokens.cyberAccent}`,
                }}
              />
            </div>

            {/* Retina OLED Screen Display */}
            <div
              style={{
                flex: 1,
                borderRadius: 14,
                overflow: "hidden",
                backgroundColor: "#000000",
                border: `1.5px solid ${tokens.cyberAccent}`,
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {/* Chrome Top Bar */}
              <div
                style={{
                  height: 30,
                  backgroundColor: "#080b10",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 14px",
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#FFFFFF",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: tokens.cyberAccent,
                      boxShadow: `0 0 6px ${tokens.cyberAccent}`,
                    }}
                  />
                  <span>ZEROBOX OPERATIONAL DASHBOARD</span>
                </div>
                <span style={{ fontSize: 10, color: tokens.cyberAccent, fontFamily: "monospace", fontWeight: 700 }}>
                  100% OFFLINE PWA
                </span>
              </div>

              {/* Display Content Image */}
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <Img
                  src={staticFile("images/landing/hero-app-1575.webp")}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {/* Diagonal Specular Sheen */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(130deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.03) 35%, transparent 60%)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Precision MacBook Aluminum Bottom Chassis & Thumb Notch */}
          <div
            style={{
              width: 760,
              height: 14,
              borderRadius: "0 0 14px 14px",
              background: "linear-gradient(180deg, #1b232f 0%, #0d1219 100%)",
              boxShadow: "0 18px 40px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
            }}
          >
            {/* Display Open Thumb Groove */}
            <div
              style={{
                width: 96,
                height: 4,
                backgroundColor: "#06090e",
                borderRadius: "0 0 5px 5px",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.8)",
              }}
            />
          </div>
        </div>

        {/* RIGHT TILTED HARDWARE: 24h CPTS Exam Simulator */}
        <div
          style={{
            width: 440,
            transform: `translateX(${rightTranslateX}px) scale(${rightScale}) rotateY(-15deg) rotateX(4deg) translateY(${-floatOffset}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Anodized Studio Display Chassis */}
          <div
            style={{
              width: "100%",
              height: 295,
              borderRadius: 20,
              padding: 9,
              background: "linear-gradient(145deg, #1e2633 0%, #0d1218 50%, #161e2a 100%)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.08)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Display Glass Bezel */}
            <div
              style={{
                flex: 1,
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: "#05070a",
                border: "1px solid rgba(236, 72, 153, 0.35)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {/* Window Header */}
              <div
                style={{
                  height: 26,
                  backgroundColor: "#090d14",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0 10px",
                  fontSize: 10,
                  fontWeight: 800,
                  color: "#EC4899",
                }}
              >
                <span>24H CPTS / OSCP EXAM SIMULATOR</span>
                <Target size={12} color="#EC4899" />
              </div>
              <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <Img
                  src={staticFile("images/landing/exam-2226.webp")}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {/* Diagonal Specular Sheen */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 60%)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. Footer: Feature Pills, Master CTA & Credits       */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* 4 Core Pillars */}
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { label: "100% Offline-First PWA", icon: Shield, color: tokens.cyberAccent },
            { label: "1005 Machines Indexed", icon: Target, color: "#F59E0B" },
            { label: "Dynamic RevShell Generator", icon: Terminal, color: tokens.borderAccent },
            { label: "Offline Evidence Vault", icon: Sparkles, color: "#10B981" },
          ].map((pill, idx) => {
            const Icon = pill.icon;
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  padding: "6px 16px",
                  borderRadius: 24,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)",
                }}
              >
                <Icon size={14} color={pill.color} />
                <span>{pill.label}</span>
              </div>
            );
          })}
        </div>

        {/* Master Call To Action Button (Deterministic Click Animation) */}
        <div
          id="cta-launch-button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            backgroundColor: tokens.cyberAccent,
            color: tokens.accentFg,
            fontWeight: 900,
            fontSize: 17,
            padding: "14px 40px",
            borderRadius: 14,
            boxShadow: isCtaClicked
              ? `0 2px 15px ${tokens.cyberAccentGlow}`
              : `0 10px 45px ${tokens.cyberAccentGlow}, 0 0 25px ${tokens.cyberAccentGlow}`,
            transform: `scale(${ctaScale})`,
            cursor: "pointer",
          }}
        >
          <span>Launch Free Now ➔ 0xdnd.github.io/ctf-tracker</span>
          <ArrowRight size={20} />
        </div>

        {/* Trust Badges & Daniel Dayan Credit */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: "#94A3B8",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "5px 14px",
              borderRadius: 20,
            }}
          >
            <Star size={13} color="#F59E0B" fill="#F59E0B" />
            <span>Star on GitHub // 0xdnd/ctf-tracker</span>
          </div>

          <div
            style={{
              color: tokens.cyberAccent,
              fontWeight: 800,
              backgroundColor: tokens.cyberAccentBg,
              border: `1px solid ${tokens.cyberAccent}55`,
              padding: "5px 14px",
              borderRadius: 20,
            }}
          >
            Crafted with Passion by Daniel Dayan (@0xdnd)
          </div>
        </div>
      </div>
    </div>
  );
};

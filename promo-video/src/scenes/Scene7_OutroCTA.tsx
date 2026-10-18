import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import {
  Globe,
  Star,
  Zap,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { theme } from "../styles/theme";
import { TacticalHUD } from "../components/TacticalHUD";
import { GlowingText } from "../components/GlowingText";
import { CyberBadge } from "../components/CyberBadge";

const GithubIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 20,
  color = "#FFFFFF",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export const Scene7_OutroCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring
  const heroSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  // Pulse animation for the glowing URL box
  const pulseScale = interpolate(
    Math.sin((frame / 12) * Math.PI),
    [-1, 1],
    [0.98, 1.02]
  );

  // Cinematic phosphor collapse at the end (frames 120-140)
  const collapseScaleY = interpolate(frame, [125, 140], [1, 0.005], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const collapseScaleX = interpolate(frame, [135, 140], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const collapseOpacity = interpolate(frame, [130, 140], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bgDark,
        transform: `scaleY(${collapseScaleY}) scaleX(${collapseScaleX})`,
        opacity: collapseOpacity,
        overflow: "hidden",
      }}
    >
      <TacticalHUD sceneTitle="STAGE 07 // DEPLOYMENT & OPEN-SOURCE" />

      {/* Cyber Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(rgba(16, 185, 129, 0.15) 1px, transparent 1px)`,
          backgroundSize: "36px 36px",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          transform: `scale(${heroSpring})`,
          zIndex: 10,
        }}
      >
        {/* Top Tech Badge */}
        <div style={{ marginBottom: 18 }}>
          <CyberBadge
            label="100% FREE & OPEN-SOURCE CTF PLATFORM"
            variant="emerald"
            glow
            icon={<ShieldCheck size={16} />}
            fontSize={14}
          />
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 20,
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              border: `2px solid ${theme.colors.emerald}`,
              boxShadow: theme.shadows.glowEmerald,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: 8,
            }}
          >
            <Img
              src={staticFile("logo-zerobox.png")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                filter: "drop-shadow(0 0 12px rgba(16, 185, 129, 0.8))",
              }}
            />
          </div>

          <GlowingText
            fontSize={88}
            fontWeight={900}
            letterSpacing={-2}
            fontFamily={theme.fonts.cyber}
            gradient="linear-gradient(135deg, #FFFFFF 30%, #34D399 70%, #06B6D4 100%)"
            glowColor="rgba(16, 185, 129, 0.6)"
          >
            ZEROBOX
          </GlowingText>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 2,
            color: theme.colors.textMuted,
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          Tactical Cybersecurity Lab &amp; Operations Dashboard
        </div>

        {/* 3 Architecture Pillar Badges */}
        <div style={{ display: "flex", gap: 16, marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 8,
              backgroundColor: "rgba(19, 28, 46, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontFamily: theme.fonts.mono,
              fontSize: 13,
              color: theme.colors.textWhite,
            }}
          >
            <Zap size={16} color={theme.colors.emeraldBright} />
            <span>100% Client-Side // Offline-First</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 8,
              backgroundColor: "rgba(19, 28, 46, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontFamily: theme.fonts.mono,
              fontSize: 13,
              color: theme.colors.textWhite,
            }}
          >
            <Zap size={16} color={theme.colors.cyanBright} />
            <span>Zero Backend // Instant Ctrl+K Search</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 8,
              backgroundColor: "rgba(19, 28, 46, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontFamily: theme.fonts.mono,
              fontSize: 13,
              color: theme.colors.textWhite,
            }}
          >
            <Zap size={16} color={theme.colors.purpleBright} />
            <span>543 HTB + 462 THM Labs Ready</span>
          </div>
        </div>

        {/* Primary Glowing URL Box */}
        <div
          style={{
            transform: `scale(${pulseScale})`,
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "20px 48px",
            borderRadius: 16,
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            border: `2px solid ${theme.colors.emeraldBright}`,
            boxShadow: theme.shadows.glowEmerald,
            marginBottom: 28,
          }}
        >
          <Globe size={32} color={theme.colors.emeraldBright} />
          <span
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 40,
              fontWeight: 800,
              color: theme.colors.textWhite,
              letterSpacing: 1,
            }}
          >
            0xdnd.github.io/ctf-tracker
          </span>
          <ExternalLink size={28} color={theme.colors.emeraldBright} />
        </div>

        {/* GitHub Star & Creator attribution */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              borderRadius: 10,
              backgroundColor: "rgba(17, 24, 39, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              fontFamily: theme.fonts.mono,
              fontSize: 15,
            }}
          >
            <GithubIcon size={20} color={theme.colors.textWhite} />
            <span style={{ color: theme.colors.textWhite }}>github.com/0xdnd/ctf-tracker</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                borderRadius: 6,
                backgroundColor: "rgba(245, 158, 11, 0.2)",
                color: theme.colors.amberBright,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              <Star size={14} fill={theme.colors.amberBright} />
              <span>STAR REPO</span>
            </div>
          </div>

          <div
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 16,
              color: theme.colors.textMuted,
            }}
          >
            ENGINEERED BY{" "}
            <span style={{ color: theme.colors.amberBright, fontWeight: 700 }}>
              DANIEL DAYAN (@0xdnd)
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

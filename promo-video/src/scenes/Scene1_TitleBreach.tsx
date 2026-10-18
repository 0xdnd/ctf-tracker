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
  Shield,
  Crosshair,
  Zap,
  Cpu,
  Terminal,
  Activity,
  Radio,
  Lock,
  Unlock,
} from "lucide-react";
import { theme } from "../styles/theme";
import { TacticalHUD } from "../components/TacticalHUD";
import { GlowingText } from "../components/GlowingText";
import { CyberBadge } from "../components/CyberBadge";

export const Scene1_TitleBreach: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ---------------------------------------------------------
  // TIMING ARCHITECTURE (Synced to cyber-soundtrack-stealth)
  // Frames 0 - 30 (0.0s - 1.0s): Atmospheric Recon & Lock-On
  // Frame 30 (1.0s): Sub-bass Drop / Shockwave & Logo Slam
  // Frames 32 - 70 (1.0s - 2.3s): Brand Title & Subtitle
  // Frames 68 - 135 (2.3s - 4.5s): 4 Staggered Tactical Capability Cards
  // Frames 135 - 150 (4.5s - 5.0s): Warp Transition into Stage 02
  // ---------------------------------------------------------

  // Phase 1 Boot lines (0 - 30f)
  const bootLines = [
    { frame: 2, text: "[00:00:01] INITIALIZING KERNEL: ZEROBOX v2.0.4-TACTICAL" },
    { frame: 9, text: "[00:00:08] INDEXING OFFENSIVE LABS: HTB (543) + THM (462)" },
    { frame: 16, text: "[00:00:15] TARGET ACQUIRED: 0xdnd/ctf-tracker" },
    { frame: 23, text: "[00:00:22] BYPASSING GUARDS -> INJECTING EXPLOIT CHAIN" },
  ];

  // Target cipher decoding text
  const cipherHex = [
    "7F 45 4C 46 02 01 01 00",
    "48 83 EC 28 48 89 5C 24",
    "E8 A0 FF FF FF 48 8B 05",
    "0F 05 48 3D 00 F0 FF FF",
  ];
  const activeCipher = cipherHex[Math.floor(frame / 3) % cipherHex.length];

  // Radar reticle rotation & scaling before drop
  const reticleRot = interpolate(frame, [0, 150], [0, 180]);
  const reticleScale = interpolate(frame, [0, 30], [1.4, 0.95], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const reticleOpacity = interpolate(frame, [0, 10, 30, 45], [0, 1, 1, 0.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Shockwave blast at frame 30 (The Drop)
  const shockwaveProgress = interpolate(frame, [30, 56], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shockwaveScale = interpolate(shockwaveProgress, [0, 1], [0.1, 2.6]);
  const shockwaveOpacity = interpolate(shockwaveProgress, [0, 0.2, 1], [0, 0.85, 0]);

  // Secondary shockwave
  const shockwave2Progress = interpolate(frame, [33, 62], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shockwave2Scale = interpolate(shockwave2Progress, [0, 1], [0.1, 2.2]);
  const shockwave2Opacity = interpolate(shockwave2Progress, [0, 0.2, 1], [0, 0.6, 0]);

  // Flash impact at frame 30
  const impactFlash = interpolate(frame, [30, 33, 40], [0, 0.35, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Hero Logo spring entrance (Starts frame 30)
  const logoSpring = spring({
    frame: frame - 30,
    fps,
    config: { damping: 12, stiffness: 120, mass: 0.6 },
  });
  const heroOpacity = interpolate(frame, [30, 38], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Title & Subtitle entrance
  const titleY = interpolate(frame, [30, 44], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subTitleSpring = spring({
    frame: frame - 40,
    fps,
    config: { damping: 15, stiffness: 100 },
  });
  const authorSpring = spring({
    frame: frame - 48,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  // 4 Capability cards staggered entrances
  const cardSprings = [
    spring({ frame: frame - 65, fps, config: { damping: 14, stiffness: 110 } }),
    spring({ frame: frame - 74, fps, config: { damping: 14, stiffness: 110 } }),
    spring({ frame: frame - 83, fps, config: { damping: 14, stiffness: 110 } }),
    spring({ frame: frame - 92, fps, config: { damping: 14, stiffness: 110 } }),
  ];

  // Camera forward push & scene fadeout (frames 135 - 150)
  const cameraZoom = interpolate(frame, [135, 150], [1, 1.08], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sceneOpacity = interpolate(frame, [138, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Simulated audio equalizer bars
  const eqHeights = [
    12 + Math.sin(frame * 0.4) * 8,
    18 + Math.cos(frame * 0.5) * 12,
    24 + Math.sin(frame * 0.3 + 1) * 14,
    32 + Math.cos(frame * 0.45) * 16,
    20 + Math.sin(frame * 0.6) * 10,
    14 + Math.cos(frame * 0.35) * 8,
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.bgDark,
        opacity: sceneOpacity,
        transform: `scale(${cameraZoom})`,
        overflow: "hidden",
      }}
    >
      <TacticalHUD sceneTitle="STAGE 01 // TACTICAL BREACH & INITIALIZATION" />

      {/* Cyber Background Grid with Radial Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(rgba(16, 185, 129, 0.16) 1.5px, transparent 1.5px), linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px)`,
          backgroundSize: "36px 36px, 72px 72px",
          opacity: 0.7,
        }}
      />

      {/* Impact Flash at Beat Drop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#10B981",
          opacity: impactFlash,
          pointerEvents: "none",
          zIndex: 40,
        }}
      />

      {/* Shockwave Rings at Frame 30 */}
      {frame >= 30 && (
        <>
          <div
            style={{
              position: "absolute",
              top: "46%",
              left: "50%",
              transform: `translate(-50%, -50%) scale(${shockwaveScale})`,
              width: 480,
              height: 480,
              borderRadius: "50%",
              border: `2px solid rgba(16, 185, 129, ${shockwaveOpacity})`,
              boxShadow: `0 0 35px rgba(16, 185, 129, ${shockwaveOpacity * 0.7})`,
              pointerEvents: "none",
              zIndex: 8,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "46%",
              left: "50%",
              transform: `translate(-50%, -50%) scale(${shockwave2Scale})`,
              width: 420,
              height: 420,
              borderRadius: "50%",
              border: `1.5px solid rgba(6, 182, 212, ${shockwave2Opacity})`,
              boxShadow: `0 0 25px rgba(6, 182, 212, ${shockwave2Opacity * 0.6})`,
              pointerEvents: "none",
              zIndex: 8,
            }}
          />
        </>
      )}

      {/* Pre-Drop Radar Reticle & Target Lock (Frames 0 - 30) */}
      <div
        style={{
          position: "absolute",
          top: "46%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${reticleScale})`,
          width: 580,
          height: 580,
          opacity: reticleOpacity,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          pointerEvents: "none",
          zIndex: 5,
        }}
      >
        {/* Outer Rotating Gear Ring */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `1px dashed rgba(16, 185, 129, 0.35)`,
            transform: `rotate(${reticleRot}deg)`,
          }}
        />

        {/* Mid Cyan Ring with Tick Marks */}
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            borderRadius: "50%",
            border: `1px solid rgba(6, 182, 212, 0.25)`,
            transform: `rotate(${-reticleRot * 0.7}deg)`,
          }}
        />

        {/* Inner Crosshair Lines */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: 1,
            backgroundColor: "rgba(16, 185, 129, 0.25)",
          }}
        />
        <div
          style={{
            position: "absolute",
            height: "100%",
            width: 1,
            backgroundColor: "rgba(16, 185, 129, 0.25)",
          }}
        />

        {/* Phase 1 Target Lock Badge (Frames 0 - 30 only) */}
        {frame < 30 && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
              backgroundColor: "rgba(11, 15, 25, 0.92)",
              padding: "18px 32px",
              minWidth: 380,
              whiteSpace: "nowrap",
              borderRadius: 14,
              border: `1px solid ${frame >= 26 ? theme.colors.emeraldBright : "rgba(239, 68, 68, 0.6)"}`,
              boxShadow: frame >= 26 ? theme.shadows.glowEmerald : "0 0 25px rgba(239, 68, 68, 0.35)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {frame >= 26 ? (
                <Unlock size={20} color={theme.colors.emeraldBright} />
              ) : (
                <Lock size={20} color={theme.colors.crimsonBright} />
              )}
              <span
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 16,
                  fontWeight: 800,
                  color: frame >= 26 ? theme.colors.emeraldBright : theme.colors.crimsonBright,
                  letterSpacing: 2,
                }}
              >
                {frame >= 26 ? "[ ACCESS GRANTED ]" : "[ AUTHENTICATING TARGET ]"}
              </span>
            </div>

            <div
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 13,
                color: theme.colors.cyanBright,
                letterSpacing: 3,
              }}
            >
              {frame >= 20 ? ">>> ZEROBOX KERNEL UNLOCKED <<<" : activeCipher}
            </div>
          </div>
        )}
      </div>

      {/* Top Left Terminal Boot Telemetry (Frames 0 - 65) */}
      <div
        style={{
          position: "absolute",
          top: 90,
          left: 96,
          fontFamily: theme.fonts.mono,
          fontSize: 13,
          color: theme.colors.emeraldBright,
          lineHeight: 1.85,
          zIndex: 15,
          opacity: interpolate(frame, [45, 65], [1, 0.25], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: theme.colors.textMuted,
            marginBottom: 4,
            fontSize: 11,
            letterSpacing: 1,
          }}
        >
          <Terminal size={12} color={theme.colors.emeraldBright} />
          <span>OFFENSIVE DAEMON CONSOLE // OP-0XDND</span>
        </div>
        {bootLines.map(
          (line, idx) =>
            frame >= line.frame && (
              <div
                key={idx}
                style={{
                  textShadow: "0 0 8px rgba(16, 185, 129, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ color: theme.colors.emerald }}>{">"}</span>
                <span>{line.text}</span>
              </div>
            )
        )}
      </div>

      {/* Top Right Target Telemetry Box */}
      <div
        style={{
          position: "absolute",
          top: 90,
          right: 96,
          backgroundColor: "rgba(17, 24, 39, 0.7)",
          border: `1px solid rgba(255, 255, 255, 0.08)`,
          borderRadius: 8,
          padding: "10px 18px",
          fontFamily: theme.fonts.mono,
          fontSize: 12,
          color: theme.colors.textMuted,
          lineHeight: 1.6,
          zIndex: 15,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Radio size={14} color={frame >= 26 ? theme.colors.emeraldBright : theme.colors.crimsonBright} />
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: frame >= 26 ? theme.colors.emeraldBright : theme.colors.crimsonBright,
              boxShadow: `0 0 8px ${frame >= 26 ? theme.colors.emeraldBright : theme.colors.crimsonBright}`,
            }}
          />
          <span style={{ color: theme.colors.textWhite, fontWeight: 700 }}>
            {frame >= 26 ? "SYSTEM ARMED" : "RECON MODE"}
          </span>
        </div>
        <div>TARGET: 0xdnd/ctf-tracker</div>
        <div style={{ color: theme.colors.cyanBright }}>LAT 32.0853° N // LON 34.7818° E</div>
      </div>

      {/* MAIN HERO REVEAL (Frames 30 - 150) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          opacity: heroOpacity,
          zIndex: 20,
        }}
      >
        {/* Top Tech Category Badge */}
        <div
          style={{
            marginBottom: 20,
            transform: `translateY(${titleY}px)`,
          }}
        >
          <CyberBadge
            label="TACTICAL CYBERSECURITY OPERATIONS PLATFORM"
            variant="emerald"
            glow
            icon={<Shield size={16} />}
            fontSize={13}
          />
        </div>

        {/* Hero Title Container */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            marginBottom: 12,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {/* Logo 3D Box with Elastic Spring */}
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: 26,
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: `2px solid ${theme.colors.emerald}`,
              boxShadow: `0 0 35px rgba(16, 185, 129, 0.7), inset 0 0 20px rgba(16, 185, 129, 0.3)`,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: 12,
              transform: `scale(${logoSpring})`,
            }}
          >
            <Img
              src={staticFile("logo-zerobox.png")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                filter: "drop-shadow(0 0 16px rgba(16, 185, 129, 0.9))",
              }}
            />
          </div>

          {/* Grand Brand Text */}
          <GlowingText
            fontSize={116}
            fontWeight={900}
            letterSpacing={-2}
            fontFamily={theme.fonts.cyber}
            gradient="linear-gradient(135deg, #FFFFFF 15%, #34D399 65%, #06B6D4 100%)"
            glowColor="rgba(16, 185, 129, 0.6)"
          >
            ZEROBOX
          </GlowingText>

          {/* Version Pill */}
          <div
            style={{
              alignSelf: "flex-start",
              marginTop: 18,
              padding: "6px 16px",
              borderRadius: 10,
              backgroundColor: "rgba(6, 182, 212, 0.16)",
              border: `1.5px solid ${theme.colors.cyan}`,
              fontFamily: theme.fonts.mono,
              fontSize: 22,
              fontWeight: 800,
              color: theme.colors.cyanBright,
              letterSpacing: 2,
              boxShadow: theme.shadows.glowCyan,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: theme.colors.cyanBright,
                boxShadow: "0 0 8px #22D3EE",
              }}
            />
            v2.0
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontFamily: theme.fonts.sans,
            fontSize: 27,
            fontWeight: 700,
            letterSpacing: 4.5,
            color: theme.colors.textWhite,
            textAlign: "center",
            marginBottom: 16,
            textShadow: "0 2px 25px rgba(0,0,0,0.9)",
            transform: `scale(${subTitleSpring})`,
          }}
        >
          TACTICAL CTF & OFFENSIVE CYBERSECURITY DASHBOARD
        </div>

        {/* Author Credit Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: theme.fonts.mono,
            fontSize: 17,
            color: theme.colors.textMuted,
            marginBottom: 38,
            transform: `scale(${authorSpring})`,
          }}
        >
          <span>ENGINEERED BY</span>
          <span
            style={{
              color: theme.colors.amberBright,
              fontWeight: 800,
              letterSpacing: 1,
              textShadow: "0 0 16px rgba(245, 158, 11, 0.5)",
            }}
          >
            DANIEL DAYAN (@0xdnd)
          </span>
          <span style={{ color: theme.colors.textDim }}>//</span>
          <span
            style={{
              color: theme.colors.cyanBright,
              fontWeight: 700,
              textShadow: "0 0 12px rgba(6, 182, 212, 0.4)",
            }}
          >
            OFFLINE-FIRST ARCHITECTURE
          </span>
        </div>

        {/* 4 STAGGERED TACTICAL CAPABILITY CARDS */}
        <div style={{ display: "flex", gap: 18, zIndex: 25 }}>
          {/* Card 1 */}
          <div
            style={{
              transform: `scale(${cardSprings[0]})`,
              backgroundColor: "rgba(17, 24, 39, 0.85)",
              border: `1.5px solid rgba(16, 185, 129, 0.45)`,
              borderRadius: 14,
              padding: "14px 22px",
              boxShadow: theme.shadows.glowEmerald,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Cpu size={20} color={theme.colors.emeraldBright} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 15,
                  fontWeight: 800,
                  color: theme.colors.textWhite,
                  letterSpacing: 1,
                }}
              >
                1005+ LABS INDEXED
              </div>
              <div
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 11,
                  color: theme.colors.textMuted,
                }}
              >
                543 HTB • 462 THM
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div
            style={{
              transform: `scale(${cardSprings[1]})`,
              backgroundColor: "rgba(17, 24, 39, 0.85)",
              border: `1.5px solid rgba(6, 182, 212, 0.45)`,
              borderRadius: 14,
              padding: "14px 22px",
              boxShadow: theme.shadows.glowCyan,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: "rgba(6, 182, 212, 0.15)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Zap size={20} color={theme.colors.cyanBright} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 15,
                  fontWeight: 800,
                  color: theme.colors.textWhite,
                  letterSpacing: 1,
                }}
              >
                REVSHELL STUDIO
              </div>
              <div
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 11,
                  color: theme.colors.textMuted,
                }}
              >
                1-Click Payload Engine
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div
            style={{
              transform: `scale(${cardSprings[2]})`,
              backgroundColor: "rgba(17, 24, 39, 0.85)",
              border: `1.5px solid rgba(239, 68, 68, 0.45)`,
              borderRadius: 14,
              padding: "14px 22px",
              boxShadow: theme.shadows.glowCrimson,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: "rgba(239, 68, 68, 0.15)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Crosshair size={20} color={theme.colors.crimsonBright} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 15,
                  fontWeight: 800,
                  color: theme.colors.textWhite,
                  letterSpacing: 1,
                }}
              >
                EXAM SIMULATOR
              </div>
              <div
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 11,
                  color: theme.colors.textMuted,
                }}
              >
                CPTS & OSCP HUD
              </div>
            </div>
          </div>

          {/* Card 4 */}
          <div
            style={{
              transform: `scale(${cardSprings[3]})`,
              backgroundColor: "rgba(17, 24, 39, 0.85)",
              border: `1.5px solid rgba(139, 92, 246, 0.45)`,
              borderRadius: 14,
              padding: "14px 22px",
              boxShadow: theme.shadows.glowPurple,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: "rgba(139, 92, 246, 0.15)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Shield size={20} color={theme.colors.purpleBright} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 15,
                  fontWeight: 800,
                  color: theme.colors.textWhite,
                  letterSpacing: 1,
                }}
              >
                ZERO BACKEND
              </div>
              <div
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 11,
                  color: theme.colors.textMuted,
                }}
              >
                100% Private Client-Side
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Audio Frequency Spectrum & Hardware Telemetry (Frames 30 - 150) */}
      <div
        style={{
          position: "absolute",
          bottom: 90,
          left: 96,
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
          zIndex: 15,
          opacity: interpolate(frame, [30, 45], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, marginRight: 10 }}>
          <Activity size={14} color={theme.colors.emeraldBright} style={{ marginRight: 6, marginBottom: 2 }} />
          {eqHeights.map((h, i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: h,
                backgroundColor: i % 2 === 0 ? theme.colors.emeraldBright : theme.colors.cyanBright,
                borderRadius: 2,
              }}
            />
          ))}
        </div>
        <div
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 11,
            color: theme.colors.textDim,
            letterSpacing: 1,
          }}
        >
          AUDIO SYNC: 44.1kHz STEREO // VOL: SAFE BROADCAST (-14 dBFS)
        </div>
      </div>
    </AbsoluteFill>
  );
};

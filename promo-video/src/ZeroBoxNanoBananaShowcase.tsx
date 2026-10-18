import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Audio,
  Img,
  Sequence,
  staticFile,
} from "remotion";
import {
  Terminal,
  Shield,
  CheckCircle2,
  Activity,
  Sparkles,
  Radio,
  ArrowRight,
} from "lucide-react";
import { AuthenticZeroBoxUI } from "./components-showcase/AuthenticZeroBoxUI";

export const ZeroBoxNanoBananaShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ----------------------------------------------------
  // Master Soundtrack & Spatial Audio Choreography
  // ----------------------------------------------------
  // Audio tracks loaded via staticFile from public/audio
  return (
    <div
      style={{
        position: "relative",
        width: 1920,
        height: 1080,
        backgroundColor: "#030712",
        overflow: "hidden",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "JetBrains Mono", monospace',
        color: "#F9FAFB",
      }}
    >
      {/* 1. Master Audio Mix */}
      <Audio
        src={staticFile("audio/showcase-master-soundtrack.wav")}
        volume={(f) =>
          interpolate(f, [0, 30, 840, 900], [0, 0.85, 0.85, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />

      {/* Act 1 SFX: Cyber Braam & Radar Pings */}
      <Sequence from={0} durationInFrames={90}>
        <Audio src={staticFile("audio/sfx/sfx-cyber-braam.wav")} volume={0.65} />
      </Sequence>
      <Sequence from={50} durationInFrames={60}>
        <Audio src={staticFile("audio/sfx/sfx-radar-ping.wav")} volume={0.5} />
      </Sequence>
      <Sequence from={140} durationInFrames={60}>
        <Audio src={staticFile("audio/sfx/sfx-radar-ping.wav")} volume={0.4} />
      </Sequence>

      {/* Act 2 SFX: Terminal typing & Flag Capture Victory */}
      <Sequence from={240} durationInFrames={75}>
        <Audio src={staticFile("audio/sfx/sfx-mechanical-typing.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={360} durationInFrames={120}>
        <Audio src={staticFile("audio/sfx/sfx-flag-captured.wav")} volume={0.8} />
      </Sequence>

      {/* Act 3 SFX: UI Interaction & Clipboard */}
      <Sequence from={510} durationInFrames={45}>
        <Audio src={staticFile("audio/sfx/sfx-card-swoosh.wav")} volume={0.55} />
      </Sequence>
      <Sequence from={620} durationInFrames={45}>
        <Audio src={staticFile("audio/sfx/sfx-clipboard-copy.wav")} volume={0.65} />
      </Sequence>

      {/* Act 4 SFX: Finale Shimmer & Button Click */}
      <Sequence from={710} durationInFrames={90}>
        <Audio src={staticFile("audio/sfx/sfx-star-shimmer.wav")} volume={0.7} />
      </Sequence>
      <Sequence from={820} durationInFrames={35}>
        <Audio src={staticFile("audio/sfx/sfx-ui-click.wav")} volume={0.7} />
      </Sequence>

      {/* ---------------------------------------------------- */}
      {/* ACT 1: GLOBAL THREAT TELEMETRY (Frames 0 - 225) */}
      {/* Featuring Google Nano Banana Threat Globe */}
      {/* ---------------------------------------------------- */}
      {frame < 235 && (
        <Act1ThreatGlobe frame={frame} fps={fps} />
      )}

      {/* ---------------------------------------------------- */}
      {/* ACT 2: QUANTUM EXPLOITATION TERMINAL (Frames 220 - 470) */}
      {/* Featuring Google Nano Banana Quantum Core */}
      {/* ---------------------------------------------------- */}
      {frame >= 215 && frame < 480 && (
        <Act2QuantumConsole frame={frame - 220} fps={fps} />
      )}

      {/* ---------------------------------------------------- */}
      {/* ACT 3: LIVE ZEROBOX PLATFORM (Frames 465 - 700) */}
      {/* Featuring Real Interactive ZeroBox Dashboard */}
      {/* ---------------------------------------------------- */}
      {frame >= 465 && frame < 710 && (
        <Act3ZeroBoxPlatform frame={frame - 465} fps={fps} />
      )}

      {/* ---------------------------------------------------- */}
      {/* ACT 4: TITANIUM CREST GRAND FINALE (Frames 695 - 900) */}
      {/* Featuring Google Nano Banana Titanium Emblem */}
      {/* ---------------------------------------------------- */}
      {frame >= 695 && (
        <Act4TitaniumEmblem frame={frame - 695} fps={fps} />
      )}

      {/* Global Watermark Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 40,
          right: 40,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            backdropFilter: "blur(12px)",
            borderRadius: 999,
            padding: "6px 16px",
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#94A3B8",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#10B981",
              boxShadow: "0 0 10px #10B981",
            }}
          />
          <span>ZEROBOX // TACTICAL CYBER OPERATIONS</span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(234, 179, 8, 0.3)",
            backdropFilter: "blur(12px)",
            borderRadius: 999,
            padding: "6px 16px",
            fontSize: 12,
            letterSpacing: "0.08em",
            color: "#FDE047",
          }}
        >
          <Sparkles size={14} color="#FACC15" />
          <span>VISUALS ENHANCED BY NANO BANANA AI</span>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// ACT 1: GLOBAL THREAT TELEMETRY COMPONENT
// =========================================================================
const Act1ThreatGlobe: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  // Fade in at start, fade out into Act 2
  const opacity = interpolate(frame, [0, 20, 205, 230], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow, cinematic Ken-Burns zoom and gentle horizontal drift
  const scale = interpolate(frame, [0, 230], [1.0, 1.07]);
  const translateX = interpolate(frame, [0, 230], [0, -20]);

  // Scanning radar line
  const scanLineY = interpolate(frame, [10, 210], [-50, 1150], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Telemetry HUD entrances
  const hudSpring = spring({
    frame: frame - 15,
    fps,
    config: { damping: 14, stiffness: 70 },
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        overflow: "hidden",
      }}
    >
      {/* Nano Banana Threat Globe Imagery */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${scale}) translateX(${translateX}px)`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={staticFile("images/nanobanana-threat-globe.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.05) brightness(0.95)",
          }}
        />
      </div>

      {/* Cyber Vignette & Depth Mask */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, transparent 35%, rgba(3, 7, 18, 0.75) 85%, #030712 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Cyan Scanning Laser Beam */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: scanLineY,
          height: 3,
          background:
            "linear-gradient(90deg, transparent 0%, rgba(56, 189, 248, 0.8) 50%, transparent 100%)",
          boxShadow: "0 0 24px 6px rgba(56, 189, 248, 0.6)",
          pointerEvents: "none",
        }}
      />

      {/* HUD Telemetry Top Header */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 60,
          transform: `translateY(${interpolate(hudSpring, [0, 1], [-40, 0])}px)`,
          opacity: hudSpring,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            borderRadius: 8,
            padding: "8px 18px",
            color: "#38BDF8",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.15em",
            boxShadow: "0 4px 20px rgba(56, 189, 248, 0.15)",
          }}
        >
          <Radio size={16} className="animate-pulse" />
          <span>PHASE 01 // GLOBAL SURVEILLANCE & ATTACK MATRIX</span>
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            background: "linear-gradient(135deg, #FFFFFF 0%, #94A3B8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 0 30px rgba(56, 189, 248, 0.2)",
          }}
        >
          Worldwide Threat Influx
        </div>
      </div>

      {/* HUD Target Callouts (Right Side) */}
      <div
        style={{
          position: "absolute",
          top: 180,
          right: 70,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: 360,
        }}
      >
        {[
          {
            label: "TARGET: ACTIVE CTF LABS",
            value: "2,481 MACHINES ONLINE",
            badge: "STANDBY",
            color: "#10B981",
          },
          {
            label: "ZERO-DAY BUFFER OVERFLOW",
            value: "CVE-2026-9228 DETECTED",
            badge: "CRITICAL",
            color: "#EF4444",
          },
          {
            label: "DEFENSE GRID LATENCY",
            value: "14ms // DISTRIBUTED P2P",
            badge: "OPTIMAL",
            color: "#38BDF8",
          },
        ].map((item, idx) => {
          const itemSpring = spring({
            frame: frame - (30 + idx * 20),
            fps,
            config: { damping: 14, stiffness: 75 },
          });

          return (
            <div
              key={idx}
              style={{
                transform: `translateX(${interpolate(itemSpring, [0, 1], [60, 0])}px)`,
                opacity: itemSpring,
                background: "rgba(15, 23, 42, 0.85)",
                border: `1px solid ${item.color}40`,
                borderLeft: `4px solid ${item.color}`,
                borderRadius: 8,
                padding: "14px 18px",
                backdropFilter: "blur(12px)",
                boxShadow: `0 8px 24px rgba(0,0,0,0.5)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#94A3B8",
                  letterSpacing: "0.1em",
                }}
              >
                <span>{item.label}</span>
                <span
                  style={{
                    color: item.color,
                    background: `${item.color}20`,
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {item.badge}
                </span>
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#F8FAFC",
                  marginTop: 6,
                  fontFamily: "monospace",
                }}
              >
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================================
// ACT 2: QUANTUM EXPLOITATION TERMINAL COMPONENT
// =========================================================================
const Act2QuantumConsole: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  // Fade in and out
  const opacity = interpolate(frame, [0, 20, 235, 260], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Camera drift
  const scale = interpolate(frame, [0, 260], [1.02, 1.09]);

  // Exploit terminal typing simulation
  const typeStage = interpolate(frame, [20, 140], [0, 3], {
    extrapolateRight: "clamp",
  });

  // Flag capture banner spring (fires at frame 140)
  const victorySpring = spring({
    frame: frame - 140,
    fps,
    config: { damping: 12, stiffness: 85, mass: 0.9 },
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        overflow: "hidden",
      }}
    >
      {/* Nano Banana Quantum Terminal Image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={staticFile("images/nanobanana-quantum-core.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.08) brightness(0.92)",
          }}
        />
      </div>

      {/* Cyber Vignette & Depth Mask */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 60% 45%, transparent 20%, rgba(3, 7, 18, 0.7) 75%, #030712 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Terminal Header */}
      <div
        style={{
          position: "absolute",
          top: 50,
          left: 60,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: 8,
            padding: "8px 18px",
            color: "#10B981",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.15em",
          }}
        >
          <Terminal size={16} />
          <span>PHASE 02 // REVERSE SHELL & ZERO-DAY EXPLOITATION</span>
        </div>
        <div
          style={{
            fontSize: 42,
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
          }}
        >
          Interactive Root Pwn
        </div>
      </div>

      {/* Live Disassembly HUD Card (Left Side) */}
      <div
        style={{
          position: "absolute",
          top: 170,
          left: 60,
          width: 500,
          background: "rgba(8, 12, 22, 0.9)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: 12,
          padding: 24,
          backdropFilter: "blur(16px)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
          fontFamily: '"JetBrains Mono", monospace',
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(16, 185, 129, 0.2)",
            paddingBottom: 12,
            marginBottom: 16,
            fontSize: 12,
            color: "#10B981",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: "#EF4444",
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: "#F59E0B",
              }}
            />
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: "#10B981",
              }}
            />
            <span style={{ marginLeft: 8, color: "#94A3B8" }}>
              zerobox-shell --pty
            </span>
          </div>
          <span style={{ color: "#38BDF8" }}>PORT: 9001</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
          <div style={{ color: "#E2E8F0" }}>
            <span style={{ color: "#10B981" }}>0x01</span> [INIT] Scanning binary symbols...
          </div>
          {typeStage >= 1 && (
            <div style={{ color: "#38BDF8" }}>
              <span style={{ color: "#10B981" }}>0x02</span> [*] ROP Gadget found at{" "}
              <span style={{ color: "#FDE047" }}>0x7FFF1A4B8C</span>
            </div>
          )}
          {typeStage >= 2 && (
            <div style={{ color: "#A855F7" }}>
              <span style={{ color: "#10B981" }}>0x03</span> [!] Injecting NOP sled + shellcode
            </div>
          )}
          {typeStage >= 3 && (
            <div style={{ color: "#10B981", fontWeight: 700 }}>
              <span style={{ color: "#10B981" }}>0x04</span> [✓] SHELL SPAWNED: uid=0(root) gid=0(root)
            </div>
          )}
        </div>
      </div>

      {/* Victory Callout Banner (Triggered by victorySpring) */}
      {frame >= 140 && (
        <div
          style={{
            position: "absolute",
            bottom: 120,
            left: "50%",
            transform: `translate(-50%, ${interpolate(victorySpring, [0, 1], [80, 0])}px) scale(${interpolate(victorySpring, [0, 1], [0.85, 1])})`,
            opacity: victorySpring,
            background: "linear-gradient(135deg, rgba(6, 78, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
            border: "2px solid #10B981",
            borderRadius: 16,
            padding: "20px 48px",
            display: "flex",
            alignItems: "center",
            gap: 24,
            boxShadow: "0 0 50px rgba(16, 185, 129, 0.4), 0 20px 40px rgba(0,0,0,0.8)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              backgroundColor: "rgba(16, 185, 129, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#34D399",
            }}
          >
            <CheckCircle2 size={36} />
          </div>
          <div>
            <div
              style={{
                fontSize: 14,
                letterSpacing: "0.15em",
                color: "#6EE7B7",
                fontWeight: 700,
              }}
            >
              CHALLENGE SOLVED • 100 POINTS AWARDED
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 900,
                color: "#FFFFFF",
                letterSpacing: "-0.01em",
              }}
            >
              HTB: INTERNAL LAB // SYSTEM ROOTED
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// ACT 3: LIVE ZEROBOX PLATFORM COMPONENT
// =========================================================================
const Act3ZeroBoxPlatform: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const opacity = interpolate(frame, [0, 20, 220, 245], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Camera focal pan across the genuine UI
  const cameraSpring = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 60 },
  });

  const scale = interpolate(cameraSpring, [0, 1], [0.95, 1.05]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        overflow: "hidden",
      }}
    >
      {/* Background Matrix Grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(56, 189, 248, 0.12) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />

      {/* Header Badge */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 60,
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            borderRadius: 8,
            padding: "8px 18px",
            color: "#38BDF8",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.15em",
          }}
        >
          <Activity size={16} />
          <span>PHASE 03 // FULL OPERATIONAL WORKFLOW DASHBOARD</span>
        </div>
      </div>

      {/* Authentic ZeroBox UI Rig */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <div style={{ width: 1720, height: 960 }}>
          <AuthenticZeroBoxUI
            currentAct={3}
            actProgress={frame / 245}
            timerSeconds={142}
            isTimerRunning={true}
            selectedTrack="CPTS"
            searchQuery="cpts active directory"
            kanbanDragProgress={interpolate(frame, [30, 90], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })}
            isRootPwned={frame >= 90}
            confettiProgress={frame >= 90 ? (frame - 90) / 60 : 0}
            revShellHost="10.10.14.33"
            revShellPort="9001"
            isPayloadCopied={frame >= 150}
            examHoursLeft={23}
            examMinsLeft={42}
            radarExpansion={1}
            isCtaClicked={false}
          />
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// ACT 4: TITANIUM CREST GRAND FINALE COMPONENT
// =========================================================================
const Act4TitaniumEmblem: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
  });

  // Pullback spring
  const pullSpring = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 50 },
  });

  const scale = interpolate(pullSpring, [0, 1], [1.15, 1.0]);
  const rotateX = interpolate(pullSpring, [0, 1], [6, 0]);

  // CTA button spring
  const ctaSpring = spring({
    frame: frame - 60,
    fps,
    config: { damping: 13, stiffness: 80 },
  });

  // Shimmer streak across the titanium crest
  const shimmerX = interpolate(frame, [25, 95], [-500, 1500], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        overflow: "hidden",
      }}
    >
      {/* Nano Banana Titanium Emblem Image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${scale}) perspective(1000px) rotateX(${rotateX}deg)`,
          transformOrigin: "center center",
        }}
      >
        <Img
          src={staticFile("images/nanobanana-tactical-emblem.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "contrast(1.06) brightness(0.96)",
          }}
        />

        {/* Specular Light Sheen sweep */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: shimmerX,
            width: 250,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.18) 50%, transparent 100%)",
            transform: "skewX(-25deg)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Dark gradient bottom vignette for typography */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(3, 7, 18, 0.3) 0%, transparent 40%, rgba(3, 7, 18, 0.85) 80%, #030712 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Floating Call to Action Container */}
      <div
        style={{
          position: "absolute",
          bottom: 90,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 16,
          zIndex: 50,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(15, 23, 42, 0.85)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: 999,
            padding: "8px 24px",
            color: "#34D399",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.2em",
          }}
        >
          <Shield size={16} />
          <span>PRODUCTION READY // V2.0 STABLE</span>
        </div>

        <div
          style={{
            fontSize: 48,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            color: "#FFFFFF",
            textShadow: "0 0 35px rgba(16, 185, 129, 0.3)",
          }}
        >
          Elevate Your Tactical Cyber Lab
        </div>

        <div
          style={{
            fontSize: 18,
            color: "#94A3B8",
            maxWidth: 680,
            lineHeight: 1.5,
          }}
        >
          Streamlined CTF operations, real-time payload generators, and exam simulation.
        </div>

        {/* Pulsing CTA Launch Button */}
        <div
          style={{
            transform: `scale(${interpolate(ctaSpring, [0, 1], [0.8, 1])})`,
            opacity: ctaSpring,
            marginTop: 10,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "#FFFFFF",
              fontSize: 18,
              fontWeight: 800,
              padding: "16px 40px",
              borderRadius: 14,
              boxShadow:
                "0 0 40px rgba(16, 185, 129, 0.5), 0 10px 25px rgba(0, 0, 0, 0.5)",
              letterSpacing: "0.05em",
            }}
          >
            <span>LAUNCH DASHBOARD</span>
            <ArrowRight size={20} />
          </div>
        </div>
      </div>
    </div>
  );
};

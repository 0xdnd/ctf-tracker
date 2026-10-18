import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
  Audio,
  Sequence,
  staticFile,
} from "remotion";
import { CameraRig } from "./components-showcase/CameraRig";
import { InteractiveCursor } from "./components-showcase/InteractiveCursor";
import { AuthenticZeroBoxUI } from "./components-showcase/AuthenticZeroBoxUI";
import { GrandFinaleShowcase } from "./components-showcase/GrandFinaleShowcase";
import { CinematicColdOpen } from "./components-showcase/CinematicColdOpen";
import { ThemePreset } from "./styles/theme";

export const ZeroBox60fpsShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ----------------------------------------------------
  // Time Normalization: Second-Based Deterministic Clock
  // Total: 35.0 seconds (2100 frames at 60 fps)
  // ----------------------------------------------------
  const time = frame / fps;

  // Act 1: 0.0s - 5.0s  (0 - 300f)   - Macro Reveal & Unified Header (OLED Black & Blue)
  // Act 2: 5.0s - 11.0s (300 - 660f)  - Theme Switcher Confirms OLED + Target Matrix & CPTS Filter
  // Act 3: 11.0s - 18.0s (660 - 1080f) - Tactical Kanban & Root Pwn (Electric Blue & Emerald Solve)
  // Act 4: 18.0s - 24.0s (1080 - 1440f) - RevShell Studio & AI Scan Intel
  // Act 5: 24.0s - 29.0s (1440 - 1740f) - Attack Graph & Evidence Vault
  // Act 6: 29.0s - 35.0s (1740 - 2100f) - 3D Pullback Grand Finale

  let currentAct: 1 | 2 | 3 | 4 | 5 | 6 = 1;
  let actStartTime = 0;
  let actEndTime = 5.0;

  if (time < 5.0) {
    currentAct = 1;
    actStartTime = 0.0;
    actEndTime = 5.0;
  } else if (time < 11.0) {
    currentAct = 2;
    actStartTime = 5.0;
    actEndTime = 11.0;
  } else if (time < 18.0) {
    currentAct = 3;
    actStartTime = 11.0;
    actEndTime = 18.0;
  } else if (time < 24.0) {
    currentAct = 4;
    actStartTime = 18.0;
    actEndTime = 24.0;
  } else if (time < 29.0) {
    currentAct = 5;
    actStartTime = 24.0;
    actEndTime = 29.0;
  } else {
    currentAct = 6;
    actStartTime = 29.0;
    actEndTime = 35.0;
  }

  const actProgress = Math.min(1, Math.max(0, (time - actStartTime) / (actEndTime - actStartTime)));

  // ----------------------------------------------------
  // Dynamic Theme Architecture (OLED Black & Electric Sky Blue 1:1 with app)
  // ----------------------------------------------------
  const themePreset: ThemePreset = "oled";
  const isThemeDropdownOpen = time >= 5.4 && time < 6.4;
  const themeDropdownHighlight: ThemePreset | undefined =
    time >= 5.6 && time < 6.4 ? "oled" : undefined;

  // ----------------------------------------------------
  // Dynamic 3D Camera Rig Interpolation with Organic Damped Physics
  // ----------------------------------------------------
  let targetScale = 1.0;
  let targetFocusX = 0.5;
  let targetFocusY = 0.5;
  let targetRotX = 0;
  let targetRotY = 0;

  if (time < 5.0) {
    // Act 1: Cold open (0-2.2s), then zooms into Unified Header (2.2s-5.0s) with smooth bezier easing
    const zoomProgress = interpolate(time, [2.15, 3.8, 5.0], [0, 0.7, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    targetScale = interpolate(zoomProgress, [0, 1], [1.02, 1.46]);
    targetFocusX = interpolate(zoomProgress, [0, 1], [0.5, 0.54]);
    targetFocusY = interpolate(zoomProgress, [0, 1], [0.5, 0.12]);
    targetRotX = interpolate(zoomProgress, [0, 1], [2.5, 0]);
  } else if (time < 11.0) {
    // Act 2: Focus on Theme Switcher until 6.4s, then smoothly glides down to Filter bar & Search box
    const panProgress = interpolate(time, [6.4, 8.2, 11.0], [0, 0.65, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
    });
    targetScale = interpolate(panProgress, [0, 1], [1.46, 1.38]);
    targetFocusX = interpolate(panProgress, [0, 1], [0.54, 0.44]);
    targetFocusY = interpolate(panProgress, [0, 1], [0.12, 0.26]);
  } else if (time < 18.0) {
    // Act 3: Kanban board center with gentle drift
    const kanbanZoom = interpolate(time, [11.0, 13.5, 18.0], [0, 0.55, 1], {
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    targetScale = interpolate(kanbanZoom, [0, 1], [1.38, 1.34]);
    targetFocusX = interpolate(kanbanZoom, [0, 1], [0.44, 0.51]);
    targetFocusY = interpolate(kanbanZoom, [0, 1], [0.26, 0.44]);
  } else if (time < 24.0) {
    // Act 4: RevShell Studio & AI Scan Intel
    const shellZoom = interpolate(time, [18.0, 20.5, 24.0], [0, 0.55, 1], {
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    targetScale = interpolate(shellZoom, [0, 1], [1.34, 1.42]);
    targetFocusX = interpolate(shellZoom, [0, 1], [0.51, 0.50]);
    targetFocusY = interpolate(shellZoom, [0, 1], [0.44, 0.46]);
  } else if (time < 29.0) {
    // Act 5: Attack Graph & Evidence Vault
    const graphZoom = interpolate(time, [24.0, 26.0, 29.0], [0, 0.5, 1], {
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    targetScale = interpolate(graphZoom, [0, 1], [1.42, 1.35]);
    targetFocusX = interpolate(graphZoom, [0, 1], [0.50, 0.50]);
    targetFocusY = interpolate(graphZoom, [0, 1], [0.46, 0.48]);
  } else {
    // Act 6: 3D Grand Pullback!
    const pullProgress = spring({
      frame: Math.max(0, frame - Math.round(29.0 * fps)),
      fps,
      config: { damping: 16, stiffness: 60, mass: 1 },
    });
    targetScale = interpolate(pullProgress, [0, 1], [1.35, 1.0]);
    targetFocusX = interpolate(pullProgress, [0, 1], [0.50, 0.50]);
    targetFocusY = interpolate(pullProgress, [0, 1], [0.50, 0.50]);
    targetRotX = 0;
    targetRotY = 0;
  }

  // ----------------------------------------------------
  // Interactive UI States Choreography
  // ----------------------------------------------------
  // 1. Stopwatch timer: starts at 3.6s
  const isTimerRunning = time >= 3.6;
  const timerSeconds = 6138 + (isTimerRunning ? Math.floor(time - 3.6) : 0);

  // 2. Track & Search Filter
  // Clicks CPTS at 7.4s; switches to AISCAN at 21.0s; ATTACKGRAPH at 24.0s
  let selectedTrack: "ALL" | "OSCP" | "CPTS" | "AD" | "REVSHELL" | "EXAM" | "AISCAN" | "ATTACKGRAPH" = "ALL";
  if (time >= 24.0 && time < 29.0) {
    selectedTrack = "ATTACKGRAPH";
  } else if (time >= 21.0 && time < 24.0) {
    selectedTrack = "AISCAN";
  } else if (time >= 18.0 && time < 21.0) {
    selectedTrack = "REVSHELL";
  } else if (time >= 7.4) {
    selectedTrack = "CPTS";
  }

  // Search input typing between 8.8s and 10.2s
  let searchQuery = "";
  if (time >= 8.8 && time < 11.0) {
    const chars = "smb";
    const typeIdx = Math.min(chars.length, Math.floor((time - 8.8) / 0.35));
    searchQuery = chars.slice(0, typeIdx);
  }

  // 3. Tactical Kanban Drag & Root Pwn (Act 3: 11.0s to 18.0s)
  const kanbanDragProgress = interpolate(time, [13.5, 15.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  });
  const isRootPwned = time >= 15.2;

  // Confetti explosion between 15.2s and 17.5s
  const confettiProgress = interpolate(time, [15.2, 17.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 4. Dynamic RevShell Studio & AI Scan (Act 4: 18.0s to 24.0s)
  let revShellHost = "10.10.14.88";
  let revShellPort = "9001";
  if (time < 18.5) {
    revShellHost = "10.10.14.x";
    revShellPort = "4444";
  } else if (time < 19.5) {
    const lhostPart = "10.10.14.88";
    const charsToShow = Math.min(lhostPart.length, 9 + Math.floor((time - 18.5) * 4));
    revShellHost = lhostPart.slice(0, charsToShow);
  }

  // Copy button click at 20.2s -> toast stays until 23.5s
  const isPayloadCopied = time >= 20.2 && time < 23.5;

  // AI Scan Intel toggled during second half of Act 4 (21.0s to 24.0s)
  const showAiScanIntel = time >= 21.0 && time < 24.0;

  // 5. Attack Graph & Evidence Vault (Act 5: 24.0s to 29.0s)
  const showAttackGraph = time >= 24.0 && time < 29.0;
  const examHoursLeft = 14;
  const examMinsLeft = Math.max(0, 42 - Math.floor((time - 24.0) * 2));
  const radarExpansion = interpolate(time, [24.5, 27.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 6. Act 6 CTA Click at 33.5s
  const isCtaClicked = time >= 33.5;

  // ----------------------------------------------------
  // Interactive Cursor Paths with Natural Arcs & Settling
  // ----------------------------------------------------
  let cursorX = 720;
  let cursorY = 440;
  let isClicking = false;
  let cursorLabel: string | undefined;
  let cursorOpacity = 1;
  let clickProgress = 0;

  // Helper for natural human curved mouse travel:
  const humanMove = (
    t: number,
    tStart: number,
    tEnd: number,
    xStart: number,
    xEnd: number,
    yStart: number,
    yEnd: number,
    arcY: number = -15
  ) => {
    const p = Math.min(1, Math.max(0, (t - tStart) / (tEnd - tStart)));
    const smoothP = Math.sin((p * Math.PI) / 2); // smooth ease-out
    const arc = Math.sin(p * Math.PI) * arcY;
    return {
      x: xStart + (xEnd - xStart) * smoothP,
      y: yStart + (yEnd - yStart) * smoothP + arc,
    };
  };

  if (time < 2.5) {
    cursorOpacity = 0;
  } else if (time < 5.0) {
    // Act 1: Moves to click stopwatch at 3.6s with gentle curve
    cursorOpacity = interpolate(time, [2.5, 2.8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const pos = humanMove(time, 2.6, 3.6, 680, 1260, 350, 78, -25);
    cursorX = pos.x;
    cursorY = pos.y;
    if (time >= 3.6 && time <= 3.8) {
      isClicking = true;
      cursorLabel = "Start Stopwatch";
      clickProgress = interpolate(time, [3.6, 3.8], [0, 1]);
    }
  } else if (time < 11.0) {
    // Act 2:
    cursorOpacity = 1;
    if (time < 5.4) {
      const pos = humanMove(time, 5.0, 5.4, 1260, 1080, 78, 78, -8);
      cursorX = pos.x;
      cursorY = pos.y;
    } else if (time < 5.6) {
      cursorX = 1080;
      cursorY = 78;
      isClicking = true;
      cursorLabel = "Theme Presets";
      clickProgress = interpolate(time, [5.4, 5.6], [0, 1]);
    } else if (time < 6.2) {
      const pos = humanMove(time, 5.6, 6.2, 1080, 1040, 78, 125, 10);
      cursorX = pos.x;
      cursorY = pos.y;
    } else if (time < 6.4) {
      cursorX = 1040;
      cursorY = 125;
      isClicking = true;
      cursorLabel = "OLED Black & Blue";
      clickProgress = interpolate(time, [6.2, 6.4], [0, 1]);
    } else if (time < 7.4) {
      const pos = humanMove(time, 6.4, 7.4, 1040, 270, 125, 138, -35);
      cursorX = pos.x;
      cursorY = pos.y;
    } else if (time < 7.65) {
      cursorX = 270;
      cursorY = 138;
      isClicking = true;
      cursorLabel = "Filter CPTS";
      clickProgress = interpolate(time, [7.4, 7.65], [0, 1]);
    } else if (time < 8.8) {
      const pos = humanMove(time, 7.65, 8.8, 270, 1180, 138, 138, -20);
      cursorX = pos.x;
      cursorY = pos.y;
    } else {
      cursorX = 1180;
      cursorY = 138;
      if (time >= 8.8 && time <= 9.1) {
        isClicking = true;
        cursorLabel = "Search 'smb'";
        clickProgress = interpolate(time, [8.8, 9.1], [0, 1]);
      }
    }
  } else if (time < 18.0) {
    // Act 3: Drag Sau from Recon column to Root Pwned
    if (time < 13.5) {
      const pos = humanMove(time, 11.0, 13.5, 1180, 400, 138, 260, 30);
      cursorX = pos.x;
      cursorY = pos.y;
    } else if (time < 15.2) {
      isClicking = true;
      cursorLabel = "Dragging to Root Pwn...";
      cursorX = 400 + (960 - 400) * kanbanDragProgress;
      cursorY = 260 + Math.sin(kanbanDragProgress * Math.PI) * -35;
    } else {
      const pos = humanMove(time, 15.2, 16.5, 960, 980, 260, 270, -10);
      cursorX = pos.x;
      cursorY = pos.y;
      if (time < 16.0) cursorLabel = "PWNED ✓";
    }
  } else if (time < 24.0) {
    // Act 4: RevShell Copy Click at 20.2s, then Click AI Scan tab at 21.0s
    if (time < 20.5) {
      const pos = humanMove(time, 18.0, 20.2, 980, 680, 270, 310, -20);
      cursorX = pos.x;
      cursorY = pos.y;
      if (time >= 20.2 && time <= 20.45) {
        isClicking = true;
        cursorLabel = "Copy Payload";
        clickProgress = interpolate(time, [20.2, 20.45], [0, 1]);
      }
    } else {
      const pos = humanMove(time, 20.5, 21.2, 680, 520, 310, 138, -25);
      cursorX = pos.x;
      cursorY = pos.y;
      if (time >= 21.0 && time <= 21.3) {
        isClicking = true;
        cursorLabel = "AI Scan Intel";
        clickProgress = interpolate(time, [21.0, 21.3], [0, 1]);
      }
    }
  } else if (time < 29.0) {
    // Act 5: Inspect Attack Graph node DC01
    const pos = humanMove(time, 24.0, 26.0, 520, 420, 138, 380, 40);
    cursorX = pos.x;
    cursorY = pos.y;
    if (time >= 25.8 && time <= 26.2) {
      isClicking = true;
      cursorLabel = "DC01 40 PTS // DA";
      clickProgress = interpolate(time, [25.8, 26.2], [0, 1]);
    }
  } else {
    // Act 6: Clicks Launch Button at 33.5s on the Grand Finale Stage
    const pos = humanMove(time, 29.0, 33.5, 600, 960, 400, 960, -50);
    cursorX = pos.x;
    cursorY = pos.y;
    if (time >= 33.5 && time <= 33.8) {
      isClicking = true;
      cursorLabel = "LAUNCH FREE";
      clickProgress = interpolate(time, [33.5, 33.8], [0, 1]);
    }
  }

  // Dynamic ambient glow in Electric Sky Blue
  const ambientGlowColor = "radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, transparent 70%)";

  return (
    <div
      style={{
        position: "relative",
        width: 1920,
        height: 1080,
        backgroundColor: "#000000", // True Zero-Nit OLED Black Foundation
        overflow: "hidden",
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* 1. Master Audio & Precision Multi-Layer SFX Engine    */}
      {/* ---------------------------------------------------- */}
      {/* Master Melodic Tech Electronica Soundtrack */}
      <Audio
        src={staticFile("audio/showcase-master-soundtrack.wav")}
        volume={(f) =>
          interpolate(f / fps, [0, 0.8, 33.5, 35.0], [0, 0.9, 0.9, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />

      {/* Act 1 SFX: Cyber Braam, Odometer Ratchet & Radar Ping */}
      <Sequence from={0} durationInFrames={Math.round(2.5 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-cyber-braam.wav")} volume={0.65} />
      </Sequence>
      <Sequence from={Math.round(1.2 * fps)} durationInFrames={Math.round(1.5 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-odometer-ratchet.wav")} volume={0.45} />
      </Sequence>
      <Sequence from={Math.round(1.8 * fps)} durationInFrames={Math.round(1.5 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-radar-ping.wav")} volume={0.5} />
      </Sequence>

      {/* Stopwatch Tick SFX on timer click (3.6s) */}
      <Sequence from={Math.round(3.6 * fps)} durationInFrames={Math.round(1.2 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-stopwatch-tick.wav")} volume={0.6} />
      </Sequence>

      {/* Act 2 SFX: Theme Switch Clicks & Boot Blip */}
      <Sequence from={Math.round(5.4 * fps)} durationInFrames={Math.round(0.8 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-ui-click.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={Math.round(6.3 * fps)} durationInFrames={Math.round(1.2 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-boot-blip.wav")} volume={0.7} />
      </Sequence>

      {/* Act 2 SFX: Filter Click & Typing Mechanical Clicks */}
      <Sequence from={Math.round(7.4 * fps)} durationInFrames={Math.round(0.6 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-ui-click.wav")} volume={0.55} />
      </Sequence>
      <Sequence from={Math.round(8.8 * fps)} durationInFrames={Math.round(1.5 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-mechanical-typing.wav")} volume={0.55} />
      </Sequence>

      {/* Act 3 SFX: Card Drag Swoosh & Root Victory Fanfare */}
      <Sequence from={Math.round(13.5 * fps)} durationInFrames={Math.round(1.2 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-card-swoosh.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={Math.round(15.2 * fps)} durationInFrames={Math.round(2.5 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-flag-captured.wav")} volume={0.75} />
      </Sequence>

      {/* Act 4 SFX: Payload Copy & Toast Confirmation */}
      <Sequence from={Math.round(20.2 * fps)} durationInFrames={Math.round(1.2 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-clipboard-copy.wav")} volume={0.7} />
      </Sequence>

      {/* Act 5 SFX: Exam Pulse & AD Pivoting Beacon */}
      <Sequence from={Math.round(24.0 * fps)} durationInFrames={Math.round(2.5 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-exam-pulse.wav")} volume={0.65} />
      </Sequence>
      <Sequence from={Math.round(26.0 * fps)} durationInFrames={Math.round(1.8 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-radar-ping.wav")} volume={0.5} />
      </Sequence>
      {/* DC01 Domain Admin Compromise at 28.0s */}
      <Sequence from={Math.round(28.0 * fps)} durationInFrames={Math.round(1.8 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-flag-captured.wav")} volume={0.7} />
      </Sequence>

      {/* Act 6 SFX: Star Shimmer on Pullback & CTA Launch */}
      <Sequence from={Math.round(29.0 * fps)} durationInFrames={Math.round(2.0 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-star-shimmer.wav")} volume={0.7} />
      </Sequence>
      <Sequence from={Math.round(33.5 * fps)} durationInFrames={Math.round(1.5 * fps)}>
        <Audio src={staticFile("audio/sfx/sfx-flag-captured.wav")} volume={0.8} />
      </Sequence>

      {/* ---------------------------------------------------- */}
      {/* 2. Tactical Background Atmosphere & Volumetric Glow */}
      {/* ---------------------------------------------------- */}
      <div
        style={{
          position: "absolute",
          top: -150,
          left: -150,
          width: 900,
          height: 900,
          borderRadius: "50%",
          background: ambientGlowColor,
          filter: "blur(120px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -200,
          right: -100,
          width: 850,
          height: 850,
          borderRadius: "50%",
          background: ambientGlowColor,
          filter: "blur(100px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "40%",
          right: "20%",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, transparent 70%)",
          filter: "blur(110px)",
          pointerEvents: "none",
        }}
      />

      {/* Subtle Matrix Dot Grid Pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(rgba(56, 189, 248, 0.12) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.6,
          pointerEvents: "none",
        }}
      />

      {/* ---------------------------------------------------- */}
      {/* 3. 3D Focal-Point Camera Rig (Acts 1-5) & Grand Finale (Act 6) */}
      {/* ---------------------------------------------------- */}
      {time < 29.0 ? (
        <CameraRig
          scale={targetScale}
          focusX={targetFocusX}
          focusY={targetFocusY}
          rotateX={targetRotX}
          rotateY={targetRotY}
        >
          <div
            style={{
              position: "relative",
              opacity: interpolate(time, [1.8, 2.5], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {/* Authentic ZeroBox UI Component in OLED Black & Electric Blue */}
            <AuthenticZeroBoxUI
              currentAct={currentAct}
              actProgress={actProgress}
              timerSeconds={timerSeconds}
              isTimerRunning={isTimerRunning}
              selectedTrack={selectedTrack}
              searchQuery={searchQuery}
              kanbanDragProgress={kanbanDragProgress}
              isRootPwned={isRootPwned}
              confettiProgress={confettiProgress}
              revShellHost={revShellHost}
              revShellPort={revShellPort}
              isPayloadCopied={isPayloadCopied}
              examHoursLeft={examHoursLeft}
              examMinsLeft={examMinsLeft}
              radarExpansion={radarExpansion}
              isCtaClicked={isCtaClicked}
              showAiScanIntel={showAiScanIntel}
              showAttackGraph={showAttackGraph}
              themePreset={themePreset}
              isThemeDropdownOpen={isThemeDropdownOpen}
              themeDropdownHighlight={themeDropdownHighlight}
            />

            {/* Interactive Cursor Inside Window Coordinate Space */}
            <InteractiveCursor
              x={cursorX}
              y={cursorY}
              isClicking={isClicking}
              label={cursorLabel}
              opacity={cursorOpacity}
              clickProgress={clickProgress}
            />
          </div>
        </CameraRig>
      ) : (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <GrandFinaleShowcase
            progress={actProgress}
            isCtaClicked={isCtaClicked}
            themePreset={themePreset}
          />
          <InteractiveCursor
            x={cursorX}
            y={cursorY}
            isClicking={isClicking}
            label={cursorLabel}
            opacity={cursorOpacity}
            clickProgress={clickProgress}
          />
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. Cinematic Cold Open Hook Overlay (0.0s to 2.73s)  */}
      {/* ---------------------------------------------------- */}
      <CinematicColdOpen frame={frame} />
    </div>
  );
};

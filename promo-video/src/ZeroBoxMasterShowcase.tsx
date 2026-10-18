import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Audio,
  Sequence,
  staticFile,
} from "remotion";
import { CameraRig } from "./components-showcase/CameraRig";
import { InteractiveCursor } from "./components-showcase/InteractiveCursor";
import { AuthenticZeroBoxUI } from "./components-showcase/AuthenticZeroBoxUI";
import { CinematicColdOpen } from "./components-showcase/CinematicColdOpen";

export const ZeroBoxMasterShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ----------------------------------------------------
  // Timeline Choreography (Total: 1050 frames @ 30 fps = 35.0s)
  // ----------------------------------------------------
  // Act 1: 0   - 150f  (0.0s - 5.0s)  - Macro Reveal & Unified Header
  // Act 2: 150 - 330f  (5.0s - 11.0s) - Target Matrix & CPTS Filter
  // Act 3: 330 - 540f  (11.0s - 18.0s) - Tactical Kanban & Root Pwn
  // Act 4: 540 - 720f  (18.0s - 24.0s) - RevShell Studio & Copy Toast
  // Act 5: 720 - 870f  (24.0s - 29.0s) - Exam Mode & Skill Radar
  // Act 6: 870 - 1050f (29.0s - 35.0s) - 3D Pullback Grand Finale

  let currentAct: 1 | 2 | 3 | 4 | 5 | 6 = 1;
  let actStartFrame = 0;
  let actEndFrame = 150;

  if (frame < 150) {
    currentAct = 1;
    actStartFrame = 0;
    actEndFrame = 150;
  } else if (frame < 330) {
    currentAct = 2;
    actStartFrame = 150;
    actEndFrame = 330;
  } else if (frame < 540) {
    currentAct = 3;
    actStartFrame = 330;
    actEndFrame = 540;
  } else if (frame < 720) {
    currentAct = 4;
    actStartFrame = 540;
    actEndFrame = 720;
  } else if (frame < 870) {
    currentAct = 5;
    actStartFrame = 720;
    actEndFrame = 870;
  } else {
    currentAct = 6;
    actStartFrame = 870;
    actEndFrame = 1050;
  }

  const actProgress = (frame - actStartFrame) / (actEndFrame - actStartFrame);

  // ----------------------------------------------------
  // Dynamic Camera Interpolation (Focal Points)
  // ----------------------------------------------------
  // Smoothly blend camera scale and focal points across acts
  let targetScale = 1.0;
  let targetFocusX = 0.5;
  let targetFocusY = 0.5;
  let targetRotX = 0;
  let targetRotY = 0;

  if (frame < 150) {
    // Act 1: Starts with Cinematic Cold Open (f0-75), then warps and zooms into Unified Header (f75-150)
    const zoomProgress = interpolate(frame, [65, 110, 150], [0, 0.65, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    targetScale = interpolate(zoomProgress, [0, 1], [1.02, 1.48]);
    targetFocusX = interpolate(zoomProgress, [0, 1], [0.5, 0.55]);
    targetFocusY = interpolate(zoomProgress, [0, 1], [0.5, 0.12]);
    targetRotX = interpolate(zoomProgress, [0, 1], [3, 0]);
    targetRotY = 0;
  } else if (frame < 330) {
    // Act 2: Pan down to Target Filter bar & Search box
    const panProgress = interpolate(frame, [150, 200, 330], [0, 0.6, 1], {
      extrapolateRight: "clamp",
    });
    targetScale = interpolate(panProgress, [0, 1], [1.48, 1.40]);
    targetFocusX = interpolate(panProgress, [0, 1], [0.55, 0.42]);
    targetFocusY = interpolate(panProgress, [0, 1], [0.12, 0.28]);
    targetRotX = 0;
    targetRotY = 0;
  } else if (frame < 540) {
    // Act 3: Kanban board center
    const kanbanZoom = interpolate(frame, [330, 380, 540], [0, 0.5, 1], {
      extrapolateRight: "clamp",
    });
    targetScale = interpolate(kanbanZoom, [0, 1], [1.40, 1.34]);
    targetFocusX = interpolate(kanbanZoom, [0, 1], [0.42, 0.52]);
    targetFocusY = interpolate(kanbanZoom, [0, 1], [0.28, 0.45]);
    targetRotX = 0;
    targetRotY = 0;
  } else if (frame < 720) {
    // Act 4: RevShell Studio focus
    const shellZoom = interpolate(frame, [540, 590, 720], [0, 0.5, 1], {
      extrapolateRight: "clamp",
    });
    targetScale = interpolate(shellZoom, [0, 1], [1.34, 1.45]);
    targetFocusX = interpolate(shellZoom, [0, 1], [0.52, 0.50]);
    targetFocusY = interpolate(shellZoom, [0, 1], [0.45, 0.48]);
    targetRotX = 0;
    targetRotY = 0;
  } else if (frame < 870) {
    // Act 5: Exam Simulation & Skill Radar
    const examZoom = interpolate(frame, [720, 770, 870], [0, 0.5, 1], {
      extrapolateRight: "clamp",
    });
    targetScale = interpolate(examZoom, [0, 1], [1.45, 1.32]);
    targetFocusX = interpolate(examZoom, [0, 1], [0.50, 0.50]);
    targetFocusY = interpolate(examZoom, [0, 1], [0.48, 0.50]);
    targetRotX = 0;
    targetRotY = 0;
  } else {
    // Act 6: 3D Grand Pullback!
    const pullProgress = spring({
      frame: frame - 870,
      fps,
      config: { damping: 18, stiffness: 65, mass: 1 },
    });
    targetScale = interpolate(pullProgress, [0, 1], [1.32, 1.0]);
    targetFocusX = interpolate(pullProgress, [0, 1], [0.50, 0.50]);
    targetFocusY = interpolate(pullProgress, [0, 1], [0.50, 0.50]);
    targetRotX = interpolate(pullProgress, [0, 1], [0, 0]);
    targetRotY = 0;
  }

  // ----------------------------------------------------
  // Interactive UI States Choreography
  // ----------------------------------------------------
  // 1. Stopwatch timer: clicks at frame 108 (3.6s)
  const isTimerRunning = frame >= 108;
  const timerSeconds = 6138 + (isTimerRunning ? Math.floor((frame - 108) / 30) : 0);

  // 2. Track & Search Filter
  // Clicks CPTS at frame 205 (6.8s)
  const selectedTrack: "ALL" | "OSCP" | "CPTS" | "AD" | "REVSHELL" | "EXAM" =
    frame >= 205 ? "CPTS" : "ALL";

  // Search input typing between frame 255 and 290
  let searchQuery = "";
  const fullQuery = "service:smb";
  if (frame >= 255 && frame < 330) {
    const charsTyped = Math.min(
      fullQuery.length,
      Math.floor((frame - 255) / 3)
    );
    searchQuery = fullQuery.slice(0, charsTyped);
  }

  // 3. Kanban Drag & Drop (frame 380 to 455)
  const kanbanDragProgress = interpolate(frame, [380, 455], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const isRootPwned = frame >= 455;

  // Confetti burst (frame 455 to 535)
  const confettiProgress = interpolate(frame, [455, 525], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 4. RevShell live IP injection (frame 540 to 600)
  const fullIp = "10.10.14.33";
  let revShellHost = "10.10.14.";
  if (frame >= 550) {
    const ipChars = Math.min(
      fullIp.length,
      8 + Math.floor((frame - 550) / 4)
    );
    revShellHost = fullIp.slice(0, ipChars);
  }
  const revShellPort = "4444";
  const isPayloadCopied = frame >= 660 && frame < 720;

  // 5. Exam & Skill Radar expansion (frame 730 to 820)
  const examHoursLeft = 23;
  const examMinsLeft = 48 - Math.floor((frame - 720) / 100);
  const radarExpansion = spring({
    frame: Math.max(0, frame - 740),
    fps,
    config: { damping: 14, stiffness: 70 },
  });

  // 6. Tactile CTA Button Click State (frame 960 to 975)
  const isCtaClicked = frame >= 960 && frame <= 975;

  // ----------------------------------------------------
  // Interactive Cursor Path & Clicks
  // ----------------------------------------------------
  let cursorX = 720;
  let cursorY = 440;
  let cursorOpacity = 0;
  let isClicking = false;
  let cursorLabel: string | undefined = undefined;
  let clickProgress = 0;

  if (frame >= 70 && frame < 150) {
    // Act 1: Cursor moves to Stopwatch button (x: 1220, y: 78)
    cursorOpacity = interpolate(frame, [70, 85], [0, 1], { extrapolateRight: "clamp" });
    const moveProgress = spring({ frame: frame - 78, fps, config: { damping: 16 } });
    cursorX = interpolate(moveProgress, [0, 1], [900, 1220]);
    cursorY = interpolate(moveProgress, [0, 1], [350, 78]);
    cursorLabel = "Start Stopwatch";

    if (frame >= 105 && frame <= 114) {
      isClicking = true;
      clickProgress = (frame - 105) / 9;
    }
  } else if (frame >= 150 && frame < 330) {
    // Act 2: Cursor clicks CPTS Path, then focuses Search box
    cursorOpacity = 1;
    if (frame < 225) {
      // Move to CPTS Track pill (x: 375, y: 138)
      const moveProgress = spring({ frame: frame - 165, fps, config: { damping: 16 } });
      cursorX = interpolate(moveProgress, [0, 1], [1220, 375]);
      cursorY = interpolate(moveProgress, [0, 1], [78, 138]);
      cursorLabel = "Select CPTS Path";

      if (frame >= 203 && frame <= 212) {
        isClicking = true;
        clickProgress = (frame - 203) / 9;
      }
    } else {
      // Move to search box (x: 1040, y: 138)
      const searchMove = spring({ frame: frame - 225, fps, config: { damping: 16 } });
      cursorX = interpolate(searchMove, [0, 1], [375, 1040]);
      cursorY = interpolate(searchMove, [0, 1], [138, 138]);
      cursorLabel = "Search Target: service:smb";
      if (frame >= 250 && frame <= 258) {
        isClicking = true;
        clickProgress = (frame - 250) / 8;
      }
    }
  } else if (frame >= 330 && frame < 540) {
    // Act 3: Cursor grabs Sau card in Recon and drags it to Root Pwned
    cursorOpacity = 1;
    if (frame < 380) {
      // Move to Sau in Recon (x: 420, y: 260)
      const grabMove = spring({ frame: frame - 340, fps, config: { damping: 16 } });
      cursorX = interpolate(grabMove, [0, 1], [1040, 420]);
      cursorY = interpolate(grabMove, [0, 1], [138, 260]);
      cursorLabel = "Grab Target [Sau]";
    } else if (frame <= 455) {
      // Dragging card
      cursorX = 420 + (980 - 420) * kanbanDragProgress;
      cursorY = 260 + Math.sin(kanbanDragProgress * Math.PI) * -25;
      isClicking = true;
      cursorLabel = "Drag to Root Pwned";
    } else {
      // Settled in Root Pwned
      cursorX = 980;
      cursorY = 260;
      isClicking = false;
      cursorLabel = "Root Pwned 100%!";
    }
  } else if (frame >= 540 && frame < 720) {
    // Act 4: Cursor moves to Copy Payload button (x: 670, y: 395)
    cursorOpacity = 1;
    const copyMove = spring({ frame: frame - 570, fps, config: { damping: 16 } });
    cursorX = interpolate(copyMove, [0, 1], [980, 670]);
    cursorY = interpolate(copyMove, [0, 1], [260, 395]);
    cursorLabel = "1-Click Copy";

    if (frame >= 658 && frame <= 668) {
      isClicking = true;
      clickProgress = (frame - 658) / 10;
    }
  } else if (frame >= 720 && frame < 870) {
    // Act 5: Cursor inspects radar (x: 1080, y: 520)
    cursorOpacity = interpolate(frame, [720, 750], [1, 0.4]);
    cursorX = 1080;
    cursorY = 520;
    cursorLabel = undefined;
  } else {
    // Act 6: Outro - Cursor hovers CTA button (x: 720, y: 535)
    cursorOpacity = interpolate(frame, [880, 930], [0, 1], { extrapolateRight: "clamp" });
    const ctaMove = spring({ frame: frame - 915, fps, config: { damping: 16 } });
    cursorX = interpolate(ctaMove, [0, 1], [860, 720]);
    cursorY = interpolate(ctaMove, [0, 1], [680, 535]);
    cursorLabel = "Launch Free ➔";

    if (frame >= 960 && frame <= 972) {
      isClicking = true;
      clickProgress = (frame - 960) / 12;
    }
  }

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        backgroundColor: "#060911",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* ---------------------------------------------------- */}
      {/* 1. Synchronized Broadcast Master Audio Track */}
      {/* ---------------------------------------------------- */}
      <Audio
        src={staticFile("audio/showcase-master-soundtrack.wav")}
        volume={0.42}
      />

      {/* ---------------------------------------------------- */}
      {/* Synchronized Precision SFX Audio Stems */}
      {/* ---------------------------------------------------- */}
      {/* Act 1: Cold Open Braam (frame 0) & Desktop Boot Blip (frame 62) */}
      <Sequence durationInFrames={75}>
        <Audio src={staticFile("audio/sfx/sfx-cyber-braam.wav")} volume={0.65} />
      </Sequence>
      <Sequence from={62} durationInFrames={40}>
        <Audio src={staticFile("audio/sfx/sfx-boot-blip.wav")} volume={0.5} />
      </Sequence>

      {/* Act 1: Stopwatch UI click (frame 108) & tick (frame 114) */}
      <Sequence from={108} durationInFrames={30}>
        <Audio src={staticFile("audio/sfx/sfx-ui-click.wav")} volume={0.6} />
      </Sequence>
      <Sequence from={114} durationInFrames={60}>
        <Audio src={staticFile("audio/sfx/sfx-stopwatch-tick.wav")} volume={0.4} />
      </Sequence>

      {/* Act 2: Curated Track pill selection click (frame 205) */}
      <Sequence from={205} durationInFrames={30}>
        <Audio src={staticFile("audio/sfx/sfx-ui-click.wav")} volume={0.6} />
      </Sequence>

      {/* Act 2: Mechanical search typing (frame 255) */}
      <Sequence from={255} durationInFrames={70}>
        <Audio src={staticFile("audio/sfx/sfx-mechanical-typing.wav")} volume={0.45} />
      </Sequence>

      {/* Act 3: Kanban Card drag swoosh (frame 380) */}
      <Sequence from={380} durationInFrames={45}>
        <Audio src={staticFile("audio/sfx/sfx-card-swoosh.wav")} volume={0.55} />
      </Sequence>

      {/* Act 3: Flag captured victory celebration & confetti (frame 455) */}
      <Sequence from={455} durationInFrames={90}>
        <Audio src={staticFile("audio/sfx/sfx-flag-captured.wav")} volume={0.7} />
      </Sequence>

      {/* Act 4: 1-Click Payload copy click & chime (frame 660) */}
      <Sequence from={660} durationInFrames={45}>
        <Audio src={staticFile("audio/sfx/sfx-clipboard-copy.wav")} volume={0.65} />
      </Sequence>

      {/* Act 5: Offensive Skill Radar expansion sonar ping (frame 740) */}
      <Sequence from={740} durationInFrames={75}>
        <Audio src={staticFile("audio/sfx/sfx-radar-ping.wav")} volume={0.55} />
      </Sequence>

      {/* Act 6: 3D Grand Pullback star shimmer (frame 870) */}
      <Sequence from={870} durationInFrames={90}>
        <Audio src={staticFile("audio/sfx/sfx-star-shimmer.wav")} volume={0.6} />
      </Sequence>

      {/* Act 6: Outro CTA Launch click (frame 960) */}
      <Sequence from={960} durationInFrames={35}>
        <Audio src={staticFile("audio/sfx/sfx-ui-click.wav")} volume={0.65} />
      </Sequence>

      {/* ---------------------------------------------------- */}
      {/* 2. Radiant Silicon Valley Ambient Backdrop */}
      {/* ---------------------------------------------------- */}
      {/* Ambient Gradient Glow Orbs */}
      <div
        style={{
          position: "absolute",
          top: -200,
          left: -150,
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)",
          filter: "blur(90px)",
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
          background: "radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, transparent 70%)",
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
          background: "radial-gradient(circle, rgba(168, 85, 247, 0.10) 0%, transparent 70%)",
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
            "radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      {/* ---------------------------------------------------- */}
      {/* 3. 3D Focal-Point Camera Rig */}
      {/* ---------------------------------------------------- */}
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
            opacity: interpolate(frame, [52, 74], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {/* Authentic ZeroBox UI Component */}
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

      {/* ---------------------------------------------------- */}
      {/* 4. Cinematic Cold Open Hook Overlay (Frames 0 - 82) */}
      {/* ---------------------------------------------------- */}
      <CinematicColdOpen frame={frame} />
    </div>
  );
};

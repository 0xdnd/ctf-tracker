import React from "react";
import {
  AbsoluteFill,
  Series,
  Audio,
  staticFile,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { Scene1_TitleBreach } from "./scenes/Scene1_TitleBreach";
import { Scene2_MachineMatrix } from "./scenes/Scene2_MachineMatrix";
import { Scene3_LifecyclePipeline } from "./scenes/Scene3_LifecyclePipeline";
import { Scene4_DynamicCheatsheet } from "./scenes/Scene4_DynamicCheatsheet";
import { Scene5_WriteupStudio } from "./scenes/Scene5_WriteupStudio";
import { Scene6_SkillRadar } from "./scenes/Scene6_SkillRadar";
import { Scene7_OutroCTA } from "./scenes/Scene7_OutroCTA";

export const ZeroBoxPromoNeon: React.FC = () => {
  const frame = useCurrentFrame();

  // Subtle pulsing neon glow along the perimeter
  const neonPulse = interpolate(
    Math.sin((frame / 16) * Math.PI),
    [-1, 1],
    [0.18, 0.35]
  );

  // Floating matrix vertical scan beam
  const scanBeamY = (frame * 12) % 1080;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#040711",
        overflow: "hidden",
      }}
    >
      {/* Master Soundtrack B: Cinematic Neon Warmth (Lo-Fi Synthwave) at comfortable broadcast volume */}
      <Audio
        src={staticFile("audio/cyber-soundtrack-neon.wav")}
        volume={0.45}
      />

      {/* Main Scenes Series with Electric Cyber Color Grade */}
      <div
        style={{
          width: "100%",
          height: "100%",
          filter: "saturate(1.22) contrast(1.08)",
        }}
      >
        <Series>
          {/* Scene 1: Tactical Breach & Title Reveal (0 - 150f | 5.0s) */}
          <Series.Sequence durationInFrames={150}>
            <Scene1_TitleBreach />
          </Series.Sequence>

          {/* Scene 2: The 1005+ Machine Matrix (150 - 300f | 5.0s) */}
          <Series.Sequence durationInFrames={150}>
            <Scene2_MachineMatrix />
          </Series.Sequence>

          {/* Scene 3: 5-Stage Attack Lifecycle Pipeline (300 - 480f | 6.0s) */}
          <Series.Sequence durationInFrames={180}>
            <Scene3_LifecyclePipeline />
          </Series.Sequence>

          {/* Scene 4: Dynamic Cheatsheet & RevShell Studio (480 - 660f | 6.0s) */}
          <Series.Sequence durationInFrames={180}>
            <Scene4_DynamicCheatsheet />
          </Series.Sequence>

          {/* Scene 5: Embedded Writeup Studio & Exam Mode (660 - 840f | 6.0s) */}
          <Series.Sequence durationInFrames={180}>
            <Scene5_WriteupStudio />
          </Series.Sequence>

          {/* Scene 6: Operational Analytics & Skill Radar (840 - 1000f | 5.3s) */}
          <Series.Sequence durationInFrames={160}>
            <Scene6_SkillRadar />
          </Series.Sequence>

          {/* Scene 7: Outro & Call to Action (1000 - 1140f | 4.7s) */}
          <Series.Sequence durationInFrames={140}>
            <Scene7_OutroCTA />
          </Series.Sequence>
        </Series>
      </div>

      {/* Ambient Matrix Neon Glassmorphic Perimeter Frame & Glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: `2px solid rgba(0, 255, 102, ${neonPulse})`,
          boxShadow: `inset 0 0 90px rgba(0, 255, 102, 0.12), inset 0 0 35px rgba(0, 240, 255, 0.08)`,
          pointerEvents: "none",
          zIndex: 99,
        }}
      />

      {/* Matrix Horizontal Telemetry Scan Laser */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: scanBeamY,
          height: 2,
          background: "linear-gradient(90deg, transparent 0%, rgba(0, 255, 102, 0.35) 50%, transparent 100%)",
          boxShadow: "0 0 10px rgba(0, 255, 102, 0.5)",
          pointerEvents: "none",
          zIndex: 100,
        }}
      />

      {/* Corner Glass Accents */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 28,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          fontWeight: 700,
          color: "rgba(0, 255, 102, 0.7)",
          letterSpacing: "0.15em",
          zIndex: 101,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "#00FF66",
            boxShadow: "0 0 8px #00FF66",
          }}
        />
        NEON GLASS // HIGH-CONTRAST MATRIX
      </div>
    </AbsoluteFill>
  );
};

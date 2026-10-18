import React from "react";
import { Series, Audio, staticFile } from "remotion";
import { Scene1_TitleBreach } from "./scenes/Scene1_TitleBreach";
import { Scene2_MachineMatrix } from "./scenes/Scene2_MachineMatrix";
import { Scene3_LifecyclePipeline } from "./scenes/Scene3_LifecyclePipeline";
import { Scene4_DynamicCheatsheet } from "./scenes/Scene4_DynamicCheatsheet";
import { Scene5_WriteupStudio } from "./scenes/Scene5_WriteupStudio";
import { Scene6_SkillRadar } from "./scenes/Scene6_SkillRadar";
import { Scene7_OutroCTA } from "./scenes/Scene7_OutroCTA";

export const ZeroBoxPromo: React.FC = () => {
  return (
    <>
      {/* Master Cyberpunk Electronic Soundtrack with Synchronized SFX (Stealth Edition) */}
      <Audio
        src={staticFile("audio/cyber-soundtrack-stealth.wav")}
        volume={0.45}
      />

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
    </>
  );
};

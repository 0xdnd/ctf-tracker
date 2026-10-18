import React from "react";
import { Series, Audio, staticFile } from "remotion";
import { Scene1_HeroReveal } from "./scenes-saas/Scene1_HeroReveal";
import { Scene2_TargetMatrix } from "./scenes-saas/Scene2_TargetMatrix";
import { Scene3_WorkflowBoard } from "./scenes-saas/Scene3_WorkflowBoard";
import { Scene4_PayloadStudio } from "./scenes-saas/Scene4_PayloadStudio";
import { Scene5_ExamStudio } from "./scenes-saas/Scene5_ExamStudio";
import { Scene6_OutroLaunch } from "./scenes-saas/Scene6_OutroLaunch";

export const ZeroBoxPromoSaaS: React.FC = () => {
  return (
    <>
      {/* Modern Neoclassical Indie Electronic Tech Soundtrack (Gentle Broadcast Volume) */}
      <Audio
        src={staticFile("audio/saas-soundtrack.wav")}
        volume={0.42}
      />

      <Series>
        {/* Scene 1: Hero Reveal & Overview (0 - 150f | 5.0s) */}
        <Series.Sequence durationInFrames={150}>
          <Scene1_HeroReveal />
        </Series.Sequence>

        {/* Scene 2: Target Intelligence Matrix (150 - 300f | 5.0s) */}
        <Series.Sequence durationInFrames={150}>
          <Scene2_TargetMatrix />
        </Series.Sequence>

        {/* Scene 3: 5-Stage Workflow Pipeline (300 - 450f | 5.0s) */}
        <Series.Sequence durationInFrames={150}>
          <Scene3_WorkflowBoard />
        </Series.Sequence>

        {/* Scene 4: Dynamic Payload Studio (450 - 600f | 5.0s) */}
        <Series.Sequence durationInFrames={150}>
          <Scene4_PayloadStudio />
        </Series.Sequence>

        {/* Scene 5: Exam Mode & Documentation (600 - 750f | 5.0s) */}
        <Series.Sequence durationInFrames={150}>
          <Scene5_ExamStudio />
        </Series.Sequence>

        {/* Scene 6: Outro & Call to Action (750 - 900f | 5.0s) */}
        <Series.Sequence durationInFrames={150}>
          <Scene6_OutroLaunch />
        </Series.Sequence>
      </Series>
    </>
  );
};

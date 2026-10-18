import React from "react";
import { Composition } from "remotion";
import { ZeroBox60fpsShowcase } from "./ZeroBox60fpsShowcase";
import { ZeroBoxPromo } from "./ZeroBoxPromo";
import { ZeroBoxPromoNeon } from "./ZeroBoxPromoNeon";
import { ZeroBoxPromoSaaS } from "./ZeroBoxPromoSaaS";
import { ZeroBoxPromoVertical } from "./ZeroBoxPromoVertical";
import { ZeroBoxMasterShowcase } from "./ZeroBoxMasterShowcase";
import { ZeroBoxNanoBananaShowcase } from "./ZeroBoxNanoBananaShowcase";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 60 FPS Master Flagship Showcase: 1080p Full HD @ 60 FPS (35.0 seconds = 2100 frames) */}
      <Composition
        id="ZeroBox60fpsShowcase"
        component={ZeroBox60fpsShowcase}
        durationInFrames={2100} // 35 seconds at 60 fps
        fps={60}
        width={1920}
        height={1080}
      />

      {/* 30 FPS Master Flagship Showcase: 1080p Full HD @ 30 FPS (35.0 seconds = 1050 frames) */}
      <Composition
        id="ZeroBox30fpsShowcase"
        component={ZeroBox60fpsShowcase}
        durationInFrames={1050} // 35 seconds at 30 fps
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Google Nano Banana AI Edition: 4-Act Cinematic Cyber Showcase (1080p Full HD) */}
      <Composition
        id="ZeroBoxNanoBananaShowcase"
        component={ZeroBoxNanoBananaShowcase}
        durationInFrames={900} // 30 seconds at 30 fps
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Master Flagship Showcase: 3D Camera Rig + Real UI + Calibrated Warm Audio */}
      <Composition
        id="ZeroBoxMasterShowcase"
        component={ZeroBoxMasterShowcase}
        durationInFrames={1050} // 35 seconds at 30 fps
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Brand New Edition: Modern Silicon Valley SaaS (Linear / Apple / Vercel style) */}
      <Composition
        id="ZeroBoxPromoSaaS"
        component={ZeroBoxPromoSaaS}
        durationInFrames={900} // 30 seconds at 30 fps
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Version A: Tactical Stealth Edition (1080p Full HD) */}
      <Composition
        id="ZeroBoxPromo"
        component={ZeroBoxPromo}
        durationInFrames={1140} // 38 seconds at 30 fps
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="ZeroBoxPromoStealth"
        component={ZeroBoxPromo}
        durationInFrames={1140}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Version B: Matrix Neon Glass Edition (1080p Full HD) */}
      <Composition
        id="ZeroBoxPromoNeon"
        component={ZeroBoxPromoNeon}
        durationInFrames={1140}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* 9:16 Vertical 60 FPS Composition (TikTok / Instagram Reels / YouTube Shorts / Mobile) */}
      <Composition
        id="ZeroBoxPromoVertical"
        component={ZeroBoxPromoVertical}
        durationInFrames={2100} // 35 seconds at 60 fps
        fps={60}
        width={1080}
        height={1920}
      />

      <Composition
        id="ZeroBox60fpsVertical"
        component={ZeroBoxPromoVertical}
        durationInFrames={2100} // 35 seconds at 60 fps
        fps={60}
        width={1080}
        height={1920}
      />

      {/* 9:16 Vertical 30 FPS Composition (TikTok / Instagram Reels / YouTube Shorts / Mobile) */}
      <Composition
        id="ZeroBox30fpsVertical"
        component={ZeroBoxPromoVertical}
        durationInFrames={1050} // 35 seconds at 30 fps
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};

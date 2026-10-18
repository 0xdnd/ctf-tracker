import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../styles/theme";

interface TacticalHUDProps {
  sceneTitle?: string;
  classification?: string;
}

export const TacticalHUD: React.FC<TacticalHUDProps> = ({
  sceneTitle = "TACTICAL OPERATIONS CONSOLE",
  classification = "TOP SECRET // OP-0XDND",
}) => {
  const frame = useCurrentFrame();

  // Blinking dot every 30 frames (1 sec)
  const isBlink = Math.floor(frame / 15) % 2 === 0;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 100,
      }}
    >
      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(11, 15, 25, 0) 55%, rgba(3, 7, 18, 0.75) 100%)",
        }}
      />

      {/* High-Tech Corner Brackets */}
      {/* Top Left */}
      <div
        style={{
          position: "absolute",
          top: 36,
          left: 48,
          width: 32,
          height: 32,
          borderTop: `2px solid ${theme.colors.emerald}`,
          borderLeft: `2px solid ${theme.colors.emerald}`,
        }}
      />
      {/* Top Right */}
      <div
        style={{
          position: "absolute",
          top: 36,
          right: 48,
          width: 32,
          height: 32,
          borderTop: `2px solid ${theme.colors.emerald}`,
          borderRight: `2px solid ${theme.colors.emerald}`,
        }}
      />
      {/* Bottom Left */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          left: 48,
          width: 32,
          height: 32,
          borderBottom: `2px solid ${theme.colors.emerald}`,
          borderLeft: `2px solid ${theme.colors.emerald}`,
        }}
      />
      {/* Bottom Right */}
      <div
        style={{
          position: "absolute",
          bottom: 36,
          right: 48,
          width: 32,
          height: 32,
          borderBottom: `2px solid ${theme.colors.emerald}`,
          borderRight: `2px solid ${theme.colors.emerald}`,
        }}
      />

      {/* Top Tactical Telemetry Header */}
      <div
        style={{
          position: "absolute",
          top: 42,
          left: 96,
          right: 96,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: theme.fonts.mono,
          fontSize: 13,
          letterSpacing: 2,
          color: theme.colors.textMuted,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              display: "inline-block",
              width: 9,
              height: 9,
              borderRadius: "50%",
              backgroundColor: isBlink ? theme.colors.crimson : "transparent",
              border: `1px solid ${theme.colors.crimson}`,
              boxShadow: isBlink ? theme.shadows.glowCrimson : "none",
            }}
          />
          <span style={{ color: theme.colors.emerald, fontWeight: 700 }}>
            REC [LIVE-FEED]
          </span>
          <span style={{ color: theme.colors.textDim }}>//</span>
          <span>{classification}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ color: theme.colors.cyanBright }}>{sceneTitle}</span>
          <span style={{ color: theme.colors.textDim }}>//</span>
          <span style={{ color: theme.colors.textMuted }}>NODE: TLV-01</span>
        </div>
      </div>

      {/* Bottom Tactical Status Footer */}
      <div
        style={{
          position: "absolute",
          bottom: 42,
          left: 96,
          right: 96,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: theme.fonts.mono,
          fontSize: 12,
          letterSpacing: 2,
          color: theme.colors.textDim,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span>ZEROBOX // TACTICAL CTF SUITE</span>
          <span style={{ color: theme.colors.emerald }}>[ONLINE]</span>
          <span>OFFLINE-FIRST SHA-256</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span>FRAME: {String(frame).padStart(4, "0")}</span>
          <span style={{ color: theme.colors.emerald }}>
            SECURE: AES-256-GCM
          </span>
          <span style={{ color: theme.colors.cyanBright }}>
            DANIEL DAYAN (@0XDND)
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { Sparkles, Shield } from "lucide-react";
import { RadiantBackground } from "../components-saas/RadiantBackground";
import { MacOSWindow } from "../components-saas/MacOSWindow";

export const Scene1_HeroReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring for the hero title
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  // Browser mockup entrance spring starting at frame 25
  const windowSpring = spring({
    frame: frame - 25,
    fps,
    config: { damping: 15, stiffness: 75, mass: 0.9 },
  });

  // 3D perspective rotation tilt that levels out smoothly
  const rotX = interpolate(windowSpring, [0, 1], [18, 5]);
  const windowY = interpolate(windowSpring, [0, 1], [120, 0]);
  const windowOpacity = interpolate(windowSpring, [0, 0.4, 1], [0, 0.8, 1]);

  // Overall scene fade out
  const sceneOpacity = interpolate(frame, [135, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <RadiantBackground>
      <AbsoluteFill
        style={{
          opacity: sceneOpacity,
          padding: "60px 80px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Top Header Badge */}
        <div
          style={{
            transform: `translateY(${(1 - titleSpring) * -30}px)`,
            opacity: titleSpring,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            textAlign: "center",
          }}
        >
          {/* Pill Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(99, 102, 241, 0.12)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              padding: "6px 18px",
              borderRadius: 30,
              color: "#A5B4FC",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "Inter, sans-serif",
            }}
          >
            <Sparkles size={14} color="#818CF8" />
            <span>THE NEXT-GEN OFFENSIVE SECURITY PLATFORM</span>
          </div>

          {/* Main Title */}
          <h1
            style={{
              fontSize: 56,
              fontWeight: 800,
              fontFamily: "Inter, -apple-system, sans-serif",
              letterSpacing: "-0.03em",
              margin: 0,
              background: "linear-gradient(135deg, #FFFFFF 30%, #94A3B8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            ZeroBox CTF Tracker
          </h1>

          <p
            style={{
              fontSize: 18,
              color: "#94A3B8",
              fontFamily: "Inter, sans-serif",
              margin: 0,
              maxWidth: 680,
            }}
          >
            The unified workspace for Hack The Box, TryHackMe, live reverse shells, and CPTS exam mastery.
          </p>
        </div>

        {/* Floating 3D Browser Mockup */}
        <div
          style={{
            width: "90%",
            height: 480,
            perspective: 1200,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <MacOSWindow
            style={{
              width: "100%",
              height: "100%",
              transform: `translateY(${windowY}px) rotateX(${rotX}deg)`,
              opacity: windowOpacity,
            }}
          >
            {/* Dashboard Mockup Content */}
            <div
              style={{
                padding: "30px 40px",
                display: "flex",
                flexDirection: "column",
                gap: 24,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {/* Top Metrics Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                {[
                  { label: "Total Machines", val: "1005", change: "+100% Offline", color: "#3B82F6" },
                  { label: "Hack The Box", val: "543", change: "Full Matrix", color: "#10B981" },
                  { label: "TryHackMe", val: "462", change: "All Rooms", color: "#EF4444" },
                  { label: "Solves Verified", val: "55", change: "By Daniel Dayan", color: "#F59E0B" },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 14,
                      padding: "16px 20px",
                    }}
                  >
                    <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 6 }}>{stat.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: "#F8FAFC" }}>{stat.val}</div>
                    <div style={{ fontSize: 12, color: stat.color, marginTop: 4, fontWeight: 500 }}>{stat.change}</div>
                  </div>
                ))}
              </div>

              {/* Sample Target Row */}
              <div
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: 14,
                  padding: "18px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Shield size={22} color="#10B981" />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "#F8FAFC" }}>Sau — 10.10.11.224</div>
                    <div style={{ fontSize: 13, color: "#64748B" }}>Linux // Easy // SSRF in Requests-Baskets ➔ Maltrail RCE</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      padding: "5px 12px",
                      borderRadius: 20,
                      backgroundColor: "rgba(16, 185, 129, 0.15)",
                      color: "#34D399",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    ROOT PWNED
                  </span>
                </div>
              </div>
            </div>
          </MacOSWindow>
        </div>
      </AbsoluteFill>
    </RadiantBackground>
  );
};

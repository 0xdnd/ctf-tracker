import React from "react";

interface InteractiveCursorProps {
  x: number; // pixels relative to parent
  y: number; // pixels relative to parent
  isClicking?: boolean;
  label?: string;
  opacity?: number;
  clickProgress?: number; // 0 to 1 for ripple effect
}

export const InteractiveCursor: React.FC<InteractiveCursorProps> = ({
  x,
  y,
  isClicking = false,
  label,
  opacity = 1,
  clickProgress = 0,
}) => {
  if (opacity <= 0.01) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: x,
        pointerEvents: "none",
        zIndex: 9999,
        opacity,
        transform: `translate(-2px, -2px) scale(${isClicking ? 0.88 : 1})`,
      }}
    >
      {/* Click Ripple Effect */}
      {clickProgress > 0 && clickProgress < 1 && (
        <div
          style={{
            position: "absolute",
            top: 2,
            left: 2,
            width: 32 * clickProgress,
            height: 32 * clickProgress,
            borderRadius: "50%",
            border: `2px solid rgba(16, 185, 129, ${1 - clickProgress})`,
            backgroundColor: `rgba(16, 185, 129, ${(1 - clickProgress) * 0.2})`,
            transform: "translate(-50%, -50%)",
          }}
        />
      )}

      {/* Modern Cursor SVG */}
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          filter: "drop-shadow(0 3px 8px rgba(0, 0, 0, 0.6))",
        }}
      >
        <path
          d="M4.5 3.5L11.5 20.5L14.2 13.8L20.8 11.5L4.5 3.5Z"
          fill="#FFFFFF"
          stroke="#0F172A"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>

      {/* Floating Action Badge / Tooltip */}
      {label && (
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 18,
            backgroundColor: "#0F172A",
            color: "#F8FAFC",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            borderRadius: 8,
            padding: "3px 9px",
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "Inter, -apple-system, sans-serif",
            whiteSpace: "nowrap",
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: isClicking ? "#10B981" : "#38BDF8",
            }}
          />
          {label}
        </div>
      )}
    </div>
  );
};

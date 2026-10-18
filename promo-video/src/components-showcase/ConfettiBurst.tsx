import React from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

interface ConfettiBurstProps {
  progress: number; // 0 (start) to 1 (end)
  originX?: number; // px
  originY?: number; // px
}

const COLORS = ["#10B981", "#34D399", "#38BDF8", "#F59E0B", "#A855F7", "#EC4899", "#F8FAFC"];

export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({
  progress,
  originX = 0,
  originY = 0,
}) => {
  if (progress <= 0 || progress >= 1) return null;

  // Generate deterministic particles
  const particleCount = 42;
  const particles: Particle[] = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2 + (i % 3) * 0.2;
    const speed = 180 + (i % 7) * 45;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed - 60; // bias slightly upwards

    particles.push({
      id: i,
      x: vx * progress,
      y: vy * progress + 200 * progress * progress, // gravity
      vx,
      vy,
      color: COLORS[i % COLORS.length],
      size: 6 + (i % 5) * 2,
      rotation: (i * 45 + progress * 720 * ((i % 2 === 0 ? 1 : -1))) % 360,
      rotationSpeed: (i % 3 + 1) * 360,
    });
  }

  const opacity = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;

  return (
    <div
      style={{
        position: "absolute",
        top: originY,
        left: originX,
        pointerEvents: "none",
        zIndex: 50,
        opacity,
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size * (p.id % 2 === 0 ? 0.6 : 1),
            backgroundColor: p.color,
            borderRadius: p.id % 3 === 0 ? "50%" : 2,
            transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg)`,
            boxShadow: `0 0 8px ${p.color}88`,
          }}
        />
      ))}
    </div>
  );
};

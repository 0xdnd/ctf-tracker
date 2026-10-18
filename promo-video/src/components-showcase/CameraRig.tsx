import React from "react";

interface CameraRigProps {
  scale: number;
  focusX: number; // 0.0 to 1.0
  focusY: number; // 0.0 to 1.0
  rotateX?: number; // degrees
  rotateY?: number; // degrees
  translateZ?: number; // px
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const CameraRig: React.FC<CameraRigProps> = ({
  scale,
  focusX,
  focusY,
  rotateX = 0,
  rotateY = 0,
  translateZ = 0,
  children,
  style,
}) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        perspective: 1400,
        perspectiveOrigin: "50% 50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transformOrigin: `${(focusX * 100).toFixed(2)}% ${(focusY * 100).toFixed(2)}%`,
          transform: `scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${translateZ}px)`,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
};

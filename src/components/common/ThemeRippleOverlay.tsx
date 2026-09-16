import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';

export const ThemeRippleOverlay: React.FC = () => {
  const { rippleState, prefersReducedMotion } = useTheme();

  // If reduced motion is preferred or no active fallback ripple, render nothing
  if (prefersReducedMotion || !rippleState?.active) {
    return null;
  }

  return (
    <AnimatePresence>
      {rippleState.active && (
        <motion.div
          key="theme-ripple-canvas"
          initial={{
            clipPath: `circle(0px at ${rippleState.x}px ${rippleState.y}px)`,
            opacity: 0.96,
          }}
          animate={{
            clipPath: `circle(150vmax at ${rippleState.x}px ${rippleState.y}px)`,
            opacity: 1,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 0.38,
            ease: [0.16, 1, 0.3, 1],
          }}
          className={`fixed inset-0 pointer-events-none z-[999999] ${
            rippleState.targetIsDark ? 'bg-[#0B0F19]' : 'bg-[#F8FAFC]'
          }`}
          style={{ willChange: 'clip-path' }}
        />
      )}
    </AnimatePresence>
  );
};


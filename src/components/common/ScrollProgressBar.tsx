import React, { useState, useEffect } from 'react';
import { motion, useSpring } from 'framer-motion';
import { useScrollState } from '../../context/ScrollContext';

export const ScrollProgressBar: React.FC = React.memo(() => {
  const { scrollProgressMotion, isScrolled } = useScrollState();
  const smoothProgress = useSpring(scrollProgressMotion, { stiffness: 350, damping: 30 });
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    return smoothProgress.on('change', (val) => {
      const p = Math.round(val * 100);
      setPercent((prev) => (Math.abs(prev - p) >= 2 || p === 0 || p === 100 ? p : prev));
    });
  }, [smoothProgress]);

  return (
    <>
      {/* Technical Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-cyber-border/40 pointer-events-none">
        <motion.div
          className="h-full bg-cyber-cyan relative"
          style={{ 
            scaleX: smoothProgress,
            transformOrigin: 'left'
          }}
        />
      </div>

      {/* Subtle Scroll Percentage HUD in Header Right */}
      {isScrolled && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="fixed top-2.5 right-24 z-40 px-2 py-0.5 rounded-md bg-cyber-card border border-cyber-border text-[10px] font-mono text-cyber-muted pointer-events-none flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyber-cyan" />
          <span className="tabular-nums">DEPTH: {percent}%</span>
        </motion.div>
      )}
    </>
  );
});

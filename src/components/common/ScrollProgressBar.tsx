import React from 'react';
import { motion, useSpring } from 'framer-motion';
import { useScrollState } from '../../context/ScrollContext';

/**
 * Thin top-edge scroll progress indicator. The previous floating "depth" percentage
 * pill overlapped the header controls and duplicated the back-to-top button, so it is gone.
 */
export const ScrollProgressBar: React.FC = React.memo(() => {
  const { scrollProgressMotion } = useScrollState();
  const smoothProgress = useSpring(scrollProgressMotion, { stiffness: 350, damping: 30 });

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-surface-hover pointer-events-none" aria-hidden="true">
      <motion.div
        className="h-full bg-accent"
        style={{
          scaleX: smoothProgress,
          transformOrigin: 'left',
        }}
      />
    </div>
  );
});

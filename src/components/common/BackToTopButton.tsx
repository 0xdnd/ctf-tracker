import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useScrollState, useScrollActions } from '../../context/ScrollContext';
import { useCtfStore } from '../../store/useCtfStore';
import { playCyberSound } from '../../utils/helpers';

export const BackToTopButton: React.FC = React.memo(() => {
  const { isScrolled, scrollProgressMotion } = useScrollState();
  const { scrollToTop } = useScrollActions();
  const soundEnabled = useCtfStore((s) => s.soundEnabled);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!isScrolled) return;
    setPercent(Math.round(scrollProgressMotion.get() * 100));
    return scrollProgressMotion.on('change', (latest) => {
      const p = Math.round(latest * 100);
      setPercent((prev) => (Math.abs(prev - p) >= 2 || p === 0 || p === 100 ? p : prev));
    });
  }, [isScrolled, scrollProgressMotion]);

  const handleClick = () => {
    scrollToTop();
    if (soundEnabled) playCyberSound('toggle');
  };

  return (
    <AnimatePresence>
      {isScrolled && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          whileHover={{ scale: 1.08, y: -2 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={handleClick}
          className="fixed bottom-20 right-4 md:bottom-4 md:right-6 z-40 flex items-center gap-2 px-3 py-2 rounded-xl bg-cyber-card/90 hover:bg-cyber-card border border-cyber-cyan/50 hover:border-cyber-cyan text-cyber-cyan hover:text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] backdrop-blur-md font-mono text-xs transition-[colors,box-shadow,border-color] group"
          title="Scroll Back to Top"
        >
          <div className="relative">
            <ArrowUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-cyber-cyan rounded-full blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold tracking-wider text-[10px] leading-tight">TOP</span>
            <span className="text-[9px] text-cyber-muted font-normal leading-tight">
              {percent}%
            </span>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
});

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
          exit={{ opacity: 0, scale: 0.9, y: 12, transition: { duration: 0.12 } }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          onClick={handleClick}
          className="fixed bottom-20 right-4 md:bottom-16 md:right-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-card hover:bg-surface-hover border border-subtle hover:border-strong text-secondary hover:text-primary shadow-md text-xs font-sans transition-colors group [@media(pointer:coarse)]:min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Scroll Back to Top"
        >
          <div className="relative">
            <ArrowUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                      </div>
          <div className="flex flex-col text-left">
            <span className="font-medium text-[11px] leading-tight">Top</span>
            <span className="text-[10px] text-muted font-mono tabular-nums font-normal leading-tight">
              {percent}%
            </span>
          </div>
        </motion.button>
      )}
    </AnimatePresence>
  );
});

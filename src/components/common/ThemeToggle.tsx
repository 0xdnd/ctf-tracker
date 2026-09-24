import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import { playCyberSound } from '../../utils/helpers';

export interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  soundEnabled?: boolean;
  onToggle?: (isDark: boolean, event: React.MouseEvent | React.KeyboardEvent) => void;
  ariaLabel?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'md',
  showLabel = false,
  className = '',
  soundEnabled = true,
  onToggle,
  ariaLabel = 'Toggle dark and light mode',
}) => {
  const { isDark, toggleTheme, prefersReducedMotion } = useTheme();

  // Metrics for different sizes
  const dimensions = {
    sm: {
      width: 58,
      height: 30,
      knobSize: 24,
      padding: 3,
      travel: 28,
      iconSize: 16,
    },
    md: {
      width: 68,
      height: 34,
      knobSize: 28,
      padding: 3,
      travel: 34,
      iconSize: 18,
    },
    lg: {
      width: 82,
      height: 40,
      knobSize: 32,
      padding: 4,
      travel: 42,
      iconSize: 22,
    },
  }[size];

  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (soundEnabled) {
      playCyberSound(isDark ? 'click' : 'toggle');
    }
    toggleTheme(e);
    if (onToggle) {
      onToggle(!isDark, e);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      handleToggle(e);
    }
  };

  const springTransition = prefersReducedMotion
    ? { duration: 0.05 }
    : {
        type: 'spring' as const,
        damping: 24,
        stiffness: 450,
        mass: 0.3,
      };

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      <motion.button
        type="button"
        role="switch"
        aria-checked={!isDark}
        aria-label={ariaLabel}
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="relative flex items-center rounded-full cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan border"
        style={{
          width: dimensions.width,
          height: dimensions.height,
        }}
        animate={{
          backgroundColor: isDark ? '#475368' : '#cbd7e3',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : '#b0c2d4',
        }}
        transition={{ duration: 0.3 }}
        whileHover={prefersReducedMotion ? {} : { scale: 1.03 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.96 }}
      >
        {/* DARK MODE: Starlight Dots on the Right Half */}
        <AnimatePresence>
          {isDark && (
            <motion.div
              key="stars"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
              className="absolute right-1.5 top-0 bottom-0 pointer-events-none"
              style={{ width: dimensions.travel }}
            >
              {/* Star 1 */}
              <div className="absolute w-[3px] h-[3px] bg-white rounded-full top-[6px] left-[6px] shadow-[0_0_2px_#fff]" />
              {/* Star 2 */}
              <div className="absolute w-[4.5px] h-[4.5px] bg-white rounded-full top-[8px] right-[5px] shadow-[0_0_2px_#fff]" />
              {/* Star 3 */}
              <div className="absolute w-[2.5px] h-[2.5px] bg-white rounded-full top-[16px] left-[13px] shadow-[0_0_2px_#fff]" />
              {/* Star 4 */}
              <div className="absolute w-[4px] h-[4px] bg-white rounded-full bottom-[5px] right-[6px] shadow-[0_0_2px_#fff]" />
              {/* Star 5 */}
              <div className="absolute w-[2px] h-[2px] bg-white rounded-full bottom-[3px] left-[4px] shadow-[0_0_2px_#fff]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sliding Pure White Circular Knob */}
        <motion.div
          className="absolute z-10 flex items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
          style={{
            width: dimensions.knobSize,
            height: dimensions.knobSize,
            top: dimensions.padding,
            left: dimensions.padding,
          }}
          animate={{
            x: isDark ? 0 : dimensions.travel,
          }}
          transition={springTransition}
        >
          {/* Inner Icon: Dark Crescent Moon (Dark Mode) or Dark Sun with Radial Spokes (Light Mode) */}
          <div
            className="relative flex items-center justify-center pointer-events-none"
            style={{
              width: dimensions.iconSize,
              height: dimensions.iconSize,
            }}
          >
            {/* DARK MODE: Crescent Moon */}
            <motion.svg
              viewBox="0 0 24 24"
              className="absolute w-full h-full text-[#475368]"
              fill="currentColor"
              initial={false}
              animate={{
                opacity: isDark ? 1 : 0,
                scale: isDark ? 1 : 0.4,
                rotate: isDark ? 0 : -90,
              }}
              transition={springTransition}
            >
              <path d="M12.3 2a10 10 0 0 0-.19 20 10 10 0 0 0 8.35-4.5 10 10 0 0 1-11.66-11.66A9.9 9.9 0 0 0 12.3 2z" />
            </motion.svg>

            {/* LIGHT MODE: Stylized Sun with 8 Radial Rounded Rays */}
            <motion.svg
              viewBox="0 0 24 24"
              className="absolute w-full h-full text-[#475368]"
              fill="currentColor"
              initial={false}
              animate={{
                opacity: isDark ? 0 : 1,
                scale: isDark ? 0.4 : 1,
                rotate: isDark ? 90 : 0,
              }}
              transition={springTransition}
            >
              <circle cx="12" cy="12" r="4.5" />
              <rect x="11" y="1.5" width="2" height="3" rx="1" />
              <rect x="11" y="19.5" width="2" height="3" rx="1" />
              <rect x="1.5" y="11" width="3" height="2" rx="1" />
              <rect x="19.5" y="11" width="3" height="2" rx="1" />
              <rect x="4.22" y="4.22" width="2" height="3" rx="1" transform="rotate(-45 5.22 5.72)" />
              <rect x="16.78" y="16.78" width="2" height="3" rx="1" transform="rotate(-45 17.78 18.28)" />
              <rect x="4.22" y="16.78" width="3" height="2" rx="1" transform="rotate(-45 5.72 17.78)" />
              <rect x="16.78" y="4.22" width="3" height="2" rx="1" transform="rotate(-45 18.28 5.22)" />
            </motion.svg>
          </div>
        </motion.div>
      </motion.button>

      {/* Optional Mode Label */}
      {showLabel && (
        <span
          className={`font-mono text-xs font-semibold tracking-wider transition-colors duration-150 cursor-pointer ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
          onClick={handleToggle}
        >
          {isDark ? 'DARK' : 'LIGHT'}
        </span>
      )}
    </div>
  );
};

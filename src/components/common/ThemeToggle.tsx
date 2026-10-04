import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
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

  // Concentric radii & dimensional metrics: R_outer = R_inner + padding
  const dimensions = {
    sm: {
      width: 58,
      height: 32,
      padding: 3,
      outerRadius: 6, // rounded-[6px]
      innerRadius: 3, // rounded-[3px] (6 - 3 = 3)
      knobWidth: 24,
      knobHeight: 24,
      travel: 26,
      iconSize: 'w-3.5 h-3.5',
    },
    md: {
      width: 68,
      height: 36,
      padding: 3,
      outerRadius: 8, // rounded-lg (8px)
      innerRadius: 5, // rounded-[5px] (8 - 3 = 5)
      knobWidth: 28,
      knobHeight: 28,
      travel: 32,
      iconSize: 'w-4 h-4',
    },
    lg: {
      width: 80,
      height: 40,
      padding: 4,
      outerRadius: 8, // rounded-lg (8px)
      innerRadius: 4, // rounded-[4px] (8 - 4 = 4)
      knobWidth: 32,
      knobHeight: 32,
      travel: 38,
      iconSize: 'w-4.5 h-4.5',
    },
  }[size];

  const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (soundEnabled) {
      playCyberSound(isDark ? 'click' : 'toggle');
    }
    const willBeDark = !isDark;
    toggleTheme(e);
    if (onToggle) {
      onToggle(willBeDark, e);
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
        damping: 30,
        stiffness: 480,
        mass: 0.4,
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
        className="relative flex items-center cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyber-cyan border machined-edge transition-colors"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: dimensions.outerRadius,
        }}
        animate={{
          backgroundColor: isDark ? 'rgba(9, 9, 11, 0.95)' : 'rgba(241, 245, 249, 0.95)',
          borderColor: isDark ? 'rgba(39, 39, 42, 0.9)' : 'rgba(203, 213, 225, 0.9)',
        }}
        transition={{ duration: 0.2 }}
        whileHover={prefersReducedMotion ? {} : { borderColor: isDark ? 'rgba(63, 63, 70, 1)' : 'rgba(148, 163, 184, 1)' }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.96 }}
      >
        {/* Track Fixed Background Icons (Optically Aligned) */}
        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
          <Sun
            className={`${dimensions.iconSize} transition-opacity duration-200 ${
              !isDark ? 'opacity-0' : 'text-callout-warn-fg dark:text-zinc-600 opacity-60'
            }`}
          />
          <Moon
            className={`${dimensions.iconSize} transition-opacity duration-200 ${
              isDark ? 'opacity-0' : 'text-tertiary dark:text-zinc-600 opacity-60'
            }`}
          />
        </div>

        {/* Sliding Precision Hardware Knob */}
        <motion.div
          className="absolute z-10 flex items-center justify-center border shadow-xs"
          style={{
            width: dimensions.knobWidth,
            height: dimensions.knobHeight,
            top: dimensions.padding,
            left: dimensions.padding,
            borderRadius: dimensions.innerRadius,
          }}
          animate={{
            x: isDark ? dimensions.travel : 0,
            backgroundColor: isDark ? '#27272a' : '#ffffff',
            borderColor: isDark ? 'rgba(63, 63, 70, 0.8)' : 'rgba(203, 213, 225, 0.8)',
            boxShadow: isDark
              ? 'inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.5)'
              : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 3px rgba(0,0,0,0.12)',
          }}
          transition={springTransition}
        >
          {isDark ? (
            <div className="flex items-center justify-center relative">
              <Moon className={`${dimensions.iconSize} text-callout-info-fg drop-shadow-[0_0_3px_rgba(34,211,238,0.4)]`} />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]" />
            </div>
          ) : (
            <div className="flex items-center justify-center relative">
              <Sun className={`${dimensions.iconSize} text-callout-warn-fg drop-shadow-[0_0_3px_rgba(245,158,11,0.3)]`} />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]" />
            </div>
          )}
        </motion.div>
      </motion.button>

      {/* Optional Mode Label */}
      {showLabel && (
        <span
          className={`font-mono text-xs font-bold tracking-wider transition-colors duration-150 cursor-pointer ${
            isDark ? 'text-tertiary hover:text-primary' : 'text-slate-600 hover:text-slate-900'
          }`}
          onClick={handleToggle}
        >
          {isDark ? 'DARK' : 'LIGHT'}
        </span>
      )}
    </div>
  );
};

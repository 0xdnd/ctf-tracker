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
        className="relative flex items-center cursor-pointer overflow-hidden bg-surface-sunken border border-subtle hover:border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors [@media(pointer:coarse)]:min-h-11"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: dimensions.outerRadius,
        }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
      >
        {/* Track icons */}
        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
          <Sun
            className={`${dimensions.iconSize} text-muted transition-opacity duration-200 ${
              !isDark ? 'opacity-0' : 'opacity-70'
            }`}
          />
          <Moon
            className={`${dimensions.iconSize} text-muted transition-opacity duration-200 ${
              isDark ? 'opacity-0' : 'opacity-70'
            }`}
          />
        </div>

        {/* Sliding knob */}
        <motion.div
          className="absolute z-10 flex items-center justify-center border border-strong bg-surface-elevated shadow-xs"
          style={{
            width: dimensions.knobWidth,
            height: dimensions.knobHeight,
            top: dimensions.padding,
            left: dimensions.padding,
            borderRadius: dimensions.innerRadius,
          }}
          animate={{ x: isDark ? dimensions.travel : 0 }}
          transition={springTransition}
        >
          {isDark ? (
            <Moon className={`${dimensions.iconSize} text-primary`} />
          ) : (
            <Sun className={`${dimensions.iconSize} text-primary`} />
          )}
        </motion.div>
      </motion.button>

      {/* Optional mode label */}
      {showLabel && (
        <span
          className="text-xs font-medium text-secondary hover:text-primary transition-colors duration-150 cursor-pointer"
          onClick={handleToggle}
        >
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </div>
  );
};

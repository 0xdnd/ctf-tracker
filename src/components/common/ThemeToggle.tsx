import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  ariaLabel,
}) => {
  const { isDark, toggleTheme, prefersReducedMotion } = useTheme();

  const dimensions = {
    sm: { box: 32, iconSize: 'w-4 h-4' },
    md: { box: 36, iconSize: 'w-4 h-4' },
    lg: { box: 40, iconSize: 'w-5 h-5' },
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

  const label = ariaLabel ?? (isDark ? 'Switch to light mode' : 'Switch to dark mode');

  const iconTransition = prefersReducedMotion
    ? { duration: 0.05 }
    : {
        type: 'spring' as const,
        damping: 30,
        stiffness: 480,
        mass: 0.4,
      };

  const iconInitial = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, rotate: -90, scale: 0.6 };
  const iconAnimate = prefersReducedMotion
    ? { opacity: 1 }
    : { opacity: 1, rotate: 0, scale: 1 };
  const iconExit = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, rotate: 90, scale: 0.6 };

  return (
    <div className={`inline-flex shrink-0 items-center gap-2 select-none ${className}`}>
      <motion.button
        type="button"
        aria-label={label}
        title={label}
        onClick={handleToggle}
        className="bg-surface-sunken border border-subtle hover:border-strong text-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 inline-flex items-center justify-center cursor-pointer relative overflow-hidden rounded-lg"
        style={{ width: dimensions.box, height: dimensions.box }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={isDark ? 'moon' : 'sun'}
            className="inline-flex items-center justify-center"
            initial={iconInitial}
            animate={iconAnimate}
            exit={iconExit}
            transition={iconTransition}
          >
            {isDark ? (
              <Moon className={dimensions.iconSize} />
            ) : (
              <Sun className={dimensions.iconSize} />
            )}
          </motion.span>
        </AnimatePresence>
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

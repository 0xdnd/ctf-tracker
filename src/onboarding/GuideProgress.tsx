import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EASE_OUT } from './guideMotion';

interface StepTrackProps {
  total: number;
  index: number;
  /** The guide is done: the gaps close left to right and the track becomes one line. */
  complete?: boolean;
}

/** One segment per step. Filled segments are behind you, and the fill grows as you arrive. */
export const StepTrack: React.FC<StepTrackProps> = ({ total, index, complete = false }) => {
  const reduced = useReducedMotion();
  return (
    <div
      role="progressbar"
      aria-label="Progress"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={index + 1}
      data-testid="tour-progress"
      className="relative flex min-w-0 flex-1 items-center gap-1"
    >
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="relative h-1 flex-1 rounded-full bg-[rgb(var(--border-subtle))]">
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <motion.div
              className="h-full w-full rounded-full bg-accent"
              initial={false}
              animate={{ x: i <= index ? '0%' : '-101%' }}
              transition={{ duration: reduced ? 0 : 0.28, ease: EASE_OUT }}
            />
          </div>
          {complete && i < total - 1 && (
            <motion.span
              aria-hidden="true"
              className="absolute left-[calc(100%-2px)] top-0 h-full w-2 origin-left bg-accent"
              initial={reduced ? { opacity: 0 } : { opacity: 0, scaleX: 0.25 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: reduced ? 0 : 0.16, delay: reduced ? 0 : 0.05 + i * 0.05, ease: EASE_OUT }}
            />
          )}
        </div>
      ))}
      {complete && (
        <motion.span
          aria-hidden="true"
          className="absolute inset-x-0 h-1 rounded-full bg-accent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.1, delay: reduced ? 0 : 0.05 + (total - 1) * 0.05 + 0.1 }}
        />
      )}
    </div>
  );
};

interface GuideRulerProps {
  total: number;
  done: number;
  /** Tick that has just been earned; it arrives instead of already being lit. */
  arrivingIndex?: number | null;
}

/** The overall count as a ruler: one tick per guide, filled from the left. */
export const GuideRuler: React.FC<GuideRulerProps> = ({ total, done, arrivingIndex = null }) => {
  const reduced = useReducedMotion();
  return (
    <div
      role="img"
      aria-label={`${done} of ${total} guides done`}
      data-testid="guide-ruler"
      className="flex h-2.5 min-w-0 flex-1 items-stretch gap-[3px]"
    >
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className="relative flex-1 rounded-[1.5px] bg-[rgb(var(--border-subtle))]">
          {i < done && (
            <motion.span
              className="absolute inset-0 rounded-[1.5px] bg-accent"
              initial={i === arrivingIndex ? (reduced ? { opacity: 0 } : { opacity: 0, y: -3 }) : false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: EASE_OUT }}
            />
          )}
        </span>
      ))}
    </div>
  );
};

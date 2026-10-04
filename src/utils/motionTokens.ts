import type { Transition, Variants } from 'framer-motion';

/**
 * Tactical Spring Configuration (Emil Kowalski Physics)
 * Zero bounce, crisp 280ms duration for high-frequency cybersecurity cockpit operations.
 */
export const TACTICAL_SPRING = {
  type: 'spring' as const,
  bounce: 0,
  duration: 0.28,
};

/**
 * Asymmetric Modal Transition Contract:
 * Deliberate scale/y spring entrance (duration: 0.28, bounce: 0),
 * and instant snappy <=150ms ease-out dismissal (duration: 0.14).
 */
export const MODAL_ASYMMETRIC_TRANSITION = {
  enter: {
    opacity: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
    scale: { type: 'spring' as const, bounce: 0, duration: 0.28 },
    y: { type: 'spring' as const, bounce: 0, duration: 0.28 },
  },
  exit: {
    opacity: { duration: 0.12, ease: 'easeOut' as const },
    scale: { duration: 0.14, ease: [0.22, 1, 0.36, 1] },
    y: { duration: 0.14, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Asymmetric Drawer Slide Transition Contract:
 * Deliberate slide spring entrance (duration: 0.28, bounce: 0),
 * and snappy <=150ms dismissal (duration: 0.15).
 */
export const DRAWER_SLIDE_TRANSITION = {
  enter: {
    type: 'spring' as const,
    bounce: 0,
    duration: 0.28,
  },
  exit: {
    duration: 0.15,
    ease: [0.22, 1, 0.36, 1],
  },
};

/**
 * 20ms Cascade Stagger Delay Function
 * Computes progressive cascade stagger for card and list render animations,
 * capped at 300ms (0.3s) to avoid delaying user interaction.
 */
export const CASCADE_STAGGER_DELAY = (index: number): number => Math.min(index * 0.02, 0.3);

/**
 * Standard Tactile Compression Class
 * 0.97 active press feedback ensuring physical tactile response without layout shift.
 */
export const TACTILE_TAP_CLASS = 'active:scale-[0.97]';

/**
 * Framer Motion whileTap configuration for tactile compression
 */
export const TACTILE_WHILE_TAP = {
  scale: 0.97,
  transition: { duration: 0.1, ease: 'easeOut' as const },
};

/**
 * Standard transition presets
 */
export const MOTION_TRANSITIONS: Record<string, Transition> = {
  tacticalSpring: TACTICAL_SPRING,
  fastFade: { duration: 0.15, ease: [0.22, 1, 0.36, 1] },
  drawerSlideEnter: DRAWER_SLIDE_TRANSITION.enter,
  drawerSlideExit: DRAWER_SLIDE_TRANSITION.exit,
};

// --- Reusable Framer Motion Variants Contracts ---

/** Modal Dialog Backdrop Fade */
export const BACKDROP_VARIANTS: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeOut' as const } },
};

/** Standard Modal Window Variant (Asymmetric Scale & Y) */
export const MODAL_VARIANTS: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: MODAL_ASYMMETRIC_TRANSITION.enter,
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: MODAL_ASYMMETRIC_TRANSITION.exit,
  },
};

/** Slide-Over Inspector Drawer Variant (Right Slide) */
export const DRAWER_RIGHT_VARIANTS: Variants = {
  initial: { x: '100%', opacity: 0.5 },
  animate: {
    x: 0,
    opacity: 1,
    transition: DRAWER_SLIDE_TRANSITION.enter,
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: DRAWER_SLIDE_TRANSITION.exit,
  },
};

/** 20ms Cascade Stagger Container & Child Variants */
export const STAGGER_CONTAINER_VARIANTS: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.01,
    },
  },
};

export const STAGGER_ITEM_VARIANTS: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: {
    opacity: 1,
    y: 0,
    transition: TACTICAL_SPRING,
  },
};

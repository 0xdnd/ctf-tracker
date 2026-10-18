/**
 * Motion primitives that mirror the CSS tokens in src/index.css (:root).
 * Keep the two in sync: JS-driven (framer-motion) and CSS-driven transitions
 * must feel identical.
 */

/** --ease-out: crisp entrance curve. */
export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
/** --ease-in: snappy exit curve. */
export const EASE_IN: [number, number, number, number] = [0.32, 0, 0.67, 0];
/** --ease-in-out: on-screen spatial movement. */
export const EASE_IN_OUT: [number, number, number, number] = [0.77, 0, 0.175, 1];
/** --ease-drawer: iOS-grade drawer curve. */
export const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1];

/** Durations in seconds; mirror --duration-fast/normal/slow/layout. */
export const DURATION = {
  fast: 0.1,
  normal: 0.15,
  slow: 0.2,
  layout: 0.3,
} as const;

// TACTICAL_SPRING lives in motionTokens.ts (existing imports keep working).
export { TACTICAL_SPRING } from './motionTokens';

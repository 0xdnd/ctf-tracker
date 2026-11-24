/**
 * Motion primitives that mirror the CSS tokens in src/index.css (:root).
 * Keep the two in sync: JS-driven (framer-motion) and CSS-driven transitions
 * must feel identical.
 */

/** --ease-out: crisp entrance curve. */
export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/** Durations in seconds; mirror --duration-fast/normal/slow/layout. */
export const DURATION = {
  fast: 0.1,
  normal: 0.15,
  slow: 0.2,
  layout: 0.3,
} as const;

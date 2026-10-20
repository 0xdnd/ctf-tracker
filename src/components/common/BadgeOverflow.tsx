import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { TACTICAL_SPRING } from '../../utils/motionTokens';
import { EASE_OUT } from '../../utils/motion';

/** Hover delay before opening; mirrors Tooltip. Click and Enter/Space open immediately; focus alone never opens. */
const HOVER_DELAY_MS = 400;
/** Moving between overflow pills within this window skips the delay (Tooltip skip-delay). */
const SKIP_DELAY_WINDOW_MS = 300;
let lastClosedAt = -Infinity;

export interface BadgeOverflowProps {
  /** Badge nodes, in priority order. */
  badges: React.ReactNode[];
  /** How many badges render inline before the rest collapse into a "+N" pill. Default 2. */
  max?: number;
  /** Where the popover aligns to the pill. */
  align?: 'left' | 'right';
  /** Expand the hidden badges inline (the row wraps, the pill becomes "Less") instead of a floating popover. */
  inline?: boolean;
  className?: string;
}

/**
 * BadgeOverflow - caps inline badges and groups the rest behind a compact "+N" pill.
 * The pill is a real button: hover (after a short delay, like Tooltip) or click/Enter/Space reveals the remaining badges; focus alone does not, Escape or an outside press closes. Exit is <= 150ms.
 */
export const BadgeOverflow: React.FC<BadgeOverflowProps> = ({
  badges,
  max = 2,
  align = 'left',
  inline = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const popoverId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const openNow = useCallback(() => {
    clearHoverTimer();
    setOpen(true);
  }, [clearHoverTimer]);

  const closeNow = useCallback(() => {
    clearHoverTimer();
    setOpen((was) => {
      if (was) lastClosedAt = Date.now();
      return false;
    });
  }, [clearHoverTimer]);

  const openOnHover = useCallback(() => {
    clearHoverTimer();
    if (Date.now() - lastClosedAt < SKIP_DELAY_WINDOW_MS) setOpen(true);
    else hoverTimer.current = setTimeout(() => setOpen(true), HOVER_DELAY_MS);
  }, [clearHoverTimer]);

  useEffect(() => clearHoverTimer, [clearHoverTimer]);

  const visible = React.Children.toArray(badges).filter(Boolean);
  const limit = Math.max(0, max);
  const shown = visible.slice(0, limit);
  const rest = visible.slice(limit);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeNow();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, closeNow]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLSpanElement>) => {
    if (!rootRef.current?.contains(e.relatedTarget as Node | null)) closeNow();
  }, [closeNow]);

  if (visible.length === 0) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Escape' && open) {
      e.stopPropagation();
      closeNow();
      pillRef.current?.focus();
    }
  };

  const skipMotion = Boolean(reduceMotion);

  if (inline) {
    const expanded = open;
    return (
      <span className={`inline-flex min-w-0 flex-wrap items-center gap-1 ${className}`}>
        {(expanded ? visible : shown).map((badge, i) => (
          <React.Fragment key={React.isValidElement(badge) && badge.key != null ? badge.key : i}>{badge}</React.Fragment>
        ))}
        {rest.length > 0 && (
          <button
            type="button"
            aria-label={expanded ? 'Show fewer' : `${rest.length} more`}
            aria-expanded={expanded}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-6 select-none items-center rounded border border-subtle bg-surface-sunken px-1.5 font-sans text-xs font-medium tabular-nums text-secondary transition-colors hover:bg-surface-hover hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:min-w-8 [@media(pointer:coarse)]:justify-center"
          >
            {expanded ? 'Less' : `+${rest.length}`}
          </button>
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex min-w-0 items-center gap-1 ${className}`}>
      {shown.map((badge, i) => (
        <React.Fragment key={React.isValidElement(badge) && badge.key != null ? badge.key : i}>{badge}</React.Fragment>
      ))}
      {rest.length > 0 && (
        <span
          ref={rootRef}
          className="relative inline-flex"
          onMouseEnter={openOnHover}
          onMouseLeave={closeNow}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        >
          <button
            ref={pillRef}
            type="button"
            aria-label={`${rest.length} more`}
            aria-describedby={open ? popoverId : undefined}
            aria-expanded={open}
            onClick={openNow}
            className="inline-flex h-6 -my-0.5 select-none items-center rounded border border-subtle bg-surface-sunken px-1.5 font-sans text-xs font-medium tabular-nums text-secondary transition-colors hover:bg-surface-hover hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:min-w-8 [@media(pointer:coarse)]:justify-center"
          >
            +{rest.length}
          </button>
          <AnimatePresence>
            {open && (
              <motion.span
                id={popoverId}
                role="tooltip"
                initial={skipMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: skipMotion ? 0 : 0.1, ease: EASE_OUT } }}
                transition={skipMotion ? { duration: 0 } : TACTICAL_SPRING}
                className={`absolute top-full z-[100] mt-1 flex w-max max-w-[16rem] flex-wrap items-center gap-1 rounded-lg border border-subtle bg-surface-elevated p-1.5 shadow-lg machined-edge ${
                  align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
                }`}
              >
                {rest.map((badge, i) => (
                  <React.Fragment key={React.isValidElement(badge) && badge.key != null ? badge.key : i}>
                    {badge}
                  </React.Fragment>
                ))}
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      )}
    </span>
  );
};

export default BadgeOverflow;

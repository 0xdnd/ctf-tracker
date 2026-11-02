import React, { forwardRef, useEffect, useState } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

/** Strong ease-out for things arriving. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
/** Sheet and drawer curve. */
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

/**
 * One critically damped spring for the whole rig: spotlight, card and page scroll all use it, so they
 * start and land together and nothing overshoots.
 */
export const RIG_SPRING = { type: 'spring', stiffness: 320, damping: 36, mass: 1 } as const;

/** How long a closing runner or Guide Center stays mounted while it animates away. */
export const CLOSE_MS = 180;

/** The dim over the page. Dark in both color modes, so the lit target reads the same way in each. */
export const DIM = 'rgb(0 0 0 / 0.72)';

const PHONE_QUERY = '(max-width: 767px)';

export const isPhoneWidth = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? Boolean(window.matchMedia(PHONE_QUERY)?.matches)
    : false;

export function useIsPhone(): boolean {
  const [phone, setPhone] = useState(isPhoneWidth);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(PHONE_QUERY);
    if (!mq) return;
    const onChange = () => setPhone(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return phone;
}

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-card';

const buttonBase = `inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors ${focusRing} [@media(pointer:coarse)]:min-h-11`;

export const buttonStyles = {
  primary: `${buttonBase} bg-accent px-5 py-2 font-semibold text-on-accent hover:bg-accent-hover`,
  secondary: `${buttonBase} border border-subtle bg-surface-card px-4 py-2 text-primary hover:border-strong`,
  ghost: `${buttonBase} px-3 py-2 text-muted hover:text-primary`,
};

/** Normal elevated shadow for guide cards (neutral, no accent glow). */
export const CARD_SHADOW = '0 20px 40px -12px rgb(0 0 0 / 0.45), 0 4px 12px -4px rgb(0 0 0 / 0.25)';

/** The look every guide card shares: the running guide, the welcome card, page tips and Guide Center. */
export const cardSurface = 'rounded-2xl border border-subtle bg-surface-card font-sans';
export const cardTitle = 'text-[17px] font-semibold leading-snug tracking-tight text-primary [text-wrap:balance]';
export const cardBody = 'mt-1.5 text-[15px] leading-[1.55] text-secondary [text-wrap:pretty] md:text-sm md:leading-[1.6]';

/** The footer row of a guide card: the way out on the left, the way forward on the right. */
export const CardActions: React.FC<{ exit?: React.ReactNode; children: React.ReactNode }> = ({ exit, children }) => (
  <div className="mt-4 flex items-center justify-between gap-2">
    {exit ?? <span />}
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

/** A button that acknowledges the press. */
export const PressButton = forwardRef<HTMLButtonElement, HTMLMotionProps<'button'>>(function PressButton(
  { type = 'button', ...props },
  ref,
) {
  return <motion.button ref={ref} type={type} whileTap={{ scale: 0.97 }} transition={{ duration: 0.1 }} {...props} />;
});

/** The grab bar on a phone sheet. The gesture is optional: Close and Escape do the same thing. */
export const SheetHandle: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div aria-hidden="true" className={`flex justify-center ${className}`}>
    <span className="h-1 w-9 rounded-full bg-[rgb(var(--border-strong))]" />
  </div>
);

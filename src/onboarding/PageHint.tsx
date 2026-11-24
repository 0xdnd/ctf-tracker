import React, { useEffect } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { GUIDE_META } from './guideMeta';
import { guideTipAvailability } from './guideRegistry';
import { EASE_OUT, PressButton, buttonStyles } from './guideMotion';
import { TOUR_ICONS } from './icons';
import { useOnboardingStore } from './useOnboardingStore';

interface PageHintProps {
  guideId: string;
  /** The page the tip is on. When given, Show me only starts a guide that can run there. */
  pathname?: string;
}

const SESSION_TIP_KEY = 'zb-page-tip-shown';

/** One tip per browser session: the first tip shown owns the slot; only that same tip may reappear (until dismissed). */
export const sessionTipAllows = (id: string): boolean => {
  try {
    const owner = sessionStorage.getItem(SESSION_TIP_KEY);
    return owner === null || owner === id;
  } catch {
    return true;
  }
};

const claimSessionTip = (id: string): void => {
  try {
    if (sessionStorage.getItem(SESSION_TIP_KEY) === null) sessionStorage.setItem(SESSION_TIP_KEY, id);
  } catch {
    /* storage unavailable: no session limit */
  }
};

/**
 * One-time offer of a section's guide, as a compact bar along the bottom edge. Non-modal: no focus trap and no
 * focus steal. It marks itself as a trap companion so an open modal's focus trap lets Tab reach its buttons.
 */
export const PageHint: React.FC<PageHintProps> = ({ guideId, pathname }) => {
  const guide = GUIDE_META[guideId];
  const dismissHint = useOnboardingStore((s) => s.dismissHint);
  const setTipsOff = useOnboardingStore((s) => s.setTipsOff);
  const startGuide = useOnboardingStore((s) => s.startGuide);
  const reduceMotion = useReducedMotion();
  const shown = Boolean(guide);
  // While the tip is up, every width keeps room under the page (index.css: html[data-page-hint]) so it never hides content.
  // The tip also claims this browser session's single tip slot (sessionTipAllows).
  useEffect(() => {
    if (!shown) return;
    claimSessionTip(guideId);
    document.documentElement.setAttribute('data-page-hint', '');
    return () => document.documentElement.removeAttribute('data-page-hint');
  }, [shown, guideId]);
  if (!guide) return null;
  const Icon = TOUR_ICONS[guide.icon];
  const showMe = () => {
    // The layer already hides a tip that cannot run; this keeps a stale click from starting a guide with no anchors.
    if (pathname !== undefined && !guideTipAvailability(guide.id, pathname).available) dismissHint(guide.id);
    else startGuide(guide.id);
  };
  const titleId = `page-hint-${guide.id}-title`;

  return (
    <m.section
      role="region"
      aria-labelledby={titleId}
      data-testid="page-hint"
      data-trap-companion=""
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: EASE_OUT }}
      className="fixed bottom-20 left-2 right-2 z-popover flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-subtle bg-surface-card px-3 py-1.5 font-sans shadow-lg md:bottom-0 md:left-0 md:right-0 md:max-h-12 md:flex-nowrap md:rounded-none md:border-x-0 md:border-b-0"
    >
      <Icon className="h-4 w-4 flex-shrink-0 text-muted" aria-hidden="true" />
      <h2 id={titleId} className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">
        {guide.title}
      </h2>
      <div className="flex items-center gap-1.5">
        <PressButton onClick={() => setTipsOff(true)} className={`whitespace-nowrap !py-1 text-xs ${buttonStyles.ghost}`}>
          Don&apos;t show tips
        </PressButton>
        <PressButton onClick={() => dismissHint(guide.id)} className={`whitespace-nowrap !py-1 ${buttonStyles.secondary}`}>
          Not now
        </PressButton>
        <PressButton onClick={showMe} className={`whitespace-nowrap !py-1 ${buttonStyles.primary}`}>
          Show me
        </PressButton>
      </div>
    </m.section>
  );
};

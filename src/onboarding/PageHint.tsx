import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { GUIDE_META } from './guideMeta';
import { CARD_SHADOW, CardActions, EASE_OUT, PressButton, buttonStyles, cardBody, cardSurface, cardTitle } from './guideMotion';
import { TOUR_ICONS } from './icons';
import { useOnboardingStore } from './useOnboardingStore';

interface PageHintProps {
  guideId: string;
}

/**
 * One-time offer of a section's guide. Non-modal: no focus trap and no focus steal. It marks itself as a trap
 * companion so an open modal's focus trap lets Tab reach its buttons.
 */
export const PageHint: React.FC<PageHintProps> = ({ guideId }) => {
  const guide = GUIDE_META[guideId];
  const dismissHint = useOnboardingStore((s) => s.dismissHint);
  const setTipsOff = useOnboardingStore((s) => s.setTipsOff);
  const startGuide = useOnboardingStore((s) => s.startGuide);
  const reduceMotion = useReducedMotion();
  if (!guide) return null;
  const Icon = TOUR_ICONS[guide.icon];
  const titleId = `page-hint-${guide.id}-title`;

  return (
    <motion.section
      role="region"
      aria-labelledby={titleId}
      data-testid="page-hint"
      data-trap-companion=""
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: EASE_OUT }}
      style={{ boxShadow: CARD_SHADOW }}
      className={`fixed bottom-20 left-2 right-2 z-popover p-5 md:bottom-4 md:left-auto md:right-4 md:w-[25rem] ${cardSurface}`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className="h-[18px] w-[18px] flex-shrink-0 text-muted" aria-hidden="true" />
        <h2 id={titleId} className={`min-w-0 ${cardTitle}`}>
          {guide.title}
        </h2>
      </div>
      <p className={cardBody}>{guide.intro}</p>
      <CardActions
        exit={
          <PressButton onClick={() => setTipsOff(true)} className={`-ml-3 whitespace-nowrap ${buttonStyles.ghost}`}>
            Don&apos;t show tips
          </PressButton>
        }
      >
        <PressButton onClick={() => dismissHint(guide.id)} className={`whitespace-nowrap ${buttonStyles.secondary}`}>
          Not now
        </PressButton>
        <PressButton onClick={() => startGuide(guide.id)} className={`whitespace-nowrap ${buttonStyles.primary}`}>
          Show me
        </PressButton>
      </CardActions>
    </motion.section>
  );
};

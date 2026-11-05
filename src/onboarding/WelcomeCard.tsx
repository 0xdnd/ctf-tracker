import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboardingStore } from './useOnboardingStore';
import { CyberLogo } from '../components/common/CyberLogo';
import { CardActions, PressButton, buttonStyles, cardBody, cardTitle } from './guideMotion';
import { WELCOME_ROWS, WELCOME_STEP as welcome } from './guideMeta';
import { TOUR_ICONS } from './icons';

interface WelcomeCardProps {
  onStart: () => void;
  onSkip: () => void;
  startRef?: React.Ref<HTMLButtonElement>;
}

/**
 * The first thing a new visitor sees. Rendered eagerly (no lazy chunk) so it appears the moment
 * the tour starts, and reused inside the runner.
 */
export const WelcomeCard: React.FC<WelcomeCardProps> = ({ onStart, onSkip, startRef }) => {
  const navigate = useNavigate();
  const finishTour = useOnboardingStore((s) => s.finishTour);
  const importSolved = () => {
    finishTour();
    navigate('/tracker?import=1');
  };
  return (
  <div>
    <CyberLogo size="lg" />
    <h2 id="tour-title" className={`mt-4 ${cardTitle}`}>
      {welcome.title}
    </h2>
    <p id="tour-body" className={cardBody}>
      {welcome.body}
    </p>
    <ul className="mt-4 divide-y divide-subtle border-y border-subtle">
      {WELCOME_ROWS.map((row) => {
        const Icon = TOUR_ICONS[row.icon];
        return (
          <li key={row.title} className="flex items-start gap-3 py-3">
            <Icon className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 text-muted" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-primary">{row.title}</span>
              <span className="mt-0.5 block text-[13px] leading-[1.45] text-secondary">{row.body}</span>
            </span>
          </li>
        );
      })}
    </ul>
    <button
      type="button"
      onClick={importSolved}
      className="mt-3 w-full rounded-lg border border-subtle px-3 py-2 text-[13px] font-medium text-secondary transition-colors hover:bg-surface-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [@media(pointer:coarse)]:min-h-11"
    >
      Import your solved boxes
    </button>
    <CardActions
      exit={
        <PressButton onClick={onSkip} className={`-ml-3 ${buttonStyles.ghost}`}>
          Skip
        </PressButton>
      }
    >
      <PressButton ref={startRef} onClick={onStart} className={buttonStyles.primary}>
        Start tour
      </PressButton>
    </CardActions>
  </div>
  );
};

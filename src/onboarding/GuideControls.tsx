import React from 'react';
import { toast } from '../store/useToastStore';
import { useOnboardingStore } from './useOnboardingStore';

interface GuideControlsProps {
  /** Runs before the tour or Guide Center opens, e.g. to close the modal the buttons live in. */
  onBeforeReplay?: () => void;
  className?: string;
}

const btnBase =
  'cursor-pointer rounded-lg border bg-surface-card px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-[0.97] [@media(pointer:coarse)]:min-h-11';
const btn = `${btnBase} border-subtle text-secondary hover:border-strong hover:text-primary`;
const primaryBtn = `${btnBase} border-accent text-primary hover:bg-surface-hover`;

/** Show full guide, Replay tour and Reset tips buttons, shared by Settings and the shortcuts sheet. */
export const GuideControls: React.FC<GuideControlsProps> = ({ onBeforeReplay, className = '' }) => {
  const replayTour = useOnboardingStore((s) => s.replayTour);
  const resetTips = useOnboardingStore((s) => s.resetTips);
  const openGuideCenter = useOnboardingStore((s) => s.openGuideCenter);

  return (
    <div data-tour="guide-controls" className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        className={primaryBtn}
        onClick={() => {
          onBeforeReplay?.();
          openGuideCenter();
        }}
      >
        Show full guide
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => {
          onBeforeReplay?.();
          replayTour();
        }}
      >
        Replay tour
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => {
          resetTips();
          toast.success('Page tips will show again the next time you open each page.', 'Tips reset');
        }}
      >
        Reset tips
      </button>
    </div>
  );
};

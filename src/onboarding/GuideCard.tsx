import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { GUIDE_META, type TourStep } from './guideMeta';
import { GUIDE_COUNT } from './guideRegistry';
import { CardActions, EASE_OUT, PressButton, buttonStyles, cardBody as bodyClass, cardTitle as titleClass } from './guideMotion';
import { GuideRuler, StepTrack } from './GuideProgress';

const copyVariants = {
  enter: (dir: number) => ({ opacity: 0, x: 14 * dir }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: -8 * dir, transition: { duration: 0.1, ease: 'easeOut' as const } }),
};
const fadeVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

const StepCopy: React.FC<{ step: TourStep; reduced: boolean; direction: number }> = ({ step, reduced, direction }) => {
  const present = useIsPresent();
  const variants = reduced ? fadeVariants : copyVariants;
  return (
    <div className="min-w-0 [grid-area:stack]" aria-hidden={present ? undefined : true}>
      <motion.h2
        id={present ? 'tour-title' : undefined}
        className={titleClass}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.22, ease: EASE_OUT }}
      >
        {step.title}
      </motion.h2>
      <motion.p
        id={present ? 'tour-body' : undefined}
        className={bodyClass}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.22, delay: reduced ? 0 : 0.04, ease: EASE_OUT }}
      >
        {step.body}
      </motion.p>
    </div>
  );
};

interface StepPanelProps {
  mode: 'tour' | 'guide';
  steps: TourStep[];
  index: number;
  /** +1 going forward, -1 going back. */
  direction: number;
  handsOnLive: boolean;
  nextRef: React.Ref<HTMLButtonElement>;
  /** Tour steps with buttons of their own. */
  actions?: React.ReactNode;
  onNext: () => void;
  onBack: () => void;
  onLast: () => void;
  onExit: () => void;
}

/**
 * Title and body slide across in one fixed cell. Every step's copy is laid out invisibly in that cell, so
 * the card keeps one size for the whole guide and only ever moves as a unit.
 */
export const StepPanel: React.FC<StepPanelProps> = ({
  mode,
  steps,
  index,
  direction,
  handsOnLive,
  nextRef,
  actions,
  onNext,
  onBack,
  onLast,
  onExit,
}) => {
  const reduced = Boolean(useReducedMotion());
  const step = steps[index];
  const isLast = index === steps.length - 1;
  return (
    <>
      <div className="flex items-center gap-3">
        <StepTrack total={steps.length} index={index} />
        <span className="flex-shrink-0 font-mono text-[11px] tabular-nums text-muted" aria-hidden="true">
          {index + 1}/{steps.length}
        </span>
        {handsOnLive && (
          <span className="flex-shrink-0 rounded border border-accent px-1.5 py-px text-[11px] font-medium text-accent">
            Your turn
          </span>
        )}
      </div>
      <span className="sr-only" role="status">{`Step ${index + 1} of ${steps.length}: ${step.title}`}</span>

      <div className="mt-3.5 grid [grid-template-areas:'stack']">
        {steps.map((s) => (
          <div key={s.id} aria-hidden="true" className="invisible min-w-0 [grid-area:stack]">
            <div className={titleClass}>{s.title}</div>
            <div className={bodyClass}>{s.body}</div>
          </div>
        ))}
        {steps
          .filter((s) => s.altBody)
          .map((s) => (
            <div key={`${s.id}-alt`} aria-hidden="true" className="invisible min-w-0 [grid-area:stack]">
              <div className={titleClass}>{s.altTitle ?? s.title}</div>
              <div className={bodyClass}>{s.altBody}</div>
            </div>
          ))}
        <AnimatePresence initial={false} custom={direction}>
          <StepCopy key={step.id} step={step} reduced={reduced} direction={direction} />
        </AnimatePresence>
      </div>

      {actions}

      <CardActions
        exit={
          isLast ? undefined : (
            <PressButton onClick={onExit} className={`-ml-3 ${buttonStyles.ghost}`}>
              {mode === 'guide' ? 'Close' : 'Skip tour'}
            </PressButton>
          )
        }
      >
        {index > 0 && (
          <PressButton onClick={onBack} className={buttonStyles.secondary}>
            Back
          </PressButton>
        )}
        <PressButton
          ref={nextRef}
          onClick={isLast ? onLast : onNext}
          className={`group ${step.actionsPrimary ? buttonStyles.secondary : buttonStyles.primary}`}
        >
          <span>{isLast ? 'Done' : (step.nextLabel ?? 'Next')}</span>
          {!isLast && !step.nextLabel && (
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-150 [@media(hover:hover)]:group-hover:translate-x-0.5"
            />
          )}
        </PressButton>
      </CardActions>
    </>
  );
};

/** The check is revealed by a cover sliding off it, which reads as being drawn. */
const FinishMark: React.FC = () => {
  const reduced = useReducedMotion();
  return (
    <motion.span
      aria-hidden="true"
      className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-accent text-accent"
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, delay: 0.03, ease: EASE_OUT }}
    >
      <span className="relative block h-4 w-4 overflow-hidden">
        <Check className="h-4 w-4" strokeWidth={2.5} />
        {!reduced && (
          <motion.span
            className="absolute inset-0 bg-surface-card"
            initial={{ x: 0 }}
            animate={{ x: '101%' }}
            transition={{ duration: 0.26, delay: 0.12, ease: EASE_OUT }}
          />
        )}
      </span>
    </motion.span>
  );
};

interface FinishPanelProps {
  guideId: string;
  nextId: string | null;
  completedCount: number;
  stepCount: number;
  primaryRef: React.Ref<HTMLButtonElement>;
  onNextGuide: (id: string) => void;
  onClose: () => void;
}

/** The short moment after a guide's last step: the track closes up, one more tick lights, and the next guide is on offer. */
export const FinishPanel: React.FC<FinishPanelProps> = ({
  guideId,
  nextId,
  completedCount,
  stepCount,
  primaryRef,
  onNextGuide,
  onClose,
}) => {
  const reduced = useReducedMotion();
  const meta = GUIDE_META[guideId];
  const next = nextId ? GUIDE_META[nextId] : null;

  // The count ticks over just after the track closes, so the eye lands on it.
  const [shownCount, setShownCount] = useState(reduced ? completedCount : Math.max(0, completedCount - 1));
  const ticked = useRef(false);
  useEffect(() => {
    if (ticked.current) return;
    ticked.current = true;
    const timer = window.setTimeout(() => setShownCount(completedCount), reduced ? 0 : 420);
    return () => window.clearTimeout(timer);
  }, [completedCount, reduced]);

  const rise = (order: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.22, delay: 0.03 + order * 0.05, ease: EASE_OUT },
        };

  return (
    <>
      <StepTrack total={stepCount} index={stepCount - 1} complete />
      <span className="sr-only" role="status">{`${meta.doneTitle ?? `${meta.title} done`}. ${completedCount} of ${GUIDE_COUNT} guides done.`}</span>

      <div className="mt-4 flex items-center gap-3">
        <FinishMark />
        <motion.h2 id="tour-title" className={`min-w-0 ${titleClass}`} {...rise(0)}>
          {meta.doneTitle ?? `${meta.title} done`}
        </motion.h2>
      </div>

      <motion.div className="mt-4 flex items-center gap-3" {...rise(1)}>
        <GuideRuler total={GUIDE_COUNT} done={shownCount} arrivingIndex={completedCount - 1} />
        <span className="relative flex-shrink-0 overflow-hidden font-mono text-[11px] tabular-nums text-muted">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={shownCount}
              className="inline-block"
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
            >
              {shownCount}
            </motion.span>
          </AnimatePresence>
          /{GUIDE_COUNT}
        </span>
      </motion.div>

      <motion.p id="tour-body" className="mt-3 text-[15px] leading-[1.55] text-secondary [text-wrap:pretty] md:text-sm md:leading-[1.6]" {...rise(2)}>
        {next ? (
          <>
            <span className="font-medium text-primary">Next up: {next.listTitle ?? next.title}.</span> {next.intro}
          </>
        ) : (
          `That was the last one. You have seen every guide that can run right now.`
        )}
      </motion.p>

      {next ? (
        <CardActions
          exit={
            <PressButton onClick={onClose} className={`-ml-3 ${buttonStyles.ghost}`}>
              Close
            </PressButton>
          }
        >
          <PressButton ref={primaryRef} onClick={() => onNextGuide(next.id)} className={`group ${buttonStyles.primary}`}>
            <span>Start next guide</span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-150 [@media(hover:hover)]:group-hover:translate-x-0.5"
            />
          </PressButton>
        </CardActions>
      ) : (
        <CardActions>
          <PressButton ref={primaryRef} onClick={onClose} className={buttonStyles.primary}>
            Close
          </PressButton>
        </CardActions>
      )}
    </>
  );
};

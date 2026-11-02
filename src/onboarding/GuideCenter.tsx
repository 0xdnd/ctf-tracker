import React, { useEffect, useLayoutEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, Lock, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useCtfStore } from '../store/useCtfStore';
import { useExamStore } from '../store/examStore';
import { GUIDE_META } from './guideMeta';
import { GUIDE_COUNT, GUIDE_GROUPS, GUIDE_ORDER, guideAvailability } from './guideRegistry';
import { GuideRuler } from './GuideProgress';
import { TOUR_ICONS } from './icons';
import { CARD_SHADOW, CLOSE_MS, DIM, EASE_DRAWER, EASE_OUT, PressButton, SheetHandle, cardSurface, focusRing, useIsPhone } from './guideMotion';
import { useOnboardingStore } from './useOnboardingStore';
import { useSheetDrag } from './useSheetDrag';

/** Only the rows visible on open take part in the stagger. */
const STAGGERED_ROWS = 10;

interface GuideCenterProps {
  /** Set while it animates away after closing. */
  closing?: boolean;
  /** A guide launch is taking over the dim, so this one must not fade against it. */
  handoff?: boolean;
}

/** Every guide in one list, with done checks and overall progress. Tapping a row takes you there and starts it. */
export const GuideCenter: React.FC<GuideCenterProps> = ({ closing = false, handoff = false }) => {
  const isPhone = useIsPhone();
  const reduced = Boolean(useReducedMotion());
  const completed = useOnboardingStore((s) => s.completedGuides);
  const close = useOnboardingStore((s) => s.closeGuideCenter);
  const launchGuide = useOnboardingStore((s) => s.launchGuide);
  // Availability reads these two; subscribing keeps the rows honest while the list is open.
  useCtfStore((s) => s.activeTargetId);
  useExamStore((s) => s.status);

  const panelRef = useFocusTrap<HTMLDivElement>({ isActive: !closing, onClose: close, initialFocus: 'container' });

  // The modal this opened from restores focus as it finishes animating away. Take it back.
  useEffect(() => {
    if (closing) return;
    const onFocusIn = (e: FocusEvent) => {
      const panel = panelRef.current;
      const target = e.target as Node | null;
      if (panel && target && !panel.contains(target)) panel.focus({ preventScroll: true });
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [closing, panelRef]);

  const dragY = useMotionValue(isPhone && !reduced ? window.innerHeight : 0);
  const { handlers: dragHandlers } = useSheetDrag({
    y: dragY,
    direction: 1,
    enabled: isPhone && !closing,
    reducedMotion: reduced,
    height: () => panelRef.current?.offsetHeight ?? 400,
    onDismiss: close,
  });

  useLayoutEffect(() => {
    if (!isPhone || reduced) return;
    const controls = closing
      ? animate(dragY, (panelRef.current?.offsetHeight ?? 600) + 24, { duration: CLOSE_MS / 1000, ease: EASE_OUT })
      : animate(dragY, 0, { duration: 0.28, ease: EASE_DRAWER });
    return () => controls.stop();
  }, [closing, isPhone, reduced, dragY, panelRef]);

  const doneCount = GUIDE_ORDER.filter((id) => completed.includes(id)).length;

  const desktopMotion =
    !isPhone && !reduced
      ? { initial: { opacity: 0, y: 10, scale: 0.985 }, animate: closing ? { opacity: 0, y: 6, scale: 1 } : { opacity: 1, y: 0, scale: 1 } }
      : { initial: { opacity: 0 }, animate: { opacity: closing ? 0 : 1 } };

  return (
    <div className={`fixed inset-0 z-critical flex font-sans ${isPhone ? 'items-end justify-center' : 'items-center justify-center'} ${closing ? 'pointer-events-none' : ''}`}>
      <motion.div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: DIM }}
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 1 }}
        transition={{ duration: closing ? (handoff ? 0 : CLOSE_MS / 1000) : 0.22, ease: EASE_OUT }}
        onClick={close}
        data-testid="guide-center-backdrop"
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-center-title"
        data-testid="guide-center"
        data-guide-surface=""
        {...desktopMotion}
        transition={{ duration: closing ? CLOSE_MS / 1000 : 0.24, ease: EASE_OUT }}
        style={isPhone ? { y: dragY, boxShadow: CARD_SHADOW } : { boxShadow: CARD_SHADOW }}
        className={`relative flex flex-col overflow-hidden ${cardSurface} outline-none ${
          isPhone
            ? 'mx-2 mb-[max(0.5rem,env(safe-area-inset-bottom))] h-[calc(100dvh-3.5rem)] w-full'
            : 'max-h-[min(46rem,86vh)] w-[38rem] max-w-[calc(100vw-2rem)]'
        }`}
      >
        <div
          {...(isPhone ? dragHandlers : {})}
          className={`flex-shrink-0 border-b border-subtle px-5 pb-4 ${isPhone ? 'touch-none pt-2' : 'pt-5'}`}
        >
          {isPhone && <SheetHandle className="mb-3" />}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="guide-center-title" className="text-xl font-semibold tracking-tight text-primary">
                Full guide
              </h2>
              <p className="mt-1 text-[15px] leading-[1.5] text-secondary md:text-sm">
                Pick a guide. ZeroBox takes you there and walks you through it.
              </p>
            </div>
            <PressButton
              aria-label="Close full guide"
              onClick={close}
              className={`-mr-2 -mt-1 inline-flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:text-primary ${focusRing} [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11`}
            >
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </PressButton>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <GuideRuler total={GUIDE_COUNT} done={doneCount} />
            <span className="flex-shrink-0 font-mono text-[11px] tabular-nums text-muted">
              {doneCount}/{GUIDE_COUNT}
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin" data-testid="guide-center-list">
          {GUIDE_GROUPS.map((group) => {
            const groupDone = group.guides.filter((id) => completed.includes(id)).length;
            const headingId = `guide-group-${group.id}`;
            return (
              <section key={group.id} aria-labelledby={headingId} data-guide-group={group.id}>
                <div className="sticky top-0 z-[1] flex items-baseline justify-between gap-3 border-b border-subtle bg-surface-card px-5 pb-1.5 pt-3">
                  <h3 id={headingId} className="text-xs font-medium text-muted">
                    {group.title}
                  </h3>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${groupDone === group.guides.length ? 'text-accent' : 'text-muted'}`}
                  >
                    <span aria-hidden="true">
                      {groupDone}/{group.guides.length}
                    </span>
                    <span className="sr-only">
                      {groupDone} of {group.guides.length} done
                    </span>
                  </span>
                </div>
                <ul className="divide-y divide-subtle">
                  {group.guides.map((id) => {
                    const meta = GUIDE_META[id];
                    const Icon = TOUR_ICONS[meta.icon];
                    const availability = guideAvailability(id);
                    const done = completed.includes(id);
                    const i = GUIDE_ORDER.indexOf(id);
                    const stagger = i < STAGGERED_ROWS && !reduced;
                    return (
                      <motion.li
                        key={id}
                        initial={stagger ? { opacity: 0, y: 6 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: stagger ? 0.05 + i * 0.03 : 0, ease: EASE_OUT }}
                      >
                        <button
                          type="button"
                          aria-disabled={availability.available ? undefined : true}
                          data-guide-row={id}
                          onClick={() => {
                            if (availability.available) void launchGuide(id);
                          }}
                          className={`flex w-full items-center gap-3 px-5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
                            availability.available
                              ? 'cursor-pointer active:bg-surface-hover [@media(hover:hover)]:hover:bg-surface-hover'
                              : 'cursor-not-allowed'
                          }`}
                        >
                          <Icon
                            aria-hidden="true"
                            className={`h-[18px] w-[18px] flex-shrink-0 ${done ? 'text-accent' : 'text-muted'}`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm font-medium ${availability.available ? 'text-primary' : 'text-muted'}`}>
                              {meta.listTitle ?? meta.title}
                            </span>
                            <span
                              className={`mt-0.5 text-[13px] leading-[1.45] text-secondary ${
                                availability.available ? 'line-clamp-2 md:line-clamp-1' : 'block'
                              }`}
                            >
                              {availability.available ? meta.intro : availability.reason}
                            </span>
                          </span>
                          {!availability.available ? (
                            <Lock aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-muted" />
                          ) : done ? (
                            <span className="flex flex-shrink-0 items-center text-accent">
                              <Check aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2.5} />
                              <span className="sr-only">Done</span>
                            </span>
                          ) : (
                            <ChevronRight aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-muted" />
                          )}
                        </button>
                      </motion.li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default GuideCenter;

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type AnimationPlaybackControls,
} from 'framer-motion';
import { GraduationCap, Plus, Upload } from 'lucide-react';
import { useCtfStore } from '../store/useCtfStore';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { playCyberSound } from '../utils/helpers';
import { guideSteps, resolveStep, tourStepsFor, withStandInCopy, type TourActionId, type TourStep } from './content';
import { FinishPanel, StepPanel } from './GuideCard';
import { CARD_SHADOW, CLOSE_MS, DIM, EASE_DRAWER, EASE_OUT, RIG_SPRING, PressButton, SheetHandle, buttonStyles, cardSurface, useIsPhone } from './guideMotion';
import {
  getZoom,
  holeFor,
  planPhoneScroll,
  planScroll,
  safeTopInset,
  toZoomedRect,
  type Bounds,
  type Dock,
  type Rect,
  type ScrollMove,
} from './spotlightGeometry';
import { useOnboardingStore, type FinishedGuide } from './useOnboardingStore';
import { useSheetDrag } from './useSheetDrag';
import { WelcomeCard } from './WelcomeCard';

/** Which card edge carries the caret that points at the spotlight. */
type CaretSide = 'left' | 'top' | 'bottom';

interface CardPos {
  top: number;
  left: number;
  caret: CaretSide | null;
  caretOffset: number;
}

const ANCHOR_WAIT_MS = 1500;
const POLL_MS = 150;
const PAD = 6;
const PHONE_PAD = 4;
const MARGIN = 8;
const GAP = 14;
const PHONE_GAP = 12;
/** A phone sheet shows up by this time even if its target has not appeared yet. */
const SHEET_GRACE_MS = 200;
/** Pause after a hands-on action so the visitor sees the result before the tour moves on. */
const HANDS_ON_DELAY_MS = 800;

const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b ||
  (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, Math.max(lo, hi)));

const hasSize = (el: Element) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

/** Some anchors exist twice, one for each screen size. The one on screen wins. */
function findAnchor(name: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return all.find(hasSize) ?? all[0] ?? null;
}

/** True when a step's main anchor is not on the page and its alternative is. */
function standingIn(step: TourStep): boolean {
  if (!step.anchor || !step.altAnchor) return false;
  const main = findAnchor(step.anchor);
  return !(main && hasSize(main)) && findAnchor(step.altAnchor) !== null;
}

/** Moves the page with the rig's spring, so the target lands exactly as the spotlight does. */
function runScrollMoves(moves: ScrollMove[], instant: boolean, onDone: () => void): () => void {
  if (moves.length === 0) {
    onDone();
    return () => {};
  }
  if (instant) {
    moves.forEach((m) => m.node.scrollTo?.({ top: m.toTop, left: m.toLeft, behavior: 'instant' as ScrollBehavior }));
    onDone();
    return () => {};
  }
  const write = (m: ScrollMove, top: number, left: number) => {
    m.node.scrollTop = top;
    m.node.scrollLeft = left;
  };
  let pending = moves.length;
  const controls: AnimationPlaybackControls[] = moves.map((m) =>
    animate(0, 1, {
      ...RIG_SPRING,
      onUpdate: (t) => write(m, m.fromTop + (m.toTop - m.fromTop) * t, m.fromLeft + (m.toLeft - m.fromLeft) * t),
      onComplete: () => {
        write(m, m.toTop, m.toLeft);
        pending -= 1;
        if (pending === 0) onDone();
      },
    }),
  );
  return () => controls.forEach((c) => c.stop());
}

interface SpotlightProps {
  top: ReturnType<typeof useSpring>;
  left: ReturnType<typeof useSpring>;
  width: ReturnType<typeof useSpring>;
  height: ReturnType<typeof useSpring>;
  stepId: string;
  reduced: boolean;
}

const CORNERS = [
  { className: 'left-0 top-0 rounded-tl-[5px] border-l-2 border-t-2', x: -5, y: -5 },
  { className: 'right-0 top-0 rounded-tr-[5px] border-r-2 border-t-2', x: 5, y: -5 },
  { className: 'bottom-0 left-0 rounded-bl-[5px] border-b-2 border-l-2', x: -5, y: 5 },
  { className: 'bottom-0 right-0 rounded-br-[5px] border-b-2 border-r-2', x: 5, y: 5 },
];

/**
 * The lit opening. The dim around it is on at full strength from the first frame, so the screen never
 * brightens and darkens as the spotlight comes and goes: a cover over the opening fades instead, and only
 * the target changes. A hairline holds the shape while the corners tighten onto each new target.
 */
const Spotlight: React.FC<SpotlightProps> = ({ top, left, width, height, stepId, reduced }) => (
  <motion.div
    aria-hidden="true"
    data-testid="tour-spotlight"
    className="pointer-events-none absolute rounded-lg"
    style={{ top, left, width, height, boxShadow: `0 0 0 9999px ${DIM}` }}
  >
    <motion.span
      className="absolute inset-0 rounded-lg"
      style={{ background: DIM }}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      exit={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
    />
    <motion.span
      className="absolute inset-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: EASE_OUT }}
    >
      <span className="absolute inset-0 rounded-lg border border-accent/45" />
      {CORNERS.map((corner, i) => (
        <motion.span
          key={`${stepId}-${i}`}
          className={`absolute h-3 w-3 border-accent ${corner.className}`}
          initial={reduced ? { opacity: 0 } : { opacity: 0, x: corner.x, y: corner.y }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.24, delay: reduced ? 0 : 0.14, ease: EASE_OUT }}
        />
      ))}
    </motion.span>
  </motion.div>
);

interface RunnerViewProps {
  mode: 'tour' | 'guide';
  steps: TourStep[];
  index: number;
  finished: FinishedGuide | null;
  closing: boolean;
  /** A guide launch is taking over the dim, so this one must drop out rather than fade against it. */
  handoff: boolean;
  /** Mounted straight after a launch, whose shield already dims the screen. */
  landed: boolean;
  onNext: () => void;
  onBack: () => void;
  /** Skip, Esc and action buttons end through here. */
  onExit: () => void;
  /** The last step's button. */
  onLast: () => void;
  onNextGuide: (id: string) => void;
}

const RunnerView: React.FC<RunnerViewProps> = ({
  mode,
  steps: rawSteps,
  index,
  finished,
  closing,
  handoff,
  landed,
  onNext,
  onBack,
  onExit,
  onLast,
  onNextGuide,
}) => {
  const navigate = useNavigate();
  const reduced = Boolean(useReducedMotion());
  const isMobile = useIsPhone();
  const setHandsOn = useOnboardingStore((s) => s.setHandsOn);
  const completedCount = useOnboardingStore((s) => s.completedGuides.length);

  const resolvedSteps = useMemo(() => rawSteps.map((s) => resolveStep(s, isMobile)), [rawSteps, isMobile]);
  const resolved = resolvedSteps[index];
  // Read as the step arrives, so the card never shows copy for something this page does not have.
  const step = useMemo(() => (standingIn(resolved) ? withStandInCopy(resolved) : resolved), [resolved]);
  const steps = useMemo(() => resolvedSteps.map((s) => (s === resolved ? step : s)), [resolvedSteps, resolved, step]);
  const isSheet = isMobile && !step.welcome;
  const overlapDock = step.overlapDock ?? 'bottom';
  // A top-docked hands-on target (the importer) grows as results list, so its scroll is planned again to keep
  // its bottom row in view. Other steps keep their one-time plan.
  const followGrowth = overlapDock === 'top' && Boolean(step.handsOn) && !isMobile;
  const activeAnchor = finished ? undefined : step.anchor;
  const altAnchor = finished ? undefined : step.altAnchor;

  const [rect, setRect] = useState<Rect | null>(null);
  const [settled, setSettled] = useState(false);
  const [cardPos, setCardPos] = useState<CardPos | null>(null);
  const [dock, setDock] = useState<Dock>('bottom');
  const [graceOver, setGraceOver] = useState(false);
  const placedOnce = useRef(false);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(
    typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null,
  );

  // Which way the copy slides.
  const lastIndex = useRef(index);
  const direction = index >= lastIndex.current ? 1 : -1;
  useEffect(() => {
    lastIndex.current = index;
  }, [index]);

  const spot = rect && !step.welcome && !finished ? rect : null;
  // Hands-on steps let clicks reach the anchor, so they cannot trap focus. A phone has no such step:
  // its controls are often hidden there and the sheet covers the bottom of the screen.
  const handsOnLive = Boolean(step.handsOn && settled && spot && !isMobile);

  const cardRef = useFocusTrap<HTMLDivElement>({
    isActive: !handsOnLive && !closing,
    onClose: onExit,
    autoFocusFirst: false,
  });

  // Latest callbacks for timers and listeners.
  const onNextRef = useRef(onNext);
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onNextRef.current = onNext;
    onExitRef.current = onExit;
  });

  // A host that grabs focus late (the snippets drawer focuses its search box) must not pull it out of the card.
  useEffect(() => {
    if (handsOnLive || closing) return;
    const onFocusIn = (e: FocusEvent) => {
      const card = cardRef.current;
      const target = e.target as Node | null;
      if (card && target && !card.contains(target)) (nextRef.current ?? card).focus({ preventScroll: true });
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [handsOnLive, closing, cardRef]);

  // Put focus back where it was when the whole runner goes away.
  useEffect(() => {
    const opener = openerRef.current;
    return () => {
      if (opener && typeof opener.focus === 'function' && document.body.contains(opener)) opener.focus();
    };
  }, []);

  // Tell the hotkey layer which shortcuts this step wants to keep working.
  useEffect(() => {
    setHandsOn(handsOnLive ? (step.handsOn ?? null) : null);
    return () => setHandsOn(null);
  }, [handsOnLive, step.handsOn, setHandsOn]);

  // Non-modal steps have no focus trap, so Esc is handled here.
  useEffect(() => {
    if (!handsOnLive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExitRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [handsOnLive]);

  // Hands-on steps advance when the visitor really does the thing.
  const viewMode = useCtfStore((s) => s.viewMode);
  const selectedMachineId = useCtfStore((s) => s.selectedMachineId);
  const paletteOpen = useCtfStore((s) => s.commandPaletteOpen);
  const startView = useRef(viewMode);
  useEffect(() => {
    startView.current = useCtfStore.getState().viewMode;
  }, [step.id]);
  useEffect(() => {
    if (mode !== 'tour' || !handsOnLive) return;
    let timer: number | undefined;
    if (step.handsOn === 'layout' && viewMode !== startView.current) {
      timer = window.setTimeout(() => onNextRef.current(), HANDS_ON_DELAY_MS / 2);
    } else if (step.handsOn === 'machine' && selectedMachineId) {
      timer = window.setTimeout(() => {
        useCtfStore.getState().setSelectedMachineId(null);
        onNextRef.current();
      }, HANDS_ON_DELAY_MS);
    } else if (step.handsOn === 'palette' && paletteOpen) {
      timer = window.setTimeout(() => {
        useCtfStore.getState().setCommandPaletteOpen(false);
        useOnboardingStore.getState().dismissHint('palette');
        onNextRef.current();
      }, HANDS_ON_DELAY_MS);
    }
    return () => window.clearTimeout(timer);
  }, [mode, handsOnLive, step.handsOn, viewMode, selectedMachineId, paletteOpen]);

  // The rig: the spotlight's four edges are springs, written to from outside React so a move costs no renders.
  const holeTop = useSpring(0, RIG_SPRING);
  const holeLeft = useSpring(0, RIG_SPRING);
  const holeWidth = useSpring(0, RIG_SPRING);
  const holeHeight = useSpring(0, RIG_SPRING);
  const holeBounds = useRef<Bounds | null>(null);
  const holePlaced = useRef(false);

  const moveHole = useCallback(
    (target: Rect, jump: boolean) => {
      const z = getZoom();
      const bounds: Bounds = holeBounds.current ?? {
        top: 0,
        left: 0,
        right: window.innerWidth / z,
        bottom: window.innerHeight / z,
      };
      const hole = holeFor(target, isMobile ? PHONE_PAD : PAD, bounds);
      const instant = jump || reduced || !holePlaced.current;
      holePlaced.current = true;
      const apply = (value: typeof holeTop, next: number) => {
        if (instant) value.jump(next);
        else value.set(next);
      };
      apply(holeTop, hole.top);
      apply(holeLeft, hole.left);
      apply(holeWidth, hole.width);
      apply(holeHeight, hole.height);
    },
    [holeHeight, holeLeft, holeTop, holeWidth, isMobile, reduced],
  );

  // Find the anchor, plan the move, then follow it. Missing after the wait window means a centered card.
  useEffect(() => {
    if (!activeAnchor) {
      setRect(null);
      setSettled(true);
      holeBounds.current = null;
      return;
    }
    setSettled(false);
    const startedAt = performance.now();
    let planned = false;
    let plannedHeight = 0;
    let stopScroll: (() => void) | null = null;
    let ownScroll = false;
    let frame = 0;

    const plan = (el: HTMLElement) => {
      const z = getZoom();
      const card = cardRef.current;
      const vw = window.innerWidth / z;
      const vh = window.innerHeight / z;
      const cardH = card?.offsetHeight ?? 0;
      if (isMobile) {
        const sheetTop = card?.offsetTop ?? vh;
        const topInset = safeTopInset();
        const dockedBottom = topInset + cardH;
        const res = planPhoneScroll(el, { sheetTop, dockedBottom, gap: PHONE_GAP }, z);
        setDock(res.dock);
        holeBounds.current =
          res.dock === 'bottom'
            ? { top: 0, left: 2, right: vw - 2, bottom: sheetTop - PHONE_PAD }
            : { top: dockedBottom + PHONE_PAD, left: 2, right: vw - 2, bottom: vh };
        return res;
      }
      const r = el.getBoundingClientRect();
      const cw = card?.offsetWidth ?? 0;
      const sideRoom = (r.left + r.width) / z + PAD + GAP + cw <= vw - MARGIN;
      const cardRoom = cardH + GAP + PAD + MARGIN;
      const dockTop = overlapDock === 'top';
      const marginTop = sideRoom || !dockTop ? 24 : cardRoom;
      const marginBottom = sideRoom || dockTop ? 24 : cardRoom;
      const fits = r.height / z + marginTop + marginBottom <= vh;
      plannedHeight = r.height;
      const res = planScroll(el, { marginTop, marginBottom, block: fits ? 'nearest' : dockTop ? 'end' : 'start' });
      // A target the card cannot sit beside, even after the scroll, is lit up to the card's edge: its top part
      // when the card takes the bottom edge, its bottom part (where its main button is) when the card takes the top.
      const end = toZoomedRect(res.rect, z);
      const clear =
        sideRoom || end.top + end.height + PAD + GAP + cardH <= vh - MARGIN || end.top - PAD - GAP - cardH >= MARGIN;
      holeBounds.current = clear
        ? null
        : dockTop
          ? { top: cardH + MARGIN + GAP, left: 0, right: vw, bottom: vh }
          : { top: 0, left: 0, right: vw, bottom: vh - cardH - MARGIN - GAP };
      return res;
    };

    const measure = (jump = false) => {
      if (ownScroll) return;
      const main = findAnchor(activeAnchor);
      // An alternative stands in right away: the main anchor is not late, this page state does not have it.
      const el = main && hasSize(main) ? main : ((altAnchor ? findAnchor(altAnchor) : null) ?? main);
      const r = el?.getBoundingClientRect();
      const z = getZoom();
      if (el && r && r.width > 0 && r.height > 0) {
        if (!planned) {
          planned = true;
          const scrollPlan = plan(el);
          const final = toZoomedRect(scrollPlan.rect, z);
          moveHole(final, false);
          setRect(final);
          setSettled(true);
          ownScroll = scrollPlan.moves.length > 0;
          stopScroll = runScrollMoves(scrollPlan.moves, reduced, () => {
            ownScroll = false;
            measure();
          });
          return;
        }
        if (followGrowth && Math.abs(r.height - plannedHeight) > 1) {
          planned = false;
          stopScroll?.();
          measure();
          return;
        }
        const found = toZoomedRect(r, z);
        setRect((prev) => (sameRect(prev, found) ? prev : found));
        moveHole(found, jump);
        return;
      }
      // Hidden at this size (sidebar, layout switcher, header search): there is nothing to wait for.
      if (el && isMobile) {
        setRect(null);
        setSettled(true);
        return;
      }
      if (performance.now() - startedAt >= ANCHOR_WAIT_MS) {
        setRect(null);
        setSettled(true);
      }
    };

    // Any scroll this runner did not start (a late layout shift, a nested scroller) is followed frame by
    // frame, with no spring, so the spotlight never trails its target.
    const onScroll = () => {
      if (ownScroll || !planned || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure(true);
      });
    };
    const onResize = () => {
      planned = false;
      stopScroll?.();
      ownScroll = false;
      measure();
    };

    measure();
    const id = window.setInterval(measure, POLL_MS);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      window.clearInterval(id);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, { capture: true });
      if (frame) cancelAnimationFrame(frame);
      stopScroll?.();
    };
  }, [activeAnchor, altAnchor, step.id, isMobile, cardRef, moveHole, reduced, overlapDock, followGrowth]);

  // Place the desktop card beside the spotlight (with a caret pointing at it), or centered, inside the viewport.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (isSheet || !card || !settled) return;
    const z = getZoom();
    const vw = window.innerWidth / z;
    const vh = window.innerHeight / z;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    let top: number;
    let left: number;
    let caret: CaretSide | null = null;
    let caretOffset = 0;
    if (!spot) {
      left = (vw - cw) / 2;
      top = (vh - ch) / 2;
    } else if (spot.left + spot.width + PAD + GAP + cw <= vw - MARGIN) {
      left = spot.left + spot.width + PAD + GAP;
      top = clamp(spot.top, MARGIN, vh - ch - MARGIN);
      caret = 'left';
      caretOffset = clamp(spot.top + spot.height / 2 - top - 6, 16, ch - 28);
    } else {
      left = clamp(spot.left + spot.width / 2 - cw / 2, MARGIN, vw - cw - MARGIN);
      const below = spot.top + spot.height + PAD + GAP;
      if (below + ch <= vh - MARGIN) {
        top = below;
        caret = 'top';
      } else if (spot.top - PAD - GAP - ch >= MARGIN) {
        top = spot.top - PAD - GAP - ch;
        caret = 'bottom';
      } else if (overlapDock === 'top') {
        // The target is too big for the card to sit beside it, and its controls are at the bottom: the card
        // takes the top edge, and the spotlight starts just below it (see plan).
        top = MARGIN;
        caret = 'bottom';
      } else {
        // The target is too big for the card to sit beside it: the card takes the bottom edge, and the
        // spotlight stops just above it (see plan).
        top = vh - ch - MARGIN;
        caret = 'top';
      }
      if (caret) caretOffset = clamp(spot.left + spot.width / 2 - left - 6, 16, cw - 28);
    }
    setCardPos((prev) =>
      prev && prev.top === top && prev.left === left && prev.caret === caret && prev.caretOffset === caretOffset
        ? prev
        : { top, left, caret, caretOffset },
    );
  }, [spot, settled, step.id, isSheet, cardRef, finished, overlapDock]);

  // Keep keyboard focus on the primary action as steps change.
  useEffect(() => {
    if (settled && !handsOnLive) nextRef.current?.focus({ preventScroll: true });
  }, [settled, step.id, handsOnLive, finished, isSheet]);

  // The card renders before the page, so Tab from it would never reach the panel: put focus in the text box once.
  const importFocused = useRef(false);
  useEffect(() => {
    if (!handsOnLive || step.handsOn !== 'import' || importFocused.current) return;
    const frame = requestAnimationFrame(() => {
      const box = document.querySelector<HTMLTextAreaElement>('[data-tour="import-panel"] textarea');
      if (!box) return;
      importFocused.current = true;
      box.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [handsOnLive, step.handsOn]);

  // A small reward for finishing: the sound a captured flag makes, and a tap on phones that have one.
  const celebrated = useRef(false);
  useEffect(() => {
    if (!finished || celebrated.current) return;
    celebrated.current = true;
    if (useCtfStore.getState().soundEnabled) playCyberSound('flag');
    if (!reduced && isMobile) navigator.vibrate?.(12);
  }, [finished, reduced, isMobile]);

  const runAction = useCallback(
    (id: TourActionId) => {
      onExit();
      if (id === 'add-machine') useCtfStore.getState().setNewMachineModalOpen(true);
      else if (id === 'import-notes') useCtfStore.getState().setNotesImportModalOpen(true);
      else if (id === 'import-solved') navigate('/tracker?import=1');
      else navigate('/exam');
    },
    [onExit, navigate],
  );

  const moveTransition = reduced || !placedOnce.current ? { duration: 0 } : RIG_SPRING;
  useEffect(() => {
    if (cardPos) placedOnce.current = true;
  }, [cardPos]);

  // --- Phone sheet ---
  // Enters from the edge it will rest against. `dockY` is its rest position and `dragY` the finger on top.
  useEffect(() => {
    if (!isSheet) return;
    const timer = window.setTimeout(() => setGraceOver(true), SHEET_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [isSheet]);
  const sheetReady = settled || graceOver;

  const dockY = useMotionValue(0);
  const dragY = useMotionValue(reduced ? 0 : 2000);
  const sheetY = useTransform([dockY, dragY], ([d, g]: number[]) => d + g);
  const fingerDrivenRef = useRef<React.MutableRefObject<boolean> | null>(null);
  const dimOpacity = useTransform(dragY, (g) => {
    // Only a finger lifts the dim. The sheet's own entrance and resizing use the same value and must not.
    if (!fingerDrivenRef.current?.current) return 1;
    const h = cardRef.current?.offsetHeight || 300;
    return 1 - Math.min(1, Math.abs(g) / h) * 0.6;
  });

  const effectiveDock: Dock = finished ? 'bottom' : dock;
  const entered = useRef(false);

  useEffect(() => {
    if (!isSheet) return;
    const card = cardRef.current;
    const target = effectiveDock === 'top' && card ? safeTopInset() - card.offsetTop : 0;
    if (reduced || !entered.current) {
      dockY.set(target);
      return;
    }
    const controls = animate(dockY, target, RIG_SPRING);
    return () => controls.stop();
  }, [effectiveDock, isSheet, dockY, reduced, cardRef]);

  useLayoutEffect(() => {
    if (!isSheet || !sheetReady || entered.current || closing) return;
    entered.current = true;
    if (reduced) {
      dragY.set(0);
      return;
    }
    const h = (cardRef.current?.offsetHeight ?? 300) + 32;
    dragY.set(effectiveDock === 'top' ? -h : h);
    animate(dragY, 0, { duration: 0.28, ease: EASE_DRAWER });
  }, [isSheet, sheetReady, closing, reduced, dragY, effectiveDock, cardRef]);

  // The finish panel is taller. Keep the top edge where it was and let the sheet rise into place.
  const lastHeight = useRef(0);
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !isSheet) return;
    const height = card.offsetHeight;
    const delta = height - lastHeight.current;
    if (lastHeight.current && delta !== 0 && entered.current && !reduced && !closing) {
      dragY.set(dragY.get() + delta);
      animate(dragY, 0, { duration: 0.28, ease: EASE_DRAWER });
    }
    lastHeight.current = height;
    // A sheet that overflows (a tiny phone in landscape, large text) has to scroll instead of swipe.
    card.style.touchAction = card.scrollHeight > card.clientHeight + 1 ? 'pan-y' : 'none';
  }, [finished, step.id, isSheet, closing, reduced, dragY, cardRef]);

  const { fingerDriven, handlers: dragHandlers } = useSheetDrag({
    y: dragY,
    direction: effectiveDock === 'top' ? -1 : 1,
    enabled: isSheet && !closing,
    reducedMotion: reduced,
    height: () => cardRef.current?.offsetHeight ?? 300,
    onDismiss: onExit,
  });
  fingerDrivenRef.current = fingerDriven;

  useEffect(() => {
    if (!closing || !isSheet || reduced) return;
    const h = (cardRef.current?.offsetHeight ?? 300) + 32;
    const controls = animate(dragY, effectiveDock === 'top' ? -h : h, { duration: CLOSE_MS / 1000, ease: EASE_OUT });
    return () => controls.stop();
  }, [closing, isSheet, reduced, dragY, effectiveDock, cardRef]);

  const visible = isSheet ? sheetReady : settled && (isMobile || cardPos !== null);
  const placement = isMobile
    ? step.welcome
      ? 'inset-x-3 top-[6%] max-h-[88%] overflow-y-auto rounded-2xl p-5'
      : 'bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-2 right-2 max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-2xl px-5 pb-4 pt-2.5'
    : step.welcome
      ? 'w-[28rem] max-w-[calc(100vw-1rem)] rounded-2xl p-7'
      : 'w-[25rem] max-w-[calc(100vw-1rem)] rounded-2xl p-5';

  // Shields for hands-on steps; the spotlight itself follows the springs.
  const hole = spot ? holeFor(spot, PAD, { top: -9999, left: -9999, right: 99999, bottom: 99999 }) : null;

  const actionIcons: Record<TourActionId, React.ReactNode> = {
    'add-machine': <Plus className="h-4 w-4" aria-hidden="true" />,
    'import-notes': <Upload className="h-4 w-4" aria-hidden="true" />,
    'try-exam': <GraduationCap className="h-4 w-4" aria-hidden="true" />,
    'import-solved': <Upload className="h-4 w-4" aria-hidden="true" />,
  };

  const caretNode =
    !isMobile && cardPos?.caret && spot ? (
      <motion.span
        aria-hidden="true"
        data-testid="tour-caret"
        className={`absolute h-3 w-3 border-subtle bg-surface-card ${
          cardPos.caret === 'left'
            ? '-left-1.5 top-0 border-b border-l'
            : cardPos.caret === 'top'
              ? '-top-1.5 left-0 border-l border-t'
              : '-bottom-1.5 left-0 border-b border-r'
        }`}
        style={{ rotate: 45 }}
        initial={false}
        animate={cardPos.caret === 'left' ? { y: cardPos.caretOffset, x: 0 } : { x: cardPos.caretOffset, y: 0 }}
        transition={moveTransition}
      />
    ) : null;

  // A live hands-on step is done on the page itself, so its buttons stay off the card.
  const actions = step.actions && !(step.handsOn && handsOnLive) ? (
    <div className="mt-4 flex flex-col gap-2">
      {step.actions.map((a) => (
        <PressButton
          key={a.id}
          onClick={() => runAction(a.id)}
          className={`${step.actionsPrimary ? buttonStyles.primary : buttonStyles.secondary} w-full gap-2 py-2.5`}
        >
          {actionIcons[a.id]}
          <span>{a.label}</span>
        </PressButton>
      ))}
    </div>
  ) : null;

  const handle = isSheet ? <SheetHandle className={effectiveDock === 'top' ? 'mt-3' : 'mb-3'} /> : null;

  return (
    <motion.div
      className={`fixed inset-0 z-critical overflow-hidden ${handsOnLive || closing ? 'pointer-events-none' : ''}`}
      data-testid="tour-overlay"
      data-guide-surface=""
      initial={landed ? false : { opacity: 0 }}
      animate={{ opacity: closing && !handoff ? 0 : 1 }}
      transition={{ duration: closing ? CLOSE_MS / 1000 : 0.16, ease: EASE_OUT }}
    >
      {/* The dim. It lifts a little as a sheet is dragged away, and drops out at once for a launch's shield. */}
      <motion.div
        className={`pointer-events-none absolute inset-0 ${closing && handoff ? 'invisible' : ''}`}
        style={isSheet ? { opacity: dimOpacity } : undefined}
        aria-hidden="true"
      >
        <AnimatePresence initial={false} mode="wait">
          {!spot && <motion.div key="scrim" className="absolute inset-0" style={{ background: DIM }} />}
          {spot && (
            <Spotlight
              key="spot"
              top={holeTop}
              left={holeLeft}
              width={holeWidth}
              height={holeHeight}
              stepId={step.id}
              reduced={reduced}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Click shield. Modal steps block the whole page; hands-on steps leave a hole over the anchor. */}
      {!handsOnLive && <div className="absolute inset-0" aria-hidden="true" />}
      {hole && handsOnLive && (
        <>
          <div className="pointer-events-auto absolute inset-x-0 top-0" style={{ height: Math.max(0, hole.top) }} aria-hidden="true" />
          <div className="pointer-events-auto absolute inset-x-0 bottom-0" style={{ top: hole.top + hole.height }} aria-hidden="true" />
          <div className="pointer-events-auto absolute left-0" style={{ top: hole.top, height: hole.height, width: Math.max(0, hole.left) }} aria-hidden="true" />
          <div className="pointer-events-auto absolute right-0" style={{ top: hole.top, height: hole.height, left: hole.left + hole.width }} aria-hidden="true" />
        </>
      )}

      <motion.div
        key={isSheet ? 'sheet' : 'card'}
        ref={cardRef}
        role={handsOnLive ? 'region' : 'dialog'}
        aria-modal={handsOnLive ? undefined : true}
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        data-testid={finished ? 'guide-finish' : 'tour-card'}
        data-dock={isSheet ? effectiveDock : undefined}
        initial={false}
        animate={
          isSheet || (isMobile && step.welcome)
            ? { opacity: closing ? 0 : visible || (isMobile && step.welcome) ? 1 : 0 }
            : { x: cardPos?.left ?? 0, y: cardPos?.top ?? 0, opacity: closing ? 0 : visible ? 1 : 0 }
        }
        transition={
          isMobile
            ? { duration: reduced ? 0 : 0.15 }
            : { ...moveTransition, opacity: { duration: reduced ? 0 : 0.15 } }
        }
        style={
          isSheet
            ? { y: sheetY, boxShadow: CARD_SHADOW }
            : { boxShadow: CARD_SHADOW }
        }
        className={`pointer-events-auto absolute ${cardSurface} outline-none ${
          isMobile ? '' : 'left-0 top-0'
        } ${placement}`}
        {...(isSheet ? dragHandlers : {})}
      >
        {caretNode}
        {effectiveDock === 'bottom' && handle}
        {step.welcome ? (
          <WelcomeCard onStart={onNext} onSkip={onExit} startRef={nextRef} />
        ) : finished ? (
          <FinishPanel
            guideId={finished.id}
            nextId={finished.nextId}
            completedCount={completedCount}
            stepCount={steps.length}
            primaryRef={nextRef}
            onNextGuide={onNextGuide}
            onClose={onExit}
          />
        ) : (
          <StepPanel
            mode={mode}
            steps={steps}
            index={index}
            direction={direction}
            handsOnLive={handsOnLive}
            nextRef={nextRef}
            actions={actions}
            onNext={onNext}
            onBack={onBack}
            onLast={onLast}
            onExit={onExit}
          />
        )}
        {effectiveDock === 'top' && handle}
      </motion.div>
    </motion.div>
  );
};

interface TourRunnerProps {
  mode: 'tour' | 'guide';
  /** Set while the runner animates away, after the store has already moved on. */
  closing?: boolean;
  handoff?: boolean;
  landed?: boolean;
}

interface RunnerSnapshot {
  key: string;
  steps: TourStep[];
  index: number;
  finished: FinishedGuide | null;
}

/** Spotlight runner for the main tour and the per-section mini-tours. Lazy-loaded. */
export const TourRunner: React.FC<TourRunnerProps> = ({ mode, closing = false, handoff = false, landed = false }) => {
  const tourIndex = useOnboardingStore((s) => s.stepIndex);
  const tourStepIds = useOnboardingStore((s) => s.tourStepIds);
  const tourSteps = useMemo(() => tourStepsFor(tourStepIds), [tourStepIds]);
  const next = useOnboardingStore((s) => s.next);
  const back = useOnboardingStore((s) => s.back);
  const finishTour = useOnboardingStore((s) => s.finishTour);
  const guide = useOnboardingStore((s) => s.guide);
  const finishedGuide = useOnboardingStore((s) => s.finishedGuide);
  const nextGuideStep = useOnboardingStore((s) => s.nextGuideStep);
  const backGuideStep = useOnboardingStore((s) => s.backGuideStep);
  const closeGuide = useOnboardingStore((s) => s.closeGuide);
  const completeGuide = useOnboardingStore((s) => s.completeGuide);
  const launchGuide = useOnboardingStore((s) => s.launchGuide);

  const guideId = guide?.id ?? finishedGuide?.id ?? null;
  const liveSteps = mode === 'tour' ? tourSteps : guideId ? guideSteps(guideId) : [];
  const liveIndex = Math.min(
    mode === 'tour' ? tourIndex : finishedGuide ? liveSteps.length - 1 : (guide?.stepIndex ?? 0),
    liveSteps.length - 1,
  );

  // Once the store has moved on there is nothing left to read, so a closing runner shows its last state.
  const snapshot = useRef<RunnerSnapshot | null>(null);
  if (!closing && liveSteps.length > 0 && liveIndex >= 0) {
    snapshot.current = {
      key: `${mode}:${guideId ?? ''}`,
      steps: liveSteps,
      index: liveIndex,
      finished: mode === 'guide' ? finishedGuide : null,
    };
  }
  const view = snapshot.current;
  if (!view || (!closing && (liveSteps.length === 0 || liveIndex < 0))) return null;

  const exitTour = () => {
    // A palette left open by the hands-on step should not outlive the tour.
    if (view.steps[view.index]?.handsOn === 'palette') useCtfStore.getState().setCommandPaletteOpen(false);
    finishTour();
  };

  return (
    <RunnerView
      key={view.key}
      mode={mode}
      steps={view.steps}
      index={view.index}
      finished={view.finished}
      closing={closing}
      handoff={handoff}
      landed={landed}
      onNext={mode === 'tour' ? () => next() : () => nextGuideStep(view.steps.length)}
      onBack={mode === 'tour' ? back : backGuideStep}
      onExit={mode === 'tour' ? exitTour : closeGuide}
      onLast={mode === 'tour' ? exitTour : completeGuide}
      onNextGuide={(id) => void launchGuide(id)}
    />
  );
};

export default TourRunner;

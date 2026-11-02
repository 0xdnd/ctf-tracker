import { useCallback, useRef } from 'react';
import { animate, type MotionValue } from 'framer-motion';

/** Movement before a press counts as a drag, so button taps still reach their button. */
export const DRAG_SLOP_PX = 6;
/** A flick this fast dismisses from any distance (px per ms). */
export const DISMISS_VELOCITY = 0.45;
/** Without a flick, this share of the sheet's height has to travel. */
export const DISMISS_FRACTION = 0.35;
/** How far the sheet gives when pulled the wrong way. */
export const DAMP_LIMIT_PX = 28;
const VELOCITY_WINDOW_MS = 90;
const RETURN_SPRING = { type: 'spring', stiffness: 520, damping: 46, mass: 1 } as const;

/** Rubber band: the further past the boundary, the less it moves. Never reaches the limit. */
export function dampen(overshoot: number, limit = DAMP_LIMIT_PX): number {
  const distance = Math.abs(overshoot);
  return Math.sign(overshoot) * limit * (1 - 1 / (1 + distance / (limit * 2)));
}

/** Both arguments are measured in the dismiss direction. Moving away never dismisses. */
export function shouldDismiss(distance: number, velocity: number, height: number): boolean {
  if (distance <= 0) return false;
  return velocity >= DISMISS_VELOCITY || distance >= height * DISMISS_FRACTION;
}

interface SheetDragOptions {
  /** Added to the sheet's rest position. */
  y: MotionValue<number>;
  /** 1 when the sheet leaves downward, -1 when it is docked to the top and leaves upward. */
  direction: 1 | -1;
  enabled: boolean;
  reducedMotion: boolean;
  /** Height used for the distance threshold. */
  height: () => number;
  onDismiss: () => void;
}

export interface SheetDrag {
  /** True from the moment a finger moves the sheet until it has settled back. */
  fingerDriven: React.MutableRefObject<boolean>;
  handlers: SheetDragHandlers;
}

export interface SheetDragHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
}

/** Swipe to dismiss: pointer capture, velocity from the last few samples, damping past the boundary. */
export function useSheetDrag({ y, direction, enabled, reducedMotion, height, onDismiss }: SheetDragOptions): SheetDrag {
  const gesture = useRef<{
    pointerId: number;
    startY: number;
    dragging: boolean;
    samples: { t: number; y: number }[];
  } | null>(null);

  const fingerDriven = useRef(false);

  const release = useCallback(
    (velocity: number) => {
      if (reducedMotion) {
        y.set(0);
        fingerDriven.current = false;
        return;
      }
      animate(y, 0, {
        ...RETURN_SPRING,
        velocity,
        onComplete: () => {
          fingerDriven.current = false;
        },
      });
    },
    [reducedMotion, y],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // A second finger joining mid-drag must not make the sheet jump to it.
      if (!enabled || gesture.current || e.button !== 0) return;
      gesture.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        dragging: false,
        samples: [{ t: e.timeStamp, y: e.clientY }],
      };
    },
    [enabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const g = gesture.current;
      if (!g || g.pointerId !== e.pointerId) return;
      const delta = e.clientY - g.startY;
      if (!g.dragging) {
        if (Math.abs(delta) < DRAG_SLOP_PX) return;
        g.dragging = true;
        fingerDriven.current = true;
        y.stop();
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      g.samples.push({ t: e.timeStamp, y: e.clientY });
      while (g.samples.length > 2 && e.timeStamp - g.samples[0].t > VELOCITY_WINDOW_MS) g.samples.shift();
      y.set(delta * direction >= 0 ? delta : dampen(delta));
    },
    [direction, y],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const g = gesture.current;
      if (!g || g.pointerId !== e.pointerId) return;
      gesture.current = null;
      if (!g.dragging) return;
      const first = g.samples[0];
      const last = g.samples[g.samples.length - 1];
      const elapsed = Math.max(1, last.t - first.t);
      const velocity = (last.y - first.y) / elapsed;
      const distance = (e.clientY - g.startY) * direction;
      if (shouldDismiss(distance, velocity * direction, height())) onDismiss();
      else release(velocity * 1000);
    },
    [direction, height, onDismiss, release],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const g = gesture.current;
      if (!g || g.pointerId !== e.pointerId) return;
      gesture.current = null;
      if (g.dragging) release(0);
    },
    [release],
  );

  return { fingerDriven, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel } };
}

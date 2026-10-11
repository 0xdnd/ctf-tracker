import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { EASE_OUT } from '../../utils/motion';

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: TooltipSide;
  /** Hover delay before opening. Focus always opens immediately. */
  delayMs?: number;
  disabled?: boolean;
}

const GAP = 8;
const VIEWPORT_MARGIN = 8;
/** If a tooltip closed this recently, the next opens instantly without animation. */
const SKIP_DELAY_WINDOW_MS = 300;

// Module-level "skip delay group": shared by every Tooltip instance.
let lastClosedAt = -Infinity;
const inSkipWindow = () => Date.now() - lastClosedAt < SKIP_DELAY_WINDOW_MS;

const OPPOSITE: Record<TooltipSide, TooltipSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

// Transform origin sits on the side facing the trigger.
const ORIGIN: Record<TooltipSide, string> = {
  top: 'bottom center',
  bottom: 'top center',
  left: 'right center',
  right: 'left center',
};

function place(side: TooltipSide, trigger: DOMRect, tip: DOMRect) {
  switch (side) {
    case 'top':
      return { top: trigger.top - tip.height - GAP, left: trigger.left + trigger.width / 2 - tip.width / 2 };
    case 'bottom':
      return { top: trigger.bottom + GAP, left: trigger.left + trigger.width / 2 - tip.width / 2 };
    case 'left':
      return { top: trigger.top + trigger.height / 2 - tip.height / 2, left: trigger.left - tip.width - GAP };
    default:
      return { top: trigger.top + trigger.height / 2 - tip.height / 2, left: trigger.right + GAP };
  }
}

function overflows(side: TooltipSide, pos: { top: number; left: number }, tip: DOMRect) {
  if (side === 'top') return pos.top < VIEWPORT_MARGIN;
  if (side === 'bottom') return pos.top + tip.height > window.innerHeight - VIEWPORT_MARGIN;
  if (side === 'left') return pos.left < VIEWPORT_MARGIN;
  return pos.left + tip.width > window.innerWidth - VIEWPORT_MARGIN;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  delayMs = 400,
  disabled = false,
}) => {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; side: TooltipSide } | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const show = useCallback((immediate: boolean) => {
    clearTimer();
    const skip = immediate || inSkipWindow();
    const doOpen = () => {
      timerRef.current = null;
      openRef.current = true;
      setInstant(skip);
      setOpen(true);
    };
    if (skip) doOpen();
    else timerRef.current = setTimeout(doOpen, delayMs);
  }, [delayMs]);

  const hide = useCallback(() => {
    clearTimer();
    if (openRef.current) {
      openRef.current = false;
      lastClosedAt = Date.now();
      setOpen(false);
      setCoords(null);
    }
  }, []);

  useEffect(() => () => {
    clearTimer();
    if (openRef.current) lastClosedAt = Date.now();
  }, []);

  useEffect(() => {
    if (disabled) hide();
  }, [disabled, hide]);

  // Esc closes while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, hide]);

  // Measure and flip once the tooltip is in the DOM.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tipRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    let finalSide = side;
    let pos = place(side, trigger, tip);
    if (overflows(side, pos, tip)) {
      const flipped = OPPOSITE[side];
      const flippedPos = place(flipped, trigger, tip);
      if (!overflows(flipped, flippedPos, tip)) {
        finalSide = flipped;
        pos = flippedPos;
      }
    }
    const left = Math.min(
      Math.max(pos.left, VIEWPORT_MARGIN),
      Math.max(VIEWPORT_MARGIN, window.innerWidth - tip.width - VIEWPORT_MARGIN)
    );
    const top = Math.min(
      Math.max(pos.top, VIEWPORT_MARGIN),
      Math.max(VIEWPORT_MARGIN, window.innerHeight - tip.height - VIEWPORT_MARGIN)
    );
    setCoords({ top, left, side: finalSide });
  }, [open, side, content]);

  const childProps = children.props as Record<string, unknown>;
  const call = <E,>(name: string, e: E) => {
    const fn = childProps[name];
    if (typeof fn === 'function') (fn as (ev: E) => void)(e);
  };

  const trigger = React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
      const childRef = (children as unknown as { ref?: React.Ref<HTMLElement> }).ref;
      if (typeof childRef === 'function') childRef(node);
      else if (childRef) (childRef as React.MutableRefObject<HTMLElement | null>).current = node;
    },
    'aria-describedby': open ? id : childProps['aria-describedby'],
    onPointerEnter: (e: React.PointerEvent) => {
      call('onPointerEnter', e);
      if (disabled || e.pointerType === 'touch') return;
      show(false);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      call('onPointerLeave', e);
      hide();
    },
    onFocus: (e: React.FocusEvent) => {
      call('onFocus', e);
      if (!disabled) show(true);
    },
    onBlur: (e: React.FocusEvent) => {
      call('onBlur', e);
      hide();
    },
  });

  const activeSide = coords?.side ?? side;

  return (
    <>
      {trigger}
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <motion.div
            ref={tipRef}
            id={id}
            role="tooltip"
            className="fixed z-popover pointer-events-none max-w-xs rounded-lg border border-subtle bg-surface-elevated px-2.5 py-1.5 text-xs text-primary shadow-lg"
            style={{
              top: coords?.top ?? 0,
              left: coords?.left ?? 0,
              // Hidden for the measuring frame so it never flashes at 0,0.
              visibility: coords ? 'visible' : 'hidden',
              transformOrigin: ORIGIN[activeSide],
            }}
            initial={instant ? false : { opacity: 0, transform: 'scale(0.97)' }}
            animate={{ opacity: 1, transform: 'scale(1)' }}
            transition={{ duration: instant ? 0 : 0.125, ease: EASE_OUT }}
          >
            {content}
          </motion.div>,
          document.body
        )}
    </>
  );
};

export default Tooltip;

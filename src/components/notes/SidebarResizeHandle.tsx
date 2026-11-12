import React, { useCallback, useEffect, useRef, useState } from 'react';

export const SIDEBAR_MIN_PX = 180;
export const SIDEBAR_ABS_MAX_PX = 600;
const STEP_PX = 16;
const STEP_SHIFT_PX = 48;

/** Max width: 600px or half the shell, whichever is smaller (never below the minimum). */
export const sidebarMaxPx = (shellWidth: number): number =>
  Math.max(SIDEBAR_MIN_PX, shellWidth > 0 ? Math.min(SIDEBAR_ABS_MAX_PX, Math.floor(shellWidth / 2)) : SIDEBAR_ABS_MAX_PX);

export const clampSidebarWidth = (w: number, shellWidth: number): number =>
  Math.min(sidebarMaxPx(shellWidth), Math.max(SIDEBAR_MIN_PX, Math.round(w)));

export const readStoredSidebarWidth = (key: string): number | null => {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
};

export const writeStoredSidebarWidth = (key: string, value: number | null): void => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, String(value));
  } catch {
    // storage unavailable: the width still applies for this session
  }
};

interface Props {
  /** Current (clamped) width of the aside in px. */
  width: number;
  /** Element whose width bounds the maximum. */
  getShell: () => HTMLElement | null;
  /** Called with a clamped width; `commit` is true when the change should be persisted. */
  onResize: (width: number, commit: boolean) => void;
  onReset: () => void;
  onDraggingChange: (dragging: boolean) => void;
}

/** Vertical drag handle on the right edge of the left aside (window splitter). */
export const SidebarResizeHandle: React.FC<Props> = ({
  width,
  getShell,
  onResize,
  onReset,
  onDraggingChange,
}) => {
  const drag = useRef<{ startX: number; startW: number; last: number } | null>(null);
  const [, force] = useState(0);
  const shellW = () => getShell()?.getBoundingClientRect().width ?? 0;
  const max = sidebarMaxPx(shellW());

  const endDrag = useCallback(
    (commit: boolean) => {
      const d = drag.current;
      if (!d) return;
      drag.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      onDraggingChange(false);
      if (commit) onResize(d.last, true);
    },
    [onDraggingChange, onResize],
  );

  const endRef = useRef(endDrag);
  endRef.current = endDrag;
  useEffect(() => () => endRef.current(false), []);

  // Re-render on window resize so aria-valuemax follows the shell.
  useEffect(() => {
    const on = () => force((n) => n + 1);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // pointer already released
    }
    drag.current = { startX: e.clientX, startW: width, last: width };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    onDraggingChange(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.last = clampSidebarWidth(d.startW + (e.clientX - d.startX), shellW());
    onResize(d.last, false);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {
      // pointer already released
    }
    endDrag(true);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? STEP_SHIFT_PX : STEP_PX;
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = width + step;
    else if (e.key === 'ArrowLeft') next = width - step;
    else if (e.key === 'Home') next = SIDEBAR_MIN_PX;
    else if (e.key === 'End') next = max;
    if (next === null) return;
    e.preventDefault();
    onResize(clampSidebarWidth(next, shellW()), true);
  };

  return (
    // A focusable separator is a WAI-ARIA window splitter; the lint rules do not model it.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuenow={width}
      aria-valuemin={SIDEBAR_MIN_PX}
      aria-valuemax={max}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      data-testid="notes-left-resize-handle"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onReset}
      onKeyDown={onKeyDown}
      className="group absolute inset-y-0 right-0 z-30 flex w-2 cursor-col-resize touch-none items-stretch justify-end outline-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      <span
        aria-hidden="true"
        className="w-0.5 bg-accent opacity-0 transition-opacity duration-150 motion-reduce:transition-none group-hover:opacity-100 group-active:opacity-100"
      />
    </div>
  );
};
